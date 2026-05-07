-- Minimal editorial metadata for manual content workflow.
-- Backward compatible with existing `is_active` and quiz logic.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_status') THEN
    CREATE TYPE public.question_status AS ENUM ('draft', 'review', 'live', 'archived');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_internet_level') THEN
    CREATE TYPE public.question_internet_level AS ENUM ('debutant', 'initie', 'chronically_online');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_tone') THEN
    CREATE TYPE public.question_tone AS ENUM ('funny', 'cringe', 'drama', 'absurd', 'social', 'gaming');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_context') THEN
    CREATE TYPE public.question_context AS ENUM (
      'tiktok_comments',
      'group_chat',
      'family_dinner',
      'twitch_chat',
      'dating_app',
      'gaming_voice'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_trap_intensity') THEN
    CREATE TYPE public.question_trap_intensity AS ENUM (
      'obvious',
      'soft_trap',
      'generational_trap',
      'fifty_fifty',
      'troll'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_era') THEN
    CREATE TYPE public.question_era AS ENUM ('facebook', 'snapchat', 'tiktok', 'streaming', 'ai');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_format') THEN
    CREATE TYPE public.question_format AS ENUM ('word', 'expression', 'meme_ref', 'emoji', 'scenario_text');
  END IF;
END
$$;

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS status public.question_status NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS internet_level public.question_internet_level,
  ADD COLUMN IF NOT EXISTS tone public.question_tone,
  ADD COLUMN IF NOT EXISTS context public.question_context,
  ADD COLUMN IF NOT EXISTS trap_intensity public.question_trap_intensity,
  ADD COLUMN IF NOT EXISTS era public.question_era,
  ADD COLUMN IF NOT EXISTS format public.question_format,
  ADD COLUMN IF NOT EXISTS editor_notes text,
  ADD COLUMN IF NOT EXISTS canonical_key text;

UPDATE public.questions
SET status = CASE WHEN is_active THEN 'live'::public.question_status ELSE 'archived'::public.question_status END
WHERE status IS NULL
   OR (is_active = true AND status <> 'live')
   OR (is_active = false AND status = 'live');

CREATE OR REPLACE FUNCTION public.normalize_question_canonical_key(_question text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    regexp_replace(lower(trim(COALESCE(_question, ''))), '\s+', ' ', 'g'),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.sync_question_editorial_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Canonical key from current question text.
  NEW.canonical_key := public.normalize_question_canonical_key(NEW.question);

  -- Keep status/is_active aligned, whichever side is edited.
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NULL THEN
      NEW.status := CASE WHEN COALESCE(NEW.is_active, true) THEN 'live'::public.question_status ELSE 'archived'::public.question_status END;
    END IF;
    IF NEW.is_active IS NULL THEN
      NEW.is_active := (NEW.status = 'live');
    END IF;
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.is_active := (NEW.status = 'live');
    ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      NEW.status := CASE WHEN NEW.is_active THEN 'live'::public.question_status ELSE 'archived'::public.question_status END;
    ELSE
      NEW.is_active := (NEW.status = 'live');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_question_editorial_fields ON public.questions;
CREATE TRIGGER trg_sync_question_editorial_fields
BEFORE INSERT OR UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.sync_question_editorial_fields();

-- Ensure existing rows have canonical keys.
UPDATE public.questions
SET canonical_key = public.normalize_question_canonical_key(question)
WHERE canonical_key IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_canonical_key_unique
  ON public.questions(canonical_key)
  WHERE canonical_key IS NOT NULL;

-- Safe RPC update: playable questions are "live" only.
CREATE OR REPLACE FUNCTION public.get_playable_questions(
  _theme public.question_theme DEFAULT NULL,
  _ids uuid[] DEFAULT NULL,
  _limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  theme public.question_theme,
  difficulty public.question_difficulty,
  question text,
  choices jsonb,
  explanation text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.id, q.theme, q.difficulty, q.question, q.choices, q.explanation
  FROM public.questions q
  WHERE q.status = 'live'
    AND (_theme IS NULL OR q.theme = _theme)
    AND (_ids IS NULL OR q.id = ANY(_ids))
  ORDER BY random()
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 50), 100));
$$;

CREATE OR REPLACE FUNCTION public.get_active_question_counts()
RETURNS TABLE (
  theme public.question_theme,
  total bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.theme, COUNT(*) AS total
  FROM public.questions q
  WHERE q.status = 'live'
  GROUP BY q.theme;
$$;

CREATE OR REPLACE FUNCTION public.check_answer(
  _question_id uuid,
  _chosen integer
)
RETURNS TABLE (
  correct boolean,
  correct_index integer,
  explanation text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (_chosen = q.correct_index) AS correct, q.correct_index, q.explanation
  FROM public.questions q
  WHERE q.id = _question_id
    AND q.status = 'live';
$$;

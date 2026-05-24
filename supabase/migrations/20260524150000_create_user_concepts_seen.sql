-- PR2 foundation: minimal silent concept memory.
-- Adds per-user concept exposure counters without any UX dependency.

CREATE TABLE IF NOT EXISTS public.user_concepts_seen (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_key text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  times_seen integer NOT NULL DEFAULT 1 CHECK (times_seen >= 1),
  times_correct integer NOT NULL DEFAULT 0 CHECK (times_correct >= 0),
  last_source text,
  PRIMARY KEY (user_id, concept_key)
);

CREATE INDEX IF NOT EXISTS idx_user_concepts_seen_user_last_seen
  ON public.user_concepts_seen (user_id, last_seen_at DESC);

ALTER TABLE public.user_concepts_seen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own concept memory" ON public.user_concepts_seen;
CREATE POLICY "Users can view own concept memory"
  ON public.user_concepts_seen
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own concept memory" ON public.user_concepts_seen;
CREATE POLICY "Users can insert own concept memory"
  ON public.user_concepts_seen
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own concept memory" ON public.user_concepts_seen;
CREATE POLICY "Users can update own concept memory"
  ON public.user_concepts_seen
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.upsert_user_concept_seen(
  _concept_key text,
  _was_correct boolean DEFAULT NULL,
  _source text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _key text := NULLIF(trim(COALESCE(_concept_key, '')), '');
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _key IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.user_concepts_seen (
    user_id,
    concept_key,
    first_seen_at,
    last_seen_at,
    times_seen,
    times_correct,
    last_source
  )
  VALUES (
    _uid,
    _key,
    now(),
    now(),
    1,
    CASE WHEN COALESCE(_was_correct, false) THEN 1 ELSE 0 END,
    _source
  )
  ON CONFLICT (user_id, concept_key)
  DO UPDATE SET
    last_seen_at = now(),
    times_seen = public.user_concepts_seen.times_seen + 1,
    times_correct = public.user_concepts_seen.times_correct
      + CASE WHEN COALESCE(_was_correct, false) THEN 1 ELSE 0 END,
    last_source = COALESCE(EXCLUDED.last_source, public.user_concepts_seen.last_source);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_user_concept_seen(text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_user_concept_seen(text, boolean, text) TO authenticated;

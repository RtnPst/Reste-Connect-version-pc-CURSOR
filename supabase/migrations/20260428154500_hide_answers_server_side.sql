-- Hide direct answer keys from public clients, expose controlled RPCs

DROP POLICY IF EXISTS "Anyone can view active questions" ON public.questions;

-- Public clients should not read questions table directly.
REVOKE SELECT ON TABLE public.questions FROM anon;
REVOKE SELECT ON TABLE public.questions FROM authenticated;

-- Controlled read for playable content (without correct_index)
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
  WHERE q.is_active = true
    AND (_theme IS NULL OR q.theme = _theme)
    AND (_ids IS NULL OR q.id = ANY(_ids))
  ORDER BY random()
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 50), 100));
$$;

REVOKE ALL ON FUNCTION public.get_playable_questions(public.question_theme, uuid[], integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_playable_questions(public.question_theme, uuid[], integer) TO anon, authenticated;

-- Controlled count endpoint for theme selection cards
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
  WHERE q.is_active = true
  GROUP BY q.theme;
$$;

REVOKE ALL ON FUNCTION public.get_active_question_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_question_counts() TO anon, authenticated;

-- Controlled answer check for a single question
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
    AND q.is_active = true;
$$;

REVOKE ALL ON FUNCTION public.check_answer(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_answer(uuid, integer) TO anon, authenticated;

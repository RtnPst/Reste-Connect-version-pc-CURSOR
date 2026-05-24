-- PR1 foundation: expose optional concept_key on playable question RPC.
-- Backward compatible: new column is nullable; no gameplay logic change.
-- PostgreSQL requires DROP when RETURNS TABLE shape changes (cannot OR REPLACE).

DROP FUNCTION IF EXISTS public.get_playable_questions(public.question_theme, uuid[], integer);

CREATE FUNCTION public.get_playable_questions(
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
  explanation text,
  concept_key text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    q.id,
    q.theme,
    q.difficulty,
    q.question,
    q.choices,
    q.explanation,
    q.concept_key
  FROM public.questions q
  WHERE q.status = 'live'
    AND (_theme IS NULL OR q.theme = _theme)
    AND (_ids IS NULL OR q.id = ANY(_ids))
  ORDER BY random()
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 50), 100));
$$;

REVOKE ALL ON FUNCTION public.get_playable_questions(public.question_theme, uuid[], integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_playable_questions(public.question_theme, uuid[], integer) TO anon, authenticated;

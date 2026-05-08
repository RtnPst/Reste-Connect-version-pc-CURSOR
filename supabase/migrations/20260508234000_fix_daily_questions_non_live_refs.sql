-- Point daily_questions.question_id to a playable row when it referenced archived/non-live questions.
-- Only updates rows for today and future calendar dates (active_date) to avoid rewriting past schedules.
-- Reversible only via restoring prior UUIDs from backup.

UPDATE public.daily_questions AS dq
SET question_id = picked.id
FROM (
  SELECT
    dq2.id AS dq_row_id,
    (
      SELECT q.id
      FROM public.questions q
      WHERE q.status = 'live'::public.question_status
      ORDER BY q.created_at ASC NULLS LAST
      LIMIT 1
    ) AS id
  FROM public.daily_questions dq2
  INNER JOIN public.questions qq ON qq.id = dq2.question_id
  WHERE qq.status <> 'live'::public.question_status
    AND dq2.active_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Paris')::date
) AS picked
WHERE dq.id = picked.dq_row_id
  AND picked.id IS NOT NULL;

-- =============================================================================
-- Repoint daily_questions.question_id from duplicate VARIANT UUIDs to reviewed
-- CANONICAL UUIDs (critical duplicate groups only).
--
-- Tables touched: public.daily_questions ONLY (UPDATE question_id).
-- No DELETE. No changes to public.questions.
--
-- Human-reviewed canonical IDs (see exports/dedup-audit/exact-dup-critical-canonical-decisions.json):
--   Discord (exact_e9459f5e7919): 83d5c73a-e515-4f5a-bbfd-deb80582edb4
--   unfollow (exact_2d4021b2df5a): 403251de-3624-4fdb-ac1f-3a1af46297d4
--   IA (exact_f86b7845e7d3): 7ce5b778-c270-4681-9e2d-a5c75a423b0b
--
-- Map source: scripts/data/daily-questions-repoint-map.json
--
-- Preview (read-only): npm run preview:daily-repoint -- --write-snapshot
--
-- Rollback: inverse UPDATEs by primary key if you captured planned_updates from
-- preview JSON before applying; never blind-reverse without row ids (two variants
-- may map to the same canonical).
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.questions WHERE id = '83d5c73a-e515-4f5a-bbfd-deb80582edb4'::uuid
  ) THEN
    RAISE EXCEPTION 'daily_questions repoint blocked: canonical question 83d5c73a-e515-4f5a-bbfd-deb80582edb4 missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.questions WHERE id = '403251de-3624-4fdb-ac1f-3a1af46297d4'::uuid
  ) THEN
    RAISE EXCEPTION 'daily_questions repoint blocked: canonical question 403251de-3624-4fdb-ac1f-3a1af46297d4 missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.questions WHERE id = '7ce5b778-c270-4681-9e2d-a5c75a423b0b'::uuid
  ) THEN
    RAISE EXCEPTION 'daily_questions repoint blocked: canonical question 7ce5b778-c270-4681-9e2d-a5c75a423b0b missing';
  END IF;
END
$$;

-- Discord: variant → canonical
UPDATE public.daily_questions
SET question_id = '83d5c73a-e515-4f5a-bbfd-deb80582edb4'::uuid
WHERE question_id = '12b15800-b7cb-46d2-9518-d4d3edf4be30'::uuid;

-- unfollow
UPDATE public.daily_questions
SET question_id = '403251de-3624-4fdb-ac1f-3a1af46297d4'::uuid
WHERE question_id = 'cb0e54cb-acd5-4ad1-b05f-515a3e59051a'::uuid;

-- IA (two duplicate variants → same canonical)
UPDATE public.daily_questions
SET question_id = '7ce5b778-c270-4681-9e2d-a5c75a423b0b'::uuid
WHERE question_id = 'f502806a-1256-45ea-b38c-a69095cb7f51'::uuid;

UPDATE public.daily_questions
SET question_id = '7ce5b778-c270-4681-9e2d-a5c75a423b0b'::uuid
WHERE question_id = 'cd1de849-8f29-4948-a51c-feadf48b3494'::uuid;

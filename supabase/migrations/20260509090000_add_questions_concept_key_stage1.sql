-- Stage 1 concept metadata: add optional semantic key on questions.
-- No gameplay behavior changes in this migration.
-- No NOT NULL / FK constraints yet.

ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS concept_key text NULL;

-- Keep lookups fast for editorial/import/dedup workflows while skipping NULL rows.
CREATE INDEX IF NOT EXISTS questions_concept_key_idx
ON public.questions (concept_key)
WHERE concept_key IS NOT NULL;

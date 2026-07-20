-- Content Density Sprint — density-1-daily-core-vernacular
-- Scope: 10 live questions, existing label slugs only (no tech).
-- Idempotent: updates only when concept_key IS DISTINCT FROM target.

CREATE TEMP TABLE _density_1_concept_key_map (
  question_id uuid PRIMARY KEY,
  new_concept_key text NOT NULL
) ON COMMIT DROP;

INSERT INTO _density_1_concept_key_map (question_id, new_concept_key) VALUES
  ('b0032b43-ad1b-41d7-82ea-b0857cf00907'::uuid, 'red_flag'),
  ('c3aaaab2-4e74-4752-a554-7aa4a475baa8'::uuid, 'crush'),
  ('addb39c7-cf2f-48a2-ba8a-d5fb496de474'::uuid, 'ratio'),
  ('ee012de3-f0ac-43df-b30f-475f42b4f1c9'::uuid, 'ghoster'),
  ('023882fa-4f05-4c02-81af-0891403be434'::uuid, 'flex'),
  ('ff2dea3b-d1d7-4e66-b043-4e05a61c4341'::uuid, 'sus'),
  ('cd55919d-8510-4348-8339-98941c4e378b'::uuid, 'bail'),
  ('7acb5233-6a7f-4d44-88a8-1c1f15927477'::uuid, 'dead'),
  ('80a20c26-6399-401f-9be4-707408886d0a'::uuid, 'valide'),
  ('8160d5c3-772b-4b83-a414-b45598a5ccde'::uuid, 'carre');

DO $$
DECLARE
  n_present integer;
BEGIN
  SELECT COUNT(*) INTO n_present
  FROM _density_1_concept_key_map m
  INNER JOIN public.questions q ON q.id = m.question_id
  WHERE q.status = 'live';

  IF n_present <> 10 THEN
    RAISE EXCEPTION
      'density_1: expected 10 live mapped questions, found %',
      n_present;
  END IF;
END $$;

ALTER TABLE public.questions DISABLE TRIGGER trg_sync_question_editorial_fields;

UPDATE public.questions AS q
SET concept_key = m.new_concept_key
FROM _density_1_concept_key_map AS m
WHERE q.id = m.question_id
  AND q.status = 'live'
  AND q.concept_key IS DISTINCT FROM m.new_concept_key;

ALTER TABLE public.questions ENABLE TRIGGER trg_sync_question_editorial_fields;

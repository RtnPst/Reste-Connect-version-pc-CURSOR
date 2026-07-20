-- Content Density — density-1h final 6 live rows (100% named coverage)

CREATE TEMP TABLE _density_1h_map (
  question_id uuid PRIMARY KEY,
  new_concept_key text NOT NULL
) ON COMMIT DROP;

INSERT INTO _density_1h_map (question_id, new_concept_key) VALUES
  ('9264438a-62e1-4a7d-9e8a-56b8f945a0f3'::uuid, 'email_suspect'),
  ('8b9767f7-5090-4b2c-b877-a2216288a63a'::uuid, 'ecran_tactile'),
  ('756d61d5-dc35-4797-a9cf-d75148ec93cd'::uuid, 'iphone_android'),
  ('42c1f695-63bd-454c-8a50-ca3a4c4e00e9'::uuid, 'stockage'),
  ('6c439ee5-e5a8-47b6-913d-a5b1ed57ad97'::uuid, 'google_maps'),
  ('8ec1b444-403e-43aa-91c5-87905c085d36'::uuid, 'mise_a_jour');

ALTER TABLE public.questions DISABLE TRIGGER trg_sync_question_editorial_fields;

UPDATE public.questions AS q
SET concept_key = m.new_concept_key
FROM _density_1h_map AS m
WHERE q.id = m.question_id
  AND q.status = 'live'
  AND q.concept_key IS DISTINCT FROM m.new_concept_key;

ALTER TABLE public.questions ENABLE TRIGGER trg_sync_question_editorial_fields;

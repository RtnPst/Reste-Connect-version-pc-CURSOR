-- Content Density — density-1e vocab + réseaux sociaux (18 live rows)
-- Labels must exist in src/data/concept-labels-v1.json (same PR).

CREATE TEMP TABLE _density_1e_map (
  question_id uuid PRIMARY KEY,
  new_concept_key text NOT NULL
) ON COMMIT DROP;

INSERT INTO _density_1e_map (question_id, new_concept_key) VALUES
  ('55f6b0f6-e9a7-480b-a640-7b055e6c3243'::uuid, 'lit'),
  ('27eb5f80-3659-4f3a-9b61-ec741058fd12'::uuid, 'slay'),
  ('496e10af-fe74-4fe5-adcd-7ccef9d71dfc'::uuid, 'wesh'),
  ('969ac45d-0d1c-4b98-81c4-b6e609dc84f7'::uuid, 'matrixe'),
  ('7ad3a9b0-e237-43b2-91b2-ab6c7ab904f6'::uuid, 'high_key'),
  ('c25bcd9b-b4b0-4af4-a86b-a0f2c2c2421a'::uuid, 'cap'),
  ('fda6745e-cbb9-438d-80d6-5bcf9a3fcf86'::uuid, 'clean'),
  ('b6804354-ce3f-4b08-a586-217f1cd7e738'::uuid, 'filtre'),
  ('bee59c3e-8ef6-4c34-89c3-c6ce7801f9f3'::uuid, 'compte_verifie'),
  ('190eb2f3-bce9-4df5-8229-acadb5c66091'::uuid, 'influenceur'),
  ('4d2d6587-a46e-436d-80ba-27b7279144a8'::uuid, 'challenge'),
  ('c69b3b4b-099e-4d9d-82b4-ea197773cca0'::uuid, 'viral'),
  ('9787229c-3c5f-45b9-b7ca-ef6735004185'::uuid, 'poster'),
  ('617c4e6e-3494-4233-9793-4fce262a707a'::uuid, 'unfollow'),
  ('f9fb026e-7900-4a9e-a911-a2c6f251ed13'::uuid, 'fake_account'),
  ('6a4ca434-8fe1-4337-b3b6-109eb4ebcc27'::uuid, 'viewer'),
  ('b9d37bd6-9452-4c85-9ee2-6ace3d533459'::uuid, 'repost'),
  ('4f032e2b-cc07-4c48-87c5-7923934c80d2'::uuid, 'compte_prive');

ALTER TABLE public.questions DISABLE TRIGGER trg_sync_question_editorial_fields;

UPDATE public.questions AS q
SET concept_key = m.new_concept_key
FROM _density_1e_map AS m
WHERE q.id = m.question_id
  AND q.status = 'live'
  AND q.concept_key IS DISTINCT FROM m.new_concept_key;

ALTER TABLE public.questions ENABLE TRIGGER trg_sync_question_editorial_fields;

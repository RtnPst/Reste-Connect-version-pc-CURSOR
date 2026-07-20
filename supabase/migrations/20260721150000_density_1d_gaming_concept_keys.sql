-- Content Density — density-1d gaming vernacular (16 live rows)
-- Labels must exist in src/data/concept-labels-v1.json (same PR).

CREATE TEMP TABLE _density_1d_map (
  question_id uuid PRIMARY KEY,
  new_concept_key text NOT NULL
) ON COMMIT DROP;

INSERT INTO _density_1d_map (question_id, new_concept_key) VALUES
  ('37211885-9c58-4fe5-9c94-139c5918aa29'::uuid, 'afk'),
  ('4f513adf-0c13-4dcd-8d63-0cdef1f79717'::uuid, 'boss'),
  ('92568fda-0db5-4004-b28b-f6a3ad6ab289'::uuid, 'farm'),
  ('2f0980e2-1286-41d5-b41b-ad36b13c26d2'::uuid, 'meta'),
  ('5f041b78-6e40-4b78-a6f9-884714efa43b'::uuid, 'lag'),
  ('bf7c391b-3a97-43a5-8ddc-285eafc9f59a'::uuid, 'gg'),
  ('01352b8b-2595-4620-bbfc-a43b61263084'::uuid, 'rage_quit'),
  ('de5404b0-5c39-4b01-9d77-b40885b6932f'::uuid, 'noob'),
  ('e37001d4-44be-4cf3-a2b2-6051d776106a'::uuid, 'carry'),
  ('ebc9e417-d7fb-49f7-87ae-b2e8dae80151'::uuid, 'respawn'),
  ('05b908c4-c672-453b-a358-ac6e2b79f31a'::uuid, 'loot'),
  ('2f564d0d-d8b1-4532-95fd-51acbaee7c61'::uuid, 'spawn'),
  ('415fd5a6-0e74-4c65-9603-f2ba7a767878'::uuid, 'skin'),
  ('0db5c36f-1ada-44d7-b950-de6a6fb8167c'::uuid, 'level_up'),
  ('ddca15ca-84ad-4c78-b95e-4ce1ea2df777'::uuid, 'buff'),
  ('5f982b9c-5837-4209-8645-84f1ec6acd77'::uuid, 'nerf');

ALTER TABLE public.questions DISABLE TRIGGER trg_sync_question_editorial_fields;

UPDATE public.questions AS q
SET concept_key = m.new_concept_key
FROM _density_1d_map AS m
WHERE q.id = m.question_id
  AND q.status = 'live'
  AND q.concept_key IS DISTINCT FROM m.new_concept_key;

ALTER TABLE public.questions ENABLE TRIGGER trg_sync_question_editorial_fields;

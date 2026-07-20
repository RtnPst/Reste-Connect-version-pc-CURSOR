-- Content Density — density-1c trends / pop culture (16 live rows)
-- Labels must exist in src/data/concept-labels-v1.json (same PR).
-- Trigger disable: trg_sync_question_editorial_fields can collide on canonical_key vs archived twins.

CREATE TEMP TABLE _density_1c_map (
  question_id uuid PRIMARY KEY,
  new_concept_key text NOT NULL
) ON COMMIT DROP;

INSERT INTO _density_1c_map (question_id, new_concept_key) VALUES
  ('b613bac2-1269-47ba-861c-b0f8529d7b8b'::uuid, 'npc'),
  ('7217cc30-ad93-4628-9caf-68cc68d85265'::uuid, 'clickbait'),
  ('79639004-1b57-4621-8fc3-418ceadd4a06'::uuid, 'drama'),
  ('9de4d106-b8e2-4636-9630-e377c23e7188'::uuid, 'spoiler'),
  ('73c8fd62-9caf-4433-ba00-6afdc4488ddf'::uuid, 'roast'),
  ('aa8680ec-5be3-43ab-8bcb-c857d832859f'::uuid, 'troll'),
  ('d4cb8888-26c4-42e5-8643-2ce1958a2ecc'::uuid, 'based'),
  ('c7eb9085-9685-4af7-bbd7-5a49a30dadb8'::uuid, 'hater'),
  ('88b42927-670e-4a21-9468-7bcf68d0ebce'::uuid, 'meme'),
  ('29510230-56c2-41b7-81af-900766761267'::uuid, 'buzz'),
  ('8deec39a-f3cf-4ef7-85ae-6d80de8c1999'::uuid, 'banger'),
  ('7ce0eacd-f586-4ce4-a478-be856a579172'::uuid, 'fail'),
  ('9c656228-2cbf-44ca-8c9a-d1db3dc565cd'::uuid, 'leak'),
  ('6d1156b8-d1bd-4686-bca3-f31146be6362'::uuid, 'fake_news'),
  ('7ec5ca6a-bc56-4d3e-bc6c-6bedd59d97e7'::uuid, 'trend'),
  ('60f534aa-5adb-431f-9fb3-a6af6047cbdc'::uuid, 'inside_joke');

ALTER TABLE public.questions DISABLE TRIGGER trg_sync_question_editorial_fields;

UPDATE public.questions AS q
SET concept_key = m.new_concept_key
FROM _density_1c_map AS m
WHERE q.id = m.question_id
  AND q.status = 'live'
  AND q.concept_key IS DISTINCT FROM m.new_concept_key;

ALTER TABLE public.questions ENABLE TRIGGER trg_sync_question_editorial_fields;

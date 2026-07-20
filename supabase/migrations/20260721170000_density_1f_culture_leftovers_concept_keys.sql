-- Content Density — density-1f remaining culture leftovers (16 live rows)

CREATE TEMP TABLE _density_1f_map (
  question_id uuid PRIMARY KEY,
  new_concept_key text NOT NULL
) ON COMMIT DROP;

INSERT INTO _density_1f_map (question_id, new_concept_key) VALUES
  ('768d1158-0bcf-4861-b8c0-1e9426e7961a'::uuid, 'commentaire_epingle'),
  ('aa2b5201-e6bc-4fb8-b80b-682fd841e89b'::uuid, 'reel'),
  ('3a25f0e3-f836-4059-a152-d7be91ae9e78'::uuid, 'ping'),
  ('83505e5f-33b0-470b-80bd-b2c6cf27d0d5'::uuid, 'cooldown'),
  ('c0625aa6-1162-4b35-abee-da2483e87241'::uuid, 'remix'),
  ('6eee381c-486f-47fb-a909-d580f6c933cf'::uuid, 'meme_viral'),
  ('9c22bc71-085d-47c8-80a8-2f7c5f928035'::uuid, 'meme_mort'),
  ('cd0d3e5b-cac4-47e8-ba43-2a8c511a1ad2'::uuid, 'meme_template'),
  ('b397a5a6-2903-4357-ba96-fab096d81f4f'::uuid, 'drop'),
  ('732bc817-5451-493c-b503-f445226ce4b1'::uuid, 'spammer'),
  ('c4845877-19f6-414e-88a6-cad9ca178a1b'::uuid, 'feat'),
  ('4081961e-a233-47b0-abcf-24e76f0c7393'::uuid, 'son'),
  ('70d06ca1-c8c8-4685-8b32-2cf890035cc8'::uuid, 'tuto'),
  ('2e9fbff2-b362-4400-b728-95122cd5790b'::uuid, 'reaction'),
  ('f6ba8854-9273-4554-a5ee-5b845a8fb636'::uuid, 'hit'),
  ('973c379d-2b06-4676-be21-01f9498ba962'::uuid, 'album_drop');

ALTER TABLE public.questions DISABLE TRIGGER trg_sync_question_editorial_fields;

UPDATE public.questions AS q
SET concept_key = m.new_concept_key
FROM _density_1f_map AS m
WHERE q.id = m.question_id
  AND q.status = 'live'
  AND q.concept_key IS DISTINCT FROM m.new_concept_key;

ALTER TABLE public.questions ENABLE TRIGGER trg_sync_question_editorial_fields;

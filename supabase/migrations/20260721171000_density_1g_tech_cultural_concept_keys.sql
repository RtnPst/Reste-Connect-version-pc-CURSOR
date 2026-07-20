-- Content Density — density-1g tech cultural pilot (12 live rows, concept_key only)
-- Not a theme mass-activation; tags already-live tech questions with names.

CREATE TEMP TABLE _density_1g_map (
  question_id uuid PRIMARY KEY,
  new_concept_key text NOT NULL
) ON COMMIT DROP;

INSERT INTO _density_1g_map (question_id, new_concept_key) VALUES
  ('077c75b7-6fd8-43b2-8a2d-8a429c97037e'::uuid, 'cloud'),
  ('6046d83b-5a8a-4368-8aee-e13f12039e80'::uuid, 'wifi'),
  ('1fde6c35-e7f4-41a7-8538-454b3674a78e'::uuid, 'os'),
  ('75a1ca57-7eb9-41a2-9978-ba5dbd745345'::uuid, '2fa'),
  ('4cb0690d-7989-425b-9443-70d0dd2f2841'::uuid, 'phishing'),
  ('1aaa76ce-1ddc-4b0b-8b8d-f1aaa8b24db3'::uuid, 'mode_avion'),
  ('fd04d847-4b4c-4981-acb6-11ce361a08ed'::uuid, 'qr_code'),
  ('18b88d74-16ef-4458-9084-27328abac1a8'::uuid, '5g'),
  ('880c038f-66af-4eaf-b4c6-dcbbc96aa79b'::uuid, 'assistant_vocal'),
  ('111d65a5-56fe-4bc5-8f98-6d3736b97101'::uuid, 'bot'),
  ('b17adfbc-3a0d-4a11-b4b0-dfbaeb45fd6e'::uuid, 'algo'),
  ('ecd90772-00dd-40e7-9b8c-986e1b6c4e20'::uuid, 'hack');

ALTER TABLE public.questions DISABLE TRIGGER trg_sync_question_editorial_fields;

UPDATE public.questions AS q
SET concept_key = m.new_concept_key
FROM _density_1g_map AS m
WHERE q.id = m.question_id
  AND q.status = 'live'
  AND q.concept_key IS DISTINCT FROM m.new_concept_key;

ALTER TABLE public.questions ENABLE TRIGGER trg_sync_question_editorial_fields;

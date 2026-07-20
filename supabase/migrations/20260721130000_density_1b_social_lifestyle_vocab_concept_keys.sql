-- Content Density — density-1b social / lifestyle / vocab (18 live rows)
-- Labels must exist in src/data/concept-labels-v1.json (same PR).

CREATE TEMP TABLE _density_1b_map (
  question_id uuid PRIMARY KEY,
  new_concept_key text NOT NULL
) ON COMMIT DROP;

INSERT INTO _density_1b_map (question_id, new_concept_key) VALUES
  ('0258f3e1-41b6-4e9c-bedc-077d5fbe7825'::uuid, 'seen'),
  ('8313de64-93d0-43e6-8630-e2169721be19'::uuid, 'simp'),
  ('cf40373f-e968-43e4-b1d8-89923b54e1fd'::uuid, 'situationship'),
  ('ac8b2d3d-00f1-4a0f-81a9-bab36efb4132'::uuid, 'dm'),
  ('68205d1e-12be-459c-a9bd-74c4773962bb'::uuid, 'story'),
  ('40b84ad1-9a64-499f-8d23-10d57607873a'::uuid, 'shadowban'),
  ('ef8318d4-5c48-471b-a838-8bfad7f3b22f'::uuid, 'feed'),
  ('9049deb7-96ac-4917-a4d4-d3173b5cb0d1'::uuid, 'follow'),
  ('2abe751b-7db0-4e22-b4bb-92fd2096e48b'::uuid, 'block'),
  ('2723ff7b-b2f0-4658-97ca-312f20a1ed2f'::uuid, 'mute'),
  ('cbc8381f-d9dd-4378-854b-95cf99cc01fc'::uuid, 'live'),
  ('ceb81392-69d4-47ef-b16b-0250fe5861b2'::uuid, 'thread'),
  ('51ed5c5b-5724-4af8-bd11-ea9347973ee0'::uuid, 'fomo'),
  ('6c580b7e-6d3f-49ca-8641-bf976b15c35b'::uuid, 'goat'),
  ('a25fea63-8997-4783-a3eb-5a854594bc4c'::uuid, 'no_cap'),
  ('3f061654-5aad-47c0-8865-5bebac3c82d8'::uuid, 'mid'),
  ('e2cfc234-68cd-4f35-aa1c-f9eafe637936'::uuid, 'salty'),
  ('06edab68-0d17-43e1-8692-071cd47eb7b7'::uuid, 'pov');

ALTER TABLE public.questions DISABLE TRIGGER trg_sync_question_editorial_fields;

UPDATE public.questions AS q
SET concept_key = m.new_concept_key
FROM _density_1b_map AS m
WHERE q.id = m.question_id
  AND q.status = 'live'
  AND q.concept_key IS DISTINCT FROM m.new_concept_key;

ALTER TABLE public.questions ENABLE TRIGGER trg_sync_question_editorial_fields;

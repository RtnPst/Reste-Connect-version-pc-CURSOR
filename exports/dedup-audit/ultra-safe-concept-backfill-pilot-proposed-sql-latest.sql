-- PREVIEW ONLY: ultra-safe concept_key backfill pilot
-- Included rows: 40
-- Included groups: 20
-- No execution from this artifact.

CREATE TEMP TABLE _ultra_safe_concept_key_pilot (
  question_id uuid PRIMARY KEY,
  new_concept_key text NOT NULL
) ON COMMIT DROP;

INSERT INTO _ultra_safe_concept_key_pilot (question_id, new_concept_key) VALUES
  ('223ad5ae-5148-4066-90c0-9ed52bf80083'::uuid, 'texting'),
  ('23d3438d-e8e4-4f32-9676-f5ab6d1976fc'::uuid, 'texting'),
  ('88036ce7-a2fd-429d-836c-8256a12f5387'::uuid, 'triggered'),
  ('c9cfdd7b-c02e-4477-9b5d-4baa7de7bd4b'::uuid, 'triggered'),
  ('28e32e91-0f5c-43ed-a935-99065c611090'::uuid, 'clutch'),
  ('c507662c-d78e-4f9f-931f-817a8d048172'::uuid, 'clutch'),
  ('191559b5-9b40-441b-9b0f-41470d805448'::uuid, 'contenu_sponsorise'),
  ('5f081042-cc27-44e0-9db0-eec4bae557bb'::uuid, 'contenu_sponsorise'),
  ('403251de-3624-4fdb-ac1f-3a1af46297d4'::uuid, 'unfollow'),
  ('cb0e54cb-acd5-4ad1-b05f-515a3e59051a'::uuid, 'unfollow'),
  ('e31184ec-c57d-450c-8952-cb4493ba8ead'::uuid, 'ghoster_quelquun'),
  ('ee012de3-f0ac-43df-b30f-475f42b4f1c9'::uuid, 'ghoster_quelquun'),
  ('69dbfdb6-1fa6-45dd-bc52-04d2924af2bc'::uuid, 'side_eye'),
  ('75a003fb-4684-47d1-86e3-1682af19ebac'::uuid, 'side_eye'),
  ('80a20c26-6399-401f-9be4-707408886d0a'::uuid, 'cest_valide'),
  ('de52cfc7-d759-4142-8d8e-bc449cad5c2c'::uuid, 'cest_valide'),
  ('f82d8a81-19ab-4309-af00-c9e6d9acd74c'::uuid, 'cursed'),
  ('fce2fd7f-5f9f-4c64-9842-0ac9afa12aa3'::uuid, 'cursed'),
  ('7b718039-8bf4-4d7a-b7b6-76440ae581c9'::uuid, 'low_key'),
  ('e48aa748-65f6-4372-a593-7514692b54fa'::uuid, 'low_key'),
  ('16e1a672-2f63-49b6-a0b4-fbd0aacfe1c6'::uuid, 'boujee'),
  ('af656d7a-fd0d-419b-8028-26aa420f1c0e'::uuid, 'boujee'),
  ('217125a3-6113-4611-a687-7060553104ff'::uuid, 'scroll'),
  ('9e87cf94-fc89-44df-8c3f-649719e6b8e8'::uuid, 'scroll'),
  ('1e544365-ba5a-4c5c-84a5-cf3d47cb7abe'::uuid, 'friendzone'),
  ('703d600c-7663-4bd7-b2c7-45da6493b944'::uuid, 'friendzone'),
  ('0a8ddb38-468d-4c3a-a9d3-c7f73f3898d6'::uuid, 'streamer'),
  ('2875c8fa-5b64-4e31-bbb2-0b1f90b38541'::uuid, 'streamer'),
  ('04164acb-996c-4f46-bfac-ae73430c7fd4'::uuid, 'ship_deux_personnes'),
  ('e9ad9253-d1e4-43e0-8e94-0a214c0cc7b7'::uuid, 'ship_deux_personnes'),
  ('3201f894-6c76-4343-94cc-67d44c1a4d13'::uuid, 'unfollow_follow'),
  ('b3b6d229-6375-47f1-8c65-2d1eb2bda46d'::uuid, 'unfollow_follow'),
  ('03301bf8-9984-4521-92a3-85492f30fe68'::uuid, 'double_text'),
  ('d2ba9a5c-f680-4c3b-a425-7fa201a700d8'::uuid, 'double_text'),
  ('e1eab53b-3244-4d75-818d-0ff15348326e'::uuid, 'love_bombing'),
  ('f319ce64-54ae-4983-8bb0-34785df164e2'::uuid, 'love_bombing'),
  ('1f017960-395d-4dd9-96ac-b2b324a5cb9b'::uuid, 'breadcrumbing'),
  ('c4b9f3fd-cbff-44a8-8221-e7a7c77a332a'::uuid, 'breadcrumbing'),
  ('1ca61163-daeb-4c32-a6d5-1947fa40417b'::uuid, 'tryhard'),
  ('dcf678f7-6e33-4306-80ec-18983e24bb71'::uuid, 'tryhard');

-- Preview update only:
-- UPDATE public.questions q
-- SET concept_key = p.new_concept_key
-- FROM _ultra_safe_concept_key_pilot p
-- WHERE q.id = p.question_id
--   AND q.concept_key IS DISTINCT FROM p.new_concept_key;

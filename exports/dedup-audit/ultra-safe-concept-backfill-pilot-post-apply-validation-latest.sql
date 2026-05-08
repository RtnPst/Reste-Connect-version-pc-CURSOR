-- Post-apply validation query for Stage 1 ultra-safe pilot.
-- 1) Check exact expected row count (should be 40)
SELECT COUNT(*) AS mapped_rows_with_expected_key
FROM public.questions q
INNER JOIN (
  SELECT '03301bf8-9984-4521-92a3-85492f30fe68'::uuid AS question_id, 'double_text'::text AS expected_concept_key
  UNION ALL SELECT '04164acb-996c-4f46-bfac-ae73430c7fd4'::uuid AS question_id, 'ship_deux_personnes'::text AS expected_concept_key
  UNION ALL SELECT '0a8ddb38-468d-4c3a-a9d3-c7f73f3898d6'::uuid AS question_id, 'streamer'::text AS expected_concept_key
  UNION ALL SELECT '16e1a672-2f63-49b6-a0b4-fbd0aacfe1c6'::uuid AS question_id, 'boujee'::text AS expected_concept_key
  UNION ALL SELECT '191559b5-9b40-441b-9b0f-41470d805448'::uuid AS question_id, 'contenu_sponsorise'::text AS expected_concept_key
  UNION ALL SELECT '1ca61163-daeb-4c32-a6d5-1947fa40417b'::uuid AS question_id, 'tryhard'::text AS expected_concept_key
  UNION ALL SELECT '1e544365-ba5a-4c5c-84a5-cf3d47cb7abe'::uuid AS question_id, 'friendzone'::text AS expected_concept_key
  UNION ALL SELECT '1f017960-395d-4dd9-96ac-b2b324a5cb9b'::uuid AS question_id, 'breadcrumbing'::text AS expected_concept_key
  UNION ALL SELECT '217125a3-6113-4611-a687-7060553104ff'::uuid AS question_id, 'scroll'::text AS expected_concept_key
  UNION ALL SELECT '223ad5ae-5148-4066-90c0-9ed52bf80083'::uuid AS question_id, 'texting'::text AS expected_concept_key
  UNION ALL SELECT '23d3438d-e8e4-4f32-9676-f5ab6d1976fc'::uuid AS question_id, 'texting'::text AS expected_concept_key
  UNION ALL SELECT '2875c8fa-5b64-4e31-bbb2-0b1f90b38541'::uuid AS question_id, 'streamer'::text AS expected_concept_key
  UNION ALL SELECT '28e32e91-0f5c-43ed-a935-99065c611090'::uuid AS question_id, 'clutch'::text AS expected_concept_key
  UNION ALL SELECT '3201f894-6c76-4343-94cc-67d44c1a4d13'::uuid AS question_id, 'unfollow_follow'::text AS expected_concept_key
  UNION ALL SELECT '403251de-3624-4fdb-ac1f-3a1af46297d4'::uuid AS question_id, 'unfollow'::text AS expected_concept_key
  UNION ALL SELECT '5f081042-cc27-44e0-9db0-eec4bae557bb'::uuid AS question_id, 'contenu_sponsorise'::text AS expected_concept_key
  UNION ALL SELECT '69dbfdb6-1fa6-45dd-bc52-04d2924af2bc'::uuid AS question_id, 'side_eye'::text AS expected_concept_key
  UNION ALL SELECT '703d600c-7663-4bd7-b2c7-45da6493b944'::uuid AS question_id, 'friendzone'::text AS expected_concept_key
  UNION ALL SELECT '75a003fb-4684-47d1-86e3-1682af19ebac'::uuid AS question_id, 'side_eye'::text AS expected_concept_key
  UNION ALL SELECT '7b718039-8bf4-4d7a-b7b6-76440ae581c9'::uuid AS question_id, 'low_key'::text AS expected_concept_key
  UNION ALL SELECT '80a20c26-6399-401f-9be4-707408886d0a'::uuid AS question_id, 'cest_valide'::text AS expected_concept_key
  UNION ALL SELECT '88036ce7-a2fd-429d-836c-8256a12f5387'::uuid AS question_id, 'triggered'::text AS expected_concept_key
  UNION ALL SELECT '9e87cf94-fc89-44df-8c3f-649719e6b8e8'::uuid AS question_id, 'scroll'::text AS expected_concept_key
  UNION ALL SELECT 'af656d7a-fd0d-419b-8028-26aa420f1c0e'::uuid AS question_id, 'boujee'::text AS expected_concept_key
  UNION ALL SELECT 'b3b6d229-6375-47f1-8c65-2d1eb2bda46d'::uuid AS question_id, 'unfollow_follow'::text AS expected_concept_key
  UNION ALL SELECT 'c4b9f3fd-cbff-44a8-8221-e7a7c77a332a'::uuid AS question_id, 'breadcrumbing'::text AS expected_concept_key
  UNION ALL SELECT 'c507662c-d78e-4f9f-931f-817a8d048172'::uuid AS question_id, 'clutch'::text AS expected_concept_key
  UNION ALL SELECT 'c9cfdd7b-c02e-4477-9b5d-4baa7de7bd4b'::uuid AS question_id, 'triggered'::text AS expected_concept_key
  UNION ALL SELECT 'cb0e54cb-acd5-4ad1-b05f-515a3e59051a'::uuid AS question_id, 'unfollow'::text AS expected_concept_key
  UNION ALL SELECT 'd2ba9a5c-f680-4c3b-a425-7fa201a700d8'::uuid AS question_id, 'double_text'::text AS expected_concept_key
  UNION ALL SELECT 'dcf678f7-6e33-4306-80ec-18983e24bb71'::uuid AS question_id, 'tryhard'::text AS expected_concept_key
  UNION ALL SELECT 'de52cfc7-d759-4142-8d8e-bc449cad5c2c'::uuid AS question_id, 'cest_valide'::text AS expected_concept_key
  UNION ALL SELECT 'e1eab53b-3244-4d75-818d-0ff15348326e'::uuid AS question_id, 'love_bombing'::text AS expected_concept_key
  UNION ALL SELECT 'e31184ec-c57d-450c-8952-cb4493ba8ead'::uuid AS question_id, 'ghoster_quelquun'::text AS expected_concept_key
  UNION ALL SELECT 'e48aa748-65f6-4372-a593-7514692b54fa'::uuid AS question_id, 'low_key'::text AS expected_concept_key
  UNION ALL SELECT 'e9ad9253-d1e4-43e0-8e94-0a214c0cc7b7'::uuid AS question_id, 'ship_deux_personnes'::text AS expected_concept_key
  UNION ALL SELECT 'ee012de3-f0ac-43df-b30f-475f42b4f1c9'::uuid AS question_id, 'ghoster_quelquun'::text AS expected_concept_key
  UNION ALL SELECT 'f319ce64-54ae-4983-8bb0-34785df164e2'::uuid AS question_id, 'love_bombing'::text AS expected_concept_key
  UNION ALL SELECT 'f82d8a81-19ab-4309-af00-c9e6d9acd74c'::uuid AS question_id, 'cursed'::text AS expected_concept_key
  UNION ALL SELECT 'fce2fd7f-5f9f-4c64-9842-0ac9afa12aa3'::uuid AS question_id, 'cursed'::text AS expected_concept_key
) AS m ON m.question_id = q.id
WHERE q.concept_key = m.expected_concept_key;

-- 2) List any mismatches (should return 0 rows)
SELECT q.id, q.concept_key AS actual_concept_key, m.expected_concept_key
FROM public.questions q
INNER JOIN (
  SELECT '03301bf8-9984-4521-92a3-85492f30fe68'::uuid AS question_id, 'double_text'::text AS expected_concept_key
  UNION ALL SELECT '04164acb-996c-4f46-bfac-ae73430c7fd4'::uuid AS question_id, 'ship_deux_personnes'::text AS expected_concept_key
  UNION ALL SELECT '0a8ddb38-468d-4c3a-a9d3-c7f73f3898d6'::uuid AS question_id, 'streamer'::text AS expected_concept_key
  UNION ALL SELECT '16e1a672-2f63-49b6-a0b4-fbd0aacfe1c6'::uuid AS question_id, 'boujee'::text AS expected_concept_key
  UNION ALL SELECT '191559b5-9b40-441b-9b0f-41470d805448'::uuid AS question_id, 'contenu_sponsorise'::text AS expected_concept_key
  UNION ALL SELECT '1ca61163-daeb-4c32-a6d5-1947fa40417b'::uuid AS question_id, 'tryhard'::text AS expected_concept_key
  UNION ALL SELECT '1e544365-ba5a-4c5c-84a5-cf3d47cb7abe'::uuid AS question_id, 'friendzone'::text AS expected_concept_key
  UNION ALL SELECT '1f017960-395d-4dd9-96ac-b2b324a5cb9b'::uuid AS question_id, 'breadcrumbing'::text AS expected_concept_key
  UNION ALL SELECT '217125a3-6113-4611-a687-7060553104ff'::uuid AS question_id, 'scroll'::text AS expected_concept_key
  UNION ALL SELECT '223ad5ae-5148-4066-90c0-9ed52bf80083'::uuid AS question_id, 'texting'::text AS expected_concept_key
  UNION ALL SELECT '23d3438d-e8e4-4f32-9676-f5ab6d1976fc'::uuid AS question_id, 'texting'::text AS expected_concept_key
  UNION ALL SELECT '2875c8fa-5b64-4e31-bbb2-0b1f90b38541'::uuid AS question_id, 'streamer'::text AS expected_concept_key
  UNION ALL SELECT '28e32e91-0f5c-43ed-a935-99065c611090'::uuid AS question_id, 'clutch'::text AS expected_concept_key
  UNION ALL SELECT '3201f894-6c76-4343-94cc-67d44c1a4d13'::uuid AS question_id, 'unfollow_follow'::text AS expected_concept_key
  UNION ALL SELECT '403251de-3624-4fdb-ac1f-3a1af46297d4'::uuid AS question_id, 'unfollow'::text AS expected_concept_key
  UNION ALL SELECT '5f081042-cc27-44e0-9db0-eec4bae557bb'::uuid AS question_id, 'contenu_sponsorise'::text AS expected_concept_key
  UNION ALL SELECT '69dbfdb6-1fa6-45dd-bc52-04d2924af2bc'::uuid AS question_id, 'side_eye'::text AS expected_concept_key
  UNION ALL SELECT '703d600c-7663-4bd7-b2c7-45da6493b944'::uuid AS question_id, 'friendzone'::text AS expected_concept_key
  UNION ALL SELECT '75a003fb-4684-47d1-86e3-1682af19ebac'::uuid AS question_id, 'side_eye'::text AS expected_concept_key
  UNION ALL SELECT '7b718039-8bf4-4d7a-b7b6-76440ae581c9'::uuid AS question_id, 'low_key'::text AS expected_concept_key
  UNION ALL SELECT '80a20c26-6399-401f-9be4-707408886d0a'::uuid AS question_id, 'cest_valide'::text AS expected_concept_key
  UNION ALL SELECT '88036ce7-a2fd-429d-836c-8256a12f5387'::uuid AS question_id, 'triggered'::text AS expected_concept_key
  UNION ALL SELECT '9e87cf94-fc89-44df-8c3f-649719e6b8e8'::uuid AS question_id, 'scroll'::text AS expected_concept_key
  UNION ALL SELECT 'af656d7a-fd0d-419b-8028-26aa420f1c0e'::uuid AS question_id, 'boujee'::text AS expected_concept_key
  UNION ALL SELECT 'b3b6d229-6375-47f1-8c65-2d1eb2bda46d'::uuid AS question_id, 'unfollow_follow'::text AS expected_concept_key
  UNION ALL SELECT 'c4b9f3fd-cbff-44a8-8221-e7a7c77a332a'::uuid AS question_id, 'breadcrumbing'::text AS expected_concept_key
  UNION ALL SELECT 'c507662c-d78e-4f9f-931f-817a8d048172'::uuid AS question_id, 'clutch'::text AS expected_concept_key
  UNION ALL SELECT 'c9cfdd7b-c02e-4477-9b5d-4baa7de7bd4b'::uuid AS question_id, 'triggered'::text AS expected_concept_key
  UNION ALL SELECT 'cb0e54cb-acd5-4ad1-b05f-515a3e59051a'::uuid AS question_id, 'unfollow'::text AS expected_concept_key
  UNION ALL SELECT 'd2ba9a5c-f680-4c3b-a425-7fa201a700d8'::uuid AS question_id, 'double_text'::text AS expected_concept_key
  UNION ALL SELECT 'dcf678f7-6e33-4306-80ec-18983e24bb71'::uuid AS question_id, 'tryhard'::text AS expected_concept_key
  UNION ALL SELECT 'de52cfc7-d759-4142-8d8e-bc449cad5c2c'::uuid AS question_id, 'cest_valide'::text AS expected_concept_key
  UNION ALL SELECT 'e1eab53b-3244-4d75-818d-0ff15348326e'::uuid AS question_id, 'love_bombing'::text AS expected_concept_key
  UNION ALL SELECT 'e31184ec-c57d-450c-8952-cb4493ba8ead'::uuid AS question_id, 'ghoster_quelquun'::text AS expected_concept_key
  UNION ALL SELECT 'e48aa748-65f6-4372-a593-7514692b54fa'::uuid AS question_id, 'low_key'::text AS expected_concept_key
  UNION ALL SELECT 'e9ad9253-d1e4-43e0-8e94-0a214c0cc7b7'::uuid AS question_id, 'ship_deux_personnes'::text AS expected_concept_key
  UNION ALL SELECT 'ee012de3-f0ac-43df-b30f-475f42b4f1c9'::uuid AS question_id, 'ghoster_quelquun'::text AS expected_concept_key
  UNION ALL SELECT 'f319ce64-54ae-4983-8bb0-34785df164e2'::uuid AS question_id, 'love_bombing'::text AS expected_concept_key
  UNION ALL SELECT 'f82d8a81-19ab-4309-af00-c9e6d9acd74c'::uuid AS question_id, 'cursed'::text AS expected_concept_key
  UNION ALL SELECT 'fce2fd7f-5f9f-4c64-9842-0ac9afa12aa3'::uuid AS question_id, 'cursed'::text AS expected_concept_key
) AS m ON m.question_id = q.id
WHERE q.concept_key IS DISTINCT FROM m.expected_concept_key
ORDER BY q.id;

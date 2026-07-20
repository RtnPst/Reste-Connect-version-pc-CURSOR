-- PREVIEW ONLY — density-1-daily-core-vernacular
-- Editorial sign-off required. Do not run in prod without review.
-- Generated: 2026-05-24T19:15:05.521Z
-- Rows: 9

BEGIN;
UPDATE questions SET concept_key = 'red_flag' WHERE id = 'b0032b43-ad1b-41d7-82ea-b0857cf00907' AND status = 'live' AND concept_key IS NULL;
UPDATE questions SET concept_key = 'crush' WHERE id = 'c3aaaab2-4e74-4752-a554-7aa4a475baa8' AND status = 'live' AND concept_key IS NULL;
UPDATE questions SET concept_key = 'ratio' WHERE id = 'addb39c7-cf2f-48a2-ba8a-d5fb496de474' AND status = 'live' AND concept_key IS NULL;
UPDATE questions SET concept_key = 'ghoster' WHERE id = 'ee012de3-f0ac-43df-b30f-475f42b4f1c9' AND status = 'live' AND concept_key IS NOT DISTINCT FROM 'ghoster_quelquun';
UPDATE questions SET concept_key = 'flex' WHERE id = '023882fa-4f05-4c02-81af-0891403be434' AND status = 'live' AND concept_key IS NULL;
UPDATE questions SET concept_key = 'sus' WHERE id = 'ff2dea3b-d1d7-4e66-b043-4e05a61c4341' AND status = 'live' AND concept_key IS NULL;
UPDATE questions SET concept_key = 'bail' WHERE id = 'cd55919d-8510-4348-8339-98941c4e378b' AND status = 'live' AND concept_key IS NULL;
UPDATE questions SET concept_key = 'dead' WHERE id = '7acb5233-6a7f-4d44-88a8-1c1f15927477' AND status = 'live' AND concept_key IS NULL;
UPDATE questions SET concept_key = 'valide' WHERE id = '80a20c26-6399-401f-9be4-707408886d0a' AND status = 'live' AND concept_key IS NOT DISTINCT FROM 'cest_valide';
COMMIT;

-- Rollback preview:
-- UPDATE questions SET concept_key = NULL WHERE id = 'b0032b43-ad1b-41d7-82ea-b0857cf00907';
-- UPDATE questions SET concept_key = NULL WHERE id = 'c3aaaab2-4e74-4752-a554-7aa4a475baa8';
-- UPDATE questions SET concept_key = NULL WHERE id = 'addb39c7-cf2f-48a2-ba8a-d5fb496de474';
-- UPDATE questions SET concept_key = 'ghoster_quelquun' WHERE id = 'ee012de3-f0ac-43df-b30f-475f42b4f1c9';
-- UPDATE questions SET concept_key = NULL WHERE id = '023882fa-4f05-4c02-81af-0891403be434';
-- UPDATE questions SET concept_key = NULL WHERE id = 'ff2dea3b-d1d7-4e66-b043-4e05a61c4341';
-- UPDATE questions SET concept_key = NULL WHERE id = 'cd55919d-8510-4348-8339-98941c4e378b';
-- UPDATE questions SET concept_key = NULL WHERE id = '7acb5233-6a7f-4d44-88a8-1c1f15927477';
-- UPDATE questions SET concept_key = 'cest_valide' WHERE id = '80a20c26-6399-401f-9be4-707408886d0a';

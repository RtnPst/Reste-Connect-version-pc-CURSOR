-- =============================================================================
-- Tech & IA — Pilote v1 : activation réversible (15 UUID uniquement)
-- =============================================================================
-- Modifie uniquement status + is_active sur les lignes listées (theme = tech).
-- Ne touche pas : question, canonical_key en direct (trigger réaligne si besoin),
-- quiz_attempts, daily_questions.
--
-- Garde-fou : exactement 15 lignes mises à jour, sinon la migration échoue.
-- =============================================================================

DO $$
DECLARE
  n integer;
BEGIN
  UPDATE public.questions AS q
  SET
    status = 'live'::public.question_status,
    is_active = true
  WHERE q.theme = 'tech'::public.question_theme
    AND q.id IN (
      '077c75b7-6fd8-43b2-8a2d-8a429c97037e'::uuid,
      '6046d83b-5a8a-4368-8aee-e13f12039e80'::uuid,
      '1fde6c35-e7f4-41a7-8538-454b3674a78e'::uuid,
      '75a1ca57-7eb9-41a2-9978-ba5dbd745345'::uuid,
      '4cb0690d-7989-425b-9443-70d0dd2f2841'::uuid,
      '9264438a-62e1-4a7d-9e8a-56b8f945a0f3'::uuid,
      '6c439ee5-e5a8-47b6-913d-a5b1ed57ad97'::uuid,
      '8ec1b444-403e-43aa-91c5-87905c085d36'::uuid,
      '1aaa76ce-1ddc-4b0b-8b8d-f1aaa8b24db3'::uuid,
      '8b9767f7-5090-4b2c-b877-a2216288a63a'::uuid,
      '756d61d5-dc35-4797-a9cf-d75148ec93cd'::uuid,
      'fd04d847-4b4c-4981-acb6-11ce361a08ed'::uuid,
      '880c038f-66af-4eaf-b4c6-dcbbc96aa79b'::uuid,
      '18b88d74-16ef-4458-9084-27328abac1a8'::uuid,
      '42c1f695-63bd-454c-8a50-ca3a4c4e00e9'::uuid
    );

  GET DIAGNOSTICS n = ROW_COUNT;

  IF n <> 15 THEN
    RAISE EXCEPTION
      'tech pilot v1: expected 15 rows updated, got % (check UUIDs and theme=tech)',
      n;
  END IF;
END $$;

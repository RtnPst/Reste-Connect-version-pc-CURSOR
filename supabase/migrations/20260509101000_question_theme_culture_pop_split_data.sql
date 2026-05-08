-- Apply approved theme assignments for the culture internet split (68 live rows).
-- Depends on: 20260509100000_question_theme_add_split_enum_values.sql
-- Rollback: restore theme to culture_pop per question id (see CULTURE_POP_THEME_SPLIT_ROLLBACK.sql).
--
-- trg_sync_question_editorial_fields (BEFORE INSERT OR UPDATE) always sets
--   canonical_key := normalize_question_canonical_key(question).
-- Theme-only UPDATE still fires it; recomputed canonical_key can collide with another row
-- (same normalized text, e.g. live vs archived duplicate) on idx_questions_canonical_key_unique.
-- We disable only this trigger for the bulk theme patch; question text is unchanged.
--
-- Idempotent: updates only rows where theme IS DISTINCT FROM target; final COUNT must be 68.

DO $$
DECLARE
  n integer;
  ok integer;
BEGIN
  CREATE TEMP TABLE _culture_pop_split_map (
    id uuid PRIMARY KEY,
    new_theme public.question_theme NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _culture_pop_split_map (id, new_theme) VALUES
    ('01352b8b-2595-4620-bbfc-a43b61263084'::uuid, 'gaming'::public.question_theme),
    ('0258f3e1-41b6-4e9c-bedc-077d5fbe7825'::uuid, 'relations_lifestyle'::public.question_theme),
    ('05b908c4-c672-453b-a358-ac6e2b79f31a'::uuid, 'gaming'::public.question_theme),
    ('06edab68-0d17-43e1-8692-071cd47eb7b7'::uuid, 'trends_pop_culture'::public.question_theme),
    ('0db5c36f-1ada-44d7-b950-de6a6fb8167c'::uuid, 'gaming'::public.question_theme),
    ('111d65a5-56fe-4bc5-8f98-6d3736b97101'::uuid, 'tech'::public.question_theme),
    ('1ca61163-daeb-4c32-a6d5-1947fa40417b'::uuid, 'gaming'::public.question_theme),
    ('223ad5ae-5148-4066-90c0-9ed52bf80083'::uuid, 'relations_lifestyle'::public.question_theme),
    ('28e32e91-0f5c-43ed-a935-99065c611090'::uuid, 'gaming'::public.question_theme),
    ('29510230-56c2-41b7-81af-900766761267'::uuid, 'trends_pop_culture'::public.question_theme),
    ('2e9fbff2-b362-4400-b728-95122cd5790b'::uuid, 'trends_pop_culture'::public.question_theme),
    ('2f0980e2-1286-41d5-b41b-ad36b13c26d2'::uuid, 'gaming'::public.question_theme),
    ('2f564d0d-d8b1-4532-95fd-51acbaee7c61'::uuid, 'gaming'::public.question_theme),
    ('37211885-9c58-4fe5-9c94-139c5918aa29'::uuid, 'gaming'::public.question_theme),
    ('3a25f0e3-f836-4059-a152-d7be91ae9e78'::uuid, 'gaming'::public.question_theme),
    ('4081961e-a233-47b0-abcf-24e76f0c7393'::uuid, 'trends_pop_culture'::public.question_theme),
    ('415fd5a6-0e74-4c65-9603-f2ba7a767878'::uuid, 'gaming'::public.question_theme),
    ('4f513adf-0c13-4dcd-8d63-0cdef1f79717'::uuid, 'gaming'::public.question_theme),
    ('5f041b78-6e40-4b78-a6f9-884714efa43b'::uuid, 'gaming'::public.question_theme),
    ('5f982b9c-5837-4209-8645-84f1ec6acd77'::uuid, 'gaming'::public.question_theme),
    ('60f534aa-5adb-431f-9fb3-a6af6047cbdc'::uuid, 'trends_pop_culture'::public.question_theme),
    ('69dbfdb6-1fa6-45dd-bc52-04d2924af2bc'::uuid, 'trends_pop_culture'::public.question_theme),
    ('6d1156b8-d1bd-4686-bca3-f31146be6362'::uuid, 'trends_pop_culture'::public.question_theme),
    ('6eee381c-486f-47fb-a909-d580f6c933cf'::uuid, 'trends_pop_culture'::public.question_theme),
    ('703d600c-7663-4bd7-b2c7-45da6493b944'::uuid, 'relations_lifestyle'::public.question_theme),
    ('70d06ca1-c8c8-4685-8b32-2cf890035cc8'::uuid, 'trends_pop_culture'::public.question_theme),
    ('7217cc30-ad93-4628-9caf-68cc68d85265'::uuid, 'trends_pop_culture'::public.question_theme),
    ('732bc817-5451-493c-b503-f445226ce4b1'::uuid, 'trends_pop_culture'::public.question_theme),
    ('73c8fd62-9caf-4433-ba00-6afdc4488ddf'::uuid, 'trends_pop_culture'::public.question_theme),
    ('79639004-1b57-4621-8fc3-418ceadd4a06'::uuid, 'trends_pop_culture'::public.question_theme),
    ('7acb5233-6a7f-4d44-88a8-1c1f15927477'::uuid, 'trends_pop_culture'::public.question_theme),
    ('7ce0eacd-f586-4ce4-a478-be856a579172'::uuid, 'trends_pop_culture'::public.question_theme),
    ('7ec5ca6a-bc56-4d3e-bc6c-6bedd59d97e7'::uuid, 'trends_pop_culture'::public.question_theme),
    ('8313de64-93d0-43e6-8630-e2169721be19'::uuid, 'relations_lifestyle'::public.question_theme),
    ('83505e5f-33b0-470b-80bd-b2c6cf27d0d5'::uuid, 'gaming'::public.question_theme),
    ('88036ce7-a2fd-429d-836c-8256a12f5387'::uuid, 'trends_pop_culture'::public.question_theme),
    ('88b42927-670e-4a21-9468-7bcf68d0ebce'::uuid, 'trends_pop_culture'::public.question_theme),
    ('8deec39a-f3cf-4ef7-85ae-6d80de8c1999'::uuid, 'trends_pop_culture'::public.question_theme),
    ('92568fda-0db5-4004-b28b-f6a3ad6ab289'::uuid, 'gaming'::public.question_theme),
    ('973c379d-2b06-4676-be21-01f9498ba962'::uuid, 'trends_pop_culture'::public.question_theme),
    ('9c22bc71-085d-47c8-80a8-2f7c5f928035'::uuid, 'trends_pop_culture'::public.question_theme),
    ('9c656228-2cbf-44ca-8c9a-d1db3dc565cd'::uuid, 'trends_pop_culture'::public.question_theme),
    ('9de4d106-b8e2-4636-9630-e377c23e7188'::uuid, 'trends_pop_culture'::public.question_theme),
    ('aa8680ec-5be3-43ab-8bcb-c857d832859f'::uuid, 'trends_pop_culture'::public.question_theme),
    ('b0032b43-ad1b-41d7-82ea-b0857cf00907'::uuid, 'relations_lifestyle'::public.question_theme),
    ('b17adfbc-3a0d-4a11-b4b0-dfbaeb45fd6e'::uuid, 'tech'::public.question_theme),
    ('b397a5a6-2903-4357-ba96-fab096d81f4f'::uuid, 'trends_pop_culture'::public.question_theme),
    ('b613bac2-1269-47ba-861c-b0f8529d7b8b'::uuid, 'trends_pop_culture'::public.question_theme),
    ('bf7c391b-3a97-43a5-8ddc-285eafc9f59a'::uuid, 'gaming'::public.question_theme),
    ('c0625aa6-1162-4b35-abee-da2483e87241'::uuid, 'trends_pop_culture'::public.question_theme),
    ('c3aaaab2-4e74-4752-a554-7aa4a475baa8'::uuid, 'relations_lifestyle'::public.question_theme),
    ('c4845877-19f6-414e-88a6-cad9ca178a1b'::uuid, 'trends_pop_culture'::public.question_theme),
    ('c4b9f3fd-cbff-44a8-8221-e7a7c77a332a'::uuid, 'relations_lifestyle'::public.question_theme),
    ('c7eb9085-9685-4af7-bbd7-5a49a30dadb8'::uuid, 'trends_pop_culture'::public.question_theme),
    ('cd0d3e5b-cac4-47e8-ba43-2a8c511a1ad2'::uuid, 'trends_pop_culture'::public.question_theme),
    ('cf40373f-e968-43e4-b1d8-89923b54e1fd'::uuid, 'relations_lifestyle'::public.question_theme),
    ('d2ba9a5c-f680-4c3b-a425-7fa201a700d8'::uuid, 'relations_lifestyle'::public.question_theme),
    ('d4cb8888-26c4-42e5-8643-2ce1958a2ecc'::uuid, 'trends_pop_culture'::public.question_theme),
    ('ddca15ca-84ad-4c78-b95e-4ce1ea2df777'::uuid, 'gaming'::public.question_theme),
    ('de5404b0-5c39-4b01-9d77-b40885b6932f'::uuid, 'gaming'::public.question_theme),
    ('e37001d4-44be-4cf3-a2b2-6051d776106a'::uuid, 'gaming'::public.question_theme),
    ('e9ad9253-d1e4-43e0-8e94-0a214c0cc7b7'::uuid, 'relations_lifestyle'::public.question_theme),
    ('ebc9e417-d7fb-49f7-87ae-b2e8dae80151'::uuid, 'gaming'::public.question_theme),
    ('ecd90772-00dd-40e7-9b8c-986e1b6c4e20'::uuid, 'tech'::public.question_theme),
    ('ee012de3-f0ac-43df-b30f-475f42b4f1c9'::uuid, 'relations_lifestyle'::public.question_theme),
    ('f319ce64-54ae-4983-8bb0-34785df164e2'::uuid, 'relations_lifestyle'::public.question_theme),
    ('f6ba8854-9273-4554-a5ee-5b845a8fb636'::uuid, 'trends_pop_culture'::public.question_theme),
    ('fce2fd7f-5f9f-4c64-9842-0ac9afa12aa3'::uuid, 'trends_pop_culture'::public.question_theme);

  ALTER TABLE public.questions DISABLE TRIGGER trg_sync_question_editorial_fields;

  UPDATE public.questions AS q
  SET theme = m.new_theme
  FROM _culture_pop_split_map AS m
  WHERE q.id = m.id
    AND q.theme IS DISTINCT FROM m.new_theme;

  GET DIAGNOSTICS n = ROW_COUNT;

  ALTER TABLE public.questions ENABLE TRIGGER trg_sync_question_editorial_fields;

  SELECT COUNT(*) INTO ok
  FROM public.questions AS q
  INNER JOIN _culture_pop_split_map AS m ON q.id = m.id AND q.theme = m.new_theme;

  IF ok <> 68 THEN
    RAISE EXCEPTION 'culture_pop split: expected 68 rows at target themes, got % (updated % this run)', ok, n;
  END IF;
END $$;

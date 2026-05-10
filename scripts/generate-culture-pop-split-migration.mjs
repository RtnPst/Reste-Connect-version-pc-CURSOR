import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const csvPath = resolve(root, "exports/culture-pop-pool/culture-pop-live-review-approved.csv");
const enumSql = resolve(root, "supabase/migrations/20260509100000_question_theme_add_split_enum_values.sql");
const dataSql = resolve(root, "supabase/migrations/20260509101000_question_theme_culture_pop_split_data.sql");
const rollbackSql = resolve(root, "exports/culture-pop-pool/CULTURE_POP_THEME_SPLIT_ROLLBACK.sql");

function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === "," && !inQuotes) {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  cells.push(cur);
  return cells;
}

const raw = readFileSync(csvPath, "utf8");
const lines = raw.trim().split(/\r?\n/);
const header = parseCsvLine(lines[0]);
const idxId = header.indexOf("id");
const idxHuman = header.indexOf("human_approved_theme");
const rows = [];
for (let i = 1; i < lines.length; i++) {
  const cells = parseCsvLine(lines[i]);
  rows.push({
    id: cells[idxId]?.trim(),
    theme: cells[idxHuman]?.trim(),
  });
}

const enumBody = `-- Split culture internet: add new question_theme enum values.
-- culture_pop remains available as legacy.
-- Next migration applies row updates (depends on these labels existing).

ALTER TYPE public.question_theme ADD VALUE IF NOT EXISTS 'gaming';
ALTER TYPE public.question_theme ADD VALUE IF NOT EXISTS 'trends_pop_culture';
ALTER TYPE public.question_theme ADD VALUE IF NOT EXISTS 'relations_lifestyle';
`;

const insertValues = rows
  .map((r) => `    ('${r.id}'::uuid, '${r.theme}'::public.question_theme)`)
  .join(",\n");

const dataBody = `-- Apply approved theme assignments for the culture internet split (68 live rows).
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
${insertValues};

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
`;

const idList = rows.map((r) => `  '${r.id}'::uuid`).join(",\n");
const rollbackBody = `-- Optional manual rollback: restore the 68 live questions to theme culture_pop
-- (data migration 20260509101000 only). Does not remove enum values or revert badge functions.
-- Same trigger caveat as forward migration: disable editorial sync for theme-only writes.

BEGIN;

ALTER TABLE public.questions DISABLE TRIGGER trg_sync_question_editorial_fields;

UPDATE public.questions
SET theme = 'culture_pop'::public.question_theme
WHERE id IN (
${idList}
);

ALTER TABLE public.questions ENABLE TRIGGER trg_sync_question_editorial_fields;

COMMIT;
`;

writeFileSync(enumSql, enumBody, "utf8");
writeFileSync(dataSql, dataBody, "utf8");
writeFileSync(rollbackSql, rollbackBody, "utf8");
console.log("Wrote", enumSql, "\n     ", dataSql, "\n     ", rollbackSql, "rows:", rows.length);

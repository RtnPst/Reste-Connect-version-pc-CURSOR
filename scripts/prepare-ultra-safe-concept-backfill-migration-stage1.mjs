/**
 * Prepare first real concept_key backfill migration (ultra-safe pilot), without applying.
 *
 * Input:
 *   exports/dedup-audit/ultra-safe-concept-backfill-pilot-latest.csv
 *
 * Outputs:
 *   supabase/migrations/<timestamp>_backfill_questions_concept_key_ultra_safe_pilot.sql
 *   exports/dedup-audit/ultra-safe-concept-backfill-pilot-rollback-latest.sql
 *   exports/dedup-audit/ultra-safe-concept-backfill-pilot-post-apply-validation-latest.sql
 *   exports/dedup-audit/ultra-safe-concept-backfill-pilot-migration-summary-latest.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inCsv = resolve(
  root,
  "exports/dedup-audit/ultra-safe-concept-backfill-pilot-latest.csv",
);
const outDir = resolve(root, "exports/dedup-audit");
const migrationsDir = resolve(root, "supabase/migrations");

const migrationFileName =
  "20260509120500_backfill_questions_concept_key_ultra_safe_pilot.sql";

function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        q = !q;
      }
      continue;
    }
    if (!q && ch === ",") {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return cells;
}

function readCsv(path) {
  const raw = readFileSync(path, "utf8").trimEnd();
  const lines = raw.split(/\r?\n/);
  const header = parseCsvLine(lines[0]).map((s) => String(s).trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const c = parseCsvLine(lines[i]);
    const row = {};
    for (let j = 0; j < header.length; j++) row[header[j]] = c[j] ?? "";
    rows.push(row);
  }
  return { header, rows };
}

function main() {
  if (!existsSync(inCsv)) {
    console.error("Missing CSV:", inCsv);
    process.exit(1);
  }
  const { rows } = readCsv(inCsv);
  const included = rows.filter(
    (r) => String(r.inclusion_status ?? "").trim() === "included_ultra_safe",
  );

  const expectedRows = 40;
  if (included.length !== expectedRows) {
    console.error(
      `Pilot row mismatch: expected ${expectedRows}, found ${included.length}`,
    );
    process.exit(1);
  }

  const byId = new Map();
  for (const r of included) {
    const id = String(r.question_id ?? "").trim();
    const ck = String(r.proposed_concept_key ?? "").trim();
    if (!id || !ck) {
      console.error("Invalid included row (missing id/key):", r);
      process.exit(1);
    }
    if (byId.has(id) && byId.get(id) !== ck) {
      console.error("Conflicting mappings for same question_id:", id);
      process.exit(1);
    }
    byId.set(id, ck);
  }

  const mapping = [...byId.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const groups = new Set(included.map((r) => String(r.duplicate_group_id ?? "").trim()));
  const concepts = [...new Set(included.map((r) => String(r.proposed_concept_key ?? "").trim()))].sort(
    (a, b) => a.localeCompare(b),
  );

  mkdirSync(outDir, { recursive: true });
  mkdirSync(migrationsDir, { recursive: true });

  const migrationSql = `-- Stage 1 ultra-safe pilot: backfill questions.concept_key only.
-- Source artifact: exports/dedup-audit/ultra-safe-concept-backfill-pilot-latest.csv
-- Scope: ${expectedRows} rows, ${groups.size} duplicate groups, ${concepts.length} concept keys.
-- Constraints:
--   - ONLY updates public.questions.concept_key
--   - no gameplay/status/theme changes
--   - no deletes
--   - no quiz_attempts/daily_questions changes
-- Idempotent behavior:
--   - UPDATE only when concept_key IS DISTINCT FROM mapped value.

CREATE TEMP TABLE _concept_key_ultra_safe_pilot_map (
  question_id uuid PRIMARY KEY,
  new_concept_key text NOT NULL
) ON COMMIT DROP;

INSERT INTO _concept_key_ultra_safe_pilot_map (question_id, new_concept_key) VALUES
${mapping.map(([id, ck]) => `  ('${id}'::uuid, '${ck}')`).join(",\n")};

DO $$
DECLARE
  n_present integer;
BEGIN
  SELECT COUNT(*) INTO n_present
  FROM _concept_key_ultra_safe_pilot_map m
  INNER JOIN public.questions q ON q.id = m.question_id;

  IF n_present <> ${expectedRows} THEN
    RAISE EXCEPTION
      'concept_key_ultra_safe_pilot: expected % mapped questions to exist, found %',
      ${expectedRows}, n_present;
  END IF;

  UPDATE public.questions AS q
  SET concept_key = m.new_concept_key
  FROM _concept_key_ultra_safe_pilot_map AS m
  WHERE q.id = m.question_id
    AND q.concept_key IS DISTINCT FROM m.new_concept_key;

  IF EXISTS (
    SELECT 1
    FROM public.questions q
    INNER JOIN _concept_key_ultra_safe_pilot_map m ON m.question_id = q.id
    WHERE q.concept_key IS DISTINCT FROM m.new_concept_key
  ) THEN
    RAISE EXCEPTION
      'concept_key_ultra_safe_pilot: post-check failed; at least one row has unexpected concept_key';
  END IF;
END $$;
`;

  const rollbackSql = `-- Rollback for Stage 1 ultra-safe pilot concept_key backfill.
-- Conservative rollback: only revert rows that still hold the pilot-applied concept_key.
-- This avoids clobbering later manual edits.

CREATE TEMP TABLE _concept_key_ultra_safe_pilot_rollback_map (
  question_id uuid PRIMARY KEY,
  pilot_concept_key text NOT NULL
) ON COMMIT DROP;

INSERT INTO _concept_key_ultra_safe_pilot_rollback_map (question_id, pilot_concept_key) VALUES
${mapping.map(([id, ck]) => `  ('${id}'::uuid, '${ck}')`).join(",\n")};

UPDATE public.questions AS q
SET concept_key = NULL
FROM _concept_key_ultra_safe_pilot_rollback_map AS m
WHERE q.id = m.question_id
  AND q.concept_key = m.pilot_concept_key;
`;

  const validationSql = `-- Post-apply validation query for Stage 1 ultra-safe pilot.
-- 1) Check exact expected row count (should be ${expectedRows})
SELECT COUNT(*) AS mapped_rows_with_expected_key
FROM public.questions q
INNER JOIN (
${mapping
  .map(
    ([id, ck], i) =>
      `${i === 0 ? "  SELECT" : "  UNION ALL SELECT"} '${id}'::uuid AS question_id, '${ck}'::text AS expected_concept_key`,
  )
  .join("\n")}
) AS m ON m.question_id = q.id
WHERE q.concept_key = m.expected_concept_key;

-- 2) List any mismatches (should return 0 rows)
SELECT q.id, q.concept_key AS actual_concept_key, m.expected_concept_key
FROM public.questions q
INNER JOIN (
${mapping
  .map(
    ([id, ck], i) =>
      `${i === 0 ? "  SELECT" : "  UNION ALL SELECT"} '${id}'::uuid AS question_id, '${ck}'::text AS expected_concept_key`,
  )
  .join("\n")}
) AS m ON m.question_id = q.id
WHERE q.concept_key IS DISTINCT FROM m.expected_concept_key
ORDER BY q.id;
`;

  const summary = {
    generated_at: new Date().toISOString(),
    policy: "real_migration_preparation_ultra_safe_pilot_only",
    migration_filename: `supabase/migrations/${migrationFileName}`,
    expected_rows: expectedRows,
    group_count: groups.size,
    concept_key_count: concepts.length,
    concept_keys: concepts,
    rollback_file:
      "exports/dedup-audit/ultra-safe-concept-backfill-pilot-rollback-latest.sql",
    validation_file:
      "exports/dedup-audit/ultra-safe-concept-backfill-pilot-post-apply-validation-latest.sql",
    no_db_updates_performed: true,
  };

  writeFileSync(join(migrationsDir, migrationFileName), migrationSql, "utf8");
  writeFileSync(
    join(outDir, "ultra-safe-concept-backfill-pilot-rollback-latest.sql"),
    rollbackSql,
    "utf8",
  );
  writeFileSync(
    join(outDir, "ultra-safe-concept-backfill-pilot-post-apply-validation-latest.sql"),
    validationSql,
    "utf8",
  );
  writeFileSync(
    join(outDir, "ultra-safe-concept-backfill-pilot-migration-summary-latest.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );

  console.log(JSON.stringify(summary, null, 2));
}

main();


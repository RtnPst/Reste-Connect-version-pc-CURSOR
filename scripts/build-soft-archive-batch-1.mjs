/**
 * Soft stabilization — archive batch #1 (manifest-driven, no DB calls).
 *
 * Source: exports/dedup-audit/archive-calm-batch-rows-latest.csv produced by
 * `npm run preview:archive-calm-batch -- --write` (strict calm criteria:
 * no critical groups, no high-priority ambiguity, zero quiz+daily refs on all
 * members, exactly one live+active canonical, variants already legacy in that snapshot).
 *
 * This batch lists those 83 non-canonical variant UUIDs and proposes:
 *   UPDATE questions SET status = archived, is_active = false WHERE id IN (...)
 * Idempotent: no-op rows already archived/inactive. Reinforces traceability if DB drifted.
 *
 * Outputs: exports/dedup-audit/soft-archive-batch-1-*
 *
 * Usage: node scripts/build-soft-archive-batch-1.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestRowsPath = resolve(
  root,
  "exports/dedup-audit/archive-calm-batch-rows-latest.csv",
);
const criticalPath = resolve(
  root,
  "exports/dedup-audit/exact-dup-critical-canonical-decisions.json",
);
const outDir = resolve(root, "exports/dedup-audit");

function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      q = !q;
      continue;
    }
    if (!q && c === ",") {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  cells.push(cur);
  return cells;
}

function main() {
  const criticalDoc = JSON.parse(readFileSync(criticalPath, "utf8"));
  const criticalIds = new Set(Object.keys(criticalDoc.groups ?? {}));

  const raw = readFileSync(manifestRowsPath, "utf8");
  const lines = raw.trim().split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const idxGroup = header.indexOf("duplicate_group_id");
  const idxId = header.indexOf("id");
  const idxRole = header.indexOf("role");
  const idxStatus = header.indexOf("status");
  const idxActive = header.indexOf("is_active");
  const idxTheme = header.indexOf("theme");
  const idxDiff = header.indexOf("difficulty");
  const idxPreview = header.indexOf("question_preview");

  /** @type {Map<string, {canonical: string, variants: any[]}>} */
  const groups = new Map();
  for (let i = 1; i < lines.length; i++) {
    const c = parseCsvLine(lines[i]);
    const gid = c[idxGroup]?.trim();
    if (!gid || criticalIds.has(gid)) continue;
    const id = c[idxId]?.trim();
    const role = c[idxRole]?.trim();
    const row = {
      duplicate_group_id: gid,
      id,
      role,
      status_before: c[idxStatus]?.trim(),
      is_active_before: c[idxActive]?.trim() === "true",
      theme: c[idxTheme]?.trim(),
      difficulty: c[idxDiff]?.trim(),
      question_preview: c[idxPreview] ?? "",
    };
    if (!groups.has(gid)) groups.set(gid, { canonical: "", variants: [] });
    const g = groups.get(gid);
    if (role === "canonical_live") g.canonical = id;
    else if (role === "legacy_archived") g.variants.push(row);
  }

  const eligibleGroups = [];
  const plannedRows = [];

  for (const [groupId, g] of [...groups.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    if (!g.canonical || g.variants.length !== 1) {
      console.error("Skipping malformed group from manifest:", groupId, g);
      continue;
    }
    eligibleGroups.push({
      group_id: groupId,
      canonical_question_id: g.canonical,
      variant_ids_to_archive: g.variants.map((v) => v.id),
    });
    for (const v of g.variants) {
      plannedRows.push({
        duplicate_group_id: groupId,
        id: v.id,
        status_before: v.status_before,
        is_active_before: v.is_active_before,
        theme: v.theme,
        difficulty: v.difficulty,
        canonical_question_id: g.canonical,
        question_preview: v.question_preview,
        human_review_status: "manifest_archive_calm_batch",
        human_notes:
          "Row from archive-calm-batch-rows-latest.csv (strict calm). Variant UUID only; canonical never updated here.",
      });
    }
  }

  const variantIdList = plannedRows.map((r) => r.id);
  const nVariants = variantIdList.length;
  const nGroups = eligibleGroups.length;

  const summary = {
    generated_at: new Date().toISOString(),
    policy: "archive_calm_manifest_batch_1",
    source_manifest: "exports/dedup-audit/archive-calm-batch-rows-latest.csv",
    source_manifest_doc: "exports/dedup-audit/ARCHIVE_CALM_BATCH_PLAN.md",
    duplicate_groups_in_batch: nGroups,
    variant_question_rows_targeted: nVariants,
    criteria_recap: {
      excluded_critical_groups: [...criticalIds],
      from_calm_preview: "83 families: zero refs on all members; single live+active canonical; non-critical; not high-priority per preview script",
      sql_operations: "SET status=archived, is_active=false ONLY for variant UUIDs (never canonical)",
      no_deletes: true,
      no_quiz_attempt_rewrite: true,
    },
    idempotent: true,
    note:
      "On the May 7 snapshot, variants were already archived — migration is a guarded re-apply if any row drifted. Re-run `npm run preview:archive-calm-batch -- --write` after DB churn, then re-run this script.",
  };

  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  const preview = { summary, groups: eligibleGroups, planned_updates: plannedRows };
  writeFileSync(
    join(outDir, `soft-archive-batch-1-preview-${stamp}.json`),
    JSON.stringify(preview, null, 2),
    "utf8",
  );
  writeFileSync(
    join(outDir, "soft-archive-batch-1-preview-latest.json"),
    JSON.stringify(preview, null, 2),
    "utf8",
  );

  const revHeader = [
    "duplicate_group_id",
    "id",
    "status_before",
    "is_active_before",
    "theme",
    "difficulty",
    "canonical_question_id",
    "question_preview",
    "human_review_status",
    "human_notes",
  ];
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csvLines = [
    revHeader.join(","),
    ...plannedRows.map((r) => revHeader.map((h) => esc(r[h])).join(",")),
  ];
  writeFileSync(
    join(outDir, `soft-archive-batch-1-reviewed-${stamp}.csv`),
    csvLines.join("\n"),
    "utf8",
  );
  writeFileSync(
    join(outDir, "soft-archive-batch-1-reviewed-latest.csv"),
    csvLines.join("\n"),
    "utf8",
  );

  const migrationSql = `-- Soft stabilization batch 1 — enforce archived+inactive for calm-batch VARIANTS only (no deletes).
-- Manifest: exports/dedup-audit/archive-calm-batch-rows-latest.csv
-- Preview: exports/dedup-audit/soft-archive-batch-1-preview-latest.json
--
-- Families: ${nGroups}; variant UUIDs: ${nVariants}.
-- Guard: every listed UUID must exist; after run, each must be status=archived AND is_active=false.
-- Canonical UUIDs are NOT listed here and are never updated by this file.
-- Idempotent: rows already archived remain valid.

CREATE TEMP TABLE _soft_archive_batch_1_variants (id uuid PRIMARY KEY) ON COMMIT DROP;

INSERT INTO _soft_archive_batch_1_variants (id) VALUES
${variantIdList.map((id) => `  ('${id}'::uuid)`).join(",\n")};

ALTER TABLE public.questions DISABLE TRIGGER trg_sync_question_editorial_fields;

DO $$
DECLARE
  n_present integer;
BEGIN
  SELECT COUNT(*) INTO n_present
  FROM _soft_archive_batch_1_variants v
  INNER JOIN public.questions q ON q.id = v.id;

  IF n_present <> ${nVariants} THEN
    RAISE EXCEPTION 'soft_archive_batch_1: expected % variant UUIDs present in public.questions, found %', ${nVariants}, n_present;
  END IF;

  UPDATE public.questions AS q
  SET
    status = 'archived'::public.question_status,
    is_active = false
  FROM _soft_archive_batch_1_variants AS v
  WHERE q.id = v.id
    AND (
      q.status IS DISTINCT FROM 'archived'::public.question_status
      OR q.is_active IS DISTINCT FROM false
    );

  IF EXISTS (
    SELECT 1
    FROM public.questions q
    INNER JOIN _soft_archive_batch_1_variants v ON v.id = q.id
    WHERE q.status IS DISTINCT FROM 'archived'::public.question_status
       OR q.is_active IS DISTINCT FROM false
  ) THEN
    RAISE EXCEPTION 'soft_archive_batch_1: post-check failed — a variant is not archived/inactive';
  END IF;
END $$;

ALTER TABLE public.questions ENABLE TRIGGER trg_sync_question_editorial_fields;
`;

  const rollbackSql = `-- Rollback soft_archive_batch_1 — restore variant status/is_active from soft-archive-batch-1-reviewed-latest.csv snapshot.
-- Use only if this migration ran and you need to revert variant rows to their pre-migration editorial flags.
-- Does not delete rows; does not touch quiz_attempts.

CREATE TEMP TABLE _soft_archive_batch_1_rollback (
  id uuid PRIMARY KEY,
  status public.question_status NOT NULL,
  is_active boolean NOT NULL
);

INSERT INTO _soft_archive_batch_1_rollback (id, status, is_active) VALUES
${plannedRows
  .map(
    (r) =>
      `  ('${r.id}'::uuid, '${r.status_before}'::public.question_status, ${r.is_active_before})`,
  )
  .join(",\n")};

ALTER TABLE public.questions DISABLE TRIGGER trg_sync_question_editorial_fields;

UPDATE public.questions AS q
SET
  status = r.status,
  is_active = r.is_active
FROM _soft_archive_batch_1_rollback AS r
WHERE q.id = r.id;

ALTER TABLE public.questions ENABLE TRIGGER trg_sync_question_editorial_fields;
`;

  writeFileSync(
    join(outDir, `soft-archive-batch-1-proposed-migration-${stamp}.sql`),
    migrationSql,
    "utf8",
  );
  writeFileSync(
    join(outDir, "soft-archive-batch-1-proposed-migration-latest.sql"),
    migrationSql,
    "utf8",
  );
  writeFileSync(join(outDir, `soft-archive-batch-1-rollback-${stamp}.sql`), rollbackSql, "utf8");
  writeFileSync(join(outDir, "soft-archive-batch-1-rollback-latest.sql"), rollbackSql, "utf8");

  console.log(JSON.stringify(summary, null, 2));
}

main();

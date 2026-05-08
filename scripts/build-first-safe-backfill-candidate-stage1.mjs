/**
 * Build first-safe concept_key backfill candidate (preview-only).
 *
 * Rules applied:
 * - include only high-confidence rows
 * - exclude keys flagged in risk registry
 * - exclude risk actions manual_review / expand_key / split_later
 * - exclude semantic collision candidate keys
 * - exclude Batch 2 dormant groups
 *
 * Outputs:
 * - exports/dedup-audit/first-safe-backfill-candidate-latest.csv
 * - exports/dedup-audit/first-safe-backfill-candidate-latest.json
 * - exports/dedup-audit/first-safe-backfill-candidate-proposed-sql-latest.sql
 * - exports/dedup-audit/first-safe-backfill-candidate-rollback-latest.sql
 *
 * No DB writes.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "exports/dedup-audit");

const paths = {
  suggestions: resolve(outDir, "concept-key-suggestions-latest.csv"),
  reviewedTop: resolve(outDir, "concept-key-group-top-attention-reviewed-latest.csv"),
  riskRegistry: resolve(outDir, "concept-key-risk-registry-latest.csv"),
  collisions: resolve(outDir, "concept-key-semantic-collision-review-latest.csv"),
  batch2: resolve(outDir, "soft-archive-batch-2-preview-latest.json"),
};

function parseCsvLine(line) {
  const out = [];
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
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function readCsv(path) {
  if (!existsSync(path)) return { header: [], rows: [] };
  const raw = readFileSync(path, "utf8").trimEnd();
  if (!raw) return { header: [], rows: [] };
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

function csvEscape(v) {
  const s = v == null ? "" : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function main() {
  for (const p of Object.values(paths)) {
    if (!existsSync(p)) {
      console.error("Missing required artifact:", p);
      process.exit(1);
    }
  }

  const suggestions = readCsv(paths.suggestions);
  const reviewedTop = readCsv(paths.reviewedTop);
  const risk = readCsv(paths.riskRegistry);
  const collisions = readCsv(paths.collisions);
  const batch2 = JSON.parse(readFileSync(paths.batch2, "utf8"));

  // map duplicate_group_id -> resolved_concept_key from reviewed top attention
  const resolvedTopMap = new Map();
  for (const r of reviewedTop.rows) {
    const gid = String(r.duplicate_group_id ?? "").trim();
    const ck = String(r.resolved_concept_key ?? "").trim();
    if (gid && ck) resolvedTopMap.set(gid, ck);
  }

  // risky keys and risky-action keys
  const riskAllKeys = new Set();
  const riskActionKeys = new Set();
  for (const r of risk.rows) {
    const k = String(r.concept_key ?? "").trim();
    if (!k) continue;
    riskAllKeys.add(k);
    const action = String(r.suggested_action ?? "").trim();
    if (["manual_review", "expand_key", "split_later"].includes(action)) {
      riskActionKeys.add(k);
    }
  }

  // collision candidate keys
  const collisionKeys = new Set();
  for (const r of collisions.rows) {
    const a = String(r.key_a ?? "").trim();
    const b = String(r.key_b ?? "").trim();
    if (a) collisionKeys.add(a);
    if (b) collisionKeys.add(b);
  }

  // batch2 dormant groups to exclude
  const batch2Groups = new Set(
    (Array.isArray(batch2.groups) ? batch2.groups : [])
      .map((g) => String(g.group_id ?? "").trim())
      .filter(Boolean),
  );

  const decisionRows = [];
  const excludedReasonCounts = {};
  const includedGroupSet = new Set();

  for (const s of suggestions.rows) {
    const questionId = String(s.question_id ?? "").trim();
    const gid = String(s.duplicate_group_id ?? "").trim();
    const confidence = String(s.suggestion_confidence ?? "").trim();
    const baseCk = String(s.concept_key_suggested ?? "").trim();
    const proposed = resolvedTopMap.get(gid) ?? baseCk;

    const reasons = [];
    if (confidence !== "high") reasons.push("confidence_not_high");
    if (riskAllKeys.has(proposed)) reasons.push("concept_key_flagged_in_risk_registry");
    if (riskActionKeys.has(proposed)) reasons.push("risk_action_requires_manual_review");
    if (collisionKeys.has(proposed)) reasons.push("semantic_collision_candidate");
    if (batch2Groups.has(gid)) reasons.push("batch2_dormant_group_excluded_for_now");

    const included = reasons.length === 0;
    if (included) includedGroupSet.add(gid);

    for (const r of reasons) excludedReasonCounts[r] = (excludedReasonCounts[r] ?? 0) + 1;

    decisionRows.push({
      question_id: questionId,
      duplicate_group_id: gid,
      current_concept_key: "",
      proposed_concept_key: proposed,
      source: resolvedTopMap.has(gid) ? "top_attention_review_resolved" : "concept_key_suggestion_default",
      confidence,
      inclusion_status: included ? "included_safe_batch" : "excluded",
      exclusion_reason: reasons.join(";"),
    });
  }

  decisionRows.sort((a, b) => {
    if (a.inclusion_status !== b.inclusion_status) {
      return a.inclusion_status === "included_safe_batch" ? -1 : 1;
    }
    const dg = a.duplicate_group_id.localeCompare(b.duplicate_group_id);
    if (dg !== 0) return dg;
    return a.question_id.localeCompare(b.question_id);
  });

  const includedRows = decisionRows.filter((r) => r.inclusion_status === "included_safe_batch");
  const includedIds = includedRows.map((r) => r.question_id);

  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  // 1) CSV
  const csvHeaders = [
    "question_id",
    "duplicate_group_id",
    "current_concept_key",
    "proposed_concept_key",
    "source",
    "confidence",
    "inclusion_status",
    "exclusion_reason",
  ];
  const csvBody = [
    csvHeaders.join(","),
    ...decisionRows.map((r) => csvHeaders.map((h) => csvEscape(r[h] ?? "")).join(",")),
  ].join("\n");
  const csvLatest = join(outDir, "first-safe-backfill-candidate-latest.csv");
  const csvStamped = join(outDir, `first-safe-backfill-candidate-${stamp}.csv`);
  writeFileSync(csvLatest, csvBody, "utf8");
  writeFileSync(csvStamped, csvBody, "utf8");

  // 2) JSON summary
  const jsonSummary = {
    generated_at: new Date().toISOString(),
    policy: "first_safe_concept_key_backfill_preview_only",
    total_rows_considered: decisionRows.length,
    included_rows: includedRows.length,
    included_groups: [...includedGroupSet].length,
    excluded_rows: decisionRows.length - includedRows.length,
    exclusion_reason_counts: excludedReasonCounts,
    constraints_applied: {
      high_confidence_only: true,
      exclude_all_risk_registry_keys: true,
      exclude_risk_actions_manual_expand_split: true,
      exclude_semantic_collision_candidates: true,
      exclude_batch2_dormant_groups: true,
    },
    outputs: {
      csv: [csvLatest, csvStamped],
    },
    no_db_updates: true,
  };
  const jsonPayload = { summary: jsonSummary, rows: decisionRows };
  const jsonLatest = join(outDir, "first-safe-backfill-candidate-latest.json");
  const jsonStamped = join(outDir, `first-safe-backfill-candidate-${stamp}.json`);
  writeFileSync(jsonLatest, JSON.stringify(jsonPayload, null, 2), "utf8");
  writeFileSync(jsonStamped, JSON.stringify(jsonPayload, null, 2), "utf8");

  // 3) SQL preview only
  const sqlPreview = `-- PREVIEW ONLY: first safe concept_key backfill candidate
-- No execution in this artifact generation.
-- Rows included: ${includedRows.length}
-- Groups included: ${[...includedGroupSet].length}

CREATE TEMP TABLE _first_safe_concept_key_stage1 (
  question_id uuid PRIMARY KEY,
  new_concept_key text NOT NULL
) ON COMMIT DROP;

INSERT INTO _first_safe_concept_key_stage1 (question_id, new_concept_key) VALUES
${includedRows.map((r) => `  ('${r.question_id}'::uuid, '${r.proposed_concept_key}')`).join(",\n")};

-- Preview update (do NOT run automatically):
-- UPDATE public.questions q
-- SET concept_key = s.new_concept_key
-- FROM _first_safe_concept_key_stage1 s
-- WHERE q.id = s.question_id
--   AND q.concept_key IS DISTINCT FROM s.new_concept_key;
`;
  const sqlLatest = join(
    outDir,
    "first-safe-backfill-candidate-proposed-sql-latest.sql",
  );
  const sqlStamped = join(outDir, `first-safe-backfill-candidate-proposed-sql-${stamp}.sql`);
  writeFileSync(sqlLatest, sqlPreview, "utf8");
  writeFileSync(sqlStamped, sqlPreview, "utf8");

  // 4) rollback preview only
  const rollbackPreview = `-- PREVIEW ONLY: rollback template for first safe concept_key backfill
-- Captures the pre-update concept_key as empty/unknown in this offline artifact.
-- At execution time, capture real previous values before update.

CREATE TEMP TABLE _first_safe_concept_key_stage1_rollback (
  question_id uuid PRIMARY KEY,
  old_concept_key text
) ON COMMIT DROP;

INSERT INTO _first_safe_concept_key_stage1_rollback (question_id, old_concept_key) VALUES
${includedIds.map((id) => `  ('${id}'::uuid, NULL)`).join(",\n")};

-- Preview rollback (do NOT run automatically):
-- UPDATE public.questions q
-- SET concept_key = r.old_concept_key
-- FROM _first_safe_concept_key_stage1_rollback r
-- WHERE q.id = r.question_id;
`;
  const rollbackLatest = join(
    outDir,
    "first-safe-backfill-candidate-rollback-latest.sql",
  );
  const rollbackStamped = join(outDir, `first-safe-backfill-candidate-rollback-${stamp}.sql`);
  writeFileSync(rollbackLatest, rollbackPreview, "utf8");
  writeFileSync(rollbackStamped, rollbackPreview, "utf8");

  console.log(
    JSON.stringify(
      {
        summary: jsonSummary,
        outputs: {
          proposed_sql_preview: [sqlLatest, sqlStamped],
          rollback_sql_preview: [rollbackLatest, rollbackStamped],
        },
      },
      null,
      2,
    ),
  );
}

main();


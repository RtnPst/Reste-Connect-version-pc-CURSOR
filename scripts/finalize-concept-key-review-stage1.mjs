/**
 * Finalize reviewed concept_key decisions from top-attention groups (preview only).
 *
 * Inputs:
 *   - exports/dedup-audit/concept-key-group-top-attention-latest.csv
 *   - exports/dedup-audit/concept-key-suggestions-latest.csv
 *
 * Outputs:
 *   1) Reviewed CSV (group-level decisions):
 *      - exports/dedup-audit/concept-key-group-top-attention-reviewed-latest.csv
 *   2) Reviewed JSON summary:
 *      - exports/dedup-audit/concept-key-group-top-attention-reviewed-latest.json
 *   3) Preview-only backfill plan artifacts (no DB writes):
 *      - exports/dedup-audit/concept-key-backfill-preview-latest.csv
 *      - exports/dedup-audit/concept-key-backfill-preview-latest.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inTopAttention = resolve(
  root,
  "exports/dedup-audit/concept-key-group-top-attention-latest.csv",
);
const inSuggestions = resolve(
  root,
  "exports/dedup-audit/concept-key-suggestions-latest.csv",
);
const outDir = resolve(root, "exports/dedup-audit");

function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === ",") {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return cells;
}

function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function readCsv(path) {
  const raw = readFileSync(path, "utf8").trimEnd();
  if (!raw) return { header: [], rows: [] };
  const lines = raw.split(/\r?\n/);
  const header = parseCsvLine(lines[0]).map((x) => String(x).trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row = {};
    for (let j = 0; j < header.length; j++) row[header[j]] = cells[j] ?? "";
    rows.push(row);
  }
  return { header, rows };
}

function nonEmpty(v) {
  return String(v ?? "").trim().length > 0;
}

function main() {
  if (!existsSync(inTopAttention)) {
    console.error("Missing file:", inTopAttention);
    process.exit(1);
  }
  if (!existsSync(inSuggestions)) {
    console.error("Missing file:", inSuggestions);
    process.exit(1);
  }

  const top = readCsv(inTopAttention);
  const sug = readCsv(inSuggestions);

  const reviewedGroups = [];
  const groupDecisionById = new Map();

  for (const r of top.rows) {
    const gid = String(r.duplicate_group_id ?? "").trim();
    if (!gid) continue;

    const manual = String(r.human_approved_concept_key ?? "").trim();
    const finalRecommended = String(r.final_recommended_concept_key ?? "").trim();
    const resolved = manual || finalRecommended;
    const source = manual ? "manual_override" : "final_recommended";

    const reviewed = {
      duplicate_group_id: gid,
      group_size: String(r.group_size ?? "").trim(),
      suggested_concept_key: String(r.suggested_concept_key ?? "").trim(),
      suggested_override_concept_key: String(
        r.suggested_override_concept_key ?? "",
      ).trim(),
      final_recommended_concept_key: finalRecommended,
      issue_types: String(r.issue_types ?? "").trim(),
      confidence: String(r.confidence ?? "").trim(),
      representative_question: String(r.representative_question ?? "").trim(),
      member_question_previews: String(r.member_question_previews ?? "").trim(),
      human_approved_concept_key: manual,
      resolved_concept_key: resolved,
      source_of_decision: source,
      human_notes: String(r.human_notes ?? "").trim(),
    };

    reviewedGroups.push(reviewed);
    groupDecisionById.set(gid, reviewed);
  }

  // Build preview-only per-question backfill plan from row-level suggestions.
  const planRows = [];
  for (const s of sug.rows) {
    const gid = String(s.duplicate_group_id ?? "").trim();
    const decision = groupDecisionById.get(gid);
    if (!decision) continue;

    const questionId = String(s.question_id ?? "").trim();
    if (!questionId) continue;

    planRows.push({
      question_id: questionId,
      duplicate_group_id: gid,
      old_concept_key: "", // Stage 1 preview-only artifact; no DB read/write here.
      new_concept_key: decision.resolved_concept_key,
      source_of_decision: decision.source_of_decision,
      confidence: decision.confidence,
      issue_types: decision.issue_types,
    });
  }

  reviewedGroups.sort((a, b) => a.duplicate_group_id.localeCompare(b.duplicate_group_id));
  planRows.sort((a, b) => {
    const dg = a.duplicate_group_id.localeCompare(b.duplicate_group_id);
    if (dg !== 0) return dg;
    return a.question_id.localeCompare(b.question_id);
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync(outDir, { recursive: true });

  // 1) Reviewed CSV
  const reviewedHeaders = [
    "duplicate_group_id",
    "group_size",
    "suggested_concept_key",
    "suggested_override_concept_key",
    "final_recommended_concept_key",
    "issue_types",
    "confidence",
    "representative_question",
    "member_question_previews",
    "human_approved_concept_key",
    "resolved_concept_key",
    "source_of_decision",
    "human_notes",
  ];
  const reviewedCsvBody = [
    reviewedHeaders.join(","),
    ...reviewedGroups.map((r) =>
      reviewedHeaders.map((h) => csvEscape(r[h] ?? "")).join(","),
    ),
  ].join("\n");
  const reviewedCsvStamped = join(
    outDir,
    `concept-key-group-top-attention-reviewed-${stamp}.csv`,
  );
  const reviewedCsvLatest = join(
    outDir,
    "concept-key-group-top-attention-reviewed-latest.csv",
  );
  writeFileSync(reviewedCsvStamped, reviewedCsvBody, "utf8");
  writeFileSync(reviewedCsvLatest, reviewedCsvBody, "utf8");

  // 2) Reviewed JSON summary
  const reviewedSummary = {
    generated_at: new Date().toISOString(),
    policy: "concept_key_stage1_review_resolved_preview_only",
    groups_reviewed: reviewedGroups.length,
    manual_override_groups: reviewedGroups.filter(
      (g) => g.source_of_decision === "manual_override",
    ).length,
    final_recommended_groups: reviewedGroups.filter(
      (g) => g.source_of_decision === "final_recommended",
    ).length,
    unresolved_groups: reviewedGroups.filter((g) => !g.resolved_concept_key).length,
    no_db_updates: true,
    source_file: "exports/dedup-audit/concept-key-group-top-attention-latest.csv",
    outputs: {
      reviewed_csv: [reviewedCsvStamped, reviewedCsvLatest],
    },
  };
  const reviewedJsonPayload = {
    summary: reviewedSummary,
    groups: reviewedGroups,
  };
  const reviewedJsonStamped = join(
    outDir,
    `concept-key-group-top-attention-reviewed-${stamp}.json`,
  );
  const reviewedJsonLatest = join(
    outDir,
    "concept-key-group-top-attention-reviewed-latest.json",
  );
  writeFileSync(reviewedJsonStamped, JSON.stringify(reviewedJsonPayload, null, 2), "utf8");
  writeFileSync(reviewedJsonLatest, JSON.stringify(reviewedJsonPayload, null, 2), "utf8");

  // 3) Preview-only backfill plan artifact
  const planHeaders = [
    "question_id",
    "duplicate_group_id",
    "old_concept_key",
    "new_concept_key",
    "source_of_decision",
    "confidence",
    "issue_types",
  ];
  const planCsvBody = [
    planHeaders.join(","),
    ...planRows.map((r) => planHeaders.map((h) => csvEscape(r[h] ?? "")).join(",")),
  ].join("\n");
  const planCsvStamped = join(outDir, `concept-key-backfill-preview-${stamp}.csv`);
  const planCsvLatest = join(outDir, "concept-key-backfill-preview-latest.csv");
  writeFileSync(planCsvStamped, planCsvBody, "utf8");
  writeFileSync(planCsvLatest, planCsvBody, "utf8");

  const manualOverrideRows = planRows.filter(
    (r) => r.source_of_decision === "manual_override",
  ).length;
  const resolvedRows = planRows.filter((r) => nonEmpty(r.new_concept_key)).length;

  const planSummary = {
    generated_at: new Date().toISOString(),
    policy: "concept_key_stage1_backfill_preview_only",
    rows_in_preview_plan: planRows.length,
    rows_with_new_concept_key: resolvedRows,
    rows_from_manual_overrides: manualOverrideRows,
    rows_from_final_recommended: planRows.length - manualOverrideRows,
    unresolved_rows: planRows.length - resolvedRows,
    no_db_updates: true,
    source_files: {
      groups_review: "exports/dedup-audit/concept-key-group-top-attention-latest.csv",
      row_suggestions: "exports/dedup-audit/concept-key-suggestions-latest.csv",
    },
    outputs: {
      plan_csv: [planCsvStamped, planCsvLatest],
      reviewed_json: [reviewedJsonStamped, reviewedJsonLatest],
    },
  };
  const planJsonPayload = {
    summary: planSummary,
    plan_rows: planRows,
  };
  const planJsonStamped = join(outDir, `concept-key-backfill-preview-${stamp}.json`);
  const planJsonLatest = join(outDir, "concept-key-backfill-preview-latest.json");
  writeFileSync(planJsonStamped, JSON.stringify(planJsonPayload, null, 2), "utf8");
  writeFileSync(planJsonLatest, JSON.stringify(planJsonPayload, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        reviewed: reviewedSummary,
        preview_plan: planSummary,
      },
      null,
      2,
    ),
  );
}

main();


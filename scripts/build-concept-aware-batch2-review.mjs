/**
 * Concept-aware Batch 2 review (preview-only).
 *
 * Inputs:
 *   exports/dedup-audit/soft-archive-batch-2-preview-latest.json
 *
 * Optional concept sources:
 *   exports/dedup-audit/concept-key-backfill-preview-latest.csv (duplicate_group_id,new_concept_key)
 *   exports/dedup-audit/concept-key-group-review-latest.csv (duplicate_group_id,final_recommended_concept_key)
 *
 * Outputs:
 *   exports/dedup-audit/concept-aware-batch2-review-latest.csv
 *   exports/dedup-audit/concept-aware-batch2-review-summary-latest.json
 *
 * No DB writes. No migrations. Review artifacts only.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "exports/dedup-audit");
const batch2JsonPath = resolve(root, "exports/dedup-audit/soft-archive-batch-2-preview-latest.json");

const conceptCsvInputs = [
  {
    path: resolve(root, "exports/dedup-audit/concept-key-backfill-preview-latest.csv"),
    groupField: "duplicate_group_id",
    keyField: "new_concept_key",
  },
  {
    path: resolve(root, "exports/dedup-audit/concept-key-group-review-latest.csv"),
    groupField: "duplicate_group_id",
    keyField: "final_recommended_concept_key",
  },
];

function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function loadCsvRows(path) {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8").replace(/\r/g, "").trim();
  if (!text) return [];
  const lines = text.split("\n");
  if (lines.length <= 1) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

function loadConceptByGroup() {
  const m = new Map();
  for (const src of conceptCsvInputs) {
    for (const row of loadCsvRows(src.path)) {
      const groupId = String(row[src.groupField] ?? "").trim();
      const key = String(row[src.keyField] ?? "").trim();
      if (!groupId || !key) continue;
      if (!m.has(groupId)) m.set(groupId, key);
    }
  }
  return m;
}

function riskLabel(riskLevel) {
  const r = String(riskLevel ?? "").toLowerCase();
  if (r.includes("editorial_and_key")) return "medium";
  if (r.includes("editorial_only")) return "medium_low";
  if (r.includes("canonical_key_only")) return "low_medium";
  return "low";
}

function uniqueCount(values) {
  return new Set(values.filter(Boolean).map((v) => String(v).trim())).size;
}

function categorizeGroup(group) {
  const flags = group.analysis_flags ?? {};
  const choicesDiffer = !!flags.choices_differ;
  const explanationsDiffer = !!flags.explanations_differ;
  const difficultyDiffer = !!flags.difficulty_differ;
  const keyMismatch = !!flags.canonical_key_mismatch;

  const members = Array.isArray(group.members) ? group.members : [];
  const questionUnique = uniqueCount(members.map((m) => m.question_preview));
  const choicesUnique = uniqueCount(members.map((m) => m.choices_preview));
  const explanationUnique = uniqueCount(members.map((m) => m.explanation_preview));

  const diffSignals = [choicesDiffer, explanationsDiffer, difficultyDiffer, keyMismatch].filter(Boolean).length;

  if (!choicesDiffer && !explanationsDiffer && !difficultyDiffer && !keyMismatch) {
    return {
      category: "safe_archive",
      recommended_action: "archive_variants_later_if_needed",
      reason: "No meaningful editorial/difficulty differences detected in group flags.",
      archive_only_later: "yes",
    };
  }

  if (difficultyDiffer && diffSignals === 1) {
    return {
      category: "keep_difficulty_variants",
      recommended_action: "preserve_multiple_difficulty_versions",
      reason: "Difficulty varies while other major semantic signals stay relatively stable.",
      archive_only_later: "no",
    };
  }

  if (difficultyDiffer && diffSignals >= 2) {
    return {
      category: "needs_manual_editorial_review",
      recommended_action: "manual_split_or_curate_before_any_archive",
      reason: "Difficulty differences plus additional editorial divergence increase curation risk.",
      archive_only_later: "no",
    };
  }

  if ((choicesDiffer || explanationsDiffer) && questionUnique <= 1 && explanationUnique > 1) {
    return {
      category: "keep_context_variants",
      recommended_action: "preserve_contextual_explanation_variants",
      reason: "Same core question with meaningful context/explanation alternatives.",
      archive_only_later: "no",
    };
  }

  if (questionUnique > 1 || choicesUnique > 1 || choicesDiffer) {
    return {
      category: "keep_multiple_formulations",
      recommended_action: "preserve_formulation_variants",
      reason: "Alternative wording/choices can improve concept coverage and reduce repetition.",
      archive_only_later: "no",
    };
  }

  return {
    category: "needs_manual_editorial_review",
    recommended_action: "manual_editorial_decision_required",
    reason: "Mixed signals require human review before archive-only decisions.",
    archive_only_later: "no",
  };
}

function main() {
  if (!existsSync(batch2JsonPath)) {
    console.error("Missing input:", batch2JsonPath);
    process.exit(1);
  }

  const payload = JSON.parse(readFileSync(batch2JsonPath, "utf8"));
  const groups = Array.isArray(payload.groups) ? payload.groups : [];
  const conceptByGroup = loadConceptByGroup();

  const rows = [];
  for (const g of groups) {
    const members = Array.isArray(g.members) ? g.members : [];
    const category = categorizeGroup(g);
    const diffSet = [...new Set(members.map((m) => m.difficulty).filter(Boolean))];
    const questionIds = members.map((m) => m.id).filter(Boolean);
    const statusPairs = members.map((m) => `${m.id}:${m.status}/${m.is_active}`);
    const choicesDiff = g.analysis_flags?.choices_differ ? "yes" : "no";
    const explDiff = g.analysis_flags?.explanations_differ ? "yes" : "no";

    rows.push({
      duplicate_group_id: g.group_id ?? "",
      concept_key: conceptByGroup.get(g.group_id) ?? "",
      question_ids: questionIds.join(";"),
      current_status_is_active: statusPairs.join(" | "),
      difficulty_differences: diffSet.join(";"),
      choice_differences: choicesDiff,
      explanation_differences: explDiff,
      recommended_action: category.recommended_action,
      category: category.category,
      reason: category.reason,
      risk_level: riskLabel(g.risk_level),
      archive_only_later: category.archive_only_later,
    });
  }

  rows.sort((a, b) => a.duplicate_group_id.localeCompare(b.duplicate_group_id));

  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  const headers = [
    "duplicate_group_id",
    "concept_key",
    "question_ids",
    "current_status_is_active",
    "difficulty_differences",
    "choice_differences",
    "explanation_differences",
    "category",
    "recommended_action",
    "reason",
    "risk_level",
    "archive_only_later",
  ];
  const csvBody = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
  ].join("\n");

  const csvStamped = join(outDir, `concept-aware-batch2-review-${stamp}.csv`);
  const csvLatest = join(outDir, "concept-aware-batch2-review-latest.csv");
  writeFileSync(csvStamped, csvBody, "utf8");
  writeFileSync(csvLatest, csvBody, "utf8");

  const countByCategory = rows.reduce((acc, row) => {
    acc[row.category] = (acc[row.category] ?? 0) + 1;
    return acc;
  }, {});
  const safeArchiveGroups = rows
    .filter((r) => r.category === "safe_archive")
    .map((r) => r.duplicate_group_id);
  const preserveVariantGroups = rows
    .filter((r) =>
      ["keep_multiple_formulations", "keep_difficulty_variants", "keep_context_variants"].includes(
        r.category,
      ),
    )
    .map((r) => r.duplicate_group_id);

  const summary = {
    generated_at: new Date().toISOString(),
    policy: "concept_aware_batch2_review_preview_only",
    input: "exports/dedup-audit/soft-archive-batch-2-preview-latest.json",
    total_groups_reviewed: rows.length,
    count_by_category: countByCategory,
    groups_safe_for_future_archive_only: safeArchiveGroups,
    groups_to_preserve_as_useful_variants: preserveVariantGroups,
    proposed_next_action:
      "Proceed with archive-only only for groups categorized safe_archive; keep variant categories for concept/difficulty/context diversity and send needs_manual_editorial_review to curated queue.",
    no_db_writes: true,
    no_deletes: true,
    no_quiz_attempt_rewrites: true,
    no_daily_questions_changes: true,
    outputs: {
      review_csv: [csvStamped, csvLatest],
    },
  };

  const jsonStamped = join(outDir, `concept-aware-batch2-review-summary-${stamp}.json`);
  const jsonLatest = join(outDir, "concept-aware-batch2-review-summary-latest.json");
  writeFileSync(jsonStamped, JSON.stringify(summary, null, 2), "utf8");
  writeFileSync(jsonLatest, JSON.stringify(summary, null, 2), "utf8");

  console.log(JSON.stringify(summary, null, 2));
}

main();


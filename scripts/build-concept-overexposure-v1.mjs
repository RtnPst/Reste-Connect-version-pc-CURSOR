import { resolve } from "node:path";
import {
  ensureOutDir,
  loadCsvRows,
  root,
  writeCsvPair,
  writeJsonPair,
} from "./lib/editorial-v1-core.mjs";

const draftsCsv = resolve(root, "exports/dedup-audit/question-drafts-v1-review-latest.csv");
const batch2Csv = resolve(root, "exports/dedup-audit/concept-aware-batch2-review-latest.csv");

function countQuestionIds(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return 0;
  return text.split("|").map((v) => v.trim()).filter(Boolean).length;
}

function main() {
  ensureOutDir();
  const drafts = loadCsvRows(draftsCsv);
  const batch2 = loadCsvRows(batch2Csv);

  const byConcept = new Map();
  const ensure = (k) => {
    const key = String(k ?? "").trim();
    if (!key) return null;
    if (!byConcept.has(key)) {
      byConcept.set(key, {
        concept_key: key,
        draft_count: 0,
        draft_definition_count: 0,
        draft_contextual_count: 0,
        dormant_variant_group_count: 0,
        dormant_variant_question_count: 0,
      });
    }
    return byConcept.get(key);
  };

  for (const row of drafts) {
    const rec = ensure(row.concept_key || row.suggested_concept_key || row.raw_term);
    if (!rec) continue;
    rec.draft_count += 1;
    const t = String(row.question_type ?? "").toLowerCase();
    if (t.includes("definition")) rec.draft_definition_count += 1;
    if (t.includes("context")) rec.draft_contextual_count += 1;
  }

  for (const row of batch2) {
    const rec = ensure(row.concept_key);
    if (!rec) continue;
    rec.dormant_variant_group_count += 1;
    rec.dormant_variant_question_count += countQuestionIds(row.question_ids);
  }

  const rows = Array.from(byConcept.values()).map((row) => {
    const saturationIndex =
      row.draft_count * 3 +
      row.dormant_variant_group_count * 2 +
      Math.min(row.dormant_variant_question_count, 10);
    const riskBand =
      saturationIndex >= 18 ? "high" : saturationIndex >= 10 ? "medium" : saturationIndex >= 5 ? "watch" : "low";
    return {
      ...row,
      saturation_index: saturationIndex,
      saturation_risk_band: riskBand,
      review_note:
        riskBand === "high"
          ? "pause adding new variants, review for concept fatigue"
          : riskBand === "medium"
            ? "limit additions until balance improves"
            : riskBand === "watch"
              ? "monitor concept volume in next draft round"
              : "no immediate saturation risk",
    };
  });

  rows.sort((a, b) => b.saturation_index - a.saturation_index || a.concept_key.localeCompare(b.concept_key));
  const headers = [
    "concept_key",
    "draft_count",
    "draft_definition_count",
    "draft_contextual_count",
    "dormant_variant_group_count",
    "dormant_variant_question_count",
    "saturation_index",
    "saturation_risk_band",
    "review_note",
  ];
  const csvOut = writeCsvPair("concept-overexposure-v1", headers, rows);
  const bandCounts = rows.reduce((acc, row) => {
    acc[row.saturation_risk_band] = (acc[row.saturation_risk_band] ?? 0) + 1;
    return acc;
  }, {});
  const payload = {
    generated_at: new Date().toISOString(),
    policy: "editorial_freshness_quality_v1_review_only",
    inputs: [
      "exports/dedup-audit/question-drafts-v1-review-latest.csv",
      "exports/dedup-audit/concept-aware-batch2-review-latest.csv",
    ],
    concepts: rows.length,
    saturation_risk_band_counts: bandCounts,
    rows_data: rows,
    outputs: { csv: [csvOut.stamped, csvOut.latest] },
    no_db_changes: true,
    no_imports: true,
    no_automatic_publishing: true,
  };
  writeJsonPair("concept-overexposure-v1", payload);
  console.log(JSON.stringify({ concepts: rows.length, saturation_risk_band_counts: bandCounts }, null, 2));
}

main();


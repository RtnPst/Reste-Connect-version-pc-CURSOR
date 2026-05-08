import { resolve } from "node:path";
import {
  ensureOutDir,
  loadCsvRows,
  normalizeDecision,
  root,
  splitFlags,
  writeCsvPair,
  writeJsonPair,
} from "./lib/editorial-v1-core.mjs";

const intakeCsv = resolve(root, "exports/dedup-audit/concept-intake-v1-review-latest.csv");
const overexposureCsv = resolve(root, "exports/dedup-audit/concept-overexposure-v1-latest.csv");

function main() {
  ensureOutDir();
  const intake = loadCsvRows(intakeCsv);
  const overexposure = loadCsvRows(overexposureCsv);
  const overMap = new Map(overexposure.map((r) => [String(r.concept_key ?? "").trim(), r]));

  const shortlist = intake
    .map((row) => {
      const conceptKey = String(row.suggested_concept_key ?? "").trim();
      if (!conceptKey) return null;
      const decision = normalizeDecision(row.human_decision);
      const confidence = String(row.confidence ?? "").toLowerCase();
      const freshness = String(row.trend_freshness ?? "").toLowerCase();
      const durability = String(row.trend_durability ?? "").toLowerCase();
      const riskFlags = splitFlags(row.risk_flags);
      const sat = overMap.get(conceptKey);
      const satBand = String(sat?.saturation_risk_band ?? "low").toLowerCase();

      const isApprovedLike = decision === "approve" || decision === "watchlist";
      const stableDurability = durability === "evergreen" || durability === "seasonal";
      const stableFreshness = freshness === "stable" || freshness === "active" || freshness === "recent";
      const safeRisk = riskFlags.length <= 1;
      const safeExposure = satBand === "low" || satBand === "watch";
      const confidenceOk = confidence === "high" || confidence === "medium";

      if (!(isApprovedLike && stableDurability && stableFreshness && safeRisk && safeExposure && confidenceOk)) {
        return null;
      }

      return {
        concept_key: conceptKey,
        raw_term: row.raw_term ?? "",
        suggested_theme: row.suggested_theme ?? "",
        confidence: row.confidence ?? "",
        trend_freshness: row.trend_freshness ?? "",
        trend_durability: row.trend_durability ?? "",
        human_decision: decision,
        risk_flags: riskFlags.join("; "),
        saturation_risk_band: sat?.saturation_risk_band ?? "low",
        evergreen_readiness_note: "candidate for future stable manual draft batches",
      };
    })
    .filter(Boolean);

  shortlist.sort((a, b) => a.concept_key.localeCompare(b.concept_key));
  const headers = [
    "concept_key",
    "raw_term",
    "suggested_theme",
    "confidence",
    "trend_freshness",
    "trend_durability",
    "human_decision",
    "risk_flags",
    "saturation_risk_band",
    "evergreen_readiness_note",
  ];
  const csvOut = writeCsvPair("safe-evergreen-v1", headers, shortlist);
  const payload = {
    generated_at: new Date().toISOString(),
    policy: "editorial_freshness_quality_v1_review_only",
    inputs: [
      "exports/dedup-audit/concept-intake-v1-review-latest.csv",
      "exports/dedup-audit/concept-overexposure-v1-latest.csv",
    ],
    rows: shortlist.length,
    rows_data: shortlist,
    outputs: { csv: [csvOut.stamped, csvOut.latest] },
    no_db_changes: true,
    no_imports: true,
    no_automatic_publishing: true,
  };
  writeJsonPair("safe-evergreen-v1", payload);
  console.log(JSON.stringify({ rows: shortlist.length }, null, 2));
}

main();


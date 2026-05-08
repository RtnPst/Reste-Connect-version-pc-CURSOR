import { resolve } from "node:path";
import {
  ensureOutDir,
  fileAgeDays,
  loadCsvRows,
  normalizeDecision,
  root,
  scoreFreshnessLabel,
  splitFlags,
  volatilityPenalty,
  writeCsvPair,
  writeJsonPair,
} from "./lib/editorial-v1-core.mjs";

const intakeCsv = resolve(root, "exports/dedup-audit/concept-intake-v1-review-latest.csv");

function main() {
  ensureOutDir();
  const rows = loadCsvRows(intakeCsv);
  const sourceAgeDays = fileAgeDays(intakeCsv) ?? 0;

  const freshness = rows.map((row) => {
    const decision = normalizeDecision(row.human_decision);
    const riskFlags = splitFlags(row.risk_flags);
    const base = scoreFreshnessLabel(row.trend_freshness);
    const volatility = volatilityPenalty(row.trend_durability);
    const unresolvedPenalty = decision ? 0 : Math.min(30, Math.round(sourceAgeDays * 2));
    const riskPenalty = Math.min(20, riskFlags.length * 5);
    const score = Math.max(0, Math.min(100, base - volatility - unresolvedPenalty - riskPenalty));
    const freshnessBand =
      score >= 75 ? "healthy" : score >= 55 ? "monitor" : score >= 35 ? "refresh_soon" : "critical_refresh";

    return {
      raw_term: row.raw_term ?? "",
      concept_key: row.suggested_concept_key ?? "",
      confidence: row.confidence ?? "",
      trend_freshness: row.trend_freshness ?? "",
      trend_durability: row.trend_durability ?? "",
      human_decision: decision,
      unresolved_age_days_estimate: String(sourceAgeDays),
      risk_flags: riskFlags.join("; "),
      freshness_score: String(score),
      freshness_band: freshnessBand,
      refresh_note:
        freshnessBand === "critical_refresh"
          ? "stale/high-volatility/high-risk concept requiring revalidation"
          : freshnessBand === "refresh_soon"
            ? "schedule editorial freshness check"
            : freshnessBand === "monitor"
              ? "keep monitored in periodic review"
              : "healthy freshness profile",
    };
  });

  freshness.sort((a, b) => Number(a.freshness_score) - Number(b.freshness_score));
  const headers = [
    "raw_term",
    "concept_key",
    "confidence",
    "trend_freshness",
    "trend_durability",
    "human_decision",
    "unresolved_age_days_estimate",
    "risk_flags",
    "freshness_score",
    "freshness_band",
    "refresh_note",
  ];
  const csvOut = writeCsvPair("concept-freshness-v1", headers, freshness);
  const bandCounts = freshness.reduce((acc, row) => {
    acc[row.freshness_band] = (acc[row.freshness_band] ?? 0) + 1;
    return acc;
  }, {});
  const payload = {
    generated_at: new Date().toISOString(),
    policy: "editorial_freshness_quality_v1_review_only",
    input: "exports/dedup-audit/concept-intake-v1-review-latest.csv",
    rows: freshness.length,
    source_age_days_estimate: sourceAgeDays,
    freshness_band_counts: bandCounts,
    rows_data: freshness,
    outputs: { csv: [csvOut.stamped, csvOut.latest] },
    no_db_changes: true,
    no_imports: true,
    no_automatic_publishing: true,
  };
  writeJsonPair("concept-freshness-v1", payload);
  console.log(JSON.stringify({ rows: freshness.length, freshness_band_counts: bandCounts }, null, 2));
}

main();


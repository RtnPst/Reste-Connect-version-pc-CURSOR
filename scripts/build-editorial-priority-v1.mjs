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

function classifyBucket(row, unresolvedAgeDays) {
  const decision = normalizeDecision(row.human_decision);
  const riskFlags = splitFlags(row.risk_flags);
  const freshnessScore = scoreFreshnessLabel(row.trend_freshness);
  const volatility = volatilityPenalty(row.trend_durability);
  const confidence = String(row.confidence ?? "").toLowerCase();
  const unresolved = !decision;
  const hasCollisionRisk = riskFlags.some((f) => f.includes("duplicate") || f.includes("collision"));

  if (decision === "reject") return "parked";
  if (decision === "watchlist") return "watchlist";
  if (decision === "merge") return "urgent_review";

  if (unresolved) {
    if (unresolvedAgeDays >= 7 || volatility >= 25 || hasCollisionRisk || confidence === "low") {
      return "urgent_review";
    }
    return "review_soon";
  }

  if (decision === "approve") {
    if (volatility >= 25 || freshnessScore < 60 || confidence === "low") return "review_soon";
    return "parked";
  }

  return "review_soon";
}

function main() {
  ensureOutDir();
  const rows = loadCsvRows(intakeCsv);
  const unresolvedAgeDays = fileAgeDays(intakeCsv) ?? 0;

  const queue = rows.map((row) => {
    const decision = normalizeDecision(row.human_decision);
    const riskFlags = splitFlags(row.risk_flags);
    const bucket = classifyBucket(row, unresolvedAgeDays);
    return {
      raw_term: row.raw_term ?? "",
      suggested_concept_key: row.suggested_concept_key ?? "",
      suggested_theme: row.suggested_theme ?? "",
      confidence: row.confidence ?? "",
      trend_freshness: row.trend_freshness ?? "",
      trend_durability: row.trend_durability ?? "",
      risk_flags: riskFlags.join("; "),
      human_decision: decision,
      unresolved_age_days_estimate: String(unresolvedAgeDays),
      priority_bucket: bucket,
      queue_reason:
        bucket === "urgent_review"
          ? "high volatility/low confidence/age/collision signal"
          : bucket === "review_soon"
            ? "needs near-term editorial pass"
            : bucket === "watchlist"
              ? "tracked concept, not production-ready yet"
              : "low-priority parked state",
    };
  });

  const order = { urgent_review: 0, review_soon: 1, watchlist: 2, parked: 3 };
  queue.sort((a, b) => {
    const oa = order[a.priority_bucket] ?? 99;
    const ob = order[b.priority_bucket] ?? 99;
    if (oa !== ob) return oa - ob;
    return a.raw_term.localeCompare(b.raw_term);
  });

  const headers = [
    "raw_term",
    "suggested_concept_key",
    "suggested_theme",
    "confidence",
    "trend_freshness",
    "trend_durability",
    "risk_flags",
    "human_decision",
    "unresolved_age_days_estimate",
    "priority_bucket",
    "queue_reason",
  ];
  const csvOut = writeCsvPair("editorial-priority-v1", headers, queue);

  const counts = queue.reduce((acc, row) => {
    acc[row.priority_bucket] = (acc[row.priority_bucket] ?? 0) + 1;
    return acc;
  }, {});
  const payload = {
    generated_at: new Date().toISOString(),
    policy: "editorial_freshness_quality_v1_review_only",
    input: "exports/dedup-audit/concept-intake-v1-review-latest.csv",
    rows_in_queue: queue.length,
    priority_bucket_counts: counts,
    unresolved_age_days_estimate: unresolvedAgeDays,
    queue,
    outputs: { csv: [csvOut.stamped, csvOut.latest] },
    no_db_changes: true,
    no_imports: true,
    no_automatic_publishing: true,
  };
  writeJsonPair("editorial-priority-v1", payload);
  console.log(JSON.stringify({ rows: queue.length, priority_bucket_counts: counts }, null, 2));
}

main();


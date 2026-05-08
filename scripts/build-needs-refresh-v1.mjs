import { resolve } from "node:path";
import {
  ensureOutDir,
  fileAgeDays,
  loadCsvRows,
  normalizeDecision,
  root,
  splitFlags,
  writeCsvPair,
  writeJsonPair,
} from "./lib/editorial-v1-core.mjs";

const intakeCsv = resolve(root, "exports/dedup-audit/concept-intake-v1-review-latest.csv");

function main() {
  ensureOutDir();
  const rows = loadCsvRows(intakeCsv);
  const ageDays = fileAgeDays(intakeCsv) ?? 0;

  const flagged = rows
    .map((row) => {
      const decision = normalizeDecision(row.human_decision);
      const riskFlags = splitFlags(row.risk_flags);
      const durability = String(row.trend_durability ?? "").toLowerCase();
      const freshness = String(row.trend_freshness ?? "").toLowerCase();
      const unresolvedTooLong = !decision && ageDays >= 7;
      const microNeedsRevalidation = durability === "micro_trend" && ageDays >= 3;
      const stale = freshness === "stale" || freshness === "to_review";
      const riskHeavy = riskFlags.length >= 2;

      let reason = "";
      let severity = "";
      if (unresolvedTooLong) {
        reason = "unresolved_too_long";
        severity = "high";
      } else if (microNeedsRevalidation && stale) {
        reason = "micro_trend_revalidation";
        severity = "high";
      } else if (microNeedsRevalidation || stale) {
        reason = "freshness_recheck";
        severity = "medium";
      } else if (riskHeavy) {
        reason = "risk_flag_followup";
        severity = "medium";
      } else {
        return null;
      }

      return {
        raw_term: row.raw_term ?? "",
        concept_key: row.suggested_concept_key ?? "",
        human_decision: decision,
        trend_freshness: row.trend_freshness ?? "",
        trend_durability: row.trend_durability ?? "",
        unresolved_age_days_estimate: String(ageDays),
        risk_flags: riskFlags.join("; "),
        refresh_reason: reason,
        severity,
        action_note:
          severity === "high"
            ? "manual editorial revalidation needed before future draft expansion"
            : "schedule this concept in next review cycle",
      };
    })
    .filter(Boolean);

  flagged.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
    return a.raw_term.localeCompare(b.raw_term);
  });

  const headers = [
    "raw_term",
    "concept_key",
    "human_decision",
    "trend_freshness",
    "trend_durability",
    "unresolved_age_days_estimate",
    "risk_flags",
    "refresh_reason",
    "severity",
    "action_note",
  ];
  const csvOut = writeCsvPair("needs-refresh-v1", headers, flagged);
  const severityCounts = flagged.reduce((acc, row) => {
    acc[row.severity] = (acc[row.severity] ?? 0) + 1;
    return acc;
  }, {});
  const payload = {
    generated_at: new Date().toISOString(),
    policy: "editorial_freshness_quality_v1_review_only",
    input: "exports/dedup-audit/concept-intake-v1-review-latest.csv",
    rows: flagged.length,
    unresolved_age_days_estimate: ageDays,
    severity_counts: severityCounts,
    rows_data: flagged,
    outputs: { csv: [csvOut.stamped, csvOut.latest] },
    no_db_changes: true,
    no_imports: true,
    no_automatic_publishing: true,
  };
  writeJsonPair("needs-refresh-v1", payload);
  console.log(JSON.stringify({ rows: flagged.length, severity_counts: severityCounts }, null, 2));
}

main();


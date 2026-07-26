/**
 * Apply FR-first discovery decisions into intake review + decision summary,
 * then ready for promote:concepts.
 *
 * Usage: node scripts/apply-fr-first-decisions-v1.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  csvEscape,
  loadJson,
  parseCsvLine,
  root,
  toConceptSlug,
  writeJson,
} from "./lib/concept-pipeline-utils.mjs";

const frDoc = loadJson(resolve(root, "exports/dedup-audit/fr-first-discovery-v1-latest.json"));
if (!frDoc?.rows?.length) {
  console.error("Run seed-fr-first-discovery-v1.mjs first");
  process.exit(1);
}

const byKey = new Map();
for (const row of frDoc.rows) {
  const key = toConceptSlug(row.suggested_concept_key);
  byKey.set(key, row);
}

function patchCsv(path) {
  if (!existsSync(path)) return 0;
  const text = readFileSync(path, "utf8").replace(/\r/g, "").trim();
  const lines = text.split("\n");
  const headers = parseCsvLine(lines[0]);
  const ki = headers.indexOf("suggested_concept_key");
  const di = headers.indexOf("human_decision");
  const ni = headers.indexOf("human_notes");
  let n = 0;
  const out = [headers.join(",")];
  const seen = new Set();
  for (const line of lines.slice(1)) {
    const vals = parseCsvLine(line);
    const key = toConceptSlug(vals[ki]);
    seen.add(key);
    const d = byKey.get(key);
    if (d && d.human_decision) {
      vals[di] = d.human_decision;
      if (ni >= 0) vals[ni] = d.human_notes || d.discovery_note || "";
      n += 1;
    }
    out.push(vals.map(csvEscape).join(","));
  }
  // append missing FR rows
  for (const [key, d] of byKey) {
    if (seen.has(key)) continue;
    const row = {
      raw_term: d.raw_term,
      suggested_concept_key: key,
      suggested_theme: d.suggested_theme,
      suggested_difficulty_band: "facile_to_moyen",
      short_definition: d.short_definition,
      aliases: d.aliases,
      example_usage: d.example_usage,
      trend_freshness: d.trend_freshness || "recent",
      trend_durability: d.trend_durability || "seasonal",
      confidence: "medium",
      risk_flags: "",
      authenticity_gate: d.authenticity_gate || "pass_with_review",
      suggested_usage_vitality: d.suggested_usage_vitality || "living",
      novelty_status: d.novelty_status,
      duplicate_check_exact_concept_key_match: "no",
      duplicate_check_near_existing_concept_key: d.near_key || "",
      duplicate_check_possible_semantic_duplicate: "",
      human_decision: d.human_decision,
      human_notes: d.human_notes || "",
    };
    out.push(headers.map((h) => csvEscape(row[h] ?? "")).join(","));
    n += 1;
  }
  writeFileSync(path, `${out.join("\n")}\n`, "utf8");
  return n;
}

const intakePath = resolve(root, "exports/dedup-audit/concept-intake-v1-review-latest.csv");
const patched = patchCsv(intakePath);

// Rebuild decision summary approved list from existing + FR
const summaryPath = resolve(
  root,
  "exports/dedup-audit/concept-intake-v1-decision-summary-latest.json",
);
const summary = loadJson(summaryPath, {
  approved_concepts_summary: [],
  rejected_concepts_summary: [],
  merge_watchlist_summary: [],
});

const approvedKeys = new Set(
  (summary.approved_concepts_summary ?? []).map((r) => toConceptSlug(r.suggested_concept_key)),
);

for (const row of frDoc.rows) {
  if (row.human_decision !== "approve") continue;
  const key = toConceptSlug(row.suggested_concept_key);
  if (approvedKeys.has(key)) continue;
  summary.approved_concepts_summary.push({
    raw_term: row.raw_term,
    suggested_concept_key: key,
    suggested_theme: row.suggested_theme,
    confidence: "medium",
    risk_flags: row.fr_fit === "meme_mode" ? "micro_trend_volatility" : "",
    human_decision: "approve",
    human_notes: row.human_notes || row.discovery_note || "",
    decision_status: "resolved",
    fr_fit: row.fr_fit,
    placement: row.placement,
  });
  approvedKeys.add(key);
}

summary.generated_at = new Date().toISOString();
summary.policy = "concept_intake_v1_plus_fr_first";
summary.counts = {
  ...(summary.counts || {}),
  approved: summary.approved_concepts_summary.length,
};
writeJson(summaryPath, summary);

console.log(
  JSON.stringify(
    {
      ok: true,
      intake_patched_or_appended: patched,
      approved_total: summary.approved_concepts_summary.length,
      fr_approved: frDoc.rows.filter((r) => r.human_decision === "approve").map((r) => r.suggested_concept_key),
    },
    null,
    2,
  ),
);

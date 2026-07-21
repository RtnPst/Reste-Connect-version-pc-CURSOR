/**
 * Score authenticity for intake candidates (no scrape, no DB write).
 *
 * Input: scripts/data/concept-intake-raw-signals-v1.json
 * Optional pack: src/data/cultural-pack-v1.json
 *
 * Usage:
 *   node scripts/score-concept-authenticity-v1.mjs
 */
import { resolve } from "node:path";
import {
  loadJson,
  root,
  scoreAuthenticity,
  stampIso,
  toConceptSlug,
  writeCsv,
  writeJson,
} from "./lib/concept-pipeline-utils.mjs";

const inputPath = resolve(root, "scripts/data/concept-intake-raw-signals-v1.json");
const packPath = resolve(root, "src/data/cultural-pack-v1.json");
const outDir = resolve(root, "exports/dedup-audit");

const input = loadJson(inputPath, { raw_signals: [] });
const pack = loadJson(packPath, { concepts: [] });
const packByKey = new Map(
  (pack.concepts ?? []).map((c) => [toConceptSlug(c.concept_key), c]),
);

const rows = [];
for (const entry of input.raw_signals ?? []) {
  const key = toConceptSlug(entry.suggested_concept_key ?? entry.raw_term);
  const scored = scoreAuthenticity(entry, packByKey.get(key) ?? null);
  rows.push({
    raw_term: entry.raw_term ?? "",
    suggested_concept_key: key,
    ...scored,
    example_usage: entry.example_usage ?? "",
    short_definition: entry.short_definition ?? "",
  });
}

const stamp = stampIso();
const doc = {
  generated_at: new Date().toISOString(),
  policy: "authenticity_gate_v1_no_scrape",
  counts: {
    total: rows.length,
    pass_with_review: rows.filter((r) => r.authenticity_gate === "pass_with_review").length,
    needs_human: rows.filter((r) => r.authenticity_gate === "needs_human").length,
    block_drafts: rows.filter((r) => r.authenticity_gate === "block_drafts").length,
  },
  rows,
};

writeJson(resolve(outDir, "concept-authenticity-v1-latest.json"), doc);
writeJson(resolve(outDir, `concept-authenticity-v1-${stamp}.json`), doc);
writeCsv(
  resolve(outDir, "concept-authenticity-v1-latest.csv"),
  [
    "raw_term",
    "suggested_concept_key",
    "authenticity_gate",
    "suggested_usage_vitality",
    "authenticity_flags",
    "scene_cue",
    "example_usage",
    "short_definition",
  ],
  rows,
);

console.log(JSON.stringify({ ok: true, counts: doc.counts }, null, 2));

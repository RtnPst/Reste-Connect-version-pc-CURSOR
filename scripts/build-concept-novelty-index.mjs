/**
 * Build live+local novelty index for concept intake.
 *
 * Usage:
 *   node scripts/build-concept-novelty-index.mjs
 *   node scripts/build-concept-novelty-index.mjs --offline
 */
import { resolve } from "node:path";
import {
  buildNoveltyIndex,
  root,
  stampIso,
  writeCsv,
  writeJson,
} from "./lib/concept-pipeline-utils.mjs";

const offline = process.argv.includes("--offline");
const index = await buildNoveltyIndex({ fetchLive: !offline });
const outDir = resolve(root, "exports/foundation");
const stamp = stampIso();

writeJson(resolve(outDir, "concept-novelty-index-latest.json"), index);
writeJson(resolve(outDir, `concept-novelty-index-${stamp}.json`), index);
writeCsv(
  resolve(outDir, "concept-novelty-index-latest.csv"),
  ["concept_key", "sources", "label", "usage_vitality", "editorial_status"],
  index.entries.map((e) => ({
    concept_key: e.concept_key,
    sources: (e.sources ?? []).join("|"),
    label: e.label ?? "",
    usage_vitality: e.usage_vitality ?? "",
    editorial_status: e.editorial_status ?? "",
  })),
);

console.log(
  JSON.stringify(
    {
      ok: true,
      key_count: index.key_count,
      sources: index.sources,
      out: "exports/foundation/concept-novelty-index-latest.json",
    },
    null,
    2,
  ),
);

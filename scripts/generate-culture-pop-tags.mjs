/**
 * Build src/data/culture-pop-question-tags.json from src/data/new-questions.json
 * (same category→culture_pop rules as scripts/import-new-questions.mjs).
 *
 * Keys: question text trimmed (must match DB `questions.question` after import).
 * Values: piste slug — gaming | relations | musique | internet
 *
 * Also writes culture-pop-tags-source.sha256 (raw-file SHA256 of new-questions.json)
 * for npm run check:culture-pop-tags (predev / prebuild).
 *
 * Run: node scripts/generate-culture-pop-tags.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const jsonPath = resolve(root, "src/data/new-questions.json");
const outPath = resolve(root, "src/data/culture-pop-question-tags.json");
const stampPath = resolve(root, "src/data/culture-pop-tags-source.sha256");

const CATEGORY_TO_PISTE = {
  "culture internet": "internet",
  gaming: "gaming",
  relations: "relations",
  musique: "musique",
};

function main() {
  if (!existsSync(jsonPath)) {
    console.error("Missing:", jsonPath);
    process.exit(1);
  }
  const rawQuestions = readFileSync(jsonPath);
  const sourceSha = createHash("sha256").update(rawQuestions).digest("hex");
  const items = JSON.parse(rawQuestions.toString("utf8"));
  if (!Array.isArray(items)) {
    console.error("Expected array root");
    process.exit(1);
  }

  /** @type {Record<string, string>} */
  const map = {};
  let conflicts = 0;

  for (const raw of items) {
    const cat = typeof raw.category === "string" ? raw.category.trim().toLowerCase() : "";
    const piste = CATEGORY_TO_PISTE[cat];
    if (!piste) continue;
    const q = typeof raw.question === "string" ? raw.question.trim() : "";
    if (!q) continue;
    if (map[q] !== undefined && map[q] !== piste) {
      conflicts += 1;
      console.warn("Conflict for question:", q.slice(0, 60), "was", map[q], "now", piste);
    }
    map[q] = piste;
  }

  writeFileSync(outPath, `${JSON.stringify(map, null, 2)}\n`, "utf8");
  writeFileSync(stampPath, `${sourceSha}\n`, "utf8");
  console.log("Wrote", outPath, "entries:", Object.keys(map).length, "conflicts:", conflicts);
  console.log("Wrote", stampPath, "SHA256 of new-questions.json");
}

main();

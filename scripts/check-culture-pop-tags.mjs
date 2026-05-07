/**
 * Soft check: new-questions.json vs last tag generation (SHA256 stamp).
 * Always exits 0 — logs warnings only (does not break build).
 *
 * Run: node scripts/check-culture-pop-tags.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const questionsPath = resolve(root, "src/data/new-questions.json");
const stampPath = resolve(root, "src/data/culture-pop-tags-source.sha256");

function sha256File(absPath) {
  return createHash("sha256").update(readFileSync(absPath)).digest("hex");
}

function main() {
  if (!existsSync(questionsPath)) {
    console.warn(
      "[culture-pop-tags] Missing src/data/new-questions.json — skip stamp check.",
    );
    return;
  }

  const current = sha256File(questionsPath);

  if (!existsSync(stampPath)) {
    console.warn(
      "[culture-pop-tags] No stamp file (culture-pop-tags-source.sha256).\n" +
        "  → Run: npm run generate:culture-pop-tags\n" +
        "  (Tags may be out of sync with new-questions.json.)",
    );
    return;
  }

  const expected = readFileSync(stampPath, "utf8").trim();
  if (expected !== current) {
    console.warn(
      "\n[culture-pop-tags] ⚠ new-questions.json changed since last tag generation.\n" +
        "  → Run: npm run generate:culture-pop-tags\n" +
        "  Then commit culture-pop-question-tags.json + culture-pop-tags-source.sha256\n",
    );
    return;
  }
}

main();

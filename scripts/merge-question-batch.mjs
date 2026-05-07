/**
 * Merge a JSON array of questions into src/data/new-questions.json
 * with validation + duplicate / near-duplicate detection.
 *
 * Usage: node scripts/merge-question-batch.mjs <path-to-batch.json>
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destPath = resolve(root, "src/data/new-questions.json");

const ACCEPT_CAT = new Set([
  "Vocabulaire",
  "Réseaux sociaux",
  "Culture internet",
  "Gaming",
  "Relations",
  "Musique",
]);
const ACCEPT_DIFF = new Set(["easy", "medium", "hard"]);

function norm(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "")
    .toLowerCase()
    .replace(/[""«»'']/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Near-duplicate: same normalized line, or very high word overlap on tokens length ≥ 3 */
function verySimilar(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const wa = [...new Set(na.split(/\s+/).filter((w) => w.length >= 3))];
  const wb = new Set(nb.split(/\s+/).filter((w) => w.length >= 3));
  if (wa.length === 0 || wb.size === 0) return false;
  let inter = 0;
  for (const w of wa) {
    if (wb.has(w)) inter++;
  }
  const uni = wa.length + wb.size - inter;
  return uni > 0 && inter / uni >= 0.88;
}

function validate(q, idx) {
  const errs = [];
  if (!q || typeof q !== "object") {
    errs.push("not an object");
    return errs;
  }
  const { question, choices, correct_index, explanation, category, difficulty } = q;
  if (typeof question !== "string" || !question.trim()) errs.push("question empty");
  if (!Array.isArray(choices) || choices.length !== 4 || !choices.every((c) => typeof c === "string" && c.trim()))
    errs.push("choices must be 4 non-empty strings");
  const ci = typeof correct_index === "number" ? correct_index : parseInt(String(correct_index), 10);
  if (!Number.isInteger(ci) || ci < 0 || ci > 3) errs.push("correct_index 0-3");
  if (typeof explanation !== "string" || !explanation.trim()) errs.push("explanation empty");
  if (typeof category !== "string" || !ACCEPT_CAT.has(category))
    errs.push(`category must be one of: ${[...ACCEPT_CAT].join(", ")}`);
  if (typeof difficulty !== "string" || !ACCEPT_DIFF.has(difficulty))
    errs.push("difficulty must be easy, medium, or hard");
  return errs;
}

const incomingPath = resolve(process.argv[2] ?? "");
if (!incomingPath || !existsSync(incomingPath)) {
  console.error("Usage: node scripts/merge-question-batch.mjs <path-to-batch.json>");
  process.exit(1);
}

if (!existsSync(destPath)) {
  console.error("Missing", destPath);
  process.exit(1);
}

const existing = JSON.parse(readFileSync(destPath, "utf8"));
if (!Array.isArray(existing)) {
  console.error("Destination must be a JSON array");
  process.exit(1);
}

let batch;
try {
  batch = JSON.parse(readFileSync(incomingPath, "utf8"));
} catch (e) {
  console.error("Invalid batch JSON:", e.message);
  process.exit(1);
}
if (!Array.isArray(batch)) {
  console.error("Batch must be a JSON array");
  process.exit(1);
}

const rejected = [];
const added = [];

for (let i = 0; i < batch.length; i++) {
  const q = batch[i];
  const ve = validate(q, i + 1);
  if (ve.length) {
    rejected.push({ index: i + 1, reason: `invalid (${ve.join("; ")})`, question: q?.question?.slice(0, 60) });
    continue;
  }
  let dupReason = null;
  for (const e of existing) {
    if (norm(e.question) === norm(q.question)) {
      dupReason = "exact match in new-questions.json";
      break;
    }
    if (verySimilar(e.question, q.question)) {
      dupReason = "very similar to existing question";
      break;
    }
  }
  if (!dupReason) {
    for (const e of added) {
      if (norm(e.question) === norm(q.question)) {
        dupReason = "duplicate within this batch";
        break;
      }
      if (verySimilar(e.question, q.question)) {
        dupReason = "very similar within this batch";
        break;
      }
    }
  }
  if (dupReason) {
    rejected.push({ index: i + 1, reason: dupReason, question: q.question.slice(0, 80) });
    continue;
  }
  added.push(q);
}

const merged = [...existing, ...added];
writeFileSync(destPath, JSON.stringify(merged, null, 2) + "\n", "utf8");

if (incomingPath.includes("_incoming_batch")) {
  try {
    unlinkSync(incomingPath);
  } catch {
    /* ignore */
  }
}

console.log(
  JSON.stringify(
    {
      added: added.length,
      rejected: rejected.length,
      rejectedDetails: rejected,
      totalInNewQuestionsJson: merged.length,
    },
    null,
    2,
  ),
);

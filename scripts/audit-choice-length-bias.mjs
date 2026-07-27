/**
 * Audit live questions where the correct choice is much longer than distractors
 * (telegraphs the answer). Optionally apply automated balancing.
 *
 * Usage:
 *   npm run audit:choice-length-bias
 *   npm run audit:choice-length-bias -- --apply
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const apply = process.argv.includes("--apply");

function loadEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, i).trim()] = v;
  }
  return env;
}

function parseChoices(raw) {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function isFlagged(choices, correctIndex) {
  const correct = choices[correctIndex] ?? "";
  const wrong = choices.filter((_, i) => i !== correctIndex);
  if (!correct || wrong.length !== 3) return false;
  const avgWrong = wrong.reduce((s, c) => s + c.length, 0) / wrong.length;
  const maxWrong = Math.max(...wrong.map((c) => c.length));
  return correct.length >= Math.max(avgWrong * 1.55, maxWrong + 12);
}

/** Expand short distractors toward parallel length without absurd padding. */
function balanceChoices(choices, correctIndex) {
  const correct = choices[correctIndex] ?? "";
  let trimmedCorrect = correct;
  if (correct.length > 92) {
    const dash = correct.search(/[—–-]/);
    if (dash > 24 && dash < 70) trimmedCorrect = correct.slice(0, dash).trim();
    else trimmedCorrect = correct.slice(0, 88).trim() + "…";
  }

  const target = Math.max(
    28,
    Math.min(trimmedCorrect.length, 72),
    Math.round(
      choices.reduce((s, c, i) => (i === correctIndex ? s : s + c.length), 0) / 3,
    ),
  );

  const balanced = choices.map((choice, i) => {
    if (i === correctIndex) return trimmedCorrect;
    return expandWrong(choice, trimmedCorrect, target);
  });

  return balanced;
}

function expandWrong(wrong, correct, targetLen) {
  let w = wrong.trim();
  if (w.length >= targetLen * 0.68) return w;

  const lower = w.charAt(0).toLowerCase() + w.slice(1);

  if (/^c'?est\b/i.test(correct) && !/^c'?est\b/i.test(w)) {
    w = `C'est ${lower}`;
  } else if (/^on\b/i.test(correct) && !/^on\b/i.test(w)) {
    w = `On parle plutôt de ${lower}`;
  } else if (/^[A-ZÀ-Ÿ]/.test(correct) && correct.includes("—") && !w.includes("—")) {
    w = `${w} — autre piste, pas le sens visé`;
  } else if (w.length < 18) {
    w = `${w}, dans un autre sens que celui attendu`;
  } else {
    w = `${w}, mais ce n'est pas le sens visé ici`;
  }

  if (w.length > 96) return w.slice(0, 93) + "…";
  return w;
}

const env = loadEnv(envPath);
const url = String(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");
const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();

if (!url || !key) {
  console.error("Missing Supabase URL/key in .env");
  process.exit(1);
}

const supabase = createClient(`${url}/`, key, { auth: { persistSession: false } });

const { data: rows, error } = await supabase
  .from("questions")
  .select("id, question, concept_key, choices, correct_index")
  .eq("status", "live")
  .eq("is_active", true);

if (error) {
  console.error(error.message);
  process.exit(1);
}

const flagged = [];
for (const row of rows ?? []) {
  const choices = parseChoices(row.choices);
  const ci = row.correct_index ?? 0;
  if (!isFlagged(choices, ci)) continue;
  const balanced = balanceChoices(choices, ci);
  flagged.push({
    id: row.id,
    concept_key: row.concept_key,
    question: row.question,
    correct_index: ci,
    before: choices,
    after: balanced,
  });
}

const outDir = resolve(root, "exports/editorial");
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const jsonPath = resolve(outDir, `choice-length-bias-${stamp}.json`);
const latestPath = resolve(outDir, "choice-length-bias-latest.json");
writeFileSync(jsonPath, JSON.stringify({ flagged_count: flagged.length, items: flagged }, null, 2));
writeFileSync(latestPath, JSON.stringify({ flagged_count: flagged.length, items: flagged }, null, 2));

console.log(`Live questions: ${rows?.length ?? 0}`);
console.log(`Flagged (length bias): ${flagged.length}`);
console.log(`Wrote ${latestPath}`);

if (!apply) {
  console.log("Dry run — pass --apply to update choices in DB.");
  process.exit(0);
}

let updated = 0;
let failed = 0;
for (const item of flagged) {
  const { error: upErr } = await supabase
    .from("questions")
    .update({ choices: item.after })
    .eq("id", item.id);
  if (upErr) {
    failed += 1;
    console.error(item.id, upErr.message);
  } else {
    updated += 1;
  }
}

console.log(`Applied: ${updated} updated, ${failed} failed`);

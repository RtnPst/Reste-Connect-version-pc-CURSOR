/**
 * Safe small insert of pilot question lots into live DB.
 * - Does NOT soft-disable existing questions
 * - Skips rows whose question text already exists
 * - Idempotent re-runs
 *
 * Usage:
 *   node scripts/insert-pilot-lot-live.mjs --dry
 *   node scripts/insert-pilot-lot-live.mjs --apply --files=brainrot,delulu
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");
const DRY = process.argv.includes("--dry") || !APPLY;
const filesArg = process.argv.find((a) => a.startsWith("--files="));
const files = (filesArg ? filesArg.slice("--files=".length) : "brainrot,delulu")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function loadEnv() {
  const env = {};
  const path = resolve(root, ".env");
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, i).trim()] = v;
  }
  return env;
}

const env = loadEnv();
const url = String(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");
const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(`${url}/`, key, { auth: { persistSession: false } });

const pilots = [];
for (const name of files) {
  const path = resolve(root, `src/data/${name}-pilot-questions-v1.json`);
  if (!existsSync(path)) {
    console.warn("Missing pilot file:", path);
    continue;
  }
  pilots.push(JSON.parse(readFileSync(path, "utf8")));
}

const candidates = [];
for (const pilot of pilots) {
  for (const q of pilot.questions ?? []) {
    candidates.push({
      theme: q.theme,
      difficulty: q.difficulty,
      question: q.question,
      choices: q.choices,
      correct_index: q.correct_index,
      explanation: q.explanation,
      is_active: true,
      status: "live",
      concept_key: q.concept_key,
      internet_level: q.internet_level ?? null,
      tone: q.tone ?? null,
      format: q.format ?? null,
      editor_notes: q.editor_notes ?? `pilot insert ${pilot.pilot_id}`,
    });
  }
}

const texts = candidates.map((c) => c.question);
const { data: existing, error: exErr } = await supabase
  .from("questions")
  .select("id, question, concept_key, status")
  .in("question", texts);

if (exErr) {
  console.error(exErr.message);
  process.exit(1);
}

const existingSet = new Set((existing ?? []).map((r) => r.question));
const toInsert = candidates.filter((c) => !existingSet.has(c.question));
const skipped = candidates.filter((c) => existingSet.has(c.question));

const report = {
  generated_at: new Date().toISOString(),
  mode: DRY ? "dry_run" : "apply",
  files,
  candidate_count: candidates.length,
  skip_existing: skipped.map((s) => ({ concept_key: s.concept_key, question: s.question.slice(0, 80) })),
  will_insert: toInsert.map((s) => ({ concept_key: s.concept_key, theme: s.theme, question: s.question.slice(0, 80) })),
  inserted_ids: [],
};

if (!DRY && toInsert.length) {
  // Insert without optional enums that may not match DB enum values
  const rows = toInsert.map((c) => ({
    theme: c.theme,
    difficulty: c.difficulty,
    question: c.question,
    choices: c.choices,
    correct_index: c.correct_index,
    explanation: c.explanation,
    is_active: true,
    status: "live",
    concept_key: c.concept_key,
    editor_notes: c.editor_notes,
  }));

  const { data, error } = await supabase.from("questions").insert(rows).select("id, concept_key, question");
  if (error) {
    console.error("Insert failed:", error.message);
    process.exit(1);
  }
  report.inserted_ids = (data ?? []).map((r) => ({
    id: r.id,
    concept_key: r.concept_key,
    question: String(r.question).slice(0, 80),
  }));
}

const outDir = resolve(root, "exports/foundation");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  resolve(outDir, "pilot-lot-insert-latest.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify(report, null, 2));
if (DRY) console.log("\nDry-run. Re-run with --apply to insert.");

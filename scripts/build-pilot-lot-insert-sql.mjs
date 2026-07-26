/**
 * Build idempotent SQL for pilot lot insert (for Supabase MCP / SQL editor).
 * Usage: node scripts/build-pilot-lot-insert-sql.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const filesArg = process.argv.find((a) => a.startsWith("--files="));
const files = (filesArg ? filesArg.slice("--files=".length) : "brainrot,delulu,rizz,soft_launch,touch_grass,main_character,locked_in,iykyk")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function esc(s) {
  return String(s).replace(/'/g, "''");
}

const values = [];
for (const name of files) {
  const path = resolve(root, `src/data/${name}-pilot-questions-v1.json`);
  if (!existsSync(path)) {
    console.warn("skip missing", path);
    continue;
  }
  const pilot = JSON.parse(readFileSync(path, "utf8"));
  for (const q of pilot.questions ?? []) {
    const choices = JSON.stringify(q.choices).replace(/'/g, "''");
    values.push(`(
      '${q.theme}'::public.question_theme,
      '${q.difficulty}'::public.question_difficulty,
      '${esc(q.question)}',
      '${choices}'::jsonb,
      ${q.correct_index},
      '${esc(q.explanation)}',
      true,
      'live'::public.question_status,
      '${q.concept_key}',
      '${esc(q.editor_notes || "pilot lot v1")}'
    )`);
  }
}

const sql = `-- pilot lot insert v1 (idempotent via NOT EXISTS on question text)
INSERT INTO public.questions (
  theme, difficulty, question, choices, correct_index, explanation, is_active, status, concept_key, editor_notes
)
SELECT * FROM (VALUES
${values.join(",\n")}
) AS v(theme, difficulty, question, choices, correct_index, explanation, is_active, status, concept_key, editor_notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions q WHERE q.question = v.question
)
RETURNING id, concept_key, left(question, 60) AS q;
`;

const outDir = resolve(root, "exports/foundation");
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, "pilot-lot-insert-v1.sql");
writeFileSync(outPath, sql, "utf8");
console.log(JSON.stringify({ ok: true, candidates: values.length, out: outPath }, null, 2));

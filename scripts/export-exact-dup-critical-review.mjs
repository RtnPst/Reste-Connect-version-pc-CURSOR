/**
 * Read-only: smallest slice — duplicate groups with refs risk only.
 * Does NOT modify the database.
 *
 * Requires .env: VITE_SUPABASE_URL or SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: node scripts/export-exact-dup-critical-review.mjs
 *
 * Outputs:
 *   exports/dedup-audit/exact-dup-critical-review-<timestamp>.csv
 *   exports/dedup-audit/exact-dup-critical-review-latest.csv
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  buildCriticalExportData,
  csvEscape,
  fullChoicesJson,
  loadEnv,
  normalizeSupabaseUrl,
  summarizeChoices,
  summarizeExplanation,
} from "./lib/exact-dup-critical-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const outDir = resolve(root, "exports/dedup-audit");

async function main() {
  const env = loadEnv(envPath);
  const url = normalizeSupabaseUrl(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "");
  const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !key) {
    console.error("Need VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { criticalGroups, duplicateGroupCount, usage, dailyRefs } =
    await buildCriticalExportData(supabase);

  const headers = [
    "duplicate_group_id",
    "id",
    "question",
    "theme",
    "difficulty",
    "status",
    "is_active",
    "quiz_attempt_refs",
    "daily_question_refs",
    "recommended_keep",
    "ambiguity_reason",
    "choices_summary",
    "full_choices",
    "explanation_summary",
    "full_explanation",
    "created_at",
    "human_decision",
    "human_notes",
  ];

  const lines = [headers.join(",")];
  const baseReason = (r) => r.join(" | ");

  for (const g of criticalGroups) {
    const reasonText = baseReason(g.analysis.reasons);
    const sorted = [...g.members].sort((a, b) => {
      const ar = a.id === g.recommendedId ? 0 : 1;
      const br = b.id === g.recommendedId ? 0 : 1;
      if (ar !== br) return ar - br;
      return String(a.id).localeCompare(String(b.id));
    });
    for (const m of sorted) {
      const isRec = m.id === g.recommendedId;
      const row = {
        duplicate_group_id: g.groupId,
        id: m.id,
        question: m.question,
        theme: m.theme,
        difficulty: m.difficulty,
        status: m.status,
        is_active: m.is_active,
        quiz_attempt_refs: usage.get(m.id) ?? 0,
        daily_question_refs: dailyRefs.get(m.id) ?? 0,
        recommended_keep: isRec ? "yes" : "no",
        ambiguity_reason: reasonText,
        choices_summary: summarizeChoices(m.choices),
        full_choices: fullChoicesJson(m.choices),
        explanation_summary: summarizeExplanation(m.explanation),
        full_explanation: String(m.explanation ?? ""),
        created_at: m.created_at,
        human_decision: "",
        human_notes: "",
      };
      lines.push(headers.map((h) => csvEscape(row[h])).join(","));
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync(outDir, { recursive: true });
  const body = lines.join("\n");
  const outStamped = join(outDir, `exact-dup-critical-review-${stamp}.csv`);
  const outLatest = join(outDir, "exact-dup-critical-review-latest.csv");
  writeFileSync(outStamped, body, "utf8");
  writeFileSync(outLatest, body, "utf8");

  console.log(
    JSON.stringify(
      {
        filter:
          "non_recommended_daily_refs | non_recommended_quiz_refs | recommended_not_max_refs",
        total_exact_duplicate_groups: duplicateGroupCount,
        critical_groups: criticalGroups.length,
        total_csv_rows: lines.length - 1,
        critical_duplicate_group_ids: criticalGroups.map((g) => g.groupId),
        outputs: [outStamped, outLatest],
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

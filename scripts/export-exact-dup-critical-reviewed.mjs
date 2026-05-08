/**
 * Read-only: same rows as export-exact-dup-critical-review.mjs, enriched with
 * human canonical decisions from:
 *   exports/dedup-audit/exact-dup-critical-canonical-decisions.json
 *
 * Adds column preferred_canonical (yes/no) and prefills human_decision / human_notes.
 * Does NOT modify the database.
 *
 * Usage: node scripts/export-exact-dup-critical-reviewed.mjs
 *
 * Outputs:
 *   exports/dedup-audit/exact-dup-critical-review-reviewed-<timestamp>.csv
 *   exports/dedup-audit/exact-dup-critical-review-reviewed-latest.csv
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
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
const decisionsPath = join(outDir, "exact-dup-critical-canonical-decisions.json");

function loadDecisions() {
  if (!existsSync(decisionsPath)) {
    throw new Error(`Missing decisions file: ${decisionsPath}`);
  }
  const raw = readFileSync(decisionsPath, "utf8");
  return JSON.parse(raw);
}

async function main() {
  const env = loadEnv(envPath);
  const url = normalizeSupabaseUrl(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "");
  const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !key) {
    console.error("Need VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const decisionsDoc = loadDecisions();
  const groupDecisions = decisionsDoc.groups ?? {};

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
    "preferred_canonical",
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
    const decision = groupDecisions[g.groupId];
    const preferredId = decision?.preferred_canonical_id ?? null;
    const canonicalNotes = decision?.canonical_notes ?? "";

    if (!preferredId) {
      console.warn(
        `[reviewed] No canonical decision for group ${g.groupId} — rows get empty human_*`,
      );
    } else {
      const ids = new Set(g.members.map((m) => m.id));
      if (!ids.has(preferredId)) {
        throw new Error(
          `preferred_canonical_id ${preferredId} not in group ${g.groupId} members`,
        );
      }
    }

    const sorted = [...g.members].sort((a, b) => {
      if (!preferredId) {
        const ar = a.id === g.recommendedId ? 0 : 1;
        const br = b.id === g.recommendedId ? 0 : 1;
        if (ar !== br) return ar - br;
      } else {
        const ap = a.id === preferredId ? 0 : 1;
        const bp = b.id === preferredId ? 0 : 1;
        if (ap !== bp) return ap - bp;
      }
      return String(a.id).localeCompare(String(b.id));
    });

    const reasonText = baseReason(g.analysis.reasons);

    for (const m of sorted) {
      const isRec = m.id === g.recommendedId;
      const isPreferred = preferredId && m.id === preferredId;

      let humanDecision = "";
      let humanNotes = "";
      if (preferredId) {
        if (isPreferred) {
          humanDecision = "preferred_canonical_candidate";
          humanNotes = canonicalNotes;
        } else {
          humanDecision = "superseded_pending_cleanup";
          humanNotes = `Doublon à traiter après cleanup — conserver ${preferredId} comme référence (voir ligne preferred_canonical=yes du même groupe).`;
        }
      }

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
        preferred_canonical: isPreferred ? "yes" : "no",
        ambiguity_reason: reasonText,
        choices_summary: summarizeChoices(m.choices),
        full_choices: fullChoicesJson(m.choices),
        explanation_summary: summarizeExplanation(m.explanation),
        full_explanation: String(m.explanation ?? ""),
        created_at: m.created_at,
        human_decision: humanDecision,
        human_notes: humanNotes,
      };
      lines.push(headers.map((h) => csvEscape(row[h])).join(","));
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync(outDir, { recursive: true });
  const body = lines.join("\n");
  const outStamped = join(outDir, `exact-dup-critical-review-reviewed-${stamp}.csv`);
  const outLatest = join(outDir, "exact-dup-critical-review-reviewed-latest.csv");
  writeFileSync(outStamped, body, "utf8");
  writeFileSync(outLatest, body, "utf8");

  console.log(
    JSON.stringify(
      {
        decisions_file: decisionsPath,
        total_exact_duplicate_groups: duplicateGroupCount,
        critical_groups: criticalGroups.length,
        total_csv_rows: lines.length - 1,
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

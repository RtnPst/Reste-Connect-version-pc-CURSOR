/**
 * Read-only preview: first "archive-only calm batch" duplicate stabilization.
 *
 * Strict calm criteria (all required):
 *   - NOT one of the 3 critical duplicate groups (canonical review JSON).
 *   - NOT "high-priority" per analyzeGroup() — i.e. analysis.reasons.length === 0
 *     (no choices/explanation/difficulty mismatch, no refs risk flags, no heuristic tie, etc.).
 *   - Zero quiz_attempt_refs AND zero daily_question_refs on ALL members.
 *   - Exactly ONE row with status=live AND is_active=true (canonical player).
 *   - Every other row: status=archived AND is_active=false (already legacy).
 *
 * If all pass, NO row currently needs an UPDATE — batch documents canonical IDs for audit.
 *
 * Does NOT modify the database.
 *
 * Usage:
 *   node scripts/preview-archive-only-calm-batch.mjs
 *   node scripts/preview-archive-only-calm-batch.mjs --write
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  analyzeGroup,
  csvEscape,
  fetchAllQuestions,
  fetchDailyRefs,
  fetchQuestionUsageCounts,
  loadEnv,
  normalizeDbKey,
  normalizeSupabaseUrl,
  pickRecommendedKeep,
  shortHash,
} from "./lib/exact-dup-critical-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const decisionsPath = resolve(
  root,
  "exports/dedup-audit/exact-dup-critical-canonical-decisions.json",
);
const outDir = resolve(root, "exports/dedup-audit");

function loadCriticalGroupIds() {
  if (!existsSync(decisionsPath)) return new Set();
  const doc = JSON.parse(readFileSync(decisionsPath, "utf8"));
  return new Set(Object.keys(doc.groups ?? {}));
}

function isHighPriorityAnalysis(analysis) {
  return analysis.reasons.length > 0;
}

async function main() {
  const writeFiles = process.argv.includes("--write");

  const criticalGroupIds = loadCriticalGroupIds();

  const env = loadEnv(envPath);
  const url = normalizeSupabaseUrl(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "");
  const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !key) {
    console.error("Need VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const [rows, usage, dailyRefs] = await Promise.all([
    fetchAllQuestions(supabase),
    fetchQuestionUsageCounts(supabase),
    fetchDailyRefs(supabase),
  ]);

  const byKey = new Map();
  for (const r of rows) {
    const k = normalizeDbKey(r.question);
    if (!k) continue;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(r);
  }

  const duplicateEntries = [...byKey.entries()].filter(([, list]) => list.length > 1);

  /** @type {typeof calmGroups} */
  const calmGroups = [];
  const excludedHighPriority = [];
  const excludedCritical = [];
  const excludedRefs = [];
  const excludedLivePattern = [];
  const excludedNotArchivedVariants = [];

  for (const [normKey, members] of duplicateEntries) {
    const groupId = `exact_${shortHash(normKey)}`;
    const recommendedId = pickRecommendedKeep(members);
    const analysis = analyzeGroup(members, usage, dailyRefs, recommendedId);

    if (criticalGroupIds.has(groupId)) {
      excludedCritical.push({ groupId, reason: "critical_three_reviewed_groups" });
      continue;
    }

    if (isHighPriorityAnalysis(analysis)) {
      excludedHighPriority.push({
        groupId,
        reasons: analysis.reasons,
      });
      continue;
    }

    const refsOk = members.every(
      (m) =>
        (usage.get(m.id) ?? 0) === 0 && (dailyRefs.get(m.id) ?? 0) === 0,
    );
    if (!refsOk) {
      excludedRefs.push({ groupId });
      continue;
    }

    const liveActive = members.filter((m) => m.status === "live" && m.is_active === true);
    if (liveActive.length !== 1) {
      excludedLivePattern.push({
        groupId,
        live_active_count: liveActive.length,
      });
      continue;
    }

    const keeper = liveActive[0];
    const variantsLegacy = members.every((m) => {
      if (m.id === keeper.id) return true;
      return m.status === "archived" && m.is_active === false;
    });

    if (!variantsLegacy) {
      excludedNotArchivedVariants.push({ groupId });
      continue;
    }

    calmGroups.push({
      groupId,
      normKey,
      canonical_id: keeper.id,
      canonical_matches_recommended_heuristic: keeper.id === recommendedId,
      recommended_heuristic_id: recommendedId,
      member_count: members.length,
      variant_ids: members.filter((m) => m.id !== keeper.id).map((m) => m.id),
      members: members.map((m) => ({
        id: m.id,
        role: m.id === keeper.id ? "canonical_live" : "legacy_archived",
        status: m.status,
        is_active: m.is_active,
        theme: m.theme,
        difficulty: m.difficulty,
        question_preview: String(m.question).slice(0, 120),
      })),
      planned_sql_actions: [],
    });
  }

  calmGroups.sort((a, b) => a.groupId.localeCompare(b.groupId));

  const summary = {
    generated_at: new Date().toISOString(),
    total_exact_duplicate_groups: duplicateEntries.length,
    calm_batch_eligible_groups: calmGroups.length,
    planned_question_updates: 0,
    eligibility_notes: {
      excluded_critical_groups: excludedCritical.length,
      excluded_high_priority_ambiguous: excludedHighPriority.length,
      excluded_any_refs: excludedRefs.length,
      excluded_live_active_count_ne_1: excludedLivePattern.length,
      excluded_variants_not_fully_archived: excludedNotArchivedVariants.length,
    },
    calm_duplicate_group_ids: calmGroups.map((g) => g.groupId),
    message:
      calmGroups.length > 0
        ? "All calm groups already have variants archived; first batch requires NO status UPDATE — documentation / verification only unless policy changes."
        : "No groups matched strict calm criteria.",
  };

  console.log(JSON.stringify(summary, null, 2));

  if (writeFiles) {
    mkdirSync(outDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const jsonPath = join(outDir, `archive-calm-batch-preview-${stamp}.json`);
    const payload = {
      summary,
      calm_groups: calmGroups,
      exclusions: {
        critical: excludedCritical,
        high_priority_sample: excludedHighPriority.slice(0, 30),
        refs: excludedRefs,
        live_pattern: excludedLivePattern,
        not_archived_variants: excludedNotArchivedVariants,
      },
    };
    writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");
    writeFileSync(join(outDir, "archive-calm-batch-preview-latest.json"), JSON.stringify(payload, null, 2), "utf8");

    const gh = [
      "duplicate_group_id",
      "canonical_question_id",
      "variant_question_ids",
      "group_member_count",
      "canonical_matches_heuristic_recommended",
      "planned_updates_count",
      "notes",
    ];
    const groupLines = [
      gh.join(","),
      ...calmGroups.map((g) =>
        [
          g.groupId,
          g.canonical_id,
          g.variant_ids.join(";"),
          g.member_count,
          g.canonical_matches_recommended_heuristic ? "yes" : "no",
          "0",
          "variants_already_archived_no_op",
        ]
          .map(csvEscape)
          .join(","),
      ),
    ];
    writeFileSync(join(outDir, `archive-calm-batch-groups-${stamp}.csv`), groupLines.join("\n"), "utf8");
    writeFileSync(join(outDir, "archive-calm-batch-groups-latest.csv"), groupLines.join("\n"), "utf8");

    const rh = [
      "duplicate_group_id",
      "id",
      "role",
      "status",
      "is_active",
      "theme",
      "difficulty",
      "question_preview",
    ];
    const rowLines = [rh.join(",")];
    for (const g of calmGroups) {
      for (const m of g.members) {
        rowLines.push(
          [
            g.groupId,
            m.id,
            m.role,
            m.status,
            m.is_active,
            m.theme,
            m.difficulty,
            m.question_preview,
          ]
            .map(csvEscape)
            .join(","),
        );
      }
    }
    writeFileSync(join(outDir, `archive-calm-batch-rows-${stamp}.csv`), rowLines.join("\n"), "utf8");
    writeFileSync(join(outDir, "archive-calm-batch-rows-latest.csv"), rowLines.join("\n"), "utf8");

    console.log("\nWrote:", jsonPath, "archive-calm-batch-*-latest.csv");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

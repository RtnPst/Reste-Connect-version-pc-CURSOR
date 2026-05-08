/**
 * Read-only preview: soft archive batch #2 ("safe-ish" — more meaningful than strict calm).
 *
 * Two disjoint eligibility tracks:
 *
 * **A) Playable single canonical** — exactly ONE member is status=live AND is_active=true.
 *    - That row is the canonical keeper; must match pickRecommendedKeep (no heuristic fight).
 *    - NOT "strict calm" for batch 1: either editorial reasons exist OR a variant is not fully legacy.
 *
 * **B) Dormant exact-duplicate families** — ZERO live+active members (typical today: all variants archived).
 *    - Canonical is pickRecommendedKeep (editorial / scoring tie-break only — no playable row validates UX).
 *    - Skip noise: everyone already archived+inactive AND zero editorial reasons.
 *
 * Shared guards (ALL required):
 *   - NOT in exact-dup-critical-canonical-decisions.json.
 *   - Zero daily_question_refs on EVERY member.
 *   - Zero quiz_attempt_refs on every NON-canonical member.
 *   - analyzeGroup(..., canonicalId) must not hit: multiple_live, multiple_active,
 *     heuristic_tie_ambiguous, non_recommended_quiz_refs, non_recommended_daily_refs,
 *     recommended_not_max_refs.
 *
 * SQL proposal (if ever applied): ONLY status='archived', is_active=false on variant UUIDs.
 * Does NOT touch quiz_attempts, daily_questions, or delete rows.
 *
 * Usage:
 *   node scripts/preview-soft-archive-batch-2.mjs
 *   node scripts/preview-soft-archive-batch-2.mjs --write
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
  summarizeExplanation,
  summarizeChoices,
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

function isStrictCalmDuplicate(analysis, members, keeperId) {
  if (analysis.reasons.length !== 0) return false;
  return members.every((m) => {
    if (m.id === keeperId) return true;
    return m.status === "archived" && m.is_active === false;
  });
}

/** All members archived + inactive — no editorial reasons (identical "shape" to dead noise). */
function isStrictDormantNoise(analysis, members) {
  if (analysis.reasons.length !== 0) return false;
  return members.every((m) => m.status === "archived" && m.is_active === false);
}

function blockedStructuralFlagsPlayable(flags) {
  return (
    flags.multiple_live ||
    flags.multiple_active ||
    flags.heuristic_tie_ambiguous ||
    flags.non_recommended_quiz_refs ||
    flags.non_recommended_daily_refs ||
    flags.recommended_not_max_refs
  );
}

/** Dormant families often tie on heuristic score (e.g. all archived); pickRecommendedKeep still breaks ties. */
function blockedStructuralFlagsDormant(flags) {
  return (
    flags.multiple_live ||
    flags.multiple_active ||
    flags.non_recommended_quiz_refs ||
    flags.non_recommended_daily_refs ||
    flags.recommended_not_max_refs
  );
}

function baseRiskLabel(analysis) {
  const ed =
    analysis.flags.choices_differ ||
    analysis.flags.explanations_differ ||
    analysis.flags.difficulty_differ;
  const ck = analysis.flags.canonical_key_mismatch;
  if (ed && ck) return "medium_low_editorial_and_key";
  if (ed) return "medium_low_editorial_only";
  if (ck) return "low_canonical_key_only";
  return "low_operational_only";
}

function buildMigrationSql(nGroups, variantIdList) {
  const nVariants = variantIdList.length;
  return `-- Soft stabilization batch 2 — archive+deactivate VARIANTS only (no deletes, no attempt/daily rewrites).
-- Preview: exports/dedup-audit/soft-archive-batch-2-preview-latest.json
--
-- Families: ${nGroups}; variant UUIDs: ${nVariants}.
-- Guard: every listed UUID must exist; after run, each must be status=archived AND is_active=false.
-- Canonical UUIDs are never listed here and are never updated by this file.

CREATE TEMP TABLE _soft_archive_batch_2_variants (id uuid PRIMARY KEY) ON COMMIT DROP;

INSERT INTO _soft_archive_batch_2_variants (id) VALUES
${variantIdList.map((id) => `  ('${id}'::uuid)`).join(",\n")};

ALTER TABLE public.questions DISABLE TRIGGER trg_sync_question_editorial_fields;

DO $$
DECLARE
  n_present integer;
BEGIN
  SELECT COUNT(*) INTO n_present
  FROM _soft_archive_batch_2_variants v
  INNER JOIN public.questions q ON q.id = v.id;

  IF n_present <> ${nVariants} THEN
    RAISE EXCEPTION 'soft_archive_batch_2: expected % variant UUIDs present in public.questions, found %', ${nVariants}, n_present;
  END IF;

  UPDATE public.questions AS q
  SET
    status = 'archived'::public.question_status,
    is_active = false
  FROM _soft_archive_batch_2_variants AS v
  WHERE q.id = v.id
    AND (
      q.status IS DISTINCT FROM 'archived'::public.question_status
      OR q.is_active IS DISTINCT FROM false
    );

  IF EXISTS (
    SELECT 1
    FROM public.questions q
    INNER JOIN _soft_archive_batch_2_variants v ON v.id = q.id
    WHERE q.status IS DISTINCT FROM 'archived'::public.question_status
       OR q.is_active IS DISTINCT FROM false
  ) THEN
    RAISE EXCEPTION 'soft_archive_batch_2: post-check failed — a variant is not archived/inactive';
  END IF;
END $$;

ALTER TABLE public.questions ENABLE TRIGGER trg_sync_question_editorial_fields;
`;
}

function sharedRefGates(groupId, members, canonicalId, usage, dailyRefs, exclusions) {
  const anyDaily = members.some((m) => (dailyRefs.get(m.id) ?? 0) > 0);
  if (anyDaily) {
    exclusions.any_daily_on_member.push({ groupId });
    return false;
  }

  const variantQuiz = members.some(
    (m) => m.id !== canonicalId && (usage.get(m.id) ?? 0) > 0,
  );
  if (variantQuiz) {
    exclusions.quiz_on_variant.push({ groupId });
    return false;
  }

  return true;
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

  /** @type {any[]} */
  const eligible = [];
  const exclusions = {
    critical: [],
    multiple_live_active: [],
    playable_heuristic_mismatch: [],
    playable_strict_calm_batch1_shape: [],
    dormant_strict_noise: [],
    structural_flags: [],
    any_daily_on_member: [],
    quiz_on_variant: [],
  };

  for (const [normKey, members] of duplicateEntries) {
    const groupId = `exact_${shortHash(normKey)}`;
    const recommendedHeuristic = pickRecommendedKeep(members);

    if (criticalGroupIds.has(groupId)) {
      exclusions.critical.push({ groupId });
      continue;
    }

    const liveActive = members.filter((m) => m.status === "live" && m.is_active === true);

    if (liveActive.length > 1) {
      exclusions.multiple_live_active.push({ groupId, live_active_count: liveActive.length });
      continue;
    }

    /** @type {"playable_single_live" | "dormant_zero_live_active" | null} */
    let track = null;
    /** @type {string} */
    let canonicalId;

    if (liveActive.length === 1) {
      track = "playable_single_live";
      const keeper = liveActive[0];
      canonicalId = keeper.id;
      if (recommendedHeuristic !== keeper.id) {
        exclusions.playable_heuristic_mismatch.push({
          groupId,
          keeper_id: keeper.id,
          heuristic_recommended_id: recommendedHeuristic,
        });
        continue;
      }
    } else {
      track = "dormant_zero_live_active";
      canonicalId = recommendedHeuristic;
    }

    if (!sharedRefGates(groupId, members, canonicalId, usage, dailyRefs, exclusions)) continue;

    const analysis = analyzeGroup(members, usage, dailyRefs, canonicalId);
    const blocked =
      track === "playable_single_live"
        ? blockedStructuralFlagsPlayable(analysis.flags)
        : blockedStructuralFlagsDormant(analysis.flags);
    if (blocked) {
      exclusions.structural_flags.push({
        groupId,
        track,
        heuristic_tie_ambiguous: analysis.flags.heuristic_tie_ambiguous,
        reasons_blocking: [
          analysis.flags.multiple_live ? "multiple_live" : null,
          analysis.flags.multiple_active ? "multiple_active" : null,
          analysis.flags.heuristic_tie_ambiguous ? "heuristic_tie_ambiguous" : null,
          analysis.flags.non_recommended_quiz_refs ? "non_recommended_quiz_refs" : null,
          analysis.flags.non_recommended_daily_refs ? "non_recommended_daily_refs" : null,
          analysis.flags.recommended_not_max_refs ? "recommended_not_max_refs" : null,
        ].filter(Boolean),
      });
      continue;
    }

    if (track === "playable_single_live") {
      if (isStrictCalmDuplicate(analysis, members, canonicalId)) {
        exclusions.playable_strict_calm_batch1_shape.push({ groupId });
        continue;
      }
    } else {
      if (isStrictDormantNoise(analysis, members)) {
        exclusions.dormant_strict_noise.push({ groupId });
        continue;
      }
    }

    const variants = members.filter((m) => m.id !== canonicalId);
    const variantIds = variants.map((m) => m.id);
    const needsUpdateCount = variants.filter(
      (m) => m.status !== "archived" || m.is_active !== false,
    ).length;

    const risk_level =
      track === "dormant_zero_live_active"
        ? `${baseRiskLabel(analysis)}_dormant_pool`
        : baseRiskLabel(analysis);

    eligible.push({
      group_id: groupId,
      canonical_selection_mode: track,
      norm_key_preview: normKey.slice(0, 200),
      canonical_question_id: canonicalId,
      variant_question_ids: variantIds,
      member_count: members.length,
      variant_count: variants.length,
      variants_needing_status_update: needsUpdateCount,
      recommended_heuristic_id: recommendedHeuristic,
      analysis_flags: { ...analysis.flags },
      analysis_reasons: analysis.reasons,
      risk_level,
      members: members.map((m) => {
        const isCanon = m.id === canonicalId;
        let role = "variant_to_archive";
        if (isCanon) {
          role = track === "playable_single_live" ? "canonical_live" : "canonical_heuristic_dormant";
        }
        return {
          id: m.id,
          role,
          status: m.status,
          is_active: m.is_active,
          theme: m.theme,
          difficulty: m.difficulty,
          question_preview: String(m.question).slice(0, 120),
          explanation_preview: summarizeExplanation(m.explanation, 140),
          choices_preview: summarizeChoices(m.choices),
          quiz_attempt_refs: usage.get(m.id) ?? 0,
          daily_question_refs: dailyRefs.get(m.id) ?? 0,
        };
      }),
    });
  }

  eligible.sort((a, b) => a.group_id.localeCompare(b.group_id));

  const variantRowsForCsv = [];
  for (const g of eligible) {
    for (const m of g.members) {
      if (m.role === "variant_to_archive") {
        const dormantNote =
          g.canonical_selection_mode === "dormant_zero_live_active"
            ? "DORMANT family: no live+active row; canonical_id is heuristic-only. Confirm before any future reactivation."
            : "PLAYABLE canonical: single live+active row; editorial variants differ — confirm wording/answers/difficulty intent.";
        variantRowsForCsv.push({
          duplicate_group_id: g.group_id,
          canonical_selection_mode: g.canonical_selection_mode,
          id: m.id,
          status_before: m.status,
          is_active_before: m.is_active,
          theme: m.theme,
          difficulty: m.difficulty,
          canonical_question_id: g.canonical_question_id,
          question_preview: m.question_preview,
          explanation_preview: m.explanation_preview,
          choices_preview: m.choices_preview,
          quiz_attempt_refs: m.quiz_attempt_refs,
          daily_question_refs: m.daily_question_refs,
          risk_level: g.risk_level,
          flags_choices_differ: g.analysis_flags.choices_differ,
          flags_explanations_differ: g.analysis_flags.explanations_differ,
          flags_difficulty_differ: g.analysis_flags.difficulty_differ,
          flags_canonical_key_mismatch: g.analysis_flags.canonical_key_mismatch,
          human_review_status: "pending_batch_2",
          human_notes: dormantNote,
        });
      }
    }
  }

  const allVariantIds = variantRowsForCsv.map((r) => r.id);
  const duplicateVariantCheck = allVariantIds.length !== new Set(allVariantIds).size;

  const playableN = eligible.filter((g) => g.canonical_selection_mode === "playable_single_live").length;
  const dormantN = eligible.filter((g) => g.canonical_selection_mode === "dormant_zero_live_active").length;

  const summary = {
    generated_at: new Date().toISOString(),
    policy: "soft_archive_batch_2_meaningful_non_calm_or_dormant_editorial",
    total_exact_duplicate_groups: duplicateEntries.length,
    eligible_groups: eligible.length,
    eligible_playable_single_live_groups: playableN,
    eligible_dormant_zero_live_active_groups: dormantN,
    variant_rows_targeted: allVariantIds.length,
    variants_needing_non_noop_update: variantRowsForCsv.filter(
      (r) => r.status_before !== "archived" || r.is_active_before !== false,
    ).length,
    risk_distribution: eligible.reduce((acc, g) => {
      acc[g.risk_level] = (acc[g.risk_level] ?? 0) + 1;
      return acc;
    }, {}),
    duplicate_variant_ids_in_batch: duplicateVariantCheck,
    exclusions_counts: {
      critical: exclusions.critical.length,
      multiple_live_active: exclusions.multiple_live_active.length,
      playable_heuristic_mismatch: exclusions.playable_heuristic_mismatch.length,
      playable_strict_calm_batch1_shape: exclusions.playable_strict_calm_batch1_shape.length,
      dormant_strict_noise: exclusions.dormant_strict_noise.length,
      any_daily_on_member: exclusions.any_daily_on_member.length,
      quiz_on_variant: exclusions.quiz_on_variant.length,
      structural_flags: exclusions.structural_flags.length,
    },
    batch_2_risk_summary:
      "Medium-low operational risk on refs/daily; medium human-judgment risk on editorial picks — especially dormant_pool rows where no live+active row exists (heuristic canonical only). Batch 1 was ref-identical calm singles; Batch 2 tolerates choices/explanation/difficulty spread.",
    untouched_remainder:
      "Critical reviewed groups; families linked to daily_questions; variants with quiz_attempt refs; multiple simultaneous live+active rows; playable track where heuristic disagrees with the lone live+active row; strict calm batch-1-shaped groups; pure dormant noise (all archived+inactive, zero editorial deltas); near/non-exact clusters. Note: dormant track allows heuristic score ties when all variants are archived — canonical is still pickRecommendedKeep (created_at + id tie-break).",
    idempotent: true,
    no_deletes: true,
    no_quiz_attempt_rewrite: true,
    no_daily_questions_updates: true,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (duplicateVariantCheck) {
    console.error("Invariant failed: duplicate variant UUID in batch — aborting writes.");
    process.exit(1);
  }

  if (!writeFiles) {
    console.error("\nDry run only. Re-run with --write to emit exports/dedup-audit/soft-archive-batch-2-* files.");
    return;
  }

  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  const previewPayload = {
    summary,
    groups: eligible,
    exclusions,
    planned_variant_updates: variantRowsForCsv,
  };

  const jsonPath = join(outDir, `soft-archive-batch-2-preview-${stamp}.json`);
  writeFileSync(jsonPath, JSON.stringify(previewPayload, null, 2), "utf8");
  writeFileSync(
    join(outDir, "soft-archive-batch-2-preview-latest.json"),
    JSON.stringify(previewPayload, null, 2),
    "utf8",
  );

  const revHeader = [
    "duplicate_group_id",
    "canonical_selection_mode",
    "id",
    "status_before",
    "is_active_before",
    "theme",
    "difficulty",
    "canonical_question_id",
    "question_preview",
    "explanation_preview",
    "choices_preview",
    "quiz_attempt_refs",
    "daily_question_refs",
    "risk_level",
    "flags_choices_differ",
    "flags_explanations_differ",
    "flags_difficulty_differ",
    "flags_canonical_key_mismatch",
    "human_review_status",
    "human_notes",
  ];
  const csvLines = [
    revHeader.join(","),
    ...variantRowsForCsv.map((r) => revHeader.map((h) => csvEscape(r[h])).join(",")),
  ];
  writeFileSync(join(outDir, `soft-archive-batch-2-reviewed-${stamp}.csv`), csvLines.join("\n"), "utf8");
  writeFileSync(join(outDir, "soft-archive-batch-2-reviewed-latest.csv"), csvLines.join("\n"), "utf8");

  const migrationSql = buildMigrationSql(eligible.length, allVariantIds);
  const rollbackSql = `-- Rollback soft_archive_batch_2 — restore VARIANT editorial flags from snapshot in soft-archive-batch-2-reviewed-latest.csv.
-- Does not touch quiz_attempts or daily_questions.

CREATE TEMP TABLE _soft_archive_batch_2_rollback (
  id uuid PRIMARY KEY,
  status public.question_status NOT NULL,
  is_active boolean NOT NULL
);

INSERT INTO _soft_archive_batch_2_rollback (id, status, is_active) VALUES
${variantRowsForCsv
  .map(
    (r) =>
      `  ('${r.id}'::uuid, '${r.status_before}'::public.question_status, ${r.is_active_before})`,
  )
  .join(",\n")};

ALTER TABLE public.questions DISABLE TRIGGER trg_sync_question_editorial_fields;

UPDATE public.questions AS q
SET
  status = r.status,
  is_active = r.is_active
FROM _soft_archive_batch_2_rollback AS r
WHERE q.id = r.id;

ALTER TABLE public.questions ENABLE TRIGGER trg_sync_question_editorial_fields;
`;

  writeFileSync(join(outDir, `soft-archive-batch-2-proposed-migration-${stamp}.sql`), migrationSql, "utf8");
  writeFileSync(
    join(outDir, "soft-archive-batch-2-proposed-migration-latest.sql"),
    migrationSql,
    "utf8",
  );
  writeFileSync(join(outDir, `soft-archive-batch-2-rollback-${stamp}.sql`), rollbackSql, "utf8");
  writeFileSync(join(outDir, "soft-archive-batch-2-rollback-latest.sql"), rollbackSql, "utf8");

  console.log("\nWrote:", jsonPath, "soft-archive-batch-2-*-latest.{json,csv,sql}");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

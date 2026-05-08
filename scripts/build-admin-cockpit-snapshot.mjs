import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dedupDir = resolve(root, "exports/dedup-audit");
const analyticsDir = resolve(root, "exports/analytics");
const outDir = resolve(root, "public/admin-cockpit");

const INPUTS = {
  conceptIntake: join(dedupDir, "concept-intake-v1-review-latest.csv"),
  conceptDecisionSummary: join(dedupDir, "concept-intake-v1-decision-summary-latest.csv"),
  editorialPriority: join(dedupDir, "editorial-priority-v1-latest.csv"),
  conceptFreshness: join(dedupDir, "concept-freshness-v1-latest.csv"),
  needsRefresh: join(dedupDir, "needs-refresh-v1-latest.csv"),
  conceptOverexposure: join(dedupDir, "concept-overexposure-v1-latest.csv"),
  questionDrafts: join(dedupDir, "question-drafts-v1-review-latest.csv"),
  batch2Review: join(dedupDir, "concept-aware-batch2-review-latest.csv"),
  batch2Summary: join(dedupDir, "concept-aware-batch2-review-summary-latest.json"),
  analyticsPhase1Summary: join(analyticsDir, "phase1-summary-latest.json"),
  safeEvergreen: join(dedupDir, "safe-evergreen-v1-latest.csv"),
};

function safeNowIso() {
  return new Date().toISOString();
}

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsvFile(path) {
  if (!existsSync(path)) return { rows: [], headers: [] };
  const raw = readFileSync(path, "utf8").replace(/\r/g, "").trim();
  if (!raw) return { rows: [], headers: [] };
  const lines = raw.split("\n");
  if (!lines.length) return { rows: [], headers: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
  return { rows, headers };
}

function parseJsonFile(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function toNumberMaybe(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function splitFlags(flags) {
  return String(flags ?? "")
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean);
}

function countSemicolonList(v) {
  return String(v ?? "")
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean).length;
}

function sourceInfo(path, kind, rowCount = null) {
  const exists = existsSync(path);
  return {
    key: kind,
    path: path.replace(root + "\\", "").replaceAll("\\", "/"),
    exists,
    row_count: rowCount,
    mtime: exists ? statSync(path).mtime.toISOString() : null,
  };
}

function writeJson(name, payload) {
  const target = join(outDir, name);
  writeFileSync(target, JSON.stringify(payload, null, 2), "utf8");
}

function qualityBadge(bucket) {
  const v = String(bucket ?? "").trim().toLowerCase();
  if (!v) return "unknown";
  return v;
}

function buildOverview({
  conceptIntakeRows,
  questionDraftRows,
  editorialPriorityRows,
  conceptFreshnessRows,
  needsRefreshRows,
  batch2Rows,
  analyticsSummary,
  safeEvergreenRows,
}) {
  const intakeTotal = conceptIntakeRows.length;
  const intakeResolved = conceptIntakeRows.filter((r) =>
    ["approve", "reject", "watchlist", "merge"].includes(String(r.human_decision ?? "").trim().toLowerCase()),
  ).length;
  const draftsPending = questionDraftRows.filter((r) => !String(r.human_decision ?? "").trim()).length;
  const urgentPriority = editorialPriorityRows.filter(
    (r) => qualityBadge(r.priority_bucket) === "urgent_review",
  ).length;
  const criticalFreshness = conceptFreshnessRows.filter(
    (r) => qualityBadge(r.freshness_band) === "critical_refresh",
  ).length;
  const refreshHigh = needsRefreshRows.filter((r) => qualityBadge(r.severity) === "high").length;
  const batch2MediumOrHigher = batch2Rows.filter((r) => {
    const risk = qualityBadge(r.risk_level);
    return risk === "medium" || risk === "medium_high" || risk === "high" || risk === "critical";
  }).length;
  const safeEvergreenCount = safeEvergreenRows.length;

  const phase0Attempts = Number(analyticsSummary?.phase0?.summary?.total_attempts ?? 0);
  const phase1Available = Boolean(analyticsSummary?.phase1?.analytics_events_available);
  const phase1EventCount = Number(analyticsSummary?.phase1?.analytics_event_count ?? 0);

  return {
    kpis: {
      concept_intake_total: intakeTotal,
      concept_intake_resolved: intakeResolved,
      concept_intake_unresolved: Math.max(0, intakeTotal - intakeResolved),
      question_drafts_pending_review: draftsPending,
      editorial_priority_urgent_review: urgentPriority,
      freshness_critical_refresh: criticalFreshness,
      needs_refresh_high_severity: refreshHigh,
      batch2_medium_or_higher_risk: batch2MediumOrHigher,
      safe_evergreen_candidates: safeEvergreenCount,
      analytics_phase0_total_attempts: phase0Attempts,
      analytics_phase1_events_available: phase1Available,
      analytics_phase1_event_count: phase1EventCount,
    },
  };
}

function main() {
  mkdirSync(outDir, { recursive: true });

  const warnings = [];
  const redactionNotes = [
    "batch_reviews omits raw question_ids and exposes question_count only",
    "analytics_summary includes aggregate phase summaries only (no raw analytics_events rows)",
    "no environment variables are read or emitted by this script",
  ];

  const conceptIntake = parseCsvFile(INPUTS.conceptIntake);
  const conceptDecisionSummary = parseCsvFile(INPUTS.conceptDecisionSummary);
  const editorialPriority = parseCsvFile(INPUTS.editorialPriority);
  const conceptFreshness = parseCsvFile(INPUTS.conceptFreshness);
  const needsRefresh = parseCsvFile(INPUTS.needsRefresh);
  const conceptOverexposure = parseCsvFile(INPUTS.conceptOverexposure);
  const questionDrafts = parseCsvFile(INPUTS.questionDrafts);
  const batch2Review = parseCsvFile(INPUTS.batch2Review);
  const safeEvergreen = parseCsvFile(INPUTS.safeEvergreen);
  const batch2Summary = parseJsonFile(INPUTS.batch2Summary, null);
  const analyticsPhase1 = parseJsonFile(INPUTS.analyticsPhase1Summary, null);

  const inputEntries = [
    ["concept_intake", INPUTS.conceptIntake, conceptIntake.rows.length],
    ["concept_decision_summary", INPUTS.conceptDecisionSummary, conceptDecisionSummary.rows.length],
    ["editorial_priority", INPUTS.editorialPriority, editorialPriority.rows.length],
    ["concept_freshness", INPUTS.conceptFreshness, conceptFreshness.rows.length],
    ["needs_refresh", INPUTS.needsRefresh, needsRefresh.rows.length],
    ["concept_overexposure", INPUTS.conceptOverexposure, conceptOverexposure.rows.length],
    ["question_drafts", INPUTS.questionDrafts, questionDrafts.rows.length],
    ["batch2_review", INPUTS.batch2Review, batch2Review.rows.length],
    ["batch2_summary_json", INPUTS.batch2Summary, batch2Summary ? 1 : 0],
    ["analytics_phase1_summary", INPUTS.analyticsPhase1Summary, analyticsPhase1 ? 1 : 0],
    ["safe_evergreen_optional", INPUTS.safeEvergreen, safeEvergreen.rows.length],
  ];

  for (const [key, path] of inputEntries) {
    if (!existsSync(path)) {
      warnings.push({
        code: "missing_input",
        key,
        path: path.replace(root + "\\", "").replaceAll("\\", "/"),
      });
    }
  }

  const decisionByTerm = new Map();
  for (const row of conceptDecisionSummary.rows) {
    const term = String(row.raw_term ?? "").trim().toLowerCase();
    if (!term) continue;
    decisionByTerm.set(term, {
      decision_status: String(row.decision_status ?? "").trim(),
      human_decision: String(row.human_decision ?? "").trim(),
      human_notes: String(row.human_notes ?? "").trim(),
    });
  }

  const conceptIntakeRows = conceptIntake.rows.map((row) => {
    const rawTerm = String(row.raw_term ?? "").trim();
    const decision = decisionByTerm.get(rawTerm.toLowerCase()) ?? null;
    return {
      raw_term: rawTerm,
      suggested_concept_key: String(row.suggested_concept_key ?? "").trim(),
      suggested_theme: String(row.suggested_theme ?? "").trim(),
      suggested_difficulty_band: String(row.suggested_difficulty_band ?? "").trim(),
      short_definition: String(row.short_definition ?? "").trim(),
      aliases: String(row.aliases ?? "").trim(),
      example_usage: String(row.example_usage ?? "").trim(),
      trend_freshness: String(row.trend_freshness ?? "").trim(),
      trend_durability: String(row.trend_durability ?? "").trim(),
      confidence: String(row.confidence ?? "").trim(),
      risk_flags: splitFlags(row.risk_flags),
      duplicate_check_exact_concept_key_match: String(
        row.duplicate_check_exact_concept_key_match ?? "",
      ).trim(),
      duplicate_check_near_existing_concept_key: String(
        row.duplicate_check_near_existing_concept_key ?? "",
      ).trim(),
      duplicate_check_possible_semantic_duplicate: String(
        row.duplicate_check_possible_semantic_duplicate ?? "",
      ).trim(),
      human_decision: String(row.human_decision ?? "").trim(),
      human_notes: String(row.human_notes ?? "").trim(),
      decision_status: decision?.decision_status ?? "",
    };
  });

  const questionDraftRows = questionDrafts.rows.map((row) => ({
    concept_key: String(row.concept_key ?? "").trim(),
    question_type: String(row.question_type ?? "").trim(),
    suggested_theme: String(row.suggested_theme ?? "").trim(),
    difficulty: String(row.difficulty ?? "").trim(),
    question: String(row.question ?? "").trim(),
    choice_1: String(row.choice_1 ?? "").trim(),
    choice_2: String(row.choice_2 ?? "").trim(),
    choice_3: String(row.choice_3 ?? "").trim(),
    choice_4: String(row.choice_4 ?? "").trim(),
    correct_index: toNumberMaybe(row.correct_index),
    explanation: String(row.explanation ?? "").trim(),
    tone_risk_notes: String(row.tone_risk_notes ?? "").trim(),
    duplicate_collision_notes: String(row.duplicate_collision_notes ?? "").trim(),
    human_decision: String(row.human_decision ?? "").trim(),
    human_notes: String(row.human_notes ?? "").trim(),
  }));

  const editorialPriorityRows = editorialPriority.rows.map((row) => ({
    raw_term: String(row.raw_term ?? "").trim(),
    suggested_concept_key: String(row.suggested_concept_key ?? "").trim(),
    suggested_theme: String(row.suggested_theme ?? "").trim(),
    confidence: String(row.confidence ?? "").trim(),
    trend_freshness: String(row.trend_freshness ?? "").trim(),
    trend_durability: String(row.trend_durability ?? "").trim(),
    risk_flags: splitFlags(row.risk_flags),
    human_decision: String(row.human_decision ?? "").trim(),
    unresolved_age_days_estimate: toNumberMaybe(row.unresolved_age_days_estimate),
    priority_bucket: String(row.priority_bucket ?? "").trim(),
    queue_reason: String(row.queue_reason ?? "").trim(),
  }));

  const conceptFreshnessRows = conceptFreshness.rows.map((row) => ({
    raw_term: String(row.raw_term ?? "").trim(),
    concept_key: String(row.concept_key ?? "").trim(),
    confidence: String(row.confidence ?? "").trim(),
    trend_freshness: String(row.trend_freshness ?? "").trim(),
    trend_durability: String(row.trend_durability ?? "").trim(),
    human_decision: String(row.human_decision ?? "").trim(),
    unresolved_age_days_estimate: toNumberMaybe(row.unresolved_age_days_estimate),
    risk_flags: splitFlags(row.risk_flags),
    freshness_score: toNumberMaybe(row.freshness_score),
    freshness_band: String(row.freshness_band ?? "").trim(),
    refresh_note: String(row.refresh_note ?? "").trim(),
  }));

  const needsRefreshRows = needsRefresh.rows.map((row) => ({
    raw_term: String(row.raw_term ?? "").trim(),
    concept_key: String(row.concept_key ?? "").trim(),
    human_decision: String(row.human_decision ?? "").trim(),
    trend_freshness: String(row.trend_freshness ?? "").trim(),
    trend_durability: String(row.trend_durability ?? "").trim(),
    unresolved_age_days_estimate: toNumberMaybe(row.unresolved_age_days_estimate),
    risk_flags: splitFlags(row.risk_flags),
    refresh_reason: String(row.refresh_reason ?? "").trim(),
    severity: String(row.severity ?? "").trim(),
    action_note: String(row.action_note ?? "").trim(),
  }));

  const conceptOverexposureRows = conceptOverexposure.rows.map((row) => ({
    concept_key: String(row.concept_key ?? "").trim(),
    draft_count: toNumberMaybe(row.draft_count),
    draft_definition_count: toNumberMaybe(row.draft_definition_count),
    draft_contextual_count: toNumberMaybe(row.draft_contextual_count),
    dormant_variant_group_count: toNumberMaybe(row.dormant_variant_group_count),
    dormant_variant_question_count: toNumberMaybe(row.dormant_variant_question_count),
    saturation_index: toNumberMaybe(row.saturation_index),
    saturation_risk_band: String(row.saturation_risk_band ?? "").trim(),
    review_note: String(row.review_note ?? "").trim(),
  }));

  const safeEvergreenRows = safeEvergreen.rows.map((row) => ({
    concept_key: String(row.concept_key ?? "").trim(),
  }));

  const batch2Rows = batch2Review.rows.map((row) => ({
    duplicate_group_id: String(row.duplicate_group_id ?? "").trim(),
    concept_key: String(row.concept_key ?? "").trim(),
    question_count: countSemicolonList(row.question_ids),
    current_status_is_active: String(row.current_status_is_active ?? "").trim(),
    difficulty_differences: String(row.difficulty_differences ?? "").trim(),
    choice_differences: String(row.choice_differences ?? "").trim(),
    explanation_differences: String(row.explanation_differences ?? "").trim(),
    category: String(row.category ?? "").trim(),
    recommended_action: String(row.recommended_action ?? "").trim(),
    reason: String(row.reason ?? "").trim(),
    risk_level: String(row.risk_level ?? "").trim(),
    archive_only_later: String(row.archive_only_later ?? "").trim(),
  }));

  const analyticsSummary = analyticsPhase1
    ? {
        generated_at: String(analyticsPhase1.generated_at ?? ""),
        phase0: analyticsPhase1.phase0 ?? {
          summary: {
            total_attempts: 0,
            distinct_users_with_attempts: 0,
            attempt_date_span_days: 0,
            global_accuracy_percent: 0,
          },
          mode_distribution: [],
          theme_popularity: [],
          accuracy_bands: [],
          returning_user_proxy: [],
          profiles_summary: [],
        },
        phase1: analyticsPhase1.phase1 ?? {
          analytics_events_available: false,
          analytics_event_count: 0,
          starts_vs_completions_by_mode: [],
          level_pass_fail_summary: [],
          marathon_end_distribution: [],
          cta_clickthrough_summary: [],
          event_volume_by_event_name_mode: [],
          data_quality_checks: [],
        },
        blind_spots: Array.isArray(analyticsPhase1.blind_spots) ? analyticsPhase1.blind_spots : [],
        safety: analyticsPhase1.safety ?? {},
      }
    : {
        generated_at: "",
        phase0: {
          summary: {
            total_attempts: 0,
            distinct_users_with_attempts: 0,
            attempt_date_span_days: 0,
            global_accuracy_percent: 0,
          },
          mode_distribution: [],
          theme_popularity: [],
          accuracy_bands: [],
          returning_user_proxy: [],
          profiles_summary: [],
        },
        phase1: {
          analytics_events_available: false,
          analytics_event_count: 0,
          starts_vs_completions_by_mode: [],
          level_pass_fail_summary: [],
          marathon_end_distribution: [],
          cta_clickthrough_summary: [],
          event_volume_by_event_name_mode: [],
          data_quality_checks: [],
        },
        blind_spots: ["analytics phase1 summary input missing"],
        safety: {},
      };

  const generatedAt = safeNowIso();
  const overview = buildOverview({
    conceptIntakeRows,
    questionDraftRows,
    editorialPriorityRows,
    conceptFreshnessRows,
    needsRefreshRows,
    batch2Rows,
    analyticsSummary,
    safeEvergreenRows,
  });

  const meta = {
    schema_version: "admin_cockpit_snapshot_v1",
    generated_at: generatedAt,
    generator: {
      script: "scripts/build-admin-cockpit-snapshot.mjs",
      npm_command: "npm run admin:cockpit:snapshot",
      mode: "read_only_artifact_projection",
    },
    safety: {
      no_db_writes: true,
      no_supabase_access: true,
      no_env_reads: true,
      no_raw_analytics_rows: true,
      no_user_level_identifiers: true,
      no_batch_question_ids: true,
    },
    sources: inputEntries.map(([key, path, count]) => sourceInfo(path, key, count)),
    warnings,
    redaction_notes: redactionNotes,
  };

  const conceptIntakePayload = {
    generated_at: generatedAt,
    rows: conceptIntakeRows,
    stats: {
      total_rows: conceptIntakeRows.length,
    },
  };

  const questionDraftsPayload = {
    generated_at: generatedAt,
    rows: questionDraftRows,
    stats: {
      total_rows: questionDraftRows.length,
      pending_review_rows: questionDraftRows.filter((r) => !r.human_decision).length,
    },
  };

  const editorialHealthPayload = {
    generated_at: generatedAt,
    priority_queue: {
      rows: editorialPriorityRows,
      total_rows: editorialPriorityRows.length,
    },
    freshness: {
      rows: conceptFreshnessRows,
      total_rows: conceptFreshnessRows.length,
    },
    needs_refresh: {
      rows: needsRefreshRows,
      total_rows: needsRefreshRows.length,
    },
    overexposure: {
      rows: conceptOverexposureRows,
      total_rows: conceptOverexposureRows.length,
    },
    safe_evergreen_counts_only: {
      total_rows: safeEvergreenRows.length,
    },
  };

  const batchReviewsPayload = {
    generated_at: generatedAt,
    rows: batch2Rows,
    summary: batch2Summary ?? {},
    stats: {
      total_rows: batch2Rows.length,
      redacted_question_ids: true,
    },
  };

  const overviewPayload = {
    generated_at: generatedAt,
    ...overview,
  };

  writeJson("meta.json", meta);
  writeJson("overview.json", overviewPayload);
  writeJson("concept_intake.json", conceptIntakePayload);
  writeJson("question_drafts.json", questionDraftsPayload);
  writeJson("editorial_health.json", editorialHealthPayload);
  writeJson("analytics_summary.json", analyticsSummary);
  writeJson("batch_reviews.json", batchReviewsPayload);

  const outputs = [
    "public/admin-cockpit/meta.json",
    "public/admin-cockpit/overview.json",
    "public/admin-cockpit/concept_intake.json",
    "public/admin-cockpit/question_drafts.json",
    "public/admin-cockpit/editorial_health.json",
    "public/admin-cockpit/analytics_summary.json",
    "public/admin-cockpit/batch_reviews.json",
  ];

  console.log(
    JSON.stringify(
      {
        ok: true,
        generated_at: generatedAt,
        warnings_count: warnings.length,
        outputs,
      },
      null,
      2,
    ),
  );
}

main();

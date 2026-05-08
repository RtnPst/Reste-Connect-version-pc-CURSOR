/**
 * Analytics Phase 1 report (read-only, aggregate-only).
 *
 * Keeps all Phase 0 reporting based on:
 * - public.quiz_attempts
 * - public.profiles
 *
 * Adds analytics_events summaries when available:
 * - starts vs completions by mode
 * - completion rate by mode
 * - level pass/fail summary
 * - marathon end distribution
 * - post-run CTA click-through summary
 * - event volume by event_name/mode
 * - lightweight data-quality checks
 *
 * Safety:
 * - SELECT only
 * - no writes/migrations/schema changes
 * - aggregate output only (no user ids / no raw event_props dump)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const outDir = resolve(root, "exports/analytics");

const EVENT_NAMES = new Set([
  "mode_started",
  "mode_completed",
  "level_result",
  "marathon_ended",
  "post_run_cta_clicked",
]);
const MODES = new Set(["theme", "daily", "level", "marathon"]);

function loadEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[k] = v;
  }
  return env;
}

function normalizeSupabaseUrl(raw) {
  const trimmed = String(raw ?? "").trim();
  const withoutQueryOrHash = trimmed.split(/[?#]/)[0]?.trim() ?? trimmed;
  const base = withoutQueryOrHash.replace(/\/+$/, "");
  if (!base) throw new Error("Invalid Supabase URL: empty after normalization.");
  return `${base}/`;
}

function toParisDateString(input) {
  const d = input instanceof Date ? input : new Date(input);
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
}

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function fetchAll(client, table, select, orderCol = null) {
  const rows = [];
  const pageSize = 1000;
  let offset = 0;
  for (;;) {
    let q = client.from(table).select(select).range(offset, offset + pageSize - 1);
    if (orderCol) q = q.order(orderCol, { ascending: true });
    const { data, error } = await q;
    if (error) throw new Error(`[${table}] ${error.message}`);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

async function fetchAnalyticsEventsSafe(client) {
  try {
    return await fetchAll(
      client,
      "analytics_events",
      "event_name, mode, occurred_at, event_props",
      "occurred_at",
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const knownMissing = message.toLowerCase().includes("analytics_events");
    console.warn(`[analytics:phase1] analytics_events unavailable (${knownMissing ? "expected-safe" : "error"}):`, message);
    return null;
  }
}

function numberOrNull(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function stringOrNull(v) {
  return typeof v === "string" ? v : null;
}

function makeSummaryRows(payload) {
  const rows = [];
  const push = (section, metric, dimension, value) => rows.push({ section, metric, dimension, value });

  push("phase0_global", "total_attempts", "all", payload.phase0.summary.total_attempts);
  push("phase0_global", "distinct_users_with_attempts", "all", payload.phase0.summary.distinct_users_with_attempts);
  push("phase0_global", "global_accuracy_percent", "all", payload.phase0.summary.global_accuracy_percent);

  for (const row of payload.phase0.mode_distribution) {
    push("phase0_mode_distribution", "attempt_count", row.mode, row.attempt_count);
  }

  if (!payload.phase1.analytics_events_available) {
    push("phase1_status", "analytics_events_available", "all", 0);
    return rows;
  }
  push("phase1_status", "analytics_events_available", "all", 1);

  for (const row of payload.phase1.starts_vs_completions_by_mode) {
    push("starts_vs_completions", "starts", row.mode, row.starts);
    push("starts_vs_completions", "completions", row.mode, row.completions);
    push("starts_vs_completions", "completion_rate_percent", row.mode, row.completion_rate_percent);
  }
  for (const row of payload.phase1.level_pass_fail_summary) {
    push("level_pass_fail", "attempts", `level_${row.level}`, row.attempts);
    push("level_pass_fail", "pass_rate_percent", `level_${row.level}`, row.pass_rate_percent);
  }
  for (const row of payload.phase1.marathon_end_distribution) {
    push("marathon_end_distribution", "ended_sessions", row.correct_band, row.ended_sessions);
  }
  for (const row of payload.phase1.cta_clickthrough_summary) {
    push("cta_clickthrough", "clicks", row.mode, row.clicks);
    push("cta_clickthrough", "completions", row.mode, row.completions);
    push("cta_clickthrough", "click_through_percent", row.mode, row.click_through_percent);
  }
  for (const row of payload.phase1.event_volume_by_event_name_mode) {
    push("event_volume", row.event_name, row.mode, row.count);
  }
  for (const row of payload.phase1.data_quality_checks) {
    push("data_quality", row.metric, "all", row.value);
  }
  return rows;
}

async function main() {
  const env = loadEnv(envPath);
  const url = normalizeSupabaseUrl(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "");
  const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const pubKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY ?? "").trim();
  const key = serviceKey || pubKey;

  if (!url || !key) {
    console.error("Missing env: VITE_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (recommended).");
    process.exit(1);
  }
  if (!serviceKey) {
    console.warn("[analytics:phase1] SUPABASE_SERVICE_ROLE_KEY missing; using publishable key (may be RLS-limited).");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log("[analytics:phase1] Fetching phase0 sources (read-only)...");
  const attempts = await fetchAll(
    supabase,
    "quiz_attempts",
    "user_id, mode, theme, score, total_questions, completed_at",
    "completed_at",
  );
  const profiles = await fetchAll(supabase, "profiles", "current_streak, longest_streak, total_xp", null);

  console.log("[analytics:phase1] Fetching analytics_events (safe optional)...");
  const analyticsEvents = await fetchAnalyticsEventsSafe(supabase);

  // ----- Phase 0 section (preserved) -----
  const totalAttempts = attempts.length;
  const users = new Set(attempts.map((a) => a.user_id).filter(Boolean));
  const distinctUsers = users.size;
  const totalCorrect = attempts.reduce((acc, a) => acc + Number(a.score ?? 0), 0);
  const totalQuestions = attempts.reduce((acc, a) => acc + Number(a.total_questions ?? 0), 0);
  const globalAccuracyPercent = totalQuestions > 0 ? Number(((100 * totalCorrect) / totalQuestions).toFixed(2)) : 0;

  let attemptDateSpanDays = 0;
  if (attempts.length >= 2) {
    const t0 = new Date(attempts[0].completed_at).getTime();
    const t1 = new Date(attempts[attempts.length - 1].completed_at).getTime();
    attemptDateSpanDays = Math.max(0, Math.round((t1 - t0) / (24 * 3600 * 1000)));
  }

  const modeCounts = new Map();
  const themeCounts = new Map();
  const attemptsByParisDay = new Map();
  const accuracyBands = { "0-39": 0, "40-59": 0, "60-79": 0, "80-100": 0 };
  const attemptsByUser = new Map();
  const activeDaysByUser = new Map();

  for (const a of attempts) {
    const mode = String(a.mode ?? "unknown");
    modeCounts.set(mode, (modeCounts.get(mode) ?? 0) + 1);
    const theme = a.theme ? String(a.theme) : "none";
    themeCounts.set(theme, (themeCounts.get(theme) ?? 0) + 1);
    const day = toParisDateString(a.completed_at);
    attemptsByParisDay.set(day, (attemptsByParisDay.get(day) ?? 0) + 1);
    const denom = Number(a.total_questions ?? 0);
    const numer = Number(a.score ?? 0);
    const pct = denom > 0 ? (100 * numer) / denom : 0;
    if (pct < 40) accuracyBands["0-39"] += 1;
    else if (pct < 60) accuracyBands["40-59"] += 1;
    else if (pct < 80) accuracyBands["60-79"] += 1;
    else accuracyBands["80-100"] += 1;

    const userId = a.user_id ? String(a.user_id) : null;
    if (userId) {
      attemptsByUser.set(userId, (attemptsByUser.get(userId) ?? 0) + 1);
      if (!activeDaysByUser.has(userId)) activeDaysByUser.set(userId, new Set());
      activeDaysByUser.get(userId).add(day);
    }
  }

  const usersWith2PlusAttempts = [...attemptsByUser.values()].filter((n) => n >= 2).length;
  const usersWith2PlusActiveDays = [...activeDaysByUser.values()].filter((s) => s.size >= 2).length;

  const phase0ModeDistribution = [...modeCounts.entries()]
    .map(([mode, count]) => ({
      mode,
      attempt_count: count,
      share_percent: totalAttempts > 0 ? Number(((100 * count) / totalAttempts).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.attempt_count - a.attempt_count);

  const phase0ThemePopularity = [...themeCounts.entries()]
    .map(([theme, count]) => ({
      theme,
      attempt_count: count,
      share_percent: totalAttempts > 0 ? Number(((100 * count) / totalAttempts).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.attempt_count - a.attempt_count);

  const phase0AttemptsOverTime = [...attemptsByParisDay.entries()]
    .map(([date, count]) => ({ date, attempt_count: count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const phase0AccuracyBands = Object.entries(accuracyBands).map(([band, count]) => ({
    band,
    attempt_count: count,
    share_percent: totalAttempts > 0 ? Number(((100 * count) / totalAttempts).toFixed(2)) : 0,
  }));

  const streaksCurrent = profiles.map((p) => Number(p.current_streak ?? 0)).sort((a, b) => a - b);
  const streaksLongest = profiles.map((p) => Number(p.longest_streak ?? 0)).sort((a, b) => a - b);
  const totalXp = profiles.map((p) => Number(p.total_xp ?? 0)).sort((a, b) => a - b);
  const phase0ProfilesSummary = [
    { metric: "profile_count", value: profiles.length, dimension: "all" },
    { metric: "current_streak_p50", value: percentile(streaksCurrent, 50), dimension: "all" },
    { metric: "current_streak_p90", value: percentile(streaksCurrent, 90), dimension: "all" },
    { metric: "longest_streak_p50", value: percentile(streaksLongest, 50), dimension: "all" },
    { metric: "longest_streak_p90", value: percentile(streaksLongest, 90), dimension: "all" },
    { metric: "total_xp_p50", value: percentile(totalXp, 50), dimension: "all" },
    { metric: "total_xp_p90", value: percentile(totalXp, 90), dimension: "all" },
  ];

  // ----- Phase 1 section (optional) -----
  let phase1 = {
    analytics_events_available: false,
    analytics_event_count: 0,
    starts_vs_completions_by_mode: [],
    level_pass_fail_summary: [],
    marathon_end_distribution: [],
    cta_clickthrough_summary: [],
    event_volume_by_event_name_mode: [],
    data_quality_checks: [],
  };

  if (analyticsEvents) {
    const startsByMode = new Map();
    const completionsByMode = new Map();
    const ctaByMode = new Map();
    const levelByLevel = new Map();
    const marathonBands = new Map();
    const eventVolume = new Map();

    let invalidEventNameCount = 0;
    let invalidModeCount = 0;
    let missingPropsObjectCount = 0;
    let levelResultMissingRequiredCount = 0;
    let marathonEndedMissingRequiredCount = 0;
    let modeCompletedMissingRequiredCount = 0;
    let ctaMissingRequiredCount = 0;

    for (const e of analyticsEvents) {
      const eventName = String(e.event_name ?? "");
      const mode = String(e.mode ?? "");
      const props = e.event_props;
      const isObj = !!props && typeof props === "object" && !Array.isArray(props);
      if (!EVENT_NAMES.has(eventName)) invalidEventNameCount += 1;
      if (!MODES.has(mode)) invalidModeCount += 1;
      if (!isObj) missingPropsObjectCount += 1;

      const volumeKey = `${eventName}|${mode || "unknown"}`;
      eventVolume.set(volumeKey, (eventVolume.get(volumeKey) ?? 0) + 1);

      if (eventName === "mode_started") {
        startsByMode.set(mode, (startsByMode.get(mode) ?? 0) + 1);
      }
      if (eventName === "mode_completed") {
        completionsByMode.set(mode, (completionsByMode.get(mode) ?? 0) + 1);
        if (!isObj || numberOrNull(props.score) == null || numberOrNull(props.total_questions) == null) {
          modeCompletedMissingRequiredCount += 1;
        }
      }
      if (eventName === "post_run_cta_clicked") {
        ctaByMode.set(mode, (ctaByMode.get(mode) ?? 0) + 1);
        if (!isObj || stringOrNull(props.cta_id) == null || stringOrNull(props.destination) == null) {
          ctaMissingRequiredCount += 1;
        }
      }
      if (eventName === "level_result") {
        const level = isObj ? numberOrNull(props.level) : null;
        const passed = isObj ? props.passed : null;
        if (level == null || typeof passed !== "boolean") {
          levelResultMissingRequiredCount += 1;
        } else {
          const key = String(level);
          if (!levelByLevel.has(key)) levelByLevel.set(key, { attempts: 0, passed: 0 });
          const slot = levelByLevel.get(key);
          slot.attempts += 1;
          if (passed) slot.passed += 1;
        }
      }
      if (eventName === "marathon_ended") {
        const correct = isObj ? numberOrNull(props.correct_count) : null;
        if (correct == null) {
          marathonEndedMissingRequiredCount += 1;
        } else {
          const band = correct < 5 ? "0-4" : correct < 10 ? "5-9" : correct < 20 ? "10-19" : "20+";
          marathonBands.set(band, (marathonBands.get(band) ?? 0) + 1);
        }
      }
    }

    const modeList = ["theme", "daily", "level", "marathon"];
    const startsVsCompletions = modeList.map((mode) => {
      const starts = startsByMode.get(mode) ?? 0;
      const completions = completionsByMode.get(mode) ?? 0;
      return {
        mode,
        starts,
        completions,
        completion_rate_percent: starts > 0 ? Number(((100 * completions) / starts).toFixed(2)) : 0,
      };
    });

    const levelPassFail = [...levelByLevel.entries()]
      .map(([level, row]) => ({
        level: Number(level),
        attempts: row.attempts,
        passed: row.passed,
        failed: Math.max(0, row.attempts - row.passed),
        pass_rate_percent: row.attempts > 0 ? Number(((100 * row.passed) / row.attempts).toFixed(2)) : 0,
      }))
      .sort((a, b) => a.level - b.level);

    const marathonDistribution = ["0-4", "5-9", "10-19", "20+"].map((band) => ({
      correct_band: band,
      ended_sessions: marathonBands.get(band) ?? 0,
    }));

    const ctaSummary = modeList.map((mode) => {
      const clicks = ctaByMode.get(mode) ?? 0;
      const completions = completionsByMode.get(mode) ?? 0;
      return {
        mode,
        clicks,
        completions,
        click_through_percent: completions > 0 ? Number(((100 * clicks) / completions).toFixed(2)) : 0,
      };
    });

    const eventVolumeRows = [...eventVolume.entries()]
      .map(([k, count]) => {
        const [event_name, mode] = k.split("|");
        return { event_name, mode, count };
      })
      .sort((a, b) => b.count - a.count || a.event_name.localeCompare(b.event_name));

    phase1 = {
      analytics_events_available: true,
      analytics_event_count: analyticsEvents.length,
      starts_vs_completions_by_mode: startsVsCompletions,
      level_pass_fail_summary: levelPassFail,
      marathon_end_distribution: marathonDistribution,
      cta_clickthrough_summary: ctaSummary,
      event_volume_by_event_name_mode: eventVolumeRows,
      data_quality_checks: [
        { metric: "invalid_event_name_rows", value: invalidEventNameCount },
        { metric: "invalid_mode_rows", value: invalidModeCount },
        { metric: "event_props_not_object_rows", value: missingPropsObjectCount },
        { metric: "level_result_missing_required_props_rows", value: levelResultMissingRequiredCount },
        { metric: "marathon_ended_missing_required_props_rows", value: marathonEndedMissingRequiredCount },
        { metric: "mode_completed_missing_required_props_rows", value: modeCompletedMissingRequiredCount },
        { metric: "post_run_cta_clicked_missing_required_props_rows", value: ctaMissingRequiredCount },
      ],
    };
  }

  const payload = {
    generated_at: new Date().toISOString(),
    policy: "analytics_phase1_read_only_aggregate_only",
    inputs: ["public.quiz_attempts", "public.profiles", "public.analytics_events(optional)"],
    safety: {
      no_db_writes: true,
      no_schema_changes: true,
      no_migrations: true,
      no_pii_in_outputs: true,
      no_user_level_identifiers: true,
      no_raw_event_props_dump: true,
      external_analytics_used: false,
    },
    phase0: {
      summary: {
        total_attempts: totalAttempts,
        distinct_users_with_attempts: distinctUsers,
        attempt_date_span_days: attemptDateSpanDays,
        global_accuracy_percent: globalAccuracyPercent,
      },
      attempts_over_time: phase0AttemptsOverTime,
      mode_distribution: phase0ModeDistribution,
      theme_popularity: phase0ThemePopularity,
      accuracy_bands: phase0AccuracyBands,
      returning_user_proxy: [
        { metric: "users_with_2plus_attempts", value: usersWith2PlusAttempts },
        { metric: "users_with_2plus_active_days", value: usersWith2PlusActiveDays },
        {
          metric: "returning_rate_by_active_days_percent",
          value: distinctUsers > 0 ? Number(((100 * usersWith2PlusActiveDays) / distinctUsers).toFixed(2)) : 0,
        },
      ],
      profiles_summary: phase0ProfilesSummary,
    },
    phase1,
    blind_spots: phase1.analytics_events_available
      ? []
      : [
          "analytics_events table unavailable or unreadable; phase1 metrics are skipped.",
          "starts/completions, level pass/fail, marathon end distribution, and CTA click-through require analytics_events data.",
        ],
  };

  const csvRows = makeSummaryRows(payload);
  const csvHeaders = ["section", "metric", "dimension", "value"];
  const csvText = [
    csvHeaders.join(","),
    ...csvRows.map((r) => csvHeaders.map((h) => csvEscape(r[h])).join(",")),
  ].join("\n");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync(outDir, { recursive: true });
  const stampedJson = join(outDir, `phase1-summary-${stamp}.json`);
  const stampedCsv = join(outDir, `phase1-summary-${stamp}.csv`);
  const latestJson = join(outDir, "phase1-summary-latest.json");
  const latestCsv = join(outDir, "phase1-summary-latest.csv");

  writeFileSync(stampedJson, JSON.stringify(payload, null, 2), "utf8");
  writeFileSync(stampedCsv, csvText, "utf8");
  writeFileSync(latestJson, JSON.stringify(payload, null, 2), "utf8");
  writeFileSync(latestCsv, csvText, "utf8");

  console.log(
    JSON.stringify(
      {
        phase0_total_attempts: payload.phase0.summary.total_attempts,
        analytics_events_available: phase1.analytics_events_available,
        analytics_event_count: phase1.analytics_event_count,
        outputs: { json_latest: latestJson, csv_latest: latestCsv },
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


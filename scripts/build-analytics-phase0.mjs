/**
 * Analytics Phase 0 (read-only, aggregate-only).
 *
 * Sources:
 * - public.quiz_attempts
 * - public.profiles
 *
 * Safety:
 * - SELECT queries only
 * - no writes, no schema changes
 * - no PII output (no emails, no display names, no raw user ids)
 *
 * Outputs:
 * - exports/analytics/phase0-summary-latest.json
 * - exports/analytics/phase0-summary-latest.csv
 * - timestamped JSON/CSV variants
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const outDir = resolve(root, "exports/analytics");

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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
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

function makeSummaryRows(payload) {
  const rows = [];
  rows.push({
    section: "global",
    metric: "total_attempts",
    dimension: "all",
    value: payload.summary.total_attempts,
  });
  rows.push({
    section: "global",
    metric: "distinct_users_with_attempts",
    dimension: "all",
    value: payload.summary.distinct_users_with_attempts,
  });
  rows.push({
    section: "global",
    metric: "attempt_date_span_days",
    dimension: "all",
    value: payload.summary.attempt_date_span_days,
  });
  rows.push({
    section: "accuracy",
    metric: "global_accuracy_percent",
    dimension: "all",
    value: payload.summary.global_accuracy_percent,
  });

  for (const row of payload.mode_distribution) {
    rows.push({
      section: "mode_distribution",
      metric: "attempt_count",
      dimension: row.mode,
      value: row.attempt_count,
    });
  }
  for (const row of payload.theme_popularity) {
    rows.push({
      section: "theme_popularity",
      metric: "attempt_count",
      dimension: row.theme,
      value: row.attempt_count,
    });
  }
  for (const row of payload.accuracy_bands) {
    rows.push({
      section: "accuracy_bands",
      metric: "attempt_count",
      dimension: row.band,
      value: row.attempt_count,
    });
  }
  for (const row of payload.returning_user_proxy) {
    rows.push({
      section: "returning_user_proxy",
      metric: row.metric,
      dimension: "all",
      value: row.value,
    });
  }
  for (const row of payload.profiles_summary) {
    rows.push({
      section: "profiles_summary",
      metric: row.metric,
      dimension: row.dimension ?? "all",
      value: row.value,
    });
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
    console.warn("[analytics:phase0] SUPABASE_SERVICE_ROLE_KEY missing; using publishable key (may be RLS-limited).");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log("[analytics:phase0] Fetching quiz_attempts (read-only)...");
  const attempts = await fetchAll(
    supabase,
    "quiz_attempts",
    "user_id, mode, theme, score, total_questions, completed_at",
    "completed_at",
  );

  console.log("[analytics:phase0] Fetching profiles (read-only)...");
  const profiles = await fetchAll(
    supabase,
    "profiles",
    "current_streak, longest_streak, total_xp",
    null,
  );

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
  const accuracyBands = {
    "0-39": 0,
    "40-59": 0,
    "60-79": 0,
    "80-100": 0,
  };

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

  const modeDistribution = [...modeCounts.entries()]
    .map(([mode, count]) => ({
      mode,
      attempt_count: count,
      share_percent: totalAttempts > 0 ? Number(((100 * count) / totalAttempts).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.attempt_count - a.attempt_count);

  const themePopularity = [...themeCounts.entries()]
    .map(([theme, count]) => ({
      theme,
      attempt_count: count,
      share_percent: totalAttempts > 0 ? Number(((100 * count) / totalAttempts).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.attempt_count - a.attempt_count);

  const attemptsOverTime = [...attemptsByParisDay.entries()]
    .map(([date, count]) => ({ date, attempt_count: count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const accuracyBandRows = Object.entries(accuracyBands).map(([band, count]) => ({
    band,
    attempt_count: count,
    share_percent: totalAttempts > 0 ? Number(((100 * count) / totalAttempts).toFixed(2)) : 0,
  }));

  const streaksCurrent = profiles.map((p) => Number(p.current_streak ?? 0)).sort((a, b) => a - b);
  const streaksLongest = profiles.map((p) => Number(p.longest_streak ?? 0)).sort((a, b) => a - b);
  const totalXp = profiles.map((p) => Number(p.total_xp ?? 0)).sort((a, b) => a - b);

  const profileSummaryRows = [
    { metric: "profile_count", value: profiles.length },
    { metric: "current_streak_p50", value: percentile(streaksCurrent, 50) },
    { metric: "current_streak_p90", value: percentile(streaksCurrent, 90) },
    { metric: "longest_streak_p50", value: percentile(streaksLongest, 50) },
    { metric: "longest_streak_p90", value: percentile(streaksLongest, 90) },
    { metric: "total_xp_p50", value: percentile(totalXp, 50) },
    { metric: "total_xp_p90", value: percentile(totalXp, 90) },
  ].map((r) => ({ ...r, dimension: "all" }));

  const payload = {
    generated_at: new Date().toISOString(),
    policy: "analytics_phase0_read_only_aggregate_only",
    inputs: ["public.quiz_attempts", "public.profiles"],
    safety: {
      no_db_writes: true,
      no_schema_changes: true,
      no_migrations: true,
      no_pii_in_outputs: true,
      external_analytics_used: false,
    },
    summary: {
      total_attempts: totalAttempts,
      distinct_users_with_attempts: distinctUsers,
      attempt_date_span_days: attemptDateSpanDays,
      global_accuracy_percent: globalAccuracyPercent,
    },
    attempts_over_time: attemptsOverTime,
    mode_distribution: modeDistribution,
    theme_popularity: themePopularity,
    accuracy_bands: accuracyBandRows,
    returning_user_proxy: [
      { metric: "users_with_2plus_attempts", value: usersWith2PlusAttempts },
      { metric: "users_with_2plus_active_days", value: usersWith2PlusActiveDays },
      {
        metric: "returning_rate_by_active_days_percent",
        value:
          distinctUsers > 0 ? Number(((100 * usersWith2PlusActiveDays) / distinctUsers).toFixed(2)) : 0,
      },
    ],
    profiles_summary: profileSummaryRows,
    blind_spots: [
      "No explicit mode_started event in current model.",
      "No CTA click events in current model.",
      "No direct start-to-completion funnel.",
      "No pre-completion drop-off visibility.",
      "Mode coverage depends on what is persisted into quiz_attempts.",
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

  const stampedJson = join(outDir, `phase0-summary-${stamp}.json`);
  const stampedCsv = join(outDir, `phase0-summary-${stamp}.csv`);
  const latestJson = join(outDir, "phase0-summary-latest.json");
  const latestCsv = join(outDir, "phase0-summary-latest.csv");

  writeFileSync(stampedJson, JSON.stringify(payload, null, 2), "utf8");
  writeFileSync(stampedCsv, csvText, "utf8");
  writeFileSync(latestJson, JSON.stringify(payload, null, 2), "utf8");
  writeFileSync(latestCsv, csvText, "utf8");

  console.log(
    JSON.stringify(
      {
        total_attempts: totalAttempts,
        distinct_users_with_attempts: distinctUsers,
        global_accuracy_percent: globalAccuracyPercent,
        outputs: {
          json_latest: latestJson,
          csv_latest: latestCsv,
        },
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


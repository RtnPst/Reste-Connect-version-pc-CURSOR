/**
 * Check daily_questions coverage for gaps (Paris calendar ops).
 * Usage: node --env-file=.env scripts/check-daily-calendar.mjs [daysAhead=45]
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing Supabase URL or key");
  process.exit(1);
}

const daysAhead = Math.max(7, Number(process.argv[2] || 45) || 45);
const sb = createClient(url, key);

function parisYmd(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDaysParis(ymd, n) {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + n);
  return utc.toISOString().slice(0, 10);
}

const today = parisYmd();
const end = addDaysParis(today, daysAhead);

const { data, error } = await sb
  .from("daily_questions")
  .select("active_date")
  .gte("active_date", today)
  .lte("active_date", end)
  .order("active_date", { ascending: true });

if (error) {
  console.error(error.message);
  process.exit(1);
}

const have = new Set((data ?? []).map((r) => String(r.active_date).slice(0, 10)));
const gaps = [];
for (let i = 0; i <= daysAhead; i += 1) {
  const day = addDaysParis(today, i);
  if (!have.has(day)) gaps.push(day);
}

const last = [...have].sort().at(-1) ?? null;
console.log(
  JSON.stringify(
    {
      today,
      horizonDays: daysAhead,
      scheduledInWindow: have.size,
      lastScheduled: last,
      gapsCount: gaps.length,
      gapsPreview: gaps.slice(0, 20),
      ok: gaps.length === 0,
    },
    null,
    2,
  ),
);
process.exit(gaps.length === 0 ? 0 : 2);

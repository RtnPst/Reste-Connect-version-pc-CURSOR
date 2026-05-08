/**
 * Debug daily question pipeline (read-only).
 * Requires .env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or anon key).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { loadEnv, normalizeSupabaseUrl } from "./lib/exact-dup-critical-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function todayParis() {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .slice(0, 10);
}

async function main() {
  const env = loadEnv(envPath);
  const url = normalizeSupabaseUrl(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "");
  const service = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const anon = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY ?? "").trim();
  const key = service || anon;
  if (!url || !key) {
    console.error("Missing VITE_SUPABASE_URL and a key in .env");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const utc = todayUtc();
  const paris = todayParis();

  console.log("=== Date keys ===");
  console.log("today (UTC ISO slice):", utc);
  console.log("today (Europe/Paris): ", paris);

  const { data: dailyUtc, error: e1 } = await supabase
    .from("daily_questions")
    .select("id, active_date, question_id, created_at")
    .eq("active_date", utc)
    .maybeSingle();

  const { data: dailyParis, error: e2 } = await supabase
    .from("daily_questions")
    .select("id, active_date, question_id, created_at")
    .eq("active_date", paris)
    .maybeSingle();

  console.log("\n=== daily_questions row ===");
  if (e1) console.error("query utc error:", e1.message);
  if (e2) console.error("query paris error:", e2.message);
  console.log("match active_date = UTC date:   ", dailyUtc ?? "(none)");
  console.log("match active_date = Paris date:", dailyParis ?? "(none)");

  const daily = dailyUtc ?? dailyParis;
  const qid = daily?.question_id ?? null;

  if (qid) {
    const { data: qrow } = await supabase
      .from("questions")
      .select("id, theme, status, is_active, question")
      .eq("id", qid)
      .maybeSingle();
    console.log("\n=== Scheduled question row ===");
    console.log(qrow ?? "(not found)");
    const { data: playableScheduled, error: pe } = await supabase.rpc("get_playable_questions", {
      _theme: null,
      _ids: [qid],
      _limit: 1,
    });
    if (pe) console.error("get_playable_questions(ids):", pe.message);
    console.log("RPC get_playable_questions with scheduled id — rows:", playableScheduled?.length ?? 0);
  } else {
    console.log("\n(No daily_questions row for UTC or Paris date — client uses UTC in question-du-jour.tsx)");
  }

  const { count: liveTotal } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("status", "live");

  console.log("\n=== Pool ===");
  console.log("Total questions with status=live:", liveTotal ?? "?");

  const { data: fallback, error: fe } = await supabase.rpc("get_playable_questions", {
    _theme: null,
    _ids: null,
    _limit: 1,
  });
  if (fe) console.error("get_playable_questions fallback error:", fe.message);
  console.log("RPC get_playable_questions(no theme, no ids, limit 1) — rows:", fallback?.length ?? 0);
  if (fallback?.[0]) {
    console.log("  sample id:", fallback[0].id, "theme:", fallback[0].theme);
  }

  console.log("\n=== Interpretation ===");
  if ((liveTotal ?? 0) === 0) {
    console.log("- CRITICAL: No live questions at all → fallback RPC returns empty → blank UI.");
  } else if (!fallback?.length) {
    console.log("- CRITICAL: Live rows exist but RPC returned 0 — check function definition / RLS / filters.");
  } else if (qid) {
    const { data: ps } = await supabase.rpc("get_playable_questions", {
      _theme: null,
      _ids: [qid],
      _limit: 1,
    });
    if (!(ps?.length ?? 0)) {
      console.log("- Scheduled question_id is NOT playable (archived etc.); client uses fallback — OK if fallback returned rows.");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

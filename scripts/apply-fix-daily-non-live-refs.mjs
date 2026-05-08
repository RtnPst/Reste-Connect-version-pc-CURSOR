/**
 * Repoint daily_questions rows whose question_id does not reference status=live.
 * Matches supabase/migrations/20260508234000_fix_daily_questions_non_live_refs.sql
 *
 *   node scripts/apply-fix-daily-non-live-refs.mjs
 */
import { loadEnv, normalizeSupabaseUrl } from "./lib/exact-dup-critical-core.mjs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

function parisTodayStr() {
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
  if (!url || !service) {
    console.error("Need SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const supabase = createClient(url, service, { auth: { persistSession: false } });

  const { data: dqs } = await supabase.from("daily_questions").select("id, active_date, question_id");
  const qids = [...new Set((dqs ?? []).map((r) => r.question_id))];
  const { data: qs } = await supabase.from("questions").select("id, status").in("id", qids);

  const statusById = new Map((qs ?? []).map((q) => [q.id, q.status]));

  const todayParis = parisTodayStr();
  const brokenRows = (dqs ?? []).filter((r) => {
    if (statusById.get(r.question_id) === "live") return false;
    return r.active_date >= todayParis;
  });

  console.log("daily_questions rows pointing to non-live:", brokenRows.length);

  const { data: pickRow } = await supabase
    .from("questions")
    .select("id")
    .eq("status", "live")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!pickRow?.id) {
    console.error("No live question found — abort.");
    process.exit(1);
  }

  for (const dq of brokenRows) {
    const { error } = await supabase.from("daily_questions").update({ question_id: pickRow.id }).eq("id", dq.id);
    if (error) {
      console.error("Failed row", dq.id, error.message);
      process.exit(1);
    }
    console.log("Updated active_date", dq.active_date, "→", pickRow.id);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

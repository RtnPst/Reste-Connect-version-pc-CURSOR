/**
 * Apply Tech pilot v1 activation: status=live, is_active=true for exactly 15 UUIDs (theme=tech).
 * Uses SUPABASE_SERVICE_ROLE_KEY from .env — same pattern as other import/export scripts.
 *
 * Does NOT touch daily_questions, quiz_attempts, or non-listed rows.
 *
 * Usage:
 *   node scripts/apply-tech-pilot-v1-activation.mjs
 *
 * Idempotent: re-running when rows are already live updates 15 rows again (no-op content-wise).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { loadEnv, normalizeSupabaseUrl } from "./lib/exact-dup-critical-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const pilotPath = resolve(root, "exports/tech-theme-audit/tech-pilot-batch-v1.json");

function pilotIds() {
  if (!existsSync(pilotPath)) {
    throw new Error(`Missing ${pilotPath} — run: npm run build:tech-pilot-v1`);
  }
  const j = JSON.parse(readFileSync(pilotPath, "utf8"));
  const rows = j.rows ?? [];
  return rows.map((r) => r.id);
}

async function main() {
  const env = loadEnv(envPath);
  const url = normalizeSupabaseUrl(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "");
  const service = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !service) {
    console.error("Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const ids = pilotIds();
  if (ids.length !== 15) {
    console.error("Expected 15 pilot IDs, got", ids.length);
    process.exit(1);
  }

  const supabase = createClient(url, service, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("questions")
    .update({
      status: "live",
      is_active: true,
    })
    .eq("theme", "tech")
    .in("id", ids)
    .select("id");

  if (error) {
    console.error("Update failed:", error.message);
    process.exit(1);
  }

  const n = data?.length ?? 0;
  if (n !== 15) {
    console.error(`Expected 15 rows updated, got ${n}. Abort verification — check theme/id mismatch.`);
    process.exit(1);
  }

  const { data: counts, error: cErr } = await supabase.rpc("get_active_question_counts");
  if (cErr) {
    console.warn("get_active_question_counts:", cErr.message);
  } else {
    const tech = (counts ?? []).find((r) => r.theme === "tech");
    console.log("get_active_question_counts tech:", tech ?? "(no row)");
  }

  const { data: playable, error: pErr } = await supabase.rpc("get_playable_questions", {
    _theme: "tech",
    _ids: null,
    _limit: 20,
  });
  if (pErr) {
    console.warn("get_playable_questions:", pErr.message);
  } else {
    console.log("get_playable_questions sample count:", playable?.length ?? 0);
  }

  console.log("OK — updated 15 tech pilot rows.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

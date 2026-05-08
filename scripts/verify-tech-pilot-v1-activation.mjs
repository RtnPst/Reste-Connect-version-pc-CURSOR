/**
 * Read-only verification after Tech pilot v1 activation (or dry-run current DB state).
 *
 *   node scripts/verify-tech-pilot-v1-activation.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { loadEnv, normalizeSupabaseUrl } from "./lib/exact-dup-critical-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const pilotPath = resolve(root, "exports/tech-theme-audit/tech-pilot-batch-v1.json");

async function main() {
  const env = loadEnv(envPath);
  const url = normalizeSupabaseUrl(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "");
  const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
  if (!url || !key) {
    console.error("Missing Supabase URL/key in .env");
    process.exit(1);
  }

  const pilot = JSON.parse(readFileSync(pilotPath, "utf8"));
  const ids = new Set((pilot.rows ?? []).map((r) => r.id));

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: counts, error: cErr } = await supabase.rpc("get_active_question_counts");
  if (cErr) throw new Error(cErr.message);
  const techRow = (counts ?? []).find((r) => r.theme === "tech");
  console.log("get_active_question_counts tech total:", techRow?.total ?? 0);

  const { data: playable, error: pErr } = await supabase.rpc("get_playable_questions", {
    _theme: "tech",
    _ids: null,
    _limit: 50,
  });
  if (pErr) throw new Error(pErr.message);
  const list = playable ?? [];
  console.log("get_playable_questions (tech, limit 50) row count:", list.length);

  const pilotPlayable = list.filter((q) => ids.has(q.id));
  console.log("Of those, pilot UUIDs present:", pilotPlayable.length, "/ 15");

  const keys = new Map();
  for (const q of list) {
    const k = String(q.question ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    keys.set(k, (keys.get(k) ?? 0) + 1);
  }
  const dups = [...keys.entries()].filter(([, v]) => v > 1);
  console.log(
    "Duplicate normalized question text in this playable sample:",
    dups.length === 0 ? "none" : dups,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

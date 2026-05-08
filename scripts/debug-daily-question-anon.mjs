/**
 * get_playable_questions with anon key only (browser-like).
 */
import { loadEnv, normalizeSupabaseUrl } from "./lib/exact-dup-critical-core.mjs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = loadEnv(resolve(root, ".env"));
const url = normalizeSupabaseUrl(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "");
const anon = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY ?? "").trim();

const supabase = createClient(url, anon, { auth: { persistSession: false } });

const { data, error } = await supabase.rpc("get_playable_questions", {
  _theme: null,
  _ids: null,
  _limit: 1,
});
console.log("anon key — RPC error:", error?.message ?? null);
console.log("anon key — rows:", data?.length ?? 0);

const qid = "5c63b64c-bd79-49c3-bbd6-cc1e99d75cca";
const { data: scheduled } = await supabase.rpc("get_playable_questions", {
  _theme: null,
  _ids: [qid],
  _limit: 1,
});
console.log("anon key — scheduled id playable rows:", scheduled?.length ?? 0);

/**
 * After `vite build`, patch `dist/client/wrangler.json`:
 * - Copy Supabase URL/keys from `.env` into `vars` (normalized URL, trailing slash)
 * - `compatibility_flags`: ["nodejs_compat"]
 * - `compatibility_date`: keep if >= 2024-11-01, else set fallback
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wranglerPath = resolve(root, "dist/client/wrangler.json");
const envPath = resolve(root, ".env");

const MIN_COMPAT_DATE = "2024-11-01";

function parseEnv(text) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function normalizeSupabaseUrl(raw) {
  const trimmed = String(raw ?? "").trim();
  const noQh = trimmed.split(/[?#]/)[0]?.trim() ?? trimmed;
  const base = noQh.replace(/\/+$/, "");
  return base ? `${base}/` : "";
}

function isCompatDateOk(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return false;
  const d = new Date(`${dateStr.trim()}T00:00:00.000Z`);
  const min = new Date(`${MIN_COMPAT_DATE}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d >= min;
}

if (!existsSync(wranglerPath)) {
  console.warn("patch-wrangler-supabase-vars: skip (no dist/client/wrangler.json yet)");
  process.exit(0);
}

if (!existsSync(envPath)) {
  console.warn("patch-wrangler-supabase-vars: skip (no .env)");
  process.exit(0);
}

const env = parseEnv(readFileSync(envPath, "utf8"));
const w = JSON.parse(readFileSync(wranglerPath, "utf8"));

w.compatibility_flags = ["nodejs_compat"];
if (!isCompatDateOk(w.compatibility_date)) {
  w.compatibility_date = "2025-04-01";
}

const viteUrl = normalizeSupabaseUrl(env.VITE_SUPABASE_URL ?? "");
const viteKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
const supUrl = normalizeSupabaseUrl(env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? "");
const supKey = (env.SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();

if (!viteUrl || !viteKey) {
  console.warn("patch-wrangler-supabase-vars: skip (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing in .env)");
  process.exit(0);
}

w.vars = {
  ...(typeof w.vars === "object" && w.vars !== null ? w.vars : {}),
  VITE_SUPABASE_URL: viteUrl,
  VITE_SUPABASE_PUBLISHABLE_KEY: viteKey,
  SUPABASE_URL: supUrl || viteUrl,
  SUPABASE_PUBLISHABLE_KEY: supKey || viteKey,
};

writeFileSync(wranglerPath, `${JSON.stringify(w, null, 2)}\n`, "utf8");
console.log("patch-wrangler-supabase-vars: wrangler.json patched from .env");

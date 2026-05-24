/**
 * Read-only audit: live question concept_key coverage (prod/staging via .env).
 * Usage: npm run audit:concept-key-coverage
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

function loadEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, i).trim()] = v;
  }
  return env;
}

const env = loadEnv(envPath);
const url = String(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");
const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or key in .env");
  process.exit(1);
}

const supabase = createClient(`${url}/`, key, { auth: { persistSession: false } });

const { count: liveTotal, error: liveErr } = await supabase
  .from("questions")
  .select("*", { count: "exact", head: true })
  .eq("status", "live");

if (liveErr) {
  console.error(liveErr.message);
  process.exit(1);
}

const { count: withKey, error: keyErr } = await supabase
  .from("questions")
  .select("*", { count: "exact", head: true })
  .eq("status", "live")
  .not("concept_key", "is", null);

if (keyErr) {
  console.error(keyErr.message);
  process.exit(1);
}

const { data: byTheme, error: themeErr } = await supabase
  .from("questions")
  .select("theme, concept_key")
  .eq("status", "live");

if (themeErr) {
  console.error(themeErr.message);
  process.exit(1);
}

const themeStats = {};
for (const row of byTheme ?? []) {
  const t = row.theme ?? "unknown";
  if (!themeStats[t]) themeStats[t] = { live: 0, with_concept_key: 0 };
  themeStats[t].live += 1;
  if (row.concept_key) themeStats[t].with_concept_key += 1;
}

const total = liveTotal ?? 0;
const tagged = withKey ?? 0;
const report = {
  audited_at: new Date().toISOString(),
  live_total: total,
  live_with_concept_key: tagged,
  coverage_percent: total ? Math.round((tagged / total) * 1000) / 10 : 0,
  by_theme: themeStats,
};

const outDir = resolve(root, "exports/foundation");
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, "concept-key-coverage-latest.json");
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(JSON.stringify(report, null, 2));
console.log(`\nSaved: ${outPath}`);

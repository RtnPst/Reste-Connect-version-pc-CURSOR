/**
 * Read-only preview + optional snapshot export before repointing daily_questions.
 *
 * Loads mappings from scripts/data/daily-questions-repoint-map.json
 * Compares with live daily_questions (requires .env + SUPABASE_SERVICE_ROLE_KEY).
 *
 * Does NOT modify the database.
 *
 * Usage:
 *   node scripts/preview-daily-questions-repoint.mjs
 *   node scripts/preview-daily-questions-repoint.mjs --write-snapshot
 *
 * Writes snapshot to exports/dedup-audit/daily-repoint-preview-<stamp>.json when --write-snapshot
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const mapPath = resolve(root, "scripts/data/daily-questions-repoint-map.json");
const outDir = resolve(root, "exports/dedup-audit");

function loadEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

function normalizeSupabaseUrl(raw) {
  const trimmed = String(raw ?? "").trim();
  const base = (trimmed.split(/[?#]/)[0] ?? trimmed).replace(/\/+$/, "");
  if (!base) throw new Error("Invalid Supabase URL.");
  return `${base}/`;
}

async function fetchAllDailyQuestions(client) {
  const rows = [];
  let offset = 0;
  const pageSize = 500;
  for (;;) {
    const { data, error } = await client
      .from("daily_questions")
      .select("id, active_date, question_id, created_at")
      .order("active_date", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

async function verifyCanonicalsExist(client, ids) {
  const missing = [];
  for (const id of ids) {
    const { data, error } = await client
      .from("questions")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) missing.push(id);
  }
  return missing;
}

async function main() {
  const writeSnapshot = process.argv.includes("--write-snapshot");

  const mapDoc = JSON.parse(readFileSync(mapPath, "utf8"));
  const mappings = mapDoc.mappings ?? [];
  const fromSet = new Map(mappings.map((m) => [m.from_question_id, m]));

  const env = loadEnv(envPath);
  const url = normalizeSupabaseUrl(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "");
  const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !key) {
    console.error("Need VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const dailyRows = await fetchAllDailyQuestions(supabase);

  const targets = [...new Set(mappings.map((m) => m.to_question_id))];
  const missingCanonicals = await verifyCanonicalsExist(supabase, targets);
  if (missingCanonicals.length > 0) {
    console.error("Canonical question IDs not found in questions table:", missingCanonicals);
    process.exit(1);
  }

  /** @type {Array<{ daily_row_id: string, active_date: string, old_question_id: string, new_question_id: string, group_id: string, note: string }>} */
  const plannedUpdates = [];

  for (const row of dailyRows) {
    const m = fromSet.get(row.question_id);
    if (!m) continue;
    plannedUpdates.push({
      daily_row_id: row.id,
      active_date: row.active_date,
      old_question_id: row.question_id,
      new_question_id: m.to_question_id,
      group_id: m.group_id,
      note: m.note ?? "",
    });
  }

  const summary = {
    generated_at: new Date().toISOString(),
    total_daily_questions_rows: dailyRows.length,
    mappings_defined: mappings.length,
    daily_rows_to_update: plannedUpdates.length,
    planned_updates: plannedUpdates,
    canonical_targets_verified: targets.length,
    rows_already_pointing_at_canonical: dailyRows.filter((r) =>
      targets.includes(r.question_id),
    ).length,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (plannedUpdates.length === 0) {
    console.log("\n(no daily_questions rows currently use a mapped from_question_id — migration would be a no-op)");
  }

  if (writeSnapshot) {
    mkdirSync(outDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const p = join(outDir, `daily-repoint-preview-${stamp}.json`);
    writeFileSync(p, JSON.stringify(summary, null, 2), "utf8");
    const latest = join(outDir, "daily-repoint-preview-latest.json");
    writeFileSync(latest, JSON.stringify(summary, null, 2), "utf8");
    console.log("\nWrote:", p, latest);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

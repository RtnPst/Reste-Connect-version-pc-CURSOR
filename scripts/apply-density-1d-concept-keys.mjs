/**
 * Apply density-1d gaming concept_key updates (16 live rows).
 * Prefer SQL with trigger disabled (see migration). Best-effort via REST.
 * Usage: npm run apply:density-1d
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

export const DENSITY_1D_UPDATES = [
  { id: "37211885-9c58-4fe5-9c94-139c5918aa29", concept_key: "afk" },
  { id: "4f513adf-0c13-4dcd-8d63-0cdef1f79717", concept_key: "boss" },
  { id: "92568fda-0db5-4004-b28b-f6a3ad6ab289", concept_key: "farm" },
  { id: "2f0980e2-1286-41d5-b41b-ad36b13c26d2", concept_key: "meta" },
  { id: "5f041b78-6e40-4b78-a6f9-884714efa43b", concept_key: "lag" },
  { id: "bf7c391b-3a97-43a5-8ddc-285eafc9f59a", concept_key: "gg" },
  { id: "01352b8b-2595-4620-bbfc-a43b61263084", concept_key: "rage_quit" },
  { id: "de5404b0-5c39-4b01-9d77-b40885b6932f", concept_key: "noob" },
  { id: "e37001d4-44be-4cf3-a2b2-6051d776106a", concept_key: "carry" },
  { id: "ebc9e417-d7fb-49f7-87ae-b2e8dae80151", concept_key: "respawn" },
  { id: "05b908c4-c672-453b-a358-ac6e2b79f31a", concept_key: "loot" },
  { id: "2f564d0d-d8b1-4532-95fd-51acbaee7c61", concept_key: "spawn" },
  { id: "415fd5a6-0e74-4c65-9603-f2ba7a767878", concept_key: "skin" },
  { id: "0db5c36f-1ada-44d7-b950-de6a6fb8167c", concept_key: "level_up" },
  { id: "ddca15ca-84ad-4c78-b95e-4ce1ea2df777", concept_key: "buff" },
  { id: "5f982b9c-5837-4209-8645-84f1ec6acd77", concept_key: "nerf" },
];

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
const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
if (!url || !key) {
  console.error("Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(`${url}/`, key, { auth: { persistSession: false } });
let changed = 0;
let skipped = 0;

for (const row of DENSITY_1D_UPDATES) {
  const { data: existing, error: readErr } = await supabase
    .from("questions")
    .select("id, concept_key, status")
    .eq("id", row.id)
    .maybeSingle();
  if (readErr) {
    console.error(readErr.message);
    process.exit(1);
  }
  if (!existing || existing.status !== "live") {
    skipped += 1;
    continue;
  }
  if (existing.concept_key === row.concept_key) {
    skipped += 1;
    continue;
  }
  const { error } = await supabase
    .from("questions")
    .update({ concept_key: row.concept_key })
    .eq("id", row.id)
    .eq("status", "live");
  if (error) {
    console.error("Update failed", row.id, error.message);
    console.error("Use MCP/SQL with trg_sync_question_editorial_fields disabled.");
    process.exit(1);
  }
  console.log("Updated", row.id, "→", row.concept_key);
  changed += 1;
}

console.log(`density-1d done: ${changed} updated, ${skipped} skipped`);

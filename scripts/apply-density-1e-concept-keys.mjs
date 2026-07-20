/**
 * Apply density-1e vocab + réseaux concept_key updates (18 live rows).
 * Prefer SQL with trigger disabled (see migration). Best-effort via REST.
 * Usage: npm run apply:density-1e
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

export const DENSITY_1E_UPDATES = [
  { id: "55f6b0f6-e9a7-480b-a640-7b055e6c3243", concept_key: "lit" },
  { id: "27eb5f80-3659-4f3a-9b61-ec741058fd12", concept_key: "slay" },
  { id: "496e10af-fe74-4fe5-adcd-7ccef9d71dfc", concept_key: "wesh" },
  { id: "969ac45d-0d1c-4b98-81c4-b6e609dc84f7", concept_key: "matrixe" },
  { id: "7ad3a9b0-e237-43b2-91b2-ab6c7ab904f6", concept_key: "high_key" },
  { id: "c25bcd9b-b4b0-4af4-a86b-a0f2c2c2421a", concept_key: "cap" },
  { id: "fda6745e-cbb9-438d-80d6-5bcf9a3fcf86", concept_key: "clean" },
  { id: "b6804354-ce3f-4b08-a586-217f1cd7e738", concept_key: "filtre" },
  { id: "bee59c3e-8ef6-4c34-89c3-c6ce7801f9f3", concept_key: "compte_verifie" },
  { id: "190eb2f3-bce9-4df5-8229-acadb5c66091", concept_key: "influenceur" },
  { id: "4d2d6587-a46e-436d-80ba-27b7279144a8", concept_key: "challenge" },
  { id: "c69b3b4b-099e-4d9d-82b4-ea197773cca0", concept_key: "viral" },
  { id: "9787229c-3c5f-45b9-b7ca-ef6735004185", concept_key: "poster" },
  { id: "617c4e6e-3494-4233-9793-4fce262a707a", concept_key: "unfollow" },
  { id: "f9fb026e-7900-4a9e-a911-a2c6f251ed13", concept_key: "fake_account" },
  { id: "6a4ca434-8fe1-4337-b3b6-109eb4ebcc27", concept_key: "viewer" },
  { id: "b9d37bd6-9452-4c85-9ee2-6ace3d533459", concept_key: "repost" },
  { id: "4f032e2b-cc07-4c48-87c5-7923934c80d2", concept_key: "compte_prive" },
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

for (const row of DENSITY_1E_UPDATES) {
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

console.log(`density-1e done: ${changed} updated, ${skipped} skipped`);

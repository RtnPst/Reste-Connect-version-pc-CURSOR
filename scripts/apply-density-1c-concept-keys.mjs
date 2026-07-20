/**
 * Apply density-1c trends/pop-culture concept_key updates (16 live rows).
 * Prefer SQL with trigger disabled (see migration). This script is best-effort via REST.
 * Usage: npm run apply:density-1c
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

export const DENSITY_1C_UPDATES = [
  { id: "b613bac2-1269-47ba-861c-b0f8529d7b8b", concept_key: "npc" },
  { id: "7217cc30-ad93-4628-9caf-68cc68d85265", concept_key: "clickbait" },
  { id: "79639004-1b57-4621-8fc3-418ceadd4a06", concept_key: "drama" },
  { id: "9de4d106-b8e2-4636-9630-e377c23e7188", concept_key: "spoiler" },
  { id: "73c8fd62-9caf-4433-ba00-6afdc4488ddf", concept_key: "roast" },
  { id: "aa8680ec-5be3-43ab-8bcb-c857d832859f", concept_key: "troll" },
  { id: "d4cb8888-26c4-42e5-8643-2ce1958a2ecc", concept_key: "based" },
  { id: "c7eb9085-9685-4af7-bbd7-5a49a30dadb8", concept_key: "hater" },
  { id: "88b42927-670e-4a21-9468-7bcf68d0ebce", concept_key: "meme" },
  { id: "29510230-56c2-41b7-81af-900766761267", concept_key: "buzz" },
  { id: "8deec39a-f3cf-4ef7-85ae-6d80de8c1999", concept_key: "banger" },
  { id: "7ce0eacd-f586-4ce4-a478-be856a579172", concept_key: "fail" },
  { id: "9c656228-2cbf-44ca-8c9a-d1db3dc565cd", concept_key: "leak" },
  { id: "6d1156b8-d1bd-4686-bca3-f31146be6362", concept_key: "fake_news" },
  { id: "7ec5ca6a-bc56-4d3e-bc6c-6bedd59d97e7", concept_key: "trend" },
  { id: "60f534aa-5adb-431f-9fb3-a6af6047cbdc", concept_key: "inside_joke" },
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

for (const row of DENSITY_1C_UPDATES) {
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

console.log(`density-1c done: ${changed} updated, ${skipped} skipped`);

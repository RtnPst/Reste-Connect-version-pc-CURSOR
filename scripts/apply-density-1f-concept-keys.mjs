/**
 * density-1f culture leftovers (16) — prefer migration SQL with trigger disabled.
 * Usage: npm run apply:density-1f
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

export const DENSITY_1F_UPDATES = [
  { id: "768d1158-0bcf-4861-b8c0-1e9426e7961a", concept_key: "commentaire_epingle" },
  { id: "aa2b5201-e6bc-4fb8-b80b-682fd841e89b", concept_key: "reel" },
  { id: "3a25f0e3-f836-4059-a152-d7be91ae9e78", concept_key: "ping" },
  { id: "83505e5f-33b0-470b-80bd-b2c6cf27d0d5", concept_key: "cooldown" },
  { id: "c0625aa6-1162-4b35-abee-da2483e87241", concept_key: "remix" },
  { id: "6eee381c-486f-47fb-a909-d580f6c933cf", concept_key: "meme_viral" },
  { id: "9c22bc71-085d-47c8-80a8-2f7c5f928035", concept_key: "meme_mort" },
  { id: "cd0d3e5b-cac4-47e8-ba43-2a8c511a1ad2", concept_key: "meme_template" },
  { id: "b397a5a6-2903-4357-ba96-fab096d81f4f", concept_key: "drop" },
  { id: "732bc817-5451-493c-b503-f445226ce4b1", concept_key: "spammer" },
  { id: "c4845877-19f6-414e-88a6-cad9ca178a1b", concept_key: "feat" },
  { id: "4081961e-a233-47b0-abcf-24e76f0c7393", concept_key: "son" },
  { id: "70d06ca1-c8c8-4685-8b32-2cf890035cc8", concept_key: "tuto" },
  { id: "2e9fbff2-b362-4400-b728-95122cd5790b", concept_key: "reaction" },
  { id: "f6ba8854-9273-4554-a5ee-5b845a8fb636", concept_key: "hit" },
  { id: "973c379d-2b06-4676-be21-01f9498ba962", concept_key: "album_drop" },
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

for (const row of DENSITY_1F_UPDATES) {
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

console.log(`density-1f done: ${changed} updated, ${skipped} skipped`);

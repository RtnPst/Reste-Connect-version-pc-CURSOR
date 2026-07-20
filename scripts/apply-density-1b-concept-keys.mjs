/**
 * Apply density-1b social/lifestyle/vocab concept_key updates (18 live rows).
 * Prefer SQL with trigger disabled (see migration). This script is best-effort via REST.
 * Usage: npm run apply:density-1b
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

export const DENSITY_1B_UPDATES = [
  { id: "0258f3e1-41b6-4e9c-bedc-077d5fbe7825", concept_key: "seen" },
  { id: "8313de64-93d0-43e6-8630-e2169721be19", concept_key: "simp" },
  { id: "cf40373f-e968-43e4-b1d8-89923b54e1fd", concept_key: "situationship" },
  { id: "ac8b2d3d-00f1-4a0f-81a9-bab36efb4132", concept_key: "dm" },
  { id: "68205d1e-12be-459c-a9bd-74c4773962bb", concept_key: "story" },
  { id: "40b84ad1-9a64-499f-8d23-10d57607873a", concept_key: "shadowban" },
  { id: "ef8318d4-5c48-471b-a838-8bfad7f3b22f", concept_key: "feed" },
  { id: "9049deb7-96ac-4917-a4d4-d3173b5cb0d1", concept_key: "follow" },
  { id: "2abe751b-7db0-4e22-b4bb-92fd2096e48b", concept_key: "block" },
  { id: "2723ff7b-b2f0-4658-97ca-312f20a1ed2f", concept_key: "mute" },
  { id: "cbc8381f-d9dd-4378-854b-95cf99cc01fc", concept_key: "live" },
  { id: "ceb81392-69d4-47ef-b16b-0250fe5861b2", concept_key: "thread" },
  { id: "51ed5c5b-5724-4af8-bd11-ea9347973ee0", concept_key: "fomo" },
  { id: "6c580b7e-6d3f-49ca-8641-bf976b15c35b", concept_key: "goat" },
  { id: "a25fea63-8997-4783-a3eb-5a854594bc4c", concept_key: "no_cap" },
  { id: "3f061654-5aad-47c0-8865-5bebac3c82d8", concept_key: "mid" },
  { id: "e2cfc234-68cd-4f35-aa1c-f9eafe637936", concept_key: "salty" },
  { id: "06edab68-0d17-43e1-8692-071cd47eb7b7", concept_key: "pov" },
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

for (const row of DENSITY_1B_UPDATES) {
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

console.log(JSON.stringify({ changed, skipped, total: DENSITY_1B_UPDATES.length }, null, 2));

/**
 * density-1g tech cultural concept keys (12) — prefer migration SQL with trigger disabled.
 * Usage: npm run apply:density-1g
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

export const DENSITY_1G_UPDATES = [
  { id: "077c75b7-6fd8-43b2-8a2d-8a429c97037e", concept_key: "cloud" },
  { id: "6046d83b-5a8a-4368-8aee-e13f12039e80", concept_key: "wifi" },
  { id: "1fde6c35-e7f4-41a7-8538-454b3674a78e", concept_key: "os" },
  { id: "75a1ca57-7eb9-41a2-9978-ba5dbd745345", concept_key: "2fa" },
  { id: "4cb0690d-7989-425b-9443-70d0dd2f2841", concept_key: "phishing" },
  { id: "1aaa76ce-1ddc-4b0b-8b8d-f1aaa8b24db3", concept_key: "mode_avion" },
  { id: "fd04d847-4b4c-4981-acb6-11ce361a08ed", concept_key: "qr_code" },
  { id: "18b88d74-16ef-4458-9084-27328abac1a8", concept_key: "5g" },
  { id: "880c038f-66af-4eaf-b4c6-dcbbc96aa79b", concept_key: "assistant_vocal" },
  { id: "111d65a5-56fe-4bc5-8f98-6d3736b97101", concept_key: "bot" },
  { id: "b17adfbc-3a0d-4a11-b4b0-dfbaeb45fd6e", concept_key: "algo" },
  { id: "ecd90772-00dd-40e7-9b8c-986e1b6c4e20", concept_key: "hack" },
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

for (const row of DENSITY_1G_UPDATES) {
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

console.log(`density-1g done: ${changed} updated, ${skipped} skipped`);

/**
 * Apply density-1-daily-core-vernacular concept_key updates (10 live rows).
 * Uses SUPABASE_SERVICE_ROLE_KEY from .env — idempotent.
 *
 * Usage: npm run apply:density-1
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

const UPDATES = [
  { id: "b0032b43-ad1b-41d7-82ea-b0857cf00907", concept_key: "red_flag" },
  { id: "c3aaaab2-4e74-4752-a554-7aa4a475baa8", concept_key: "crush" },
  { id: "addb39c7-cf2f-48a2-ba8a-d5fb496de474", concept_key: "ratio" },
  { id: "ee012de3-f0ac-43df-b30f-475f42b4f1c9", concept_key: "ghoster" },
  { id: "023882fa-4f05-4c02-81af-0891403be434", concept_key: "flex" },
  { id: "ff2dea3b-d1d7-4e66-b043-4e05a61c4341", concept_key: "sus" },
  { id: "cd55919d-8510-4348-8339-98941c4e378b", concept_key: "bail" },
  { id: "7acb5233-6a7f-4d44-88a8-1c1f15927477", concept_key: "dead" },
  { id: "80a20c26-6399-401f-9be4-707408886d0a", concept_key: "valide" },
  { id: "8160d5c3-772b-4b83-a414-b45598a5ccde", concept_key: "carre" },
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
  console.error("Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(`${url}/`, key, { auth: { persistSession: false } });

let changed = 0;
let skipped = 0;

for (const row of UPDATES) {
  const { data: existing, error: readErr } = await supabase
    .from("questions")
    .select("id, concept_key, status")
    .eq("id", row.id)
    .maybeSingle();

  if (readErr) {
    console.error("Read failed", row.id, readErr.message);
    process.exit(1);
  }
  if (!existing || existing.status !== "live") {
    console.warn("Skip (not live):", row.id);
    skipped += 1;
    continue;
  }
  if (existing.concept_key === row.concept_key) {
    console.log("Already set:", row.id, row.concept_key);
    skipped += 1;
    continue;
  }

  const { error: updErr } = await supabase
    .from("questions")
    .update({ concept_key: row.concept_key })
    .eq("id", row.id)
    .eq("status", "live");

  if (updErr) {
    console.error("Update failed", row.id, updErr.message);
    process.exit(1);
  }
  console.log("Updated:", row.id, existing.concept_key ?? "null", "→", row.concept_key);
  changed += 1;
}

console.log(JSON.stringify({ changed, skipped, total: UPDATES.length }, null, 2));

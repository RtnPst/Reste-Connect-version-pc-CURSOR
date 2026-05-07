/**
 * One-off import: soft-disable all existing questions, then insert a new set.
 *
 * Source: src/data/new-questions.json
 * Each item:
 *   { "category": "...", "difficulty": "easy|medium|hard", "question": "...",
 *     "choices": ["","","",""], "correct_index": 0-3, "explanation": "..." }
 *
 * Requires in .env (project root):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Rollback (manual, Supabase SQL or Table Editor):
 *   - If you exported question ids + created_at before running: set is_active=true
 *     for old ids, set is_active=false for rows created after import, or delete
 *     only the new ids by time range.
 *   - If insert failed after disable: re-enable with
 *       UPDATE public.questions SET is_active = true WHERE id IN (...backup...);
 *   - Best: restore from a Supabase backup / prior CSV export.
 *
 * Does NOT run automatically — execute manually when ready.
 *
 * Dry run (no Supabase writes; optional read-only count if .env is present):
 *   node scripts/import-new-questions.mjs --dry
 *   node scripts/import-new-questions.mjs --dry-run
 *
 * Live import prints a confirmation summary (URL without keys, counts before /
 * after soft-disable / after insert) and exits with code 1 if the final active
 * count does not equal new-questions.json length.
 *
 * Après mise à jour de src/data/new-questions.json, régénérer les tags Culture internet :
 *   npm run generate:culture-pop-tags
 *   (met à jour culture-pop-question-tags.json + culture-pop-tags-source.sha256)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const jsonPath = resolve(root, "src/data/new-questions.json");
const envPath = resolve(root, ".env");

const dryRun =
  process.argv.includes("--dry") || process.argv.includes("--dry-run");

/** Display labels (case-insensitive via toLowerCase) -> Supabase theme enum */
const CATEGORY_LABELS = new Map(
  [
    ["Vocabulaire", "vocabulaire"],
    ["Réseaux sociaux", "reseaux_sociaux"],
    ["Culture internet", "culture_pop"],
    ["Gaming", "culture_pop"],
    ["Relations", "culture_pop"],
    ["Musique", "culture_pop"],
  ].map(([k, v]) => [k.trim().toLowerCase(), v]),
);

const DIFF_MAP = {
  easy: "facile",
  medium: "moyen",
  hard: "difficile",
};

function parseEnv(text) {
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
  const withoutQueryOrHash = trimmed.split(/[?#]/)[0]?.trim() ?? trimmed;
  const base = withoutQueryOrHash.replace(/\/+$/, "");
  if (!base) throw new Error("Invalid Supabase URL: empty after normalization.");
  return `${base}/`;
}

/** Host-only display (no keys, no query/hash). */
function displayProjectUrl(normalizedUrl) {
  try {
    const u = new URL(normalizedUrl);
    return `${u.protocol}//${u.host}/`;
  } catch {
    return "(unable to parse project URL)";
  }
}

/** Read-only counts on public.questions (service role client). */
async function questionCounts(admin) {
  const totalR = await admin.from("questions").select("*", { count: "exact", head: true });
  if (totalR.error) throw new Error(`count total: ${totalR.error.message}`);
  const activeR = await admin
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);
  if (activeR.error) throw new Error(`count active: ${activeR.error.message}`);
  const inactiveR = await admin
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("is_active", false);
  if (inactiveR.error) throw new Error(`count inactive: ${inactiveR.error.message}`);
  return {
    total: totalR.count ?? 0,
    active: activeR.count ?? 0,
    inactive: inactiveR.count ?? 0,
  };
}

function printCountBlock(c) {
  console.log(`    total:    ${c.total}`);
  console.log(`    active:   ${c.active}`);
  console.log(`    inactive: ${c.inactive}`);
}

function validateAndMap(items) {
  const errors = [];
  const rows = [];

  if (!Array.isArray(items)) {
    return { ok: false, errors: ["Root JSON must be an array."], rows: [] };
  }
  if (items.length === 0) {
    return {
      ok: false,
      errors: ["Array is empty. Refusing to run: would disable all questions and insert nothing."],
      rows: [],
    };
  }

  items.forEach((raw, i) => {
    const idx = i + 1;
    if (!raw || typeof raw !== "object") {
      errors.push(`#${idx}: entry must be an object`);
      return;
    }
    const {
      category,
      difficulty: diffRaw,
      question,
      choices,
      correct_index: ci,
      explanation,
    } = raw;

    if (typeof category !== "string" || !category.trim()) {
      errors.push(`#${idx}: category must be a non-empty string`);
      return;
    }
    const theme = CATEGORY_LABELS.get(category.trim().toLowerCase());
    if (!theme) {
      errors.push(
        `#${idx}: unknown category "${category}". Expected one of: Vocabulaire, Réseaux sociaux, Culture internet, Gaming, Relations, Musique`,
      );
      return;
    }

    if (typeof diffRaw !== "string" || !DIFF_MAP[diffRaw.trim().toLowerCase()]) {
      errors.push(`#${idx}: difficulty must be easy, medium, or hard (got ${JSON.stringify(diffRaw)})`);
      return;
    }
    const difficulty = DIFF_MAP[diffRaw.trim().toLowerCase()];

    if (typeof question !== "string" || !question.trim()) {
      errors.push(`#${idx}: question must be a non-empty string`);
      return;
    }

    if (!Array.isArray(choices) || choices.length !== 4 || !choices.every((c) => typeof c === "string")) {
      errors.push(`#${idx}: choices must be an array of exactly 4 strings`);
      return;
    }
    if (choices.some((c) => !c.trim())) {
      errors.push(`#${idx}: each choice must be a non-empty string`);
      return;
    }

    const correctIndex = typeof ci === "number" ? ci : Number.parseInt(String(ci), 10);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
      errors.push(`#${idx}: correct_index must be integer 0–3`);
      return;
    }

    if (typeof explanation !== "string" || !explanation.trim()) {
      errors.push(`#${idx}: explanation must be a non-empty string`);
      return;
    }

    rows.push({
      theme,
      difficulty,
      question: question.trim(),
      choices,
      correct_index: correctIndex,
      explanation: explanation.trim(),
      is_active: true,
    });
  });

  return { ok: errors.length === 0, errors, rows };
}

function printDrySamples(items, rows, n = 3) {
  const limit = Math.min(n, rows.length);
  console.log(`Sample transformed rows (${limit} of ${rows.length}):`);
  for (let i = 0; i < limit; i++) {
    const src = items[i];
    const r = rows[i];
    console.log(
      JSON.stringify(
        {
          source_category: src.category,
          source_difficulty: src.difficulty,
          theme: r.theme,
          difficulty: r.difficulty,
          question: r.question,
          choices: r.choices,
          correct_index: r.correct_index,
          explanation: r.explanation,
          is_active: r.is_active,
        },
        null,
        2,
      ),
    );
  }
}

async function main() {
  if (!existsSync(jsonPath)) {
    console.error("Missing file:", jsonPath);
    process.exit(1);
  }

  let items;
  try {
    items = JSON.parse(readFileSync(jsonPath, "utf8"));
  } catch (e) {
    console.error("Invalid JSON in", jsonPath, (e && e.message) || e);
    process.exit(1);
  }

  const { ok, errors, rows } = validateAndMap(items);
  if (!ok) {
    console.error("Validation failed:\n", errors.join("\n"));
    process.exit(1);
  }

  if (dryRun) {
    console.log("DRY RUN — no Supabase updates or inserts will be performed.\n");

    let wouldDisable = null;
    let countNote = "";
    if (existsSync(envPath)) {
      const env = parseEnv(readFileSync(envPath, "utf8"));
      const urlRaw = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
      const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
      if (urlRaw && serviceKey) {
        try {
          const supabaseUrl = normalizeSupabaseUrl(urlRaw);
          console.log("Dry run — target project URL:", displayProjectUrl(supabaseUrl));
          const admin = createClient(supabaseUrl, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const before = await questionCounts(admin);
          console.log("  Current questions (read-only):");
          printCountBlock(before);
          wouldDisable = before.total;
        } catch (e) {
          countNote = `(count skipped: ${(e && e.message) || e})`;
        }
      } else {
        countNote =
          "(set VITE_SUPABASE_URL or SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env to preview how many rows would be disabled)";
      }
    } else {
      countNote = "(no .env — add one with Supabase vars to preview how many rows would be disabled)";
    }

    const disableLine =
      wouldDisable !== null && wouldDisable !== undefined
        ? String(wouldDisable)
        : countNote || "?";
    console.log("Would disable (soft):", disableLine);
    console.log("Would insert:", rows.length);
    console.log("");
    printDrySamples(items, rows, 3);
    return;
  }

  if (!existsSync(envPath)) {
    console.error("Missing .env at", envPath);
    process.exit(1);
  }

  const env = parseEnv(readFileSync(envPath, "utf8"));
  const urlRaw = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!urlRaw || !serviceKey) {
    console.error("Need VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const supabaseUrl = normalizeSupabaseUrl(urlRaw);
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const zeroUuid = "00000000-0000-0000-0000-000000000000";
  const jsonCount = rows.length;

  console.log("\n========== IMPORT — CONFIRMATION SUMMARY ==========\n");

  console.log("1. Supabase project URL (no secrets):");
  console.log("   ", displayProjectUrl(supabaseUrl));
  console.log("");

  let before;
  try {
    before = await questionCounts(admin);
  } catch (e) {
    console.error("Count before import failed:", (e && e.message) || e);
    process.exit(1);
  }
  console.log("2. Questions BEFORE import:");
  printCountBlock(before);
  console.log("");

  console.log("3. Questions in src/data/new-questions.json:");
  console.log(`    count: ${jsonCount}`);
  console.log("");

  const { data: updatedRows, error: updErr } = await admin
    .from("questions")
    .update({ is_active: false })
    .neq("id", zeroUuid)
    .select("id");

  if (updErr) {
    console.error("Soft-disable update failed:", updErr.message);
    process.exit(1);
  }

  const apiReturnedRows = updatedRows?.length ?? 0;

  let afterDisable;
  try {
    afterDisable = await questionCounts(admin);
  } catch (e) {
    console.error("Count after soft-disable failed:", (e && e.message) || e);
    process.exit(1);
  }
  console.log("4. Questions AFTER soft-disabling old rows (is_active = false):");
  printCountBlock(afterDisable);
  console.log(
    `   (API returned ${apiReturnedRows} row id(s) from UPDATE response; trust counts above.)`,
  );
  console.log("");

  if (before.total > 0 && afterDisable.active !== 0) {
    console.error(
      "Abort: after soft-disable, active count should be 0 when the table had rows. Refusing insert.",
    );
    process.exit(1);
  }

  const chunkSize = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error: insErr } = await admin.from("questions").insert(chunk);
    if (insErr) {
      console.error("Insert failed at offset", i, insErr.message);
      console.error("You may need to fix data and rollback (see script header comments).");
      process.exit(1);
    }
    inserted += chunk.length;
  }

  let afterInsert;
  try {
    afterInsert = await questionCounts(admin);
  } catch (e) {
    console.error("Count after insert failed:", (e && e.message) || e);
    process.exit(1);
  }
  console.log("5. Questions AFTER inserting new rows:");
  printCountBlock(afterInsert);
  console.log("");

  console.log("6. New questions inserted (from file):");
  console.log(`    inserted: ${inserted}`);
  console.log("");

  if (afterInsert.active !== jsonCount) {
    console.error("========== IMPORT — VALIDATION FAILED ==========");
    console.error(
      `Expected active count to equal new-questions.json length (${jsonCount}), got ${afterInsert.active}.`,
    );
    console.error("Do not assume the database is in a clean state; review counts above and backups.");
    process.exit(1);
  }

  console.log("7. Validation: final active count matches JSON length — OK");
  console.log("\n========== IMPORT — COMPLETE ==========\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

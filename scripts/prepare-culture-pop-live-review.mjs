/**
 * Build a lightweight CSV for human theme review: playable culture_pop only.
 *
 * Reads an existing culture-pop-pool-export JSON (from export-culture-pop-pool.mjs).
 * Does NOT touch the database, enums, or migrations.
 *
 * Filter:
 *   status === 'live' AND is_active === true
 *
 * Columns:
 *   id, question, difficulty, tag_piste, baseline_suggested_theme, needs_review,
 *   human_approved_theme (empty), human_notes (empty)
 *
 * baseline_suggested_theme comes from the export record (same logic as full export).
 *
 * Usage:
 *   node scripts/prepare-culture-pop-live-review.mjs
 *   node scripts/prepare-culture-pop-live-review.mjs path/to/culture-pop-pool-export-....json
 *
 * Outputs:
 *   exports/culture-pop-pool/culture-pop-live-review-<timestamp>.csv
 *   exports/culture-pop-pool/culture-pop-live-review-latest.csv  (overwrite: easy to open)
 *   exports/culture-pop-pool/culture-pop-live-review-prefilled-<timestamp>.csv
 *   exports/culture-pop-pool/culture-pop-live-review-prefilled-latest.csv
 *     (same rows; human_approved_theme = baseline_suggested_theme for quick correction pass)
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const poolDir = resolve(root, "exports/culture-pop-pool");

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function findLatestExportJson() {
  if (!existsSync(poolDir)) return null;
  const files = readdirSync(poolDir).filter(
    (f) => f.startsWith("culture-pop-pool-export-") && f.endsWith(".json"),
  );
  if (files.length === 0) return null;
  let best = null;
  let bestM = 0;
  for (const f of files) {
    const p = join(poolDir, f);
    const m = statSync(p).mtimeMs;
    if (m >= bestM) {
      bestM = m;
      best = p;
    }
  }
  return best;
}

function main() {
  const argPath = process.argv[2]?.trim();
  const inputPath =
    argPath && existsSync(resolve(root, argPath))
      ? resolve(root, argPath)
      : argPath && existsSync(argPath)
        ? argPath
        : findLatestExportJson();

  if (!inputPath || !existsSync(inputPath)) {
    console.error(
      "No export JSON found. Run: npm run export:culture-pop-pool\nOr pass path: node scripts/prepare-culture-pop-live-review.mjs exports/culture-pop-pool/culture-pop-pool-export-....json",
    );
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(inputPath, "utf8"));
  const records = raw.records ?? [];
  const playable = records.filter((r) => r.status === "live" && r.is_active === true);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outNamed = join(poolDir, `culture-pop-live-review-${stamp}.csv`);
  const outLatest = join(poolDir, "culture-pop-live-review-latest.csv");
  const outPrefilledNamed = join(poolDir, `culture-pop-live-review-prefilled-${stamp}.csv`);
  const outPrefilledLatest = join(poolDir, "culture-pop-live-review-prefilled-latest.csv");

  const headers = [
    "id",
    "question",
    "difficulty",
    "tag_piste",
    "baseline_suggested_theme",
    "needs_review",
    "human_approved_theme",
    "human_notes",
  ];

  const rows = playable.map((r) => ({
    id: r.id,
    question: r.question,
    difficulty: r.difficulty,
    tag_piste: r.tag_piste ?? "",
    baseline_suggested_theme: r.baseline_suggested_theme ?? "",
    needs_review: r.needs_review === true ? "true" : "false",
    human_approved_theme: "",
    human_notes: "",
  }));

  const rowsPrefilled = playable.map((r) => {
    const baseline = r.baseline_suggested_theme ?? "";
    return {
      id: r.id,
      question: r.question,
      difficulty: r.difficulty,
      tag_piste: r.tag_piste ?? "",
      baseline_suggested_theme: baseline,
      needs_review: r.needs_review === true ? "true" : "false",
      human_approved_theme: baseline,
      human_notes: "",
    };
  });

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => csvEscape(row[h]))
        .join(","),
    ),
  ];
  const body = lines.join("\n");

  const linesPrefilled = [
    headers.join(","),
    ...rowsPrefilled.map((row) =>
      headers
        .map((h) => csvEscape(row[h]))
        .join(","),
    ),
  ];
  const bodyPrefilled = linesPrefilled.join("\n");

  mkdirSync(poolDir, { recursive: true });
  writeFileSync(outNamed, body, "utf8");
  writeFileSync(outLatest, body, "utf8");
  writeFileSync(outPrefilledNamed, bodyPrefilled, "utf8");
  writeFileSync(outPrefilledLatest, bodyPrefilled, "utf8");

  console.log("Culture pop — live review CSV");
  console.log("  Source JSON:", inputPath);
  console.log("  Playable rows (status=live & is_active=true):", playable.length);
  console.log("  Written (empty human):", outNamed);
  console.log("  Latest (empty human):", outLatest);
  console.log("  Written (prefilled):", outPrefilledNamed);
  console.log("  Prefilled latest:", outPrefilledLatest);
  console.log("");
  console.log("Empty file: fill human_approved_theme manually for all rows.");
  console.log("Prefilled: human_approved_theme = baseline; correct only questionable rows.");
}

main();

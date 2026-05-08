/**
 * Build a slim CSV for human "restore playable" decisions on archived tech questions.
 *
 * Reads the latest (or passed) tech-theme-audit JSON from audit-tech-theme-pool.mjs.
 * Does NOT touch the database.
 *
 * Usage:
 *   node scripts/prepare-tech-theme-restore-review.mjs
 *   node scripts/prepare-tech-theme-restore-review.mjs exports/tech-theme-audit/tech-theme-audit-....json
 *
 * Outputs:
 *   exports/tech-theme-audit/tech-theme-restore-review-<stamp>.csv
 *   exports/tech-theme-audit/tech-theme-restore-review-latest.csv
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { csvEscape } from "./lib/exact-dup-critical-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const auditDir = resolve(root, "exports/tech-theme-audit");

function findLatestAuditJson() {
  if (!existsSync(auditDir)) return null;
  const files = readdirSync(auditDir).filter((f) => f.startsWith("tech-theme-audit-") && f.endsWith(".json") && !f.includes("latest"));
  if (files.length === 0) return null;
  let best = null;
  let bestM = 0;
  for (const f of files) {
    const p = join(auditDir, f);
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
        : existsSync(join(auditDir, "tech-theme-audit-latest.json"))
          ? join(auditDir, "tech-theme-audit-latest.json")
          : findLatestAuditJson();

  if (!inputPath || !existsSync(inputPath)) {
    console.error(
      "No audit JSON found. Run: npm run audit:tech-theme -- --write-latest\nOr pass path to tech-theme-audit-....json",
    );
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(inputPath, "utf8"));
  const records = raw.records ?? [];

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync(auditDir, { recursive: true });
  const outNamed = join(auditDir, `tech-theme-restore-review-${stamp}.csv`);
  const outLatest = join(auditDir, "tech-theme-restore-review-latest.csv");

  const headers = [
    "id",
    "question",
    "difficulty",
    "primary_bucket",
    "restore_estimate",
    "dup_other_themes",
    "dup_tech_sibling_ids",
    "categories",
    "human_restore_playable",
    "human_notes",
  ];

  const lines = [
    headers.join(","),
    ...records.map((r) =>
      [
        r.id,
        csvEscape(r.question),
        csvEscape(r.difficulty),
        csvEscape(r.primary_bucket),
        csvEscape(r.restore_estimate),
        csvEscape(r.dup_other_themes ?? ""),
        csvEscape(r.dup_tech_sibling_ids ?? ""),
        csvEscape(r.categories ?? ""),
        "",
        "",
      ].join(","),
    ),
  ];

  const body = lines.join("\n");
  writeFileSync(outNamed, body, "utf8");
  writeFileSync(outLatest, body, "utf8");

  console.log("Rows:", records.length);
  console.log("Wrote:", outNamed);
  console.log("Wrote:", outLatest);
}

main();

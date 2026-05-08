/**
 * Validate culture-pop-live-review-approved.csv before theme migration.
 * Read-only — writes a JSON summary under exports/culture-pop-pool/.
 *
 *   node scripts/validate-culture-pop-approved-mapping.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const csvPath = resolve(root, "exports/culture-pop-pool/culture-pop-live-review-approved.csv");
const outPath = resolve(root, "exports/culture-pop-pool/culture-pop-approved-validation-summary.json");

const VALID_THEMES = new Set(["gaming", "trends_pop_culture", "relations_lifestyle", "tech"]);

/** Heuristic: might fit dedicated `tech` theme — rows already mapped to `tech` are excluded. */
const TECH_REVIEW_RE =
  /\b(bot|algo(rithme)?|IA\b|intelligence artificielle|ChatGPT|hack(er)?|deepfake|VPN|crypt(o)?|malware|virus informatique|phishing|dark web|firewall|cookie\s|RGPD\s|captcha)\b/i;

function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === "," && !inQuotes) {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  cells.push(cur);
  return cells;
}

function main() {
  const raw = readFileSync(csvPath, "utf8");
  const lines = raw.trim().split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const idx = {
    id: header.indexOf("id"),
    question: header.indexOf("question"),
    difficulty: header.indexOf("difficulty"),
    tag_piste: header.indexOf("tag_piste"),
    baseline_suggested_theme: header.indexOf("baseline_suggested_theme"),
    needs_review: header.indexOf("needs_review"),
    human_approved_theme: header.indexOf("human_approved_theme"),
    human_notes: header.indexOf("human_notes"),
  };

  const rows = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = parseCsvLine(lines[li]);
    if (cells.length < header.length) continue;
    rows.push({
      id: cells[idx.id]?.trim() ?? "",
      question: cells[idx.question] ?? "",
      difficulty: cells[idx.difficulty] ?? "",
      tag_piste: cells[idx.tag_piste]?.trim() ?? "",
      baseline_suggested_theme: cells[idx.baseline_suggested_theme]?.trim() ?? "",
      needs_review: cells[idx.needs_review]?.trim() ?? "",
      human_approved_theme: cells[idx.human_approved_theme]?.trim() ?? "",
      human_notes: cells[idx.human_notes]?.trim() ?? "",
    });
  }

  const counts = {
    gaming: 0,
    trends_pop_culture: 0,
    relations_lifestyle: 0,
    tech: 0,
  };

  const empty = [];
  const invalid = [];
  const suspicious = [];
  const techCandidates = [];
  const techMovesFromCultureReview = [];
  let overridesFromBaseline = 0;

  for (const r of rows) {
    const h = r.human_approved_theme;

    if (!h || h === "") {
      empty.push({ id: r.id, question: r.question.slice(0, 80) });
      continue;
    }

    if (!VALID_THEMES.has(h)) {
      invalid.push({ id: r.id, human_approved_theme: h, question: r.question.slice(0, 80) });
      continue;
    }

    counts[h]++;

    if (h !== r.baseline_suggested_theme) {
      overridesFromBaseline++;
      if (h === "tech") {
        techMovesFromCultureReview.push({
          id: r.id,
          baseline: r.baseline_suggested_theme,
          human: h,
          question_preview: r.question.slice(0, 72),
        });
      } else {
        suspicious.push({
          id: r.id,
          reason: "human_approved_theme differs from baseline_suggested_theme",
          tag_piste: r.tag_piste,
          baseline: r.baseline_suggested_theme,
          human: h,
          question_preview: r.question.slice(0, 72),
        });
      }
    }

    const tag = r.tag_piste;
    let expectedFromTag = null;
    if (tag === "gaming") expectedFromTag = "gaming";
    else if (tag === "musique" || tag === "internet") expectedFromTag = "trends_pop_culture";
    else if (tag === "relations") expectedFromTag = "relations_lifestyle";

    if (expectedFromTag && h !== expectedFromTag && h !== "tech") {
      suspicious.push({
        id: r.id,
        reason: "human_approved_theme differs from tag_piste convention (gaming / trends / relations)",
        tag_piste: tag,
        expected_from_tag_piste: expectedFromTag,
        human: h,
        question_preview: r.question.slice(0, 72),
      });
    }

    if (TECH_REVIEW_RE.test(r.question) && h !== "gaming" && h !== "tech") {
      techCandidates.push({
        id: r.id,
        human_approved_theme: h,
        tag_piste: r.tag_piste,
        question_preview: r.question.slice(0, 80),
        note: "Keyword overlap with tech — editorial decision whether to keep in culture split or move to tech later.",
      });
    }
  }

  const summary = {
    generated_at: new Date().toISOString(),
    source_file: "exports/culture-pop-pool/culture-pop-live-review-approved.csv",
    row_count: rows.length,
    valid_target_themes: [...VALID_THEMES],
    counts_per_approved_theme: counts,
    empty_human_approved_theme: empty.length,
    invalid_human_approved_theme: invalid.length,
    suspicious_rows_total: suspicious.length,
    suspicious_baseline_mismatch: suspicious.filter((s) => s.reason?.includes("baseline")).length,
    suspicious_tag_piste_mismatch: suspicious.filter((s) => s.reason?.includes("tag_piste")).length,
    possible_tech_keyword_overlap_rows: techCandidates.length,
    overrides_from_baseline_distinct_count: overridesFromBaseline,
    intentional_moves_to_tech_from_review: techMovesFromCultureReview,
    empty_rows: empty,
    invalid_rows: invalid,
    suspicious_rows: suspicious,
    possible_tech_candidates: techCandidates,
    verdict:
      empty.length === 0 && invalid.length === 0
        ? "All rows have a non-empty valid human_approved_theme — split targets include intentional moves to `tech` per editorial decision."
        : "Fix empty or invalid human_approved_theme before migration.",
  };

  mkdirSync(resolve(root, "exports/culture-pop-pool"), { recursive: true });
  writeFileSync(outPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
  console.log("\nWrote:", outPath);
}

main();

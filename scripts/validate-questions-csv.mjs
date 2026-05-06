/**
 * Validate / clean a Supabase-style questions CSV export.
 * Usage: node scripts/validate-questions-csv.mjs [path/to.csv]
 * Default: C:\Users\npays\Downloads\questions_rows (2).csv
 */
import fs from "node:fs";
import path from "node:path";

const THEMES = new Set(["vocabulaire", "reseaux_sociaux", "culture_pop", "tech"]);
const DIFFS = new Set(["facile", "moyen", "difficile"]);

const defaultPath = "C:\\Users\\npays\\Downloads\\questions_rows (2).csv";
const inputPath = path.resolve(process.argv[2] ?? defaultPath);
const outDir = path.dirname(inputPath);
const base = path.basename(inputPath, path.extname(inputPath));
const reportPath = path.join(outDir, `${base}.validation-report.txt`);
const cleanedPath = path.join(outDir, `${base}.cleaned.csv`);

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\n" || (c === "\r" && text[i + 1] === "\n")) {
      if (c === "\r") i++;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.length > 0) || row.length > 1) {
        rows.push(row);
      }
      row = [];
      i++;
      continue;
    }
    if (c === "\r") {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.length > 0) || row.length > 1) {
        rows.push(row);
      }
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }
  return rows;
}

function escCSV(val) {
  const s = String(val ?? "");
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowToLine(cols) {
  return cols.map(escCSV).join(",") + "\n";
}

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateRow(cols, lineNo) {
  const errs = [];
  const expected = 9;
  if (cols.length !== expected) {
    errs.push(`colonnes=${cols.length} (attendu ${expected})`);
  }
  const [
    id,
    theme,
    difficulty,
    question,
    choicesRaw,
    correctIndexRaw,
    explanation,
    isActiveRaw,
    createdAt,
  ] = cols;

  if (!uuidRe.test(id ?? "")) {
    errs.push(`id UUID invalide: ${(id ?? "").slice(0, 40)}`);
  }
  if (!THEMES.has(theme ?? "")) {
    errs.push(`theme invalide: ${theme}`);
  }
  if (!DIFFS.has(difficulty ?? "")) {
    errs.push(`difficulty invalide: ${difficulty}`);
  }
  if (!(question ?? "").trim()) {
    errs.push("question vide");
  }

  let choicesArr = null;
  try {
    const j = JSON.parse(choicesRaw ?? "null");
    if (!Array.isArray(j)) {
      errs.push("choices: pas un tableau JSON");
    } else if (j.length !== 4) {
      errs.push(`choices: longueur ${j.length} (attendu 4)`);
    } else if (!j.every((x) => typeof x === "string")) {
      errs.push("choices: tous les éléments doivent être des chaînes");
    } else {
      choicesArr = j;
    }
  } catch {
    errs.push("choices: JSON invalide");
  }

  const ci = Number.parseInt(String(correctIndexRaw ?? ""), 10);
  if (Number.isNaN(ci) || ci < 0 || ci > 3) {
    errs.push(`correct_index hors plage: ${correctIndexRaw}`);
  }

  if (!(explanation ?? "").trim()) {
    errs.push("explanation vide");
  }

  const ia = String(isActiveRaw ?? "").toLowerCase();
  if (!["true", "false"].includes(ia)) {
    errs.push(`is_active invalide: ${isActiveRaw}`);
  }

  if (!(createdAt ?? "").trim()) {
    errs.push("created_at vide");
  }

  return { errs, choicesArr, correctIndex: ci };
}

function main() {
  if (!fs.existsSync(inputPath)) {
    console.error("Fichier introuvable:", inputPath);
    process.exit(1);
  }
  const text = fs.readFileSync(inputPath, "utf8");
  const rows = parseCSV(text);
  if (!rows.length) {
    console.error("CSV vide");
    process.exit(1);
  }

  const header = rows[0];
  const expectedHeader = [
    "id",
    "theme",
    "difficulty",
    "question",
    "choices",
    "correct_index",
    "explanation",
    "is_active",
    "created_at",
  ];
  const headerOk = expectedHeader.every((h, idx) => header[idx] === h);
  const lines = [];
  lines.push(`Fichier: ${inputPath}`);
  lines.push(`Lignes parsées (avec en-tête): ${rows.length}`);
  lines.push(`En-tête Supabase attendu: ${headerOk ? "OK" : "DIFFÉRENT — vérifie l'export"}`);
  if (!headerOk) {
    lines.push(`En-tête trouvé: ${header.join(" | ")}`);
  }
  lines.push("");

  const dataRows = rows.slice(1);
  const issues = [];
  const validRows = [];
  const seenId = new Map();
  const seenQuestion = new Map();

  for (let i = 0; i < dataRows.length; i++) {
    const cols = dataRows[i];
    const lineNo = i + 2;
    const { errs } = validateRow(cols, lineNo);
    const id = cols[0];
    const qtext = (cols[3] ?? "").trim().toLowerCase();

    if (seenId.has(id)) {
      errs.push(`doublon id (ligne ${seenId.get(id)} et ${lineNo})`);
    } else {
      seenId.set(id, lineNo);
    }
    if (qtext) {
      if (seenQuestion.has(qtext)) {
        errs.push(`doublon question texte (ligne ${seenQuestion.get(qtext)} et ${lineNo})`);
      } else {
        seenQuestion.set(qtext, lineNo);
      }
    }

    if (errs.length) {
      issues.push({ lineNo, id: id?.slice(0, 8), errs });
    } else {
      validRows.push(cols);
    }
  }

  lines.push(`Lignes données: ${dataRows.length}`);
  lines.push(`Valides: ${validRows.length}`);
  lines.push(`Avec erreurs: ${issues.length}`);
  lines.push("");

  if (issues.length) {
    lines.push("--- Détail des problèmes ---");
    for (const it of issues.slice(0, 200)) {
      lines.push(`Ligne ${it.lineNo} (${it.id}…): ${it.errs.join("; ")}`);
    }
    if (issues.length > 200) {
      lines.push(`… et ${issues.length - 200} autres lignes avec erreurs`);
    }
    lines.push("");
  }

  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");

  const out = [expectedHeader.join(",")];
  for (const cols of validRows) {
    out.push(rowToLine(cols).trimEnd());
  }
  fs.writeFileSync(cleanedPath, out.join("\n") + "\n", "utf8");

  console.log(lines.join("\n"));
  console.log("\nRapport écrit:", reportPath);
  console.log("CSV nettoyé (lignes valides uniquement):", cleanedPath);
}

main();

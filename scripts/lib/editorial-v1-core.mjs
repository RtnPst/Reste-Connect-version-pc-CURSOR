import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const outDir = resolve(root, "exports/dedup-audit");

export function ensureOutDir() {
  mkdirSync(outDir, { recursive: true });
}

export function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function loadCsvRows(path) {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8").replace(/\r/g, "").trim();
  if (!text) return [];
  const lines = text.split("\n");
  if (lines.length <= 1) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

export function writeCsvPair(prefix, headers, rows) {
  const stamp = nowStamp();
  const csvBody = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
  ].join("\n");
  const stamped = join(outDir, `${prefix}-${stamp}.csv`);
  const latest = join(outDir, `${prefix}-latest.csv`);
  writeFileSync(stamped, csvBody, "utf8");
  writeFileSync(latest, csvBody, "utf8");
  return { stamped, latest };
}

export function writeJsonPair(prefix, payload) {
  const stamp = nowStamp();
  const stamped = join(outDir, `${prefix}-${stamp}.json`);
  const latest = join(outDir, `${prefix}-latest.json`);
  writeFileSync(stamped, JSON.stringify(payload, null, 2), "utf8");
  writeFileSync(latest, JSON.stringify(payload, null, 2), "utf8");
  return { stamped, latest };
}

export function loadJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

export function normalizeDecision(raw) {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "approve" || v === "reject" || v === "merge" || v === "watchlist") return v;
  return "";
}

export function splitFlags(value) {
  return String(value ?? "")
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function fileAgeDays(path) {
  if (!existsSync(path)) return null;
  const mtime = statSync(path).mtimeMs;
  const ageMs = Date.now() - mtime;
  return Number((ageMs / (1000 * 60 * 60 * 24)).toFixed(2));
}

export function scoreFreshnessLabel(label) {
  const v = String(label ?? "").trim().toLowerCase();
  if (v === "recent") return 85;
  if (v === "active") return 80;
  if (v === "stable") return 75;
  if (v === "to_review") return 55;
  if (v === "stale") return 25;
  return 50;
}

export function volatilityPenalty(durability) {
  const v = String(durability ?? "").trim().toLowerCase();
  if (v === "micro_trend") return 25;
  if (v === "seasonal") return 10;
  if (v === "evergreen") return 0;
  return 15;
}


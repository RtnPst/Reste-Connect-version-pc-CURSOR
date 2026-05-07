/**
 * Vérifie que le .env local contient les variables Supabase et qu’on peut joindre le projet (lecture seule).
 * N’affiche jamais de clés secrètes.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

function loadEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

function normalizeUrl(raw) {
  const base = String(raw ?? "")
    .trim()
    .split(/[?#]/)[0]
    .replace(/\/+$/, "");
  return base ? `${base}/` : "";
}

const env = loadEnv(envPath);
const url = normalizeUrl(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "");
const anon = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY ?? "").trim();
const service = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

const report = {
  envFile: envPath,
  envFileExists: existsSync(envPath),
  viteSupabaseUrl: Boolean(url),
  publishableKey: Boolean(anon),
  serviceRoleKey: Boolean(service),
  connectivity: null,
  hint: null,
};

if (!existsSync(envPath)) {
  report.hint = "Crée un fichier .env à la racine du projet (copie depuis .env.example si tu en as un).";
} else if (!url) {
  report.hint = "Ajoute VITE_SUPABASE_URL (ou SUPABASE_URL) dans .env.";
} else if (!anon) {
  report.hint = "Ajoute VITE_SUPABASE_PUBLISHABLE_KEY (ou SUPABASE_PUBLISHABLE_KEY) dans .env.";
}

if (url && anon) {
  try {
    const supabase = createClient(url, anon, { auth: { persistSession: false } });
    const { count, error } = await supabase
      .from("questions")
      .select("*", { count: "exact", head: true });
    if (error) {
      report.connectivity = { ok: false, error: error.message };
    } else {
      report.connectivity = { ok: true, questionsCount: count ?? 0 };
    }
  } catch (e) {
    report.connectivity = { ok: false, error: String(e?.message ?? e) };
  }
}

if (!service && report.connectivity?.ok) {
  report.hint =
    (report.hint ? report.hint + " " : "") +
    "SUPABASE_SERVICE_ROLE_KEY manquante : l’app client fonctionne, mais import IA / scripts admin serveur peuvent échouer.";
}

console.log(JSON.stringify(report, null, 2));

const ok =
  report.envFileExists &&
  report.viteSupabaseUrl &&
  report.publishableKey &&
  report.connectivity?.ok;
process.exit(ok ? 0 : 1);

/**
 * Vérification read-only de l'état prod/staging Supabase pour les fondations concept.
 * N'affiche jamais de secrets. Sortie JSON + résumé lisible.
 *
 * Usage: npm run verify:concept-foundation
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

/** Une ligne du pilote ultra-safe — si elle matche, le backfill pilote est appliqué. */
const PILOT_PROBE = {
  question_id: "03301bf8-9984-4521-92a3-85492f30fe68",
  expected_concept_key: "double_text",
};

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
const service = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const anon = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY ?? "").trim();

const report = {
  checked_at: new Date().toISOString(),
  env_file_exists: existsSync(envPath),
  supabase_url_configured: Boolean(url),
  service_role_configured: Boolean(service),
  connectivity_ok: false,
  concept_key_column: "unknown",
  pilot_backfill: "unknown",
  live_questions_total: null,
  live_with_concept_key: null,
  distinct_concept_keys_live: null,
  user_concepts_seen_table: "unknown",
  recommended_next_step: null,
  errors: [],
};

function recommend() {
  if (!report.env_file_exists || !url) {
    report.recommended_next_step =
      "Configurer .env (VITE_SUPABASE_URL) puis relancer npm run verify:concept-foundation";
    return;
  }
  if (!report.connectivity_ok) {
    report.recommended_next_step =
      "Connexion impossible : vérifier réseau, URL Supabase, clés. Ou utiliser le guide SQL dans docs/foundation/PROD_VERIFICATION_GUIDE.md";
    return;
  }
  if (report.concept_key_column !== "present") {
    report.recommended_next_step =
      "Appliquer la migration colonne concept_key (20260509090000) via supabase db push — voir docs/foundation/PROD_VERIFICATION_GUIDE.md";
    return;
  }
  if (report.pilot_backfill !== "applied") {
    report.recommended_next_step =
      "Colonne OK mais pilote 40 lignes non confirmé : appliquer 20260509120500 ou valider manuellement — ne pas coder concepts_seen avant ça";
    return;
  }
  if (report.user_concepts_seen_table === "missing") {
    report.recommended_next_step =
      "Fondations DB prêtes pour le sprint app : démarrer PR foundation/02 (RPC) puis foundation/03 (user_concepts_seen)";
    return;
  }
  report.recommended_next_step =
    "Fondations DB déjà avancées : poursuivre séquence app (daily exit, shell) selon docs/foundation/EXECUTION_SEQUENCE.md";
}

async function main() {
  const key = service || anon;
  if (!url || !key) {
    report.errors.push("URL ou clé Supabase manquante dans .env");
    recommend();
    printAndExit(report);
    return;
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { count: liveTotal, error: liveErr } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("status", "live");

  if (liveErr) {
    report.errors.push(`questions live count: ${liveErr.message}`);
    if (liveErr.message?.includes("fetch")) {
      recommend();
      printAndExit(report);
      return;
    }
  } else {
    report.connectivity_ok = true;
    report.live_questions_total = liveTotal ?? 0;
  }

  const { data: probeRow, error: probeErr } = await supabase
    .from("questions")
    .select("id, concept_key, status")
    .eq("id", PILOT_PROBE.question_id)
    .maybeSingle();

  if (probeErr) {
    const msg = probeErr.message ?? String(probeErr);
    report.errors.push(`concept_key probe: ${msg}`);
    if (/concept_key/i.test(msg) && /column|schema|does not exist/i.test(msg)) {
      report.concept_key_column = "missing";
    }
  } else {
    report.concept_key_column = "present";
    if (probeRow?.concept_key === PILOT_PROBE.expected_concept_key) {
      report.pilot_backfill = "applied";
    } else if (probeRow?.concept_key == null) {
      report.pilot_backfill = "not_applied";
    } else {
      report.pilot_backfill = "mismatch";
      report.errors.push(
        `Pilote probe: attendu ${PILOT_PROBE.expected_concept_key}, reçu ${probeRow?.concept_key ?? "null"}`,
      );
    }
  }

  if (report.concept_key_column === "present") {
    const { count: withKey, error: withKeyErr } = await supabase
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("status", "live")
      .not("concept_key", "is", null);

    if (!withKeyErr) report.live_with_concept_key = withKey ?? 0;
    else report.errors.push(`live with concept_key: ${withKeyErr.message}`);

    const { data: distinctRows, error: distinctErr } = await supabase
      .from("questions")
      .select("concept_key")
      .eq("status", "live")
      .not("concept_key", "is", null)
      .limit(5000);

    if (!distinctErr && distinctRows) {
      report.distinct_concept_keys_live = new Set(
        distinctRows.map((r) => r.concept_key).filter(Boolean),
      ).size;
    }
  }

  const { error: seenErr } = await supabase.from("user_concepts_seen").select("user_id", { head: true, count: "exact" });
  if (seenErr) {
    if (/relation|does not exist|schema cache/i.test(seenErr.message ?? "")) {
      report.user_concepts_seen_table = "missing";
    } else {
      report.user_concepts_seen_table = "unknown";
      report.errors.push(`user_concepts_seen: ${seenErr.message}`);
    }
  } else {
    report.user_concepts_seen_table = "present";
  }

  recommend();
  printAndExit(report);
}

function printAndExit(report) {
  const outDir = resolve(root, "exports/foundation");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "concept-foundation-status-latest.json");
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(report, null, 2));
  console.log("");
  console.log("── Résumé ──");
  console.log(`Connexion Supabase     : ${report.connectivity_ok ? "OK" : "échec"}`);
  console.log(`Colonne concept_key    : ${report.concept_key_column}`);
  console.log(`Backfill pilote (40)   : ${report.pilot_backfill}`);
  console.log(`Questions live         : ${report.live_questions_total ?? "?"}`);
  console.log(`Live avec concept_key  : ${report.live_with_concept_key ?? "?"}`);
  console.log(`Table concepts_seen    : ${report.user_concepts_seen_table}`);
  console.log("");
  console.log(`Prochaine étape        : ${report.recommended_next_step ?? "—"}`);
  console.log(`Rapport enregistré     : ${outPath}`);

  const ok =
    report.connectivity_ok &&
    report.concept_key_column === "present" &&
    report.pilot_backfill === "applied";
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  report.errors.push(String(e?.message ?? e));
  recommend();
  printAndExit(report);
});

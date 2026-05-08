/**
 * Build Tech pilot batch v1 export from tech-theme-audit-latest.json.
 * Read-only regarding DB — writes JSON + CSV under exports/tech-theme-audit/.
 *
 * Usage:
 *   node scripts/build-tech-pilot-batch-v1.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { csvEscape } from "./lib/exact-dup-critical-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const auditPath = resolve(root, "exports/tech-theme-audit/tech-theme-audit-latest.json");
const outDir = resolve(root, "exports/tech-theme-audit");

/** Order matters — editorial pilot sequence. */
const PILOT_DEFINITION = [
  {
    id: "077c75b7-6fd8-43b2-8a2d-8a429c97037e",
    reason:
      'Cloud / stockage en ligne — socle numérique ; une seule carte « cloud » pour éviter les formulations redondantes du même export.',
  },
  {
    id: "6046d83b-5a8a-4368-8aee-e13f12039e80",
    reason:
      "Wi‑Fi — entrée unique sur le concept (évite les quasi-doublons wifi/Wi‑Fi du même audit).",
  },
  {
    id: "1fde6c35-e7f4-41a7-8538-454b3674a78e",
    reason: 'OS — vocabulaire téléphone indispensable pour le parcours.',
  },
  {
    id: "75a1ca57-7eb9-41a2-9978-ba5dbd745345",
    reason: "2FA — sécurité des comptes, aligné valeur « Tech & IA ».",
  },
  {
    id: "4cb0690d-7989-425b-9443-70d0dd2f2841",
    reason:
      'Phishing — une seule carte « phishing » à ce stade (évite les variantes plus difficiles redondantes).',
  },
  {
    id: "9264438a-62e1-4a7d-9e8a-56b8f945a0f3",
    reason: "Scénario email / banque — complète la carte phishing sans duplication de concept.",
  },
  {
    id: "6c439ee5-e5a8-47b6-913d-a5b1ed57ad97",
    reason:
      "Google Maps — une seule entrée cartographie (évite les variantes « que fait-on » / « but GPS » du même pool).",
  },
  {
    id: "8ec1b444-403e-43aa-91c5-87905c085d36",
    reason: "Mises à jour — hygiène et sécurité, formulation très accessible.",
  },
  {
    id: "1aaa76ce-1ddc-4b0b-8b8d-f1aaa8b24db3",
    reason: "Mode avion — universel et court.",
  },
  {
    id: "8b9767f7-5090-4b2c-b877-a2216288a63a",
    reason: "Écran tactile — cohérent avec l’usage mobile de l’app.",
  },
  {
    id: "756d61d5-dc35-4797-a9cf-d75148ec93cd",
    reason: "iPhone vs Android — ancrage moderne sur les écosystèmes.",
  },
  {
    id: "fd04d847-4b4c-4981-acb6-11ce361a08ed",
    reason:
      'QR code — « Que fait… » : texte normalisé distinct des paires « Qu’est-ce qu’un QR code » encore en duplicate_suspicious.',
  },
  {
    id: "880c038f-66af-4eaf-b4c6-dcbbc96aa79b",
    reason:
      "Assistants vocaux — pont « IA grand public » sans piocher le lot ai_pipeline (revue séparée).",
  },
  {
    id: "18b88d74-16ef-4458-9084-27328abac1a8",
    reason: "5G — infra actuelle ; version moyen (évite la fiche 5G difficile redondante).",
  },
  {
    id: "42c1f695-63bd-454c-8a50-ca3a4c4e00e9",
    reason: "Mo / Go / To — littératie stockage, utile et non redondante avec le reste du pilote.",
  },
];

function main() {
  if (!existsSync(auditPath)) {
    console.error("Missing audit. Run: npm run audit:tech-theme -- --write-latest");
    process.exit(1);
  }

  const audit = JSON.parse(readFileSync(auditPath, "utf8"));
  const byId = new Map(audit.records.map((r) => [r.id, r]));

  const rows = [];
  for (let i = 0; i < PILOT_DEFINITION.length; i++) {
    const def = PILOT_DEFINITION[i];
    const r = byId.get(def.id);
    if (!r) {
      console.error("Missing audit row for id:", def.id);
      process.exit(1);
    }
    if (r.primary_bucket !== "likely_good") {
      console.warn("[WARN] Row no longer likely_good:", def.id, r.primary_bucket);
    }
    rows.push({
      ...r,
      selection_reason: def.reason,
      selection_order: i + 1,
    });
  }

  const payload = {
    meta: {
      version: "v1",
      created_at: new Date().toISOString(),
      source_audit: "exports/tech-theme-audit/tech-theme-audit-latest.json",
      pilot_size: rows.length,
      criteria:
        "likely_good only; dup_tech_sibling_ids and dup_other_themes empty in audit; conceptual de-dup inside pilot; hors duplicate_suspicious / ai_pipeline / outdated",
    },
    excluded_from_pool_examples: [
      "Questions duplicate_suspicious (23) — hors premier pilote.",
      "Lot ai_pipeline (6) — revue éditoriale séparée avant mise en ligne groupée.",
      "57ad70c1 — Facebook/Instagram comme réseaux sociaux (mieux dans reseaux_sociaux).",
      "30db58cf — métavers (définition encore peu stable pour grand public).",
      "dfdcc823 — open source (niche pour un premier pilote grand public).",
      "Multiples variantes Wi‑Fi / cloud / Maps / 2FA / tablette dans likely_good — une seule carte retenue par concept.",
    ],
    rollback_note:
      "Avant UPDATE : sauver la liste d’UUID ; rollback = repasser ces lignes en archived + is_active false.",
    activation_note:
      "UPDATE uniquement les UUID listés → status live, is_active true ; pas d’activation hors liste.",
    rows,
  };

  mkdirSync(outDir, { recursive: true });
  const jsonOut = resolve(outDir, "tech-pilot-batch-v1.json");
  writeFileSync(jsonOut, JSON.stringify(payload, null, 2), "utf8");

  const headers = [
    "selection_order",
    "id",
    "question",
    "difficulty",
    "primary_bucket",
    "restore_estimate",
    "selection_reason",
    "human_final_ok",
    "human_notes",
  ];
  const csvLines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.selection_order,
        r.id,
        csvEscape(r.question),
        csvEscape(r.difficulty),
        csvEscape(r.primary_bucket),
        csvEscape(r.restore_estimate),
        csvEscape(r.selection_reason),
        "",
        "",
      ].join(","),
    ),
  ];
  const csvOut = resolve(outDir, "tech-pilot-batch-v1.csv");
  writeFileSync(csvOut, csvLines.join("\n"), "utf8");

  const latestCsv = resolve(outDir, "tech-pilot-batch-v1-latest.csv");
  writeFileSync(latestCsv, csvLines.join("\n"), "utf8");

  console.log("Wrote:", jsonOut);
  console.log("Wrote:", csvOut);
  console.log("Wrote:", latestCsv);
  console.log("Rows:", rows.length);
}

main();

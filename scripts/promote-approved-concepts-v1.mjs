/**
 * Promote approved intake concepts → labels + cultural-pack drafts.
 *
 * Dry-run by default. Pass --apply to write files.
 * Never writes to Supabase.
 *
 * Usage:
 *   node scripts/promote-approved-concepts-v1.mjs
 *   node scripts/promote-approved-concepts-v1.mjs --apply
 *   node scripts/promote-approved-concepts-v1.mjs --apply --only=brainrot,delulu
 */
import { resolve } from "node:path";
import {
  loadJson,
  root,
  scoreAuthenticity,
  stampIso,
  titleCaseLabel,
  toConceptSlug,
  writeJson,
} from "./lib/concept-pipeline-utils.mjs";

const APPLY = process.argv.includes("--apply");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg
  ? onlyArg
      .slice("--only=".length)
      .split(",")
      .map((s) => toConceptSlug(s))
      .filter(Boolean)
  : null;

const decisionPath = resolve(
  root,
  "exports/dedup-audit/concept-intake-v1-decision-summary-latest.json",
);
const signalsPath = resolve(root, "scripts/data/concept-intake-raw-signals-v1.json");
const labelsPath = resolve(root, "src/data/concept-labels-v1.json");
const packPath = resolve(root, "src/data/cultural-pack-v1.json");
const outReportDir = resolve(root, "exports/foundation");

const decisions = loadJson(decisionPath);
const signals = loadJson(signalsPath, { raw_signals: [] });
const labels = loadJson(labelsPath, {});
const pack = loadJson(packPath, { concepts: [] });

const signalByKey = new Map();
for (const s of signals.raw_signals ?? []) {
  signalByKey.set(toConceptSlug(s.suggested_concept_key ?? s.raw_term), s);
}

const approved = (decisions?.approved_concepts_summary ?? []).filter((row) => {
  const key = toConceptSlug(row.suggested_concept_key);
  if (!key) return false;
  if (only && !only.includes(key)) return false;
  return true;
});

const packKeys = new Set((pack.concepts ?? []).map((c) => toConceptSlug(c.concept_key)));
const planned = [];

for (const row of approved) {
  const key = toConceptSlug(row.suggested_concept_key);
  const signal = signalByKey.get(key) ?? { raw_term: row.raw_term };
  const auth = scoreAuthenticity(
    {
      raw_term: row.raw_term,
      example_usage: signal.example_usage,
      short_definition: signal.short_definition,
      trend_durability: signal.trend_durability,
    },
    null,
  );

  const labelExists = Object.prototype.hasOwnProperty.call(labels, key);
  const packExists = packKeys.has(key);
  const label = titleCaseLabel(row.raw_term || key.replace(/_/g, " "));

  const packDraft = {
    concept_key: key,
    canonical_label: label,
    editorial_tier: "accessible",
    editorial_status: "draft",
    usage_vitality: auth.suggested_usage_vitality === "theoretical" ? "living" : auth.suggested_usage_vitality,
    import_confidence: auth.authenticity_gate === "block_drafts" ? "low" : "medium",
    source_tier: "intake_raw",
    glossary_only: false,
    surface_forms: [String(row.raw_term ?? key).toLowerCase(), ...(signal.aliases ?? [])].filter(
      Boolean,
    ),
    variants: [String(row.raw_term ?? key)],
    short_definition:
      signal.short_definition ||
      `Usage internet courant de « ${row.raw_term} » — définition à peaufiner en review.`,
    long_definition:
      signal.short_definition ||
      `Terme promu depuis concept intake v1. Scène type : ${signal.example_usage || "à documenter"}.`,
    cluster_tags: ["internet_social_code"],
    lifecycle: "emerging",
    platforms: ["tiktok", "instagram", "whatsapp"],
    social_vibe: "ironic",
    irony: "often_ironic",
    cringe_risk: "medium",
    generativity: "medium",
    default_theme_hint: row.suggested_theme || "reseaux_sociaux",
    context_pack: {
      credible_messages: signal.example_usage ? [signal.example_usage] : [],
      credible_contexts: ["groupe_pote", "commentaire", "story"],
      avoid_scenes: ["parent_explique_le_mot", "cours_glossaire", "journaliste_gen_z"],
      likely_speakers: ["pote_16_30"],
      unlikely_speakers: ["grand_parent_sans_reseaux"],
      real_vs_glossary: "real",
      example_usage: signal.example_usage ? [signal.example_usage] : [],
    },
    sources: [{ id: "concept_intake_v1", note: row.human_notes || "approved intake" }],
    ia_notes: `Promu depuis intake. Gate authenticité: ${auth.authenticity_gate}. Flags: ${auth.authenticity_flags || "none"}. Pas golden_reference tant que review lot non faite.`,
    human_notes: row.human_notes || "",
  };

  planned.push({
    concept_key: key,
    actions: {
      add_label: !labelExists,
      add_pack_draft: !packExists,
      skip_reason:
        labelExists && packExists
          ? "already_present"
          : auth.authenticity_gate === "block_drafts"
            ? "authenticity_block_soft_override_allowed"
            : "",
    },
    authenticity: auth,
    label,
    pack_draft: packDraft,
  });
}

if (APPLY) {
  let labelsChanged = false;
  let packChanged = false;
  for (const item of planned) {
    if (item.actions.add_label) {
      labels[item.concept_key] = item.label;
      labelsChanged = true;
    }
    if (item.actions.add_pack_draft) {
      pack.concepts.push(item.pack_draft);
      packChanged = true;
    }
  }
  if (labelsChanged) {
    const sorted = Object.fromEntries(
      Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)),
    );
    writeJson(labelsPath, sorted);
  }
  if (packChanged) {
    pack.updated_at = new Date().toISOString().slice(0, 10);
    writeJson(packPath, pack);
  }
}

const report = {
  generated_at: new Date().toISOString(),
  mode: APPLY ? "apply" : "dry_run",
  policy: "promote_approved_v1_no_db",
  planned_count: planned.length,
  planned: planned.map((p) => ({
    concept_key: p.concept_key,
    label: p.label,
    actions: p.actions,
    authenticity_gate: p.authenticity.authenticity_gate,
    suggested_usage_vitality: p.authenticity.suggested_usage_vitality,
  })),
};

const stamp = stampIso();
writeJson(resolve(outReportDir, "concept-promote-v1-latest.json"), report);
writeJson(resolve(outReportDir, `concept-promote-v1-${stamp}.json`), report);

console.log(JSON.stringify(report, null, 2));
if (!APPLY) {
  console.log("\nDry-run only. Re-run with --apply to write labels + pack drafts.");
}

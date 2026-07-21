/**
 * Build a review-only question lot for promoted concepts (no DB import).
 * Creates ratio-style pilot JSON under src/data/ + export CSV.
 *
 * Usage:
 *   node scripts/build-question-lot-from-approved-v1.mjs
 *   node scripts/build-question-lot-from-approved-v1.mjs --only=brainrot,delulu
 */
import { resolve } from "node:path";
import {
  loadJson,
  root,
  stampIso,
  toConceptSlug,
  writeCsv,
  writeJson,
} from "./lib/concept-pipeline-utils.mjs";

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg
  ? onlyArg
      .slice("--only=".length)
      .split(",")
      .map((s) => toConceptSlug(s))
      .filter(Boolean)
  : ["brainrot", "delulu"];

const LOTS = {
  brainrot: {
    concept_key: "brainrot",
    theme: "reseaux_sociaux",
    label: "Brainrot",
    questions: [
      {
        difficulty: "moyen",
        question:
          "Ton pote te dit : « J’ai scrollé 3h d’edits, je suis en plein brainrot. » Il parle surtout de…",
        choices: [
          "Un trop-plein de contenus qui lui tourne encore dans la tête",
          "Un virus qui efface ses apps",
          "Une méthode pour réviser plus vite",
          "Un réglage qui coupe les notifs",
        ],
        correct_index: 0,
        explanation:
          "« Brainrot », c’est le sentiment d’avoir le cerveau saturé par des contenus ultra-répétitifs — pas un bug technique.",
        context: "group_chat",
      },
      {
        difficulty: "moyen",
        question: "Quel message sonne le plus naturel avec « brainrot » ?",
        choices: [
          "Mon feed est full brainrot depuis ce matin.",
          "Active le brainrot dans les réglages Wi-Fi.",
          "Le brainrot est une appli bancaire.",
          "Brainrot = traduction automatique.",
        ],
        correct_index: 0,
        explanation: "On l’utilise pour parler d’un feed / d’une session qui te « pourrit » un peu le cerveau.",
        context: "story_reply",
      },
    ],
  },
  delulu: {
    concept_key: "delulu",
    theme: "reseaux_sociaux",
    label: "Delulu",
    questions: [
      {
        difficulty: "facile",
        question:
          "Elle dit : « Il a liké ma story, on va se marier — ok je suis un peu delulu. » Delulu, c’est plutôt…",
        choices: [
          "Se raconter un film un peu trop beau / irréaliste",
          "Vérifier trois sources avant de conclure",
          "Être experte cybersécurité",
          "Couper complètement les réseaux",
        ],
        correct_index: 0,
        explanation:
          "« Delulu » (de delusional) = tu te racontes une belle histoire, souvent dit avec auto-dérision.",
        context: "group_chat",
      },
      {
        difficulty: "moyen",
        question: "Quel usage de « delulu » colle le mieux ?",
        choices: [
          "Il m’a répondu « lol », c’est sûr qu’il kiffe — je suis peut-être delulu.",
          "J’ai payé mon abonnement, c’est delulu.",
          "Mon wifi coupe, c’est delulu.",
          "J’ai relu le contrat deux fois, je suis delulu.",
        ],
        correct_index: 0,
        explanation: "Le mot pointe une projection amoureuse / sociale un peu fantasmée.",
        context: "dating_debrief",
      },
    ],
  },
};

const outDir = resolve(root, "exports/dedup-audit");
const dataDir = resolve(root, "src/data");
const allQuestions = [];
const pilots = [];

for (const key of only) {
  const lot = LOTS[key];
  if (!lot) {
    console.warn("No hard-authored lot for", key, "— skip");
    continue;
  }
  const pilot = {
    pilot_id: `${key}-intake-promote-v1`,
    concept_key: lot.concept_key,
    pack_ref: "cultural-pack-v1.json",
    status: "draft_review",
    notes:
      "Lot promu depuis intake approve. Pas d’import Supabase auto — review humaine puis insert admin ciblé.",
    questions: lot.questions.map((q) => ({
      concept_key: lot.concept_key,
      theme: lot.theme,
      difficulty: q.difficulty,
      status: "draft",
      question: q.question,
      choices: q.choices,
      correct_index: q.correct_index,
      explanation: q.explanation,
      tone: "social",
      context: q.context,
      trap_intensity: "soft_trap",
      era: "tiktok",
      format: "scenario_text",
      internet_level: "debutant",
      editor_notes: `Pilot ${lot.label} — authenticity scene check required before live.`,
    })),
  };
  pilots.push(pilot);
  writeJson(resolve(dataDir, `${key}-pilot-questions-v1.json`), pilot);
  for (const q of pilot.questions) allQuestions.push({ ...q, label: lot.label });
}

const stamp = stampIso();
const rows = allQuestions.map((q, i) => ({
  lot_index: i + 1,
  concept_key: q.concept_key,
  theme: q.theme,
  difficulty: q.difficulty,
  question: q.question,
  choice_a: q.choices[0],
  choice_b: q.choices[1],
  choice_c: q.choices[2],
  choice_d: q.choices[3],
  correct_index: q.correct_index,
  explanation: q.explanation,
  human_decision: "",
  human_notes: "",
}));

const doc = {
  generated_at: new Date().toISOString(),
  policy: "question_lot_v1_review_only_no_import",
  concept_keys: only,
  question_count: rows.length,
  pilot_files: pilots.map((p) => `src/data/${p.concept_key}-pilot-questions-v1.json`),
  questions: rows,
};

writeJson(resolve(outDir, "question-lot-promote-v1-latest.json"), doc);
writeJson(resolve(outDir, `question-lot-promote-v1-${stamp}.json`), doc);
writeCsv(
  resolve(outDir, "question-lot-promote-v1-latest.csv"),
  [
    "lot_index",
    "concept_key",
    "theme",
    "difficulty",
    "question",
    "choice_a",
    "choice_b",
    "choice_c",
    "choice_d",
    "correct_index",
    "explanation",
    "human_decision",
    "human_notes",
  ],
  rows,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      question_count: rows.length,
      pilot_files: doc.pilot_files,
      next: "Review CSV → admin insert only after human OK (never import:new-questions mass).",
    },
    null,
    2,
  ),
);

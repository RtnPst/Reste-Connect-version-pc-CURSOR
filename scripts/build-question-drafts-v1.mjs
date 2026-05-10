/**
 * Question Draft Generation v1 (review-only pilot).
 *
 * Input:
 *   exports/dedup-audit/concept-intake-v1-decision-summary-latest.json
 *
 * Output:
 *   exports/dedup-audit/question-drafts-v1-review-latest.csv
 *   exports/dedup-audit/question-drafts-v1-review-latest.json
 *   timestamped copies with same prefix
 *
 * Rules:
 *   - Use approved concepts only
 *   - 2 drafts per approved concept
 *   - Max 4 questions total in this pilot
 *   - No DB writes/imports/migrations/publishing
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = resolve(
  root,
  "exports/dedup-audit/concept-intake-v1-decision-summary-latest.json",
);
const outDir = resolve(root, "exports/dedup-audit");

function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function parseApprovedConcepts(doc) {
  const rows = Array.isArray(doc?.approved_concepts_summary) ? doc.approved_concepts_summary : [];
  const concepts = [];
  for (const row of rows) {
    const conceptKey = String(row.suggested_concept_key ?? "").trim();
    if (!conceptKey) continue;
    concepts.push({
      concept_key: conceptKey,
      suggested_theme: String(row.suggested_theme ?? "culture_pop"),
      confidence: String(row.confidence ?? "medium"),
      intake_risk_flags: String(row.risk_flags ?? ""),
    });
  }
  return concepts;
}

function draftSetForConcept(concept) {
  const key = concept.concept_key;
  const theme = concept.suggested_theme || "culture_pop";

  if (key === "brainrot") {
    return [
      {
        question_type: "definition_style",
        difficulty: "moyen",
        question: "Dans le langage web, « brainrot » désigne surtout…",
        choices: [
          "Une obsession pour des contenus très répétitifs qui te saturent le cerveau",
          "Une technique officielle pour mieux mémoriser un cours",
          "Un réglage d’algorithme qui bloque les pubs",
          "Un bug de téléphone qui efface les vidéos",
        ],
        correct_index: 0,
        explanation:
          "« Brainrot » décrit une surconsommation de contenus qui finissent par envahir ton vocabulaire et tes refs.",
      },
      {
        question_type: "context_usage",
        difficulty: "moyen",
        question: "Quel usage de « brainrot » sonne le plus juste ?",
        choices: [
          "Depuis trois jours je regarde les mêmes edits, mon cerveau est en brainrot.",
          "Passe-moi le brainrot pour recharger mon téléphone.",
          "J’ai activé le brainrot pour traduire l’anglais.",
          "Le brainrot est une appli de banque.",
        ],
        correct_index: 0,
        explanation: "On l’utilise pour parler d’un trop-plein de contenu web qui te hante un peu.",
      },
    ];
  }

  if (key === "delulu") {
    return [
      {
        question_type: "definition_style",
        difficulty: "facile",
        question: "« Delulu » veut dire qu’une personne est plutôt…",
        choices: [
          "Un peu dans son film, avec une vision très optimiste ou irréaliste",
          "Très méthodique et factuelle dans ses décisions",
          "Experte en cybersécurité",
          "Complètement hors ligne des réseaux",
        ],
        correct_index: 0,
        explanation:
          "« Delulu » vient de « delusional » et s’emploie souvent de façon légère pour dire « tu te racontes une belle histoire ».",
      },
      {
        question_type: "context_usage",
        difficulty: "moyen",
        question: "Quel exemple correspond le mieux à « delulu » ?",
        choices: [
          "Il m’a likée une story, c’est sûr on va se marier : je suis peut-être delulu.",
          "J’ai vérifié trois sources avant de conclure, je suis delulu.",
          "J’ai payé mon abonnement, c’est delulu.",
          "Mon wifi coupe, c’est delulu.",
        ],
        correct_index: 0,
        explanation: "Le terme s’emploie quand on reconnaît une projection un peu irréaliste.",
      },
    ];
  }

  // Generic safe fallback for future approved concepts.
  return [
    {
      question_type: "definition_style",
      difficulty: "moyen",
      question: `Dans le langage web, « ${key} » désigne plutôt…`,
      choices: [
        "Un terme d’usage internet lié à des codes sociaux ou culturels en ligne",
        "Une norme juridique officielle de l’Union européenne",
        "Une fonctionnalité matérielle des smartphones",
        "Une commande universelle pour réparer un ordinateur",
      ],
      correct_index: 0,
      explanation: `Draft à affiner: vérifier la définition éditoriale exacte de « ${key} ».`,
    },
    {
      question_type: "context_usage",
      difficulty: "moyen",
      question: `Quel usage de « ${key} » sonne le plus naturel ?`,
      choices: [
        `Sur les réseaux, ce mot est utilisé en contexte social: « ${key} ».`,
        `${key} est le nom obligatoire d'une prise USB.`,
        `${key} est une unité de mesure scientifique.`,
        `${key} est un mode avion secret.`,
      ],
      correct_index: 0,
      explanation: "Draft contextuel à réécrire après validation du sens précis.",
    },
  ];
}

function main() {
  if (!existsSync(inputPath)) {
    console.error("Missing input:", inputPath);
    process.exit(1);
  }
  const doc = JSON.parse(readFileSync(inputPath, "utf8"));
  const approvedConcepts = parseApprovedConcepts(doc);
  const limitedConcepts = approvedConcepts.slice(0, 2); // pilot guard

  const rows = [];
  for (const concept of limitedConcepts) {
    const drafts = draftSetForConcept(concept).slice(0, 2);
    for (let i = 0; i < drafts.length; i += 1) {
      if (rows.length >= 4) break;
      const draft = drafts[i];
      const collisionNotes = [
        `concept_key=${concept.concept_key}`,
        "exact_duplicate_check=pending_editorial_review",
        "semantic_collision_check=pending_editorial_review",
      ].join("; ");
      rows.push({
        concept_key: concept.concept_key,
        question_type: draft.question_type,
        suggested_theme: concept.suggested_theme,
        difficulty: draft.difficulty,
        question: draft.question,
        choice_1: draft.choices[0],
        choice_2: draft.choices[1],
        choice_3: draft.choices[2],
        choice_4: draft.choices[3],
        correct_index: String(draft.correct_index),
        explanation: draft.explanation,
        tone_risk_notes: `intake_confidence=${concept.confidence}; intake_risk_flags=${concept.intake_risk_flags || "none"}`,
        duplicate_collision_notes: collisionNotes,
        human_decision: "",
        human_notes: "",
      });
    }
  }

  rows.sort((a, b) => {
    const c = a.concept_key.localeCompare(b.concept_key);
    if (c !== 0) return c;
    return a.question_type.localeCompare(b.question_type);
  });

  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const headers = [
    "concept_key",
    "question_type",
    "suggested_theme",
    "difficulty",
    "question",
    "choice_1",
    "choice_2",
    "choice_3",
    "choice_4",
    "correct_index",
    "explanation",
    "tone_risk_notes",
    "duplicate_collision_notes",
    "human_decision",
    "human_notes",
  ];
  const csvBody = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
  ].join("\n");
  const csvStamped = join(outDir, `question-drafts-v1-review-${stamp}.csv`);
  const csvLatest = join(outDir, "question-drafts-v1-review-latest.csv");
  writeFileSync(csvStamped, csvBody, "utf8");
  writeFileSync(csvLatest, csvBody, "utf8");

  const payload = {
    generated_at: new Date().toISOString(),
    policy: "question_drafts_v1_review_only",
    input: "exports/dedup-audit/concept-intake-v1-decision-summary-latest.json",
    constraints: {
      approved_concepts_only: true,
      max_concepts_in_pilot: 2,
      drafts_per_concept: 2,
      max_total_questions: 4,
      no_db_writes: true,
      no_imports: true,
      no_migrations: true,
      no_automatic_publishing: true,
    },
    counts: {
      concepts_used: [...new Set(rows.map((r) => r.concept_key))].length,
      draft_questions: rows.length,
    },
    rows,
    outputs: {
      review_csv: [csvStamped, csvLatest],
    },
  };
  const jsonStamped = join(outDir, `question-drafts-v1-review-${stamp}.json`);
  const jsonLatest = join(outDir, "question-drafts-v1-review-latest.json");
  writeFileSync(jsonStamped, JSON.stringify(payload, null, 2), "utf8");
  writeFileSync(jsonLatest, JSON.stringify(payload, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        concepts_used: payload.counts.concepts_used,
        draft_questions: payload.counts.draft_questions,
        output_csv: csvLatest,
        output_json: jsonLatest,
      },
      null,
      2,
    ),
  );
}

main();


import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/** Shape returned by IA preview and accepted for insert (no DB id). */
export type AiPreviewQuestion = {
  question: string;
  choices: string[];
  correct_index: number;
  explanation: string;
};

type Theme =
  | "vocabulaire"
  | "reseaux_sociaux"
  | "gaming"
  | "trends_pop_culture"
  | "relations_lifestyle"
  | "culture_pop"
  | "tech";
type Difficulty = "facile" | "moyen" | "difficile";

/**
 * Appel chat « style OpenAI » (POST …/chat/completions).
 * Priorité : OPENAI_* → AI_* (Groq, OpenRouter, Azure, ton Worker CF proxy…) → Lovable (repli).
 */
type AiChatConfig = {
  url: string;
  apiKey: string;
  model: string;
  billingHint: "openai" | "lovable" | "generic";
};

function chatCompletionsUrl(base: string): string {
  const b = base.replace(/\/+$/, "");
  if (b.endsWith("/chat/completions")) return b;
  return `${b}/chat/completions`;
}

function resolveAiChatConfig(): AiChatConfig | null {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    const base = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    return {
      url: chatCompletionsUrl(base),
      apiKey: openaiKey,
      model,
      billingHint: "openai",
    };
  }

  const aiKey = process.env.AI_API_KEY?.trim();
  const aiBase = process.env.AI_API_BASE_URL?.trim();
  const aiModel = process.env.AI_MODEL?.trim();
  if (aiKey && aiBase && aiModel) {
    return {
      url: chatCompletionsUrl(aiBase),
      apiKey: aiKey,
      model: aiModel,
      billingHint: "generic",
    };
  }

  const lovableKey = (
    process.env.LOVABLE_API_KEY ||
    process.env.AI_GATEWAY_KEY ||
    process.env.LOVABLE_CLOUD_API_KEY
  )?.trim();
  if (lovableKey) {
    const model = process.env.LOVABLE_AI_MODEL?.trim() || "google/gemini-2.5-flash";
    return {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      apiKey: lovableKey,
      model,
      billingHint: "lovable",
    };
  }

  return null;
}

function missingAiConfigMessage(): string {
  return [
    "Aucune clé / URL de modèle IA côté serveur.",
    "Recommandé : `OPENAI_API_KEY` (optionnel `OPENAI_MODEL` ex. gpt-4o-mini, `OPENAI_BASE_URL` pour Azure ou proxy).",
    "Ou : `AI_API_KEY` + `AI_API_BASE_URL` (ex. https://api.groq.com/openai/v1) + `AI_MODEL` pour tout fournisseur compatible OpenAI.",
    "Repli : `LOVABLE_API_KEY` sur la passerelle Lovable.",
  ].join(" ");
}

const THEME_LABELS: Record<Theme, string> = {
  vocabulaire: "Vocabulaire des jeunes (mots d'argot, expressions)",
  reseaux_sociaux: "Réseaux sociaux (TikTok, Instagram, Snapchat, BeReal, etc.)",
  gaming: "Gaming (jeux vidéo, streams, culture joueur)",
  trends_pop_culture: "Mèmes & culture web viral (trends, musique, drama léger)",
  relations_lifestyle: "Relations & lifestyle en ligne (love, crush, codes)",
  culture_pop:
    "Culture internet — ancien regroupement (mèmes, gaming, musique, tendances, relations)",
  tech: "Tech & IA (smartphones, IA, applis, sécurité, quotidien numérique)",
};

/** Editorial limits (aligned with “short & clear” brief). */
const MAX_QUESTION_CHARS = 220;
const MAX_CHOICE_CHARS = 72;
const MAX_EXPLANATION_CHARS = 300;

function normalizeQuestionKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Tous les libellés de questions existants (normalisés), pour anti-doublon à l’insertion IA. */
async function fetchExistingQuestionKeys(admin: SupabaseClient<Database>): Promise<Set<string>> {
  const keys = new Set<string>();
  const pageSize = 1000;
  let offset = 0;
  for (;;) {
    const { data, error } = await admin
      .from("questions")
      .select("question")
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const batch = data ?? [];
    for (const row of batch) {
      keys.add(normalizeQuestionKey(row.question));
    }
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return keys;
}

function validateAiQuestion(
  raw: unknown,
): { ok: true; data: AiPreviewQuestion } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "entrée invalide" };
  const o = raw as Record<string, unknown>;
  const question = typeof o.question === "string" ? o.question.trim() : "";
  if (!question) return { ok: false, reason: "question vide" };
  if (question.length > MAX_QUESTION_CHARS) {
    return { ok: false, reason: `question trop longue (>${MAX_QUESTION_CHARS} car.)` };
  }

  if (!Array.isArray(o.choices) || o.choices.length !== 4) {
    return { ok: false, reason: "choix: exactement 4 chaînes requises" };
  }
  const choices: string[] = [];
  for (let i = 0; i < 4; i++) {
    if (typeof o.choices[i] !== "string") return { ok: false, reason: `choix ${i + 1} invalide` };
    const c = (o.choices[i] as string).trim();
    if (!c) return { ok: false, reason: `choix ${i + 1} vide` };
    if (c.length > MAX_CHOICE_CHARS) {
      return { ok: false, reason: `choix ${i + 1} trop long (>${MAX_CHOICE_CHARS} car.)` };
    }
    choices.push(c);
  }

  const ci =
    typeof o.correct_index === "number"
      ? o.correct_index
      : Number.parseInt(String(o.correct_index ?? ""), 10);
  if (!Number.isInteger(ci) || ci < 0 || ci > 3) {
    return { ok: false, reason: "correct_index doit être 0–3" };
  }

  const explanation = typeof o.explanation === "string" ? o.explanation.trim() : "";
  if (!explanation) return { ok: false, reason: "explication vide" };
  if (explanation.length > MAX_EXPLANATION_CHARS) {
    return { ok: false, reason: `explication trop longue (>${MAX_EXPLANATION_CHARS} car.)` };
  }

  return {
    ok: true,
    data: { question, choices, correct_index: ci, explanation },
  };
}

function dedupeBatch(questions: AiPreviewQuestion[]): {
  kept: AiPreviewQuestion[];
  droppedDuplicates: number;
} {
  const seen = new Set<string>();
  const kept: AiPreviewQuestion[] = [];
  let droppedDuplicates = 0;
  for (const q of questions) {
    const key = normalizeQuestionKey(q.question);
    if (seen.has(key)) {
      droppedDuplicates += 1;
      continue;
    }
    seen.add(key);
    kept.push(q);
  }
  return { kept, droppedDuplicates };
}

function buildUserPrompt(count: number, difficulty: Difficulty, themeLabel: string): string {
  return `Génère exactement ${count} questions de quiz en français sur le thème: ${themeLabel}.

Niveau demandé pour TOUT le lot: **${difficulty}**
- **facile** : notions courantes / faciles à deviner pour un adulte qui suit un peu les réseaux.
- **moyen** : assez connues mais pas toujours comprises à fond (nuances, codes).
- **difficile** : plus subtiles, plus récentes, moins évidentes (sans trivia obscur).

Contexte produit: **"Tu captes ?"** — quiz fun et rapide pour **adultes 35–55 ans** qui testent s'ils comprennent les codes du web et des réseaux.

Ton & style:
- fun, **casual**, légèrement taquin, **jamais** humiliant ;
- **jamais** scolaire, professoral, infantilisant ou "cours magistral" ;
- questions **courtes**, **orales**, naturelles (ex. "C'est quoi 'cringe' ?", "Sur TikTok, 'POV' ça veut dire quoi ?").

Règles strictes:
- **4 choix** seulement, chaque choix **très court** (quelques mots, **pas** de longue phrase).
- **Une seule** bonne réponse, **clairement** correcte ; les 3 autres doivent être **clairement fausses** dans le même registre (**pas** d'ambiguïté).
- Si un **mot ou une expression en anglais** apparaît dans la question ou dans un choix, l'**explication** doit donner la **signification en français** (ou la nuance utile).
- Explication: **maximum 2 phrases courtes** au total, ton "OK, maintenant tu captes", utile et léger.
- Évite l'argot **ringard** ou de **niche** ; reste sur des usages **modernes et réalistes** (réseaux, web, quotidien numérique).
- **Aucun doublon d'idée** dans ce lot: ne répète pas la même expression / le même fait sous une autre formulation.

Format de sortie — JSON **uniquement**, sans markdown, sans texte hors JSON, forme exacte:
{ "questions": [ { "question": "...", "choices": ["","","",""], "correct_index": 0, "explanation": "..." } ] }`;
}

async function verifyAdminAccess(
  accessToken: string,
): Promise<{ ok: true; supabaseUrl: string } | { ok: false; error: string }> {
  let supabaseUrl: string;
  let anonKey: string;
  try {
    supabaseUrl = getSupabaseUrl();
    anonKey = getSupabasePublishableKey();
  } catch {
    return { ok: false, error: "Configuration backend manquante" };
  }

  const sb = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData?.user) {
    return { ok: false, error: "Non authentifié" };
  }

  const { data: roleRow } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleRow) {
    return { ok: false, error: "Réservé aux administrateurs" };
  }

  return { ok: true, supabaseUrl };
}

const SYSTEM_MESSAGE =
  "Tu es l'éditeur quiz de « Tu captes ? » pour adultes 35–55 ans. Tu produis uniquement du JSON UTF-8 valide, sans markdown ni commentaires, en respectant strictement le format demandé dans le message utilisateur.";

async function callOpenAiCompatibleChat(
  userPrompt: string,
  config: AiChatConfig,
): Promise<{ ok: true; raw: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: SYSTEM_MESSAGE },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) {
      return { ok: false, error: "Limite de requêtes atteinte. Réessaie dans un instant." };
    }
    if (res.status === 402) {
      if (config.billingHint === "lovable") {
        return {
          ok: false,
          error: "Crédits Lovable épuisés — recharge sur Lovable Cloud.",
        };
      }
      return {
        ok: false,
        error: "Fournisseur IA : crédits ou facturation insuffisants (HTTP 402).",
      };
    }
    if (!res.ok) {
      let detail = "";
      try {
        const errJson = (await res.json()) as { error?: { message?: string } };
        detail = errJson?.error?.message ? ` — ${errJson.error.message}` : "";
      } catch {
        /* ignore */
      }
      return { ok: false, error: `Erreur IA (${res.status})${detail}` };
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    return { ok: true, raw };
  } catch (err) {
    return { ok: false, error: `Appel IA échoué : ${(err as Error).message}` };
  }
}

function parseAndValidateQuestionsFromAi(raw: string): {
  questions: AiPreviewQuestion[];
  validationNotes: string[];
} {
  const validationNotes: string[] = [];
  let parsed: { questions?: unknown[] };
  try {
    parsed = JSON.parse(raw) as { questions?: unknown[] };
  } catch {
    return { questions: [], validationNotes: ["Réponse IA invalide (JSON parse)."] };
  }

  const list = parsed.questions;
  if (!Array.isArray(list)) {
    return { questions: [], validationNotes: ['Champ "questions" manquant ou non tableau.'] };
  }

  const candidates: AiPreviewQuestion[] = [];
  for (let i = 0; i < list.length; i++) {
    const v = validateAiQuestion(list[i]);
    if (!v.ok) {
      validationNotes.push(`#${i + 1}: ${v.reason}`);
      continue;
    }
    candidates.push(v.data);
  }

  const { kept, droppedDuplicates } = dedupeBatch(candidates);
  if (droppedDuplicates > 0) {
    validationNotes.push(`${droppedDuplicates} doublon(s) exact(s) retiré(s) dans le lot.`);
  }

  return { questions: kept, validationNotes };
}

/** Génère un aperçu — aucune écriture en base. */
export const generateQuestionsPreview = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { theme: Theme; difficulty: Difficulty; count: number; accessToken: string }) => {
      if (!data.theme || !data.difficulty) throw new Error("Thème et difficulté requis");
      if (data.count < 1 || data.count > 30) throw new Error("Entre 1 et 30 questions");
      if (!data.accessToken) throw new Error("Authentification requise");
      return data;
    },
  )
  .handler(async ({ data }) => {
    const gate = await verifyAdminAccess(data.accessToken);
    if (!gate.ok) return { ok: false as const, error: gate.error };

    const aiConfig = resolveAiChatConfig();
    if (!aiConfig) {
      return { ok: false as const, error: missingAiConfigMessage() };
    }

    const themeLabel = THEME_LABELS[data.theme];
    const userPrompt = buildUserPrompt(data.count, data.difficulty, themeLabel);
    const ai = await callOpenAiCompatibleChat(userPrompt, aiConfig);
    if (!ai.ok) return { ok: false as const, error: ai.error };

    const { questions, validationNotes } = parseAndValidateQuestionsFromAi(ai.raw);
    if (!questions.length) {
      return {
        ok: false as const,
        error: "Aucune question valide après validation.",
        validationNotes,
      };
    }

    return { ok: true as const, questions, validationNotes };
  });

/** Insère uniquement les questions validées (re-validation serveur). */
export const insertAcceptedGeneratedQuestions = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      theme: Theme;
      difficulty: Difficulty;
      questions: AiPreviewQuestion[];
      accessToken: string;
    }) => {
      if (!data.accessToken) throw new Error("Authentification requise");
      if (!data.theme || !data.difficulty) throw new Error("Thème et difficulté requis");
      if (!Array.isArray(data.questions)) throw new Error("questions doit être un tableau");
      if (data.questions.length < 1) throw new Error("Au moins une question à insérer");
      if (data.questions.length > 30) throw new Error("Maximum 30 questions par insertion");
      return data;
    },
  )
  .handler(async ({ data }) => {
    const gate = await verifyAdminAccess(data.accessToken);
    if (!gate.ok) return { ok: false as const, error: gate.error };

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return { ok: false as const, error: "Service key manquante" };
    }

    const validated: AiPreviewQuestion[] = [];
    for (let i = 0; i < data.questions.length; i++) {
      const v = validateAiQuestion(data.questions[i]);
      if (!v.ok) {
        return {
          ok: false as const,
          error: `Question #${i + 1} invalide côté serveur: ${v.reason}`,
        };
      }
      validated.push(v.data);
    }

    const { kept } = dedupeBatch(validated);
    if (!kept.length) {
      return { ok: false as const, error: "Aucune question valide après dédoublonnage." };
    }

    const admin = createClient<Database>(gate.supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let existingKeys: Set<string>;
    try {
      existingKeys = await fetchExistingQuestionKeys(admin);
    } catch (e) {
      return {
        ok: false as const,
        error: `Impossible de lire les questions existantes: ${(e as Error)?.message ?? e}`,
      };
    }

    const novel = kept.filter((q) => !existingKeys.has(normalizeQuestionKey(q.question)));
    const skippedDuplicates = kept.length - novel.length;

    if (!novel.length) {
      return {
        ok: false as const,
        error:
          skippedDuplicates > 0
            ? "Aucune insertion : toutes les questions existent déjà en base (même texte normalisé)."
            : "Aucune question à insérer.",
      };
    }

    const rows = novel.map((q) => ({
      theme: data.theme,
      difficulty: data.difficulty,
      question: q.question,
      choices: q.choices,
      correct_index: q.correct_index,
      explanation: q.explanation,
      is_active: true,
    }));

    const { error: insertErr } = await admin.from("questions").insert(rows);
    if (insertErr) return { ok: false as const, error: insertErr.message };

    return { ok: true as const, inserted: rows.length, skippedDuplicates };
  });

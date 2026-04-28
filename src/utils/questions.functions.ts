import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

type GeneratedQuestion = {
  question: string;
  choices: string[];
  correct_index: number;
  explanation: string;
};

type Theme = "vocabulaire" | "reseaux_sociaux" | "culture_pop" | "tech";
type Difficulty = "facile" | "moyen" | "difficile";

const THEME_LABELS: Record<Theme, string> = {
  vocabulaire: "Vocabulaire des jeunes (mots d'argot, expressions)",
  reseaux_sociaux: "Réseaux sociaux (TikTok, Instagram, Snapchat, BeReal, etc.)",
  culture_pop: "Culture pop des jeunes (musique, séries, créateurs de contenu, mèmes)",
  tech: "Technologie et applis (smartphones, IA, jeux vidéo, applications du quotidien)",
};

export const generateQuestions = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { theme: Theme; difficulty: Difficulty; count: number; accessToken: string }) => {
      if (!data.theme || !data.difficulty) throw new Error("Thème et difficulté requis");
      if (data.count < 1 || data.count > 30) throw new Error("Entre 1 et 30 questions");
      if (!data.accessToken) throw new Error("Authentification requise");
      return data;
    },
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "LOVABLE_API_KEY manquante" };
    }

    // Validate the user is admin via their JWT
    const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const anonKey =
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !anonKey) {
      return { ok: false as const, error: "Configuration backend manquante" };
    }

    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData?.user) {
      return { ok: false as const, error: "Non authentifié" };
    }

    const { data: roleRow } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return { ok: false as const, error: "Réservé aux administrateurs" };
    }

    const themeLabel = THEME_LABELS[data.theme];
    const prompt = `Génère exactement ${data.count} questions de quiz ${data.difficulty} en français sur le thème: ${themeLabel}.
Public cible: seniors francophones qui veulent comprendre la culture des jeunes.
Chaque question doit:
- Être claire, courte, bienveillante (jamais moqueuse)
- Avoir exactement 4 choix de réponse
- Avoir une seule bonne réponse (correct_index entre 0 et 3)
- Inclure une explication pédagogique de 2-3 phrases qui apprend quelque chose
- Éviter les questions trop techniques ou très récentes (qui peuvent vite se périmer)

Renvoie uniquement un JSON valide, sans markdown, au format strict:
{ "questions": [ { "question": "...", "choices": ["A","B","C","D"], "correct_index": 0, "explanation": "..." } ] }`;

    let raw: string;
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "Tu es un expert pédagogue qui crée des quiz pour seniors. Tu réponds toujours en JSON strict valide.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (res.status === 429)
        return {
          ok: false as const,
          error: "Limite de requêtes atteinte. Réessayez dans un instant.",
        };
      if (res.status === 402)
        return {
          ok: false as const,
          error: "Crédits IA épuisés. Ajoutez des crédits dans les réglages Lovable Cloud.",
        };
      if (!res.ok) return { ok: false as const, error: `Erreur IA (${res.status})` };

      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      raw = json.choices?.[0]?.message?.content ?? "";
    } catch (err) {
      return { ok: false as const, error: `Appel IA échoué: ${(err as Error).message}` };
    }

    let parsed: { questions?: GeneratedQuestion[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false as const, error: "Réponse IA invalide (JSON)" };
    }

    const questions = (parsed.questions ?? []).filter(
      (q) =>
        q &&
        typeof q.question === "string" &&
        Array.isArray(q.choices) &&
        q.choices.length === 4 &&
        typeof q.correct_index === "number" &&
        q.correct_index >= 0 &&
        q.correct_index <= 3 &&
        typeof q.explanation === "string",
    );

    if (!questions.length) {
      return { ok: false as const, error: "Aucune question valide générée" };
    }

    // Insert via service role to bypass RLS cleanly (admin already verified)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return { ok: false as const, error: "Service key manquante" };
    }
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const rows = questions.map((q) => ({
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

    return { ok: true as const, inserted: rows.length };
  });

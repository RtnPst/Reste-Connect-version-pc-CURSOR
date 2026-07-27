import { supabase } from "@/integrations/supabase/client";
import { THEMES, type ThemeKey } from "@/lib/themes";

export type PlayableQuestion = {
  id: string;
  theme: ThemeKey;
  difficulty: "facile" | "moyen" | "difficile";
  question: string;
  choices: string[];
  explanation: string;
  /** Editorial semantic key; null when not tagged in DB. */
  conceptKey: string | null;
};

export async function getPlayableQuestions(params: {
  theme?: ThemeKey | null;
  ids?: string[] | null;
  limit?: number;
}): Promise<PlayableQuestion[]> {
  const { data, error } = await supabase.rpc("get_playable_questions", {
    _theme: params.theme ?? null,
    _ids: params.ids ?? null,
    _limit: params.limit ?? 50,
  });

  if (error) throw error;

  return (data ?? []).map((q) => ({
    id: q.id,
    theme: q.theme as ThemeKey,
    difficulty: q.difficulty as "facile" | "moyen" | "difficile",
    question: q.question,
    choices: q.choices as string[],
    explanation: q.explanation,
    conceptKey: q.concept_key ?? null,
  }));
}

/** Random live questions whose concept_key is in the given list (époque packs). */
export async function getPlayableQuestionsByConcepts(
  conceptKeys: string[],
  limit = 10,
): Promise<PlayableQuestion[]> {
  if (!conceptKeys.length) return [];
  const { data: ids, error } = await supabase.rpc("get_playable_question_ids_by_concepts", {
    _concept_keys: conceptKeys,
    _limit: limit,
  });
  if (error) throw error;
  const list = (ids as string[] | null) ?? [];
  if (!list.length) return [];
  return getPlayableQuestions({ ids: list, limit: list.length });
}

export async function getActiveQuestionCounts(): Promise<Record<ThemeKey, number>> {
  const { data, error } = await supabase.rpc("get_active_question_counts");
  if (error) throw error;

  const counts = {} as Record<ThemeKey, number>;
  for (const k of Object.keys(THEMES) as ThemeKey[]) {
    counts[k] = 0;
  }

  for (const row of data ?? []) {
    const key = row.theme as ThemeKey;
    if (key in counts) counts[key] = Number(row.total ?? 0);
  }

  return counts;
}

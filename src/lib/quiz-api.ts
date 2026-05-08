import { supabase } from "@/integrations/supabase/client";
import { THEMES, type ThemeKey } from "@/lib/themes";

type PlayableQuestion = {
  id: string;
  theme: ThemeKey;
  difficulty: "facile" | "moyen" | "difficile";
  question: string;
  choices: string[];
  explanation: string;
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
  }));
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

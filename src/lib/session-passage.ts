import { THEMES, type ThemeKey } from "@/lib/themes";

export type RecentPassage = {
  id: string;
  mode: string;
  theme: string | null;
  score: number;
  total_questions: number;
  completed_at: string;
};

export function formatPassageLabel(passage: RecentPassage): string {
  const date = new Date(passage.completed_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });

  if (passage.mode === "daily") return `Culture du jour · ${date}`;
  if (passage.mode === "marathon") return `Marathon · ${date}`;
  if (passage.mode === "level") return `Le chemin · ${date}`;

  const themeKey = passage.theme as ThemeKey | null;
  if (themeKey && themeKey in THEMES) {
    return `${THEMES[themeKey].short} · ${date}`;
  }

  return `Lecture · ${date}`;
}

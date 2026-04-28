import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { getActiveQuestionCounts } from "@/lib/quiz-api";
import { THEMES, THEME_KEYS, type ThemeKey } from "@/lib/themes";

export const Route = createFileRoute("/quiz/")({
  head: () => ({
    meta: [
      { title: "Choisir un thème — Reste connecté !" },
      {
        name: "description",
        content:
          "Choisissez votre thème de quiz : vocabulaire, réseaux sociaux, culture pop ou tech.",
      },
    ],
  }),
  component: ThemeSelection,
});

function ThemeSelection() {
  const [counts, setCounts] = useState<Record<ThemeKey, number>>({
    vocabulaire: 0,
    reseaux_sociaux: 0,
    culture_pop: 0,
    tech: 0,
  });

  useEffect(() => {
    (async () => {
      const next = await getActiveQuestionCounts();
      setCounts(next);
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 sm:px-6 max-w-5xl py-8 sm:py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3">
            Quel thème vous tente ?
          </h1>
          <p className="text-lg text-muted-foreground">
            10 questions tirées au sort, à votre rythme. Bonne chance !
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {THEME_KEYS.map((theme) => {
            const t = THEMES[theme];
            return (
              <Link
                key={theme}
                to="/quiz/$theme"
                params={{ theme }}
                className="group block rounded-3xl border-2 border-border bg-card p-6 sm:p-8 transition-all hover:scale-[1.02] hover:shadow-[var(--shadow-card)] hover:border-primary/40"
                style={{
                  backgroundImage: `linear-gradient(135deg, var(--${t.colorVar}-soft), var(--card))`,
                }}
              >
                <div className="flex items-start gap-4">
                  <span className="text-5xl sm:text-6xl flex-shrink-0" aria-hidden>
                    {t.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2
                      className="text-xl sm:text-2xl font-extrabold mb-1"
                      style={{ color: `var(--${t.colorVar})` }}
                    >
                      {t.label}
                    </h2>
                    <p className="text-base text-muted-foreground mb-3">{t.description}</p>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-muted-foreground">
                        {counts[theme]} questions disponibles
                      </span>
                      <span
                        className="inline-flex items-center gap-2 font-bold opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                        style={{ color: `var(--${t.colorVar})` }}
                      >
                        Commencer
                        <ArrowRight className="size-5" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

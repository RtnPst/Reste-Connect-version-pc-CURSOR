import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { CULTURE_INTERNET_PISTES } from "@/lib/culture-pop";
import { getActiveQuestionCounts } from "@/lib/quiz-api";
import { THEMES, THEME_KEYS, type ThemeKey } from "@/lib/themes";

const themeCardClass =
  "min-w-0 max-w-full rounded-3xl border-2 border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-card)] sm:p-8";

export const Route = createFileRoute("/quiz/")({
  head: () => ({
    meta: [
      { title: "Choisir un thème — Tu captes ?" },
      {
        name: "description",
        content:
          "Quatre parcours : vocabulaire, réseaux sociaux, culture internet (mèmes, gaming, musique, relations, tendances) et tech & IA. Dix questions à chaque fois.",
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
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <AppHeader />
      <main className="container mx-auto w-full min-w-0 max-w-5xl flex-1 overflow-x-clip px-4 py-8 sm:px-6 sm:py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3">
            Quelle piste tu testes ?
          </h1>
          <p className="text-lg text-muted-foreground">
            Quatre façons de jouer — sur Culture internet tu peux lancer un mix ou cibler une
            sous-piste (mèmes & trends, gaming, musique, relations). Dix questions à chaque fois.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {THEME_KEYS.map((theme) => {
            const t = THEMES[theme];
            const gradient = {
              backgroundImage: `linear-gradient(135deg, var(--${t.colorVar}-soft), var(--card))`,
            };

            if (theme === "culture_pop") {
              return (
                <div
                  key={theme}
                  className={`${themeCardClass} hover:scale-[1.01]`}
                  style={gradient}
                >
                  <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                    <span className="text-5xl sm:text-6xl flex-shrink-0" aria-hidden>
                      {t.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2
                        className="text-xl sm:text-2xl font-extrabold mb-1"
                        style={{ color: `var(--${t.colorVar})` }}
                      >
                        {t.label}
                      </h2>
                      <p className="mb-3 text-[1.0625rem] sm:text-lg font-medium leading-relaxed tracking-tight text-foreground/80 antialiased">
                        {t.description}
                      </p>
                      <p className="mb-2 text-[0.9375rem] font-semibold leading-snug text-foreground/85">
                        Sous-pistes (optionnel)
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Link
                          to="/quiz/$theme"
                          params={{ theme: "culture_pop" }}
                          className="inline-flex items-center rounded-full border-2 border-primary/35 bg-primary-soft/80 px-3 py-1.5 text-[0.9375rem] font-semibold leading-snug text-primary hover:border-primary/60 transition-colors"
                        >
                          Mix total
                        </Link>
                        {CULTURE_INTERNET_PISTES.map((p) => (
                          <Link
                            key={p.slug}
                            to="/quiz/$theme"
                            params={{ theme: "culture_pop" }}
                            search={{ piste: p.slug }}
                            title={p.hint}
                            className="inline-flex items-center rounded-full border-2 border-border bg-card/90 px-3 py-1.5 text-[0.9375rem] font-medium leading-snug text-foreground/90 hover:border-primary/40 transition-colors"
                          >
                            {p.label}
                          </Link>
                        ))}
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                        <span className="min-w-0 text-sm font-semibold text-muted-foreground">
                          {counts[theme]} questions disponibles
                        </span>
                        <Link
                          to="/quiz/$theme"
                          params={{ theme: "culture_pop" }}
                          className="inline-flex min-w-0 shrink-0 items-center gap-2 font-bold hover:translate-x-0.5 transition-transform"
                          style={{ color: `var(--${t.colorVar})` }}
                        >
                          Commencer le mix
                          <ArrowRight className="size-5 shrink-0" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={theme}
                to="/quiz/$theme"
                params={{ theme }}
                className={`group block ${themeCardClass} hover:scale-[1.02]`}
                style={gradient}
              >
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                  <span className="text-5xl sm:text-6xl flex-shrink-0" aria-hidden>
                    {t.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2
                      className="text-xl sm:text-2xl font-extrabold mb-1"
                      style={{ color: `var(--${t.colorVar})` }}
                    >
                      {t.label}
                    </h2>
                    <p className="mb-3 text-[1.0625rem] sm:text-lg font-medium leading-relaxed tracking-tight text-foreground/80 antialiased">
                      {t.description}
                    </p>
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                      <span className="min-w-0 text-sm font-semibold text-muted-foreground">
                        {counts[theme]} questions disponibles
                      </span>
                      <span
                        className="inline-flex min-w-0 shrink-0 items-center gap-2 font-bold opacity-80 transition-all group-hover:translate-x-1 group-hover:opacity-100"
                        style={{ color: `var(--${t.colorVar})` }}
                      >
                        Commencer
                        <ArrowRight className="size-5 shrink-0" />
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

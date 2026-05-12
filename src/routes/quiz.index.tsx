import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { getActiveQuestionCounts } from "@/lib/quiz-api";
import { PLAYABLE_THEME_KEYS, THEMES, type ThemeKey } from "@/lib/themes";
import { cn } from "@/lib/utils";

const themeCardBase =
  "group flex min-h-[10.75rem] min-w-0 flex-col rounded-2xl border border-border/70 bg-card/85 p-4 shadow-[var(--shadow-soft)] transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_14px_28px_-14px_rgba(15,23,42,0.75)] motion-reduce:transition-none motion-reduce:hover:translate-y-0";

export const Route = createFileRoute("/quiz/")({
  head: () => ({
    meta: [
      { title: "Choisir un thème — Tu captes ?" },
      {
        name: "description",
        content:
          "Six parcours thématiques — gaming, mèmes & trends, relations, tech… Dix questions par run.",
      },
    ],
  }),
  component: ThemeSelection,
});

function ThemeEmojiBox({ colorVar, emoji }: { colorVar: string; emoji: string }) {
  return (
    <div
      className="mb-2 inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-xl leading-none"
      style={{
        backgroundColor: `color-mix(in oklab, var(--${colorVar}) 16%, transparent)`,
        color: `var(--${colorVar})`,
      }}
      aria-hidden
    >
      {emoji}
    </div>
  );
}

const initialCounts = (): Record<ThemeKey, number> => {
  const o = {} as Record<ThemeKey, number>;
  for (const k of Object.keys(THEMES) as ThemeKey[]) {
    o[k] = 0;
  }
  return o;
};

function ThemeSelection() {
  const [counts, setCounts] = useState<Record<ThemeKey, number>>(initialCounts);

  useEffect(() => {
    (async () => {
      const next = await getActiveQuestionCounts();
      setCounts(next);
    })();
  }, []);

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <AppHeader />
      <main className="container mx-auto w-full min-w-0 max-w-5xl flex-1 overflow-x-clip px-4 py-6 sm:px-6 sm:py-8">
        <section className="mb-4 rounded-3xl border border-violet-400/40 bg-linear-to-br from-violet-950/70 via-indigo-950/60 to-orange-950/30 p-4 sm:p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-violet-200">Quiz par thème</p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">Quelle piste tu testes ?</h1>
          <p className="mt-1 text-sm text-slate-200">
            Six angles — Gaming, Mèmes & trends, Relations, tech… Dix questions par run.
          </p>
        </section>

        <div
          className={cn(
            "grid grid-cols-2 gap-3",
            "sm:grid-cols-2 md:grid-cols-3",
            "lg:grid-cols-3",
          )}
        >
          {PLAYABLE_THEME_KEYS.map((theme) => {
            const t = THEMES[theme];
            return (
              <Link key={theme} to="/quiz/$theme" params={{ theme }} className={themeCardBase}>
                <ThemeEmojiBox colorVar={t.colorVar} emoji={t.emoji} />
                <h2 className="text-lg font-extrabold leading-tight" style={{ color: `var(--${t.colorVar})` }}>
                  {t.label}
                </h2>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{t.description}</p>
                <p className="mt-auto pt-2 text-xs font-semibold text-muted-foreground">
                  {counts[theme]} questions dans ce thème
                </p>
                <p
                  className="pt-0.5 text-sm font-extrabold opacity-90 transition-opacity group-hover:opacity-100"
                  style={{ color: `var(--${t.colorVar})` }}
                >
                  Commencer <span aria-hidden>→</span>
                </p>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

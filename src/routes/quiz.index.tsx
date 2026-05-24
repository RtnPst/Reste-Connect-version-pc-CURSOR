import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { getActiveQuestionCounts } from "@/lib/quiz-api";
import { PLAYABLE_THEME_KEYS, THEMES, type ThemeKey } from "@/lib/themes";

const themeCardBase =
  "group flex min-h-[9.5rem] min-w-0 flex-col rounded-2xl border border-border/70 bg-card/90 p-4 shadow-[var(--shadow-soft)] transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_14px_28px_-14px_rgba(15,23,42,0.75)] motion-reduce:transition-none motion-reduce:hover:translate-y-0";

export const Route = createFileRoute("/quiz/")({
  head: () => ({
    meta: [
      { title: "Choisir un thème — Tu captes ?" },
      {
        name: "description",
        content: "Six lectures du web vivant — gaming, mèmes, relations, tech… Un run court par angle.",
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
      <main className="container mx-auto w-full min-w-0 max-w-lg flex-1 overflow-x-clip px-4 py-5 sm:px-6 sm:py-7">
        <Link
          to="/play"
          className="mb-4 inline-flex min-h-[2.75rem] items-center text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Jouer
        </Link>

        <header className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Explorer</p>
          <h1 className="mt-1 text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-3xl">
            Une lecture du web
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Chaque angle, un run court — sans catalogue ni pression de score.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3">
          {PLAYABLE_THEME_KEYS.map((theme) => {
            const t = THEMES[theme];
            const count = counts[theme];
            return (
              <Link key={theme} to="/quiz/$theme" params={{ theme }} className={themeCardBase}>
                <ThemeEmojiBox colorVar={t.colorVar} emoji={t.emoji} />
                <h2 className="text-lg font-extrabold leading-tight" style={{ color: `var(--${t.colorVar})` }}>
                  {t.label}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">{t.description}</p>
                <p
                  className="mt-auto flex items-center gap-1 pt-3 text-sm font-extrabold opacity-90 transition-opacity group-hover:opacity-100"
                  style={{ color: `var(--${t.colorVar})` }}
                >
                  Lancer la lecture
                  <ChevronRight className="size-4" aria-hidden />
                </p>
                {count > 0 ? (
                  <span className="sr-only">{count} questions disponibles dans ce thème</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

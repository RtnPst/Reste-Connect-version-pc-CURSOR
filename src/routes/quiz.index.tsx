import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { JourneyPage } from "@/components/JourneyPage";
import { getActiveQuestionCounts } from "@/lib/quiz-api";
import { PLAYABLE_THEME_KEYS, THEMES, type ThemeKey } from "@/lib/themes";

const themeCardBase =
  "journey-panel group flex min-h-[9.5rem] min-w-0 flex-col p-4 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-primary/35 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

export const Route = createFileRoute("/quiz/")({
  head: () => ({
    meta: [
      { title: "Choisir un thème — Tu captes ?" },
      {
        name: "description",
        content: "Six angles du web vivant — gaming, mèmes, relations, tech… Environ 10 questions par run.",
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
    <JourneyPage>
      <AppHeader />
      <main className="container mx-auto w-full min-w-0 max-w-lg flex-1 overflow-x-clip px-4 py-5 sm:px-6 sm:py-7">
        <Link
          to="/play"
          className="mb-4 inline-flex min-h-[2.75rem] items-center text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Carrefour du fil
        </Link>

        <header className="mb-6">
          <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground/85">Un angle</p>
          <h1 className="mt-1.5 text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-3xl">
            Une lecture du web
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Chaque angle, un passage d’environ 10 questions — même fil, autre lumière.
          </p>
        </header>

        <Link
          to="/quiz/epoque/"
          className="journey-panel mb-4 flex min-h-[3.75rem] items-center gap-3 p-3.5 transition-colors hover:border-primary/35"
        >
          <span className="text-sm font-bold text-primary">Par époque</span>
          <span className="min-w-0 flex-1 text-sm text-muted-foreground">
            90s → maintenant
          </span>
          <ChevronRight className="size-4 text-muted-foreground/50" aria-hidden />
        </Link>

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
    </JourneyPage>
  );
}

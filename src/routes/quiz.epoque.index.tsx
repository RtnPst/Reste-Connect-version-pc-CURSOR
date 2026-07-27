import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { JourneyPage } from "@/components/JourneyPage";
import { DECADE_KEYS, DECADE_PACKS } from "@/lib/decade-packs";

export const Route = createFileRoute("/quiz/epoque/")({
  head: () => ({
    meta: [
      { title: "Par époque — Tu captes ?" },
      {
        name: "description",
        content: "Choisis une décennie et ses expressions — du parler 90s à TikTok FR.",
      },
    ],
  }),
  component: EpoquePickerPage,
});

function EpoquePickerPage() {
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
          <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground/85">Par époque</p>
          <h1 className="mt-1.5 text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-3xl">
            Une décennie, ses mots
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Même fil culturel — autre moment. Environ 10 questions par époque.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          {DECADE_KEYS.map((key) => {
            const pack = DECADE_PACKS[key];
            return (
              <Link
                key={key}
                to="/quiz/epoque/$decade"
                params={{ decade: key }}
                className="journey-panel group flex min-h-[4.75rem] items-center gap-3.5 p-4 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-primary/35 motion-reduce:hover:translate-y-0"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-extrabold text-primary">
                  {pack.short.slice(0, 4)}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <p className="text-base font-bold leading-snug">{pack.label}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{pack.description}</p>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" aria-hidden />
              </Link>
            );
          })}
        </div>
      </main>
    </JourneyPage>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, CalendarCheck2, ChevronRight, Compass, Footprints, Swords, Hourglass } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { JourneyPage } from "@/components/JourneyPage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { parisCalendarDate } from "@/lib/paris-calendar";
import { cn } from "@/lib/utils";
import { PLAYABLE_THEME_KEYS } from "@/lib/themes";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Carrefour du fil — Tu captes ?" },
      {
        name: "description",
        content: "Le carrefour du fil culturel — fil du jour, un angle, ou Le chemin.",
      },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  const { user } = useAuth();
  const [dailyCompletedToday, setDailyCompletedToday] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setDailyCompletedToday(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const today = parisCalendarDate();
      const { data } = await supabase
        .from("quiz_attempts")
        .select("id, completed_at")
        .eq("user_id", user.id)
        .eq("mode", "daily")
        .order("completed_at", { ascending: false })
        .limit(12);
      const done = (data ?? []).some((a) => parisCalendarDate(new Date(a.completed_at)) === today);
      if (!cancelled) setDailyCompletedToday(done);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const dailyDone = Boolean(user && dailyCompletedToday);

  return (
    <JourneyPage>
      <AppHeader />
      <main className="container mx-auto w-full max-w-lg flex-1 px-4 py-5 sm:px-6 sm:py-7">
        <header className="mb-6 animate-fade-in">
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground/80">
            Sur le fil
          </p>
          <h1 className="mt-1.5 text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-3xl">
            Reprendre le fil
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            Choisis où reprendre — c’est toujours le même fil culturel.
          </p>
          <div className="journey-filament mt-4 max-w-xs" aria-hidden>
            <span style={{ width: dailyDone ? "100%" : "28%" }} />
          </div>
        </header>

        <div className="fil-continuity-rail fil-continuity-rail--soft">
          {dailyDone ? (
            <Link
              to="/quiz"
              className="fil-passage group flex min-h-[4.75rem] items-center gap-3.5 py-3.5 pr-1 transition-transform duration-300 active:scale-[0.99] motion-reduce:active:scale-100"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/25">
                <CalendarCheck2 className="size-5" strokeWidth={2.25} aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <p className="text-base font-bold leading-snug">Capté pour aujourd’hui</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Continue avec un angle sur le fil.</p>
              </span>
              <ChevronRight className="size-4 shrink-0 text-primary/70 opacity-70" aria-hidden />
            </Link>
          ) : (
            <Link
              to="/question-du-jour"
              className="fil-passage fil-passage--accent group flex min-h-[4.75rem] items-center gap-3.5 py-3.5 pr-1 transition-transform duration-300 active:scale-[0.99] motion-reduce:active:scale-100"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary ring-1 ring-primary/20">
                <Calendar className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <p className="text-base font-bold leading-snug">Ouvrir le fil du jour</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Le passage qui ouvre la journée.</p>
              </span>
              <ChevronRight className="size-4 shrink-0 text-primary opacity-80" aria-hidden />
            </Link>
          )}

          <div className="journey-connector" aria-hidden />

          <Link
            to="/quiz"
            className={cn(
              "fil-passage group flex min-h-[4.25rem] items-center gap-3.5 py-3 pr-1 transition-colors duration-300",
              dailyDone && "fil-passage--next",
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Compass className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <p className="text-base font-bold leading-tight">Un angle</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {PLAYABLE_THEME_KEYS.length} angles · environ 10 questions par run.
              </p>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" aria-hidden />
          </Link>

          <div className="journey-connector" aria-hidden />

          <Link
            to="/quiz/epoque/"
            className="fil-passage group flex min-h-[4.25rem] items-center gap-3.5 py-3 pr-1"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Hourglass className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <p className="text-base font-bold leading-tight">Par époque</p>
              <p className="mt-0.5 text-sm text-muted-foreground">90s, 2000s, 2010s ou maintenant.</p>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" aria-hidden />
          </Link>

          <div className="journey-connector" aria-hidden />

          <Link
            to="/niveaux"
            className="fil-passage group flex min-h-[4.25rem] items-center gap-3.5 py-3 pr-1"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Footprints className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <p className="text-base font-extrabold leading-tight">Le chemin</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Étapes reliées — tu es ici sur la ligne.</p>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" aria-hidden />
          </Link>

          <div className="journey-connector" aria-hidden />

          <Link
            to="/duel"
            className="fil-passage group flex min-h-[4.25rem] items-center gap-3.5 py-3 pr-1"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Swords className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <p className="text-base font-bold leading-tight">Duel</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Mêmes questions, à deux — partage un code.</p>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" aria-hidden />
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/parcours" className="font-medium text-primary/90 underline-offset-2 hover:underline">
            Voir tes traces sur le fil
          </Link>
        </p>
      </main>
    </JourneyPage>
  );
}

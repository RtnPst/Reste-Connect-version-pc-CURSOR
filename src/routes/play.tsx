import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, CalendarCheck2, ChevronRight, GraduationCap, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { JourneyPage } from "@/components/JourneyPage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
      const today = new Date().toISOString().slice(0, 10);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("quiz_attempts")
        .select("id")
        .eq("user_id", user.id)
        .eq("mode", "daily")
        .gte("completed_at", `${today}T00:00:00.000Z`)
        .lt("completed_at", `${tomorrow}T00:00:00.000Z`)
        .limit(1);
      if (!cancelled) setDailyCompletedToday((data?.length ?? 0) > 0);
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
        <header className="mb-5 animate-fade-in">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Carrefour du fil</p>
          <h1 className="mt-1 text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-3xl">
            Reprendre le fil
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Fil du jour, un angle, ou Le chemin — trois façons d’avancer sur le même fil.
          </p>
          <div className="journey-filament mt-4 max-w-xs" aria-hidden>
            <span style={{ width: dailyDone ? "100%" : "28%" }} />
          </div>
        </header>

        <div className="fil-continuity-rail">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-primary/75">
            Sur le même fil
          </p>

          {dailyDone ? (
            <Link
              to="/quiz"
              className="group flex min-h-[5rem] items-center gap-4 rounded-3xl border border-success/30 bg-linear-to-br from-success-soft/40 via-card/95 to-card/90 p-5 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-300 active:scale-[0.99] motion-reduce:active:scale-100 sm:p-5"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-success/15 text-success ring-1 ring-success/25">
                <CalendarCheck2 className="size-6" strokeWidth={2.25} aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest text-success/90">Fil du jour</p>
                <p className="mt-0.5 text-base font-extrabold leading-snug sm:text-lg">Capté pour aujourd’hui</p>
                <p className="mt-1 text-sm text-muted-foreground">Suite du fil — choisis un angle.</p>
              </span>
              <ChevronRight className="size-5 shrink-0 text-success" aria-hidden />
            </Link>
          ) : (
            <Link
              to="/question-du-jour"
              className="group flex min-h-[5rem] items-center gap-4 rounded-3xl border-2 border-success/40 bg-linear-to-br from-emerald-950/55 via-success/12 to-card/95 p-5 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-300 active:scale-[0.99] motion-reduce:active:scale-100 sm:p-5"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success">
                <Calendar className="size-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest text-success">Fil du jour</p>
                <p className="mt-0.5 text-base font-extrabold leading-snug sm:text-lg">Ouvrir le fil du jour</p>
                <p className="mt-1 text-sm text-muted-foreground">Le passage qui ouvre la journée sur le fil.</p>
              </span>
              <ChevronRight className="size-5 shrink-0 text-success" aria-hidden />
            </Link>
          )}

          <div className="journey-connector" aria-hidden />

          <Link
            to="/quiz"
            className={cn(
              "journey-panel group flex min-h-[4.5rem] items-center gap-4 p-4 transition-[transform,border-color,box-shadow] duration-300",
              dailyDone ? "border-primary/35 ring-1 ring-primary/15 hover:border-primary/50" : "hover:border-primary/35",
            )}
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-300">
              <GraduationCap className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Suite du fil</p>
              <p className="text-base font-extrabold leading-tight">Un angle</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Six lectures courtes — même fil, autre thème.</p>
            </span>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          </Link>

          <div className="journey-connector" aria-hidden />

          <Link
            to="/niveaux"
            className="journey-panel group flex min-h-[4.5rem] items-center gap-4 p-4 transition-[transform,border-color] duration-300 hover:border-primary/25"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Trophy className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Avancer</p>
              <p className="text-base font-extrabold leading-tight">Le chemin</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Étapes reliées — tu es ici sur la ligne.</p>
            </span>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground/70" aria-hidden />
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/parcours" className="font-semibold text-primary underline-offset-2 hover:underline">
            Voir tes traces sur le fil
          </Link>
        </p>
      </main>
    </JourneyPage>
  );
}

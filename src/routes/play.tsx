import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, CalendarCheck2, ChevronRight, GraduationCap, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Jouer — Tu captes ?" },
      {
        name: "description",
        content: "Culture du jour, puis un thème ou un run rapide — une intention à la fois.",
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
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <AppHeader />
      <main className="container mx-auto w-full max-w-lg flex-1 px-4 py-5 sm:px-6 sm:py-7">
        <header className="mb-6 animate-fade-in">
          <h1 className="text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-3xl">Jouer</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Un fil culturel d’abord — le reste quand tu veux.
          </p>
        </header>

        {dailyDone ? (
          <Link
            to="/quiz"
            className="group mb-8 flex min-h-[5.5rem] items-center gap-4 rounded-3xl border border-success/30 bg-linear-to-br from-success-soft/40 via-card/95 to-card/90 p-5 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-300 active:scale-[0.99] motion-reduce:active:scale-100 sm:p-6"
          >
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-success/15 text-success ring-1 ring-success/25">
              <CalendarCheck2 className="size-7" strokeWidth={2.25} aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <p className="text-[11px] font-bold uppercase tracking-widest text-success/90">Aujourd’hui</p>
              <p className="mt-0.5 text-lg font-extrabold leading-snug sm:text-xl">Capté pour aujourd’hui</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Le fil du jour est noté. Choisis un angle pour continuer la lecture.
              </p>
            </span>
            <ChevronRight
              className="size-5 shrink-0 text-success transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        ) : (
          <Link
            to="/question-du-jour"
            className="group mb-8 flex flex-col rounded-3xl border-2 border-success/40 bg-linear-to-br from-emerald-950/55 via-success/12 to-card/95 p-5 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-300 active:scale-[0.99] motion-reduce:active:scale-100 sm:p-6"
          >
            <div className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-success-soft text-success shadow-[inset_0_0_0_1px_rgba(34,197,94,0.2)]">
              <Calendar className="size-8" aria-hidden />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-success">Moment culture</p>
            <h2 className="mt-1 text-xl font-extrabold leading-tight sm:text-2xl">Culture du jour</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Une question pour capter le fil du moment — la série suit si tu veux.
            </p>
            <p className="mt-5 inline-flex items-center gap-1 text-sm font-extrabold text-success">
              Ouvrir le fil du jour
              <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </p>
          </Link>
        )}

        <section className="animate-soft-rise" aria-labelledby="play-explore-heading">
          <h2
            id="play-explore-heading"
            className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            Explorer
          </h2>
          <Link
            to="/quiz"
            className={cn(
              "group flex min-h-[4.75rem] items-center gap-4 rounded-2xl border border-border/80 bg-card/90 p-4 shadow-[var(--shadow-soft)] transition-[transform,border-color,box-shadow] duration-300",
              dailyDone
                ? "border-primary/35 ring-1 ring-primary/15 hover:border-primary/50"
                : "hover:border-primary/35",
            )}
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-300">
              <GraduationCap className="size-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <p className="text-base font-extrabold leading-tight">Un thème</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Six angles du web — un run court chacun.</p>
            </span>
            <ChevronRight
              className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
              aria-hidden
            />
          </Link>
        </section>

        <section className="mt-8 animate-soft-rise" aria-labelledby="play-shortcuts-heading">
          <h2
            id="play-shortcuts-heading"
            className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            Raccourci
          </h2>
          <Link
            to="/niveaux"
            className="group flex min-h-[3.75rem] items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3 transition-colors hover:border-border hover:bg-muted/35"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Trophy className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <p className="text-sm font-bold">Run rapide</p>
              <p className="text-xs text-muted-foreground">Paliers mélangés — sans choisir un thème.</p>
            </span>
            <ChevronRight
              className="size-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </section>
      </main>
    </div>
  );
}

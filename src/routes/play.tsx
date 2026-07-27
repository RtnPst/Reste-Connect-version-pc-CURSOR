import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Calendar,
  CalendarCheck2,
  ChevronRight,
  Compass,
  Footprints,
  Swords,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
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

type ModeCardProps = {
  to: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  accent?: boolean;
  next?: boolean;
  tone?: "sky" | "violet" | "amber" | "rose" | "slate";
};

function ModeCard({ to, icon: Icon, title, subtitle, accent, next, tone = "sky" }: ModeCardProps) {
  const toneRing: Record<NonNullable<ModeCardProps["tone"]>, string> = {
    sky: "ring-sky-400/25 bg-sky-500/10 text-sky-600 dark:text-sky-300",
    violet: "ring-violet-400/25 bg-violet-500/10 text-violet-600 dark:text-violet-300",
    amber: "ring-amber-400/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    rose: "ring-rose-400/25 bg-rose-500/10 text-rose-600 dark:text-rose-300",
    slate: "ring-border/60 bg-muted/40 text-foreground",
  };

  return (
    <Link
      to={to}
      className={cn(
        "group flex min-h-[4.5rem] items-center gap-3.5 rounded-2xl border px-3.5 py-3.5 pr-2 transition-[transform,box-shadow,border-color] duration-300 active:scale-[0.99] motion-reduce:active:scale-100",
        accent
          ? "border-primary/35 bg-linear-to-br from-primary/12 via-card to-card shadow-[0_0_0_1px_rgba(61,139,253,0.12),var(--shadow-soft)]"
          : next
            ? "border-primary/25 bg-card/95 shadow-[var(--shadow-soft)]"
            : "border-border/70 bg-card/90 shadow-[var(--shadow-soft)] hover:border-border hover:shadow-[var(--shadow-card)]",
      )}
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1",
          toneRing[tone],
        )}
      >
        <Icon className="size-5" strokeWidth={accent ? 2.25 : 2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <p className="text-base font-bold leading-snug">{title}</p>
        <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{subtitle}</p>
      </span>
      <ChevronRight
        className={cn(
          "size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5",
          accent || next ? "text-primary/80" : "text-muted-foreground/50",
        )}
        aria-hidden
      />
    </Link>
  );
}

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

        <div className="space-y-3">
          {dailyDone ? (
            <ModeCard
              to="/quiz"
              icon={CalendarCheck2}
              title="Capté pour aujourd’hui"
              subtitle="Continue avec un angle sur le fil."
              tone="sky"
              next
            />
          ) : (
            <ModeCard
              to="/question-du-jour"
              icon={Calendar}
              title="Ouvrir le fil du jour"
              subtitle="Le passage qui ouvre la journée."
              accent
              tone="sky"
            />
          )}

          <ModeCard
            to="/quiz"
            icon={Compass}
            title="Un angle"
            subtitle={`${PLAYABLE_THEME_KEYS.length} angles · environ 10 questions par run.`}
            tone="violet"
            next={dailyDone}
          />

          <ModeCard
            to="/niveaux"
            icon={Footprints}
            title="Le chemin"
            subtitle="Étapes reliées — difficulté qui monte doucement."
            tone="amber"
          />

          <ModeCard
            to="/quiz/epoque/"
            icon={Hourglass}
            title="Par époque"
            subtitle="90s, 2000s, 2010s ou maintenant."
            tone="slate"
          />

          <ModeCard
            to="/duel"
            icon={Swords}
            title="Duel"
            subtitle="Mêmes questions, à deux — partage un code."
            tone="rose"
          />
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

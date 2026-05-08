import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Download,
  Flame,
  Zap,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { maybeShowDailyReminder } from "@/lib/reminders";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tu captes ? — Tu captes vraiment les jeunes ?" },
      {
        name: "description",
        content: "Teste ton niveau en 2 minutes.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user, profile } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [dailyCompletedToday, setDailyCompletedToday] = useState<boolean | null>(null);
  const maxUnlockedLevel = profile?.max_unlocked_level ?? 1;
  const hasProgression = Boolean(profile && (profile.total_xp > 0 || maxUnlockedLevel > 1));

  useEffect(() => {
    maybeShowDailyReminder();
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

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

  const currentLevelXp = profile?.total_xp ? profile.total_xp % 100 : 0;
  const xpToNextLevel = currentLevelXp === 0 ? 100 : 100 - currentLevelXp;
  const streakCount = profile?.current_streak ?? 0;
  const hasStreak = streakCount > 0;
  const shouldProtectStreak = hasStreak && !dailyCompletedToday;

  const missionTitle = !user
    ? "Mission du jour"
    : dailyCompletedToday
      ? "Mission validée"
      : shouldProtectStreak
        ? "Garde ta série"
        : "Débloque ton bonus du jour";
  const missionText = !user
    ? "Un run rapide pour lancer ta progression."
    : dailyCompletedToday
      ? "Mission validée. Tu peux enchaîner."
      : shouldProtectStreak
        ? `Passe par la question du jour pour garder tes ${streakCount} jour${streakCount > 1 ? "s" : ""} d’affilée.`
        : "Réponds à la question du jour — c’est ta mission du moment.";
  const missionCtaTo = !user
    ? "/quiz"
    : dailyCompletedToday
      ? "/niveaux"
      : "/question-du-jour";
  const missionCta = !user
    ? "Lancer mon premier run"
    : dailyCompletedToday
      ? "Continuer ma progression"
      : "Valider ma mission";

  /** Logged-in flow that opens the same daily run as Jouer → Daily */
  const missionIsDaily = Boolean(user && !dailyCompletedToday);

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <AppHeader />

      <main className="min-w-0 w-full flex-1 overflow-x-clip">
        <section className="container mx-auto max-w-5xl px-4 pt-4 sm:px-6 sm:pt-6 [@media(max-height:780px)]:pt-2">
          <div className="mx-auto max-w-3xl animate-fade-in space-y-3 rounded-[2rem] border border-border/60 bg-card/70 px-4 py-4 text-center shadow-[var(--shadow-card)] backdrop-blur-sm sm:px-7 sm:py-5 [@media(max-height:780px)]:space-y-2 [@media(max-height:780px)]:rounded-[1.7rem] [@media(max-height:780px)]:px-3 [@media(max-height:780px)]:py-3.5">
            <span className="inline-flex items-center justify-center rounded-full border border-accent/35 bg-accent/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground/90 sm:text-[13px]">
              Quiz culture web
            </span>
            <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-violet-400/28 bg-[#111a36]/82 px-4 py-4 shadow-[0_0_0_1px_rgba(139,92,246,0.2),0_16px_34px_-24px_rgba(168,85,247,0.55)] sm:px-6 sm:py-5 [@media(max-height:780px)]:rounded-2xl [@media(max-height:780px)]:px-3.5 [@media(max-height:780px)]:py-3">
              <span
                className="pointer-events-none absolute -right-12 top-0 size-[11rem] rounded-full bg-fuchsia-500/[0.12] blur-3xl"
                aria-hidden
              />
              <span
                className="pointer-events-none absolute -bottom-16 -left-10 size-[13rem] rounded-full bg-violet-500/[0.1] blur-3xl"
                aria-hidden
              />
              <span
                className="pointer-events-none absolute right-0 top-1/2 size-[8rem] -translate-y-1/2 translate-x-1/3 rounded-full bg-orange-400/[0.08] blur-3xl"
                aria-hidden
              />

              <div className="relative z-[1] mx-auto w-full max-w-[30rem] space-y-2 [@media(max-height:780px)]:space-y-1.5">
                <h1 className="text-balance text-2xl font-extrabold leading-[1.12] tracking-tight sm:text-3xl sm:leading-[1.1] [@media(max-height:780px)]:text-[1.34rem] [@media(max-height:780px)]:leading-[1.08]">
                  <span className="block text-slate-50">T’es sûr de capter…</span>
                  <span className="mt-1 block bg-linear-to-r from-fuchsia-300 via-violet-300 to-orange-300 bg-clip-text text-transparent">
                    ou t’es un peu mytho ?
                  </span>
                </h1>
                <p className="text-sm font-medium text-slate-300/95 sm:text-base [@media(max-height:780px)]:text-[0.83rem]">
                  2 minutes pour savoir où t’en es vraiment.
                </p>
                <div
                  className={cn(
                    "mt-2.5 border-t pt-2.5 [@media(max-height:780px)]:mt-2 [@media(max-height:780px)]:pt-2",
                    missionIsDaily
                      ? "border-success/25 bg-success/5 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.12)] rounded-xl -mx-1 px-2 pb-2"
                      : "border-white/10",
                  )}
                >
                  <p
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide",
                      missionIsDaily
                        ? "border-success/45 bg-success/15 text-success-foreground"
                        : "border-violet-300/45 bg-violet-500/20 text-violet-100",
                    )}
                  >
                    {missionTitle}
                  </p>
                  <p className="mt-1.5 text-sm text-slate-200/95 [@media(max-height:780px)]:mt-1.5 [@media(max-height:780px)]:text-[0.82rem]">{missionText}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 [@media(max-height:780px)]:mt-1.5 [@media(max-height:780px)]:gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/55 bg-card/45 px-2.5 py-1 text-xs font-semibold">
                      <Zap className="size-3.5 text-warning" />
                      <strong>{xpToNextLevel} XP</strong> avant rang suivant
                    </span>
                    {hasStreak && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-xs font-semibold text-slate-100">
                        <Flame className="size-3.5 text-success" />
                        <span className="text-slate-300/95">Série</span>
                        <strong className="tabular-nums text-sm font-extrabold text-success">
                          {streakCount}
                        </strong>
                        <span className="text-slate-300/95">
                          jour{streakCount > 1 ? "s" : ""}
                        </span>
                      </span>
                    )}
                  </div>
              <div className="mt-2.5 [@media(max-height:780px)]:mt-2">
                <Button
                  asChild
                  size="sm"
                  variant="default"
                  className={cn(
                    "rounded-full px-4",
                    missionIsDaily &&
                      "border border-emerald-800/55 bg-linear-to-br from-emerald-950 via-emerald-600 to-emerald-950 text-emerald-50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_0_0_1px_rgba(4,120,87,0.32),0_0_26px_-8px_rgba(52,211,153,0.32),0_4px_14px_-8px_rgba(6,78,59,0.55)] hover:via-emerald-500 hover:brightness-[1.04] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_0_0_1px_rgba(4,120,87,0.38),0_0_32px_-6px_rgba(52,211,153,0.28)] active:brightness-95",
                  )}
                >
                  <Link to={missionCtaTo}>{missionCta}</Link>
                </Button>
              </div>
                </div>
              </div>
            </div>
            <div className="flex w-full min-w-0 justify-center px-1 pt-2 sm:px-0 sm:pt-3 [@media(max-height:780px)]:pt-1.5">
              <Button
                asChild
                size="xl"
                variant="default"
                className="h-auto min-h-[3.35rem] w-full max-w-[min(100%,22.5rem)] min-w-0 rounded-full border border-fuchsia-200/45 bg-linear-to-r from-violet-600 via-fuchsia-500 to-orange-400 px-4 py-3 text-center text-white shadow-[0_0_0_1px_rgba(244,114,182,0.3),0_0_26px_-12px_rgba(236,72,153,0.72),0_18px_34px_-18px_rgba(249,115,22,0.62)] transition-[transform,box-shadow,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:scale-[1.02] hover:brightness-105 hover:shadow-[0_0_0_1px_rgba(244,114,182,0.4),0_0_32px_-10px_rgba(236,72,153,0.82),0_22px_40px_-16px_rgba(249,115,22,0.76)] active:translate-y-[1px] active:scale-[0.985] active:brightness-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100 sm:min-h-[3.6rem] sm:max-w-[23rem] sm:px-6 sm:py-3.5 [@media(max-height:780px)]:min-h-[3rem] [@media(max-height:780px)]:px-4 [@media(max-height:780px)]:py-2.5"
              >
                <Link
                  to={user ? "/play" : "/quiz"}
                  className="flex min-h-[2.5rem] w-full min-w-0 max-w-full items-center justify-center whitespace-normal break-words py-0.5 text-center text-[1.05rem] font-bold leading-none tracking-[-0.02em] [text-wrap:balance] sm:min-h-[2.7rem] sm:text-[1.15rem] sm:tracking-[-0.025em] [@media(max-height:780px)]:min-h-[2.2rem] [@media(max-height:780px)]:text-[0.98rem]"
                >
                  {user ? "Je continue" : "Je teste"}
                </Link>
              </Button>
            </div>

            {installPrompt && (
              <div className="pt-1.5">
                <div className="mx-auto max-w-xl rounded-2xl border border-border/35 bg-card/35 p-3.5 text-left shadow-[var(--shadow-soft)] sm:p-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">
                    Installer l'app
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const promptEvent = installPrompt as Event & {
                          prompt: () => Promise<void>;
                          userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
                        };
                        await promptEvent.prompt();
                        await promptEvent.userChoice;
                        setInstallPrompt(null);
                      }}
                    >
                      <Download />
                      Ajouter à l’écran d’accueil
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground/90 sm:text-sm">
                    Chrome / Edge : bouton ci-dessus quand le navigateur le propose.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

    </div>
  );
}

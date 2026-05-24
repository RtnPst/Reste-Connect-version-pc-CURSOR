import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { JourneyPage } from "@/components/JourneyPage";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { maybeShowDailyReminder } from "@/lib/reminders";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tu captes ? — Culture web, un fil à la fois" },
      {
        name: "description",
        content: "Croise le web vivant en deux minutes — une lecture culturelle par jour, puis les thèmes si tu veux.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user, profile } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [dailyCompletedToday, setDailyCompletedToday] = useState<boolean | null>(null);
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

  const streakCount = profile?.current_streak ?? 0;
  const hasStreak = streakCount > 0;
  const shouldProtectStreak = hasStreak && !dailyCompletedToday;

  const missionTitle = !user
    ? "Par où commencer"
    : dailyCompletedToday
      ? "Capté pour aujourd’hui"
      : shouldProtectStreak
        ? "Série en douceur"
        : "Culture du jour";
  const missionText = !user
    ? "Un passage court pour sentir le rythme — sans pression."
    : dailyCompletedToday
      ? "Le fil du jour est dans la poche. Un thème ou un run rapide, quand tu veux."
      : shouldProtectStreak
        ? `Série : ${streakCount} jour${streakCount > 1 ? "s" : ""}. La question du jour prolonge la suite — si l’envie t’y prend.`
        : "Une question, une lecture : le moment culture à picorer.";
  const missionCtaTo = !user
    ? "/quiz"
    : dailyCompletedToday
      ? "/play"
      : "/question-du-jour";
  const missionIsDaily = Boolean(user && !dailyCompletedToday);
  const missionIsDone = Boolean(user && dailyCompletedToday);

  const continueTo = !user ? "/quiz" : dailyCompletedToday ? "/play" : missionCtaTo;
  const continueLabel = !user
    ? "Je teste"
    : dailyCompletedToday
      ? "Reprendre le fil"
      : "Ouvrir la question du jour";

  const ctaClassName = missionIsDone
    ? "h-auto min-h-[3.2rem] w-full max-w-[min(100%,22.5rem)] min-w-0 rounded-full border border-border/60 bg-card px-4 py-3 text-center font-bold text-foreground shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] active:translate-y-px motion-reduce:hover:translate-y-0 sm:min-h-[3.4rem] sm:max-w-[23rem] sm:px-6"
    : "h-auto min-h-[3.35rem] w-full max-w-[min(100%,22.5rem)] min-w-0 rounded-full border border-fuchsia-200/45 bg-linear-to-r from-violet-600 via-fuchsia-500 to-orange-400 px-4 py-3 text-center text-white shadow-[0_0_0_1px_rgba(244,114,182,0.3),0_0_26px_-12px_rgba(236,72,153,0.72),0_18px_34px_-18px_rgba(249,115,22,0.62)] transition-[transform,box-shadow,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:scale-[1.02] hover:brightness-105 hover:shadow-[0_0_0_1px_rgba(244,114,182,0.4),0_0_32px_-10px_rgba(236,72,153,0.82),0_22px_40px_-16px_rgba(249,115,22,0.76)] active:translate-y-[1px] active:scale-[0.985] active:brightness-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100 sm:min-h-[3.6rem] sm:max-w-[23rem] sm:px-6 sm:py-3.5";

  return (
    <JourneyPage>
      <AppHeader />

      <main className="min-w-0 w-full flex-1 overflow-x-clip pb-2">
        <section className="container mx-auto max-w-lg px-4 pt-4 sm:px-6 sm:pt-6 [@media(max-height:780px)]:pt-2">
          <div className="journey-panel mx-auto animate-fade-in space-y-4 px-4 py-5 text-center sm:px-7 sm:py-6 [@media(max-height:780px)]:space-y-3 [@media(max-height:780px)]:px-3 [@media(max-height:780px)]:py-4">
            <span className="inline-flex items-center justify-center rounded-full border border-accent/35 bg-accent/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground/90 sm:text-[13px]">
              Culture web
            </span>

            {!user ? (
              <div className="relative mx-auto w-full overflow-hidden rounded-3xl border border-border bg-card px-4 py-4 shadow-[var(--shadow-soft)] sm:px-6 sm:py-5 [@media(max-height:780px)]:rounded-2xl [@media(max-height:780px)]:px-3.5 [@media(max-height:780px)]:py-3">
                <span
                  className="pointer-events-none absolute -right-12 top-0 size-[11rem] rounded-full bg-fuchsia-500/[0.12] blur-3xl"
                  aria-hidden
                />
                <span
                  className="pointer-events-none absolute -bottom-16 -left-10 size-[13rem] rounded-full bg-violet-500/[0.1] blur-3xl"
                  aria-hidden
                />
                <div className="relative z-[1] mx-auto w-full max-w-[30rem] space-y-2">
                  <h1 className="text-balance text-2xl font-extrabold leading-[1.12] tracking-tight sm:text-3xl">
                    <span className="block text-slate-50">T’es sûr de capter…</span>
                    <span className="mt-1 block bg-linear-to-r from-fuchsia-300 via-violet-300 to-orange-300 bg-clip-text text-transparent">
                      ou t’es un peu mytho ?
                    </span>
                  </h1>
                  <p className="text-sm font-medium text-slate-300/95 sm:text-base">
                    Deux minutes pour croiser un angle du web vivant.
                  </p>
                  <p className="pt-2 text-sm text-slate-200/90">{missionText}</p>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "mx-auto w-full rounded-3xl border px-5 py-5 text-left sm:px-6 sm:py-6",
                  missionIsDone
                    ? "border-success/30 bg-linear-to-br from-success-soft/25 via-card/95 to-card/90"
                    : missionIsDaily
                      ? "border-success/35 bg-linear-to-br from-success-soft/30 via-card/95 to-card/90 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.1)]"
                      : "border-border/70 bg-card/95",
                )}
              >
                <p
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest",
                    missionIsDone
                      ? "border-success/40 bg-success/10 text-success"
                      : missionIsDaily
                        ? "border-success/45 bg-success/15 text-success"
                        : "border-violet-300/40 bg-violet-500/15 text-violet-200",
                  )}
                >
                  {missionTitle}
                </p>
                <p className="mt-3 text-lg font-extrabold leading-snug tracking-tight text-foreground sm:text-xl">
                  {dailyCompletedToday
                    ? "La suite, à ton rythme"
                    : shouldProtectStreak
                      ? "Un passage par le fil du jour"
                      : "Ton moment culture"}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{missionText}</p>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Fil du jour</span>
                    <span className={dailyCompletedToday ? "text-success" : shouldProtectStreak ? "text-primary" : ""}>
                      {dailyCompletedToday ? "Capté" : shouldProtectStreak ? "Série active" : "À picorer"}
                    </span>
                  </div>
                  <div className="journey-filament mt-1.5" aria-hidden>
                    <span
                      style={{
                        width: dailyCompletedToday ? "100%" : shouldProtectStreak ? "45%" : "12%",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex w-full min-w-0 flex-col items-center gap-2 px-1 pt-1 sm:px-0">
              <Button asChild size="xl" variant="default" className={ctaClassName}>
                <Link
                  to={continueTo}
                  className="flex min-h-[2.5rem] w-full min-w-0 max-w-full items-center justify-center whitespace-normal break-words py-0.5 text-center text-[1.05rem] font-bold leading-none tracking-[-0.02em] [text-wrap:balance] sm:min-h-[2.7rem] sm:text-[1.1rem] [@media(max-height:780px)]:min-h-[2.2rem] [@media(max-height:780px)]:text-[0.98rem]"
                >
                  {continueLabel}
                </Link>
              </Button>
              {user ? (
                <p className="max-w-sm text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  Tu reviens quand tu veux — le carrefour est sur{" "}
                  <Link to="/play" className="font-semibold text-primary underline-offset-2 hover:underline">
                    Jouer
                  </Link>
                  {hasStreak ? (
                    <>
                      {" "}
                      ·{" "}
                      <Link
                        to="/parcours"
                        className="font-medium underline-offset-2 hover:text-foreground hover:underline"
                      >
                        Parcours
                      </Link>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>

            {installPrompt && (
              <div className="pt-1">
                <div className="rounded-2xl border border-border/40 bg-muted/25 p-3.5 text-left sm:p-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sur ton téléphone
                  </p>
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
                  <p className="mt-2 text-xs text-muted-foreground">
                    Comme une app — sans passer par le store pour l’instant.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </JourneyPage>
  );
}

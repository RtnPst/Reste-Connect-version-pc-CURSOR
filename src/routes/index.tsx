import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { FilRepriseEcho } from "@/components/FilRepriseEcho";
import { JourneyPage } from "@/components/JourneyPage";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchRecentCapturedConcepts } from "@/lib/recent-captured-concepts";
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
  const [lastCapturedLabel, setLastCapturedLabel] = useState<string | null>(null);
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

  useEffect(() => {
    if (!user) {
      setLastCapturedLabel(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const captured = await fetchRecentCapturedConcepts(user.id, 1);
      if (!cancelled) setLastCapturedLabel(captured[0]?.label ?? null);
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
      ? "Reprise du fil"
      : shouldProtectStreak
        ? "Fil du jour"
        : "Fil du jour";
  const missionText = !user
    ? "Un passage court pour sentir le rythme — sans pression."
    : dailyCompletedToday
      ? lastCapturedLabel
        ? "Le fil du jour est capté. La suite continue au carrefour — même fil, autre angle."
        : "Le fil du jour est capté. Reprends au carrefour quand tu veux."
      : shouldProtectStreak
        ? `Tu es déjà sur ${streakCount} jour${streakCount > 1 ? "s" : ""} de fil. Le passage du jour prolonge la suite — si l’envie t’y prend.`
        : "Une question pour capter le fil du moment — le même voyage, un passage à la fois.";
  const missionCtaTo = !user
    ? "/quiz"
    : dailyCompletedToday
      ? "/play"
      : "/question-du-jour";
  const missionIsDaily = Boolean(user && !dailyCompletedToday);
  const missionIsDone = Boolean(user && dailyCompletedToday);

  const continueTo = !user ? "/quiz" : dailyCompletedToday ? "/play" : missionCtaTo;
  const continueLabel = !user
    ? "Entrer sur le fil"
    : dailyCompletedToday
      ? "Reprendre le fil"
      : "Ouvrir le fil du jour";

  const ctaClassName = missionIsDone
    ? "h-auto min-h-[3.2rem] w-full max-w-[min(100%,22.5rem)] min-w-0 rounded-full border border-border/60 bg-card px-4 py-3 text-center font-bold text-foreground shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] active:translate-y-px motion-reduce:hover:translate-y-0 sm:min-h-[3.4rem] sm:max-w-[23rem] sm:px-6"
    : "h-auto min-h-[3.35rem] w-full max-w-[min(100%,22.5rem)] min-w-0 rounded-full border border-sky-200/35 bg-linear-to-r from-sky-600 via-blue-500 to-orange-400 px-4 py-3 text-center text-white shadow-[0_0_0_1px_rgba(56,189,248,0.28),0_0_26px_-12px_rgba(59,130,246,0.55),0_18px_34px_-18px_rgba(249,115,22,0.55)] transition-[transform,box-shadow,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:scale-[1.02] hover:brightness-105 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.4),0_0_32px_-10px_rgba(59,130,246,0.65),0_22px_40px_-16px_rgba(249,115,22,0.7)] active:translate-y-[1px] active:scale-[0.985] active:brightness-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100 sm:min-h-[3.6rem] sm:max-w-[23rem] sm:px-6 sm:py-3.5";

  return (
    <JourneyPage>
      <AppHeader />

      <main className="min-w-0 w-full flex-1 overflow-x-clip pb-2">
        <section className="container mx-auto max-w-lg px-4 pt-4 sm:px-6 sm:pt-6 [@media(max-height:780px)]:pt-2">
          <div className="journey-panel mx-auto animate-fade-in space-y-4 px-4 py-5 text-center sm:px-7 sm:py-6 [@media(max-height:780px)]:space-y-3 [@media(max-height:780px)]:px-3 [@media(max-height:780px)]:py-4">
            <span className="inline-flex items-center justify-center rounded-full border border-accent/35 bg-accent/12 px-4 py-2 text-xs font-semibold tracking-[0.08em] text-foreground/90 sm:text-[13px]">
              Le fil culturel
            </span>

            {!user ? (
              <div className="relative mx-auto w-full overflow-hidden rounded-3xl border border-border bg-card px-4 py-4 shadow-[var(--shadow-soft)] sm:px-6 sm:py-5 [@media(max-height:780px)]:rounded-2xl [@media(max-height:780px)]:px-3.5 [@media(max-height:780px)]:py-3">
                <span
                  className="pointer-events-none absolute -right-12 top-0 size-[11rem] rounded-full bg-sky-400/[0.12] blur-3xl"
                  aria-hidden
                />
                <span
                  className="pointer-events-none absolute -bottom-16 -left-10 size-[13rem] rounded-full bg-orange-400/[0.1] blur-3xl"
                  aria-hidden
                />
                <div className="relative z-[1] mx-auto w-full max-w-[30rem] space-y-2">
                  <h1 className="text-balance text-2xl font-extrabold leading-[1.12] tracking-tight sm:text-3xl">
                    <span className="block text-slate-50">T’es sûr de capter…</span>
                    <span className="mt-1 block bg-linear-to-r from-sky-300 via-blue-300 to-orange-300 bg-clip-text text-transparent">
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
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em]",
                    missionIsDone
                      ? "border-success/40 bg-success/10 text-success"
                      : missionIsDaily
                        ? "border-success/45 bg-success/15 text-success"
                        : "border-sky-300/40 bg-sky-500/15 text-sky-100",
                  )}
                >
                  {missionTitle}
                </p>
                <p className="mt-3 text-lg font-extrabold leading-snug tracking-tight text-foreground sm:text-xl">
                  {dailyCompletedToday
                    ? lastCapturedLabel
                      ? "Tu as capté — le fil continue"
                      : "Tu reprends où tu t’es arrêté"
                    : shouldProtectStreak
                      ? "Un passage par le fil du jour"
                      : "Ton fil reprend ici"}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{missionText}</p>
                {lastCapturedLabel && user ? <FilRepriseEcho label={lastCapturedLabel} /> : null}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] font-medium tracking-wide text-muted-foreground">
                    <span>Fil du jour</span>
                    <span className={dailyCompletedToday ? "text-success" : shouldProtectStreak ? "text-primary" : ""}>
                      {dailyCompletedToday ? "Capté" : shouldProtectStreak ? "En cours" : "À ouvrir"}
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
                  Le carrefour du fil est sur{" "}
                  <Link to="/play" className="font-semibold text-primary underline-offset-2 hover:underline">
                    Jouer
                  </Link>
                  {" · "}
                  <Link
                    to="/parcours"
                    className="font-medium underline-offset-2 hover:text-foreground hover:underline"
                  >
                    Tes traces
                  </Link>
                </p>
              ) : null}
            </div>

            {installPrompt && (
              <div className="pt-1">
                <div className="rounded-2xl border border-border/40 bg-muted/25 p-3.5 text-left sm:p-4">
                  <p className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground">
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

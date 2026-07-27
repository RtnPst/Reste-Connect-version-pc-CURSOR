import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BrainBuddy, type BrainBuddyPose } from "@/components/BrainBuddy";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const KEY = "tc_onboarding_v2_buddy";

export function hasCompletedOnboarding() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(KEY) === "1";
}

function markOnboardingDone() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, "1");
  // Legacy key from v1 sheet
  window.localStorage.setItem("tc_onboarding_v1_done", "1");
}

type Step = {
  pose: BrainBuddyPose;
  title: string;
  body: string;
  chip?: string;
};

const STEPS: Step[] = [
  {
    pose: "wave",
    chip: "Capte",
    title: "Salut — moi c’est Capte",
    body: "Le petit cerveau du logo. Je te montre vite comment Tu Captes ? marche, sans blabla.",
  },
  {
    pose: "tip",
    chip: "Accueil",
    title: "L’Accueil, c’est ton fil",
    body: "Tu y retrouves le rythme du jour, une reprise douce, et l’envie d’ouvrir le passage culturel.",
  },
  {
    pose: "think",
    chip: "Jouer",
    title: "Jouer = le carrefour",
    body: "Fil du jour, thèmes, époques, duel… tu choisis un angle, tu captes un mot du web vivant.",
  },
  {
    pose: "aha",
    chip: "Parcours",
    title: "Parcours = ce que tu as capté",
    body: "Pas un classement. Une mémoire légère : les concepts nommés, la sensation « ah ok, je vois ».",
  },
  {
    pose: "wink",
    chip: "Profil",
    title: "Profil pour le confort",
    body: "Préférences, rappels locaux, aide. Rien d’agressif — juste ton espace.",
  },
  {
    pose: "aha",
    chip: "Le geste",
    title: "Le cœur : capter",
    body: "Une situation → un choix → le décode. Tu repars avec un mot nommé, pas juste un score.",
  },
];

/**
 * First-visit companion tour: Capte presents the app in short beats.
 */
export function OnboardingSheet({ userId }: { userId?: string | null }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasCompletedOnboarding()) return;
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setEntered(false);
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, [open, step]);

  if (!open) return null;

  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  const finish = (destination: "daily" | "play" | "dismiss") => {
    markOnboardingDone();
    setOpen(false);
    void trackEvent({
      event_name: "onboarding_completed",
      user_id: userId ?? null,
      mode: "shell",
      event_props: { destination },
    });
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className={cn(
          "w-full max-w-md overflow-hidden rounded-3xl border border-border/80 bg-card p-5 shadow-[var(--shadow-soft)] transition-[opacity,transform] duration-300 sm:p-6",
          entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
      >
        <div className="flex items-start gap-3">
          <BrainBuddy pose={current.pose} size="lg" className="shrink-0" />
          <div className="min-w-0 flex-1 pt-1">
            {current.chip ? (
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary/85">
                {current.chip}
              </p>
            ) : null}
            <h2 id="onboarding-title" className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
              {current.title}
            </h2>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          {current.body}
        </p>

        <div className="mt-5 flex items-center gap-1.5" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step ? "w-6 bg-primary" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          {isLast ? (
            <>
              <Button asChild size="lg" className="font-bold">
                <Link to="/question-du-jour" onClick={() => finish("daily")}>
                  Ouvrir le fil du jour
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/play" onClick={() => finish("play")}>
                  Voir le carrefour
                </Link>
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="lg"
              className="font-bold"
              onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}
            >
              Continuer
            </Button>
          )}
          <div className="flex items-center justify-between gap-3 pt-0.5">
            {step > 0 ? (
              <button
                type="button"
                className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                Retour
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => finish("dismiss")}
            >
              Passer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

const KEY = "tc_onboarding_v1_done";

export function hasCompletedOnboarding() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(KEY) === "1";
}

function markOnboardingDone() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, "1");
}

/**
 * First-visit sheet: 30s product framing for Tu Captes.
 */
export function OnboardingSheet({ userId }: { userId?: string | null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasCompletedOnboarding()) return;
    setOpen(true);
  }, []);

  if (!open) return null;

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
      <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <p className="text-[11px] font-medium tracking-[0.12em] text-primary/80">Bienvenue</p>
        <h2 id="onboarding-title" className="mt-2 text-2xl font-extrabold tracking-tight">
          Tu Captes ?, c’est un fil
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Pas un tableau de scores. Chaque jour, tu croises un mot du web vivant en France —
          et tu le <span className="font-semibold text-foreground">captes</span>.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-foreground/90">
          <li>1. Ouvre le fil du jour</li>
          <li>2. Capte le mot (avec le décode)</li>
          <li>3. Reviens demain — ou explore un angle / une époque</li>
        </ul>
        <div className="mt-6 flex flex-col gap-2.5">
          <Button asChild size="lg" className="font-bold">
            <Link
              to="/question-du-jour"
              onClick={() => finish("daily")}
            >
              Ouvrir le fil du jour
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/play" onClick={() => finish("play")}>
              Voir le carrefour
            </Link>
          </Button>
          <button
            type="button"
            className="pt-1 text-center text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => finish("dismiss")}
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}

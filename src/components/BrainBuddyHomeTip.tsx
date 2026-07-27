import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BrainBuddy } from "@/components/BrainBuddy";
import { hasCompletedOnboarding, ONBOARDING_KEY } from "@/components/CapteOnboardingTour";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "tc_buddy_home_tip_dismissed";

/**
 * Soft home companion: appears after onboarding, tip toward the fil du jour.
 * Dismissible; stays subtle (no chase / no spam).
 */
export function BrainBuddyHomeTip({ dailyDone }: { dailyDone?: boolean | null }) {
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasCompletedOnboarding()) return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    // Show tip whether daily is done or not (copy adapts).
    const t = window.setTimeout(() => setShow(true), 700);
    return () => window.clearTimeout(t);
  }, [dailyDone]);

  if (!show || !open) return null;

  const dismiss = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const done = Boolean(dailyDone);

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] right-3 z-40 max-w-[min(17.5rem,calc(100vw-1.5rem))] md:bottom-6",
        "animate-soft-rise",
      )}
    >
      <div className="pointer-events-auto flex items-end gap-2">
        <div className="relative rounded-2xl border border-border/80 bg-card/95 px-3 py-2.5 text-sm shadow-[var(--shadow-soft)] backdrop-blur-md">
          <p className="font-semibold leading-snug text-foreground">
            {done ? "Nice — tu as déjà capté aujourd’hui." : "Le fil du jour t’attend."}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {done
              ? "Le carrefour Jouer garde d’autres angles sur le même fil."
              : "Un passage court depuis Accueil — pas depuis un autre onglet."}
          </p>
          <div className="mt-2.5 flex items-center gap-3">
            <Link
              to={done ? "/play" : "/question-du-jour"}
              className="text-xs font-bold text-primary underline-offset-2 hover:underline"
              onClick={dismiss}
            >
              {done ? "Voir Jouer" : "J’y vais"}
            </Link>
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
              onClick={dismiss}
            >
              OK
            </button>
          </div>
          <span
            className="absolute -right-1.5 bottom-4 size-3 rotate-45 border-b border-r border-border/80 bg-card/95"
            aria-hidden
          />
        </div>
        <BrainBuddy pose={done ? "wink" : "tip"} size="sm" className="shrink-0 drop-shadow-md" />
      </div>
    </div>
  );
}

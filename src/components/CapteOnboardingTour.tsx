import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { BrainBuddy, type BrainBuddyPose } from "@/components/BrainBuddy";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export const ONBOARDING_KEY = "tc_onboarding_v3_contextual";

type NavTab = "home" | "play" | "parcours" | "profil";

type TourStep = {
  route: string;
  navTab?: NavTab;
  pose: BrainBuddyPose;
  chip: string;
  title: string;
  body: string;
  final?: boolean;
};

const STEPS: TourStep[] = [
  {
    route: "/",
    navTab: "home",
    pose: "wave",
    chip: "Capte",
    title: "Salut — moi c’est Capte",
    body: "Le petit cerveau du logo. Je te fais visiter le fil en 30 secondes, directement sur les pages.",
  },
  {
    route: "/play",
    navTab: "play",
    pose: "think",
    chip: "Jouer",
    title: "Le carrefour du fil",
    body: "Fil du jour, un angle, Le chemin, duel… tu choisis où reprendre la culture web.",
  },
  {
    route: "/parcours",
    navTab: "parcours",
    pose: "aha",
    chip: "Parcours",
    title: "Ce que tu as capté",
    body: "Pas un classement. Tes traces nommées — la mémoire légère de ce que tu as saisi.",
  },
  {
    route: "/connexion",
    navTab: "profil",
    pose: "wink",
    chip: "Profil",
    title: "Ton espace",
    body: "Préférences, aide, compte. Connecte-toi pour garder ta progression sur Le chemin.",
  },
  {
    route: "/question-du-jour",
    pose: "tip",
    chip: "Le geste",
    title: "Capturer, c’est le cœur",
    body: "Une situation → un choix → le décode. Tu repars avec un mot nommé, pas juste un score.",
    final: true,
  },
];

export function hasCompletedOnboarding() {
  if (typeof window === "undefined") return true;
  return (
    window.localStorage.getItem(ONBOARDING_KEY) === "1" ||
    window.localStorage.getItem("tc_onboarding_v2_buddy") === "1"
  );
}

function markOnboardingDone() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_KEY, "1");
  window.localStorage.setItem("tc_onboarding_v2_buddy", "1");
  window.localStorage.setItem("tc_onboarding_v1_done", "1");
}

/** Highlights bottom-nav tab during tour (see AppBottomNav). */
export function useCapteTourNavHighlight(): NavTab | null {
  const [tab, setTab] = useState<NavTab | null>(null);
  useEffect(() => {
    const read = () => {
      const raw = document.documentElement.dataset.capteTourNav;
      setTab(raw === "home" || raw === "play" || raw === "parcours" || raw === "profil" ? raw : null);
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-capte-tour-nav"] });
    return () => obs.disconnect();
  }, []);
  return tab;
}

/**
 * Contextual first-visit tour: Capte on real pages + bottom-nav highlights.
 */
export function CapteOnboardingTour() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [entered, setEntered] = useState(false);

  const current = STEPS[step]!;
  const isLast = Boolean(current.final);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasCompletedOnboarding()) return;
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) {
      delete document.documentElement.dataset.capteTourNav;
      return;
    }
    const target = STEPS[step]?.route;
    if (target && location.pathname !== target) {
      void navigate({ to: target });
    }
    const tab = STEPS[step]?.navTab;
    if (tab) document.documentElement.dataset.capteTourNav = tab;
    else delete document.documentElement.dataset.capteTourNav;
  }, [open, step, navigate, location.pathname]);

  useEffect(() => {
    if (!open) return;
    setEntered(false);
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, [open, step, location.pathname]);

  if (!open) return null;

  const finish = (destination: "daily" | "play" | "dismiss") => {
    markOnboardingDone();
    delete document.documentElement.dataset.capteTourNav;
    setOpen(false);
    void trackEvent({
      event_name: "onboarding_completed",
      user_id: user?.id ?? null,
      mode: "shell",
      event_props: { destination },
    });
  };

  const goNext = () => {
    if (isLast) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-[75] bg-black/25 backdrop-blur-[1px]"
        aria-hidden
      />
      <div
        className="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] z-[85] px-3 sm:bottom-6 sm:px-4 md:bottom-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="capte-tour-title"
      >
        <div
          className={cn(
            "pointer-events-auto mx-auto flex max-w-lg items-end gap-3 transition-[opacity,transform] duration-300",
            entered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
          )}
        >
          <BrainBuddy pose={current.pose} size="md" className="hidden shrink-0 sm:block" />
          <div className="min-w-0 flex-1 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-[var(--shadow-soft)] backdrop-blur-md sm:p-5">
            <div className="flex items-start gap-3">
              <BrainBuddy pose={current.pose} size="sm" className="shrink-0 sm:hidden" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/85">
                  {current.chip}
                </p>
                <h2 id="capte-tour-title" className="mt-0.5 text-lg font-extrabold tracking-tight">
                  {current.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{current.body}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1.5" aria-hidden>
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    i === step ? "w-5 bg-primary" : "w-1.5 bg-border",
                  )}
                />
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {isLast ? (
                <>
                  <Button asChild size="sm" className="font-bold">
                    <Link to="/question-du-jour" onClick={() => finish("daily")}>
                      Ouvrir le fil du jour
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/play" onClick={() => finish("play")}>
                      Carrefour
                    </Link>
                  </Button>
                </>
              ) : (
                <Button type="button" size="sm" className="font-bold" onClick={goNext}>
                  Suivant
                </Button>
              )}
              {step > 0 ? (
                <button
                  type="button"
                  className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                >
                  Retour
                </button>
              ) : null}
              <button
                type="button"
                className="ml-auto text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => finish("dismiss")}
              >
                Passer
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

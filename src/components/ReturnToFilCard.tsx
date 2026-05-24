import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReturnToFilCardProps = {
  /** Editorial line above the CTA */
  hint?: string;
  className?: string;
  showSecondaryLinks?: boolean;
};

const DEFAULT_HINT = "Le fil culturel t’attend sur Jouer — reprends quand tu veux.";

export const RETURN_TO_FIL_HINT = {
  daily: "Demain, un nouveau fil. En attendant, le carrefour t’attend.",
  theme: DEFAULT_HINT,
  level: "Tu reviens au carrefour — une intention à la fois.",
  marathon: "Session posée — le fil t’attend sur Jouer.",
} as const;

/**
 * Shared “return loop” after a session — same place, same language, calm tone.
 */
export function ReturnToFilCard({
  hint = DEFAULT_HINT,
  className,
  showSecondaryLinks = true,
}: ReturnToFilCardProps) {
  return (
    <div className={cn("journey-panel px-4 py-4 text-center sm:px-5 sm:py-5", className)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/75">Retour au fil</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{hint}</p>
      <Button asChild variant="accent" size="lg" className="mt-4 w-full min-h-[52px] text-base font-extrabold">
        <Link to="/play">
          Reprendre le fil
          <ChevronRight className="size-4 shrink-0" aria-hidden />
        </Link>
      </Button>
      {showSecondaryLinks ? (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <Link to="/parcours" className="underline-offset-4 hover:text-foreground hover:underline">
            Ton parcours
          </Link>
          <Link to="/" className="underline-offset-4 hover:text-foreground hover:underline">
            Accueil
          </Link>
        </div>
      ) : null}
    </div>
  );
}

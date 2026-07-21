import type { ConceptCaptureCopy } from "@/lib/concept-capture";

type ConceptCaptureBeatProps = {
  copy: ConceptCaptureCopy;
};

/**
 * Calm 1–2s recognition beat — no confetti, no score tone.
 */
export function ConceptCaptureBeat({ copy }: ConceptCaptureBeatProps) {
  return (
    <div
      className="concept-capture-beat flex min-h-0 flex-1 flex-col items-center justify-center px-2 py-4 text-center sm:py-6"
      role="status"
      aria-live="polite"
    >
      <p className="text-[11px] font-medium tracking-[0.12em] text-primary/75">Sur le fil</p>
      {copy.conceptLabel ? (
        <>
          <p className="mt-4 text-sm font-medium text-muted-foreground">Tu as capté</p>
          <h2 className="mt-1 max-w-md text-[1.45rem] font-bold leading-snug tracking-tight text-primary sm:text-2xl">
            {copy.conceptLabel}
          </h2>
        </>
      ) : (
        <h2 className="mt-4 max-w-md text-[1.45rem] font-bold leading-snug tracking-tight text-foreground sm:text-2xl">
          Tu as capté
        </h2>
      )}
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">{copy.editorialLine}</p>
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { formatPassageLabel, type RecentPassage } from "@/lib/session-passage";
import type { RecentCapturedConcept } from "@/lib/recent-captured-concepts";

type FilTracesSectionProps = {
  passages: RecentPassage[];
  concepts: RecentCapturedConcept[];
};

/** Unified editorial trace list — passages + captures on one fil. */
export function FilTracesSection({ passages, concepts }: FilTracesSectionProps) {
  const hasConcepts = concepts.length > 0;
  const hasPassages = passages.length > 0;

  if (!hasConcepts && !hasPassages) {
    return (
      <section className="journey-panel fil-traces mb-6 p-4 sm:p-5" aria-labelledby="fil-traces-heading">
        <h2 id="fil-traces-heading" className="text-sm font-extrabold sm:text-base">
          Traces sur ton fil
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Tes passages et captures apparaîtront ici — une ligne de lecture, pas un classement.
        </p>
        <p className="mt-3 text-sm text-muted-foreground/90">
          <Link to="/play" className="font-medium text-primary/90 underline-offset-2 hover:underline">
            Ouvre le fil
          </Link>
          {" "}pour laisser une première trace.
        </p>
      </section>
    );
  }

  return (
    <section className="journey-panel fil-traces mb-6 p-4 sm:p-5" aria-labelledby="fil-traces-heading">
      <h2 id="fil-traces-heading" className="text-sm font-extrabold sm:text-base">
        Traces sur ton fil
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">Ce que tu as parcouru et capté récemment.</p>
      <ul className="fil-traces-list mt-4 list-none space-y-0 p-0">
        {concepts.map((item) => (
          <li key={`c-${item.label}-${item.lastSeenAt}`} className="fil-traces-item fil-traces-item--capture">
            <span className="fil-traces-dot" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-primary/75">
                Capté
              </span>
              <span className="mt-0.5 block font-medium leading-snug">{item.label}</span>
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground/65">
              {new Date(item.lastSeenAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </li>
        ))}
        {passages.slice(0, 5).map((passage) => (
          <li key={passage.id} className="fil-traces-item">
            <span className="fil-traces-dot fil-traces-dot--passage" aria-hidden />
            <span className="min-w-0 flex-1 font-medium leading-snug">{formatPassageLabel(passage)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

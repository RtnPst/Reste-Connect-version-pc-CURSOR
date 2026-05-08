export function ReadOnlyBanner() {
  return (
    <div
      role="note"
      className="min-w-0 rounded-xl border border-primary/30 bg-primary-soft/40 px-3 py-2.5 text-xs leading-relaxed text-foreground [overflow-wrap:anywhere] sm:py-2 sm:text-sm"
    >
      Cockpit v1 en lecture seule: aucune action de cet onglet ne modifie la base ou les artefacts.
    </div>
  );
}

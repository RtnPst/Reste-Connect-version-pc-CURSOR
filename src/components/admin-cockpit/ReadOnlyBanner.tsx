export function ReadOnlyBanner() {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary-soft/40 px-3 py-2 text-xs text-foreground sm:text-sm">
      Cockpit v1 en lecture seule: aucune action de cet onglet ne modifie la base ou les artefacts.
    </div>
  );
}

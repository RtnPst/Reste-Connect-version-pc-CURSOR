/** Latest capture on the cultural thread — home / reprise only. */
export function FilRepriseEcho({ label }: { label: string }) {
  return (
    <div className="fil-reprise-echo mt-4 rounded-xl border border-primary/20 bg-primary-soft/25 px-3.5 py-3 text-left">
      <p className="text-[11px] font-medium tracking-[0.14em] text-primary/75">Capté sur ce fil</p>
      <p className="mt-1.5 text-base font-extrabold leading-snug text-foreground">{label}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Tu reprends le même fil — pas une nouvelle page.
      </p>
    </div>
  );
}

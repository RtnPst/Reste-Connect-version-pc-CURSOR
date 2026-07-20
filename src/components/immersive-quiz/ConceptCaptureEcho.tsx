/** Quiet recap line — no score tone. */
export function ConceptCaptureEcho({ label }: { label: string }) {
  return (
    <div className="mx-auto mt-3 max-w-md rounded-xl border border-primary/20 bg-primary-soft/25 px-3 py-2.5 text-center">
      <p className="text-[11px] font-medium tracking-[0.14em] text-primary/75">Capté sur ce fil</p>
      <p className="mt-1 text-base font-extrabold leading-snug text-foreground">{label}</p>
    </div>
  );
}

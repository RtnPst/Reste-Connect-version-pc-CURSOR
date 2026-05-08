type Props = {
  label: string;
  value: string;
};

export function KpiCard({ label, value }: Props) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/70 p-3 sm:p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-foreground sm:text-2xl">{value}</p>
    </div>
  );
}

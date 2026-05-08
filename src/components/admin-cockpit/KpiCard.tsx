type Props = {
  label: string;
  value: string;
};

export function KpiCard({ label, value }: Props) {
  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-card/70 p-3 sm:p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground [overflow-wrap:anywhere] hyphens-auto">
        {label}
      </p>
      <p className="mt-1.5 text-xl font-extrabold tabular-nums tracking-tight text-foreground [overflow-wrap:anywhere] sm:mt-1 sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

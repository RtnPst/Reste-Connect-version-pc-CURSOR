type WarningItem = {
  code: string;
  key?: string;
  path?: string;
};

type Props = {
  title: string;
  warnings: WarningItem[];
};

export function WarningList({ title, warnings }: Props) {
  if (!warnings.length) return null;
  return (
    <div className="rounded-xl border border-warning/40 bg-warning-soft/50 p-3 sm:p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-warning-foreground">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/90">
        {warnings.map((w, idx) => (
          <li key={`${w.code}-${w.key ?? ""}-${idx}`}>
            {w.code}
            {w.key ? ` · ${w.key}` : ""}
            {w.path ? ` · ${w.path}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

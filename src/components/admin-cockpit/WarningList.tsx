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
    <div
      role="status"
      className="min-w-0 rounded-xl border border-warning/40 bg-warning-soft/50 p-3 sm:p-4"
    >
      <p className="text-xs font-bold uppercase tracking-wide text-warning-foreground">{title}</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-snug text-foreground/90">
        {warnings.map((w, idx) => (
          <li key={`${w.code}-${w.key ?? ""}-${idx}`} className="min-w-0 [overflow-wrap:anywhere] break-words">
            {w.code}
            {w.key ? ` · ${w.key}` : ""}
            {w.path ? ` · ${w.path}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

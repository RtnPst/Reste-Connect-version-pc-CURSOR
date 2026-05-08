import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "muted";

const toneClass: Record<Tone, string> = {
  neutral: "border-border/80 bg-muted/60 text-foreground",
  success: "border-success/40 bg-success-soft text-success-foreground",
  warning: "border-warning/50 bg-warning-soft text-warning-foreground",
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
  muted: "border-border/60 bg-background/80 text-muted-foreground",
};

type Props = {
  tone?: Tone;
  className?: string;
  children: ReactNode;
};

export function CockpitStatusBadge({ tone = "neutral", className, children }: Props) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[1.5rem] max-w-full min-w-0 items-center rounded-md border px-2 py-1 text-[10px] font-semibold leading-snug break-words sm:min-h-0 sm:py-0.5 sm:text-[11px]",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

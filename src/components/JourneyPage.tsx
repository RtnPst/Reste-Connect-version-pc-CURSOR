import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared shell for hub screens — ambient depth without looking like a marketing page. */
export function JourneyPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("journey-page flex min-h-screen min-w-0 flex-col overflow-x-clip", className)}>
      {children}
    </div>
  );
}

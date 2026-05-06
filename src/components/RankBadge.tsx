import type { Rank } from "@/lib/levels";

type RankBadgeSize = "sm" | "md" | "lg";

const sizeClass: Record<RankBadgeSize, string> = {
  sm: "size-9 min-h-9 min-w-9 text-sm sm:size-10 sm:min-h-10 sm:min-w-10 sm:text-base",
  md: "size-11 min-h-11 min-w-11 text-base",
  lg: "size-[5.5rem] min-h-[5.5rem] min-w-[5.5rem] text-3xl sm:size-28 sm:min-h-28 sm:min-w-28 sm:text-5xl",
};

/**
 * Pastille de palier (mode niveaux) : dégradé discret + bord fin, sans emoji.
 */
export function RankBadge({
  rank,
  level,
  size = "sm",
  className = "",
}: {
  rank: Rank;
  /** Si défini, affiche le numéro de niveau au centre. */
  level?: number;
  size?: RankBadgeSize;
  className?: string;
}) {
  const v = rank.colorVar;
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-full font-extrabold tabular-nums leading-none tracking-tight motion-reduce:transition-none ${sizeClass[size]} ${className}`}
      style={{
        color: `var(--${v})`,
        background: `linear-gradient(
          155deg,
          color-mix(in oklab, var(--${v}) 22%, var(--card)) 0%,
          color-mix(in oklab, var(--${v}) 7%, var(--background)) 100%
        )`,
        boxShadow: `
          inset 0 1px 0 color-mix(in oklab, white 18%, transparent),
          0 1px 2px color-mix(in oklab, var(--${v}) 14%, transparent)
        `,
        border: `1px solid color-mix(in oklab, var(--${v}) 32%, transparent)`,
      }}
      aria-hidden
    >
      {level !== undefined ? level : null}
    </div>
  );
}

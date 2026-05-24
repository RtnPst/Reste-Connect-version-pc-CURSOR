import { useEffect, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Lock, Star } from "lucide-react";
import { RankBadge } from "@/components/RankBadge";
import {
  RANKS,
  TOTAL_LEVELS,
  getRankForLevel,
  type LevelProgress,
  type Rank,
} from "@/lib/levels";
import { getLevelStars, getPathNodeState, isPathNodeDistant } from "@/lib/path-node";
import { cn } from "@/lib/utils";

type TrailItem =
  | { kind: "landmark"; rank: Rank }
  | { kind: "step"; level: number; stepIndex: number };

function buildTrailItems(): TrailItem[] {
  const items: TrailItem[] = [];
  let stepIndex = 0;
  for (const rank of RANKS) {
    items.push({ kind: "landmark", rank });
    for (let level = rank.fromLevel; level <= rank.toLevel; level++) {
      items.push({ kind: "step", level, stepIndex });
      stepIndex += 1;
    }
  }
  return items;
}

const TRAIL_ITEMS = buildTrailItems();

type PathTrailProps = {
  progress: LevelProgress;
  frontierLevel: number;
};

export function PathTrail({ progress, frontierLevel }: PathTrailProps) {
  const currentRef = useRef<HTMLLIElement | null>(null);

  const trailMeta = useMemo(
    () => ({
      completedCount: Math.max(0, frontierLevel - 1),
      total: TOTAL_LEVELS,
    }),
    [frontierLevel],
  );

  useEffect(() => {
    const el = currentRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  }, [frontierLevel]);

  return (
    <div className="path-surface animate-soft-rise">
      <div className="path-horizon" aria-hidden />
      <p className="path-trail-legend text-center text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">
        {trailMeta.completedCount > 0
          ? `${trailMeta.completedCount} étape${trailMeta.completedCount > 1 ? "s" : ""} derrière toi`
          : "Départ du fil"}
        <span className="text-muted-foreground/50"> · </span>
        l’horizon continue
      </p>

      <ol className="path-trail mt-4 list-none p-0" aria-label="Le chemin — étapes de progression">
        {TRAIL_ITEMS.map((item) => {
          if (item.kind === "landmark") {
            const v = item.rank.colorVar;
            return (
              <li key={`landmark-${item.rank.key}`} className="path-landmark">
                <div
                  className="path-landmark-inner"
                  style={{
                    borderColor: `color-mix(in oklab, var(--${v}) 28%, var(--border))`,
                    background: `linear-gradient(
                      90deg,
                      transparent,
                      color-mix(in oklab, var(--${v}) 10%, var(--card)) 50%,
                      transparent
                    )`,
                  }}
                >
                  <span className="path-landmark-label" style={{ color: `var(--${v})` }}>
                    {item.rank.label}
                  </span>
                  <span className="path-landmark-range text-muted-foreground">
                    N{item.rank.fromLevel}–{item.rank.toLevel}
                  </span>
                </div>
              </li>
            );
          }

          const { level, stepIndex } = item;
          const rank = getRankForLevel(level);
          const state = getPathNodeState(level, progress);
          const distant = isPathNodeDistant(level, progress);
          const side = stepIndex % 2 === 0 ? "left" : "right";
          const best = progress.best[level] ?? 0;
          const stars = getLevelStars(best);
          const isCurrent = state === "current";
          const isUnlocked = state !== "locked";

          const node = (
            <div
              className={cn(
                "path-node",
                `path-node--${state}`,
                distant && state === "locked" && "path-node--distant",
                isCurrent && "path-node--here",
              )}
              style={
                isUnlocked
                  ? {
                      ["--path-node-accent" as string]: `var(--${rank.colorVar})`,
                    }
                  : undefined
              }
            >
              {isCurrent ? (
                <span className="path-node-here">Tu es ici</span>
              ) : null}
              <RankBadge rank={rank} level={level} size={isCurrent ? "md" : "sm"} />
              {state === "locked" ? (
                <Lock className="path-node-lock size-3.5" aria-hidden />
              ) : stars > 0 ? (
                <div className="path-node-stars" aria-label={`${stars} sur 3`}>
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={cn(
                        "size-2.5",
                        s <= stars ? "fill-warning text-warning" : "text-muted-foreground/20",
                      )}
                      aria-hidden
                    />
                  ))}
                </div>
              ) : state === "completed" ? (
                <span className="path-node-done text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Passé
                </span>
              ) : null}
            </div>
          );

          return (
            <li
              key={`step-${level}`}
              ref={isCurrent ? currentRef : undefined}
              className={cn("path-trail-step", `path-trail-step--${side}`, isCurrent && "path-trail-step--current")}
              aria-current={isCurrent ? "step" : undefined}
            >
              <div className={cn("path-node-wrap", `path-node-wrap--${side}`)}>
                {isUnlocked ? (
                  <Link
                    to="/niveau/$n"
                    params={{ n: String(level) }}
                    className="path-node-link"
                    aria-label={`Étape ${level} — ${rank.label}${isCurrent ? " — position actuelle" : ""}`}
                  >
                    {node}
                  </Link>
                ) : (
                  <div aria-label={`Étape ${level} — pas encore accessible`}>{node}</div>
                )}
              </div>
              <span
                className={cn("path-spine-dot", `path-spine-dot--${state}`)}
                aria-hidden
              />
            </li>
          );
        })}
      </ol>

      <div className="path-horizon path-horizon--below" aria-hidden />
    </div>
  );
}

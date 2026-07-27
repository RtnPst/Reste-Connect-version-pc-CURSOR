import { cn } from "@/lib/utils";

export type BrainBuddyPose = "idle" | "wave" | "aha" | "think" | "tip" | "wink";

type Props = {
  pose?: BrainBuddyPose;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  label?: string;
};

const SIZE_PX = {
  sm: 56,
  md: 88,
  lg: 128,
  xl: 168,
} as const;

/**
 * Soft 2.5D companion inspired by the Tu Captes logo brain + lightning.
 * Poses are CSS-driven (no 3D runtime).
 */
export function BrainBuddy({
  pose = "idle",
  size = "md",
  className,
  label = "Capte, le compagnon Tu Captes",
}: Props) {
  const px = SIZE_PX[size];

  return (
    <div
      className={cn("brain-buddy", `brain-buddy--${pose}`, className)}
      style={{ width: px, height: px }}
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 120 120" width={px} height={px} aria-hidden className="overflow-visible">
        <defs>
          <linearGradient id="bb-brain" x1="18%" y1="8%" x2="86%" y2="92%">
            <stop offset="0%" stopColor="#e879f9" />
            <stop offset="45%" stopColor="#c026d3" />
            <stop offset="100%" stopColor="#7e22ce" />
          </linearGradient>
          <linearGradient id="bb-bolt" x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="bb-shell" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#3d8bfd" />
          </linearGradient>
          <filter id="bb-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#4c1d95" floodOpacity="0.28" />
          </filter>
        </defs>

        {/* Soft ground shadow */}
        <ellipse cx="60" cy="108" rx="28" ry="5" className="brain-buddy__ground" fill="#0f172a" opacity="0.12" />

        {/* Optional tip bubble ring (logo echo) */}
        <g className="brain-buddy__shell">
          <path
            d="M28 78c-10-8-14-22-10-34 5-16 22-28 42-28s37 12 42 28c4 12 0 26-10 34l6 12-18-6c-6 2-12 3-20 3s-14-1-20-3l-18 6z"
            fill="url(#bb-shell)"
            opacity="0.22"
          />
        </g>

        <g className="brain-buddy__body" filter="url(#bb-soft)">
          {/* Brain cloud lobes */}
          <path
            d="M36 72c-12-4-18-18-14-30 3-10 12-17 23-18 3-10 14-16 25-14 9 2 16 9 18 17 9-2 19 4 22 13 4 10-1 22-11 26-4 10-14 16-25 16-8 0-16-3-22-8-5 3-11 3-16-2z"
            fill="url(#bb-brain)"
          />
          <path
            d="M42 48c4-8 14-12 24-10M58 40c6-4 14-3 20 2M48 62c8 4 18 5 28 1"
            fill="none"
            stroke="#f5d0fe"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.55"
          />

          {/* Face */}
          <g className="brain-buddy__face">
            <ellipse className="brain-buddy__eye brain-buddy__eye--l" cx="48" cy="58" rx="5.2" ry="5.8" fill="#0f172a" />
            <ellipse className="brain-buddy__eye brain-buddy__eye--r" cx="72" cy="58" rx="5.2" ry="5.8" fill="#0f172a" />
            <circle cx="49.8" cy="56.2" r="1.6" fill="#fff" opacity="0.9" />
            <circle cx="73.8" cy="56.2" r="1.6" fill="#fff" opacity="0.9" />
            <path
              className="brain-buddy__mouth"
              d="M54 68c2.2 3.5 9.8 3.5 12 0"
              fill="none"
              stroke="#4c1d95"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              className="brain-buddy__mouth-aha"
              d="M53 67c3.5 5 10.5 5 14 0"
              fill="none"
              stroke="#4c1d95"
              strokeWidth="2.4"
              strokeLinecap="round"
              opacity="0"
            />
            <path
              className="brain-buddy__cheek brain-buddy__cheek--l"
              d="M40 64c2 2 4 2 6 0"
              fill="none"
              stroke="#f0abfc"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.55"
            />
            <path
              className="brain-buddy__cheek brain-buddy__cheek--r"
              d="M74 64c2 2 4 2 6 0"
              fill="none"
              stroke="#f0abfc"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.55"
            />
          </g>

          {/* Lightning spark */}
          <g className="brain-buddy__bolt">
            <path
              d="M64 34 L54 52 H62 L56 70 L74 48 H65 Z"
              fill="url(#bb-bolt)"
              stroke="#fef9c3"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </g>
        </g>

        {/* Wave hand / tip sparkles (decorative) */}
        <g className="brain-buddy__wave-arm" opacity="0">
          <circle cx="94" cy="54" r="9" fill="url(#bb-brain)" />
          <circle cx="97" cy="51" r="2" fill="#fff" opacity="0.7" />
        </g>
        <g className="brain-buddy__sparkles" opacity="0">
          <path d="M22 40 l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fde047" />
          <path d="M98 34 l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z" fill="#93c5fd" />
        </g>
      </svg>
    </div>
  );
}

import { useId, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { LogOut, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { cn } from "@/lib/utils";

/** Vague lumineuse en bas du header — SVG vectoriel (effet mockup « endgame »). */
function HeaderBottomWave() {
  const uid = useId().replace(/:/g, "");
  const gradId = `header-wave-grad-${uid}`;
  return (
    <div className="app-header-cinematic__wave" aria-hidden>
      <svg viewBox="0 0 1440 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5b21b6" />
            <stop offset="30%" stopColor="#c4b5fd" />
            <stop offset="55%" stopColor="#ddd6fe" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>
        </defs>
        <path
          d="M0 26 C160 10 320 34 480 18 S800 6 960 24 S1200 38 1440 20 L1440 40 L0 40 Z"
          fill={`url(#${gradId})`}
          fillOpacity="0.12"
        />
        <path
          d="M0 24 C200 8 400 32 600 18 S1000 4 1200 22 S1360 34 1440 20"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="2.25"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function HeaderBrandMark() {
  const [useFallback, setUseFallback] = useState(false);
  if (useFallback) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center font-black tracking-tight text-sky-100 drop-shadow-md",
          "text-xs sm:text-sm",
        )}
        aria-hidden
      >
        Tu captes ?
      </span>
    );
  }
  return (
    <img
      src="/logo.png"
      alt=""
      width={640}
      height={240}
      decoding="async"
      className={cn(
        "app-header-logo-img block h-24 w-auto max-w-[min(30rem,calc(100vw-3rem))] shrink-0 bg-transparent object-contain object-center align-middle motion-reduce:transition-none",
        "transition-transform duration-200 ease-out group-hover:scale-[1.03] motion-reduce:group-hover:scale-100",
        "sm:h-[5.3rem] sm:max-w-[min(26.5rem,calc(100vw-5rem))] md:h-[5.9rem] md:max-w-[28.5rem]",
      )}
      onError={() => setUseFallback(true)}
    />
  );
}

export function AppHeader() {
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const router = useRouter();
  const level = Math.floor((profile?.total_xp ?? 0) / 100) + 1;
  const currentLevelXp = (profile?.total_xp ?? 0) % 100;
  const xpToNextPalier = currentLevelXp === 0 ? 100 : 100 - currentLevelXp;

  const handleSignOut = async () => {
    await signOut();
    router.navigate({ to: "/" });
  };

  return (
    <header
      className="app-header-cinematic sticky top-0 z-40 overflow-x-clip overflow-y-visible"
    >
      <div className="app-header-cinematic__bg" aria-hidden />
      <div className="app-header-cinematic__stars" aria-hidden />
      <div
        className={cn(
          "relative z-[1] container mx-auto flex w-full min-w-0 max-w-5xl items-center justify-between gap-3 px-3 transition-[min-height,padding] duration-200 ease-out sm:gap-4 sm:px-5 md:px-6",
          "min-h-[3.7rem] py-1.5 sm:min-h-[4.15rem] sm:py-2 md:min-h-[4.35rem]",
          "pt-[max(0.25rem,env(safe-area-inset-top,0px))]",
        )}
      >
        {user ? (
          <div
            className={cn(
              "app-header-profile-card flex w-full min-w-0 items-center justify-between gap-2 overflow-hidden px-2 py-1.5 sm:px-2.5 sm:py-2",
              "transition-[padding] duration-200 ease-out",
            )}
          >
            <Link
              to="/"
              aria-label="Tu captes ? — Accueil"
              className={cn(
                "group flex min-w-0 shrink-0 items-center bg-transparent p-0 outline-offset-4 ring-0",
                "max-w-[min(48%,calc(100vw-12rem))] sm:max-w-[min(52%,19rem)]",
              )}
            >
              <HeaderBrandMark />
              <span className="sr-only">Tu captes ? — Accueil</span>
            </Link>

            <span
              aria-hidden
              className="h-20 w-[2px] shrink-0 rounded-full bg-linear-to-b from-sky-300/0 via-sky-300/45 to-sky-300/0 shadow-[0_0_12px_rgba(56,189,248,0.22)] sm:h-24"
            />

            <div className="flex min-w-0 items-center gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5">
                  <Link
                    to="/reglages"
                    aria-label="Mon profil"
                    className="mr-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sky-300/35 bg-sky-600/20 text-base shadow-[0_0_10px_rgba(56,189,248,0.18)] transition-transform hover:scale-105 sm:h-8 sm:w-8 sm:text-lg"
                  >
                    {profile?.avatar ?? "🙂"}
                  </Link>
                  <p
                    className={cn(
                      "max-w-[7.25rem] truncate text-right font-extrabold leading-tight text-slate-50 transition-[font-size,max-width] duration-300 sm:max-w-[8.5rem]",
                      "text-[11px] sm:text-[12.5px]",
                    )}
                  >
                    {profile?.display_name ?? "Mon profil"}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border border-sky-400/35 bg-sky-600/25 px-1.5 py-px font-bold leading-none text-sky-100 shadow-[0_0_10px_rgba(56,189,248,0.22)] transition-[font-size,padding] duration-300",
                      "text-[10px] sm:text-[10.5px]",
                    )}
                  >
                    Niveau {level}
                  </span>
                </div>
                <span className="sr-only">
                  Niveau {level}, environ {xpToNextPalier} XP avant la suite du parcours.
                </span>
                <div
                  className={cn(
                    "mt-1 flex items-center justify-end gap-1 border-t border-white/10 pt-1 transition-[gap,padding,margin] duration-300 sm:mt-1.5 sm:pt-1.5",
                    "sm:gap-1.25",
                  )}
                >
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    aria-label="Réglages"
                    className={cn(
                      "app-header-icon-ring shrink-0 rounded-full transition-[width,height] duration-300 [&_svg]:size-[1.05rem] sm:[&_svg]:size-[1.1rem]",
                      "h-[1.9rem] w-[1.9rem] sm:h-[2.1rem] sm:w-[2.1rem]",
                      "hover:bg-sky-500/20 hover:text-foreground",
                    )}
                  >
                    <Link to="/reglages">
                      <Settings />
                    </Link>
                  </Button>
                  {isAdmin && (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      aria-label="Administration"
                      className={cn(
                        "app-header-icon-ring shrink-0 rounded-full transition-[width,height] duration-300 [&_svg]:size-[1.05rem] sm:[&_svg]:size-[1.1rem]",
                        "h-[1.9rem] w-[1.9rem] sm:h-[2.1rem] sm:w-[2.1rem]",
                        "hover:bg-sky-500/20 hover:text-foreground",
                      )}
                    >
                      <Link to="/admin">
                        <Shield />
                      </Link>
                    </Button>
                  )}
                  <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    size="icon"
                    aria-label="Se déconnecter"
                    className={cn(
                      "app-header-icon-ring shrink-0 rounded-full transition-[width,height] duration-300 [&_svg]:size-[1.05rem] sm:[&_svg]:size-[1.1rem]",
                      "h-[1.9rem] w-[1.9rem] sm:h-[2.1rem] sm:w-[2.1rem]",
                      "text-slate-300 hover:border-orange-400/50 hover:bg-orange-950/30 hover:text-orange-200",
                    )}
                  >
                    <LogOut />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <Link
              to="/"
              aria-label="Tu captes ? — Accueil"
              className={cn(
                "group flex min-w-0 shrink-0 items-center bg-transparent p-0 outline-offset-4 ring-0",
                "max-w-[min(100%,calc(100vw-6.75rem))] sm:max-w-none",
                "transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:scale-100",
              )}
            >
              <HeaderBrandMark />
              <span className="sr-only">Tu captes ? — Accueil</span>
            </Link>
            <nav className="flex min-w-0 flex-1 justify-end overflow-hidden">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "self-center rounded-full border border-white/14 bg-zinc-900/92 px-4 text-[13px] font-semibold text-white shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_2px_8px_-2px_rgba(0,0,0,0.45)] backdrop-blur-sm",
                  "transition-[height,padding,background-color,border-color,color,transform,box-shadow] duration-200",
                  "hover:border-white/22 hover:bg-zinc-800 hover:text-white hover:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_4px_14px_-4px_rgba(0,0,0,0.55)]",
                  "focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "h-[2.35rem] sm:h-[2.6rem] sm:px-[1.12rem]",
                )}
              >
                <Link to="/connexion">Se connecter</Link>
              </Button>
            </nav>
          </>
        )}
      </div>
      <HeaderBottomWave />
    </header>
  );
}

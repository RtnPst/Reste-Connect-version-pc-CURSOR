import { Link, useLocation } from "@tanstack/react-router";
import { Home, Play, Footprints, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCapteTourNavHighlight } from "@/components/CapteOnboardingTour";
import { cn } from "@/lib/utils";

const HIDE_ON_PATHS = [
  /^\/quiz\/[^/]+$/,
  /^\/quiz\/epoque\/[^/]+$/,
  /^\/niveau\/[^/]+$/,
  /^\/duel\/[^/]+$/,
  /^\/marathon$/,
];

export function AppBottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;
  const tourHighlight = useCapteTourNavHighlight();

  if (HIDE_ON_PATHS.some((pattern) => pattern.test(pathname))) return null;

  const tabs = [
    { to: "/", label: "Accueil", icon: Home, active: pathname === "/", navTab: "home" as const },
    {
      to: "/play",
      label: "Jouer",
      icon: Play,
      active:
        pathname === "/play" ||
        pathname.startsWith("/quiz") ||
        pathname.startsWith("/niveaux") ||
        pathname.startsWith("/question-du-jour") ||
        pathname.startsWith("/duel"),
      navTab: "play" as const,
    },
    {
      to: user ? "/parcours" : "/connexion",
      label: "Parcours",
      icon: Footprints,
      active: pathname.startsWith("/parcours") || pathname.startsWith("/statistiques"),
      navTab: "parcours" as const,
    },
    {
      to: user ? "/reglages" : "/connexion",
      label: "Profil",
      icon: User,
      active: pathname.startsWith("/reglages") || pathname.startsWith("/connexion"),
      navTab: "profil" as const,
    },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.55)] backdrop-blur-xl supports-[backdrop-filter]:bg-card/88 md:hidden">
      <ul className="mx-auto grid w-full max-w-2xl grid-cols-4 gap-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const highlighted = tourHighlight === tab.navTab;
          return (
            <li key={tab.label}>
              <Link
                to={tab.to}
                data-nav-tab={tab.navTab}
                className={cn(
                  "group flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition-[background-color,color,transform,box-shadow,border-color] duration-300",
                  tab.active
                    ? "border border-primary/35 bg-primary/15 text-foreground shadow-[var(--shadow-soft)]"
                    : "border border-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground",
                  highlighted &&
                    "ring-2 ring-primary/70 ring-offset-2 ring-offset-background scale-[1.03] shadow-[0_0_20px_-6px_rgba(61,139,253,0.55)]",
                )}
              >
                <Icon className={`size-4 transition-transform duration-200 ${tab.active ? "scale-105" : "group-hover:scale-105"}`} />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

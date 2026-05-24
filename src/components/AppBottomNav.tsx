import { Link, useLocation } from "@tanstack/react-router";
import { Home, Play, Trophy, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const HIDE_ON_PATHS = [/^\/quiz\/[^/]+$/, /^\/niveau\/[^/]+$/, /^\/duel\/[^/]+$/, /^\/marathon$/, /^\/question-du-jour$/];

export function AppBottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;

  if (HIDE_ON_PATHS.some((pattern) => pattern.test(pathname))) return null;

  const tabs = [
    { to: "/", label: "Accueil", icon: Home, active: pathname === "/" },
    {
      to: "/play",
      label: "Jouer",
      icon: Play,
      active:
        pathname === "/play" ||
        pathname.startsWith("/quiz") ||
        pathname.startsWith("/niveaux") ||
        pathname.startsWith("/question-du-jour"),
    },
    { to: user ? "/parcours" : "/connexion", label: "Parcours", icon: Trophy, active: pathname.startsWith("/parcours") || pathname.startsWith("/statistiques") },
    { to: user ? "/reglages" : "/connexion", label: "Profil", icon: User, active: pathname.startsWith("/reglages") || pathname.startsWith("/connexion") },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-violet-300/20 bg-linear-to-b from-[#191936]/95 via-[#161a33]/96 to-[#111a2f]/98 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2 shadow-[0_-10px_30px_-18px_rgba(76,29,149,0.9)] backdrop-blur-xl md:hidden">
      <ul className="mx-auto grid w-full max-w-2xl grid-cols-4 gap-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <li key={tab.label}>
              <Link
                to={tab.to}
                className={`group flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition-[background-color,color,transform,box-shadow,border-color] ${
                  tab.active
                    ? "border border-violet-300/35 bg-violet-500/22 text-violet-100 shadow-[0_8px_20px_-12px_rgba(139,92,246,0.85)]"
                    : "border border-transparent text-slate-300 hover:border-violet-300/20 hover:bg-violet-500/10 hover:text-violet-100"
                }`}
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

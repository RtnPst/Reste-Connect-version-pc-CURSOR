import { Link, useRouter } from "@tanstack/react-router";
import { LogOut, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export function AppHeader() {
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.navigate({ to: "/" });
  };

  return (
    <header className="border-b-2 border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl flex items-center justify-between h-16 sm:h-20">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-3xl sm:text-4xl">🌟</span>
          <span className="font-extrabold text-lg sm:text-xl text-primary group-hover:underline underline-offset-4">
            Reste connecté !
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/parcours">
                  <span className="text-xl" aria-hidden>
                    {profile?.avatar ?? "🙂"}
                  </span>
                  <span>{profile?.display_name ?? "Mon parcours"}</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="sm:hidden"
                aria-label="Mon parcours"
              >
                <Link to="/parcours">
                  <span className="text-xl" aria-hidden>
                    {profile?.avatar ?? "🙂"}
                  </span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon" aria-label="Réglages">
                <Link to="/reglages">
                  <Settings />
                </Link>
              </Button>
              {isAdmin && (
                <Button asChild variant="ghost" size="icon" aria-label="Administration">
                  <Link to="/admin">
                    <Shield />
                  </Link>
                </Button>
              )}
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                aria-label="Se déconnecter"
              >
                <LogOut />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </>
          ) : (
            <Button asChild variant="accent" size="default">
              <Link to="/connexion">Se connecter</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

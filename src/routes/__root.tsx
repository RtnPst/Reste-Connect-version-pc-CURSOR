import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppBottomNav } from "@/components/AppBottomNav";
import { CapteOnboardingTour } from "@/components/CapteOnboardingTour";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { BRAND_NAME, BRAND_TAGLINE, getPublicAppOrigin } from "@/lib/brand";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-extrabold text-primary">404</h1>
        <h2 className="mt-4 text-2xl font-bold text-foreground">Page introuvable</h2>
        <p className="mt-2 text-base text-muted-foreground">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

const publicOrigin = getPublicAppOrigin();
const ogImage = `${publicOrigin}/icon-512.png`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${BRAND_NAME} — Fil culturel français` },
      {
        name: "description",
        content: BRAND_TAGLINE,
      },
      { property: "og:title", content: `${BRAND_NAME} — Fil culturel` },
      {
        property: "og:description",
        content: BRAND_TAGLINE,
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${publicOrigin}/` },
      { property: "og:image", content: ogImage },
      { property: "og:locale", content: "fr_FR" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: `${BRAND_NAME} — Fil culturel` },
      { name: "twitter:description", content: BRAND_TAGLINE },
      { name: "twitter:image", content: ogImage },
      { name: "theme-color", content: "#3d8bfd" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Tu Captes" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest?v=5" },
      { rel: "icon", href: "/icon-192.png?v=4", sizes: "192x192", type: "image/png" },
      { rel: "shortcut icon", href: "/icon-192.png?v=4", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon-512.png?v=4", sizes: "512x512" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,800&family=Outfit:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="font-large min-w-0 overflow-x-clip">
      <head>
        <HeadContent />
      </head>
      <body className="min-w-0 overflow-x-clip bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] antialiased md:pb-0">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      void navigator.serviceWorker.register("/sw.js");
    });
  }, []);

  return (
    <AuthProvider>
      <OfflineBanner />
      <Outlet />
      <CapteOnboardingTour />
      <Toaster position="top-center" />
      <AppBottomNav />
    </AuthProvider>
  );
}

import { useEffect, useState } from "react";

/** Minimal offline banner — SW may still serve shell; gameplay needs network. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[90] border-b border-amber-500/40 bg-amber-950/95 px-3 py-2 text-center text-sm font-medium text-amber-50 backdrop-blur-sm"
    >
      Tu es hors ligne — le fil et les quiz ont besoin d’une connexion. Réessaie dès que le réseau
      revient.
    </div>
  );
}

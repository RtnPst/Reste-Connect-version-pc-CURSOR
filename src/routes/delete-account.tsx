import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  BRAND_NAME,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO,
  SUPPORT_SLA,
  SUPPORT_SUBJECT_PREFIX,
} from "@/lib/brand";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: `${BRAND_NAME} — Suppression de compte` },
      {
        name: "description",
        content: "Supprimer ton compte Tu Captes ? et les données associées.",
      },
    ],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const mailto = `${SUPPORT_MAILTO}?subject=${encodeURIComponent(`${SUPPORT_SUBJECT_PREFIX} Suppression de compte`)}&body=${encodeURIComponent(
    "Bonjour,\n\nJe demande la suppression de mon compte Tu Captes ? et des données associées.\n\nAdresse e-mail du compte :\n\nMerci.",
  )}`;

  const canConfirm = confirmText.trim().toUpperCase() === "SUPPRIMER";

  const clearLocalAccountArtifacts = () => {
    if (typeof window === "undefined") return;
    const localKeys = [
      "rc_levels_progress_v1",
      "rc_reminder_enabled",
      "rc_reminder_last_shown",
      "marathon_best_score",
      "tc_onboarding_v1_done",
      "tc_onboarding_v2_buddy",
      "tc_buddy_home_tip_dismissed",
    ];
    for (const key of localKeys) window.localStorage.removeItem(key);
    try {
      window.sessionStorage.removeItem("analytics_phase1_session_id");
    } catch {
      /* ignore */
    }
  };

  const handleSelfDelete = async () => {
    if (!user || !canConfirm || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("delete_own_account");
      if (error) throw error;
      clearLocalAccountArtifacts();
      await signOut();
      setDone(true);
      toast.success("Compte supprimé");
      navigate({ to: "/" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Suppression impossible pour le moment";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <AppHeader />
      <main className="w-full flex-1 overflow-x-clip px-4 py-8 sm:px-6 sm:py-12">
        <article className="mx-auto w-full max-w-3xl rounded-3xl border-2 border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Supprimer mon compte
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Efface le compte et les données associées (progression, captures, duels…).
          </p>

          {user && !done ? (
            <section className="mt-8 space-y-4">
              <p className="text-base sm:text-lg">
                Connecté en tant que{" "}
                <span className="font-semibold">{user.email ?? "compte"}</span>. Cette action est
                définitive.
              </p>
              <label className="block space-y-2 text-sm" htmlFor="confirm-delete">
                <span className="font-medium">
                  Tape <span className="font-extrabold tracking-wide">SUPPRIMER</span> pour confirmer
                </span>
                <Input
                  id="confirm-delete"
                  autoComplete="off"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="SUPPRIMER"
                  disabled={busy}
                />
              </label>
              <Button
                type="button"
                variant="destructive"
                size="lg"
                className="w-full sm:w-auto"
                disabled={!canConfirm || busy}
                onClick={() => void handleSelfDelete()}
              >
                {busy ? "Suppression…" : "Supprimer mon compte maintenant"}
              </Button>
            </section>
          ) : (
            <section className="mt-8 space-y-4 text-base sm:text-lg">
              <p>
                Connecte-toi pour supprimer ton compte directement, ou écris-nous depuis l’adresse
                liée au compte :
              </p>
              <p>
                <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/connexion">
                  Se connecter
                </Link>
              </p>
            </section>
          )}

          <section className="mt-10 space-y-3 border-t border-border pt-6 text-sm text-muted-foreground">
            <p>
              Alternative support (délai indicatif {SUPPORT_SLA}) :{" "}
              <a className="font-semibold text-primary underline-offset-4 hover:underline" href={mailto}>
                {SUPPORT_EMAIL}
              </a>
            </p>
            <p>
              <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/privacy">
                Politique de confidentialité
              </Link>
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
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
        content: "Demander la suppression de ton compte Tu Captes ?",
      },
    ],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const mailto = `${SUPPORT_MAILTO}?subject=${encodeURIComponent(`${SUPPORT_SUBJECT_PREFIX} Suppression de compte`)}&body=${encodeURIComponent(
    "Bonjour,\n\nJe demande la suppression de mon compte Tu Captes ? et des données associées.\n\nAdresse e-mail du compte :\n\nMerci.",
  )}`;

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <AppHeader />
      <main className="w-full flex-1 overflow-x-clip px-4 py-8 sm:px-6 sm:py-12">
        <article className="mx-auto w-full max-w-3xl rounded-3xl border-2 border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Supprimer mon compte
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Processus support — délai indicatif {SUPPORT_SLA}
          </p>

          <section className="mt-8 space-y-4 text-base sm:text-lg">
            <p>
              Pour supprimer ton compte et les données associées (progression, captures, duels…),
              envoie un e-mail depuis l’adresse liée au compte :
            </p>
            <a className="font-semibold text-primary underline-offset-4 hover:underline" href={mailto}>
              {SUPPORT_EMAIL}
            </a>
            <p className="text-sm text-muted-foreground">
              Objet suggéré : « {SUPPORT_SUBJECT_PREFIX} Suppression de compte ». Indique l’e-mail
              du compte. Nous confirmons quand c’est fait.
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

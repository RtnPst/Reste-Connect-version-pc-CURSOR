import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { BRAND_NAME, SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/brand";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: `${BRAND_NAME} — Mentions légales` },
      {
        name: "description",
        content: "Mentions légales de Tu Captes ?",
      },
    ],
  }),
  component: MentionsLegalesPage,
});

function MentionsLegalesPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <AppHeader />
      <main className="w-full flex-1 overflow-x-clip px-4 py-8 sm:px-6 sm:py-12">
        <article className="mx-auto w-full max-w-3xl rounded-3xl border-2 border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Mentions légales</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dernière mise à jour : juillet 2026</p>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Éditeur</h2>
            <p>
              {BRAND_NAME} est édité à titre individuel par Nicolas Paysant.
            </p>
            <p>
              Contact :{" "}
              <a className="font-semibold text-primary underline-offset-4 hover:underline" href={SUPPORT_MAILTO}>
                {SUPPORT_EMAIL}
              </a>
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Hébergement</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                Application web / PWA : Cloudflare, Inc. (Cloudflare Workers &amp; Pages)
              </li>
              <li>Base de données et authentification : Supabase, Inc.</li>
            </ul>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Propriété intellectuelle</h2>
            <p>
              Les textes, interfaces et éléments graphiques de {BRAND_NAME} sont protégés. Toute
              reproduction non autorisée est interdite. Les expressions et références culturelles
              citées restent la propriété de leurs ayants droit respectifs.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Documents associés</h2>
            <div className="flex flex-col gap-2">
              <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/privacy">
                Politique de confidentialité
              </Link>
              <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/terms">
                Conditions d’utilisation
              </Link>
              <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/delete-account">
                Suppression de compte
              </Link>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}

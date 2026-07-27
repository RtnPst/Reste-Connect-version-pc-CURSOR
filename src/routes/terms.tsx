import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { BRAND_NAME, SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/brand";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: `${BRAND_NAME} — Conditions d’utilisation` },
      {
        name: "description",
        content: "Conditions d’utilisation de Tu Captes — fil culturel français.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <AppHeader />
      <main className="w-full flex-1 overflow-x-clip px-4 py-8 sm:px-6 sm:py-12">
        <article className="mx-auto w-full max-w-3xl rounded-3xl border-2 border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Conditions d’utilisation
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{BRAND_NAME}</p>
          <p className="mt-1 text-sm text-muted-foreground">Dernière mise à jour : juillet 2026</p>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Présentation</h2>
            <p>
              {BRAND_NAME} est un fil culturel : tu croises des mots et codes du web vivant en
              France, tu les captes, et tu laisses des traces — pas un classement compétitif.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Comptes</h2>
            <p>
              Certaines fonctions (duel, progression complète, mémoire des mots) nécessitent un
              compte. Tu es responsable de la confidentialité de tes identifiants.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Utilisation acceptable</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>ne pas perturber le service ni automatiser les parties de façon abusive</li>
              <li>ne pas usurper l’identité d’autrui</li>
              <li>ne pas utiliser le service à des fins illégales</li>
              <li>respecter les autres joueurs dans les interactions (ex. duel)</li>
            </ul>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Contenu</h2>
            <p>
              Les questions, explications et calendrier du fil du jour peuvent évoluer. Les
              définitions sont éditoriales et contextuelles — le langage vivant change vite.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Disponibilité</h2>
            <p>
              Nous visons un service stable, sans garantie de disponibilité permanente ni
              d’absence d’erreurs.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Contact</h2>
            <p>
              <a className="font-semibold text-primary underline-offset-4 hover:underline" href={SUPPORT_MAILTO}>
                {SUPPORT_EMAIL}
              </a>
            </p>
            <p>
              <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/mentions-legales">
                Mentions légales
              </Link>
              {" · "}
              <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/privacy">
                Confidentialité
              </Link>
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}

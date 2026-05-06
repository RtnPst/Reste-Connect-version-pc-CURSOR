import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Tu Captes ? — Conditions d’utilisation" },
      {
        name: "description",
        content: "Conditions d’utilisation de Tu Captes ?",
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
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Conditions d’utilisation — Tu Captes ?
          </p>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Dernière mise à jour : Mai 2026
          </p>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Présentation</h2>
            <p>
              Tu Captes ? est une application de quiz et de culture web destinée au divertissement
              et à l’apprentissage.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Comptes utilisateurs</h2>
            <p>Certaines fonctionnalités nécessitent la création d’un compte.</p>
            <p>
              Les utilisateurs sont responsables des informations qu’ils renseignent ainsi que de la
              sécurité de leur compte.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Utilisation acceptable</h2>
            <p>Il est interdit :</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>de perturber le fonctionnement du service</li>
              <li>d’exploiter des bugs de manière abusive</li>
              <li>d’utiliser l’application à des fins illégales</li>
              <li>d’usurper l’identité d’un autre utilisateur</li>
            </ul>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Contenu</h2>
            <p>Les contenus proposés dans l’application peuvent évoluer à tout moment.</p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Disponibilité</h2>
            <p>
              Nous faisons notre possible pour maintenir le service accessible, mais aucune garantie
              de disponibilité permanente n’est fournie.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Modification du service</h2>
            <p>L’application peut être modifiée, suspendue ou améliorée à tout moment.</p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Contact</h2>
            <p>Contact :</p>
            <a className="font-semibold text-primary underline-offset-4 hover:underline" href="mailto:npaysant@gmail.com">
              npaysant@gmail.com
            </a>
          </section>
        </article>
      </main>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Tu Captes ? — Politique de confidentialité" },
      {
        name: "description",
        content: "Politique de confidentialité de Tu Captes ?",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <AppHeader />
      <main className="w-full flex-1 overflow-x-clip px-4 py-8 sm:px-6 sm:py-12">
        <article className="mx-auto w-full max-w-3xl rounded-3xl border-2 border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Politique de confidentialité
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Politique de confidentialité — Tu Captes ?
          </p>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Dernière mise à jour : Mai 2026
          </p>

          <p className="mt-6 text-base sm:text-lg">
            Tu Captes ? respecte la vie privée de ses utilisateurs.
          </p>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Données collectées</h2>
            <p>Lors de l’utilisation de l’application, nous pouvons collecter :</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>adresse e-mail</li>
              <li>pseudonyme / nom d’utilisateur</li>
              <li>données liées à la progression dans le jeu (XP, niveau, séries, badges)</li>
              <li>informations techniques nécessaires au fonctionnement de l’application</li>
            </ul>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Authentification</h2>
            <p>Les utilisateurs peuvent :</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>créer un compte avec une adresse e-mail</li>
              <li>se connecter via Google</li>
            </ul>
            <p>
              L’authentification et le stockage sécurisé des comptes sont gérés via Supabase.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Utilisation des données</h2>
            <p>Les données sont utilisées uniquement pour :</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>permettre la connexion au compte</li>
              <li>sauvegarder la progression</li>
              <li>améliorer l’expérience utilisateur</li>
              <li>assurer la sécurité et le bon fonctionnement du service</li>
            </ul>
            <p>Nous ne revendons pas les données personnelles.</p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Conservation des données</h2>
            <p>Les données sont conservées tant que le compte utilisateur existe.</p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Suppression du compte</h2>
            <p>
              Les utilisateurs peuvent demander la suppression de leur compte et de leurs données
              associées.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Cookies et technologies similaires</h2>
            <p>
              Certaines technologies techniques peuvent être utilisées afin d’assurer le bon
              fonctionnement de l’application.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Contact</h2>
            <p>Pour toute question concernant la confidentialité :</p>
            <a className="font-semibold text-primary underline-offset-4 hover:underline" href="mailto:npaysant@gmail.com">
              npaysant@gmail.com
            </a>
          </section>
        </article>
      </main>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { BRAND_NAME, SUPPORT_EMAIL, SUPPORT_MAILTO, SUPPORT_SLA } from "@/lib/brand";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: `${BRAND_NAME} — Politique de confidentialité` },
      {
        name: "description",
        content: "Politique de confidentialité de Tu Captes — fil culturel français.",
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
          <p className="mt-2 text-sm text-muted-foreground">
            {BRAND_NAME} — fil culturel français
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Dernière mise à jour : juillet 2026</p>

          <p className="mt-6 text-base sm:text-lg">
            Cette politique décrit quelles données nous traitons lorsque tu utilises {BRAND_NAME}{" "}
            (site web, PWA installable, et application Android Trusted Web Activity).
          </p>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Données collectées</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>adresse e-mail et identifiants de connexion</li>
              <li>pseudonyme / nom d’affichage</li>
              <li>
                données de parcours (passages, scores, séries, XP, badges, concepts captés)
              </li>
              <li>
                événements d’usage product (ex. démarrage d’un mode, partage) lorsque l’analytics
                produit est activée — liés à ton compte connecté
              </li>
              <li>
                données techniques nécessaires (session, appareil / navigateur, journaux
                d’erreurs d’infrastructure)
              </li>
            </ul>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Authentification</h2>
            <p>Tu peux créer un compte e-mail / mot de passe ou te connecter via Google.</p>
            <p>
              L’authentification et le stockage des comptes sont assurés par Supabase (sous-traitant
              technique).
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Utilisation des données</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>fournir le fil du jour, les angles, l’époque, le duel et le parcours</li>
              <li>sauvegarder ta progression et tes captures</li>
              <li>améliorer le produit (analytics agrégée / produit, sans revente)</li>
              <li>sécurité, prévention d’abus, support</li>
            </ul>
            <p>Nous ne revendons pas tes données personnelles.</p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">PWA, rappels et application Android</h2>
            <p>
              La version installable (PWA) et l’app Android (Trusted Web Activity) affichent le même
              service web. Les rappels optionnels utilisent la permission Notifications du
              navigateur / de l’appareil pour un rappel <strong>local</strong> lorsque tu rouvres
              l’app — ce n’est pas une campagne push serveur distante.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Conservation</h2>
            <p>
              Les données de compte sont conservées tant que le compte existe. Après suppression,
              elles sont effacées ou anonymisées dans un délai raisonnable compatible avec nos
              sauvegardes techniques.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Suppression du compte</h2>
            <p>
              Tu peux supprimer ton compte toi-même depuis{" "}
              <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/delete-account">
                cette page
              </Link>{" "}
              (connecté), ou nous écrire — réponse sous {SUPPORT_SLA} en règle générale.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Cookies et stockage local</h2>
            <p>
              Nous utilisons le stockage local / session pour la connexion, le confort (ex. onboarding,
              rappels) et le fonctionnement de la PWA. Pas de publicité tierce.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-2xl font-extrabold">Contact</h2>
            <p>
              Confidentialité &amp; support :{" "}
              <a className="font-semibold text-primary underline-offset-4 hover:underline" href={SUPPORT_MAILTO}>
                {SUPPORT_EMAIL}
              </a>
            </p>
            <p>
              Voir aussi les{" "}
              <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/mentions-legales">
                mentions légales
              </Link>
              .
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}

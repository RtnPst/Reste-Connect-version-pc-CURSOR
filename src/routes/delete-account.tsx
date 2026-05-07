import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Tu Captes ? — Suppression de compte" },
      {
        name: "description",
        content: "Informations pour demander la suppression de votre compte Tu Captes ?",
      },
    ],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <AppHeader />
      <main className="w-full flex-1 overflow-x-clip px-4 py-8 sm:px-6 sm:py-12">
        <article className="mx-auto w-full max-w-3xl rounded-3xl border-2 border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Supprimer mon compte
          </h1>

          <section className="mt-8 space-y-4 text-base sm:text-lg">
            <h2 className="text-2xl font-extrabold">Suppression de compte</h2>
            <p>Pour demander la suppression de votre compte et des données associées :</p>
            <p>Envoyez un e-mail à :</p>
            <a className="font-semibold text-primary underline-offset-4 hover:underline" href="mailto:npaysant@gmail.com">
              npaysant@gmail.com
            </a>
            <p>avec l’adresse utilisée pour votre compte Tu Captes ?.</p>
            <p>La suppression sera effectuée dans les meilleurs délais.</p>
          </section>
        </article>
      </main>
    </div>
  );
}

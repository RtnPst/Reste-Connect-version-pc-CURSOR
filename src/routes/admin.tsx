import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, Plus, Pencil, Save, X, Shield, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { THEMES, THEME_KEYS, type ThemeKey } from "@/lib/themes";
import {
  generateQuestionsPreview,
  insertAcceptedGeneratedQuestions,
  type AiPreviewQuestion,
} from "@/utils/questions.functions";

type Difficulty = "facile" | "moyen" | "difficile";

type Question = {
  id: string;
  theme: ThemeKey;
  difficulty: Difficulty;
  question: string;
  choices: string[];
  correct_index: number;
  explanation: string;
  is_active: boolean;
};

type PreviewRow = AiPreviewQuestion & { key: string; accepted: boolean };

const EMPTY: Omit<Question, "id"> = {
  theme: "vocabulaire",
  difficulty: "facile",
  question: "",
  choices: ["", "", "", ""],
  correct_index: 0,
  explanation: "",
  is_active: true,
};

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Tu captes ?" },
      { name: "description", content: "Gestion des questions du quiz." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { session } = useAuth();
  const { loading: authLoading } = useRequireAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [filterTheme, setFilterTheme] = useState<ThemeKey | "all">("all");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Omit<Question, "id">>(EMPTY);

  const previewFn = useServerFn(generateQuestionsPreview);
  const insertFn = useServerFn(insertAcceptedGeneratedQuestions);

  const [genTheme, setGenTheme] = useState<ThemeKey>("vocabulaire");
  const [genDifficulty, setGenDifficulty] = useState<"facile" | "moyen" | "difficile">("moyen");
  const [genCount, setGenCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);

  const loadQuestions = async () => {
    setLoadingQ(true);
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("theme")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Impossible de charger les questions");
    } else {
      setQuestions((data as Question[]) ?? []);
    }
    setLoadingQ(false);
  };

  useEffect(() => {
    if (isAdmin) loadQuestions();
  }, [isAdmin]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen min-w-0 overflow-x-clip bg-background">
        <AppHeader />
        <div className="container mx-auto w-full min-w-0 max-w-4xl overflow-x-clip px-4 py-12 text-center text-muted-foreground">
          Chargement…
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen min-w-0 overflow-x-clip bg-background">
        <AppHeader />
        <main className="container mx-auto w-full min-w-0 max-w-2xl overflow-x-clip px-4 py-16 text-center">
          <Shield className="mx-auto size-16 text-muted-foreground mb-4" />
          <h1 className="text-3xl font-extrabold mb-3">Accès réservé</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Cette page est réservée aux administrateurs.
          </p>
          <Button asChild variant="outline">
            <Link to="/">Retour à l'accueil</Link>
          </Button>
        </main>
      </div>
    );
  }

  const startNew = () => {
    setEditingId("new");
    setDraft(EMPTY);
  };

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setDraft({
      theme: q.theme,
      difficulty: q.difficulty,
      question: q.question,
      choices: [...q.choices, "", "", "", ""].slice(0, 4),
      correct_index: q.correct_index,
      explanation: q.explanation,
      is_active: q.is_active,
    });
  };

  const cancel = () => {
    setEditingId(null);
    setDraft(EMPTY);
  };

  const save = async () => {
    if (!draft.question.trim()) return toast.error("La question est vide");
    if (draft.choices.some((c) => !c.trim()))
      return toast.error("Toutes les réponses doivent être remplies");
    if (!draft.explanation.trim()) return toast.error("L'explication est vide");

    if (editingId === "new") {
      const { error } = await supabase.from("questions").insert(draft);
      if (error) return toast.error(error.message);
      toast.success("Question ajoutée !");
    } else if (editingId) {
      const { error } = await supabase.from("questions").update(draft).eq("id", editingId);
      if (error) return toast.error(error.message);
      toast.success("Question mise à jour !");
    }
    cancel();
    loadQuestions();
  };

  const toggleActive = async (q: Question) => {
    const { error } = await supabase
      .from("questions")
      .update({ is_active: !q.is_active })
      .eq("id", q.id);
    if (error) return toast.error(error.message);
    toast.success(q.is_active ? "Question masquée" : "Question activée");
    loadQuestions();
  };

  const handleGeneratePreview = async () => {
    if (!session?.access_token) return toast.error("Session expirée");
    setGenerating(true);
    try {
      const result = await previewFn({
        data: {
          theme: genTheme,
          difficulty: genDifficulty,
          count: genCount,
          accessToken: session.access_token,
        },
      });
      if (result.ok) {
        const rows: PreviewRow[] = result.questions.map((q) => ({
          ...q,
          key: crypto.randomUUID(),
          accepted: true,
        }));
        setPreviewRows(rows);
        if (result.validationNotes?.length) {
          toast.message("Aperçu prêt", {
            description: result.validationNotes.join(" · "),
          });
        } else {
          toast.success(`${rows.length} question(s) à relire avant insertion.`);
        }
      } else {
        toast.error(result.error);
        if ("validationNotes" in result && result.validationNotes?.length) {
          toast.message("Détails validation", {
            description: result.validationNotes.join("\n"),
          });
        }
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleInsertAccepted = async () => {
    if (!session?.access_token) return toast.error("Session expirée");
    if (!previewRows?.length) return;
    const payload = previewRows.filter((r) => r.accepted).map(({ key: _k, accepted: _a, ...q }) => q);
    if (!payload.length) {
      toast.error("Coche au moins une question à insérer.");
      return;
    }
    setInserting(true);
    try {
      const result = await insertFn({
        data: {
          theme: genTheme,
          difficulty: genDifficulty,
          questions: payload,
          accessToken: session.access_token,
        },
      });
      if (result.ok) {
        const skipped = "skippedDuplicates" in result ? result.skippedDuplicates : 0;
        const base = `${result.inserted} question(s) publiée(s) !`;
        toast.success(
          skipped > 0 ? `${base} (${skipped} doublon(s) déjà en base ignorée(s).)` : base,
        );
        setPreviewRows(null);
        loadQuestions();
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setInserting(false);
    }
  };

  const setAllAccepted = (value: boolean) => {
    if (!previewRows) return;
    setPreviewRows(previewRows.map((r) => ({ ...r, accepted: value })));
  };

  const toggleRowAccepted = (key: string, checked: boolean) => {
    if (!previewRows) return;
    setPreviewRows(previewRows.map((r) => (r.key === key ? { ...r, accepted: checked } : r)));
  };

  const acceptedCount = previewRows?.filter((r) => r.accepted).length ?? 0;

  const filtered =
    filterTheme === "all" ? questions : questions.filter((q) => q.theme === filterTheme);

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-background">
      <AppHeader />
      <main className="container mx-auto w-full min-w-0 max-w-5xl overflow-x-clip px-3 py-8 sm:px-6 space-y-6">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-extrabold flex flex-wrap items-center gap-2 break-words">
              <Shield className="shrink-0 text-primary" /> Administration
            </h1>
            <p className="text-muted-foreground">{questions.length} questions au total</p>
          </div>
          <Button onClick={startNew} size="lg" variant="accent" className="w-full shrink-0 sm:w-auto">
            <Plus /> Nouvelle question
          </Button>
        </div>

        {/* AI Generator */}
        <div className="min-w-0 rounded-2xl border-2 border-accent/30 bg-gradient-to-br from-accent-soft/40 to-primary-soft/40 p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-6 text-accent" />
            <h2 className="text-xl font-extrabold">Générateur de questions Tu captes ?</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            L&apos;IA propose un lot de questions au ton du jeu (fun, léger, taquin).{" "}
            <strong className="text-foreground">Rien n&apos;est publié tant que tu n&apos;as pas validé</strong>{" "}
            l&apos;aperçu ci-dessous et cliqué sur insérer.
          </p>
          <details className="min-w-0 rounded-xl border border-border/80 bg-background/60 px-3 py-3 text-sm sm:px-4">
            <summary className="cursor-pointer font-bold text-foreground outline-none marker:text-primary">
              Comment activer la génération (clé OpenAI) ?
            </summary>
            <div className="mt-3 space-y-3 text-muted-foreground leading-relaxed">
              <p>
                Ce n&apos;est <strong className="text-foreground">pas un mot de passe dans l&apos;interface</strong> :
                c&apos;est une <strong className="text-foreground">variable d&apos;environnement</strong> — un nom
                fixe (<code className="rounded bg-muted px-1 py-0.5 text-xs">OPENAI_API_KEY</code>) et une valeur
                secrète que le <strong className="text-foreground">serveur</strong> lit au démarrage.
              </p>
              <ol className="list-decimal space-y-2 pl-5 text-foreground/90">
                <li>
                  À la racine du projet, copie{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.example</code> vers un fichier nommé{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">.env</code> (avec le point au début).
                </li>
                <li>
                  Sur{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    platform.openai.com → API keys
                  </a>
                  , crée une clé du type <code className="rounded bg-muted px-1 text-xs">sk-…</code>, colle-la dans{" "}
                  <code className="rounded bg-muted px-1 text-xs">.env</code> :{" "}
                  <code className="mt-1 block max-w-full overflow-x-auto break-all rounded bg-muted px-2 py-1.5 text-xs">
                    OPENAI_API_KEY=sk-ta-cle-ici
                  </code>
                </li>
                <li>
                  Redémarre le serveur de dev (<code className="rounded bg-muted px-1 text-xs">npm run dev</code>) pour
                  que la clé soit prise en compte.
                </li>
              </ol>
              <p>
                En production (ex. Cloudflare), ajoute la même variable en <strong className="text-foreground">secret</strong>{" "}
                (dashboard du Worker ou{" "}
                <code className="rounded bg-muted px-1 text-xs">wrangler secret put OPENAI_API_KEY</code>). Autres
                fournisseurs : voir les lignes <code className="rounded bg-muted px-1 text-xs">AI_*</code> dans{" "}
                <code className="rounded bg-muted px-1 text-xs">.env.example</code>.
              </p>
            </div>
          </details>
          <div className="grid min-w-0 gap-3 sm:grid-cols-3">
            <div className="min-w-0">
              <Label>Thème</Label>
              <Select value={genTheme} onValueChange={(v) => setGenTheme(v as ThemeKey)}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEME_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {THEMES[k].emoji} {THEMES[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label>Difficulté</Label>
              <Select
                value={genDifficulty}
                onValueChange={(v) => setGenDifficulty(v as "facile" | "moyen" | "difficile")}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facile">Facile</SelectItem>
                  <SelectItem value="moyen">Moyen</SelectItem>
                  <SelectItem value="difficile">Difficile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label>Nombre (1–30)</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={genCount}
                onChange={(e) =>
                  setGenCount(Math.max(1, Math.min(30, Number(e.target.value) || 10)))
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleGeneratePreview}
              disabled={generating}
              variant="accent"
              size="lg"
              className="min-w-0 max-w-full flex-1 basis-full whitespace-normal text-center sm:flex-none sm:basis-auto"
            >
              {generating ? (
                <>
                  <Loader2 className="animate-spin" /> Génération…
                </>
              ) : (
                <>
                  <Sparkles /> Générer {genCount} questions (aperçu)
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Preview before insert */}
        {previewRows && previewRows.length > 0 && (
          <div className="min-w-0 rounded-2xl border-2 border-primary/40 bg-card p-4 sm:p-6 space-y-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-extrabold">Aperçu — valider avant publication</h2>
                <p className="text-sm text-muted-foreground">
                  {acceptedCount} / {previewRows.length} cochée(s) pour insertion · thème{" "}
                  <span className="font-semibold text-foreground">
                    {THEMES[genTheme].emoji} {THEMES[genTheme].short}
                  </span>{" "}
                  · {genDifficulty}
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAllAccepted(true)}>
                  <Check className="size-4" /> Tout inclure
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setAllAccepted(false)}>
                  Tout retirer
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewRows(null)}>
                  Annuler l&apos;aperçu
                </Button>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
              <Button
                type="button"
                variant="default"
                size="lg"
                disabled={inserting || acceptedCount === 0}
                onClick={handleInsertAccepted}
                className="min-w-0 max-w-full flex-1 basis-full whitespace-normal text-center sm:flex-none sm:basis-auto"
              >
                {inserting ? (
                  <>
                    <Loader2 className="animate-spin" /> Insertion…
                  </>
                ) : (
                  <>Insérer les questions sélectionnées ({acceptedCount})</>
                )}
              </Button>
            </div>
            <ul className="space-y-4 max-h-[min(70vh,720px)] overflow-y-auto pr-1">
              {previewRows.map((row, idx) => (
                <li
                  key={row.key}
                  className={`rounded-xl border-2 p-4 ${row.accepted ? "border-border bg-background/60" : "border-dashed border-muted opacity-70"}`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`preview-${row.key}`}
                      checked={row.accepted}
                      onCheckedChange={(v) => toggleRowAccepted(row.key, v === true)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-xs font-bold text-muted-foreground">#{idx + 1}</p>
                      <p className="break-words font-semibold text-base">{row.question}</p>
                      <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
                        {row.choices.map((c, i) => (
                          <li
                            key={`${row.key}-c${i}`}
                            className={
                              i === row.correct_index ? "text-success font-semibold text-foreground" : ""
                            }
                          >
                            {c}
                            {i === row.correct_index ? " ✓" : ""}
                          </li>
                        ))}
                      </ol>
                      <p className="text-sm text-muted-foreground border-t border-border pt-2">
                        {row.explanation}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Filter */}
        <div className="flex min-w-0 flex-wrap gap-2">
          <Button
            variant={filterTheme === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterTheme("all")}
            className="min-w-0 max-w-full shrink"
          >
            Tous ({questions.length})
          </Button>
          {THEME_KEYS.map((k) => {
            const count = questions.filter((q) => q.theme === k).length;
            return (
              <Button
                key={k}
                variant={filterTheme === k ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterTheme(k)}
                className="min-w-0 max-w-full shrink break-words px-2 text-left sm:px-3"
              >
                {THEMES[k].emoji} {THEMES[k].short} ({count})
              </Button>
            );
          })}
        </div>

        {/* Editor */}
        {editingId && (
          <div className="min-w-0 rounded-2xl border-2 border-primary bg-card p-4 sm:p-6 space-y-4">
            <h2 className="text-xl font-bold">
              {editingId === "new" ? "Nouvelle question" : "Modifier la question"}
            </h2>

            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <Label>Thème</Label>
                <Select
                  value={draft.theme}
                  onValueChange={(v) => setDraft({ ...draft, theme: v as ThemeKey })}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEME_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {THEMES[k].emoji} {THEMES[k].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <Label>Difficulté</Label>
                <Select
                  value={draft.difficulty}
                  onValueChange={(v) => setDraft({ ...draft, difficulty: v as Difficulty })}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facile">Facile</SelectItem>
                    <SelectItem value="moyen">Moyen</SelectItem>
                    <SelectItem value="difficile">Difficile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Question</Label>
              <Textarea
                value={draft.question}
                onChange={(e) => setDraft({ ...draft, question: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Réponses (cliquez sur le rond pour marquer la bonne)</Label>
              {draft.choices.map((c, i) => (
                <div key={i} className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, correct_index: i })}
                    className={`size-8 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                      draft.correct_index === i
                        ? "bg-success text-success-foreground border-success"
                        : "border-border"
                    }`}
                    aria-label={`Marquer la réponse ${i + 1} comme correcte`}
                  >
                    {String.fromCharCode(65 + i)}
                  </button>
                  <Input
                    value={c}
                    onChange={(e) => {
                      const newChoices = [...draft.choices];
                      newChoices[i] = e.target.value;
                      setDraft({ ...draft, choices: newChoices });
                    }}
                    placeholder={`Réponse ${i + 1}`}
                    className="min-w-0 flex-1"
                  />
                </div>
              ))}
            </div>

            <div>
              <Label>Explication</Label>
              <Textarea
                value={draft.explanation}
                onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex min-w-0 flex-wrap gap-3">
              <Button onClick={save} variant="accent" className="min-w-0 shrink">
                <Save /> Enregistrer
              </Button>
              <Button onClick={cancel} variant="outline" className="min-w-0 shrink">
                <X /> Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Questions list */}
        <div className="space-y-3">
          {loadingQ ? (
            <p className="text-center text-muted-foreground py-8">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune question.</p>
          ) : (
            filtered.map((q) => (
              <div
                key={q.id}
                className={`rounded-xl border-2 p-4 bg-card ${
                  q.is_active ? "border-border" : "border-dashed border-muted opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
                      <span>
                        {THEMES[q.theme]?.emoji} {THEMES[q.theme]?.short}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{q.difficulty}</span>
                      {!q.is_active && <span className="text-warning">• Masquée</span>}
                    </div>
                    <p className="break-words font-semibold">{q.question}</p>
                    <p className="text-sm text-success mt-1">✓ {q.choices[q.correct_index]}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      onClick={() => startEdit(q)}
                      variant="ghost"
                      size="icon"
                      aria-label="Modifier"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      onClick={() => toggleActive(q)}
                      variant="ghost"
                      size="icon"
                      aria-label={q.is_active ? "Masquer la question" : "Réactiver la question"}
                    >
                      {q.is_active ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

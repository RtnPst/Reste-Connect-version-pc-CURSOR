import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Save, X, Shield, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
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
import { generateQuestions } from "@/utils/questions.functions";

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
      { title: "Administration — Reste connecté !" },
      { name: "description", content: "Gestion des questions du quiz." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { session } = useAuth();
  const { user, loading: authLoading } = useRequireAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [filterTheme, setFilterTheme] = useState<ThemeKey | "all">("all");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Omit<Question, "id">>(EMPTY);

  // AI generator state
  const generateFn = useServerFn(generateQuestions);
  const [genTheme, setGenTheme] = useState<ThemeKey>("vocabulaire");
  const [genDifficulty, setGenDifficulty] = useState<"facile" | "moyen" | "difficile">("moyen");
  const [genCount, setGenCount] = useState(10);
  const [generating, setGenerating] = useState(false);

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
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 max-w-4xl py-12 text-center text-muted-foreground">
          Chargement…
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 max-w-2xl py-16 text-center">
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
    // Validation
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

  const handleGenerate = async () => {
    if (!session?.access_token) return toast.error("Session expirée");
    setGenerating(true);
    try {
      const result = await generateFn({
        data: {
          theme: genTheme,
          difficulty: genDifficulty,
          count: genCount,
          accessToken: session.access_token,
        },
      });
      if (result.ok) {
        toast.success(`✨ ${result.inserted} questions ajoutées !`);
        loadQuestions();
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const filtered =
    filterTheme === "all" ? questions : questions.filter((q) => q.theme === filterTheme);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 sm:px-6 max-w-5xl py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold flex items-center gap-2">
              <Shield className="text-primary" /> Administration
            </h1>
            <p className="text-muted-foreground">{questions.length} questions au total</p>
          </div>
          <Button onClick={startNew} size="lg" variant="accent">
            <Plus /> Nouvelle question
          </Button>
        </div>

        {/* AI Generator */}
        <div className="rounded-2xl border-2 border-accent/30 bg-gradient-to-br from-accent-soft/40 to-primary-soft/40 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-6 text-accent" />
            <h2 className="text-xl font-extrabold">Générateur de questions IA</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Lovable AI génère un lot de questions pédagogiques. Vérifiez-les ensuite ci-dessous
            (vous pouvez masquer ou modifier celles qui ne vous plaisent pas).
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Thème</Label>
              <Select value={genTheme} onValueChange={(v) => setGenTheme(v as ThemeKey)}>
                <SelectTrigger>
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
            <div>
              <Label>Difficulté</Label>
              <Select
                value={genDifficulty}
                onValueChange={(v) => setGenDifficulty(v as "facile" | "moyen" | "difficile")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facile">Facile</SelectItem>
                  <SelectItem value="moyen">Moyen</SelectItem>
                  <SelectItem value="difficile">Difficile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
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
          <Button onClick={handleGenerate} disabled={generating} variant="accent" size="lg">
            {generating ? (
              <>
                <Loader2 className="animate-spin" /> Génération…
              </>
            ) : (
              <>
                <Sparkles /> Générer {genCount} questions
              </>
            )}
          </Button>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterTheme === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterTheme("all")}
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
              >
                {THEMES[k].emoji} {THEMES[k].short} ({count})
              </Button>
            );
          })}
        </div>

        {/* Editor */}
        {editingId && (
          <div className="rounded-2xl border-2 border-primary bg-card p-6 space-y-4">
            <h2 className="text-xl font-bold">
              {editingId === "new" ? "Nouvelle question" : "Modifier la question"}
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Thème</Label>
                <Select
                  value={draft.theme}
                  onValueChange={(v) => setDraft({ ...draft, theme: v as ThemeKey })}
                >
                  <SelectTrigger>
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
              <div>
                <Label>Difficulté</Label>
                <Select
                  value={draft.difficulty}
                  onValueChange={(v) => setDraft({ ...draft, difficulty: v as Difficulty })}
                >
                  <SelectTrigger>
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
                <div key={i} className="flex items-center gap-2">
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
                  />
                </div>
              ))}
            </div>

            <div>
              <Label>Explication pédagogique</Label>
              <Textarea
                value={draft.explanation}
                onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={save} variant="accent">
                <Save /> Enregistrer
              </Button>
              <Button onClick={cancel} variant="outline">
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
                    <p className="font-semibold">{q.question}</p>
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
                      aria-label={q.is_active ? "Masquer" : "Activer"}
                    >
                      <Trash2 />
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

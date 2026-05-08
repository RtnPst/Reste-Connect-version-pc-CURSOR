import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CockpitTabs } from "@/components/admin-cockpit/CockpitTabs";
import { KpiCard } from "@/components/admin-cockpit/KpiCard";
import { ReadOnlyBanner } from "@/components/admin-cockpit/ReadOnlyBanner";
import { WarningList } from "@/components/admin-cockpit/WarningList";
import { AnalyticsTab } from "@/components/admin-cockpit/tabs/AnalyticsTab";
import { BatchReviewsTab } from "@/components/admin-cockpit/tabs/BatchReviewsTab";
import { ConceptIntakeTab } from "@/components/admin-cockpit/tabs/ConceptIntakeTab";
import { EditorialHealthTab } from "@/components/admin-cockpit/tabs/EditorialHealthTab";
import { QuestionDraftsTab } from "@/components/admin-cockpit/tabs/QuestionDraftsTab";
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
import {
  EMPTY_ANALYTICS_SUMMARY,
  EMPTY_BATCH_REVIEWS,
  EMPTY_CONCEPT_INTAKE,
  EMPTY_EDITORIAL_HEALTH,
  EMPTY_META,
  EMPTY_OVERVIEW,
  EMPTY_QUESTION_DRAFTS,
  loadAnalyticsSummarySnapshot,
  loadBatchReviewsSnapshot,
  loadConceptIntakeSnapshot,
  loadEditorialHealthSnapshot,
  loadMetaSnapshot,
  loadOverviewSnapshot,
  loadQuestionDraftsSnapshot,
  type AdminCockpitAnalyticsSummary,
  type AdminCockpitBatchReviews,
  type AdminCockpitConceptIntake,
  type AdminCockpitEditorialHealth,
  type AdminCockpitMeta,
  type AdminCockpitOverview,
  type AdminCockpitQuestionDrafts,
  type CockpitTabId,
} from "@/lib/admin-cockpit/loadSnapshot";

type Difficulty = "facile" | "moyen" | "difficile";
type QuestionStatus = "draft" | "review" | "live" | "archived";
type InternetLevel = "debutant" | "initie" | "chronically_online";
type QuestionTone = "funny" | "cringe" | "drama" | "absurd" | "social" | "gaming";
type QuestionContext =
  | "tiktok_comments"
  | "group_chat"
  | "family_dinner"
  | "twitch_chat"
  | "dating_app"
  | "gaming_voice";
type TrapIntensity = "obvious" | "soft_trap" | "generational_trap" | "fifty_fifty" | "troll";
type QuestionEra = "facebook" | "snapchat" | "tiktok" | "streaming" | "ai";
type QuestionFormat = "word" | "expression" | "meme_ref" | "emoji" | "scenario_text";

type Question = {
  id: string;
  theme: ThemeKey;
  difficulty: Difficulty;
  status: QuestionStatus;
  question: string;
  choices: string[];
  correct_index: number;
  explanation: string;
  is_active: boolean;
  internet_level: InternetLevel | null;
  tone: QuestionTone | null;
  context: QuestionContext | null;
  trap_intensity: TrapIntensity | null;
  era: QuestionEra | null;
  format: QuestionFormat | null;
  editor_notes: string | null;
  canonical_key: string | null;
};

type PreviewRow = AiPreviewQuestion & { key: string; accepted: boolean };

const EMPTY: Omit<Question, "id"> = {
  theme: "vocabulaire",
  difficulty: "facile",
  status: "draft",
  question: "",
  choices: ["", "", "", ""],
  correct_index: 0,
  explanation: "",
  is_active: false,
  internet_level: null,
  tone: null,
  context: null,
  trap_intensity: null,
  era: null,
  format: null,
  editor_notes: null,
  canonical_key: null,
};

const STATUS_LABELS: Record<QuestionStatus, string> = {
  draft: "Brouillon",
  review: "À relire",
  live: "En ligne",
  archived: "Archivée",
};

export const Route = createFileRoute("/admin")({
  validateSearch: (search) => {
    const raw = (search as Record<string, unknown>).tab;
    const tab: CockpitTabId =
      raw === "legacy"
        ? "legacy"
        : raw === "concept_intake"
          ? "concept_intake"
          : raw === "question_drafts"
            ? "question_drafts"
            : raw === "editorial_health"
              ? "editorial_health"
              : raw === "analytics"
                ? "analytics"
                : raw === "batch_reviews"
                  ? "batch_reviews"
                  : raw === "overview"
                    ? "overview"
                    : "overview";
    return { tab };
  },
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
  const navigate = useNavigate({ from: "/admin" });
  const search = Route.useSearch();
  const { session } = useAuth();
  const { loading: authLoading } = useRequireAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [filterTheme, setFilterTheme] = useState<ThemeKey | "all">("all");
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | "all">("all");
  const [filterStatus, setFilterStatus] = useState<QuestionStatus | "all">("all");
  const [missingMetaOnly, setMissingMetaOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Omit<Question, "id">>(EMPTY);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const previewFn = useServerFn(generateQuestionsPreview);
  const insertFn = useServerFn(insertAcceptedGeneratedQuestions);

  const [genTheme, setGenTheme] = useState<ThemeKey>("vocabulaire");
  const [genDifficulty, setGenDifficulty] = useState<"facile" | "moyen" | "difficile">("moyen");
  const [genCount, setGenCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [metaSnapshot, setMetaSnapshot] = useState<AdminCockpitMeta>(EMPTY_META);
  const [overviewSnapshot, setOverviewSnapshot] = useState<AdminCockpitOverview>(EMPTY_OVERVIEW);
  const [conceptIntakeSnapshot, setConceptIntakeSnapshot] =
    useState<AdminCockpitConceptIntake>(EMPTY_CONCEPT_INTAKE);
  const [questionDraftsSnapshot, setQuestionDraftsSnapshot] =
    useState<AdminCockpitQuestionDrafts>(EMPTY_QUESTION_DRAFTS);
  const [snapshotWarnings, setSnapshotWarnings] = useState<string[]>([]);
  const [conceptIntakeWarning, setConceptIntakeWarning] = useState<string | null>(null);
  const [questionDraftsWarning, setQuestionDraftsWarning] = useState<string | null>(null);
  const [editorialHealthSnapshot, setEditorialHealthSnapshot] =
    useState<AdminCockpitEditorialHealth>(EMPTY_EDITORIAL_HEALTH);
  const [analyticsSummarySnapshot, setAnalyticsSummarySnapshot] =
    useState<AdminCockpitAnalyticsSummary>(EMPTY_ANALYTICS_SUMMARY);
  const [batchReviewsSnapshot, setBatchReviewsSnapshot] = useState<AdminCockpitBatchReviews>(EMPTY_BATCH_REVIEWS);
  const [editorialHealthWarning, setEditorialHealthWarning] = useState<string | null>(null);
  const [analyticsSummaryWarning, setAnalyticsSummaryWarning] = useState<string | null>(null);
  const [batchReviewsWarning, setBatchReviewsWarning] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      setSnapshotLoading(true);
      const [
        metaRes,
        overviewRes,
        conceptRes,
        draftsRes,
        editorialRes,
        analyticsRes,
        batchRes,
      ] = await Promise.all([
        loadMetaSnapshot(),
        loadOverviewSnapshot(),
        loadConceptIntakeSnapshot(),
        loadQuestionDraftsSnapshot(),
        loadEditorialHealthSnapshot(),
        loadAnalyticsSummarySnapshot(),
        loadBatchReviewsSnapshot(),
      ]);
      if (cancelled) return;
      setMetaSnapshot(metaRes.data);
      setOverviewSnapshot(overviewRes.data);
      setConceptIntakeSnapshot(conceptRes.data);
      setQuestionDraftsSnapshot(draftsRes.data);
      setEditorialHealthSnapshot(editorialRes.data);
      setAnalyticsSummarySnapshot(analyticsRes.data);
      setBatchReviewsSnapshot(batchRes.data);
      setSnapshotWarnings([metaRes.warning, overviewRes.warning].filter((v): v is string => !!v));
      setConceptIntakeWarning(conceptRes.warning);
      setQuestionDraftsWarning(draftsRes.warning);
      setEditorialHealthWarning(editorialRes.warning);
      setAnalyticsSummaryWarning(analyticsRes.warning);
      setBatchReviewsWarning(batchRes.warning);
      setSnapshotLoading(false);
    })();
    return () => {
      cancelled = true;
    };
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
    setAdvancedOpen(false);
  };

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setDraft({
      theme: q.theme,
      difficulty: q.difficulty,
      status: q.status ?? (q.is_active ? "live" : "archived"),
      question: q.question,
      choices: [...q.choices, "", "", "", ""].slice(0, 4),
      correct_index: q.correct_index,
      explanation: q.explanation,
      is_active: q.is_active,
      internet_level: q.internet_level,
      tone: q.tone,
      context: q.context,
      trap_intensity: q.trap_intensity,
      era: q.era,
      format: q.format,
      editor_notes: q.editor_notes,
      canonical_key: q.canonical_key,
    });
    setAdvancedOpen(
      Boolean(
        q.internet_level ||
          q.tone ||
          q.context ||
          q.trap_intensity ||
          q.era ||
          q.format ||
          q.editor_notes,
      ),
    );
  };

  const cancel = () => {
    setEditingId(null);
    setDraft(EMPTY);
  };

  const save = async (statusOverride?: QuestionStatus) => {
    if (!draft.question.trim()) return toast.error("La question est vide");
    if (draft.choices.some((c) => !c.trim()))
      return toast.error("Toutes les réponses doivent être remplies");
    if (!draft.explanation.trim()) return toast.error("L'explication est vide");
    const nextStatus = statusOverride ?? draft.status;
    if (!nextStatus) return toast.error("Le statut est requis");

    const payload = {
      ...draft,
      status: nextStatus,
      is_active: nextStatus === "live",
      editor_notes: draft.editor_notes?.trim() ? draft.editor_notes.trim() : null,
    };

    if (editingId === "new") {
      const { error } = await supabase.from("questions").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Question ajoutée !");
    } else if (editingId) {
      const { error } = await supabase.from("questions").update(payload).eq("id", editingId);
      if (error) return toast.error(error.message);
      toast.success("Question mise à jour !");
    }
    cancel();
    loadQuestions();
  };

  const toggleActive = async (q: Question) => {
    const nextActive = !q.is_active;
    const { error } = await supabase
      .from("questions")
      .update({
        is_active: nextActive,
        status: nextActive ? "live" : "archived",
      })
      .eq("id", q.id);
    if (error) return toast.error(error.message);
    toast.success(q.is_active ? "Question masquée" : "Question activée");
    loadQuestions();
  };

  const duplicateQuestion = (q: Question) => {
    setEditingId("new");
    setDraft({
      ...q,
      status: "draft",
      is_active: false,
      question: `${q.question} (variante)`,
      canonical_key: null,
    });
    setAdvancedOpen(true);
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

  const hasMissingMetadata = (q: Question) =>
    !q.internet_level || !q.tone || !q.context || !q.trap_intensity || !q.era || !q.format;

  const filtered = questions.filter((q) => {
    if (filterTheme !== "all" && q.theme !== filterTheme) return false;
    if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty) return false;
    if (filterStatus !== "all" && q.status !== filterStatus) return false;
    if (missingMetaOnly && !hasMissingMetadata(q)) return false;
    return true;
  });

  const overviewKpis = Object.entries(overviewSnapshot.kpis ?? {});
  const sourceSummary = {
    total: metaSnapshot.sources.length,
    missing: metaSnapshot.sources.filter((s) => !s.exists).length,
  };

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-background">
      <AppHeader />
      <main className="container mx-auto w-full min-w-0 max-w-5xl overflow-x-clip px-3 py-8 sm:px-6">
        <Tabs
          value={search.tab}
          onValueChange={(next) => {
            const tab: CockpitTabId =
              next === "legacy"
                ? "legacy"
                : next === "concept_intake"
                  ? "concept_intake"
                  : next === "question_drafts"
                    ? "question_drafts"
                    : next === "editorial_health"
                      ? "editorial_health"
                      : next === "analytics"
                        ? "analytics"
                        : next === "batch_reviews"
                          ? "batch_reviews"
                          : "overview";
            navigate({
              to: "/admin",
              search: (prev) => ({ ...prev, tab }),
              replace: true,
            });
          }}
          className="space-y-4"
        >
          <CockpitTabs
            value={search.tab}
            onValueChange={(tab) => {
              navigate({
                to: "/admin",
                search: (prev) => ({ ...prev, tab }),
                replace: true,
              });
            }}
          />

          <TabsContent value="overview" className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-6">
              <h1 className="text-2xl font-extrabold sm:text-3xl">Admin AI Cockpit — Overview</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Snapshot généré: {metaSnapshot.generated_at || "non disponible"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sources: {sourceSummary.total} · manquantes: {sourceSummary.missing}
              </p>
            </div>

            <ReadOnlyBanner />

            <WarningList
              title="Avertissements snapshot"
              warnings={[
                ...metaSnapshot.warnings,
                ...snapshotWarnings.map((code) => ({ code })),
              ]}
            />

            {snapshotLoading ? (
              <div className="rounded-xl border border-border/70 bg-card/60 p-4 text-sm text-muted-foreground">
                Chargement du snapshot cockpit…
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {overviewKpis.length ? (
                    overviewKpis.map(([k, v]) => (
                      <KpiCard key={k} label={k.replaceAll("_", " ")} value={String(v)} />
                    ))
                  ) : (
                    <div className="rounded-xl border border-border/70 bg-card/60 p-4 text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
                      Aucun KPI disponible (snapshot absent ou incomplet).
                    </div>
                  )}
                </div>

                {Array.isArray(overviewSnapshot.alerts) && overviewSnapshot.alerts.length > 0 && (
                  <div className="space-y-2 rounded-xl border border-border/70 bg-card/60 p-4">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                      Alertes dérivées
                    </h2>
                    <div className="space-y-2">
                      {overviewSnapshot.alerts.map((alert, idx) => (
                        <div
                          key={`${alert.source}-${alert.item}-${idx}`}
                          className="rounded-lg border border-border/70 p-3"
                        >
                          <p className="text-sm font-semibold">
                            {alert.source} · {alert.item}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {alert.severity} — {alert.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="concept_intake" className="mt-0 space-y-4">
            <ConceptIntakeTab
              snapshot={conceptIntakeSnapshot}
              loading={snapshotLoading}
              fetchWarning={conceptIntakeWarning}
            />
          </TabsContent>

          <TabsContent value="question_drafts" className="mt-0 space-y-4">
            <QuestionDraftsTab
              snapshot={questionDraftsSnapshot}
              loading={snapshotLoading}
              fetchWarning={questionDraftsWarning}
            />
          </TabsContent>

          <TabsContent value="editorial_health" className="mt-0 space-y-4">
            <EditorialHealthTab
              snapshot={editorialHealthSnapshot}
              loading={snapshotLoading}
              fetchWarning={editorialHealthWarning}
            />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0 space-y-4">
            <AnalyticsTab
              snapshot={analyticsSummarySnapshot}
              loading={snapshotLoading}
              fetchWarning={analyticsSummaryWarning}
            />
          </TabsContent>

          <TabsContent value="batch_reviews" className="mt-0 space-y-4">
            <BatchReviewsTab
              snapshot={batchReviewsSnapshot}
              loading={snapshotLoading}
              fetchWarning={batchReviewsWarning}
            />
          </TabsContent>

          <TabsContent value="legacy" className="space-y-6 mt-0">
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
        <div className="grid min-w-0 gap-3 rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4">
          <div className="grid min-w-0 gap-3 sm:grid-cols-3">
            <div className="min-w-0">
              <Label>Statut</Label>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as QuestionStatus | "all")}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="review">À relire</SelectItem>
                  <SelectItem value="live">En ligne</SelectItem>
                  <SelectItem value="archived">Archivée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label>Difficulté</Label>
              <Select
                value={filterDifficulty}
                onValueChange={(v) => setFilterDifficulty(v as Difficulty | "all")}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="facile">Facile</SelectItem>
                  <SelectItem value="moyen">Moyen</SelectItem>
                  <SelectItem value="difficile">Difficile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 pt-6 text-sm font-medium">
              <Checkbox checked={missingMetaOnly} onCheckedChange={(v) => setMissingMetaOnly(v === true)} />
              Métadonnées incomplètes
            </label>
          </div>
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
        </div>

        {/* Editor */}
        {editingId && (
          <div className="min-w-0 rounded-2xl border-2 border-primary bg-card p-4 sm:p-6 space-y-4">
            <h2 className="text-xl font-bold">
              {editingId === "new" ? "Nouvelle question" : "Modifier la question"}
            </h2>

            <div className="grid min-w-0 gap-4 sm:grid-cols-3">
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
              <div className="min-w-0">
                <Label>Statut</Label>
                <Select
                  value={draft.status}
                  onValueChange={(v) =>
                    setDraft({
                      ...draft,
                      status: v as QuestionStatus,
                      is_active: v === "live",
                    })
                  }
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="review">À relire</SelectItem>
                    <SelectItem value="live">En ligne</SelectItem>
                    <SelectItem value="archived">Archivée</SelectItem>
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

            <div className="rounded-xl border border-border/70 bg-background/40 p-3 sm:p-4">
              <button
                type="button"
                onClick={() => setAdvancedOpen((prev) => !prev)}
                className="text-sm font-bold text-primary hover:underline"
              >
                {advancedOpen ? "Masquer les métadonnées avancées" : "Afficher les métadonnées avancées"}
              </button>
              {advancedOpen && (
                <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
                  <MetaSelect
                    label="Niveau internet"
                    value={draft.internet_level}
                    onChange={(v) => setDraft({ ...draft, internet_level: v as InternetLevel | null })}
                    options={[
                      { value: "debutant", label: "Débutant" },
                      { value: "initie", label: "Initié" },
                      { value: "chronically_online", label: "Chronically online" },
                    ]}
                  />
                  <MetaSelect
                    label="Ton"
                    value={draft.tone}
                    onChange={(v) => setDraft({ ...draft, tone: v as QuestionTone | null })}
                    options={[
                      { value: "funny", label: "Funny" },
                      { value: "cringe", label: "Cringe" },
                      { value: "drama", label: "Drama" },
                      { value: "absurd", label: "Absurd" },
                      { value: "social", label: "Social" },
                      { value: "gaming", label: "Gaming" },
                    ]}
                  />
                  <MetaSelect
                    label="Contexte"
                    value={draft.context}
                    onChange={(v) => setDraft({ ...draft, context: v as QuestionContext | null })}
                    options={[
                      { value: "tiktok_comments", label: "Commentaires TikTok" },
                      { value: "group_chat", label: "Group chat" },
                      { value: "family_dinner", label: "Dîner familial" },
                      { value: "twitch_chat", label: "Twitch chat" },
                      { value: "dating_app", label: "App de dating" },
                      { value: "gaming_voice", label: "Vocal gaming" },
                    ]}
                  />
                  <MetaSelect
                    label="Intensité du piège"
                    value={draft.trap_intensity}
                    onChange={(v) => setDraft({ ...draft, trap_intensity: v as TrapIntensity | null })}
                    options={[
                      { value: "obvious", label: "Évident" },
                      { value: "soft_trap", label: "Soft trap" },
                      { value: "generational_trap", label: "Piège générationnel" },
                      { value: "fifty_fifty", label: "50/50" },
                      { value: "troll", label: "Troll" },
                    ]}
                  />
                  <MetaSelect
                    label="Ère internet"
                    value={draft.era}
                    onChange={(v) => setDraft({ ...draft, era: v as QuestionEra | null })}
                    options={[
                      { value: "facebook", label: "Facebook era" },
                      { value: "snapchat", label: "Snapchat era" },
                      { value: "tiktok", label: "TikTok era" },
                      { value: "streaming", label: "Streaming era" },
                      { value: "ai", label: "AI era" },
                    ]}
                  />
                  <MetaSelect
                    label="Format contenu"
                    value={draft.format}
                    onChange={(v) => setDraft({ ...draft, format: v as QuestionFormat | null })}
                    options={[
                      { value: "word", label: "Mot" },
                      { value: "expression", label: "Expression" },
                      { value: "meme_ref", label: "Référence mème" },
                      { value: "emoji", label: "Emoji" },
                      { value: "scenario_text", label: "Mini scénario" },
                    ]}
                  />
                  <div className="sm:col-span-2">
                    <Label>Notes éditeur (optionnel)</Label>
                    <Textarea
                      value={draft.editor_notes ?? ""}
                      onChange={(e) => setDraft({ ...draft, editor_notes: e.target.value })}
                      rows={2}
                      placeholder="Contexte, idée de variante, remarque qualité…"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-wrap gap-3">
              <Button onClick={() => save("draft")} variant="outline" className="min-w-0 shrink">
                <Save /> Sauver en brouillon
              </Button>
              <Button onClick={() => save("live")} variant="accent" className="min-w-0 shrink">
                <Check /> Publier en live
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
                      <span>•</span>
                      <span>{STATUS_LABELS[q.status]}</span>
                      {hasMissingMetadata(q) && (
                        <>
                          <span>•</span>
                          <span className="text-warning">Meta incomplète</span>
                        </>
                      )}
                      {!q.is_active && <span className="text-warning">• Masquée</span>}
                    </div>
                    <p className="break-words font-semibold">{q.question}</p>
                    <p className="text-sm text-success mt-1">✓ {q.choices[q.correct_index]}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      onClick={() => duplicateQuestion(q)}
                      variant="ghost"
                      size="icon"
                      aria-label="Dupliquer"
                    >
                      <Plus />
                    </Button>
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function MetaSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="min-w-0">
      <Label>{label}</Label>
      <Select value={value ?? "none"} onValueChange={(v) => onChange(v === "none" ? null : v)}>
        <SelectTrigger className="w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Non défini</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

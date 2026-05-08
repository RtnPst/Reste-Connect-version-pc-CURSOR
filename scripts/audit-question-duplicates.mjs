/**
 * Read-only duplicate / near-duplicate audit for public.questions.
 * Does NOT modify the database.
 *
 * Outputs JSON + CSV under exports/dedup-audit/
 * (includes daily_questions vs question playability + duplicate families)
 *
 * Requires .env (project root):
 *   VITE_SUPABASE_URL or SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (recommended for full reads + quiz_attempts)
 *
 * Usage:
 *   node scripts/audit-question-duplicates.mjs
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const outDir = resolve(root, "exports/dedup-audit");

/** Same semantics as PostgreSQL normalize_question_canonical_key */
function normalizeDbKey(question) {
  const s = String(question ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return s === "" ? null : s;
}

/** Strip punctuation / quotes for looser grouping */
function normalizeAggressive(question) {
  let s = normalizeDbKey(question);
  if (!s) return null;
  s = s
    .replace(/[«»""„‚'`´]/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/-/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s === "" ? null : s;
}

function tokenSet(text) {
  const raw = String(text ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  const parts = raw.toLowerCase().match(/[\p{L}\p{N}]+/gu);
  return new Set(parts ?? []);
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function loadEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

function normalizeSupabaseUrl(raw) {
  const trimmed = String(raw ?? "").trim();
  const withoutQueryOrHash = trimmed.split(/[?#]/)[0]?.trim() ?? trimmed;
  const base = withoutQueryOrHash.replace(/\/+$/, "");
  if (!base) throw new Error("Invalid Supabase URL: empty after normalization.");
  return `${base}/`;
}

function shortHash(s) {
  return createHash("sha256").update(s).digest("hex").slice(0, 12);
}

class UnionFind {
  constructor(n) {
    this.p = Array.from({ length: n }, (_, i) => i);
  }
  find(i) {
    if (this.p[i] !== i) this.p[i] = this.find(this.p[i]);
    return this.p[i];
  }
  union(a, b) {
    const pa = this.find(a);
    const pb = this.find(b);
    if (pa !== pb) this.p[pa] = pb;
  }
}

function choicesFingerprint(choices) {
  try {
    return JSON.stringify(choices);
  } catch {
    return String(choices);
  }
}

function pickRecommendedKeep(members) {
  /** @type {typeof members} */
  const scored = [...members].sort((a, b) => {
    const score = (r) => {
      let s = 0;
      if (r.status === "live") s += 100;
      if (r.is_active === true) s += 50;
      if (r.status === "review") s += 10;
      if (r.status === "draft") s += 5;
      return s;
    };
    const ds = score(b) - score(a);
    if (ds !== 0) return ds;
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    if (tb !== ta) return tb - ta;
    return String(a.id).localeCompare(String(b.id));
  });
  return scored[0]?.id ?? null;
}

async function fetchAllQuestions(client) {
  const rows = [];
  const pageSize = 500;
  let offset = 0;
  const select =
    "id, question, canonical_key, theme, difficulty, status, is_active, explanation, choices, correct_index, created_at, editor_notes";
  for (;;) {
    const { data, error } = await client
      .from("questions")
      .select(select)
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

async function fetchQuestionUsageCounts(client) {
  const refs = new Map();
  const pageSize = 500;
  let offset = 0;
  for (;;) {
    const { data, error } = await client
      .from("quiz_attempts")
      .select("question_ids")
      .range(offset, offset + pageSize - 1);
    if (error) {
      console.warn(
        "[audit] Could not read quiz_attempts (skipping usage counts):",
        error.message,
      );
      return refs;
    }
    const batch = data ?? [];
    for (const row of batch) {
      const ids = row.question_ids ?? [];
      for (const qid of ids) {
        refs.set(qid, (refs.get(qid) ?? 0) + 1);
      }
    }
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return refs;
}

/** Full daily_questions rows (read-only audit). */
async function fetchAllDailyQuestions(client) {
  const rows = [];
  const pageSize = 500;
  let offset = 0;
  for (;;) {
    const { data, error } = await client
      .from("daily_questions")
      .select("id, active_date, question_id, created_at")
      .order("active_date", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) {
      console.warn("[audit] Could not read daily_questions:", error.message);
      return rows;
    }
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

const NEAR_Q_JACCARD = 0.82;
const NEAR_EXPL_JACCARD = 0.75;

async function main() {
  const env = loadEnv(envPath);
  const url = normalizeSupabaseUrl(env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "");
  const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !key) {
    console.error(
      "Missing env: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (required for full audit).",
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log("Fetching questions…");
  const rows = await fetchAllQuestions(supabase);
  console.log("Fetching quiz_attempt references…");
  const usage = await fetchQuestionUsageCounts(supabase);
  console.log("Fetching daily_questions rows…");
  const dailyRows = await fetchAllDailyQuestions(supabase);
  const dailyRefs = new Map();
  for (const d of dailyRows) {
    const qid = d.question_id;
    dailyRefs.set(qid, (dailyRefs.get(qid) ?? 0) + 1);
  }

  const enriched = rows.map((r) => {
    const computedKey = normalizeDbKey(r.question);
    const aggKey = normalizeAggressive(r.question);
    const keyMismatch =
      r.canonical_key != null &&
      computedKey != null &&
      r.canonical_key !== computedKey;
    return {
      ...r,
      computed_canonical_key: computedKey,
      aggressive_key: aggKey,
      question_tokens: tokenSet(r.question),
      explanation_tokens: tokenSet(r.explanation),
      choices_fp: choicesFingerprint(r.choices),
      key_mismatch_canonical: keyMismatch,
    };
  });

  /** @type {Map<string, typeof enriched>} */
  const byComputedKey = new Map();
  for (const r of enriched) {
    const k = r.computed_canonical_key;
    if (!k) continue;
    if (!byComputedKey.has(k)) byComputedKey.set(k, []);
    byComputedKey.get(k).push(r);
  }

  const exactDupGroups = [...byComputedKey.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({
      type: "exact_normalized_question",
      key,
      group_id: `exact_${shortHash(key)}`,
      count: list.length,
      recommended_keep_id: pickRecommendedKeep(list),
      members: list.map((m) => ({
        id: m.id,
        theme: m.theme,
        difficulty: m.difficulty,
        status: m.status,
        is_active: m.is_active,
        created_at: m.created_at,
        canonical_key_stored: m.canonical_key,
        question_preview: m.question.slice(0, 120),
        quiz_attempt_refs: usage.get(m.id) ?? 0,
        daily_question_refs: dailyRefs.get(m.id) ?? 0,
        choices_fp: m.choices_fp,
      })),
    }));

  /** For joining daily rows + flat CSV (exact duplicate family per question id). */
  const exactIdToGroup = new Map();
  for (const g of exactDupGroups) {
    for (const m of g.members) {
      exactIdToGroup.set(m.id, g);
    }
  }

  /** @type {Map<string, typeof enriched>} */
  const byAggressive = new Map();
  for (const r of enriched) {
    const k = r.aggressive_key;
    if (!k) continue;
    if (!byAggressive.has(k)) byAggressive.set(k, []);
    byAggressive.get(k).push(r);
  }

  const aggressiveDupGroups = [...byAggressive.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({
      type: "aggressive_normalize",
      key,
      group_id: `agg_${shortHash(key)}`,
      count: list.length,
      recommended_keep_id: pickRecommendedKeep(list),
      status_breakdown: list.reduce((acc, m) => {
        const k = `${m.status}|active=${m.is_active}`;
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {}),
      members: list.map((m) => ({
        id: m.id,
        theme: m.theme,
        difficulty: m.difficulty,
        status: m.status,
        is_active: m.is_active,
        computed_canonical_key: m.computed_canonical_key,
        question_preview: m.question.slice(0, 160),
        quiz_attempt_refs: usage.get(m.id) ?? 0,
      })),
    }));

  /** Near-duplicate clusters within theme (transitive) */
  const themes = [...new Set(enriched.map((r) => r.theme))];
  const nearClusters = [];

  for (const theme of themes) {
    const list = enriched.filter((r) => r.theme === theme);
    const n = list.length;
    const uf = new UnionFind(n);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const qi = jaccard(list[i].question_tokens, list[j].question_tokens);
        if (qi >= NEAR_Q_JACCARD) uf.union(i, j);
      }
    }
    const clusterMap = new Map();
    for (let i = 0; i < n; i++) {
      const root = uf.find(i);
      if (!clusterMap.has(root)) clusterMap.set(root, []);
      clusterMap.get(root).push(list[i]);
    }
    for (const [, members] of clusterMap) {
      if (members.length < 2) continue;
      const keyMaterial = members
        .map((m) => m.id)
        .sort()
        .join("|");
      nearClusters.push({
        type: "near_duplicate_question_tokens",
        theme,
        group_id: `near_${theme}_${shortHash(keyMaterial)}`,
        count: members.length,
        recommended_keep_id: pickRecommendedKeep(members),
        threshold_question_jaccard: NEAR_Q_JACCARD,
        members: members.map((m) => ({
          id: m.id,
          difficulty: m.difficulty,
          status: m.status,
          is_active: m.is_active,
          question_preview: m.question.slice(0, 160),
          quiz_attempt_refs: usage.get(m.id) ?? 0,
          daily_question_refs: dailyRefs.get(m.id) ?? 0,
        })),
      });
    }
  }

  /** Pairs: high question similarity + lower explanation similarity (review manually) */
  const conflictingPairs = [];
  const themesArr = [...themes];
  for (const theme of themesArr) {
    const list = enriched.filter((r) => r.theme === theme);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const jq = jaccard(a.question_tokens, b.question_tokens);
        const je = jaccard(a.explanation_tokens, b.explanation_tokens);
        if (jq >= NEAR_Q_JACCARD && je < NEAR_EXPL_JACCARD) {
          conflictingPairs.push({
            theme,
            question_jaccard: Number(jq.toFixed(4)),
            explanation_jaccard: Number(je.toFixed(4)),
            id_a: a.id,
            id_b: b.id,
            preview_a: a.question.slice(0, 100),
            preview_b: b.question.slice(0, 100),
          });
        }
      }
    }
  }

  const questionById = new Map(enriched.map((r) => [r.id, r]));

  /** Matches SQL `get_playable_questions`: status = live (see migrations). */
  function playableByRpc(q) {
    return !!(q && q.status === "live");
  }

  const datesByQuestionId = new Map();
  for (const d of dailyRows) {
    if (!datesByQuestionId.has(d.question_id))
      datesByQuestionId.set(d.question_id, []);
    datesByQuestionId.get(d.question_id).push(d.active_date);
  }

  const questionIdsOnMultipleDates = [...datesByQuestionId.entries()]
    .filter(([, dates]) => dates.length > 1)
    .map(([question_id, active_dates]) => ({
      question_id,
      active_dates: [...active_dates].sort(),
      row_count: active_dates.length,
    }));

  const dailyAuditRows = dailyRows.map((d) => {
    const q = questionById.get(d.question_id);
    const eg = exactIdToGroup.get(d.question_id);
    const rpcOk = playableByRpc(q);
    const editorialOk = !!(q && q.status === "live" && q.is_active);
    return {
      daily_row_id: d.id,
      active_date: d.active_date,
      question_id: d.question_id,
      question_row_missing: !q,
      question_status: q?.status ?? null,
      question_is_active: q?.is_active ?? null,
      playable_by_get_playable_questions_rpc: rpcOk,
      editorial_live_and_active: editorialOk,
      exact_dup_group_id: eg?.group_id ?? "",
      exact_dup_family_size: eg ? eg.count : 1,
      points_to_duplicate_family: eg ? eg.count > 1 : false,
      recommended_keep_id_in_exact_family: eg?.recommended_keep_id ?? "",
      question_preview: q ? q.question.slice(0, 200) : "(no matching questions row)",
    };
  });

  const dailyAuditSummary = {
    total_daily_question_rows: dailyRows.length,
    distinct_question_ids_referenced: datesByQuestionId.size,
    rows_missing_question_row: dailyAuditRows.filter((r) => r.question_row_missing)
      .length,
    rows_where_question_not_playable_by_rpc: dailyAuditRows.filter(
      (r) => !r.question_row_missing && !r.playable_by_get_playable_questions_rpc,
    ).length,
    rows_where_not_editorial_live_and_active: dailyAuditRows.filter(
      (r) => !r.question_row_missing && !r.editorial_live_and_active,
    ).length,
    rows_pointing_to_exact_duplicate_family: dailyAuditRows.filter(
      (r) => r.points_to_duplicate_family,
    ).length,
    distinct_question_ids_scheduled_on_multiple_dates:
      questionIdsOnMultipleDates.length,
  };

  const dailyQuestionsAudit = {
    summary: dailyAuditSummary,
    question_ids_scheduled_on_multiple_dates: questionIdsOnMultipleDates,
    rows: dailyAuditRows,
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync(outDir, { recursive: true });

  const summary = {
    generated_at: new Date().toISOString(),
    supabase_host: (() => {
      try {
        return new URL(url).host;
      } catch {
        return "";
      }
    })(),
    total_questions: enriched.length,
    canonical_key_null_count: enriched.filter((r) => !r.canonical_key).length,
    canonical_key_mismatch_computed: enriched.filter((r) => r.key_mismatch_canonical)
      .length,
    exact_duplicate_groups: exactDupGroups.length,
    exact_duplicate_rows_affected: exactDupGroups.reduce(
      (s, g) => s + g.count,
      0,
    ),
    aggressive_duplicate_groups: aggressiveDupGroups.length,
    near_duplicate_clusters: nearClusters.length,
    conflicting_pairs_question_vs_explanation: conflictingPairs.length,
    thresholds: {
      near_question_token_jaccard: NEAR_Q_JACCARD,
      explanation_warning_below: NEAR_EXPL_JACCARD,
    },
    daily_questions: dailyAuditSummary,
  };

  const payload = {
    summary,
    exact_duplicate_groups: exactDupGroups,
    aggressive_duplicate_groups: aggressiveDupGroups,
    near_duplicate_clusters: nearClusters,
    conflicting_pairs: conflictingPairs,
    daily_questions_audit: dailyQuestionsAudit,
  };

  const jsonPath = join(outDir, `dedup-audit-${stamp}.json`);
  writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");

  /** Flat CSV for spreadsheet review */
  const csvHeaders = [
    "id",
    "theme",
    "difficulty",
    "status",
    "is_active",
    "canonical_key_stored",
    "computed_canonical_key",
    "key_mismatch",
    "exact_dup_group_id",
    "exact_dup_group_size",
    "aggressive_dup_group_id",
    "aggressive_dup_group_size",
    "near_dup_cluster_id",
    "near_dup_cluster_size",
    "quiz_attempt_refs",
    "daily_question_refs",
    "recommended_keep_in_exact_group",
    "recommended_keep_in_aggressive_group",
    "recommended_keep_in_near_cluster",
    "question_preview",
  ];

  const aggIdToGroup = new Map();
  for (const g of aggressiveDupGroups) {
    for (const m of g.members) {
      aggIdToGroup.set(m.id, g);
    }
  }
  const nearIdToCluster = new Map();
  for (const c of nearClusters) {
    for (const m of c.members) {
      nearIdToCluster.set(m.id, c);
    }
  }

  function csvEscape(value) {
    const s = value == null ? "" : String(value);
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  const csvLines = [
    csvHeaders.join(","),
    ...enriched.map((r) => {
      const exactG = exactIdToGroup.get(r.id);
      const ag = aggIdToGroup.get(r.id);
      const nc = nearIdToCluster.get(r.id);
      const row = {
        id: r.id,
        theme: r.theme,
        difficulty: r.difficulty,
        status: r.status,
        is_active: r.is_active,
        canonical_key_stored: r.canonical_key ?? "",
        computed_canonical_key: r.computed_canonical_key ?? "",
        key_mismatch: r.key_mismatch_canonical ? "true" : "false",
        exact_dup_group_id: exactG?.group_id ?? "",
        exact_dup_group_size: exactG ? exactG.count : 1,
        aggressive_dup_group_id: ag?.group_id ?? "",
        aggressive_dup_group_size: ag ? ag.count : 1,
        near_dup_cluster_id: nc?.group_id ?? "",
        near_dup_cluster_size: nc ? nc.count : 1,
        quiz_attempt_refs: usage.get(r.id) ?? 0,
        daily_question_refs: dailyRefs.get(r.id) ?? 0,
        recommended_keep_in_exact_group:
          exactG?.recommended_keep_id === r.id
            ? "yes"
            : exactG
              ? "no"
              : "",
        recommended_keep_in_aggressive_group:
          ag?.recommended_keep_id === r.id
            ? "yes"
            : ag
              ? "no"
              : "",
        recommended_keep_in_near_cluster:
          nc?.recommended_keep_id === r.id
            ? "yes"
            : nc
              ? "no"
              : "",
        question_preview: r.question.slice(0, 200),
      };
      return csvHeaders.map((h) => csvEscape(row[h])).join(",");
    }),
  ];

  const csvPath = join(outDir, `dedup-audit-flat-${stamp}.csv`);
  writeFileSync(csvPath, csvLines.join("\n"), "utf8");

  const dailyCsvHeaders = [
    "daily_row_id",
    "active_date",
    "question_id",
    "question_row_missing",
    "question_status",
    "question_is_active",
    "playable_by_get_playable_questions_rpc",
    "editorial_live_and_active",
    "exact_dup_group_id",
    "exact_dup_family_size",
    "points_to_duplicate_family",
    "recommended_keep_id_in_exact_family",
    "question_preview",
  ];
  const dailyCsvLines = [
    dailyCsvHeaders.join(","),
    ...dailyAuditRows.map((row) =>
      dailyCsvHeaders.map((h) => csvEscape(row[h])).join(","),
    ),
  ];
  const dailyCsvPath = join(outDir, `dedup-daily-audit-flat-${stamp}.csv`);
  writeFileSync(dailyCsvPath, dailyCsvLines.join("\n"), "utf8");

  const readmePath = join(outDir, `README.md`);
  const readme = `# Question duplicate audit (generated)

Read-only exports from \`node scripts/audit-question-duplicates.mjs\` or \`npm run audit:question-dedup\`.

## Files

- **dedup-audit-*.json** — Full groups, clusters, conflicting pairs, and **daily_questions_audit**.
- **dedup-audit-flat-*.csv** — One row per question; filter non-empty duplicate group columns.
- **dedup-daily-audit-flat-*.csv** — One row per **daily_questions** row: playability vs \`get_playable_questions\` (status = live), editorial flags, duplicate-family IDs.

## Interpretation

1. **exact_normalized_question** — Same text after DB-style normalization (lower + collapse spaces). Strongest duplicate signal.
2. **aggressive_normalize** — Punctuation stripped; may include false positives.
3. **near_duplicate_question_tokens** — Jaccard similarity on word tokens within the same theme (transitive clusters).
4. **conflicting_pairs** — Similar question wording but dissimilar explanations (manual review).
5. **daily_questions_audit** — Whether each scheduled day points at a **live** question (RPC), and whether that UUID sits in an **exact duplicate family**.

## Daily quiz UX note

The app loads today’s row from \`daily_questions\`, then calls \`get_playable_questions({ ids: [question_id] })\`, which only returns rows with **status = 'live'**. If the daily row targets **archived** / non-live question IDs, the client may load **no question** and fall back only where implemented (see \`question-du-jour.tsx\`).

## Cleanup (later, not automated here)

Prefer keeping rows referenced by \`quiz_attempts\` or \`daily_questions\`, then **live**/**active**, then newest.

`;

  writeFileSync(readmePath, readme, "utf8");

  const latestJson = join(outDir, "dedup-audit-latest.json");
  const latestCsv = join(outDir, "dedup-audit-flat-latest.csv");
  const latestDailyCsv = join(outDir, "dedup-daily-audit-flat-latest.csv");
  writeFileSync(latestJson, JSON.stringify(payload, null, 2), "utf8");
  writeFileSync(latestCsv, csvLines.join("\n"), "utf8");
  writeFileSync(latestDailyCsv, dailyCsvLines.join("\n"), "utf8");

  console.log("");
  console.log("Duplicate audit complete (read-only).");
  console.log(JSON.stringify(summary, null, 2));
  console.log("");
  console.log("Written:", jsonPath);
  console.log("Written:", csvPath);
  console.log("Written:", dailyCsvPath);
  console.log("Latest:", latestJson, latestCsv, latestDailyCsv);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Stage 1 concept safety layer (review-only).
 *
 * Builds four review artifacts:
 * 1) concept-key-risk-registry-latest.csv + .json
 * 2) concept-key-semantic-collision-review-latest.csv + .json
 * 3) concept-key-diversity-readiness-latest.csv + .json
 * 4) concept-batch2-reframing-preview-latest.csv + .json
 *
 * No DB writes, no migrations, no gameplay changes.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "exports/dedup-audit");

const paths = {
  suggestionsRows: resolve(outDir, "concept-key-suggestions-latest.csv"),
  topAttentionReviewed: resolve(
    outDir,
    "concept-key-group-top-attention-reviewed-latest.csv",
  ),
  batch2Preview: resolve(outDir, "soft-archive-batch-2-preview-latest.json"),
};

function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === ",") {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return cells;
}

function readCsv(path) {
  if (!existsSync(path)) return { header: [], rows: [] };
  const raw = readFileSync(path, "utf8").trimEnd();
  if (!raw) return { header: [], rows: [] };
  const lines = raw.split(/\r?\n/);
  const header = parseCsvLine(lines[0]).map((s) => String(s).trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const c = parseCsvLine(lines[i]);
    const row = {};
    for (let j = 0; j < header.length; j++) row[header[j]] = c[j] ?? "";
    rows.push(row);
  }
  return { header, rows };
}

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(path, headers, rows) {
  const body = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h] ?? "")).join(",")),
  ].join("\n");
  writeFileSync(path, body, "utf8");
}

function normPreview(s, max = 120) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 3)}...`;
}

function stripLeadingArticle(key) {
  return String(key ?? "")
    .replace(/^(un|une|le|la|les|des|du|de|d)_/, "")
    .replace(/^l_/, "");
}

function tokenizeKey(key) {
  return stripLeadingArticle(key)
    .split("_")
    .map((x) => x.trim())
    .filter(Boolean);
}

function jaccard(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  if (!sa.size && !sb.size) return 1;
  const inter = [...sa].filter((x) => sb.has(x)).length;
  const uni = new Set([...sa, ...sb]).size;
  return uni ? inter / uni : 0;
}

function looksContextualQuestion(preview) {
  const s = String(preview ?? "").toLowerCase();
  return (
    s.includes("sur tiktok") ||
    s.includes("dans un jeu") ||
    s.includes("dans une conversation") ||
    s.includes("quand quelqu") ||
    s.includes("sur instagram")
  );
}

function main() {
  if (!existsSync(paths.suggestionsRows)) {
    console.error("Missing suggestions rows CSV:", paths.suggestionsRows);
    process.exit(1);
  }
  if (!existsSync(paths.batch2Preview)) {
    console.error("Missing batch2 preview JSON:", paths.batch2Preview);
    process.exit(1);
  }

  const suggestions = readCsv(paths.suggestionsRows);
  const topReviewed = readCsv(paths.topAttentionReviewed);
  const batch2 = JSON.parse(readFileSync(paths.batch2Preview, "utf8"));

  // group -> resolved concept (if manually reviewed top-attention), else suggested
  const reviewedMap = new Map();
  for (const r of topReviewed.rows) {
    const gid = String(r.duplicate_group_id ?? "").trim();
    if (!gid) continue;
    const resolved = String(r.resolved_concept_key ?? "").trim();
    if (resolved) reviewedMap.set(gid, resolved);
  }

  // Build group aggregates from row suggestions.
  const groupRows = new Map();
  for (const row of suggestions.rows) {
    const gid = String(row.duplicate_group_id ?? "").trim();
    if (!gid) continue;
    if (!groupRows.has(gid)) groupRows.set(gid, []);
    groupRows.get(gid).push(row);
  }

  const groupInfo = new Map(); // gid -> aggregate
  for (const [gid, rows] of groupRows.entries()) {
    const rep = rows.find((r) => String(r.recommended_keep) === "yes") ?? rows[0];
    const conceptSuggested = String(rep.concept_key_suggested ?? "").trim();
    const conceptFinal = reviewedMap.get(gid) ?? conceptSuggested;
    const memberIds = rows.map((r) => String(r.question_id ?? "").trim()).filter(Boolean);
    const previews = rows.map((r) => normPreview(r.question_preview)).filter(Boolean);
    const themes = [...new Set(rows.map((r) => String(r.theme ?? "").trim()).filter(Boolean))];
    const diffs = [...new Set(rows.map((r) => String(r.difficulty ?? "").trim()).filter(Boolean))];
    groupInfo.set(gid, {
      duplicate_group_id: gid,
      concept_key: conceptFinal,
      concept_key_suggested: conceptSuggested,
      confidence: String(rep.suggestion_confidence ?? "").trim() || "unknown",
      representative_question: normPreview(rep.question_preview),
      member_ids: memberIds,
      member_question_previews: previews,
      themes,
      difficulties: diffs,
    });
  }

  // Build concept aggregates.
  const conceptMap = new Map(); // key -> groups
  for (const g of groupInfo.values()) {
    if (!g.concept_key) continue;
    if (!conceptMap.has(g.concept_key)) conceptMap.set(g.concept_key, []);
    conceptMap.get(g.concept_key).push(g);
  }

  // 1) Risk registry.
  const shortThreshold = 4;
  const riskyGeneric = new Set(["meta", "lit", "cap", "fort", "seen", "sus", "mid", "dead"]);
  const riskySlangOverloaded = new Set(["meta", "lit", "cap", "sus", "dead"]);

  const riskRows = [];
  for (const [concept, groups] of [...conceptMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const issueTypes = [];
    if (concept.length <= shortThreshold) issueTypes.push("short_key");
    if (riskyGeneric.has(concept)) issueTypes.push("generic_or_common_word");
    if (/^[a-z0-9]{2,5}$/.test(concept)) issueTypes.push("acronym_or_ultra_short_token");
    if (riskySlangOverloaded.has(concept)) issueTypes.push("potential_overloaded_slang");
    if (groups.length >= 2) issueTypes.push("cross_group_merge_risk");
    const themes = [...new Set(groups.flatMap((g) => g.themes))];
    if (themes.length >= 2 && concept.length <= 5) issueTypes.push("cross_theme_collision_risk");
    if (!issueTypes.length) continue;

    let suggestedAction = "manual_review";
    let confidence = "medium";
    if (issueTypes.includes("generic_or_common_word")) suggestedAction = "expand_key";
    if (issueTypes.includes("cross_group_merge_risk")) suggestedAction = "split_later";
    if (issueTypes.length === 1 && issueTypes[0] === "acronym_or_ultra_short_token") {
      suggestedAction = "keep";
      confidence = "low";
    }
    if (issueTypes.includes("short_key") && issueTypes.length <= 2) confidence = "medium";
    if (issueTypes.length >= 3) confidence = "high";

    riskRows.push({
      concept_key: concept,
      issue_type: issueTypes.join(";"),
      affected_duplicate_groups: groups.map((g) => g.duplicate_group_id).join(";"),
      representative_questions: groups
        .slice(0, 4)
        .map((g) => g.representative_question)
        .join(" | "),
      suggested_action: suggestedAction,
      confidence,
    });
  }

  riskRows.sort((a, b) => a.concept_key.localeCompare(b.concept_key));

  const riskHeaders = [
    "concept_key",
    "issue_type",
    "affected_duplicate_groups",
    "representative_questions",
    "suggested_action",
    "confidence",
  ];
  const riskCsvLatest = join(outDir, "concept-key-risk-registry-latest.csv");
  const riskCsvStamped = join(
    outDir,
    `concept-key-risk-registry-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`,
  );
  writeCsv(riskCsvLatest, riskHeaders, riskRows);
  writeCsv(riskCsvStamped, riskHeaders, riskRows);
  const riskSummary = {
    generated_at: new Date().toISOString(),
    risky_concept_keys: riskRows.length,
    issue_type_counts: riskRows.reduce((acc, r) => {
      for (const it of String(r.issue_type).split(";").filter(Boolean)) {
        acc[it] = (acc[it] ?? 0) + 1;
      }
      return acc;
    }, {}),
    suggested_action_counts: riskRows.reduce((acc, r) => {
      acc[r.suggested_action] = (acc[r.suggested_action] ?? 0) + 1;
      return acc;
    }, {}),
    outputs: [riskCsvLatest, riskCsvStamped],
  };
  const riskJsonLatest = join(outDir, "concept-key-risk-registry-latest.json");
  writeFileSync(
    riskJsonLatest,
    JSON.stringify({ summary: riskSummary, rows: riskRows }, null, 2),
    "utf8",
  );

  // 2) Cross-group semantic collision detection.
  const collisionRows = [];

  // A. same concept key used by multiple exact groups
  for (const [concept, groups] of conceptMap.entries()) {
    if (groups.length < 2) continue;
    const reason = "same_final_concept_key_across_multiple_duplicate_groups";
    const possiblyDistinct =
      groups.some((g) => g.themes.length > 1) ||
      groups.some((g) => g.representative_question.toLowerCase().includes("dans un jeu")) ||
      groups.some((g) => g.representative_question.toLowerCase().includes("sur tiktok"));
    collisionRows.push({
      collision_type: "same_key_multi_group",
      key_a: concept,
      key_b: concept,
      duplicate_groups_a: groups.map((g) => g.duplicate_group_id).join(";"),
      duplicate_groups_b: groups.map((g) => g.duplicate_group_id).join(";"),
      confidence: possiblyDistinct ? "medium" : "high",
      why_may_belong_together: "Same resolved concept_key currently selected across different exact duplicate families.",
      why_may_remain_distinct: possiblyDistinct
        ? "Context/theme framing differs; may deserve multiple formulations."
        : "No obvious contextual split in current previews.",
      merge_hint: reason,
    });
  }

  // B. near-identical keys (token similarity) between different concept keys
  const keys = [...conceptMap.keys()].sort((a, b) => a.localeCompare(b));
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const ka = keys[i];
      const kb = keys[j];
      if (ka === kb) continue;
      const sim = jaccard(tokenizeKey(ka), tokenizeKey(kb));
      if (sim < 0.7) continue;
      const ga = conceptMap.get(ka);
      const gb = conceptMap.get(kb);
      if (!ga?.length || !gb?.length) continue;
      collisionRows.push({
        collision_type: "near_identical_slug_family",
        key_a: ka,
        key_b: kb,
        duplicate_groups_a: ga.map((g) => g.duplicate_group_id).join(";"),
        duplicate_groups_b: gb.map((g) => g.duplicate_group_id).join(";"),
        confidence: sim >= 0.9 ? "high" : "medium",
        why_may_belong_together:
          "Slug tokens are highly similar after article stripping and token normalization.",
        why_may_remain_distinct:
          "Could intentionally separate context/difficulty variants even with close slugs.",
        merge_hint: `token_jaccard_${sim.toFixed(2)}`,
      });
    }
  }

  collisionRows.sort((a, b) => {
    const ct = a.collision_type.localeCompare(b.collision_type);
    if (ct !== 0) return ct;
    const ka = a.key_a.localeCompare(b.key_a);
    if (ka !== 0) return ka;
    return a.key_b.localeCompare(b.key_b);
  });

  const collisionHeaders = [
    "collision_type",
    "key_a",
    "key_b",
    "duplicate_groups_a",
    "duplicate_groups_b",
    "confidence",
    "why_may_belong_together",
    "why_may_remain_distinct",
    "merge_hint",
  ];
  const collisionCsvLatest = join(
    outDir,
    "concept-key-semantic-collision-review-latest.csv",
  );
  writeCsv(collisionCsvLatest, collisionHeaders, collisionRows);
  const collisionSummary = {
    generated_at: new Date().toISOString(),
    possible_collisions: collisionRows.length,
    by_type: collisionRows.reduce((acc, r) => {
      acc[r.collision_type] = (acc[r.collision_type] ?? 0) + 1;
      return acc;
    }, {}),
    outputs: [collisionCsvLatest],
  };
  writeFileSync(
    join(outDir, "concept-key-semantic-collision-review-latest.json"),
    JSON.stringify({ summary: collisionSummary, rows: collisionRows }, null, 2),
    "utf8",
  );

  // 3) Concept diversity future-readiness.
  const diversityRows = [];
  for (const [concept, groups] of [...conceptMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const memberCount = groups.reduce((n, g) => n + g.member_ids.length, 0);
    const themes = [...new Set(groups.flatMap((g) => g.themes))];
    const diffs = [...new Set(groups.flatMap((g) => g.difficulties))];
    const likelyRepetitionRisk =
      memberCount >= 4 || groups.length >= 2 ? "medium" : "low";
    const readinessTag =
      themes.length >= 2 || diffs.length >= 2
        ? "supports_diversity"
        : "single_axis_may_repeat";

    diversityRows.push({
      concept_key: concept,
      duplicate_group_count: groups.length,
      member_question_count: memberCount,
      themes: themes.join(";"),
      difficulties: diffs.join(";"),
      repetition_risk: likelyRepetitionRisk,
      readiness_tag: readinessTag,
    });
  }
  const diversityHeaders = [
    "concept_key",
    "duplicate_group_count",
    "member_question_count",
    "themes",
    "difficulties",
    "repetition_risk",
    "readiness_tag",
  ];
  const diversityCsvLatest = join(outDir, "concept-key-diversity-readiness-latest.csv");
  writeCsv(diversityCsvLatest, diversityHeaders, diversityRows);
  const diversitySummary = {
    generated_at: new Date().toISOString(),
    concepts_counted: diversityRows.length,
    repetition_risk_counts: diversityRows.reduce((acc, r) => {
      acc[r.repetition_risk] = (acc[r.repetition_risk] ?? 0) + 1;
      return acc;
    }, {}),
    readiness_tag_counts: diversityRows.reduce((acc, r) => {
      acc[r.readiness_tag] = (acc[r.readiness_tag] ?? 0) + 1;
      return acc;
    }, {}),
    outputs: [diversityCsvLatest],
  };
  writeFileSync(
    join(outDir, "concept-key-diversity-readiness-latest.json"),
    JSON.stringify({ summary: diversitySummary, rows: diversityRows }, null, 2),
    "utf8",
  );

  // 4) Batch 2 reframing preview (concept-aware, no changes).
  const batch2Groups = Array.isArray(batch2.groups) ? batch2.groups : [];
  const b2Rows = [];
  for (const g of batch2Groups) {
    const gid = String(g.group_id ?? "").trim();
    const conceptKey = groupInfo.get(gid)?.concept_key ?? "";
    const analysis = g.analysis_flags ?? {};
    const reasons = Array.isArray(g.analysis_reasons) ? g.analysis_reasons : [];
    const members = Array.isArray(g.members) ? g.members : [];
    const repQuestion =
      members.find((m) => m.role?.startsWith("canonical"))?.question_preview ??
      members[0]?.question_preview ??
      g.norm_key_preview ??
      "";
    const hasContextVariant = members.some((m) => looksContextualQuestion(m.question_preview));
    const diffVar = Boolean(analysis.difficulty_differ);
    const editorialVar = Boolean(analysis.choices_differ || analysis.explanations_differ);

    let category = "needs_manual_editorial_review";
    let rationale = "No direct safe rule matched.";
    if (diffVar) {
      category = "keep_difficulty_variants";
      rationale = "Group contains distinct difficulty variants under same semantic prompt.";
    } else if (hasContextVariant) {
      category = "keep_context_variants";
      rationale = "Question phrasing includes context-focused formulations (platform/usage framing).";
    } else if (editorialVar && members.length >= 2) {
      category = "keep_multiple_formulations";
      rationale = "Multiple editorial formulations may support future concept diversity.";
    } else if (!editorialVar) {
      category = "safe_archive";
      rationale = "Low editorial variance; likely duplicate noise after concept normalization.";
    }

    // risk overrides from registry
    const risk = riskRows.find((r) => r.concept_key === conceptKey);
    if (risk && (risk.suggested_action === "manual_review" || risk.suggested_action === "split_later")) {
      category = "needs_manual_editorial_review";
      rationale = `Concept key flagged as risky (${risk.issue_type}).`;
    }

    b2Rows.push({
      duplicate_group_id: gid,
      concept_key: conceptKey,
      category,
      confidence: risk ? "medium" : "medium_high",
      rationale,
      analysis_reasons: reasons.join(";"),
      representative_question: normPreview(repQuestion),
      member_count: String(g.member_count ?? members.length ?? ""),
    });
  }

  b2Rows.sort((a, b) => a.duplicate_group_id.localeCompare(b.duplicate_group_id));
  const b2Headers = [
    "duplicate_group_id",
    "concept_key",
    "category",
    "confidence",
    "rationale",
    "analysis_reasons",
    "representative_question",
    "member_count",
  ];
  const b2CsvLatest = join(outDir, "concept-batch2-reframing-preview-latest.csv");
  writeCsv(b2CsvLatest, b2Headers, b2Rows);
  const b2Summary = {
    generated_at: new Date().toISOString(),
    batch2_groups_reviewed: b2Rows.length,
    category_counts: b2Rows.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + 1;
      return acc;
    }, {}),
    outputs: [b2CsvLatest],
  };
  writeFileSync(
    join(outDir, "concept-batch2-reframing-preview-latest.json"),
    JSON.stringify({ summary: b2Summary, rows: b2Rows }, null, 2),
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        risk_registry: riskSummary,
        semantic_collisions: collisionSummary,
        diversity_readiness: diversitySummary,
        batch2_reframing: b2Summary,
        review_only: true,
      },
      null,
      2,
    ),
  );
}

main();


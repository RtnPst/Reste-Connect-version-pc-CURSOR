import { supabase } from "@/integrations/supabase/client";
import { getConceptLabel } from "@/lib/concept-labels";

export type RecentCapturedConcept = {
  conceptKey: string;
  label: string;
  lastSeenAt: string;
};

/**
 * Latest concepts the player has seen, with editorial labels only.
 * Returns [] on error or when the table is unavailable — callers should hide the UI.
 */
export async function fetchRecentCapturedConcepts(
  userId: string,
  limit = 4,
): Promise<RecentCapturedConcept[]> {
  const { data, error } = await supabase
    .from("user_concepts_seen")
    .select("concept_key, last_seen_at")
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false })
    .limit(Math.max(limit * 3, 12));

  if (error) {
    console.error("fetchRecentCapturedConcepts failed", error);
    return [];
  }

  const out: RecentCapturedConcept[] = [];
  const seen = new Set<string>();
  for (const row of data ?? []) {
    const key = row.concept_key as string;
    if (!key || seen.has(key)) continue;
    const label = getConceptLabel(key);
    if (!label) continue;
    seen.add(key);
    out.push({ conceptKey: key, label, lastSeenAt: row.last_seen_at });
    if (out.length >= limit) break;
  }
  return out;
}

/** Full capture memory for Parcours gallery (deduped, labeled). */
export async function fetchCapturedConceptGallery(
  userId: string,
  limit = 60,
): Promise<RecentCapturedConcept[]> {
  return fetchRecentCapturedConcepts(userId, limit);
}

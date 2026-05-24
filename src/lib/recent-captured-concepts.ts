import { supabase } from "@/integrations/supabase/client";
import { getConceptLabel } from "@/lib/concept-labels";

export type RecentCapturedConcept = {
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
  for (const row of data ?? []) {
    const label = getConceptLabel(row.concept_key);
    if (!label) continue;
    out.push({ label, lastSeenAt: row.last_seen_at });
    if (out.length >= limit) break;
  }
  return out;
}

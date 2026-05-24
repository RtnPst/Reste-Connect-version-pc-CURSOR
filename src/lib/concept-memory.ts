import { supabase } from "@/integrations/supabase/client";

export type ConceptSeenSource = "daily" | "theme" | "level" | "marathon";

/**
 * Silent accumulation: only persists editorial DB concept_key (never text proxy).
 * Failures are logged only — must not block gameplay.
 */
export async function recordConceptSeen(params: {
  conceptKey: string | null | undefined;
  wasCorrect: boolean;
  source: ConceptSeenSource;
}): Promise<void> {
  const key = params.conceptKey?.trim();
  if (!key) return;

  const { error } = await supabase.rpc("upsert_user_concept_seen", {
    _concept_key: key,
    _was_correct: params.wasCorrect,
    _source: params.source,
  });

  if (error) {
    console.error("recordConceptSeen failed", error);
  }
}

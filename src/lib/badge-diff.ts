import { supabase } from "@/integrations/supabase/client";

/** Badge ids for a user (for diffing after an action that may unlock badges via DB triggers). */
export async function fetchUserBadgeIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("user_badges").select("badge_id").eq("user_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.badge_id));
}

type UserBadgeJoinRow = { badge_id: string; badges: { name: string } | null };

/** Names of badges present after unlock but not in `beforeIds`. */
export async function listNewBadgeNames(userId: string, beforeIds: Set<string>): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_badges")
    .select("badge_id, badges(name)")
    .eq("user_id", userId);
  if (error) throw error;
  const names: string[] = [];
  for (const row of (data ?? []) as UserBadgeJoinRow[]) {
    if (!beforeIds.has(row.badge_id) && row.badges?.name) {
      names.push(row.badges.name);
    }
  }
  return names;
}

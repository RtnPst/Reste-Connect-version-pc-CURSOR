import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) {
        if (roleError) {
          console.error("Erreur lors de la vérification du rôle admin:", roleError);
          setError(roleError.message);
        } else {
          setIsAdmin(!!data);
          setError(null);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { isAdmin, loading, error };
}

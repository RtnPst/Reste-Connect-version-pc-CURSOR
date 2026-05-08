import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const PROD_APP_URL = "https://tanstack-start-ts.npaysant.workers.dev";

function normalizeUrlBase(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function getAuthRedirectBase(): string {
  const envUrl = import.meta.env.VITE_PUBLIC_APP_URL;
  if (typeof envUrl === "string" && envUrl.trim()) {
    return normalizeUrlBase(envUrl);
  }
  if (import.meta.env.PROD) {
    return PROD_APP_URL;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return PROD_APP_URL;
}

type Profile = {
  id: string;
  display_name: string | null;
  avatar: string;
  font_size: "normal" | "large" | "xlarge";
  audio_enabled: boolean;
  sfx_enabled: boolean;
  music_enabled: boolean;
  high_contrast: boolean;
  current_streak: number;
  longest_streak: number;
  last_play_date: string | null;
  max_unlocked_level: number;
  level_best_scores: Record<string, number>;
  marathon_best_score?: number;
  total_xp: number;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isEmailConfirmed: boolean;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resendConfirmationEmail: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updatePreferences: (
    prefs: Partial<
      Pick<
        Profile,
        | "font_size"
        | "audio_enabled"
        | "sfx_enabled"
        | "music_enabled"
        | "high_contrast"
        | "display_name"
        | "avatar"
      >
    >,
  ) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const authRedirectBase = getAuthRedirectBase();

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (data) setProfile(data as Profile);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Defer profile fetch to avoid deadlocks
        setTimeout(() => fetchProfile(newSession.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) fetchProfile(existing.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Apply user preferences to <html>
  useEffect(() => {
    const html = document.documentElement;
    const fontSize = profile?.font_size ?? "large";
    html.classList.remove("font-normal", "font-large", "font-xlarge");
    html.classList.add(`font-${fontSize}`);

    if (profile?.high_contrast) html.classList.add("high-contrast");
    else html.classList.remove("high-contrast");
  }, [profile?.font_size, profile?.high_contrast]);

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${authRedirectBase}/`,
        data: { display_name: displayName },
      },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${authRedirectBase}/` },
    });
    if (error) throw error;
  };

  const resendConfirmationEmail = async () => {
    const email = user?.email?.trim();
    if (!email) throw new Error("Adresse email introuvable pour ce compte.");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${authRedirectBase}/` },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const updatePreferences: AuthContextValue["updatePreferences"] = async (prefs) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update(prefs).eq("id", user.id);
    if (error) {
      console.error("Supabase profile update failed", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        userId: user?.id,
        payloadKeys: Object.keys(prefs || {}),
      });
      throw error;
    }
    await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isEmailConfirmed: Boolean(user?.email_confirmed_at),
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        resendConfirmationEmail,
        signOut,
        refreshProfile,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

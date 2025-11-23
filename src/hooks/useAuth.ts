"use client";

import { useState, useEffect, useCallback } from "react";
import {
  User,
  Session,
  createClient,
  SupabaseClient,
} from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase environment variables not configured");
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export function useAuth() {
  const [supabase] = useState<SupabaseClient | null>(() => getSupabaseClient());
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    if (!supabase) {
      setAuthState({ user: null, session: null, loading: false });
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signIn = useCallback(
    async (email: string, redirectTo?: string) => {
      if (!supabase) {
        return { error: { message: "Supabase not configured" } };
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo || window.location.origin,
        },
      });
      return { error };
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) {
      return { error: { message: "Supabase not configured" } };
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  }, [supabase]);

  const getAccessToken = useCallback(async () => {
    if (!supabase) return null;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, [supabase]);

  return {
    ...authState,
    signIn,
    signOut,
    getAccessToken,
    isConfigured: !!supabase,
  };
}

export default useAuth;

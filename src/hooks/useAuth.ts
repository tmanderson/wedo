"use client";

import { useState, useEffect, useCallback } from "react";
import { User, Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useAuth() {
  const [supabase] = useState<SupabaseClient>(() => createClient());
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
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
    const { error } = await supabase.auth.signOut();
    return { error };
  }, [supabase]);

  const getAccessToken = useCallback(async () => {
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
    isConfigured: true,
  };
}

export default useAuth;

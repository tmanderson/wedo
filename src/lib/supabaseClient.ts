"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock client for build time / SSR without env vars
    // This will be properly initialized on the client side
    throw new Error("Supabase environment variables not configured");
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}

// Export a getter function instead of direct instance
export const getSupabase = () => {
  try {
    return getSupabaseClient();
  } catch {
    return null;
  }
};

// For backwards compatibility, but only use in client components
export const supabase =
  typeof window !== "undefined"
    ? getSupabaseClient()
    : (null as unknown as SupabaseClient);

export default supabase;

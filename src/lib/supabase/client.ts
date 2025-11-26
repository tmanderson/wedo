"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for Client Components
 * Uses cookies for session management (accessed via document.cookie)
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

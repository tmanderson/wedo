"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;

  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}

/**
 * Authenticated fetch wrapper that includes the Supabase access token
 */
export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const supabase = getSupabase();
  let accessToken: string | undefined;

  if (supabase) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    accessToken = session?.access_token;
  }

  const headers = new Headers(options.headers);

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Typed API request helper
 */
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await authFetch(url, options);
    const json = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error:
          json.error?.message ||
          `Request failed with status ${response.status}`,
      };
    }

    return { data: json as T, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}

/**
 * API helper methods
 */
export const api = {
  get: <T>(url: string) => apiRequest<T>(url, { method: "GET" }),

  post: <T>(url: string, body?: unknown) =>
    apiRequest<T>(url, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(url: string, body?: unknown) =>
    apiRequest<T>(url, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(url: string) => apiRequest<T>(url, { method: "DELETE" }),
};

export default api;

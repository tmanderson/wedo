"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Authenticated fetch wrapper that includes the Supabase access token
 */
export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

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

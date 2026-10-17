"use client";

import { createBrowserClient } from "@supabase/ssr";

import { publicSupabaseConfig } from "@/lib/env";

/**
 * Browser Supabase client bound to cookies, so it shares the auth session with
 * the server. Returns null when Supabase is not configured, so callers degrade
 * gracefully instead of throwing.
 */
let client: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserClient() {
  if (!publicSupabaseConfig.url || !publicSupabaseConfig.anonKey) return null;
  if (!client) {
    client = createBrowserClient(publicSupabaseConfig.url, publicSupabaseConfig.anonKey);
  }
  return client;
}

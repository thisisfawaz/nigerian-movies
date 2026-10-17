import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  publicSupabaseConfig,
  serverSupabaseConfig,
  isSupabaseConfigured
} from "@/lib/env";

/**
 * Public client using the anon key. Safe for reads; RLS governs access.
 */
export function getPublicClient(): SupabaseClient {
  if (!isSupabaseConfigured || !publicSupabaseConfig.url || !publicSupabaseConfig.anonKey) {
    throw new Error("Supabase is not configured.");
  }
  return createClient(publicSupabaseConfig.url, publicSupabaseConfig.anonKey, {
    auth: { persistSession: false }
  });
}

/**
 * Server-only admin client using the service-role key. NEVER import this into
 * a client component or expose the key to the browser (PRD §6.1, §12.6).
 */
export function getAdminClient(): SupabaseClient {
  const { url, serviceRoleKey } = serverSupabaseConfig;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Admin operations require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

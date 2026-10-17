import "server-only";

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { publicSupabaseConfig, isSupabaseConfigured } from "@/lib/env";

/**
 * Cookie-bound Supabase client for the admin auth session.
 * Returns null when Supabase is not configured, so callers can degrade
 * gracefully instead of crashing (zero-key mode).
 */
export function getServerAuthClient() {
  if (!isSupabaseConfigured || !publicSupabaseConfig.url || !publicSupabaseConfig.anonKey) {
    return null;
  }
  const cookieStore = cookies();
  return createServerClient(
    publicSupabaseConfig.url,
    publicSupabaseConfig.anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component render: safe to ignore because
            // middleware refreshes the session.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch {
            // See note above.
          }
        }
      }
    }
  );
}

/**
 * Returns the authenticated admin user, or null.
 * Server-side authorization must always use this (PRD §6.1).
 */
export async function getAdminUser() {
  const client = getServerAuthClient();
  if (!client) return null;
  const {
    data: { user }
  } = await client.auth.getUser();
  return user ?? null;
}

/**
 * Returns the currently signed-in visitor (any authenticated user), or null.
 * Used by public routes and the site header to reflect sign-in state.
 */
export async function getCurrentUser() {
  const client = getServerAuthClient();
  if (!client) return null;
  const {
    data: { user }
  } = await client.auth.getUser();
  return user ?? null;
}

/**
 * Returns the visitor's profile row, or null when signed out / not found.
 */
export async function getCurrentProfile() {
  const client = getServerAuthClient();
  if (!client) return null;
  const {
    data: { user }
  } = await client.auth.getUser();
  if (!user) return null;
  const { data } = await client
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  return data ?? { id: user.id, display_name: null, avatar_url: null };
}

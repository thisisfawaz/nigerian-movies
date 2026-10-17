"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSiteUrl, isSupabaseConfigured } from "@/lib/env";
import { getServerAuthClient } from "@/lib/supabase/server";

/**
 * Starts the Google OAuth flow. Supabase returns a URL we redirect the browser
 * to; Google then sends the user back to /auth/callback.
 */
export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  const next = String(formData.get("next") ?? "/");
  if (!isSupabaseConfigured) {
    redirect(
      `/login?error=${encodeURIComponent(
        "Sign-in is not configured yet. Please try again later."
      )}`
    );
  }

  const client = getServerAuthClient();
  if (!client) {
    redirect(`/login?error=${encodeURIComponent("Authentication is not configured.")}`);
  }

  // Build an absolute callback URL. Prefer the incoming host so this works on
  // localhost and production without extra config, falling back to site URL.
  const headerList = headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const base = host ? `${proto}://${host}` : getSiteUrl();
  const redirectTo = `${base}/auth/callback?next=${encodeURIComponent(next)}`;

  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, queryParams: { prompt: "select_account" } }
  });

  if (error || !data?.url) {
    redirect(
      `/login?error=${encodeURIComponent(
        "Google sign-in is unavailable. It may not be enabled yet."
      )}`
    );
  }

  redirect(data.url);
}

export async function signOutAction(): Promise<void> {
  const client = getServerAuthClient();
  if (client) {
    await client.auth.signOut();
  }
  redirect("/");
}

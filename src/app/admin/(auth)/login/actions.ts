"use server";

import { redirect } from "next/navigation";

import { getServerAuthClient } from "@/lib/supabase/server";
import { isAdminEnabled } from "@/lib/env";

export async function loginAction(formData: FormData): Promise<void> {
  if (!isAdminEnabled) redirect("/");

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email || !password) {
    redirect(`/admin/login?error=${encodeURIComponent("Email and password are required.")}`);
  }

  const client = getServerAuthClient();
  if (!client) {
    redirect(`/admin/login?error=${encodeURIComponent("Authentication is not configured.")}`);
  }

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/admin/login?error=${encodeURIComponent("Invalid email or password.")}`);
  }

  redirect(next.startsWith("/admin") ? next : "/admin");
}

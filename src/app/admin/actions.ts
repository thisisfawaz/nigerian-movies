"use server";

import { redirect } from "next/navigation";

import { getServerAuthClient } from "@/lib/supabase/server";

export async function logoutAction(): Promise<void> {
  const client = getServerAuthClient();
  await client?.auth.signOut();
  redirect("/admin/login");
}

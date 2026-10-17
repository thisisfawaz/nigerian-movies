"use server";

import { redirect } from "next/navigation";

import { getServerAuthClient } from "@/lib/supabase/server";
import { parseYoutubeUrl } from "@/lib/youtube/url";

/**
 * Submits a channel suggestion from a signed-in visitor. Requires a valid
 * YouTube channel URL. The insert runs with the visitor's own cookie-bound
 * session, so RLS (auth.uid() = user_id) applies.
 */
export async function suggestChannelAction(formData: FormData): Promise<void> {
  const rawUrl = String(formData.get("youtubeChannelUrl") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  const parsed = parseYoutubeUrl(rawUrl);
  if (!parsed || parsed.type !== "channel") {
    redirect(
      `/suggest?error=${encodeURIComponent(
        "Please enter a valid YouTube channel URL (e.g. https://youtube.com/@name)."
      )}`
    );
  }

  const client = getServerAuthClient();
  if (!client) {
    redirect(`/suggest?error=${encodeURIComponent("Suggestions are not available.")}`);
  }

  const {
    data: { user }
  } = await client.auth.getUser();
  if (!user) {
    redirect(`/login?next=%2Fsuggest`);
  }

  const { error } = await client.from("suggestions").insert({
    user_id: user.id,
    youtube_channel_url: parsed.canonicalUrl,
    note
  });
  if (error) {
    redirect(`/suggest?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/suggest?submitted=1`);
}

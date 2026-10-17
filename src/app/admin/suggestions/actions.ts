"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminClient } from "@/lib/supabase/clients";
import { getAdminUser } from "@/lib/supabase/server";
import { isAdminEnabled } from "@/lib/env";
import { SupabaseCatalogueRepository } from "@/lib/repositories/supabase-repository";
import { buildEmbedUrl, parseYoutubeUrl } from "@/lib/youtube/url";
import { resolveChannelArtwork } from "@/lib/youtube/metadata";
import { syncChannelVideos } from "@/lib/youtube/sync";

async function requireAdmin() {
  if (!isAdminEnabled) throw new Error("Admin is not enabled.");
  const user = await getAdminUser();
  if (!user) throw new Error("Unauthorized.");
  return user;
}

function adminRepo() {
  return new SupabaseCatalogueRepository(getAdminClient());
}

/**
 * Approves a suggestion: creates a DRAFT channel from its URL (admin can then
 * categorise and publish). Marks the suggestion approved and links the channel.
 */
export async function approveSuggestionAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const adminClient = getAdminClient();
  const { data: suggestion } = await adminClient
    .from("suggestions")
    .select("id, youtube_channel_url, status")
    .eq("id", id)
    .maybeSingle();
  if (!suggestion || suggestion.status !== "pending") {
    redirect(`/admin/suggestions?error=${encodeURIComponent("Suggestion not found or already reviewed.")}`);
  }

  const parsed = parseYoutubeUrl(suggestion.youtube_channel_url as string);
  if (!parsed || parsed.type !== "channel") {
    redirect(`/admin/suggestions?error=${encodeURIComponent("Suggestion URL is not a valid channel.")}`);
  }

  const repo = adminRepo();

  // Duplicate check: if the channel already exists, mark approved and stop.
  if (parsed.channelId) {
    const existing = await repo.findChannelByYoutubeId(parsed.channelId);
    if (existing) {
      await adminClient
        .from("suggestions")
        .update({
          status: "approved",
          reviewed_by: admin.id,
          reviewed_at: new Date().toISOString(),
          created_channel_id: existing.id
        })
        .eq("id", id);
      revalidatePath("/admin/suggestions");
      redirect(`/admin/channels/${existing.id}?saved=1`);
    }
  }

  const name = parsed.handle?.replace(/^@/, "") || "Untitled channel";
  const artwork = await resolveChannelArtwork(parsed.canonicalUrl);

  let createdId: string;
  try {
    const created = await repo.createChannel({
      youtubeChannelUrl: parsed.canonicalUrl,
      name,
      youtubeChannelId: parsed.channelId ?? null,
      youtubePlaylistId: parsed.playlistId ?? null,
      youtubeEmbedUrl: buildEmbedUrl(parsed),
      thumbnailUrl: artwork.thumbnailUrl,
      status: "draft"
    });
    createdId = created.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create channel.";
    redirect(`/admin/suggestions?error=${encodeURIComponent(message)}`);
  }

  try {
    await syncChannelVideos(createdId);
  } catch (error) {
    console.error("Post-approve video sync failed (non-fatal):", error);
  }

  await adminClient
    .from("suggestions")
    .update({
      status: "approved",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      created_channel_id: createdId
    })
    .eq("id", id);

  revalidatePath("/admin/suggestions");
  revalidatePath("/admin/channels");
  redirect(`/admin/channels/${createdId}?saved=1`);
}

export async function rejectSuggestionAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const adminClient = getAdminClient();
  await adminClient
    .from("suggestions")
    .update({
      status: "rejected",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", id);

  revalidatePath("/admin/suggestions");
  redirect("/admin/suggestions?rejected=1");
}

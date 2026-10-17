"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminUser } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/clients";
import { SupabaseCatalogueRepository } from "@/lib/repositories/supabase-repository";
import { isAdminEnabled } from "@/lib/env";
import { buildEmbedUrl, parseYoutubeUrl } from "@/lib/youtube/url";
import { resolveChannelArtwork } from "@/lib/youtube/metadata";
import { syncChannelVideos } from "@/lib/youtube/sync";
import { classifyChannel } from "@/lib/ai/classify";
import type { AiClassification } from "@/lib/ai/schema";
import type { ChannelStatus } from "@/lib/types";

/** Server-side authorization gate for every admin mutation (PRD §6.1). */
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
 * Invalidate public catalogue routes so admin edits are reflected immediately
 * (PRD: published channels must appear/disappear promptly).
 */
function revalidatePublicCatalogue() {
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/categories");
  revalidatePath("/channel/[slug]", "page");
  revalidatePath("/categories/[slug]", "page");
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  warnings?: string[];
  channelId?: string;
}

/**
 * Validates and creates a channel (PRD §6.3). Never publishes automatically.
 */
export async function createChannelAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const rawUrl = String(formData.get("youtubeChannelUrl") ?? "");
  const parsed = parseYoutubeUrl(rawUrl);
  if (!parsed) {
    redirect(
      `/admin/channels/new?error=${encodeURIComponent(
        "That is not a supported YouTube URL. Provide a channel, playlist, or video link."
      )}`
    );
  }

  const repo = adminRepo();

  // Duplicate detection (PRD §6.3 step 4).
  if (parsed.channelId) {
    const existing = await repo.findChannelByYoutubeId(parsed.channelId);
    if (existing) {
      redirect(
        `/admin/channels/new?error=${encodeURIComponent(
          `This channel already exists in the catalogue (${existing.name}).`
        )}`
      );
    }
  }

  const name =
    String(formData.get("name") ?? "").trim() || parsed.handle || "Untitled channel";
  const statusInput = String(formData.get("status") ?? "draft");
  const status = (
    ["draft", "pending_review", "published"].includes(statusInput)
      ? statusInput
      : "draft"
  ) as ChannelStatus;

  let categoryIds = formData.getAll("categoryIds").map(String).filter(Boolean);
  let primaryCategoryId = String(formData.get("primaryCategoryId") ?? "") || null;

  // Default to Nolly English when no category is chosen, so a new channel is
  // never left uncategorized.
  if (categoryIds.length === 0) {
    const nolly = await repo
      .listCategories({ activeOnly: true })
      .then((list) => list.find((c) => c.slug === "nolly-english"));
    if (nolly) {
      categoryIds = [nolly.id];
      primaryCategoryId = nolly.id;
    }
  }

  // Auto-fetch channel artwork (administrator-approved). Best-effort only.
  const artwork = await resolveChannelArtwork(parsed.canonicalUrl);
  const manualThumb = String(formData.get("thumbnailUrl") ?? "").trim() || null;

  let createdId: string;
  try {
    const created = await repo.createChannel({
      youtubeChannelUrl: parsed.canonicalUrl,
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      youtubeChannelId: parsed.channelId ?? null,
      youtubePlaylistId: parsed.playlistId ?? null,
      youtubeEmbedUrl: buildEmbedUrl(parsed),
      thumbnailUrl: manualThumb ?? artwork.thumbnailUrl,
      languageCode: String(formData.get("languageCode") ?? "").trim() || null,
      countryCode: String(formData.get("countryCode") ?? "").trim() || null,
      status,
      categoryIds,
      primaryCategoryId: categoryIds.includes(primaryCategoryId ?? "")
        ? primaryCategoryId
        : categoryIds[0] ?? null,
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    });
    createdId = created.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create channel.";
    redirect(`/admin/channels/new?error=${encodeURIComponent(message)}`);
  }

  // Fetch the channel's full video history (best-effort; never blocks save).
  // syncChannelVideos already swallows its own errors, but guard here too so
  // a sync failure can never turn a successful creation into an error page.
  try {
    await syncChannelVideos(createdId);
  } catch (error) {
    console.error("Post-create video sync failed (non-fatal):", error);
  }

  // redirect() must run OUTSIDE try/catch: it throws NEXT_REDIRECT to navigate,
  // and a catch block would swallow that signal (PRD admin workflow).
  revalidatePath("/admin/channels");
  revalidatePath("/admin");
  revalidatePublicCatalogue();
  redirect(`/admin/channels/${createdId}?saved=1`);
}

export async function refreshVideosAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await syncChannelVideos(id);
  revalidatePath(`/admin/channels/${id}`);
  revalidatePath("/channel/[slug]", "page");
  redirect(`/admin/channels/${id}?refreshed=1`);
}

/**
 * Refresh every channel's stored video history in one pass.
 *
 * Used to backfill metadata (durations, Short/live classification) across the
 * whole catalogue after a schema or classification change. Runs sequentially to
 * stay within YouTube API quota; each channel's sync is independently
 * best-effort, so one failure never aborts the run.
 */
export async function refreshAllChannelsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  void formData;

  const repo = adminRepo();
  // Page through all channels (published or not) so nothing is missed.
  const all: Array<{ id: string }> = [];
  const pageSize = 100;
  for (let page = 1; page <= 50; page += 1) {
    const result = await repo.listChannels({ page, pageSize });
    all.push(...result.items.map((c) => ({ id: c.id })));
    if (all.length >= result.total || result.items.length === 0) break;
  }

  let refreshed = 0;
  for (const { id } of all) {
    try {
      const count = await syncChannelVideos(id);
      if (count > 0) refreshed += 1;
    } catch (error) {
      console.error(`Refresh-all: channel ${id} failed (non-fatal):`, error);
    }
  }

  revalidatePath("/admin/channels");
  revalidatePublicCatalogue();
  redirect(`/admin/channels?refreshed=${refreshed}`);
}

export interface SuggestResult {
  ok: boolean;
  classification?: AiClassification;
  error?: string;
}

/**
 * Runs AI classification for a channel the admin is about to add (PRD §6.3,
 * §7). Returns suggestions only; the admin still approves everything.
 */
export async function suggestCategoriesAction(input: {
  channelName: string;
  channelDescription: string | null;
  notes: string | null;
}): Promise<SuggestResult> {
  await requireAdmin();

  const repo = adminRepo();
  const categories = await repo.listCategories({ activeOnly: true });
  if (categories.length === 0) {
    return { ok: false, error: "Create at least one category before using AI." };
  }

  const result = await classifyChannel({
    channelName: input.channelName,
    channelDescription: input.channelDescription,
    notes: input.notes,
    allowedCategories: categories.map((c) => ({ slug: c.slug, name: c.name }))
  });

  if (!result.ok || !result.classification) {
    return { ok: false, error: result.error ?? "Classification failed." };
  }
  return { ok: true, classification: result.classification };
}

export async function updateChannelAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const categoryIds = formData.getAll("categoryIds").map(String).filter(Boolean);
  const primaryRaw = String(formData.get("primaryCategoryId") ?? "") || null;
  const statusInput = String(formData.get("status") ?? "draft");
  const status = (
    ["draft", "pending_review", "published", "archived"].includes(statusInput)
      ? statusInput
      : "draft"
  ) as ChannelStatus;

  // Optional: changing the YouTube URL re-derives the channel id, uploads
  // playlist, and embed URL so everything stays consistent.
  const rawUrl = String(formData.get("youtubeChannelUrl") ?? "").trim();
  let urlFields: {
    youtubeChannelUrl: string;
    youtubeChannelId: string | null;
    youtubePlaylistId: string | null;
    youtubeEmbedUrl: string | null;
  } | null = null;
  if (rawUrl) {
    const parsed = parseYoutubeUrl(rawUrl);
    if (!parsed || parsed.type !== "channel") {
      redirect(
        `/admin/channels/${id}?error=${encodeURIComponent(
          "That is not a supported YouTube channel URL."
        )}`
      );
    }
    urlFields = {
      youtubeChannelUrl: parsed.canonicalUrl,
      youtubeChannelId: parsed.channelId ?? null,
      youtubePlaylistId: parsed.playlistId ?? null,
      youtubeEmbedUrl: buildEmbedUrl(parsed)
    };
  }

  try {
    await adminRepo().updateChannel(id, {
      name: String(formData.get("name") ?? "").trim() || undefined,
      description: String(formData.get("description") ?? "").trim() || null,
      thumbnailUrl: String(formData.get("thumbnailUrl") ?? "").trim() || null,
      languageCode: String(formData.get("languageCode") ?? "").trim() || null,
      countryCode: String(formData.get("countryCode") ?? "").trim() || null,
      ...(urlFields ?? {}),
      status,
      categoryIds,
      primaryCategoryId: categoryIds.includes(primaryRaw ?? "")
        ? primaryRaw
        : categoryIds[0] ?? null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save.";
    redirect(`/admin/channels/${id}?error=${encodeURIComponent(message)}`);
  }

  // redirect() must run outside try/catch (it throws NEXT_REDIRECT).
  revalidatePath("/admin/channels");
  revalidatePath(`/admin/channels/${id}`);
  revalidatePath("/admin");
  revalidatePublicCatalogue();
  redirect(`/admin/channels/${id}?saved=1`);
}

export async function setChannelStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ChannelStatus;
  if (!id || !["draft", "pending_review", "published", "archived"].includes(status)) {
    return;
  }
  await adminRepo().setChannelStatus(id, status);
  revalidatePath("/admin/channels");
  revalidatePath(`/admin/channels/${id}`);
  revalidatePath("/admin");
  revalidatePublicCatalogue();
}

export async function deleteChannelAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const repo = adminRepo();
  const channel = await repo.getChannelById(id);
  if (!channel) return;
  try {
    await repo.deleteChannel(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete.";
    redirect(`/admin/channels/${id}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/channels");
  revalidatePath("/admin");
  revalidatePublicCatalogue();
  redirect("/admin/channels?deleted=1");
}

export async function toggleFeaturedAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("featured") ?? "") === "true";
  if (!id) return;
  await adminRepo().updateChannel(id, { isFeatured: next });
  revalidatePath("/admin/channels");
  revalidatePath(`/admin/channels/${id}`);
  revalidatePublicCatalogue();
}

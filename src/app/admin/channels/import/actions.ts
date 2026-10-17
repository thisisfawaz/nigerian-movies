"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminClient } from "@/lib/supabase/clients";
import { getAdminUser } from "@/lib/supabase/server";
import { isAdminEnabled } from "@/lib/env";
import { SupabaseCatalogueRepository } from "@/lib/repositories/supabase-repository";
import { buildEmbedUrl, parseYoutubeUrl } from "@/lib/youtube/url";
import { resolveChannelArtwork } from "@/lib/youtube/metadata";

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
 * Extracts candidate YouTube URLs from CSV-ish text. Accepts a header row,
 * a single column, or multiple columns — any cell containing a youtube URL is
 * used. Lines may be comma-separated or just one URL per line.
 */
function extractUrls(text: string): string[] {
  const urls = new Set<string>();
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    // Split on commas, then scan each cell. Also scan the whole line so a bare
    // URL with no commas still matches.
    const cells = line.split(",");
    for (const cell of cells) {
      const trimmed = cell.trim().replace(/^"|"$/g, "");
      if (!trimmed) continue;
      if (/youtube\.com|youtu\.be/i.test(trimmed)) {
        urls.add(trimmed);
      }
    }
  }
  return Array.from(urls);
}

interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  failed: number;
  messages: string[];
}

export async function importChannelsAction(formData: FormData): Promise<void> {
  await requireAdmin();

  // Accept either an uploaded file or pasted text.
  const file = formData.get("file");
  let text = String(formData.get("csv") ?? "");
  if (file instanceof File && file.size > 0) {
    text = await file.text();
  }

  const urls = extractUrls(text);
  if (urls.length === 0) {
    redirect(`/admin/channels/import?error=${encodeURIComponent("No YouTube URLs found in the input.")}`);
  }

  const repo = adminRepo();
  const result: ImportResult = { total: urls.length, created: 0, skipped: 0, failed: 0, messages: [] };

  for (const rawUrl of urls) {
    const parsed = parseYoutubeUrl(rawUrl);
    if (!parsed || parsed.type !== "channel") {
      result.failed += 1;
      result.messages.push(`Skipped (not a channel URL): ${rawUrl}`);
      continue;
    }

    // Duplicate detection.
    if (parsed.channelId) {
      const existing = await repo.findChannelByYoutubeId(parsed.channelId);
      if (existing) {
        result.skipped += 1;
        result.messages.push(`Already exists: ${existing.name}`);
        continue;
      }
    }
    const byUrl = await repo.findChannelByUrl(parsed.canonicalUrl);
    if (byUrl) {
      result.skipped += 1;
      result.messages.push(`Already exists: ${byUrl.name}`);
      continue;
    }

    const name = parsed.handle?.replace(/^@/, "") || "Untitled channel";
    try {
      const artwork = await resolveChannelArtwork(parsed.canonicalUrl);
      await repo.createChannel({
        youtubeChannelUrl: parsed.canonicalUrl,
        name,
        youtubeChannelId: parsed.channelId ?? null,
        youtubePlaylistId: parsed.playlistId ?? null,
        youtubeEmbedUrl: buildEmbedUrl(parsed),
        thumbnailUrl: artwork.thumbnailUrl,
        status: "draft"
      });
      result.created += 1;
    } catch (error) {
      result.failed += 1;
      result.messages.push(
        `Failed: ${rawUrl} (${error instanceof Error ? error.message : "unknown error"})`
      );
    }
  }

  revalidatePath("/admin/channels");
  revalidatePath("/admin/channels/import");

  const summary = `created=${result.created}&skipped=${result.skipped}&failed=${result.failed}&total=${result.total}`;
  redirect(`/admin/channels/import?done=1&${summary}`);
}

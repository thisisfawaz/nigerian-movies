import "server-only";

import { getAdminClient } from "@/lib/supabase/clients";
import { SupabaseCatalogueRepository } from "@/lib/repositories/supabase-repository";
import {
  fetchAllChannelVideos,
  fetchChannelAvatar,
  fetchChannelBanner,
  isYoutubeApiConfigured,
  resolveChannelIdFromHandle
} from "@/lib/youtube/api";
import { resolveChannelArtwork } from "@/lib/youtube/metadata";
import { parseYoutubeUrl } from "@/lib/youtube/url";

/**
 * Sync a channel's full video history into the database.
 * Best-effort: returns the count stored, or 0 on any failure. This function
 * never throws — callers treat video sync as non-critical and must not fail
 * the surrounding operation (e.g. channel creation) because of it.
 */
export async function syncChannelVideos(channelId: string): Promise<number> {
  try {
    return await syncChannelVideosInner(channelId);
  } catch (error) {
    console.error("syncChannelVideos failed (non-fatal):", error);
    return 0;
  }
}

async function syncChannelVideosInner(channelId: string): Promise<number> {
  if (!isYoutubeApiConfigured) return 0;

  const repo = new SupabaseCatalogueRepository(getAdminClient());
  const channel = await repo.getChannelById(channelId);
  if (!channel) return 0;

  // Resolve a YouTube channel id from the stored URL if we don't have one.
  let ytChannelId = channel.youtubeChannelId;
  if (!ytChannelId) {
    const parsed = parseYoutubeUrl(channel.youtubeChannelUrl);
    if (parsed?.channelId) {
      ytChannelId = parsed.channelId;
    } else if (parsed?.handle) {
      ytChannelId = await resolveChannelIdFromHandle(parsed.handle);
    }
    if (ytChannelId) {
      // Persist the resolved id + uploads playlist for future use. If another
      // row already owns this YouTube id, skip the write rather than failing:
      // the channel row already exists and video sync can still proceed.
      const existing = await repo.findChannelByYoutubeId(ytChannelId);
      if (!existing || existing.id === channelId) {
        await repo.updateChannel(channelId, {
          youtubeChannelId: ytChannelId,
          youtubePlaylistId: `UU${ytChannelId.slice(2)}`
        });
      }
    }
  }
  if (!ytChannelId) return 0;

  // Backfill the banner (cover) image if we don't have one yet.
  if (!channel.coverUrl) {
    const banner = await fetchChannelBanner(ytChannelId);
    if (banner) await repo.updateChannel(channelId, { coverUrl: banner });
  }

  // Ensure the square channel avatar (thumbnail) is the real profile picture.
  // Prefer the Data API avatar; fall back to the og:image scrape only when the
  // API can't resolve one. This is what the catalogue cards render.
  const apiAvatar = await fetchChannelAvatar(ytChannelId);
  if (apiAvatar) {
    if (channel.thumbnailUrl !== apiAvatar) {
      await repo.updateChannel(channelId, { thumbnailUrl: apiAvatar });
    }
  } else if (!channel.thumbnailUrl) {
    const artwork = await resolveChannelArtwork(channel.youtubeChannelUrl);
    if (artwork.thumbnailUrl) {
      await repo.updateChannel(channelId, { thumbnailUrl: artwork.thumbnailUrl });
    }
  }

  const videos = await fetchAllChannelVideos(ytChannelId);
  if (videos.length === 0) return 0;

  await repo.replaceChannelVideos(channelId, videos);
  return videos.length;
}

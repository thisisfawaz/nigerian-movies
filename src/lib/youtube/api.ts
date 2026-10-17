import "server-only";

/**
 * YouTube Data API v3 client (full channel history).
 *
 * Reads public data only. Uses a server-side API key. Paginates through the
 * channel's uploads playlist to collect every video. Never scrapes.
 */

const API_BASE = "https://www.googleapis.com/youtube/v3";

function apiKey(): string | null {
  const key = process.env.YOUTUBE_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : null;
}

export const isYoutubeApiConfigured = Boolean(apiKey());

export interface YoutubeVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  position: number;
  /**
   * True when the video is NOT a full-length movie. The platform defines a
   * movie as 20 minutes or longer; anything shorter is treated as a teaser or
   * clip and excluded from Latest Movies.
   */
  isShort: boolean;
  /**
   * Verified duration in seconds, or null when the duration could not be
   * retrieved. This is the authoritative signal for the 20-minute rule.
   */
  durationSeconds: number | null;
  /**
   * True only when the duration was actually retrieved and inspected. When
   * false, `isShort` is a best-effort default and the video has NOT been
   * verified as a full-length movie. Callers that must never show a Short as a
   * movie should exclude unverified videos.
   */
  durationVerified: boolean;
  /**
   * True for live broadcasts: currently-live streams, upcoming/premieres, or
   * completed live VODs. These are never full-length catalogue movies and are
   * excluded before they reach storage.
   */
  isLive: boolean;
}

/** Parse an ISO 8601 duration (e.g. PT1M30S) into total seconds. */
function parseIsoDuration(iso: string | undefined): number | null {
  if (!iso) return null;
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * A full-length movie must run at least 20 minutes. Anything shorter (Shorts,
 * clips, trailers, teasers) is not a movie and must not appear in the Latest
 * Movies feed.
 */
export const MOVIE_MIN_SECONDS = 20 * 60; // 1200

/** True when a duration is below the movie threshold. */
function isBelowMovieLength(seconds: number): boolean {
  return seconds < MOVIE_MIN_SECONDS;
}

async function getJson<T>(path: string, params: Record<string, string>): Promise<T | null> {
  const key = apiKey();
  if (!key) return null;
  const url = new URL(`${API_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve an @handle to a channel id (best-effort). */
export async function resolveChannelIdFromHandle(handle: string): Promise<string | null> {
  const clean = handle.startsWith("@") ? handle.slice(1) : handle;
  const data = await getJson<{ items?: Array<{ id: string }> }>("channels", {
    part: "id",
    forHandle: clean
  });
  return data?.items?.[0]?.id ?? null;
}

/** Fetch the channel banner (cover) image via brandingSettings. */
export async function fetchChannelBanner(channelId: string): Promise<string | null> {
  const data = await getJson<{
    items?: Array<{
      brandingSettings?: { image?: { bannerExternalUrl?: string } };
    }>;
  }>("channels", {
    part: "brandingSettings",
    id: channelId
  });
  return data?.items?.[0]?.brandingSettings?.image?.bannerExternalUrl ?? null;
}

/**
 * Fetch the channel's square profile avatar (the real profile picture) via the
 * Data API. This is the authoritative avatar — unlike og:image, which often
 * points at the banner instead.
 */
export async function fetchChannelAvatar(channelId: string): Promise<string | null> {
  const data = await getJson<{
    items?: Array<{
      snippet?: {
        thumbnails?: {
          high?: { url?: string };
          medium?: { url?: string };
          default?: { url?: string };
        };
      };
    }>;
  }>("channels", {
    part: "snippet",
    id: channelId
  });
  const thumbs = data?.items?.[0]?.snippet?.thumbnails;
  return thumbs?.high?.url ?? thumbs?.medium?.url ?? thumbs?.default?.url ?? null;
}

/**
 * Fetch the full uploads list for a channel id by paginating through its
 * uploads playlist. Returns every video (title, id, thumbnail, date).
 */
export async function fetchAllChannelVideos(channelId: string): Promise<YoutubeVideo[]> {
  if (!apiKey()) return [];

  // The uploads playlist id is the channel id with UC -> UU.
  const uploadsPlaylistId = channelId.startsWith("UC")
    ? `UU${channelId.slice(2)}`
    : null;
  if (!uploadsPlaylistId) return [];

  const videos: YoutubeVideo[] = [];
  let pageToken: string | undefined;
  let position = 0;
  let guard = 0;

  do {
    const params: Record<string, string> = {
      part: "snippet,contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: "50"
    };
    if (pageToken) params.pageToken = pageToken;

    const data = await getJson<{
      items?: Array<{
        snippet?: {
          title?: string;
          publishedAt?: string;
          resourceId?: { videoId?: string };
          thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
          /** "live" | "upcoming" | "none" — live values mean a broadcast. */
          liveBroadcastContent?: string;
        };
        contentDetails?: { videoPublishedAt?: string };
      }>;
      nextPageToken?: string;
    }>("playlistItems", params);

    if (!data) break;

    for (const item of data.items ?? []) {
      const videoId = item.snippet?.resourceId?.videoId;
      const title = item.snippet?.title;
      if (!videoId || !title || title === "Private video" || title === "Deleted video") {
        continue;
      }
      // Always request the highest-resolution thumbnail. If a video lacks
      // maxresdefault, the render layer falls back to hqdefault.
      const thumb = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
      const broadcast = item.snippet?.liveBroadcastContent;
      videos.push({
        videoId,
        title,
        thumbnailUrl: thumb,
        publishedAt: item.snippet?.publishedAt ?? null,
        position: position++,
        // Unknown until the duration pass below; assume non-movie so an
        // unverified item never leaks into Latest Movies.
        isShort: true,
        durationSeconds: null,
        durationVerified: false,
        // "live" and "upcoming" are definitively broadcasts. Completed live
        // streams report "none" here and are caught in the duration pass below.
        isLive: broadcast === "live" || broadcast === "upcoming"
      });
    }

    pageToken = data.nextPageToken;
    guard += 1;
  } while (pageToken && guard < 40); // safety cap ~2000 videos

  // Determine which videos are Shorts. Duration is not available from
  // playlistItems, so fetch it in batches of 50 from the videos endpoint.
  //
  // Classification is only trusted when a batch succeeds. A failed batch is
  // retried before we give up; videos whose duration could not be retrieved
  // stay `durationVerified: false` so callers can exclude them rather than
  // risk showing a Short as a full-length movie.
  const byId = new Map(videos.map((v) => [v.videoId, v]));
  const ids = videos.map((v) => v.videoId);
  const MAX_BATCH_ATTEMPTS = 3;

  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    let data: {
      items?: Array<{
        id?: string;
        contentDetails?: { duration?: string };
        /**
         * Present only for content that is/was a live broadcast. Its presence
         * (with any of actualStartTime / scheduledStartTime / concurrentViewers)
         * marks the item as live rather than a regular upload.
         */
        liveStreamingDetails?: {
          actualStartTime?: string;
          scheduledStartTime?: string;
        };
      }>;
    } | null = null;

    for (let attempt = 0; attempt < MAX_BATCH_ATTEMPTS && !data; attempt += 1) {
      data = await getJson<{
        items?: Array<{
          id?: string;
          contentDetails?: { duration?: string };
          liveStreamingDetails?: {
            actualStartTime?: string;
            scheduledStartTime?: string;
          };
        }>;
      }>("videos", {
        // liveStreamingDetails lets us detect completed live VODs, which
        // playlistItems reports as ordinary uploads.
        part: "contentDetails,liveStreamingDetails",
        id: batch.join(",")
      });
    }

    if (!data) {
      // Leave the whole batch unverified; `durationVerified` stays false.
      continue;
    }

    for (const item of data.items ?? []) {
      const target = item.id ? byId.get(item.id) : undefined;
      if (!target) continue;

      // A completed/ongoing live stream exposes liveStreamingDetails. Treat any
      // of these timestamps as proof the item is a broadcast, not a movie.
      const live = item.liveStreamingDetails;
      if (live?.actualStartTime || live?.scheduledStartTime) {
        target.isLive = true;
      }

      const duration = item.contentDetails?.duration;
      // A video with no duration in the response was deleted/private after the
      // playlist read; keep it unverified (and non-movie) rather than trusting
      // the optimistic default.
      if (!duration) continue;
      const seconds = parseIsoDuration(duration);
      if (seconds === null || seconds <= 0) continue;
      target.durationSeconds = seconds;
      target.isShort = isBelowMovieLength(seconds);
      target.durationVerified = true;
    }
  }

  // Live broadcasts are never catalogue movies. Drop them before returning so
  // they are never stored or shown anywhere.
  return videos.filter((video) => !video.isLive);
}

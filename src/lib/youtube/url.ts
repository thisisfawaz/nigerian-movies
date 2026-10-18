/**
 * YouTube URL validation and normalization (PRD §9, §10).
 *
 * This module is deliberately pure and dependency-free so it can be unit
 * tested in isolation and reused on both server and client.
 *
 * SECURITY: We never accept or render arbitrary iframe HTML. We parse only the
 * identifiers we recognize and generate embed markup from trusted templates.
 */

export type YoutubeResourceType = "channel" | "playlist" | "video";

export interface ParsedYoutubeResource {
  type: YoutubeResourceType;
  /** Canonical URL to store. */
  canonicalUrl: string;
  /** Channel id (UC...) when known. */
  channelId?: string;
  /** Playlist id when known. */
  playlistId?: string;
  /** Video id when known. */
  videoId?: string;
  /** Handle (e.g. @name) when the input was a handle URL. */
  handle?: string;
}

const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be"
]);

const CHANNEL_ID_RE = /^UC[\w-]{22}$/;
const PLAYLIST_ID_RE = /^[\w-]{13,42}$/;
const VIDEO_ID_RE = /^[\w-]{11}$/;
const HANDLE_RE = /^@[\w.-]{3,30}$/;

/**
 * The uploads playlist for a channel is derived from its channel id by
 * replacing the leading "UC" with "UU". This is the supported, API-free way
 * to embed a channel's uploads feed (PRD §10.1/§10.2).
 */
export function uploadsPlaylistFromChannelId(channelId: string): string | null {
  if (!CHANNEL_ID_RE.test(channelId)) return null;
  return `UU${channelId.slice(2)}`;
}

/**
 * Parse and validate a YouTube URL supplied by an administrator.
 * Returns null when the input is not a supported YouTube resource.
 *
 * Accepts common forms and normalizes them to a canonical URL.
 */
export function parseYoutubeUrl(input: string): ParsedYoutubeResource | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    // Reject unexpected protocols early. Only http/https are candidates; we
    // normalize http to https below.
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    url = new URL(withProtocol);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) return null;

  const segments = url.pathname.split("/").filter(Boolean);

  // youtu.be/<videoId>
  if (host === "youtu.be" || host === "www.youtu.be") {
    const videoId = segments[0] ?? "";
    if (!VIDEO_ID_RE.test(videoId)) return null;
    return {
      type: "video",
      videoId,
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`
    };
  }

  // /watch?v=<videoId>
  if (segments[0] === "watch") {
    const videoId = url.searchParams.get("v") ?? "";
    if (!VIDEO_ID_RE.test(videoId)) return null;
    return {
      type: "video",
      videoId,
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`
    };
  }

  // /channel/<UC...>
  if (segments[0] === "channel") {
    const channelId = segments[1] ?? "";
    if (!CHANNEL_ID_RE.test(channelId)) return null;
    return {
      type: "channel",
      channelId,
      playlistId: uploadsPlaylistFromChannelId(channelId) ?? undefined,
      canonicalUrl: `https://www.youtube.com/channel/${channelId}`
    };
  }

  // /@handle  or  /c/<name>  or  /user/<name>
  if (segments[0]?.startsWith("@") || segments[0] === "c" || segments[0] === "user") {
    const handle =
      segments[0]?.startsWith("@") ? segments[0] : segments[1] ?? "";
    if (segments[0]?.startsWith("@")) {
      if (!HANDLE_RE.test(handle)) return null;
      return {
        type: "channel",
        handle,
        canonicalUrl: `https://www.youtube.com/${handle}`
      };
    }
    // Legacy /c/ and /user/ URLs cannot be resolved to a channel id without an
    // API call. Accept them as channel references but note the missing id.
    if (!handle) return null;
    return {
      type: "channel",
      canonicalUrl: `https://www.youtube.com/${segments[0]}/${handle}`
    };
  }

  // /playlist?list=<id>  or  /embed/videoseries?list=<id>
  if (segments[0] === "playlist" || segments[0] === "embed") {
    const playlistId = url.searchParams.get("list") ?? "";
    if (!PLAYLIST_ID_RE.test(playlistId)) return null;
    return {
      type: "playlist",
      playlistId,
      canonicalUrl: `https://www.youtube.com/playlist?list=${playlistId}`
    };
  }

  return null;
}

/**
 * Build a validated embed URL from trusted templates only.
 * Never takes raw user HTML.
 */
export function buildEmbedUrl(
  resource: Pick<ParsedYoutubeResource, "type" | "channelId" | "playlistId" | "videoId">
): string | null {
  // Privacy-enhanced host: no tracking cookies are set until playback starts.
  if (resource.type === "video" && resource.videoId) {
    return `https://www.youtube-nocookie.com/embed/${resource.videoId}`;
  }
  if (resource.type === "playlist" && resource.playlistId) {
    return `https://www.youtube-nocookie.com/embed/videoseries?list=${resource.playlistId}`;
  }
  if (resource.type === "channel" && resource.channelId) {
    const uploads = uploadsPlaylistFromChannelId(resource.channelId);
    if (uploads) {
      return `https://www.youtube-nocookie.com/embed/videoseries?list=${uploads}`;
    }
  }
  return null;
}

/** Turn a channel name into a URL-safe slug. */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

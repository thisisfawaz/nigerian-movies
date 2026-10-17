import "server-only";

import { parseYoutubeUrl } from "@/lib/youtube/url";

/**
 * Fetch channel artwork automatically when a channel is added. No API key.
 *
 * Primary method: read the channel page's Open Graph image (og:image), which
 * YouTube exposes and which points at the channel avatar. Falls back to an
 * oEmbed thumbnail for non-channel resources. Failures are silent so adding a
 * channel never breaks because artwork could not be fetched.
 */

export interface ResolvedArtwork {
  thumbnailUrl: string | null;
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; YouFlix/1.0; +https://youflix.local)";

async function fetchWithTimeout(url: string, ms: number): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, accept: "text/html" }
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractOgImage(html: string): string | null {
  // Match property="og:image" content="..." in either attribute order.
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return match[1].replace(/&amp;/g, "&");
  }
  return null;
}

async function fetchChannelAvatar(channelId: string): Promise<string | null> {
  const response = await fetchWithTimeout(
    `https://www.youtube.com/channel/${channelId}`,
    8000
  );
  if (!response || !response.ok) return null;
  const html = await response.text();
  const raw = extractOgImage(html);
  if (!raw) return null;
  // Normalize to a plain, browser-friendly size. YouTube avatar URLs accept
  // the `=sNNN` size suffix; strip any existing size/protection suffix first.
  return normalizeAvatarUrl(raw);
}

/**
 * Strip YouTube's size/quality suffix and apply a stable 176px size. These
 * plain URLs load reliably in a browser <img>, unlike the signed og:image form.
 */
export function normalizeAvatarUrl(url: string): string {
  const base = url.split("=")[0];
  return `${base}=s176-c-k-c0x00ffffff-no-rj`;
}

async function fetchOembedThumbnail(resourceUrl: string): Promise<string | null> {
  const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
    resourceUrl
  )}`;
  const response = await fetchWithTimeout(endpoint, 6000);
  if (!response || !response.ok) return null;
  try {
    const json = (await response.json()) as { thumbnail_url?: string };
    return json.thumbnail_url ?? null;
  } catch {
    return null;
  }
}

export async function resolveChannelArtwork(inputUrl: string): Promise<ResolvedArtwork> {
  const parsed = parseYoutubeUrl(inputUrl);
  if (!parsed) return { thumbnailUrl: null };

  if (parsed.channelId) {
    const avatar = await fetchChannelAvatar(parsed.channelId);
    if (avatar) return { thumbnailUrl: avatar };
  }

  const oembed = await fetchOembedThumbnail(parsed.canonicalUrl);
  return { thumbnailUrl: oembed };
}

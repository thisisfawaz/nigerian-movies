/**
 * Watch history, stored per-user in Supabase.
 *
 * Capped at the 40 most recent entries. Recording a video the user has already
 * watched bumps it to the top rather than creating a second row, and anything
 * beyond the cap is pruned on write.
 *
 * Only explicit clicks are recorded. The video a channel page auto-selects is
 * not added, because that reflects the page default, not a choice.
 */

import { getBrowserClient } from "@/lib/supabase/browser";

export interface WatchedMovie {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  channelSlug: string;
  channelName: string;
}

interface HistoryRow {
  video_id: string;
  title: string;
  thumbnail_url: string | null;
  channel_slug: string;
  channel_name: string;
}

const EVENT = "youflix:history-changed";
const MAX_ENTRIES = 40;

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export async function listHistory(): Promise<WatchedMovie[]> {
  const client = getBrowserClient();
  if (!client) return [];
  const { data, error } = await client
    .from("watch_history")
    .select("video_id, title, thumbnail_url, channel_slug, channel_name")
    .order("watched_at", { ascending: false })
    .limit(MAX_ENTRIES);
  if (error) return [];
  return ((data ?? []) as HistoryRow[]).map((row) => ({
    videoId: row.video_id,
    title: row.title,
    thumbnailUrl: row.thumbnail_url ?? null,
    channelSlug: row.channel_slug,
    channelName: row.channel_name
  }));
}

/**
 * Records a movie as watched. Throws on failure so callers can ignore it; this
 * is a background write and should never interrupt playback.
 */
export async function recordWatch(movie: WatchedMovie): Promise<void> {
  const client = getBrowserClient();
  if (!client) return;
  const {
    data: { user }
  } = await client.auth.getUser();
  if (!user) return;

  const { error } = await client.from("watch_history").upsert(
    {
      user_id: user.id,
      video_id: movie.videoId,
      title: movie.title,
      thumbnail_url: movie.thumbnailUrl,
      channel_slug: movie.channelSlug,
      channel_name: movie.channelName,
      watched_at: new Date().toISOString()
    },
    { onConflict: "user_id,video_id" }
  );
  if (error) throw new Error(error.message);

  emit();
  await pruneOldEntries(client, user.id);
}

/** Keeps only the newest MAX_ENTRIES rows for the user. */
async function pruneOldEntries(
  client: NonNullable<ReturnType<typeof getBrowserClient>>,
  userId: string
): Promise<void> {
  const { data } = await client
    .from("watch_history")
    .select("video_id")
    .eq("user_id", userId)
    .order("watched_at", { ascending: false })
    .range(MAX_ENTRIES, MAX_ENTRIES + 100);
  const stale = (data ?? []) as Array<{ video_id: string }>;
  if (stale.length === 0) return;
  await client
    .from("watch_history")
    .delete()
    .eq("user_id", userId)
    .in(
      "video_id",
      stale.map((row) => row.video_id)
    );
}

export async function clearHistory(): Promise<void> {
  const client = getBrowserClient();
  if (!client) throw new Error("History is not available.");
  const {
    data: { user }
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { error } = await client.from("watch_history").delete().eq("user_id", user.id);
  if (error) throw new Error(error.message);
  emit();
}

export function onHistoryChanged(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

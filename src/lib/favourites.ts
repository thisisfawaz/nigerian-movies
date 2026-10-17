/**
 * Favourites ("watch later"), stored per-user in Supabase.
 *
 * All operations are async and require a signed-in user. Unlike the previous
 * version, these DO NOT swallow errors: a failed write throws so the UI can
 * react (e.g. revert an optimistic toggle) instead of silently desyncing.
 *
 * A one-time migration lifts any favourites previously saved in localStorage
 * (from the pre-login era) into the signed-in user's account.
 */

import { getBrowserClient } from "@/lib/supabase/browser";

export interface FavouriteMovie {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  channelSlug: string;
  channelName: string;
}

interface FavouriteRow {
  video_id: string;
  title: string;
  thumbnail_url: string | null;
  channel_slug: string;
  channel_name: string;
}

const LEGACY_KEY = "youflix:favourites";
const LEGACY_MIGRATED = "youflix:favourites-migrated";
const PENDING_KEY = "youflix:pending-favourites";
const EVENT = "youflix:favourites-changed";

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

/** True when a user is currently signed in (browser session). */
export async function isSignedIn(): Promise<boolean> {
  const client = getBrowserClient();
  if (!client) return false;
  const {
    data: { user }
  } = await client.auth.getUser();
  return Boolean(user);
}

function readLegacy(): FavouriteMovie[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FavouriteMovie[]) : [];
  } catch {
    return [];
  }
}

export async function migrateLegacyFavourites(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(LEGACY_MIGRATED) === "1") return;
  if (!(await isSignedIn())) return;
  const legacy = readLegacy();
  window.localStorage.setItem(LEGACY_MIGRATED, "1");
  if (legacy.length === 0) return;
  for (const movie of legacy) {
    try {
      await addFavourite(movie);
    } catch {
      // Skip individual failures; legacy data is best-effort.
    }
  }
  window.localStorage.removeItem(LEGACY_KEY);
}

export async function listFavourites(): Promise<FavouriteMovie[]> {
  const client = getBrowserClient();
  if (!client) return [];
  const { data, error } = await client
    .from("favourites")
    .select("video_id, title, thumbnail_url, channel_slug, channel_name")
    .order("created_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as FavouriteRow[]).map((row) => ({
    videoId: row.video_id,
    title: row.title,
    thumbnailUrl: row.thumbnail_url ?? null,
    channelSlug: row.channel_slug,
    channelName: row.channel_name
  }));
}

export async function isFavourite(videoId: string): Promise<boolean> {
  const client = getBrowserClient();
  if (!client) return false;
  const { data, error } = await client
    .from("favourites")
    .select("video_id")
    .eq("video_id", videoId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

/** Throws on failure (not signed in, RLS rejection, network). */
export async function addFavourite(movie: FavouriteMovie): Promise<void> {
  const client = getBrowserClient();
  if (!client) throw new Error("Favourites are not available.");
  const {
    data: { user }
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { error } = await client.from("favourites").upsert(
    {
      user_id: user.id,
      video_id: movie.videoId,
      title: movie.title,
      thumbnail_url: movie.thumbnailUrl,
      channel_slug: movie.channelSlug,
      channel_name: movie.channelName
    },
    { onConflict: "user_id,video_id" }
  );
  if (error) throw new Error(error.message);
  emit();
}

/** Throws on failure. */
export async function removeFavourite(videoId: string): Promise<void> {
  const client = getBrowserClient();
  if (!client) throw new Error("Favourites are not available.");
  const {
    data: { user }
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { error } = await client.from("favourites").delete().eq("video_id", videoId);
  if (error) throw new Error(error.message);
  emit();
}

/**
 * Toggles a favourite. Returns the resulting state (true = saved).
 * Throws if the user is not signed in or the write fails.
 */
export async function toggleFavourite(movie: FavouriteMovie): Promise<boolean> {
  const already = await isFavourite(movie.videoId);
  if (already) {
    await removeFavourite(movie.videoId);
    return false;
  }
  await addFavourite(movie);
  return true;
}

/**
 * Pending favourites: movies a signed-out visitor tapped the heart on. Stored
 * locally so the intent survives the OAuth round-trip, then applied after
 * sign-in. Returns the count applied.
 */
export function queuePendingFavourite(movie: FavouriteMovie): void {
  if (typeof window === "undefined") return;
  const current = listPendingFavourites();
  if (current.some((m) => m.videoId === movie.videoId)) return;
  window.localStorage.setItem(PENDING_KEY, JSON.stringify([...current, movie]));
}

export function listPendingFavourites(): FavouriteMovie[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FavouriteMovie[]) : [];
  } catch {
    return [];
  }
}

function clearPendingFavourites(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_KEY);
}

/**
 * Applies any queued pending favourites to the signed-in user's account.
 * Returns the number successfully added. No-op when signed out or empty.
 */
export async function flushPendingFavourites(): Promise<number> {
  if (typeof window === "undefined") return 0;
  if (!(await isSignedIn())) return 0;
  const pending = listPendingFavourites();
  if (pending.length === 0) return 0;
  let added = 0;
  for (const movie of pending) {
    try {
      await addFavourite(movie);
      added += 1;
    } catch {
      // Skip individual failures; keep the rest.
    }
  }
  clearPendingFavourites();
  return added;
}

export function onFavouritesChanged(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

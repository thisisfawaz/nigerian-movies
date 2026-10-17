/**
 * Lightweight per-visitor "recently shown" history for repetition control
 * (PRD §5).
 *
 * The platform has no user accounts, so we use a single first-party cookie that
 * stores a bounded list of recently displayed video ids. This is deliberately
 * best-effort: if cookies are unavailable (SSR without a request scope) the
 * feed still renders, just without repetition suppression.
 *
 * The cookie is only ever READ when generating the feed and only WRITTEN after
 * a feed is produced, so it never influences anything else.
 */

import { cookies } from "next/headers";

export const RECENT_HISTORY_COOKIE = "yf_recent";

const MAX_COOKIE_BYTES = 3000;

interface HistoryReader {
  get(name: string): { value: string } | undefined;
}

interface HistoryWriter {
  set(
    name: string,
    value: string,
    options: {
      maxAge: number;
      path: string;
      sameSite: "lax";
      httpOnly: boolean;
    }
  ): void;
}

/** Parse the comma-separated id list from a cookie value, dropping blanks. */
export function parseHistory(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

/**
 * Merge newly shown ids into the existing history, keeping the most recent
 * entries and capping the list to `window` items.
 */
export function mergeHistory(
  existing: readonly string[],
  shown: readonly string[],
  window: number
): string[] {
  if (window <= 0) return [];
  const seen = new Set<string>();
  const merged: string[] = [];
  // Newest first: the just-shown ids are more recent than the stored history.
  for (const id of [...shown, ...existing]) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
    if (merged.length >= window) break;
  }
  return merged;
}

/** Serialize history into a cookie-safe string within the byte budget. */
export function serializeHistory(ids: readonly string[]): string {
  let out = "";
  for (const id of ids) {
    const next = out.length === 0 ? id : `${out},${id}`;
    if (next.length > MAX_COOKIE_BYTES) break;
    out = next;
  }
  return out;
}

/** Read the recent-display history. Returns [] when no request scope exists. */
export function readRecentHistory(): string[] {
  try {
    const store = cookies() as unknown as HistoryReader;
    return parseHistory(store.get(RECENT_HISTORY_COOKIE)?.value);
  } catch {
    return [];
  }
}

/**
 * Persist the recent-display history. Best-effort: silently no-ops outside a
 * request scope or when the window is disabled.
 */
export function writeRecentHistory(ids: readonly string[], window: number): void {
  if (window <= 0) return;
  try {
    const store = cookies() as unknown as HistoryWriter;
    const serialized = serializeHistory(ids);
    if (!serialized) return;
    store.set(RECENT_HISTORY_COOKIE, serialized, {
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
      sameSite: "lax",
      httpOnly: true
    });
  } catch {
    // Reading/writing cookies is not possible in some render contexts; ignore.
  }
}

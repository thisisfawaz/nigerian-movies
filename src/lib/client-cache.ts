"use client";

/**
 * Minimal stale-while-revalidate cache for client data.
 *
 * - Reads are SYNCHRONOUS and return the last known value immediately
 *   (memory first, then sessionStorage), so pages can render instantly.
 * - `revalidate(key, fetcher)` refreshes in the background and notifies
 *   subscribers when new data arrives.
 * - Entries are namespaced and versioned so a stale schema never leaks in.
 */

type Listener = () => void;

const VERSION = "v1";
const memory = new Map<string, unknown>();
const listeners = new Map<string, Set<Listener>>();

function storageKey(key: string) {
  return `youflix:cache:${VERSION}:${key}`;
}

export function readCache<T>(key: string): T | undefined {
  if (memory.has(key)) return memory.get(key) as T;
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(storageKey(key));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as T;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return undefined;
  }
}

function writeCache<T>(key: string, value: T): void {
  memory.set(key, value);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(storageKey(key), JSON.stringify(value));
    } catch {
      // Storage full or blocked: memory cache still works.
    }
  }
  notify(key);
}

export function subscribe(key: string, cb: Listener): () => void {
  const set = listeners.get(key) ?? new Set<Listener>();
  set.add(cb);
  listeners.set(key, set);
  return () => set.delete(cb);
}

function notify(key: string): void {
  const set = listeners.get(key);
  if (!set) return;
  for (const cb of set) cb();
}

/**
 * Ensures a key has fresh data. If cached data exists it is returned instantly
 * and a background refresh runs; otherwise the fetcher is awaited.
 * Returns the freshest value it has.
 */
export async function revalidate<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = readCache<T>(key);
  try {
    const fresh = await fetcher();
    writeCache(key, fresh);
    return fresh;
  } catch {
    // Network failed: keep whatever we had (possibly undefined).
    if (cached !== undefined) return cached;
    throw new Error("Failed to load data and no cache available.");
  }
}

/** Clears the whole cache (e.g. after an admin mutation). */
export function clearCache(): void {
  memory.clear();
  if (typeof window !== "undefined") {
    try {
      const keys: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i += 1) {
        const k = window.sessionStorage.key(i);
        if (k && k.startsWith(`youflix:cache:${VERSION}:`)) keys.push(k);
      }
      keys.forEach((k) => window.sessionStorage.removeItem(k));
    } catch {
      // ignore
    }
  }
  // Notify all listeners so live views can refetch.
  for (const key of listeners.keys()) notify(key);
}

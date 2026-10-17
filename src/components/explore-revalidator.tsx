"use client";

import { useEffect } from "react";

import type { ChannelWithCategories, Paginated } from "@/lib/types";
import { readCache, revalidate, subscribe } from "@/lib/client-cache";

/**
 * Keeps the explore list fresh without blocking first paint.
 *
 * The server already rendered the initial list (instant). This component
 * seeds the client cache with that server data, then revalidates in the
 * background so if the catalogue changed, the cache is updated for the next
 * visit — silently, with no loading state.
 */
export function ExploreRevalidator({
  cacheKey,
  initial
}: {
  cacheKey: string;
  initial: Paginated<ChannelWithCategories>;
}) {
  useEffect(() => {
    // Seed: only if nothing cached yet, so we never overwrite fresher data.
    if (readCache(cacheKey) === undefined) {
      // Write via a revalidate with an immediate resolver to reuse the store.
      void revalidate(cacheKey, async () => initial).catch(() => {});
    }

    // Background refresh.
    const refresh = async () => {
      const params = new URLSearchParams(cacheKey.split("|")[1] ?? "");
      await revalidate(cacheKey, async () => {
        const res = await fetch(`/api/catalogue/channels?${params.toString()}`, {
          cache: "no-store"
        });
        if (!res.ok) throw new Error("refresh failed");
        return (await res.json()) as Paginated<ChannelWithCategories>;
      }).catch(() => {});
    };
    void refresh();

    return subscribe(cacheKey, () => {
      // A future enhancement could swap the rendered list; for now the cache
      // warms the next navigation instantly.
    });
  }, [cacheKey, initial]);

  return null;
}

"use client";

import { useEffect, useState } from "react";

import { ChannelCard } from "@/components/channel-card";
import { EmptyState } from "@/components/ui";
import { readCache, revalidate, subscribe } from "@/lib/client-cache";
import type { ChannelWithCategories, Paginated } from "@/lib/types";

/**
 * Renders the explore channel list instantly (from the server-rendered seed or
 * the client cache), then silently revalidates in the background. If fresh
 * data arrives it swaps in with no loading state.
 */
export function ExploreChannels({
  cacheKey,
  apiQuery,
  initial
}: {
  cacheKey: string;
  apiQuery: string;
  initial: Paginated<ChannelWithCategories>;
}) {
  const [data, setData] = useState<Paginated<ChannelWithCategories>>(
    () => readCache<Paginated<ChannelWithCategories>>(cacheKey) ?? initial
  );

  useEffect(() => {
    // Seed the cache with the server data if we have nothing yet.
    if (readCache(cacheKey) === undefined) {
      void revalidate(cacheKey, async () => initial).catch(() => {});
    }

    const off = subscribe(cacheKey, () => {
      const next = readCache<Paginated<ChannelWithCategories>>(cacheKey);
      if (next) setData(next);
    });

    // Background revalidation; silent on failure.
    void revalidate(cacheKey, async () => {
      const res = await fetch(`/api/catalogue/channels?${apiQuery}`, { cache: "no-store" });
      if (!res.ok) throw new Error("refresh failed");
      return (await res.json()) as Paginated<ChannelWithCategories>;
    }).catch(() => {});

    return off;
  }, [cacheKey, apiQuery, initial]);

  if (data.items.length === 0) {
    return (
      <EmptyState
        title="No channels match"
        description="Try clearing your search or check back soon."
      />
    );
  }

  return (
    <div className="flex flex-wrap gap-4">
      {data.items.map((channel) => (
        <div key={channel.id} className="w-40 flex-none sm:w-48">
          <ChannelCard channel={channel} />
        </div>
      ))}
    </div>
  );
}

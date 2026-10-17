import "server-only";

import { getCatalogueRepository } from "@/lib/repositories";
import type { RecentVideo } from "@/lib/repositories/types";

import { resolveFeedConfig, type FeedConfig } from "@/lib/feed/config";
import {
  selectDateWeighted,
  type WeightedItem
} from "@/lib/feed/date-weighting";
import {
  mergeHistory,
  readRecentHistory,
  writeRecentHistory
} from "@/lib/feed/recent-history";

/**
 * Build the Latest Movies feed.
 *
 * Pipeline (PRD §3):
 *  1. fetch the eligible full-movie pool from the repository,
 *  2. apply the date-weighted, randomized selection,
 *  3. remember what was shown to suppress immediate repetition,
 *  4. persist the updated history (best-effort).
 *
 * The function is resilient: if the underlying catalogue fetch fails it returns
 * an empty list so the homepage still renders.
 */
export async function getLatestMoviesFeed(
  overrides: Partial<FeedConfig> = {}
): Promise<RecentVideo[]> {
  const config = resolveFeedConfig(overrides);

  const repo = getCatalogueRepository();

  let pool: RecentVideo[];
  try {
    // Use the full eligible pool so the weighting has every candidate to work
    // with. The repository reuses stored metadata and never calls YouTube live.
    pool = await repo.listMoviePool();
  } catch (error) {
    console.error("[feed] Failed to load movie pool (non-fatal):", error);
    return [];
  }

  if (pool.length === 0) return [];

  // Only exclude videos the catalogue has flagged as Shorts. We do NOT require
  // a stored duration here, because existing rows have none and that would
  // empty the row.
  const fullLength = pool.filter((video) => !video.isShort);

  // De-duplicate defensively: the same video must never appear twice even if
  // the catalogue has duplicate rows.
  const seen = new Set<string>();
  const unique = fullLength.filter((video) => {
    if (seen.has(video.videoId)) return false;
    seen.add(video.videoId);
    return true;
  });

  const items: WeightedItem[] = unique.map((video) => ({
    id: video.videoId,
    publishedAt: video.publishedAt,
    payload: video
  }));

  const history = readRecentHistory();
  const historySet = new Set(history);

  const result = selectDateWeighted<RecentVideo>(items, {
    feedSize: config.feedSize,
    weights: config.weights,
    isDeprioritized: (item) => historySet.has(item.id)
  });

  writeRecentHistory(
    mergeHistory(history, result.selectedIds, config.recentDisplayWindow),
    config.recentDisplayWindow
  );

  return result.items;
}

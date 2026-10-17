/**
 * Pure date-weighted selection logic for the Latest Movies feed (PRD §2–§5).
 *
 * This module is intentionally free of I/O so it can be unit-tested with sample
 * catalogues. It implements:
 *  - calendar-based age grouping,
 *  - weighted quota allocation with graceful redistribution,
 *  - randomized selection within each group,
 *  - combining + shuffling so the final row is not age-ordered.
 */

export type AgeGroup = "recent" | "previous" | "older";

export interface WeightedItem {
  /** Stable identifier (YouTube video id). */
  id: string;
  /** ISO 8601 publication date, or null when unknown. */
  publishedAt: string | null;
  /** Original payload carried through selection untouched. */
  payload: unknown;
}

/**
 * Subtract whole calendar months from a date, clamping the day so e.g.
 * March 31 minus 1 month becomes Feb 28/29 (never an invalid overflow date).
 */
export function subtractMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const targetDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() - months);
  const daysInTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();
  result.setUTCDate(Math.min(targetDay, daysInTargetMonth));
  return result;
}

/**
 * Classify a publication date into an age group by CALENDAR YEAR relative to
 * `now`:
 *   - recent   = the current year,
 *   - previous = the prior year,
 *   - older    = two or more years back.
 * Invalid/missing/future dates return null so callers can exclude them.
 */
export function classifyAge(
  publishedAt: string | null,
  now: Date = new Date()
): AgeGroup | null {
  if (!publishedAt) return null;
  const published = new Date(publishedAt);
  if (Number.isNaN(published.getTime())) return null;
  if (published.getTime() > now.getTime()) return null;

  const publishedYear = published.getUTCFullYear();
  const currentYear = now.getUTCFullYear();

  if (publishedYear >= currentYear) return "recent";
  if (publishedYear === currentYear - 1) return "previous";
  return "older";
}

export interface AgePools {
  recent: WeightedItem[];
  previous: WeightedItem[];
  older: WeightedItem[];
  /** Items dropped because their publication date was missing or invalid. */
  excluded: WeightedItem[];
}

/** Split items into the three age pools, dropping invalid dates. */
export function partitionByAge(
  items: WeightedItem[],
  now: Date = new Date()
): AgePools {
  const pools: AgePools = { recent: [], previous: [], older: [], excluded: [] };
  for (const item of items) {
    const group = classifyAge(item.publishedAt, now);
    if (!group) {
      pools.excluded.push(item);
      continue;
    }
    pools[group].push(item);
  }
  return pools;
}

export interface WeightConfig {
  recent: number;
  previous: number;
  older: number;
}

export interface Allocation {
  recent: number;
  previous: number;
  older: number;
}

/**
 * Allocate `feedSize` slots across the three groups using their weights.
 *
 * Uses the largest-remainder method so the integer counts stay as close as
 * possible to the target proportions. When a group lacks enough eligible
 * movies to satisfy its allocation, the surplus is redistributed to the other
 * groups in proportion to their weights, repeatedly, until every slot is
 * either filled or the entire pool is exhausted (PRD §3 step 4).
 */
export function allocateQuotas(
  weights: WeightConfig,
  counts: Allocation,
  feedSize: number
): Allocation {
  const groups: AgeGroup[] = ["recent", "previous", "older"];
  const totalWeight = weights.recent + weights.previous + weights.older;

  // First pass: proportional ideal allocation via largest remainder.
  const ideal: Record<AgeGroup, number> = {
    recent: (weights.recent / totalWeight) * feedSize,
    previous: (weights.previous / totalWeight) * feedSize,
    older: (weights.older / totalWeight) * feedSize
  };

  const allocation: Allocation = {
    recent: Math.min(Math.floor(ideal.recent), counts.recent),
    previous: Math.min(Math.floor(ideal.previous), counts.previous),
    older: Math.min(Math.floor(ideal.older), counts.older)
  };

  const remainders: Array<{ group: AgeGroup; remainder: number }> = groups.map(
    (group) => ({ group, remainder: ideal[group] - Math.floor(ideal[group]) })
  );
  remainders.sort((a, b) => b.remainder - a.remainder);

  let assigned = allocation.recent + allocation.previous + allocation.older;

  // Distribute leftover whole slots by largest fractional remainder, honoring
  // per-group availability.
  for (const { group } of remainders) {
    if (assigned >= feedSize) break;
    if (allocation[group] < counts[group]) {
      allocation[group] += 1;
      assigned += 1;
    }
  }

  // Redistribution loop: if any group was capped by availability we still have
  // unassigned slots. Hand them to groups with remaining capacity, weighted by
  // their configured weight, until we run out of slots or movies.
  let guard = 0;
  while (assigned < feedSize && guard < feedSize * 3 + 10) {
    guard += 1;
    const candidates = groups
      .filter((group) => allocation[group] < counts[group])
      .sort((a, b) => {
        const weightDiff = weights[b] - weights[a];
        if (weightDiff !== 0) return weightDiff;
        // Tie-break on remaining capacity so supply is used evenly.
        return counts[b] - allocation[b] - (counts[a] - allocation[a]);
      });
    if (candidates.length === 0) break;
    allocation[candidates[0]] += 1;
    assigned += 1;
  }

  return allocation;
}

/** Fisher–Yates shuffle returning a new array (does not mutate input). */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Randomly pick up to `count` items from a pool without mutating it. The
 * selection is shuffled first so database ordering never leaks into the feed.
 */
export function pickRandom<T>(
  pool: readonly T[],
  count: number,
  rng: () => number = Math.random
): T[] {
  if (count <= 0) return [];
  const shuffled = shuffle(pool, rng);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export interface SelectOptions {
  feedSize: number;
  weights: WeightConfig;
  now?: Date;
  rng?: () => number;
  /**
   * Optional predicate returning true for items that should be de-prioritized
   * (e.g. recently shown). Deprioritized items are only used when the eligible
   * pool would otherwise be too small to fill the feed (PRD §5).
   */
  isDeprioritized?: (item: WeightedItem) => boolean;
}

export interface SelectionResult<T> {
  /** Final, shuffled list of selected payloads. */
  items: T[];
  /** The allocation actually used, exposed for observability/testing. */
  allocation: Allocation;
  /** Video ids of the selected items, in final display order. */
  selectedIds: string[];
}

/**
 * Run the full date-weighted selection:
 *  1. partition into age pools (invalid dates excluded),
 *  2. (optionally) split off deprioritized items,
 *  3. allocate quotas with redistribution,
 *  4. randomly pick within each group,
 *  5. combine and shuffle.
 *
 * Deprioritized items are reintroduced only to backfill slots that the fresh
 * pools cannot cover, so repetition control never empties the feed or lets old
 * movies dominate simply because recent ones were shown before.
 */
export function selectDateWeighted<T>(
  items: WeightedItem[],
  options: SelectOptions
): SelectionResult<T> {
  const { feedSize, weights, now = new Date(), rng = Math.random } = options;

  const partitioned = partitionByAge(items, now);

  const isDeprioritized = options.isDeprioritized ?? (() => false);

  const split = (pool: WeightedItem[]) => {
    const fresh: WeightedItem[] = [];
    const stale: WeightedItem[] = [];
    for (const item of pool) {
      (isDeprioritized(item) ? stale : fresh).push(item);
    }
    return { fresh, stale };
  };

  const recentSplit = split(partitioned.recent);
  const previousSplit = split(partitioned.previous);
  const olderSplit = split(partitioned.older);

  // Primary allocation uses only non-deprioritized items.
  const freshCounts: Allocation = {
    recent: recentSplit.fresh.length,
    previous: previousSplit.fresh.length,
    older: olderSplit.fresh.length
  };

  const effectiveSize = Math.min(
    feedSize,
    partitioned.recent.length + partitioned.previous.length + partitioned.older.length
  );

  let allocation = allocateQuotas(weights, freshCounts, effectiveSize);

  const selected: WeightedItem[] = [];
  const selectedIds = new Set<string>();

  const takeFromPool = (pool: WeightedItem[], count: number): number => {
    const picked = pickRandom(pool, count, rng);
    for (const item of picked) {
      if (selectedIds.has(item.id)) continue;
      selected.push(item);
      selectedIds.add(item.id);
    }
    return picked.length;
  };

  takeFromPool(recentSplit.fresh, allocation.recent);
  takeFromPool(previousSplit.fresh, allocation.previous);
  takeFromPool(olderSplit.fresh, allocation.older);

  // Backfill any shortfall (e.g. a group was smaller than its quota) from the
  // remaining fresh items across all groups, then from deprioritized items.
  const remainingFresh: WeightedItem[] = [
    ...recentSplit.fresh,
    ...previousSplit.fresh,
    ...olderSplit.fresh
  ].filter((item) => !selectedIds.has(item.id));

  for (const item of pickRandom(remainingFresh, effectiveSize, rng)) {
    if (selected.length >= effectiveSize) break;
    if (selectedIds.has(item.id)) continue;
    selected.push(item);
    selectedIds.add(item.id);
  }

  if (selected.length < effectiveSize) {
    const remainingStale: WeightedItem[] = [
      ...recentSplit.stale,
      ...previousSplit.stale,
      ...olderSplit.stale
    ].filter((item) => !selectedIds.has(item.id));
    for (const item of pickRandom(remainingStale, effectiveSize, rng)) {
      if (selected.length >= effectiveSize) break;
      if (selectedIds.has(item.id)) continue;
      selected.push(item);
      selectedIds.add(item.id);
    }
  }

  // Recompute the achieved allocation for observability (based on items kept).
  const achieved: Allocation = { recent: 0, previous: 0, older: 0 };
  for (const item of selected) {
    const group = classifyAge(item.publishedAt, now);
    if (group) achieved[group] += 1;
  }
  allocation = achieved;

  const ordered = shuffle(selected, rng).slice(0, effectiveSize);

  return {
    items: ordered.map((item) => item.payload as T),
    allocation,
    selectedIds: ordered.map((item) => item.id)
  };
}

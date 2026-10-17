import assert from "node:assert/strict";
import { test } from "node:test";

import {
  allocateQuotas,
  classifyAge,
  partitionByAge,
  selectDateWeighted,
  subtractMonths,
  type WeightedItem
} from "./date-weighting";
import { mergeHistory } from "./recent-history";
import { areWeightsValid, DEFAULT_WEIGHTS, resolveFeedConfig } from "./config";

const NOW = new Date("2026-06-15T00:00:00.000Z");
const CURRENT_YEAR = NOW.getUTCFullYear(); // 2026

function iso(year: number): string {
  return `${year}-06-01T00:00:00.000Z`;
}

function makePool(counts: { recent: number; previous: number; older: number }): WeightedItem[] {
  const items: WeightedItem[] = [];
  for (let i = 0; i < counts.recent; i += 1) {
    items.push({ id: `r${i}`, publishedAt: iso(CURRENT_YEAR), payload: `r${i}` });
  }
  for (let i = 0; i < counts.previous; i += 1) {
    items.push({ id: `p${i}`, publishedAt: iso(CURRENT_YEAR - 1), payload: `p${i}` });
  }
  for (let i = 0; i < counts.older; i += 1) {
    items.push({ id: `o${i}`, publishedAt: iso(CURRENT_YEAR - 2), payload: `o${i}` });
  }
  return items;
}

// Deterministic RNG so distribution assertions are stable.
function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test("subtractMonths clamps end-of-month overflow", () => {
  assert.equal(
    subtractMonths(new Date("2024-03-31T00:00:00.000Z"), 1).toISOString(),
    "2024-02-29T00:00:00.000Z"
  );
  assert.equal(
    subtractMonths(new Date("2023-03-31T00:00:00.000Z"), 1).toISOString(),
    "2023-02-28T00:00:00.000Z"
  );
});

test("classifyAge buckets by calendar year", () => {
  assert.equal(classifyAge(iso(CURRENT_YEAR), NOW), "recent");
  assert.equal(classifyAge(iso(CURRENT_YEAR - 1), NOW), "previous");
  assert.equal(classifyAge(iso(CURRENT_YEAR - 2), NOW), "older");
  assert.equal(classifyAge(iso(CURRENT_YEAR - 5), NOW), "older");
});

test("classifyAge rejects missing, invalid and future dates", () => {
  assert.equal(classifyAge(null, NOW), null);
  assert.equal(classifyAge("not-a-date", NOW), null);
  assert.equal(classifyAge("2030-01-01T00:00:00.000Z", NOW), null);
});

test("partitionByAge separates groups and excludes invalid dates", () => {
  const items: WeightedItem[] = [
    { id: "a", publishedAt: iso(CURRENT_YEAR), payload: null },
    { id: "b", publishedAt: iso(CURRENT_YEAR - 1), payload: null },
    { id: "c", publishedAt: iso(CURRENT_YEAR - 3), payload: null },
    { id: "d", publishedAt: null, payload: null }
  ];
  const pools = partitionByAge(items, NOW);
  assert.equal(pools.recent.length, 1);
  assert.equal(pools.previous.length, 1);
  assert.equal(pools.older.length, 1);
  assert.equal(pools.excluded.length, 1);
});

test("allocateQuotas honors the 60/30/10 target with ample supply", () => {
  const allocation = allocateQuotas(
    DEFAULT_WEIGHTS,
    { recent: 100, previous: 100, older: 100 },
    20
  );
  assert.equal(allocation.recent, 12);
  assert.equal(allocation.previous, 6);
  assert.equal(allocation.older, 2);
});

test("allocateQuotas redistributes when a group is undersized", () => {
  const allocation = allocateQuotas(
    DEFAULT_WEIGHTS,
    { recent: 2, previous: 100, older: 100 },
    20
  );
  assert.equal(allocation.recent, 2);
  assert.equal(allocation.previous + allocation.older, 18);
  assert.ok(allocation.previous >= allocation.older);
});

test("allocateQuotas fills the feed from the remaining groups when one is empty", () => {
  const allocation = allocateQuotas(
    DEFAULT_WEIGHTS,
    { recent: 0, previous: 100, older: 100 },
    20
  );
  assert.equal(allocation.recent, 0);
  assert.equal(allocation.previous + allocation.older, 20);
});

test("selectDateWeighted returns unique movies and approaches the target mix", () => {
  const pool = makePool({ recent: 200, previous: 200, older: 200 });
  const totals = { recent: 0, previous: 0, older: 0 };
  const runs = 60;

  for (let i = 0; i < runs; i += 1) {
    const result = selectDateWeighted<string>(pool, {
      feedSize: 20,
      weights: DEFAULT_WEIGHTS,
      now: NOW,
      rng: seededRng(i + 1)
    });
    assert.equal(result.items.length, 20);
    assert.equal(new Set(result.items).size, 20, "no duplicates within a feed");
    totals.recent += result.allocation.recent;
    totals.previous += result.allocation.previous;
    totals.older += result.allocation.older;
  }

  const totalSelected = runs * 20;
  assert.ok(
    totals.recent / totalSelected >= 0.57 && totals.recent / totalSelected <= 0.63,
    `recent share was ${totals.recent / totalSelected}`
  );
  assert.ok(
    totals.older / totalSelected >= 0.07 && totals.older / totalSelected <= 0.13,
    `older share was ${totals.older / totalSelected}`
  );
});

test("selectDateWeighted never exceeds the catalogue size", () => {
  const pool = makePool({ recent: 3, previous: 2, older: 1 });
  const result = selectDateWeighted<string>(pool, {
    feedSize: 20,
    weights: DEFAULT_WEIGHTS,
    now: NOW,
    rng: seededRng(42)
  });
  assert.equal(result.items.length, 6);
  assert.equal(new Set(result.items).size, 6);
});

test("selectDateWeighted prefers fresh items when supply is sufficient", () => {
  const pool = makePool({ recent: 50, previous: 50, older: 50 });
  const recentlyShown = new Set(pool.slice(0, 10).map((i) => i.id));
  const result = selectDateWeighted<string>(pool, {
    feedSize: 20,
    weights: DEFAULT_WEIGHTS,
    now: NOW,
    rng: seededRng(7),
    isDeprioritized: (item) => recentlyShown.has(item.id)
  });
  assert.equal(result.items.length, 20);
  assert.ok(result.selectedIds.every((id) => !recentlyShown.has(id)));
});

test("selectDateWeighted consumes all fresh items before falling back to shown ones", () => {
  const pool = makePool({ recent: 50, previous: 50, older: 50 });
  const recentlyShown = new Set(pool.slice(0, 140).map((i) => i.id));
  const fresh = new Set(pool.slice(140).map((i) => i.id));
  const result = selectDateWeighted<string>(pool, {
    feedSize: 20,
    weights: DEFAULT_WEIGHTS,
    now: NOW,
    rng: seededRng(7),
    isDeprioritized: (item) => recentlyShown.has(item.id)
  });
  assert.equal(result.items.length, 20);
  assert.equal(new Set(result.items).size, 20);
  for (const id of fresh) assert.ok(result.selectedIds.includes(id));
});

test("selectDateWeighted falls back to deprioritized items when the fresh pool is empty", () => {
  const pool = makePool({ recent: 5, previous: 5, older: 5 });
  const allShown = new Set(pool.map((i) => i.id));
  const result = selectDateWeighted<string>(pool, {
    feedSize: 10,
    weights: DEFAULT_WEIGHTS,
    now: NOW,
    rng: seededRng(3),
    isDeprioritized: (item) => allShown.has(item.id)
  });
  assert.equal(result.items.length, 10);
});

test("selectDateWeighted excludes movies with invalid dates from weighting", () => {
  const pool: WeightedItem[] = [
    ...makePool({ recent: 2, previous: 2, older: 2 }),
    { id: "bad", publishedAt: "nonsense", payload: "bad" }
  ];
  const result = selectDateWeighted<string>(pool, {
    feedSize: 20,
    weights: DEFAULT_WEIGHTS,
    now: NOW,
    rng: seededRng(11)
  });
  assert.equal(result.items.length, 6);
  assert.ok(!result.items.includes("bad"));
});

test("weights validation accepts 100 and rejects anything else", () => {
  assert.ok(areWeightsValid({ recent: 60, previous: 30, older: 10 }));
  assert.ok(!areWeightsValid({ recent: 60, previous: 30, older: 20 }));
  assert.ok(!areWeightsValid({ recent: -10, previous: 60, older: 50 }));
});

test("resolveFeedConfig falls back to defaults on invalid weights", () => {
  const config = resolveFeedConfig({
    weights: { recent: 10, previous: 10, older: 10 },
    feedSize: 20
  });
  assert.deepEqual(config.weights, DEFAULT_WEIGHTS);
});

test("resolveFeedConfig clamps feed size", () => {
  assert.equal(resolveFeedConfig({ feedSize: 0 }).feedSize, 1);
  assert.equal(resolveFeedConfig({ feedSize: 1000 }).feedSize, 100);
});

test("mergeHistory keeps newest unique ids within the window", () => {
  const merged = mergeHistory(["a", "b", "c"], ["d", "b"], 4);
  assert.deepEqual(merged, ["d", "b", "a", "c"]);
  assert.deepEqual(mergeHistory(["a"], ["b"], 0), []);
});

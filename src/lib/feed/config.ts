/**
 * Date-weighted Latest Movies feed — configuration.
 *
 * All tunables live here so the selection algorithm itself never hard-codes a
 * weight or a feed size (PRD §2, §8). Values can be overridden via environment
 * variables without touching the algorithm.
 *
 * Weights are expressed as whole-number percentages that MUST sum to 100. If a
 * caller supplies an invalid configuration we fall back to the documented
 * defaults rather than throwing, so the homepage never fails to render.
 */

export interface FeedWeights {
  /** Movies published in the current calendar year. */
  recent: number;
  /** Movies published in the prior calendar year. */
  previous: number;
  /** Movies published two or more calendar years ago. */
  older: number;
}

export interface FeedConfig {
  weights: FeedWeights;
  /** Number of movies shown in the Latest Movies row. */
  feedSize: number;
  /**
   * How many of the most recent feed generations to remember per visitor so
   * those movies are (temporarily) de-prioritized. 0 disables the mechanism.
   */
  recentDisplayWindow: number;
}

export const DEFAULT_WEIGHTS: FeedWeights = {
  recent: 60,
  previous: 30,
  older: 10
};

export const DEFAULT_FEED_SIZE = 20;
// 0 disables the "recently shown" suppression, so movies (especially the
// current year) keep appearing across visits instead of being de-prioritized.
export const DEFAULT_RECENT_DISPLAY_WINDOW = 0;

export const DEFAULT_FEED_CONFIG: FeedConfig = {
  weights: DEFAULT_WEIGHTS,
  feedSize: DEFAULT_FEED_SIZE,
  recentDisplayWindow: DEFAULT_RECENT_DISPLAY_WINDOW
};

function readEnvNumber(key: string): number | null {
  if (typeof process === "undefined") return null;
  const raw = process.env[key];
  if (!raw || raw.trim().length === 0) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** True when all weights are finite, non-negative and sum to exactly 100. */
export function areWeightsValid(weights: FeedWeights): boolean {
  const values = [weights.recent, weights.previous, weights.older];
  if (values.some((v) => !Number.isFinite(v) || v < 0)) return false;
  const total = values.reduce((sum, v) => sum + v, 0);
  return Math.abs(total - 100) < 1e-9;
}

/**
 * Return the documented default weights. Used as the safe fallback whenever a
 * supplied configuration is invalid, so the feed behaves predictably rather
 * than silently rescaling an arbitrary set of numbers.
 */
function defaultWeights(): FeedWeights {
  return { ...DEFAULT_WEIGHTS };
}

/**
 * Build a validated feed configuration. Invalid weights are replaced with the
 * defaults; invalid sizes fall back to the defaults and are clamped to a
 * sensible range.
 */
export function resolveFeedConfig(overrides: Partial<FeedConfig> = {}): FeedConfig {
  const weights = overrides.weights ?? {
    recent: readEnvNumber("FEED_WEIGHT_RECENT") ?? DEFAULT_WEIGHTS.recent,
    previous: readEnvNumber("FEED_WEIGHT_PREVIOUS") ?? DEFAULT_WEIGHTS.previous,
    older: readEnvNumber("FEED_WEIGHT_OLDER") ?? DEFAULT_WEIGHTS.older
  };

  const feedSizeRaw = overrides.feedSize ?? readEnvNumber("FEED_SIZE") ?? DEFAULT_FEED_SIZE;
  const feedSize = Number.isFinite(feedSizeRaw)
    ? Math.min(100, Math.max(1, Math.floor(feedSizeRaw)))
    : DEFAULT_FEED_SIZE;

  const windowRaw =
    overrides.recentDisplayWindow ??
    readEnvNumber("FEED_RECENT_DISPLAY_WINDOW") ??
    DEFAULT_RECENT_DISPLAY_WINDOW;
  const recentDisplayWindow = Number.isFinite(windowRaw)
    ? Math.min(200, Math.max(0, Math.floor(windowRaw)))
    : DEFAULT_RECENT_DISPLAY_WINDOW;

  let resolvedWeights: FeedWeights;
  if (areWeightsValid(weights)) {
    resolvedWeights = weights;
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      "[feed] Invalid weights supplied; falling back to defaults.",
      weights
    );
    resolvedWeights = defaultWeights();
  }

  return { weights: resolvedWeights, feedSize, recentDisplayWindow };
}

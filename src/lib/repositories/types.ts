import type {
  Category,
  CategoryInput,
  Channel,
  ChannelInput,
  ChannelListQuery,
  ChannelWithCategories,
  Paginated
} from "@/lib/types";

/**
 * Read operations available to the public site and admin.
 * In static mode only read operations are supported.
 */
export interface CatalogueRepository {
  // --- Categories ---
  listCategories(options?: { activeOnly?: boolean }): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | null>;

  // --- Channels ---
  listChannels(query: ChannelListQuery): Promise<Paginated<ChannelWithCategories>>;
  getChannelBySlug(slug: string): Promise<ChannelWithCategories | null>;
  getChannelById(id: string): Promise<ChannelWithCategories | null>;
  findChannelByYoutubeId(youtubeChannelId: string): Promise<Channel | null>;
  findChannelByUrl(normalizedUrl: string): Promise<Channel | null>;

  /**
   * Latest videos across all published channels, for the discovery homepage.
   * `kind: "full"` returns full movies, `"short"` returns Teasers.
   */
  listRecentVideos(limit?: number, kind?: "full" | "short"): Promise<RecentVideo[]>;

  /**
   * Full eligible pool of full-length movies across all published channels,
   * used by the date-weighted Latest Movies feed. Unlike `listRecentVideos`
   * this is not capped per channel, so the weighting algorithm has enough
   * candidates to hit its target distribution. Reads stored metadata only — no
   * live YouTube API calls. Returns [] when the catalogue is empty.
   */
  listMoviePool(): Promise<RecentVideo[]>;

  /**
   * Full-length movies across all published channels, newest YouTube upload
   * first (strict `published_at DESC`). No randomization, no weighting.
   */
  listRecentlyAddedMovies(limit?: number): Promise<RecentVideo[]>;

  /** Search movies (videos) by title across published channels. */
  searchVideos(query: string, limit?: number): Promise<RecentVideo[]>;

  /** Full movies published within a calendar year, across published channels. */
  listMoviesByYear(year: number, limit?: number): Promise<RecentVideo[]>;
}

/**
 * Write operations. Only implemented by adapters backed by durable storage.
 * In static mode these throw a clear, typed error (see StaticFileRepository).
 */
export interface MutableCatalogueRepository extends CatalogueRepository {
  createChannel(input: ChannelInput): Promise<ChannelWithCategories>;
  updateChannel(id: string, input: Partial<ChannelInput>): Promise<ChannelWithCategories>;
  setChannelStatus(id: string, status: Channel["status"]): Promise<void>;
  archiveChannel(id: string): Promise<void>;
  /** Hard delete: permanently removes the channel row. */
  deleteChannel(id: string): Promise<void>;
  createCategory(input: CategoryInput): Promise<Category>;
  updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category>;
  /** Hard delete: permanently removes the category row. */
  deleteCategory(id: string): Promise<void>;
  /**
   * Persist a new display order. Receives category ids in their intended
   * top-to-bottom order and writes contiguous sort_order values (0..n-1).
   */
  reorderCategories(orderedIds: string[]): Promise<void>;

  // --- Channel videos (cached full history) ---
  listChannelVideos(channelId: string): Promise<ChannelVideo[]>;
  replaceChannelVideos(channelId: string, videos: ChannelVideoInput[]): Promise<void>;
}

/** A recent video joined with its channel, for discovery banners/rows. */
export interface RecentVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  channelId: string;
  channelName: string;
  channelSlug: string;
  isShort: boolean;
  /** Verified length in seconds, or null when unknown. */
  durationSeconds: number | null;
}

export interface ChannelVideo {
  id: string;
  channelId: string;
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  position: number;
  isShort: boolean;
  /** Verified length in seconds, or null when unknown. */
  durationSeconds: number | null;
}

export interface ChannelVideoInput {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  position: number;
  isShort: boolean;
  /** Verified length in seconds, or null when unknown. */
  durationSeconds: number | null;
}

/** Thrown when a write is attempted against a read-only adapter. */
export class ReadOnlyModeError extends Error {
  constructor() {
    super(
      "This operation requires a database. The application is running in read-only static mode."
    );
    this.name = "ReadOnlyModeError";
  }
}

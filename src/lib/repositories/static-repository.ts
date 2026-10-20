import fs from "node:fs";
import path from "node:path";

import type {
  Category,
  CategoryInput,
  Channel,
  ChannelInput,
  ChannelListQuery,
  ChannelWithCategories,
  Paginated
} from "@/lib/types";
import {
  ReadOnlyModeError,
  type ChannelVideo,
  type ChannelVideoInput,
  type MutableCatalogueRepository,
  type RecentVideo
} from "@/lib/repositories/types";

interface StaticCatalogueFile {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    sortOrder: number;
    isActive: boolean;
  }>;
  channels: Array<
    Omit<Channel, "createdAt" | "updatedAt" | "publishedAt"> & {
      categoryIds: string[];
      primaryCategoryId: string | null;
      tags: string[];
      createdAt: string;
      updatedAt: string;
      publishedAt: string | null;
    }
  >;
}

let cachedCatalogue: StaticCatalogueFile | null = null;

function loadCatalogue(): StaticCatalogueFile {
  if (cachedCatalogue) return cachedCatalogue;
  const filePath = path.join(process.cwd(), "data", "catalogue.json");
  if (!fs.existsSync(filePath)) {
    cachedCatalogue = { categories: [], channels: [] };
    return cachedCatalogue;
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as StaticCatalogueFile;
  cachedCatalogue = {
    categories: parsed.categories ?? [],
    channels: parsed.channels ?? []
  };
  return cachedCatalogue;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Read-only repository backed by a JSON file committed to the repository.
 * This is the zero-configuration fallback: the public site works, but all
 * write operations and the admin dashboard are unavailable.
 */
export class StaticFileRepository implements MutableCatalogueRepository {
  async listCategories(options?: { activeOnly?: boolean }): Promise<Category[]> {
    const { categories } = loadCatalogue();
    const filtered = options?.activeOnly
      ? categories.filter((c) => c.isActive)
      : categories;
    return filtered
      .map((c) => ({
        ...c,
        createdAt: "1970-01-01T00:00:00.000Z",
        updatedAt: "1970-01-01T00:00:00.000Z"
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const categories = await this.listCategories();
    return categories.find((c) => c.slug === slug) ?? null;
  }

  private toChannelWithCategories(channelId: string): ChannelWithCategories | null {
    const catalogue = loadCatalogue();
    const channel = catalogue.channels.find((c) => c.id === channelId);
    if (!channel) return null;
    const categoryMap = new Map(catalogue.categories.map((c) => [c.id, c]));
    const categories = channel.categoryIds
      .map((id) => categoryMap.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        isPrimary: c.id === channel.primaryCategoryId
      }));
    return {
      ...channel,
      categories,
      tags: channel.tags ?? []
    };
  }

  async listChannels(query: ChannelListQuery): Promise<Paginated<ChannelWithCategories>> {
    const catalogue = loadCatalogue();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;

    let channels = catalogue.channels.filter((c) => c.status === "published");

    if (query.featuredOnly) {
      channels = channels.filter((c) => c.isFeatured);
    }

    if (query.categorySlug) {
      const category = catalogue.categories.find((c) => c.slug === query.categorySlug);
      if (!category) {
        return { items: [], total: 0, page, pageSize };
      }
      channels = channels.filter((c) => c.categoryIds.includes(category.id));
    }

    if (query.search) {
      const term = normalize(query.search);
      channels = channels.filter((c) => {
        const haystack = [c.name, c.description ?? "", ...(c.tags ?? [])]
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      });
    }

    channels = [...channels].sort((a, b) => {
      if (query.sort === "alphabetical") return a.name.localeCompare(b.name);
      return (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt);
    });

    const total = channels.length;
    const start = (page - 1) * pageSize;
    const paged = channels.slice(start, start + pageSize);

    const items = paged
      .map((c) => this.toChannelWithCategories(c.id))
      .filter((c): c is ChannelWithCategories => Boolean(c));

    return { items, total, page, pageSize };
  }

  async getChannelBySlug(slug: string): Promise<ChannelWithCategories | null> {
    const catalogue = loadCatalogue();
    const channel = catalogue.channels.find(
      (c) => c.slug === slug && c.status === "published"
    );
    if (!channel) return null;
    return this.toChannelWithCategories(channel.id);
  }

  async getChannelById(id: string): Promise<ChannelWithCategories | null> {
    return this.toChannelWithCategories(id);
  }

  async findChannelByYoutubeId(youtubeChannelId: string): Promise<Channel | null> {
    const catalogue = loadCatalogue();
    return (
      catalogue.channels.find((c) => c.youtubeChannelId === youtubeChannelId) ?? null
    );
  }

  async findChannelByUrl(normalizedUrl: string): Promise<Channel | null> {
    const catalogue = loadCatalogue();
    return (
      catalogue.channels.find(
        (c) => c.youtubeChannelUrl.toLowerCase() === normalizedUrl.toLowerCase()
      ) ?? null
    );
  }

  // --- Write operations are unsupported in static mode ---------------------
  createChannel(_input: ChannelInput): Promise<ChannelWithCategories> {
    void _input;
    throw new ReadOnlyModeError();
  }

  updateChannel(
    _id: string,
    _input: Partial<ChannelInput>
  ): Promise<ChannelWithCategories> {
    void _id;
    void _input;
    throw new ReadOnlyModeError();
  }

  setChannelStatus(_id: string, _status: Channel["status"]): Promise<void> {
    void _id;
    void _status;
    throw new ReadOnlyModeError();
  }

  archiveChannel(_id: string): Promise<void> {
    void _id;
    throw new ReadOnlyModeError();
  }

  deleteChannel(_id: string): Promise<void> {
    void _id;
    throw new ReadOnlyModeError();
  }

  async listChannelVideos(_channelId: string): Promise<ChannelVideo[]> {
    void _channelId;
    return [];
  }

  async listRecentVideos(_limit?: number, _kind?: "full" | "short"): Promise<RecentVideo[]> {
    void _limit;
    void _kind;
    return [];
  }

  async listMoviePool(): Promise<RecentVideo[]> {
    // The static catalogue file contains channels only; movie rows live in the
    // database, so there is no pool to read in static mode.
    return [];
  }

  async listRecentlyAddedMovies(_limit?: number): Promise<RecentVideo[]> {
    void _limit;
    return [];
  }

  async searchVideos(_query: string, _limit?: number): Promise<RecentVideo[]> {
    void _query;
    void _limit;
    return [];
  }

  async suggestVideoTitle(_query: string): Promise<string | null> {
    // Search needs the database; nothing to suggest in static mode.
    void _query;
    return null;
  }

  async listMoviesByYear(_year: number, _limit?: number): Promise<RecentVideo[]> {
    // Movie rows live in the database; nothing to read in static mode.
    void _year;
    void _limit;
    return [];
  }

  async listAllMovies(_page: number, _pageSize: number): Promise<Paginated<RecentVideo>> {
    // Movie rows live in the database; nothing to read in static mode.
    return { items: [], total: 0, page: _page, pageSize: _pageSize };
  }

  replaceChannelVideos(
    _channelId: string,
    _videos: ChannelVideoInput[]
  ): Promise<void> {
    void _channelId;
    void _videos;
    throw new ReadOnlyModeError();
  }

  createCategory(_input: CategoryInput): Promise<Category> {
    void _input;
    throw new ReadOnlyModeError();
  }

  updateCategory(_id: string, _input: Partial<CategoryInput>): Promise<Category> {
    void _id;
    void _input;
    throw new ReadOnlyModeError();
  }

  deleteCategory(_id: string): Promise<void> {
    void _id;
    throw new ReadOnlyModeError();
  }

  reorderCategories(_orderedIds: string[]): Promise<void> {
    void _orderedIds;
    throw new ReadOnlyModeError();
  }
}

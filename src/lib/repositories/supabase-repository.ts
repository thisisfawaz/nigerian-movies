import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Category,
  CategoryInput,
  Channel,
  ChannelInput,
  ChannelListQuery,
  ChannelWithCategories,
  Paginated
} from "@/lib/types";
import type {
  ChannelVideo,
  ChannelVideoInput,
  MutableCatalogueRepository,
  RecentVideo
} from "@/lib/repositories/types";
import { slugify } from "@/lib/youtube/url";

interface ChannelRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  youtube_channel_url: string;
  youtube_channel_id: string | null;
  youtube_playlist_id: string | null;
  youtube_embed_url: string | null;
  thumbnail_url: string | null;
  cover_url: string | null;
  language_code: string | null;
  country_code: string | null;
  status: Channel["status"];
  is_featured: boolean;
  source: "manual";
  metadata_source: string | null;
  ai_classification_status: Channel["aiClassificationStatus"];
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function mapChannel(row: ChannelRow): Channel {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    youtubeChannelUrl: row.youtube_channel_url,
    youtubeChannelId: row.youtube_channel_id,
    youtubePlaylistId: row.youtube_playlist_id,
    youtubeEmbedUrl: row.youtube_embed_url,
    thumbnailUrl: row.thumbnail_url,
    coverUrl: row.cover_url,
    languageCode: row.language_code,
    countryCode: row.country_code,
    status: row.status,
    isFeatured: row.is_featured,
    source: row.source,
    metadataSource: row.metadata_source,
    aiClassificationStatus: row.ai_classification_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at
  };
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: row.icon,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Repository backed by Supabase Postgres. Implements both reads (public) and
 * writes (admin, service-role client).
 */
export class SupabaseCatalogueRepository implements MutableCatalogueRepository {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * Whether `channel_videos.duration_seconds` exists. Probed once and cached.
   *
   * The column is added by migration 0006. Until that migration is applied the
   * code must still run, so queries include/require the column only when it is
   * present. This avoids a schema/code mismatch taking down the homepage.
   */
  private durationColumnAvailable: boolean | null = null;

  private async hasDurationColumn(): Promise<boolean> {
    if (this.durationColumnAvailable !== null) return this.durationColumnAvailable;
    const { error } = await this.client
      .from("channel_videos")
      .select("duration_seconds")
      .limit(1);
    // A missing-column error means the migration has not been applied yet.
    this.durationColumnAvailable = !error;
    return this.durationColumnAvailable;
  }

  // --- Reads ----------------------------------------------------------------

  async listCategories(options?: { activeOnly?: boolean }): Promise<Category[]> {
    let query = this.client.from("categories").select("*").order("sort_order");
    if (options?.activeOnly) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) throw new Error(`Failed to list categories: ${error.message}`);
    return (data as CategoryRow[]).map(mapCategory);
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const { data, error } = await this.client
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(`Failed to load category: ${error.message}`);
    return data ? mapCategory(data as CategoryRow) : null;
  }

  private async attachCategories(
    rows: ChannelRow[]
  ): Promise<ChannelWithCategories[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const { data: joins, error } = await this.client
      .from("channel_categories")
      .select("channel_id, is_primary, categories(id, name, slug)")
      .in("channel_id", ids);
    if (error) throw new Error(`Failed to load channel categories: ${error.message}`);

    const byChannel = new Map<
      string,
      Array<{ id: string; name: string; slug: string; isPrimary: boolean }>
    >();
    for (const join of joins as unknown as Array<{
      channel_id: string;
      is_primary: boolean;
      categories: { id: string; name: string; slug: string } | null;
    }>) {
      if (!join.categories) continue;
      const list = byChannel.get(join.channel_id) ?? [];
      list.push({
        id: join.categories.id,
        name: join.categories.name,
        slug: join.categories.slug,
        isPrimary: join.is_primary
      });
      byChannel.set(join.channel_id, list);
    }

    return rows.map((row) => ({
      ...mapChannel(row),
      categories: byChannel.get(row.id) ?? [],
      tags: []
    }));
  }

  async listChannels(query: ChannelListQuery): Promise<Paginated<ChannelWithCategories>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;

    let builder = this.client
      .from("channels")
      .select("*", { count: "exact" })
      .eq("status", "published");

    if (query.featuredOnly) builder = builder.eq("is_featured", true);

    if (query.search) {
      const term = `%${query.search.trim()}%`;
      builder = builder.or(`name.ilike.${term},description.ilike.${term}`);
    }

    if (query.sort === "alphabetical") {
      builder = builder.order("name", { ascending: true });
    } else {
      builder = builder.order("published_at", { ascending: false, nullsFirst: false });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await builder.range(from, to);
    if (error) throw new Error(`Failed to list channels: ${error.message}`);

    const items = await this.attachCategories(data as ChannelRow[]);
    return { items, total: count ?? items.length, page, pageSize };
  }

  async getChannelBySlug(slug: string): Promise<ChannelWithCategories | null> {
    const { data, error } = await this.client
      .from("channels")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(`Failed to load channel: ${error.message}`);
    if (!data) return null;
    const [withCats] = await this.attachCategories([data as ChannelRow]);
    return withCats ?? null;
  }

  async getChannelById(id: string): Promise<ChannelWithCategories | null> {
    const { data, error } = await this.client
      .from("channels")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`Failed to load channel: ${error.message}`);
    if (!data) return null;
    const [withCats] = await this.attachCategories([data as ChannelRow]);
    return withCats ?? null;
  }

  async findChannelByYoutubeId(youtubeChannelId: string): Promise<Channel | null> {
    const { data, error } = await this.client
      .from("channels")
      .select("*")
      .eq("youtube_channel_id", youtubeChannelId)
      .maybeSingle();
    if (error) throw new Error(`Duplicate check failed: ${error.message}`);
    return data ? mapChannel(data as ChannelRow) : null;
  }

  async findChannelByUrl(normalizedUrl: string): Promise<Channel | null> {
    const { data, error } = await this.client
      .from("channels")
      .select("*")
      .ilike("youtube_channel_url", normalizedUrl)
      .maybeSingle();
    if (error) throw new Error(`Duplicate check failed: ${error.message}`);
    return data ? mapChannel(data as ChannelRow) : null;
  }

  // --- Writes ---------------------------------------------------------------

  private async uniqueChannelSlug(name: string, excludeId?: string): Promise<string> {
    const base = slugify(name) || "channel";
    let candidate = base;
    let suffix = 1;
    for (let i = 0; i < 50; i += 1) {
      let query = this.client.from("channels").select("id").eq("slug", candidate);
      if (excludeId) query = query.neq("id", excludeId);
      const { data, error } = await query.maybeSingle();
      if (error) throw new Error(`Slug check failed: ${error.message}`);
      if (!data) return candidate;
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return `${base}-${Date.now()}`;
  }

  async createChannel(input: ChannelInput): Promise<ChannelWithCategories> {
    const name = input.name?.trim();
    if (!name) throw new Error("Channel name is required.");
    const slug = await this.uniqueChannelSlug(name);
    const status = input.status ?? "draft";

    const { data, error } = await this.client
      .from("channels")
      .insert({
        name,
        slug,
        description: input.description ?? null,
        youtube_channel_url: input.youtubeChannelUrl,
        youtube_channel_id: input.youtubeChannelId ?? null,
        youtube_playlist_id: input.youtubePlaylistId ?? null,
        youtube_embed_url: input.youtubeEmbedUrl ?? null,
        thumbnail_url: input.thumbnailUrl ?? null,
        cover_url: input.coverUrl ?? null,
        language_code: input.languageCode ?? null,
        country_code: input.countryCode ?? null,
        status,
        is_featured: input.isFeatured ?? false,
        source: "manual",
        metadata_source: "manual",
        ai_classification_status: "skipped",
        published_at: status === "published" ? new Date().toISOString() : null
      })
      .select("*")
      .single();
    if (error) throw new Error(`Failed to create channel: ${error.message}`);

    const created = data as ChannelRow;
    await this.syncCategories(
      created.id,
      input.categoryIds ?? [],
      input.primaryCategoryId ?? null,
      "admin"
    );
    await this.syncTags(created.id, input.tags ?? []);

    const result = await this.getChannelById(created.id);
    if (!result) throw new Error("Channel was created but could not be reloaded.");
    return result;
  }

  async updateChannel(
    id: string,
    input: Partial<ChannelInput>
  ): Promise<ChannelWithCategories> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.description !== undefined) patch.description = input.description;
    if (input.youtubeChannelUrl !== undefined)
      patch.youtube_channel_url = input.youtubeChannelUrl;
    if (input.youtubeChannelId !== undefined)
      patch.youtube_channel_id = input.youtubeChannelId;
    if (input.youtubePlaylistId !== undefined)
      patch.youtube_playlist_id = input.youtubePlaylistId;
    if (input.youtubeEmbedUrl !== undefined)
      patch.youtube_embed_url = input.youtubeEmbedUrl;
    if (input.thumbnailUrl !== undefined) patch.thumbnail_url = input.thumbnailUrl;
    if (input.coverUrl !== undefined) patch.cover_url = input.coverUrl;
    if (input.languageCode !== undefined) patch.language_code = input.languageCode;
    if (input.countryCode !== undefined) patch.country_code = input.countryCode;
    if (input.isFeatured !== undefined) patch.is_featured = input.isFeatured;
    if (input.status !== undefined) {
      patch.status = input.status;
      if (input.status === "published")
        patch.published_at = new Date().toISOString();
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await this.client.from("channels").update(patch).eq("id", id);
      if (error) throw new Error(`Failed to update channel: ${error.message}`);
    }

    if (input.categoryIds !== undefined) {
      await this.syncCategories(
        id,
        input.categoryIds,
        input.primaryCategoryId ?? null,
        "admin"
      );
    }
    if (input.tags !== undefined) await this.syncTags(id, input.tags);

    const result = await this.getChannelById(id);
    if (!result) throw new Error("Channel not found after update.");
    return result;
  }

  private async syncCategories(
    channelId: string,
    categoryIds: string[],
    primaryCategoryId: string | null,
    assignedBy: "admin" | "ai"
  ): Promise<void> {
    const { error: delError } = await this.client
      .from("channel_categories")
      .delete()
      .eq("channel_id", channelId);
    if (delError) throw new Error(`Failed to reset categories: ${delError.message}`);

    if (categoryIds.length === 0) return;

    const rows = categoryIds.map((categoryId) => ({
      channel_id: channelId,
      category_id: categoryId,
      is_primary: categoryId === primaryCategoryId,
      assigned_by: assignedBy
    }));
    const { error } = await this.client.from("channel_categories").insert(rows);
    if (error) throw new Error(`Failed to assign categories: ${error.message}`);
  }

  private async syncTags(channelId: string, tags: string[]): Promise<void> {
    const { error: delError } = await this.client
      .from("channel_tags")
      .delete()
      .eq("channel_id", channelId);
    if (delError) throw new Error(`Failed to reset tags: ${delError.message}`);

    const clean = Array.from(
      new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))
    );
    if (clean.length === 0) return;

    const { error } = await this.client
      .from("channel_tags")
      .insert(clean.map((tag) => ({ channel_id: channelId, tag })));
    if (error) throw new Error(`Failed to assign tags: ${error.message}`);
  }

  async setChannelStatus(id: string, status: Channel["status"]): Promise<void> {
    const patch: Record<string, unknown> = { status };
    if (status === "published") patch.published_at = new Date().toISOString();
    const { error } = await this.client.from("channels").update(patch).eq("id", id);
    if (error) throw new Error(`Failed to change status: ${error.message}`);
  }

  async archiveChannel(id: string): Promise<void> {
    await this.setChannelStatus(id, "archived");
  }

  async deleteChannel(id: string): Promise<void> {
    const { error } = await this.client.from("channels").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete channel: ${error.message}`);
  }

  async listChannelVideos(channelId: string): Promise<ChannelVideo[]> {
    const { data, error } = await this.client
      .from("channel_videos")
      .select("*")
      .eq("channel_id", channelId)
      .order("position", { ascending: true });
    if (error) throw new Error(`Failed to load videos: ${error.message}`);
    return (data as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      channelId: String(row.channel_id),
      videoId: String(row.video_id),
      title: String(row.title),
      thumbnailUrl: (row.thumbnail_url as string | null) ?? null,
      publishedAt: (row.published_at as string | null) ?? null,
      position: Number(row.position ?? 0),
      isShort: Boolean(row.is_short),
      durationSeconds:
        row.duration_seconds === null || row.duration_seconds === undefined
          ? null
          : Number(row.duration_seconds)
    }));
  }

  async replaceChannelVideos(
    channelId: string,
    videos: ChannelVideoInput[]
  ): Promise<void> {
    const { error: delError } = await this.client
      .from("channel_videos")
      .delete()
      .eq("channel_id", channelId);
    if (delError) throw new Error(`Failed to reset videos: ${delError.message}`);
    if (videos.length === 0) return;

    const withDuration = await this.hasDurationColumn();
    const rows = videos.map((v) => {
      const base: Record<string, unknown> = {
        channel_id: channelId,
        video_id: v.videoId,
        title: v.title,
        thumbnail_url: v.thumbnailUrl,
        published_at: v.publishedAt,
        position: v.position,
        is_short: v.isShort
      };
      if (withDuration) base.duration_seconds = v.durationSeconds;
      return base;
    });
    const { error } = await this.client.from("channel_videos").insert(rows);
    if (error) throw new Error(`Failed to store videos: ${error.message}`);
  }

  async listRecentVideos(limit = 20, kind: "full" | "short" = "full"): Promise<RecentVideo[]> {
    // Only published channels (RLS also enforces this for the public client).
    const { data: channels, error: chError } = await this.client
      .from("channels")
      .select("id, name, slug")
      .eq("status", "published");
    if (chError) throw new Error(`Failed to load channels: ${chError.message}`);
    if (!channels || channels.length === 0) return [];

    // Fetch the latest few videos per channel, then interleave round-robin so
    // every channel is represented near the top (not just the most prolific).
    const wantShort = kind === "short";
    const perChannel = Math.max(4, Math.ceil(limit / channels.length) + 2);
    const withDuration = await this.hasDurationColumn();

    const groups = await Promise.all(
      channels.map(async (ch) => {
        // Two explicit literal selects keep Supabase's typed parser happy; a
        // computed string degrades the result type to ParserError.
        const builder = this.client
          .from("channel_videos")
          .select(
            withDuration
              ? "video_id, title, thumbnail_url, published_at, is_short, duration_seconds"
              : "video_id, title, thumbnail_url, published_at, is_short"
          )
          .eq("channel_id", ch.id)
          .eq("is_short", wantShort)
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(perChannel);
        const { data, error } = await builder;
        if (error) throw new Error(`Failed to load recent videos: ${error.message}`);
        return (data as unknown as Array<{
          video_id: string;
          title: string;
          thumbnail_url: string | null;
          published_at: string | null;
          is_short: boolean;
          duration_seconds?: number | null;
        }>).map<RecentVideo>((v) => ({
          videoId: v.video_id,
          title: v.title,
          thumbnailUrl: v.thumbnail_url,
          publishedAt: v.published_at,
          channelId: ch.id,
          channelName: ch.name,
          channelSlug: ch.slug,
          isShort: v.is_short,
          durationSeconds:
            typeof v.duration_seconds === "number" ? v.duration_seconds : null
        }));
      })
    );

    // Round-robin across channels; within each channel, newest first.
    const result: RecentVideo[] = [];
    let idx = 0;
    let added = true;
    while (result.length < limit && added) {
      added = false;
      for (const group of groups) {
        if (idx < group.length) {
          result.push(group[idx]);
          added = true;
          if (result.length >= limit) break;
        }
      }
      idx += 1;
    }
    return result;
  }

  async listMoviePool(): Promise<RecentVideo[]> {
    // Latest Movies only ever shows full-length movies: at least 20 minutes
    // (1200s) long. The duration is the authoritative signal; `is_short = false`
    // is kept as a secondary guard for older rows without a stored duration.
    //
    // Until migration 0006 (duration_seconds) is applied the column is absent;
    // in that case we fall back to the is_short guard so the feed still works.
    // A movie must be at least 59 minutes long. Anything shorter — or with no
    // known duration — is not a movie and must not appear in Latest Movies.
    const MIN_MOVIE_SECONDS = 59 * 60;
    const { data, error } = await this.client
      .from("channel_videos")
      .select(
        "video_id, title, thumbnail_url, published_at, is_short, duration_seconds, channel_id, channels!inner(name, slug, status)"
      )
      .eq("is_short", false)
      .gte("duration_seconds", MIN_MOVIE_SECONDS)
      .eq("channels.status", "published")
      .order("published_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(`Failed to load movie pool: ${error.message}`);

    return (data as unknown as Array<{
      video_id: string;
      title: string;
      thumbnail_url: string | null;
      published_at: string | null;
      is_short: boolean;
      duration_seconds?: number | null;
      channel_id: string;
      channels: { name: string; slug: string } | { name: string; slug: string }[] | null;
    }>).map((row) => {
      const ch = Array.isArray(row.channels) ? row.channels[0] : row.channels;
      return {
        videoId: row.video_id,
        title: row.title,
        thumbnailUrl: row.thumbnail_url,
        publishedAt: row.published_at,
        isShort: row.is_short,
        durationSeconds:
          typeof row.duration_seconds === "number" ? row.duration_seconds : null,
        channelId: row.channel_id,
        channelName: ch?.name ?? "Channel",
        channelSlug: ch?.slug ?? ""
      };
    });
  }

  async listRecentlyAddedMovies(limit = 20): Promise<RecentVideo[]> {
    // Strict chronological feed: newest YouTube upload first. Same 59-minute
    // movie floor as Latest Movies; no randomization and no age weighting.
    const MIN_MOVIE_SECONDS = 59 * 60;
    const { data, error } = await this.client
      .from("channel_videos")
      .select(
        "video_id, title, thumbnail_url, published_at, is_short, duration_seconds, channel_id, channels!inner(name, slug, status)"
      )
      .eq("is_short", false)
      .gte("duration_seconds", MIN_MOVIE_SECONDS)
      .eq("channels.status", "published")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      // Stable tie-breaker so equal timestamps keep a deterministic order.
      .order("video_id", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Failed to load recently added movies: ${error.message}`);

    return (data as unknown as Array<{
      video_id: string;
      title: string;
      thumbnail_url: string | null;
      published_at: string | null;
      is_short: boolean;
      duration_seconds?: number | null;
      channel_id: string;
      channels: { name: string; slug: string } | { name: string; slug: string }[] | null;
    }>).map((row) => {
      const ch = Array.isArray(row.channels) ? row.channels[0] : row.channels;
      return {
        videoId: row.video_id,
        title: row.title,
        thumbnailUrl: row.thumbnail_url,
        publishedAt: row.published_at,
        isShort: row.is_short,
        durationSeconds:
          typeof row.duration_seconds === "number" ? row.duration_seconds : null,
        channelId: row.channel_id,
        channelName: ch?.name ?? "Channel",
        channelSlug: ch?.slug ?? ""
      };
    });
  }

  async suggestVideoTitle(query: string): Promise<string | null> {
    const term = query.trim();
    if (!term) return null;

    const { data, error } = await this.client.rpc("suggest_video_title", {
      search_term: term
    });
    // A missing function (migration not applied) must not break the page.
    if (error) return null;
    return typeof data === "string" ? data : null;
  }

  async searchVideos(query: string, limit = 48): Promise<RecentVideo[]> {
    const term = query.trim();
    if (!term) return [];

    // Normalised form strips spaces, hyphens and punctuation so "spiderman"
    // matches "Spider-Man" and "the godfather" matches "TheGodfather".
    const normalized = term.toLowerCase().replace(/[^a-z0-9]+/g, "");

    // PostgREST's .or() treats commas and parentheses as filter syntax, and
    // LIKE treats % and _ as wildcards. Neither is meaningful in a title
    // search, so strip them rather than escape and risk a malformed filter.
    const safeTerm = term.replace(/[%_,()]/g, " ").trim();
    if (!safeTerm) return [];

    // Join to the channel so results can link to the right channel, and only
    // include videos of published channels.
    const withDuration = await this.hasDurationColumn();

    const { data, error } = await this.client
      .from("channel_videos")
      .select(
        withDuration
          ? "video_id, title, thumbnail_url, published_at, is_short, duration_seconds, channel_id, channels!inner(name, slug, status)"
          : "video_id, title, thumbnail_url, published_at, is_short, channel_id, channels!inner(name, slug, status)"
      )
      .or(
        normalized
          ? `title.ilike.%${safeTerm}%,title_normalized.like.%${normalized}%`
          : `title.ilike.%${safeTerm}%`
      )
      .eq("channels.status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw new Error(`Failed to search videos: ${error.message}`);

    // Nothing matched literally. Fall back to a similarity-ranked search so a
    // typo or an unexpected word break still surfaces the film.
    if (!data || data.length === 0) {
      return this.searchVideosFuzzy(term, limit);
    }

    return (data as unknown as Array<{
      video_id: string;
      title: string;
      thumbnail_url: string | null;
      published_at: string | null;
      is_short: boolean;
      duration_seconds?: number | null;
      channel_id: string;
      channels: { name: string; slug: string } | { name: string; slug: string }[] | null;
    }>).map((row) => {
      const ch = Array.isArray(row.channels) ? row.channels[0] : row.channels;
      return {
        videoId: row.video_id,
        title: row.title,
        thumbnailUrl: row.thumbnail_url,
        publishedAt: row.published_at,
        isShort: row.is_short,
        durationSeconds:
          typeof row.duration_seconds === "number" ? row.duration_seconds : null,
        channelId: row.channel_id,
        channelName: ch?.name ?? "Channel",
        channelSlug: ch?.slug ?? ""
      };
    });
  }

  /**
   * Similarity-ranked search used only when the literal search finds nothing.
   * The SQL function also returns the channel, so this stays a single query.
   */
  private async searchVideosFuzzy(
    term: string,
    limit: number
  ): Promise<RecentVideo[]> {
    const { data, error } = await this.client.rpc("search_videos_fuzzy", {
      search_term: term,
      result_limit: limit
    });
    // A missing function must not break search; return no results instead.
    if (error) return [];

    return (data as unknown as Array<{
      video_id: string;
      title: string;
      thumbnail_url: string | null;
      published_at: string | null;
      is_short: boolean;
      channel_id: string;
      channel_name: string;
      channel_slug: string;
    }>).map((row) => ({
      videoId: row.video_id,
      title: row.title,
      thumbnailUrl: row.thumbnail_url,
      publishedAt: row.published_at,
      isShort: row.is_short,
      durationSeconds: null,
      channelId: row.channel_id,
      channelName: row.channel_name,
      channelSlug: row.channel_slug
    }));
  }

  async listMoviesByYear(year: number, limit = 48): Promise<RecentVideo[]> {
    // Full movies published within the given calendar year.
    const start = `${year}-01-01T00:00:00.000Z`;
    const end = `${year + 1}-01-01T00:00:00.000Z`;
    const { data, error } = await this.client
      .from("channel_videos")
      .select(
        "video_id, title, thumbnail_url, published_at, is_short, duration_seconds, channel_id, channels!inner(name, slug, status)"
      )
      .eq("is_short", false)
      .eq("channels.status", "published")
      .gte("published_at", start)
      .lt("published_at", end)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw new Error(`Failed to load movies by year: ${error.message}`);

    return (data as unknown as Array<{
      video_id: string;
      title: string;
      thumbnail_url: string | null;
      published_at: string | null;
      is_short: boolean;
      duration_seconds?: number | null;
      channel_id: string;
      channels: { name: string; slug: string } | { name: string; slug: string }[] | null;
    }>).map((row) => {
      const ch = Array.isArray(row.channels) ? row.channels[0] : row.channels;
      return {
        videoId: row.video_id,
        title: row.title,
        thumbnailUrl: row.thumbnail_url,
        publishedAt: row.published_at,
        isShort: row.is_short,
        durationSeconds:
          typeof row.duration_seconds === "number" ? row.duration_seconds : null,
        channelId: row.channel_id,
        channelName: ch?.name ?? "Channel",
        channelSlug: ch?.slug ?? ""
      };
    });
  }

  async listAllMovies(page: number, pageSize: number): Promise<Paginated<RecentVideo>> {
    const MIN_MOVIE_SECONDS = 59 * 60;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await this.client
      .from("channel_videos")
      .select(
        "video_id, title, thumbnail_url, published_at, is_short, duration_seconds, channel_id, channels!inner(name, slug, status)",
        { count: "exact" }
      )
      .eq("is_short", false)
      .gte("duration_seconds", MIN_MOVIE_SECONDS)
      .eq("channels.status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("video_id", { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Failed to load all movies: ${error.message}`);

    const items = (data as unknown as Array<{
      video_id: string;
      title: string;
      thumbnail_url: string | null;
      published_at: string | null;
      is_short: boolean;
      duration_seconds?: number | null;
      channel_id: string;
      channels: { name: string; slug: string } | { name: string; slug: string }[] | null;
    }>).map((row) => {
      const ch = Array.isArray(row.channels) ? row.channels[0] : row.channels;
      return {
        videoId: row.video_id,
        title: row.title,
        thumbnailUrl: row.thumbnail_url,
        publishedAt: row.published_at,
        isShort: row.is_short,
        durationSeconds:
          typeof row.duration_seconds === "number" ? row.duration_seconds : null,
        channelId: row.channel_id,
        channelName: ch?.name ?? "Channel",
        channelSlug: ch?.slug ?? ""
      };
    });

    return { items, total: count ?? items.length, page, pageSize };
  }

  async createCategory(input: CategoryInput): Promise<Category> {
    const { data, error } = await this.client
      .from("categories")
      .insert({
        name: input.name.trim(),
        slug: (input.slug || slugify(input.name)).trim(),
        description: input.description ?? null,
        icon: input.icon ?? null,
        sort_order: input.sortOrder ?? 0,
        is_active: input.isActive ?? true
      })
      .select("*")
      .single();
    if (error) throw new Error(`Failed to create category: ${error.message}`);
    return mapCategory(data as CategoryRow);
  }

  async updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.slug !== undefined) patch.slug = input.slug.trim();
    if (input.description !== undefined) patch.description = input.description;
    if (input.icon !== undefined) patch.icon = input.icon;
    if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
    if (input.isActive !== undefined) patch.is_active = input.isActive;

    const { data, error } = await this.client
      .from("categories")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(`Failed to update category: ${error.message}`);
    return mapCategory(data as CategoryRow);
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await this.client.from("categories").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete category: ${error.message}`);
  }

  async reorderCategories(orderedIds: string[]): Promise<void> {
    // Write contiguous sort_order values. Updates run sequentially so the final
    // order is deterministic regardless of network interleaving.
    for (let index = 0; index < orderedIds.length; index += 1) {
      const { error } = await this.client
        .from("categories")
        .update({ sort_order: index })
        .eq("id", orderedIds[index]);
      if (error) throw new Error(`Failed to reorder categories: ${error.message}`);
    }
  }
}

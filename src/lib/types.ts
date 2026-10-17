/**
 * Core domain types. These mirror the PRD §8 data model and are shared
 * across both data adapters (Supabase and static file).
 */

export type ChannelStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "archived";

export type AiClassificationStatus =
  | "not_started"
  | "pending"
  | "completed"
  | "failed"
  | "skipped";

export type AssignedBy = "admin" | "ai";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelCategory {
  channelId: string;
  categoryId: string;
  isPrimary: boolean;
  assignedBy: AssignedBy;
  createdAt: string;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  youtubeChannelUrl: string;
  youtubeChannelId: string | null;
  /** Derived `UU...` uploads playlist id or an admin-supplied playlist id. */
  youtubePlaylistId: string | null;
  youtubeEmbedUrl: string | null;
  thumbnailUrl: string | null;
  coverUrl: string | null;
  languageCode: string | null;
  countryCode: string | null;
  status: ChannelStatus;
  isFeatured: boolean;
  source: "manual";
  metadataSource: string | null;
  aiClassificationStatus: AiClassificationStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/** A channel joined with its category assignments, for display. */
export interface ChannelWithCategories extends Channel {
  categories: Array<Pick<Category, "id" | "name" | "slug"> & { isPrimary: boolean }>;
  tags: string[];
}

export interface CategoryInput {
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

/** Fields an administrator can submit when adding or editing a channel. */
export interface ChannelInput {
  youtubeChannelUrl: string;
  name?: string;
  description?: string | null;
  youtubeChannelId?: string | null;
  youtubePlaylistId?: string | null;
  youtubeEmbedUrl?: string | null;
  thumbnailUrl?: string | null;
  coverUrl?: string | null;
  languageCode?: string | null;
  countryCode?: string | null;
  status?: ChannelStatus;
  isFeatured?: boolean;
  categoryIds?: string[];
  primaryCategoryId?: string | null;
  tags?: string[];
}

/** Query options for listing channels from the public catalogue. */
export interface ChannelListQuery {
  search?: string;
  categorySlug?: string;
  sort?: "recent" | "alphabetical";
  featuredOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

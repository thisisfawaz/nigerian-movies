import type { MetadataRoute } from "next";

import { getCatalogueRepository } from "@/lib/repositories";
import { getSiteUrl } from "@/lib/env";

/**
 * Sitemap generation (PRD §15). Only published channels and active
 * categories are included; drafts, pending, archived, and deleted content is
 * never listed.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl().replace(/\/$/, "");
  const repo = getCatalogueRepository();

  const [channels, categories] = await Promise.all([
    repo.listChannels({ sort: "recent", pageSize: 1000 }),
    repo.listCategories({ activeOnly: true })
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/explore`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/categories`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 }
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${base}/categories/${category.slug}`,
    changeFrequency: "weekly",
    priority: 0.6
  }));

  const channelRoutes: MetadataRoute.Sitemap = channels.items.map((channel) => ({
    url: `${base}/channel/${channel.slug}`,
    lastModified: channel.updatedAt ? new Date(channel.updatedAt) : undefined,
    changeFrequency: "weekly",
    priority: 0.7
  }));

  return [...staticRoutes, ...categoryRoutes, ...channelRoutes];
}

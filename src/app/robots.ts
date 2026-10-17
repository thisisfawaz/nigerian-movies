import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/env";

/**
 * Robots rules (PRD §15). Admin and search-results pages are excluded from
 * indexing; only the public catalogue should be discoverable.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl().replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/search", "/api"]
      }
    ],
    sitemap: `${base}/sitemap.xml`
  };
}

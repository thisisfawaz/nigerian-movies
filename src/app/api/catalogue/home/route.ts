import { NextResponse } from "next/server";

import { getLatestMoviesFeed } from "@/lib/feed/select";
import { getCatalogueRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const repo = getCatalogueRepository();
    const [featured, recent, fullMovies, recentlyAdded, teasers] = await Promise.all([
      repo.listChannels({ featuredOnly: true, sort: "recent", pageSize: 12 }),
      repo.listChannels({ sort: "recent", pageSize: 12 }),
      getLatestMoviesFeed(),
      repo.listRecentlyAddedMovies(20),
      repo.listRecentVideos(15, "short")
    ]);
    return NextResponse.json({ featured, recent, fullMovies, recentlyAdded, teasers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load home feed." },
      { status: 500 }
    );
  }
}

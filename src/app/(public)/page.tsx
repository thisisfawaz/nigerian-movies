import Link from "next/link";

import { ChannelCard } from "@/components/channel-card";
import { MovieBannerCarousel } from "@/components/movie-banner-carousel";
import { ScrollRow } from "@/components/scroll-row";
import { MoviePortraitRow } from "@/components/movie-portrait-row";
import { EmptyState } from "@/components/ui";
import { getLatestMoviesFeed } from "@/lib/feed/select";
import { getCatalogueRepository } from "@/lib/repositories";
import type { ChannelWithCategories } from "@/lib/types";

export const revalidate = 30;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function ChannelRow({
  title,
  channels,
  allHref
}: {
  title: string;
  channels: ChannelWithCategories[];
  allHref?: string;
}) {
  if (channels.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {allHref ? (
          <Link href={allHref} className="text-sm font-semibold text-pop hover:underline">
            All channels
          </Link>
        ) : null}
      </div>
      <ScrollRow wrapperClassName="-mx-1" trackClassName="gap-4 px-1 py-1">
        {channels.map((channel) => (
          <li key={channel.id} className="w-40 flex-none sm:w-48">
            <ChannelCard channel={channel} />
          </li>
        ))}
      </ScrollRow>
    </section>
  );
}

export default async function HomePage() {
  const repo = getCatalogueRepository();
  const [featured, recent, fullMovies, recentlyAdded, teasers] = await Promise.all([
    repo.listChannels({ featuredOnly: true, sort: "recent", pageSize: 12 }),
    repo.listChannels({ sort: "recent", pageSize: 10 }),
    getLatestMoviesFeed(),
    repo.listRecentlyAddedMovies(20),
    repo.listRecentVideos(15, "short")
  ]);

  const hasAnything =
    recent.items.length > 0 ||
    fullMovies.length > 0 ||
    recentlyAdded.length > 0 ||
    teasers.length > 0;

  return (
    <main>
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-10">
        <MovieBannerCarousel title="Featured Movies" videos={fullMovies} />

        <MovieBannerCarousel
          title="Recently added"
          videos={recentlyAdded}
          size="compact"
        />

        <MoviePortraitRow title="Channel Teasers" videos={teasers} />

        <ChannelRow title="Channels" channels={shuffle(featured.items)} />
        <ChannelRow
          title="More channels"
          channels={shuffle(recent.items).slice(0, 10)}
          allHref="/explore"
        />

        {!hasAnything ? (
          <EmptyState
            title="No channels published yet"
            description="The catalogue is being curated. Check back soon."
          />
        ) : null}
      </div>
    </main>
  );
}

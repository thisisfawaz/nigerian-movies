import Link from "next/link";

import { FavouriteButton } from "@/components/favourite-button";
import { PlayBadge } from "@/components/play-badge";
import { ScrollRow } from "@/components/scroll-row";
import { VideoThumbnail } from "@/components/video-thumbnail";
import type { RecentVideo } from "@/lib/repositories/types";
import { MovieTitle } from "@/components/movie-title";

/**
 * Top discovery carousel: wide 16:9 banners, horizontally scrollable. On
 * desktop the sizing shows ~2 full banners plus about a third of the next one,
 * signalling there is more to scroll.
 *
 * Each banner advertises the channel it came from and links to that channel.
 */
export function MovieBannerCarousel({
  title,
  videos,
  size = "large"
}: {
  title: string;
  videos: RecentVideo[];
  /** "large" = Latest Movies (~2.5 visible); "compact" = Recently Added (~4). */
  size?: "large" | "compact";
}) {
  if (videos.length === 0) return null;

  // Card widths are tuned per section. Both keep the 16:9 aspect ratio.
  const cardWidth =
    size === "compact"
      ? "w-[64vw] flex-none snap-start sm:w-[38vw] lg:w-[27vw]"
      : "w-[86vw] flex-none snap-start sm:w-[46vw] lg:w-[42vw]";

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <ScrollRow wrapperClassName="-mx-1" trackClassName="snap-x snap-mandatory gap-4 px-1 pb-3">
        {videos.map((video) => (
          <li
            key={`${video.channelId}-${video.videoId}`}
            className={cardWidth}
          >
            <Link
              href={`/channel/${video.channelSlug}?v=${video.videoId}`}
              className="group block overflow-hidden rounded-card border border-border bg-surface"
            >
              <span className="relative block aspect-video w-full overflow-hidden">
                <VideoThumbnail
                  src={video.thumbnailUrl}
                  className="transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <span className="overlay-movie pointer-events-none absolute inset-0" />
                <span className="absolute right-3 top-3">
                  <FavouriteButton
                    movie={{
                      videoId: video.videoId,
                      title: video.title,
                      thumbnailUrl: video.thumbnailUrl,
                      channelSlug: video.channelSlug,
                      channelName: video.channelName
                    }}
                  />
                </span>
                <span className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
                  <PlayBadge />
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm font-semibold text-white sm:text-base">
                      <MovieTitle title={video.title} publishedAt={video.publishedAt} />
                    </span>
                    <span className="mt-1 block text-xs font-medium uppercase tracking-wide text-pop">
                      {video.channelName}
                    </span>
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ScrollRow>
    </section>
  );
}

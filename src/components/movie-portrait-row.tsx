import Link from "next/link";

import { PlayBadge } from "@/components/play-badge";
import { ScrollRow } from "@/components/scroll-row";
import { VideoThumbnail } from "@/components/video-thumbnail";
import type { RecentVideo } from "@/lib/repositories/types";
import { MovieTitle } from "@/components/movie-title";

/**
 * Horizontal row of 9:16 portrait movie tiles (Tubi-style discovery). Each tile
 * links to the video's channel.
 */
export function MoviePortraitRow({
  title,
  videos
}: {
  title: string;
  videos: RecentVideo[];
}) {
  if (videos.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <ScrollRow wrapperClassName="-mx-1" trackClassName="gap-4 px-1 pb-3">
        {videos.map((video) => (
          <li
            key={`${video.channelId}-${video.videoId}`}
            className="w-36 flex-none sm:w-48 lg:w-56"
          >
            <Link
              href={`/channel/${video.channelSlug}?v=${video.videoId}`}
              className="group block"
            >
              <span className="relative block aspect-[3/4] w-full overflow-hidden rounded-card border border-border bg-black">
                <VideoThumbnail
                  src={video.thumbnailUrl}
                  className="scale-[1.35] transition-transform duration-300 group-hover:scale-[1.4]"
                />
                <span className="overlay-teaser pointer-events-none absolute inset-0" />
                {/* Hover-only play affordance over a transparent dark wash. */}
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <PlayBadge />
                </span>
                <span className="absolute inset-x-0 bottom-0 p-2">
                  <span className="line-clamp-2 text-xs font-medium text-white">
                    <MovieTitle title={video.title} publishedAt={video.publishedAt} />
                  </span>
                  <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-pop">
                    {video.channelName}
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

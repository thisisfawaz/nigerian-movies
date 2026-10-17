import Link from "next/link";

import { FavouriteButton } from "@/components/favourite-button";
import { VideoThumbnail } from "@/components/video-thumbnail";
import type { RecentVideo } from "@/lib/repositories/types";
import { MovieTitle } from "@/components/movie-title";

/** Playful 16:9 movie card used in search and favourites results. */
export function MovieCard({ movie }: { movie: RecentVideo }) {
  return (
    <Link
      href={`/channel/${movie.channelSlug}?v=${movie.videoId}`}
      className="group block"
    >
      <span className="relative block aspect-video w-full overflow-hidden rounded-card border border-border bg-surface">
        <VideoThumbnail
          src={movie.thumbnailUrl}
          className="transition-transform duration-300 group-hover:scale-[1.05]"
        />
        <span className="overlay-movie pointer-events-none absolute inset-0" />
        <span className="absolute right-2 top-2">
          <FavouriteButton
            movie={{
              videoId: movie.videoId,
              title: movie.title,
              thumbnailUrl: movie.thumbnailUrl,
              channelSlug: movie.channelSlug,
              channelName: movie.channelName
            }}
          />
        </span>
        <span className="absolute inset-x-0 bottom-0 p-3">
          <span className="line-clamp-2 text-sm font-semibold text-white">
            <MovieTitle title={movie.title} publishedAt={movie.publishedAt} />
          </span>
          <span
            className="mt-1 block text-xs font-medium uppercase tracking-wide text-pop"
            title={movie.channelName}
          >
            {movie.channelName}
          </span>
        </span>
      </span>
    </Link>
  );
}

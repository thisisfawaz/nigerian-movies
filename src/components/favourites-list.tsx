"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { FavouriteButton } from "@/components/favourite-button";
import { EmptyState } from "@/components/ui";
import { VideoThumbnail } from "@/components/video-thumbnail";
import {
  listFavourites,
  migrateLegacyFavourites,
  onFavouritesChanged,
  type FavouriteMovie
} from "@/lib/favourites";
import { cleanTitle } from "@/lib/titles";

/** Renders the signed-in user's saved movies (watch later). */
export function FavouritesList() {
  const [items, setItems] = useState<FavouriteMovie[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMounted(true);

    const load = () => {
      listFavourites().then((v) => {
        if (!cancelled) setItems(v);
      });
    };

    // Lift any pre-login localStorage favourites into the account, then load.
    migrateLegacyFavourites().then(load);
    const off = onFavouritesChanged(load);
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  if (!mounted) {
    return <div className="mt-8 h-40 animate-pulse rounded-card bg-surface-hover" />;
  }

  if (items.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState
          title="No favourites yet"
          description="Tap the heart on a movie to save it here for later."
        />
      </div>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((movie) => (
        <div key={movie.videoId} className="group relative">
          <Link
            href={`/channel/${movie.channelSlug}?v=${movie.videoId}`}
            className="block"
          >
            <span className="relative block aspect-video w-full overflow-hidden rounded-card border border-border">
              <VideoThumbnail
                src={movie.thumbnailUrl}
                className="transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <span className="overlay-movie pointer-events-none absolute inset-0" />
            </span>
            <span className="mt-2 line-clamp-2 text-sm font-medium group-hover:text-pop">
              {cleanTitle(movie.title)}
            </span>
            <span className="mt-0.5 block text-xs text-muted">{movie.channelName}</span>
          </Link>
          {/* Remove control: outside the link so it never triggers navigation. */}
          <span className="absolute right-2 top-2 z-10">
            <FavouriteButton movie={movie} />
          </span>
        </div>
      ))}
    </div>
  );
}

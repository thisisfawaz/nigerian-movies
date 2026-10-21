"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/ui";
import { VideoThumbnail } from "@/components/video-thumbnail";
import { cleanTitle } from "@/lib/titles";
import { listHistory, onHistoryChanged, type WatchedMovie } from "@/lib/watch-history";

/** Renders the signed-in user's recently watched movies. */
export function HistoryList() {
  const [items, setItems] = useState<WatchedMovie[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMounted(true);

    const load = () => {
      listHistory().then((v) => {
        if (!cancelled) setItems(v);
      });
    };

    load();
    const off = onHistoryChanged(load);
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
          title="No watch history yet"
          description="Movies you choose to watch will appear here."
        />
      </div>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((movie) => (
        <Link
          key={movie.videoId}
          href={`/channel/${movie.channelSlug}?v=${movie.videoId}`}
          className="group block"
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
      ))}
    </div>
  );
}

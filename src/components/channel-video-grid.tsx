"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { FavouriteButton } from "@/components/favourite-button";
import { InlineSpinner } from "@/components/loading";
import { ScrollRow } from "@/components/scroll-row";
import { VideoThumbnail } from "@/components/video-thumbnail";
import { MovieTitle } from "@/components/movie-title";
import { cleanTitle } from "@/lib/titles";

interface Video {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  isShort: boolean;
  publishedAt: string | null;
}

/**
 * Channel video experience. The selected full movie plays in a player on the
 * left; other full movies sit in a vertical scroll list on the right. Teasers
 * (YouTube Shorts) are shown in a horizontal 9:16 row below.
 */
export function ChannelVideoGrid({
  channelSlug,
  channelName,
  videos
}: {
  channelSlug: string;
  channelName: string;
  videos: Video[];
}) {
  const searchParams = useSearchParams();
  const fullMovies = videos.filter((v) => !v.isShort);
  // Teasers: only the latest 15 for this channel (videos are date-ordered).
  const teasers = videos.filter((v) => v.isShort).slice(0, 15);

  // Initial selection: the ?v= param if present, else the latest full movie.
  const [current, setCurrent] = useState<string | null>(
    searchParams.get("v") ?? fullMovies[0]?.videoId ?? videos[0]?.videoId ?? null
  );
  const [playerLoading, setPlayerLoading] = useState(true);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allById = new Map(videos.map((v) => [v.videoId, v]));
  const playing =
    (current ? allById.get(current) : undefined) ?? fullMovies[0] ?? videos[0];

  // The iframe onLoad is not always reliable (it can fire before React attaches
  // the handler, or not at all in some cases), so we also clear the spinner on
  // a short timeout. Either way, the spinner always goes away.
  const clearLoading = () => {
    if (loadTimer.current) clearTimeout(loadTimer.current);
    loadTimer.current = null;
    setPlayerLoading(false);
  };

  const startLoading = () => {
    setPlayerLoading(true);
    if (loadTimer.current) clearTimeout(loadTimer.current);
    loadTimer.current = setTimeout(() => setPlayerLoading(false), 4000);
  };

  useEffect(() => {
    startLoading();
    return () => {
      if (loadTimer.current) clearTimeout(loadTimer.current);
    };
    // Re-arm whenever the selected video changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing?.videoId]);

  const select = (videoId: string) => {
    setCurrent(videoId);
    startLoading();
    const url = new URL(window.location.href);
    url.searchParams.set("v", videoId);
    window.history.replaceState(null, "", url.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_560px] lg:items-start">
        {/* Player: as large as fits BOTH the column width and 72vh, so the
            whole video is visible on load without scrolling. */}
        <div className="relative mx-auto aspect-video max-h-[72vh] w-full overflow-hidden rounded-card border border-border bg-black lg:max-w-[calc(72vh*16/9)]">
          {playing ? (
            <iframe
              key={playing.videoId}
              src={`https://www.youtube.com/embed/${playing.videoId}?autoplay=1`}
              title={playing.title}
              className="h-full w-full"
              onLoad={clearLoading}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : null}
          {playing && playerLoading ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 text-white">
              <InlineSpinner className="h-8 w-8" />
            </div>
          ) : null}
        </div>

        {/* Vertical scroll of full movies, presented as a glass panel. */}
        <aside className="rounded-card border border-white/10 bg-white/5 p-3 backdrop-blur-md">
          <div className="mb-2 flex items-baseline justify-between border-b border-white/10 pb-2">
            <h3 className="text-sm font-semibold">All Movies</h3>
            <span className="text-xs text-muted">{fullMovies.length}</span>
          </div>
          <ul className="no-scrollbar space-y-1 lg:max-h-[56vh] lg:overflow-y-auto lg:[mask-image:linear-gradient(to_bottom,black_88%,transparent)]">
            {fullMovies.map((video) => {
              const active = video.videoId === playing?.videoId;
              return (
                <li key={video.videoId}>
                  <button
                    type="button"
                    onClick={() => select(video.videoId)}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full gap-3 rounded-lg p-2 text-left transition-colors ${
                      active ? "bg-pop/10" : "hover:bg-white/5"
                    }`}
                  >
                    <span className="relative block aspect-video w-44 flex-none overflow-hidden rounded">
                      <VideoThumbnail src={video.thumbnailUrl} />
                      <span className="absolute right-1 top-1">
                        <FavouriteButton
                          movie={{
                            videoId: video.videoId,
                            title: video.title,
                            thumbnailUrl: video.thumbnailUrl,
                            channelSlug,
                            channelName
                          }}
                        />
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-3 text-sm">
                        <MovieTitle title={video.title} publishedAt={video.publishedAt} />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      {playing ? (
        <h2 className="mt-4 text-lg font-semibold">
          <MovieTitle title={playing.title} publishedAt={playing.publishedAt} />
        </h2>
      ) : null}

      {/* Teasers (Shorts) below */}
      {teasers.length > 0 ? (
        <section className="mt-10">
          <h3 className="mb-3 text-lg font-semibold">Channel Teasers</h3>
          <ScrollRow wrapperClassName="-mx-1" trackClassName="gap-4 px-1 pb-3">
            {teasers.map((video) => {
              const active = video.videoId === playing?.videoId;
              return (
                <li key={video.videoId} className="w-36 flex-none sm:w-48">
                  <button
                    type="button"
                    onClick={() => select(video.videoId)}
                    aria-current={active ? "true" : undefined}
                    className={`group block w-full text-left ${active ? "" : ""}`}
                  >
                    <span
                      className={`relative block aspect-[3/4] w-full overflow-hidden rounded-card border ${
                        active ? "border-pop" : "border-border"
                      }`}
                    >
                      <VideoThumbnail
                        src={video.thumbnailUrl}
                        className="scale-[1.35] transition-transform duration-300 group-hover:scale-[1.4]"
                      />
                      <span className="overlay-teaser pointer-events-none absolute inset-0" />
                      <span className="absolute right-1 top-1">
                        <FavouriteButton
                          movie={{
                            videoId: video.videoId,
                            title: video.title,
                            thumbnailUrl: video.thumbnailUrl,
                            channelSlug,
                            channelName
                          }}
                        />
                      </span>
                      <span className="absolute inset-x-0 bottom-0 p-2">
                        <span className="line-clamp-2 text-xs font-medium text-white">
                          {cleanTitle(video.title)}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ScrollRow>
        </section>
      ) : null}
    </div>
  );
}

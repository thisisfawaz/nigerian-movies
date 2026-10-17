"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { FavouriteButton } from "@/components/favourite-button";
import { ExternalLinkIcon } from "@/components/icons";
import { InlineSpinner } from "@/components/loading";
import { PlayBadge } from "@/components/play-badge";
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

interface ChannelHeaderInfo {
  name: string;
  youtubeChannelUrl: string;
  /** Rendered by the page and passed in, since artwork is a server component. */
  artwork: React.ReactNode;
}

/**
 * Channel video experience. The selected full movie plays in a player on the
 * left; other full movies sit in a vertical scroll list on the right. Teasers
 * (YouTube Shorts) are shown in a horizontal 9:16 row below.
 */
export function ChannelVideoGrid({
  channelSlug,
  channelName,
  channel,
  videos
}: {
  channelSlug: string;
  channelName: string;
  channel: ChannelHeaderInfo;
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
      <div className="relative flex flex-col gap-4 pt-2 lg:pt-4">
        {/* Mobile: Explore inline above the player. */}
        <Link
          href="/explore"
          className="text-sm text-muted hover:text-foreground lg:hidden"
        >
          ← Explore
        </Link>

        {/* Desktop: Explore pinned to the container's far left, top level with
            the player (which starts at the container's lg:pt-8). */}
        <Link
          href="/explore"
          className="absolute left-0 top-2 hidden whitespace-nowrap text-sm text-muted hover:text-foreground lg:top-4 lg:block"
        >
          ← Explore
        </Link>

        {/* Player wrapper is width-matched to the player. */}
        <div className="relative mx-auto -mt-[2px] w-full min-w-0 max-w-[calc(65vh*16/9)] sm:mt-0">
          {/* Player: width comes from the 65vh cap so the video fills the frame
              exactly (no letterboxing) and sits centred. */}
          <div className="relative aspect-video w-full overflow-hidden rounded-card border border-border">
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
        </div>

        {/* Channel identity on the left, playing title + heart on the right. */}
        <header className="mx-auto flex w-full min-w-0 max-w-[calc(65vh*16/9)] flex-col gap-2 border-b border-white/10 pb-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative h-10 w-10 flex-none overflow-hidden rounded-lg border border-border bg-surface">
              {channel.artwork}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold sm:text-2xl" title={channel.name}>
                {channel.name}
              </h1>
              <a
                href={channel.youtubeChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
              >
                <ExternalLinkIcon /> View on YouTube
              </a>
            </div>
          </div>

          {playing ? (
            <div className="flex min-w-0 items-center gap-2 sm:ml-auto sm:justify-end">
              <FavouriteButton
                movie={{
                  videoId: playing.videoId,
                  title: playing.title,
                  thumbnailUrl: playing.thumbnailUrl,
                  channelSlug,
                  channelName
                }}
              />
              <h2 className="min-w-0 text-sm font-semibold sm:text-right">
                <MovieTitle title={playing.title} publishedAt={playing.publishedAt} />
              </h2>
            </div>
          ) : null}
        </header>

        {/* All Movies: horizontal carousel at every breakpoint. */}
        <section className="min-w-0">
          <h3 className="mb-3 text-lg font-semibold">All Movies</h3>

          <ScrollRow
            wrapperClassName="-mx-1"
            trackClassName="snap-x snap-mandatory gap-4 px-1 pb-3"
          >
              {fullMovies.map((video) => {
                const active = video.videoId === playing?.videoId;
                return (
                  <li
                    key={video.videoId}
                    className="w-[64vw] flex-none snap-start sm:w-[38vw]"
                  >
                    <button
                      type="button"
                      onClick={() => select(video.videoId)}
                      aria-current={active ? "true" : undefined}
                      className={`group block w-full overflow-hidden rounded-card border bg-surface text-left ${
                        active ? "border-pop" : "border-border"
                      }`}
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
                              channelSlug,
                              channelName
                            }}
                          />
                        </span>
                        <span className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
                          <PlayBadge />
                          <span className="min-w-0">
                            <span className="line-clamp-2 text-sm font-semibold text-white">
                              <MovieTitle title={video.title} publishedAt={video.publishedAt} />
                            </span>
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
          </ScrollRow>
        </section>
      </div>

      {/* Teasers (Shorts) below */}
      {teasers.length > 0 ? (
        <section className="mt-10 min-w-0">
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

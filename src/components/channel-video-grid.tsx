"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { FavouriteButton } from "@/components/favourite-button";
import { ExternalLinkIcon } from "@/components/icons";
import { PlayBadge } from "@/components/play-badge";
import { ScrollRow } from "@/components/scroll-row";
import { VideoThumbnail } from "@/components/video-thumbnail";
import { MovieTitle } from "@/components/movie-title";
import { YouTubePlayer } from "@/components/youtube-player";
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
  const allById = new Map(videos.map((v) => [v.videoId, v]));
  const playing =
    (current ? allById.get(current) : undefined) ?? fullMovies[0] ?? videos[0];

  const select = (videoId: string) => {
    setCurrent(videoId);
    const url = new URL(window.location.href);
    url.searchParams.set("v", videoId);
    window.history.replaceState(null, "", url.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      <div className="relative flex flex-col gap-4 pt-0 lg:pt-4">
        {/* Player wrapper is width-matched to the player.
            Mobile: full-bleed edge-to-edge. We break out of the page's px-4
            with negative margins and w-full (NOT 100vw — 100vw includes the
            scrollbar width and caused a black band on the right on desktop).
            The 65vh cap and centring only apply from sm up. */}
        <div className="relative -mx-4 w-[calc(100%+2rem)] min-w-0 sm:mx-auto sm:w-full sm:max-w-[calc(65vh*16/9)]">
          {/* Player: width comes from the 65vh cap so the video fills the frame
              exactly (no letterboxing) and sits centred. On mobile it is
              square-cornered and borderless, like the YouTube app. */}
          {/* The box stays 16:9 at every breakpoint. The player inside is
              overscanned and clipped (see YouTubePlayer), so wide films fill
              the frame instead of showing letterbox bars. */}
          <div className="relative mx-auto aspect-video w-full overflow-hidden border-0 sm:rounded-card sm:border sm:border-border">
            {playing ? (
              <YouTubePlayer key={playing.videoId} videoId={playing.videoId} title={playing.title} />
            ) : null}
          </div>
        </div>

        {/* Channel identity on the left, playing title + heart on the right. */}
        <header className="mx-auto mt-4 flex w-full min-w-0 max-w-[calc(65vh*16/9)] flex-col gap-2 border-b border-white/10 pb-3 sm:flex-row sm:items-center sm:gap-3">
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * YouTube player built on the IFrame Player API rather than a plain <iframe>.
 *
 * A plain embed cannot be controlled from our page at all — no pause events, no
 * way to hide YouTube's own controls, no programmatic fullscreen. The API gives
 * us those hooks, so we set controls=0 and draw our own bar. That also removes
 * Share / Watch Later / related-video chrome, which a plain embed always shows.
 *
 * The API script needs no key and no account.
 */

const API_SRC = "https://www.youtube.com/iframe_api";
const NC_HOST = "https://www.youtube-nocookie.com";

// Module-level so the script is requested once no matter how many players mount.
let apiPromise: Promise<void> | null = null;

function loadApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${API_SRC}"]`);

    // The API calls a global callback when it finishes loading.
    (window as unknown as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady =
      () => resolve();

    if (existing) return;

    const script = document.createElement("script");
    script.src = API_SRC;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load the YouTube IFrame API"));
    document.head.appendChild(script);
  });

  return apiPromise;
}

/** Minimal shape of the API surface we actually use. */
type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVolume: () => number;
  setVolume: (v: number) => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  setPlaybackRate: (rate: number) => void;
  getPlaybackRate: () => number;
  getAvailablePlaybackRates: () => number[];
  toggleCaptions: () => void;
  destroy: () => void;
  addEventListener: (event: string, cb: (e: { data: number }) => void) => void;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement | string,
    opts: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
      };
    }
  ) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number };
};

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** Seconds skipped by a double tap on the left or right half of the video. */
const SEEK_STEP = 10;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

export interface YouTubePlayerProps {
  videoId: string;
  title: string;
  /** Called once the player is ready, so the page can drop its own spinner. */
  onReady?: () => void;
}

/**
 * The controls auto-hide. There are two triggers, and they behave differently
 * on purpose:
 *
 *  - Mouse leaves the player: hide immediately. The pointer is gone, so there
 *    is nothing to click.
 *  - Playback pauses: hide immediately, same as mouse-out.
 *
 * On touch devices there is no hover, so tapping the video toggles the bar and
 * it hides on its own after a few seconds.
 */
export function YouTubePlayer({ videoId, title, onReady }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showBar, setShowBar] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Direction of the last double-tap seek, cleared after a moment. */
  const [seekHint, setSeekHint] = useState<"back" | "forward" | null>(null);
  const seekHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Reveal the controls. Attached to both the wrapper and the interaction
   * layer: the layer covers the whole player and receives the pointer events
   * in practice, so relying on the wrapper alone missed hover entirely.
   */
  const revealBar = () => {
    setShowBar(true);
    if (playing) armIdle();
  };

  const clearIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = null;
  }, []);

  // While playing, hide the bar after a short idle period so the video is clean.
  const armIdle = useCallback(() => {
    clearIdle();
    idleTimer.current = setTimeout(() => setShowBar(false), 3000);
  }, [clearIdle]);

  useEffect(() => {
    let cancelled = false;

    loadApi()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const YT = (window as unknown as { YT: YTNamespace }).YT;
        if (!YT) {
          setFailed(true);
          return;
        }

        const player = new YT.Player(containerRef.current, {
          videoId,
          host: NC_HOST,
          playerVars: {
            autoplay: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            cc_load_policy: 0
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              playerRef.current = player;
              setReady(true);
              setDuration(player.getDuration());
              setVolume(player.getVolume());
              setMuted(player.isMuted());
              onReady?.();

              // Forcefully attempt to disable captions on load.
              // We use a slight delay to ensure the caption module has initialized
              // before we attempt to unload it, which is more reliable than setOption.
              setTimeout(() => {
                try {
                  // @ts-ignore - unloadModule is part of the underlying YouTube API
                  player.unloadModule('captions');
                  // @ts-ignore
                  player.unloadModule('cc');
                } catch {
                  // Silently fail if the module isn't loaded or supported
                }
              }, 500);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              if (event.data === YT.PlayerState.PLAYING) {
                setPlaying(true);
                setPaused(false);
                armIdle();
              } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                setPlaying(false);
                // Hide the bar immediately on pause, and cover YouTube's bottom
                // overlay strip (which no embed parameter suppresses). The video
                // frame itself stays visible.
                setPaused(true);
                clearIdle();
                setShowBar(false);
                setSettingsOpen(false);
              }
            }
          }
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      clearIdle();
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // Re-create the player when the selected video changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Poll playback position. The API has no timeupdate event.
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      setCurrent(p.getCurrentTime());
      const d = p.getDuration();
      if (d && d !== duration) setDuration(d);
    }, 500);
    return () => clearInterval(id);
  }, [ready, duration]);

  useEffect(() => () => clearIdle(), [clearIdle]);

  useEffect(
    () => () => {
      if (seekHintTimer.current) clearTimeout(seekHintTimer.current);
    },
    []
  );

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo();
    else p.playVideo();
  };

  const seek = (seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
    setCurrent(seconds);
  };

  const changeVolume = (v: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.setVolume(v);
    setVolume(v);
    if (v > 0 && p.isMuted()) {
      p.unMute();
      setMuted(false);
    }
  };

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (p.isMuted()) {
      p.unMute();
      setMuted(false);
    } else {
      p.mute();
      setMuted(true);
    }
  };

  const changeRate = (value: number) => {
    playerRef.current?.setPlaybackRate(value);
    setRate(value);
    setSettingsOpen(false);
  };

  /**
   * Fullscreen plus landscape. Orientation lock only works while the document is
   * fullscreen. We add a slight delay before locking to avoid race conditions on
   * Android Chrome. iOS Safari does not support programmatic orientation locking,
   * so it will rely on the user physically rotating their device.
   */
  const toggleFullscreen = async () => {
    const bar = barRef.current;
    if (!bar) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      
      // Request fullscreen
      if (bar.requestFullscreen) {
        await bar.requestFullscreen();
      } else if ((bar as any).webkitRequestFullscreen) {
        await (bar as any).webkitRequestFullscreen();
      }

      // Delay orientation lock slightly to ensure fullscreen is fully active.
      // This is a known workaround for Android Chrome race conditions.
      setTimeout(async () => {
        const orientation = screen.orientation as any;
        if (orientation?.lock) {
          try {
            await orientation.lock("landscape");
          } catch {
            // Ignore errors (e.g., iOS Safari doesn't support this, or user denied)
          }
        }
      }, 300);
    } catch {
      // Fullscreen can be rejected (e.g. not a user gesture). Nothing to do.
    }
  };

  // Leaving fullscreen should release the orientation lock as well.
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) screen.orientation?.unlock?.();
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (failed) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-black p-6 text-center text-sm text-white">
        <p>The player could not be loaded.</p>
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Watch on YouTube
        </a>
      </div>
    );
  }

  return (
    <div
      ref={barRef}
      className="group/player relative h-full w-full bg-black"
      onMouseLeave={() => {
        // Leaving hides the bar in both states; the pointer is gone either way.
        clearIdle();
        setShowBar(false);
        setSettingsOpen(false);
      }}
    >
      {/* The API replaces this element with its own iframe.
          pointer-events-none keeps the pointer away from YouTube's document, so
          its hover chrome (wordmark, Watch on YouTube, title bar) never appears.
          The cost is that the iframe itself is no longer interactive, so the
          click layer below routes interaction through the API instead. */}
      <div
        ref={containerRef}
        className="pointer-events-none absolute inset-0 h-full w-full scale-[1.015]"
      />

      {/* Reveal layer. Sits beneath the centre button so it never swallows the
          button's clicks. A single tap brings the controls back; a double tap on
          the left or right half seeks back or forward. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => {
          setShowBar(true);
          if (playing) armIdle();
        }}
        onDoubleClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const isLeftHalf = event.clientX - rect.left < rect.width / 2;
          const target = Math.max(
            0,
            Math.min(current + (isLeftHalf ? -SEEK_STEP : SEEK_STEP), duration || 0)
          );
          seek(target);
          setSeekHint(isLeftHalf ? "back" : "forward");
          if (seekHintTimer.current) clearTimeout(seekHintTimer.current);
          seekHintTimer.current = setTimeout(() => setSeekHint(null), 700);
          setShowBar(true);
          if (playing) armIdle();
        }}
        onPointerEnter={revealBar}
        onPointerMove={revealBar}
        onPointerDown={revealBar}
        className="absolute inset-0 h-full w-full cursor-default bg-transparent"
      />

      {/* Center play/pause button. Follows the control bar's visibility: shown
          on hover, hidden when the pointer leaves. */}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${
          showBar ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className={`flex h-16 w-16 items-center justify-center rounded-full bg-black/40 text-white shadow-lg ${
            showBar ? "pointer-events-auto cursor-pointer" : "pointer-events-none"
          }`}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-12 w-12 fill-current" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-12 w-12 -translate-x-1 fill-current" aria-hidden="true">
              <path d="M9 6.5v11a1.5 1.5 0 0 0 2.3 1.27l9-5.5a1.5 1.5 0 0 0 0-2.54l-9-5.5A1.5 1.5 0 0 0 9 6.5z" />
            </svg>
          )}
        </button>
      </div>

      {/* Seek indicator, shown briefly after a double-tap. */}
      {seekHint ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 flex w-1/2 items-center justify-center text-white transition-opacity duration-150 ${
            seekHint === "back" ? "left-0" : "right-0"
          }`}
        >
          <span className="rounded-full bg-black/60 px-3 py-1 text-sm font-semibold">
            {seekHint === "back" ? `-${SEEK_STEP}` : `+${SEEK_STEP}`}
          </span>
        </div>
      ) : null}

      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-8 transition-opacity duration-150 ${
          showBar ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(current, duration || 0)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek"
          className="mb-1 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-white"
        />

        <div className="flex items-center gap-2 text-white">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="rounded p-1 hover:bg-white/15"
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <span className="whitespace-nowrap text-xs tabular-nums text-white/85">
            {formatTime(current)} / {formatTime(duration)}
          </span>

          <div className="ml-auto flex items-center gap-2 pr-2 sm:pr-4">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="rounded p-1 hover:bg-white/15"
            >
              {muted || volume === 0 ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label="Volume"
              className="hidden h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/30 accent-white sm:block"
            />

            <div className="relative">
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                aria-label="Settings"
                aria-expanded={settingsOpen}
                className="rounded p-1 hover:bg-white/15"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                </svg>
              </button>
              {settingsOpen ? (
                <div className="absolute bottom-full right-0 mb-2 w-40 rounded-md bg-black/90 p-2 text-xs shadow-lg">
                  <p className="mb-1 px-1 text-white/60">Speed</p>
                  {RATES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => changeRate(r)}
                      className={`flex w-full items-center justify-between rounded px-1 py-0.5 hover:bg-white/15 ${
                        rate === r ? "text-white" : "text-white/70"
                      }`}
                    >
                      <span>{r === 1 ? "Normal" : `${r}x`}</span>
                      {rate === r ? (
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden whitespace-nowrap rounded px-2 py-1 text-xs text-white/85 hover:bg-white/15 sm:block"
            >
              Watch on YouTube
            </a>

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label="Fullscreen"
              className="rounded p-1 hover:bg-white/15 ml-8 sm:ml-12"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {!ready ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 text-white">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      ) : null}

      {/* Accessible name for the embedded player region. */}
      <span className="sr-only">{title}</span>
    </div>
  );
}

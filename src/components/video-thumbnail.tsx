"use client";

import { useEffect, useState } from "react";

/**
 * Upgrade a YouTube thumbnail URL to its highest-resolution variant. YouTube
 * serves the same image at several sizes via the filename suffix; maxresdefault
 * (1280x720) is the sharpest. Non-YouTube URLs are returned unchanged.
 */
export function highResThumbnail(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/^(https:\/\/i\.ytimg\.com\/vi\/[\w-]{11}\/)[^/]+\.jpg$/);
  if (!m) return url;
  return `${m[1]}maxresdefault.jpg`;
}

/** The next-lower quality used when maxres is unavailable. */
function fallbackThumbnail(url: string): string | null {
  const m = url.match(/^(https:\/\/i\.ytimg\.com\/vi\/[\w-]{11}\/)[^/]+\.jpg$/);
  if (!m) return null;
  return `${m[1]}hqdefault.jpg`;
}

/**
 * Video thumbnail with quality handling. Renders the sharpest available image
 * (maxres -> hq) and falls back to a neutral play-icon tile if none load. The
 * image is always rendered visible (never gated behind a load event), with a
 * shimmer behind it.
 */
export function VideoThumbnail({
  src,
  className = "",
  fit = "cover",
  position = "center"
}: {
  src: string | null;
  className?: string;
  /** "cover" fills and crops; "width" pins the image width to the frame. */
  fit?: "cover" | "contain" | "width";
  /** Which part of the image is kept when cropping (object-position). */
  position?: "center" | "top" | "bottom";
}) {
  const primary = highResThumbnail(src);
  const [current, setCurrent] = useState<string | null>(primary);
  const [exhausted, setExhausted] = useState(false);

  // Reset when the source changes (e.g. selecting another video).
  useEffect(() => {
    setCurrent(highResThumbnail(src));
    setExhausted(false);
  }, [src]);

  const handleError = () => {
    if (current) {
      const fb = fallbackThumbnail(current);
      if (fb && fb !== current) {
        setCurrent(fb);
        return;
      }
    }
    setExhausted(true);
  };

  if (!current || exhausted) {
    return (
      <span
        className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-brand/30 via-surface to-accent/20 text-muted ${className}`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 opacity-70">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    );
  }

  return (
    <span className="relative block h-full w-full bg-surface-hover">
      <span className="absolute inset-0 block animate-pulse bg-surface-hover" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={handleError}
        className={`${
          fit === "width"
            ? "absolute left-0 top-1/2 h-auto w-full -translate-y-1/2"
            : `relative h-full w-full ${
                fit === "contain" ? "object-contain" : "object-cover"
              } ${
                position === "top"
                  ? "object-top"
                  : position === "bottom"
                    ? "object-bottom"
                    : "object-center"
              }`
        } ${className}`}
      />
    </span>
  );
}

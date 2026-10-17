"use client";

import { useState } from "react";

import type { ChannelWithCategories } from "@/lib/types";

/**
 * Renders channel artwork. The image is always rendered visible (never gated
 * behind a load event, which can be missed when the image is already cached),
 * with a shimmer placeholder layered behind it. Falls back to a gradient tile
 * with the channel initial when there is no image or the image fails to load,
 * so the grid never shows broken images.
 */
export function ChannelArtwork({
  channel,
  sizes = "320px",
  priority = false,
  zoomOnHover = false
}: {
  channel: Pick<ChannelWithCategories, "name" | "thumbnailUrl" | "coverUrl">;
  sizes?: string;
  priority?: boolean;
  /** When true, the artwork zooms on card hover while its frame stays fixed. */
  zoomOnHover?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  // Prefer the square channel avatar; fall back to the channel banner so a
  // card still shows an image when no avatar was resolved.
  const imageUrl = channel.thumbnailUrl ?? channel.coverUrl ?? null;

  if (imageUrl && !failed) {
    return (
      <span className="absolute inset-0 block overflow-hidden bg-surface-hover">
        {/* Shimmer sits behind the image; harmless once the image paints. */}
        <span className="absolute inset-0 block animate-pulse bg-surface-hover" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`${channel.name} artwork`}
          loading={priority ? "eager" : "lazy"}
          sizes={sizes}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-transform duration-300 ${
            zoomOnHover ? "group-hover:scale-[1.06]" : ""
          }`}
        />
      </span>
    );
  }

  const initial = channel.name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand/40 via-surface to-accent/30">
      <span className="text-4xl font-bold text-foreground/80">{initial}</span>
    </div>
  );
}

import Link from "next/link";

import { ChannelArtwork } from "@/components/channel-artwork";
import type { ChannelWithCategories } from "@/lib/types";

/**
 * Netflix-style card: square profile artwork with a hover lift. No heavy chrome.
 */
export function ChannelCard({ channel }: { channel: ChannelWithCategories }) {
  return (
    <Link
      href={`/channel/${channel.slug}`}
      className="group block focus:outline-none"
      aria-label={channel.name}
    >
      {/* Frame stays static; only the artwork zooms inside it on hover. The
          ring is on the outer box and is never scaled, so it can't be clipped. */}
      <div className="relative aspect-square rounded-card bg-surface ring-1 ring-border transition-colors duration-200 group-hover:ring-brand group-focus-visible:ring-2 group-focus-visible:ring-brand">
        <div className="absolute inset-0 overflow-hidden rounded-card">
          <ChannelArtwork
            channel={channel}
            sizes="(max-width:640px) 50vw, 240px"
            zoomOnHover
          />
          {channel.isFeatured ? (
            <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Featured
            </span>
          ) : null}
        </div>
      </div>
      <p
        className="mt-2 line-clamp-1 text-sm font-semibold group-hover:text-pop"
        title={channel.name}
      >
        {channel.name}
      </p>
    </Link>
  );
}

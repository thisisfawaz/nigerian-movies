"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * "Channels" nav dropdown. The channel order is reshuffled ONCE PER PAGE LOAD
 * (whenever the route/pathname changes), so navigating to another page gives a
 * fresh order while the current page stays stable.
 */
function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function ChannelsDropdown({
  channels
}: {
  channels: Array<{ name: string; slug: string }>;
}) {
  const pathname = usePathname();
  const [ordered, setOrdered] = useState(() => shuffle(channels));

  // Reshuffle on every page load (route change).
  useEffect(() => {
    setOrdered(shuffle(channels));
  }, [pathname, channels]);

  return (
    <div className="group relative">
      <button
        type="button"
        className="flex items-center gap-1 rounded-md px-4 py-1.5 text-muted transition-colors hover:bg-pop hover:text-pop-foreground"
      >
        Channels
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <ul className="max-h-[70vh] min-w-56 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-xl">
          {ordered.map((channel) => (
            <li key={channel.slug}>
              <Link
                href={`/channel/${channel.slug}`}
                onClick={(event) => event.currentTarget.blur()}
                className="block truncate px-4 py-2 text-sm text-muted transition-colors hover:bg-pop hover:text-pop-foreground"
              >
                {channel.name}
              </Link>
            </li>
          ))}
          <li className="border-t border-border">
            <Link
              href="/explore"
              onClick={(event) => event.currentTarget.blur()}
              className="block px-4 py-2 text-sm font-semibold text-pop hover:bg-pop hover:text-pop-foreground"
            >
              All channels
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

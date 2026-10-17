"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Instant navigation skeleton. On an internal link click we synchronously show
 * a skeleton whose SHAPE matches the destination route (so it transitions
 * cleanly into the real content — no generic "glitch" shape). It clears when
 * the destination route commits.
 *
 * The shapes mirror the app's own loading.tsx files.
 */
type Shape = "home" | "grid" | "channel" | "explore";

function shapeFor(pathname: string): Shape {
  if (pathname.startsWith("/channel/")) return "channel";
  if (pathname.startsWith("/explore")) return "explore";
  if (pathname.startsWith("/categories") || pathname.startsWith("/search")) return "grid";
  if (pathname.startsWith("/favourites")) return "grid";
  return "home";
}

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-hover ${className}`} />;
}

function Skeleton({ shape }: { shape: Shape }) {
  if (shape === "channel") {
    return (
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-10">
        <Bar className="h-5 w-24" />
        <div className="mt-3 flex items-center gap-3">
          <div className="h-12 w-12 animate-pulse rounded-lg bg-surface-hover" />
          <Bar className="h-7 w-56" />
        </div>
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_560px]">
          <div className="aspect-video animate-pulse rounded-card bg-surface-hover" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-card bg-surface-hover" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (shape === "explore") {
    return (
      <div className="mx-auto max-w-screen-2xl px-4 py-10 sm:px-6 lg:px-10">
        <Bar className="h-9 w-40" />
        <Bar className="mt-3 h-4 w-72" />
        <Bar className="mt-6 h-9 w-40" />
        <div className="mt-8 flex flex-wrap gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="w-40 flex-none sm:w-48">
              <div className="aspect-square animate-pulse rounded-card bg-surface-hover" />
              <Bar className="mt-2 h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (shape === "grid") {
    return (
      <div className="mx-auto max-w-screen-2xl px-4 py-10 sm:px-6 lg:px-10">
        <Bar className="h-9 w-56" />
        <Bar className="mt-3 h-4 w-72" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-card bg-surface-hover" />
          ))}
        </div>
      </div>
    );
  }

  // home
  return (
    <div className="mx-auto max-w-screen-2xl space-y-10 px-4 py-8 sm:px-6 lg:px-10">
      {Array.from({ length: 3 }).map((_, row) => (
        <div key={row}>
          <Bar className="mb-3 h-6 w-40" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-video w-[42vw] flex-none animate-pulse rounded-card bg-surface-hover lg:w-[38vw]"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeletonOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [shape, setShape] = useState<Shape | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const show = (s: Shape) => {
      setShape(s);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setShape(null), 8000);
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.getAttribute("target") === "_blank") return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      show(shapeFor(url.pathname));
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Clear once the destination route is committed.
  useEffect(() => {
    if (!shape) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShape(null), 120);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pathname, searchParams, shape]);

  if (!shape) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 top-[57px] z-[60] overflow-hidden bg-background"
    >
      <Skeleton shape={shape} />
    </div>
  );
}

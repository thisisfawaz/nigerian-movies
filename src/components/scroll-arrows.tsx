"use client";

import { useEffect, useRef, useState } from "react";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

/**
 * Adds click-to-scroll arrow buttons to a horizontally scrollable container so
 * devices without a scroll gesture (or users who prefer clicking) can page
 * through the content. The native scrollbar stays hidden.
 *
 * Usage:
 *   const { ref, Arrows } = useScrollArrows();
 *   <div className="relative">
 *     <ul ref={ref} className="no-scrollbar flex gap-4 overflow-x-auto">...</ul>
 *     <Arrows />
 *   </div>
 */
export function useScrollArrows() {
  const ref = useRef<HTMLElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft < maxScroll - 4);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const scrollBy = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  function Arrows() {
    return (
      <>
        {canScrollLeft ? (
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            className="absolute left-1 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 p-2 text-white backdrop-blur transition hover:bg-black/80 sm:flex"
          >
            <ChevronLeftIcon />
          </button>
        ) : null}
        {canScrollRight ? (
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            className="absolute right-1 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 p-2 text-white backdrop-blur transition hover:bg-black/80 sm:flex"
          >
            <ChevronRightIcon />
          </button>
        ) : null}
      </>
    );
  }

  return { ref, Arrows };
}

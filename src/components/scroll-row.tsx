"use client";

import { useEffect, useRef, useState } from "react";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

/**
 * A horizontal scroller with click-to-scroll arrow buttons. Devices without a
 * scroll gesture (or users who prefer clicking) can page through the content.
 * The native scrollbar stays hidden. The track is a <ul>; pass <li> children.
 */
export function ScrollRow({
  children,
  trackClassName = "",
  wrapperClassName = ""
}: {
  children: React.ReactNode;
  trackClassName?: string;
  wrapperClassName?: string;
}) {
  const ref = useRef<HTMLUListElement>(null);
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

  const arrowClass =
    "absolute top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 p-2 text-white shadow-lg backdrop-blur transition hover:bg-black/80 sm:flex";

  return (
    <div className={`relative ${wrapperClassName}`}>
      <ul ref={ref} className={`no-scrollbar flex overflow-x-auto ${trackClassName}`}>
        {children}
      </ul>

      {canScrollLeft ? (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollBy(-1)}
          className={`${arrowClass} left-1`}
        >
          <ChevronLeftIcon />
        </button>
      ) : null}

      {canScrollRight ? (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollBy(1)}
          className={`${arrowClass} right-1`}
        >
          <ChevronRightIcon />
        </button>
      ) : null}
    </div>
  );
}

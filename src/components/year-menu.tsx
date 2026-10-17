"use client";

import Link from "next/link";

import { ChevronRightIcon } from "@/components/icons";

/**
 * Year dropdown for the header. Lists recent years; selecting one opens the
 * year-filtered search page.
 */
export function YearMenu({ years }: { years: number[] }) {
  if (years.length === 0) return null;

  return (
    <div className="group relative">
      <button
        type="button"
        className="flex items-center gap-1 rounded-md px-4 py-1.5 text-muted transition-colors hover:bg-pop hover:text-pop-foreground"
      >
        Year
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="invisible absolute right-0 top-full z-50 pt-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <ul className="min-w-28 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-xl">
          {years.map((year) => (
            <li key={year}>
              <Link
                href={`/search?year=${year}`}
                className="block px-4 py-2 text-sm text-muted transition-colors hover:bg-pop hover:text-pop-foreground"
              >
                {year}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

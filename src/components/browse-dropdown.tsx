"use client";

import Link from "next/link";

export function BrowseDropdown({
  categories
}: {
  categories: Array<{ name: string; slug: string }>;
}) {
  if (categories.length === 0) return null;

  return (
    <div className="group relative">
      <button
        type="button"
        className="flex items-center gap-1 rounded-md px-4 py-1.5 text-muted transition-colors hover:bg-pop hover:text-pop-foreground"
      >
        Browse
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <ul className="min-w-48 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-xl">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/categories/${category.slug}`}
                onClick={(event) => event.currentTarget.blur()}
                className="block px-4 py-2 text-sm text-muted transition-colors hover:bg-pop hover:text-pop-foreground"
              >
                {category.name}
              </Link>
            </li>
          ))}
          <li className="border-t border-border">
            <Link
              href="/movies"
              onClick={(event) => event.currentTarget.blur()}
              className="block px-4 py-2 text-sm font-semibold text-pop hover:bg-pop hover:text-pop-foreground"
            >
              All movies
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

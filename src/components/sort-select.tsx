"use client";

import { useRouter } from "next/navigation";

/**
 * Compact sort dropdown. Navigates on change (preserving pagination reset) so
 * the server component re-fetches and the client cache revalidates — same data
 * flow as before, just a clearer control than inline links.
 */
export function SortSelect({
  value,
  basePath = "/explore"
}: {
  value: "recent" | "alphabetical";
  basePath?: string;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Sort:</span>
      <select
        value={value}
        onChange={(e) => {
          const sort = e.target.value;
          router.push(sort === "recent" ? basePath : `${basePath}?sort=${sort}`);
        }}
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      >
        <option value="recent">Recently added</option>
        <option value="alphabetical">A–Z</option>
      </select>
    </label>
  );
}

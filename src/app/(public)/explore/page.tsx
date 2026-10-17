import Link from "next/link";

import { ExploreChannels } from "@/components/explore-channels";
import { SortSelect } from "@/components/sort-select";
import { getCatalogueRepository } from "@/lib/repositories";

// Cached briefly so navigation is fast (prefetchable RSC). The channel list
// changes only on admin publish, so a short window is plenty fresh.
export const revalidate = 60;
export const metadata = { title: "Explore" };

const PAGE_SIZE = 12;

export default async function ExplorePage({
  searchParams
}: {
  searchParams: { sort?: string; page?: string };
}) {
  const repo = getCatalogueRepository();
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const sort = searchParams.sort === "alphabetical" ? "alphabetical" : "recent";

  const result = await repo.listChannels({ sort, page, pageSize: PAGE_SIZE });

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { sort, page: String(page), ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/explore?${qs}` : "/explore";
  };

  const apiQuery = new URLSearchParams({
    sort,
    page: String(page),
    pageSize: String(PAGE_SIZE)
  }).toString();

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-10 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-semibold">Explore</h1>
      <p className="mt-2 text-muted">Browse every published movie channel.</p>

      <div className="mt-6">
        <SortSelect value={sort} basePath="/explore" />
      </div>

      <div className="mt-8">
        <ExploreChannels
          cacheKey={`explore|${apiQuery}`}
          apiQuery={apiQuery}
          initial={result}
        />
      </div>

      {totalPages > 1 ? (
        <nav
          aria-label="Pagination"
          className="mt-10 flex items-center justify-center gap-2 text-sm"
        >
          {page > 1 ? (
            <Link
              href={buildHref({ page: String(page - 1) })}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 hover:bg-surface-hover"
            >
              Previous
            </Link>
          ) : null}
          <span className="text-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={buildHref({ page: String(page + 1) })}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 hover:bg-surface-hover"
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}

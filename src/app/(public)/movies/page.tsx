import Link from "next/link";
import { notFound } from "next/navigation";

import { MovieCard } from "@/components/movie-card";
import { getCatalogueRepository } from "@/lib/repositories";

export const revalidate = 60;

const PAGE_SIZE = 16;

export default async function AllMoviesPage({
  searchParams
}: {
  searchParams: { page?: string };
}) {
  const repo = getCatalogueRepository();
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);

  const result = await repo.listAllMovies(page, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  if (page > totalPages && result.total > 0) {
    notFound();
  }

  function buildHref(params: Record<string, string>) {
    const search = new URLSearchParams(params);
    return `/movies?${search.toString()}`;
  }

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-10 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-semibold">All Movies</h1>
      <p className="mt-2 text-muted">Browse our full catalogue of movies.</p>

      <div className="mt-8">
        {result.items.length === 0 ? (
          <div className="rounded-card border border-border bg-surface p-8 text-center text-muted">
            No movies found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {result.items.map((movie) => (
              <MovieCard key={movie.videoId} movie={movie} />
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm">
          {page > 1 ? (
            <Link
              href={buildHref({ page: String(page - 1) })}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 hover:bg-surface-hover"
            >
              Previous
            </Link>
          ) : null}
          <span className="px-2 text-muted">
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
        </div>
      ) : null}
    </main>
  );
}

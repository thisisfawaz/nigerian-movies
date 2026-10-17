import { MovieCard } from "@/components/movie-card";
import { EmptyState } from "@/components/ui";
import { getCatalogueRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams
}: {
  searchParams: { q?: string; year?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const year = Number(searchParams.year ?? "");
  const hasYear = Number.isInteger(year) && year > 1900 && year < 3000;

  const repo = getCatalogueRepository();
  let results = q ? await repo.searchVideos(q, 48) : [];
  if (!q && hasYear) {
    results = await repo.listMoviesByYear(year, 48);
  }

  const heading = q
    ? `${results.length} of videos for “${q}”`
    : hasYear
      ? `${results.length} movies from ${year}`
      : "Find any movie by title.";

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-10 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-black uppercase tracking-tight">
        {hasYear && !q ? `Movies · ${year}` : "Search"}
      </h1>
      <p className="mt-2 text-muted">{heading}</p>

      <div className="mt-8">
        {!q && !hasYear ? (
          <EmptyState title="Start typing to search movies" />
        ) : results.length === 0 ? (
          <EmptyState
            title="No movies found"
            description="Try a different title or year."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((movie) => (
              <MovieCard key={`${movie.channelId}-${movie.videoId}`} movie={movie} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

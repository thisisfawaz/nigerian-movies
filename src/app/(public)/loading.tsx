import { MovieBannerSkeleton, MoviePortraitSkeleton, ChannelRowSkeleton } from "@/components/loading";

/**
 * Skeleton for the home page and any public route without a more specific
 * loading.tsx. Mirrors the home layout: banner rows, a portrait row, and
 * channel rows.
 */
export default function Loading() {
  return (
    <main>
      <div className="mx-auto max-w-screen-2xl space-y-10 px-4 py-8 sm:px-6 lg:px-10">
        {/* Featured Movies banner */}
        <div>
          <div className="mb-3 h-6 w-40 animate-pulse rounded bg-surface-hover" />
          <MovieBannerSkeleton size="large" />
        </div>

        {/* Recently added banner */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="h-6 w-40 animate-pulse rounded bg-surface-hover" />
            <div className="h-4 w-20 animate-pulse rounded bg-surface-hover" />
          </div>
          <MovieBannerSkeleton size="compact" />
        </div>

        {/* Channel Teasers portrait row */}
        <div>
          <div className="mb-3 h-6 w-40 animate-pulse rounded bg-surface-hover" />
          <MoviePortraitSkeleton />
        </div>

        {/* Channels row */}
        <ChannelRowSkeleton />

        {/* More channels row */}
        <ChannelRowSkeleton />
      </div>
    </main>
  );
}

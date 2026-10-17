import { RowSkeleton } from "@/components/loading";

/**
 * Skeleton for the home page and any public route without a more specific
 * loading.tsx. Mirrors the home layout: banner rows, a portrait row, and
 * channel rows.
 */
export default function Loading() {
  return (
    <main>
      <div className="mx-auto max-w-screen-2xl space-y-10 px-4 py-8 sm:px-6 lg:px-10">
        <div>
          <div className="mb-3 h-6 w-40 animate-pulse rounded bg-surface-hover" />
          <RowSkeleton />
        </div>
        <div>
          <div className="mb-3 h-6 w-40 animate-pulse rounded bg-surface-hover" />
          <RowSkeleton />
        </div>
        <div>
          <div className="mb-3 h-6 w-40 animate-pulse rounded bg-surface-hover" />
          <RowSkeleton />
        </div>
      </div>
    </main>
  );
}

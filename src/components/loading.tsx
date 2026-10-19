/** Visible loading indicators (spinner + skeletons). */

export function InlineSpinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden="true"
    />
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-3 py-16 text-muted"
    >
      <span
        className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-brand"
        aria-hidden="true"
      />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function CardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-card border border-border bg-surface"
        >
          <div className="aspect-square animate-pulse bg-surface-hover" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-surface-hover" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-surface-hover" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-40 w-64 flex-none animate-pulse rounded-card bg-surface-hover"
        />
      ))}
    </div>
  );
}

export function MovieBannerSkeleton({ size = "large" }: { size?: "large" | "compact" }) {
  const cardWidth =
    size === "compact"
      ? "w-[64vw] flex-none snap-start sm:w-[38vw] lg:w-[27vw]"
      : "w-[86vw] flex-none snap-start sm:w-[46vw] lg:w-[42vw]";

  return (
    <div className="flex gap-4 overflow-x-hidden pb-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={cardWidth}>
          <div className="aspect-video animate-pulse rounded-card bg-surface-hover" />
        </div>
      ))}
    </div>
  );
}

export function MoviePortraitSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-hidden pb-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-36 flex-none snap-start sm:w-48">
          <div className="aspect-[3/4] animate-pulse rounded-card bg-surface-hover" />
        </div>
      ))}
    </div>
  );
}

export function ChannelRowSkeleton() {
  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-6 w-40 animate-pulse rounded bg-surface-hover" />
        <div className="h-4 w-24 animate-pulse rounded bg-surface-hover" />
      </div>
      <div className="flex gap-4 overflow-x-hidden px-1 py-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-40 flex-none sm:w-48">
            <div className="aspect-square animate-pulse rounded-card bg-surface-hover" />
            <div className="mt-2 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-hover" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-surface-hover" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

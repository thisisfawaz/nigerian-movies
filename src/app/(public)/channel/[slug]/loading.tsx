import { MovieBannerSkeleton } from "@/components/loading";

export default function Loading() {
  return (
    <main className="relative min-h-screen">
      {/* Backdrop placeholder */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-gradient-to-br from-brand/30 via-background to-accent/20"
      >
        <div className="absolute inset-0 bg-black/90" />
      </div>

      <div className="relative z-10 mx-auto max-w-screen-2xl px-4 pb-8 pt-0 sm:px-6 sm:pt-2 lg:px-10">
        {/* Player area */}
        <div className="relative -mx-4 w-[calc(100%+2rem)] sm:mx-auto sm:w-full sm:max-w-[calc(65vh*16/9)]">
          <div className="relative mx-auto aspect-video w-full overflow-hidden rounded-card border border-border bg-surface-hover animate-pulse" />
        </div>

        {/* Channel header */}
        <header className="mx-auto mt-4 flex w-full min-w-0 max-w-[calc(65vh*16/9)] flex-col gap-2 border-b border-white/10 pb-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-10 w-10 flex-none animate-pulse rounded-lg bg-surface-hover" />
            <div className="min-w-0 space-y-2">
              <div className="h-6 w-40 animate-pulse rounded bg-surface-hover" />
              <div className="h-3 w-28 animate-pulse rounded bg-surface-hover" />
            </div>
          </div>
          <div className="mt-2 flex min-w-0 items-center gap-2 sm:ml-auto sm:mt-0 sm:justify-end">
            <div className="h-8 w-8 animate-pulse rounded-full bg-surface-hover" />
            <div className="h-5 w-48 animate-pulse rounded bg-surface-hover" />
          </div>
        </header>

        {/* All Movies carousel */}
        <section className="min-w-0 mt-6">
          <div className="mb-3 h-6 w-32 animate-pulse rounded bg-surface-hover" />
          <MovieBannerSkeleton size="compact" />
        </section>
      </div>
    </main>
  );
}

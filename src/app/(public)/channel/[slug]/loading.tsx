import { Spinner } from "@/components/loading";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="h-40 w-full animate-pulse rounded-card bg-surface-hover sm:h-56" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="aspect-video animate-pulse rounded-card bg-surface-hover" />
        <Spinner label="Loading videos" />
      </div>
    </main>
  );
}

import { CardSkeletonGrid } from "@/components/loading";

/** Skeleton for a single category page (header + channel grid). */
export default function Loading() {
  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-10 sm:px-6 lg:px-10">
      <div className="h-9 w-56 animate-pulse rounded bg-surface-hover" />
      <div className="mt-3 h-4 w-72 animate-pulse rounded bg-surface-hover" />
      <div className="mt-8">
        <CardSkeletonGrid count={10} />
      </div>
    </main>
  );
}

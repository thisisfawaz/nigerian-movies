import { CardSkeletonGrid } from "@/components/loading";

/** Skeleton for the favourites page. */
export default function Loading() {
  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-10">
      <div className="h-8 w-40 animate-pulse rounded bg-surface-hover" />
      <div className="mt-2 h-4 w-64 animate-pulse rounded bg-surface-hover" />
      <div className="mt-8">
        <CardSkeletonGrid count={10} />
      </div>
    </main>
  );
}

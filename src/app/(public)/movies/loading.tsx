import { CardSkeletonGrid } from "@/components/loading";

export default function Loading() {
  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-10 sm:px-6 lg:px-10">
      <div className="h-9 w-40 animate-pulse rounded bg-surface-hover" />
      <div className="mt-2 h-5 w-72 animate-pulse rounded bg-surface-hover" />
      <div className="mt-8">
        <CardSkeletonGrid count={16} />
      </div>
    </main>
  );
}

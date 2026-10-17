import { CardSkeletonGrid } from "@/components/loading";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="h-8 w-40 animate-pulse rounded bg-surface-hover" />
      <div className="mt-8">
        <CardSkeletonGrid count={6} />
      </div>
    </main>
  );
}

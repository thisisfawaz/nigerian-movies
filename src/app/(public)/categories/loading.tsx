import { CardSkeletonGrid } from "@/components/loading";
export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <CardSkeletonGrid count={6} />
    </main>
  );
}

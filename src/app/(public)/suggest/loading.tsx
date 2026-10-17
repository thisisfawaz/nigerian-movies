import { Spinner } from "@/components/loading";

/** Skeleton for the suggest page. */
export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="h-9 w-56 animate-pulse rounded bg-surface-hover" />
      <div className="mt-3 h-4 w-80 animate-pulse rounded bg-surface-hover" />
      <div className="mt-6 h-64 animate-pulse rounded-card bg-surface-hover" />
      <Spinner label="Loading" />
    </main>
  );
}

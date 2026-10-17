import Link from "next/link";

import { Badge, EmptyState } from "@/components/ui";
import { getAdminClient } from "@/lib/supabase/clients";
import { SupabaseCatalogueRepository } from "@/lib/repositories/supabase-repository";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const repo = new SupabaseCatalogueRepository(getAdminClient());
  const categories = await repo.listCategories();

  // Real counts from the database (PRD §6.2).
  const client = getAdminClient();
  const countFor = async (status: string) => {
    const { count } = await client
      .from("channels")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    return count ?? 0;
  };

  const [published, drafts, pending, archived] = await Promise.all([
    countFor("published"),
    countFor("draft"),
    countFor("pending_review"),
    countFor("archived")
  ]);

  const { data: recent } = await client
    .from("channels")
    .select("id, name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    { label: "Published", value: published, tone: "success" as const },
    { label: "Drafts", value: drafts, tone: "neutral" as const },
    { label: "Pending review", value: pending, tone: "warning" as const },
    { label: "Archived", value: archived, tone: "danger" as const },
    { label: "Categories", value: categories.length, tone: "brand" as const }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Catalogue health at a glance. All figures come from the database.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <li
            key={stat.label}
            className="rounded-card border border-border bg-surface p-5"
          >
            <p className="text-sm text-muted">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
          </li>
        ))}
      </ul>

      <section>
        <h2 className="mb-3 text-lg font-medium">Recently added</h2>
        {!recent || recent.length === 0 ? (
          <EmptyState
            title="No channels yet"
            description="Add your first channel to get started."
          />
        ) : (
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {recent.map((row: { id: string; name: string; status: string }) => (
              <li key={row.id}>
                <Link
                  href={`/admin/channels/${row.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-surface-hover"
                >
                  <span>{row.name}</span>
                  <Badge
                    tone={
                      row.status === "published"
                        ? "success"
                        : row.status === "pending_review"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {row.status.replace("_", " ")}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

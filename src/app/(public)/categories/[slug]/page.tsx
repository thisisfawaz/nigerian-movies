import Link from "next/link";
import { notFound } from "next/navigation";

import { ChannelCard } from "@/components/channel-card";
import { EmptyState } from "@/components/ui";
import { getCatalogueRepository } from "@/lib/repositories";

// Cached briefly so navigation is fast (prefetchable RSC).
export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const repo = getCatalogueRepository();
  const category = await repo.getCategoryBySlug(params.slug);
  return { title: category?.name ?? "Category" };
}

export default async function CategoryPage({
  params
}: {
  params: { slug: string };
}) {
  const repo = getCatalogueRepository();
  const category = await repo.getCategoryBySlug(params.slug);
  if (!category || !category.isActive) notFound();

  const result = await repo.listChannels({
    categorySlug: params.slug,
    sort: "recent",
    pageSize: 48
  });

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-10 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-black uppercase tracking-tight">{category.name}</h1>
      {category.description ? (
        <p className="mt-2 text-muted">{category.description}</p>
      ) : null}

      <div className="mt-8">
        {result.items.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            description="No channels in this category so far. Check back soon."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {result.items.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

import Link from "next/link";

import { AddChannelForm } from "@/components/admin/add-channel-form";
import { getAdminClient } from "@/lib/supabase/clients";
import { SupabaseCatalogueRepository } from "@/lib/repositories/supabase-repository";
import { isAiEnabled } from "@/lib/env";

import { createChannelAction, suggestCategoriesAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add channel" };

export default async function AddChannelPage({
  searchParams
}: {
  searchParams: { error?: string };
}) {
  const repo = new SupabaseCatalogueRepository(getAdminClient());
  const categories = await repo.listCategories({ activeOnly: true });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/admin/channels" className="text-sm text-muted hover:text-foreground">
          ← Channels
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Add channel</h1>
        <p className="mt-1 text-sm text-muted">
          Paste a YouTube channel URL. YouFlix organizes it — it does not
          host or download any content.
        </p>
      </div>

      {searchParams.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {searchParams.error}
        </p>
      ) : null}

      <AddChannelForm
        categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
        aiEnabled={isAiEnabled}
        createAction={createChannelAction}
        suggestAction={suggestCategoriesAction}
      />
    </div>
  );
}

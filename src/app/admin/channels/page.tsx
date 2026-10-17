import Link from "next/link";

import { EditIcon, StarIcon, TrashIcon } from "@/components/icons";
import { ChannelFilterForm } from "@/components/admin/channel-filter-form";
import { SubmitButton, SubmitIconButton } from "@/components/submit-button";
import { Badge, Button, EmptyState } from "@/components/ui";
import { getAdminClient } from "@/lib/supabase/clients";

import {
  deleteChannelAction,
  refreshAllChannelsAction,
  setChannelStatusAction,
  toggleFeaturedAction
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Channels" };

const STATUSES = ["all", "draft", "pending_review", "published", "archived"] as const;

interface ChannelRow {
  id: string;
  name: string;
  status: string;
  is_featured: boolean;
}

export default async function ChannelsPage({
  searchParams
}: {
  searchParams: { status?: string; q?: string };
}) {
  const status = (STATUSES as readonly string[]).includes(searchParams.status ?? "")
    ? (searchParams.status as string)
    : "all";
  const q = (searchParams.q ?? "").trim();

  const client = getAdminClient();
  let query = client
    .from("channels")
    .select("id, name, status, is_featured")
    .order("created_at", { ascending: false });
  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.ilike("name", `%${q}%`);

  const { data, error } = await query;
  const rows = (data ?? []) as ChannelRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Channels</h1>
          <p className="mt-1 text-sm text-muted">Manage the catalogue.</p>
        </div>
        <div className="flex items-center gap-2">
          <form action={refreshAllChannelsAction}>
            <SubmitButton variant="secondary" pendingLabel="Refreshing all…">
              Refresh all channels
            </SubmitButton>
          </form>
          <Link href="/admin/channels/import">
            <Button variant="secondary">Import CSV</Button>
          </Link>
          <Link href="/admin/channels/new">
            <Button>Add channel</Button>
          </Link>
        </div>
      </div>

      <ChannelFilterForm statuses={STATUSES} defaultQ={q} defaultStatus={status} />

      {error ? (
        <p className="text-sm text-danger">Failed to load channels: {error.message}</p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No channels found"
          description="Try a different filter, or add a new channel."
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id} className="bg-surface/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/channels/${row.id}`}
                      className="font-medium hover:text-pop"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        row.status === "published"
                          ? "success"
                          : row.status === "pending_review"
                            ? "warning"
                            : row.status === "archived"
                              ? "danger"
                              : "neutral"
                      }
                    >
                      {row.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/admin/channels/${row.id}`}
                        aria-label={`Edit ${row.name}`}
                        title="Edit"
                        className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-foreground"
                      >
                        <EditIcon />
                      </Link>

                      <form action={toggleFeaturedAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <input
                          type="hidden"
                          name="featured"
                          value={row.is_featured ? "false" : "true"}
                        />
                        <SubmitIconButton
                          ariaLabel={row.is_featured ? "Unfeature" : "Feature"}
                          className={`rounded-md p-2 hover:bg-surface-hover ${
                            row.is_featured ? "text-brand" : "text-muted hover:text-foreground"
                          }`}
                        >
                          <StarIcon />
                        </SubmitIconButton>
                      </form>

                      <form action={setChannelStatusAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={row.status === "published" ? "draft" : "published"}
                        />
                        <SubmitButton variant="ghost" pendingLabel="Working…">
                          {row.status === "published" ? "Unpublish" : "Publish"}
                        </SubmitButton>
                      </form>

                      <form action={deleteChannelAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <SubmitIconButton
                          ariaLabel={`Delete ${row.name}`}
                          className="rounded-md p-2 text-muted hover:bg-danger/10 hover:text-danger"
                        >
                          <TrashIcon />
                        </SubmitIconButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

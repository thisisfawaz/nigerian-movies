import { SubmitButton } from "@/components/submit-button";
import { Badge, EmptyState } from "@/components/ui";
import { getAdminClient } from "@/lib/supabase/clients";

import { approveSuggestionAction, rejectSuggestionAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Suggestions" };

interface Row {
  id: string;
  youtube_channel_url: string;
  note: string | null;
  status: string;
  created_at: string;
}

export default async function SuggestionsPage({
  searchParams
}: {
  searchParams: { error?: string; rejected?: string };
}) {
  const client = getAdminClient();
  const { data } = await client
    .from("suggestions")
    .select("id, youtube_channel_url, note, status, created_at")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];
  const pending = rows.filter((r) => r.status === "pending");
  const reviewed = rows.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Channel suggestions</h1>
        <p className="mt-1 text-sm text-muted">
          Approve to create a draft channel, or reject to dismiss.
        </p>
      </div>

      {searchParams.error ? (
        <p className="text-sm text-danger">{searchParams.error}</p>
      ) : null}

      {pending.length === 0 ? (
        <EmptyState title="No pending suggestions" description="All caught up." />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Channel URL</th>
                <th className="px-4 py-3 font-medium">Note</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pending.map((row) => (
                <tr key={row.id} className="bg-surface/50">
                  <td className="px-4 py-3">
                    <a
                      href={row.youtube_channel_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-pop"
                    >
                      {row.youtube_channel_url}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-muted">{row.note ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <form action={approveSuggestionAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <SubmitButton pendingLabel="Approving…">Approve</SubmitButton>
                      </form>
                      <form action={rejectSuggestionAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <SubmitButton variant="ghost" pendingLabel="Rejecting…">
                          Reject
                        </SubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reviewed.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold">Reviewed</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {reviewed.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <span className="min-w-0 truncate">{row.youtube_channel_url}</span>
                <Badge tone={row.status === "approved" ? "success" : "danger"}>
                  {row.status}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

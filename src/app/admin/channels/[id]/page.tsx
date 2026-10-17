import Link from "next/link";
import { notFound } from "next/navigation";

import { EditableUrlField } from "@/components/admin/editable-url-field";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Input, Label, Select, Textarea } from "@/components/ui";
import { getAdminClient } from "@/lib/supabase/clients";
import { SupabaseCatalogueRepository } from "@/lib/repositories/supabase-repository";

import { refreshVideosAction, updateChannelAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit channel" };

export default async function ChannelDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { saved?: string; error?: string };
}) {
  const repo = new SupabaseCatalogueRepository(getAdminClient());
  const [channel, categories] = await Promise.all([
    repo.getChannelById(params.id),
    repo.listCategories({ activeOnly: true })
  ]);

  if (!channel) notFound();

  const assignedIds = new Set(channel.categories.map((c) => c.id));
  const primaryId = channel.categories.find((c) => c.isPrimary)?.id ?? "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/admin/channels" className="text-sm text-muted hover:text-foreground">
          ← Channels
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{channel.name}</h1>
          <Badge
            tone={
              channel.status === "published"
                ? "success"
                : channel.status === "pending_review"
                  ? "warning"
                  : "neutral"
            }
          >
            {channel.status.replace("_", " ")}
          </Badge>
        </div>
        <a
          href={channel.youtubeChannelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-sm text-muted hover:text-foreground"
        >
          View on YouTube ↗
        </a>
      </div>

      {searchParams.saved ? (
        <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          Changes saved.
        </p>
      ) : null}
      {searchParams.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {searchParams.error}
        </p>
      ) : null}

      <form action={updateChannelAction} className="space-y-5">
        <input type="hidden" name="id" value={channel.id} />

        <div>
          <Label htmlFor="name">Name *</Label>
          <Input id="name" name="name" defaultValue={channel.name} required />
        </div>

        <EditableUrlField defaultValue={channel.youtubeChannelUrl} />

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={channel.description ?? ""}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="languageCode">Language</Label>
            <Input
              id="languageCode"
              name="languageCode"
              defaultValue={channel.languageCode ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="countryCode">Country</Label>
            <Input
              id="countryCode"
              name="countryCode"
              defaultValue={channel.countryCode ?? ""}
            />
          </div>
        </div>

        <fieldset className="rounded-card border border-border bg-surface p-4">
          <legend className="px-1 text-sm font-medium">Categories</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map((category) => (
              <label key={category.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="categoryIds"
                  value={category.id}
                  defaultChecked={assignedIds.has(category.id)}
                  className="h-4 w-4 rounded border-border bg-background"
                />
                {category.name}
              </label>
            ))}
          </div>
          <div className="mt-3">
            <Label htmlFor="primaryCategoryId">Primary category</Label>
            <Select
              id="primaryCategoryId"
              name="primaryCategoryId"
              defaultValue={primaryId}
            >
              <option value="">None</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
        </fieldset>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={channel.status}>
            <option value="draft">Draft</option>
            <option value="pending_review">Pending review</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
        </div>

        <div className="flex gap-3">
          <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
        </div>
      </form>

      <form action={refreshVideosAction} className="rounded-card border border-border bg-surface p-4">
        <input type="hidden" name="id" value={channel.id} />
        <p className="text-sm font-medium">Video history</p>
        <p className="mt-1 text-xs text-muted">
          Fetch this channel’s full video list from YouTube.
        </p>
        <SubmitButton variant="secondary" pendingLabel="Refreshing…" className="mt-3">
          Refresh videos
        </SubmitButton>
      </form>
    </div>
  );
}

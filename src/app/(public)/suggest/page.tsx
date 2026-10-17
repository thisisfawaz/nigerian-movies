import Link from "next/link";
import { redirect } from "next/navigation";

import { SubmitButton } from "@/components/submit-button";
import { Input, Label, Textarea } from "@/components/ui";
import { getCurrentUser, getServerAuthClient } from "@/lib/supabase/server";

import { suggestChannelAction } from "./actions";

export const metadata = { title: "Suggest a channel" };

export default async function SuggestPage({
  searchParams
}: {
  searchParams: { error?: string; submitted?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fsuggest");

  const client = getServerAuthClient();
  const { data: mine } = client
    ? await client
        .from("suggestions")
        .select("id, youtube_channel_url, status, created_at")
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold">Suggest a channel</h1>
      <p className="mt-2 text-muted">
        Know a Nigerian movie channel we should add? Paste its YouTube URL and
        we&rsquo;ll review it.
      </p>

      {searchParams.submitted ? (
        <p className="mt-4 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          Thanks! Your suggestion was submitted for review.
        </p>
      ) : null}
      {searchParams.error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {searchParams.error}
        </p>
      ) : null}

      <form
        action={suggestChannelAction}
        className="mt-6 space-y-4 rounded-card border border-border bg-surface p-5"
      >
        <div>
          <Label htmlFor="youtubeChannelUrl">YouTube channel URL *</Label>
          <Input
            id="youtubeChannelUrl"
            name="youtubeChannelUrl"
            required
            placeholder="https://www.youtube.com/@channel"
          />
        </div>
        <div>
          <Label htmlFor="note">Note (optional)</Label>
          <Textarea id="note" name="note" rows={3} placeholder="Why should we add it?" />
        </div>
        <SubmitButton pendingLabel="Submitting…">Submit suggestion</SubmitButton>
      </form>

      {mine && mine.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Your suggestions</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {mine.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <span className="min-w-0 truncate">{s.youtube_channel_url}</span>
                <span
                  className={`flex-none rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.status === "approved"
                      ? "bg-success/15 text-success"
                      : s.status === "rejected"
                        ? "bg-danger/15 text-danger"
                        : "bg-surface-hover text-muted"
                  }`}
                >
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-8 text-center text-xs text-muted">
        <Link href="/" className="hover:text-foreground">
          ← Back home
        </Link>
      </p>
    </main>
  );
}

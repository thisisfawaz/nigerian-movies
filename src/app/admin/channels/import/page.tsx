import Link from "next/link";

import { SubmitButton } from "@/components/submit-button";
import { Label, Textarea } from "@/components/ui";

import { importChannelsAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import channels" };

export default function ImportChannelsPage({
  searchParams
}: {
  searchParams: {
    error?: string;
    done?: string;
    created?: string;
    skipped?: string;
    failed?: string;
    total?: string;
  };
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/admin/channels" className="text-sm text-muted hover:text-foreground">
          ← Channels
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Import channels</h1>
        <p className="mt-1 text-sm text-muted">
          Upload a CSV or paste channel URLs — one per line, or a CSV with a URL
          column. Each is added as a draft you can then categorise.
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

      {searchParams.done ? (
        <div className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          Imported {searchParams.created ?? "0"} of {searchParams.total ?? "0"}{" "}
          ({searchParams.skipped ?? "0"} already existed, {searchParams.failed ?? "0"} failed).
        </div>
      ) : null}

      <form
        action={importChannelsAction}
        className="space-y-5 rounded-card border border-border bg-surface p-5"
      >
        <div>
          <Label htmlFor="file">CSV file</Label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".csv,text/csv,text/plain"
            className="mt-1 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-hover file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground"
          />
        </div>

        <div>
          <Label htmlFor="csv">…or paste URLs</Label>
          <Textarea
            id="csv"
            name="csv"
            rows={8}
            placeholder={"https://www.youtube.com/@channel1\nhttps://www.youtube.com/@channel2"}
          />
        </div>

        <SubmitButton pendingLabel="Importing…">Import channels</SubmitButton>
      </form>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { InlineSpinner } from "@/components/loading";
import { Button } from "@/components/ui";

/**
 * Admin channel filter. A GET form navigates on submit; we drive it through
 * the router so we can show a spinner while the filtered page loads.
 */
export function ChannelFilterForm({
  statuses,
  defaultQ,
  defaultStatus
}: {
  statuses: readonly string[];
  defaultQ: string;
  defaultStatus: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(defaultQ);
  const [status, setStatus] = useState(defaultStatus);

  return (
    <form
      className="flex flex-wrap gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (status && status !== "all") params.set("status", status);
        const qs = params.toString();
        startTransition(() => {
          router.push(qs ? `/admin/channels?${qs}` : "/admin/channels");
        });
      }}
    >
      <input
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
      <select
        name="status"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
      >
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s === "all" ? "All statuses" : s.replace("_", " ")}
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary" disabled={pending} aria-busy={pending}>
        {pending ? <InlineSpinner /> : null}
        {pending ? "Filtering…" : "Filter"}
      </Button>
    </form>
  );
}

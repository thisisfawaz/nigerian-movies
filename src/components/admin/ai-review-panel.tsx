"use client";

import { useState, useTransition } from "react";

import { Button, Input } from "@/components/ui";
import type { AiClassification } from "@/lib/ai/schema";

interface Props {
  enabled: boolean;
  categories: Array<{ id: string; name: string; slug: string }>;
  getInput: () => { channelName: string; channelDescription: string | null; notes: string | null };
  onApply: (result: {
    categorySlugs: string[];
    primarySlug: string | null;
    description: string | null;
    tags: string[];
    languageCode: string | null;
  }) => void;
  runAction: (input: {
    channelName: string;
    channelDescription: string | null;
    notes: string | null;
  }) => Promise<{ ok: boolean; classification?: AiClassification; error?: string }>;
}

/**
 * AI suggestion panel (PRD §6.6, §7.5). AI output is a suggestion only; the
 * administrator reviews and applies it, and can ignore it entirely.
 */
export function AiReviewPanel({ enabled, categories, getInput, onApply, runAction }: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AiClassification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const slugToId = new Map(categories.map((c) => [c.slug, c.id]));
  const slugToName = new Map(categories.map((c) => [c.slug, c.name]));

  if (!enabled) {
    return (
      <div className="rounded-card border border-border bg-surface p-4 text-sm text-muted">
        AI categorization is disabled. You can classify channels manually.
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">AI suggestions</p>
          <p className="text-xs text-muted">
            Suggestions only — nothing is published without your approval.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => {
            setError(null);
            const input = getInput();
            startTransition(async () => {
              const res = await runAction({ ...input, notes: notes || null });
              if (!res.ok || !res.classification) {
                setError(res.error ?? "Classification failed. Classify manually.");
                setResult(null);
                return;
              }
              setResult(res.classification);
            });
          }}
        >
          {pending ? "Analyzing…" : "Suggest categories"}
        </Button>
      </div>

      <div className="mt-3">
        <label htmlFor="ai-notes" className="text-xs text-muted">
          Notes for the classifier (optional)
        </label>
        <Input
          id="ai-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. weekly interviews about startups"
        />
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 space-y-2 text-sm">
          <p>
            <span className="text-muted">Primary:</span>{" "}
            {result.primaryCategorySlug
              ? slugToName.get(result.primaryCategorySlug) ?? result.primaryCategorySlug
              : "uncertain"}
          </p>
          {result.secondaryCategorySlugs.length > 0 ? (
            <p>
              <span className="text-muted">Secondary:</span>{" "}
              {result.secondaryCategorySlugs
                .map((s) => slugToName.get(s) ?? s)
                .join(", ")}
            </p>
          ) : null}
          {result.description ? (
            <p>
              <span className="text-muted">Description:</span> {result.description}
            </p>
          ) : null}
          {result.tags.length > 0 ? (
            <p>
              <span className="text-muted">Tags:</span> {result.tags.join(", ")}
            </p>
          ) : null}
          {result.rationale ? (
            <p className="text-xs text-muted">Why: {result.rationale}</p>
          ) : null}
          {result.uncertainties.length > 0 ? (
            <p className="text-xs text-warning">
              Uncertain: {result.uncertainties.join("; ")}
            </p>
          ) : null}

          <Button
            type="button"
            onClick={() => {
              const slugs = [
                ...(result.primaryCategorySlug ? [result.primaryCategorySlug] : []),
                ...result.secondaryCategorySlugs
              ];
              onApply({
                categorySlugs: slugs,
                primarySlug: result.primaryCategorySlug,
                description: result.description,
                tags: result.tags,
                languageCode: result.languageCode
              });
            }}
          >
            Apply suggestions
          </Button>
          <p className="text-xs text-muted">
            Category matches found: {result.primaryCategorySlug ? 1 : 0} primary,{" "}
            {result.secondaryCategorySlugs.length} secondary.
            {slugToId.size === 0 ? " No categories available." : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}

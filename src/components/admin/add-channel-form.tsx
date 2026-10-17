"use client";

import { useRef, useState } from "react";

import { AiReviewPanel } from "@/components/admin/ai-review-panel";
import { SubmitButton } from "@/components/submit-button";
import { Input, Label, Select, Textarea } from "@/components/ui";
import type { AiClassification } from "@/lib/ai/schema";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  categories: Category[];
  aiEnabled: boolean;
  createAction: (formData: FormData) => Promise<void>;
  suggestAction: (input: {
    channelName: string;
    channelDescription: string | null;
    notes: string | null;
  }) => Promise<{ ok: boolean; classification?: AiClassification; error?: string }>;
}

export function AddChannelForm({ categories, aiEnabled, createAction, suggestAction }: Props) {
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [primary, setPrimary] = useState<string>("");
  const [tags, setTags] = useState("");
  const [language, setLanguage] = useState("");

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <form action={createAction} className="space-y-5">
      <div>
        <Label htmlFor="youtubeChannelUrl">YouTube channel URL *</Label>
        <Input
          id="youtubeChannelUrl"
          name="youtubeChannelUrl"
          required
          placeholder="https://www.youtube.com/@channel or /channel/UC…"
        />
      </div>

      <div>
        <Label htmlFor="name">Channel name</Label>
        <Input id="name" name="name" ref={nameRef} placeholder="Leave blank to use the handle" />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} ref={descriptionRef} />
      </div>


      <AiReviewPanel
        enabled={aiEnabled}
        categories={categories}
        getInput={() => ({
          channelName: nameRef.current?.value ?? "",
          channelDescription: descriptionRef.current?.value || null,
          notes: null
        })}
        runAction={suggestAction}
        onApply={(result) => {
          const ids = new Set<string>();
          for (const slug of result.categorySlugs) {
            const match = categories.find((c) => c.slug === slug);
            if (match) ids.add(match.id);
          }
          setSelected(ids);
          const primaryMatch = result.primarySlug
            ? categories.find((c) => c.slug === result.primarySlug)
            : null;
          setPrimary(primaryMatch?.id ?? "");
          if (result.tags.length > 0) setTags(result.tags.join(", "));
          if (result.languageCode) setLanguage(result.languageCode);
          if (result.description && descriptionRef.current) {
            descriptionRef.current.value = result.description;
          }
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="languageCode">Language</Label>
          <Input
            id="languageCode"
            name="languageCode"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="en"
          />
        </div>
        <div>
          <Label htmlFor="countryCode">Country</Label>
          <Input id="countryCode" name="countryCode" placeholder="US" />
        </div>
      </div>

      <div>
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          name="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="comma, separated, tags"
        />
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
                checked={selected.has(category.id)}
                onChange={() => toggle(category.id)}
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
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
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
        <Select id="status" name="status" defaultValue="draft">
          <option value="draft">Draft</option>
          <option value="pending_review">Pending review</option>
          <option value="published">Published</option>
        </Select>
      </div>

      <SubmitButton pendingLabel="Saving…">Save channel</SubmitButton>
    </form>
  );
}

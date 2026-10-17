"use client";

import { useState } from "react";

import { Input, Label } from "@/components/ui";

/**
 * A YouTube channel URL field that is read-only until the admin clicks Edit.
 * Prevents accidental edits to the URL, which re-derives the channel id,
 * uploads playlist, and embed URL on save.
 */
export function EditableUrlField({ defaultValue }: { defaultValue: string }) {
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label htmlFor="youtubeChannelUrl">YouTube channel URL</Label>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-pop hover:underline"
          >
            Edit
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs font-semibold text-muted hover:text-foreground"
          >
            Cancel
          </button>
        )}
      </div>

      <Input
        id="youtubeChannelUrl"
        name="youtubeChannelUrl"
        defaultValue={defaultValue}
        readOnly={!editing}
        aria-readonly={!editing}
        placeholder="https://www.youtube.com/@channel"
        className={!editing ? "cursor-not-allowed opacity-70" : ""}
      />

      <p className="mt-1 text-xs text-muted">
        {editing
          ? "Changing this re-derives the channel id, uploads playlist, and embed URL."
          : "Click Edit to change this URL."}
      </p>
    </div>
  );
}

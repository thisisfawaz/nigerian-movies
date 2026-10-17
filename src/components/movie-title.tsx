import { cleanTitle, formatPublishedAt } from "@/lib/titles";

/**
 * Renders a cleaned (ALL CAPS) movie title, with the publish date in brackets
 * in smaller, muted text, e.g. OUT OF TIME (Jan 5, 2026).
 */
export function MovieTitle({
  title,
  publishedAt
}: {
  title: string;
  publishedAt?: string | null;
}) {
  const date = formatPublishedAt(publishedAt);
  return (
    <>
      {cleanTitle(title)}
      {date ? (
        <span className="ml-1 text-[0.8em] font-normal text-muted">({date})</span>
      ) : null}
    </>
  );
}

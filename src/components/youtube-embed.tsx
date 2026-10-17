interface YoutubeEmbedProps {
  /** Validated embed URL generated from trusted templates only. */
  embedUrl: string | null;
  title: string;
  /** Original YouTube URL, offered when embedding is unavailable. */
  youtubeUrl: string;
}

/**
 * Responsive YouTube embed (PRD §5.4, §10). When no embeddable resource is
 * available we show a clear fallback with a link to YouTube rather than a
 * broken player. We never render arbitrary HTML.
 */
export function YoutubeEmbed({ embedUrl, title, youtubeUrl }: YoutubeEmbedProps) {
  if (!embedUrl) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-card border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted">
          This channel can’t be played inside YouFlix. Open it on YouTube to
          watch episodes.
        </p>
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          Watch on YouTube ↗
        </a>
      </div>
    );
  }

  return (
    <div className="aspect-video overflow-hidden rounded-card border border-border bg-black">
      <iframe
        src={embedUrl}
        title={title}
        className="h-full w-full"
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

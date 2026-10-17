import Link from "next/link";
import { notFound } from "next/navigation";

import { ChannelArtwork } from "@/components/channel-artwork";
import { ChannelVideoGrid } from "@/components/channel-video-grid";
import { ExternalLinkIcon } from "@/components/icons";
import { getCatalogueRepository } from "@/lib/repositories";

// Cached with a short revalidation window so navigations are fast (the RSC
// payload is prefetchable). Channel data changes only on admin sync, so a
// 60s window is plenty fresh.
export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const repo = getCatalogueRepository();
  const channel = await repo.getChannelBySlug(params.slug);
  if (!channel) return { title: "Channel not found" };
  return {
    title: channel.name,
    description: channel.description ?? undefined,
    alternates: { canonical: `/channel/${channel.slug}` }
  };
}

export default async function ChannelDetailPage({
  params
}: {
  params: { slug: string };
}) {
  const repo = getCatalogueRepository();
  const channel = await repo.getChannelBySlug(params.slug);
  if (!channel) notFound();

  const videos = await repo.listChannelVideos(channel.id);

  // Ambient backdrop image: prefer the wide cover, fall back to the avatar.
  const backdropUrl = channel.coverUrl ?? channel.thumbnailUrl ?? null;

  return (
    <main className="relative min-h-screen">
      {/* Fixed background: does not scroll, sits behind content. Uses a real
          <img> (not a CSS background) so we can set referrerPolicy=no-referrer,
          which YouTube's CDN requires. A dark overlay keeps text legible; if the
          image fails we still get the brand gradient, never a bare flat black. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {backdropUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backdropUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-brand/30 via-background to-accent/20" />
        )}
        <div className="absolute inset-0 bg-black/90" />
      </div>

      <div className="relative z-10 mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-10">
        <Link href="/explore" className="text-sm text-muted hover:text-foreground">
          ← Explore
        </Link>

        {/* Channel name at the top, before the video */}
        <header className="mb-5 mt-3 flex items-center gap-3">
          <span className="relative h-12 w-12 flex-none overflow-hidden rounded-lg border border-border bg-surface">
            <ChannelArtwork channel={channel} priority sizes="48px" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold sm:text-3xl" title={channel.name}>
              {channel.name}
            </h1>
            <a
              href={channel.youtubeChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
            >
              <ExternalLinkIcon /> View on YouTube
            </a>
          </div>
        </header>

        {videos.length > 0 ? (
          <ChannelVideoGrid
            channelSlug={channel.slug}
            channelName={channel.name}
            videos={videos.map((v) => ({
              videoId: v.videoId,
              title: v.title,
              thumbnailUrl: v.thumbnailUrl,
              isShort: v.isShort,
              publishedAt: v.publishedAt
            }))}
          />
        ) : (
          <div className="rounded-card border border-border bg-surface p-6 text-sm text-muted">
            No videos available yet. Add or refresh this channel from the admin
            dashboard, or view it directly on YouTube.
          </div>
        )}

        {channel.description ? (
          <p className="mt-8 text-sm leading-relaxed text-muted">
            {channel.description}
          </p>
        ) : null}
      </div>
    </main>
  );
}

import { PageSkeletonOverlay } from "@/components/page-skeleton-overlay";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PendingFavouritesFlush } from "@/components/pending-favourites-flush";
import { ToastProvider } from "@/components/toast";

export default function PublicLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      {/* Full-height column: content grows so the footer stays at the bottom
          even on short pages (e.g. an empty favourites list). */}
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
      <PendingFavouritesFlush />
      <PageSkeletonOverlay />
    </ToastProvider>
  );
}

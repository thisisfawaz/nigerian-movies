import Link from "next/link";

import { BrowseDropdown } from "@/components/browse-dropdown";
import { ChannelsDropdown } from "@/components/channels-dropdown";
import { HeartIcon, PlusIcon } from "@/components/icons";
import { MobileNav } from "@/components/mobile-nav";
import { SearchInput } from "@/components/search-input";
import { YearMenu } from "@/components/year-menu";
import { UserMenu } from "@/components/user-menu";
import { getCatalogueRepository } from "@/lib/repositories";
import { getCurrentProfile } from "@/lib/supabase/server";

export async function SiteHeader() {
  const repo = getCatalogueRepository();
  const [categoriesResult, channelsResult, profile] = await Promise.all([
    repo.listCategories({ activeOnly: true }).catch(() => []),
    repo.listChannels({ sort: "recent", pageSize: 50 }).catch(() => ({ items: [] })),
    getCurrentProfile().catch(() => null)
  ]);
  const categories = categoriesResult.map((c) => ({ name: c.name, slug: c.slug }));

  // Channels for the dropdown, randomized on each server render (per load).
  const channelList = channelsResult.items.map((c) => ({ name: c.name, slug: c.slug }));
  const shuffledChannels = [...channelList];
  for (let i = shuffledChannels.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledChannels[i], shuffledChannels[j]] = [shuffledChannels[j], shuffledChannels[i]];
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - i);

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-6 lg:px-10">
        <MobileNav
          categories={categories}
          channels={shuffledChannels}
          years={years}
          profile={
            profile
              ? { displayName: profile.display_name, avatarUrl: profile.avatar_url }
              : null
          }
        />

        <Link href="/" className="text-xl font-black uppercase tracking-tight">
          You<span className="text-pop">Flix</span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 text-sm font-semibold lg:flex"
        >
          <BrowseDropdown categories={categories} />
          <ChannelsDropdown channels={shuffledChannels} />
          <Link
            href="/favourites"
            className="flex items-center gap-1.5 rounded-md px-4 py-1.5 text-muted transition-colors hover:bg-pop hover:text-pop-foreground"
          >
            <HeartIcon className="h-4 w-4" />
            Favourites
          </Link>
          <Link
            href="/suggest"
            className="flex items-center gap-1.5 rounded-md px-4 py-1.5 text-muted transition-colors hover:bg-pop hover:text-pop-foreground"
          >
            <PlusIcon className="h-4 w-4" />
            Suggest Channels
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden lg:block">
            <YearMenu years={years} />
          </div>
          <SearchInput />
          <div className="hidden lg:block">
            {profile ? (
              <UserMenu
                name={profile.display_name}
                email={null}
                avatarUrl={profile.avatar_url}
              />
            ) : (
              <Link
                href="/login"
                className="whitespace-nowrap rounded-md border border-border px-4 py-1.5 text-sm font-semibold hover:bg-surface-hover"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

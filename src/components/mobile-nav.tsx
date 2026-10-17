"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  CalendarIcon,
  ChevronRightIcon,
  CloseIcon,
  FilmIcon,
  GridIcon,
  HeartIcon,
  MenuIcon,
  PlusIcon,
  UserIcon
} from "@/components/icons";
import { InlineSpinner } from "@/components/loading";
import { getBrowserClient } from "@/lib/supabase/browser";

/**
 * Mobile navigation drawer. Hamburger opens a slide-in panel. Tapping the
 * backdrop (anywhere outside the panel) or any item closes it. The profile
 * item at the bottom opens a drop-up with Favourites + Sign out.
 */
export function MobileNav({
  categories,
  channels,
  years,
  profile
}: {
  categories: Array<{ name: string; slug: string }>;
  channels: Array<{ name: string; slug: string }>;
  years: number[];
  profile: { displayName: string | null; avatarUrl: string | null } | null;
}) {
  const firstName = profile?.displayName?.trim().split(/\s+/)[0] ?? null;
  const initial = (profile?.displayName?.trim()?.[0] ?? "?").toUpperCase();

  const [open, setOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Close on route change (item click navigates).
  useEffect(() => {
    setOpen(false);
    setBrowseOpen(false);
    setChannelsOpen(false);
    setYearOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Prevent body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Reliable outside-click close: any mousedown/touchstart outside the panel
  // closes the drawer. This does not depend on overlay stacking or bubbling.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (panelRef.current && target && !panelRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const client = getBrowserClient();
      await client?.auth.signOut();
    } catch {
      // Ignore; refresh below reflects reality.
    }
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  const itemClass =
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-hover";

  // Channels are reshuffled once per page load (route change).
  const [orderedChannels, setOrderedChannels] = useState(() => [...channels]);

  useEffect(() => {
    const copy = [...channels];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setOrderedChannels(copy);
  }, [pathname, channels]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-surface-hover"
      >
        <MenuIcon />
      </button>

      {open ? (
        // Full-screen layer. A click on it (outside the panel) closes the
        // drawer; the panel stops propagation so taps inside don't close it.
        <div
          className="fixed inset-0 z-[120] bg-black/60"
          onClick={() => {
            setOpen(false);
            setAccountOpen(false);
          }}
        >
          <nav
            ref={panelRef}
            aria-label="Mobile"
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-y-0 left-0 flex h-dvh w-72 max-w-[85vw] flex-col gap-1 border-r border-border bg-surface p-4 shadow-xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <Link href="/" className="text-lg font-black uppercase tracking-tight">
                You<span className="text-pop">Flix</span>
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-foreground"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Browse (expandable) */}
            <button
              type="button"
              onClick={() => setBrowseOpen((v) => !v)}
              aria-expanded={browseOpen}
              className={itemClass}
            >
              <GridIcon className="h-4 w-4 text-muted" />
              Browse
              <ChevronRightIcon
                className={`ml-auto h-4 w-4 text-muted transition-transform ${
                  browseOpen ? "rotate-90" : ""
                }`}
              />
            </button>
            {browseOpen ? (
              <ul className="ml-3 space-y-0.5 border-l border-border pl-3">
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/categories/${c.slug}`}
                      onClick={() => setOpen(false)}
                      className="block rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-hover hover:text-foreground"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}

            {/* Year (expandable) */}
            <button
              type="button"
              onClick={() => setYearOpen((v) => !v)}
              aria-expanded={yearOpen}
              className={itemClass}
            >
              <CalendarIcon className="h-4 w-4 text-muted" />
              Year
              <ChevronRightIcon
                className={`ml-auto h-4 w-4 text-muted transition-transform ${
                  yearOpen ? "rotate-90" : ""
                }`}
              />
            </button>
            {yearOpen ? (
              <ul className="ml-3 space-y-0.5 border-l border-border pl-3">
                {years.map((y) => (
                  <li key={y}>
                    <Link
                      href={`/search?year=${y}`}
                      onClick={() => setOpen(false)}
                      className="block rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-hover hover:text-foreground"
                    >
                      {y}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}

            {/* Channels (expandable) */}
            <button
              type="button"
              onClick={() => setChannelsOpen((v) => !v)}
              aria-expanded={channelsOpen}
              className={itemClass}
            >
              <FilmIcon className="h-4 w-4 text-muted" />
              Channels
              <ChevronRightIcon
                className={`ml-auto h-4 w-4 text-muted transition-transform ${
                  channelsOpen ? "rotate-90" : ""
                }`}
              />
            </button>
            {channelsOpen ? (
              <ul className="ml-3 space-y-0.5 border-l border-border pl-3">
                {orderedChannels.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/channel/${c.slug}`}
                      onClick={() => setOpen(false)}
                      className="block truncate rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-hover hover:text-foreground"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/explore"
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-3 py-2 text-sm font-semibold text-pop hover:bg-surface-hover"
                  >
                    All channels
                  </Link>
                </li>
              </ul>
            ) : null}
            <Link href="/favourites" onClick={() => setOpen(false)} className={itemClass}>
              <HeartIcon className="h-4 w-4 text-muted" />
              Favourites
            </Link>
            <Link href="/suggest" onClick={() => setOpen(false)} className={itemClass}>
              <PlusIcon className="h-4 w-4 text-muted" />
              Suggest Channels
            </Link>

            <div className="relative mt-auto border-t border-border pt-3">
              {profile ? (
                <>
                  {/* Drop-up menu, opens above the profile item. */}
                  {accountOpen ? (
                    <div
                      role="menu"
                      className="absolute bottom-full left-0 mb-2 w-full overflow-hidden rounded-card border border-border bg-surface shadow-xl"
                    >
                      <Link
                        href="/favourites"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-hover"
                      >
                        My Favourites
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={signingOut}
                        onClick={signOut}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-surface-hover disabled:opacity-60"
                      >
                        {signingOut ? <InlineSpinner /> : null}
                        {signingOut ? "Signing out…" : "Sign out"}
                      </button>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={accountOpen}
                    onClick={() => setAccountOpen((v) => !v)}
                    className={`${itemClass} w-full`}
                  >
                    <span className="flex h-7 w-7 flex-none items-center justify-center overflow-hidden rounded-full border border-border bg-surface-hover text-xs font-semibold">
                      {profile.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profile.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span>{initial}</span>
                      )}
                    </span>
                    {firstName ?? "Account"}
                    <ChevronRightIcon
                      className={`ml-auto h-4 w-4 text-muted transition-transform ${
                        accountOpen ? "-rotate-90" : "rotate-90"
                      }`}
                    />
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={() => setOpen(false)} className={itemClass}>
                  <UserIcon className="h-4 w-4 text-muted" />
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}

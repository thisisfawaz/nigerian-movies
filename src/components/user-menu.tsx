"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { InlineSpinner } from "@/components/loading";
import { getBrowserClient } from "@/lib/supabase/browser";

export function UserMenu({
  name,
  email,
  avatarUrl
}: {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const label = name?.trim() || email || "Account";
  const initial = (name?.trim()?.[0] ?? email?.[0] ?? "?").toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-sm font-semibold hover:bg-surface-hover"
        title={label}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span>{initial}</span>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-card border border-border bg-surface shadow-lg"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium">{label}</p>
            {email ? <p className="truncate text-xs text-muted">{email}</p> : null}
          </div>
          <Link
            href="/favourites"
            role="menuitem"
            className="block px-4 py-2 text-sm hover:bg-surface-hover"
            onClick={() => setOpen(false)}
          >
            My Favourites
          </Link>
          <Link
            href="/history"
            role="menuitem"
            className="block px-4 py-2 text-sm hover:bg-surface-hover"
            onClick={() => setOpen(false)}
          >
            Watch History
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={signingOut}
            aria-busy={signingOut}
            onClick={async () => {
              if (signingOut) return;
              setSigningOut(true);
              try {
                const client = getBrowserClient();
                await client?.auth.signOut();
              } catch {
                // Ignore: we still refresh below so the UI reflects reality.
              }
              router.push("/");
              router.refresh();
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-surface-hover disabled:opacity-60"
          >
            {signingOut ? <InlineSpinner /> : null}
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

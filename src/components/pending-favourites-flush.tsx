"use client";

import { useEffect, useRef } from "react";

import { useToast } from "@/components/toast";
import { flushPendingFavourites, isSignedIn } from "@/lib/favourites";

/**
 * After sign-in, applies any favourites the visitor queued while signed out and
 * shows a notice. Runs once per page load; silently no-ops when signed out or
 * nothing is queued.
 */
export function PendingFavouritesFlush() {
  const toast = useToast();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    let cancelled = false;
    (async () => {
      if (!(await isSignedIn())) return;
      const added = await flushPendingFavourites();
      if (!cancelled && added > 0) {
        toast(added === 1 ? "Added to favourites" : `Added ${added} to favourites`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  return null;
}

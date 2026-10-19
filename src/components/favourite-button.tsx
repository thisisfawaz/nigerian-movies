"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useToast } from "@/components/toast";
import { cleanTitle } from "@/lib/titles";
import {
  addFavourite,
  isFavourite,
  isSignedIn,
  onFavouritesChanged,
  queuePendingFavourite,
  removeFavourite,
  type FavouriteMovie
} from "@/lib/favourites";

/**
 * Heart toggle for a movie. Requires sign-in: tapping while signed out shows
 * an in-page sign-in prompt. Adding is instant; REMOVING asks for confirmation
 * to prevent accidental loss. Dialogs render in a PORTAL to body so they sit
 * outside any enclosing <Link> (a form inside an anchor is invalid HTML).
 */
export function FavouriteButton({
  movie,
  className = ""
}: {
  movie: FavouriteMovie;
  className?: string;
}) {
  const [active, setActive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMounted(true);
    isFavourite(movie.videoId).then((v) => {
      if (!cancelled) setActive(v);
    });
    const off = onFavouritesChanged(() => {
      isFavourite(movie.videoId).then((v) => {
        if (!cancelled) setActive(v);
      });
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [movie.videoId]);

  // Close dialogs on Escape.
  useEffect(() => {
    if (!showPrompt && !showRemoveConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPrompt(false);
        setShowRemoveConfirm(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showPrompt, showRemoveConfirm]);

  const doRemove = async () => {
    setShowRemoveConfirm(false);
    setBusy(true);
    const prev = active;
    setActive(false); // optimistic
    try {
      await removeFavourite(movie.videoId);
      toast("Removed from favourites");
    } catch {
      setActive(prev);
    } finally {
      setBusy(false);
    }
  };

  const doAdd = async () => {
    setBusy(true);
    const prev = active;
    setActive(true); // optimistic
    try {
      await addFavourite(movie);
      toast("Added to favourites");
    } catch {
      setActive(prev);
      setShowPrompt(true);
    } finally {
      setBusy(false);
    }
  };

  const onClick = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;

    // Signed out: remember the intent, then prompt to sign in.
    if (!(await isSignedIn())) {
      queuePendingFavourite(movie);
      setShowPrompt(true);
      return;
    }

    // Removing is destructive -> confirm first. Adding is immediate.
    if (active) {
      setShowRemoveConfirm(true);
      return;
    }
    await doAdd();
  };

  // Avoid a hydration mismatch: render the neutral state until mounted.
  const isOn = mounted && active;

  const signInModal =
    showPrompt && portalReady
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fav-signin-title"
            onClick={() => setShowPrompt(false)}
          >
            <div
              className="w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="fav-signin-title" className="text-lg font-semibold">
                Sign in to add favourites
              </h2>
              <p className="mt-2 text-sm text-muted">
                You need to be signed in before a movie can be saved to your
                favourites.
              </p>

              <div className="mt-5">
                <GoogleSignInButton next={typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/'} />
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPrompt(false);
                }}
                className="mt-3 w-full rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                Not now
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  const removeConfirmModal =
    showRemoveConfirm && portalReady
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fav-remove-title"
            onClick={() => setShowRemoveConfirm(false)}
          >
            <div
              className="w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="fav-remove-title" className="text-lg font-semibold">
                Remove from favourites?
              </h2>
              <p className="mt-2 text-sm text-muted">
                This removes “{cleanTitle(movie.title)}” from your favourites.
              </p>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowRemoveConfirm(false);
                  }}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void doRemove();
                  }}
                  className="flex-1 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-danger-foreground hover:opacity-90"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isOn}
        aria-label={isOn ? "Remove from favourites" : "Add to favourites"}
        title={isOn ? "Remove from favourites" : "Add to favourites"}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70 ${
          isOn ? "text-brand" : ""
        } ${className}`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill={isOn ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
      </button>
      {signInModal}
      {removeConfirmModal}
    </>
  );
}

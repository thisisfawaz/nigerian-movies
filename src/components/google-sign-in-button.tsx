"use client";

import { useState } from "react";

import { getBrowserClient } from "@/lib/supabase/browser";

/** Official Google "G" mark, in brand colors. */
function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

/**
 * Starts Google OAuth from the browser using createBrowserClient. The browser
 * client stores the PKCE code-verifier cookie natively, which /auth/callback
 * needs to exchange the code for a session. Starting OAuth from a server action
 * loses that verifier, which silently breaks the exchange and causes a sign-in
 * loop.
 */
export function GoogleSignInButton({
  next = "/",
  label = "Continue with Google"
}: {
  next?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    setError(null);
    const client = getBrowserClient();
    if (!client) {
      setError("Sign-in isn't configured on this deployment.");
      setBusy(false);
      return;
    }
    const base = window.location.origin;
    const redirectTo = `${base}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: oauthError } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, queryParams: { prompt: "select_account" } }
    });
    if (oauthError) {
      setError("Google sign-in is unavailable. It may not be enabled yet.");
      setBusy(false);
    }
    // On success the browser navigates away; nothing else to do.
  };

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#dadce0] bg-white px-4 py-2 text-sm font-medium text-[#3c4043] shadow-sm transition-colors hover:bg-[#f8f9fa] disabled:opacity-60"
      >
        <GoogleGlyph />
        {busy ? "Redirecting…" : label}
      </button>
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

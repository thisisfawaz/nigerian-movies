import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams
}: {
  searchParams: { error?: string; next?: string };
}) {
  // Already signed in? Nothing to do here.
  const user = await getCurrentUser();
  if (user) redirect(searchParams.next?.startsWith("/") ? searchParams.next : "/");

  const next = searchParams.next?.startsWith("/") ? searchParams.next : "/";

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-16">
      <Link href="/" className="text-center text-xl font-black uppercase tracking-tight">
        You<span className="text-pop">Flix</span>
      </Link>
      <h1 className="mt-4 text-center text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-center text-sm text-muted">
        Sign in to save favourites and suggest channels.
      </p>

      {searchParams.error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {searchParams.error}
        </p>
      ) : null}

      {!isSupabaseConfigured ? (
        <p className="mt-6 rounded-card border border-border bg-surface p-4 text-sm text-muted">
          Sign-in isn’t configured on this deployment yet.
        </p>
      ) : (
        <div className="mt-6 rounded-card border border-border bg-surface p-5">
          <GoogleSignInButton next={next} />
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted">
        By signing in you agree to our{" "}
        <Link href="/terms" className="underline hover:text-foreground">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}

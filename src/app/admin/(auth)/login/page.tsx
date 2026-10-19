import Link from "next/link";

import { GoogleSignInButton } from "@/components/google-sign-in-button";

export const metadata = { title: "Admin sign in" };

export default function LoginPage({
  searchParams
}: {
  searchParams: { error?: string; next?: string };
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <Link href="/" className="text-center text-xl font-black uppercase tracking-tight">
        You<span className="text-pop">Flix</span>
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Admin sign in</h1>
      <p className="mt-1 text-sm text-muted">Sign in with Google to manage the catalogue.</p>

      {searchParams.error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {searchParams.error}
        </p>
      ) : null}

      <div className="mt-6 space-y-4 rounded-card border border-border bg-surface p-5">
        <GoogleSignInButton next="/admin" label="Sign in with Google" />
      </div>
    </main>
  );
}

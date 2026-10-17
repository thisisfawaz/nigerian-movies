import Link from "next/link";

import { SubmitButton } from "@/components/submit-button";
import { Input, Label } from "@/components/ui";

import { loginAction } from "./actions";

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
      <p className="mt-1 text-sm text-muted">Sign in to manage the catalogue.</p>

      {searchParams.error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {searchParams.error}
        </p>
      ) : null}

      <form action={loginAction} className="mt-6 space-y-4 rounded-card border border-border bg-surface p-5">
        <input type="hidden" name="next" value={searchParams.next ?? "/admin"} />
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </form>
    </main>
  );
}

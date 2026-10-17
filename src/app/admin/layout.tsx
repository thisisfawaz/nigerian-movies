import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "./actions";
import { Button } from "@/components/ui";
import { getAdminUser } from "@/lib/supabase/server";
import { isAdminEnabled } from "@/lib/env";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/channels", label: "Channels" },
  { href: "/admin/channels/new", label: "Add channel" },
  { href: "/admin/suggestions", label: "Suggestions" },
  { href: "/admin/categories", label: "Categories" }
];

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  if (!isAdminEnabled) redirect("/");

  const user = await getAdminUser();
  // The login route renders outside this shell because it lives in a route
  // group; unauthenticated users are redirected to it by middleware.
  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-6 lg:px-10">
          <Link href="/admin" className="text-xl font-black uppercase tracking-tight">
            You<span className="text-pop">Flix</span>{" "}
            <span className="text-brand">admin</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-1 text-sm font-semibold">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-4 py-1.5 text-muted transition-colors hover:bg-pop hover:text-pop-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{user.email}</span>
            <form action={logoutAction}>
              <Button type="submit" variant="secondary">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}

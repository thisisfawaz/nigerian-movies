import { redirect } from "next/navigation";

import { ClearHistoryButton } from "@/components/clear-history-button";
import { HistoryList } from "@/components/history-list";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata = { title: "Watch History" };

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fhistory");

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Watch History</h1>
          <p className="mt-2 text-muted">The last 40 movies you chose to watch.</p>
        </div>
        <ClearHistoryButton />
      </div>
      <HistoryList />
    </main>
  );
}

import { redirect } from "next/navigation";

import { FavouritesList } from "@/components/favourites-list";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata = { title: "Favourites" };

export default async function FavouritesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Ffavourites");

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-semibold">Favourites</h1>
      <p className="mt-2 text-muted">Movies you saved to watch later.</p>
      <FavouritesList />
    </main>
  );
}

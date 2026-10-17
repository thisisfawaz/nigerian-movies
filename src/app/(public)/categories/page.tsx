import { redirect } from "next/navigation";

export const metadata = { title: "Categories" };

// Categories are intentionally not used in the current YouFlix experience.
// The route is kept so old links do not break; visitors are sent to Explore.
export default function CategoriesPage() {
  redirect("/explore");
}

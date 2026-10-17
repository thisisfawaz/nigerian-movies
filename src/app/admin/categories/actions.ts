"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminClient } from "@/lib/supabase/clients";
import { SupabaseCatalogueRepository } from "@/lib/repositories/supabase-repository";
import { getAdminUser } from "@/lib/supabase/server";
import { isAdminEnabled } from "@/lib/env";
import { slugify } from "@/lib/youtube/url";

async function requireAdmin() {
  if (!isAdminEnabled) throw new Error("Admin is not enabled.");
  const user = await getAdminUser();
  if (!user) throw new Error("Unauthorized.");
}

function repo() {
  return new SupabaseCatalogueRepository(getAdminClient());
}

/**
 * Category changes affect every surface that lists categories: the admin
 * channel forms (add + edit), and the public Browse dropdown rendered in the
 * site header on all public routes. Revalidate them so the lists stay in sync.
 */
function revalidateCategoryConsumers() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/channels/new");
  revalidatePath("/admin/channels/[id]", "page");
  // Public header (Browse dropdown) + category landing pages.
  revalidatePath("/", "layout");
  revalidatePath("/categories");
  revalidatePath("/categories/[slug]", "page");
}

export async function createCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/admin/categories?error=Name%20is%20required");
  try {
    await repo().createCategory({
      name,
      slug: slugify(name),
      description: String(formData.get("description") ?? "").trim() || null,
      sortOrder: Number(formData.get("sortOrder") ?? 0) || 0
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create category.";
    redirect(`/admin/categories?error=${encodeURIComponent(message)}`);
  }

  // redirect() must run outside try/catch (it throws NEXT_REDIRECT).
  revalidateCategoryConsumers();
  redirect("/admin/categories?saved=1");
}

export async function updateCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  try {
    await repo().updateCategory(id, {
      name: String(formData.get("name") ?? "").trim() || undefined,
      description: String(formData.get("description") ?? "").trim() || null,
      sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
      isActive: String(formData.get("isActive") ?? "") === "true"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update category.";
    redirect(`/admin/categories?error=${encodeURIComponent(message)}`);
  }

  // redirect() must run outside try/catch (it throws NEXT_REDIRECT).
  revalidateCategoryConsumers();
  redirect("/admin/categories?saved=1");
}

/**
 * Delete a category. Refuses when any channel still references it, so channel
 * assignments are never silently orphaned. Admins can deactivate instead, or
 * reassign channels first.
 */
export async function deleteCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const client = getAdminClient();
  const { count, error: countError } = await client
    .from("channel_categories")
    .select("channel_id", { count: "exact", head: true })
    .eq("category_id", id);
  if (countError) {
    redirect(
      `/admin/categories?error=${encodeURIComponent(
        `Could not check category usage: ${countError.message}`
      )}`
    );
  }
  if ((count ?? 0) > 0) {
    redirect(
      `/admin/categories?error=${encodeURIComponent(
        `This category is assigned to ${count} channel(s). Reassign them or mark it inactive instead.`
      )}`
    );
  }

  try {
    await repo().deleteCategory(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete category.";
    redirect(`/admin/categories?error=${encodeURIComponent(message)}`);
  }

  // redirect() must run outside try/catch (it throws NEXT_REDIRECT).
  revalidateCategoryConsumers();
  redirect("/admin/categories?saved=1");
}

/**
 * Move a category one position up or down. Reads the current order, swaps the
 * target with its neighbour, and persists contiguous sort_order values.
 */
export async function moveCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) return;

  const repository = repo();
  const ordered = (await repository.listCategories()).map((c) => c.id);
  const index = ordered.indexOf(id);
  if (index === -1) return;

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= ordered.length) return; // already at an end

  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

  try {
    await repository.reorderCategories(ordered);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reorder categories.";
    redirect(`/admin/categories?error=${encodeURIComponent(message)}`);
  }

  revalidateCategoryConsumers();
  redirect("/admin/categories?saved=1");
}

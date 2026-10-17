import { SubmitButton } from "@/components/submit-button";
import { Badge, Button, EmptyState, Input, Label } from "@/components/ui";
import { getAdminClient } from "@/lib/supabase/clients";
import { SupabaseCatalogueRepository } from "@/lib/repositories/supabase-repository";

import {
  createCategoryAction,
  deleteCategoryAction,
  moveCategoryAction,
  updateCategoryAction
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories" };

export default async function CategoriesPage({
  searchParams
}: {
  searchParams: { saved?: string; error?: string };
}) {
  const repo = new SupabaseCatalogueRepository(getAdminClient());
  const categories = await repo.listCategories();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="mt-1 text-sm text-muted">
          Create, reorder, and deactivate categories. Deactivated categories are
          hidden from the public site but preserved for existing channels.
        </p>
      </div>

      {searchParams.saved ? (
        <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          Saved.
        </p>
      ) : null}
      {searchParams.error ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {searchParams.error}
        </p>
      ) : null}

      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="text-lg font-medium">Add category</h2>
        <form action={createCategoryAction} className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <Label htmlFor="new-name">Name *</Label>
            <Input id="new-name" name="name" required />
          </div>
          <div className="sm:col-span-1">
            <Label htmlFor="new-desc">Description</Label>
            <Input id="new-desc" name="description" />
          </div>
          <div className="sm:col-span-1">
            <Label htmlFor="new-order">Sort order</Label>
            <Input id="new-order" name="sortOrder" type="number" defaultValue={0} />
          </div>
          <div className="sm:col-span-3">
            <SubmitButton pendingLabel="Adding…">Add category</SubmitButton>
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">All categories</h2>
        {categories.length === 0 ? (
          <EmptyState title="No categories yet" />
        ) : (
          <ul className="space-y-3">
            {categories.map((category, index) => (
              <li
                key={category.id}
                className="rounded-card border border-border bg-surface p-4"
              >
                <form
                  action={updateCategoryAction}
                  className="grid gap-3 sm:grid-cols-12 sm:items-end"
                >
                  <input type="hidden" name="id" value={category.id} />
                  <div className="sm:col-span-4">
                    <Label htmlFor={`name-${category.id}`}>Name</Label>
                    <Input
                      id={`name-${category.id}`}
                      name="name"
                      defaultValue={category.name}
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <Label htmlFor={`desc-${category.id}`}>Description</Label>
                    <Input
                      id={`desc-${category.id}`}
                      name="description"
                      defaultValue={category.description ?? ""}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Label htmlFor={`order-${category.id}`}>Order</Label>
                    <Input
                      id={`order-${category.id}`}
                      name="sortOrder"
                      type="number"
                      defaultValue={category.sortOrder}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor={`active-${category.id}`}>Status</Label>
                    <select
                      id={`active-${category.id}`}
                      name="isActive"
                      defaultValue={category.isActive ? "true" : "false"}
                      className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  <div className="sm:col-span-1">
                    <SubmitButton variant="secondary" pendingLabel="Saving…" className="w-full">
                      Save
                    </SubmitButton>
                  </div>
                </form>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <Badge tone={category.isActive ? "success" : "neutral"}>
                    {category.isActive ? "active" : "inactive"}
                  </Badge>
                  <span>slug: {category.slug}</span>

                  <span className="ml-auto flex items-center gap-1">
                    <form action={moveCategoryAction}>
                      <input type="hidden" name="id" value={category.id} />
                      <input type="hidden" name="direction" value="up" />
                      <Button
                        type="submit"
                        variant="secondary"
                        className="px-2 py-1"
                        disabled={index === 0}
                        aria-label={`Move ${category.name} up`}
                      >
                        ↑
                      </Button>
                    </form>
                    <form action={moveCategoryAction}>
                      <input type="hidden" name="id" value={category.id} />
                      <input type="hidden" name="direction" value="down" />
                      <Button
                        type="submit"
                        variant="secondary"
                        className="px-2 py-1"
                        disabled={index === categories.length - 1}
                        aria-label={`Move ${category.name} down`}
                      >
                        ↓
                      </Button>
                    </form>
                    <form action={deleteCategoryAction}>
                      <input type="hidden" name="id" value={category.id} />
                      <Button
                        type="submit"
                        variant="danger"
                        className="px-2 py-1"
                        aria-label={`Delete ${category.name}`}
                      >
                        Delete
                      </Button>
                    </form>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

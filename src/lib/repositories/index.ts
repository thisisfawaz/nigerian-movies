import "server-only";

import { getDataMode } from "@/lib/env";
import { getPublicClient } from "@/lib/supabase/clients";
import { StaticFileRepository } from "@/lib/repositories/static-repository";
import { SupabaseCatalogueRepository } from "@/lib/repositories/supabase-repository";
import type { MutableCatalogueRepository } from "@/lib/repositories/types";

/**
 * Returns the active read-only catalogue repository.
 *
 * - `supabase` mode when a Supabase URL + anon key are configured.
 * - `static` mode otherwise, reading from data/catalogue.json.
 *
 * This never throws for missing configuration, so the app runs with zero keys.
 */
export function getCatalogueRepository(): MutableCatalogueRepository {
  if (getDataMode() === "supabase") {
    return new SupabaseCatalogueRepository(getPublicClient());
  }
  return new StaticFileRepository();
}

export type {
  CatalogueRepository,
  MutableCatalogueRepository
} from "@/lib/repositories/types";

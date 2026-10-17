import { NextResponse } from "next/server";

import { getCatalogueRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") ?? "";
  if (!slug) return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  try {
    const repo = getCatalogueRepository();
    const category = await repo.getCategoryBySlug(slug);
    if (!category) return NextResponse.json({ category: null, channels: [] });
    const result = await repo.listChannels({ categorySlug: slug, sort: "recent", pageSize: 48 });
    return NextResponse.json({ category, channels: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load category." },
      { status: 500 }
    );
  }
}

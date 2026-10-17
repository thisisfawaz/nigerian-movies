import { NextResponse } from "next/server";

import { getCatalogueRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const sort = searchParams.get("sort") === "alphabetical" ? "alphabetical" : "recent";
  const categorySlug = searchParams.get("category") ?? undefined;
  const pageSize = Number(searchParams.get("pageSize") ?? 12) || 12;

  try {
    const repo = getCatalogueRepository();
    const result = await repo.listChannels({ sort, page, pageSize, categorySlug });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load channels." },
      { status: 500 }
    );
  }
}

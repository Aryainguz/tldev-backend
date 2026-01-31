import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const cursor = searchParams.get("cursor");
  const category = searchParams.get("category");
  const categories = searchParams.get("categories")?.split(",").filter(Boolean);

  try {
    const where: Record<string, unknown> = {
      status: "published",
    };

    if (category) {
      where.category = category;
    } else if (categories?.length) {
      where.category = { in: categories };
    }

    const tips = await prisma.tip.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        tipText: true,
        tipSummary: true,
        codeSnippet: true,
        category: true,
        tags: true,
        image: true,
        viewMore: true,
        likesCount: true,
        savesCount: true,
        viewsCount: true,
        createdAt: true,
      },
    });

    let nextCursor: string | undefined;
    if (tips.length > limit) {
      const nextItem = tips.pop();
      nextCursor = nextItem?.id;
    }

    const formattedTips = tips.map((tip) => ({
      id: tip.id,
      tip_text: tip.tipText,
      tip_summary: tip.tipSummary,
      code_snippet: tip.codeSnippet,
      category: tip.category,
      tags: tip.tags,
      image: tip.image,
      view_more: tip.viewMore,
      likes_count: tip.likesCount,
      saves_count: tip.savesCount,
      views_count: tip.viewsCount,
      created_at: tip.createdAt,
    }));

    return NextResponse.json({
      items: formattedTips,
      nextCursor,
    });
  } catch (error) {
    console.error("Error fetching tips:", error);
    return NextResponse.json(
      { error: "Failed to fetch tips" },
      { status: 500 }
    );
  }
}

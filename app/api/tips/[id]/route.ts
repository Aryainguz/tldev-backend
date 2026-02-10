import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const tip = await prisma.tip.findUnique({
      where: { id },
      select: {
        id: true,
        tipText: true,
        tipSummary: true,
        tipDetail: true,
        codeSnippet: true,
        category: true,
        tags: true,
        image: true,
        likesCount: true,
        savesCount: true,
        viewsCount: true,
        source: true,
        aiModel: true,
        createdAt: true,
      },
    });

    if (!tip) {
      return NextResponse.json({ error: "Tip not found" }, { status: 404 });
    }

    await prisma.tip.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });

    return NextResponse.json({
      id: tip.id,
      tip_text: tip.tipText,
      tip_summary: tip.tipSummary,
      tip_detail: tip.tipDetail,
      code_snippet: tip.codeSnippet,
      category: tip.category,
      tags: tip.tags,
      image: tip.image,
      likes_count: tip.likesCount,
      saves_count: tip.savesCount,
      views_count: tip.viewsCount + 1,
      source: tip.source,
      ai_model: tip.aiModel,
      created_at: tip.createdAt,
    });
  } catch (error) {
    console.error("Error fetching tip:", error);
    return NextResponse.json({ error: "Failed to fetch tip" }, { status: 500 });
  }
}

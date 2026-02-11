import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  try {
    const tip = await prisma.tip.findUnique({
      where: { id, status: "published" },
      select: {
        id: true,
        tipText: true,
        tipSummary: true,
        tipDetail: true,
        codeSnippet: true,
        category: true,
        tags: true,
        image: true,
        createdAt: true,
      },
    });

    if (!tip) {
      return NextResponse.json({ error: "Tip not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: tip.id,
      tip_text: tip.tipText,
      tip_summary: tip.tipSummary,
      tip_detail: tip.tipDetail,
      code_snippet: tip.codeSnippet,
      category: tip.category,
      tags: tip.tags,
      image: tip.image,
      created_at: tip.createdAt,
    });
  } catch (error) {
    console.error("Error fetching tip:", error);
    return NextResponse.json(
      { error: "Failed to fetch tip" },
      { status: 500 },
    );
  }
}

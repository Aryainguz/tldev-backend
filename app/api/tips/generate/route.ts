import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTips } from "@/lib/ai";
import { getUnsplashImage } from "@/lib/unsplash";
import { searchViewMoreLink } from "@/lib/search";

export async function POST(request: NextRequest) {
  const adminKey = process.env.ADMIN_API_KEY;
  const authHeader = request.headers.get("x-admin-key");

  if (adminKey && authHeader !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { count = 1, category, publish = false } = body;

    const aiResult = await generateTips(
      Math.min(count, 5),
      category ? [category] : undefined,
    );

    if (aiResult.error || aiResult.tips.length === 0) {
      return NextResponse.json(
        { error: aiResult.error || "Failed to generate tips" },
        { status: 500 },
      );
    }

    const generatedTips = [];

    for (const tip of aiResult.tips) {
      const [image, viewMore] = await Promise.all([
        getUnsplashImage(tip.category),
        searchViewMoreLink(tip.tip_text, tip.category),
      ]);

      if (publish) {
        const savedTip = await prisma.tip.create({
          data: {
            tipText: tip.tip_text,
            tipSummary: tip.tip_summary,
            tipDetail: tip.tip_detail,
            codeSnippet: tip.code_snippet,
            category: tip.category,
            tags: tip.tags,
            image: image ? JSON.parse(JSON.stringify(image)) : undefined,
            viewMore: viewMore
              ? JSON.parse(JSON.stringify(viewMore))
              : undefined,
            source: "ai",
            status: "published",
            aiModel: aiResult.model,
          },
        });

        generatedTips.push({
          ...tip,
          id: savedTip.id,
          image,
          view_more: viewMore,
          status: "published",
        });
      } else {
        generatedTips.push({
          ...tip,
          image,
          view_more: viewMore,
          status: "preview",
        });
      }
    }

    return NextResponse.json({
      success: true,
      tips: generatedTips,
      model: aiResult.model,
      published: publish,
    });
  } catch (error) {
    console.error("Error generating tips:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

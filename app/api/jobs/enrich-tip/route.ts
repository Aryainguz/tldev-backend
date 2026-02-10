import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUnsplashImage } from "@/lib/unsplash";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const adminKey = process.env.ADMIN_API_KEY;

  const isAuthorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (adminKey && authHeader === `Bearer ${adminKey}`);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tipId } = body;

    if (!tipId) {
      return NextResponse.json({ error: "tipId is required" }, { status: 400 });
    }

    console.log(`[enrich-tip] Starting enrichment for tip: ${tipId}`);

    const tip = await prisma.tip.findUnique({
      where: { id: tipId },
    });

    if (!tip) {
      return NextResponse.json({ error: "Tip not found" }, { status: 404 });
    }

    // Idempotency check: If already published with image, skip
    if (tip.status === "published" && tip.image) {
      console.log(`[enrich-tip] Tip ${tipId} already enriched, skipping`);
      return NextResponse.json({
        success: true,
        tipId,
        skipped: true,
        message: "Tip already enriched and published",
        durationMs: Date.now() - startTime,
      });
    }

    console.log(`[enrich-tip] Fetching image for: ${tip.category}`);

    const image = await getUnsplashImage(tip.category).catch((err) => {
      console.error(`[enrich-tip] Unsplash error for ${tipId}:`, err);
      return null;
    });

    const updatedTip = await prisma.tip.update({
      where: { id: tipId },
      data: {
        image: image ? (image as any) : tip.image, // Keep existing if fetch failed
        status: "published", // Mark as published
      },
    });

    const durationMs = Date.now() - startTime;
    console.log(`[enrich-tip] Tip ${tipId} enriched in ${durationMs}ms`);

    return NextResponse.json({
      success: true,
      tipId,
      status: updatedTip.status,
      hasImage: !!updatedTip.image,
      durationMs,
    });
  } catch (error) {
    console.error("[enrich-tip] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint to enrich all draft tips
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const adminKey = process.env.ADMIN_API_KEY;

  const isAuthorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (adminKey && authHeader === `Bearer ${adminKey}`);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const draftTips = await prisma.tip.findMany({
      where: { status: "draft" },
      select: { id: true, category: true, tipText: true },
      take: 10,
    });

    if (draftTips.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No draft tips to enrich",
        enriched: 0,
        durationMs: Date.now() - startTime,
      });
    }

    console.log(`[enrich-tip] Found ${draftTips.length} draft tips to enrich`);

    const batchSize = 3;
    const results: PromiseSettledResult<any>[] = [];

    for (let i = 0; i < draftTips.length; i += batchSize) {
      const batch = draftTips.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(async (tip) => {
          const image = await getUnsplashImage(tip.category).catch(() => null);

          return prisma.tip.update({
            where: { id: tip.id },
            data: {
              image: image ? (image as any) : undefined,
              status: "published",
            },
          });
        }),
      );
      results.push(...batchResults);

      if (i + batchSize < draftTips.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.filter((r) => r.status === "rejected").length;

    const durationMs = Date.now() - startTime;
    console.log(
      `[enrich-tip] Batch complete: ${successCount} success, ${failCount} failed in ${durationMs}ms`,
    );

    return NextResponse.json({
      success: true,
      enriched: successCount,
      failed: failCount,
      total: draftTips.length,
      durationMs,
    });
  } catch (error) {
    console.error("[enrich-tip] Batch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

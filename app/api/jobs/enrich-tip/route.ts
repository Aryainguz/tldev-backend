/**
 * BACKGROUND JOB: Enrich Tip
 *
 * This endpoint enriches a single tip with:
 * - Unsplash image
 * - Updates status from "draft" to "published"
 *
 * DESIGN PRINCIPLES:
 * - Idempotent: Safe to retry if failed
 * - Parallelizable: Can run multiple instances concurrently
 * - Fast: Only handles one tip at a time
 * - Decoupled: Does not trigger push notifications
 *
 * TRIGGER:
 * - Called after generate-tips cron completes
 * - Can be called manually for retry
 * - Can be fan-out triggered from orchestration
 *
 * This separation ensures network calls (Unsplash) don't
 * block the main AI generation cron job.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUnsplashImage } from "@/lib/unsplash";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Authenticate - can use CRON_SECRET or ADMIN_API_KEY
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

    // Fetch the tip
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

    // Fetch image for the tip
    console.log(`[enrich-tip] Fetching image for: ${tip.category}`);

    const image = await getUnsplashImage(tip.category).catch((err) => {
      console.error(`[enrich-tip] Unsplash error for ${tipId}:`, err);
      return null;
    });

    // Update the tip with enriched data
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
 * Useful for batch processing or retry scenarios
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Authenticate
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
    // Find all draft tips that need enrichment
    const draftTips = await prisma.tip.findMany({
      where: { status: "draft" },
      select: { id: true, category: true, tipText: true },
      take: 10, // Reduced limit to prevent timeout (was 50)
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

    // Process tips sequentially with small batches to avoid rate limits
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

      // Small delay between batches to avoid rate limiting
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

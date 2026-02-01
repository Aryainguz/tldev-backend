/**
 * CRON JOB: Generate AI Tips (FAST)
 *
 * This endpoint is designed to be cron-safe on Vercel (< 30s execution).
 *
 * RESPONSIBILITIES:
 * - Authenticate via CRON_SECRET
 * - Call generateTips() for AI content generation
 * - Persist tips with status: "draft" and jobId
 * - Create/update job tracking records
 *
 * WHAT THIS DOES NOT DO (by design):
 * - NO Unsplash image fetching (moved to enrich-tip job)
 * - NO web search for view more links (moved to enrich-tip job)
 * - NO push notifications (moved to send-daily-push cron)
 *
 * This separation ensures:
 * 1. Fast execution under Vercel's 60s limit
 * 2. Retry-safety (AI generation is idempotent)
 * 3. Decoupled concerns for better observability
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTips } from "@/lib/ai";

// Generate 5 tips per cron run - runs 6x daily for 30 tips total
const TIPS_PER_DAY = 20;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log("[generate-tips] Cron job started");

  // Authenticate via CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log("[generate-tips] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Create job record for tracking
  const job = await prisma.job.create({
    data: {
      status: "running",
      summary: { started: new Date().toISOString(), phase: "ai_generation" },
    },
  });

  console.log(`[generate-tips] Job created: ${job.id}`);

  const errors: Array<{ step: string; error: string }> = [];

  try {
    // Step 1: Generate tips via AI (this is the only heavy operation)
    console.log("[generate-tips] Starting AI generation...");
    const aiResult = await generateTips(TIPS_PER_DAY);
    console.log(`[generate-tips] AI generated ${aiResult.tips.length} tips`);

    if (aiResult.error || aiResult.tips.length === 0) {
      errors.push({
        step: "ai_generation",
        error: aiResult.error || "No tips generated",
      });

      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "failed",
          finishedAt: new Date(),
          errors: errors,
          summary: {
            started: job.startedAt,
            finished: new Date().toISOString(),
            model: aiResult.model,
            successCount: 0,
            failCount: TIPS_PER_DAY,
            durationMs: Date.now() - startTime,
          },
        },
      });

      console.log("[generate-tips] Job failed: No tips generated");
      return NextResponse.json(
        { success: false, jobId: job.id, errors },
        { status: 500 },
      );
    }

    // Step 2: Persist all tips as drafts (fast batch operation)
    // Tips are created with status: "draft" - enrichment happens separately
    console.log("[generate-tips] Persisting tips as drafts...");

    const tipCreatePromises = aiResult.tips.map((generatedTip) =>
      prisma.tip.create({
        data: {
          tipText: generatedTip.tip_text,
          tipSummary: generatedTip.tip_summary,
          tipDetail: generatedTip.tip_detail,
          codeSnippet: generatedTip.code_snippet,
          category: generatedTip.category,
          tags: generatedTip.tags,
          // NO image - will be added by enrich-tip job
          // NO viewMore - will be added by enrich-tip job
          source: "ai",
          status: "draft", // Draft until enriched
          aiModel: aiResult.model,
          jobId: job.id,
        },
      }),
    );

    const createdTips = await Promise.all(tipCreatePromises);
    const successCount = createdTips.length;

    console.log(`[generate-tips] Created ${successCount} draft tips`);

    // Step 3: Update job status
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "completed",
        finishedAt: new Date(),
        tipsCount: successCount,
        summary: {
          started: job.startedAt,
          finished: new Date().toISOString(),
          model: aiResult.model,
          successCount,
          failCount: 0,
          totalGenerated: aiResult.tips.length,
          durationMs: Date.now() - startTime,
          phase: "ai_complete",
          note: "Tips created as drafts. Run enrich-tip jobs to publish.",
        },
      },
    });

    const durationMs = Date.now() - startTime;
    console.log(`[generate-tips] Job completed in ${durationMs}ms`);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      summary: {
        successCount,
        failCount: 0,
        totalGenerated: aiResult.tips.length,
        model: aiResult.model,
        durationMs,
        tipIds: createdTips.map((t) => t.id),
      },
      // Hint for orchestration: these tips need enrichment
      nextStep: "Call POST /api/jobs/enrich-tip for each tipId to publish",
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[generate-tips] Job failed after ${durationMs}ms:`, error);

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errors: [
          {
            step: "main",
            error: error instanceof Error ? error.message : "Unknown error",
          },
        ],
        summary: {
          started: job.startedAt,
          finished: new Date().toISOString(),
          durationMs,
        },
      },
    });

    return NextResponse.json(
      {
        success: false,
        jobId: job.id,
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs,
      },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTips } from "@/lib/ai";

const TIPS_PER_BATCH = 7;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log("[generate-tips] Cron job started");

  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log("[generate-tips] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await prisma.job.create({
    data: {
      status: "running",
      summary: { started: new Date().toISOString(), phase: "ai_generation" },
    },
  });

  console.log(`[generate-tips] Job created: ${job.id}`);

  const errors: Array<{ step: string; error: string }> = [];

  try {
    console.log("[generate-tips] Starting AI generation...");
    const aiResult = await generateTips(TIPS_PER_BATCH);
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
            failCount: TIPS_PER_BATCH,
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
          source: "ai",
          status: "draft",
          aiModel: aiResult.model,
          jobId: job.id,
        },
      }),
    );

    const createdTips = await Promise.all(tipCreatePromises);
    const successCount = createdTips.length;

    console.log(`[generate-tips] Created ${successCount} draft tips`);

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

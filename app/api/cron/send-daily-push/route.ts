/**
 * CRON JOB: Send Daily Push Notifications
 *
 * This endpoint sends push notifications for the daily tips.
 * It is completely decoupled from content generation.
 *
 * RESPONSIBILITIES:
 * - Authenticate via CRON_SECRET
 * - Fetch latest published tips (up to 15)
 * - Send ONE push notification per user about available tips
 * - Track sent notifications to prevent duplicates
 * - Handle invalid tokens gracefully
 *
 * DESIGN PRINCIPLES:
 * - Idempotent: Uses DailyPush model to prevent duplicate sends per day
 * - Safe: Does not block content generation
 * - Batched: Uses Expo's chunking for efficient delivery
 * - Observable: Logs and tracks all operations
 *
 * IMPORTANT:
 * - This is separate from admin push (/api/notifications/send)
 * - Admin push allows arbitrary payloads; this only sends daily tip notifications
 * - Daily limit: 15 tips per day (matching generation)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification, formatTipNotification } from "@/lib/push";
import { Expo } from "expo-server-sdk";

// Get today's date string in YYYY-MM-DD format
function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const today = getTodayDateString();
  console.log(`[send-daily-push] Cron started for date: ${today}`);

  // Authenticate via CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log("[send-daily-push] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // IDEMPOTENCY CHECK: Has push already been sent today?
    const existingPush = await prisma.dailyPush.findUnique({
      where: { date: today },
    });

    if (existingPush && existingPush.status === "completed") {
      console.log(
        `[send-daily-push] Push already sent today (${today}), skipping`
      );
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `Daily push already sent for ${today}`,
        existingPush: {
          sentCount: existingPush.sentCount,
          errorCount: existingPush.errorCount,
          tipId: existingPush.tipId,
        },
        durationMs: Date.now() - startTime,
      });
    }

    // Get today's published tips (created today, status published)
    const todayStart = new Date(today);
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const publishedTips = await prisma.tip.findMany({
      where: {
        status: "published",
        createdAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    if (publishedTips.length === 0) {
      console.log("[send-daily-push] No published tips found for today");
      return NextResponse.json({
        success: true,
        message: "No published tips to notify about",
        tipCount: 0,
        durationMs: Date.now() - startTime,
      });
    }

    console.log(
      `[send-daily-push] Found ${publishedTips.length} published tips`
    );

    // Use the first (most recent) tip for the notification
    const featuredTip = publishedTips[0];

    // Create or update DailyPush record
    const dailyPush = await prisma.dailyPush.upsert({
      where: { date: today },
      create: {
        date: today,
        tipId: featuredTip.id,
        tipCount: publishedTips.length,
        status: "sending",
        startedAt: new Date(),
      },
      update: {
        status: "sending",
        startedAt: new Date(),
      },
    });

    // Get all users with push tokens
    const users = await prisma.user.findMany({
      where: {
        pushToken: { not: null },
      },
      select: {
        id: true,
        pushToken: true,
      },
    });

    if (users.length === 0) {
      console.log("[send-daily-push] No users with push tokens");
      await prisma.dailyPush.update({
        where: { id: dailyPush.id },
        data: {
          status: "completed",
          finishedAt: new Date(),
          sentCount: 0,
          summary: { message: "No users with push tokens" },
        },
      });

      return NextResponse.json({
        success: true,
        message: "No users with push tokens",
        tipCount: publishedTips.length,
        userCount: 0,
        durationMs: Date.now() - startTime,
      });
    }

    console.log(`[send-daily-push] Sending to ${users.length} users`);

    // Format the notification
    const notification = formatTipNotification({
      tipSummary: featuredTip.tipSummary,
      tipText: featuredTip.tipText,
      category: featuredTip.category,
      image: featuredTip.image as { url: string } | null,
    });

    // Customize title based on tip count
    const title =
      publishedTips.length > 1
        ? `🚀 ${publishedTips.length} fresh tips just dropped!`
        : notification.title;

    // Send notifications ONE BY ONE as requested
    // This ensures we can track each send and handle failures individually
    let sentCount = 0;
    let errorCount = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    for (const user of users) {
      if (!user.pushToken || !Expo.isExpoPushToken(user.pushToken)) {
        errorCount++;
        errors.push({ userId: user.id, error: "Invalid push token" });
        continue;
      }

      try {
        const ticket = await sendPushNotification({
          pushToken: user.pushToken,
          title,
          body: notification.body,
          imageUrl: notification.imageUrl,
          data: {
            tipId: featuredTip.id,
            type: "daily",
            tipCount: publishedTips.length,
          },
        });

        if (ticket && ticket.status === "ok") {
          sentCount++;
        } else {
          errorCount++;
          errors.push({
            userId: user.id,
            error:
              ticket?.status === "error"
                ? (ticket as any).message
                : "Unknown error",
          });
        }
      } catch (err) {
        errorCount++;
        errors.push({
          userId: user.id,
          error: err instanceof Error ? err.message : "Send failed",
        });
      }
    }

    // Update DailyPush record with results
    await prisma.dailyPush.update({
      where: { id: dailyPush.id },
      data: {
        status: "completed",
        finishedAt: new Date(),
        sentCount,
        errorCount,
        summary: {
          tipId: featuredTip.id,
          tipCount: publishedTips.length,
          totalUsers: users.length,
          sentCount,
          errorCount,
          durationMs: Date.now() - startTime,
          errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Store first 10 errors
        },
      },
    });

    const durationMs = Date.now() - startTime;
    console.log(
      `[send-daily-push] Completed: ${sentCount} sent, ${errorCount} errors in ${durationMs}ms`
    );

    return NextResponse.json({
      success: true,
      date: today,
      tipId: featuredTip.id,
      tipCount: publishedTips.length,
      totalUsers: users.length,
      sentCount,
      errorCount,
      durationMs,
    });
  } catch (error) {
    console.error("[send-daily-push] Error:", error);

    // Try to update DailyPush record if it exists
    try {
      await prisma.dailyPush.updateMany({
        where: { date: today, status: "sending" },
        data: {
          status: "failed",
          finishedAt: new Date(),
          summary: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        },
      });
    } catch (updateError) {
      console.error(
        "[send-daily-push] Failed to update DailyPush:",
        updateError
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

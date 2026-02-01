/**
 * CRON JOB: Send Hourly Push Notifications
 *
 * This endpoint sends ONE push notification per hour from 9 AM to 11 PM (12 AM).
 * That's 15 notifications per day, one for each tip generated daily.
 *
 * SCHEDULE: Runs every hour from 9 AM to 11 PM (0 9-23 * * *)
 * - Hour 9 (9 AM) → Tip #1
 * - Hour 10 (10 AM) → Tip #2
 * - ...
 * - Hour 23 (11 PM) → Tip #15
 *
 * RESPONSIBILITIES:
 * - Authenticate via CRON_SECRET
 * - Determine current hour slot (9-23 maps to tip index 0-14)
 * - Fetch the specific tip for this hour
 * - Send push notification to all users
 * - Track sent notifications to prevent duplicates per hour
 *
 * DESIGN PRINCIPLES:
 * - Idempotent: Uses DailyPush model with date+hour unique constraint
 * - Hourly: Each hour gets exactly ONE tip notification
 * - Observable: Logs and tracks all operations
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification, formatTipNotification } from "@/lib/push";
import { Expo } from "expo-server-sdk";

// Hours when notifications are sent (9 AM to 11 PM = 15 hours)
const START_HOUR = 9;
const END_HOUR = 23; // 11 PM (last notification)
const TOTAL_SLOTS = END_HOUR - START_HOUR + 1; // 15 slots

// Get today's date string in YYYY-MM-DD format
function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

// Get current hour (0-23)
function getCurrentHour(): number {
  return new Date().getHours();
}

// Get tip index for a given hour (0-14)
function getTipIndexForHour(hour: number): number {
  return hour - START_HOUR;
}

// Check if current hour is within notification window
function isWithinNotificationWindow(hour: number): boolean {
  return hour >= START_HOUR && hour <= END_HOUR;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const today = getTodayDateString();
  const currentHour = getCurrentHour();

  const headers = new Headers({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "Surrogate-Control": "no-store",
  });

  console.log(
    `[send-daily-push] Cron started for date: ${today}, hour: ${currentHour}`,
  );

  // Authenticate via CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log("[send-daily-push] Unauthorized request");
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers },
    );
  }

  // Check if we're within the notification window (9 AM - 11 PM)
  if (!isWithinNotificationWindow(currentHour)) {
    console.log(
      `[send-daily-push] Outside notification window (${START_HOUR}-${END_HOUR}), current hour: ${currentHour}`,
    );
    return NextResponse.json(
      {
        success: true,
        skipped: true,
        message: `Outside notification window. Notifications run from ${START_HOUR}:00 to ${END_HOUR}:00`,
        currentHour,
        durationMs: Date.now() - startTime,
      },
      { headers },
    );
  }

  try {
    // IDEMPOTENCY CHECK: Has push already been sent for this hour today?
    const existingPush = await prisma.dailyPush.findUnique({
      where: {
        date_hour: {
          date: today,
          hour: currentHour,
        },
      },
    });

    if (existingPush && existingPush.status === "completed") {
      console.log(
        `[send-daily-push] Push already sent for ${today} hour ${currentHour}, skipping`,
      );
      return NextResponse.json(
        {
          success: true,
          skipped: true,
          message: `Push already sent for ${today} at ${currentHour}:00`,
          existingPush: {
            sentCount: existingPush.sentCount,
            errorCount: existingPush.errorCount,
            tipId: existingPush.tipId,
          },
          durationMs: Date.now() - startTime,
        },
        { headers },
      );
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
      orderBy: { createdAt: "asc" }, // Oldest first so tip #1 goes at 9 AM
      take: TOTAL_SLOTS, // Get up to 15 tips
    });

    if (publishedTips.length === 0) {
      console.log("[send-daily-push] No published tips found for today");
      return NextResponse.json(
        {
          success: true,
          message: "No published tips to notify about",
          tipCount: 0,
          durationMs: Date.now() - startTime,
        },
        { headers },
      );
    }

    // Determine which tip to send based on current hour
    const tipIndex = getTipIndexForHour(currentHour);

    if (tipIndex >= publishedTips.length) {
      console.log(
        `[send-daily-push] No tip for slot ${tipIndex + 1}. Only ${publishedTips.length} tips available.`,
      );
      return NextResponse.json(
        {
          success: true,
          skipped: true,
          message: `No tip available for hour ${currentHour}. Tips generated: ${publishedTips.length}, slot needed: ${tipIndex + 1}`,
          currentHour,
          tipIndex,
          availableTips: publishedTips.length,
          durationMs: Date.now() - startTime,
        },
        { headers },
      );
    }

    const tipToSend = publishedTips[tipIndex];
    console.log(
      `[send-daily-push] Hour ${currentHour} → Sending tip #${tipIndex + 1}: ${tipToSend.id}`,
    );

    // Create or update DailyPush record for this hour
    const dailyPush = await prisma.dailyPush.upsert({
      where: {
        date_hour: {
          date: today,
          hour: currentHour,
        },
      },
      create: {
        date: today,
        hour: currentHour,
        tipId: tipToSend.id,
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

      return NextResponse.json(
        {
          success: true,
          message: "No users with push tokens",
          tipId: tipToSend.id,
          tipNumber: tipIndex + 1,
          hour: currentHour,
          userCount: 0,
          durationMs: Date.now() - startTime,
        },
        { headers },
      );
    }

    console.log(`[send-daily-push] Sending to ${users.length} users`);

    // Format the notification
    const notification = formatTipNotification({
      tipSummary: tipToSend.tipSummary,
      tipText: tipToSend.tipText,
      category: tipToSend.category,
      image: tipToSend.image as { url: string } | null,
    });

    // Send notifications ONE BY ONE
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
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
          data: {
            tipId: tipToSend.id,
            type: "hourly",
            tipNumber: tipIndex + 1,
            hour: currentHour,
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
          tipId: tipToSend.id,
          tipNumber: tipIndex + 1,
          hour: currentHour,
          totalUsers: users.length,
          sentCount,
          errorCount,
          durationMs: Date.now() - startTime,
          errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
        },
      },
    });

    const durationMs = Date.now() - startTime;
    console.log(
      `[send-daily-push] Hour ${currentHour} completed: ${sentCount} sent, ${errorCount} errors in ${durationMs}ms`,
    );

    return NextResponse.json(
      {
        success: true,
        date: today,
        hour: currentHour,
        tipId: tipToSend.id,
        tipNumber: tipIndex + 1,
        totalTips: publishedTips.length,
        totalUsers: users.length,
        sentCount,
        errorCount,
        durationMs,
      },
      { headers },
    );
  } catch (error) {
    console.error("[send-daily-push] Error:", error);

    // Try to update DailyPush record if it exists
    try {
      await prisma.dailyPush.updateMany({
        where: { date: today, hour: currentHour, status: "sending" },
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
        updateError,
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startTime,
      },
      { status: 500, headers },
    );
  }
}

/**
 * CRON JOB: Send Half-Hourly Push Notifications
 *
 * This endpoint sends ONE push notification every 30 minutes from 6 AM to 11:30 PM IST.
 * That's 30 notifications per day, one for each tip generated daily.
 *
 * SCHEDULE: Runs every 30 minutes from 6 AM to 11:30 PM IST
 * - Slot 0 (6:00 AM) → Tip #1
 * - Slot 1 (6:30 AM) → Tip #2
 * - ...
 * - Slot 29 (11:30 PM) → Tip #30
 *
 * RESPONSIBILITIES:
 * - Authenticate via CRON_SECRET
 * - Determine current slot (0-29 based on half-hour intervals)
 * - Fetch the specific tip for this slot
 * - Send push notification to all users
 * - Track sent notifications to prevent duplicates per slot
 *
 * DESIGN PRINCIPLES:
 * - Idempotent: Uses DailyPush model with date+slot unique constraint
 * - Half-hourly: Each slot gets exactly ONE tip notification
 * - Observable: Logs and tracks all operations
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification, formatTipNotification } from "@/lib/push";
import { Expo } from "expo-server-sdk";

// Hours when notifications are sent (6 AM to 11:30 PM IST = 30 half-hour slots)
const START_HOUR = 6;
const END_HOUR = 23; // 11 PM (last hour)
const TOTAL_SLOTS = 30; // 30 notifications per day

// IST timezone offset
const IST_OFFSET_HOURS = 5;
const IST_OFFSET_MINUTES = 30;

// Get current date and time in IST
function getISTDateTime(): {
  hours: number;
  minutes: number;
  dateString: string;
} {
  const now = new Date();
  // Convert to IST by adding 5 hours 30 minutes to UTC
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();

  let istMinutes = utcMinutes + IST_OFFSET_MINUTES;
  let istHours = utcHours + IST_OFFSET_HOURS;

  // Handle minute overflow
  if (istMinutes >= 60) {
    istMinutes -= 60;
    istHours += 1;
  }

  // Handle hour overflow (next day)
  let dayOffset = 0;
  if (istHours >= 24) {
    istHours -= 24;
    dayOffset = 1;
  }

  // Calculate IST date
  const istDate = new Date(now);
  istDate.setUTCHours(istHours, istMinutes, 0, 0);
  if (dayOffset > 0) {
    istDate.setUTCDate(istDate.getUTCDate() + dayOffset);
  }

  const dateString = `${istDate.getUTCFullYear()}-${String(istDate.getUTCMonth() + 1).padStart(2, "0")}-${String(istDate.getUTCDate()).padStart(2, "0")}`;

  return { hours: istHours, minutes: istMinutes, dateString };
}

// Get today's date string in YYYY-MM-DD format (IST)
function getTodayDateString(): string {
  return getISTDateTime().dateString;
}

// Get current hour in IST (0-23)
function getCurrentHour(): number {
  return getISTDateTime().hours;
}

// Get current minute in IST (0-59)
function getCurrentMinute(): number {
  return getISTDateTime().minutes;
}

// Get slot index for current time (0-29 for 30 half-hour slots)
// Slot 0 = 6:00 AM, Slot 1 = 6:30 AM, ..., Slot 29 = 11:30 PM
function getSlotIndex(hour: number, minute: number): number {
  const baseSlot = (hour - START_HOUR) * 2; // 2 slots per hour
  const halfHourOffset = minute >= 30 ? 1 : 0;
  return baseSlot + halfHourOffset;
}

// Check if current time is within notification window
function isWithinNotificationWindow(hour: number): boolean {
  return hour >= START_HOUR && hour <= END_HOUR;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const today = getTodayDateString();
  const currentHour = getCurrentHour();
  const currentMinute = getCurrentMinute();
  const currentSlot = getSlotIndex(currentHour, currentMinute);

  const headers = new Headers({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "Surrogate-Control": "no-store",
  });

  console.log(
    `[send-daily-push] Cron started for date: ${today}, hour: ${currentHour}, minute: ${currentMinute}, slot: ${currentSlot}`,
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

  try {
    // IDEMPOTENCY CHECK: Has push already been sent for this slot today?
    // Using 'hour' field to store slot index for backwards compatibility
    const existingPush = await prisma.dailyPush.findUnique({
      where: {
        date_hour: {
          date: today,
          hour: currentSlot, // Using slot (0-29) instead of hour
        },
      },
    });

    if (existingPush && existingPush.status === "completed") {
      console.log(
        `[send-daily-push] Push already sent for ${today} slot ${currentSlot}, skipping`,
      );
      return NextResponse.json(
        {
          success: true,
          skipped: true,
          message: `Push already sent for ${today} at slot ${currentSlot}`,
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
      orderBy: { createdAt: "asc" }, // Oldest first so tip #1 goes at 6 AM
      take: TOTAL_SLOTS, // Get up to 30 tips
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

    // Determine which tip to send based on current slot
    const tipIndex = currentSlot;

    if (tipIndex >= publishedTips.length) {
      console.log(
        `[send-daily-push] No tip for slot ${tipIndex + 1}. Only ${publishedTips.length} tips available.`,
      );
      return NextResponse.json(
        {
          success: true,
          skipped: true,
          message: `No tip available for slot ${currentSlot}. Tips generated: ${publishedTips.length}, slot needed: ${tipIndex + 1}`,
          currentHour,
          currentSlot,
          tipIndex,
          availableTips: publishedTips.length,
          durationMs: Date.now() - startTime,
        },
        { headers },
      );
    }

    const tipToSend = publishedTips[tipIndex];
    console.log(
      `[send-daily-push] Slot ${currentSlot} (${currentHour}:${currentMinute >= 30 ? "30" : "00"}) → Sending tip #${tipIndex + 1}: ${tipToSend.id}`,
    );

    // Create or update DailyPush record for this slot
    const dailyPush = await prisma.dailyPush.upsert({
      where: {
        date_hour: {
          date: today,
          hour: currentSlot, // Using slot instead of hour
        },
      },
      create: {
        date: today,
        hour: currentSlot, // Using slot instead of hour
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

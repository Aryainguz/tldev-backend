/**
 * CRON JOB: Send Random Push Notifications
 *
 * This endpoint sends 30 random tip notifications per day from 8 AM to 1 AM IST.
 * Tips are selected randomly from all published tips in the database.
 *
 * SCHEDULE: Runs every ~34 minutes from 8 AM to 1 AM IST (30 slots)
 * - Uses seeded randomness based on date + slot for idempotency
 * - Same tip will be sent if cron retries within the same slot
 *
 * RESPONSIBILITIES:
 * - Authenticate via CRON_SECRET
 * - Check if within notification window (8 AM - 1 AM IST)
 * - Select a random tip using deterministic seeding
 * - Send push notification to all users
 * - Track sent notifications to prevent duplicates
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification, formatTipNotification } from "@/lib/push";
import { Expo } from "expo-server-sdk";

// Notification window: 8 AM to 1 AM IST = 17 hours (crosses midnight)
const START_HOUR = 8;
const END_HOUR = 1; // 1 AM next day
const TOTAL_NOTIFICATIONS = 30;
const TOTAL_MINUTES = 17 * 60; // 1020 minutes
const SLOT_DURATION = Math.floor(TOTAL_MINUTES / TOTAL_NOTIFICATIONS); // ~34 minutes per slot

// IST timezone offset
const IST_OFFSET_HOURS = 5;
const IST_OFFSET_MINUTES = 30;

// Simple seeded random number generator for deterministic tip selection
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Create a seed from date string and slot number
function createSeed(dateString: string, slot: number): number {
  let hash = 0;
  const str = `${dateString}-${slot}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Get current date and time in IST
function getISTDateTime(): {
  hours: number;
  minutes: number;
  dateString: string;
} {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();

  let istMinutes = utcMinutes + IST_OFFSET_MINUTES;
  let istHours = utcHours + IST_OFFSET_HOURS;

  if (istMinutes >= 60) {
    istMinutes -= 60;
    istHours += 1;
  }

  let dayOffset = 0;
  if (istHours >= 24) {
    istHours -= 24;
    dayOffset = 1;
  }

  const istDate = new Date(now);
  istDate.setUTCHours(istHours, istMinutes, 0, 0);
  if (dayOffset > 0) {
    istDate.setUTCDate(istDate.getUTCDate() + dayOffset);
  }

  const dateString = `${istDate.getUTCFullYear()}-${String(istDate.getUTCMonth() + 1).padStart(2, "0")}-${String(istDate.getUTCDate()).padStart(2, "0")}`;

  return { hours: istHours, minutes: istMinutes, dateString };
}

// Get slot index (0-29) for current time
// 17 hours (8 AM to 1 AM) with 30 notifications = roughly every 34 minutes
function getSlotIndex(hour: number, minute: number): number {
  let minutesSinceStart: number;

  if (hour >= START_HOUR) {
    // 8 AM to 11:59 PM
    minutesSinceStart = (hour - START_HOUR) * 60 + minute;
  } else if (hour <= END_HOUR) {
    // 12 AM to 1 AM (next day portion)
    minutesSinceStart = (24 - START_HOUR + hour) * 60 + minute;
  } else {
    // Outside window (2 AM to 7:59 AM)
    return -1;
  }

  const slot = Math.floor(minutesSinceStart / SLOT_DURATION);
  return Math.min(slot, TOTAL_NOTIFICATIONS - 1);
}

// Check if current time is within notification window (8 AM - 1 AM IST)
function isWithinNotificationWindow(hour: number): boolean {
  // Window: 8 AM to 1 AM (crosses midnight)
  // Valid hours: 8-23 (8 AM to 11:59 PM) OR 0-1 (12 AM to 1 AM)
  return hour >= START_HOUR || hour <= END_HOUR;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const {
    hours: currentHour,
    minutes: currentMinute,
    dateString: today,
  } = getISTDateTime();
  const currentSlot = getSlotIndex(currentHour, currentMinute);

  const headers = new Headers({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "Surrogate-Control": "no-store",
  });

  console.log(
    `[send-daily-push] Cron started for date: ${today}, IST time: ${currentHour}:${currentMinute.toString().padStart(2, "0")}, slot: ${currentSlot}`,
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

  // Check if we're within the notification window (8 AM - 12 AM IST)
  if (!isWithinNotificationWindow(currentHour)) {
    console.log(
      `[send-daily-push] Outside notification window (${START_HOUR}:00 - 00:00 IST), current hour: ${currentHour}`,
    );
    return NextResponse.json(
      {
        success: true,
        skipped: true,
        message: `Outside notification window. Notifications run from ${START_HOUR}:00 AM to ${END_HOUR}:00 AM IST`,
        currentHourIST: currentHour,
        currentSlot,
        durationMs: Date.now() - startTime,
      },
      { headers },
    );
  }

  try {
    // IDEMPOTENCY CHECK: Has push already been sent for this slot today?
    const existingPush = await prisma.dailyPush.findUnique({
      where: {
        date_hour: {
          date: today,
          hour: currentSlot,
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

    // Get ALL published tips from the database
    const allTips = await prisma.tip.findMany({
      where: {
        status: "published",
      },
      select: {
        id: true,
        tipSummary: true,
        tipText: true,
        category: true,
        image: true,
      },
    });

    if (allTips.length === 0) {
      console.log("[send-daily-push] No published tips found in database");
      return NextResponse.json(
        {
          success: true,
          skipped: true,
          message: "No published tips available in database",
          tipCount: 0,
          durationMs: Date.now() - startTime,
        },
        { headers },
      );
    }

    // Select a random tip using seeded randomness (deterministic for idempotency)
    const seed = createSeed(today, currentSlot);
    const randomIndex = Math.floor(seededRandom(seed) * allTips.length);
    const tipToSend = allTips[randomIndex];

    console.log(
      `[send-daily-push] Slot ${currentSlot} → Sending random tip: ${tipToSend.id} (index ${randomIndex} of ${allTips.length})`,
    );

    // Create or update DailyPush record for this slot
    const dailyPush = await prisma.dailyPush.upsert({
      where: {
        date_hour: {
          date: today,
          hour: currentSlot,
        },
      },
      create: {
        date: today,
        hour: currentSlot,
        tipId: tipToSend.id,
        tipCount: allTips.length,
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
          slot: currentSlot,
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
            type: "random",
            slot: currentSlot,
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
          slot: currentSlot,
          istTime: `${currentHour}:${currentMinute.toString().padStart(2, "0")}`,
          totalTipsInDb: allTips.length,
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
      `[send-daily-push] Slot ${currentSlot} completed: ${sentCount} sent, ${errorCount} errors in ${durationMs}ms`,
    );

    return NextResponse.json(
      {
        success: true,
        date: today,
        istTime: `${currentHour}:${currentMinute.toString().padStart(2, "0")}`,
        slot: currentSlot,
        tipId: tipToSend.id,
        totalTipsInDb: allTips.length,
        totalUsers: users.length,
        sentCount,
        errorCount,
        durationMs,
      },
      { headers },
    );
  } catch (error) {
    console.error("[send-daily-push] Error:", error);

    try {
      await prisma.dailyPush.updateMany({
        where: { date: today, hour: currentSlot, status: "sending" },
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

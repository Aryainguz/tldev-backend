import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBulkPushNotifications, formatTipNotification } from "@/lib/push";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const adminKey = process.env.ADMIN_API_KEY;

    if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tipId, customTitle, customBody } = body;

    if (!tipId && !customTitle) {
      return NextResponse.json(
        { error: "Either tipId or customTitle/customBody required" },
        { status: 400 },
      );
    }

    const users = await prisma.user.findMany({
      where: {
        pushToken: { not: null },
      },
      select: {
        pushToken: true,
      },
    });

    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No users with push tokens found",
        sent: 0,
      });
    }

    let notification: { title: string; body: string; imageUrl?: string };

    if (tipId) {
      const tip = await prisma.tip.findUnique({
        where: { id: tipId },
      });

      if (!tip) {
        return NextResponse.json({ error: "Tip not found" }, { status: 404 });
      }

      notification = formatTipNotification({
        tipSummary: tip.tipSummary,
        tipText: tip.tipText,
        category: tip.category,
        image: tip.image as { url: string } | null,
      });
    } else {
      notification = {
        title: customTitle,
        body: customBody || "",
        imageUrl: body.imageUrl,
      };
    }

    const payloads = users
      .filter((user) => user.pushToken)
      .map((user) => ({
        pushToken: user.pushToken!,
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
        data: tipId ? { tipId, type: "tip" } : { type: "custom" },
      }));

    const tickets = await sendBulkPushNotifications(payloads);

    const successCount = tickets.filter((t) => t.status === "ok").length;
    const errorCount = tickets.filter((t) => t.status === "error").length;

    return NextResponse.json({
      success: true,
      sent: successCount,
      errors: errorCount,
      total: users.length,
    });
  } catch (error) {
    console.error("Error sending notifications:", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 },
    );
  }
}

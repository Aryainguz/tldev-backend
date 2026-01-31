import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";

export async function GET(request: NextRequest) {
  try {
    const adminKey = process.env.ADMIN_API_KEY;
    const authHeader = request.headers.get("x-admin-key");

    if (adminKey && authHeader !== adminKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: {
        pushToken: { not: null },
      },
      select: {
        id: true,
        email: true,
        pushToken: true,
        deviceType: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      registeredUsers: users.length,
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        tokenPreview: u.pushToken?.slice(0, 30) + "...",
        deviceType: u.deviceType,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error in GET /api/notifications/test:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const adminKey = process.env.ADMIN_API_KEY;
  const authHeader = request.headers.get("x-admin-key");

  if (adminKey && authHeader !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { pushToken, title, message } = body;

  if (!pushToken) {
    const user = await prisma.user.findFirst({
      where: {
        pushToken: { not: null },
        NOT: { pushToken: { contains: "test" } },
      },
      orderBy: { createdAt: "desc" },
      select: { pushToken: true },
    });

    if (!user?.pushToken) {
      return NextResponse.json(
        {
          error: "No push token provided and no users registered",
        },
        { status: 400 }
      );
    }

    const ticket = await sendPushNotification({
      pushToken: user.pushToken,
      title: title || "🚀 TL;Dev Test",
      body: message || "This is a test notification!",
      data: { type: "test" },
    });

    return NextResponse.json({
      success: true,
      ticket,
      sentTo: user.pushToken.slice(0, 30) + "...",
    });
  }

  const ticket = await sendPushNotification({
    pushToken,
    title: title || "🚀 TL;Dev Test",
    body: message || "This is a test notification!",
    data: { type: "test" },
  });

  return NextResponse.json({
    success: true,
    ticket,
  });
}

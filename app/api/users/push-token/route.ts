import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, push_token, device_type } = body;

    if (!user_id || !push_token) {
      return NextResponse.json(
        { error: "user_id and push_token required" },
        { status: 400 }
      );
    }

    const email = `${user_id}@device.tldev`;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          pushToken: push_token,
          deviceType: device_type || "unknown",
        },
      });
    } else {
      user = await prisma.user.update({
        where: { email },
        data: {
          pushToken: push_token,
          deviceType: device_type || user.deviceType,
        },
      });
    }

    return NextResponse.json({
      success: true,
      user_id: user.id,
    });
  } catch (error) {
    console.error("Error registering push token:", error);
    return NextResponse.json(
      { error: "Failed to register push token" },
      { status: 500 }
    );
  }
}

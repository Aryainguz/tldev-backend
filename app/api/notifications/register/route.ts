import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token, platform } = body;

    if (!token || !platform) {
      return NextResponse.json(
        { success: false, error: "Token and platform are required" },
        { status: 400 }
      );
    }

    // Update user's push token
    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: {
        pushToken: token,
        deviceType: platform,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Push token registered",
      pushToken: {
        token: updatedUser.pushToken,
        platform: updatedUser.deviceType,
      },
    });
  } catch (error) {
    console.error("Register push token error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to register push token" },
      { status: 500 }
    );
  }
}

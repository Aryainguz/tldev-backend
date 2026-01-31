import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, interests } = body;

    if (!user_id || !Array.isArray(interests)) {
      return NextResponse.json(
        { error: "user_id and interests array required" },
        { status: 400 }
      );
    }

    let user = await prisma.user.findUnique({ where: { id: user_id } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `${user_id}@anonymous.local`,
          interests,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user_id },
        data: { interests },
      });
    }

    return NextResponse.json({
      success: true,
      interests: user.interests,
    });
  } catch (error) {
    console.error("Error updating interests:", error);
    return NextResponse.json(
      { error: "Failed to update interests" },
      { status: 500 }
    );
  }
}

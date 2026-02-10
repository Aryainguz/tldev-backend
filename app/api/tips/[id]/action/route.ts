import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    const tip = await prisma.tip.findUnique({ where: { id } });
    if (!tip) {
      return NextResponse.json({ error: "Tip not found" }, { status: 404 });
    }

    let user = await prisma.user.findUnique({ where: { id: user_id } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: user_id,
          email: `${user_id}@anonymous.local`,
        },
      });
    }

    const existingAction = await prisma.action.findUnique({
      where: {
        userId_tipId_actionType: {
          userId: user_id,
          tipId: id,
          actionType: "share",
        },
      },
    });

    if (existingAction) {
      return NextResponse.json({
        success: true,
        action: "already_shared",
      });
    }

    await prisma.action.create({
      data: {
        userId: user_id,
        tipId: id,
        actionType: "share",
      },
    });

    await prisma.tip.update({
      where: { id },
      data: { sharesCount: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      action: "added",
    });
  } catch (error) {
    console.error("Error handling action:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 },
    );
  }
}

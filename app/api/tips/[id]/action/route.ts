import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { user_id, action_type } = body;

    if (!user_id || !action_type) {
      return NextResponse.json(
        { error: "user_id and action_type required" },
        { status: 400 }
      );
    }

    if (!["like", "save", "share"].includes(action_type)) {
      return NextResponse.json(
        { error: "Invalid action_type" },
        { status: 400 }
      );
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
          actionType: action_type,
        },
      },
    });

    if (existingAction) {
      await prisma.action.delete({
        where: { id: existingAction.id },
      });

      const countField =
        action_type === "like"
          ? "likesCount"
          : action_type === "save"
          ? "savesCount"
          : "sharesCount";

      await prisma.tip.update({
        where: { id },
        data: { [countField]: { decrement: 1 } },
      });

      return NextResponse.json({
        success: true,
        action: "removed",
        action_type,
      });
    }

    await prisma.action.create({
      data: {
        userId: user_id,
        tipId: id,
        actionType: action_type,
      },
    });

    const countField =
      action_type === "like"
        ? "likesCount"
        : action_type === "save"
        ? "savesCount"
        : "sharesCount";

    await prisma.tip.update({
      where: { id },
      data: { [countField]: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      action: "added",
      action_type,
    });
  } catch (error) {
    console.error("Error handling action:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/auth";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  provider: z.enum(["google", "github", "apple"]),
  providerId: z.string(),
  avatar: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = authSchema.parse(body);

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        provider: validatedData.provider,
        providerId: validatedData.providerId,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: validatedData.email,
          name: validatedData.name,
          provider: validatedData.provider,
          providerId: validatedData.providerId,
          avatar: validatedData.avatar,
          interests: [],
        },
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        interests: user.interests,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error("Auth error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500 }
    );
  }
}

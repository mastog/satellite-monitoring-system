import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";

const MAX_EQUIPPED = 3;

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { equippedMedals: true },
    });

    const equippedMedals: string[] = user
      ? JSON.parse(user.equippedMedals)
      : [];

    return NextResponse.json({ equippedMedals });
  } catch (error) {
    console.error("GET equipped-medals error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { medalIds } = (await req.json()) as { medalIds: string[] };

    if (!Array.isArray(medalIds)) {
      return NextResponse.json(
        { error: "medalIds must be an array" },
        { status: 400 }
      );
    }

    if (medalIds.length > MAX_EQUIPPED) {
      return NextResponse.json(
        { error: `Cannot equip more than ${MAX_EQUIPPED} medals` },
        { status: 400 }
      );
    }

    // Validate that user has earned all specified medals
    // Medals are earned via purchase records with itemType "medal"
    if (medalIds.length > 0) {
      const earnedMedals = await prisma.purchase.findMany({
        where: {
          userId: authUser.id,
          itemType: "medal",
          itemId: { in: medalIds },
        },
        select: { itemId: true },
      });
      const earnedIds = new Set(earnedMedals.map((p) => p.itemId));
      const unearned = medalIds.filter((id) => !earnedIds.has(id));
      if (unearned.length > 0) {
        return NextResponse.json(
          { error: `Medals not earned: ${unearned.join(", ")}` },
          { status: 400 }
        );
      }
    }

    await prisma.user.update({
      where: { id: authUser.id },
      data: { equippedMedals: JSON.stringify(medalIds) },
    });

    return NextResponse.json({ equippedMedals: medalIds });
  } catch (error) {
    console.error("PUT equipped-medals error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

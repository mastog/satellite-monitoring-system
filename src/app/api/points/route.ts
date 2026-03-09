import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";
import { getLevel } from "@/lib/points/economy";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { points: true, totalEarned: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const purchases = await prisma.purchase.findMany({
      where: { userId: authUser.id },
      select: { itemType: true, itemId: true, cost: true, purchasedAt: true },
      orderBy: { purchasedAt: "desc" },
    });

    const level = getLevel(user.totalEarned);

    return NextResponse.json({
      points: user.points,
      totalEarned: user.totalEarned,
      level,
      purchases,
    });
  } catch (err) {
    console.error("points GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLevel } from "@/lib/points/economy";
import { MEDAL_DEFS } from "@/lib/stats/medalComputation";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        points: true,
        totalEarned: true,
        equippedMedals: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [medalCount, postCount] = await Promise.all([
      prisma.purchase.count({
        where: { userId: id, itemType: "medal" },
      }),
      prisma.post.count({
        where: { authorId: id },
      }),
    ]);

    const level = getLevel(user.totalEarned);
    const equippedIds: string[] = JSON.parse(user.equippedMedals);

    // Expands the stored equipped-medal IDs into full medal definitions so the profile response is UI-ready.
    const medalDefMap = new Map(MEDAL_DEFS.map((m) => [m.id, m]));
    const equippedMedals = equippedIds
      .map((id) => medalDefMap.get(id))
      .filter(Boolean);

    return NextResponse.json({
      id: user.id,
      name: user.name,
      level: { level: level.level, name: level.name },
      points: user.points,
      totalEarned: user.totalEarned,
      joinedAt: user.createdAt.toISOString(),
      equippedMedals,
      medalCount,
      postCount,
    });
  } catch (error) {
    console.error("GET user profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { awardPoints, POINTS_ACHIEVEMENT } from "@/lib/points/economy";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/points/sync-medals
 * Body: { earnedMedalIds: string[] }
 *
 * Persists first-time-earned medals to the server medal history.
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { earnedMedalIds } = await req.json();
    if (!Array.isArray(earnedMedalIds)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const earnedSet = new Set<string>(earnedMedalIds);

    // Loads the medal history already recorded for the current user.
    const existing = await prisma.purchase.findMany({
      where: { userId: user.id, itemType: "medal" },
      orderBy: { purchasedAt: "asc" },
    });
    const existingMap = new Map(existing.map((p) => [p.itemId, p.id]));

    // Collects medal IDs that are present in the current earned set but absent
    // from the stored medal history.
    const toAward = [...earnedSet].filter((id) => !existingMap.has(id));

    // Appends newly earned medals to the stored history and grants the
    // achievement reward for each first-time unlock.
    for (const medalId of toAward) {
      await prisma.purchase.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          itemType: "medal",
          itemId: medalId,
          cost: 0,
        },
      });
      await awardPoints(user.id, POINTS_ACHIEVEMENT, `medal:${medalId}`);
    }

    // Reloads the progression totals and returns the full owned-medal list.
    const updated = await prisma.user.findUnique({
      where: { id: user.id },
      select: { points: true, totalEarned: true },
    });
    const ownedMedalIds = [
      ...new Set([...existing.map((p) => p.itemId), ...toAward]),
    ];

    return NextResponse.json({
      success: true,
      awarded: toAward.length,
      revoked: 0,
      ownedMedalIds,
      points: updated?.points ?? 0,
      totalEarned: updated?.totalEarned ?? 0,
    });
  } catch (err) {
    console.error("sync-medals PUT error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

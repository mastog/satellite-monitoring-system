import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import {
  awardPoints,
  deductPoints,
  POINTS_ACHIEVEMENT,
} from "@/lib/points/economy";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/points/sync-medals
 * Body: { earnedMedalIds: string[] }
 *
 * Atomic reconciliation — compares the client's earned medal list with
 * the server's Purchase records (itemType "medal") and awards/revokes
 * in a single pass. Fully idempotent.
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

    // Reads the server-side medal purchase records so the request can reconcile against the client's earned set.
    const existing = await prisma.purchase.findMany({
      where: { userId: user.id, itemType: "medal" },
    });
    const existingMap = new Map(existing.map((p) => [p.itemId, p.id]));

    // Collects medals that the client says are earned but the server has not yet stored.
    const toAward = [...earnedSet].filter((id) => !existingMap.has(id));

    // Collects medals that exist on the server but are no longer present in the client's earned set.
    const toRevoke = existing.filter((p) => !earnedSet.has(p.itemId));

    // Creates any missing medal records and grants the associated achievement points.
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

    // Removes stale medal records and rolls back the associated achievement points.
    for (const record of toRevoke) {
      await prisma.purchase.delete({ where: { id: record.id } });
      await deductPoints(
        user.id,
        POINTS_ACHIEVEMENT,
        `medal-revoke:${record.itemId}`
      );
    }

    // Reloads the current point totals after reconciliation so the client receives authoritative values.
    const updated = await prisma.user.findUnique({
      where: { id: user.id },
      select: { points: true, totalEarned: true },
    });

    return NextResponse.json({
      success: true,
      awarded: toAward.length,
      revoked: toRevoke.length,
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

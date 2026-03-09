import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import {
  awardPoints,
  deductPoints,
  POINTS_ACHIEVEMENT,
} from "@/lib/points/economy";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/points/award-medal
 * Body: { medalId: string }
 * Idempotent — if already awarded, returns { alreadyAwarded: true }.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { medalId, ensureOnly } = await req.json();
    if (!medalId || typeof medalId !== "string") {
      return NextResponse.json({ error: "Missing medalId" }, { status: 400 });
    }

    // Check if already awarded (using Purchase table with itemType "medal")
    const existing = await prisma.purchase.findFirst({
      where: { userId: user.id, itemType: "medal", itemId: medalId },
    });

    if (existing) {
      return NextResponse.json({ success: true, alreadyAwarded: true });
    }

    // Create the record
    await prisma.purchase.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        itemType: "medal",
        itemId: medalId,
        cost: 0,
      },
    });

    // ensureOnly: only create the record, no points (used on page load)
    if (ensureOnly) {
      return NextResponse.json({ success: true, ensured: true });
    }

    await awardPoints(user.id, POINTS_ACHIEVEMENT, `medal:${medalId}`);
    return NextResponse.json({ success: true, awarded: POINTS_ACHIEVEMENT });
  } catch (err) {
    console.error("award-medal POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/points/award-medal
 * Body: { medalId: string }
 * Revokes a medal — deletes the record and deducts points.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { medalId } = await req.json();
    if (!medalId || typeof medalId !== "string") {
      return NextResponse.json({ error: "Missing medalId" }, { status: 400 });
    }

    const existing = await prisma.purchase.findFirst({
      where: { userId: user.id, itemType: "medal", itemId: medalId },
    });

    if (!existing) {
      return NextResponse.json({ success: true, alreadyRevoked: true });
    }

    await prisma.purchase.delete({ where: { id: existing.id } });
    await deductPoints(user.id, POINTS_ACHIEVEMENT, `medal-revoke:${medalId}`);
    return NextResponse.json({ success: true, deducted: POINTS_ACHIEVEMENT });
  } catch (err) {
    console.error("revoke-medal DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { awardPoints, POINTS_ACHIEVEMENT } from "@/lib/points/economy";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/points/award-medal
 * Body: { medalId: string }
 * Records a medal unlock and grants the one-time achievement reward.
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

    // Reads the existing medal history for the requested medal.
    const existing = await prisma.purchase.findFirst({
      where: { userId: user.id, itemType: "medal", itemId: medalId },
    });

    if (existing) {
      return NextResponse.json({ success: true, alreadyAwarded: true });
    }

    // Stores the unlocked medal in the purchase-backed medal history.
    await prisma.purchase.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        itemType: "medal",
        itemId: medalId,
        cost: 0,
      },
    });

    // Skips the point award when the caller only needs the medal record to exist.
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
 * Medal history is permanent once unlocked, so revocation is not supported.
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

    return NextResponse.json(
      {
        error: `Medal ${medalId} is permanently recorded once earned`,
      },
      { status: 409 }
    );
  } catch (err) {
    console.error("revoke-medal DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

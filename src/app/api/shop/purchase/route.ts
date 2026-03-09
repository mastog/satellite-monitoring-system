import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";
import { deductPoints, PRICE_MODEL, PRICE_DANCE } from "@/lib/points/economy";

const PRICES: Record<string, number> = {
  model: PRICE_MODEL,
  dance: PRICE_DANCE,
};

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemType, itemId } = await req.json();
    if (!itemType || !itemId) {
      return NextResponse.json(
        { error: "Missing itemType or itemId" },
        { status: 400 }
      );
    }

    const price = PRICES[itemType];
    if (price === undefined) {
      return NextResponse.json({ error: "Invalid item type" }, { status: 400 });
    }

    // Check if already purchased
    const existing = await prisma.purchase.findFirst({
      where: { userId: authUser.id, itemType, itemId },
    });
    if (existing) {
      return NextResponse.json({ error: "Already purchased" }, { status: 409 });
    }

    // Check balance
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { points: true },
    });
    if (!user || user.points < price) {
      return NextResponse.json(
        { error: "Insufficient points" },
        { status: 400 }
      );
    }

    // Create purchase and deduct points
    await prisma.purchase.create({
      data: {
        userId: authUser.id,
        itemType,
        itemId,
        cost: price,
      },
    });

    await deductPoints(authUser.id, price, `purchase:${itemType}:${itemId}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("shop/purchase POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

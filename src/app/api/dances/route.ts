import { NextRequest, NextResponse } from "next/server";
import { readdir } from "fs/promises";
import path from "path";
import { getAuthUser } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";
import { PRICE_DANCE } from "@/lib/points/economy";

/**
 * GET /api/dances
 * Scans public/models/ for .vmd files and returns the list.
 * If the user is authenticated, also checks for orphaned purchases
 * (dances the user bought but the .vmd file no longer exists) and
 * refunds them automatically.
 */
export async function GET(req: NextRequest) {
  try {
    const modelsDir = path.join(process.cwd(), "public", "models");
    const files = await readdir(modelsDir);
    const vmdFiles = files.filter((f) => f.endsWith(".vmd")).sort();

    const dances = vmdFiles.map((f, i) => {
      const id = f.replace(".vmd", "");
      return {
        id,
        name: `Dance ${String.fromCharCode(65 + i)}`, // A, B, C...
        vmdPath: `/models/${f}`,
        price: PRICE_DANCE,
      };
    });

    const existingIds = new Set(dances.map((d) => d.id));

    // Check for orphaned dance purchases and refund
    const user = await getAuthUser(req);
    if (user) {
      const dancePurchases = await prisma.purchase.findMany({
        where: { userId: user.id, itemType: "dance" },
      });

      const orphaned = dancePurchases.filter((p) => !existingIds.has(p.itemId));

      for (const op of orphaned) {
        // Refund points and delete purchase
        await prisma.user.update({
          where: { id: user.id },
          data: { points: { increment: op.cost } },
        });
        await prisma.purchase.delete({ where: { id: op.id } });
      }

      if (orphaned.length > 0) {
        return NextResponse.json({
          dances,
          refunded: orphaned.map((o) => ({
            itemId: o.itemId,
            cost: o.cost,
          })),
        });
      }
    }

    return NextResponse.json({ dances });
  } catch (err) {
    console.error("dances GET error:", err);
    return NextResponse.json({ dances: [] });
  }
}

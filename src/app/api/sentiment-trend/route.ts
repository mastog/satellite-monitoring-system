import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const allVotes = await prisma.vote.findMany({
      where: { targetType: { in: ["sdg", "article", "paper", "indicator"] } },
      select: { vote: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const now = new Date();
    const data: number[] = [];

    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
      const cutoff = new Date(now);
      cutoff.setHours(23, 59, 59, 999);
      cutoff.setDate(cutoff.getDate() - dayOffset);

      let support = 0;
      let oppose = 0;

      for (const v of allVotes) {
        if (new Date(v.createdAt) <= cutoff) {
          if (v.vote === "support") support++;
          else if (v.vote === "oppose") oppose++;
        }
      }

      const total = support + oppose;
      data.push(total > 0 ? Math.round((support / total) * 100) : 50);
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("sentiment-trend GET error:", err);
    return NextResponse.json({ data: Array(30).fill(50) });
  }
}

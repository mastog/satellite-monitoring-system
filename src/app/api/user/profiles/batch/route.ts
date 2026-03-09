import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLevel } from "@/lib/points/economy";
import { MEDAL_DEFS } from "@/lib/stats/medalComputation";

const MAX_IDS = 50;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userIds: string[] = body.userIds;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "userIds required" }, { status: 400 });
    }

    const ids = userIds.slice(0, MAX_IDS);

    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        points: true,
        totalEarned: true,
        equippedMedals: true,
        createdAt: true,
      },
    });

    const userIdSet = users.map((u) => u.id);

    const [medalCounts, postCounts] = await Promise.all([
      prisma.purchase.groupBy({
        by: ["userId"],
        where: { userId: { in: userIdSet }, itemType: "medal" },
        _count: true,
      }),
      prisma.post.groupBy({
        by: ["authorId"],
        where: { authorId: { in: userIdSet } },
        _count: true,
      }),
    ]);

    const medalCountMap = new Map(medalCounts.map((r) => [r.userId, r._count]));
    const postCountMap = new Map(postCounts.map((r) => [r.authorId, r._count]));
    const medalDefMap = new Map(MEDAL_DEFS.map((m) => [m.id, m]));

    const profiles = users.map((user) => {
      const level = getLevel(user.totalEarned);
      const equippedIds: string[] = JSON.parse(user.equippedMedals);
      const equippedMedals = equippedIds
        .map((id) => medalDefMap.get(id))
        .filter(Boolean);

      return {
        id: user.id,
        name: user.name,
        level: { level: level.level, name: level.name },
        points: user.points,
        totalEarned: user.totalEarned,
        joinedAt: user.createdAt.toISOString(),
        equippedMedals,
        medalCount: medalCountMap.get(user.id) ?? 0,
        postCount: postCountMap.get(user.id) ?? 0,
      };
    });

    return NextResponse.json(profiles);
  } catch (error) {
    console.error("POST batch profiles error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

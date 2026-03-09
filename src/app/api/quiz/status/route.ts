import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";

const MAX_DAILY_SCORED_ATTEMPTS = 3;

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const [todayAttempts, todayPoints] = await Promise.all([
      prisma.quizAttempt.count({
        where: {
          userId: user.id,
          createdAt: { gte: startOfDay },
        },
      }),
      prisma.quizAttempt.aggregate({
        where: {
          userId: user.id,
          createdAt: { gte: startOfDay },
        },
        _sum: { pointsAwarded: true },
      }),
    ]);

    return NextResponse.json({
      dailyAttemptsUsed: todayAttempts,
      dailyPointsEarned: todayPoints._sum.pointsAwarded || 0,
      canEarnPoints: todayAttempts < MAX_DAILY_SCORED_ATTEMPTS,
    });
  } catch (error) {
    console.error("Quiz status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { toggleVote } from "@/lib/posts/db";
import { prisma } from "@/lib/prisma";
import type { PostVote } from "@/lib/posts/types";
import { awardPoints, deductPoints, POINTS_VOTE } from "@/lib/points/economy";

const CONTENT_TYPES = new Set(["sdg", "article", "paper", "indicator"]);

export async function GET(req: NextRequest) {
  try {
    const allVotes = await prisma.vote.findMany({
      where: { targetType: { in: ["sdg", "article", "paper", "indicator"] } },
    });

    // Aggregates support and oppose totals per content item so the client can hydrate all vote badges at once.
    const counts: Record<string, { support: number; oppose: number }> = {};
    for (const v of allVotes) {
      if (!counts[v.targetId]) counts[v.targetId] = { support: 0, oppose: 0 };
      counts[v.targetId][v.vote as "support" | "oppose"]++;
    }

    // If authenticated, also return user's votes
    const user = await getAuthUser(req);
    const userVotes: Record<string, "support" | "oppose"> = {};
    if (user) {
      for (const v of allVotes) {
        if (v.userId === user.id) {
          userVotes[v.targetId] = v.vote as "support" | "oppose";
        }
      }
    }

    return NextResponse.json({ counts, userVotes });
  } catch (err) {
    console.error("content-votes GET error:", err);
    return NextResponse.json({ counts: {}, userVotes: {} });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { targetId, targetType, vote } = body as {
      targetId: string;
      targetType: PostVote["targetType"];
      vote: "support" | "oppose";
    };

    if (!targetId || !targetType || !vote) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (!CONTENT_TYPES.has(targetType)) {
      return NextResponse.json(
        { error: "Invalid targetType" },
        { status: 400 }
      );
    }

    const result = await toggleVote(user.id, targetId, targetType, vote);
    if (result.action === "added") {
      awardPoints(user.id, POINTS_VOTE, "vote").catch((e) =>
        console.error("award points error:", e)
      );
    } else if (result.action === "removed") {
      deductPoints(user.id, POINTS_VOTE, "vote-removed").catch((e) =>
        console.error("deduct points error:", e)
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("content-votes POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

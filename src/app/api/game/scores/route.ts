import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";

interface StoredWeaponsPayload {
  weapons?: string[];
}

// Normalizes the stored weapons payload so API consumers always receive a
// predictable string list even when older rows contain malformed JSON.
function parseWeapons(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as StoredWeaponsPayload | string[];
    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is string => typeof entry === "string");
    }
    if (Array.isArray(parsed.weapons)) {
      return parsed.weapons.filter(
        (entry): entry is string => typeof entry === "string"
      );
    }
  } catch {}
  return [];
}

// Returns the signed-in player's personal leaderboard and best score.
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await prisma.gameScore.findMany({
      where: { userId: authUser.id },
      orderBy: [{ score: "desc" }, { createdAt: "asc" }],
      take: 10,
    });

    const scores = rows.map((row) => ({
      id: row.id,
      score: row.score,
      duration: row.duration,
      level: row.level,
      kills: row.kills,
      debris: row.debris,
      weapons: parseWeapons(row.weapons),
      createdAt: row.createdAt.toISOString(),
    }));

    return NextResponse.json({
      bestScore: scores[0]?.score ?? 0,
      highScores: scores.map((entry) => entry.score),
      scores,
    });
  } catch (err) {
    console.error("game/scores GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Persists the current run and returns the refreshed personal leaderboard.
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      score?: number;
      time?: number;
      level?: number;
      kills?: number;
      debris?: number;
      weapons?: string[];
    };

    const score = Math.max(0, Math.floor(body.score ?? 0));
    const duration = Math.max(0, Number(body.time ?? 0));
    const level = Math.max(0, Math.floor(body.level ?? 0));
    const kills = Math.max(0, Math.floor(body.kills ?? 0));
    const debris = Math.max(0, Math.floor(body.debris ?? 0));
    const weapons = Array.isArray(body.weapons)
      ? body.weapons.filter((entry): entry is string => typeof entry === "string")
      : [];

    await prisma.gameScore.create({
      data: {
        userId: authUser.id,
        score,
        duration,
        level,
        kills,
        debris,
        weapons: JSON.stringify(weapons),
      },
    });

    const topRows = await prisma.gameScore.findMany({
      where: { userId: authUser.id },
      orderBy: [{ score: "desc" }, { createdAt: "asc" }],
      take: 10,
      select: { score: true },
    });

    return NextResponse.json({
      success: true,
      bestScore: topRows[0]?.score ?? 0,
      highScores: topRows.map((row) => row.score),
    });
  } catch (err) {
    console.error("game/scores POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

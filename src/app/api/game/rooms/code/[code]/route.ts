import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";
import { loadRoomState } from "@/lib/game/ecoDeskServer";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code } = await context.params;
    const room = await prisma.gameRoom.findUnique({
      where: { code: code.toUpperCase() },
      select: { id: true },
    });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const state = await loadRoomState(room.id, user.id);
    return NextResponse.json({ room: state });
  } catch (error) {
    console.error("game/rooms/code/[code] GET error:", error);
    return NextResponse.json(
      { error: "Failed to resolve room code" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { loadRoomState } from "@/lib/game/ecoDeskServer";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { roomId } = await context.params;
    const room = await loadRoomState(roomId, user.id);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({ room });
  } catch (error) {
    console.error("game/rooms/[roomId] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load room state" },
      { status: 500 }
    );
  }
}

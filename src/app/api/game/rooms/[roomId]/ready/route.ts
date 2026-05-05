import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { loadRoomState, setSeatReady } from "@/lib/game/ecoDeskServer";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { ready?: boolean };
    const { roomId } = await context.params;

    await setSeatReady({
      roomId,
      userId: user.id,
      userName: user.name,
      ready: Boolean(body.ready),
    });

    const room = await loadRoomState(roomId, user.id);
    return NextResponse.json({ room });
  } catch (error) {
    console.error("game/rooms/[roomId]/ready POST error:", error);
    return NextResponse.json(
      { error: "Failed to update seat readiness" },
      { status: 400 }
    );
  }
}

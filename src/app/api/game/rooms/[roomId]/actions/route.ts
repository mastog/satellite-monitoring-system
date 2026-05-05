import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { loadRoomState, submitRoomAction } from "@/lib/game/ecoDeskServer";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { payload?: unknown };
    const { roomId } = await context.params;

    await submitRoomAction({
      roomId,
      userId: user.id,
      payload: JSON.stringify(body.payload ?? {}),
    });

    const room = await loadRoomState(roomId, user.id);
    return NextResponse.json({ room });
  } catch (error) {
    console.error("game/rooms/[roomId]/actions POST error:", error);
    return NextResponse.json(
      { error: "Failed to submit round action" },
      { status: 400 }
    );
  }
}

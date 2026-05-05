import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { loadRoomState, postRoomMessage } from "@/lib/game/ecoDeskServer";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      kind?: "text" | "voice";
      message?: string;
      metadata?: Record<string, unknown>;
    };
    const { roomId } = await context.params;

    if (!body.message || typeof body.message !== "string") {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    await postRoomMessage({
      roomId,
      userId: user.id,
      userName: user.name,
      kind: body.kind === "voice" ? "voice" : "text",
      body: body.message.slice(0, 20_000),
      metadata: JSON.stringify(body.metadata ?? {}),
    });

    const room = await loadRoomState(roomId, user.id);
    return NextResponse.json({ room });
  } catch (error) {
    console.error("game/rooms/[roomId]/messages POST error:", error);
    return NextResponse.json(
      { error: "Failed to post room message" },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { ECO_ROLES, type EcoRole } from "@/lib/game/ecoDesk";
import { joinEcoDeskRoom, loadRoomState } from "@/lib/game/ecoDeskServer";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { role?: EcoRole };
    const role =
      typeof body.role === "string" && ECO_ROLES.includes(body.role as EcoRole)
        ? (body.role as EcoRole)
        : null;

    if (!role) {
      return NextResponse.json({ error: "Role required" }, { status: 400 });
    }

    const { roomId } = await context.params;
    await joinEcoDeskRoom({
      roomId,
      userId: user.id,
      role,
      userName: user.name,
    });

    const room = await loadRoomState(roomId, user.id);
    return NextResponse.json({ room });
  } catch (error) {
    console.error("game/rooms/[roomId]/join POST error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to join game room",
      },
      { status: 400 }
    );
  }
}

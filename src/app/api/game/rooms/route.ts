import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { createEcoDeskRoom, listActiveGameRooms } from "@/lib/game/ecoDeskServer";
import { ECO_ROLES, type EcoRole } from "@/lib/game/ecoDesk";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rooms = await listActiveGameRooms(user.id);
    return NextResponse.json({ rooms });
  } catch (error) {
    console.error("game/rooms GET error:", error);
    return NextResponse.json(
      { error: "Failed to load game rooms" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { role?: EcoRole };

    const role =
      typeof body.role === "string" && ECO_ROLES.includes(body.role as EcoRole)
        ? (body.role as EcoRole)
        : "monitoring";

    const room = await createEcoDeskRoom({
      userId: user.id,
      userName: user.name,
      role,
    });

    return NextResponse.json({
      roomId: room.id,
      code: room.code,
    });
  } catch (error) {
    console.error("game/rooms POST error:", error);
    return NextResponse.json(
      { error: "Failed to create game room" },
      { status: 500 }
    );
  }
}

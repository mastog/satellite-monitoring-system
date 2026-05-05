import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { touchRoomPresence } from "@/lib/game/ecoDeskServer";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { roomId } = await context.params;
    await touchRoomPresence({ roomId, userId: user.id });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("game/rooms/[roomId]/presence POST error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to refresh room presence",
      },
      { status: 400 }
    );
  }
}

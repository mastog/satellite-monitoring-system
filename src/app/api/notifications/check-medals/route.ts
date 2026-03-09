import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { createMedalNotification } from "@/lib/notifications/create";

interface MedalInput {
  id: string;
  name: string;
  icon: string;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { earnedMedals } = (await req.json()) as {
      earnedMedals: MedalInput[];
    };

    if (!Array.isArray(earnedMedals)) {
      return NextResponse.json(
        { error: "earnedMedals must be an array" },
        { status: 400 }
      );
    }

    const created: string[] = [];
    for (const medal of earnedMedals) {
      const notification = await createMedalNotification(
        user.id,
        medal.name,
        medal.icon
      );
      if (notification) created.push(notification.id);
    }

    return NextResponse.json({ created });
  } catch (err) {
    console.error("Check medals error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

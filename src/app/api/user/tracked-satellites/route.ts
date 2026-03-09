import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import {
  getTrackedSatellites,
  setTrackedSatellites,
} from "@/lib/user/trackedSatellites";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const trackedSatelliteIds = await getTrackedSatellites(user.id);
    return NextResponse.json({ trackedSatelliteIds });
  } catch (err) {
    console.error("Tracked satellites API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const { satelliteIds } = await req.json();
    if (!Array.isArray(satelliteIds)) {
      return NextResponse.json(
        { error: "satelliteIds must be an array" },
        { status: 400 }
      );
    }
    await setTrackedSatellites(user.id, satelliteIds);
    return NextResponse.json({ trackedSatelliteIds: satelliteIds });
  } catch (err) {
    console.error("Tracked satellites API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

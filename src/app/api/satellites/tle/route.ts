import { NextResponse } from "next/server";
import { getSatelliteSnapshots } from "@/lib/satellite/snapshotCache";

// Returns the latest server-generated satellite snapshot set so clients can
// render current positions without fetching TLE data or propagating orbits.
export async function GET() {
  try {
    const { satellites, fetchedAt } = await getSatelliteSnapshots();

    return NextResponse.json({
      satellites,
      fetchedAt: fetchedAt?.toISOString() ?? null,
      count: satellites.length,
    });
  } catch (err) {
    console.error("TLE API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch satellite data", satellites: [] },
      { status: 500 }
    );
  }
}

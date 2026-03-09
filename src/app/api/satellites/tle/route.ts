import { NextResponse } from "next/server";
import {
  getTLEs,
  getTypeForGroup,
  computeEpochAge,
} from "@/lib/satellite/celestrakApi";
import { propagate } from "@/lib/satellite/propagator";
import type { SatelliteData } from "@/store/appStore";

export async function GET() {
  try {
    const tleRecords = await getTLEs();
    const now = new Date();
    const satellites: SatelliteData[] = [];

    for (const rec of tleRecords) {
      const pos = propagate(rec.line1, rec.line2, now);
      if (!pos) continue;

      satellites.push({
        id: `sat-${rec.noradId}`,
        name: rec.name,
        noradId: rec.noradId,
        lat: pos.lat,
        lng: pos.lng,
        alt: pos.alt,
        velocity: pos.velocity,
        type: getTypeForGroup(rec.satGroup),
        tle1: rec.line1,
        tle2: rec.line2,
        group: rec.satGroup,
        epochAge: computeEpochAge(rec.line1),
      });
    }

    return NextResponse.json({
      satellites,
      fetchedAt: now.toISOString(),
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

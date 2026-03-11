import { NextRequest, NextResponse } from "next/server";
import {
  getLatestSDGValues,
  getLatestSDGFetchTime,
  getSDGTimeSeries,
  SDG_INDICATORS,
} from "@/lib/sdg/worldBankApi";

const ALL_SDG_NUMBERS = Object.keys(SDG_INDICATORS).map(Number);

// Reads the cached indicator data prepared by the server refresh worker and
// returns both headline values and time-series data for the requested region.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const region = searchParams.get("region") || "Global";
    const sdgParam = searchParams.get("sdg");

    const sdgNumbers = sdgParam ? [parseInt(sdgParam, 10)] : ALL_SDG_NUMBERS;

    const results: Record<
      number,
      {
        latest: Awaited<ReturnType<typeof getLatestSDGValues>>;
        timeSeries: Awaited<ReturnType<typeof getSDGTimeSeries>>;
      }
    > = {};

    await Promise.all(
      sdgNumbers.map(async (sdg) => {
        const [latest, timeSeries] = await Promise.all([
          getLatestSDGValues(region, sdg),
          getSDGTimeSeries(region, sdg),
        ]);
        results[sdg] = { latest, timeSeries };
      })
    );

    const fetchedAt = await getLatestSDGFetchTime(region);

    return NextResponse.json({
      region,
      data: results,
      fetchedAt: fetchedAt?.toISOString() ?? null,
      dataSource: "World Bank SDG cache",
    });
  } catch (err) {
    console.error("SDG indicators API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch SDG data" },
      { status: 500 }
    );
  }
}

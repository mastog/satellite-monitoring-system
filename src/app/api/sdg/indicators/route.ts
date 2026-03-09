import { NextRequest, NextResponse } from "next/server";
import {
  getLatestSDGValues,
  getSDGTimeSeries,
  SDG_INDICATORS,
} from "@/lib/sdg/worldBankApi";

const ALL_SDG_NUMBERS = Object.keys(SDG_INDICATORS).map(Number);

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

    return NextResponse.json({
      region,
      data: results,
      fetchedAt: new Date().toISOString(),
      dataSource: "World Bank SDG Indicators",
    });
  } catch (err) {
    console.error("SDG indicators API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch SDG data" },
      { status: 500 }
    );
  }
}

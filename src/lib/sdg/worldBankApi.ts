import { prisma } from "@/lib/prisma";
import {
  isDailyRefreshDue,
  STATIC_REFRESH_HOUR_UTC,
} from "@/lib/serverRefresh";

// Maps the application's region labels to the World Bank identifiers used by the remote indicator API.
const REGION_CODES: Record<string, string> = {
  Global: "WLD",
  "East Asia & Pacific": "EAS",
  "Europe & Central Asia": "ECS",
  "Latin America & Caribbean": "LCN",
  "Middle East & North Africa": "MEA",
  "North America": "NAC",
  "South Asia": "SAS",
  "Sub-Saharan Africa": "SSF",
};

// Defines which World Bank indicators contribute to each tracked SDG and how each one should be normalized.
interface IndicatorDef {
  code: string;
  higherIsBetter: boolean;
  min: number;
  max: number;
}

export const SDG_INDICATORS: Record<number, IndicatorDef[]> = {
  6: [
    { code: "SH.H2O.SMDW.ZS", higherIsBetter: true, min: 0, max: 100 }, // Safely managed drinking water
    { code: "SH.H2O.BASW.ZS", higherIsBetter: true, min: 0, max: 100 }, // Basic water services
    { code: "SH.STA.SMSS.ZS", higherIsBetter: true, min: 0, max: 100 }, // Safely managed sanitation
    { code: "ER.H2O.FWTL.ZS", higherIsBetter: false, min: 0, max: 100 }, // Freshwater withdrawal
  ],
  9: [
    { code: "NV.IND.MANF.ZS", higherIsBetter: true, min: 0, max: 40 }, // Manufacturing value added
    { code: "IT.NET.USER.ZS", higherIsBetter: true, min: 0, max: 100 }, // Internet users
    { code: "GB.XPD.RSDV.GD.ZS", higherIsBetter: true, min: 0, max: 5 }, // R&D expenditure
    { code: "IP.PAT.RESD", higherIsBetter: true, min: 0, max: 500000 }, // Patent applications
  ],
  11: [
    { code: "EN.ATM.PM25.MC.M3", higherIsBetter: false, min: 0, max: 100 }, // PM2.5 exposure
    { code: "SP.URB.TOTL.IN.ZS", higherIsBetter: true, min: 0, max: 100 }, // Urban population %
    { code: "EN.URB.LCTY.UR.ZS", higherIsBetter: false, min: 0, max: 50 }, // Pop in largest city %
    { code: "EG.ELC.ACCS.ZS", higherIsBetter: true, min: 0, max: 100 }, // Electricity access
  ],
  12: [
    { code: "EN.GHG.CO2.PC.CE.AR5", higherIsBetter: false, min: 0, max: 20 }, // CO2 per capita (AR5, t CO2e)
    { code: "AG.LND.ARBL.ZS", higherIsBetter: true, min: 0, max: 50 }, // Arable land %
    { code: "NY.GDP.PCAP.KD.ZG", higherIsBetter: true, min: -5, max: 15 }, // GDP per capita growth
    { code: "EG.USE.PCAP.KG.OE", higherIsBetter: false, min: 0, max: 10000 }, // Energy use per capita
  ],
  13: [
    { code: "EN.GHG.ALL.PC.CE.AR5", higherIsBetter: false, min: 0, max: 25 }, // GHG per capita (AR5, t CO2e)
    { code: "EG.USE.COMM.FO.ZS", higherIsBetter: false, min: 0, max: 100 }, // Fossil fuel energy %
    { code: "AG.LND.FRST.ZS", higherIsBetter: true, min: 0, max: 80 }, // Forest area %
    { code: "EG.FEC.RNEW.ZS", higherIsBetter: true, min: 0, max: 100 }, // Renewable energy %
  ],
  15: [
    { code: "AG.LND.FRST.ZS", higherIsBetter: true, min: 0, max: 80 }, // Forest area %
    { code: "ER.PTD.TOTL.ZS", higherIsBetter: true, min: 0, max: 50 }, // Protected areas %
    { code: "ER.LND.PTLD.ZS", higherIsBetter: true, min: 0, max: 50 }, // Terrestrial protected
    { code: "AG.LND.AGRI.ZS", higherIsBetter: false, min: 0, max: 80 }, // Agricultural land %
  ],
};

function normalize(value: number, def: IndicatorDef): number {
  const clamped = Math.max(def.min, Math.min(def.max, value));
  const range = def.max - def.min;
  if (range === 0) return 50;
  const ratio = (clamped - def.min) / range;
  const score = def.higherIsBetter ? ratio * 100 : (1 - ratio) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}

async function getLatestIndicatorFetchTime(
  region: string,
  indicatorCode: string
): Promise<Date | null> {
  const latest = await prisma.sdgCache.findFirst({
    where: { region, indicatorCode },
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true },
  });
  return latest?.fetchedAt ?? null;
}

async function fetchIndicator(
  regionCode: string,
  indicatorCode: string
): Promise<{ year: number; value: number }[]> {
  const url = `https://api.worldbank.org/v2/country/${regionCode}/indicator/${indicatorCode}?format=json&date=2015:2023&per_page=50`;

  const response = await fetch(url, {
    headers: { "User-Agent": "SatelliteMonitoringSystem/1.0" },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) return [];

  const json = await response.json();
  if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1]))
    return [];

  return json[1]
    .filter((entry: { value: number | null }) => entry.value !== null)
    .map((entry: { date: string; value: number }) => ({
      year: parseInt(entry.date, 10),
      value: entry.value,
    }))
    .sort((a: { year: number }, b: { year: number }) => a.year - b.year);
}

async function fetchAndCache(
  region: string,
  indicatorCode: string
): Promise<{ year: number; value: number }[]> {
  const regionCode = REGION_CODES[region] || "WLD";
  const data = await fetchIndicator(regionCode, indicatorCode);

  // Rewrites the cached time series in-place so later API reads can stay
  // inside the database and avoid another World Bank request.
  const now = new Date();
  for (const d of data) {
    await prisma.sdgCache.upsert({
      where: {
        region_indicatorCode_year: { region, indicatorCode, year: d.year },
      },
      update: { value: d.value, fetchedAt: now },
      create: {
        region,
        indicatorCode,
        year: d.year,
        value: d.value,
        fetchedAt: now,
      },
    });
  }

  return data;
}

async function getCachedIndicatorSeries(
  region: string,
  indicatorCode: string
): Promise<{ year: number; value: number }[]> {
  const cached = await prisma.sdgCache.findMany({
    where: { region, indicatorCode },
    orderBy: { year: "asc" },
  });

  return cached
    .filter((row) => row.value !== null)
    .map((row) => ({ year: row.year, value: row.value! }));
}

// Refreshes every tracked indicator series once per daily server refresh
// window so user requests can stay inside the local cache boundary.
export async function refreshSDGCache(force: boolean = false): Promise<void> {
  const regions = Object.keys(REGION_CODES);
  const indicatorCodes = [
    ...new Set(
      Object.values(SDG_INDICATORS)
        .flat()
        .map((indicator) => indicator.code)
    ),
  ];

  for (const region of regions) {
    for (const indicatorCode of indicatorCodes) {
      const latest = await getLatestIndicatorFetchTime(region, indicatorCode);
      if (!force && !isDailyRefreshDue(latest, STATIC_REFRESH_HOUR_UTC)) {
        continue;
      }
      try {
        await fetchAndCache(region, indicatorCode);
      } catch (err) {
        console.error(
          `SDG refresh failed for ${region}/${indicatorCode}:`,
          err
        );
      }
    }
  }
}

// Reports the newest SDG fetch timestamp across the requested regions so API
// responses can describe when the server-side cache was last updated.
export async function getLatestSDGFetchTime(
  region: string
): Promise<Date | null> {
  const latest = await prisma.sdgCache.findFirst({
    where: { region },
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true },
  });
  return latest?.fetchedAt ?? null;
}

export interface SDGDataPoint {
  indicatorCode: string;
  year: number;
  value: number;
  normalizedScore: number;
}

export interface SDGLatestValues {
  indicatorCode: string;
  rawValue: number | null;
  normalizedScore: number;
  year: number | null;
}

// Reads one SDG's cached indicator history and converts each raw value into
// the normalized score scale used by the charts and summary cards.
export async function getSDGData(
  region: string,
  sdgNumber: number
): Promise<SDGDataPoint[]> {
  const indicators = SDG_INDICATORS[sdgNumber];
  if (!indicators) return [];

  const results: SDGDataPoint[] = [];
  for (const ind of indicators) {
    try {
      const data = await getCachedIndicatorSeries(region, ind.code);
      for (const d of data) {
        results.push({
          indicatorCode: ind.code,
          year: d.year,
          value: d.value,
          normalizedScore: normalize(d.value, ind),
        });
      }
    } catch {
      // Ignores one failed indicator so the rest of the SDG series can still be returned.
    }
  }
  return results;
}

// Reads the most recent cached value for every indicator that belongs to the
// requested SDG so the dashboard can render its headline metrics.
export async function getLatestSDGValues(
  region: string,
  sdgNumber: number
): Promise<SDGLatestValues[]> {
  const indicators = SDG_INDICATORS[sdgNumber];
  if (!indicators) return [];

  const results: SDGLatestValues[] = [];
  for (const ind of indicators) {
    try {
      const data = await getCachedIndicatorSeries(region, ind.code);
      if (data.length > 0) {
        const latest = data[data.length - 1];
        results.push({
          indicatorCode: ind.code,
          rawValue: latest.value,
          normalizedScore: normalize(latest.value, ind),
          year: latest.year,
        });
      } else {
        results.push({
          indicatorCode: ind.code,
          rawValue: null,
          normalizedScore: 50,
          year: null,
        });
      }
    } catch {
      results.push({
        indicatorCode: ind.code,
        rawValue: null,
        normalizedScore: 50,
        year: null,
      });
    }
  }
  return results;
}

// Builds the aggregate SDG trend line from cached indicator series so the UI
// can render historical progress without contacting the upstream API.
export async function getSDGTimeSeries(
  region: string,
  sdgNumber: number
): Promise<{ year: number; score: number }[]> {
  const indicators = SDG_INDICATORS[sdgNumber];
  if (!indicators) return [];

  // Buckets normalized indicator scores by year so a composite SDG trend line can be averaged.
  const yearScores: Record<number, number[]> = {};

  for (const ind of indicators) {
    try {
      const data = await getCachedIndicatorSeries(region, ind.code);
      for (const d of data) {
        if (!yearScores[d.year]) yearScores[d.year] = [];
        yearScores[d.year].push(normalize(d.value, ind));
      }
    } catch {
      // Ignores a failed indicator series so the remaining indicators can still contribute to the average.
    }
  }

  return Object.entries(yearScores)
    .map(([year, scores]) => ({
      year: parseInt(year, 10),
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))
    .sort((a, b) => a.year - b.year);
}

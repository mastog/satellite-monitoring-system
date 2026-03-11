import { prisma } from "@/lib/prisma";
import { parseTLEText, type TLERecord } from "./propagator";
import {
  isIntervalRefreshDue,
  TLE_REFRESH_INTERVAL_MS,
} from "@/lib/serverRefresh";

// Lists the CelesTrak groups fetched by the application and the local satellite
// type assigned to each group.
const CELESTRAK_GROUPS: { group: string; type: string; url: string }[] = [
  {
    group: "stations",
    type: "station",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle",
  },
  {
    group: "weather",
    type: "weather",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle",
  },
  {
    group: "resource",
    type: "active",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=resource&FORMAT=tle",
  },
  {
    group: "science",
    type: "active",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=science&FORMAT=tle",
  },
];

export interface TLECacheRecord {
  noradId: number;
  name: string;
  line1: string;
  line2: string;
  satGroup: string;
  fetchedAt: Date;
}

// Extracts the NORAD identifier from the first TLE line so records can be keyed consistently.
function extractNoradId(tle1: string): number {
  return parseInt(tle1.substring(2, 7).trim(), 10);
}

// Computes how many days old the TLE epoch is relative to the current time.
function computeEpochAge(tle1: string): number {
  const epochStr = tle1.substring(18, 32).trim();
  const year2d = parseInt(epochStr.substring(0, 2), 10);
  const year = year2d >= 57 ? 1900 + year2d : 2000 + year2d;
  const dayOfYear = parseFloat(epochStr.substring(2));
  const epochDate = new Date(Date.UTC(year, 0, 1));
  epochDate.setTime(epochDate.getTime() + (dayOfYear - 1) * 86400000);
  return (Date.now() - epochDate.getTime()) / 86400000;
}

// Reads the latest TLE fetch time so the background refresh worker can decide
// whether the server cache is due for another upstream sync.
export async function getLatestTLEFetchTime(): Promise<Date | null> {
  const latest = await prisma.tleCache.findFirst({
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true },
  });
  return latest?.fetchedAt ?? null;
}

// Fetches one CelesTrak group, parses the TLE text, and upserts every record into the cache table.
async function fetchAndCacheGroup(
  group: string,
  url: string
): Promise<TLERecord[]> {
  const response = await fetch(url, {
    headers: { "User-Agent": "SatelliteMonitoringSystem/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`CelesTrak ${group}: ${response.status}`);
  const text = await response.text();
  const records = parseTLEText(text);

  const now = new Date();
  for (const rec of records) {
    const noradId = extractNoradId(rec.tle1);
    if (isNaN(noradId)) continue;
    await prisma.tleCache.upsert({
      where: { noradId },
      update: {
        name: rec.name,
        line1: rec.tle1,
        line2: rec.tle2,
        satGroup: group,
        fetchedAt: now,
      },
      create: {
        noradId,
        name: rec.name,
        line1: rec.tle1,
        line2: rec.tle2,
        satGroup: group,
        fetchedAt: now,
      },
    });
  }

  return records;
}

// Refreshes the server-side TLE cache on the configured interval so request
// handlers can serve stored records without contacting CelesTrak directly.
export async function refreshTLECache(force: boolean = false): Promise<void> {
  const latest = await getLatestTLEFetchTime();
  if (!force && !isIntervalRefreshDue(latest, TLE_REFRESH_INTERVAL_MS)) return;

  // Refreshes all tracked CelesTrak groups together so downstream snapshot
  // generation always sees one coherent server-side TLE cache.
  await Promise.all(
    CELESTRAK_GROUPS.map((g) => fetchAndCacheGroup(g.group, g.url))
  );
}

// Returns the cached TLE rows without attempting an upstream refresh.
export async function getTLEs(): Promise<TLECacheRecord[]> {
  const cached = await prisma.tleCache.findMany();
  return cached.map((r) => ({
    noradId: r.noradId,
    name: r.name,
    line1: r.line1,
    line2: r.line2,
    satGroup: r.satGroup,
    fetchedAt: r.fetchedAt,
  }));
}

// Maps a cached CelesTrak group name back to the local satellite type used by the UI.
export function getTypeForGroup(
  group: string
): "station" | "weather" | "active" {
  const mapping = CELESTRAK_GROUPS.find((g) => g.group === group);
  return (mapping?.type as "station" | "weather" | "active") || "active";
}

export { computeEpochAge };

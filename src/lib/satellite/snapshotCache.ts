import { prisma } from "@/lib/prisma";
import { getTLEs, getTypeForGroup } from "@/lib/satellite/celestrakApi";
import { propagate } from "@/lib/satellite/propagator";
import {
  isIntervalRefreshDue,
  POSITION_REFRESH_INTERVAL_MS,
} from "@/lib/serverRefresh";
import type { SatelliteData } from "@/store/appStore";

// Reads the latest generated satellite snapshot timestamp so the background
// refresh worker can keep position data fresh on the server.
export async function getLatestSatelliteSnapshotTime(): Promise<Date | null> {
  const latest = await prisma.satelliteSnapshot.findFirst({
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true },
  });
  return latest?.fetchedAt ?? null;
}

// Generates current propagated positions from cached TLEs and stores them in
// the snapshot table that public APIs read from.
export async function refreshSatelliteSnapshots(
  force: boolean = false,
  now: Date = new Date()
): Promise<void> {
  const latest = await getLatestSatelliteSnapshotTime();
  if (
    !force &&
    !isIntervalRefreshDue(latest, POSITION_REFRESH_INTERVAL_MS, now)
  ) {
    return;
  }

  const tleRecords = await getTLEs();
  if (tleRecords.length === 0) return;

  const snapshotAt = now;
  const seenIds = new Set<string>();

  for (const rec of tleRecords) {
    // Propagates each cached TLE into a point-in-time snapshot so later API
    // responses can return precomputed positions without extra orbit math.
    const pos = propagate(rec.line1, rec.line2, now);
    if (!pos) continue;

    const satelliteId = `sat-${rec.noradId}`;
    seenIds.add(satelliteId);

    await prisma.satelliteSnapshot.upsert({
      where: { satelliteId },
      update: {
        name: rec.name,
        noradId: rec.noradId,
        lat: pos.lat,
        lng: pos.lng,
        alt: pos.alt,
        velocity: pos.velocity,
        type: getTypeForGroup(rec.satGroup),
        tle1: rec.line1,
        tle2: rec.line2,
        satGroup: rec.satGroup,
        epochAge: computeEpochAge(rec.line1),
        snapshotAt,
        fetchedAt: snapshotAt,
      },
      create: {
        satelliteId,
        name: rec.name,
        noradId: rec.noradId,
        lat: pos.lat,
        lng: pos.lng,
        alt: pos.alt,
        velocity: pos.velocity,
        type: getTypeForGroup(rec.satGroup),
        tle1: rec.line1,
        tle2: rec.line2,
        satGroup: rec.satGroup,
        epochAge: computeEpochAge(rec.line1),
        snapshotAt,
        fetchedAt: snapshotAt,
      },
    });
  }

  await prisma.satelliteSnapshot.deleteMany({
    where: { satelliteId: { notIn: [...seenIds] } },
  });
}

// Returns the latest stored satellite positions without asking the client to
// propagate or fetch external orbit data.
export async function getSatelliteSnapshots(): Promise<{
  satellites: SatelliteData[];
  fetchedAt: Date | null;
}> {
  const snapshots = await prisma.satelliteSnapshot.findMany();
  if (snapshots.length === 0) {
    return { satellites: [], fetchedAt: null };
  }

  const fetchedAt = snapshots.reduce<Date>(
    (latest, snapshot) =>
      snapshot.fetchedAt.getTime() > latest.getTime()
        ? snapshot.fetchedAt
        : latest,
    snapshots[0].fetchedAt
  );

  return {
    satellites: snapshots.map((snapshot) => ({
      id: snapshot.satelliteId,
      name: snapshot.name,
      noradId: snapshot.noradId,
      lat: snapshot.lat,
      lng: snapshot.lng,
      alt: snapshot.alt,
      velocity: snapshot.velocity,
      type: snapshot.type as SatelliteData["type"],
      tle1: snapshot.tle1 ?? undefined,
      tle2: snapshot.tle2 ?? undefined,
      group: snapshot.satGroup ?? undefined,
      epochAge: snapshot.epochAge ?? undefined,
    })),
    fetchedAt,
  };
}

// Recomputes the TLE epoch age for the stored snapshot rows so the UI can keep
// showing staleness information without parsing raw TLE lines on the client.
function computeEpochAge(tle1: string): number {
  const epochStr = tle1.substring(18, 32).trim();
  const year2d = parseInt(epochStr.substring(0, 2), 10);
  const year = year2d >= 57 ? 1900 + year2d : 2000 + year2d;
  const dayOfYear = parseFloat(epochStr.substring(2));
  const epochDate = new Date(Date.UTC(year, 0, 1));
  epochDate.setTime(epochDate.getTime() + (dayOfYear - 1) * 86400000);
  return (Date.now() - epochDate.getTime()) / 86400000;
}

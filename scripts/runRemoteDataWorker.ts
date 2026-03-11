import {
  refreshArticlesCache,
  refreshPapersCache,
} from "@/lib/science/syncArticles";
import { refreshSDGCache } from "@/lib/sdg/worldBankApi";
import { refreshTLECache } from "@/lib/satellite/celestrakApi";
import { refreshSatelliteSnapshots } from "@/lib/satellite/snapshotCache";
import { refreshClimateEventCache } from "@/app/api/climate/events/route";

const STATIC_TICK_MS = 60 * 1000;
const POSITION_TICK_MS = 10 * 1000;

// Refreshes the slower-changing external datasets that should be cached on the
// server and then served unchanged to remote clients.
async function refreshStaticSources() {
  await refreshArticlesCache();
  await refreshPapersCache();
  await refreshSDGCache();
  await refreshClimateEventCache();
  await refreshTLECache();
}

// Refreshes only the propagated position snapshots that the tracking views use
// for near-real-time satellite motion updates.
async function refreshPositionSnapshots() {
  await refreshSatelliteSnapshots();
}

// Keeps the worker alive when one upstream source fails by isolating each loop
// body behind a labeled error boundary.
async function safeRun(label: string, task: () => Promise<void>) {
  try {
    await task();
  } catch (err) {
    console.error(`[worker] ${label} failed:`, err);
  }
}

// Starts a long-running worker that performs one initial refresh and then
// continues updating static caches and position snapshots on separate cadences.
async function main() {
  console.log("[worker] starting remote data worker");

  await safeRun("initial static refresh", refreshStaticSources);
  await safeRun("initial position refresh", refreshPositionSnapshots);

  setInterval(() => {
    void safeRun("static refresh", refreshStaticSources);
  }, STATIC_TICK_MS);

  setInterval(() => {
    void safeRun("position refresh", refreshPositionSnapshots);
  }, POSITION_TICK_MS);
}

main().catch((err) => {
  console.error("[worker] failed to start:", err);
  process.exitCode = 1;
});

// Closes Prisma cleanly when the worker is stopped by the process manager.
process.on("SIGINT", async () => {
  const { prisma } = await import("@/lib/prisma");
  await prisma.$disconnect();
  process.exit(0);
});

// Closes Prisma cleanly when the worker is terminated by the host system.
process.on("SIGTERM", async () => {
  const { prisma } = await import("@/lib/prisma");
  await prisma.$disconnect();
  process.exit(0);
});

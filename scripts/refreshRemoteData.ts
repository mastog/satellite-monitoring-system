import {
  refreshArticlesCache,
  refreshPapersCache,
} from "@/lib/science/syncArticles";
import { refreshSDGCache } from "@/lib/sdg/worldBankApi";
import { refreshTLECache } from "@/lib/satellite/celestrakApi";
import { refreshSatelliteSnapshots } from "@/lib/satellite/snapshotCache";
import { refreshClimateEventCache } from "@/app/api/climate/events/route";

// Runs one full refresh pass so deployment scripts or cron jobs can populate
// every server-side cache before public traffic starts reading from it.
async function main() {
  console.log("[refresh] starting server cache refresh");

  await refreshArticlesCache(true);
  await refreshPapersCache(true);
  await refreshSDGCache(true);
  await refreshClimateEventCache(true);
  await refreshTLECache(true);
  await refreshSatelliteSnapshots(true);

  console.log("[refresh] completed server cache refresh");
}

// Ensures the script exits with a useful failure code while still releasing
// Prisma connections that were opened by the refresh helpers.
main()
  .catch((err) => {
    console.error("[refresh] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$disconnect();
  });

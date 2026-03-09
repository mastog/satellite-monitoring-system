import { prisma } from "@/lib/prisma";

export async function getTrackedSatellites(userId: string): Promise<string[]> {
  const rows = await prisma.trackedSatellite.findMany({
    where: { userId },
    select: { satelliteId: true },
  });
  return rows.map((r) => r.satelliteId);
}

export async function setTrackedSatellites(
  userId: string,
  ids: string[]
): Promise<void> {
  await prisma.$transaction([
    prisma.trackedSatellite.deleteMany({ where: { userId } }),
    prisma.trackedSatellite.createMany({
      data: ids.map((satelliteId) => ({ userId, satelliteId })),
    }),
  ]);
}

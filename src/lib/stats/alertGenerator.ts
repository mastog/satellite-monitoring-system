import { SatelliteData } from "@/store/appStore";
import { RegionalSDGData } from "@/lib/sdg/engine";
import { computeConjunctions } from "./dashboardStats";

export interface SystemAlert {
  id: number;
  type: "warning" | "info" | "success";
  msg: string;
  time: string;
}

function timeNow(): string {
  return "just now";
}

export function generateAlerts(
  satellites: SatelliteData[],
  sdgData: RegionalSDGData | null,
  trackedSatellites: string[]
): SystemAlert[] {
  const alerts: SystemAlert[] = [];
  let nextId = 1;

  // 1. Conjunction warnings (top 2)
  const conjunctions = computeConjunctions(satellites);
  for (const conj of conjunctions.slice(0, 2)) {
    alerts.push({
      id: nextId++,
      type: conj.type,
      msg: `Conjunction alert: ${conj.sat1} & ${conj.sat2}`,
      time: timeNow(),
    });
  }

  // 2. SDG score update (highest-scoring SDG)
  if (sdgData && sdgData.scores.length > 0) {
    const best = sdgData.scores.reduce((a, b) => (a.score > b.score ? a : b));
    alerts.push({
      id: nextId++,
      type: "success",
      msg: `SDG ${best.sdgNumber} score updated: ${best.score} pts (${sdgData.region})`,
      time: timeNow(),
    });
  }

  // 3. Tracking activity or debris density fallback
  if (trackedSatellites.length > 0) {
    const trackedSat = satellites.find(
      (s) => s.id === trackedSatellites[trackedSatellites.length - 1]
    );
    if (trackedSat) {
      alerts.push({
        id: nextId++,
        type: "info",
        msg: `${trackedSat.name} pass tracked — ALT ${Math.round(trackedSat.alt)}km`,
        time: timeNow(),
      });
    }
  }
  if (alerts.length < 4) {
    const debrisCount = satellites.filter((s) => s.type === "debris").length;
    if (debrisCount > 0) {
      alerts.push({
        id: nextId++,
        type: "info",
        msg: `LEO debris density update: ${debrisCount} objects in tracking sample`,
        time: timeNow(),
      });
    }
  }

  // 4. Catalog status fallback
  if (alerts.length < 4) {
    const activeCount = satellites.filter((s) => s.type !== "debris").length;
    alerts.push({
      id: nextId++,
      type: "info",
      msg: `Catalog status: ${activeCount} active satellites in tracking database`,
      time: timeNow(),
    });
  }

  return alerts.slice(0, 4);
}

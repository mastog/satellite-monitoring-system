import { SatelliteData } from "@/store/appStore";

// Describes a close-approach alert derived from the current propagated satellite set.
export interface ConjunctionAlert {
  sat1: string;
  sat2: string;
  distanceKm: number;
  type: "warning" | "info";
}

// Describes the headline stats displayed on the dashboard overview cards.
export interface DashboardStats {
  globalActiveSats: string;
  globalDebris: string;
  conjunctionAlerts: number;
}

// Computes great-circle distance between two latitude/longitude points.
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Combines ground distance and altitude difference into an approximate 3D separation.
function distance3D(s1: SatelliteData, s2: SatelliteData): number {
  const groundDist = haversineDistance(s1.lat, s1.lng, s2.lat, s2.lng);
  const altDiff = Math.abs(s1.alt - s2.alt);
  return Math.sqrt(groundDist ** 2 + altDiff ** 2);
}

// Scans the active non-debris satellites for close approaches under the configured threshold.
export function computeConjunctions(
  satellites: SatelliteData[],
  thresholdKm = 500
): ConjunctionAlert[] {
  const nonDebris = satellites.filter((s) => s.type !== "debris");
  const alerts: ConjunctionAlert[] = [];

  for (let i = 0; i < nonDebris.length; i++) {
    for (let j = i + 1; j < nonDebris.length; j++) {
      const dist = distance3D(nonDebris[i], nonDebris[j]);
      if (dist < thresholdKm) {
        alerts.push({
          sat1: nonDebris[i].name,
          sat2: nonDebris[j].name,
          distanceKm: Math.round(dist),
          type: dist < 100 ? "warning" : "info",
        });
      }
    }
  }

  return alerts.sort((a, b) => a.distanceKm - b.distanceKm);
}

// Computes the headline dashboard stats derived from the current satellite set.
export function computeDashboardStats(
  satellites: SatelliteData[]
): DashboardStats {
  const conjunctions = computeConjunctions(satellites);
  const activeSats = satellites.filter((s) => s.type !== "debris").length;
  const debrisCount = satellites.filter((s) => s.type === "debris").length;

  return {
    globalActiveSats: activeSats.toLocaleString(),
    globalDebris: debrisCount.toLocaleString(),
    conjunctionAlerts: conjunctions.length,
  };
}

// Buckets the current low-earth-orbit density into a coarse qualitative label.
export function computeLeoDensity(
  satellites: SatelliteData[]
): "HIGH" | "MODERATE" | "LOW" {
  const leoSats = satellites.filter((s) => s.type !== "debris" && s.alt < 2000);
  if (leoSats.length >= 15) return "HIGH";
  if (leoSats.length >= 8) return "MODERATE";
  return "LOW";
}

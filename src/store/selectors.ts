import { useMemo } from "react";
import { useAppStore, SatelliteData } from "./appStore";

/**
 * Creates a deterministic Mulberry32 pseudo-random generator.
 * The visible-satellite selector uses it to keep density-based sampling
 * stable until the store intentionally changes the seed.
 */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Computes the ordered satellite list rendered in the 3D scene.
 * The result starts with tracked and selected satellites, then appends the
 * density-limited non-debris sample, followed by debris entries.
 */
export function useVisibleSatellites(): SatelliteData[] {
  const satellites = useAppStore((s) => s.satellites);
  const trackedSatellites = useAppStore((s) => s.trackedSatellites);
  const selectedSatelliteId = useAppStore((s) => s.selectedSatellite?.id);
  const satelliteDensity = useAppStore((s) => s.satelliteDensity);
  const densitySeed = useAppStore((s) => s._densitySeed);

  return useMemo(() => {
    const debris: SatelliteData[] = [];
    const nonDebris: SatelliteData[] = [];

    for (const sat of satellites) {
      if (sat.type === "debris") debris.push(sat);
      else nonDebris.push(sat);
    }

    // Shuffles the non-debris pool with the current seeded generator.
    const rng = mulberry32(densitySeed);
    const shuffled = [...nonDebris];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Separates tracked and selected satellites from the density-limited pool.
    const tracked: SatelliteData[] = [];
    const pool: SatelliteData[] = [];
    for (const sat of shuffled) {
      if (
        trackedSatellites.includes(sat.id) ||
        (selectedSatelliteId != null && sat.id === selectedSatelliteId)
      ) {
        tracked.push(sat);
      } else pool.push(sat);
    }

    const remaining = Math.max(0, satelliteDensity - tracked.length);
    return [...tracked, ...pool.slice(0, remaining), ...debris];
  }, [
    satellites,
    trackedSatellites,
    selectedSatelliteId,
    satelliteDensity,
    densitySeed,
  ]);
}

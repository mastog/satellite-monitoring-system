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
 * Computes the ordered list of satellites rendered in the 3D scene.
 * Tracked satellites are always included first, a deterministic sample of
 * untracked non-debris satellites fills the remaining density budget, and
 * debris entries are appended so the debris layer stays visible regardless of
 * the density slider.
 */
export function useVisibleSatellites(): SatelliteData[] {
  const satellites = useAppStore((s) => s.satellites);
  const trackedSatellites = useAppStore((s) => s.trackedSatellites);
  const satelliteDensity = useAppStore((s) => s.satelliteDensity);
  const densitySeed = useAppStore((s) => s._densitySeed);

  return useMemo(() => {
    const debris: SatelliteData[] = [];
    const nonDebris: SatelliteData[] = [];

    for (const sat of satellites) {
      if (sat.type === "debris") debris.push(sat);
      else nonDebris.push(sat);
    }

    // Shuffles the non-debris pool with a seeded generator so the same seed
    // always produces the same visible sample.
    const rng = mulberry32(densitySeed);
    const shuffled = [...nonDebris];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Separates tracked satellites so they are guaranteed to stay visible
    // before any remaining capacity is filled from the shuffled pool.
    const tracked: SatelliteData[] = [];
    const pool: SatelliteData[] = [];
    for (const sat of shuffled) {
      if (trackedSatellites.includes(sat.id)) tracked.push(sat);
      else pool.push(sat);
    }

    const remaining = Math.max(0, satelliteDensity - tracked.length);
    return [...tracked, ...pool.slice(0, remaining), ...debris];
  }, [satellites, trackedSatellites, satelliteDensity, densitySeed]);
}

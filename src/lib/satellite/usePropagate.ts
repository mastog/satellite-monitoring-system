"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";
import { propagate } from "./propagator";

/**
 * Client-side hook that re-propagates satellite positions at a fixed interval.
 * Uses useAppStore.getState() inside the interval callback to avoid stale closures.
 */
export function useSatellitePropagate(intervalMs: number = 10000) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const { satellites, isPaused, timeOffset, setSatellites } =
        useAppStore.getState();
      if (isPaused || satellites.length === 0) return;

      const now = new Date(Date.now() + timeOffset);
      let changed = false;
      const updated = satellites.map((sat) => {
        // Only propagate non-debris satellites that have TLE data
        if (sat.type === "debris" || !sat.tle1 || !sat.tle2) return sat;

        const pos = propagate(sat.tle1, sat.tle2, now);
        if (!pos) return sat;

        changed = true;
        return {
          ...sat,
          lat: pos.lat,
          lng: pos.lng,
          alt: pos.alt,
          velocity: pos.velocity,
        };
      });

      if (changed) {
        setSatellites(updated);
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [intervalMs]);
}

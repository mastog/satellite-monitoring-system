"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";

/**
 * Polls the server-generated satellite snapshot feed at a fixed interval so
 * remote clients receive propagated positions without running orbit math.
 */
export function useSatellitePropagate(intervalMs: number = 10000) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      const { satellites, isPaused, setSatellites } = useAppStore.getState();
      if (isPaused || satellites.length === 0) return;

      try {
        const res = await fetch("/api/satellites/tle", { cache: "no-store" });
        if (!res.ok) return;

        const data = (await res.json()) as {
          satellites?: typeof satellites;
        };

        if (!Array.isArray(data.satellites) || data.satellites.length === 0) {
          return;
        }

        // Preserves the locally generated debris markers while replacing the
        // live satellite positions with the newest server snapshot set.
        const debris = satellites.filter((sat) => sat.type === "debris");
        setSatellites([...data.satellites, ...debris]);
      } catch {
        // Keeps the current on-screen positions when the snapshot poll fails.
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [intervalMs]);
}

"use client";

import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

const EarthScene = dynamic(() => import("@/components/3d/EarthScene"), {
  ssr: false,
});

const TrackedSatellitesOverlay = dynamic(
  () => import("@/components/3d/TrackedSatellitesOverlay"),
  { ssr: false }
);

const TimelineScrubber = dynamic(
  () => import("@/components/3d/TimelineScrubber"),
  { ssr: false }
);

// Renders the tracking page and its full-screen loading mask.
export default function TrackingPage() {
  const [sceneReady, setSceneReady] = useState(false);
  const [showLoading, setShowLoading] = useState(true);

  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  useEffect(() => {
    if (!sceneReady) return;
    const timer = window.setTimeout(() => setShowLoading(false), 220);
    return () => window.clearTimeout(timer);
  }, [sceneReady]);

  return (
    <div className="relative h-full overflow-hidden">
      <motion.div
        className="h-full"
        animate={{
          filter: showLoading ? "blur(10px)" : "blur(0px)",
          scale: showLoading ? 1.01 : 1,
        }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <EarthScene onReady={handleSceneReady} />
        <TrackedSatellitesOverlay />
        <TimelineScrubber />
      </motion.div>

      <AnimatePresence>
        {showLoading && (
          <motion.div
            className="absolute inset-0 z-[120] flex items-center justify-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background:
                "radial-gradient(120% 120% at 50% 0%, rgba(255,255,255,0.05) 0%, rgba(6,8,13,0.78) 34%, rgba(6,8,13,0.9) 100%)",
              backdropFilter: "blur(14px)",
            }}
          >
            <div className="relative flex flex-col items-center gap-5">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: "1px solid rgba(0,229,255,0.24)",
                    boxShadow: "0 0 30px rgba(0,229,255,0.14)",
                  }}
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 9,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <motion.div
                  className="absolute inset-[12px] rounded-full"
                  style={{
                    border: "1px dashed rgba(255,255,255,0.16)",
                  }}
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 14,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <motion.div
                  className="h-4 w-4 rounded-full"
                  style={{
                    background: "var(--accent)",
                    boxShadow: "0 0 20px var(--accent-glow)",
                  }}
                  animate={{ scale: [0.92, 1.1, 0.92], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
              </div>

              <div className="text-center">
                <div
                  className="text-[13px] font-bold tracking-[0.28em] uppercase"
                  style={{
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-orbitron)",
                  }}
                >
                  Tracking Matrix
                </div>
                <div
                  className="mt-2 text-[11px] tracking-[0.16em] uppercase"
                  style={{
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-fira-code)",
                  }}
                >
                  Loading globe assets and orbital overlays
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

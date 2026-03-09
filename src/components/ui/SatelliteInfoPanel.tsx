"use client";

import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";
import { motion, AnimatePresence } from "framer-motion";
import { formatAltitude, formatVelocity } from "@/lib/units";

export default function SatelliteInfoPanel() {
  const {
    selectedSatellite,
    setSelectedSatellite,
    toggleTracked,
    trackedSatellites,
    userPreferences,
    setShowAuthModal,
  } = useAppStore();
  const { isAuthenticated } = useAuthStore();

  const isTracked = selectedSatellite
    ? trackedSatellites.includes(selectedSatellite.id)
    : false;

  return (
    <AnimatePresence>
      {selectedSatellite && (
        <motion.div
          className="absolute right-6 top-20 z-30 glass-panel holo-shimmer"
          style={{ width: 320 }}
          initial={{ opacity: 0, x: 40, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="p-4 space-y-4">
            {/* Displays the selected satellite identity and exposes the close action that clears the current selection. */}
            <div className="flex justify-between items-start">
              <div>
                <h3
                  className="text-base font-bold tracking-[0.1em] text-glow-cyan"
                  style={{ fontFamily: "var(--font-orbitron)" }}
                >
                  {selectedSatellite.name}
                </h3>
                <div
                  className="text-[14px] mt-1 tracking-wider"
                  style={{
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-fira-code)",
                  }}
                >
                  NORAD ID: {selectedSatellite.noradId} | TYPE:{" "}
                  {selectedSatellite.type.toUpperCase()}
                </div>
              </div>
              <button
                onClick={() => setSelectedSatellite(null)}
                className="text-sm opacity-50 hover:opacity-100 transition-opacity flex-shrink-0 ml-2"
                style={{ color: "var(--text-secondary)" }}
              >
                [ESC]
              </button>
            </div>

            {/* Lets the user add or remove the selected satellite from the tracked list, and redirects unauthenticated users into the auth flow. */}
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  setShowAuthModal(true);
                  return;
                }
                toggleTracked(selectedSatellite.id);
              }}
              className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-lg text-[15px] font-bold tracking-[0.15em] transition-all cursor-pointer${isTracked ? " tracking-pulse" : ""}`}
              style={{
                background: isTracked
                  ? "rgba(57,255,127,0.12)"
                  : "rgba(0,229,255,0.08)",
                border: isTracked
                  ? "1px solid rgba(57,255,127,0.35)"
                  : "1px solid rgba(0,229,255,0.25)",
                color: isTracked ? "var(--neon-green)" : "var(--neon-cyan)",
                boxShadow: isTracked
                  ? "0 0 12px rgba(57,255,127,0.08)"
                  : "0 0 12px rgba(0,229,255,0.06)",
              }}
            >
              {isTracked ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              )}
              {isTracked
                ? "TRACKING — CLICK TO REMOVE"
                : "ADD TO TRACKING LIST"}
            </button>

            {/* Shows the core telemetry fields that operators need at a glance, formatted in the user's preferred unit system. */}
            <div
              className="grid grid-cols-2 gap-3"
              style={{ fontFamily: "var(--font-fira-code)" }}
            >
              {[
                {
                  label: "LATITUDE",
                  value: `${selectedSatellite.lat.toFixed(4)}°`,
                  color: "var(--neon-cyan)",
                },
                {
                  label: "LONGITUDE",
                  value: `${selectedSatellite.lng.toFixed(4)}°`,
                  color: "var(--neon-cyan)",
                },
                {
                  label: "ALTITUDE",
                  value: formatAltitude(
                    selectedSatellite.alt,
                    userPreferences.preferredUnits
                  ),
                  color: "var(--neon-green)",
                },
                {
                  label: "VELOCITY",
                  value: formatVelocity(
                    selectedSatellite.velocity,
                    userPreferences.preferredUnits
                  ),
                  color: "var(--neon-orange)",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg p-2.5"
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--border-subtle)",
                    borderLeft: `2px solid ${item.color}50`,
                  }}
                >
                  <div
                    className="text-[14px] tracking-[0.15em] mb-1"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {item.label}
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: item.color }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Holds follow-up actions related to the selected satellite, such as future pass prediction. */}
            <div className="flex gap-2">
              <button className="cyber-btn flex-1">PREDICT PASS</button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

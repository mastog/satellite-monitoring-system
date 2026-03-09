"use client";

import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";
import { motion, AnimatePresence } from "framer-motion";
import { formatAltitude } from "@/lib/units";

const COLOR_MAP: Record<string, string> = {
  debris: "#ff3a5c",
  station: "#ffd54f",
  weather: "#39ff7f",
  active: "#00e5ff",
};

export default function TrackedSatellitesOverlay() {
  const {
    satellites,
    trackedSatellites,
    setSelectedSatellite,
    toggleTracked,
    userPreferences,
    setShowAuthModal,
  } = useAppStore();
  const { isAuthenticated } = useAuthStore();

  const tracked = satellites.filter((s) => trackedSatellites.includes(s.id));

  return (
    <div
      className="absolute left-4 z-20 orbital-hud"
      style={{
        top: 230,
        width: 240,
        padding: 0,
      }}
    >
      <div className="panel-header" style={{ padding: "10px 14px" }}>
        <div className="dot" />
        <span style={{ flex: 1 }}>TRACKED</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 22,
            height: 20,
            padding: "0 5px",
            borderRadius: 10,
            fontSize: "11px",
            fontWeight: 700,
            fontFamily: "var(--font-fira-code)",
            lineHeight: 1,
            letterSpacing: "0",
            textAlign: "center" as const,
            background: "var(--accent-dim)",
            color: "var(--accent)",
            border: "1px solid var(--accent-glow)",
            boxShadow: "0 0 8px var(--accent-dim)",
          }}
        >
          {tracked.length}
        </span>
      </div>

      {tracked.length === 0 ? (
        <div
          style={{
            padding: "20px 14px",
            textAlign: "center",
            fontFamily: "var(--font-fira-code)",
            fontSize: "10px",
            letterSpacing: "0.1em",
            color: "var(--text-dim)",
          }}
        >
          NO TRACKED SATELLITES
        </div>
      ) : (
        <div
          className="p-2 space-y-1"
          style={{ maxHeight: 256, overflowY: "auto" }}
        >
          <AnimatePresence>
            {tracked.map((sat) => {
              const color = COLOR_MAP[sat.type] || "#00e5ff";
              return (
                <motion.div
                  key={sat.id}
                  className="w-full flex items-center gap-2 rounded-lg cursor-pointer"
                  style={{
                    background: "rgba(0,0,0,0.25)",
                    border: "1px solid var(--border-subtle)",
                    overflow: "hidden",
                    padding: 0,
                  }}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  whileHover={{
                    borderColor: color,
                    background: "rgba(0,0,0,0.45)",
                    boxShadow: `0 0 12px ${color}15`,
                    transition: { duration: 0.15 },
                  }}
                  onClick={() => setSelectedSatellite(sat)}
                >
                  {/* Left accent bar */}
                  <div
                    style={{
                      width: 3,
                      alignSelf: "stretch",
                      background: color,
                      boxShadow: `0 0 6px ${color}60`,
                      borderRadius: "3px 0 0 3px",
                      flexShrink: 0,
                    }}
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0 py-2 pr-2">
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[13px] font-bold tracking-wider truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {sat.name}
                      </div>
                      <div
                        className="text-[11px] tracking-wider mt-0.5"
                        style={{
                          color: "var(--text-dim)",
                          fontFamily: "var(--font-fira-code)",
                        }}
                      >
                        {sat.type.toUpperCase()} ·{" "}
                        {formatAltitude(
                          sat.alt,
                          userPreferences.preferredUnits
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isAuthenticated) {
                          setShowAuthModal(true);
                          return;
                        }
                        toggleTracked(sat.id);
                      }}
                      className="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 transition-all opacity-30 hover:opacity-100"
                      style={{
                        background: "rgba(255,58,92,0.06)",
                        border: "1px solid rgba(255,58,92,0.12)",
                        color: "var(--neon-red)",
                      }}
                      title="Remove from tracking"
                    >
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 10 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M2 2l6 6M8 2l-6 6" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

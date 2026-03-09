"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ClimateEvent } from "@/lib/climate/data";
import {
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
} from "@/lib/climate/data";

interface EventDetailModalProps {
  event: ClimateEvent | null;
  onClose: () => void;
}

const severityLabels = [
  "",
  "Minor",
  "Moderate",
  "Severe",
  "Critical",
  "Catastrophic",
];

// Renders the expanded modal view for one selected climate event.
export default function EventDetailModal({
  event,
  onClose,
}: EventDetailModalProps) {
  if (!event) return null;
  const color = EVENT_TYPE_COLORS[event.type];

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: "rgba(6,8,13,0.88)",
              backdropFilter: "blur(12px)",
            }}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative w-full max-w-lg mx-4 rounded-xl overflow-hidden"
            style={{
              background: "rgba(12,14,20,0.95)",
              border: `1px solid ${color}15`,
              boxShadow: `0 24px 64px rgba(0,0,0,0.6), 0 0 40px ${color}08`,
              maxHeight: "85vh",
              overflowY: "auto",
              backdropFilter: "blur(20px)",
            }}
            initial={{ opacity: 0, scale: 0.88, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 30 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Presents the event identity, type, and close control in the modal header. */}
            <div
              className="relative px-5 pt-5 pb-4"
              style={{
                background: `linear-gradient(180deg, ${color}0a 0%, transparent 100%)`,
              }}
            >
              <div
                className="h-[2px] absolute top-0 left-0 right-0"
                style={{
                  background: `linear-gradient(90deg, ${color}, ${color}40, transparent)`,
                }}
              />

              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[18px]"
                      style={{ color, filter: `drop-shadow(0 0 4px ${color})` }}
                    >
                      {EVENT_TYPE_ICONS[event.type]}
                    </span>
                    <span
                      className="text-[13px] font-bold tracking-[0.15em] uppercase"
                      style={{ color, fontFamily: "var(--font-exo2)" }}
                    >
                      {EVENT_TYPE_LABELS[event.type]}
                    </span>
                    {event.magnitude != null && (
                      <span
                        className="text-[13px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: `${color}15`,
                          color,
                          fontFamily: "var(--font-fira-code)",
                        }}
                      >
                        M{event.magnitude.toFixed(1)}
                      </span>
                    )}
                    {event.source && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          color: "var(--text-dim)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          fontFamily: "var(--font-fira-code)",
                        }}
                      >
                        {event.source}
                      </span>
                    )}
                  </div>
                  <h2
                    className="text-[20px] font-bold leading-snug"
                    style={{
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-orbitron)",
                    }}
                  >
                    {event.title}
                  </h2>
                </div>
                <motion.button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer mt-1"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "var(--text-dim)",
                  }}
                  whileHover={{
                    scale: 1.1,
                    background: "rgba(255,255,255,0.08)",
                  }}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
            </div>

            <div className="px-5 pb-5">
              {/* Summarizes the current response status and severity rating. */}
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="px-2.5 py-1 rounded text-[13px] font-bold uppercase tracking-wider"
                  style={{
                    background:
                      event.status === "active"
                        ? "rgba(255,59,48,0.1)"
                        : event.status === "monitoring"
                          ? "rgba(255,213,79,0.1)"
                          : "rgba(57,255,127,0.1)",
                    color:
                      event.status === "active"
                        ? "#ff3b30"
                        : event.status === "monitoring"
                          ? "#ffd54f"
                          : "#39ff7f",
                    border: `1px solid ${event.status === "active" ? "rgba(255,59,48,0.15)" : event.status === "monitoring" ? "rgba(255,213,79,0.15)" : "rgba(57,255,127,0.15)"}`,
                  }}
                >
                  {event.status}
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: i < event.severity ? color : `${color}18`,
                        boxShadow:
                          i < event.severity ? `0 0 5px ${color}60` : "none",
                      }}
                    />
                  ))}
                  <span
                    className="text-[13px] ml-1.5 font-semibold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {severityLabels[event.severity]}
                  </span>
                </div>
              </div>

              <p
                className="text-[15px] leading-relaxed mb-5"
                style={{ color: "var(--text-secondary)" }}
              >
                {event.description}
              </p>

              {/* Shows the key structured metadata associated with the event. */}
              <div className="grid grid-cols-2 gap-2.5 mb-5">
                {[
                  { label: "Region", value: event.region },
                  {
                    label: "Area Affected",
                    value: `${event.areaAffectedKm2.toLocaleString()} km²`,
                  },
                  {
                    label: "Satellite",
                    value: event.detectingSatellite,
                    accent: true,
                  },
                  {
                    label: "Detection Date",
                    value: event.detectionDate,
                    mono: true,
                  },
                  {
                    label: "Coordinates",
                    value: `${event.lat.toFixed(2)}°, ${event.lng.toFixed(2)}°`,
                    mono: true,
                  },
                  {
                    label: "Source / ID",
                    value: `${event.source ? event.source.toUpperCase() + " · " : ""}${event.id}`,
                    mono: true,
                    dim: true,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="px-3 py-2 rounded-lg"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.03)",
                    }}
                  >
                    <div
                      className="text-[11px] uppercase tracking-wider mb-0.5 font-bold"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {item.label}
                    </div>
                    <div
                      className="text-[14px] font-semibold truncate"
                      style={{
                        color: item.accent
                          ? color
                          : item.dim
                            ? "var(--text-dim)"
                            : "var(--text-primary)",
                        fontFamily: item.mono
                          ? "var(--font-fira-code)"
                          : undefined,
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* SDG Impact */}
              <div>
                <div
                  className="text-[12px] font-bold tracking-[0.12em] uppercase mb-2"
                  style={{ color: "var(--text-dim)" }}
                >
                  SDG Impact Assessment
                </div>
                <div className="flex flex-wrap gap-2">
                  {event.sdgImpact.map((imp) => {
                    const barWidth = Math.min(100, Math.abs(imp.score) * 25);
                    const impColor =
                      imp.score < -2
                        ? "#ff3b30"
                        : imp.score < -1
                          ? "#ffd54f"
                          : "#8a9bbd";
                    return (
                      <div
                        key={imp.sdg}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.03)",
                          minWidth: 100,
                        }}
                      >
                        <span
                          className="text-[13px] font-bold"
                          style={{
                            color: "var(--text-primary)",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          SDG {imp.sdg}
                        </span>
                        <div
                          className="flex-1 h-[3px] rounded-full overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.04)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${barWidth}%`,
                              background: impColor,
                            }}
                          />
                        </div>
                        <span
                          className="text-[12px] font-bold tabular-nums"
                          style={{
                            color: impColor,
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          {imp.score > 0 ? "+" : ""}
                          {imp.score.toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

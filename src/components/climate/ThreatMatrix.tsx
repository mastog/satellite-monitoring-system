"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { ClimateEvent, ClimateEventType } from "@/lib/climate/data";
import {
  EVENT_TYPE_COLORS,
  EVENT_TYPE_ICONS,
  EVENT_TYPE_LABELS,
  ALL_EVENT_TYPES,
} from "@/lib/climate/data";

interface ThreatMatrixProps {
  events: ClimateEvent[];
}

const SEV_COLORS = ["#39ff7f", "#ffd54f", "#ff6b2c", "#ff3a8c", "#ff0040"];

export default function ThreatMatrix({ events }: ThreatMatrixProps) {
  const [hovered, setHovered] = useState<{
    type: ClimateEventType;
    sev: number;
  } | null>(null);

  const { matrix, rowTotals, maxCell } = useMemo(() => {
    const grid: Record<string, number[]> = {};
    const totals: Record<string, number> = {};
    let max = 1;

    ALL_EVENT_TYPES.forEach((t) => {
      grid[t] = [0, 0, 0, 0, 0];
      totals[t] = 0;
    });

    events.forEach((e) => {
      if (grid[e.type]) {
        grid[e.type][e.severity - 1]++;
        totals[e.type]++;
      }
    });

    Object.values(grid).forEach((row) => {
      row.forEach((v) => {
        if (v > max) max = v;
      });
    });

    return { matrix: grid, rowTotals: totals, maxCell: max };
  }, [events]);

  const grandTotal = Object.values(rowTotals).reduce((a, b) => a + b, 0);

  // Counts active events per hazard type so the matrix can show which rows currently have live incidents.
  const activeByType = useMemo(() => {
    const m: Record<string, number> = {};
    events.forEach((e) => {
      if (e.status === "active") m[e.type] = (m[e.type] || 0) + 1;
    });
    return m;
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-[13px]" style={{ color: "var(--text-dim)" }}>
          No threat data available
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Labels each severity column so the matrix can be read left to right by escalating impact. */}
      <div
        className="flex items-center flex-shrink-0"
        style={{ paddingLeft: 66, height: 18 }}
      >
        <div className="flex-1 grid grid-cols-5 gap-[2px]">
          {[1, 2, 3, 4, 5].map((sev, i) => (
            <div key={sev} className="flex items-center justify-center">
              <span
                className="text-[9px] font-bold tracking-wider"
                style={{
                  color: SEV_COLORS[i],
                  fontFamily: "var(--font-fira-code)",
                  opacity: 0.5,
                }}
              >
                S{sev}
              </span>
            </div>
          ))}
        </div>
        <div className="w-[34px] flex-shrink-0" />
      </div>

      {/* Renders one row per hazard type with counts distributed across the severity buckets. */}
      <div className="flex-1 flex flex-col gap-[2px] justify-center min-h-0">
        {ALL_EVENT_TYPES.map((type, rowIdx) => {
          const c = EVENT_TYPE_COLORS[type];
          const total = rowTotals[type];
          const isRowHovered = hovered?.type === type;
          const hasActive = (activeByType[type] || 0) > 0;

          return (
            <motion.div
              key={type}
              className="flex items-center gap-[3px]"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.35,
                delay: rowIdx * 0.03,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {/* Displays the hazard icon and label that identify the current matrix row. */}
              <div
                className="flex items-center gap-[3px] flex-shrink-0"
                style={{ width: 62 }}
              >
                <span
                  className="text-[11px] leading-none flex-shrink-0"
                  style={{
                    color: c,
                    filter:
                      isRowHovered || hasActive
                        ? `drop-shadow(0 0 3px ${c}80)`
                        : "none",
                    transition: "filter 0.15s",
                  }}
                >
                  {EVENT_TYPE_ICONS[type]}
                </span>
                <span
                  className="text-[8px] font-bold tracking-[0.04em] uppercase truncate"
                  style={{
                    color: isRowHovered ? c : `${c}88`,
                    fontFamily: "var(--font-fira-code)",
                    transition: "color 0.15s",
                  }}
                >
                  {EVENT_TYPE_LABELS[type].slice(0, 5)}
                </span>
              </div>

              {/* Renders the severity cells for the current hazard type. */}
              <div className="flex-1 grid grid-cols-5 gap-[2px]">
                {[0, 1, 2, 3, 4].map((sevIdx) => {
                  const count = matrix[type][sevIdx];
                  const intensity = count / maxCell;
                  const isCellHovered =
                    hovered?.type === type && hovered?.sev === sevIdx;

                  // Scales the cell fill strength so larger counts read as visually stronger signals.
                  const bgAlpha =
                    count > 0 ? Math.round(intensity * 30 + 6) : 1;
                  const borderAlpha =
                    count > 0 ? Math.round(intensity * 35 + 10) : 2;

                  return (
                    <motion.div
                      key={sevIdx}
                      className="relative flex items-center justify-center rounded-[3px] cursor-default overflow-hidden"
                      style={{
                        height: 18,
                        background:
                          count > 0
                            ? `${c}${bgAlpha.toString(16).padStart(2, "0")}`
                            : "rgba(255,255,255,0.008)",
                        border: `1px solid ${count > 0 ? `${c}${borderAlpha.toString(16).padStart(2, "0")}` : "rgba(255,255,255,0.015)"}`,
                        boxShadow:
                          isCellHovered && count > 0
                            ? `0 0 10px ${c}25, inset 0 0 8px ${c}10`
                            : "none",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={() => setHovered({ type, sev: sevIdx })}
                      onMouseLeave={() => setHovered(null)}
                      whileHover={count > 0 ? { scale: 1.12 } : {}}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 25,
                      }}
                    >
                      {count > 0 && (
                        <>
                          <span
                            className="text-[10px] font-bold tabular-nums relative z-10"
                            style={{
                              color: c,
                              fontFamily: "var(--font-fira-code)",
                              textShadow: `0 0 5px ${c}40`,
                            }}
                          >
                            {count}
                          </span>
                          {/* Adds a thin highlight edge so active cells feel illuminated. */}
                          <div
                            className="absolute top-0 left-0 right-0 h-px"
                            style={{
                              background: `linear-gradient(90deg, transparent, ${c}${Math.round(
                                intensity * 60 + 15
                              )
                                .toString(16)
                                .padStart(2, "0")}, transparent)`,
                            }}
                          />
                          {/* Overlays a scanline texture to match the panel's monitoring aesthetic. */}
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundImage: `repeating-linear-gradient(0deg, transparent 0px, transparent 3px, ${c}04 3px, ${c}04 4px)`,
                              opacity: 0.5,
                            }}
                          />
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Shows the total event count for the current hazard row. */}
              <div className="w-[34px] flex-shrink-0 flex items-center justify-end gap-[3px]">
                {/* Adds a compact proportional bar that reinforces the numeric row total. */}
                <div
                  className="h-[3px] rounded-full"
                  style={{
                    width:
                      total > 0
                        ? Math.max(
                            4,
                            (total / Math.max(1, ...Object.values(rowTotals))) *
                              16
                          )
                        : 0,
                    background:
                      total > 0
                        ? `linear-gradient(90deg, ${c}60, ${c})`
                        : "transparent",
                    boxShadow: total > 0 ? `0 0 4px ${c}30` : "none",
                    transition: "width 0.3s, background 0.3s",
                  }}
                />
                <span
                  className="text-[10px] font-bold tabular-nums"
                  style={{
                    color: total > 0 ? c : "var(--text-dim)",
                    fontFamily: "var(--font-fira-code)",
                    opacity: total > 0 ? 0.85 : 0.25,
                    textShadow: total > 0 ? `0 0 3px ${c}30` : "none",
                  }}
                >
                  {total}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summarizes the total number of events that fall into each severity column. */}
      <div
        className="flex items-center flex-shrink-0 mt-[2px] pt-[3px]"
        style={{ borderTop: "1px solid rgba(255,255,255,0.03)", height: 18 }}
      >
        <div className="flex-shrink-0" style={{ width: 62 }}>
          <span
            className="text-[8px] font-bold tracking-wider uppercase"
            style={{
              color: "var(--text-dim)",
              fontFamily: "var(--font-fira-code)",
              opacity: 0.5,
            }}
          >
            TOTAL
          </span>
        </div>
        <div className="flex-1 grid grid-cols-5 gap-[2px] ml-[3px]">
          {[0, 1, 2, 3, 4].map((sevIdx) => {
            const colTotal = ALL_EVENT_TYPES.reduce(
              (sum, t) => sum + matrix[t][sevIdx],
              0
            );
            return (
              <div key={sevIdx} className="flex items-center justify-center">
                <span
                  className="text-[9px] font-bold tabular-nums"
                  style={{
                    color:
                      colTotal > 0 ? SEV_COLORS[sevIdx] : "var(--text-dim)",
                    fontFamily: "var(--font-fira-code)",
                    opacity: colTotal > 0 ? 0.65 : 0.2,
                  }}
                >
                  {colTotal}
                </span>
              </div>
            );
          })}
        </div>
        <div className="w-[34px] flex-shrink-0 flex items-center justify-end">
          <span
            className="text-[10px] font-bold tabular-nums"
            style={{
              color: "#00e5ff",
              fontFamily: "var(--font-fira-code)",
              textShadow: "0 0 5px rgba(0,229,255,0.25)",
            }}
          >
            {grandTotal}
          </span>
        </div>
      </div>
    </div>
  );
}

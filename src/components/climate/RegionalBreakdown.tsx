"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ClimateEvent, ClimateEventType } from "@/lib/climate/data";
import {
  EVENT_TYPE_COLORS,
  EVENT_TYPE_ICONS,
  getRegionFromCoords,
} from "@/lib/climate/data";

interface RegionalBreakdownProps {
  events: ClimateEvent[];
}

const REGION_ORDER = [
  "Asia-Pacific",
  "Africa",
  "North America",
  "South America",
  "Europe",
  "Middle East",
  "Arctic",
  "Antarctic",
  "Other",
];

// Renders the per-region event summary bars used by the climate dashboard.
export default function RegionalBreakdown({ events }: RegionalBreakdownProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Aggregates events by broad region and sorts the result for bar rendering.
  const regionData = useMemo(() => {
    const map = new Map<string, Map<ClimateEventType, number>>();
    events.forEach((e) => {
      const region = getRegionFromCoords(e.lat, e.lng);
      if (!map.has(region)) map.set(region, new Map());
      const typeMap = map.get(region)!;
      typeMap.set(e.type, (typeMap.get(e.type) || 0) + 1);
    });
    return REGION_ORDER.filter((r) => map.has(r))
      .map((region) => {
        const typeMap = map.get(region)!;
        const total = Array.from(typeMap.values()).reduce((s, v) => s + v, 0);
        const types = Array.from(typeMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => ({ type, count }));
        return { region, total, types };
      })
      .sort((a, b) => b.total - a.total);
  }, [events]);

  const maxTotal = Math.max(1, ...regionData.map((r) => r.total));
  const hoveredRow = hoveredRegion
    ? regionData.find((r) => r.region === hoveredRegion)
    : null;

  if (regionData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-[13px]" style={{ color: "var(--text-dim)" }}>
          No regional data
        </span>
      </div>
    );
  }

  // Scales row height and spacing so the chart fits the available panel height
  // without introducing a scrollbar.
  const n = regionData.length;
  const barH = n > 7 ? 10 : n > 5 ? 12 : 14;
  const barGap = n > 7 ? 2 : n > 5 ? 3 : 6;

  return (
    <div className="flex flex-col h-full">
      {/* Draws the stacked regional bars with hover-sensitive coloring and counts. */}
      <div
        className="flex-1 flex flex-col justify-center min-h-0"
        style={{ gap: barGap }}
      >
        {regionData.map((row, i) => {
          const barWidth = (row.total / maxTotal) * 100;
          const isHovered = hoveredRegion === row.region;
          const dominantColor =
            EVENT_TYPE_COLORS[row.types[0]?.type as ClimateEventType] ||
            "#8a9bbd";

          return (
            <motion.div
              key={row.region}
              className="flex items-center gap-2.5 cursor-default"
              onMouseEnter={() => setHoveredRegion(row.region)}
              onMouseLeave={() => setHoveredRegion(null)}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.4,
                delay: i * 0.05,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {/* Displays the current region name aligned with its bar. */}
              <div
                className="w-[84px] flex-shrink-0 text-right text-[12px] font-bold tracking-[0.06em] uppercase truncate transition-colors duration-200"
                style={{
                  color: isHovered ? dominantColor : "var(--text-dim)",
                  fontFamily: "var(--font-exo2)",
                  textShadow: isHovered ? `0 0 8px ${dominantColor}40` : "none",
                }}
              >
                {row.region}
              </div>

              {/* Hosts the stacked type segments that make up the regional total. */}
              <div
                className="flex-1 relative rounded-sm overflow-hidden"
                style={{
                  height: barH,
                  background: isHovered
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(255,255,255,0.015)",
                  transition: "background 0.2s",
                }}
              >
                <motion.div
                  className="absolute inset-y-0 left-0 flex rounded-sm overflow-hidden"
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{
                    duration: 0.8,
                    delay: i * 0.06,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {row.types.map(({ type, count }) => {
                    const segWidth = (count / row.total) * 100;
                    const c = EVENT_TYPE_COLORS[type as ClimateEventType];
                    return (
                      <div
                        key={type}
                        className="h-full relative"
                        style={{
                          width: `${segWidth}%`,
                          minWidth: 2,
                        }}
                      >
                        <div
                          className="absolute inset-0"
                          style={{
                            background: `${c}${isHovered ? "55" : "30"}`,
                            transition: "background 0.2s",
                          }}
                        />
                        <div
                          className="absolute top-0 left-0 right-0 h-[1px]"
                          style={{
                            background: `${c}${isHovered ? "80" : "40"}`,
                            transition: "background 0.2s",
                          }}
                        />
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: `repeating-linear-gradient(0deg, transparent 0px, transparent 2px, ${c}08 2px, ${c}08 3px)`,
                          }}
                        />
                      </div>
                    );
                  })}
                  <div
                    className="absolute top-0 right-0 bottom-0 w-[1px]"
                    style={{
                      background: `${dominantColor}${isHovered ? "70" : "35"}`,
                      boxShadow: isHovered
                        ? `0 0 6px ${dominantColor}30`
                        : "none",
                      transition: "all 0.2s",
                    }}
                  />
                </motion.div>

                {[25, 50, 75].map((pct) => (
                  <div
                    key={pct}
                    className="absolute top-0 bottom-0 w-px"
                    style={{
                      left: `${pct}%`,
                      background: "rgba(255,255,255,0.03)",
                    }}
                  />
                ))}
              </div>

              {/* Shows the total event count for the region. */}
              <span
                className="w-[28px] text-right text-[13px] font-bold tabular-nums flex-shrink-0 transition-colors duration-200"
                style={{
                  color: isHovered ? dominantColor : "var(--text-secondary)",
                  fontFamily: "var(--font-fira-code)",
                  textShadow: isHovered ? `0 0 6px ${dominantColor}30` : "none",
                }}
              >
                {row.total}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Shows the hovered region's event-type mix without shifting the bar layout above. */}
      <div
        className="h-[28px] flex-shrink-0 flex items-center mt-1"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.03)",
        }}
      >
        <AnimatePresence mode="wait">
          {hoveredRow ? (
            <motion.div
              key={hoveredRow.region}
              className="flex items-center gap-2.5 w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              {/* Spacer — matches bar label width so icons align with bar left edge */}
              <div className="w-[84px] flex-shrink-0" />
              {/* Type breakdown icons — left-aligned with bar start */}
              <div className="flex items-center gap-3 overflow-hidden flex-1">
                {hoveredRow.types.slice(0, 6).map(({ type, count }) => {
                  const c = EVENT_TYPE_COLORS[type as ClimateEventType];
                  return (
                    <div
                      key={type}
                      className="flex items-center gap-1 flex-shrink-0"
                    >
                      <span className="text-[14px]" style={{ color: c }}>
                        {EVENT_TYPE_ICONS[type as ClimateEventType]}
                      </span>
                      <span
                        className="text-[13px] font-bold tabular-nums"
                        style={{
                          color: c,
                          fontFamily: "var(--font-fira-code)",
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="hint"
              className="flex items-center gap-2.5 w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              <div className="w-[84px] flex-shrink-0" />
              <span
                className="text-[11px]"
                style={{
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-fira-code)",
                }}
              >
                Hover a region for breakdown
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

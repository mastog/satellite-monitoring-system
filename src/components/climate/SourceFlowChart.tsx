"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import type { ClimateEvent, ClimateEventType } from "@/lib/climate/data";
import {
  EVENT_TYPE_COLORS,
  EVENT_TYPE_ICONS,
  ALL_EVENT_TYPES,
} from "@/lib/climate/data";

interface SourceFlowChartProps {
  events: ClimateEvent[];
}

const SOURCE_META: Record<string, { label: string; color: string }> = {
  usgs: { label: "USGS", color: "#39ff7f" },
  eonet: { label: "EONET", color: "#00e5ff" },
  gdacs: { label: "GDACS", color: "#ff6b2c" },
  reliefweb: { label: "OCHA", color: "#b44aff" },
};
const SOURCE_ORDER = ["usgs", "eonet", "gdacs", "reliefweb"];

export default function SourceFlowChart({ events }: SourceFlowChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const [hoveredFlow, setHoveredFlow] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  // Measures the container so the SVG layout can use the real rendered size.
  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    // Disconnects any prior observer before attaching a new one to the current node.
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }
    if (!node) return;
    (containerRef as any).current = node;

    const measure = () => {
      const r = node.getBoundingClientRect();
      if (r.width > 10 && r.height > 10)
        setDims({ w: Math.round(r.width), h: Math.round(r.height) });
    };
    measure();

    roRef.current = new ResizeObserver(() => measure());
    roRef.current.observe(node);
  }, []);

  // Disconnects the resize observer when the chart unmounts.
  useEffect(
    () => () => {
      roRef.current?.disconnect();
    },
    []
  );

  const {
    flowPaths,
    activeSources,
    activeTypes,
    sourceTotals,
    typeTotals,
    maxFlow,
  } = useMemo(() => {
    const flowMap = new Map<string, number>();
    const srcT: Record<string, number> = {};
    const tT: Record<string, number> = {};

    events.forEach((e) => {
      const src = e.source || "unknown";
      const key = `${src}:${e.type}`;
      flowMap.set(key, (flowMap.get(key) || 0) + 1);
      srcT[src] = (srcT[src] || 0) + 1;
      tT[e.type] = (tT[e.type] || 0) + 1;
    });

    let max = 1;
    flowMap.forEach((v) => {
      if (v > max) max = v;
    });

    const aSrc = SOURCE_ORDER.filter((s) => (srcT[s] || 0) > 0);
    const aType = ALL_EVENT_TYPES.filter((t) => (tT[t] || 0) > 0);

    const paths: Array<{
      key: string;
      srcId: string;
      typeId: string;
      count: number;
      srcColor: string;
      typeColor: string;
    }> = [];

    aSrc.forEach((src) => {
      aType.forEach((type) => {
        const key = `${src}:${type}`;
        const count = flowMap.get(key) || 0;
        if (count > 0) {
          paths.push({
            key,
            srcId: src,
            typeId: type,
            count,
            srcColor: SOURCE_META[src]?.color || "#8a9bbd",
            typeColor: EVENT_TYPE_COLORS[type as ClimateEventType],
          });
        }
      });
    });

    return {
      flowPaths: paths,
      activeSources: aSrc,
      activeTypes: aType,
      sourceTotals: srcT,
      typeTotals: tT,
      maxFlow: max,
    };
  }, [events]);

  if (activeSources.length === 0 || activeTypes.length === 0) {
    return (
      <div
        ref={measuredRef}
        className="w-full h-full flex items-center justify-center"
      >
        <span className="text-[13px]" style={{ color: "var(--text-dim)" }}>
          Awaiting source data…
        </span>
      </div>
    );
  }

  // Waits for a real measurement before drawing the SVG to avoid a flash at the wrong size.
  if (!dims) {
    return <div ref={measuredRef} className="w-full h-full" />;
  }

  const { w, h } = dims;
  // Reserves horizontal padding so source labels and type totals stay outside the central flow area.
  const span = w - 80;
  const inset = Math.round(span * 0.05);
  const leftX = 48 + inset;
  const rightX = w - 32 - inset;

  // Positions source nodes on the left while capping spacing so the layout stays compact on tall panels.
  const maxSrcSpacing = 46;
  const srcSpacing = Math.min(maxSrcSpacing, h / (activeSources.length + 1));
  const srcTotalH = srcSpacing * (activeSources.length - 1);
  const srcStartY = (h - srcTotalH) / 2;
  const srcPos = activeSources.map((s, i) => ({
    id: s,
    y: srcStartY + i * srcSpacing,
    ...(SOURCE_META[s] || { label: s, color: "#8a9bbd" }),
  }));

  // Positions event-type nodes on the right with independent spacing tuned for their larger count.
  const maxTypeSpacing = 26;
  const typeSpacing = Math.min(maxTypeSpacing, h / (activeTypes.length + 1));
  const typeTotalH = typeSpacing * (activeTypes.length - 1);
  const typeStartY = (h - typeTotalH) / 2;
  const typePos = activeTypes.map((t, i) => ({
    id: t,
    y: typeStartY + i * typeSpacing,
    color: EVENT_TYPE_COLORS[t as ClimateEventType],
    icon: EVENT_TYPE_ICONS[t as ClimateEventType],
  }));

  const srcYMap = Object.fromEntries(srcPos.map((s) => [s.id, s.y]));
  const typeYMap = Object.fromEntries(typePos.map((t) => [t.id, t.y]));

  const maxSW = 7;
  const strokeW = (count: number) => Math.max(2, (count / maxFlow) * maxSW);

  const hovSrc = hoveredFlow?.split(":")[0] || null;
  const hovType = hoveredFlow?.split(":")[1] || null;

  return (
    <div ref={measuredRef} className="relative w-full h-full">
      <svg width={w} height={h} className="block absolute inset-0">
        <defs>
          {flowPaths.map((fp) => {
            const gid = `sf-g-${fp.key.replace(/[:.]/g, "-")}`;
            return (
              <linearGradient key={gid} id={gid} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={fp.srcColor} stopOpacity={0.75} />
                <stop
                  offset="100%"
                  stopColor={fp.typeColor}
                  stopOpacity={0.75}
                />
              </linearGradient>
            );
          })}
        </defs>

        {/* Draws faint guide lines behind the flows to reinforce left-to-right movement. */}
        {[0.25, 0.5, 0.75].map((frac) => (
          <line
            key={frac}
            x1={leftX + (rightX - leftX) * frac}
            y1={0}
            x2={leftX + (rightX - leftX) * frac}
            y2={h}
            stroke="rgba(255,255,255,0.015)"
            strokeDasharray="2,6"
          />
        ))}

        {/* Renders the curved connections between sources and event types. */}
        {flowPaths.map((fp) => {
          const sy = srcYMap[fp.srcId];
          const ty = typeYMap[fp.typeId];
          if (sy == null || ty == null) return null;

          const dx = rightX - leftX;
          const d = `M ${leftX} ${sy} C ${leftX + dx * 0.38} ${sy}, ${rightX - dx * 0.38} ${ty}, ${rightX} ${ty}`;
          const isHov = hoveredFlow === fp.key;
          const isDimmed = hoveredFlow !== null && !isHov;
          const sw = strokeW(fp.count);
          const gid = `sf-g-${fp.key.replace(/[:.]/g, "-")}`;
          const speed = 3 - (fp.count / maxFlow) * 1.4;

          return (
            <g key={fp.key}>
              {/* Expands the hover target so narrow flows are still easy to inspect. */}
              <path
                d={d}
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                style={{ cursor: "default" }}
                onMouseEnter={() => setHoveredFlow(fp.key)}
                onMouseLeave={() => setHoveredFlow(null)}
              />
              {/* Adds a soft halo around the selected or visible flow. */}
              <path
                d={d}
                fill="none"
                stroke={fp.typeColor}
                strokeWidth={sw + 6}
                opacity={isHov ? 0.14 : 0.015}
                strokeLinecap="round"
                style={{ transition: "opacity 0.2s", pointerEvents: "none" }}
              />
              {/* Draws the primary flow stroke with a source-to-type color gradient. */}
              <path
                d={d}
                fill="none"
                stroke={`url(#${gid})`}
                strokeWidth={sw}
                opacity={isDimmed ? 0.06 : isHov ? 0.9 : 0.5}
                strokeLinecap="round"
                style={{ transition: "opacity 0.2s", pointerEvents: "none" }}
              />
              {/* Moves dashed highlights along the path to imply ongoing data transfer. */}
              <path
                d={d}
                fill="none"
                stroke={fp.typeColor}
                strokeWidth={Math.max(0.8, sw * 0.35)}
                opacity={isDimmed ? 0.02 : isHov ? 0.55 : 0.1}
                strokeLinecap="round"
                strokeDasharray="2 10"
                style={{
                  animation: `sf-flow ${speed}s linear infinite`,
                  transition: "opacity 0.2s",
                  pointerEvents: "none",
                }}
              />
              {/* Shows the flow count at mid-curve when the user hovers a connection. */}
              {isHov && (
                <text
                  x={(leftX + rightX) / 2}
                  y={(sy + ty) / 2 - 1}
                  textAnchor="middle"
                  dominantBaseline="auto"
                  fill={fp.typeColor}
                  fontSize="13"
                  fontWeight="700"
                  fontFamily="var(--font-fira-code)"
                  style={{
                    textShadow: `0 0 8px ${fp.typeColor}50`,
                    pointerEvents: "none",
                  }}
                >
                  {fp.count}
                </text>
              )}
            </g>
          );
        })}

        {/* Draws the source endpoints and their aggregate totals on the left side. */}
        {srcPos.map((src) => {
          const isActive = !hoveredFlow || hovSrc === src.id;
          const total = sourceTotals[src.id] || 0;
          return (
            <g
              key={src.id}
              style={{ transition: "opacity 0.2s" }}
              opacity={isActive ? 1 : 0.18}
            >
              {/* Draws the outer marker ring for the source node. */}
              <circle
                cx={leftX}
                cy={src.y}
                r={8}
                fill={`${src.color}0a`}
                stroke={src.color}
                strokeWidth={0.7}
                strokeDasharray="3,2"
              />
              {/* Marks the exact source-node position with a brighter center dot. */}
              <circle
                cx={leftX}
                cy={src.y}
                r={3}
                fill={src.color}
                style={{ filter: `drop-shadow(0 0 4px ${src.color})` }}
              />
              {/* Pulses outward to keep active sources visually alive. */}
              <circle
                cx={leftX}
                cy={src.y}
                r={8}
                fill="none"
                stroke={src.color}
                strokeWidth={0.5}
                opacity={0.4}
              >
                <animate
                  attributeName="r"
                  from="8"
                  to="16"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.4"
                  to="0"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
              </circle>
              {/* Shows the human-readable source label beside the node. */}
              <text
                x={leftX - 14}
                y={src.y - 5}
                textAnchor="end"
                fill={src.color}
                fontSize="11"
                fontWeight="700"
                fontFamily="var(--font-fira-code)"
                letterSpacing="0.04em"
                opacity={0.8}
              >
                {src.label}
              </text>
              {/* Shows the total number of events contributed by this source. */}
              <text
                x={leftX - 14}
                y={src.y + 8}
                textAnchor="end"
                fill={src.color}
                fontSize="11"
                fontWeight="700"
                fontFamily="var(--font-fira-code)"
                opacity={0.35}
              >
                {total}
              </text>
            </g>
          );
        })}

        {/* Draws the event-type endpoints and their totals on the right side. */}
        {typePos.map((tp) => {
          const isActive = !hoveredFlow || hovType === tp.id;
          const total = typeTotals[tp.id] || 0;
          return (
            <g
              key={tp.id}
              style={{ transition: "opacity 0.2s" }}
              opacity={isActive ? 1 : 0.18}
            >
              {/* Draws the outer marker for the event-type node. */}
              <circle
                cx={rightX}
                cy={tp.y}
                r={7}
                fill={`${tp.color}0c`}
                stroke={tp.color}
                strokeWidth={0.6}
              />
              {/* Places the event-type icon in the center of the node marker. */}
              <text
                x={rightX}
                y={tp.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill={tp.color}
                fontSize="12"
                style={{
                  filter: `drop-shadow(0 0 2px ${tp.color}60)`,
                  pointerEvents: "none",
                }}
              >
                {tp.icon}
              </text>
              {/* Shows the total number of events in this type. */}
              <text
                x={rightX + 14}
                y={tp.y + 1}
                dominantBaseline="central"
                fill={tp.color}
                fontSize="11"
                fontWeight="700"
                fontFamily="var(--font-fira-code)"
                opacity={0.45}
                style={{ pointerEvents: "none" }}
              >
                {total}
              </text>
            </g>
          );
        })}
      </svg>

      <style jsx>{`
        @keyframes sf-flow {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -24;
          }
        }
      `}</style>
    </div>
  );
}

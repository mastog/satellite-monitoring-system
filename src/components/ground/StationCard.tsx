"use client";

import { motion } from "framer-motion";
import type { GroundStation, DataPipeline } from "@/lib/ground/data";
import { OPERATOR_COLORS, STATION_TYPE_LABELS } from "@/lib/ground/data";

interface StationCardProps {
  station: GroundStation;
  pipelines: DataPipeline[];
  onClose?: () => void;
}

export default function StationCard({
  station,
  pipelines,
  onClose,
}: StationCardProps) {
  const color = OPERATOR_COLORS[station.operator] || OPERATOR_COLORS.Other;
  const stationPipelines = pipelines.filter(
    (p) => p.groundStation === station.name
  );

  return (
    <motion.div
      className="glass-panel overflow-hidden"
      style={{ padding: 0 }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Adds a narrow accent strip that visually ties the card to the selected station theme. */}
      <div
        className="h-[3px]"
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}40, transparent)`,
        }}
      />

      <div className="p-4">
        {/* Shows the station identity, operator, and high-level metadata at the top of the card. */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div
              className="text-[11px] font-bold tracking-[0.12em] uppercase mb-1"
              style={{ color, fontFamily: "var(--font-exo2)" }}
            >
              {station.operator} — {STATION_TYPE_LABELS[station.type]}
            </div>
            <h3
              className="text-[15px] font-bold"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-orbitron)",
              }}
            >
              {station.name}
            </h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-6 h-6 rounded flex items-center justify-center cursor-pointer"
              style={{
                background: "rgba(138,155,189,0.08)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-dim)",
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Highlights the current operational status so outages and maintenance are immediately visible. */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
            style={{
              background:
                station.status === "operational"
                  ? "rgba(57,255,127,0.12)"
                  : station.status === "maintenance"
                    ? "rgba(255,213,79,0.12)"
                    : "rgba(255,59,48,0.12)",
              color:
                station.status === "operational"
                  ? "#39ff7f"
                  : station.status === "maintenance"
                    ? "#ffd54f"
                    : "#ff3b30",
              border: `1px solid ${
                station.status === "operational"
                  ? "rgba(57,255,127,0.2)"
                  : station.status === "maintenance"
                    ? "rgba(255,213,79,0.2)"
                    : "rgba(255,59,48,0.2)"
              }`,
            }}
          >
            {station.status}
          </span>
          <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>
            {station.country}
          </span>
        </div>

        {/* Lists the station's core technical attributes in a compact key-value grid. */}
        <div
          className="grid grid-cols-2 gap-2.5 p-2.5 rounded-lg mb-3"
          style={{
            background: "rgba(138,155,189,0.04)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <div
              className="text-[9px] uppercase tracking-wider"
              style={{ color: "var(--text-dim)" }}
            >
              Antennas
            </div>
            <div
              className="text-[13px] font-bold"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-fira-code)",
              }}
            >
              {station.antennaCount}
            </div>
          </div>
          <div>
            <div
              className="text-[9px] uppercase tracking-wider"
              style={{ color: "var(--text-dim)" }}
            >
              Throughput
            </div>
            <div
              className="text-[13px] font-bold"
              style={{ color, fontFamily: "var(--font-fira-code)" }}
            >
              {station.throughputGbps} Gbps
            </div>
          </div>
          <div>
            <div
              className="text-[9px] uppercase tracking-wider"
              style={{ color: "var(--text-dim)" }}
            >
              Elevation Mask
            </div>
            <div
              className="text-[13px] font-bold"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-fira-code)",
              }}
            >
              {station.elevationMaskDeg}°
            </div>
          </div>
          <div>
            <div
              className="text-[9px] uppercase tracking-wider"
              style={{ color: "var(--text-dim)" }}
            >
              Coordinates
            </div>
            <div
              className="text-[12px] font-bold"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-fira-code)",
              }}
            >
              {station.lat.toFixed(2)}°, {station.lng.toFixed(2)}°
            </div>
          </div>
        </div>

        {/* Lists the communication bands that this station can currently support. */}
        <div className="mb-3">
          <div
            className="text-[9px] uppercase tracking-wider mb-1.5"
            style={{ color: "var(--text-dim)" }}
          >
            Band Support
          </div>
          <div className="flex flex-wrap gap-1">
            {station.bandSupport.map((band) => (
              <span
                key={band}
                className="px-2 py-0.5 rounded text-[10px] font-bold"
                style={{
                  background: `${color}12`,
                  border: `1px solid ${color}25`,
                  color,
                  fontFamily: "var(--font-fira-code)",
                }}
              >
                {band}
              </span>
            ))}
          </div>
        </div>

        {/* Lists the missions that can downlink through or be controlled by this station. */}
        <div className="mb-3">
          <div
            className="text-[9px] uppercase tracking-wider mb-1.5"
            style={{ color: "var(--text-dim)" }}
          >
            Supported Satellites
          </div>
          <div className="flex flex-wrap gap-1">
            {station.supportedSatellites.map((sat) => (
              <span
                key={sat}
                className="px-1.5 py-0.5 rounded text-[10px]"
                style={{
                  background: "rgba(138,155,189,0.06)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                {sat}
              </span>
            ))}
          </div>
        </div>

        {/* Lists the SDGs that this station supports through the data it helps deliver. */}
        <div className="mb-3">
          <div
            className="text-[9px] uppercase tracking-wider mb-1.5"
            style={{ color: "var(--text-dim)" }}
          >
            SDG Contribution
          </div>
          <div className="flex flex-wrap gap-1">
            {station.sdgContribution.map((sdg) => (
              <span
                key={sdg}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{
                  background: "rgba(0,229,255,0.06)",
                  border: "1px solid rgba(0,229,255,0.15)",
                  color: "var(--neon-cyan)",
                  fontFamily: "var(--font-fira-code)",
                }}
              >
                SDG {sdg}
              </span>
            ))}
          </div>
        </div>

        {/* Shows the downstream processing routes that originate from this ground station. */}
        {stationPipelines.length > 0 && (
          <div>
            <div
              className="text-[9px] uppercase tracking-wider mb-1.5"
              style={{ color: "var(--text-dim)" }}
            >
              Data Pipelines
            </div>
            <div className="space-y-1.5">
              {stationPipelines.map((pipe) => (
                <div
                  key={`${pipe.satellite}-${pipe.processingCenter}`}
                  className="p-2 rounded"
                  style={{
                    background: "rgba(138,155,189,0.04)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span style={{ color }}>{pipe.satellite}</span>
                    <span style={{ color: "var(--text-dim)" }}>→</span>
                    <span style={{ color: "var(--text-secondary)" }}>
                      {pipe.processingCenter}
                    </span>
                    <span
                      className="ml-auto"
                      style={{
                        color: "var(--text-dim)",
                        fontFamily: "var(--font-fira-code)",
                      }}
                    >
                      {pipe.latencyMinutes}min
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

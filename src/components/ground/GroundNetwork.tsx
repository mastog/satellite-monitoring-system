"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassPanel from "@/components/ui/GlassPanel";
import StatCard from "@/components/ui/StatCard";
import StationMap from "./StationMap";
import StationCard from "./StationCard";
import DataFlowDiagram from "./DataFlowDiagram";
import CoverageAnalysis from "./CoverageAnalysis";
import {
  MOCK_GROUND_STATIONS,
  MOCK_DATA_PIPELINES,
  OPERATOR_COLORS,
  STATION_TYPE_LABELS,
  type GroundStation,
  type StationStatus,
} from "@/lib/ground/data";

const OPERATORS = ["ESA", "NASA", "ISRO", "JAXA", "CNSA", "Other"];
const STATUS_OPTIONS: ("all" | StationStatus)[] = [
  "all",
  "operational",
  "maintenance",
  "offline",
];
const BAND_OPTIONS = ["All", "S-band", "X-band", "Ka-band"];

export default function GroundNetwork() {
  const [activeOperators, setActiveOperators] = useState<Set<string>>(
    new Set(OPERATORS)
  );
  const [statusFilter, setStatusFilter] = useState<"all" | StationStatus>(
    "all"
  );
  const [bandFilter, setBandFilter] = useState("All");
  const [selectedStation, setSelectedStation] = useState<GroundStation | null>(
    null
  );
  const [viewMode, setViewMode] = useState<"map" | "table">("map");

  const toggleOperator = (op: string) => {
    setActiveOperators((prev) => {
      const next = new Set(prev);
      if (next.has(op)) {
        if (next.size > 1) next.delete(op);
      } else {
        next.add(op);
      }
      return next;
    });
  };

  const getStationOperatorGroup = (s: GroundStation) =>
    OPERATORS.slice(0, 5).includes(s.operator) ? s.operator : "Other";

  const filteredStations = useMemo(() => {
    return MOCK_GROUND_STATIONS.filter((s) => {
      if (!activeOperators.has(getStationOperatorGroup(s))) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (bandFilter !== "All" && !s.bandSupport.includes(bandFilter))
        return false;
      return true;
    });
  }, [activeOperators, statusFilter, bandFilter]);

  const handleStationClick = useCallback((station: GroundStation) => {
    setSelectedStation(station);
  }, []);

  // Derives the summary metrics shown above the map and registry views from the active station filter state.
  const operationalCount = filteredStations.filter(
    (s) => s.status === "operational"
  ).length;
  const maintenanceCount = filteredStations.filter(
    (s) => s.status === "maintenance"
  ).length;
  const totalThroughput = filteredStations.reduce(
    (sum, s) => sum + s.throughputGbps,
    0
  );
  const uniqueSdgs = new Set(filteredStations.flatMap((s) => s.sdgContribution))
    .size;

  return (
    <div className="p-4 pt-20 pb-8 min-h-screen">
      {/* Introduces the ground-network dashboard and exposes the map or table mode toggle. */}
      <motion.div
        className="flex items-start justify-between mb-5 gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00e5ff"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="16" r="3" />
              <path d="M12 13V7" />
              <path d="M12 7l7-4" />
              <path
                d="M16 5.5a6 6 0 011 7"
                strokeDasharray="2 2"
                opacity="0.5"
              />
              <path
                d="M18.5 3.5a9 9 0 011.5 10"
                strokeDasharray="2 2"
                opacity="0.3"
              />
            </svg>
            <h1
              className="text-xl font-bold tracking-[0.15em] uppercase"
              style={{
                fontFamily: "var(--font-orbitron)",
                color: "var(--text-primary)",
                textShadow: "0 0 20px rgba(0,229,255,0.15)",
              }}
            >
              Ground Station Network
            </h1>
          </div>
          <p className="text-[13px] pl-9" style={{ color: "var(--text-dim)" }}>
            Global infrastructure — tracking, telemetry, command & data
            reception
          </p>
        </div>

        {/* Switches between the geographic view and the full registry table. */}
        <div className="flex gap-1 flex-shrink-0 mt-1">
          {(["map", "table"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wider uppercase cursor-pointer transition-all"
              style={{
                background:
                  viewMode === mode ? "rgba(0,229,255,0.1)" : "transparent",
                border: `1px solid ${viewMode === mode ? "rgba(0,229,255,0.25)" : "var(--border-subtle)"}`,
                color: viewMode === mode ? "#00e5ff" : "var(--text-dim)",
                fontFamily: "var(--font-fira-code)",
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Summarizes the filtered network with headline statistics. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="Total Stations"
          value={filteredStations.length}
          accentColor="#00e5ff"
          delay={0.05}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="16" r="3" />
              <path d="M12 13V7" />
              <path d="M12 7l6-3" />
            </svg>
          }
        />
        <StatCard
          label="Operational"
          value={`${operationalCount}/${filteredStations.length}`}
          accentColor="#39ff7f"
          delay={0.1}
          description={
            maintenanceCount > 0
              ? `${maintenanceCount} in maintenance`
              : undefined
          }
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
        <StatCard
          label="Throughput"
          value={totalThroughput.toFixed(1)}
          unit="Gbps"
          accentColor="#4aa8ff"
          delay={0.15}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />
        <StatCard
          label="SDGs Covered"
          value={uniqueSdgs}
          unit="/ 17"
          accentColor="#b44aff"
          delay={0.2}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <ellipse cx="12" cy="12" rx="4" ry="10" opacity="0.4" />
              <path d="M2 12h20" opacity="0.3" />
            </svg>
          }
        />
      </div>

      {/* Filters the visible stations by operator, status, and communication band. */}
      <GlassPanel compact className="mb-4" accentColor="#00e5ff">
        <div className="flex flex-wrap items-center gap-3">
          {/* Toggles individual operators on and off in the filtered station set. */}
          <div className="flex items-center gap-1 flex-wrap">
            {OPERATORS.map((op) => {
              const on = activeOperators.has(op);
              const c = OPERATOR_COLORS[op] || "#8a9bbd";
              return (
                <button
                  key={op}
                  onClick={() => toggleOperator(op)}
                  className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer"
                  style={{
                    background: on ? `${c}15` : "transparent",
                    border: `1px solid ${on ? `${c}35` : "rgba(0,229,255,0.06)"}`,
                    color: on ? c : "var(--text-dim)",
                    fontFamily: "var(--font-exo2)",
                  }}
                >
                  {op}
                </button>
              );
            })}
          </div>

          <div
            className="h-5 w-px"
            style={{ background: "rgba(0,229,255,0.08)" }}
          />

          {/* Filters stations by operational status. */}
          <div className="flex items-center gap-1">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-all"
                style={{
                  background:
                    statusFilter === s ? "rgba(0,229,255,0.1)" : "transparent",
                  border: `1px solid ${statusFilter === s ? "rgba(0,229,255,0.25)" : "rgba(0,229,255,0.06)"}`,
                  color: statusFilter === s ? "#00e5ff" : "var(--text-dim)",
                  fontFamily: "var(--font-fira-code)",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <div
            className="h-5 w-px"
            style={{ background: "rgba(0,229,255,0.08)" }}
          />

          {/* Filters stations by supported communications band. */}
          <div className="flex items-center gap-1">
            {BAND_OPTIONS.map((b) => (
              <button
                key={b}
                onClick={() => setBandFilter(b)}
                className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider cursor-pointer transition-all"
                style={{
                  background:
                    bandFilter === b ? "rgba(0,229,255,0.1)" : "transparent",
                  border: `1px solid ${bandFilter === b ? "rgba(0,229,255,0.25)" : "rgba(0,229,255,0.06)"}`,
                  color: bandFilter === b ? "#00e5ff" : "var(--text-dim)",
                  fontFamily: "var(--font-fira-code)",
                }}
              >
                {b}
              </button>
            ))}
          </div>

          <span
            className="ml-auto text-[10px] font-bold"
            style={{
              color: "#00e5ff",
              fontFamily: "var(--font-fira-code)",
            }}
          >
            {filteredStations.length} STATIONS
          </span>
        </div>
      </GlassPanel>

      {/* Switches between the interactive station map and the full station registry table. */}
      <AnimatePresence mode="wait">
        {viewMode === "map" ? (
          <motion.div
            key="map-view"
            className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Shows the geographic station distribution and supports map-based selection. */}
            <div
              className="lg:col-span-3 rounded-xl overflow-hidden"
              style={{
                height: "clamp(350px, 45vh, 480px)",
                border: "1px solid rgba(0,229,255,0.06)",
                background: "#060a12",
              }}
            >
              <StationMap
                stations={filteredStations}
                selectedStationId={selectedStation?.id || null}
                onStationClick={handleStationClick}
              />
            </div>

            {/* Shows either the selected-station details or the compact station registry. */}
            <div
              className="lg:col-span-2"
              style={{ maxHeight: "clamp(350px, 45vh, 480px)" }}
            >
              {selectedStation ? (
                <div className="h-full overflow-y-auto custom-scrollbar">
                  <StationCard
                    station={selectedStation}
                    pipelines={MOCK_DATA_PIPELINES}
                    onClose={() => setSelectedStation(null)}
                  />
                </div>
              ) : (
                <GlassPanel
                  title="Station Registry"
                  accentColor="#00e5ff"
                  noPadding
                >
                  <div
                    className="overflow-y-auto custom-scrollbar"
                    style={{ maxHeight: "clamp(290px, 38vh, 420px)" }}
                  >
                    {/* Labels the compact registry columns shown beside the map. */}
                    <div
                      className="sticky top-0 z-10 grid grid-cols-[1fr_60px_50px_52px] gap-2 px-3 py-2 text-[9px] font-bold uppercase tracking-wider"
                      style={{
                        color: "var(--text-dim)",
                        background: "var(--panel-base)",
                        borderBottom: "1px solid rgba(0,229,255,0.06)",
                        fontFamily: "var(--font-fira-code)",
                      }}
                    >
                      <span>Station</span>
                      <span className="text-right">Type</span>
                      <span className="text-right">Band</span>
                      <span className="text-right">Gbps</span>
                    </div>

                    {filteredStations.map((station) => {
                      const c =
                        OPERATOR_COLORS[station.operator] ||
                        OPERATOR_COLORS.Other;
                      const statusColor =
                        station.status === "operational"
                          ? "#39ff7f"
                          : station.status === "maintenance"
                            ? "#ffd54f"
                            : "#ff3b30";
                      return (
                        <button
                          key={station.id}
                          onClick={() => handleStationClick(station)}
                          className="w-full text-left grid grid-cols-[1fr_60px_50px_52px] gap-2 px-3 py-2 transition-all cursor-pointer items-center"
                          style={{
                            borderBottom: "1px solid rgba(0,229,255,0.03)",
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                              style={{
                                background: statusColor,
                                boxShadow: `0 0 4px ${statusColor}60`,
                              }}
                            />
                            <div className="min-w-0">
                              <div
                                className="text-[11px] font-semibold truncate"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {station.name}
                              </div>
                              <div className="text-[9px]" style={{ color: c }}>
                                {station.operator} · {station.country}
                              </div>
                            </div>
                          </div>
                          <span
                            className="text-[9px] text-right truncate"
                            style={{ color: "var(--text-dim)" }}
                          >
                            {STATION_TYPE_LABELS[station.type]
                              .split(" ")[0]
                              .substring(0, 7)}
                          </span>
                          <span
                            className="text-[9px] text-right"
                            style={{
                              color: "var(--text-dim)",
                              fontFamily: "var(--font-fira-code)",
                            }}
                          >
                            {station.bandSupport
                              .map((b) => b.charAt(0))
                              .join("/")}
                          </span>
                          <span
                            className="text-[10px] font-bold text-right"
                            style={{
                              color: c,
                              fontFamily: "var(--font-fira-code)",
                            }}
                          >
                            {station.throughputGbps}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </GlassPanel>
              )}
            </div>
          </motion.div>
        ) : (
          /* Shows the full-width registry table when the dashboard is in table mode. */
          <motion.div
            key="table-view"
            className="mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <GlassPanel title="All Stations" accentColor="#00e5ff" noPadding>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid rgba(0,229,255,0.08)",
                      }}
                    >
                      {[
                        "Status",
                        "Station",
                        "Operator",
                        "Country",
                        "Type",
                        "Antennas",
                        "Bands",
                        "Gbps",
                        "SDGs",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left font-bold uppercase tracking-wider"
                          style={{
                            color: "var(--text-dim)",
                            fontSize: "9px",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStations.map((s) => {
                      const c =
                        OPERATOR_COLORS[s.operator] || OPERATOR_COLORS.Other;
                      const sc =
                        s.status === "operational"
                          ? "#39ff7f"
                          : s.status === "maintenance"
                            ? "#ffd54f"
                            : "#ff3b30";
                      return (
                        <tr
                          key={s.id}
                          onClick={() => {
                            setSelectedStation(s);
                            setViewMode("map");
                          }}
                          className="cursor-pointer transition-colors"
                          style={{
                            borderBottom: "1px solid rgba(0,229,255,0.03)",
                          }}
                        >
                          <td className="px-3 py-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                background: sc,
                                boxShadow: `0 0 4px ${sc}50`,
                              }}
                            />
                          </td>
                          <td
                            className="px-3 py-2 font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {s.name}
                          </td>
                          <td
                            className="px-3 py-2 font-bold"
                            style={{ color: c }}
                          >
                            {s.operator}
                          </td>
                          <td
                            className="px-3 py-2"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {s.country}
                          </td>
                          <td
                            className="px-3 py-2"
                            style={{ color: "var(--text-dim)" }}
                          >
                            {STATION_TYPE_LABELS[s.type]}
                          </td>
                          <td
                            className="px-3 py-2"
                            style={{
                              color: "var(--text-secondary)",
                              fontFamily: "var(--font-fira-code)",
                            }}
                          >
                            {s.antennaCount}
                          </td>
                          <td
                            className="px-3 py-2"
                            style={{
                              color: "var(--text-dim)",
                              fontFamily: "var(--font-fira-code)",
                            }}
                          >
                            {s.bandSupport
                              .map((b) => b.replace("-band", ""))
                              .join("/")}
                          </td>
                          <td
                            className="px-3 py-2 font-bold"
                            style={{
                              color: c,
                              fontFamily: "var(--font-fira-code)",
                            }}
                          >
                            {s.throughputGbps}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-0.5">
                              {s.sdgContribution.slice(0, 3).map((sdg) => (
                                <span
                                  key={sdg}
                                  className="text-[8px] px-1 rounded"
                                  style={{
                                    background: "rgba(0,229,255,0.06)",
                                    color: "#00e5ff",
                                  }}
                                >
                                  {sdg}
                                </span>
                              ))}
                              {s.sdgContribution.length > 3 && (
                                <span
                                  className="text-[8px]"
                                  style={{ color: "var(--text-dim)" }}
                                >
                                  +{s.sdgContribution.length - 3}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visualizes how satellites, stations, and SDG outputs connect through the data pipeline. */}
      <GlassPanel
        title="Satellite → Station → SDG Data Pipeline"
        accentColor="#4aa8ff"
        noPadding
        delay={0.2}
        className="mb-4"
      >
        <div className="h-[230px]">
          <DataFlowDiagram
            pipelines={MOCK_DATA_PIPELINES}
            highlightStation={selectedStation?.name || null}
          />
        </div>
      </GlassPanel>

      {/* Lets the user inspect resilience and what-if behavior for the ground network. */}
      <GlassPanel
        title="Network Resilience — What-If Analysis"
        accentColor="#ff6b2c"
        delay={0.25}
      >
        <CoverageAnalysis
          stations={MOCK_GROUND_STATIONS}
          pipelines={MOCK_DATA_PIPELINES}
        />
      </GlassPanel>
    </div>
  );
}

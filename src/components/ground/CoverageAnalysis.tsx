"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GroundStation, DataPipeline } from "@/lib/ground/data";
import { OPERATOR_COLORS } from "@/lib/ground/data";

interface CoverageAnalysisProps {
  stations: GroundStation[];
  pipelines: DataPipeline[];
}

export default function CoverageAnalysis({
  stations,
  pipelines,
}: CoverageAnalysisProps) {
  const [offlineStationId, setOfflineStationId] = useState<string | null>(null);

  const analysis = useMemo(() => {
    if (!offlineStationId) return null;

    const offlineStation = stations.find((s) => s.id === offlineStationId);
    if (!offlineStation) return null;

    // Collects the data pipelines that depend on the simulated offline station.
    const affectedPipelines = pipelines.filter(
      (p) => p.groundStation === offlineStation.name
    );

    // Derives the satellites affected by those interrupted pipelines.
    const affectedSatellites = [
      ...new Set(affectedPipelines.map((p) => p.satellite)),
    ];

    // Derives the SDG indicators fed by the interrupted pipelines.
    const affectedSdgs = [
      ...new Set(affectedPipelines.flatMap((p) => p.sdgIndicators)),
    ];

    // Checks whether each affected satellite can still route through another operational station.
    const backupAnalysis = affectedSatellites.map((sat) => {
      const backupStations = stations.filter(
        (s) =>
          s.id !== offlineStationId &&
          s.supportedSatellites.includes(sat) &&
          s.status === "operational"
      );
      return {
        satellite: sat,
        hasBackup: backupStations.length > 0,
        backupStations: backupStations.map((s) => s.name),
      };
    });

    // Flags satellites that lose all ground support in this outage scenario.
    const spofSatellites = backupAnalysis.filter((b) => !b.hasBackup);

    return {
      offlineStation,
      affectedPipelines,
      affectedSatellites,
      affectedSdgs,
      backupAnalysis,
      spofSatellites,
    };
  }, [offlineStationId, stations, pipelines]);

  const operationalStations = stations.filter(
    (s) => s.status === "operational"
  );

  return (
    <div>
      {/* Lets the user choose which operational station to simulate as offline. */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className="text-[11px] uppercase tracking-wider font-bold"
          style={{ color: "var(--text-dim)" }}
        >
          What-If Analysis
        </span>
        <select
          value={offlineStationId || ""}
          onChange={(e) => setOfflineStationId(e.target.value || null)}
          className="text-[12px] px-2.5 py-1.5 rounded-md cursor-pointer"
          style={{
            background: "rgba(138,155,189,0.06)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-fira-code)",
            outline: "none",
          }}
        >
          <option value="" style={{ background: "#0a0e17" }}>
            Select a station to take offline…
          </option>
          {operationalStations.map((s) => (
            <option key={s.id} value={s.id} style={{ background: "#0a0e17" }}>
              {s.name} ({s.operator})
            </option>
          ))}
        </select>

        {offlineStationId && (
          <button
            onClick={() => setOfflineStationId(null)}
            className="text-[11px] px-2 py-1 rounded cursor-pointer"
            style={{
              background: "rgba(255,59,48,0.1)",
              border: "1px solid rgba(255,59,48,0.2)",
              color: "#ff3b30",
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Shows the outage impact analysis once a station has been selected. */}
      <AnimatePresence mode="wait">
        {analysis && (
          <motion.div
            key={offlineStationId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            {/* Summarizes the size and severity of the simulated outage. */}
            <div
              className="p-3 rounded-lg"
              style={{
                background: "rgba(255,59,48,0.04)",
                border: "1px solid rgba(255,59,48,0.12)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: "#ff3b30",
                    boxShadow: "0 0 6px #ff3b30",
                  }}
                />
                <span
                  className="text-[12px] font-bold uppercase tracking-wider"
                  style={{ color: "#ff3b30", fontFamily: "var(--font-exo2)" }}
                >
                  {analysis.offlineStation.name} — OFFLINE SCENARIO
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div
                    className="text-[10px] uppercase tracking-wider"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Affected Satellites
                  </div>
                  <div
                    className="text-[18px] font-bold"
                    style={{
                      color: "#ff6b2c",
                      fontFamily: "var(--font-orbitron)",
                    }}
                  >
                    {analysis.affectedSatellites.length}
                  </div>
                </div>
                <div>
                  <div
                    className="text-[10px] uppercase tracking-wider"
                    style={{ color: "var(--text-dim)" }}
                  >
                    SDGs Impacted
                  </div>
                  <div
                    className="text-[18px] font-bold"
                    style={{
                      color: "#ffd54f",
                      fontFamily: "var(--font-orbitron)",
                    }}
                  >
                    {analysis.affectedSdgs.length}
                  </div>
                </div>
                <div>
                  <div
                    className="text-[10px] uppercase tracking-wider"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Single Points of Failure
                  </div>
                  <div
                    className="text-[18px] font-bold"
                    style={{
                      color:
                        analysis.spofSatellites.length > 0
                          ? "#ff3b30"
                          : "#39ff7f",
                      fontFamily: "var(--font-orbitron)",
                    }}
                  >
                    {analysis.spofSatellites.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Lists whether each affected satellite still has an operational backup path. */}
            <div className="space-y-1.5">
              {analysis.backupAnalysis.map((backup) => (
                <div
                  key={backup.satellite}
                  className="flex items-center gap-2 p-2 rounded"
                  style={{
                    background: backup.hasBackup
                      ? "rgba(57,255,127,0.04)"
                      : "rgba(255,59,48,0.04)",
                    border: `1px solid ${backup.hasBackup ? "rgba(57,255,127,0.12)" : "rgba(255,59,48,0.12)"}`,
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      background: backup.hasBackup ? "#39ff7f" : "#ff3b30",
                      boxShadow: `0 0 4px ${backup.hasBackup ? "#39ff7f" : "#ff3b30"}`,
                    }}
                  />
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {backup.satellite}
                  </span>
                  {backup.hasBackup ? (
                    <span
                      className="text-[10px] ml-auto"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Backup: {backup.backupStations.join(", ")}
                    </span>
                  ) : (
                    <span
                      className="text-[10px] ml-auto font-bold"
                      style={{ color: "#ff3b30" }}
                    >
                      NO BACKUP — DATA GAP RISK
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Lists the SDG indicators touched by the disrupted data pipelines. */}
            {analysis.affectedSdgs.length > 0 && (
              <div>
                <div
                  className="text-[9px] uppercase tracking-wider mb-1.5"
                  style={{ color: "var(--text-dim)" }}
                >
                  Affected SDG Indicators
                </div>
                <div className="flex flex-wrap gap-1">
                  {analysis.affectedSdgs.map((sdg) => (
                    <span
                      key={sdg}
                      className="px-2 py-0.5 rounded text-[10px]"
                      style={{
                        background: "rgba(255,213,79,0.08)",
                        border: "1px solid rgba(255,213,79,0.15)",
                        color: "#ffd54f",
                      }}
                    >
                      {sdg}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {!analysis && (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[12px] py-3"
            style={{ color: "var(--text-dim)" }}
          >
            Select a station above to simulate an outage and assess network
            resilience impact.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

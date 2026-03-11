"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ClimateMap from "./ClimateMap";
import SourceFlowChart from "./SourceFlowChart";
import RegionalBreakdown from "./RegionalBreakdown";
import EventCard from "./EventCard";
import EventDetailModal from "./EventDetailModal";
import InfoIcon from "@/components/ui/InfoIcon";
import {
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
  ALL_EVENT_TYPES,
  type ClimateEvent,
  type ClimateEventType,
} from "@/lib/climate/data";

const CLM_CACHE_KEY = "clm-events-cache";
const CLM_CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24h

// Renders the climate monitoring workspace, including the map theater, event
// feed, filters, and derived hazard summaries.
export default function ClimateMonitor() {
  const [events, setEvents] = useState<ClimateEvent[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [dataState, setDataState] = useState<"loading" | "live">("loading");
  const [activeTypes, setActiveTypes] = useState<Set<ClimateEventType>>(
    new Set(ALL_EVENT_TYPES)
  );
  const [selectedSeverities, setSelectedSeverities] = useState<Set<number>>(
    new Set([1, 2, 3, 4, 5])
  );
  const [selectedEvent, setSelectedEvent] = useState<ClimateEvent | null>(null);
  const [feedOpen, setFeedOpen] = useState(true);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [mapMarkerCount, setMapMarkerCount] = useState<number>(0);

  useEffect(() => {
    // Restores cached live data immediately so the screen can render without waiting for the network.
    let hadCache = false;
    try {
      const raw = localStorage.getItem(CLM_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as {
          events: ClimateEvent[];
          sources: string[];
          ts: number;
        };
        if (
          cached.events?.length > 0 &&
          Date.now() - cached.ts < CLM_CACHE_MAX_AGE
        ) {
          setEvents(cached.events);
          setSources(cached.sources || []);
          hadCache = true;
        }
      }
    } catch {
      /* Ignores environments where localStorage is unavailable. */
    }

    // Refreshes the cache from the live endpoint in the background.
    fetch("/api/climate/events")
      .then((r) => r.json())
      .then((data) => {
        if (data.events?.length > 0) {
          setEvents(data.events);
          const liveSources = (data.sources || []).filter(
            (s: string) => s !== "mock"
          );
          setSources(liveSources);
          // Persists the latest live payload so the next visit can start from cache.
          try {
            localStorage.setItem(
              CLM_CACHE_KEY,
              JSON.stringify({
                events: data.events,
                sources: liveSources,
                ts: Date.now(),
              })
            );
          } catch {
            /* Ignores storage quota failures without breaking the live view. */
          }
        }
        setDataState("live");
      })
      .catch(() => {
        // Leaves cached data in place when the refresh fails instead of falling back to mock data.
        if (hadCache) setDataState("live");
      });
  }, []);

  const toggleType = useCallback((type: ClimateEventType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else next.add(type);
      return next;
    });
  }, []);

  const toggleSeverity = useCallback((sev: number) => {
    setSelectedSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) {
        if (next.size > 1) next.delete(sev);
      } else next.add(sev);
      return next;
    });
  }, []);

  const filteredEvents = useMemo(() => {
    return events
      .filter(
        (e) => activeTypes.has(e.type) && selectedSeverities.has(e.severity)
      )
      .sort(
        (a, b) =>
          new Date(b.detectionDate).getTime() -
          new Date(a.detectionDate).getTime()
      );
  }, [events, activeTypes, selectedSeverities]);

  const handleEventClick = useCallback(
    (event: ClimateEvent) => setSelectedEvent(event),
    []
  );

  const activeCount = filteredEvents.filter(
    (e) => e.status === "active"
  ).length;
  const criticalCount = filteredEvents.filter((e) => e.severity >= 4).length;
  const totalArea = filteredEvents.reduce(
    (sum, e) => sum + e.areaAffectedKm2,
    0
  );
  const uniqueSats = new Set(filteredEvents.map((e) => e.detectingSatellite))
    .size;

  const avgSeverity =
    filteredEvents.length > 0
      ? filteredEvents.reduce((s, e) => s + e.severity, 0) /
        filteredEvents.length
      : 0;
  const threatColor =
    avgSeverity >= 4
      ? "#ff3a8c"
      : avgSeverity >= 3
        ? "#ff6b2c"
        : avgSeverity >= 2
          ? "#ffd54f"
          : "#39ff7f";
  const threatIntensity = Math.min(1, avgSeverity / 5);

  // Counts events per type while respecting the severity filters so the type
  // chips can preview how many events would appear if that type is enabled.
  const typeCountMap = useMemo(() => {
    const m: Record<string, number> = {};
    events.forEach((e) => {
      if (selectedSeverities.has(e.severity)) {
        m[e.type] = (m[e.type] || 0) + 1;
      }
    });
    return m;
  }, [events, selectedSeverities]);

  return (
    <div
      className="relative overflow-hidden"
      style={{ minHeight: "calc(100vh - 64px)" }}
    >
      {/* Paints the page-level atmospheric background that responds to overall threat severity. */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-colors duration-[3000ms]"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${threatColor}06 0%, transparent 100%), radial-gradient(ellipse 60% 40% at 20% 80%, rgba(0,229,255,0.012) 0%, transparent 100%)`,
        }}
      />

      {/* Hosts the main climate map, loading state, and broadcast-style visual overlays. */}
      <motion.div
        className="relative"
        style={{ height: "clamp(520px, 70vh, 800px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0">
          <ClimateMap
            events={filteredEvents}
            onEventClick={handleEventClick}
            hoveredEventId={hoveredEventId}
            onRenderedCount={setMapMarkerCount}
          />
        </div>

        {/* Shows the acquisition overlay only when the screen has no cached data to display yet. */}
        {dataState === "loading" && events.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-full"
              style={{
                background: "rgba(6,8,13,0.82)",
                backdropFilter: "blur(14px)",
                border: "1px solid rgba(255,213,79,0.12)",
                boxShadow:
                  "0 4px 24px rgba(0,0,0,0.4), 0 0 20px rgba(255,213,79,0.04)",
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: "#ffd54f",
                  boxShadow: "0 0 6px #ffd54f",
                  animation: "clm-pulse 1.2s ease-in-out infinite",
                }}
              />
              <span
                className="text-[11px] font-bold tracking-[0.18em] uppercase"
                style={{
                  color: "#ffd54f",
                  fontFamily: "var(--font-fira-code)",
                }}
              >
                Acquiring signal…
              </span>
            </div>
          </div>
        )}

        {/* Adds layered scan lines so the map theater feels like a live monitoring console. */}
        <div className="absolute inset-0 pointer-events-none z-[5] overflow-hidden">
          {/* Draws the brighter primary scan pass with a trailing glow field. */}
          <div
            className="absolute left-0 right-0"
            style={{
              animation: "clm-scan-a 10s cubic-bezier(0.4,0,0.2,1) infinite",
            }}
          >
            <div
              className="h-[1px]"
              style={{
                background: `linear-gradient(90deg, transparent 5%, ${threatColor}30 30%, ${threatColor}50 50%, ${threatColor}30 70%, transparent 95%)`,
              }}
            />
            <div
              className="h-[40px] -mt-[1px]"
              style={{
                background: `linear-gradient(180deg, ${threatColor}08 0%, transparent 100%)`,
              }}
            />
          </div>
          {/* Draws a fainter secondary scan at a different cadence for depth. */}
          <div
            className="absolute left-0 right-0 h-[1px]"
            style={{
              background: `linear-gradient(90deg, transparent 15%, ${threatColor}0a 40%, ${threatColor}10 50%, ${threatColor}0a 60%, transparent 85%)`,
              animation: "clm-scan-b 7s linear infinite 3s",
            }}
          />
        </div>

        {/* ── Left Panel: Controls + Stats ── */}
        <motion.div
          className="absolute top-3 left-3 z-20"
          style={{ width: 252 }}
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "rgba(6,8,13,0.82)",
              backdropFilter: "blur(20px) saturate(1.4)",
              border: "1px solid rgba(255,255,255,0.05)",
              boxShadow:
                "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}
          >
            {/* Header */}
            <div className="px-3 pt-3 pb-2">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative w-5 h-5 flex items-center justify-center">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={threatColor}
                      strokeWidth="1.5"
                    >
                      <circle cx="12" cy="12" r="10" opacity="0.3" />
                      <circle cx="12" cy="12" r="5" />
                      <circle
                        cx="12"
                        cy="12"
                        r="1.5"
                        fill={threatColor}
                        stroke="none"
                      />
                    </svg>
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        animation: "clm-radar 3s ease-out infinite",
                        border: `1px solid ${threatColor}25`,
                      }}
                    />
                  </div>
                  <span
                    className="text-[15px] font-bold tracking-[0.18em] uppercase"
                    style={{
                      fontFamily: "var(--font-orbitron)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Threats
                  </span>
                </div>
                <SourceBadge state={dataState} sources={sources} />
              </div>

              {/* Type filter grid — 4×2 interactive tiles */}
              <div className="grid grid-cols-4 gap-1">
                {ALL_EVENT_TYPES.map((type) => {
                  const on = activeTypes.has(type);
                  const c = EVENT_TYPE_COLORS[type];
                  const count = typeCountMap[type] || 0;
                  return (
                    <motion.button
                      key={type}
                      onClick={() => toggleType(type)}
                      className="relative flex flex-col items-center gap-[2px] py-1.5 rounded-lg cursor-pointer"
                      style={{
                        background: on ? `${c}0c` : "rgba(255,255,255,0.015)",
                        border: `1px solid ${on ? `${c}20` : "rgba(255,255,255,0.03)"}`,
                      }}
                      whileHover={{ scale: 1.08, boxShadow: `0 0 14px ${c}18` }}
                      whileTap={{ scale: 0.95 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 25,
                      }}
                    >
                      <span
                        className="text-[16px] leading-none transition-all duration-200"
                        style={{
                          color: on ? c : "rgba(255,255,255,0.1)",
                          filter: on ? `drop-shadow(0 0 4px ${c}90)` : "none",
                        }}
                      >
                        {EVENT_TYPE_ICONS[type]}
                      </span>
                      <span
                        className="text-[10px] font-bold tracking-[0.06em] uppercase leading-none"
                        style={{
                          color: on ? `${c}cc` : "var(--text-dim)",
                          fontFamily: "var(--font-fira-code)",
                        }}
                      >
                        {EVENT_TYPE_LABELS[type].slice(0, 4)}
                      </span>
                      <span
                        className="text-[11px] font-bold tabular-nums leading-none"
                        style={{
                          color: `${c}70`,
                          fontFamily: "var(--font-fira-code)",
                          visibility: count > 0 && on ? "visible" : "hidden",
                        }}
                      >
                        {count || 0}
                      </span>
                      {on && (
                        <div
                          className="absolute inset-x-0 bottom-0 h-[1px] rounded-full"
                          style={{
                            background: `linear-gradient(90deg, transparent, ${c}50, transparent)`,
                          }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div
              className="h-px mx-3"
              style={{ background: "rgba(255,255,255,0.04)" }}
            />

            {/* Severity (individual toggles) + Time rows */}
            <div className="px-3 py-2 flex flex-col gap-1.5">
              <div className="flex items-center gap-1">
                <span
                  className="text-[10px] font-bold tracking-wider uppercase w-[28px] flex-shrink-0"
                  style={{
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-fira-code)",
                  }}
                >
                  SEV
                </span>
                <div className="flex items-center gap-1 flex-1">
                  {(
                    [
                      { level: 1, color: "#39ff7f" },
                      { level: 2, color: "#ffd54f" },
                      { level: 3, color: "#ff6b2c" },
                      { level: 4, color: "#ff3a8c" },
                      { level: 5, color: "#ff0040" },
                    ] as const
                  ).map(({ level, color: sevColor }) => {
                    const on = selectedSeverities.has(level);
                    return (
                      <motion.button
                        key={level}
                        onClick={() => toggleSeverity(level)}
                        className="flex-1 h-[20px] rounded flex items-center justify-center cursor-pointer"
                        style={{
                          background: on ? `${sevColor}18` : "transparent",
                          border: `1px solid ${on ? `${sevColor}35` : "rgba(255,255,255,0.04)"}`,
                          color: on ? sevColor : "var(--text-dim)",
                          fontSize: "11px",
                          fontWeight: 700,
                          fontFamily: "var(--font-fira-code)",
                          textShadow: on ? `0 0 6px ${sevColor}50` : "none",
                        }}
                        whileHover={{
                          scale: 1.08,
                          boxShadow: `0 0 8px ${sevColor}20`,
                        }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {level}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              className="h-px mx-3"
              style={{ background: "rgba(255,255,255,0.04)" }}
            />

            {/* Stats */}
            <div className="grid grid-cols-3 gap-1 p-2">
              <StatCell label="CRIT" value={criticalCount} color="#ff3a8c" />
              <StatCell label="ACTIVE" value={activeCount} color="#ff6b2c" />
              <StatCell label="SATS" value={uniqueSats} color="#39ff7f" />
            </div>
            <div className="px-2 pb-2">
              <div
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
                style={{
                  background: "rgba(0,229,255,0.025)",
                  border: "1px solid rgba(0,229,255,0.06)",
                }}
              >
                <span
                  className="text-[10px] font-bold tracking-wider uppercase"
                  style={{ color: "var(--text-dim)" }}
                >
                  AREA
                </span>
                <span
                  className="text-[15px] font-bold tabular-nums"
                  style={{
                    color: "#00e5ff",
                    fontFamily: "var(--font-fira-code)",
                  }}
                >
                  <AnimatedCount
                    value={
                      totalArea >= 1e6
                        ? Math.round(totalArea / 1e5) / 10
                        : totalArea >= 1e3
                          ? Math.round(totalArea / 1e3)
                          : totalArea
                    }
                  />
                  <span className="text-[11px] ml-0.5 opacity-50">
                    {totalArea >= 1e6
                      ? "M km²"
                      : totalArea >= 1e3
                        ? "K km²"
                        : "km²"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Center: Event Count Badge ── */}
        <motion.div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-20"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="flex items-center gap-2.5 px-4 py-2 rounded-full"
            style={{
              background: "rgba(6,8,13,0.75)",
              backdropFilter: "blur(14px)",
              border: `1px solid ${threatColor}12`,
              boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 24px ${threatColor}06`,
            }}
          >
            <span
              className="text-[22px] font-bold tabular-nums"
              style={{
                color: threatColor,
                fontFamily: "var(--font-orbitron)",
                filter: `drop-shadow(0 0 6px ${threatColor}50)`,
              }}
            >
              <AnimatedCount value={mapMarkerCount || filteredEvents.length} />
            </span>
            <span
              className="text-[11px] font-bold tracking-[0.15em] uppercase"
              style={{ color: "var(--text-dim)" }}
            >
              threats detected
            </span>
          </div>
        </motion.div>

        {/* ── Feed Toggle ── */}
        <motion.button
          onClick={() => setFeedOpen((p) => !p)}
          className="absolute top-3 right-3 z-30 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
          style={{
            background: "rgba(6,8,13,0.75)",
            backdropFilter: "blur(14px)",
            border: `1px solid ${feedOpen ? "rgba(255,107,44,0.15)" : "rgba(255,255,255,0.06)"}`,
            color: feedOpen ? "#ff6b2c" : "var(--text-dim)",
          }}
          whileHover={{ scale: 1.1 }}
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
            {feedOpen ? (
              <path d="M9 18l6-6-6-6" />
            ) : (
              <path d="M15 18l-6-6 6-6" />
            )}
          </svg>
        </motion.button>

        {/* ── Right Panel: Event Feed ── */}
        <AnimatePresence>
          {feedOpen && (
            <motion.div
              className="absolute top-14 right-3 bottom-3 z-20 flex flex-col"
              style={{ width: "min(340px, 36%)" }}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="flex-1 rounded-xl overflow-hidden flex flex-col"
                style={{
                  background: "rgba(6,8,13,0.78)",
                  backdropFilter: "blur(20px) saturate(1.4)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  boxShadow:
                    "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)",
                }}
              >
                <div
                  className="flex items-center justify-between px-3 py-2.5"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: "#ff6b2c",
                        boxShadow: "0 0 6px #ff6b2c",
                        animation: "clm-pulse 2s ease-in-out infinite",
                      }}
                    />
                    <span
                      className="text-[11px] font-bold tracking-[0.15em] uppercase"
                      style={{
                        color: "rgba(255,107,44,0.55)",
                        fontFamily: "var(--font-exo2)",
                      }}
                    >
                      Live Feed
                    </span>
                  </div>
                  <span
                    className="text-[12px] font-bold tabular-nums"
                    style={{
                      color: "var(--text-dim)",
                      fontFamily: "var(--font-fira-code)",
                    }}
                  >
                    {filteredEvents.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                  {filteredEvents.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                      <p
                        className="text-[13px]"
                        style={{ color: "var(--text-dim)" }}
                      >
                        No events match filters
                      </p>
                    </div>
                  ) : (
                    filteredEvents.map((event, i) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onClick={handleEventClick}
                        delay={Math.min(i * 0.025, 0.5)}
                        onHover={setHoveredEventId}
                        isHovered={hoveredEventId === event.id}
                      />
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Bottom Legend — 2 rows ── */}
        <div className="absolute bottom-3 left-3 z-10">
          <div
            className="grid grid-cols-4 gap-x-4 gap-y-1 px-3 py-2 rounded-lg"
            style={{
              background: "rgba(6,8,13,0.72)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            {ALL_EVENT_TYPES.filter((t) => activeTypes.has(t)).map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <div
                  className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                  style={{
                    background: EVENT_TYPE_COLORS[type],
                    boxShadow: `0 0 5px ${EVENT_TYPE_COLORS[type]}60`,
                  }}
                />
                <span
                  className="text-[11px] uppercase tracking-wider font-bold whitespace-nowrap"
                  style={{
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-fira-code)",
                  }}
                >
                  {EVENT_TYPE_LABELS[type]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ═══ ANALYSIS SECTION ═══ */}
      <div className="px-4 pb-6 pt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {[
          {
            title: "Regional Distribution",
            color: "#ff6b2c",
            content: <RegionalBreakdown events={filteredEvents} />,
            delay: 0.3,
          },
          {
            title: "Source Intelligence Flow",
            color: "#00e5ff",
            content: <SourceFlowChart events={filteredEvents} />,
            delay: 0.35,
          },
        ].map((panel) => (
          <motion.div
            key={panel.title}
            className="rounded-xl overflow-hidden"
            style={{
              background: "rgba(6,8,13,0.55)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: panel.delay }}
          >
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: panel.color,
                  boxShadow: `0 0 6px ${panel.color}`,
                }}
              />
              <span
                className="text-[13px] font-bold tracking-[0.15em] uppercase"
                style={{
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-exo2)",
                }}
              >
                {panel.title}
              </span>
              {/* Displays the help tooltip for the source-flow panel. */}
              {panel.title === "Source Intelligence Flow" && (
                <InfoIcon
                  text="Maps how raw hazard feeds, supporting observation sources, and fusion logic converge into the curated climate events shown across this view."
                  position="top"
                />
              )}
            </div>
            <div className="p-4" style={{ height: 210 }}>
              {panel.content}
            </div>
          </motion.div>
        ))}
      </div>

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      <style jsx>{`
        @keyframes clm-scan-a {
          0% {
            top: -6%;
            opacity: 0;
          }
          3% {
            opacity: 1;
          }
          60% {
            opacity: 1;
          }
          80% {
            opacity: 0.6;
          }
          100% {
            top: 105%;
            opacity: 0;
          }
        }
        @keyframes clm-scan-b {
          0% {
            top: 105%;
            opacity: 0;
          }
          5% {
            opacity: 0.7;
          }
          90% {
            opacity: 0.7;
          }
          100% {
            top: -4%;
            opacity: 0;
          }
        }
        @keyframes clm-radar {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          100% {
            transform: scale(2.8);
            opacity: 0;
          }
        }
        @keyframes clm-pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.25;
          }
        }
      `}</style>
    </div>
  );
}

/* Provides the reusable status badges and cells used by the climate monitoring dashboard. */

function SourceBadge({ state, sources }: { state: string; sources: string[] }) {
  const isLive = state === "live";
  const count = sources.length;
  const c = isLive ? "#39ff7f" : "#ffd54f";
  return (
    <div
      className="flex items-center gap-1 px-1.5 py-[2px] rounded-full"
      style={{
        background: `${c}08`,
        border: `1px solid ${c}15`,
      }}
    >
      <div
        className="w-[4px] h-[4px] rounded-full"
        style={{
          background: c,
          boxShadow: `0 0 4px ${c}`,
          animation: "clm-pulse 2s ease-in-out infinite",
        }}
      />
      <span
        className="text-[10px] font-bold tracking-[0.06em] uppercase"
        style={{ color: c, fontFamily: "var(--font-fira-code)" }}
      >
        {isLive ? `${count} LIVE` : "SYNC"}
      </span>
    </div>
  );
}

function StatCell({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="flex flex-col items-center py-1.5 rounded-lg"
      style={{
        background: `${color}05`,
        border: `1px solid ${color}0c`,
      }}
    >
      <span
        className="text-[20px] font-bold tabular-nums leading-none"
        style={{
          color,
          fontFamily: "var(--font-orbitron)",
          filter: `drop-shadow(0 0 4px ${color}40)`,
        }}
      >
        <AnimatedCount value={value} />
      </span>
      <span
        className="text-[10px] font-bold tracking-[0.1em] uppercase mt-0.5"
        style={{ color: "var(--text-dim)" }}
      >
        {label}
      </span>
    </div>
  );
}

function AnimatedCount({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    const dur = 600;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      node!.textContent = String(Math.round(from + (to - from) * eased));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value]);
  return <span ref={ref}>{value}</span>;
}

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassPanel from "@/components/ui/GlassPanel";
import VoteButtons from "@/components/ui/VoteButtons";
import SDGRadarChart from "@/components/charts/SDGRadarChart";
import SDGTrendChart from "@/components/charts/SDGTrendChart";
import SDGForecastChart from "@/components/charts/SDGForecastChart";
import SDGComparisonTable from "@/components/sdg/SDGComparisonTable";
import SDGIcon from "@/components/sdg/SDGIcon";
import { type RegionDataset } from "@/components/charts/SDGRadarChart";
import {
  analyzeRegionAsync,
  SDGScore,
  SDGIndicator,
  type RegionalSDGDataAsync,
} from "@/lib/sdg/engine";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";
import { useLSTMForecast } from "@/hooks/useLSTMForecast";
import SDGQuizModal from "@/components/sdg/SDGQuizModal";

const REGIONS = [
  { name: "Global", lat: 0, lng: 0 },
  { name: "East Asia & Pacific", lat: 35, lng: 105 },
  { name: "Europe & Central Asia", lat: 50, lng: 30 },
  { name: "Latin America & Caribbean", lat: -10, lng: -60 },
  { name: "Middle East & North Africa", lat: 30, lng: 35 },
  { name: "North America", lat: 40, lng: -100 },
  { name: "South Asia", lat: 25, lng: 80 },
  { name: "Sub-Saharan Africa", lat: 0, lng: 25 },
];

const COMPARISON_COLORS = ["#00e5ff", "#ff6b2c", "#b44aff", "#39ff7f"];

function IndicatorDetail({ ind, color }: { ind: SDGIndicator; color: string }) {
  const fields = [
    { label: "ALGORITHM", value: ind.algorithm },
    { label: "SATELLITE SOURCE", value: ind.satelliteSource },
    { label: "SCORING METHOD", value: ind.methodology },
    { label: "UPDATE FREQUENCY", value: ind.updateFrequency },
  ].filter((f) => f.value);

  if (fields.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-2 space-y-2"
    >
      {fields.map((f) => (
        <div
          key={f.label}
          className="p-2 rounded"
          style={{
            background: "rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div
            className="text-[12px] font-bold tracking-[0.12em] uppercase mb-0.5"
            style={{ color }}
          >
            {f.label}
          </div>
          <div
            className="text-[14px] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {f.value}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

export default function SDGDashboard() {
  const [selectedSDG, setSelectedSDG] = useState<SDGScore | null>(null);
  const [expandedIndicator, setExpandedIndicator] = useState<string | null>(
    null
  );
  const [showForecast, setShowForecast] = useState(false);
  const [quizSDG, setQuizSDG] = useState<number | null>(null);
  const { isAuthenticated } = useAuthStore();
  const { setShowAuthModal } = useAppStore();
  const selectedRegion = useAppStore((s) => s.selectedRegion);
  const setSelectedRegion = useAppStore((s) => s.setSelectedRegion);
  const isComparisonMode = useAppStore((s) => s.isComparisonMode);
  const setComparisonMode = useAppStore((s) => s.setComparisonMode);
  const comparisonRegions = useAppStore((s) => s.comparisonRegions);
  const toggleComparisonRegion = useAppStore((s) => s.toggleComparisonRegion);

  // Tracks the asynchronous World Bank data needed to replace mock SDG scores with live regional values.
  const [asyncAnalysis, setAsyncAnalysis] =
    useState<RegionalSDGDataAsync | null>(null);
  const [trendCache, setTrendCache] = useState<
    Record<string, Record<number, { month: string; score: number }[]>>
  >({});
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Stores the asynchronously loaded regional score sets used when comparison mode is enabled.
  const [comparisonCache, setComparisonCache] = useState<
    Record<string, RegionalSDGDataAsync>
  >({});
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Prefers live regional data when it has loaded and falls back to the built-in mock dataset otherwise.
  const analysis =
    asyncAnalysis && asyncAnalysis.region === selectedRegion
      ? asyncAnalysis
      : null;
  const isLoading = !analysis;

  // Loads the live World Bank-derived metrics for the currently selected region in single-region mode.
  const fetchRealData = useCallback(async (regionName: string) => {
    try {
      const res = await fetch(
        `/api/sdg/indicators?region=${encodeURIComponent(regionName)}`
      );
      if (!res.ok) return null;
      const json = await res.json();

      const region = REGIONS.find((r) => r.name === regionName) || REGIONS[0];
      const result = await analyzeRegionAsync(
        region.name,
        region.lat,
        region.lng,
        json.data
      );

      // Caches the indicator time series so forecast and trend components can reuse the fetched history.
      const newTrends: Record<number, { month: string; score: number }[]> = {};
      for (const [sdgStr, sdgData] of Object.entries(json.data)) {
        const sdgNum = parseInt(sdgStr, 10);
        const ts = (
          sdgData as { timeSeries?: { year: number; score: number }[] }
        ).timeSeries;
        if (ts && ts.length > 0) {
          newTrends[sdgNum] = ts.map((d: { year: number; score: number }) => ({
            month: String(d.year),
            score: d.score,
          }));
        }
      }
      setTrendCache((prev) => ({ ...prev, [regionName]: newTrends }));

      return { result, dataSource: json.dataSource, fetchedAt: json.fetchedAt };
    } catch {
      return null;
    }
  }, []);

  // Refreshes single-region data whenever the selected region changes outside comparison mode.
  useEffect(() => {
    if (isComparisonMode) return;
    setAsyncAnalysis(null);
    fetchRealData(selectedRegion).then((data) => {
      if (data) {
        setAsyncAnalysis(data.result);
        setDataSource(data.dataSource || "World Bank SDG Indicators");
        setLastUpdated(data.fetchedAt);
      }
    });
  }, [selectedRegion, fetchRealData, isComparisonMode]);

  // Refreshes the comparison datasets whenever the selected comparison regions change.
  useEffect(() => {
    if (!isComparisonMode || comparisonRegions.length === 0) return;

    const missing = comparisonRegions.filter((r) => !comparisonCache[r]);
    if (missing.length === 0) return;

    setComparisonLoading(true);
    Promise.all(
      missing.map(async (regionName) => {
        const data = await fetchRealData(regionName);
        if (data) {
          return { regionName, result: data.result };
        }
        return null;
      })
    ).then((results) => {
      const newCache: Record<string, RegionalSDGDataAsync> = {};
      results.forEach((r) => {
        if (r) newCache[r.regionName] = r.result;
      });
      setComparisonCache((prev) => ({ ...prev, ...newCache }));
      setComparisonLoading(false);
    });
  }, [isComparisonMode, comparisonRegions, comparisonCache, fetchRealData]);

  // Extracts the live trend series for the selected SDG when real indicator history is available.
  const getTrendData = (sdgNumber: number) => {
    const regionTrends = trendCache[selectedRegion];
    if (regionTrends && regionTrends[sdgNumber]) {
      return regionTrends[sdgNumber];
    }
    return [];
  };

  const hasTrendData =
    !!trendCache[selectedRegion]?.[selectedSDG?.sdgNumber ?? 0];
  const trendLabel = hasTrendData
    ? "Historical Trend (World Bank)"
    : "Historical Trend";

  // Collects all available indicator time series so the forecast model can learn across related SDG signals.
  const allSeries = useMemo(() => {
    const series: { year: number; score: number }[][] = [];
    for (const regionTrends of Object.values(trendCache)) {
      for (const sdgTrend of Object.values(regionTrends)) {
        if (sdgTrend.length >= 5) {
          series.push(
            sdgTrend.map((d) => ({
              year: parseInt(d.month, 10),
              score: d.score,
            }))
          );
        }
      }
    }
    return series;
  }, [trendCache]);

  // Selects the target time series that the forecast should extend for the currently focused SDG.
  const targetSeries = useMemo(() => {
    if (!selectedSDG) return [];
    const trend = getTrendData(selectedSDG.sdgNumber);
    return trend.map((d) => ({ year: parseInt(d.month, 10), score: d.score }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSDG?.sdgNumber, selectedRegion, trendCache]);

  const lastYear =
    targetSeries.length > 0 ? targetSeries[targetSeries.length - 1].year : 2024;

  // Runs the GRU-based forecast and falls back to Holt exponential smoothing when model inputs are insufficient.
  const {
    status: forecastStatus,
    progress: trainProgress,
    result: forecastResult,
    modelLabel,
  } = useLSTMForecast(allSeries, targetSeries, {
    horizon: Math.max(3, 2030 - lastYear),
    enabled: showForecast && !!selectedSDG,
  });

  // Builds the normalized datasets consumed by the comparison radar chart and comparison table.
  const comparisonDatasets: RegionDataset[] = comparisonRegions
    .map((regionName, i) => {
      const cached = comparisonCache[regionName];
      if (!cached) return null;
      return {
        region: regionName,
        scores: cached.scores,
        color: COMPARISON_COLORS[i % COMPARISON_COLORS.length],
      };
    })
    .filter(Boolean) as RegionDataset[];

  // Uses the first selected region as the baseline when computing comparison deltas for the table.
  const comparisonBaseScores =
    comparisonDatasets.length > 0 ? comparisonDatasets[0].scores : [];

  return (
    <div className="min-h-full p-6 space-y-6 pb-8">
      {/* Introduces the SDG dashboard and presents the top-level controls for the current analysis mode. */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-start justify-between"
      >
        <div>
          <h2
            className="text-lg font-bold tracking-[0.15em] text-glow-cyan"
            style={{ fontFamily: "var(--font-orbitron)" }}
          >
            SDG ASSESSMENT ENGINE
          </h2>
          <p
            className="text-[15px] mt-1 tracking-wide"
            style={{ color: "var(--text-dim)" }}
          >
            {isComparisonMode
              ? "Select up to 4 regions to compare sustainability indicators"
              : "Satellite-derived sustainability indicators mapped to UN SDG framework"}
          </p>
        </div>

        {/* Toggles between single-region analysis and side-by-side regional comparison. */}
        <motion.button
          onClick={() => {
            setComparisonMode(!isComparisonMode);
            setSelectedSDG(null);
            setExpandedIndicator(null);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold tracking-[0.1em] uppercase transition-all flex-shrink-0"
          style={{
            background: isComparisonMode
              ? "rgba(180,74,255,0.15)"
              : "rgba(0,0,0,0.3)",
            border: isComparisonMode
              ? "1px solid rgba(180,74,255,0.3)"
              : "1px solid var(--border-subtle)",
            color: isComparisonMode ? "#b44aff" : "var(--text-dim)",
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
          </svg>
          {isComparisonMode ? "Exit Compare" : "Compare Regions"}
        </motion.button>
      </motion.div>

      {/* Collects the region selection used to drive the dashboard's live or mock datasets. */}
      <div
        className="flex gap-1 p-1 rounded-lg flex-wrap"
        style={{
          background: "rgba(0,0,0,0.3)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {REGIONS.map((region, i) => {
          const isSelected = isComparisonMode
            ? comparisonRegions.includes(region.name)
            : selectedRegion === region.name;
          const compIdx = comparisonRegions.indexOf(region.name);
          const regionColor =
            isComparisonMode && compIdx >= 0
              ? COMPARISON_COLORS[compIdx % COMPARISON_COLORS.length]
              : "var(--neon-cyan)";

          return (
            <button
              key={region.name}
              onClick={() => {
                if (isComparisonMode) {
                  toggleComparisonRegion(region.name);
                } else {
                  setSelectedRegion(region.name);
                  setSelectedSDG(null);
                  setExpandedIndicator(null);
                }
              }}
              className="py-1.5 px-3 rounded-md text-[13px] font-bold tracking-[0.1em] transition-all"
              style={{
                background: isSelected
                  ? isComparisonMode
                    ? `${regionColor}18`
                    : "var(--neon-cyan-dim)"
                  : "transparent",
                color: isSelected ? regionColor : "var(--text-dim)",
                border: isSelected
                  ? `1px solid ${regionColor}40`
                  : "1px solid transparent",
              }}
            >
              {isComparisonMode && compIdx >= 0 && (
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1.5"
                  style={{
                    background: regionColor,
                    boxShadow: `0 0 4px ${regionColor}`,
                    verticalAlign: "middle",
                  }}
                />
              )}
              {region.name.toUpperCase()}
            </button>
          );
        })}
        {isComparisonMode && (
          <span
            className="self-center ml-2 text-[12px] tracking-wider"
            style={{ color: "var(--text-dim)" }}
          >
            {comparisonRegions.length}/4 selected
          </span>
        )}
      </div>

      {/* Renders the radar chart and score table used when multiple regions are being compared. */}
      {isComparisonMode ? (
        <>
          {comparisonRegions.length === 0 ? (
            <GlassPanel delay={0.1}>
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--text-dim)"
                    strokeWidth="1"
                    className="mx-auto mb-3 opacity-40"
                  >
                    <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                  </svg>
                  <div
                    className="text-[15px] tracking-wider"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Select 2–4 regions above to compare SDG scores
                  </div>
                </div>
              </div>
            </GlassPanel>
          ) : (
            <>
              {comparisonLoading &&
                comparisonDatasets.length < comparisonRegions.length && (
                  <div className="flex items-center justify-center py-4">
                    <div
                      className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mr-3"
                      style={{
                        borderColor: "var(--holo-purple)",
                        borderTopColor: "transparent",
                      }}
                    />
                    <span
                      className="text-[14px] tracking-wider"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Loading comparison data...
                    </span>
                  </div>
                )}

              {/* Visualizes SDG score differences across the selected regions on one radar plot. */}
              {comparisonDatasets.length >= 2 && (
                <GlassPanel
                  title="MULTI-REGION OVERLAY"
                  delay={0.1}
                  accentColor="var(--holo-purple)"
                >
                  <div className="flex justify-center" style={{ height: 340 }}>
                    <SDGRadarChart
                      scores={comparisonBaseScores}
                      comparisonData={comparisonDatasets}
                    />
                  </div>
                </GlassPanel>
              )}

              {/* Lists the same regional comparison values in a precise tabular form. */}
              {comparisonDatasets.length >= 1 && (
                <div>
                  <div
                    className="text-[14px] font-bold tracking-[0.12em] uppercase mb-3"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Score Comparison
                  </div>
                  <SDGComparisonTable
                    regions={comparisonDatasets}
                    baseScores={comparisonBaseScores}
                  />
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {/* Shows the selected region's overall SDG score when the dashboard is in single-region mode. */}
          <GlassPanel delay={0.1}>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div
                    className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
                    style={{
                      borderColor: "var(--neon-cyan)",
                      borderTopColor: "transparent",
                    }}
                  />
                  <div
                    className="text-[14px] tracking-[0.15em] uppercase"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Loading SDG data from World Bank...
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className="text-[14px] tracking-[0.15em] uppercase mb-1"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Composite Sustainability Index — {selectedRegion}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-4xl font-bold stat-value text-glow-cyan"
                      style={{ fontFamily: "var(--font-orbitron)" }}
                    >
                      {analysis.overallScore}
                    </span>
                    <span
                      className="text-base"
                      style={{ color: "var(--text-dim)" }}
                    >
                      / 100
                    </span>
                  </div>
                  <p
                    className="text-[13px] mt-1 tracking-wide"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Weighted average of 6 satellite-derived SDG scores for this
                    region
                  </p>
                </div>
                <div style={{ width: 200, height: 180 }}>
                  <SDGRadarChart scores={analysis.scores} />
                </div>
              </div>
            )}
          </GlassPanel>

          {/* Renders a compact help strip above the SDG card grid. */}
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.14 }}
              className="relative overflow-hidden rounded-2xl px-4 py-2.5"
              style={{
                background:
                  "linear-gradient(125deg, rgba(0,229,255,0.08) 0%, rgba(8,12,20,0.78) 48%, rgba(180,74,255,0.08) 100%)",
                border: "1px solid rgba(255,255,255,0.05)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 24px rgba(0,0,0,0.16)",
              }}
            >
              <div
                className="absolute inset-y-0 left-0 w-24"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(0,229,255,0.12), transparent)",
                }}
              />
              <div className="relative flex items-center gap-2.5">
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: "rgba(0,0,0,0.28)",
                    border: "1px solid rgba(0,229,255,0.2)",
                    boxShadow: "0 0 16px rgba(0,229,255,0.08)",
                  }}
                >
                  <span
                    className="text-[14px] font-bold"
                    style={{
                      fontFamily: "var(--font-orbitron)",
                      color: "var(--accent)",
                    }}
                  >
                    ?
                  </span>
                </div>
                <div className="min-w-0 flex items-center gap-2.5">
                  <div
                    className="text-[11px] font-bold uppercase tracking-[0.18em]"
                    style={{
                      color: "var(--accent)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Quick Hint
                  </div>
                  <p
                    className="text-[12px] tracking-wide"
                    style={{
                      color: "var(--text-secondary)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    The question-mark button on each SDG card opens its quiz so
                    you can review the goal and earn points from the same panel.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Lists individual SDG summary cards so the user can choose which goal to inspect in detail. */}
          {analysis && (
            <div className="grid grid-cols-3 gap-4">
              {analysis.scores.map((sdg, i) => {
                const isSelected = selectedSDG?.sdgNumber === sdg.sdgNumber;
                return (
                  <motion.div
                    key={sdg.sdgNumber}
                    className="glass-panel holo-shimmer cursor-pointer relative overflow-hidden"
                    style={{
                      boxShadow: isSelected
                        ? `0 0 15px ${sdg.color}30`
                        : undefined,
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      borderColor: isSelected
                        ? sdg.color
                        : "rgba(0, 229, 255, 0.1)",
                    }}
                    transition={{
                      duration: 0.32,
                      delay: 0.15 + i * 0.06,
                    }}
                    whileHover={{
                      scale: 1.02,
                      borderColor: isSelected ? sdg.color : `${sdg.color}40`,
                    }}
                    whileTap={{ scale: 0.995 }}
                    onClick={() => {
                      setSelectedSDG(isSelected ? null : sdg);
                      setExpandedIndicator(null);
                    }}
                  >
                    {/* Adds a goal-colored accent strip that helps distinguish cards in the grid. */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[2px]"
                      style={{ background: sdg.color }}
                    />

                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div
                            className="text-[14px] font-bold tracking-[0.12em] uppercase mb-1"
                            style={{ color: sdg.color }}
                          >
                            SDG {sdg.sdgNumber}
                          </div>
                          <div
                            className="text-[15px] font-semibold tracking-wide"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {sdg.title}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isAuthenticated) {
                                setShowAuthModal(true);
                                return;
                              }
                              setQuizSDG(sdg.sdgNumber);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full transition-all"
                            style={{
                              background: "rgba(0,0,0,0.22)",
                              color: "var(--text-dim)",
                            }}
                            whileHover={{
                              scale: 1.1,
                              color: sdg.color,
                              background: `${sdg.color}14`,
                            }}
                            whileTap={{ scale: 0.95 }}
                            title={`Take SDG ${sdg.sdgNumber} Quiz`}
                          >
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                              <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                          </motion.button>
                          <SDGIcon
                            sdgNumber={sdg.sdgNumber}
                            color={sdg.color}
                            size={28}
                          />
                        </div>
                      </div>

                      {/* Visualizes the current SDG score as a circular progress indicator. */}
                      <div className="flex items-center gap-4">
                        <div className="relative w-14 h-14">
                          <svg viewBox="0 0 36 36" className="w-full h-full">
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="rgba(255,255,255,0.05)"
                              strokeWidth="2.5"
                            />
                            <motion.path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke={sdg.color}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              initial={{ strokeDasharray: "0 100" }}
                              animate={{
                                strokeDasharray: `${sdg.score} ${100 - sdg.score}`,
                              }}
                              transition={{
                                duration: 1.2,
                                delay: 0.3 + i * 0.08,
                              }}
                              style={{
                                filter: `drop-shadow(0 0 4px ${sdg.color})`,
                              }}
                            />
                          </svg>
                          <div
                            className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                            style={{
                              fontFamily: "var(--font-orbitron)",
                              color: sdg.color,
                            }}
                          >
                            {sdg.score}
                          </div>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          {sdg.indicators.slice(0, 2).map((ind) => (
                            <div
                              key={ind.id}
                              className="flex items-center gap-2"
                            >
                              <div className="flex-1">
                                <div
                                  className="h-1 rounded-full overflow-hidden"
                                  style={{
                                    background: "rgba(255,255,255,0.05)",
                                  }}
                                >
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{
                                      background: sdg.color,
                                      opacity: 0.7,
                                    }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${ind.value}%` }}
                                    transition={{
                                      duration: 0.8,
                                      delay: 0.5 + i * 0.08,
                                    }}
                                  />
                                </div>
                              </div>
                              <span
                                className="text-[14px] w-8 text-right"
                                style={{
                                  color: "var(--text-dim)",
                                  fontFamily: "var(--font-fira-code)",
                                }}
                              >
                                {ind.value}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shows the confidence assigned to the current SDG estimate or forecast. */}
                      <div className="mt-3 flex items-center justify-between">
                        <span
                          className="text-[14px] tracking-[0.1em] uppercase"
                          style={{ color: "var(--text-dim)" }}
                        >
                          Confidence
                        </span>
                        <span
                          className="text-[14px] font-bold"
                          style={{
                            color:
                              sdg.confidence > 0.8
                                ? "var(--neon-green)"
                                : "var(--neon-orange)",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          {(sdg.confidence * 100).toFixed(0)}%
                        </span>
                      </div>

                      {/* Lets the user react to the currently selected SDG at the goal level. */}
                      <VoteButtons
                        voteKey={`sdg-${sdg.sdgNumber}`}
                        targetType="sdg"
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Shows the detailed indicator breakdown, trend history, and forecast for the selected SDG. */}
          <AnimatePresence>
            {selectedSDG && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4 }}
              >
                <GlassPanel
                  title={`SDG ${selectedSDG.sdgNumber} — DETAILED ANALYSIS`}
                  accentColor={selectedSDG.color}
                  delay={0}
                >
                  <div className="grid grid-cols-2 gap-6">
                    {/* Lists the indicators that roll up into the selected SDG's current score. */}
                    <div className="space-y-3">
                      <div
                        className="text-[14px] font-bold tracking-[0.12em] uppercase mb-2"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Satellite-Derived Indicators
                      </div>
                      {selectedSDG.indicators.map((ind) => {
                        const isExpanded = expandedIndicator === ind.id;
                        return (
                          <div
                            key={ind.id}
                            className="rounded-lg p-3 cursor-pointer transition-all"
                            style={{
                              background: isExpanded
                                ? "rgba(0,0,0,0.45)"
                                : "rgba(0,0,0,0.3)",
                              border: isExpanded
                                ? `1px solid ${selectedSDG.color}40`
                                : "1px solid var(--border-subtle)",
                            }}
                            onClick={() =>
                              setExpandedIndicator(isExpanded ? null : ind.id)
                            }
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-[14px] font-semibold"
                                  style={{ color: "var(--text-primary)" }}
                                >
                                  {ind.name}
                                </span>
                                <svg
                                  width="10"
                                  height="10"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke={
                                    isExpanded
                                      ? selectedSDG.color
                                      : "var(--text-dim)"
                                  }
                                  strokeWidth="2"
                                  style={{
                                    transition: "transform 0.2s",
                                    transform: isExpanded
                                      ? "rotate(180deg)"
                                      : "rotate(0deg)",
                                  }}
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </div>
                              <span
                                className="text-[14px] font-bold"
                                style={{
                                  color: selectedSDG.color,
                                  fontFamily: "var(--font-fira-code)",
                                }}
                              >
                                {ind.value}%
                              </span>
                            </div>
                            <div
                              className="h-1.5 rounded-full overflow-hidden"
                              style={{ background: "rgba(255,255,255,0.05)" }}
                            >
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: selectedSDG.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${ind.value}%` }}
                                transition={{ duration: 0.6 }}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <span
                                className="text-[14px] tracking-wider"
                                style={{ color: "var(--text-dim)" }}
                              >
                                Source: {ind.source}
                              </span>
                              <span
                                className="text-[14px] font-bold"
                                style={{
                                  color:
                                    ind.trend === "improving"
                                      ? "var(--neon-green)"
                                      : ind.trend === "declining"
                                        ? "var(--neon-red)"
                                        : "var(--text-dim)",
                                }}
                              >
                                {ind.trend.toUpperCase()}
                              </span>
                            </div>

                            {/* Reveals extra methodology notes for the current indicator on demand. */}
                            <AnimatePresence>
                              {isExpanded && (
                                <IndicatorDetail
                                  ind={ind}
                                  color={selectedSDG.color}
                                />
                              )}
                            </AnimatePresence>

                            {/* Lets the user react to the specific indicator inside the detailed panel. */}
                            <VoteButtons
                              voteKey={`sdg-${selectedSDG.sdgNumber}-${ind.id}`}
                              targetType="indicator"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Combines historical trends, forecast output, and model context for the selected SDG. */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="text-[14px] font-bold tracking-[0.12em] uppercase"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {showForecast ? "Evolution Forecast" : trendLabel} —{" "}
                          {selectedRegion}
                        </div>
                        {hasTrendData && (
                          <button
                            onClick={() => setShowForecast(!showForecast)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-bold tracking-[0.1em] uppercase transition-all cursor-pointer"
                            style={{
                              background: showForecast
                                ? `${selectedSDG.color}18`
                                : "rgba(0,0,0,0.3)",
                              border: showForecast
                                ? `1px solid ${selectedSDG.color}50`
                                : "1px solid var(--border-subtle)",
                              color: showForecast
                                ? selectedSDG.color
                                : "var(--text-dim)",
                              boxShadow: showForecast
                                ? `0 0 10px ${selectedSDG.color}15`
                                : "none",
                            }}
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            >
                              <path d="M2 20 L8 14 L13 17 L22 4" />
                              <path d="M16 4 L22 4 L22 10" />
                            </svg>
                            {showForecast ? "Historical" : "Forecast"}
                          </button>
                        )}
                      </div>
                      <div className="h-64">
                        {showForecast &&
                        (forecastStatus === "training" ||
                          forecastStatus === "predicting") ? (
                          <div className="h-full flex items-center justify-center">
                            <div className="text-center w-full max-w-xs">
                              {/* Displays an animated neural-network motif while the forecast model is running. */}
                              <motion.svg
                                width="40"
                                height="40"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={selectedSDG.color}
                                strokeWidth="1.5"
                                className="mx-auto mb-4"
                                animate={{
                                  filter: [
                                    `drop-shadow(0 0 4px ${selectedSDG.color})`,
                                    `drop-shadow(0 0 12px ${selectedSDG.color})`,
                                    `drop-shadow(0 0 4px ${selectedSDG.color})`,
                                  ],
                                }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              >
                                {/* Draws the connected nodes that make up the loading-state network icon. */}
                                <circle
                                  cx="12"
                                  cy="4"
                                  r="1.5"
                                  fill={selectedSDG.color}
                                />
                                <circle
                                  cx="5"
                                  cy="12"
                                  r="1.5"
                                  fill={selectedSDG.color}
                                />
                                <circle
                                  cx="19"
                                  cy="12"
                                  r="1.5"
                                  fill={selectedSDG.color}
                                />
                                <circle
                                  cx="8"
                                  cy="20"
                                  r="1.5"
                                  fill={selectedSDG.color}
                                />
                                <circle
                                  cx="16"
                                  cy="20"
                                  r="1.5"
                                  fill={selectedSDG.color}
                                />
                                <line x1="12" y1="4" x2="5" y2="12" />
                                <line x1="12" y1="4" x2="19" y2="12" />
                                <line x1="5" y1="12" x2="8" y2="20" />
                                <line x1="5" y1="12" x2="16" y2="20" />
                                <line x1="19" y1="12" x2="8" y2="20" />
                                <line x1="19" y1="12" x2="16" y2="20" />
                              </motion.svg>

                              <div
                                className="text-[13px] font-bold tracking-[0.2em] uppercase mb-3"
                                style={{
                                  color: selectedSDG.color,
                                  fontFamily: "var(--font-fira-code)",
                                  textShadow: `0 0 8px ${selectedSDG.color}40`,
                                }}
                              >
                                {forecastStatus === "training"
                                  ? "TRAINING NEURAL NETWORK"
                                  : "RUNNING MC DROPOUT INFERENCE"}
                              </div>

                              {/* Shows training progress while the forecast model is actively fitting. */}
                              {forecastStatus === "training" &&
                                trainProgress && (
                                  <div className="space-y-2">
                                    <div
                                      className="h-1.5 rounded-full overflow-hidden"
                                      style={{
                                        background: "rgba(255,255,255,0.06)",
                                      }}
                                    >
                                      <motion.div
                                        className="h-full rounded-full"
                                        style={{
                                          background: selectedSDG.color,
                                          boxShadow: `0 0 8px ${selectedSDG.color}`,
                                        }}
                                        initial={{ width: 0 }}
                                        animate={{
                                          width: `${(trainProgress.epoch / trainProgress.totalEpochs) * 100}%`,
                                        }}
                                        transition={{ duration: 0.2 }}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span
                                        className="text-[12px] tracking-wider"
                                        style={{
                                          color: "var(--text-dim)",
                                          fontFamily: "var(--font-fira-code)",
                                        }}
                                      >
                                        Epoch {trainProgress.epoch}/
                                        {trainProgress.totalEpochs}
                                      </span>
                                      <span
                                        className="text-[12px] tracking-wider"
                                        style={{
                                          color: "var(--text-dim)",
                                          fontFamily: "var(--font-fira-code)",
                                        }}
                                      >
                                        Loss: {trainProgress.loss.toFixed(4)}
                                      </span>
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>
                        ) : showForecast && forecastResult ? (
                          <SDGForecastChart
                            historical={targetSeries}
                            forecast={forecastResult.points}
                            color={selectedSDG.color}
                          />
                        ) : (
                          <SDGTrendChart
                            data={getTrendData(selectedSDG.sdgNumber)}
                            color={selectedSDG.color}
                          />
                        )}
                      </div>

                      {/* Summarizes the key forecast outputs and fit metrics next to the chart. */}
                      {showForecast && forecastResult && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-3 grid grid-cols-3 gap-2"
                        >
                          {/* Shows the projected 2030 score derived from the current forecast. */}
                          <div
                            className="p-2.5 rounded-lg text-center"
                            style={{
                              background: `${selectedSDG.color}08`,
                              border: `1px solid ${selectedSDG.color}20`,
                            }}
                          >
                            <div
                              className="text-[11px] font-bold tracking-[0.15em] uppercase mb-1"
                              style={{ color: "var(--text-dim)" }}
                            >
                              Projected 2030
                            </div>
                            <div
                              className="text-lg font-bold stat-value"
                              style={{
                                color: selectedSDG.color,
                                fontFamily: "var(--font-orbitron)",
                              }}
                            >
                              {forecastResult.projectedScore2030}
                            </div>
                            <div
                              className="text-[12px]"
                              style={{ color: "var(--text-dim)" }}
                            >
                              {forecastResult.projectedScore2030 >
                              selectedSDG.score
                                ? `+${forecastResult.projectedScore2030 - selectedSDG.score}`
                                : forecastResult.projectedScore2030 <
                                    selectedSDG.score
                                  ? `${forecastResult.projectedScore2030 - selectedSDG.score}`
                                  : "±0"}{" "}
                              from current
                            </div>
                          </div>

                          {/* Shows whether the forecasted direction is improving, flat, or declining. */}
                          <div
                            className="p-2.5 rounded-lg text-center"
                            style={{
                              background: "rgba(0,0,0,0.25)",
                              border: "1px solid var(--border-subtle)",
                            }}
                          >
                            <div
                              className="text-[11px] font-bold tracking-[0.15em] uppercase mb-1"
                              style={{ color: "var(--text-dim)" }}
                            >
                              Trend
                            </div>
                            <div
                              className="text-[15px] font-bold uppercase tracking-wider"
                              style={{
                                color:
                                  forecastResult.trendDirection === "improving"
                                    ? "var(--neon-green)"
                                    : forecastResult.trendDirection ===
                                        "declining"
                                      ? "var(--neon-red)"
                                      : "var(--text-dim)",
                              }}
                            >
                              {forecastResult.trendDirection === "improving"
                                ? "↑"
                                : forecastResult.trendDirection === "declining"
                                  ? "↓"
                                  : "→"}{" "}
                              {forecastResult.trendDirection}
                            </div>
                            <div
                              className="text-[12px]"
                              style={{
                                color: "var(--text-dim)",
                                fontFamily: "var(--font-fira-code)",
                              }}
                            >
                              {forecastResult.trendPerYear > 0 ? "+" : ""}
                              {forecastResult.trendPerYear}/yr
                            </div>
                          </div>

                          {/* Shows the fit metric used to describe the forecast model's confidence. */}
                          <div
                            className="p-2.5 rounded-lg text-center"
                            style={{
                              background: "rgba(0,0,0,0.25)",
                              border: "1px solid var(--border-subtle)",
                            }}
                          >
                            <div
                              className="text-[11px] font-bold tracking-[0.15em] uppercase mb-1"
                              style={{ color: "var(--text-dim)" }}
                            >
                              Model Fit
                            </div>
                            <div
                              className="text-[15px] font-bold"
                              style={{
                                color:
                                  forecastResult.modelConfidence > 0.7
                                    ? "var(--neon-green)"
                                    : forecastResult.modelConfidence > 0.4
                                      ? "var(--neon-orange)"
                                      : "var(--neon-red)",
                                fontFamily: "var(--font-fira-code)",
                              }}
                            >
                              {Math.round(forecastResult.modelConfidence * 100)}
                              %
                            </div>
                            <div
                              className="text-[12px]"
                              style={{ color: "var(--text-dim)" }}
                            >
                              {forecastResult.modelLabel || "Holt ES"}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <div
                        className="mt-4 p-3 rounded-lg"
                        style={{
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div
                          className="text-[13px] tracking-[0.1em] uppercase mb-1"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {showForecast
                            ? "Forecast Methodology"
                            : "Analysis Summary"}
                        </div>
                        <p
                          className="text-[15px] leading-relaxed"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {showForecast ? (
                            <>
                              {forecastResult?.modelLabel === "GRU (TF.js)" ? (
                                <>
                                  Forecast generated using a GRU Neural Network
                                  (TensorFlow.js) trained on pooled cross-region
                                  SDG time series. Uncertainty quantified via
                                  Monte Carlo Dropout (30 stochastic forward
                                  passes). The shaded band represents a 95%
                                  confidence interval. Based on{" "}
                                  {getTrendData(selectedSDG.sdgNumber).length}{" "}
                                  years of World Bank data for {selectedRegion}.
                                </>
                              ) : (
                                <>
                                  Forecast generated using Holt&apos;s Double
                                  Exponential Smoothing with grid-search
                                  optimized parameters (α=
                                  {forecastResult?.alpha}, β=
                                  {forecastResult?.beta}). The shaded band
                                  represents a 95% confidence interval that
                                  widens with forecast horizon, reflecting
                                  increasing uncertainty. Based on{" "}
                                  {getTrendData(selectedSDG.sdgNumber).length}{" "}
                                  years of World Bank data for {selectedRegion}.
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              {selectedSDG.description}. Current assessment for{" "}
                              {selectedRegion} shows a composite score of{" "}
                              <strong style={{ color: selectedSDG.color }}>
                                {selectedSDG.score}/100
                              </strong>{" "}
                              with {(selectedSDG.confidence * 100).toFixed(0)}%
                              confidence based on multi-sensor satellite data
                              fusion.
                            </>
                          )}
                        </p>
                      </div>

                      {/* Explains the data sources and scoring logic behind the selected SDG analysis. */}
                      {selectedSDG.methodology && (
                        <div
                          className="mt-4 p-3 rounded-lg"
                          style={{
                            background: `${selectedSDG.color}08`,
                            border: `1px solid ${selectedSDG.color}25`,
                          }}
                        >
                          <div
                            className="text-[13px] font-bold tracking-[0.12em] uppercase mb-1.5"
                            style={{ color: selectedSDG.color }}
                          >
                            DATA SOURCES & METHODOLOGY
                          </div>
                          <p
                            className="text-[14px] leading-relaxed"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {selectedSDG.methodology}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassPanel>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Credits the datasets and model sources that feed the SDG dashboard. */}
      {(dataSource || isComparisonMode) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-between px-4 py-2.5 rounded-lg"
          style={{
            background: "rgba(0, 229, 255, 0.03)",
            border: "1px solid rgba(0, 229, 255, 0.08)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--neon-green)" }}
            />
            <span
              className="text-[13px] tracking-[0.08em] uppercase"
              style={{ color: "var(--text-dim)" }}
            >
              Data Source: {dataSource || "World Bank SDG Indicators"}
            </span>
          </div>
          {lastUpdated && (
            <span
              className="text-[13px] tracking-wider"
              style={{
                color: "var(--text-dim)",
                fontFamily: "var(--font-fira-code)",
              }}
            >
              Updated: {new Date(lastUpdated).toLocaleString()}
            </span>
          )}
        </motion.div>
      )}

      {/* Hosts the quiz modal when the user launches an SDG knowledge challenge from the dashboard. */}
      <AnimatePresence>
        {quizSDG !== null && (
          <SDGQuizModal sdgNumber={quizSDG} onClose={() => setQuizSDG(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

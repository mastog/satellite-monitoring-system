"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassPanel from "@/components/ui/GlassPanel";
import SentimentGraph from "@/components/charts/SentimentGraph";
import PostsList from "./PostsList";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";
import { useContentVotesStore } from "@/store/contentVotesStore";
import { useRouter } from "next/navigation";
import { SDG_DEFINITIONS, getIndicatorTemplates } from "@/lib/sdg/engine";
import SvgIcon from "@/components/ui/SvgIcon";
import { MOCK_ARTICLES, MOCK_PAPERS } from "@/lib/content/data";

// Computes great-circle distance so the community view can rank satellites by proximity.
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Defines the accent colors used by the nearby-satellite list based on satellite type.
const SAT_TYPE_COLORS: Record<string, string> = {
  active: "#00e5ff",
  station: "#ffd54f",
  weather: "#39ff7f",
  debris: "#ff3a5c",
};

// Renders the community workspace that combines posts, sentiment rankings, and
// the nearby-satellite feed.
export default function CommunityHub() {
  const [activeTab, setActiveTab] = useState<"passes" | "sentiment" | "posts">(
    "posts"
  );
  const {
    satellites,
    userLocation,
    setSelectedSatellite,
    toggleTracked,
    trackedSatellites,
    setShowAuthModal,
  } = useAppStore();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { counts, sentimentTrend, fetchSentimentTrend } =
    useContentVotesStore();

  useEffect(() => {
    fetchSentimentTrend();
  }, [fetchSentimentTrend]);

  // Selects the nearest non-debris satellites relative to the current user location.
  const nearestSatellites = useMemo(() => {
    if (!userLocation) return [];
    return satellites
      .filter((s) => s.type !== "debris")
      .map((s) => ({
        ...s,
        distance: haversineKm(userLocation.lat, userLocation.lng, s.lat, s.lng),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }, [satellites, userLocation]);

  // Computes SDG approval rankings using only the direct SDG vote totals.
  const sdgSentiment = useMemo(() => {
    return SDG_DEFINITIONS.map((def) => {
      const overallKey = `sdg-${def.sdgNumber}`;
      const sdgCounts = counts[overallKey] || { support: 0, oppose: 0 };

      const totalSupport = sdgCounts.support;
      const totalOppose = sdgCounts.oppose;
      const total = totalSupport + totalOppose;
      const approvalPct = total > 0 ? (totalSupport / total) * 100 : 50;

      return {
        ...def,
        support: totalSupport,
        oppose: totalOppose,
        total,
        approvalPct,
      };
    }).sort((a, b) => b.approvalPct - a.approvalPct);
  }, [counts]);

  // Builds article and paper approval rankings from the persisted vote counts.
  const contentRankings = useMemo(() => {
    const allContent = [
      ...MOCK_ARTICLES.map((a) => ({
        id: `article-${a.id}`,
        title: a.title,
        type: "Article" as const,
      })),
      ...MOCK_PAPERS.map((p) => ({
        id: `paper-${p.id}`,
        title: p.title,
        type: "Paper" as const,
      })),
    ];

    return allContent
      .map((item) => {
        const c = counts[item.id] || { support: 0, oppose: 0 };
        const total = c.support + c.oppose;
        const approvalPct = total > 0 ? (c.support / total) * 100 : 50;
        return {
          ...item,
          support: c.support,
          oppose: c.oppose,
          total,
          approvalPct,
        };
      })
      .sort((a, b) => b.approvalPct - a.approvalPct);
  }, [counts]);

  // Builds indicator-level approval rankings from the persisted vote counts.
  const indicatorRankings = useMemo(() => {
    const items: {
      id: string;
      title: string;
      type: "Indicator";
      support: number;
      oppose: number;
      total: number;
      approvalPct: number;
      icon: undefined;
    }[] = [];
    SDG_DEFINITIONS.forEach((def) => {
      const indicators = getIndicatorTemplates(def.sdgNumber);
      indicators.forEach((ind) => {
        const voteKey = `sdg-${def.sdgNumber}-${ind.id}`;
        const c = counts[voteKey] || { support: 0, oppose: 0 };
        const total = c.support + c.oppose;
        const approvalPct = total > 0 ? (c.support / total) * 100 : 50;
        items.push({
          id: voteKey,
          title: `${ind.name} (SDG ${def.sdgNumber})`,
          type: "Indicator",
          support: c.support,
          oppose: c.oppose,
          total,
          approvalPct,
          icon: undefined,
        });
      });
    });
    return items;
  }, [counts]);

  // Sets the minimum vote count required before an item is shown in the public rankings.
  const MIN_VOTES_FOR_RANKING = 5;

  // Merges SDGs, indicators, articles, and papers into one leaderboard once
  // each item has enough votes to be meaningful.
  const unifiedRankings = useMemo(() => {
    const sdgItems = sdgSentiment.map((s) => ({
      id: `sdg-${s.sdgNumber}`,
      title: `SDG ${s.sdgNumber}: ${s.title}`,
      type: "SDG" as const,
      support: s.support,
      oppose: s.oppose,
      total: s.total,
      approvalPct: s.approvalPct,
      icon: s.icon,
    }));
    const contentItems = contentRankings.map((c) => ({
      ...c,
      icon: undefined,
    }));
    return [...sdgItems, ...indicatorRankings, ...contentItems]
      .filter((item) => item.total >= MIN_VOTES_FOR_RANKING)
      .sort((a, b) => b.approvalPct - a.approvalPct);
  }, [sdgSentiment, indicatorRankings, contentRankings]);

  // Sums vote totals across all ranking groups for the headline engagement stat.
  const totalVoteCount = useMemo(() => {
    const sdgTotal = sdgSentiment.reduce((s, d) => s + d.total, 0);
    const contentTotal = contentRankings.reduce((s, d) => s + d.total, 0);
    const indicatorTotal = indicatorRankings.reduce((s, d) => s + d.total, 0);
    return sdgTotal + contentTotal + indicatorTotal;
  }, [sdgSentiment, contentRankings, indicatorRankings]);

  const tabs = [
    { id: "posts" as const, label: "COMMUNITY POSTS" },
    { id: "sentiment" as const, label: "COMMUNITY SENTIMENT" },
    { id: "passes" as const, label: "NEAREST SATELLITES" },
  ];

  const typeBadgeStyle = (type: "SDG" | "Article" | "Paper" | "Indicator") => {
    if (type === "SDG")
      return {
        background: "rgba(0,229,255,0.08)",
        color: "var(--neon-cyan)",
        border: "1px solid rgba(0,229,255,0.15)",
      };
    if (type === "Indicator")
      return {
        background: "rgba(255,107,44,0.08)",
        color: "var(--neon-orange)",
        border: "1px solid rgba(255,107,44,0.15)",
      };
    if (type === "Article")
      return {
        background: "rgba(57,255,127,0.08)",
        color: "var(--neon-green)",
        border: "1px solid rgba(57,255,127,0.15)",
      };
    return {
      background: "rgba(180,74,255,0.08)",
      color: "var(--holo-purple)",
      border: "1px solid rgba(180,74,255,0.15)",
    };
  };

  return (
    <div className="min-h-full p-6 space-y-6 pb-8">
      {/* Introduces the community workspace and its combined mission context. */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2
          className="text-lg font-bold tracking-[0.15em] text-glow-cyan"
          style={{ fontFamily: "var(--font-orbitron)" }}
        >
          COMMUNITY HUB
        </h2>
        <p
          className="text-[15px] mt-1 tracking-wide"
          style={{ color: "var(--text-dim)" }}
        >
          Track nearby satellites and explore community sentiment on SDG topics
        </p>
      </motion.div>

      {/* Switches between posts, sentiment analysis, and nearby-satellite views. */}
      <div
        className="flex gap-1 p-1 rounded-lg"
        style={{
          background: "rgba(0,0,0,0.3)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 px-4 rounded-md text-[14px] font-bold tracking-[0.12em] transition-all"
            style={{
              background:
                activeTab === tab.id ? "var(--neon-cyan-dim)" : "transparent",
              color:
                activeTab === tab.id ? "var(--neon-cyan)" : "var(--text-dim)",
              border:
                activeTab === tab.id
                  ? "1px solid rgba(0,229,255,0.2)"
                  : "1px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Shows the nearby-satellite panel, ranked by distance from the current user location. */}
        {activeTab === "passes" && (
          <motion.div
            key="passes"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <GlassPanel
              title="NEAREST SATELLITES"
              accentColor="var(--neon-cyan)"
            >
              {/* Displays the nearby-satellite summary banner. */}
              <div
                className="text-[14px] mb-4 p-3 rounded-lg flex items-center gap-3"
                style={{
                  background: "var(--neon-cyan-dim)",
                  border: "1px solid rgba(0,229,255,0.18)",
                  color: "var(--neon-cyan)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                </svg>
                <span>
                  {userLocation ? (
                    <>
                      <strong>5 nearest satellites</strong> to your location
                    </>
                  ) : (
                    <>
                      Location not available — enable geolocation to see nearby
                      satellites
                    </>
                  )}
                </span>
              </div>

              {!userLocation ? (
                <div
                  className="text-center py-8 text-[15px]"
                  style={{ color: "var(--text-dim)" }}
                >
                  Enable location access to discover satellites near you
                </div>
              ) : nearestSatellites.length === 0 ? (
                <div
                  className="text-center py-8 text-[15px]"
                  style={{ color: "var(--text-dim)" }}
                >
                  No satellite data available yet
                </div>
              ) : (
                <div className="space-y-2">
                  {nearestSatellites.map((sat, i) => {
                    const isTracked = trackedSatellites.includes(sat.id);
                    const dotColor = SAT_TYPE_COLORS[sat.type] || "#00e5ff";
                    return (
                      <motion.div
                        key={sat.id}
                        className="flex items-center justify-between p-3 rounded-lg"
                        style={{
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid var(--border-subtle)",
                        }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        whileHover={{ borderColor: "rgba(0,229,255,0.2)" }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{
                              background: dotColor,
                              boxShadow: `0 0 6px ${dotColor}`,
                            }}
                          />
                          <div className="min-w-0">
                            <div
                              className="text-[15px] font-semibold truncate"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {sat.name}
                            </div>
                            <div
                              className="text-[13px] mt-0.5"
                              style={{
                                color: "var(--text-dim)",
                                fontFamily: "var(--font-fira-code)",
                              }}
                            >
                              {sat.type.toUpperCase()} | ALT:{" "}
                              {sat.alt.toFixed(0)} km | DIST:{" "}
                              {sat.distance.toFixed(0)} km
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <button
                            onClick={() => {
                              if (!isAuthenticated) {
                                setShowAuthModal(true);
                                return;
                              }
                              toggleTracked(sat.id);
                            }}
                            className="px-2 py-1 rounded text-[12px] font-bold tracking-wider transition-all"
                            style={{
                              background: isTracked
                                ? "rgba(0,229,255,0.12)"
                                : "transparent",
                              color: isTracked
                                ? "var(--neon-cyan)"
                                : "var(--text-dim)",
                              border: isTracked
                                ? "1px solid rgba(0,229,255,0.25)"
                                : "1px solid var(--border-subtle)",
                            }}
                          >
                            {isTracked ? "UNTRACK" : "TRACK"}
                          </button>
                          <button
                            onClick={() => {
                              // Selects the target satellite before navigating
                              // into the tracking scene.
                              setSelectedSatellite(sat);
                              router.push("/tracking");
                            }}
                            className="px-2 py-1 rounded text-[12px] font-bold tracking-wider transition-all"
                            style={{
                              background: "rgba(0,229,255,0.1)",
                              color: "var(--neon-cyan)",
                              border: "1px solid rgba(0,229,255,0.2)",
                            }}
                          >
                            VIEW 3D
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </GlassPanel>
          </motion.div>
        )}

        {/* Shows the sentiment-analysis workspace with trends, rankings, and SDG reaction summaries. */}
        {activeTab === "sentiment" && (
          <motion.div
            key="sentiment"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Plots the aggregate sentiment trend across the currently available community data. */}
            <GlassPanel title="30-DAY SENTIMENT TREND">
              <div className="h-48">
                <SentimentGraph data={sentimentTrend ?? undefined} />
              </div>
              <p
                className="text-[13px] mt-2 tracking-wide"
                style={{ color: "var(--text-dim)" }}
              >
                Cumulative community support percentage over the past 30 days
                across all SDG topics, articles, and indicators
              </p>
            </GlassPanel>

            {/* Summarizes the most important participation and approval totals for the current sentiment view. */}
            <div className="grid grid-cols-3 gap-3">
              <GlassPanel delay={0.1}>
                <div className="text-center">
                  <div
                    className="text-2xl font-bold text-glow-cyan"
                    style={{ fontFamily: "var(--font-orbitron)" }}
                  >
                    {totalVoteCount.toLocaleString()}
                  </div>
                  <div
                    className="text-[13px] mt-1 tracking-wider"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Total community votes across SDG topics, articles, and
                    papers
                  </div>
                </div>
              </GlassPanel>
              <GlassPanel delay={0.15}>
                <div className="text-center">
                  <div
                    className="text-2xl font-bold"
                    style={{
                      fontFamily: "var(--font-orbitron)",
                      color: "var(--neon-green)",
                    }}
                  >
                    {sdgSentiment.length > 0
                      ? sdgSentiment[0].approvalPct.toFixed(0)
                      : 0}
                    %
                  </div>
                  <div
                    className="text-[13px] mt-1 tracking-wider"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Highest approval rate —{" "}
                    {sdgSentiment.length > 0
                      ? `SDG ${sdgSentiment[0].sdgNumber}`
                      : "N/A"}
                  </div>
                </div>
              </GlassPanel>
              <GlassPanel delay={0.2}>
                <div className="text-center">
                  <div
                    className="text-2xl font-bold"
                    style={{
                      fontFamily: "var(--font-orbitron)",
                      color: "var(--neon-orange)",
                    }}
                  >
                    {unifiedRankings.length}
                  </div>
                  <div
                    className="text-[13px] mt-1 tracking-wider"
                    style={{ color: "var(--text-dim)" }}
                  >
                    SDG topics, articles, and papers with active community
                    voting
                  </div>
                </div>
              </GlassPanel>
            </div>

            {/* Breaks down sentiment metrics by SDG so users can compare support and opposition at a glance. */}
            <GlassPanel
              title="SDG TOPIC SENTIMENT"
              accentColor="var(--neon-cyan)"
            >
              <p
                className="text-[13px] mb-3 tracking-wide"
                style={{ color: "var(--text-dim)" }}
              >
                Community attitudes toward each SDG topic — based on direct SDG
                votes
              </p>
              <div className="space-y-2">
                {sdgSentiment.map((sdg, i) => {
                  const approvalColor =
                    sdg.approvalPct > 70
                      ? "var(--neon-green)"
                      : sdg.approvalPct < 40
                        ? "var(--neon-red)"
                        : "var(--neon-orange)";

                  return (
                    <motion.div
                      key={sdg.sdgNumber}
                      className="p-3 rounded-lg"
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid var(--border-subtle)",
                      }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <SvgIcon name={sdg.icon} size={20} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[14px] font-bold tracking-wider"
                              style={{ color: sdg.color }}
                            >
                              SDG {sdg.sdgNumber}
                            </span>
                            <span
                              className="text-[15px] font-semibold"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {sdg.title}
                            </span>
                          </div>
                          <div
                            className="text-[13px] mt-0.5 tracking-wide"
                            style={{ color: "var(--text-dim)" }}
                          >
                            Ranked #{i + 1} in community approval
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className="text-[16px] font-bold"
                            style={{
                              color: approvalColor,
                              fontFamily: "var(--font-orbitron)",
                            }}
                          >
                            {sdg.approvalPct.toFixed(0)}%
                          </div>
                          <div
                            className="text-[12px] tracking-wider"
                            style={{ color: "var(--text-dim)" }}
                          >
                            approval rate
                          </div>
                        </div>
                      </div>

                      {/* Visualizes the positive-versus-negative split for the current SDG card. */}
                      <div className="flex h-2 rounded-full overflow-hidden mb-2">
                        <motion.div
                          className="h-full"
                          style={{ background: "var(--neon-green)" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${sdg.approvalPct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.06 }}
                        />
                        <motion.div
                          className="h-full"
                          style={{ background: "var(--neon-red)" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${100 - sdg.approvalPct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.06 }}
                        />
                      </div>

                      <div className="flex items-center justify-between leading-none">
                        <span
                          className="inline-flex items-center gap-1 text-[14px] font-bold leading-none"
                          style={{
                            color: "var(--neon-green)",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          <span
                            className="leading-none"
                            style={{ fontSize: "13px" }}
                          >
                            {"\u25B2"}
                          </span>{" "}
                          {sdg.support} support
                        </span>
                        <span
                          className="text-[13px] leading-none"
                          style={{
                            color: "var(--text-dim)",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          {sdg.approvalPct.toFixed(0)}% approval from{" "}
                          {sdg.total} total votes
                        </span>
                        <span
                          className="inline-flex items-center gap-1 text-[14px] font-bold leading-none"
                          style={{
                            color: "var(--neon-red)",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          <span
                            className="leading-none"
                            style={{ fontSize: "13px" }}
                          >
                            {"\u25BC"}
                          </span>{" "}
                          {sdg.oppose} oppose
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </GlassPanel>

            {/* Combines supported content types into one leaderboard so users can compare reception across the platform. */}
            <div className="grid grid-cols-2 gap-4">
              {/* Lists the items with the strongest positive approval among entries above the vote threshold. */}
              <GlassPanel
                title="MOST SUPPORTED"
                accentColor="var(--neon-green)"
                delay={0.1}
              >
                <p
                  className="text-[13px] mb-3 tracking-wide"
                  style={{ color: "var(--text-dim)" }}
                >
                  SDG topics, articles, and papers ranked by community approval
                </p>
                <div className="space-y-2">
                  {unifiedRankings.slice(0, 5).map((item, i) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 p-2 rounded-lg"
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <span
                        className="text-[14px] font-bold w-5 flex-shrink-0 text-center mt-0.5"
                        style={{
                          color: "var(--neon-green)",
                          fontFamily: "var(--font-orbitron)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-[14px] font-semibold truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {item.icon && (
                            <SvgIcon
                              name={item.icon}
                              size={14}
                              className="mr-1 inline-block align-middle"
                            />
                          )}
                          {item.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="text-[12px] px-1.5 py-0.5 rounded font-bold"
                            style={typeBadgeStyle(item.type)}
                          >
                            {item.type}
                          </span>
                          <span
                            className="text-[13px] font-bold"
                            style={{
                              color: "var(--neon-green)",
                              fontFamily: "var(--font-fira-code)",
                            }}
                          >
                            {item.approvalPct.toFixed(0)}%
                          </span>
                          <span
                            className="text-[12px] tracking-wider"
                            style={{ color: "var(--text-dim)" }}
                          >
                            from {item.total} votes
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassPanel>

              {/* Lists the items with the strongest negative approval among entries above the vote threshold. */}
              <GlassPanel
                title="MOST OPPOSED"
                accentColor="var(--neon-red)"
                delay={0.15}
              >
                <p
                  className="text-[13px] mb-3 tracking-wide"
                  style={{ color: "var(--text-dim)" }}
                >
                  Content with the lowest community approval ratings
                </p>
                <div className="space-y-2">
                  {[...unifiedRankings]
                    .reverse()
                    .slice(0, 5)
                    .map((item, i) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 p-2 rounded-lg"
                        style={{
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <span
                          className="text-[14px] font-bold w-5 flex-shrink-0 text-center mt-0.5"
                          style={{
                            color: "var(--neon-red)",
                            fontFamily: "var(--font-orbitron)",
                          }}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-[14px] font-semibold truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {item.icon && (
                              <SvgIcon
                                name={item.icon}
                                size={14}
                                className="mr-1 inline-block align-middle"
                              />
                            )}
                            {item.title}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className="text-[12px] px-1.5 py-0.5 rounded font-bold"
                              style={typeBadgeStyle(item.type)}
                            >
                              {item.type}
                            </span>
                            <span
                              className="text-[13px] font-bold"
                              style={{
                                color: "var(--neon-red)",
                                fontFamily: "var(--font-fira-code)",
                              }}
                            >
                              {(100 - item.approvalPct).toFixed(0)}%
                            </span>
                            <span
                              className="text-[12px] tracking-wider"
                              style={{ color: "var(--text-dim)" }}
                            >
                              opposition from {item.total} votes
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </GlassPanel>
            </div>

            {/* Explains how the ranking thresholds and vote counts shape the leaderboard results. */}
            <div
              className="text-center p-3 rounded-lg"
              style={{
                background: "rgba(0,0,0,0.2)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <span
                className="text-[13px] tracking-wider"
                style={{ color: "var(--text-dim)" }}
              >
                Based on {totalVoteCount.toLocaleString()} total community votes
                across {contentRankings.length} articles/papers,{" "}
                {indicatorRankings.length} indicators, and {sdgSentiment.length}{" "}
                SDG topics
              </span>
            </div>
          </motion.div>
        )}

        {/* Shows the post feed, editor, and related community interactions. */}
        {activeTab === "posts" && (
          <motion.div
            key="posts"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <PostsList />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

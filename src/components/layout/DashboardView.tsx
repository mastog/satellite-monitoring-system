"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import GlassPanel from "@/components/ui/GlassPanel";
import StatCard from "@/components/ui/StatCard";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";
import { useContentVotesStore } from "@/store/contentVotesStore";
import { useRouter } from "next/navigation";
import { type RegionalSDGData } from "@/lib/sdg/engine";
import { computeDashboardStats } from "@/lib/stats/dashboardStats";
import { generateAlerts, type SystemAlert } from "@/lib/stats/alertGenerator";
import {
  getFeaturedArticles,
  CATEGORY_MAP,
} from "@/lib/stats/featuredArticles";
import { type Article } from "@/lib/content/data";
import { computeMedals, SDG_VOTE_KEYS } from "@/lib/stats/medalComputation";
import SDGIcon from "@/components/sdg/SDGIcon";

const MISSION_QUOTES = [
  "Every orbit tells a story about our planet's health.",
  "Watching over Earth, one satellite pass at a time.",
  "From space, we see no borders — only one shared home.",
  "Data from above, action from below.",
  "The view from orbit reminds us what's worth protecting.",
  "Turning satellite signals into sustainable solutions.",
  "Observing today to safeguard tomorrow.",
];

// Renders the main mission dashboard that combines alerts, highlights, and
// user progress into a single landing view.
function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case "earth-science":
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case "sustainability":
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      );
    case "space-tech":
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M9 3h6v7l4 9H5l4-9V3z" />
          <path d="M9 3h6" />
          <circle cx="12" cy="16" r="1" />
        </svg>
      );
    case "climate":
    default:
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
  }
}

const QUICK_ACTIONS: {
  label: string;
  description: string;
  path: string;
  accentColor: string;
  icon: React.ReactNode;
}[] = [
  {
    label: "Track Satellite",
    description: "Live 3D orbital view",
    path: "/tracking",
    accentColor: "var(--neon-cyan)",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2a10 10 0 0 1 10 10" />
        <path d="M12 2a10 10 0 0 0-10 10" />
        <path d="M12 22a10 10 0 0 1-10-10" />
        <path d="M12 22a10 10 0 0 0 10-10" />
      </svg>
    ),
  },
  {
    label: "Explore SDGs",
    description: "Sustainability analysis",
    path: "/sdg",
    accentColor: "var(--neon-green)",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    label: "Read Research",
    description: "Articles & papers",
    path: "/science",
    accentColor: "var(--holo-purple)",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M9 3h6v7l4 9H5l4-9V3z" />
        <path d="M9 3h6" />
        <circle cx="12" cy="16" r="1" />
      </svg>
    ),
  },
  {
    label: "Join Community",
    description: "Alerts, medals & more",
    path: "/community",
    accentColor: "var(--neon-orange)",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDailyQuote(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return MISSION_QUOTES[dayOfYear % MISSION_QUOTES.length];
}

export default function DashboardView() {
  const { satellites, userPreferences, trackedSatellites } = useAppStore();
  const { isAuthenticated, user } = useAuthStore();
  const { counts: voteCounts, userVotes } = useContentVotesStore();
  const router = useRouter();

  const [sdgData, setSdgData] = useState<RegionalSDGData | null>(null);
  const [greeting, setGreeting] = useState("Welcome");
  const [dailyQuote, setDailyQuote] = useState(MISSION_QUOTES[0]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [communityStats, setCommunityStats] = useState({
    userCount: 0,
    postCount: 0,
  });
  const [apiArticles, setApiArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);

  useEffect(() => {
    setGreeting(getGreeting());
    setDailyQuote(getDailyQuote());

    // Loads live SDG data so the dashboard can combine orbital metrics with sustainability indicators.
    fetch("/api/sdg/indicators?region=Global")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json) {
          import("@/lib/sdg/engine").then(({ analyzeRegionAsync }) => {
            analyzeRegionAsync("Global", 0, 0, json.data).then((data) => {
              setSdgData(data);
            });
          });
        }
      })
      .catch(() => {});
  }, []);

  // Rebuilds alerts whenever satellite state or SDG data changes materially.
  useEffect(() => {
    if (satellites.length > 0) {
      setAlerts(generateAlerts(satellites, sdgData, trackedSatellites));
    }
  }, [satellites.length, sdgData, trackedSatellites.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => setCommunityStats(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/science/articles")
      .then((r) => r.json())
      .then((json) => setApiArticles(json.articles ?? []))
      .catch(() => {})
      .finally(() => setArticlesLoading(false));
  }, []);

  const displayName =
    isAuthenticated && user
      ? userPreferences.displayName || user.name.split(" ")[0]
      : "Explorer";

  const dashStats = useMemo(
    () => computeDashboardStats(satellites),
    [satellites]
  );

  const featuredArticles = useMemo(
    () => getFeaturedArticles(voteCounts, apiArticles),
    [voteCounts, apiArticles]
  );

  const voteKeys = useMemo(() => Object.keys(userVotes), [userVotes]);
  const sdgVoteCount = useMemo(
    () => SDG_VOTE_KEYS.filter((k) => voteKeys.includes(k)).length,
    [voteKeys]
  );
  const trackedNames = useMemo(
    () =>
      trackedSatellites
        .map((id) => satellites.find((s) => s.id === id)?.name ?? "")
        .filter(Boolean),
    [trackedSatellites, satellites]
  );
  const medals = useMemo(
    () =>
      computeMedals(
        trackedSatellites.length,
        trackedNames,
        voteKeys,
        sdgVoteCount
      ),
    [trackedSatellites.length, trackedNames, voteKeys, sdgVoteCount]
  );

  const alertColors: Record<string, string> = {
    warning: "var(--neon-orange)",
    info: "var(--neon-cyan)",
    success: "var(--neon-green)",
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* Greets the user and frames the dashboard with a rotating mission message. */}
      <motion.div
        className="px-6 pt-5 pb-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-end justify-between">
          <div>
            <h1
              className="text-xl font-bold tracking-wide"
              style={{
                fontFamily: "var(--font-orbitron)",
                color: "var(--text-primary)",
              }}
            >
              {greeting}, <span className="text-glow-cyan">{displayName}</span>
            </h1>
            <p
              className="text-[15px] mt-1.5 italic tracking-wide max-w-md"
              style={{ color: "var(--text-dim)" }}
            >
              &ldquo;{dailyQuote}&rdquo;
            </p>
          </div>
          <motion.div
            className="glass-panel px-4 py-2 flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: "var(--neon-green)",
                boxShadow: "0 0 6px var(--neon-green)",
              }}
            />
            <span
              className="text-[14px] font-semibold tracking-wider"
              style={{ color: "var(--text-secondary)" }}
            >
              {satellites.filter((s) => s.type !== "debris").length} satellites
              in view
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Summarizes the current platform state with headline metrics. */}
      <div className="grid grid-cols-4 gap-4 px-6 pt-3 pb-0">
        <StatCard
          label="Active Satellites"
          value={dashStats.globalActiveSats}
          accentColor="var(--neon-cyan)"
          delay={0.1}
          description="Total number of operational satellites currently tracked in all orbital regimes (LEO, MEO, GEO, HEO)"
        />
        <StatCard
          label="Tracked Debris"
          value={dashStats.globalDebris}
          accentColor="var(--neon-red)"
          delay={0.15}
          description="Count of cataloged orbital debris objects larger than 10cm being monitored by ground-based radar networks"
        />
        <StatCard
          label="SDG Index"
          value={sdgData ? sdgData.overallScore.toString() : "--"}
          unit="/ 100"
          accentColor="var(--neon-green)"
          delay={0.2}
          description="Composite sustainability score derived from satellite data mapped to UN Sustainable Development Goals (6, 9, 11, 12, 13, 15)"
        />
        <StatCard
          label="Conjunction Alerts"
          value={dashStats.conjunctionAlerts.toString()}
          accentColor="var(--neon-orange)"
          delay={0.25}
          description="Active close-approach warnings where two tracked objects will pass within 500km, requiring potential monitoring"
        />
      </div>

      {/* Holds the main dashboard panels beneath the headline statistics row. */}
      <div className="flex-1 p-6 space-y-4 pb-8">
        {/* Pairs the platform mission narrative with the primary navigation shortcuts. */}
        <div className="grid grid-cols-2 gap-4">
          {/* Explains the system mission, long-term vision, and operating principles. */}
          <GlassPanel
            title="MISSION & VISION"
            delay={0.3}
            accentColor="var(--neon-cyan)"
          >
            <div className="relative px-1 pb-1">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.035) 50%, transparent 100%)",
                  maskImage:
                    "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
                }}
              />
              <div
                className="absolute right-[-52px] top-[-58px] w-52 h-52 rounded-full pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(180,74,255,0.2) 0%, rgba(180,74,255,0.03) 55%, transparent 75%)",
                  filter: "blur(2px)",
                }}
              />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] px-2 py-1 rounded-md tracking-[0.22em] font-bold uppercase"
                      style={{
                        background: "rgba(0,229,255,0.12)",
                        border: "1px solid rgba(0,229,255,0.2)",
                        color: "var(--neon-cyan)",
                        fontFamily: "var(--font-orbitron)",
                      }}
                    >
                      Earth Command Deck
                    </span>
                    <span
                      className="text-[11px] tracking-[0.16em] uppercase"
                      style={{
                        color: "var(--text-dim)",
                        fontFamily: "var(--font-fira-code)",
                      }}
                    >
                      Open / Public / Actionable
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {["6", "9", "11", "12", "13", "15"].map((num, idx) => (
                      <motion.div
                        key={num}
                        className="h-6 flex items-center justify-center text-[10px] font-bold px-1"
                        style={{
                          color: "var(--neon-cyan)",
                          fontFamily: "var(--font-orbitron)",
                          textShadow: "0 0 10px rgba(0,229,255,0.45)",
                        }}
                        animate={{ opacity: [0.65, 1, 0.65] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: idx * 0.1,
                        }}
                      >
                        {num}
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-[1.2fr_0.8fr] gap-4 items-stretch">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.34, duration: 0.45 }}
                    className="p-2 pr-4"
                    style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="text-[11px] tracking-[0.18em] uppercase mb-2"
                      style={{
                        color: "var(--neon-cyan)",
                        fontFamily: "var(--font-orbitron)",
                      }}
                    >
                      Mission
                    </div>
                    <p
                      className="text-[16px] leading-relaxed mb-4"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Convert live orbital telemetry into clear public
                      intelligence for sustainability decisions.
                    </p>
                    <div
                      className="h-px w-full mb-3"
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(0,229,255,0.4), rgba(0,229,255,0.05), transparent)",
                      }}
                    />
                    <div
                      className="text-[11px] tracking-[0.18em] uppercase mb-2"
                      style={{
                        color: "var(--holo-purple)",
                        fontFamily: "var(--font-orbitron)",
                      }}
                    >
                      Vision
                    </div>
                    <p
                      className="text-[14px] leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Build a civic-scale planetary cockpit where transparent
                      Earth observation accelerates coordinated action.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.45 }}
                    className="p-2 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 pointer-events-none">
                      <motion.div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full"
                        style={{ border: "1px dashed rgba(0,229,255,0.3)" }}
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 16,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                      <motion.div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full"
                        style={{ border: "1px solid rgba(180,74,255,0.28)" }}
                        animate={{ rotate: -360 }}
                        transition={{
                          duration: 10,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    </div>
                    <div className="relative z-10 h-full flex flex-col items-center justify-center">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(0,229,255,0.25) 0%, rgba(0,229,255,0.08) 50%, rgba(0,0,0,0) 75%)",
                          border: "1px solid rgba(0,229,255,0.34)",
                          boxShadow: "0 0 24px rgba(0,229,255,0.28)",
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: "var(--neon-cyan)",
                            boxShadow: "0 0 10px var(--neon-cyan)",
                          }}
                        />
                      </div>
                      <div
                        className="text-[12px] tracking-[0.18em] uppercase mb-1"
                        style={{ color: "var(--text-dim)" }}
                      >
                        Signal Flow
                      </div>
                      <div
                        className="text-[13px] font-semibold tracking-wide"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Observe → Decode → Mobilize
                      </div>
                    </div>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="mt-4 pt-3"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-end justify-between gap-3">
                    {[
                      {
                        label: "Data Accessibility",
                        value: "Public by default",
                        accent: "var(--neon-cyan)",
                      },
                      {
                        label: "Policy Utility",
                        value: "Decision ready",
                        accent: "var(--neon-orange)",
                      },
                      {
                        label: "Citizen Clarity",
                        value: "Readable at first glance",
                        accent: "var(--neon-green)",
                      },
                    ].map((item) => (
                      <div key={item.label} className="flex-1 min-w-0">
                        <div
                          className="text-[11px] mb-1 tracking-[0.12em] uppercase"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {item.label}
                        </div>
                        <div
                          className="text-[13px] font-semibold truncate"
                          style={{
                            color: item.accent,
                            textShadow: `0 0 10px color-mix(in srgb, ${item.accent} 25%, transparent)`,
                          }}
                        >
                          {item.value}
                        </div>
                        <div
                          className="mt-2 h-[3px] rounded-full"
                          style={{
                            background: `linear-gradient(90deg, color-mix(in srgb, ${item.accent} 70%, transparent), transparent)`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </GlassPanel>

          {/* Provides the fastest entry points into the main application sections. */}
          <GlassPanel title="QUICK ACTIONS" delay={0.35} fill>
            <div className="h-full relative">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                  opacity: 0.35,
                }}
              />
              <div className="h-full relative z-10 grid grid-cols-2 grid-rows-2 gap-2.5">
                {QUICK_ACTIONS.map((action, i) => (
                  <motion.button
                    key={action.label}
                    onClick={() => router.push(action.path)}
                    className="h-full relative overflow-hidden flex items-center gap-3 p-3 rounded-xl text-left"
                    style={{
                      background: `linear-gradient(155deg, color-mix(in srgb, ${action.accentColor} 8%, rgba(0,0,0,0.3)), rgba(0,0,0,0.24))`,
                      border: "1px solid var(--border-subtle)",
                    }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      borderColor: "var(--border-subtle)",
                    }}
                    transition={{ duration: 0.1 }}
                    whileHover={{
                      borderColor: action.accentColor,
                      background: "rgba(0,0,0,0.4)",
                    }}
                  >
                    <div
                      className="absolute right-[-14px] top-[-16px] w-16 h-16 rounded-full pointer-events-none"
                      style={{
                        background: `radial-gradient(circle, color-mix(in srgb, ${action.accentColor} 18%, transparent), transparent 70%)`,
                      }}
                    />
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `color-mix(in srgb, ${action.accentColor} 10%, transparent)`,
                        color: action.accentColor,
                      }}
                    >
                      {action.icon}
                    </div>
                    <div>
                      <div
                        className="text-[14px] font-bold tracking-wider"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {action.label}
                      </div>
                      <div
                        className="text-[12px] tracking-wider"
                        style={{ color: "var(--text-dim)" }}
                      >
                        {action.description}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* Pairs current research highlights with operational alerts. */}
        <div className="grid grid-cols-[1fr_340px] gap-4">
          {/* Highlights curated articles that reinforce the mission context of the dashboard. */}
          <GlassPanel
            title="FEATURED ARTICLES"
            delay={0.4}
            accentColor="var(--holo-purple)"
          >
            {articlesLoading ? (
              <div className="flex items-center justify-center py-8 gap-3">
                <div
                  className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{
                    borderColor: "var(--holo-purple)",
                    borderTopColor: "transparent",
                  }}
                />
                <span
                  className="text-[13px] tracking-wider"
                  style={{ color: "var(--text-dim)" }}
                >
                  Fetching latest articles...
                </span>
              </div>
            ) : (
              <div
                className="grid grid-cols-[1fr_1fr] gap-3"
                style={{ gridTemplateRows: "auto" }}
              >
                {/* Gives the lead article the largest visual treatment in the featured list. */}
                {featuredArticles[0] && (
                  <motion.button
                    onClick={() =>
                      router.push(
                        `/science?q=${encodeURIComponent(featuredArticles[0].title)}`
                      )
                    }
                    className="row-span-2 p-4 rounded-lg text-left flex flex-col relative overflow-hidden group"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid var(--border-subtle)",
                    }}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      borderColor: "var(--border-subtle)",
                      background: "rgba(0,0,0,0.3)",
                    }}
                    transition={{
                      opacity: { delay: 0.5, duration: 0.35 },
                      y: { delay: 0.5, duration: 0.35 },
                      borderColor: { duration: 0.15 },
                      background: { duration: 0.15 },
                    }}
                    whileHover={{
                      borderColor: featuredArticles[0].accentColor,
                      background: "rgba(0,0,0,0.45)",
                    }}
                  >
                    {/* Adds a subtle gradient cap that distinguishes the lead article card. */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[2px]"
                      style={{
                        background: `linear-gradient(90deg, ${featuredArticles[0].accentColor}, transparent)`,
                      }}
                    />
                    {/* Shows the article category and source before the headline. */}
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-7 h-7 rounded flex items-center justify-center"
                        style={{
                          background: `color-mix(in srgb, ${featuredArticles[0].accentColor} 12%, transparent)`,
                          color: featuredArticles[0].accentColor,
                        }}
                      >
                        <CategoryIcon category={featuredArticles[0].category} />
                      </div>
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded font-bold tracking-widest uppercase"
                        style={{
                          background: `color-mix(in srgb, ${featuredArticles[0].accentColor} 10%, transparent)`,
                          color: featuredArticles[0].accentColor,
                          border: `1px solid color-mix(in srgb, ${featuredArticles[0].accentColor} 20%, transparent)`,
                        }}
                      >
                        {featuredArticles[0].tag}
                      </span>
                      <span
                        className="text-[11px] tracking-wider ml-auto"
                        style={{
                          color: "var(--text-dim)",
                          fontFamily: "var(--font-fira-code)",
                        }}
                      >
                        {featuredArticles[0].source}
                      </span>
                    </div>
                    {/* Displays the lead article headline. */}
                    <h4
                      className="text-[16px] font-bold leading-snug mb-2"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {featuredArticles[0].title}
                    </h4>
                    {/* Displays the lead article summary copy. */}
                    <p
                      className="text-[13px] leading-relaxed flex-1 line-clamp-4"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {featuredArticles[0].abstract}
                    </p>
                    {/* Lists the lead article tags and topical labels. */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {featuredArticles[0].tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded tracking-wider"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            color: "var(--text-dim)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {/* Shows the estimated reading time and the open-article affordance. */}
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className="text-[11px] tracking-wider"
                        style={{
                          color: "var(--text-dim)",
                          fontFamily: "var(--font-fira-code)",
                        }}
                      >
                        {featuredArticles[0].readTime}
                      </span>
                      <div
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        style={{ color: featuredArticles[0].accentColor }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </motion.button>
                )}

                {/* Stacks the remaining featured articles beside the lead story. */}
                {featuredArticles.slice(1).map((article, i) => (
                  <motion.button
                    key={article.id}
                    onClick={() =>
                      router.push(
                        `/science?q=${encodeURIComponent(article.title)}`
                      )
                    }
                    className="p-3 rounded-lg text-left flex flex-col relative overflow-hidden group"
                    style={{
                      background: "rgba(0,0,0,0.25)",
                      border: "1px solid var(--border-subtle)",
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      borderColor: "var(--border-subtle)",
                      background: "rgba(0,0,0,0.25)",
                    }}
                    transition={{
                      opacity: { delay: 0.58 + i * 0.08, duration: 0.3 },
                      y: { delay: 0.58 + i * 0.08, duration: 0.3 },
                      borderColor: { duration: 0.12 },
                      background: { duration: 0.12 },
                    }}
                    whileHover={{
                      borderColor: article.accentColor,
                      background: "rgba(0,0,0,0.4)",
                    }}
                  >
                    {/* Uses a colored side stripe to separate each secondary article card. */}
                    <div
                      className="absolute top-0 left-0 bottom-0 w-[2px]"
                      style={{ background: article.accentColor }}
                    />
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded font-bold tracking-widest uppercase"
                        style={{
                          background: `color-mix(in srgb, ${article.accentColor} 10%, transparent)`,
                          color: article.accentColor,
                          border: `1px solid color-mix(in srgb, ${article.accentColor} 20%, transparent)`,
                        }}
                      >
                        {article.tag}
                      </span>
                      <span
                        className="text-[11px] tracking-wider ml-auto"
                        style={{
                          color: "var(--text-dim)",
                          fontFamily: "var(--font-fira-code)",
                        }}
                      >
                        {article.source}
                      </span>
                    </div>
                    <h4
                      className="text-[14px] font-semibold leading-snug mb-1"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {article.title}
                    </h4>
                    <p
                      className="text-[12px] leading-relaxed line-clamp-2 flex-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {article.abstract}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className="text-[11px] tracking-wider"
                        style={{
                          color: "var(--text-dim)",
                          fontFamily: "var(--font-fira-code)",
                        }}
                      >
                        {article.readTime}
                      </span>
                      <div
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        style={{ color: article.accentColor }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </GlassPanel>

          {/* Lists the most recent automatically generated alerts. */}
          <GlassPanel
            title="RECENT ALERTS"
            delay={0.35}
            accentColor="var(--neon-orange)"
            compact
          >
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <motion.div
                  key={alert.id}
                  className="flex items-start gap-2.5 p-2 rounded-lg"
                  style={{
                    background: "rgba(0,0,0,0.25)",
                    borderLeft: `2px solid ${alertColors[alert.type]}`,
                  }}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{
                      background: alertColors[alert.type],
                      boxShadow: `0 0 6px ${alertColors[alert.type]}`,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[14px] leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {alert.msg}
                    </div>
                    <div
                      className="text-[12px] mt-0.5 tracking-wider"
                      style={{
                        color: "var(--text-dim)",
                        fontFamily: "var(--font-fira-code)",
                      }}
                    >
                      {alert.time}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassPanel>
        </div>

        {/* Combines community activity signals with the current sustainability pulse summary. */}
        <div className="grid grid-cols-2 gap-4">
          {/* Surfaces community participation and the most relevant social signals. */}
          <GlassPanel
            title="COMMUNITY HIGHLIGHTS"
            delay={0.45}
            accentColor="var(--neon-orange)"
            fill
          >
            <div className="h-full flex flex-col relative">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(rgba(255,255,255,0.05) 0.7px, transparent 0.7px)",
                  backgroundSize: "10px 10px",
                  opacity: 0.16,
                }}
              />
              <div className="grid grid-cols-2 grid-rows-2 gap-2.5 flex-1 relative z-10">
                {[
                  {
                    label: "Tracked",
                    value: trackedSatellites.length.toString(),
                    color: "var(--neon-cyan)",
                  },
                  {
                    label: "Observers",
                    value:
                      communityStats.userCount > 0
                        ? communityStats.userCount.toLocaleString()
                        : "--",
                    color: "var(--neon-green)",
                  },
                  {
                    label: "Medals",
                    value: medals.filter((m) => m.earned).length.toString(),
                    color: "var(--neon-orange)",
                  },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    className={`h-full text-center p-3 rounded-xl flex flex-col justify-center ${
                      i === 0 ? "row-span-2" : ""
                    }`}
                    style={{
                      background:
                        i === 0
                          ? "linear-gradient(160deg, rgba(0,229,255,0.16), rgba(0,0,0,0.22))"
                          : "linear-gradient(150deg, rgba(255,255,255,0.04), rgba(0,0,0,0.24))",
                      border: "1px solid var(--border-subtle)",
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.55 + i * 0.06 }}
                  >
                    <div
                      className={
                        i === 0 ? "text-2xl font-bold" : "text-lg font-bold"
                      }
                      style={{
                        color: stat.color,
                        fontFamily: "var(--font-orbitron)",
                      }}
                    >
                      {stat.value}
                    </div>
                    <div
                      className={`tracking-wider mt-1 uppercase ${i === 0 ? "text-[12px]" : "text-[13px]"}`}
                      style={{ color: "var(--text-dim)" }}
                    >
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button
                onClick={() => router.push("/community")}
                className="cyber-btn w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                style={{ marginTop: "12px" }}
              >
                VIEW COMMUNITY
              </motion.button>
            </div>
          </GlassPanel>

          {/* Summarizes recent SDG voting and sustainability sentiment. */}
          <GlassPanel
            title="SUSTAINABILITY PULSE"
            delay={0.4}
            accentColor="var(--neon-green)"
            compact
          >
            <div className="space-y-2">
              {(sdgData?.scores ?? []).map((sdg, i) => (
                <motion.div
                  key={sdg.sdgNumber}
                  className="flex items-center gap-3 p-2 rounded-lg"
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid var(--border-subtle)",
                  }}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                >
                  <SDGIcon
                    sdgNumber={sdg.sdgNumber}
                    color={sdg.color}
                    size={24}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[13px] font-bold tracking-wider"
                        style={{ color: sdg.color }}
                      >
                        SDG {sdg.sdgNumber}
                      </span>
                      <span
                        className="text-[13px] font-bold"
                        style={{
                          color: sdg.color,
                          fontFamily: "var(--font-fira-code)",
                        }}
                      >
                        {sdg.score}
                      </span>
                    </div>
                    <div
                      className="h-1 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: sdg.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${sdg.score}%` }}
                        transition={{ duration: 0.8, delay: 0.7 + i * 0.05 }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}

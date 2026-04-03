"use client";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Reveal,
  AnimatedCounter,
  CornerBrackets,
} from "@/components/ui/ScrollReveal";
import SvgIcon from "@/components/ui/SvgIcon";
import { HaloWrapText, StaticPageHaloStage } from "@/components/ui/StaticPageHalo";

/* Stores the static milestone, SDG, mission, and rating datasets outside the component so renders stay cheap. */

const TIMELINE: {
  year: string;
  title: string;
  icon: string;
  description: string;
  color: string;
}[] = [
  {
    year: "1957",
    title: "Sputnik 1",
    icon: "sputnik",
    description:
      "Humanity's first artificial satellite enters orbit, launching the Space Age.",
    color: "var(--neon-cyan)",
  },
  {
    year: "1960",
    title: "TIROS-1",
    icon: "weather-sat",
    description:
      "The first weather satellite transmits cloud-cover images from orbit.",
    color: "var(--neon-orange)",
  },
  {
    year: "1972",
    title: "Landsat 1",
    icon: "earth-scan",
    description:
      "Earth observation begins: the longest continuous record of our planet's surface.",
    color: "var(--neon-green)",
  },
  {
    year: "1978",
    title: "GPS Block I",
    icon: "gps-sat",
    description:
      "The first navigation satellite ushers in the era of global positioning.",
    color: "var(--holo-purple)",
  },
  {
    year: "1991",
    title: "ERS-1",
    icon: "radar-sat",
    description:
      "Europe's first Earth-observing satellite maps oceans, ice, and land.",
    color: "var(--neon-cyan)",
  },
  {
    year: "1999",
    title: "Terra",
    icon: "atmosphere",
    description:
      "NASA's flagship EOS satellite begins monitoring climate, atmosphere, and land.",
    color: "var(--neon-orange)",
  },
  {
    year: "2002",
    title: "GRACE",
    icon: "gravity-field",
    description:
      "Twin satellites map Earth's gravity field, revealing hidden groundwater changes.",
    color: "var(--neon-green)",
  },
  {
    year: "2014",
    title: "Sentinel-1A",
    icon: "sentinel",
    description:
      "Copernicus programme launches its first radar imaging satellite.",
    color: "var(--neon-cyan)",
  },
  {
    year: "2015",
    title: "UN SDGs Adopted",
    icon: "sdg-globe",
    description:
      "193 nations adopt 17 Sustainable Development Goals — a blueprint for the future.",
    color: "var(--neon-orange)",
  },
  {
    year: "2018",
    title: "GRACE-FO",
    icon: "gravity-follow",
    description:
      "Follow-on gravity mission continues tracking ice melt and aquifer depletion.",
    color: "var(--holo-purple)",
  },
  {
    year: "2020",
    title: "Sentinel-6",
    icon: "altimeter",
    description:
      "Sub-centimeter sea-level measurements enter the Copernicus constellation.",
    color: "var(--neon-green)",
  },
  {
    year: "2022",
    title: "SSR Launched",
    icon: "clipboard",
    description:
      "The Space Sustainability Rating formalizes a shared scoring framework for responsible orbital operations.",
    color: "#fcc30b",
  },
  {
    year: "2023",
    title: "SWOT",
    icon: "water-survey",
    description:
      "First global survey of Earth's surface water — rivers, lakes, and reservoirs.",
    color: "var(--neon-cyan)",
  },
];

const SDG_COLORS = [
  "#e5243b",
  "#dda63a",
  "#4c9f38",
  "#c5192d",
  "#ff3a21",
  "#26bde2",
  "#fcc30b",
  "#a21942",
  "#fd6925",
  "#dd1367",
  "#fd9d24",
  "#bf8b2e",
  "#3f7e44",
  "#0a97d9",
  "#56c02b",
  "#00689d",
  "#19486a",
];

const SDG_NAMES = [
  "No Poverty",
  "Zero Hunger",
  "Good Health",
  "Quality Education",
  "Gender Equality",
  "Clean Water",
  "Affordable Energy",
  "Decent Work",
  "Industry & Innovation",
  "Reduced Inequalities",
  "Sustainable Cities",
  "Responsible Production",
  "Climate Action",
  "Life Below Water",
  "Life on Land",
  "Peace & Justice",
  "Partnerships",
];

/* Defines the explanatory content used by the Space Sustainability Rating overview and drill-down sections. */

const SSR_MODULES: {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  color: string;
  detail: string;
}[] = [
  {
    id: "mission",
    name: "Mission Index",
    shortName: "MISSION",
    description:
      "Evaluates a mission's marginal contribution to overall orbital collision risk based on orbital parameters, spacecraft mass, cross-section, operational lifetime, and end-of-life disposal strategy.",
    icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    color: "#fcc30b",
    detail:
      "Computed by ESA using MASTER/DRAMA models. Heaviest weighted module in the composite score. Rewards low-altitude orbits, short operational lifetimes, and reliable de-orbit plans.",
  },
  {
    id: "detectability",
    name: "Detectability, Identification & Trackability",
    shortName: "DIT",
    description:
      "Assesses whether ground-based systems can reliably detect, identify, and track the spacecraft — a prerequisite for collision avoidance across the entire orbital population.",
    icon: "M1 12s4-8 11-8 11 8-11 8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
    color: "#26bde2",
    detail:
      "Computed by MIT Space Enabled. Factors include radar cross-section, optical reflectivity, laser retro-reflectors, GNSS receivers for self-tracking, and beacon transponders.",
  },
  {
    id: "collision",
    name: "Collision Avoidance",
    shortName: "COL AVOID",
    description:
      "Evaluates operational capability to identify, assess, and respond to conjunction events — from receiving alerts to executing manoeuvres within safe timelines.",
    icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM15 9l-6 6M9 9l6 6",
    color: "#e5243b",
    detail:
      "Assesses propulsive capability, autonomous decision systems, conjunction screening frequency, response time, and coordination with 18th Space Defense Squadron.",
  },
  {
    id: "datasharing",
    name: "Data Sharing",
    shortName: "DATA",
    description:
      "Measures whether operators share mission-critical orbital data — ephemeris, manoeuvre plans, and operational status — with the broader spaceflight safety community.",
    icon: "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13",
    color: "#4c9f38",
    detail:
      "Evaluates data contribution to Space-Track.org, 18 SDS, commercial SSA providers, and peer operators. Rewards real-time ephemeris sharing and pre-manoeuvre notifications.",
  },
  {
    id: "standards",
    name: "Design & Operations Standards",
    shortName: "STANDARDS",
    description:
      "Verifies compliance with internationally recognised debris mitigation guidelines — including the 25-year rule, passivation requirements, and the UN COPUOS LTS Guidelines.",
    icon: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
    color: "#fd6925",
    detail:
      "Checks against ISO 24113, IADC guidelines, ITU regulations, UN COPUOS LTS Guidelines, and national licensing requirements. Partial scores for partial compliance.",
  },
  {
    id: "external",
    name: "External Services",
    shortName: "EXT SVC",
    description:
      "Assesses willingness to use or demonstrated use of on-orbit servicing, active debris removal, and third-party end-of-life disposal services.",
    icon: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
    color: "#b44aff",
    detail:
      "Rewards contracts with ADR providers (e.g. ClearSpace, Astroscale), commitment to mission extension vehicles, and participation in collaborative decommissioning initiatives.",
  },
];

const SSR_TIERS: {
  name: string;
  color: string;
  bg: string;
  glow: string;
  threshold: string;
  description: string;
}[] = [
  {
    name: "Bronze",
    color: "#cd7f32",
    bg: "rgba(205,127,50,0.08)",
    glow: "rgba(205,127,50,0.3)",
    threshold: "Baseline",
    description: "Meets minimum sustainability criteria across all modules",
  },
  {
    name: "Silver",
    color: "#c0c0c0",
    bg: "rgba(192,192,192,0.08)",
    glow: "rgba(192,192,192,0.3)",
    threshold: "Above Avg",
    description: "Demonstrates above-average practices in most dimensions",
  },
  {
    name: "Gold",
    color: "#ffd700",
    bg: "rgba(255,215,0,0.08)",
    glow: "rgba(255,215,0,0.3)",
    threshold: "Excellent",
    description:
      "Comprehensive sustainability commitment with strong data sharing",
  },
  {
    name: "Platinum",
    color: "#e5e4e2",
    bg: "rgba(229,228,226,0.10)",
    glow: "rgba(229,228,226,0.35)",
    threshold: "Exemplary",
    description: "Best-in-class across all six modules with full verification",
  },
];

const SSR_RATED_MISSIONS: {
  operator: string;
  mission: string;
  tier: string;
  tierColor: string;
  year: number;
  orbit: string;
  highlight: string;
}[] = [
  {
    operator: "Eutelsat Group",
    mission: "OneWeb Gen-1 (648 LEO)",
    tier: "Platinum",
    tierColor: "#e5e4e2",
    year: 2024,
    orbit: "LEO 1200 km",
    highlight:
      "First mega-constellation to earn Platinum — pioneered fleet-wide debris mitigation and full ephemeris sharing",
  },
  {
    operator: "Astroscale",
    mission: "ELSA-d / ADRAS-J",
    tier: "Gold",
    tierColor: "#ffd700",
    year: 2023,
    orbit: "LEO 550 km",
    highlight:
      "Active debris removal demonstrators — magnetic capture and proximity operations for end-of-life servicing",
  },
  {
    operator: "Planet Labs",
    mission: "SuperDove Flock",
    tier: "Gold",
    tierColor: "#ffd700",
    year: 2023,
    orbit: "SSO 475 km",
    highlight:
      "200+ CubeSats with rapid natural orbital decay — sub-5-year deorbit and open ephemeris data",
  },
  {
    operator: "D-Orbit",
    mission: "ION SCV Series",
    tier: "Silver",
    tierColor: "#c0c0c0",
    year: 2023,
    orbit: "SSO 525 km",
    highlight:
      "Last-mile orbital transfer vehicle doubles as a decommissioning service for hosted payloads",
  },
  {
    operator: "ICEYE",
    mission: "SAR Constellation",
    tier: "Silver",
    tierColor: "#c0c0c0",
    year: 2024,
    orbit: "SSO 570 km",
    highlight:
      "Compact SAR microsats with low collision cross-section and 18 SDS data-sharing compliance",
  },
  {
    operator: "ClearSpace",
    mission: "ClearSpace-1 (ADR)",
    tier: "Gold",
    tierColor: "#ffd700",
    year: 2024,
    orbit: "LEO 660 km",
    highlight:
      "ESA-contracted active debris removal — first mission designed to capture and deorbit a defunct payload",
  },
];

/* Composes the long-form history page that connects satellite milestones, SDGs, and sustainability scoring. */

export default function HistoryView() {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const sdgSectionRef = useRef<HTMLElement | null>(null);
  const ssrSectionRef = useRef<HTMLElement | null>(null);

  // Routes timeline milestones to their corresponding long-form sections.
  const handleTimelineSelect = (title: string) => {
    const section =
      title === "UN SDGs Adopted"
        ? sdgSectionRef.current
        : title === "SSR Launched"
          ? ssrSectionRef.current
          : null;
    if (!section) return;
    section.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };
  // Sorts rated missions by award tier before rendering the certified mission grid.
  const sortedRatedMissions = [...SSR_RATED_MISSIONS].sort((a, b) => {
    const tierOrder = {
      Platinum: 0,
      Gold: 1,
      Silver: 2,
      Bronze: 3,
    } as const;

    const tierDelta = tierOrder[a.tier as keyof typeof tierOrder] -
      tierOrder[b.tier as keyof typeof tierOrder];

    if (tierDelta !== 0) return tierDelta;
    return b.year - a.year;
  });

  return (
    <div className="min-h-full p-6 pb-8">
      <StaticPageHaloStage>
        <div className="max-w-6xl mx-auto space-y-20">
        {/* Introduces the page with a hero block that frames the historical narrative of orbital observation. */}
        <section className="relative pt-8 pb-4">
          {/* Adds a soft radial glow behind the hero to separate it from the rest of the page. */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(0,229,255,0.04) 0%, transparent 70%)",
            }}
          />

          <div className="flex items-center gap-10">
            {/* Visualizes orbital motion with a looping illustration that anchors the hero section. */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex-shrink-0"
            >
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center relative"
                style={{
                  background:
                    "radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)",
                  border: "1px solid rgba(0,229,255,0.15)",
                }}
              >
                <motion.svg
                  width="64"
                  height="64"
                  viewBox="0 0 64 64"
                  fill="none"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 80,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <circle
                    cx="32"
                    cy="32"
                    r="22"
                    stroke="var(--neon-cyan)"
                    strokeWidth="0.6"
                    fill="none"
                    opacity="0.2"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="12"
                    stroke="var(--neon-cyan)"
                    strokeWidth="1"
                    fill="none"
                    opacity="0.5"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="3.5"
                    fill="var(--neon-cyan)"
                    opacity="0.8"
                  />
                  <ellipse
                    cx="32"
                    cy="32"
                    rx="28"
                    ry="9"
                    stroke="var(--neon-cyan)"
                    strokeWidth="0.5"
                    fill="none"
                    opacity="0.2"
                    transform="rotate(-25 32 32)"
                  />
                  <ellipse
                    cx="32"
                    cy="32"
                    rx="28"
                    ry="9"
                    stroke="var(--neon-orange)"
                    strokeWidth="0.5"
                    fill="none"
                    opacity="0.12"
                    transform="rotate(40 32 32)"
                  />
                  <ellipse
                    cx="32"
                    cy="32"
                    rx="28"
                    ry="9"
                    stroke="var(--holo-purple)"
                    strokeWidth="0.4"
                    fill="none"
                    opacity="0.08"
                    transform="rotate(75 32 32)"
                  />
                  {/* Animates a bright marker to imply a spacecraft moving through the orbital graphic. */}
                  <circle
                    cx="56"
                    cy="24"
                    r="2"
                    fill="var(--neon-cyan)"
                    opacity="0.9"
                  >
                    <animate
                      attributeName="opacity"
                      values="0.9;0.3;0.9"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </motion.svg>
              </div>
            </motion.div>

            {/* Presents the page title, subtitle, and introductory summary copy. */}
            <div className="flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <div
                  className="text-[12px] font-bold tracking-[0.4em] uppercase mb-2"
                  style={{
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-orbitron)",
                  }}
                >
                  SATELLITE MONITORING SYSTEM
                </div>
                <h1
                  className="text-2xl font-bold tracking-[0.2em] text-glow-cyan mb-1"
                  style={{ fontFamily: "var(--font-orbitron)" }}
                >
                  ORBITAL HISTORY
                </h1>
                <h2
                  className="text-base tracking-[0.08em] mb-4"
                  style={{
                    color: "var(--neon-orange)",
                    fontFamily: "var(--font-orbitron)",
                    fontWeight: 600,
                  }}
                >
                  FROM SPUTNIK TO SUSTAINABILITY
                </h2>
              </motion.div>
              <HaloWrapText
                className="text-[15px] leading-[1.9] tracking-wide"
                style={{ color: "var(--text-secondary)" }}
                text={
                  "In barely seven decades, humanity went from launching a beeping metal sphere into low orbit to maintaining a constellation of instruments that watches every glacier, every forest, and every coastline on the planet. This is the timeline of that transformation."
                }
              />
            </div>
          </div>

          {/* Uses a thin gradient divider to close the hero and transition into the content sections below. */}
          <motion.div
            className="mt-8 h-px mx-auto"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--neon-cyan), var(--holo-purple), var(--neon-orange), transparent)",
              maxWidth: "80%",
            }}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 0.25, scaleX: 1 }}
            transition={{ duration: 1.2, delay: 0.8 }}
          />
        </section>

        {/* Walks through major missions and policy milestones in chronological order. */}
        <section>
          <Reveal>
            <div className="flex items-center gap-4 mb-10">
              <h2
                className="text-[12px] font-bold tracking-[0.25em] uppercase"
                style={{
                  color: "var(--neon-cyan)",
                  fontFamily: "var(--font-orbitron)",
                }}
              >
                TIMELINE
              </h2>
              <div
                className="flex-1 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(0,229,255,0.2), transparent)",
                }}
              />
            </div>
          </Reveal>

          <div className="relative pl-8">
            {/* Draws the continuous timeline spine behind the event nodes. */}
            <div
              className="absolute left-[15px] top-0 bottom-0 w-px"
              style={{
                background:
                  "linear-gradient(to bottom, var(--neon-cyan), var(--holo-purple) 50%, var(--neon-orange))",
                opacity: 0.25,
              }}
            />

            <div className="space-y-6">
              {TIMELINE.map((evt, i) => (
                <Reveal key={evt.year + evt.title} delay={i * 0.08}>
                  <div className="relative flex items-start gap-5">
                    {/* Marks the event position on the timeline using the event's accent color. */}
                    <div
                      className="absolute -left-8 top-3 w-[11px] h-[11px] rounded-full flex-shrink-0 z-10"
                      style={{
                        background: evt.color,
                        boxShadow: `0 0 8px ${evt.color}`,
                      }}
                    />

                    {/* Keeps the event year visible as a fixed label beside each milestone card. */}
                    <div
                      className="flex-shrink-0 text-[13px] font-bold tracking-[0.12em] pt-1"
                      style={{
                        color: evt.color,
                        fontFamily: "var(--font-orbitron)",
                        minWidth: 52,
                      }}
                    >
                      {evt.year}
                    </div>

                    {/* Summarizes the mission or policy milestone associated with this year. */}
                    <div
                      className="flex-1 relative p-4 rounded-xl overflow-hidden"
                      style={{
                        background: "rgba(0,0,0,0.2)",
                        border: "1px solid rgba(0,229,255,0.08)",
                      }}
                      onClick={() => handleTimelineSelect(evt.title)}
                    >
                      {/* Echoes the event color across the card header so milestones remain visually distinct. */}
                      <div
                        className="absolute top-0 left-3 right-3 h-px"
                        style={{ background: evt.color, opacity: 0.25 }}
                      />
                      <div className="flex items-center gap-2 mb-1">
                        <SvgIcon name={evt.icon} size={18} />
                        <span
                          className="text-[14px] font-bold tracking-wider"
                          style={{
                            color: "var(--text-primary)",
                            fontFamily: "var(--font-orbitron)",
                          }}
                        >
                          {evt.title}
                        </span>
                      </div>
                      <p
                        className="text-[13px] leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {evt.description}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Explains how the Sustainable Development Goals created a shared framework for Earth-observation impact. */}
        <section ref={sdgSectionRef} style={{ scrollMarginTop: "28px" }}>
          <Reveal>
            <div className="flex items-center gap-4 mb-6">
              <h2
                className="text-[12px] font-bold tracking-[0.25em] uppercase"
                style={{
                  color: "var(--neon-orange)",
                  fontFamily: "var(--font-orbitron)",
                }}
              >
                THE SUSTAINABLE DEVELOPMENT GOALS
              </h2>
              <div
                className="flex-1 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(255,107,44,0.2), transparent)",
                }}
              />
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div
              className="mb-8 pl-5"
              style={{ borderLeft: "2px solid rgba(255,107,44,0.25)" }}
            >
              <HaloWrapText
                className="text-[15px] leading-[1.9] tracking-wide"
                style={{ color: "var(--text-primary)" }}
                text={
                  "In September 2015, all 193 United Nations member states adopted the 2030 Agenda for Sustainable Development — a shared blueprint built around 17 interconnected goals. These goals span from eradicating poverty and hunger to protecting the climate and preserving life on land and below water. Satellites became indispensable for measuring progress that no ground survey could capture alone."
                }
              />
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="grid grid-cols-6 gap-2">
              {SDG_COLORS.map((color, i) => (
                <motion.div
                  key={i}
                  className="relative rounded-lg overflow-hidden text-center py-3 px-1"
                  style={{
                    background: `${color}18`,
                    border: `1px solid ${color}30`,
                  }}
                  whileHover={{
                    borderColor: `${color}70`,
                    scale: 1.04,
                    transition: { duration: 0.2 },
                  }}
                >
                  <div
                    className="text-[18px] font-black mb-0.5"
                    style={{
                      color,
                      fontFamily: "var(--font-orbitron)",
                      lineHeight: 1.2,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div
                    className="text-[10px] leading-tight tracking-wide"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {SDG_NAMES[i]}
                  </div>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Introduces the Space Sustainability Rating framework and shows how missions are evaluated. */}
        <section ref={ssrSectionRef} style={{ scrollMarginTop: "28px" }}>
          {/* Labels the rating section before the explanatory panels and module breakdowns. */}
          <Reveal>
            <div className="flex items-center gap-4 mb-3">
              <h2
                className="text-[12px] font-bold tracking-[0.25em] uppercase"
                style={{ color: "#fcc30b", fontFamily: "var(--font-orbitron)" }}
              >
                SPACE SUSTAINABILITY RATING
              </h2>
              <div
                className="flex-1 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(252,195,11,0.25), transparent)",
                }}
              />
            </div>
          </Reveal>

          {/* Provides the high-level explanation of what the rating measures and why it matters. */}
          <Reveal delay={0.05}>
            <div
              className="relative rounded-2xl overflow-hidden mb-8"
              style={{
                background:
                  "linear-gradient(135deg, rgba(252,195,11,0.03) 0%, rgba(0,0,0,0.25) 40%, rgba(229,228,226,0.02) 100%)",
                border: "1px solid rgba(252,195,11,0.1)",
              }}
            >
              {/* Uses a gradient cap to visually anchor the overview panel. */}
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #fcc30b, #e5e4e2, transparent)",
                  opacity: 0.35,
                }}
              />

              <div className="grid items-center gap-0 md:grid-cols-[minmax(0,1fr)_280px]">
                {/* Holds the descriptive narrative and headline metrics for the rating system. */}
                <div className="min-w-0 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    {/* Frames the rating concept with a shield-style icon that suggests certification and protection. */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(252,195,11,0.12), rgba(229,228,226,0.06))",
                        border: "1px solid rgba(252,195,11,0.18)",
                      }}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fcc30b"
                        strokeWidth="1.5"
                      >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path
                          d="M9 12l2 2 4-4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <div
                        className="text-[11px] tracking-[0.2em] uppercase mb-0.5"
                        style={{
                          color: "var(--text-dim)",
                          fontFamily: "var(--font-fira-code)",
                        }}
                      >
                        WEF &middot; ESA &middot; MIT &middot; EPFL
                      </div>
                      <div
                        className="text-[15px] font-bold tracking-wider"
                        style={{
                          color: "#fcc30b",
                          fontFamily: "var(--font-orbitron)",
                        }}
                      >
                        SSR FRAMEWORK
                      </div>
                    </div>
                  </div>

                  <HaloWrapText
                    className="text-[14px] leading-[1.85] tracking-wide mb-4"
                    style={{ color: "var(--text-secondary)" }}
                    text={
                      "Launched in 2022 by the World Economic Forum, ESA, and MIT Media Lab, the Space Sustainability Rating is the first composite indicator designed to incentivise satellite operators toward long-term orbital sustainability. Missions are assessed across six modules and awarded a tier from Bronze to Platinum — turning responsible space behaviour into a competitive advantage."
                    }
                  />

                  {/* Summarizes the number of modules, scoring structure, and intended operational outcomes. */}
                  <div className="flex gap-4">
                    {[
                      { label: "MODULES", value: 6 },
                      { label: "TIERS", value: 4 },
                      { label: "SINCE", value: 2022 },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="flex-1 py-2 px-3 rounded-lg text-center"
                        style={{
                          background: "rgba(252,195,11,0.04)",
                          border: "1px solid rgba(252,195,11,0.08)",
                        }}
                      >
                        <div
                          className="text-[18px] font-bold"
                          style={{
                            color: "#fcc30b",
                            fontFamily: "var(--font-orbitron)",
                          }}
                        >
                          {stat.label === "SINCE" ? (
                            stat.value
                          ) : (
                            <AnimatedCounter
                              target={stat.value}
                              duration={1.2}
                            />
                          )}
                        </div>
                        <div
                          className="text-[10px] tracking-[0.15em] uppercase mt-0.5"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visualizes the six rating dimensions as a stylized radar chart. */}
                <div className="flex w-[280px] items-center justify-center p-4">
                  <svg viewBox="0 0 240 240" width="240" height="240">
                    <defs>
                      <style>{`
                        @keyframes ssr-rotate { to { transform: rotate(360deg); } }
                        .ssr-orbit { transform-origin: 120px 120px; animation: ssr-rotate 60s linear infinite; }
                        @keyframes ssr-pulse { 0%,100% { opacity: 0.15; } 50% { opacity: 0.35; } }
                        .ssr-ring-pulse { animation: ssr-pulse 4s ease-in-out infinite; }
                      `}</style>
                    </defs>
                    {/* Provides depth and scale references behind the radar visualization. */}
                    {[85, 65, 45].map((r, i) => (
                      <circle
                        key={r}
                        cx="120"
                        cy="120"
                        r={r}
                        fill="none"
                        stroke="#fcc30b"
                        strokeWidth="0.5"
                        opacity={0.06 + i * 0.03}
                        className="ssr-ring-pulse"
                        style={{ animationDelay: `${i * 0.8}s` }}
                      />
                    ))}
                    {/* Establishes the six-axis structure used to position the module nodes. */}
                    {SSR_MODULES.map((_, i) => {
                      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                      const x = 120 + Math.cos(angle) * 90;
                      const y = 120 + Math.sin(angle) * 90;
                      return (
                        <line
                          key={i}
                          x1="120"
                          y1="120"
                          x2={x}
                          y2={y}
                          stroke="#fcc30b"
                          strokeWidth="0.4"
                          opacity="0.1"
                        />
                      );
                    })}
                    {/* Fills a sample polygon so readers can infer how a mission score occupies the chart. */}
                    <polygon
                      points={SSR_MODULES.map((_, i) => {
                        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                        const score = [0.82, 0.7, 0.75, 0.65, 0.88, 0.6][i];
                        const x = 120 + Math.cos(angle) * 85 * score;
                        const y = 120 + Math.sin(angle) * 85 * score;
                        return `${x},${y}`;
                      }).join(" ")}
                      fill="rgba(252,195,11,0.06)"
                      stroke="#fcc30b"
                      strokeWidth="1.2"
                      opacity="0.6"
                    />
                    {/* Places each SSR module around the chart perimeter using its configured accent color. */}
                    {SSR_MODULES.map((mod, i) => {
                      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                      const x = 120 + Math.cos(angle) * 95;
                      const y = 120 + Math.sin(angle) * 95;
                      return (
                        <g key={mod.id}>
                          <circle
                            cx={x}
                            cy={y}
                            r="6"
                            fill={mod.color}
                            opacity="0.85"
                          />
                          <circle
                            cx={x}
                            cy={y}
                            r="10"
                            fill="none"
                            stroke={mod.color}
                            strokeWidth="0.6"
                            opacity="0.3"
                          />
                          <text
                            x={x}
                            y={y + (i < 3 ? -16 : 18)}
                            textAnchor="middle"
                            fill={mod.color}
                            fontSize="8"
                            fontFamily="var(--font-orbitron)"
                            fontWeight="700"
                            opacity="0.9"
                          >
                            {mod.shortName}
                          </text>
                        </g>
                      );
                    })}
                    {/* Labels the chart center so the graphic reads as the SSR summary view. */}
                    <text
                      x="120"
                      y="117"
                      textAnchor="middle"
                      fill="#fcc30b"
                      fontSize="11"
                      fontFamily="var(--font-orbitron)"
                      fontWeight="800"
                    >
                      SSR
                    </text>
                    <text
                      x="120"
                      y="130"
                      textAnchor="middle"
                      fill="var(--text-dim)"
                      fontSize="7.5"
                      fontFamily="var(--font-fira-code)"
                    >
                      6 MODULES
                    </text>
                    {/* Adds a subtle moving marker to keep the static chart visually active. */}
                    <circle
                      cx="120"
                      cy="30"
                      r="2.5"
                      fill="#fcc30b"
                      opacity="0.7"
                      className="ssr-orbit"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Compares the four rating tiers and the quality threshold each one represents. */}
          <Reveal delay={0.1}>
            <div className="mb-8">
              <div
                className="text-[11px] font-bold tracking-[0.2em] uppercase mb-4"
                style={{
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-orbitron)",
                }}
              >
                CERTIFICATION TIERS
              </div>
              <div className="grid grid-cols-4 gap-3">
                {SSR_TIERS.map((tier, i) => (
                  <motion.div
                    key={tier.name}
                    className="relative rounded-xl overflow-hidden p-4"
                    style={{
                      background: tier.bg,
                      border: `1px solid ${tier.color}18`,
                    }}
                    whileHover={{
                      borderColor: `${tier.color}50`,
                      transition: { duration: 0.2 },
                    }}
                  >
                    {/* Uses the tier color as a cap so each card reads immediately as part of the progression. */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[2px]"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${tier.color}, transparent)`,
                        opacity: 0.4,
                      }}
                    />
                    <div className="flex items-center gap-2.5 mb-2">
                      {/* Repeats the shield motif with the tier color to reinforce the certification metaphor. */}
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${tier.color}18, ${tier.color}08)`,
                          boxShadow: `0 0 12px ${tier.color}10`,
                        }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={tier.color}
                          strokeWidth="1.8"
                        >
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          {i >= 1 && (
                            <circle
                              cx="12"
                              cy="11"
                              r="2"
                              fill={tier.color}
                              opacity="0.5"
                            />
                          )}
                          {i >= 2 && (
                            <path
                              d="M9 11l2 2 4-4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}
                          {i >= 3 && (
                            <>
                              <circle
                                cx="12"
                                cy="2"
                                r="1.5"
                                fill={tier.color}
                                opacity="0.6"
                              />
                              <line
                                x1="10"
                                y1="1"
                                x2="14"
                                y2="1"
                                stroke={tier.color}
                                strokeWidth="1"
                                opacity="0.4"
                              />
                            </>
                          )}
                        </svg>
                      </div>
                      <div>
                        <div
                          className="text-[14px] font-bold tracking-wider"
                          style={{
                            color: tier.color,
                            fontFamily: "var(--font-orbitron)",
                          }}
                        >
                          {tier.name.toUpperCase()}
                        </div>
                        <div
                          className="text-[10px] tracking-[0.15em]"
                          style={{
                            color: "var(--text-dim)",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          {tier.threshold}
                        </div>
                      </div>
                    </div>
                    <p
                      className="text-[12px] leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {tier.description}
                    </p>
                    {/* Inserts directional arrows to show the progression from baseline to exemplary performance. */}
                    {i < 3 && (
                      <div
                        className="absolute top-1/2 -right-[11px] -translate-y-1/2 z-10"
                        style={{ color: "var(--text-dim)" }}
                      >
                        <svg
                          width="8"
                          height="12"
                          viewBox="0 0 8 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1"
                          opacity="0.25"
                        >
                          <path d="M1 1l5 5-5 5" />
                        </svg>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Lets the reader inspect each SSR module and its detailed evaluation criteria. */}
          <Reveal delay={0.15}>
            <div className="mb-8">
              <div
                className="text-[11px] font-bold tracking-[0.2em] uppercase mb-4"
                style={{
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-orbitron)",
                }}
              >
                RATING DIMENSIONS
              </div>

              {/* Offers the module tabs that drive the detailed panel below. */}
              <div className="flex gap-2 mb-4">
                {SSR_MODULES.map((mod) => (
                  <motion.button
                    key={mod.id}
                    onClick={() =>
                      setActiveModule(activeModule === mod.id ? null : mod.id)
                    }
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-left flex-1"
                    style={{
                      background:
                        activeModule === mod.id
                          ? `${mod.color}12`
                          : "rgba(0,0,0,0.2)",
                      border: `1px solid ${activeModule === mod.id ? `${mod.color}35` : "rgba(255,255,255,0.04)"}`,
                    }}
                    whileHover={{
                      borderColor: `${mod.color}40`,
                      transition: { duration: 0.15 },
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `${mod.color}15`,
                        color: mod.color,
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={mod.icon} />
                      </svg>
                    </div>
                    <span
                      className="text-[11px] font-bold tracking-wider truncate"
                      style={{
                        color:
                          activeModule === mod.id
                            ? mod.color
                            : "var(--text-dim)",
                        fontFamily: "var(--font-orbitron)",
                      }}
                    >
                      {mod.shortName}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Expands the currently selected module into its full description and evaluation notes. */}
              <AnimatePresence mode="wait">
                {activeModule &&
                  (() => {
                    const mod = SSR_MODULES.find((m) => m.id === activeModule)!;
                    return (
                      <motion.div
                        key={mod.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{
                          duration: 0.3,
                          ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                        className="overflow-hidden"
                      >
                        <div
                          className="relative rounded-xl p-5 flex gap-5"
                          style={{
                            background: `linear-gradient(135deg, ${mod.color}06, rgba(0,0,0,0.2))`,
                            border: `1px solid ${mod.color}15`,
                          }}
                        >
                          {/* Pins a colored vertical rule beside each detail item for quick visual grouping. */}
                          <div
                            className="absolute top-3 bottom-3 left-0 w-[2px] rounded-full"
                            style={{ background: mod.color, opacity: 0.5 }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center"
                                style={{
                                  background: `${mod.color}15`,
                                  color: mod.color,
                                }}
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d={mod.icon} />
                                </svg>
                              </div>
                              <h4
                                className="text-[13px] font-bold tracking-wider"
                                style={{
                                  color: mod.color,
                                  fontFamily: "var(--font-orbitron)",
                                }}
                              >
                                {mod.name.toUpperCase()}
                              </h4>
                            </div>
                            <p
                              className="text-[13px] leading-[1.8] tracking-wide mb-3"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {mod.description}
                            </p>
                            <div
                              className="text-[12px] leading-[1.75] tracking-wide pl-3"
                              style={{
                                color: "var(--text-secondary)",
                                borderLeft: `1px solid ${mod.color}20`,
                              }}
                            >
                              {mod.detail}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()}
              </AnimatePresence>
            </div>
          </Reveal>

          {/* Shows representative missions and the tiers they have earned under the rating framework. */}
          <Reveal delay={0.2}>
            <div>
              <div className="flex items-end justify-between mb-4">
                <div
                  className="text-[11px] font-bold tracking-[0.2em] uppercase"
                  style={{
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-orbitron)",
                  }}
                >
                  CERTIFIED MISSIONS
                </div>
                <div
                  className="text-[10px] tracking-[0.12em] uppercase px-2.5 py-1 rounded-full"
                  style={{
                    color: "#fcc30b",
                    border: "1px solid rgba(252,195,11,0.15)",
                    background: "rgba(252,195,11,0.04)",
                    fontFamily: "var(--font-fira-code)",
                  }}
                >
                  {SSR_RATED_MISSIONS.length} RATED
                </div>
              </div>

              {/* Arranges rated mission summaries in a compact two-column card grid. */}
              <div className="grid grid-cols-2 gap-3">
                {sortedRatedMissions.map((mission, i) => (
                  <Reveal
                    key={mission.operator + mission.mission}
                    delay={i * 0.04}
                  >
                    <div
                      className="relative rounded-xl overflow-hidden p-4 group"
                      style={{
                        background: "rgba(0,0,0,0.2)",
                        border: `1px solid ${mission.tierColor}0c`,
                      }}
                    >
                      {/* Uses the earned tier color as a top accent for each rated mission card. */}
                      <div
                        className="absolute top-0 left-4 right-4 h-px"
                        style={{ background: mission.tierColor, opacity: 0.15 }}
                      />

                      {/* Pairs the mission operator with the awarded tier so the comparison is easy to scan. */}
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="text-[13px] font-bold tracking-wider"
                          style={{
                            color: "var(--text-primary)",
                            fontFamily: "var(--font-orbitron)",
                          }}
                        >
                          {mission.operator}
                        </div>
                        <div
                          className="text-[10px] font-bold tracking-[0.15em] uppercase px-2 py-0.5 rounded-full flex items-center gap-1.5"
                          style={{
                            background: `${mission.tierColor}10`,
                            color: mission.tierColor,
                            border: `1px solid ${mission.tierColor}25`,
                            boxShadow: `0 0 8px ${mission.tierColor}08`,
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
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                          {mission.tier}
                        </div>
                      </div>

                      {/* Groups the mission identifier, orbit class, and award year into one metadata block. */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className="text-[12px] tracking-wider"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {mission.mission}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-px rounded tracking-wider"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            color: "var(--text-dim)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          {mission.orbit}
                        </span>
                        <span
                          className="text-[10px] tracking-wider"
                          style={{
                            color: "var(--text-dim)",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          {mission.year}
                        </span>
                      </div>

                      {/* Captures the sustainability practice that most clearly explains the mission's rating. */}
                      <p
                        className="text-[12px] leading-[1.7]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {mission.highlight}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* Closes the page with a forward-looking call to action about sustainable orbital stewardship. */}
        <section>
          <Reveal>
            <div
              className="relative p-8 rounded-2xl overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,229,255,0.03) 0%, rgba(255,107,44,0.03) 50%, rgba(180,74,255,0.03) 100%)",
                border: "1px solid rgba(0,229,255,0.08)",
              }}
            >
              <CornerBrackets />

              <div className="flex items-center gap-8">
                {/* Delivers the closing narrative and invitation to think beyond the historical timeline. */}
                <div className="flex-1 min-w-0">
                  <motion.div
                    className="text-[12px] font-bold tracking-[0.25em] uppercase mb-3"
                    style={{
                      color: "var(--neon-cyan)",
                      fontFamily: "var(--font-orbitron)",
                    }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    TRANSMISSION OPEN
                  </motion.div>

                  <h3
                    className="text-base font-bold tracking-[0.1em] mb-3"
                    style={{
                      fontFamily: "var(--font-orbitron)",
                      color: "var(--text-primary)",
                    }}
                  >
                    THE NEXT FRONTIER
                  </h3>

                  <HaloWrapText
                    className="text-[15px] leading-[1.85] mb-3"
                    style={{ color: "var(--text-secondary)" }}
                    text={
                      "The next generation of Earth-observation satellites will carry hyperspectral imagers, lidar altimeters, and AI-driven onboard processors — turning raw photons into actionable insights before data ever reaches the ground. Constellations will shrink revisit times from days to hours, giving us a near-continuous portrait of a changing planet."
                    }
                  />

                  <HaloWrapText
                    className="text-[14px] leading-relaxed"
                    style={{ color: "var(--text-dim)" }}
                    text={
                      "Sustainability targets that once relied on decade-old census data will be tracked in near real-time. From orbit, the goals are no longer abstract — they are measurable, visible, and undeniable. The question is no longer whether we can see the change, but whether we choose to act on it."
                    }
                  />
                </div>

                {/* Adds a pulse-style Earth graphic to support the closing message without new data density. */}
                <div className="flex-shrink-0 w-28 h-28 relative flex items-center justify-center">
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ border: "1px solid rgba(0,229,255,0.1)" }}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <motion.div
                    className="absolute rounded-full"
                    style={{
                      width: "70%",
                      height: "70%",
                      border: "1px solid rgba(0,229,255,0.15)",
                    }}
                    animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.1, 0.4] }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.5,
                    }}
                  />
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-2xl"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(0,229,255,0.1) 0%, transparent 70%)",
                    }}
                  >
                    <SvgIcon name="globe" size={28} />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Finishes the page with a restrained footer that echoes the history theme. */}
        <Reveal>
          <div
            className="text-center py-3 px-4 rounded-lg"
            style={{
              background: "rgba(0,0,0,0.12)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <p
              className="text-[12px] leading-relaxed tracking-wide"
              style={{ color: "var(--text-dim)" }}
            >
              Historical data sourced from ESA, NASA, NOAA, and UN archives.
              Timeline milestones reflect key inflection points in
              satellite-enabled sustainability monitoring.
            </p>
          </div>
        </Reveal>
        </div>
      </StaticPageHaloStage>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import {
  AnimatedCounter,
  Reveal,
  CornerBrackets,
} from "@/components/ui/ScrollReveal";
import SvgIcon from "@/components/ui/SvgIcon";
import { HaloWrapText, StaticPageHaloStage } from "@/components/ui/StaticPageHalo";

const SDG_CONTRIBUTIONS = [
  {
    sdg: 6,
    title: "Clean Water & Sanitation",
    color: "#26bde2",
    satellite: "GRACE-FO, Sentinel-2, Landsat 8/9, GPM",
    description:
      "Groundwater storage, surface water extent, water quality, and precipitation monitoring",
  },
  {
    sdg: 9,
    title: "Industry & Infrastructure",
    color: "#fd6925",
    satellite: "VIIRS, Sentinel-1/2",
    description:
      "Nighttime light analysis, road network extraction, built-up area classification",
  },
  {
    sdg: 11,
    title: "Sustainable Cities",
    color: "#f99d26",
    satellite: "Landsat, Sentinel-2, MODIS",
    description:
      "Urban expansion tracking, green space mapping, air quality and heat island analysis",
  },
  {
    sdg: 12,
    title: "Responsible Production",
    color: "#bf8b2e",
    satellite: "Sentinel-1/2, MODIS, Hansen GFC",
    description:
      "Waste site monitoring, mining impact, agricultural efficiency, deforestation tracking",
  },
  {
    sdg: 13,
    title: "Climate Action",
    color: "#3f7e44",
    satellite: "Sentinel-3, Jason-3, CryoSat-2, OCO-2/3",
    description:
      "Temperature anomalies, sea level change, ice sheet mass balance, CO\u2082 concentrations",
  },
  {
    sdg: 15,
    title: "Life on Land",
    color: "#56c02b",
    satellite: "MODIS, Sentinel-1/2, Landsat",
    description:
      "Vegetation coverage, forest loss rates, biodiversity habitat connectivity, soil degradation",
  },
];

const PIPELINE_STEPS = [
  {
    label: "ACQUIRE",
    description: "Satellites capture data across electromagnetic spectrum",
    color: "var(--neon-cyan)",
  },
  {
    label: "PROCESS",
    description: "Raw signals become calibrated measurements",
    color: "var(--neon-orange)",
  },
  {
    label: "EXTRACT",
    description: "Algorithms reveal hidden patterns in data",
    color: "var(--holo-purple)",
  },
  {
    label: "SCORE",
    description: "Indicators map to UN sustainability framework",
    color: "var(--neon-green)",
  },
  {
    label: "VISUALIZE",
    description: "Insights become interactive stories",
    color: "var(--neon-cyan)",
  },
];

const SATELLITE_SOURCES = [
  {
    name: "Sentinel-2A/2B",
    agency: "ESA",
    role: "Multispectral Imager",
    purpose:
      "13 spectral bands at 10m resolution. Every field, river, and forest canopy, updated every 5 days.",
    color: "#26bde2",
  },
  {
    name: "Landsat 8/9",
    agency: "USGS/NASA",
    role: "Heritage Observer",
    purpose:
      "50+ years of continuous observation \u2014 the longest unbroken record of Earth\u2019s surface from space.",
    color: "#fd6925",
  },
  {
    name: "MODIS",
    agency: "NASA",
    role: "Global Monitor",
    purpose:
      "Photographs the entire planet daily. Wildfires, algae blooms, and desert expansion in near real-time.",
    color: "#f99d26",
  },
  {
    name: "GRACE-FO",
    agency: "NASA/GFZ",
    role: "Gravity Mapper",
    purpose:
      "Twin satellites measuring gravity \u2014 revealing invisible groundwater vanishing beneath our feet.",
    color: "#bf8b2e",
  },
  {
    name: "CryoSat-2",
    agency: "ESA",
    role: "Ice Surveyor",
    purpose:
      "Millimeter-precision measurements of Earth\u2019s ice sheets. Every crack, every calving event.",
    color: "#3f7e44",
  },
  {
    name: "Jason-3",
    agency: "NASA/CNES",
    role: "Sea Level Tracker",
    purpose:
      "Sub-centimeter sea level accuracy. The rising ocean, measured from 1,336 km above.",
    color: "#56c02b",
  },
  {
    name: "OCO-2/3",
    agency: "NASA",
    role: "Carbon Counter",
    purpose:
      "Atmospheric CO\u2082 concentrations measured molecule by molecule. Humanity\u2019s carbon fingerprint from orbit.",
    color: "#b44aff",
  },
  {
    name: "VIIRS",
    agency: "NOAA",
    role: "Nighttime Analyst",
    purpose:
      "City lights from space. Where light grows, civilization thrives \u2014 or sprawls unchecked.",
    color: "#00e5ff",
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

const CONNECTION_DATA: { satellite: string; sdgs: number[] }[] = [
  { satellite: "Sentinel-2", sdgs: [6, 11, 15] },
  { satellite: "Landsat 8/9", sdgs: [11, 12, 15] },
  { satellite: "MODIS", sdgs: [13, 15] },
  { satellite: "GRACE-FO", sdgs: [6, 13] },
  { satellite: "CryoSat-2", sdgs: [13, 14] },
  { satellite: "OCO-2", sdgs: [13] },
];

const CONNECTED_SDGS = [6, 11, 12, 13, 14, 15];

const IMPACT_STATS = [
  { value: 6, label: "SDGs Monitored", color: "var(--neon-cyan)", suffix: "" },
  {
    value: 24,
    label: "Satellite Indicators",
    color: "var(--neon-green)",
    suffix: "+",
  },
  { value: 8, label: "Eyes in Space", color: "var(--neon-orange)", suffix: "" },
  {
    value: 7,
    label: "Global Regions",
    color: "var(--holo-purple)",
    suffix: "",
  },
];

// Renders the long-form project overview page that explains the mission,
// satellite sources, analysis pipeline, and SDG coverage.
export default function AboutView() {
  // Computes the SVG layout used by the satellite-to-SDG connection diagram.
  const satCount = CONNECTION_DATA.length;
  const sdgCount = CONNECTED_SDGS.length;
  const svgW = 720;
  const svgH = Math.max(satCount, sdgCount) * 56 + 40;
  const satX = 130;
  const sdgX = svgW - 130;

  // Aligns satellite and SDG nodes evenly along the connection graphic.
  const satY = (i: number) => 40 + i * ((svgH - 80) / (satCount - 1));
  const sdgY = (i: number) => 40 + i * ((svgH - 80) / (sdgCount - 1));

  return (
    <div className="min-h-full p-6 pb-8">
      <StaticPageHaloStage>
        <div className="max-w-6xl mx-auto space-y-20">
        {/* Introduces the platform with a mission-focused hero section and atmospheric visuals. */}
        <section className="relative pt-8 pb-4">
          {/* Adds a soft background glow behind the hero content. */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(0,229,255,0.04) 0%, transparent 70%)",
            }}
          />

          <div className="flex items-center gap-10">
            {/* Shows the animated orbital emblem that anchors the hero visually. */}
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
                  {/* Satellite dot on first orbit */}
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

            {/* Right: title + intro text */}
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
                  WATCHING EARTH
                </h1>
                <h2
                  className="text-base tracking-[0.08em] mb-4"
                  style={{
                    color: "var(--neon-orange)",
                    fontFamily: "var(--font-orbitron)",
                    fontWeight: 600,
                  }}
                >
                  PROTECTING TOMORROW
                </h2>
              </motion.div>
              <HaloWrapText
                className="text-[15px] leading-[1.9] tracking-wide"
                style={{ color: "var(--text-secondary)" }}
                text={
                  "Somewhere above you, right now, a constellation of satellites is painting a portrait of our planet. They see what we cannot — the slow retreat of glaciers, the silent depletion of aquifers, the stubborn glow of cities that never sleep. This system translates their observations into something we can understand, and act upon."
                }
              />
            </div>
          </div>

          {/* Uses a thin gradient divider to transition from the hero into the narrative sections below. */}
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

        {/* Explains why satellite-scale observation is necessary for modern planetary challenges. */}
        <section>
          <Reveal>
            <div className="relative">
              {/* Labels the section and anchors it visually with a short accent rule. */}
              <div className="flex items-center gap-4 mb-8">
                <h2
                  className="text-[12px] font-bold tracking-[0.25em] uppercase"
                  style={{
                    color: "var(--neon-cyan)",
                    fontFamily: "var(--font-orbitron)",
                  }}
                >
                  WHY IT MATTERS
                </h2>
                <div
                  className="flex-1 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(0,229,255,0.2), transparent)",
                  }}
                />
              </div>

              {/* Opens the section with a short narrative about traditional ground-level understanding. */}
              <div
                className="mb-8 pl-5"
                style={{ borderLeft: "2px solid rgba(0,229,255,0.25)" }}
              >
                <HaloWrapText
                  className="text-[17px] leading-[2] tracking-wide"
                  style={{ color: "var(--text-primary)" }}
                  text={
                    "For thousands of years, we understood our world by walking through it. We judged the health of a river by its color, the fertility of soil by its smell, the coming of storms by the patterns of wind."
                  }
                />
                <HaloWrapText
                  className="text-[14px] mt-2 tracking-wider"
                  style={{
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-fira-code)",
                  }}
                  text={"That ground-level knowledge shaped civilizations."}
                />
              </div>

              {/* Contrasts the scale of the problem with the orbital perspective that answers it. */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <Reveal delay={0.1}>
                  <div
                    className="relative p-5 rounded-xl overflow-hidden"
                    style={{
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid rgba(255,107,44,0.08)",
                    }}
                  >
                    {/* Adds a thin accent line that ties the card to its theme color. */}
                    <div
                      className="absolute top-0 left-4 right-4 h-px"
                      style={{ background: "var(--neon-orange)", opacity: 0.2 }}
                    />

                    <div
                      className="text-[11px] font-bold tracking-[0.2em] uppercase mb-3"
                      style={{
                        color: "var(--neon-orange)",
                        fontFamily: "var(--font-orbitron)",
                      }}
                    >
                      THE CHALLENGE
                    </div>
                    <HaloWrapText
                      className="text-[15px] leading-[1.9]"
                      style={{ color: "var(--text-secondary)" }}
                      text={
                        "The challenges we face today — climate change, water scarcity, deforestation, unchecked urbanization — are too vast for human eyes alone. They unfold across continents and decades. A glacier retreating by centimeters each year. An aquifer depleting beneath millions of people who cannot feel it draining away. A forest fragmenting so slowly that no single generation notices the loss."
                      }
                    />
                  </div>
                </Reveal>

                <Reveal delay={0.2}>
                  <div
                    className="relative p-5 rounded-xl overflow-hidden"
                    style={{
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid rgba(0,229,255,0.08)",
                    }}
                  >
                    {/* Adds a thin accent line that ties the card to its theme color. */}
                    <div
                      className="absolute top-0 left-4 right-4 h-px"
                      style={{ background: "var(--neon-cyan)", opacity: 0.2 }}
                    />

                    <div
                      className="text-[11px] font-bold tracking-[0.2em] uppercase mb-3"
                      style={{
                        color: "var(--neon-cyan)",
                        fontFamily: "var(--font-orbitron)",
                      }}
                    >
                      THE ANSWER
                    </div>
                    <HaloWrapText
                      className="text-[15px] leading-[1.9]"
                      style={{ color: "var(--text-secondary)" }}
                      text={
                        "To see these changes, we needed a new vantage point. We needed to step back far enough to see the whole picture — to watch the planet as a living system, not a collection of disconnected places. That is exactly what satellites give us: a persistent, impartial eye that sees what we cannot, measures what we only guess, and remembers what we might otherwise forget."
                      }
                    />
                  </div>
                </Reveal>
              </div>

              {/* Closes the section with a concise statement about the public value of orbital observation. */}
              <Reveal delay={0.3}>
                <div className="text-center">
                  <p
                    className="text-[14px] tracking-[0.06em] leading-relaxed inline-block px-6"
                    style={{ color: "var(--text-dim)" }}
                  >
                    A view from above that belongs to everyone &mdash; that is
                    the promise of satellite observation.
                  </p>
                </div>
              </Reveal>
            </div>
          </Reveal>
        </section>

        {/* Summarizes the platform's scope with four headline impact metrics. */}
        <section>
          <Reveal>
            <div
              className="grid grid-cols-4 gap-0 rounded-xl overflow-hidden"
              style={{ border: "1px solid rgba(0,229,255,0.08)" }}
            >
              {IMPACT_STATS.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="text-center py-5 relative"
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    borderRight:
                      i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  {/* Draws a centered accent strip above each metric card. */}
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full"
                    style={{
                      width: "40%",
                      background: stat.color,
                      opacity: 0.4,
                    }}
                  />
                  <div
                    className="text-3xl font-bold mb-1"
                    style={{ color: stat.color }}
                  >
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </div>
                  <div
                    className="text-[12px] tracking-[0.12em] uppercase"
                    style={{
                      color: "var(--text-dim)",
                      fontFamily: "var(--font-orbitron)",
                    }}
                  >
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Maps the platform's satellite work to the SDGs it directly supports. */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <Reveal className="min-w-0 flex-1">
              <div>
                <h2
                  className="text-[12px] font-bold tracking-[0.25em] uppercase mb-1"
                  style={{
                    color: "var(--neon-orange)",
                    fontFamily: "var(--font-orbitron)",
                  }}
                >
                  THE MISSION
                </h2>
                <HaloWrapText
                  className="text-[15px]"
                  style={{ color: "var(--text-dim)" }}
                  text={"Connecting what satellites see to what humanity needs"}
                />
              </div>
            </Reveal>
            <Reveal direction="right">
              <div
                className="text-[11px] tracking-[0.15em] uppercase px-3 py-1 rounded-full"
                style={{
                  color: "var(--neon-orange)",
                  border: "1px solid rgba(255,107,44,0.2)",
                  background: "rgba(255,107,44,0.05)",
                  fontFamily: "var(--font-orbitron)",
                }}
              >
                6 SDGs TRACKED
              </div>
            </Reveal>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {SDG_CONTRIBUTIONS.map((sdg, i) => (
              <Reveal key={sdg.sdg} delay={i * 0.06}>
                <motion.div
                  className="p-4 rounded-xl relative overflow-hidden group"
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    border: `1px solid ${sdg.color}15`,
                  }}
                  whileHover={{
                    borderColor: `${sdg.color}40`,
                    transition: { duration: 0.2 },
                  }}
                >
                  {/* Places a low-opacity SDG number in the background as a visual anchor. */}
                  <div
                    className="absolute -top-2 -right-1 text-5xl font-black pointer-events-none select-none"
                    style={{
                      color: sdg.color,
                      opacity: 0.06,
                      fontFamily: "var(--font-orbitron)",
                      lineHeight: 1,
                    }}
                  >
                    {sdg.sdg}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-1.5 h-6 rounded-full flex-shrink-0"
                      style={{ background: sdg.color, opacity: 0.6 }}
                    />
                    <div>
                      <span
                        className="text-[13px] font-bold tracking-wider block"
                        style={{
                          color: sdg.color,
                          fontFamily: "var(--font-orbitron)",
                        }}
                      >
                        SDG {sdg.sdg}
                      </span>
                      <span
                        className="text-[14px] font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {sdg.title}
                      </span>
                    </div>
                  </div>
                  <HaloWrapText
                    className="text-[13px] leading-relaxed mb-2.5"
                    style={{ color: "var(--text-secondary)" }}
                    text={sdg.description}
                  />
                  <div
                    className="text-[11px] px-2 py-0.5 rounded inline-block"
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      color: "var(--text-dim)",
                      border: "1px solid var(--border-subtle)",
                      fontFamily: "var(--font-fira-code)",
                    }}
                  >
                    {sdg.satellite}
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Maps satellites directly to the SDGs they support through observation and measurement coverage. */}
        <section>
          <Reveal>
            <div className="flex items-center gap-4 mb-6">
              <h2
                className="text-[12px] font-bold tracking-[0.25em] uppercase"
                style={{
                  color: "var(--holo-purple)",
                  fontFamily: "var(--font-orbitron)",
                }}
              >
                ORBITAL LINKS TO SUSTAINABILITY
              </h2>
              <div
                className="flex-1 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(180,74,255,0.2), transparent)",
                }}
              />
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div
              className="rounded-xl overflow-hidden p-4"
              style={{
                background: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(180,74,255,0.08)",
              }}
            >
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                width="100%"
                style={{ display: "block" }}
              >
                <defs>
                  <style>{`
                    @keyframes dash-flow {
                      to { stroke-dashoffset: -20; }
                    }
                    .link-line {
                      stroke-dasharray: 6 4;
                      stroke-dashoffset: 0;
                      animation: dash-flow 1.5s linear infinite;
                    }
                  `}</style>
                </defs>

                {/* Draws linking paths between satellite missions and the SDGs they support. */}
                {CONNECTION_DATA.map((conn, ci) => {
                  const y1 = satY(ci);
                  return conn.sdgs.map((sdg) => {
                    const si = CONNECTED_SDGS.indexOf(sdg);
                    if (si === -1) return null;
                    const y2 = sdgY(si);
                    const sdgColor = SDG_COLORS[sdg - 1];
                    return (
                      <path
                        key={`${conn.satellite}-${sdg}`}
                        d={`M${satX + 10},${y1} C${svgW / 2},${y1} ${svgW / 2},${y2} ${sdgX - 18},${y2}`}
                        fill="none"
                        stroke={sdgColor}
                        strokeWidth="1.2"
                        opacity="0.35"
                        className="link-line"
                      />
                    );
                  });
                })}

                {/* Lists the satellite missions that feed the connection map. */}
                {CONNECTION_DATA.map((conn, i) => {
                  const y = satY(i);
                  return (
                    <g key={conn.satellite}>
                      <circle
                        cx={satX}
                        cy={y}
                        r="5"
                        fill="var(--neon-cyan)"
                        opacity="0.8"
                      />
                      <text
                        x={satX - 14}
                        y={y + 4}
                        textAnchor="end"
                        fill="var(--neon-cyan)"
                        fontSize="12"
                        fontFamily="var(--font-orbitron)"
                        fontWeight="700"
                      >
                        {conn.satellite}
                      </text>
                    </g>
                  );
                })}

                {/* Renders the connected SDGs as color-coded targets on the right side of the diagram. */}
                {CONNECTED_SDGS.map((sdg, i) => {
                  const y = sdgY(i);
                  const color = SDG_COLORS[sdg - 1];
                  return (
                    <g key={sdg}>
                      <circle
                        cx={sdgX}
                        cy={y}
                        r="16"
                        fill={color}
                        opacity="0.85"
                      />
                      <text
                        x={sdgX}
                        y={y + 5}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize="12"
                        fontFamily="var(--font-orbitron)"
                        fontWeight="800"
                      >
                        {sdg}
                      </text>
                      <text
                        x={sdgX + 26}
                        y={y + 4}
                        textAnchor="start"
                        fill="var(--text-dim)"
                        fontSize="11"
                        fontFamily="var(--font-exo2)"
                      >
                        {SDG_NAMES[sdg - 1]}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </Reveal>
        </section>

        {/* Shows how raw Earth-observation signals become understandable public insight. */}
        <section>
          <Reveal>
            <h2
              className="text-[12px] font-bold tracking-[0.25em] uppercase mb-1"
              style={{
                color: "var(--holo-purple)",
                fontFamily: "var(--font-orbitron)",
              }}
            >
              THE DATA JOURNEY
            </h2>
            <HaloWrapText
              className="text-[15px] mb-6"
              style={{ color: "var(--text-dim)" }}
              text={
                "From a photon bouncing off Earth's surface to an insight on your screen"
              }
            />
          </Reveal>

          <div className="relative">
            {/* Draws the horizontal spine that links the pipeline steps together. */}
            <div
              className="absolute top-5 left-0 right-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, var(--neon-cyan), var(--neon-orange), var(--holo-purple), var(--neon-green), var(--neon-cyan))",
                opacity: 0.12,
              }}
            />

            <div className="grid grid-cols-5 gap-3">
              {PIPELINE_STEPS.map((step, i) => (
                <Reveal key={step.label} delay={i * 0.1}>
                  <div className="text-center">
                    {/* Renders the numbered node that identifies each stage in the processing chain. */}
                    <motion.div
                      className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center relative z-10"
                      style={{
                        background: `color-mix(in srgb, ${step.color} 8%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${step.color} 20%, transparent)`,
                        boxShadow: `0 0 20px color-mix(in srgb, ${step.color} 8%, transparent)`,
                      }}
                      whileInView={{ scale: [0.6, 1.1, 1] }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 + 0.3 }}
                    >
                      <div
                        className="text-[15px] font-black"
                        style={{
                          color: step.color,
                          fontFamily: "var(--font-orbitron)",
                        }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </div>
                    </motion.div>
                    <div
                      className="text-[12px] font-bold tracking-[0.12em] mb-1"
                      style={{
                        color: step.color,
                        fontFamily: "var(--font-orbitron)",
                      }}
                    >
                      {step.label}
                    </div>
                    <HaloWrapText
                      className="text-[13px] leading-relaxed"
                      style={{ color: "var(--text-dim)" }}
                      text={step.description}
                    />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Profiles the satellite missions and sensing roles that feed the platform. */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <Reveal className="min-w-0 flex-1">
              <div className="min-w-0">
                <h2
                  className="text-[12px] font-bold tracking-[0.25em] uppercase mb-1"
                  style={{
                    color: "var(--neon-cyan)",
                    fontFamily: "var(--font-orbitron)",
                  }}
                >
                  OUR EYES IN SPACE
                </h2>
                <HaloWrapText
                  className="text-[15px]"
                  style={{ color: "var(--text-dim)" }}
                  text={"Each satellite has a unique way of seeing the world"}
                />
              </div>
            </Reveal>
            <Reveal direction="right">
              <div
                className="text-[11px] tracking-[0.15em] uppercase px-3 py-1 rounded-full"
                style={{
                  color: "var(--neon-cyan)",
                  border: "1px solid rgba(0,229,255,0.2)",
                  background: "rgba(0,229,255,0.05)",
                  fontFamily: "var(--font-orbitron)",
                }}
              >
                8 INSTRUMENTS
              </div>
            </Reveal>
          </div>

          <div className="grid grid-cols-4 items-stretch gap-3">
            {SATELLITE_SOURCES.map((sat, i) => (
              <Reveal key={sat.name} delay={i * 0.05} className="h-full">
                <motion.div
                  layout
                  className="h-full p-3.5 rounded-xl relative overflow-hidden flex flex-col"
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    border: `1px solid ${sat.color}12`,
                  }}
                  whileHover={{
                    borderColor: `${sat.color}40`,
                    y: -2,
                    transition: { duration: 0.2 },
                  }}
                >
                  {/* Adds a mission-colored top edge so each source card reads quickly. */}
                  <div
                    className="absolute top-0 left-3 right-3 h-px"
                    style={{ background: sat.color, opacity: 0.25 }}
                  />

                  <div className="flex items-center gap-1.5 mb-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: sat.color }}
                    />
                    <span
                      className="text-[13px] font-bold tracking-wider truncate"
                      style={{
                        color: sat.color,
                        fontFamily: "var(--font-orbitron)",
                      }}
                    >
                      {sat.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[11px] tracking-wider uppercase"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {sat.agency}
                    </span>
                    <span
                      className="text-[10px] font-bold tracking-wider px-1.5 py-px rounded"
                      style={{
                        background: `${sat.color}0a`,
                        color: sat.color,
                        border: `1px solid ${sat.color}18`,
                      }}
                    >
                      {sat.role}
                    </span>
                  </div>
                  <HaloWrapText
                    className="text-[13px] leading-[1.65]"
                    style={{ color: "var(--text-secondary)" }}
                    text={sat.purpose}
                  />
                </motion.div>
              </Reveal>
            ))}
          </div>
        </section>

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
                {/* Delivers the closing argument about shared responsibility and open observation. */}
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
                    THE VIEW FROM ABOVE BELONGS TO ALL OF US
                  </h3>

                  <HaloWrapText
                    className="text-[15px] leading-[1.85] mb-3"
                    style={{ color: "var(--text-secondary)" }}
                    text={
                      "Every data point in this system represents something real — a forest shrinking, a sea rising, a city growing. The satellites don't choose what to see. They show us everything. What we do with that knowledge is up to us."
                    }
                  />

                  <HaloWrapText
                    className="text-[14px] leading-relaxed"
                    style={{ color: "var(--text-dim)" }}
                    text={
                      "Track the satellites. Explore the data. Cast your vote on the issues that matter. The view from orbit is clearer than ever — the question is whether we're willing to look."
                    }
                  />
                </div>

                {/* Adds a pulsing globe motif that supports the closing message without new data density. */}
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

        {/* Finishes the page with a short source and methodology note. */}
        <Reveal>
          <div
            className="text-center py-3 px-4 rounded-lg"
            style={{
              background: "rgba(0,0,0,0.12)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <HaloWrapText
              className="text-[12px] leading-relaxed tracking-wide"
              style={{ color: "var(--text-dim)" }}
              text={
                "SMS leverages open satellite data from ESA, NASA, NOAA, and partner agencies. All SDG assessments follow UN indicator frameworks with satellite-derived proxies."
              }
            />
          </div>
        </Reveal>
        </div>
      </StaticPageHaloStage>
    </div>
  );
}

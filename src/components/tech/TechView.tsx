"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Reveal, CornerBrackets } from "@/components/ui/ScrollReveal";

/* Collects the static datasets that drive the technology overview visualizations and reference panels. */

/* Positions the technologies shown in the hero constellation and assigns each one a category accent color. */
const CONSTELLATION_NODES: {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
}[] = [
  { id: "nextjs", label: "Next.js", x: 360, y: 50, color: "var(--neon-cyan)" },
  { id: "react", label: "React", x: 200, y: 100, color: "var(--neon-cyan)" },
  {
    id: "threejs",
    label: "Three.js",
    x: 520,
    y: 110,
    color: "var(--neon-orange)",
  },
  { id: "r3f", label: "R3F", x: 620, y: 180, color: "var(--neon-orange)" },
  {
    id: "prisma",
    label: "Prisma",
    x: 100,
    y: 200,
    color: "var(--holo-purple)",
  },
  { id: "sqlite", label: "SQLite", x: 50, y: 310, color: "var(--holo-purple)" },
  {
    id: "tailwind",
    label: "Tailwind",
    x: 280,
    y: 220,
    color: "var(--neon-cyan)",
  },
  {
    id: "zustand",
    label: "Zustand",
    x: 440,
    y: 230,
    color: "var(--holo-purple)",
  },
  { id: "d3", label: "D3.js", x: 580, y: 300, color: "var(--neon-green)" },
  {
    id: "framer",
    label: "Framer",
    x: 160,
    y: 330,
    color: "var(--holo-purple)",
  },
  {
    id: "satjs",
    label: "satellite.js",
    x: 680,
    y: 60,
    color: "var(--neon-green)",
  },
  { id: "ts", label: "TypeScript", x: 360, y: 340, color: "var(--neon-cyan)" },
  {
    id: "compromise",
    label: "compromise",
    x: 500,
    y: 360,
    color: "var(--neon-orange)",
  },
];

const CONSTELLATION_EDGES: [string, string][] = [
  ["nextjs", "react"],
  ["nextjs", "tailwind"],
  ["nextjs", "prisma"],
  ["nextjs", "threejs"],
  ["react", "r3f"],
  ["react", "zustand"],
  ["react", "framer"],
  ["threejs", "r3f"],
  ["threejs", "d3"],
  ["prisma", "sqlite"],
  ["tailwind", "ts"],
  ["zustand", "ts"],
  ["d3", "compromise"],
  ["framer", "ts"],
  ["nextjs", "satjs"],
  ["r3f", "satjs"],
  ["react", "tailwind"],
];

/* Describes the application stack from browser rendering down to the persisted database layer. */
const ARCH_LAYERS: {
  label: string;
  description: string;
  color: string;
}[] = [
  {
    label: "Browser (Client)",
    description: "User interface rendered in the browser with React hydration",
    color: "var(--neon-cyan)",
  },
  {
    label: "Next.js App Router",
    description: "Server-side rendering, routing, and API layer with Turbopack",
    color: "var(--neon-orange)",
  },
  {
    label: "React Components",
    description: "3D scenes, SVG charts, UI panels, and interactive widgets",
    color: "var(--holo-purple)",
  },
  {
    label: "API Routes",
    description:
      "Server endpoints for data fetching, mutations, and external APIs",
    color: "var(--neon-green)",
  },
  {
    label: "Prisma ORM",
    description: "Type-safe database queries with schema-driven migrations",
    color: "var(--neon-orange)",
  },
  {
    label: "SQLite Database",
    description: "Zero-config embedded database storing all application state",
    color: "var(--neon-cyan)",
  },
];

/* Labels the major subsystems involved in the 3D globe and rendering pipeline. */
const ENGINE_ANNOTATIONS: {
  label: string;
  description: string;
  color: string;
}[] = [
  {
    label: "React Three Fiber",
    description: "Declarative Three.js via React component tree",
    color: "var(--neon-cyan)",
  },
  {
    label: "Drei helpers",
    description: "Pre-built camera controls, loaders, and abstractions",
    color: "var(--neon-orange)",
  },
  {
    label: "Postprocessing",
    description: "Bloom, vignette, and depth-of-field effects",
    color: "var(--holo-purple)",
  },
  {
    label: "Custom shaders",
    description: "GLSL atmosphere glow and satellite trail effects",
    color: "var(--neon-green)",
  },
];

/* Lists the core tables surfaced in the data-layer visualization. */
const DB_TABLES: { name: string; color: string }[] = [
  { name: "User", color: "var(--neon-cyan)" },
  { name: "Post", color: "var(--neon-orange)" },
  { name: "Comment", color: "var(--holo-purple)" },
  { name: "ContentVote", color: "var(--neon-green)" },
  { name: "Purchase", color: "var(--neon-orange)" },
  { name: "Notification", color: "var(--neon-cyan)" },
  { name: "SatelliteTLE", color: "var(--holo-purple)" },
  { name: "WorldBankCache", color: "var(--neon-green)" },
];

/* Summarizes the frontend libraries and infrastructure showcased in the stack section. */
const FRONTEND_STACK: {
  name: string;
  category: string;
  description: string;
  color: string;
}[] = [
  {
    name: "Next.js 16",
    category: "Framework",
    description:
      "App Router with Turbopack for instant HMR and server components",
    color: "var(--neon-cyan)",
  },
  {
    name: "React 19",
    category: "UI Library",
    description:
      "Concurrent rendering with server and client component patterns",
    color: "var(--neon-cyan)",
  },
  {
    name: "Three.js",
    category: "3D Engine",
    description: "WebGL-powered 3D Earth globe with real-time satellite orbits",
    color: "var(--neon-orange)",
  },
  {
    name: "React Three Fiber",
    category: "3D React",
    description: "Declarative Three.js bindings for the React component model",
    color: "var(--neon-orange)",
  },
  {
    name: "Zustand",
    category: "State Management",
    description: "Lightweight global store with zero boilerplate subscriptions",
    color: "var(--holo-purple)",
  },
  {
    name: "Framer Motion",
    category: "Animation",
    description:
      "Physics-based transitions, scroll reveals, and layout animations",
    color: "var(--holo-purple)",
  },
  {
    name: "D3.js",
    category: "Charts",
    description: "Custom SVG radar charts, trend lines, and sentiment graphs",
    color: "var(--neon-green)",
  },
  {
    name: "satellite.js",
    category: "Orbital Math",
    description:
      "SGP4 propagation model converting TLE data to precise positions",
    color: "var(--neon-green)",
  },
  {
    name: "Tailwind CSS 4",
    category: "Styling",
    description:
      "Utility-first CSS with custom sci-fi design tokens and variables",
    color: "var(--neon-cyan)",
  },
  {
    name: "compromise.js",
    category: "NLP",
    description:
      "Natural language processing for voice search query understanding",
    color: "var(--neon-orange)",
  },
  {
    name: "TypeScript",
    category: "Language",
    description: "End-to-end type safety from database schema to UI components",
    color: "var(--neon-cyan)",
  },
];

/* Exposes the main design tokens that are visualized in the design-system section. */
const COLOR_SWATCHES: { name: string; hex: string; cssVar: string }[] = [
  { name: "Neon Cyan", hex: "#00e5ff", cssVar: "var(--neon-cyan)" },
  { name: "Neon Orange", hex: "#ff6b2c", cssVar: "var(--neon-orange)" },
  { name: "Holo Purple", hex: "#b44aff", cssVar: "var(--holo-purple)" },
  { name: "Neon Green", hex: "#39ff7f", cssVar: "var(--neon-green)" },
  { name: "Neon Rose", hex: "#ff3a8c", cssVar: "var(--neon-rose, #ff3a8c)" },
];

/* Builds SVG path segments for the rotating wireframe sphere used in the 3D engine illustration. */

function generateWireframeSphere(
  cx: number,
  cy: number,
  r: number,
  latLines: number,
  lonLines: number
): string[] {
  const paths: string[] = [];

  // Creates horizontal bands so the sphere reads as a globe instead of a flat circle.
  for (let i = 1; i < latLines; i++) {
    const frac = i / latLines;
    const angle = (frac - 0.5) * Math.PI;
    const ry = r * Math.cos(angle);
    const yOff = r * Math.sin(angle) * 0.3;
    paths.push(
      `M${cx - ry},${cy + yOff} A${ry},${ry * 0.35} 0 0,1 ${cx + ry},${cy + yOff} A${ry},${ry * 0.35} 0 0,1 ${cx - ry},${cy + yOff}`
    );
  }

  // Creates vertical meridian arcs that complete the wireframe globe effect.
  for (let i = 0; i < lonLines; i++) {
    const frac = i / lonLines;
    const angle = frac * Math.PI;
    const rx = r * Math.sin(angle);
    paths.push(
      `M${cx},${cy - r} A${rx},${r} 0 0,${frac < 0.5 ? 1 : 0} ${cx},${cy + r} A${rx},${r} 0 0,${frac < 0.5 ? 1 : 0} ${cx},${cy - r}`
    );
  }

  return paths;
}

/* Precomputes orbit sample strings so the SVG marker can follow the projected ellipse smoothly. */
const ORBIT_SAMPLE_COUNT = 72;
const ORBIT_CX_VALUES = Array.from({ length: ORBIT_SAMPLE_COUNT + 1 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / ORBIT_SAMPLE_COUNT;
  return (150 + Math.cos(angle) * 140).toFixed(3);
}).join(";");

const ORBIT_CY_VALUES = Array.from({ length: ORBIT_SAMPLE_COUNT + 1 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / ORBIT_SAMPLE_COUNT;
  return (150 + Math.sin(angle) * 50).toFixed(3);
}).join(";");

/* Renders the long-form technical overview page that explains the system architecture and design choices. */

export default function TechView() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef, { once: true, margin: "-60px" });

  /* Defines the hero SVG viewport used by the technology constellation diagram. */
  const constellationW = 750;
  const constellationH = 400;

  /* Precomputes the globe wireframe paths so the SVG renderer can map them directly. */
  const sphereLines = generateWireframeSphere(150, 150, 110, 8, 8);

  /* Indexes hero nodes by id so edge rendering can resolve connection endpoints efficiently. */
  const nodeMap = new Map(CONSTELLATION_NODES.map((n) => [n.id, n]));

  return (
    <div className="min-h-full p-6 pb-8">
      <div className="max-w-6xl mx-auto space-y-20">
        {/* Opens the page with a constellation graphic that shows how the core technologies connect. */}
        <section className="relative pt-8 pb-4" ref={heroRef}>
          {/* Adds a faint radial glow behind the hero so the constellation stands off the page background. */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(0,229,255,0.04) 0%, transparent 70%)",
            }}
          />

          <div className="flex items-center gap-10 mb-8">
            {/* Displays the hero emblem for the technology overview. */}
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
                  border: "1px solid rgba(0,229,255,0.14)",
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
                    opacity="0.22"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="12"
                    stroke="var(--neon-orange)"
                    strokeWidth="1"
                    opacity="0.5"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="3.5"
                    fill="var(--neon-cyan)"
                    opacity="0.8"
                  />
                  <path
                    d="M10 32H54"
                    stroke="var(--neon-cyan)"
                    strokeWidth="0.5"
                    opacity="0.2"
                  />
                  <path
                    d="M32 10V54"
                    stroke="var(--neon-orange)"
                    strokeWidth="0.5"
                    opacity="0.2"
                  />
                  <ellipse
                    cx="32"
                    cy="32"
                    rx="28"
                    ry="9"
                    stroke="var(--holo-purple)"
                    strokeWidth="0.5"
                    opacity="0.2"
                    transform="rotate(-25 32 32)"
                  />
                  <ellipse
                    cx="32"
                    cy="32"
                    rx="28"
                    ry="9"
                    stroke="var(--neon-orange)"
                    strokeWidth="0.45"
                    opacity="0.18"
                    transform="rotate(28 32 32)"
                  />
                </motion.svg>
                <div className="absolute inset-2 rounded-full border border-white/5" />
              </div>
            </motion.div>

            {/* Displays the title stack and introductory copy for the technology overview. */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="flex-1"
            >
              <div
                className="text-[12px] font-bold tracking-[0.38em] uppercase mb-2"
                style={{
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-orbitron)",
                }}
              >
                SATELLITE MONITORING SYSTEM
              </div>
              <h1
                className="text-[32px] md:text-[38px] font-bold tracking-[0.15em] leading-none text-glow-cyan mb-3"
                style={{ fontFamily: "var(--font-orbitron)" }}
              >
                TECH STACK
              </h1>
              <h2
                className="text-[13px] tracking-[0.22em] uppercase mb-4"
                style={{
                  color: "var(--neon-orange)",
                  fontFamily: "var(--font-orbitron)",
                  fontWeight: 600,
                }}
              >
                Architecture &amp; Engineering
              </h2>
              <p
                className="max-w-2xl text-[14px] leading-relaxed"
                style={{
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-exo2)",
                }}
              >
                A technical atlas of the platform architecture, rendering
                engine, state flow, and data systems that connect orbital
                tracking, analytics, and interactive storytelling.
              </p>
            </motion.div>
          </div>

          {/* Draws the animated technology network used as the hero centerpiece. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={heroInView ? { opacity: 1 } : {}}
            transition={{ duration: 1.2, delay: 0.4 }}
            className="relative rounded-xl overflow-hidden p-4"
            style={{
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(0,229,255,0.08)",
            }}
          >
            <svg
              viewBox={`0 0 ${constellationW} ${constellationH}`}
              width="100%"
              style={{ display: "block" }}
            >
              <defs>
                <style>{`
                  @keyframes constellation-pulse {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                  }
                  .constellation-node {
                    animation: constellation-pulse 3s ease-in-out infinite;
                  }
                `}</style>
              </defs>

              {/* Connects related technologies so the dependency graph can be read visually. */}
              {CONSTELLATION_EDGES.map(([fromId, toId], i) => {
                const from = nodeMap.get(fromId);
                const to = nodeMap.get(toId);
                if (!from || !to) return null;
                return (
                  <motion.line
                    key={`edge-${i}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="var(--neon-cyan)"
                    strokeWidth="0.8"
                    opacity="0.15"
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 0.15 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.6 + i * 0.05 }}
                  />
                );
              })}

              {/* Renders each technology node with its label and reveal animation. */}
              {CONSTELLATION_NODES.map((node, i) => (
                <motion.g
                  key={node.id}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.06 }}
                >
                  {/* Adds a larger halo that makes each node easier to distinguish at a glance. */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="18"
                    fill="none"
                    stroke={node.color}
                    strokeWidth="0.5"
                    opacity="0.15"
                  />
                  {/* Marks the exact node position inside the constellation graph. */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="4"
                    fill={node.color}
                    className="constellation-node"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                  {/* Prints the technology name beneath its corresponding node marker. */}
                  <text
                    x={node.x}
                    y={node.y + 28}
                    textAnchor="middle"
                    fill={node.color}
                    fontSize="10"
                    fontFamily="var(--font-orbitron)"
                    fontWeight="700"
                    opacity="0.85"
                  >
                    {node.label}
                  </text>
                </motion.g>
              ))}
            </svg>
          </motion.div>

          {/* Uses a gradient divider to transition from the hero into the explanatory sections below. */}
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

        {/* Explains the application layers in the order requests and data move through the system. */}
        <section>
          <Reveal>
            <div className="flex items-center gap-4 mb-8">
              <h2
                className="text-[12px] font-bold tracking-[0.25em] uppercase"
                style={{
                  color: "var(--neon-cyan)",
                  fontFamily: "var(--font-orbitron)",
                }}
              >
                SYSTEM ARCHITECTURE
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

          <div className="relative max-w-2xl mx-auto">
            {/* Draws a shared spine behind the cards so the stack reads as one ordered pipeline. */}
            <div
              className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
              style={{
                background:
                  "linear-gradient(to bottom, var(--neon-cyan), var(--neon-orange), var(--holo-purple), var(--neon-green), var(--neon-orange), var(--neon-cyan))",
                opacity: 0.15,
              }}
            />

            <div className="space-y-3 relative">
              {ARCH_LAYERS.map((layer, i) => (
                <Reveal key={layer.label} delay={i * 0.1}>
                  <motion.div
                    className="relative rounded-xl overflow-hidden p-4"
                    style={{
                      background: "rgba(0,0,0,0.2)",
                      border: `1px solid rgba(0,229,255,0.08)`,
                    }}
                    whileHover={{
                      borderColor: "rgba(0,229,255,0.25)",
                      transition: { duration: 0.2 },
                    }}
                  >
                    {/* Uses the layer color as a side accent to reinforce the category of each card. */}
                    <div
                      className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
                      style={{ background: layer.color, opacity: 0.5 }}
                    />

                    <div className="pl-4 flex items-center justify-between gap-4">
                      <div>
                        <div
                          className="text-[13px] font-bold tracking-[0.12em]"
                          style={{
                            color: layer.color,
                            fontFamily: "var(--font-orbitron)",
                          }}
                        >
                          {layer.label}
                        </div>
                        <p
                          className="text-[13px] leading-relaxed mt-0.5"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {layer.description}
                        </p>
                      </div>
                      <div
                        className="text-[11px] font-bold tracking-[0.15em] px-2 py-0.5 rounded flex-shrink-0"
                        style={{
                          color: "var(--text-dim)",
                          fontFamily: "var(--font-fira-code)",
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        L{i}
                      </div>
                    </div>
                  </motion.div>

                  {/* Shows the directional flow from one architectural layer to the next. */}
                  {i < ARCH_LAYERS.length - 1 && (
                    <div className="flex justify-center py-1">
                      <svg width="20" height="16" viewBox="0 0 20 16">
                        <path
                          d="M10 0 L10 10 M5 7 L10 13 L15 7"
                          stroke={layer.color}
                          strokeWidth="1.5"
                          fill="none"
                          opacity="0.35"
                        />
                      </svg>
                    </div>
                  )}
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Breaks down the moving pieces behind the globe and orbital scene rendering. */}
        <section>
          <Reveal>
            <div className="flex items-center gap-4 mb-8">
              <h2
                className="text-[12px] font-bold tracking-[0.25em] uppercase"
                style={{
                  color: "var(--neon-orange)",
                  fontFamily: "var(--font-orbitron)",
                }}
              >
                3D VISUALIZATION ENGINE
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
              className="grid gap-6"
              style={{ gridTemplateColumns: "1fr 1fr" }}
            >
              {/* Presents a simplified animated globe model that stands in for the full 3D renderer. */}
              <div
                className="rounded-xl overflow-hidden p-4 flex items-center justify-center"
                style={{
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,107,44,0.08)",
                }}
              >
                <svg
                  viewBox="0 0 300 300"
                  width="100%"
                  style={{ display: "block", maxWidth: 320 }}
                >
                  <defs>
                    <style>{`
                      @keyframes sphere-rotate {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                      }
                      .sphere-group {
                        transform-origin: 150px 150px;
                        animation: sphere-rotate 40s linear infinite;
                      }
                    `}</style>
                  </defs>

                  {/* Renders the latitude and longitude paths that define the wireframe globe. */}
                  <g className="sphere-group">
                    {sphereLines.map((d, i) => (
                      <path
                        key={i}
                        d={d}
                        fill="none"
                        stroke="var(--neon-cyan)"
                        strokeWidth="0.6"
                        opacity="0.25"
                      />
                    ))}
                    {/* Highlights the equator so the viewer can orient the rotating sphere quickly. */}
                    <ellipse
                      cx="150"
                      cy="150"
                      rx="110"
                      ry="38"
                      fill="none"
                      stroke="var(--neon-cyan)"
                      strokeWidth="1"
                      opacity="0.4"
                    />
                  </g>

                  {/* Adds an orbital path around the globe to suggest a tracked spacecraft trajectory. */}
                  <ellipse
                    cx="150"
                    cy="150"
                    rx="140"
                    ry="50"
                    fill="none"
                    stroke="var(--neon-orange)"
                    strokeWidth="1"
                    opacity="0.3"
                    strokeDasharray="4 3"
                    transform="rotate(-20 150 150)"
                  />

                  {/* Moves a small satellite marker with uniform angular motion around the projected orbit. */}
                  <g transform="rotate(-20 150 150)">
                    <circle cx="290" cy="150" r="4" fill="var(--neon-orange)">
                      <animate
                        attributeName="cx"
                        values={ORBIT_CX_VALUES}
                        dur="6s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="cy"
                        values={ORBIT_CY_VALUES}
                        dur="6s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="1;0.4;1"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    {/* Leaves a soft halo behind the moving satellite marker to increase motion readability. */}
                    <circle cx="290" cy="150" r="8" fill="var(--neon-orange)" opacity="0.15">
                      <animate
                        attributeName="cx"
                        values={ORBIT_CX_VALUES}
                        dur="6s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="cy"
                        values={ORBIT_CY_VALUES}
                        dur="6s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="r"
                        values="8;12;8"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>

                  {/* Anchors the globe illustration with a bright center point. */}
                  <circle
                    cx="150"
                    cy="150"
                    r="6"
                    fill="var(--neon-cyan)"
                    opacity="0.6"
                  />
                  <circle
                    cx="150"
                    cy="150"
                    r="2"
                    fill="var(--neon-cyan)"
                    opacity="1"
                  />
                </svg>
              </div>

              {/* Lists the libraries and rendering features responsible for the live 3D experience. */}
              <div className="flex flex-col justify-center space-y-4">
                {ENGINE_ANNOTATIONS.map((ann, i) => (
                  <Reveal
                    key={ann.label}
                    delay={0.15 + i * 0.08}
                    direction="right"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{
                          background: ann.color,
                          boxShadow: `0 0 8px ${ann.color}`,
                        }}
                      />
                      <div>
                        <div
                          className="text-[13px] font-bold tracking-[0.1em]"
                          style={{
                            color: ann.color,
                            fontFamily: "var(--font-orbitron)",
                          }}
                        >
                          {ann.label}
                        </div>
                        <p
                          className="text-[13px] leading-relaxed mt-0.5"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {ann.description}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* Shows how application models, persistence, and data movement are organized. */}
        <section>
          <Reveal>
            <div className="flex items-center gap-4 mb-8">
              <h2
                className="text-[12px] font-bold tracking-[0.25em] uppercase"
                style={{
                  color: "var(--holo-purple)",
                  fontFamily: "var(--font-orbitron)",
                }}
              >
                DATA LAYER
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
              className="rounded-xl overflow-hidden p-6"
              style={{
                background: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(180,74,255,0.08)",
              }}
            >
              {/* Splits schema structure, transfer flow, and stored tables into one comparative layout. */}
              <div
                className="grid gap-8 items-start"
                style={{ gridTemplateColumns: "1fr auto 1fr" }}
              >
                {/* Displays a schema-style code sample that represents the Prisma model layer. */}
                <div>
                  <div
                    className="text-[12px] font-bold tracking-[0.15em] uppercase mb-3"
                    style={{
                      color: "var(--holo-purple)",
                      fontFamily: "var(--font-orbitron)",
                    }}
                  >
                    Prisma Schema
                  </div>
                  <div
                    className="p-4 rounded-lg"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <pre
                      className="text-[12px] leading-[1.8]"
                      style={{
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-fira-code)",
                      }}
                    >
                      {`datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}`}
                    </pre>
                  </div>
                  <p
                    className="text-[13px] leading-relaxed mt-3"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Type-safe ORM with auto-generated client, zero-config
                    SQLite, and schema-driven migrations.
                  </p>
                </div>

                {/* Uses a vertical flow graphic to connect schema definitions with persisted tables. */}
                <div className="flex flex-col items-center justify-center self-center py-8">
                  <svg width="60" height="120" viewBox="0 0 60 120">
                    <defs>
                      <style>{`
                        @keyframes data-flow-down {
                          0% { transform: translateY(-20px); opacity: 0; }
                          30% { opacity: 1; }
                          70% { opacity: 1; }
                          100% { transform: translateY(120px); opacity: 0; }
                        }
                        .data-dot {
                          animation: data-flow-down 2s linear infinite;
                        }
                        .data-dot-delayed {
                          animation: data-flow-down 2s linear infinite;
                          animation-delay: 0.7s;
                        }
                        .data-dot-delayed2 {
                          animation: data-flow-down 2s linear infinite;
                          animation-delay: 1.4s;
                        }
                      `}</style>
                    </defs>
                    {/* Draws the central transport line used by the animated data-flow indicator. */}
                    <line
                      x1="30"
                      y1="0"
                      x2="30"
                      y2="120"
                      stroke="var(--holo-purple)"
                      strokeWidth="1"
                      opacity="0.2"
                      strokeDasharray="3 3"
                    />
                    {/* Sends moving markers along the line to suggest records flowing through the stack. */}
                    <circle
                      cx="30"
                      cy="10"
                      r="3"
                      fill="var(--holo-purple)"
                      className="data-dot"
                    />
                    <circle
                      cx="30"
                      cy="10"
                      r="3"
                      fill="var(--neon-cyan)"
                      className="data-dot-delayed"
                    />
                    <circle
                      cx="30"
                      cy="10"
                      r="3"
                      fill="var(--neon-orange)"
                      className="data-dot-delayed2"
                    />
                    {/* Marks the final direction of travel from schema to storage. */}
                    <path
                      d="M25 110 L30 118 L35 110"
                      fill="none"
                      stroke="var(--holo-purple)"
                      strokeWidth="1.5"
                      opacity="0.35"
                    />
                  </svg>
                </div>

                {/* Lists the persisted entities that back the main application features. */}
                <div>
                  <div
                    className="text-[12px] font-bold tracking-[0.15em] uppercase mb-3"
                    style={{
                      color: "var(--neon-cyan)",
                      fontFamily: "var(--font-orbitron)",
                    }}
                  >
                    SQLite Database
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {DB_TABLES.map((table, i) => (
                      <motion.div
                        key={table.name}
                        className="px-3 py-2 rounded-lg text-center relative overflow-hidden"
                        style={{
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid var(--border-subtle)",
                        }}
                        whileHover={{
                          borderColor: "rgba(0,229,255,0.3)",
                          transition: { duration: 0.2 },
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: i * 0.06 }}
                      >
                        {/* Uses the table color as a top accent so each entity card is easy to scan. */}
                        <div
                          className="absolute top-0 left-2 right-2 h-px"
                          style={{ background: table.color, opacity: 0.25 }}
                        />
                        <div
                          className="text-[12px] font-bold tracking-wider"
                          style={{
                            color: table.color,
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          {table.name}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <p
                    className="text-[13px] leading-relaxed mt-3"
                    style={{ color: "var(--text-dim)" }}
                  >
                    8 tables storing users, content, votes, satellite TLEs, and
                    cached World Bank indicators.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Profiles the main frontend tools and the role each one plays in the product. */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <Reveal>
              <div>
                <h2
                  className="text-[12px] font-bold tracking-[0.25em] uppercase mb-1"
                  style={{
                    color: "var(--neon-green)",
                    fontFamily: "var(--font-orbitron)",
                  }}
                >
                  FRONTEND STACK
                </h2>
                <p className="text-[15px]" style={{ color: "var(--text-dim)" }}>
                  The libraries powering every interaction
                </p>
              </div>
            </Reveal>
            <Reveal direction="right">
              <div
                className="text-[11px] tracking-[0.15em] uppercase px-3 py-1 rounded-full"
                style={{
                  color: "var(--neon-green)",
                  border: "1px solid rgba(57,255,127,0.2)",
                  background: "rgba(57,255,127,0.05)",
                  fontFamily: "var(--font-orbitron)",
                }}
              >
                {FRONTEND_STACK.length} LIBRARIES
              </div>
            </Reveal>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {FRONTEND_STACK.map((lib, i) => (
              <Reveal key={lib.name} delay={i * 0.05}>
                <motion.div
                  className="p-4 rounded-xl relative overflow-hidden"
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(0,229,255,0.08)",
                  }}
                  whileHover={{
                    borderColor: "rgba(0,229,255,0.3)",
                    y: -2,
                    transition: { duration: 0.2 },
                  }}
                >
                  {/* Repeats the stack-item accent color as a header strip for quick category recognition. */}
                  <div
                    className="absolute top-0 left-3 right-3 h-px"
                    style={{ background: lib.color, opacity: 0.25 }}
                  />

                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-[13px] font-bold tracking-wider"
                      style={{
                        color: lib.color,
                        fontFamily: "var(--font-orbitron)",
                      }}
                    >
                      {lib.name}
                    </span>
                    <span
                      className="text-[10px] font-bold tracking-wider px-1.5 py-px rounded flex-shrink-0"
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        color: "var(--text-dim)",
                        border: "1px solid var(--border-subtle)",
                        fontFamily: "var(--font-fira-code)",
                      }}
                    >
                      {lib.category}
                    </span>
                  </div>
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {lib.description}
                  </p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Explains the orbital concepts the application turns into interactive tracking views. */}
        <section>
          <Reveal>
            <div className="flex items-center gap-4 mb-8">
              <h2
                className="text-[12px] font-bold tracking-[0.25em] uppercase"
                style={{
                  color: "var(--neon-orange)",
                  fontFamily: "var(--font-orbitron)",
                }}
              >
                ORBITAL MECHANICS
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
              className="rounded-xl overflow-hidden p-6"
              style={{
                background: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,107,44,0.08)",
              }}
            >
              <div
                className="grid gap-8 items-center"
                style={{ gridTemplateColumns: "1fr 1fr" }}
              >
                {/* Left: orbit diagram SVG */}
                <svg
                  viewBox="0 0 400 360"
                  width="100%"
                  style={{ display: "block" }}
                >
                  <defs>
                    {/* Elliptical orbit as a reusable path for animateMotion
                         Center (200,180), rx=175, ry=120 */}
                    <path
                      id="orbitPath"
                      d="M375,180 A175,120 0 1,1 25,180 A175,120 0 1,1 375,180"
                      fill="none"
                    />
                  </defs>

                  {/* Elliptical orbit path (visible) */}
                  <ellipse
                    cx="200"
                    cy="180"
                    rx="175"
                    ry="120"
                    fill="none"
                    stroke="var(--neon-orange)"
                    strokeWidth="1.2"
                    opacity="0.35"
                    strokeDasharray="6 4"
                  />

                  {/* Semi-major axis: full horizontal span through ellipse center */}
                  <line
                    x1="25"
                    y1="180"
                    x2="375"
                    y2="180"
                    stroke="var(--neon-cyan)"
                    strokeWidth="0.8"
                    opacity="0.2"
                    strokeDasharray="3 3"
                  />
                  {/* Semi-major axis label — placed below the orbit to avoid overlap with Earth */}
                  <text
                    x="290"
                    y="172"
                    textAnchor="middle"
                    fill="var(--neon-cyan)"
                    fontSize="8"
                    fontFamily="var(--font-fira-code)"
                    opacity="0.45"
                  >
                    semi-major axis (a)
                  </text>
                  {/* Bracket ticks at endpoints */}
                  <line
                    x1="25"
                    y1="176"
                    x2="25"
                    y2="184"
                    stroke="var(--neon-cyan)"
                    strokeWidth="0.8"
                    opacity="0.25"
                  />
                  <line
                    x1="375"
                    y1="176"
                    x2="375"
                    y2="184"
                    stroke="var(--neon-cyan)"
                    strokeWidth="0.8"
                    opacity="0.25"
                  />

                  {/* Earth at one focus (offset left from geometric center) */}
                  <circle
                    cx="150"
                    cy="180"
                    r="22"
                    fill="none"
                    stroke="var(--neon-cyan)"
                    strokeWidth="1"
                    opacity="0.4"
                  />
                  <circle
                    cx="150"
                    cy="180"
                    r="18"
                    fill="none"
                    stroke="var(--neon-cyan)"
                    strokeWidth="0.5"
                    opacity="0.2"
                  />
                  <circle
                    cx="150"
                    cy="180"
                    r="4"
                    fill="var(--neon-cyan)"
                    opacity="0.7"
                  />
                  <text
                    x="150"
                    y="215"
                    textAnchor="middle"
                    fill="var(--neon-cyan)"
                    fontSize="10"
                    fontFamily="var(--font-orbitron)"
                    fontWeight="700"
                    opacity="0.7"
                  >
                    EARTH
                  </text>

                  {/* Perigee — closest orbit point to Earth (left edge) */}
                  <circle
                    cx="25"
                    cy="180"
                    r="3"
                    fill="var(--neon-green)"
                    opacity="0.7"
                  />
                  <text
                    x="25"
                    y="160"
                    textAnchor="middle"
                    fill="var(--neon-green)"
                    fontSize="8"
                    fontFamily="var(--font-orbitron)"
                    fontWeight="700"
                    opacity="0.7"
                  >
                    PERIGEE
                  </text>

                  {/* Apogee — farthest orbit point from Earth (right edge) */}
                  <circle
                    cx="375"
                    cy="180"
                    r="3"
                    fill="var(--neon-orange)"
                    opacity="0.7"
                  />
                  <text
                    x="375"
                    y="160"
                    textAnchor="middle"
                    fill="var(--neon-orange)"
                    fontSize="8"
                    fontFamily="var(--font-orbitron)"
                    fontWeight="700"
                    opacity="0.7"
                  >
                    APOGEE
                  </text>

                  {/* Eccentricity: distance from focus (Earth) to geometric center (c)
                      Shown as an offset dimension line ABOVE Earth's outer ring to avoid overlap.
                      Earth outer ring: center (150,180) r=22 → top at y=158.
                      Dimension line at y=152 is safely above. */}
                  {/* Geometric center marker */}
                  <circle
                    cx="200"
                    cy="180"
                    r="2"
                    fill="var(--holo-purple)"
                    opacity="0.5"
                  />
                  <text
                    x="209"
                    y="177"
                    fill="var(--holo-purple)"
                    fontSize="6"
                    fontFamily="var(--font-fira-code)"
                    opacity="0.3"
                  >
                    center
                  </text>
                  {/* Dimension line at y=152 */}
                  <line
                    x1="150"
                    y1="152"
                    x2="200"
                    y2="152"
                    stroke="var(--holo-purple)"
                    strokeWidth="0.8"
                    opacity="0.4"
                  />
                  {/* Tick marks at endpoints of dimension line */}
                  <line
                    x1="150"
                    y1="148"
                    x2="150"
                    y2="156"
                    stroke="var(--holo-purple)"
                    strokeWidth="0.8"
                    opacity="0.35"
                  />
                  <line
                    x1="200"
                    y1="148"
                    x2="200"
                    y2="156"
                    stroke="var(--holo-purple)"
                    strokeWidth="0.8"
                    opacity="0.35"
                  />
                  {/* Dashed guide from geometric center down to axis */}
                  <line
                    x1="200"
                    y1="156"
                    x2="200"
                    y2="178"
                    stroke="var(--holo-purple)"
                    strokeWidth="0.5"
                    opacity="0.15"
                    strokeDasharray="2 2"
                  />
                  {/* Label above dimension line */}
                  <text
                    x="175"
                    y="145"
                    textAnchor="middle"
                    fill="var(--holo-purple)"
                    fontSize="8"
                    fontFamily="var(--font-fira-code)"
                    opacity="0.55"
                  >
                    c (eccentricity)
                  </text>

                  {/* Inclination: angle between orbital plane and equatorial reference plane.
                      Shown AT the ascending node ON the orbit ellipse.
                      At parametric t=50°: point (312, 88) is on the orbit.
                      Tangent direction there: (175·sin50°, 120·cos50°) = (134, 77)
                      → angle from horizontal ≈ 30° (downward-right in satellite travel direction).
                      Equator = horizontal line through the node.
                      Inclination = angle between equator and orbit tangent at this point. */}
                  {/* Ascending node marker — ON the orbit */}
                  <circle
                    cx="312"
                    cy="88"
                    r="3"
                    fill="none"
                    stroke="var(--neon-green)"
                    strokeWidth="1"
                    opacity="0.5"
                  />
                  <circle
                    cx="312"
                    cy="88"
                    r="1.2"
                    fill="var(--neon-green)"
                    opacity="0.6"
                  />
                  {/* Equatorial reference — horizontal line through the ascending node */}
                  <line
                    x1="275"
                    y1="88"
                    x2="370"
                    y2="88"
                    stroke="var(--neon-green)"
                    strokeWidth="0.6"
                    opacity="0.25"
                    strokeDasharray="3 3"
                  />
                  {/* Orbit tangent at the node — follows actual ellipse slope (~30° below horizontal)
                      Direction (134, 77) normalized, extended ±40px from (312, 88) */}
                  <line
                    x1="282"
                    y1="71"
                    x2="352"
                    y2="111"
                    stroke="var(--neon-green)"
                    strokeWidth="0.8"
                    opacity="0.35"
                    strokeDasharray="3 3"
                  />
                  {/* Arc showing inclination angle: r=25 from equator direction clockwise to tangent
                      Start: (337, 88) — on equator at r=25 right of node
                      End:   (334, 101) — on tangent at r=25 from node, 30° below horizontal
                      sweep-flag=1 (clockwise in SVG coords, going from equator downward to tangent) */}
                  <path
                    d="M337,88 A25,25 0 0,1 334,101"
                    fill="none"
                    stroke="var(--neon-green)"
                    strokeWidth="1"
                    opacity="0.5"
                  />
                  {/* "i" label beside the arc */}
                  <text
                    x="342"
                    y="100"
                    fill="var(--neon-green)"
                    fontSize="9"
                    fontFamily="var(--font-fira-code)"
                    fontStyle="italic"
                    opacity="0.6"
                  >
                    i
                  </text>
                  {/* "equator" label at right end of horizontal line */}
                  <text
                    x="372"
                    y="85"
                    fill="var(--neon-green)"
                    fontSize="6"
                    fontFamily="var(--font-fira-code)"
                    opacity="0.3"
                  >
                    equator
                  </text>

                  {/* Animated satellite — follows the actual elliptical orbit path */}
                  <g>
                    <circle r="5" fill="var(--neon-orange)" opacity="0.9">
                      <animateMotion
                        dur="8s"
                        repeatCount="indefinite"
                        rotate="auto"
                      >
                        <mpath href="#orbitPath" />
                      </animateMotion>
                      <animate
                        attributeName="opacity"
                        values="0.9;0.4;0.9"
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    {/* Trail glow */}
                    <circle r="10" fill="var(--neon-orange)" opacity="0.12">
                      <animateMotion
                        dur="8s"
                        repeatCount="indefinite"
                        rotate="auto"
                      >
                        <mpath href="#orbitPath" />
                      </animateMotion>
                      <animate
                        attributeName="r"
                        values="10;15;10"
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>

                  {/* Caption */}
                  <text
                    x="200"
                    y="340"
                    textAnchor="middle"
                    fill="var(--text-dim)"
                    fontSize="9"
                    fontFamily="var(--font-fira-code)"
                    opacity="0.5"
                  >
                    SGP4 Propagation Model
                  </text>
                </svg>

                {/* Right: explanation */}
                <div>
                  <div
                    className="text-[13px] font-bold tracking-[0.1em] mb-3"
                    style={{
                      color: "var(--neon-orange)",
                      fontFamily: "var(--font-orbitron)",
                    }}
                  >
                    SGP4 PROPAGATION
                  </div>
                  <p
                    className="text-[15px] leading-[1.9] mb-4"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    SGP4 propagation model from satellite.js &mdash; TLE
                    elements in, precise position/velocity out. The algorithm
                    accounts for atmospheric drag, gravitational harmonics, and
                    solar/lunar perturbations to predict satellite positions
                    with sub-kilometer accuracy.
                  </p>

                  <div
                    className="p-3 rounded-lg"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <pre
                      className="text-[11px] leading-[1.8]"
                      style={{
                        color: "var(--text-dim)",
                        fontFamily: "var(--font-fira-code)",
                      }}
                    >
                      {`// Two-Line Element → ECI coordinates
const satrec = twoline2satrec(tle1, tle2);
const { position, velocity } =
  propagate(satrec, new Date());`}
                    </pre>
                  </div>

                  <div className="flex gap-4 mt-4">
                    {[
                      { label: "TLE Input", color: "var(--neon-cyan)" },
                      { label: "SGP4 Model", color: "var(--neon-orange)" },
                      { label: "ECI Output", color: "var(--neon-green)" },
                    ].map((step) => (
                      <div
                        key={step.label}
                        className="flex items-center gap-1.5"
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: step.color }}
                        />
                        <span
                          className="text-[11px] tracking-wider"
                          style={{
                            color: step.color,
                            fontFamily: "var(--font-orbitron)",
                          }}
                        >
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Summarizes the visual system tokens and interaction language used across the interface. */}
        <section>
          <Reveal>
            <div className="flex items-center gap-4 mb-8">
              <h2
                className="text-[12px] font-bold tracking-[0.25em] uppercase"
                style={{
                  color: "var(--accent)",
                  fontFamily: "var(--font-orbitron)",
                }}
              >
                DESIGN SYSTEM
              </h2>
              <div
                className="flex-1 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, var(--accent-dim, rgba(0,229,255,0.2)), transparent)",
                }}
              />
            </div>
          </Reveal>

          <div className="grid grid-cols-3 gap-4">
            {/* Color palette */}
            <Reveal delay={0.05}>
              <div
                className="p-4 rounded-xl relative overflow-hidden"
                style={{
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(0,229,255,0.08)",
                }}
              >
                <div
                  className="absolute top-0 left-3 right-3 h-px"
                  style={{ background: "var(--neon-cyan)", opacity: 0.2 }}
                />
                <div
                  className="text-[11px] font-bold tracking-[0.15em] uppercase mb-4"
                  style={{
                    color: "var(--neon-cyan)",
                    fontFamily: "var(--font-orbitron)",
                  }}
                >
                  Color Palette
                </div>
                <div className="space-y-3">
                  {COLOR_SWATCHES.map((swatch) => (
                    <div key={swatch.hex} className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0"
                        style={{
                          background: swatch.cssVar,
                          boxShadow: `0 0 10px ${swatch.hex}40`,
                        }}
                      />
                      <div>
                        <div
                          className="text-[11px] tracking-wider"
                          style={{
                            color: "var(--text-primary)",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          {swatch.hex}
                        </div>
                        <div
                          className="text-[10px] tracking-wider"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {swatch.name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Font samples */}
            <Reveal delay={0.15}>
              <div
                className="p-4 rounded-xl relative overflow-hidden"
                style={{
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(0,229,255,0.08)",
                }}
              >
                <div
                  className="absolute top-0 left-3 right-3 h-px"
                  style={{ background: "var(--neon-orange)", opacity: 0.2 }}
                />
                <div
                  className="text-[11px] font-bold tracking-[0.15em] uppercase mb-4"
                  style={{
                    color: "var(--neon-orange)",
                    fontFamily: "var(--font-orbitron)",
                  }}
                >
                  Typography
                </div>
                <div className="space-y-5">
                  {/* Orbitron */}
                  <div>
                    <div
                      className="text-[10px] tracking-wider mb-1"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Orbitron &mdash; Display
                    </div>
                    <div
                      className="text-[16px] font-bold tracking-[0.12em]"
                      style={{
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-orbitron)",
                      }}
                    >
                      DISPLAY FONT
                    </div>
                  </div>
                  {/* Fira Code */}
                  <div>
                    <div
                      className="text-[10px] tracking-wider mb-1"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Fira Code &mdash; Monospace
                    </div>
                    <div
                      className="text-[14px]"
                      style={{
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-fira-code)",
                      }}
                    >
                      monospace font
                    </div>
                  </div>
                  {/* Exo 2 */}
                  <div>
                    <div
                      className="text-[10px] tracking-wider mb-1"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Exo 2 &mdash; Body
                    </div>
                    <div
                      className="text-[14px]"
                      style={{
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-exo2)",
                      }}
                    >
                      Body text font
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* UI Elements */}
            <Reveal delay={0.25}>
              <div
                className="p-4 rounded-xl relative overflow-hidden"
                style={{
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(0,229,255,0.08)",
                }}
              >
                <div
                  className="absolute top-0 left-3 right-3 h-px"
                  style={{ background: "var(--holo-purple)", opacity: 0.2 }}
                />
                <div
                  className="text-[11px] font-bold tracking-[0.15em] uppercase mb-4"
                  style={{
                    color: "var(--holo-purple)",
                    fontFamily: "var(--font-orbitron)",
                  }}
                >
                  UI Elements
                </div>
                <div className="space-y-5">
                  {/* Glass panel sample */}
                  <div>
                    <div
                      className="text-[10px] tracking-wider mb-1.5"
                      style={{ color: "var(--text-dim)" }}
                    >
                      .glass-panel
                    </div>
                    <div className="glass-panel p-3 rounded-lg">
                      <span
                        className="text-[12px]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Glassmorphism container
                      </span>
                    </div>
                  </div>
                  {/* Cyber button sample */}
                  <div>
                    <div
                      className="text-[10px] tracking-wider mb-1.5"
                      style={{ color: "var(--text-dim)" }}
                    >
                      .cyber-btn
                    </div>
                    <button
                      className="cyber-btn text-[12px] px-4 py-1.5 rounded"
                      style={{ fontFamily: "var(--font-orbitron)" }}
                      type="button"
                    >
                      ENGAGE
                    </button>
                  </div>
                  {/* Text glow sample */}
                  <div>
                    <div
                      className="text-[10px] tracking-wider mb-1.5"
                      style={{ color: "var(--text-dim)" }}
                    >
                      .text-glow-cyan
                    </div>
                    <span
                      className="text-glow-cyan text-[14px] font-bold tracking-wider"
                      style={{ fontFamily: "var(--font-orbitron)" }}
                    >
                      GLOWING TEXT
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Displays the closing footer for the technology overview. */}
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
              Built with open-source technologies. All satellite propagation
              uses the SGP4 model via satellite.js. Visualization layer powered
              by React Three Fiber and D3.js.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

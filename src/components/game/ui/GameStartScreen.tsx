"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ShipHull } from "@/store/gameStore";
import { getShipHullProfile } from "../entities/Player";
import { getAllWeapons, type WeaponId } from "@/lib/game/weapons";
import { SYNERGIES } from "@/lib/game/synergies";
import { SKILL_KNOWLEDGE } from "@/lib/game/skillKnowledge";

// Describes the reward preview shown after decrypting a starter weapon.
interface DecryptRewardPreview {
  id: WeaponId;
  name: string;
  rarity: string;
  isNew: boolean;
  color: string;
  icon: string;
}

interface GameStartScreenProps {
  onStart: () => void;
  highScore: number;
  selectedHull: ShipHull;
  selectedColor: string;
  selectedStarterWeapon: WeaponId;
  ownedStarterWeaponIds: WeaponId[];
  intelFragments: number;
  decryptCost: number;
  userPoints: number;
  isAuthenticated: boolean;
  isDecrypting: boolean;
  lastDecryptReward: DecryptRewardPreview | null;
  selectedStarterSynergyId?: string;
  onHullChange: (hull: ShipHull) => void;
  onColorChange: (color: string) => void;
  onStarterWeaponChange: (weapon: WeaponId) => void;
  onDecryptIntel: () => void;
  onStarterSynergyChange: (id?: string) => void;
}

const HULLS: { id: ShipHull; name: string; cls: string }[] = [
  { id: "viper", name: "VIPER", cls: "Interceptor" },
  { id: "mantis", name: "MANTIS", cls: "Assault" },
  { id: "titan", name: "TITAN", cls: "Heavy" },
];

const COLORS = [
  "#00e5ff",
  "#39ff7f",
  "#ff6b2c",
  "#ff3a8c",
  "#b44aff",
  "#ffcc00",
];

const WEAPON_LOOKUP = new Map(getAllWeapons().map((w) => [w.id, w] as const));
// Formats multiplicative stat changes into signed percentages for the loadout panel.
function formatDelta(mult: number, invert = false): string {
  const delta = (invert ? 1 - mult : mult - 1) * 100;
  if (Math.abs(delta) < 0.5) return "0%";
  return `${delta > 0 ? "+" : ""}${Math.round(delta)}%`;
}

// Maps a stat value into the percentage width used by the horizontal stat bars.
function statBarWidth(value: number, min: number, max: number): string {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return `${Math.round((0.2 + t * 0.8) * 100)}%`;
}

// Draws the detailed SVG ship preview used by the loadout cards and hero panel.
function ShipSVG({
  hull,
  color,
  size = 100,
  glow = false,
}: {
  hull: ShipHull;
  color: string;
  size?: number;
  glow?: boolean;
}) {
  const reactId = useId();
  const id = `ship-${hull}-${reactId.replace(/:/g, "")}`;
  const s = size * 0.45;
  const dimColor = color + "55";
  const glowFilter = glow ? `url(#${id}-glow)` : undefined;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-s * 1.4} ${-s * 0.8} ${s * 2.8} ${s * 1.6}`}
      fill="none"
      style={{ overflow: "visible" }}
    >
      <defs>
        {glow && (
          <filter
            id={`${id}-glow`}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="2.5"
              result="blur"
            />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
        <radialGradient id={`${id}-engine`}>
          <stop offset="0%" stopColor="white" stopOpacity="0.9" />
          <stop offset="40%" stopColor={color} stopOpacity="0.7" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {hull === "viper" && (
        <g filter={glowFilter}>
          {/* Draws the Viper hull silhouette and outline. */}
          <polygon
            points={`${s * 1.2},0 ${s * 0.65},${-s * 0.12} ${s * 0.3},${-s * 0.18} ${s * 0.05},${-s * 0.2} ${-s * 0.15},${-s * 0.22} ${-s * 0.55},${-s * 0.52} ${-s * 0.62},${-s * 0.46} ${-s * 0.5},${-s * 0.28} ${-s * 0.55},${-s * 0.18} ${-s * 0.6},${-s * 0.12} ${-s * 0.55},0 ${-s * 0.6},${s * 0.12} ${-s * 0.55},${s * 0.18} ${-s * 0.5},${s * 0.28} ${-s * 0.62},${s * 0.46} ${-s * 0.55},${s * 0.52} ${-s * 0.15},${s * 0.22} ${s * 0.05},${s * 0.2} ${s * 0.3},${s * 0.18} ${s * 0.65},${s * 0.12}`}
            fill={`${color}0c`}
            stroke={color}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Draws Viper panel-line accents. */}
          <line
            x1={s * 0.6}
            y1="0"
            x2={-s * 0.45}
            y2="0"
            stroke={dimColor}
            strokeWidth="0.6"
          />
          <line
            x1={-s * 0.1}
            y1={-s * 0.2}
            x2={-s * 0.5}
            y2={-s * 0.42}
            stroke={dimColor}
            strokeWidth="0.5"
          />
          <line
            x1={-s * 0.1}
            y1={s * 0.2}
            x2={-s * 0.5}
            y2={s * 0.42}
            stroke={dimColor}
            strokeWidth="0.5"
          />
          <line
            x1={-s * 0.35}
            y1={-s * 0.16}
            x2={-s * 0.55}
            y2={-s * 0.16}
            stroke={dimColor}
            strokeWidth="0.5"
          />
          <line
            x1={-s * 0.35}
            y1={s * 0.16}
            x2={-s * 0.55}
            y2={s * 0.16}
            stroke={dimColor}
            strokeWidth="0.5"
          />
          {/* Draws the Viper cockpit core. */}
          <circle
            cx={s * 0.35}
            cy="0"
            r={s * 0.07}
            fill={`${color}66`}
            stroke={color}
            strokeWidth="0.8"
          />
          {/* Draws the Viper engine glow points. */}
          <circle
            cx={-s * 0.62}
            cy={-s * 0.12}
            r={s * 0.06}
            fill={`url(#${id}-engine)`}
          />
          <circle
            cx={-s * 0.62}
            cy={s * 0.12}
            r={s * 0.06}
            fill={`url(#${id}-engine)`}
          />
          {/* Draws the Viper rear exhaust streaks. */}
          <line
            x1={-s * 0.62}
            y1={-s * 0.12}
            x2={-s * 0.85}
            y2={-s * 0.12}
            stroke={color}
            strokeWidth="1.2"
            opacity="0.5"
          />
          <line
            x1={-s * 0.62}
            y1={s * 0.12}
            x2={-s * 0.85}
            y2={s * 0.12}
            stroke={color}
            strokeWidth="1.2"
            opacity="0.5"
          />
        </g>
      )}

      {hull === "mantis" && (
        <g filter={glowFilter}>
          {/* Draws the Mantis hull silhouette with its forward-swept wings. */}
          <polygon
            points={`${s * 0.95},0 ${s * 0.6},${-s * 0.1} ${s * 0.3},${-s * 0.15} ${s * 0.1},${-s * 0.18} ${s * 0.38},${-s * 0.48} ${s * 0.22},${-s * 0.52} ${-s * 0.1},${-s * 0.4} ${-s * 0.25},${-s * 0.24} ${-s * 0.3},${-s * 0.28} ${-s * 0.48},${-s * 0.38} ${-s * 0.44},${-s * 0.24} ${-s * 0.42},${-s * 0.14} ${-s * 0.48},0 ${-s * 0.42},${s * 0.14} ${-s * 0.44},${s * 0.24} ${-s * 0.48},${s * 0.38} ${-s * 0.3},${s * 0.28} ${-s * 0.25},${s * 0.24} ${-s * 0.1},${s * 0.4} ${s * 0.22},${s * 0.52} ${s * 0.38},${s * 0.48} ${s * 0.1},${s * 0.18} ${s * 0.3},${s * 0.15} ${s * 0.6},${s * 0.1}`}
            fill={`${color}0c`}
            stroke={color}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Draws the Mantis center spine. */}
          <line
            x1={s * 0.55}
            y1="0"
            x2={-s * 0.4}
            y2="0"
            stroke={dimColor}
            strokeWidth="0.6"
          />
          {/* Draws the upper Mantis wing spar. */}
          <line
            x1={s * 0.15}
            y1={-s * 0.2}
            x2={s * 0.3}
            y2={-s * 0.46}
            stroke={dimColor}
            strokeWidth="0.5"
          />
          {/* Draws the lower Mantis wing spar. */}
          <line
            x1={s * 0.15}
            y1={s * 0.2}
            x2={s * 0.3}
            y2={s * 0.46}
            stroke={dimColor}
            strokeWidth="0.5"
          />
          {/* Draws Mantis engine nacelle detail lines. */}
          <line
            x1={-s * 0.28}
            y1={-s * 0.14}
            x2={-s * 0.42}
            y2={-s * 0.14}
            stroke={dimColor}
            strokeWidth="0.5"
          />
          <line
            x1={-s * 0.28}
            y1={s * 0.14}
            x2={-s * 0.42}
            y2={s * 0.14}
            stroke={dimColor}
            strokeWidth="0.5"
          />
          {/* Draws the Mantis cockpit core. */}
          <circle
            cx={s * 0.32}
            cy="0"
            r={s * 0.06}
            fill={`${color}66`}
            stroke={color}
            strokeWidth="0.8"
          />
          {/* Draws the Mantis engine glow cluster. */}
          <circle
            cx={-s * 0.48}
            cy="0"
            r={s * 0.05}
            fill={`url(#${id}-engine)`}
          />
          <circle
            cx={-s * 0.42}
            cy={-s * 0.12}
            r={s * 0.04}
            fill={`url(#${id}-engine)`}
          />
          <circle
            cx={-s * 0.42}
            cy={s * 0.12}
            r={s * 0.04}
            fill={`url(#${id}-engine)`}
          />
          {/* Draws the Mantis exhaust streaks. */}
          <line
            x1={-s * 0.48}
            y1="0"
            x2={-s * 0.72}
            y2="0"
            stroke={color}
            strokeWidth="1.2"
            opacity="0.5"
          />
          <line
            x1={-s * 0.42}
            y1={-s * 0.12}
            x2={-s * 0.62}
            y2={-s * 0.12}
            stroke={color}
            strokeWidth="0.8"
            opacity="0.35"
          />
          <line
            x1={-s * 0.42}
            y1={s * 0.12}
            x2={-s * 0.62}
            y2={s * 0.12}
            stroke={color}
            strokeWidth="0.8"
            opacity="0.35"
          />
        </g>
      )}

      {hull === "titan" && (
        <g filter={glowFilter}>
          <polygon
            points={`${s * 0.85},0 ${s * 0.7},${-s * 0.18} ${s * 0.4},${-s * 0.3} ${s * 0.05},${-s * 0.32} ${-s * 0.15},${-s * 0.32} ${-s * 0.22},${-s * 0.42} ${-s * 0.35},${-s * 0.6} ${-s * 0.5},${-s * 0.55} ${-s * 0.45},${-s * 0.32} ${-s * 0.5},${-s * 0.22} ${-s * 0.6},${-s * 0.18} ${-s * 0.58},0 ${-s * 0.6},${s * 0.18} ${-s * 0.5},${s * 0.22} ${-s * 0.45},${s * 0.32} ${-s * 0.5},${s * 0.55} ${-s * 0.35},${s * 0.6} ${-s * 0.22},${s * 0.42} ${-s * 0.15},${s * 0.32} ${s * 0.05},${s * 0.32} ${s * 0.4},${s * 0.3} ${s * 0.7},${s * 0.18}`}
            fill={`${color}0c`}
            stroke={color}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Center spine */}
          <line
            x1={s * 0.65}
            y1="0"
            x2={-s * 0.5}
            y2="0"
            stroke={dimColor}
            strokeWidth="0.6"
          />
          {/* Armor plates */}
          <line
            x1={s * 0.35}
            y1={-s * 0.28}
            x2={s * 0.35}
            y2={s * 0.28}
            stroke={dimColor}
            strokeWidth="0.5"
          />
          <line
            x1={-s * 0.1}
            y1={-s * 0.3}
            x2={-s * 0.1}
            y2={s * 0.3}
            stroke={dimColor}
            strokeWidth="0.5"
          />
          {/* Stabilizer bars */}
          <line
            x1={-s * 0.28}
            y1={-s * 0.35}
            x2={-s * 0.45}
            y2={-s * 0.45}
            stroke={dimColor}
            strokeWidth="0.5"
          />
          <line
            x1={-s * 0.28}
            y1={s * 0.35}
            x2={-s * 0.45}
            y2={s * 0.45}
            stroke={dimColor}
            strokeWidth="0.5"
          />
          {/* Engine block */}
          <line
            x1={-s * 0.48}
            y1={-s * 0.18}
            x2={-s * 0.48}
            y2={s * 0.18}
            stroke={dimColor}
            strokeWidth="0.5"
          />
          {/* Cockpit */}
          <circle
            cx={s * 0.5}
            cy="0"
            r={s * 0.055}
            fill={`${color}66`}
            stroke={color}
            strokeWidth="0.8"
          />
          {/* Engines */}
          <circle
            cx={-s * 0.6}
            cy={-s * 0.1}
            r={s * 0.05}
            fill={`url(#${id}-engine)`}
          />
          <circle
            cx={-s * 0.58}
            cy="0"
            r={s * 0.05}
            fill={`url(#${id}-engine)`}
          />
          <circle
            cx={-s * 0.6}
            cy={s * 0.1}
            r={s * 0.05}
            fill={`url(#${id}-engine)`}
          />
          <line
            x1={-s * 0.6}
            y1={-s * 0.1}
            x2={-s * 0.82}
            y2={-s * 0.1}
            stroke={color}
            strokeWidth="1.2"
            opacity="0.4"
          />
          <line
            x1={-s * 0.58}
            y1="0"
            x2={-s * 0.82}
            y2="0"
            stroke={color}
            strokeWidth="1.4"
            opacity="0.5"
          />
          <line
            x1={-s * 0.6}
            y1={s * 0.1}
            x2={-s * 0.82}
            y2={s * 0.1}
            stroke={color}
            strokeWidth="1.2"
            opacity="0.4"
          />
        </g>
      )}
    </svg>
  );
}

// ─── Main Start Screen ───────────────────────────────────────────────
export default function GameStartScreen({
  onStart,
  highScore,
  selectedHull,
  selectedColor,
  selectedStarterWeapon,
  ownedStarterWeaponIds,
  intelFragments,
  decryptCost,
  userPoints,
  isAuthenticated,
  isDecrypting,
  lastDecryptReward,
  selectedStarterSynergyId,
  onHullChange,
  onColorChange,
  onStarterWeaponChange,
  onDecryptIntel,
  onStarterSynergyChange,
}: GameStartScreenProps) {
  const [hoveredHull, setHoveredHull] = useState<ShipHull | null>(null);
  const [knowledgeOpenFor, setKnowledgeOpenFor] = useState<WeaponId | null>(
    null
  );
  const [showDecryptReveal, setShowDecryptReveal] = useState(false);
  const [reelDir, setReelDir] = useState<1 | -1>(1);
  const [reelCenterIndex, setReelCenterIndex] = useState(0);
  const [reelShift, setReelShift] = useState(0);
  const [reelAnimating, setReelAnimating] = useState(false);
  const reelAnimatingRef = useRef(false);
  const reelRafRef = useRef<number | null>(null);
  const canDecrypt =
    isAuthenticated &&
    intelFragments > 0 &&
    userPoints >= decryptCost &&
    !isDecrypting;
  const starterSynergyOptions = useMemo(
    () =>
      SYNERGIES.map((s) => ({ id: s.id, label: s.name })).sort((a, b) =>
        a.label.localeCompare(b.label)
      ),
    []
  );
  const reelWeapons = useMemo(
    () =>
      ownedStarterWeaponIds
        .map((id) => {
          const weapon = WEAPON_LOOKUP.get(id);
          if (!weapon) return null;
          return { id, weapon };
        })
        .filter(
          (
            v
          ): v is {
            id: WeaponId;
            weapon: NonNullable<ReturnType<typeof WEAPON_LOOKUP.get>>;
          } => !!v
        ),
    [ownedStarterWeaponIds]
  );

  const selectedReelIndex = useMemo(() => {
    const idx = reelWeapons.findIndex((v) => v.id === selectedStarterWeapon);
    return idx >= 0 ? idx : 0;
  }, [reelWeapons, selectedStarterWeapon]);

  useEffect(() => {
    if (!reelAnimatingRef.current) {
      setReelCenterIndex(selectedReelIndex);
    }
  }, [selectedReelIndex]);

  const cycleReel = useCallback(
    (delta: number) => {
      if (!reelWeapons.length) return;
      if (reelAnimatingRef.current) return;
      setReelDir(delta > 0 ? 1 : -1);
      const dir = delta > 0 ? 1 : -1;
      const start = performance.now();
      const duration = 240;
      const startCenter = reelCenterIndex;
      const len = reelWeapons.length;
      reelAnimatingRef.current = true;
      setReelAnimating(true);

      const animate = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = t;
        setReelShift(dir * eased);
        if (t < 1) {
          reelRafRef.current = requestAnimationFrame(animate);
          return;
        }

        const nextCenter = (startCenter + dir + len) % len;
        const target = reelWeapons[nextCenter];
        setReelCenterIndex(nextCenter);
        setReelShift(0);
        reelAnimatingRef.current = false;
        setReelAnimating(false);
        if (target) onStarterWeaponChange(target.id);
      };

      reelRafRef.current = requestAnimationFrame(animate);
    },
    [reelWeapons, reelCenterIndex, onStarterWeaponChange]
  );

  const knowledge = knowledgeOpenFor ? SKILL_KNOWLEDGE[knowledgeOpenFor] : null;
  const knowledgeWeapon = knowledgeOpenFor
    ? WEAPON_LOOKUP.get(knowledgeOpenFor)
    : null;
  const rewardRarity = (lastDecryptReward?.rarity || "common") as
    | "common"
    | "uncommon"
    | "rare"
    | "legendary";
  const rewardTheme = {
    common: {
      glow: "rgba(179,205,228,0.34)",
      edge: "rgba(179,205,228,0.52)",
      accent: "#d4e7ff",
    },
    uncommon: {
      glow: "rgba(79,255,171,0.34)",
      edge: "rgba(79,255,171,0.58)",
      accent: "#8dffd1",
    },
    rare: {
      glow: "rgba(86,206,255,0.34)",
      edge: "rgba(86,206,255,0.58)",
      accent: "#8fe3ff",
    },
    legendary: {
      glow: "rgba(255,166,91,0.38)",
      edge: "rgba(255,166,91,0.64)",
      accent: "#ffd5ab",
    },
  }[rewardRarity];

  useEffect(() => {
    if (!lastDecryptReward) return;
    setShowDecryptReveal(true);
    const t = window.setTimeout(() => setShowDecryptReveal(false), 2600);
    return () => window.clearTimeout(t);
  }, [lastDecryptReward]);

  useEffect(() => {
    return () => {
      if (reelRafRef.current !== null) {
        cancelAnimationFrame(reelRafRef.current);
      }
      reelAnimatingRef.current = false;
    };
  }, []);

  return (
    <div
      className="absolute inset-0 z-50 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 32%, #12162a 0%, #070a12 70%)",
      }}
    >
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(var(--accent) 1px, transparent 1px),
              linear-gradient(90deg, var(--accent) 1px, transparent 1px)
            `,
            backgroundSize: "56px 56px",
            animation: "opsGridScroll 26s linear infinite",
          }}
        />
      </div>
      <div className="absolute inset-0 pointer-events-none">
        <div className="ops-start-nebula absolute -top-20 -left-20 w-[360px] h-[360px] rounded-full" />
        <div className="ops-start-nebula absolute bottom-[-120px] right-[-40px] w-[420px] h-[420px] rounded-full" />
      </div>

      <motion.div
        className="relative z-10 h-full w-full px-4 py-3 md:px-6 md:py-4 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
      >
        <div
          className="mx-auto w-full max-w-[1140px] h-full max-h-[860px] flex flex-col gap-3"
          style={{
            paddingTop: "max(8px, env(safe-area-inset-top))",
            paddingBottom: "max(8px, env(safe-area-inset-bottom))",
          }}
        >
          <motion.header
            className="rounded-2xl px-5 py-3 md:px-6 md:py-4 shrink-0"
            style={{
              background:
                "linear-gradient(145deg, rgba(13,22,36,0.84), rgba(8,14,22,0.82))",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow:
                "0 14px 44px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1
                  className="text-4xl md:text-5xl font-bold tracking-[0.24em]"
                  style={{
                    fontFamily: "var(--font-orbitron)",
                    color: "var(--accent)",
                    textShadow:
                      "0 0 24px color-mix(in srgb, var(--accent) 35%, transparent)",
                  }}
                >
                  OPS
                </h1>
                <div
                  className="mt-2 text-[11px] tracking-[0.32em] uppercase"
                  style={{ color: "var(--text-dim)" }}
                >
                  ORBITAL PATROL &amp; SALVAGE
                </div>
              </div>
              <AnimatePresence>
                {highScore > 0 && (
                  <motion.div
                    className="text-[12px] tracking-wider"
                    style={{ color: "var(--text-dim)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    BEST{" "}
                    <span
                      style={{
                        color: "var(--accent)",
                        fontFamily: "var(--font-orbitron)",
                      }}
                    >
                      {highScore.toLocaleString()}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.header>

          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-3 items-stretch min-h-0 flex-1">
            <motion.section
              className="rounded-2xl p-4 md:p-4 min-h-0 flex flex-col"
              style={{
                background:
                  "linear-gradient(150deg, rgba(11,18,30,0.86), rgba(8,13,22,0.83))",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.06, duration: 0.38 }}
            >
              <div className="mb-3">
                <div
                  className="text-[11px] tracking-[0.24em] uppercase"
                  style={{ color: "var(--text-dim)" }}
                >
                  Ship Hangar
                </div>
                <div
                  className="text-[13px] mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Select chassis and paint. Starter skill is configured
                  independently.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {HULLS.map((hull, idx) => {
                  const isSelected = selectedHull === hull.id;
                  const isHovered = hoveredHull === hull.id;
                  const p = getShipHullProfile(hull.id);
                  const stats = [
                    {
                      label: "HP",
                      delta: formatDelta(p.hpMult),
                      width: statBarWidth(p.hpMult, 0.8, 1.4),
                      good: p.hpMult >= 1,
                    },
                    {
                      label: "SPD",
                      delta: formatDelta(p.speedMult),
                      width: statBarWidth(p.speedMult, 0.8, 1.25),
                      good: p.speedMult >= 1,
                    },
                    {
                      label: "DMG",
                      delta: formatDelta(p.damageMult),
                      width: statBarWidth(p.damageMult, 0.9, 1.25),
                      good: p.damageMult >= 1,
                    },
                    {
                      label: "ROF",
                      delta: formatDelta(p.cooldownMult, true),
                      width: statBarWidth(2 - p.cooldownMult, 0.9, 1.2),
                      good: p.cooldownMult <= 1,
                    },
                  ];

                  return (
                    <motion.button
                      key={hull.id}
                      type="button"
                      className="relative rounded-xl p-3 cursor-pointer pointer-events-auto text-left"
                      style={{
                        background: isSelected
                          ? "linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03))"
                          : "linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                        border: isSelected
                          ? "1px solid color-mix(in srgb, var(--accent) 38%, transparent)"
                          : "1px solid rgba(255,255,255,0.08)",
                        boxShadow: isSelected
                          ? "0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent) inset"
                          : "none",
                      }}
                      onClick={() => onHullChange(hull.id)}
                      onMouseEnter={() => setHoveredHull(hull.id)}
                      onMouseLeave={() => setHoveredHull(null)}
                      initial={{ y: 8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 + idx * 0.05, duration: 0.32 }}
                      whileHover={{ y: -3, scale: 1.01 }}
                      whileTap={{ scale: 0.985 }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div
                            className="text-[13px] font-bold tracking-[0.14em]"
                            style={{
                              fontFamily: "var(--font-orbitron)",
                              color: isSelected
                                ? "var(--accent)"
                                : "var(--text-primary)",
                            }}
                          >
                            {hull.name}
                          </div>
                          <div
                            className="text-[10px] uppercase tracking-[0.16em]"
                            style={{ color: "var(--text-dim)" }}
                          >
                            {hull.cls}
                          </div>
                        </div>
                        <ShipSVG
                          hull={hull.id}
                          color={
                            isSelected
                              ? selectedColor
                              : isHovered
                                ? "rgba(255,255,255,0.56)"
                                : "rgba(255,255,255,0.26)"
                          }
                          size={84}
                          glow={isSelected}
                        />
                      </div>

                      <div
                        className="mt-2.5 p-2 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.03)" }}
                      >
                        {stats.map((s) => (
                          <div
                            key={s.label}
                            className="flex items-center gap-1.5 mb-1 last:mb-0"
                          >
                            <span
                              className="text-[8px] tracking-[0.18em] w-6"
                              style={{
                                color: "var(--text-dim)",
                                fontFamily: "var(--font-fira)",
                              }}
                            >
                              {s.label}
                            </span>
                            <div
                              className="h-[3px] flex-1 rounded-full overflow-hidden"
                              style={{ background: "rgba(255,255,255,0.09)" }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: s.width,
                                  background: s.good
                                    ? "var(--accent)"
                                    : "rgba(255,255,255,0.42)",
                                  boxShadow: s.good
                                    ? "0 0 8px color-mix(in srgb, var(--accent) 45%, transparent)"
                                    : "none",
                                }}
                              />
                            </div>
                            <span
                              className="text-[8px] tabular-nums w-8 text-right"
                              style={{
                                color: s.good
                                  ? "var(--accent)"
                                  : "var(--text-dim)",
                                fontFamily: "var(--font-fira)",
                              }}
                            >
                              {s.delta}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className="text-[10px] tracking-[0.2em] uppercase"
                  style={{ color: "var(--text-dim)" }}
                >
                  Hull Color
                </span>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className="w-7 h-7 rounded-full transition-all duration-150 pointer-events-auto"
                    style={{
                      background: c,
                      border:
                        selectedColor === c
                          ? "2px solid rgba(255,255,255,0.9)"
                          : "2px solid transparent",
                      boxShadow:
                        selectedColor === c ? `0 0 12px ${c}99` : "none",
                      opacity: selectedColor === c ? 1 : 0.45,
                      transform:
                        selectedColor === c ? "scale(1.1)" : "scale(1)",
                    }}
                    onClick={() => onColorChange(c)}
                  />
                ))}
              </div>
            </motion.section>

            <motion.section
              className="rounded-2xl p-4 md:p-4 min-h-0 flex flex-col"
              style={{
                background:
                  "linear-gradient(150deg, rgba(14,22,38,0.86), rgba(9,14,26,0.84))",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.38 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[11px] tracking-[0.22em] uppercase"
                  style={{
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-fira)",
                  }}
                >
                  Starter Skill Vault
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: "var(--text-dim)" }}
                >
                  Owned:{" "}
                  <span style={{ color: "var(--accent)" }}>
                    {ownedStarterWeaponIds.length}
                  </span>
                </span>
              </div>

              <div
                className="relative h-[264px] rounded-xl p-2.5 overflow-hidden"
                style={{
                  background:
                    "linear-gradient(145deg, rgba(24,38,59,0.58), rgba(10,18,34,0.76) 48%, rgba(20,26,40,0.62) 100%)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.1), 0 18px 32px rgba(0,0,0,0.3)",
                  perspective: "1200px",
                }}
                onWheel={(e) => {
                  e.preventDefault();
                  cycleReel(e.deltaY > 0 ? 1 : -1);
                }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle at 20% 25%, rgba(0,229,255,0.14), transparent 42%), radial-gradient(circle at 82% 75%, rgba(255,122,58,0.14), transparent 46%)",
                  }}
                />
                <div
                  className="absolute left-1/2 bottom-4 -translate-x-1/2 w-[68%] h-5 pointer-events-none rounded-full"
                  style={{
                    background:
                      "radial-gradient(ellipse, rgba(0,0,0,0.45) 0%, transparent 70%)",
                    filter: "blur(2px)",
                  }}
                />
                <div
                  className="absolute inset-x-10 top-1/2 -translate-y-1/2 h-[120px] pointer-events-none"
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.09)",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "999px",
                    opacity: 0.65,
                  }}
                />

                {reelWeapons.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => cycleReel(-1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center pointer-events-auto z-30"
                      style={{
                        background:
                          "linear-gradient(145deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05))",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "var(--text-secondary)",
                        boxShadow:
                          "0 6px 14px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.2)",
                        cursor: reelAnimating ? "not-allowed" : "pointer",
                        opacity: reelAnimating ? 0.55 : 1,
                      }}
                      disabled={reelAnimating}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <polyline points="6.5,2 3.5,5 6.5,8" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => cycleReel(1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center pointer-events-auto z-30"
                      style={{
                        background:
                          "linear-gradient(145deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05))",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "var(--text-secondary)",
                        boxShadow:
                          "0 6px 14px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.2)",
                        cursor: reelAnimating ? "not-allowed" : "pointer",
                        opacity: reelAnimating ? 0.55 : 1,
                      }}
                      disabled={reelAnimating}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <polyline points="3.5,2 6.5,5 3.5,8" />
                      </svg>
                    </button>

                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(to bottom, rgba(5,9,16,0.72), transparent 30%, transparent 70%, rgba(5,9,16,0.72))",
                      }}
                    />
                    <div
                      className="absolute inset-0 z-10"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      {([-2, -1, 0, 1, 2] as const).map((offset) => {
                        const len = reelWeapons.length;
                        if (!len) return null;
                        const idx = (reelCenterIndex + offset + len) % len;
                        const entry = reelWeapons[idx];
                        if (!entry) return null;
                        const wheelOffset = offset - reelShift;
                        const theta = wheelOffset * 0.52;
                        const y = Math.sin(theta) * 104;
                        const z = (Math.cos(theta) - 1) * 180;
                        const tilt = -theta * 42;
                        const distance = Math.abs(wheelOffset);
                        const isActive = distance < 0.5;
                        const scale = Math.max(0.72, 1 + z / 700);
                        const opacity = isActive
                          ? 1
                          : distance < 1.45
                            ? 0.54
                            : 0.24;

                        return (
                          <div
                            key={`wheel-slot-${offset}-${entry.id}-${idx}`}
                            onClick={() => onStarterWeaponChange(entry.id)}
                            className="absolute left-1/2 top-1/2 w-[66%] rounded-lg px-2.5 py-1.5 text-left pointer-events-auto cursor-pointer"
                            style={{
                              transform: `translate(-50%, -50%) translate3d(0px, ${y}px, ${z}px) rotateX(${tilt}deg) scale(${scale})`,
                              background: isActive
                                ? `linear-gradient(140deg, ${entry.weapon.color}32, rgba(8,12,22,0.9) 58%, rgba(0,0,0,0.58))`
                                : "linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.035))",
                              border: isActive
                                ? `1px solid ${entry.weapon.color}aa`
                                : "1px solid rgba(255,255,255,0.13)",
                              boxShadow: isActive
                                ? `0 0 26px ${entry.weapon.color}3f, 0 12px 20px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.2)`
                                : "0 8px 14px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.08)",
                              filter: reelAnimating
                                ? `blur(${Math.min(0.45, Math.abs(reelShift) * 0.45)}px)`
                                : "none",
                              opacity,
                            }}
                          >
                            <div className="flex items-center gap-2 pr-7">
                              <div
                                className="w-7 h-7 rounded-md flex items-center justify-center text-[14px] font-bold"
                                style={{
                                  background: `${entry.weapon.color}20`,
                                  border: `1px solid ${entry.weapon.color}55`,
                                  color: entry.weapon.color,
                                  fontFamily: "var(--font-orbitron)",
                                }}
                              >
                                {entry.weapon.icon}
                              </div>
                              <div className="min-w-0">
                                <div
                                  className="text-[11px] truncate"
                                  style={{ color: "var(--text-primary)" }}
                                >
                                  {entry.weapon.name}
                                </div>
                                <div
                                  className="text-[9px] uppercase tracking-[0.14em]"
                                  style={{ color: entry.weapon.color }}
                                >
                                  {entry.weapon.rarity}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setKnowledgeOpenFor(entry.id);
                              }}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center pointer-events-auto"
                              style={{
                                background: "rgba(255,255,255,0.12)",
                                border: "1px solid rgba(255,255,255,0.2)",
                                color: "rgba(234,247,255,0.92)",
                                cursor: "pointer",
                              }}
                              aria-label={`View knowledge for ${entry.weapon.name}`}
                            >
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                              </svg>
                            </button>
                            {isActive && (
                              <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                  background: `linear-gradient(110deg, transparent 0%, ${entry.weapon.color}22 48%, transparent 64%)`,
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                <div
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.16em] uppercase px-2 py-0.5 rounded"
                  style={{
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-fira-code)",
                    opacity: 0.8,
                    background: "rgba(4,10,18,0.68)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  Scroll / Arrow to cycle
                </div>
              </div>

              <div
                className="mt-2.5 rounded-lg p-3 relative overflow-hidden"
                style={{
                  background: "rgba(0,0,0,0.24)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div
                  className="text-[10px] tracking-[0.18em] uppercase"
                  style={{ color: "var(--text-dim)" }}
                >
                  ENCRYPTED INTEL
                </div>
                <div
                  className="text-[12px] mt-0.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Fragments{" "}
                  <span style={{ color: "var(--accent)" }}>
                    {intelFragments}
                  </span>{" "}
                  · Cost{" "}
                  <span style={{ color: "var(--neon-orange)" }}>
                    {decryptCost}
                  </span>{" "}
                  pts
                </div>
                {!isAuthenticated && (
                  <div
                    className="text-[11px] mt-0.5"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Sign in to decrypt and unlock new starter skills.
                  </div>
                )}
                {lastDecryptReward && (
                  <div
                    className="text-[11px] mt-0.5"
                    style={{ color: lastDecryptReward.color }}
                  >
                    Decrypted: {lastDecryptReward.name}{" "}
                    {lastDecryptReward.isNew ? "(New)" : "(Duplicate)"}
                  </div>
                )}
                <button
                  type="button"
                  onClick={onDecryptIntel}
                  disabled={!canDecrypt}
                  className="mt-2.5 pointer-events-auto px-3 py-2 rounded-md text-[11px] tracking-[0.16em] uppercase font-bold transition-all"
                  style={{
                    fontFamily: "var(--font-orbitron)",
                    color: canDecrypt ? "#d6f3ff" : "rgba(214,243,255,0.42)",
                    background: canDecrypt
                      ? "linear-gradient(135deg, rgba(24,46,64,0.95), rgba(9,22,34,0.95))"
                      : "rgba(11,18,26,0.72)",
                    border: canDecrypt
                      ? "1px solid rgba(127,216,255,0.55)"
                      : "1px solid rgba(127,216,255,0.2)",
                    boxShadow: canDecrypt
                      ? "0 0 16px rgba(127,216,255,0.22)"
                      : "none",
                    cursor: canDecrypt ? "pointer" : "not-allowed",
                  }}
                >
                  {isDecrypting ? "Decrypting..." : "Decrypt Intel"}
                </button>
              </div>

              <div className="mt-2.5 flex items-center gap-3">
                <div className="w-full">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[10px] tracking-[0.2em] uppercase shrink-0"
                      style={{ color: "var(--text-dim)" }}
                    >
                      START FUSION
                    </span>
                    <select
                      className="w-full px-3 py-1.5 rounded-md text-[12px] pointer-events-auto"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-fira)",
                      }}
                      value={selectedStarterSynergyId || ""}
                      onChange={(e) =>
                        onStarterSynergyChange(e.target.value || undefined)
                      }
                    >
                      <option value="">None</option>
                      {starterSynergyOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div
                    className="mt-1 text-[10px] tracking-[0.08em]"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Test mode: all designed fusions are selectable here and
                    granted directly at mission start.
                  </div>
                </div>
              </div>
            </motion.section>
          </div>

          <motion.div
            className="flex flex-wrap items-center gap-3 justify-between rounded-2xl px-5 py-2.5 shrink-0"
            style={{
              background:
                "linear-gradient(140deg, rgba(9,14,22,0.8), rgba(12,18,28,0.78))",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.32 }}
          >
            <div className="text-[10px]" style={{ color: "var(--text-dim)" }}>
              ENTER to launch
            </div>
            <motion.button
              className="cyber-btn !px-10 !py-2.5 !text-[13px] pointer-events-auto tracking-[0.2em]"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={onStart}
            >
              LAUNCH MISSION
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence>
        {knowledgeOpenFor && knowledge && knowledgeWeapon && (
          <motion.div
            className="absolute inset-0 z-[75] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: "rgba(4,8,14,0.72)",
                backdropFilter: "blur(4px)",
              }}
              onClick={() => setKnowledgeOpenFor(null)}
            />
            <motion.div
              className="relative w-full max-w-[760px] rounded-2xl p-5 md:p-6"
              style={{
                background:
                  "linear-gradient(145deg, rgba(10,20,34,0.95), rgba(9,16,28,0.94))",
                border: `1px solid ${knowledgeWeapon.color}70`,
                boxShadow: `0 0 42px ${knowledgeWeapon.color}33, 0 20px 60px rgba(0,0,0,0.46)`,
              }}
              initial={{ y: 18, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 18, scale: 0.96 }}
              transition={{ duration: 0.24 }}
            >
              <button
                type="button"
                onClick={() => setKnowledgeOpenFor(null)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "var(--text-secondary)",
                  border: "1px solid rgba(255,255,255,0.16)",
                }}
              >
                ×
              </button>

              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-[18px] font-bold"
                  style={{
                    color: knowledgeWeapon.color,
                    background: `${knowledgeWeapon.color}20`,
                    border: `1px solid ${knowledgeWeapon.color}66`,
                    fontFamily: "var(--font-orbitron)",
                  }}
                >
                  {knowledgeWeapon.icon}
                </div>
                <div>
                  <div
                    className="text-[11px] uppercase tracking-[0.2em]"
                    style={{ color: "rgba(182,212,233,0.74)" }}
                  >
                    Skill Intelligence Dossier
                  </div>
                  <div
                    className="text-[17px] font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {knowledgeWeapon.name} · {knowledge.title}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div
                  className="rounded-lg px-3 py-2"
                  style={{
                    background: "rgba(127,216,255,0.09)",
                    border: "1px solid rgba(127,216,255,0.24)",
                  }}
                >
                  <div
                    className="text-[10px] uppercase tracking-[0.14em]"
                    style={{ color: "#9ddfff" }}
                  >
                    SDG Mapping
                  </div>
                  <div
                    className="text-[12px] mt-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {knowledge.sdg}
                  </div>
                </div>
                <div
                  className="rounded-lg px-3 py-2"
                  style={{
                    background: "rgba(255,169,102,0.09)",
                    border: "1px solid rgba(255,169,102,0.24)",
                  }}
                >
                  <div
                    className="text-[10px] uppercase tracking-[0.14em]"
                    style={{ color: "#ffc48b" }}
                  >
                    Satellite Link
                  </div>
                  <div
                    className="text-[12px] mt-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {knowledge.satellite}
                  </div>
                </div>
              </div>

              <div
                className="mt-3 rounded-lg p-3"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div
                  className="text-[11px] leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  This skill maps to an operational concept used in
                  Earth-observation programs. In gameplay terms it represents a
                  response pattern, while in mission terms it mirrors how
                  satellite systems track change, prioritize anomalies, and
                  route interventions under uncertainty.
                </div>
                <div
                  className="text-[11px] mt-2 leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Core insight: {knowledge.insight} This linkage is designed so
                  players can understand why the skill exists beyond combat and
                  how it reflects real monitoring logic across sustainability,
                  resilience, and orbital systems governance.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDecryptReveal && lastDecryptReward && (
          <motion.div
            className="absolute top-6 right-6 z-[80] w-[360px] pointer-events-none"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.94 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="relative rounded-2xl p-4 overflow-hidden"
              style={{
                background:
                  "linear-gradient(150deg, rgba(8,16,28,0.96), rgba(9,15,26,0.94))",
                border: `1px solid ${rewardTheme.edge}`,
                boxShadow: `0 0 36px ${rewardTheme.glow}, 0 18px 42px rgba(0,0,0,0.48)`,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at 20% 18%, ${rewardTheme.glow}, transparent 54%)`,
                }}
              />
              <motion.div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(120deg, transparent 0%, ${rewardTheme.accent}22 48%, transparent 58%)`,
                }}
                initial={{ x: "-130%" }}
                animate={{ x: "130%" }}
                transition={{ duration: 1.2, ease: "linear" }}
              />
              <div className="relative z-10">
                <div
                  className="text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: rewardTheme.accent }}
                >
                  Signal Decrypted
                </div>
                <div
                  className="mt-1 text-[12px]"
                  style={{ color: "rgba(208,228,245,0.86)" }}
                >
                  New starter intelligence package extracted.
                </div>
                <div
                  className="mt-3 rounded-lg p-2.5 flex items-center gap-2.5"
                  style={{
                    background: `linear-gradient(140deg, ${lastDecryptReward.color}28, rgba(0,0,0,0.5))`,
                    border: `1px solid ${lastDecryptReward.color}95`,
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-md flex items-center justify-center text-[16px] font-bold"
                    style={{
                      color: lastDecryptReward.color,
                      background: `${lastDecryptReward.color}24`,
                      border: `1px solid ${lastDecryptReward.color}66`,
                      fontFamily: "var(--font-orbitron)",
                    }}
                  >
                    {lastDecryptReward.icon}
                  </div>
                  <div className="min-w-0">
                    <div
                      className="text-[13px] font-bold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {lastDecryptReward.name}
                    </div>
                    <div
                      className="text-[10px] uppercase tracking-[0.14em]"
                      style={{ color: lastDecryptReward.color }}
                    >
                      {lastDecryptReward.rarity} ·{" "}
                      {lastDecryptReward.isNew
                        ? "New Unlock"
                        : "Duplicate Archive"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes opsGridScroll {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(56px, 56px);
          }
        }
        .ops-start-nebula {
          background:
            radial-gradient(
              circle at 30% 30%,
              rgba(0, 229, 255, 0.18),
              transparent 58%
            ),
            radial-gradient(
              circle at 70% 70%,
              rgba(255, 122, 58, 0.15),
              transparent 62%
            );
          filter: blur(20px);
          animation: opsNebulaFloat 16s ease-in-out infinite;
        }
        @keyframes opsNebulaFloat {
          0%,
          100% {
            transform: translateY(0px) scale(1);
            opacity: 0.75;
          }
          50% {
            transform: translateY(-12px) scale(1.05);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

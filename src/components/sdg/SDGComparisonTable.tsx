"use client";

import { motion } from "framer-motion";
import { SDGScore } from "@/lib/sdg/engine";
import SvgIcon from "@/components/ui/SvgIcon";

interface RegionData {
  region: string;
  scores: SDGScore[];
  color: string;
}

interface SDGComparisonTableProps {
  regions: RegionData[];
  baseScores: SDGScore[];
}

function ScoreCell({
  score,
  color,
  delay,
}: {
  score: number | null;
  color: string;
  delay: number;
}) {
  if (score === null) {
    return (
      <div className="flex items-center gap-2 px-3 py-1">
        <span
          className="text-[14px]"
          style={{
            color: "var(--text-dim)",
            fontFamily: "var(--font-fira-code)",
          }}
        >
          --
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 px-3 py-1">
      <span
        className="text-[15px] font-bold w-8 text-right flex-shrink-0"
        style={{
          fontFamily: "var(--font-fira-code)",
          color,
          textShadow: `0 0 8px ${color}30`,
        }}
      >
        {score}
      </span>
      <div className="flex-1 min-w-0">
        <div
          className="h-[6px] rounded-full overflow-hidden relative"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          <motion.div
            className="h-full rounded-full relative"
            style={{
              background: `linear-gradient(90deg, ${color}90, ${color})`,
              boxShadow: `0 0 8px ${color}40, inset 0 1px 0 rgba(255,255,255,0.15)`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
          />
          {/* Bright tip */}
          <motion.div
            className="absolute top-0 h-full w-[2px] rounded-full"
            style={{
              background: "white",
              boxShadow: `0 0 4px ${color}`,
              opacity: 0.6,
            }}
            initial={{ left: 0 }}
            animate={{ left: `${score}%` }}
            transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
    </div>
  );
}

export default function SDGComparisonTable({
  regions,
  baseScores,
}: SDGComparisonTableProps) {
  if (regions.length === 0) return null;

  return (
    <motion.div
      className="rounded-lg overflow-hidden"
      style={{
        background: "rgba(0,0,0,0.3)",
        border: "1px solid var(--border-subtle)",
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns: `180px repeat(${regions.length}, 1fr)`,
          background: "rgba(0,229,255,0.03)",
          borderBottom: "1px solid rgba(0,229,255,0.08)",
        }}
      >
        <div className="px-4 py-2.5">
          <span
            className="text-[12px] font-bold tracking-[0.18em] uppercase"
            style={{ color: "var(--text-dim)" }}
          >
            SDG Indicator
          </span>
        </div>
        {regions.map((r, i) => (
          <div
            key={r.region}
            className="px-3 py-2.5 flex items-center gap-2"
            style={{ borderLeft: "1px solid rgba(255,255,255,0.04)" }}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: r.color,
                boxShadow: `0 0 6px ${r.color}60`,
              }}
            />
            <span
              className="text-[13px] font-bold tracking-[0.08em] uppercase truncate"
              style={{ color: r.color }}
              title={r.region}
            >
              {r.region.length > 18 ? r.region.slice(0, 18) + "…" : r.region}
            </span>
          </div>
        ))}
      </div>

      {/* Body */}
      {baseScores.map((sdg, rowIdx) => (
        <motion.div
          key={sdg.sdgNumber}
          className="grid items-center"
          style={{
            gridTemplateColumns: `180px repeat(${regions.length}, 1fr)`,
            background: rowIdx % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent",
            borderBottom:
              rowIdx < baseScores.length - 1
                ? "1px solid rgba(255,255,255,0.03)"
                : "none",
          }}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + rowIdx * 0.06, duration: 0.4 }}
        >
          {/* SDG label cell */}
          <div className="px-4 py-2.5 flex items-center gap-2.5">
            <SvgIcon name={sdg.icon} size={18} />
            <div className="min-w-0">
              <div
                className="text-[13px] font-bold tracking-[0.1em]"
                style={{ color: sdg.color, fontFamily: "var(--font-orbitron)" }}
              >
                SDG {sdg.sdgNumber}
              </div>
              <div
                className="text-[12px] tracking-wider truncate"
                style={{ color: "var(--text-dim)" }}
                title={sdg.title}
              >
                {sdg.title}
              </div>
            </div>
          </div>

          {/* Region score cells */}
          {regions.map((r, colIdx) => {
            const regionScore = r.scores.find(
              (s) => s.sdgNumber === sdg.sdgNumber
            );
            return (
              <div
                key={r.region}
                style={{ borderLeft: "1px solid rgba(255,255,255,0.03)" }}
              >
                <ScoreCell
                  score={regionScore ? regionScore.score : null}
                  color={r.color}
                  delay={0.15 + rowIdx * 0.06 + colIdx * 0.04}
                />
              </div>
            );
          })}
        </motion.div>
      ))}

      {/* Summary row: averages */}
      <motion.div
        className="grid items-center"
        style={{
          gridTemplateColumns: `180px repeat(${regions.length}, 1fr)`,
          background: "rgba(0,229,255,0.04)",
          borderTop: "1px solid rgba(0,229,255,0.1)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="px-4 py-2.5">
          <span
            className="text-[13px] font-bold tracking-[0.12em] uppercase"
            style={{
              color: "var(--neon-cyan)",
              fontFamily: "var(--font-orbitron)",
            }}
          >
            Composite
          </span>
        </div>
        {regions.map((r) => {
          const avg =
            r.scores.length > 0
              ? Math.round(
                  r.scores.reduce((sum, s) => sum + s.score, 0) /
                    r.scores.length
                )
              : null;
          return (
            <div
              key={r.region}
              className="px-3 py-2.5"
              style={{ borderLeft: "1px solid rgba(255,255,255,0.04)" }}
            >
              <span
                className="text-[16px] font-extrabold"
                style={{
                  fontFamily: "var(--font-orbitron)",
                  color: r.color,
                  textShadow: `0 0 10px ${r.color}40`,
                }}
              >
                {avg ?? "--"}
              </span>
              <span
                className="text-[12px] ml-1"
                style={{ color: "var(--text-dim)" }}
              >
                / 100
              </span>
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

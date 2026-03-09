"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { GameStats } from "../engine/GameCanvas";

interface PauseMenuProps {
  visible: boolean;
  stats: GameStats | null;
  onResume: () => void;
  onQuit: () => void;
}

export default function PauseMenu({
  visible,
  stats,
  onResume,
  onQuit,
}: PauseMenuProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(6,8,13,0.8)",
              backdropFilter: "blur(6px)",
            }}
          />

          <motion.div
            className="relative z-10 glass-panel w-80 p-6 flex flex-col items-center gap-5"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2
              className="text-xl font-bold tracking-[0.3em] uppercase"
              style={{
                fontFamily: "var(--font-orbitron)",
                color: "var(--accent)",
              }}
            >
              PAUSED
            </h2>

            {/* Stats */}
            {stats && (
              <div
                className="w-full flex flex-col gap-2 py-3 border-t border-b"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <StatRow label="TIME" value={formatTime(stats.time)} />
                <StatRow
                  label="SCORE"
                  value={stats.score.toLocaleString()}
                  color="var(--accent)"
                />
                <StatRow
                  label="LEVEL"
                  value={`${stats.level}`}
                  color="#39ff7f"
                />
                <StatRow label="KILLS" value={`${stats.kills}`} />
                <StatRow
                  label="DEBRIS"
                  value={`${stats.debrisCollected}`}
                  color="#ffcc00"
                />
                <StatRow label="WEAPONS" value={`${stats.weapons.length}`} />
              </div>
            )}

            {/* Weapons list */}
            {stats && stats.weapons.length > 0 && (
              <div className="w-full flex flex-col gap-1">
                <span
                  className="text-[13px] tracking-[0.2em] uppercase"
                  style={{ color: "var(--text-dim)" }}
                >
                  EQUIPPED
                </span>
                {stats.weapons.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between text-[13px]"
                  >
                    <span style={{ color: w.color }}>{w.name}</span>
                    <span style={{ color: "var(--text-dim)" }}>
                      Lv.{w.level}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col gap-2 w-full">
              <button
                className="cyber-btn w-full pointer-events-auto"
                onClick={onResume}
              >
                RESUME
              </button>
              <button
                className="cyber-btn w-full pointer-events-auto"
                style={
                  {
                    "--accent": "#ff3a8c",
                    borderColor: "rgba(255,58,140,0.25)",
                    color: "#ff3a8c",
                  } as React.CSSProperties
                }
                onClick={onQuit}
              >
                QUIT
              </button>
            </div>

            <span className="text-[14px]" style={{ color: "var(--text-dim)" }}>
              Press P or ESC to resume
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span
        className="text-[14px] tracking-[0.15em] uppercase"
        style={{ color: "var(--text-dim)" }}
      >
        {label}
      </span>
      <span
        className="text-[14px] font-bold tabular-nums"
        style={{
          color: color || "var(--text-primary)",
          fontFamily: "var(--font-fira-code)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

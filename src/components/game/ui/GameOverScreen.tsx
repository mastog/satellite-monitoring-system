"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface GameOverScreenProps {
  visible: boolean;
  isAuthenticated: boolean;
  score: number;
  time: number;
  level: number;
  kills: number;
  debris: number;
  weapons: string[];
  highScores: number[];
  onRestart: () => void;
  onQuit: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function GameOverScreen({
  visible,
  isAuthenticated,
  score,
  time,
  level,
  kills,
  debris,
  weapons,
  highScores,
  onRestart,
  onQuit,
}: GameOverScreenProps) {
  const [showStats, setShowStats] = useState(false);
  const isNewHigh =
    isAuthenticated && (highScores.length === 0 || score > highScores[0]);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setShowStats(true), 600);
      return () => clearTimeout(t);
    }
    setShowStats(false);
  }, [visible]);

  const stats = [
    {
      label: "SCORE",
      value: score.toLocaleString(),
      color: "var(--accent)",
      delay: 0,
    },
    {
      label: "TIME SURVIVED",
      value: formatTime(time),
      color: "var(--text-primary)",
      delay: 0.1,
    },
    { label: "LEVEL REACHED", value: `${level}`, color: "#39ff7f", delay: 0.2 },
    {
      label: "ENEMIES DESTROYED",
      value: `${kills}`,
      color: "#ff6b2c",
      delay: 0.3,
    },
    {
      label: "DEBRIS COLLECTED",
      value: `${debris}`,
      color: "#ffcc00",
      delay: 0.4,
    },
    {
      label: "WEAPONS USED",
      value: `${weapons.length}`,
      color: "#b44aff",
      delay: 0.5,
    },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(6,8,13,0.92)" }}
          />

          <motion.div
            className="relative z-10 flex flex-col items-center gap-6 max-w-md w-full px-6"
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Title */}
            <motion.div
              className="text-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h2
                className="text-3xl font-bold tracking-[0.3em] uppercase"
                style={{
                  fontFamily: "var(--font-orbitron)",
                  color: "var(--accent)",
                }}
              >
                MISSION OVER
              </h2>
              {isNewHigh && (
                <motion.div
                  className="mt-2 text-[14px] tracking-[0.2em] uppercase"
                  style={{ color: "#ffcc00" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  NEW HIGH SCORE!
                </motion.div>
              )}
            </motion.div>

            {/* Reveals the final run statistics one row at a time so the results screen reads like a post-run summary. */}
            {showStats && (
              <div className="w-full glass-panel p-5 flex flex-col gap-3">
                {stats.map((s) => (
                  <motion.div
                    key={s.label}
                    className="flex justify-between items-center"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{
                      delay: s.delay,
                      duration: 0.4,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <span
                      className="text-[14px] tracking-[0.15em] uppercase"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {s.label}
                    </span>
                    <span
                      className="text-[18px] font-bold tabular-nums"
                      style={{
                        color: s.color,
                        fontFamily: "var(--font-orbitron)",
                      }}
                    >
                      {s.value}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Shows the persisted leaderboard and highlights the current run when it placed on the board. */}
            {isAuthenticated && highScores.length > 0 && (
              <motion.div
                className="w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <div
                  className="text-[13px] tracking-[0.2em] uppercase mb-2"
                  style={{ color: "var(--text-dim)" }}
                >
                  PERSONAL TOP SCORES
                </div>
                <div className="flex flex-col gap-1">
                  {highScores.slice(0, 5).map((hs, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-[13px] px-2 py-1 rounded"
                      style={{
                        background:
                          hs === score
                            ? "color-mix(in srgb, var(--accent) 8%, transparent)"
                            : "transparent",
                        border:
                          hs === score
                            ? "1px solid color-mix(in srgb, var(--accent) 15%, transparent)"
                            : "1px solid transparent",
                        fontFamily: "var(--font-fira-code)",
                      }}
                    >
                      <span style={{ color: "var(--text-dim)" }}>#{i + 1}</span>
                      <span
                        style={{
                          color:
                            hs === score
                              ? "var(--accent)"
                              : "var(--text-secondary)",
                        }}
                      >
                        {hs.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Presents the actions that let the player start another run or leave the results screen. */}
            <motion.div
              className="flex gap-3 w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <button
                className="cyber-btn flex-1 pointer-events-auto"
                onClick={onRestart}
              >
                PLAY AGAIN
              </button>
              <button
                className="cyber-btn flex-1 pointer-events-auto"
                style={
                  {
                    "--accent": "#ff3a8c",
                    borderColor: "rgba(255,58,140,0.25)",
                    color: "#ff3a8c",
                  } as React.CSSProperties
                }
                onClick={onQuit}
              >
                EXIT
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

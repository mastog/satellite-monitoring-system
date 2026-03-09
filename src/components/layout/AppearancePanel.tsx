"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const ACCENT_COLORS = [
  { id: "cyan", label: "CYAN", color: "#00e5ff" },
  { id: "orange", label: "EMBER", color: "#ff6b2c" },
  { id: "purple", label: "VIOLET", color: "#b44aff" },
  { id: "green", label: "MATRIX", color: "#39ff7f" },
  { id: "rose", label: "ROSE", color: "#ff3a8c" },
] as const;

const SCALE_MIN = 0.85;
const SCALE_MAX = 1.3;
const SCALE_STEP = 0.05;
const TICK_MARKS = [0.85, 1.0, 1.15, 1.3];

interface AppearancePanelProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
  onAccentColorChange: (color: string) => void;
  uiScale: number;
  onUiScaleChange: (scale: number) => void;
  toggleRef?: React.RefObject<HTMLButtonElement | null>;
}

export default function AppearancePanel({
  isOpen,
  onClose,
  accentColor,
  onAccentColorChange,
  uiScale,
  onUiScaleChange,
  toggleRef,
}: AppearancePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (toggleRef?.current?.contains(target)) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [isOpen, onClose]);

  const scalePercent = Math.round((uiScale ?? 1) * 100);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-full right-0 mt-2 w-[300px] rounded-xl z-[60]"
          style={{
            background: "#0b0f18",
            border: "var(--glass-border)",
            boxShadow: "var(--glass-shadow)",
          }}
        >
          {/* Top accent line */}
          <div
            className="absolute top-0 left-4 right-4 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--accent-glow), transparent)",
            }}
          />

          {/* Header */}
          <div
            className="px-4 pt-3 pb-2 flex items-center gap-2"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "var(--accent)",
                boxShadow: "0 0 6px var(--accent-glow)",
              }}
            />
            <span
              className="text-[14px] font-bold tracking-[0.18em] uppercase"
              style={{
                color: "var(--text-secondary)",
                fontFamily: "var(--font-orbitron)",
              }}
            >
              APPEARANCE
            </span>
          </div>

          <div className="px-4 pt-4 pb-5 flex flex-col gap-5">
            {/* ── Accent Color Section ── */}
            <div>
              <div
                className="text-[12px] font-bold tracking-[0.16em] uppercase mb-3"
                style={{
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-fira-code)",
                }}
              >
                ACCENT COLOR
              </div>
              <div className="flex items-center justify-between px-1">
                {ACCENT_COLORS.map((ac) => {
                  const isActive = accentColor === ac.id;
                  return (
                    <button
                      key={ac.id}
                      onClick={() => onAccentColorChange(ac.id)}
                      className="relative flex flex-col items-center gap-2 cursor-pointer"
                    >
                      <div
                        className="w-7 h-7 rounded-full transition-all duration-200"
                        style={{
                          background: ac.color,
                          boxShadow: isActive
                            ? `0 0 12px ${ac.color}80, 0 0 24px ${ac.color}40, inset 0 0 6px ${ac.color}60`
                            : `0 0 4px ${ac.color}30`,
                          border: isActive
                            ? `2px solid ${ac.color}`
                            : "2px solid transparent",
                          transform: isActive ? "scale(1.15)" : "scale(1)",
                          opacity: isActive ? 1 : 0.55,
                        }}
                      />
                      {isActive && (
                        <motion.span
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-[10px] font-bold tracking-[0.12em]"
                          style={{
                            color: ac.color,
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          {ac.label}
                        </motion.span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── UI Scale Section ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div
                  className="text-[12px] font-bold tracking-[0.16em] uppercase"
                  style={{
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-fira-code)",
                  }}
                >
                  UI SCALE
                </div>
                <span
                  className="text-[15px] font-bold tabular-nums"
                  style={{
                    color: "var(--accent)",
                    fontFamily: "var(--font-fira-code)",
                  }}
                >
                  {scalePercent}%
                </span>
              </div>

              {/* Slider — thumb is 14px, so its center is inset 7px from each edge.
                  We pad the wrapper by 7px so that tick marks at 0%/100%
                  line up exactly with the thumb center at min/max. */}
              <div className="relative" style={{ padding: "0 7px" }}>
                <input
                  type="range"
                  min={SCALE_MIN}
                  max={SCALE_MAX}
                  step={SCALE_STEP}
                  value={uiScale ?? 1}
                  onChange={(e) => onUiScaleChange(parseFloat(e.target.value))}
                  className="ui-scale-slider"
                  style={{ margin: "0 -7px", width: "calc(100% + 14px)" }}
                />

                {/* Tick marks — positioned within the padded area so they
                    align with the slider thumb center at each value */}
                <div className="relative mt-2" style={{ height: 24 }}>
                  {TICK_MARKS.map((tick) => {
                    const pct =
                      ((tick - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;
                    const isActive = Math.abs(tick - (uiScale ?? 1)) < 0.01;
                    return (
                      <div
                        key={tick}
                        className="absolute flex flex-col items-center"
                        style={{
                          left: `${pct}%`,
                          transform: "translateX(-50%)",
                          top: 0,
                        }}
                      >
                        <div
                          className="w-px"
                          style={{
                            height: 5,
                            background: isActive
                              ? "var(--accent)"
                              : "var(--text-dim)",
                            opacity: isActive ? 1 : 0.45,
                          }}
                        />
                        <span
                          className="text-[11px] mt-0.5 whitespace-nowrap"
                          style={{
                            color: isActive
                              ? "var(--accent)"
                              : "var(--text-dim)",
                            fontFamily: "var(--font-fira-code)",
                            opacity: isActive ? 1 : 0.7,
                          }}
                        >
                          {Math.round(tick * 100)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reset button */}
              {Math.abs((uiScale ?? 1) - 1) > 0.01 && (
                <motion.button
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => onUiScaleChange(1)}
                  className="mt-5 w-full text-[12px] font-bold tracking-[0.14em] uppercase py-1.5 rounded-md transition-all duration-200 cursor-pointer"
                  style={{
                    color: "var(--accent)",
                    background: "var(--accent-dim)",
                    border:
                      "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                  }}
                >
                  RESET TO 100%
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

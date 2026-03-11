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

// Defines the compact film-grade presets previewed inside the appearance panel.
const CINEMATIC_FILTERS = [
  {
    id: "standard",
    label: "STD",
    chip: "NEUTRAL",
    gradient:
      "linear-gradient(135deg, rgba(0,229,255,0.32) 0%, rgba(16,23,38,0.9) 46%, rgba(255,58,140,0.2) 100%)",
  },
  {
    id: "monochrome",
    label: "MONO",
    chip: "B&W",
    gradient:
      "linear-gradient(135deg, rgba(244,247,252,0.44) 0%, rgba(128,138,155,0.24) 28%, rgba(9,11,15,0.94) 100%)",
  },
  {
    id: "noir",
    label: "NOIR",
    chip: "AMBER",
    gradient:
      "linear-gradient(135deg, rgba(255,208,128,0.46) 0%, rgba(63,40,21,0.68) 36%, rgba(8,8,10,0.96) 100%)",
  },
  {
    id: "bleach",
    label: "BLEACH",
    chip: "DRY",
    gradient:
      "linear-gradient(135deg, rgba(255,245,214,0.4) 0%, rgba(198,210,227,0.26) 40%, rgba(26,30,40,0.92) 100%)",
  },
] as const;

interface AppearancePanelProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
  onAccentColorChange: (color: string) => void;
  cinematicFilter: (typeof CINEMATIC_FILTERS)[number]["id"];
  onCinematicFilterChange: (
    filter: (typeof CINEMATIC_FILTERS)[number]["id"]
  ) => void;
  toggleRef?: React.RefObject<HTMLButtonElement | null>;
}

// Renders the shell customization panel.
export default function AppearancePanel({
  isOpen,
  onClose,
  accentColor,
  onAccentColorChange,
  cinematicFilter,
  onCinematicFilterChange,
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
  }, [isOpen, onClose, toggleRef]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute right-0 top-[calc(100%+8px)] w-80 rounded-xl overflow-hidden z-[100]"
          style={{
            background:
              "linear-gradient(180deg, rgba(6,8,13,0.97) 0%, rgba(10,14,24,0.97) 100%)",
            border: "1px solid rgba(0,229,255,0.15)",
            backdropFilter: "blur(20px)",
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.6), 0 0 1px rgba(0,229,255,0.3)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: "var(--accent)",
                  boxShadow: "0 0 6px var(--accent-glow)",
                }}
              />
              <span
                className="text-[13px] font-bold tracking-[0.15em] uppercase"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-orbitron)",
                }}
              >
                APPEARANCE
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-[12px] p-0.5 transition-colors"
              style={{ color: "var(--text-dim)" }}
              aria-label="Close appearance panel"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Renders the accent color selector. */}
            <div>
              <div
                className="text-[12px] font-bold tracking-[0.18em] uppercase mb-3"
                style={{
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-orbitron)",
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
                        className="w-8 h-8 rounded-full transition-all duration-200"
                        style={{
                          background: ac.color,
                          boxShadow: isActive
                            ? `0 0 14px ${ac.color}85, 0 0 26px ${ac.color}42, inset 0 0 8px ${ac.color}66`
                            : `0 0 6px ${ac.color}38`,
                          border: isActive
                            ? `2px solid ${ac.color}`
                            : "2px solid transparent",
                          transform: isActive ? "scale(1.12)" : "scale(1)",
                          opacity: isActive ? 1 : 0.58,
                        }}
                      />
                      <span
                        className="text-[10px] font-bold tracking-[0.14em]"
                        style={{
                          color: isActive ? ac.color : "var(--text-dim)",
                          fontFamily: "var(--font-fira-code)",
                        }}
                      >
                        {ac.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Renders the cinematic filter preset grid. */}
            <div>
              <div
                className="text-[12px] font-bold tracking-[0.18em] uppercase mb-3"
                style={{
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-orbitron)",
                }}
              >
                CINEMATIC FILTER
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {CINEMATIC_FILTERS.map((preset, index) => {
                  const isActive = preset.id === cinematicFilter;
                  return (
                    <motion.button
                      key={preset.id}
                      onClick={() => onCinematicFilterChange(preset.id)}
                      className="group relative overflow-hidden rounded-xl p-2.5 text-left transition-colors"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * index }}
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(11,15,24,0.9) 0%, rgba(8,11,18,0.94) 100%)",
                        border: isActive
                          ? "1px solid rgba(0,229,255,0.22)"
                          : "1px solid rgba(255,255,255,0.06)",
                        boxShadow: isActive
                          ? "0 0 0 1px rgba(0,229,255,0.08) inset"
                          : "none",
                      }}
                    >
                      <div
                        className="absolute inset-0 opacity-80 transition-opacity duration-200 group-hover:opacity-95"
                        style={{ background: preset.gradient }}
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "repeating-linear-gradient(180deg, transparent 0px, transparent 5px, rgba(255,255,255,0.05) 5px, rgba(255,255,255,0.05) 6px)",
                          mixBlendMode: "screen",
                          opacity: isActive ? 0.32 : 0.16,
                        }}
                      />
                      <div
                        className="relative h-16 rounded-lg overflow-hidden"
                        style={{
                          border: "1px solid rgba(255,255,255,0.08)",
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))",
                        }}
                      >
                        <div
                          className="absolute inset-x-2 top-2 h-px"
                          style={{
                            background:
                              "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
                            opacity: 0.55,
                          }}
                        />
                        <div
                          className="absolute left-2 right-2 bottom-2 flex items-center justify-between"
                        >
                          <div
                            className="text-[11px] font-bold tracking-[0.18em] uppercase"
                            style={{
                              color: "#f3f6fb",
                              fontFamily: "var(--font-orbitron)",
                            }}
                          >
                            {preset.label}
                          </div>
                          <div
                            className="rounded-full px-1.5 py-0.5 text-[9px] tracking-[0.14em] uppercase"
                            style={{
                              color: "rgba(243,246,251,0.88)",
                              background: "rgba(6,8,13,0.26)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              fontFamily: "var(--font-fira-code)",
                            }}
                          >
                            {preset.chip}
                          </div>
                        </div>
                      </div>
                      <div className="relative mt-2 flex items-center justify-between">
                        <div
                          className="flex items-center gap-1.5"
                        >
                          <span
                            className="h-1.5 w-10 rounded-full"
                            style={{
                              background:
                                "linear-gradient(90deg, rgba(255,255,255,0.74), rgba(255,255,255,0.14))",
                            }}
                          />
                          <span
                            className="h-1.5 w-4 rounded-full"
                            style={{
                              background:
                                "linear-gradient(90deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1))",
                            }}
                          />
                        </div>
                        <div
                          className="h-2.5 w-2.5 rounded-full border"
                          style={{
                            borderColor: isActive
                              ? "var(--accent)"
                              : "rgba(255,255,255,0.35)",
                            background: isActive
                              ? "var(--accent)"
                              : "transparent",
                            boxShadow: isActive
                              ? "0 0 12px var(--accent-glow)"
                              : "none",
                          }}
                        />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

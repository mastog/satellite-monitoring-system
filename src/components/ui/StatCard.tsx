"use client";

import { motion } from "framer-motion";
import InfoIcon from "./InfoIcon";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  accentColor?: string;
  delay?: number;
  icon?: React.ReactNode;
  description?: string;
}

export default function StatCard({
  label,
  value,
  unit,
  accentColor = "var(--neon-cyan)",
  delay = 0,
  icon,
  description,
}: StatCardProps) {
  return (
    <motion.div
      className="glass-panel holo-shimmer relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ padding: "16px 20px" }}
    >
      {/* Draws a thin accent strip that ties the card to its metric color. */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, ${accentColor}, transparent)`,
        }}
      />

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="text-[15px] font-bold tracking-[0.15em] uppercase"
              style={{ color: "var(--text-dim)" }}
            >
              {label}
            </span>
            {description && <InfoIcon text={description} position="bottom" />}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-2xl font-extrabold stat-value"
              style={{
                fontFamily: "var(--font-orbitron)",
                color: accentColor,
                textShadow: `0 0 20px ${accentColor}40`,
              }}
            >
              {value}
            </span>
            {unit && (
              <span
                className="text-[14px] font-semibold tracking-wider uppercase"
                style={{ color: "var(--text-dim)" }}
              >
                {unit}
              </span>
            )}
          </div>
        </div>
        {icon && <div style={{ color: accentColor, opacity: 0.4 }}>{icon}</div>}
      </div>
    </motion.div>
  );
}

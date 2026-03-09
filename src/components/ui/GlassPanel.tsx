"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlassPanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
  accentColor?: string;
  compact?: boolean;
  noPadding?: boolean;
  fill?: boolean;
}

export default function GlassPanel({
  title,
  children,
  className = "",
  delay = 0,
  accentColor = "var(--neon-cyan)",
  compact = false,
  noPadding = false,
  fill = false,
}: GlassPanelProps) {
  const contentPadding = noPadding ? "" : compact ? "p-3" : "p-4";
  const contentFill = fill ? "flex-1 min-h-0" : "";

  return (
    <motion.div
      className={`glass-panel holo-shimmer ${fill ? "h-full flex flex-col" : ""} ${className}`}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {title && (
        <div className="panel-header">
          <div
            className="dot"
            style={{
              background: accentColor,
              boxShadow: `0 0 8px ${accentColor}`,
            }}
          />
          <span>{title}</span>
        </div>
      )}
      <div className={`${contentPadding} ${contentFill}`.trim()}>
        {children}
      </div>
    </motion.div>
  );
}

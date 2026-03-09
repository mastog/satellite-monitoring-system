"use client";

import { motion } from "framer-motion";
import type { ClimateEvent } from "@/lib/climate/data";
import {
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
} from "@/lib/climate/data";

interface EventCardProps {
  event: ClimateEvent;
  onClick: (event: ClimateEvent) => void;
  delay?: number;
  onHover?: (id: string | null) => void;
  isHovered?: boolean;
}

// Renders one compact climate event card inside the monitoring feed.
export default function EventCard({
  event,
  onClick,
  delay = 0,
  onHover,
  isHovered,
}: EventCardProps) {
  const color = EVENT_TYPE_COLORS[event.type];

  return (
    <motion.div
      className="cursor-pointer overflow-hidden rounded-lg relative"
      style={{
        background: isHovered ? "rgba(6,8,13,0.85)" : "rgba(6,8,13,0.5)",
        border: `1px solid ${isHovered ? `${color}35` : `${color}10`}`,
        backdropFilter: "blur(4px)",
        boxShadow: isHovered
          ? `0 0 16px ${color}12, inset 0 1px 0 ${color}08`
          : "none",
        transition: "background 0.2s, border-color 0.2s, box-shadow 0.2s",
      }}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onClick(event)}
      onMouseEnter={() => onHover?.(event.id)}
      onMouseLeave={() => onHover?.(null)}
      whileHover={{ scale: 1.015, y: -1 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex">
        {/* Uses the accent rail to encode event type color and pulse when the event is active. */}
        <div
          className="w-[3px] flex-shrink-0 rounded-l"
          style={{
            background: `linear-gradient(180deg, ${color}, ${color}20)`,
            animation:
              event.status === "active"
                ? "clm-breathe 2.5s ease-in-out infinite"
                : "none",
          }}
        />

        <div className="p-2.5 flex-1 min-w-0">
          {/* Shows the event type, optional magnitude, and severity at a glance. */}
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="text-[14px] flex-shrink-0"
              style={{
                color,
                filter: `drop-shadow(0 0 3px ${color}60)`,
              }}
            >
              {EVENT_TYPE_ICONS[event.type]}
            </span>
            <span
              className="text-[11px] font-bold tracking-[0.1em] uppercase truncate"
              style={{
                color,
                fontFamily: "var(--font-exo2)",
              }}
            >
              {EVENT_TYPE_LABELS[event.type]}
            </span>

            {event.magnitude != null && (
              <span
                className="text-[11px] font-bold px-1 rounded"
                style={{
                  background: `${color}15`,
                  color,
                  fontFamily: "var(--font-fira-code)",
                }}
              >
                M{event.magnitude.toFixed(1)}
              </span>
            )}

            <div className="flex gap-[2px] ml-auto flex-shrink-0">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className="w-[6px] h-[6px] rounded-full"
                  style={{
                    background: s <= event.severity ? color : `${color}15`,
                    boxShadow:
                      s <= event.severity ? `0 0 3px ${color}50` : "none",
                  }}
                />
              ))}
            </div>
          </div>

          <div
            className="text-[14px] font-semibold truncate mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            {event.title}
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-[11px]"
              style={{
                color: "var(--text-dim)",
                fontFamily: "var(--font-fira-code)",
              }}
            >
              {event.detectionDate}
            </span>
            <span
              className="text-[11px] truncate"
              style={{ color: "var(--text-dim)" }}
            >
              {event.detectingSatellite}
            </span>
            <span
              className="ml-auto text-[10px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded flex-shrink-0"
              style={{
                background:
                  event.status === "active"
                    ? "rgba(255,58,92,0.1)"
                    : event.status === "monitoring"
                      ? "rgba(255,213,79,0.1)"
                      : "rgba(57,255,127,0.1)",
                color:
                  event.status === "active"
                    ? "#ff3a5c"
                    : event.status === "monitoring"
                      ? "#ffd54f"
                      : "#39ff7f",
              }}
            >
              {event.status}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes clm-breathe {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </motion.div>
  );
}

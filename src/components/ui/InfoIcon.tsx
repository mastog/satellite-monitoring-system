"use client";

import Tooltip from "./Tooltip";

interface InfoIconProps {
  text: string;
  position?: "top" | "bottom" | "left" | "right";
}

export default function InfoIcon({ text, position = "top" }: InfoIconProps) {
  return (
    <Tooltip content={text} position={position}>
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-full cursor-help flex-shrink-0"
        style={{
          border: "1px solid rgba(0,229,255,0.25)",
          color: "var(--neon-cyan)",
          fontSize: "13px",
          fontWeight: 700,
          fontFamily: "var(--font-fira-code)",
          opacity: 0.6,
        }}
      >
        i
      </span>
    </Tooltip>
  );
}

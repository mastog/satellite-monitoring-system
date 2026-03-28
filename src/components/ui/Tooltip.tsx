"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface TooltipProps {
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  fullWidth?: boolean;
  followCursor?: boolean;
  children: React.ReactNode;
}

export default function Tooltip({
  content,
  position = "top",
  delay = 300,
  fullWidth = false,
  followCursor = false,
  children,
}: TooltipProps) {
  const [show, setShow] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Measures the rendered tooltip and computes a fixed-position placement that
  // keeps the bubble near the trigger while staying inside the viewport.
  useEffect(() => {
    if (!show || !triggerRef.current || !tooltipRef.current) return;
    const ttRect = tooltipRef.current.getBoundingClientRect();
    const margin = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top: number;
    let left: number;

    if (followCursor && pointerRef.current) {
      // Anchors the tooltip just below and to the right of the current pointer location.
      top = pointerRef.current.y + 10;
      left = pointerRef.current.x + 10;
    } else {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const gap = 8;

      // Uses the trigger midpoint as the initial anchor for top and bottom
      // placements before viewport clamping is applied.
      const triggerCenterX = triggerRect.left + triggerRect.width / 2;

      switch (position) {
        case "top":
          top = triggerRect.top - gap - ttRect.height;
          left = triggerCenterX;
          break;
        case "bottom":
          top = triggerRect.bottom + gap;
          left = triggerCenterX;
          break;
        case "left":
          top = triggerRect.top + triggerRect.height / 2 - ttRect.height / 2;
          left = triggerRect.left - gap - ttRect.width;
          break;
        case "right":
          top = triggerRect.top + triggerRect.height / 2 - ttRect.height / 2;
          left = triggerRect.right + gap;
          break;
        default:
          top = triggerRect.bottom + gap;
          left = triggerCenterX;
      }
    }

    if (position === "top" || position === "bottom") {
      if (left + ttRect.width > vw - margin) {
        left = vw - margin - ttRect.width;
      }
    }
    left = Math.max(margin, left);
    if (top + ttRect.height > vh - margin) {
      top = vh - margin - ttRect.height;
    }
    if (top < margin) {
      top = margin;
    }

    setStyle({ top, left, opacity: 1 });
  }, [show, position, content, followCursor]);

  const handleEnter = () => {
    timerRef.current = setTimeout(() => {
      setShow(true);
    }, delay);
  };

  const handleLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShow(false);
    setStyle({});
  };

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      if (!followCursor) return;
      pointerRef.current = { x: e.clientX, y: e.clientY };
      if (!show || !tooltipRef.current) return;
      const ttRect = tooltipRef.current.getBoundingClientRect();
      const margin = 10;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = e.clientX + 10;
      let top = e.clientY + 10;
      left = Math.max(margin, left);
      if (left + ttRect.width > vw - margin) {
        left = vw - margin - ttRect.width;
      }
      if (top + ttRect.height > vh - margin) {
        top = vh - margin - ttRect.height;
      }
      setStyle({ top, left, opacity: 1 });
    },
    [followCursor, show]
  );

  const motionOrigin = {
    top: { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 } },
    bottom: { initial: { opacity: 0, y: -4 }, animate: { opacity: 1, y: 0 } },
    left: { initial: { opacity: 0, x: 4 }, animate: { opacity: 1, x: 0 } },
    right: { initial: { opacity: 0, x: -4 }, animate: { opacity: 1, x: 0 } },
  } as const;

  const tooltipElement = (
    <AnimatePresence>
      {show && (
        <motion.div
          ref={tooltipRef}
          className="pointer-events-none"
          style={{
            position: "fixed",
            zIndex: 9999,
            top: style.top ?? -9999,
            left: style.left ?? -9999,
            opacity: style.opacity ?? 0,
            background: "rgba(11,15,24,0.95)",
            border: "1px solid rgba(0,229,255,0.2)",
            borderRadius: 6,
            padding: "6px 10px",
            backdropFilter: "blur(16px)",
            width: "max-content",
            maxWidth: 300,
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}
          initial={motionOrigin[position].initial}
          animate={motionOrigin[position].animate}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <span
            style={{
              fontSize: "14px",
              lineHeight: 1.625,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-exo2)",
              display: "block",
            }}
          >
            {content}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <span
      ref={triggerRef}
      className={fullWidth ? "flex w-full" : "inline-flex"}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseMove={handleMove}
    >
      {children}
      {mounted && createPortal(tooltipElement, document.body)}
    </span>
  );
}

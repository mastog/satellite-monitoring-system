"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView, useMotionValue, animate } from "framer-motion";

/**
 * Animates a number from zero to the requested target once the element enters
 * the viewport so key metrics reveal themselves gradually instead of changing
 * instantly.
 */
export function AnimatedCounter({
  target,
  duration = 2,
  suffix = "",
}: {
  target: number;
  duration?: number;
  suffix?: string;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const mv = useMotionValue(0);

  useEffect(() => {
    const unsub = mv.on("change", (v: number) => setValue(Math.round(v)));
    return unsub;
  }, [mv]);

  useEffect(() => {
    if (!isInView) return;
    animate(mv, target, { duration, ease: "easeOut" });
  }, [isInView, target, duration, mv]);

  return (
    <span ref={ref} style={{ fontFamily: "var(--font-orbitron)" }}>
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

/**
 * Wraps arbitrary content in a standard fade-and-slide reveal animation that
 * runs the first time the element becomes visible.
 */
export function Reveal({
  children,
  delay = 0,
  direction = "up",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right";
  className?: string;
}) {
  const initial =
    direction === "up"
      ? { opacity: 0, y: 40 }
      : direction === "left"
        ? { opacity: 0, x: -40 }
        : { opacity: 0, x: 40 };

  return (
    <motion.div
      className={className}
      initial={initial}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Renders the reusable corner bracket motif used to frame panels and cards
 * throughout the interface.
 */
export function CornerBrackets({
  color = "var(--neon-cyan)",
  size = 16,
}: {
  color?: string;
  size?: number;
}) {
  const style = { position: "absolute" as const, width: size, height: size };
  const bar = { background: color, opacity: 0.35 };
  return (
    <>
      <div style={{ ...style, top: 0, left: 0 }}>
        <div
          style={{
            ...bar,
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 1,
          }}
        />
        <div
          style={{
            ...bar,
            position: "absolute",
            top: 0,
            left: 0,
            width: 1,
            height: "100%",
          }}
        />
      </div>
      <div style={{ ...style, top: 0, right: 0 }}>
        <div
          style={{
            ...bar,
            position: "absolute",
            top: 0,
            right: 0,
            width: "100%",
            height: 1,
          }}
        />
        <div
          style={{
            ...bar,
            position: "absolute",
            top: 0,
            right: 0,
            width: 1,
            height: "100%",
          }}
        />
      </div>
      <div style={{ ...style, bottom: 0, left: 0 }}>
        <div
          style={{
            ...bar,
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: 1,
          }}
        />
        <div
          style={{
            ...bar,
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 1,
            height: "100%",
          }}
        />
      </div>
      <div style={{ ...style, bottom: 0, right: 0 }}>
        <div
          style={{
            ...bar,
            position: "absolute",
            bottom: 0,
            right: 0,
            width: "100%",
            height: 1,
          }}
        />
        <div
          style={{
            ...bar,
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 1,
            height: "100%",
          }}
        />
      </div>
    </>
  );
}

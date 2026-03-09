"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";

const NAV_LINKS: { label: string; href: string; icon: React.ReactNode }[] = [
  {
    label: "About",
    href: "/about",
    icon: (
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  {
    label: "History",
    href: "/history",
    icon: (
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    label: "Tech",
    href: "/tech",
    icon: (
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    label: "Aurora",
    href: "/aurora",
    icon: (
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
];

const EXTERNAL_LINKS = [
  { label: "UN SDGs", href: "https://sdgs.un.org/goals" },
  { label: "CelesTrak", href: "https://celestrak.org/" },
  { label: "ESA", href: "https://www.esa.int/" },
  { label: "NASA", href: "https://www.nasa.gov/" },
];

export default function Footer() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const [expanded, setExpanded] = useState(false);

  const scrollToTop = useCallback(() => {
    // The scrollable container is the <main> parent of this footer
    const main = document.querySelector("main");
    if (main) {
      main.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  return (
    <footer
      className="relative w-full flex-shrink-0"
      style={{ background: "var(--void-black, #06080d)" }}
    >
      {/* ─── Collapsed: thin luminous trigger strip ─── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="group relative w-full flex items-center justify-center cursor-pointer"
        style={{ height: 28 }}
        aria-label={expanded ? "Collapse footer" : "Expand footer"}
        type="button"
      >
        {/* Gradient luminous line */}
        <div
          className="absolute top-0 left-0 right-0 h-px transition-opacity duration-300"
          style={{
            background:
              "linear-gradient(90deg, transparent 5%, var(--accent) 25%, var(--holo-purple) 50%, var(--neon-orange) 75%, transparent 95%)",
            opacity: expanded ? 0.3 : 0.15,
          }}
        />

        {/* Pulsing glow on hover behind the line */}
        <div
          className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              "linear-gradient(90deg, transparent 10%, var(--accent) 30%, var(--holo-purple) 50%, var(--neon-orange) 70%, transparent 90%)",
            boxShadow:
              "0 0 8px var(--accent), 0 0 20px color-mix(in srgb, var(--accent) 30%, transparent)",
            filter: "blur(0.5px)",
          }}
        />

        {/* Subtle background on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--accent) 4%, transparent), transparent)",
          }}
        />

        {/* Chevron + label */}
        <div className="relative flex items-center gap-2">
          <motion.svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="var(--text-dim)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="group-hover:!stroke-[var(--accent)] transition-colors duration-200"
            style={{ display: "block" }}
          >
            <polyline points="2,6.5 5,3.5 8,6.5" />
          </motion.svg>

          <span
            className="text-[10px] tracking-[0.2em] uppercase transition-colors duration-200 select-none"
            style={{
              color: "var(--text-dim)",
              fontFamily: "var(--font-fira-code)",
              opacity: 0.5,
            }}
          >
            {expanded ? "CLOSE" : "SMS"}
          </span>
        </div>
      </button>

      {/* ─── Expanded panel ─── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
            style={{
              background: "var(--void-black, #06080d)",
            }}
          >
            <div className="max-w-6xl mx-auto px-6 pt-4 pb-5">
              <div className="flex items-start justify-between gap-8 flex-wrap">
                {/* Left: Brand mark */}
                <motion.div
                  className="min-w-0"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.08 }}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    {/* Mini orbit icon */}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle
                        cx="8"
                        cy="8"
                        r="5"
                        stroke="var(--accent)"
                        strokeWidth="0.6"
                        opacity="0.4"
                      />
                      <circle
                        cx="8"
                        cy="8"
                        r="1.5"
                        fill="var(--accent)"
                        opacity="0.7"
                      />
                      <ellipse
                        cx="8"
                        cy="8"
                        rx="7"
                        ry="2.5"
                        stroke="var(--accent)"
                        strokeWidth="0.5"
                        opacity="0.25"
                        transform="rotate(-25 8 8)"
                      />
                    </svg>
                    <div
                      className="text-[12px] font-bold tracking-[0.25em]"
                      style={{
                        fontFamily: "var(--font-orbitron)",
                        color: "var(--accent)",
                      }}
                    >
                      SMS
                    </div>
                  </div>
                  <div
                    className="text-[11px] tracking-wider leading-relaxed"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Satellite Monitoring System
                  </div>
                </motion.div>

                {/* Center: Nav links with icons */}
                <motion.nav
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.12 }}
                >
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-[11px] font-bold tracking-[0.12em] uppercase transition-all duration-200 hover:!text-[var(--accent)] flex items-center gap-1"
                      style={{
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-fira-code)",
                      }}
                    >
                      {link.icon}
                      {link.label}
                    </Link>
                  ))}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="text-[11px] font-bold tracking-[0.12em] uppercase transition-all duration-200 hover:!text-[var(--accent)] flex items-center gap-1"
                      style={{
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-fira-code)",
                      }}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      Admin
                    </Link>
                  )}

                  {/* Divider */}
                  <span
                    className="w-px h-3 inline-block"
                    style={{ background: "var(--border-subtle)" }}
                  />

                  {/* Scroll to top */}
                  <button
                    onClick={scrollToTop}
                    type="button"
                    className="text-[11px] font-bold tracking-[0.12em] uppercase transition-all duration-200 hover:!text-[var(--accent)] flex items-center gap-1 cursor-pointer"
                    style={{
                      color: "var(--text-dim)",
                      fontFamily: "var(--font-fira-code)",
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="18 15 12 9 6 15" />
                      <line x1="6" y1="4" x2="18" y2="4" />
                    </svg>
                    Top
                  </button>
                </motion.nav>

                {/* Right: External links + copyright */}
                <motion.div
                  className="text-right"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.16 }}
                >
                  <div className="flex items-center gap-3 mb-2 justify-end">
                    {EXTERNAL_LINKS.map((link, i) => (
                      <span key={link.href} className="flex items-center gap-3">
                        {i > 0 && (
                          <span
                            className="w-px h-2.5 inline-block"
                            style={{ background: "var(--border-subtle)" }}
                          />
                        )}
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] tracking-[0.1em] uppercase transition-all duration-200 hover:!text-[var(--accent)]"
                          style={{
                            color: "var(--text-dim)",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          {link.label}
                        </a>
                      </span>
                    ))}
                  </div>
                  <div
                    className="text-[10px] tracking-wider"
                    style={{ color: "var(--text-dim)", opacity: 0.4 }}
                  >
                    &copy; {new Date().getFullYear()} SMS &mdash; Open satellite
                    data for sustainable development
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </footer>
  );
}

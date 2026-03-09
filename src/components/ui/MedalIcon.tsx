"use client";

/**
 * Themed SVG medal icons matching the sci-fi dark space aesthetic.
 * Each icon is a compact, monochrome SVG that takes color from its parent.
 */

interface MedalIconProps {
  medalId: string;
  size?: number;
  className?: string;
}

/**
 * Renders a themed SVG icon for the given medal ID.
 * Uses `currentColor` so color is inherited from the parent element's `color` or `fill`.
 */
export default function MedalIcon({
  medalId,
  size = 20,
  className = "",
}: MedalIconProps) {
  const s = size;
  const sw = s <= 16 ? 1.8 : 1.5;

  const svgProps = {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    style: { display: "block", flexShrink: 0 },
  };

  switch (medalId) {
    // ── First Contact — satellite dish with signal arc ──
    case "1":
      return (
        <svg {...svgProps}>
          <circle cx="7" cy="17" r="2" />
          <path d="M7 15V9" />
          <path d="M7 9l8-4" />
          <path d="M13 7l2-1" />
          <path
            d="M17 3a8 8 0 0 1 1.5 10"
            strokeDasharray="2 2"
            opacity="0.6"
          />
          <path
            d="M19.5 1.5a11 11 0 0 1 2 13.5"
            strokeDasharray="2 2"
            opacity="0.35"
          />
        </svg>
      );

    // ── Night Watcher — crescent with 3 stars ──
    case "2":
      return (
        <svg {...svgProps}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          <circle cx="18" cy="5" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="20" cy="9" r="0.6" fill="currentColor" stroke="none" />
          <circle cx="16" cy="3" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      );

    // ── Constellation — 5 connected star-nodes ──
    case "7":
      return (
        <svg {...svgProps}>
          <line x1="5" y1="6" x2="12" y2="4" opacity="0.5" />
          <line x1="12" y1="4" x2="19" y2="8" opacity="0.5" />
          <line x1="12" y1="4" x2="8" y2="14" opacity="0.5" />
          <line x1="8" y1="14" x2="17" y2="18" opacity="0.5" />
          <line x1="19" y1="8" x2="17" y2="18" opacity="0.5" />
          <circle cx="5" cy="6" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="12" cy="4" r="2" fill="currentColor" stroke="none" />
          <circle cx="19" cy="8" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="8" cy="14" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="17" cy="18" r="1.8" fill="currentColor" stroke="none" />
        </svg>
      );

    // ── Orbital Fleet — triple orbit rings ──
    case "8":
      return (
        <svg {...svgProps}>
          <circle
            cx="12"
            cy="12"
            r="2.5"
            fill="currentColor"
            stroke="none"
            opacity="0.7"
          />
          <ellipse
            cx="12"
            cy="12"
            rx="9"
            ry="3.5"
            transform="rotate(-30 12 12)"
          />
          <ellipse
            cx="12"
            cy="12"
            rx="9"
            ry="3.5"
            transform="rotate(30 12 12)"
          />
          <ellipse
            cx="12"
            cy="12"
            rx="9"
            ry="3.5"
            transform="rotate(90 12 12)"
          />
          <circle
            cx="19.5"
            cy="7"
            r="1"
            fill="currentColor"
            stroke="none"
            opacity="0.8"
          />
          <circle
            cx="4.5"
            cy="9"
            r="0.8"
            fill="currentColor"
            stroke="none"
            opacity="0.6"
          />
          <circle
            cx="14"
            cy="20.5"
            r="0.8"
            fill="currentColor"
            stroke="none"
            opacity="0.6"
          />
        </svg>
      );

    // ── ISS Spotter — station silhouette with solar panels ──
    case "4":
      return (
        <svg {...svgProps}>
          <rect x="9" y="10" width="6" height="4" rx="1" />
          <line x1="3" y1="9" x2="3" y2="15" />
          <line x1="3" y1="12" x2="9" y2="12" />
          <line x1="21" y1="9" x2="21" y2="15" />
          <line x1="15" y1="12" x2="21" y2="12" />
          <rect
            x="1"
            y="9"
            width="4"
            height="6"
            rx="0.5"
            fill="currentColor"
            stroke="none"
            opacity="0.15"
          />
          <rect
            x="19"
            y="9"
            width="4"
            height="6"
            rx="0.5"
            fill="currentColor"
            stroke="none"
            opacity="0.15"
          />
          <circle
            cx="12"
            cy="6"
            r="0.6"
            fill="currentColor"
            stroke="none"
            opacity="0.5"
          />
          <line
            x1="12"
            y1="6.6"
            x2="12"
            y2="10"
            strokeWidth="1"
            opacity="0.4"
          />
        </svg>
      );

    // ── Storm Watcher — cloud with lightning bolt ──
    case "9":
      return (
        <svg {...svgProps}>
          <path d="M19 16.9A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 3 16.3" />
          <polyline points="13 11 10 17 15 17 12 23" fill="none" />
        </svg>
      );

    // ── Navigator — compass crosshair ──
    case "10":
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="3" x2="12" y2="7" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <line x1="3" y1="12" x2="7" y2="12" />
          <line x1="17" y1="12" x2="21" y2="12" />
          <polygon
            points="12,4 10.5,8 13.5,8"
            fill="currentColor"
            stroke="none"
            opacity="0.7"
          />
        </svg>
      );

    // ── SDG Champion — globe with orbital ring ──
    case "5":
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3.6 9h16.8" opacity="0.4" />
          <path d="M3.6 15h16.8" opacity="0.4" />
          <ellipse cx="12" cy="12" rx="4" ry="9" />
          <line x1="12" y1="3" x2="12" y2="21" opacity="0.3" />
        </svg>
      );

    // ── Data Scholar — line chart ascending ──
    case "3":
      return (
        <svg {...svgProps}>
          <polyline points="4 19 8 14 12 16 16 9 20 5" />
          <circle cx="8" cy="14" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="16" cy="9" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="20" cy="5" r="1.2" fill="currentColor" stroke="none" />
          <line x1="4" y1="4" x2="4" y2="20" opacity="0.3" />
          <line x1="4" y1="20" x2="21" y2="20" opacity="0.3" />
        </svg>
      );

    // ── Community Voice — broadcast signal waves ──
    case "6":
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="14" r="3" />
          <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" />
          <path d="M7.5 9.5a6.5 6.5 0 0 1 9 0" />
          <path d="M5 7a10 10 0 0 1 14 0" opacity="0.6" />
          <path d="M2.5 4.5a14 14 0 0 1 19 0" opacity="0.3" />
        </svg>
      );

    // ── Indicator Analyst — magnifying glass with data bar ──
    case "11":
      return (
        <svg {...svgProps}>
          <circle cx="10" cy="10" r="7" />
          <line x1="15.5" y1="15.5" x2="21" y2="21" />
          <line x1="7" y1="12" x2="7" y2="8" strokeWidth="1.8" opacity="0.6" />
          <line
            x1="10"
            y1="12"
            x2="10"
            y2="6"
            strokeWidth="1.8"
            opacity="0.6"
          />
          <line
            x1="13"
            y1="12"
            x2="13"
            y2="9"
            strokeWidth="1.8"
            opacity="0.6"
          />
        </svg>
      );

    // Renders the megaphone medal icon used for broadcast and amplification achievements.
    case "12":
      return (
        <svg {...svgProps}>
          <line x1="12" y1="6" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
          <circle cx="12" cy="4" r="2" />
          <circle cx="12" cy="4" r="0.8" fill="currentColor" stroke="none" />
          <path
            d="M7 7.5a7 7 0 0 1 0-7"
            opacity="0.5"
            strokeDasharray="1.5 1.5"
          />
          <path
            d="M17 7.5a7 7 0 0 0 0-7"
            opacity="0.5"
            strokeDasharray="1.5 1.5"
          />
          <path
            d="M4.5 9a11 11 0 0 1 0-10"
            opacity="0.25"
            strokeDasharray="1.5 1.5"
          />
          <path
            d="M19.5 9a11 11 0 0 0 0-10"
            opacity="0.25"
            strokeDasharray="1.5 1.5"
          />
        </svg>
      );

    // Renders the fallback medal badge when no specific medal icon matches the supplied id.
    default:
      return (
        <svg {...svgProps}>
          <polygon points="12 2, 20 7, 20 17, 12 22, 4 17, 4 7" />
          <circle
            cx="12"
            cy="12"
            r="3"
            fill="currentColor"
            stroke="none"
            opacity="0.3"
          />
        </svg>
      );
  }
}

/** Map of medal ID → color for consistent themed rendering */
export const MEDAL_COLORS: Record<string, string> = {
  "1": "var(--neon-cyan)", // First Contact
  "2": "var(--holo-purple)", // Night Watcher
  "7": "var(--neon-cyan)", // Constellation
  "8": "var(--neon-orange)", // Orbital Fleet
  "4": "var(--neon-cyan)", // ISS Spotter
  "9": "var(--neon-orange)", // Storm Watcher
  "10": "var(--neon-green)", // Navigator
  "5": "var(--neon-green)", // SDG Champion
  "3": "var(--neon-cyan)", // Data Scholar
  "6": "var(--holo-purple)", // Community Voice
  "11": "var(--neon-orange)", // Indicator Analyst
  "12": "var(--holo-purple)", // Megaphone
};

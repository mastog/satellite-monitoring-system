"use client";

/**
 * General-purpose SVG line-art icon component.
 * Stroke-based (colorable via CSS color), matching the sci-fi theme.
 * Each icon uses a 24×24 viewBox with currentColor strokes.
 */

interface SvgIconProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function SvgIcon({
  name,
  size = 16,
  className = "",
  style,
}: SvgIconProps) {
  const sw = size <= 14 ? 1.8 : 1.5;

  const svgProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    style: { display: "block", flexShrink: 0, ...style },
  };

  switch (name) {
    /* Groups the icons used by game clue, telemetry, and puzzle-related UI surfaces. */

    // Renders the satellite-dish icon used for anomaly and spectral clue visuals.
    case "satellite-dish":
      return (
        <svg {...svgProps}>
          <circle cx="8" cy="16" r="2.5" />
          <path d="M8 13.5V8" />
          <path d="M8 8l9-4.5" />
          <path d="M15 5.5l2-1" />
          <path
            d="M17.5 3.5a7.5 7.5 0 0 1 1.5 9.5"
            strokeDasharray="2 2"
            opacity="0.55"
          />
          <path
            d="M20 1.5a11 11 0 0 1 2 13"
            strokeDasharray="2 2"
            opacity="0.3"
          />
        </svg>
      );

    // Renders the data-chart icon used for telemetry and analytics cues.
    case "data-chart":
      return (
        <svg {...svgProps}>
          <line x1="4" y1="4" x2="4" y2="20" opacity="0.4" />
          <line x1="4" y1="20" x2="21" y2="20" opacity="0.4" />
          <rect
            x="7"
            y="14"
            width="2.5"
            height="6"
            rx="0.5"
            fill="currentColor"
            stroke="none"
            opacity="0.25"
          />
          <rect
            x="11"
            y="10"
            width="2.5"
            height="10"
            rx="0.5"
            fill="currentColor"
            stroke="none"
            opacity="0.35"
          />
          <rect
            x="15"
            y="6"
            width="2.5"
            height="14"
            rx="0.5"
            fill="currentColor"
            stroke="none"
            opacity="0.5"
          />
          <polyline points="7 13 11.5 9 15.5 5" opacity="0.7" />
          <circle
            cx="7"
            cy="13"
            r="1"
            fill="currentColor"
            stroke="none"
            opacity="0.6"
          />
          <circle
            cx="11.5"
            cy="9"
            r="1"
            fill="currentColor"
            stroke="none"
            opacity="0.6"
          />
          <circle
            cx="15.5"
            cy="5"
            r="1"
            fill="currentColor"
            stroke="none"
            opacity="0.6"
          />
        </svg>
      );

    // Renders the people icon used for population-oriented metrics.
    case "people":
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="6" r="2.5" />
          <path d="M7 21v-2a5 5 0 0 1 10 0v2" />
          <circle cx="5" cy="9" r="2" opacity="0.55" />
          <path d="M2 21v-1.5a3.5 3.5 0 0 1 4.5-3.3" opacity="0.55" />
          <circle cx="19" cy="9" r="2" opacity="0.55" />
          <path d="M22 21v-1.5a3.5 3.5 0 0 0-4.5-3.3" opacity="0.55" />
        </svg>
      );

    // Renders the thermometer icon used for climate and temperature contexts.
    case "thermometer":
      return (
        <svg {...svgProps}>
          <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
          <circle
            cx="11.5"
            cy="18"
            r="1.5"
            fill="currentColor"
            stroke="none"
            opacity="0.5"
          />
          <line
            x1="11.5"
            y1="18"
            x2="11.5"
            y2="8"
            strokeWidth="2"
            opacity="0.35"
          />
          <line x1="16" y1="6" x2="18" y2="6" opacity="0.35" />
          <line x1="16" y1="9" x2="17.5" y2="9" opacity="0.35" />
          <line x1="16" y1="12" x2="18" y2="12" opacity="0.35" />
        </svg>
      );

    // Renders the clipboard icon used for reports, checklists, and protocol cues.
    case "clipboard":
      return (
        <svg {...svgProps}>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <line x1="9" y1="11" x2="15" y2="11" opacity="0.5" />
          <line x1="9" y1="14" x2="13" y2="14" opacity="0.5" />
          <line x1="9" y1="17" x2="15" y2="17" opacity="0.5" />
          <circle
            cx="12"
            cy="3.5"
            r="0.5"
            fill="currentColor"
            stroke="none"
            opacity="0.6"
          />
        </svg>
      );

    // Renders the lock icon used for restricted or unavailable states.
    case "lock":
      return (
        <svg {...svgProps}>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          <circle
            cx="12"
            cy="16"
            r="1.5"
            fill="currentColor"
            stroke="none"
            opacity="0.45"
          />
          <line x1="12" y1="17.5" x2="12" y2="19" opacity="0.45" />
        </svg>
      );

    /* Groups the milestone icons used by the orbital history timeline. */

    // Renders the Sputnik icon used for the first-satellite milestone.
    case "sputnik":
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="10" r="4" />
          <circle
            cx="12"
            cy="10"
            r="1.5"
            fill="currentColor"
            stroke="none"
            opacity="0.3"
          />
          <line x1="15" y1="12.5" x2="20" y2="19" />
          <line x1="14.5" y1="13.5" x2="19" y2="20.5" opacity="0.5" />
          <line x1="9" y1="12.5" x2="4" y2="19" />
          <line x1="9.5" y1="13.5" x2="5" y2="20.5" opacity="0.5" />
          <path
            d="M18 3a8 8 0 0 1 2 5"
            strokeDasharray="1.5 2"
            opacity="0.35"
          />
        </svg>
      );

    // Renders the weather-satellite icon used for meteorological mission milestones.
    case "weather-sat":
      return (
        <svg {...svgProps}>
          <rect x="9" y="8" width="6" height="5" rx="1" />
          <rect
            x="3"
            y="8.5"
            width="5"
            height="4"
            rx="0.5"
            fill="currentColor"
            stroke="none"
            opacity="0.12"
          />
          <rect
            x="16"
            y="8.5"
            width="5"
            height="4"
            rx="0.5"
            fill="currentColor"
            stroke="none"
            opacity="0.12"
          />
          <line x1="3" y1="8.5" x2="3" y2="12.5" />
          <line x1="8" y1="10.5" x2="3" y2="10.5" />
          <line x1="21" y1="8.5" x2="21" y2="12.5" />
          <line x1="16" y1="10.5" x2="21" y2="10.5" />
          <path d="M8 17c1-1.5 3-1.5 4-0.5s3 1 4-0.5" opacity="0.4" />
          <path d="M6 20c1.5-1.5 3.5-1.5 5-0.5s3.5 1 5-0.5" opacity="0.25" />
        </svg>
      );

    // Renders the Earth-scan icon used for Earth-observation milestones.
    case "earth-scan":
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="4" ry="9" opacity="0.4" />
          <path d="M3.5 9h17" opacity="0.3" />
          <path d="M3.5 15h17" opacity="0.3" />
          <line
            x1="1"
            y1="12"
            x2="23"
            y2="12"
            strokeWidth="1.2"
            opacity="0.7"
            strokeDasharray="2 1.5"
          />
          <circle
            cx="18"
            cy="12"
            r="1"
            fill="currentColor"
            stroke="none"
            opacity="0.6"
          />
        </svg>
      );

    // Renders the GPS-satellite icon used for navigation-mission milestones.
    case "gps-sat":
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="3" />
          <circle
            cx="12"
            cy="12"
            r="1"
            fill="currentColor"
            stroke="none"
            opacity="0.5"
          />
          <line x1="12" y1="9" x2="12" y2="4" />
          <line x1="12" y1="15" x2="12" y2="20" />
          <line x1="9" y1="12" x2="4" y2="12" />
          <line x1="15" y1="12" x2="20" y2="12" />
          <circle
            cx="12"
            cy="12"
            r="7"
            strokeDasharray="3 2.5"
            opacity="0.35"
          />
          <circle
            cx="12"
            cy="5"
            r="0.8"
            fill="currentColor"
            stroke="none"
            opacity="0.6"
          />
        </svg>
      );

    // Renders the radar-satellite icon used for radar-observation milestones.
    case "radar-sat":
      return (
        <svg {...svgProps}>
          <path d="M4 18C4 10 10 4 18 4" />
          <path d="M4 18C4 13 8 8 14 6" opacity="0.5" />
          <circle
            cx="4"
            cy="18"
            r="2"
            fill="currentColor"
            stroke="none"
            opacity="0.4"
          />
          <path d="M18 4l2-2" />
          <path d="M18 4l-1 3" opacity="0.5" />
          <path d="M18 4l3 1" opacity="0.5" />
          <line x1="9" y1="21" x2="21" y2="21" opacity="0.25" />
          <line x1="10" y1="18.5" x2="19" y2="18.5" opacity="0.15" />
        </svg>
      );

    // Renders the atmosphere icon used for atmospheric-monitoring milestones.
    case "atmosphere":
      return (
        <svg {...svgProps}>
          <path d="M4 20C6 14 9 10 12 10s6 4 8 10" />
          <path d="M2 20C5 12 8 7 12 7s7 5 10 13" opacity="0.45" />
          <path d="M0 20C4 10 7 4 12 4s8 6 12 16" opacity="0.2" />
          <circle
            cx="12"
            cy="18"
            r="1.5"
            fill="currentColor"
            stroke="none"
            opacity="0.4"
          />
          <line x1="12" y1="18" x2="12" y2="11" strokeWidth="1" opacity="0.3" />
        </svg>
      );

    // Renders the gravity-field icon used for gravity-mapping missions.
    case "gravity-field":
      return (
        <svg {...svgProps}>
          <circle cx="9" cy="12" r="3" />
          <circle
            cx="9"
            cy="12"
            r="1"
            fill="currentColor"
            stroke="none"
            opacity="0.35"
          />
          <circle cx="17" cy="12" r="2.5" />
          <circle
            cx="17"
            cy="12"
            r="0.8"
            fill="currentColor"
            stroke="none"
            opacity="0.35"
          />
          <path d="M6 7C9 5 15 5 18 7" opacity="0.3" strokeDasharray="1.5 2" />
          <path
            d="M6 17C9 19 15 19 18 17"
            opacity="0.3"
            strokeDasharray="1.5 2"
          />
          <line
            x1="12"
            y1="12"
            x2="14.5"
            y2="12"
            opacity="0.4"
            strokeDasharray="1 1"
          />
        </svg>
      );

    // Renders the Sentinel icon used for Copernicus-related milestones.
    case "sentinel":
      return (
        <svg {...svgProps}>
          <path d="M12 3L4 8v5c0 5.5 3.4 10.5 8 12 4.6-1.5 8-6.5 8-12V8l-8-5z" />
          <circle cx="12" cy="12" r="3" opacity="0.5" />
          <path d="M12 9v6" opacity="0.4" />
          <path d="M9 12h6" opacity="0.4" />
          <circle
            cx="12"
            cy="12"
            r="1"
            fill="currentColor"
            stroke="none"
            opacity="0.4"
          />
        </svg>
      );

    // Renders the SDG-globe icon used for Sustainable Development Goals content.
    case "sdg-globe":
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="6" />
          <ellipse cx="12" cy="12" rx="2.5" ry="6" opacity="0.4" />
          <path d="M6.2 10h11.6" opacity="0.3" />
          <path d="M6.2 14h11.6" opacity="0.3" />
          <circle
            cx="12"
            cy="12"
            r="9.5"
            strokeDasharray="1.2 2.2"
            opacity="0.4"
          />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <circle
              key={a}
              cx={12 + Math.cos((a * Math.PI) / 180) * 9.5}
              cy={12 + Math.sin((a * Math.PI) / 180) * 9.5}
              r="0.7"
              fill="currentColor"
              stroke="none"
              opacity="0.5"
            />
          ))}
        </svg>
      );

    // Renders the GRACE-FO icon used for follow-on gravity missions.
    case "gravity-follow":
      return (
        <svg {...svgProps}>
          <rect x="3" y="10" width="5" height="4" rx="1" />
          <rect x="16" y="10" width="5" height="4" rx="1" />
          <line
            x1="8"
            y1="12"
            x2="16"
            y2="12"
            strokeDasharray="2 1.5"
            opacity="0.5"
          />
          <path d="M5.5 10V7" opacity="0.4" />
          <path d="M18.5 10V7" opacity="0.4" />
          <circle
            cx="5.5"
            cy="6.5"
            r="0.6"
            fill="currentColor"
            stroke="none"
            opacity="0.5"
          />
          <circle
            cx="18.5"
            cy="6.5"
            r="0.6"
            fill="currentColor"
            stroke="none"
            opacity="0.5"
          />
          <path d="M2 18c4-2 7-4 10-4s6 2 10 4" opacity="0.2" />
        </svg>
      );

    // Renders the altimeter icon used for sea-level and height-sensing missions.
    case "altimeter":
      return (
        <svg {...svgProps}>
          <rect x="9" y="2" width="6" height="4" rx="1" />
          <line
            x1="12"
            y1="6"
            x2="12"
            y2="18"
            strokeDasharray="2 1.5"
            opacity="0.55"
          />
          <path d="M9 18l3 3 3-3" opacity="0.6" />
          <line x1="3" y1="21" x2="21" y2="21" opacity="0.3" />
          <path d="M4 21c2-2 4-3 8-3s6 1 8 3" opacity="0.2" />
          <line x1="7" y1="4" x2="9" y2="4" opacity="0.3" />
          <line x1="15" y1="4" x2="17" y2="4" opacity="0.3" />
        </svg>
      );

    // Renders the SWOT icon used for water-surface survey missions.
    case "water-survey":
      return (
        <svg {...svgProps}>
          <path d="M4 8c2-2 4-2 6 0s4 2 6 0" />
          <path d="M4 13c2-2 4-2 6 0s4 2 6 0" opacity="0.5" />
          <path d="M4 18c2-2 4-2 6 0s4 2 6 0" opacity="0.25" />
          <rect x="17" y="3" width="4" height="3" rx="0.5" />
          <line
            x1="19"
            y1="6"
            x2="19"
            y2="10"
            strokeDasharray="1 1.5"
            opacity="0.5"
          />
          <line x1="19" y1="3" x2="19" y2="1" opacity="0.4" />
          <path d="M17 2l2-1 2 1" opacity="0.35" />
        </svg>
      );

    /* Groups the concept icons used by SDG dashboards, comparisons, and community views. */

    // Renders the water-drop icon used for water-related SDG content.
    case "water-drop":
      return (
        <svg {...svgProps}>
          <path d="M12 2C12 2 6 10 6 15a6 6 0 0 0 12 0C18 10 12 2 12 2z" />
          <path d="M9 16c1-1 2.5 0 3-0.5s2 0.5 3-0.5" opacity="0.45" />
          <circle
            cx="10"
            cy="12"
            r="0.8"
            fill="currentColor"
            stroke="none"
            opacity="0.3"
          />
        </svg>
      );

    // Renders the gear icon used for industry and infrastructure content.
    case "gear":
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="3" />
          <path
            d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
            opacity="0.6"
          />
          <circle
            cx="12"
            cy="12"
            r="5.5"
            strokeDasharray="2 3.2"
            opacity="0.35"
          />
          <circle
            cx="12"
            cy="12"
            r="1.2"
            fill="currentColor"
            stroke="none"
            opacity="0.4"
          />
        </svg>
      );

    // Renders the city icon used for sustainable-cities content.
    case "city":
      return (
        <svg {...svgProps}>
          <rect x="3" y="13" width="4" height="9" rx="0.5" />
          <rect x="9" y="6" width="5" height="16" rx="0.5" />
          <rect x="16" y="10" width="4" height="12" rx="0.5" />
          <circle
            cx="5"
            cy="16"
            r="0.6"
            fill="currentColor"
            stroke="none"
            opacity="0.5"
          />
          <circle
            cx="5"
            cy="18.5"
            r="0.6"
            fill="currentColor"
            stroke="none"
            opacity="0.35"
          />
          <circle
            cx="11.5"
            cy="10"
            r="0.6"
            fill="currentColor"
            stroke="none"
            opacity="0.6"
          />
          <circle
            cx="11.5"
            cy="13"
            r="0.6"
            fill="currentColor"
            stroke="none"
            opacity="0.4"
          />
          <circle
            cx="11.5"
            cy="16"
            r="0.6"
            fill="currentColor"
            stroke="none"
            opacity="0.3"
          />
          <circle
            cx="18"
            cy="14"
            r="0.6"
            fill="currentColor"
            stroke="none"
            opacity="0.45"
          />
          <line x1="1" y1="22" x2="23" y2="22" opacity="0.3" />
        </svg>
      );

    // Renders the recycle icon used for responsible-consumption content.
    case "recycle":
      return (
        <svg {...svgProps}>
          <path d="M12 4c4 0 7.5 3 8.5 7" />
          <path d="M20.5 15c-2 4-5.5 6.5-9.5 6" />
          <path d="M7 18.5c-3-2.5-4.5-6-3.5-10" />
          <polyline points="19,10 20.5,11 21,9" />
          <polyline points="12,20 11,21 12.5,22" />
          <polyline points="5,12 3.5,11 3,13" />
          <circle cx="12" cy="12" r="2" opacity="0.35" />
          <circle
            cx="12"
            cy="12"
            r="0.8"
            fill="currentColor"
            stroke="none"
            opacity="0.35"
          />
        </svg>
      );

    // Renders the globe icon used for climate-action content.
    case "globe":
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="4" ry="9" opacity="0.4" />
          <path d="M3.5 9h17" opacity="0.3" />
          <path d="M3.5 15h17" opacity="0.3" />
          <line x1="12" y1="3" x2="12" y2="21" opacity="0.2" />
          <circle cx="12" cy="12" r="11" strokeDasharray="2 3" opacity="0.2" />
        </svg>
      );

    // Renders the leaf icon used for life-on-land content.
    case "leaf":
      return (
        <svg {...svgProps}>
          <path d="M17 3C7 3 3 9 3 17" />
          <path d="M3 17C3 17 7 17 12 14C17 11 20 6 20 3C20 3 17 3 17 3Z" />
          <path d="M3 17l8.5-7" opacity="0.5" />
          <path d="M8 13l3-5" opacity="0.3" />
          <path d="M12 12l3-4" opacity="0.3" />
          <circle
            cx="14"
            cy="7"
            r="0.7"
            fill="currentColor"
            stroke="none"
            opacity="0.4"
          />
        </svg>
      );

    /* Groups the utility icons used by general interface controls and fallbacks. */

    // Renders the crosshair icon used for profile, focus, and targeting cues.
    case "crosshair":
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4.5" opacity="0.5" />
          <line x1="12" y1="1" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="1" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="23" y2="12" />
          <circle
            cx="12"
            cy="12"
            r="1.2"
            fill="currentColor"
            stroke="none"
            opacity="0.5"
          />
        </svg>
      );

    // Renders the search-lens icon used for search and discovery interactions.
    case "search-lens":
      return (
        <svg {...svgProps}>
          <circle cx="10.5" cy="10.5" r="7" />
          <line x1="16" y1="16" x2="22" y2="22" strokeWidth="2" />
          <line x1="7" y1="8.5" x2="14" y2="8.5" opacity="0.3" />
          <line x1="7" y1="11" x2="14" y2="11" opacity="0.3" />
          <line x1="7" y1="13.5" x2="12" y2="13.5" opacity="0.3" />
          <circle cx="10.5" cy="10.5" r="2" opacity="0.3" />
        </svg>
      );

    // Renders the generic fallback badge when no named icon matches.
    default:
      return (
        <svg {...svgProps}>
          <polygon points="12 2, 20 7, 20 17, 12 22, 4 17, 4 7" opacity="0.6" />
          <circle
            cx="12"
            cy="12"
            r="3"
            fill="currentColor"
            stroke="none"
            opacity="0.25"
          />
        </svg>
      );
  }
}

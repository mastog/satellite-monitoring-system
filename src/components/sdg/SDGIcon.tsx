"use client";

interface SDGIconProps {
  sdgNumber: number;
  color: string;
  size?: number;
}

export default function SDGIcon({ sdgNumber, color, size = 28 }: SDGIconProps) {
  const glowId = `sdg-ico-glow-${sdgNumber}`;

  const common = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
  } as const;

  const glowFilter = (
    <defs>
      <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="1.2" result="blur" />
        <feFlood floodColor={color} floodOpacity="0.35" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );

  const s = { stroke: color, filter: `url(#${glowId})` };

  switch (sdgNumber) {
    // SDG 6 — Clean Water: stylized water droplet with wave ripple
    case 6:
      return (
        <svg {...common}>
          {glowFilter}
          <g
            {...s}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Droplet */}
            <path d="M16 4C16 4 9 13 9 18.5C9 22.4 12.1 25.5 16 25.5C19.9 25.5 23 22.4 23 18.5C23 13 16 4 16 4Z" />
            {/* Inner wave */}
            <path
              d="M11.5 19.5C12.8 18 14.5 19.5 16 18.5C17.5 17.5 19.2 19 20.5 18"
              strokeWidth="1.2"
              opacity="0.7"
            />
            {/* Ripple at bottom */}
            <path
              d="M13 22.5C14.2 21.8 15.3 22.5 16 22C16.7 21.5 17.8 22.2 19 21.5"
              strokeWidth="1"
              opacity="0.4"
            />
          </g>
        </svg>
      );

    // SDG 9 — Infrastructure: circuit-board tower / beacon
    case 9:
      return (
        <svg {...common}>
          {glowFilter}
          <g
            {...s}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Central tower */}
            <line x1="16" y1="6" x2="16" y2="26" />
            {/* Signal arcs */}
            <path
              d="M11 9C12.5 7.5 14 7 16 7C18 7 19.5 7.5 21 9"
              strokeWidth="1.2"
              opacity="0.5"
            />
            <path
              d="M9 7C11.5 4.5 13.5 3.5 16 3.5C18.5 3.5 20.5 4.5 23 7"
              strokeWidth="1"
              opacity="0.3"
            />
            {/* Horizontal beams */}
            <line x1="11" y1="13" x2="21" y2="13" />
            <line x1="12.5" y1="18" x2="19.5" y2="18" />
            {/* Foundation base */}
            <line x1="9" y1="26" x2="23" y2="26" strokeWidth="1.6" />
            {/* Node dots */}
            <circle
              cx="11"
              cy="13"
              r="1.2"
              fill={color}
              stroke="none"
              opacity="0.8"
            />
            <circle
              cx="21"
              cy="13"
              r="1.2"
              fill={color}
              stroke="none"
              opacity="0.8"
            />
            <circle
              cx="16"
              cy="18"
              r="1.2"
              fill={color}
              stroke="none"
              opacity="0.6"
            />
          </g>
        </svg>
      );

    // SDG 11 — Sustainable Cities: geometric cityscape with scanning grid
    case 11:
      return (
        <svg {...common}>
          {glowFilter}
          <g
            {...s}
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Buildings */}
            <rect x="6" y="14" width="5" height="12" rx="0.5" />
            <rect x="13" y="8" width="6" height="18" rx="0.5" />
            <rect x="21" y="12" width="5" height="14" rx="0.5" />
            {/* Windows — glowing dots */}
            <circle
              cx="8.5"
              cy="18"
              r="0.7"
              fill={color}
              stroke="none"
              opacity="0.6"
            />
            <circle
              cx="8.5"
              cy="21"
              r="0.7"
              fill={color}
              stroke="none"
              opacity="0.4"
            />
            <circle
              cx="16"
              cy="12"
              r="0.7"
              fill={color}
              stroke="none"
              opacity="0.7"
            />
            <circle
              cx="16"
              cy="15"
              r="0.7"
              fill={color}
              stroke="none"
              opacity="0.5"
            />
            <circle
              cx="16"
              cy="18"
              r="0.7"
              fill={color}
              stroke="none"
              opacity="0.4"
            />
            <circle
              cx="23.5"
              cy="16"
              r="0.7"
              fill={color}
              stroke="none"
              opacity="0.5"
            />
            <circle
              cx="23.5"
              cy="19"
              r="0.7"
              fill={color}
              stroke="none"
              opacity="0.3"
            />
            {/* Ground line */}
            <line
              x1="4"
              y1="26"
              x2="28"
              y2="26"
              strokeWidth="1"
              opacity="0.4"
            />
            {/* Scanning arc above */}
            <path
              d="M10 6C12 4.5 14 4 16 4C18 4 20 4.5 22 6"
              strokeWidth="1"
              opacity="0.35"
              strokeDasharray="2 2"
            />
          </g>
        </svg>
      );

    // SDG 12 — Responsible Production: circular arrow loop with core
    case 12:
      return (
        <svg {...common}>
          {glowFilter}
          <g
            {...s}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Outer recycling loop — 3 arcs */}
            <path d="M16 6C20.5 6 24.5 9.5 25 14" />
            <path d="M25 18C23.5 22.5 19.5 25.5 15 25" strokeDasharray="0" />
            <path d="M11 23C8 20.5 7 17 7.5 13" />
            {/* Arrow heads */}
            <polyline points="23,13 25,14 24,16" strokeWidth="1.3" />
            <polyline points="16,24 15,25 16,27" strokeWidth="1.3" />
            <polyline points="9,14 7.5,13 8,11" strokeWidth="1.3" />
            {/* Inner hexagonal core */}
            <path
              d="M16 12L19 14L19 18L16 20L13 18L13 14Z"
              strokeWidth="1"
              opacity="0.5"
            />
            <circle
              cx="16"
              cy="16"
              r="1.5"
              fill={color}
              stroke="none"
              opacity="0.5"
            />
          </g>
        </svg>
      );

    // SDG 13 — Climate Action: globe with atmosphere rings + pulse
    case 13:
      return (
        <svg {...common}>
          {glowFilter}
          <g
            {...s}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Globe */}
            <circle cx="16" cy="16" r="9" />
            {/* Meridian lines */}
            <ellipse
              cx="16"
              cy="16"
              rx="4"
              ry="9"
              strokeWidth="1"
              opacity="0.4"
            />
            <line
              x1="7"
              y1="16"
              x2="25"
              y2="16"
              strokeWidth="1"
              opacity="0.35"
            />
            {/* Latitude arcs */}
            <path
              d="M8.5 12C10.5 11 13 10.5 16 10.5C19 10.5 21.5 11 23.5 12"
              strokeWidth="0.8"
              opacity="0.3"
            />
            <path
              d="M8.5 20C10.5 21 13 21.5 16 21.5C19 21.5 21.5 21 23.5 20"
              strokeWidth="0.8"
              opacity="0.3"
            />
            {/* Atmosphere ring */}
            <circle
              cx="16"
              cy="16"
              r="11.5"
              strokeWidth="0.8"
              opacity="0.25"
              strokeDasharray="3 3"
            />
            {/* Temperature pulse */}
            <path d="M3 16L5 14L6.5 18L8 12" strokeWidth="1" opacity="0.45" />
          </g>
        </svg>
      );

    // SDG 15 — Life on Land: stylized tree with root network
    case 15:
      return (
        <svg {...common}>
          {glowFilter}
          <g
            {...s}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Trunk */}
            <line x1="16" y1="15" x2="16" y2="26" />
            {/* Canopy — layered triangles */}
            <path d="M16 4L21 12H11Z" strokeWidth="1.2" />
            <path d="M16 8L22.5 16H9.5Z" strokeWidth="1.2" opacity="0.6" />
            {/* Leaf nodes */}
            <circle
              cx="12"
              cy="10"
              r="1"
              fill={color}
              stroke="none"
              opacity="0.5"
            />
            <circle
              cx="20"
              cy="10"
              r="1"
              fill={color}
              stroke="none"
              opacity="0.5"
            />
            <circle
              cx="16"
              cy="5.5"
              r="1"
              fill={color}
              stroke="none"
              opacity="0.7"
            />
            {/* Root network */}
            <path d="M16 26L12 29" strokeWidth="1" opacity="0.4" />
            <path d="M16 26L20 29" strokeWidth="1" opacity="0.4" />
            <path d="M16 24L10 28" strokeWidth="0.8" opacity="0.25" />
            <path d="M16 24L22 28" strokeWidth="0.8" opacity="0.25" />
            {/* Ground line */}
            <line
              x1="8"
              y1="26"
              x2="24"
              y2="26"
              strokeWidth="0.8"
              opacity="0.3"
              strokeDasharray="2 2"
            />
          </g>
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle
            cx="16"
            cy="16"
            r="10"
            stroke={color}
            strokeWidth="1.5"
            opacity="0.4"
          />
        </svg>
      );
  }
}

// Generates the procedural line-art shapes used by the arcade renderer for
// ships, enemies, debris, and environmental objects.
import { PRNG } from "../engine/PRNG";

export interface ShapePoints {
  points: [number, number][];
  closed: boolean;
}

/** Describes a ship as a hull outline plus secondary detail lines and engine anchors. */
export interface ShipDesign {
  hull: ShapePoints;
  details: ShapePoints[]; // Stores open polylines used for panel lines and structural accents.
  cockpitPos: [number, number]; // Stores the cockpit center relative to the ship origin.
  cockpitRadius: number;
  engines: [number, number][]; // Stores the engine nozzle positions used for glow and exhaust.
}

/** Generates an irregular closed polygon used for asteroid silhouettes. */
export function asteroidShape(radius: number, seed: number): ShapePoints {
  const prng = new PRNG(seed);
  const segments = 8 + Math.floor(radius / 5);
  const points: [number, number][] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const r = radius * (0.7 + prng.next() * 0.6);
    points.push([Math.cos(angle) * r, Math.sin(angle) * r]);
  }
  return { points, closed: true };
}

/** Returns the full procedural ship design for the requested hull type. */
export function getShipDesign(size: number, hull?: string): ShipDesign {
  switch (hull) {
    case "mantis":
      return mantisDesign(size);
    case "titan":
      return titanDesign(size);
    default:
      return viperDesign(size);
  }
}

/** Returns only the hull outline for code paths that do not need the full ship design. */
export function shipShape(size: number, hull?: string): ShapePoints {
  return getShipDesign(size, hull).hull;
}

// Builds the Viper silhouette as a fast interceptor with swept wings and dual engines.
function viperDesign(s: number): ShipDesign {
  return {
    hull: {
      points: [
        [s * 1.2, 0],
        [s * 0.65, -s * 0.12],
        [s * 0.3, -s * 0.18],
        [s * 0.05, -s * 0.2],
        [-s * 0.15, -s * 0.22],
        [-s * 0.55, -s * 0.52],
        [-s * 0.62, -s * 0.46],
        [-s * 0.5, -s * 0.28],
        [-s * 0.55, -s * 0.18],
        [-s * 0.6, -s * 0.12],
        [-s * 0.55, 0],
        [-s * 0.6, s * 0.12],
        [-s * 0.55, s * 0.18],
        [-s * 0.5, s * 0.28],
        [-s * 0.62, s * 0.46],
        [-s * 0.55, s * 0.52],
        [-s * 0.15, s * 0.22],
        [s * 0.05, s * 0.2],
        [s * 0.3, s * 0.18],
        [s * 0.65, s * 0.12],
      ],
      closed: true,
    },
    details: [
      // Draws the center spine that visually anchors the nose and engine block.
      {
        points: [
          [s * 0.6, 0],
          [-s * 0.45, 0],
        ],
        closed: false,
      },
      // Draws the top wing spar line.
      {
        points: [
          [-s * 0.1, -s * 0.2],
          [-s * 0.5, -s * 0.42],
        ],
        closed: false,
      },
      // Draws the mirrored bottom wing spar line.
      {
        points: [
          [-s * 0.1, s * 0.2],
          [-s * 0.5, s * 0.42],
        ],
        closed: false,
      },
      // Draws the top engine nacelle detail line.
      {
        points: [
          [-s * 0.35, -s * 0.16],
          [-s * 0.55, -s * 0.16],
        ],
        closed: false,
      },
      // Draws the bottom engine nacelle detail line.
      {
        points: [
          [-s * 0.35, s * 0.16],
          [-s * 0.55, s * 0.16],
        ],
        closed: false,
      },
    ],
    cockpitPos: [s * 0.35, 0],
    cockpitRadius: s * 0.08,
    engines: [
      [-s * 0.6, -s * 0.12],
      [-s * 0.6, s * 0.12],
    ],
  };
}

// Builds the Mantis silhouette as a forward-swept strike fighter with a more aggressive wing planform.
function mantisDesign(s: number): ShipDesign {
  return {
    hull: {
      points: [
        [s * 0.95, 0], // sharp nose
        [s * 0.6, -s * 0.1], // nose taper
        [s * 0.3, -s * 0.15], // cockpit area

        // Extends the main wing tips ahead of the root to create the forward-swept profile.
        [s * 0.1, -s * 0.18], // wing root leading
        [s * 0.38, -s * 0.48], // wing tip leading (forward!)
        [s * 0.22, -s * 0.52], // wing tip outer point
        [-s * 0.1, -s * 0.4], // wing trailing mid
        [-s * 0.25, -s * 0.24], // wing trailing inner

        // Shapes the rear stabilizer fin cluster.
        [-s * 0.3, -s * 0.28], // fin outward
        [-s * 0.48, -s * 0.38], // fin tip
        [-s * 0.44, -s * 0.24], // fin trailing

        // Shapes the rear engine block and tail center.
        [-s * 0.42, -s * 0.14], // engine nacelle
        [-s * 0.48, 0], // tail center

        // Mirrors the upper hull to complete the lower silhouette.
        [-s * 0.42, s * 0.14],
        [-s * 0.44, s * 0.24],
        [-s * 0.48, s * 0.38],
        [-s * 0.3, s * 0.28],
        [-s * 0.25, s * 0.24],
        [-s * 0.1, s * 0.4],
        [s * 0.22, s * 0.52],
        [s * 0.38, s * 0.48],
        [s * 0.1, s * 0.18],
        [s * 0.3, s * 0.15],
        [s * 0.6, s * 0.1],
      ],
      closed: true,
    },
    details: [
      // Draws the center spine through the fuselage.
      {
        points: [
          [s * 0.55, 0],
          [-s * 0.4, 0],
        ],
        closed: false,
      },
      // Draws the top wing spar aligned with the forward wing sweep.
      {
        points: [
          [s * 0.15, -s * 0.2],
          [s * 0.3, -s * 0.46],
        ],
        closed: false,
      },
      // Draws the mirrored bottom wing spar.
      {
        points: [
          [s * 0.15, s * 0.2],
          [s * 0.3, s * 0.46],
        ],
        closed: false,
      },
      // Draws the top nacelle detail line.
      {
        points: [
          [-s * 0.28, -s * 0.14],
          [-s * 0.42, -s * 0.14],
        ],
        closed: false,
      },
      // Draws the bottom nacelle detail line.
      {
        points: [
          [-s * 0.28, s * 0.14],
          [-s * 0.42, s * 0.14],
        ],
        closed: false,
      },
    ],
    cockpitPos: [s * 0.32, 0],
    cockpitRadius: s * 0.07,
    engines: [
      [-s * 0.48, 0],
      [-s * 0.42, -s * 0.12],
      [-s * 0.42, s * 0.12],
    ],
  };
}

// Builds the Titan silhouette as a heavier armored wedge with broad stabilizer panels.
function titanDesign(s: number): ShipDesign {
  return {
    hull: {
      points: [
        [s * 0.85, 0], // blunt nose center
        [s * 0.7, -s * 0.18], // nose bevel
        [s * 0.4, -s * 0.3], // upper hull forward
        [s * 0.05, -s * 0.32], // armor plate edge
        [-s * 0.15, -s * 0.32], // armor plate rear
        [-s * 0.22, -s * 0.42], // stabilizer strut
        [-s * 0.35, -s * 0.6], // stabilizer fin tip
        [-s * 0.5, -s * 0.55], // fin trailing edge
        [-s * 0.45, -s * 0.32], // fin inner
        [-s * 0.5, -s * 0.22], // engine block top
        [-s * 0.6, -s * 0.18], // engine rear
        [-s * 0.58, 0], // engine center notch
        [-s * 0.6, s * 0.18], // engine rear bottom
        [-s * 0.5, s * 0.22], // engine block bottom
        [-s * 0.45, s * 0.32], // fin inner bottom
        [-s * 0.5, s * 0.55], // fin trailing edge bottom
        [-s * 0.35, s * 0.6], // stabilizer fin tip bottom
        [-s * 0.22, s * 0.42], // stabilizer strut bottom
        [-s * 0.15, s * 0.32], // armor plate rear bottom
        [s * 0.05, s * 0.32], // armor plate edge bottom
        [s * 0.4, s * 0.3], // upper hull forward bottom
        [s * 0.7, s * 0.18], // nose bevel bottom
      ],
      closed: true,
    },
    details: [
      // Heavy center spine
      {
        points: [
          [s * 0.65, 0],
          [-s * 0.5, 0],
        ],
        closed: false,
      },
      // Armor plate lines
      {
        points: [
          [s * 0.35, -s * 0.28],
          [s * 0.35, s * 0.28],
        ],
        closed: false,
      },
      {
        points: [
          [-s * 0.1, -s * 0.3],
          [-s * 0.1, s * 0.3],
        ],
        closed: false,
      },
      // Stabilizer cross-bars
      {
        points: [
          [-s * 0.28, -s * 0.35],
          [-s * 0.45, -s * 0.45],
        ],
        closed: false,
      },
      {
        points: [
          [-s * 0.28, s * 0.35],
          [-s * 0.45, s * 0.45],
        ],
        closed: false,
      },
      // Engine block outline
      {
        points: [
          [-s * 0.48, -s * 0.18],
          [-s * 0.48, s * 0.18],
        ],
        closed: false,
      },
    ],
    cockpitPos: [s * 0.5, 0],
    cockpitRadius: s * 0.06,
    engines: [
      [-s * 0.6, -s * 0.1],
      [-s * 0.58, 0],
      [-s * 0.6, s * 0.1],
    ],
  };
}

/** Small angular hostile drone (micro_debris) */
export function droneShape(size: number): ShapePoints {
  const s = size;
  return {
    points: [
      [s * 0.9, 0], // sharp nose
      [s * 0.15, -s * 0.35], // upper body
      [-s * 0.2, -s * 0.55], // upper wing root
      [-s * 0.5, -s * 0.7], // upper wing tip
      [-s * 0.35, -s * 0.35], // wing trailing edge
      [-s * 0.15, -s * 0.15], // inner notch top
      [-s * 0.6, 0], // tail
      [-s * 0.15, s * 0.15], // inner notch bottom
      [-s * 0.35, s * 0.35], // wing trailing edge
      [-s * 0.5, s * 0.7], // lower wing tip
      [-s * 0.2, s * 0.55], // lower wing root
      [s * 0.15, s * 0.35], // lower body
    ],
    closed: true,
  };
}

/** Elongated meteor bolide shape (meteor_swarm) */
export function meteorShape(size: number): ShapePoints {
  const s = size;
  return {
    points: [
      [s * 1.15, 0], // hot tip
      [s * 0.5, -s * 0.18], // front taper
      [s * 0.05, -s * 0.3], // widening
      [-s * 0.4, -s * 0.35], // max width
      [-s * 0.75, -s * 0.2], // back taper
      [-s * 0.85, 0], // tail
      [-s * 0.75, s * 0.2], // back taper bottom
      [-s * 0.4, s * 0.35], // max width bottom
      [s * 0.05, s * 0.3], // widening bottom
      [s * 0.5, s * 0.18], // front taper bottom
    ],
    closed: true,
  };
}

/** Derelict hull fragment with angular panels (space_junk) */
export function junkHulkShape(size: number, seed: number): ShapePoints {
  const prng = new PRNG(seed);
  const s = size;
  // Structured hull fragment: flat panels mixed with angular breaks
  const basePoints: [number, number][] = [
    [s * 0.55, -s * 0.15],
    [s * 0.45, -s * 0.4],
    [s * 0.1, -s * 0.55],
    [-s * 0.2, -s * 0.5],
    [-s * 0.5, -s * 0.35],
    [-s * 0.65, -s * 0.1],
    [-s * 0.6, s * 0.15],
    [-s * 0.4, s * 0.4],
    [-s * 0.05, s * 0.55],
    [s * 0.25, s * 0.45],
    [s * 0.5, s * 0.25],
    [s * 0.6, s * 0.05],
  ];
  // Apply seed-based jitter to each point for variety
  const points: [number, number][] = basePoints.map(([x, y]) => [
    x + (prng.next() - 0.5) * s * 0.12,
    y + (prng.next() - 0.5) * s * 0.12,
  ]);
  return { points, closed: true };
}

/** Hostile fighter ship (rogue_satellite) — angular with canards + swept wings */
export function enemyFighterShape(size: number): ShapePoints {
  const s = size;
  return {
    points: [
      // Nose
      [s * 0.85, 0],
      [s * 0.5, -s * 0.1],
      // Upper canard
      [s * 0.35, -s * 0.14],
      [s * 0.5, -s * 0.38],
      [s * 0.25, -s * 0.32],
      // Upper main wing
      [s * 0.0, -s * 0.18],
      [-s * 0.2, -s * 0.55],
      [-s * 0.42, -s * 0.48],
      [-s * 0.32, -s * 0.22],
      // Engine block
      [-s * 0.45, -s * 0.14],
      [-s * 0.55, 0],
      // Mirrors the upper wing and fuselage contour to complete the lower half of the silhouette.
      [-s * 0.45, s * 0.14],
      [-s * 0.32, s * 0.22],
      [-s * 0.42, s * 0.48],
      [-s * 0.2, s * 0.55],
      [s * 0.0, s * 0.18],
      [s * 0.25, s * 0.32],
      [s * 0.5, s * 0.38],
      [s * 0.35, s * 0.14],
      [s * 0.5, s * 0.1],
    ],
    closed: true,
  };
}

/** Generate satellite angular shape */
export function satelliteShape(size: number, seed: number): ShapePoints {
  const prng = new PRNG(seed);
  const bodyW = size * 0.5;
  const bodyH = size * 0.3;
  const panelExt = size * (0.8 + prng.next() * 0.4);
  return {
    points: [
      [-bodyW, -bodyH],
      [bodyW, -bodyH],
      [bodyW, bodyH],
      [-bodyW, bodyH],
      [-bodyW, 0],
      [-panelExt, -bodyH * 0.8],
      [-panelExt, bodyH * 0.8],
      [-bodyW, 0],
      [bodyW, 0],
      [panelExt, -bodyH * 0.8],
      [panelExt, bodyH * 0.8],
      [bodyW, 0],
    ],
    closed: false,
  };
}

/** Small irregular debris polygon */
export function debrisShape(size: number, seed: number): ShapePoints {
  const prng = new PRNG(seed);
  const segments = 4 + prng.int(0, 2);
  const points: [number, number][] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const r = size * (0.5 + prng.next() * 0.5);
    points.push([Math.cos(angle) * r, Math.sin(angle) * r]);
  }
  return { points, closed: true };
}

/** Boss structure: multi-segment */
export function bossShape(size: number, phase: number): ShapePoints {
  const s = size;
  const points: [number, number][] = [
    // Core hexagon
    [s, 0],
    [s * 0.5, s * 0.86],
    [-s * 0.5, s * 0.86],
    [-s, 0],
    [-s * 0.5, -s * 0.86],
    [s * 0.5, -s * 0.86],
  ];
  // Add turret protrusions based on phase
  if (phase >= 1) {
    points.push([s * 1.4, 0], [s * 1.2, s * 0.3], [s * 1.2, -s * 0.3]);
    points.push([-s * 1.4, 0], [-s * 1.2, s * 0.3], [-s * 1.2, -s * 0.3]);
  }
  if (phase >= 2) {
    points.push([0, s * 1.4], [s * 0.3, s * 1.2], [-s * 0.3, s * 1.2]);
    points.push([0, -s * 1.4], [s * 0.3, -s * 1.2], [-s * 0.3, -s * 1.2]);
  }
  return { points, closed: false };
}

/** Draw a shape onto a canvas context */
export function drawShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  shape: ShapePoints,
  rotation: number,
  strokeColor: string,
  lineWidth: number = 1.5,
  fillColor?: string,
  glowColor?: string
): void {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  ctx.save();

  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;
  }

  ctx.beginPath();
  for (let i = 0; i < shape.points.length; i++) {
    const [px, py] = shape.points[i];
    const rx = px * cos - py * sin + x;
    const ry = px * sin + py * cos + y;
    if (i === 0) ctx.moveTo(rx, ry);
    else ctx.lineTo(rx, ry);
  }
  if (shape.closed) ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  ctx.restore();
}

/** Draw a circle (for orbitals, pickups, etc.) */
export function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  strokeColor: string,
  lineWidth: number = 1.5,
  fillColor?: string,
  glowColor?: string
): void {
  ctx.save();
  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;
  }
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}

/** Draw a line segment */
export function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  lineWidth: number = 1.5,
  glowColor?: string
): void {
  ctx.save();
  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
  }
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}

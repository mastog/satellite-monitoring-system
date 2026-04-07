"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import {
  layoutNextLine,
  prepareWithSegments,
  type LayoutCursor,
  type PreparedTextWithSegments,
} from "@chenglou/pretext";
import { useAppStore } from "@/store/appStore";

type HaloCursorState = {
  active: boolean;
  x: number;
  y: number;
  viewportX: number;
  viewportY: number;
  radius: number;
};

type HaloContextValue = {
  cursor: HaloCursorState;
  stageRect: DOMRect | null;
};

type FlowPiece =
  | {
      kind: "text";
      text: string;
    }
  | {
      kind: "spacer";
      width: number;
    };

type FlowRow = {
  y: number;
  pieces: FlowPiece[];
};

type TrailPoint = {
  x: number;
  y: number;
  width: number;
  opacity: number;
  time: number;
};

const HaloContext = createContext<HaloContextValue>({
  cursor: {
    active: false,
    x: 0,
    y: 0,
    viewportX: 0,
    viewportY: 0,
    radius: 130,
  },
  stageRect: null,
});

const ACCENT_HEX: Record<string, string> = {
  cyan: "#00e5ff",
  orange: "#ff6b2c",
  purple: "#b44aff",
  green: "#39ff7f",
  rose: "#ff3a8c",
};

const HALO_RADIUS = 96;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatFont(element: HTMLElement) {
  const styles = window.getComputedStyle(element);
  return `${styles.fontStyle} ${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
}

function readLineHeight(element: HTMLElement) {
  const styles = window.getComputedStyle(element);
  const lineHeight = Number.parseFloat(styles.lineHeight);
  if (!Number.isNaN(lineHeight)) return lineHeight;
  return Number.parseFloat(styles.fontSize) * 1.75;
}

function readTextAlign(element: HTMLElement): React.CSSProperties["textAlign"] {
  const ownAlign = window.getComputedStyle(element).textAlign;
  if (ownAlign && ownAlign !== "start") {
    return ownAlign as React.CSSProperties["textAlign"];
  }

  const parent = element.parentElement;
  if (!parent) return ownAlign as React.CSSProperties["textAlign"];
  return window.getComputedStyle(parent).textAlign as React.CSSProperties["textAlign"];
}

function cursorsEqual(a: LayoutCursor, b: LayoutCursor) {
  return a.segmentIndex === b.segmentIndex && a.graphemeIndex === b.graphemeIndex;
}

function haloCursorsEqual(a: HaloCursorState, b: HaloCursorState) {
  return (
    a.active === b.active &&
    a.x === b.x &&
    a.y === b.y &&
    a.viewportX === b.viewportX &&
    a.viewportY === b.viewportY &&
    a.radius === b.radius
  );
}

function createTrailPoint(
  x: number,
  y: number,
  previousPoint: TrailPoint | null,
  time: number
): TrailPoint {
  const distance = previousPoint
    ? Math.hypot(x - previousPoint.x, y - previousPoint.y)
    : 0;
  const elapsed = Math.max(16, time - (previousPoint?.time ?? time));
  const speed = distance / elapsed;
  const speedWeight = clamp(speed / 1.1, 0, 1);
  const dwellWeight = 1 - speedWeight;

  return {
    x,
    y,
    width: 4.8 + dwellWeight * 18.6,
    opacity: 0.24 + dwellWeight * 0.58,
    time,
  };
}

function buildTrailPath(points: TrailPoint[]) {
  if (points.length < 2) return "";

  const orderedPoints = [...points].reverse();
  const firstPoint = orderedPoints[0];
  let path = `M ${firstPoint.x.toFixed(2)} ${firstPoint.y.toFixed(2)}`;

  for (let index = 1; index < orderedPoints.length - 1; index += 1) {
    const currentPoint = orderedPoints[index];
    const nextPoint = orderedPoints[index + 1];
    const midX = (currentPoint.x + nextPoint.x) * 0.5;
    const midY = (currentPoint.y + nextPoint.y) * 0.5;

    path += ` Q ${currentPoint.x.toFixed(2)} ${currentPoint.y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
  }

  const lastPoint = orderedPoints[orderedPoints.length - 1];
  return `${path} L ${lastPoint.x.toFixed(2)} ${lastPoint.y.toFixed(2)}`;
}

function readTrailBrush(points: TrailPoint[]) {
  if (points.length === 0) {
    return { width: 0, opacity: 0 };
  }

  const samplePoints = points.slice(0, 5);
  const width =
    samplePoints.reduce((total, point) => total + point.width, 0) /
    samplePoints.length;
  const opacity =
    samplePoints.reduce((total, point) => total + point.opacity, 0) /
    samplePoints.length;

  return { width, opacity };
}

function buildHoleRange(
  width: number,
  lineHeight: number,
  cursor: HaloCursorState,
  localRect: DOMRect,
  haloPadding: number
) {
  const localCursorX = cursor.viewportX - localRect.left;
  const localCursorY = cursor.viewportY - localRect.top;
  const intersectionRadius = cursor.radius + haloPadding;

  return (lineIndex: number) => {
    const lineCenter = lineIndex * lineHeight + lineHeight * 0.5;
    const distanceY = Math.abs(localCursorY - lineCenter);

    if (
      !cursor.active ||
      localCursorX <= -intersectionRadius ||
      localCursorX >= width + intersectionRadius ||
      distanceY >= intersectionRadius
    ) {
      return null;
    }

    const intersectionX = Math.sqrt(
      Math.max(0, intersectionRadius * intersectionRadius - distanceY * distanceY)
    );

    return {
      start: Math.max(0, localCursorX - intersectionX - haloPadding),
      end: Math.min(width, localCursorX + intersectionX + haloPadding),
    };
  };
}

function buildWrappedLines(
  prepared: PreparedTextWithSegments,
  width: number,
  lineHeight: number,
  cursor: HaloCursorState,
  localRect: DOMRect,
  haloPadding: number
) {
  const rows: FlowRow[] = [];
  const getHoleRange = buildHoleRange(
    width,
    lineHeight,
    cursor,
    localRect,
    haloPadding
  );

  let lineIndex = 0;
  let start: LayoutCursor = {
    segmentIndex: 0,
    graphemeIndex: 0,
  };

  while (true) {
    const hole = getHoleRange(lineIndex);
    const row: FlowRow = {
      y: lineIndex * lineHeight,
      pieces: [],
    };

    if (!hole) {
      const fullLine = layoutNextLine(prepared, start, width);
      if (!fullLine) break;
      row.pieces.push({
        kind: "text",
        text: fullLine.text,
      });
      rows.push(row);
      start = fullLine.end;
      lineIndex += 1;
      continue;
    }

    const leftWidth = Math.max(0, hole.start);
    const rightWidth = Math.max(0, width - hole.end);
    const leftLine = leftWidth > 0 ? layoutNextLine(prepared, start, leftWidth) : null;
    const afterLeft = leftLine?.end ?? start;
    const rightLine =
      rightWidth > 0 ? layoutNextLine(prepared, afterLeft, rightWidth) : null;

    if (!leftLine && !rightLine) {
      const fallbackLine = layoutNextLine(prepared, start, width);
      if (!fallbackLine) break;
      row.pieces.push({
        kind: "text",
        text: fallbackLine.text,
      });
      rows.push(row);
      start = fallbackLine.end;
      lineIndex += 1;
      continue;
    }

    if (leftLine?.text) {
      row.pieces.push({
        kind: "text",
        text: leftLine.text,
      });
    }

    const spacerWidth = Math.max(0, hole.end - (leftLine?.width ?? 0));
    if (spacerWidth > 0) {
      row.pieces.push({
        kind: "spacer",
        width: spacerWidth,
      });
    }

    if (rightLine?.text) {
      row.pieces.push({
        kind: "text",
        text: rightLine.text,
      });
    }

    rows.push(row);
    const nextCursor = rightLine?.end ?? leftLine?.end ?? start;
    if (cursorsEqual(nextCursor, start)) break;
    start = nextCursor;
    lineIndex += 1;
  }

  return {
    rows,
    height: Math.max(lineHeight, rows.length * lineHeight),
  };
}

// Tracks the cursor inside the static-page content region and renders the halo replacement pointer.
export function StaticPageHaloStage({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: string;
}) {
  const accentColor = useAppStore((s) => s.userPreferences.accentColor);
  const ref = useRef<HTMLDivElement>(null);
  const resolvedAccent = accent ?? ACCENT_HEX[accentColor] ?? ACCENT_HEX.cyan;
  const [stageRect, setStageRect] = useState<DOMRect | null>(null);
  const [cursor, setCursor] = useState<HaloCursorState>({
    active: false,
    x: 0,
    y: 0,
    viewportX: 0,
    viewportY: 0,
    radius: HALO_RADIUS,
  });
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const cursorMotion = {
    type: "spring",
    stiffness: 280,
    damping: 24,
    mass: 0.45,
  } as const;
  const cursorFrameRef = useRef<number | null>(null);
  const trailFrameRef = useRef<number | null>(null);
  const pendingCursorRef = useRef<HaloCursorState | null>(null);
  const lastCursorRef = useRef<HaloCursorState | null>(null);
  const latestCursorRef = useRef<HaloCursorState>(cursor);

  useEffect(() => {
    const updateStageRect = () => {
      if (!ref.current) return;
      setStageRect(ref.current.getBoundingClientRect());
    };

    updateStageRect();
    window.addEventListener("resize", updateStageRect);
    window.addEventListener("scroll", updateStageRect, { passive: true });

    return () => {
      window.removeEventListener("resize", updateStageRect);
      window.removeEventListener("scroll", updateStageRect);
    };
  }, []);

  useEffect(() => {
    latestCursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    if (!cursor.active || trailFrameRef.current !== null) return;

    const sampleTrail = (time: number) => {
      const latestCursor = latestCursorRef.current;
      if (!latestCursor.active) {
        trailFrameRef.current = null;
        return;
      }

      setTrail((currentTrail) => {
        const latestPoint = currentTrail[0] ?? null;
        const nextPoint = createTrailPoint(
          latestCursor.viewportX,
          latestCursor.viewportY,
          latestPoint,
          time
        );

        if (
          latestPoint &&
          currentTrail.length === 1 &&
          latestPoint.x === nextPoint.x &&
          latestPoint.y === nextPoint.y
        ) {
          return currentTrail;
        }

        return [nextPoint, ...currentTrail].slice(0, 24);
      });

      trailFrameRef.current = requestAnimationFrame(sampleTrail);
    };

    trailFrameRef.current = requestAnimationFrame(sampleTrail);
  }, [cursor.active]);

  useEffect(() => {
    return () => {
      if (cursorFrameRef.current !== null) {
        cancelAnimationFrame(cursorFrameRef.current);
      }
      if (trailFrameRef.current !== null) {
        cancelAnimationFrame(trailFrameRef.current);
      }
    };
  }, []);

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = stageRect ?? ref.current?.getBoundingClientRect();
    if (!rect) return;

    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    pendingCursorRef.current = {
      active: true,
      x: localX,
      y: localY,
      viewportX: event.clientX,
      viewportY: event.clientY,
      radius: HALO_RADIUS,
    };

    if (cursorFrameRef.current !== null) return;
    cursorFrameRef.current = requestAnimationFrame(() => {
      const nextCursor = pendingCursorRef.current;
      pendingCursorRef.current = null;
      cursorFrameRef.current = null;
      if (!nextCursor) return;
      const previousCursor = lastCursorRef.current;
      if (previousCursor && haloCursorsEqual(previousCursor, nextCursor)) {
        return;
      }

      lastCursorRef.current = nextCursor;
      setCursor((current) =>
        haloCursorsEqual(current, nextCursor) ? current : nextCursor
      );
    });
  };

  const handleLeave = () => {
    pendingCursorRef.current = null;
    if (cursorFrameRef.current !== null) {
      cancelAnimationFrame(cursorFrameRef.current);
      cursorFrameRef.current = null;
    }
    if (trailFrameRef.current !== null) {
      cancelAnimationFrame(trailFrameRef.current);
      trailFrameRef.current = null;
    }
    lastCursorRef.current = null;
    setCursor((current) =>
      current.active ? { ...current, active: false } : current
    );
    setTrail((currentTrail) => (currentTrail.length === 0 ? currentTrail : []));
  };

  return (
    <HaloContext.Provider value={{ cursor, stageRect }}>
      <div
        ref={ref}
        className="relative cursor-none"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        {children}
        <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
          <svg
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
            focusable="false"
          >
            {(() => {
              const trailPath = buildTrailPath(trail);
              const brush = readTrailBrush(trail);
              if (!trailPath) return null;
              return (
                <>
                  <path
                    d={trailPath}
                    fill="none"
                    stroke={resolvedAccent}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={Math.max(8, brush.width * 1.18)}
                    opacity={cursor.active ? brush.opacity * 0.16 : 0}
                    style={{ filter: "blur(5px)" }}
                  />
                  <path
                    d={trailPath}
                    fill="none"
                    stroke={resolvedAccent}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={Math.max(4, brush.width * 0.66)}
                    opacity={cursor.active ? brush.opacity * 0.72 : 0}
                  />
                  <path
                    d={trailPath}
                    fill="none"
                    stroke={resolvedAccent}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={Math.max(1.4, brush.width * 0.2)}
                    opacity={cursor.active ? Math.min(1, brush.opacity * 0.96) : 0}
                  />
                </>
              );
            })()}
          </svg>
          <motion.div
            className="absolute"
            animate={{
              opacity: cursor.active ? 1 : 0,
              x: cursor.viewportX,
              y: cursor.viewportY,
            }}
            transition={cursorMotion}
          >
            <div
              className="absolute rounded-full"
              style={{
                width: HALO_RADIUS * 2,
                height: HALO_RADIUS * 2,
                transform: "translate(-50%, -50%)",
                background: `radial-gradient(circle, color-mix(in srgb, ${resolvedAccent} 26%, transparent) 0%, color-mix(in srgb, ${resolvedAccent} 12%, transparent) 26%, transparent 72%)`,
                filter: "blur(14px)",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                width: 24,
                height: 24,
                transform: "translate(-50%, -50%)",
                background: resolvedAccent,
                boxShadow: `0 0 22px ${resolvedAccent}`,
              }}
            />
          </motion.div>
        </div>
      </div>
    </HaloContext.Provider>
  );
}

// Lays out long-form copy so lines can route around the shared cursor halo.
export function HaloWrapText({
  text,
  className = "",
  style,
  haloPadding = 0,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  haloPadding?: number;
}) {
  const { cursor } = useContext(HaloContext);
  const hostRef = useRef<HTMLDivElement>(null);
  const resetHeightTimerRef = useRef<number | null>(null);
  const heightFrameRef = useRef<number | null>(null);
  const [width, setWidth] = useState(0);
  const [lineHeight, setLineHeight] = useState(28);
  const [font, setFont] = useState("");
  const [textAlign, setTextAlign] = useState<React.CSSProperties["textAlign"]>();
  const [reservedHeight, setReservedHeight] = useState<number | null>(null);

  const prepared = useMemo(() => {
    if (!font) return null;
    return prepareWithSegments(text, font);
  }, [font, text]);

  useLayoutEffect(() => {
    const element = hostRef.current;
    if (!element) return;

    const updateMetrics = () => {
      const styles = window.getComputedStyle(element);
      setWidth(element.clientWidth);
      setLineHeight(readLineHeight(element));
      setFont(formatFont(element));
      setTextAlign(readTextAlign(element));
    };

    updateMetrics();

    const resizeObserver = new ResizeObserver(updateMetrics);
    resizeObserver.observe(element);
    window.addEventListener("resize", updateMetrics);
    window.addEventListener("scroll", updateMetrics, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateMetrics);
      window.removeEventListener("scroll", updateMetrics);
    };
  }, [className, style, text]);

  const layout = useMemo(() => {
    const localRect = hostRef.current?.getBoundingClientRect() ?? null;
    if (!prepared || !localRect || width <= 0) return null;
    return buildWrappedLines(
      prepared,
      width,
      lineHeight,
      cursor,
      localRect,
      haloPadding
    );
  }, [prepared, width, lineHeight, cursor, haloPadding]);

  const baseLayoutHeight = useMemo(() => {
    const localRect = hostRef.current?.getBoundingClientRect() ?? null;
    if (!prepared || !localRect || width <= 0) return null;
    const baseLayout = buildWrappedLines(
      prepared,
      width,
      lineHeight,
      { ...cursor, active: false },
      localRect,
      haloPadding
    );
    return baseLayout.height;
  }, [prepared, width, lineHeight, cursor.radius, haloPadding]);

  const hasWrapEffect = useMemo(() => {
    if (!layout) return false;
    return layout.rows.some((row) =>
      row.pieces.some((piece) => piece.kind === "spacer" && piece.width > 0)
    );
  }, [layout]);
  const layoutHeight = layout?.height ?? null;

  useEffect(() => {
    return () => {
      if (resetHeightTimerRef.current !== null) {
        window.clearTimeout(resetHeightTimerRef.current);
      }
      if (heightFrameRef.current !== null) {
        cancelAnimationFrame(heightFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (resetHeightTimerRef.current !== null) {
      window.clearTimeout(resetHeightTimerRef.current);
      resetHeightTimerRef.current = null;
    }
    if (heightFrameRef.current !== null) {
      cancelAnimationFrame(heightFrameRef.current);
      heightFrameRef.current = null;
    }

    if (hasWrapEffect && layoutHeight !== null) {
      heightFrameRef.current = requestAnimationFrame(() => {
        setReservedHeight((current) =>
          current === null || layoutHeight > current ? layoutHeight : current
        );
        heightFrameRef.current = null;
      });
      return;
    }

    resetHeightTimerRef.current = window.setTimeout(() => {
      setReservedHeight(baseLayoutHeight);
      resetHeightTimerRef.current = null;
    }, 800);
  }, [hasWrapEffect, layoutHeight, baseLayoutHeight]);

  const displayHeight = reservedHeight ?? baseLayoutHeight ?? undefined;

  return (
    <motion.div
      ref={hostRef}
      className={className}
      initial={false}
      animate={{
        height: displayHeight,
        minHeight: displayHeight,
      }}
      transition={{ duration: 0.14, ease: "easeOut" }}
      style={{
        ...style,
        display: "block",
        minWidth: 0,
        width: "100%",
        position: "relative",
        textAlign,
      }}
      aria-label={text}
    >
      {!layout || !hasWrapEffect ? (
        <p className="m-0">{text}</p>
      ) : (
        <div aria-hidden="true" className="w-full">
          {layout.rows.map((row, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="flex w-full items-start"
              style={{
                height: lineHeight,
                lineHeight: `${lineHeight}px`,
                justifyContent:
                  textAlign === "center"
                    ? "center"
                    : textAlign === "right"
                      ? "flex-end"
                      : "flex-start",
              }}
            >
              {row.pieces.map((piece, pieceIndex) =>
                piece.kind === "spacer" ? (
                  <span
                    key={`spacer-${rowIndex}-${pieceIndex}`}
                    className="block shrink-0"
                    style={{ width: piece.width }}
                  />
                ) : (
                  <span
                    key={`text-${rowIndex}-${pieceIndex}`}
                    className="block shrink-0 whitespace-pre"
                  >
                    {piece.text}
                  </span>
                )
              )}
            </div>
          ))}
          <span className="sr-only">{text}</span>
        </div>
      )}
    </motion.div>
  );
}

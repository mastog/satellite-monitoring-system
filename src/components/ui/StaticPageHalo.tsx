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

function cursorsEqual(a: LayoutCursor, b: LayoutCursor) {
  return a.segmentIndex === b.segmentIndex && a.graphemeIndex === b.graphemeIndex;
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

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = stageRect ?? ref.current?.getBoundingClientRect();
    if (!rect) return;

    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;

    setCursor({
      active: true,
      x: localX,
      y: localY,
      viewportX: event.clientX,
      viewportY: event.clientY,
      radius: HALO_RADIUS,
    });
    setTrail((currentTrail) =>
      [{ x: localX, y: localY }, ...currentTrail].slice(0, 14)
    );
  };

  const handleLeave = () => {
    setCursor((current) => ({
      ...current,
      active: false,
    }));
    setTrail([]);
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
          {trail.map((point, index) => {
            const opacity = 0.22 - index * 0.013;
            const size = 14 - index * 0.55;
            if (opacity <= 0 || size <= 0) return null;
            return (
              <motion.div
                key={`${point.x}-${point.y}-${index}`}
                className="absolute rounded-full"
                style={{
                  left: cursor.viewportX - cursor.x + point.x - size * 0.5,
                  top: cursor.viewportY - cursor.y + point.y - size * 0.5,
                  width: size,
                  height: size,
                  opacity,
                  background: resolvedAccent,
                  boxShadow: `0 0 ${12 + index * 2}px ${resolvedAccent}`,
                  filter: "blur(0.5px)",
                }}
              />
            );
          })}
          <motion.div
            className="absolute rounded-full"
            animate={{
              opacity: cursor.active ? 1 : 0,
              x: cursor.viewportX - 120,
              y: cursor.viewportY - 120,
            }}
            transition={{ type: "spring", stiffness: 180, damping: 20, mass: 0.5 }}
            style={{
              width: HALO_RADIUS * 2,
              height: HALO_RADIUS * 2,
              background: `radial-gradient(circle, color-mix(in srgb, ${resolvedAccent} 26%, transparent) 0%, color-mix(in srgb, ${resolvedAccent} 12%, transparent) 26%, transparent 72%)`,
              filter: "blur(14px)",
            }}
          />
          <motion.div
            className="absolute rounded-full"
            animate={{
              opacity: cursor.active ? 0.9 : 0,
              x: cursor.viewportX - 12,
              y: cursor.viewportY - 12,
            }}
            transition={{ type: "spring", stiffness: 280, damping: 24, mass: 0.45 }}
            style={{
              width: 24,
              height: 24,
              background: resolvedAccent,
              boxShadow: `0 0 22px ${resolvedAccent}`,
            }}
          />
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
  const [width, setWidth] = useState(0);
  const [lineHeight, setLineHeight] = useState(28);
  const [font, setFont] = useState("");

  const prepared = useMemo(() => {
    if (!font) return null;
    return prepareWithSegments(text, font);
  }, [font, text]);

  useLayoutEffect(() => {
    const element = hostRef.current;
    if (!element) return;

    const updateMetrics = () => {
      setWidth(element.clientWidth);
      setLineHeight(readLineHeight(element));
      setFont(formatFont(element));
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

  const liveRect = hostRef.current?.getBoundingClientRect() ?? null;

  const layout = useMemo(() => {
    if (!prepared || !liveRect || width <= 0) return null;
    return buildWrappedLines(
      prepared,
      width,
      lineHeight,
      cursor,
      liveRect,
      haloPadding
    );
  }, [prepared, liveRect, width, lineHeight, cursor, haloPadding]);

  const hasWrapEffect = useMemo(() => {
    if (!layout) return false;
    return layout.rows.some((row) =>
      row.pieces.some((piece) => piece.kind === "spacer" && piece.width > 0)
    );
  }, [layout]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        ...style,
        position: "relative",
        height: hasWrapEffect ? layout?.height ?? lineHeight : undefined,
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
    </div>
  );
}

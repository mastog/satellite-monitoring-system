"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { useAppStore } from "@/store/appStore";

// Caps historical scrubbing at the last 12 hours so the timeline remains
// readable and the orbit replay stays bounded.
const MAX_OFFSET_MS = 12 * 60 * 60 * 1000; // 12 hours
const SPEEDS = [1, 5, 20, 50];

export default function TimelineScrubber() {
  const {
    timeOffset,
    setTimeOffset,
    simulationSpeed,
    setSimulationSpeed,
    isPaused,
    togglePause,
    satelliteDensity,
    setSatelliteDensity,
    reshuffleSatellites,
  } = useAppStore();
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [displayTime, setDisplayTime] = useState<string>("");

  // Derives the scrubber fill amount from the current historical offset.
  const progress = 1 - Math.abs(timeOffset) / MAX_OFFSET_MS;
  const isLive = timeOffset === 0;

  // Formats the visible timestamp shown beside the scrubber when the timeline
  // is no longer at the live position.
  useEffect(() => {
    if (isLive) {
      setDisplayTime("");
    } else {
      const t = new Date(Date.now() + timeOffset);
      const hh = t.getUTCHours().toString().padStart(2, "0");
      const mm = t.getUTCMinutes().toString().padStart(2, "0");
      const hoursAgo = (Math.abs(timeOffset) / (1000 * 60 * 60)).toFixed(1);
      setDisplayTime(`${hh}:${mm} -${hoursAgo}h`);
    }
  }, [timeOffset, isLive]);

  // Converts a pointer position on the scrubber track into a bounded timeline offset.
  const updateFromPointer = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width)
      );
      const offset = -(1 - ratio) * MAX_OFFSET_MS;
      setTimeOffset(offset);
    },
    [setTimeOffset]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updateFromPointer(e.clientX);
    },
    [updateFromPointer]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      updateFromPointer(e.clientX);
    },
    [isDragging, updateFromPointer]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      className="absolute bottom-4 right-4 z-20 select-none orbital-hud"
      style={{ padding: 0 }}
    >
      {/* Lets the user control how many satellites are rendered and reshuffle the sampled subset. */}
      <div
        className="flex items-center justify-end gap-2"
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid rgba(0,229,255,0.08)",
          fontFamily: "var(--font-fira-code)",
          fontSize: "12px",
        }}
      >
        <span
          style={{
            color: "var(--neon-cyan)",
            letterSpacing: "0.12em",
            fontSize: "12px",
            fontWeight: 700,
            fontFamily: "var(--font-orbitron)",
            textShadow: "0 0 10px var(--neon-cyan-glow)",
          }}
        >
          DENSITY
        </span>
        <input
          type="range"
          min={3}
          max={30}
          value={satelliteDensity}
          onChange={(e) => setSatelliteDensity(Number(e.target.value))}
          className="ui-scale-slider"
          style={{ width: 80 }}
        />
        <span
          style={{
            color: "var(--neon-orange)",
            width: 20,
            textAlign: "center",
            fontWeight: 700,
            fontSize: "13px",
            flexShrink: 0,
          }}
        >
          {satelliteDensity}
        </span>
        <button
          onClick={reshuffleSatellites}
          title="Reshuffle satellites"
          className="flex items-center justify-center rounded transition-all"
          style={{
            width: 22,
            height: 22,
            background: "rgba(0,229,255,0.08)",
            border: "1px solid rgba(0,229,255,0.2)",
            color: "var(--neon-cyan)",
            cursor: "pointer",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
          </svg>
        </button>
      </div>

      {/* Groups playback controls and the historical scrubber into a single orbital timeline panel. */}
      <div className="flex items-center" style={{ padding: "8px 12px" }}>
        {/* Toggles whether the scene clock is advancing or frozen. */}
        <button
          onClick={togglePause}
          className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors flex-shrink-0${!isPaused ? " play-ring-pulse" : ""}`}
          style={{
            background: isPaused
              ? "rgba(0,229,255,0.12)"
              : "rgba(57,255,127,0.10)",
            border: isPaused
              ? "1px solid rgba(0,229,255,0.25)"
              : "1px solid rgba(57,255,127,0.25)",
          }}
        >
          {isPaused ? (
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="var(--neon-cyan)"
            >
              <polygon points="2,0 9,5 2,10" />
            </svg>
          ) : (
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="var(--neon-green)"
            >
              <rect x="1" y="0" width="3" height="10" />
              <rect x="6" y="0" width="3" height="10" />
            </svg>
          )}
        </button>

        {/* Selects the simulation speed multiplier used when playback is running. */}
        <div className="flex items-center gap-0.5 ml-1.5">
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              onClick={() => setSimulationSpeed(speed)}
              className={`px-1.5 py-0.5 rounded text-[13px] font-bold tracking-wider transition-all${simulationSpeed === speed ? " speed-btn-active" : ""}`}
              style={{
                background:
                  simulationSpeed === speed ? undefined : "transparent",
                color:
                  simulationSpeed === speed ? undefined : "var(--text-dim)",
                border:
                  simulationSpeed === speed
                    ? undefined
                    : "1px solid transparent",
                fontFamily: "var(--font-fira-code)",
                ...(simulationSpeed === speed
                  ? { textShadow: "0 0 8px var(--neon-cyan-glow)" }
                  : {}),
              }}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Visually separates playback controls from the scrubber itself. */}
        <div
          className="w-px h-5 mx-2 flex-shrink-0"
          style={{ background: "rgba(0,229,255,0.15)" }}
        />

        {/* Uses a fixed-width scrubber so the panel layout stays stable while the time label changes. */}
        <div
          className="flex items-center gap-2.5 flex-shrink-0"
          style={{ width: 180 }}
        >
          <span
            className="text-[11px] tracking-wider flex-shrink-0"
            style={{
              color: "var(--text-dim)",
              fontFamily: "var(--font-fira-code)",
            }}
          >
            -12H
          </span>

          <div className="flex-1 relative">
            <div
              ref={trackRef}
              className="relative h-[6px] rounded-full cursor-pointer"
              style={{ background: "rgba(0,229,255,0.08)" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full pointer-events-none"
                style={{
                  width: `${progress * 100}%`,
                  background:
                    "linear-gradient(90deg, var(--holo-purple), var(--neon-cyan))",
                }}
              />
              <div
                className="absolute top-1/2 pointer-events-none"
                style={{
                  left: `${progress * 100}%`,
                  transform: "translate(-50%, -50%)",
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "var(--neon-cyan)",
                  boxShadow: "0 0 8px var(--neon-cyan-glow)",
                  border: "2px solid rgba(11,15,24,0.8)",
                }}
              />
            </div>
          </div>

          <span
            className="text-[11px] tracking-wider flex-shrink-0"
            style={{
              color: "var(--text-dim)",
              fontFamily: "var(--font-fira-code)",
            }}
          >
            NOW
          </span>
        </div>

        {/* Status area — fixed width prevents layout shift when toggling live/past */}
        <div
          className="flex items-center justify-end gap-1.5 flex-shrink-0 ml-2"
          style={{ width: 130 }}
        >
          {isLive ? (
            <span
              className="flex items-center justify-center gap-1.5 text-[13px] font-bold tracking-[0.1em] py-0.5 rounded"
              style={{
                background: "rgba(57,255,127,0.12)",
                color: "var(--neon-green)",
                border: "1px solid rgba(57,255,127,0.25)",
                fontFamily: "var(--font-orbitron)",
                width: "100%",
              }}
            >
              <span className="live-dot" />
              LIVE
            </span>
          ) : (
            <>
              <span
                className="text-[13px] font-bold"
                style={{
                  color: "var(--neon-cyan)",
                  fontFamily: "var(--font-fira-code)",
                  whiteSpace: "nowrap",
                }}
              >
                {displayTime}
              </span>
              <button
                onClick={() => setTimeOffset(0)}
                className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 transition-colors"
                style={{
                  background: "var(--neon-cyan-dim)",
                  border: "1px solid rgba(0,229,255,0.3)",
                  color: "var(--neon-cyan)",
                }}
                title="Reset to live"
              >
                ×
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

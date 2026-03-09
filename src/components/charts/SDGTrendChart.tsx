"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";

interface TrendDataPoint {
  month: string;
  score: number;
}

interface SDGTrendChartProps {
  data: TrendDataPoint[];
  color: string;
}

export default function SDGTrendChart({ data, color }: SDGTrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sonifyRef = useRef(true);
  const playingRef = useRef(false);
  const playTimerRef = useRef<number | null>(null);

  function getAudioCtx(): AudioContext {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  }

  function playTone(value: number) {
    if (!sonifyRef.current) return;
    const ctx = getAudioCtx();
    const freq = 220 + (value / 100) * 660;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  const stopPlayAll = useCallback(() => {
    playingRef.current = false;
    if (playTimerRef.current !== null) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 24, right: 10, bottom: 25, left: 30 };
    const width = svgRef.current.clientWidth || 300;
    const height = svgRef.current.clientHeight || 200;
    const iW = width - margin.left - margin.right;
    const iH = height - margin.top - margin.bottom;

    svg
      .attr("role", "group")
      .attr(
        "aria-label",
        `SDG trend chart with ${data.length} data points. Use Tab to enter, Arrow keys to navigate, or press Play to hear the trend.`
      );

    const defs = svg.append("defs");

    // Generates instance-specific ids so gradients and filters do not collide with other charts on the page.
    const uid = `sdg-${Math.random().toString(36).slice(2, 8)}`;

    // Defines the fill gradient used under the trend line.
    const areaGrad = defs
      .append("linearGradient")
      .attr("id", `${uid}-area`)
      .attr("x1", "0")
      .attr("y1", "0")
      .attr("x2", "0")
      .attr("y2", "1");
    areaGrad
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", color)
      .attr("stop-opacity", 0.2);
    areaGrad
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", color)
      .attr("stop-opacity", 0);

    // Defines the glow filter that brightens the main trend stroke.
    const glow = defs
      .append("filter")
      .attr("id", `${uid}-glow`)
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    glow
      .append("feGaussianBlur")
      .attr("stdDeviation", "3.5")
      .attr("result", "blur");
    glow
      .append("feFlood")
      .attr("flood-color", color)
      .attr("flood-opacity", "0.7")
      .attr("result", "color");
    glow
      .append("feComposite")
      .attr("in", "color")
      .attr("in2", "blur")
      .attr("operator", "in")
      .attr("result", "glow");
    const gm = glow.append("feMerge");
    gm.append("feMergeNode").attr("in", "glow");
    gm.append("feMergeNode").attr("in", "SourceGraphic");

    // Defines the drop shadow applied to the tooltip card.
    const tipShadow = defs
      .append("filter")
      .attr("id", `${uid}-tshadow`)
      .attr("x", "-20%")
      .attr("y", "-20%")
      .attr("width", "140%")
      .attr("height", "140%");
    tipShadow
      .append("feDropShadow")
      .attr("dx", "0")
      .attr("dy", "2")
      .attr("stdDeviation", "4")
      .attr("flood-color", color)
      .attr("flood-opacity", "0.25");

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scalePoint()
      .domain(data.map((d) => d.month))
      .range([0, iW])
      .padding(0.5);
    const y = d3.scaleLinear().domain([0, 100]).range([iH, 0]);

    // Draws the horizontal reference lines behind the data series.
    [25, 50, 75].forEach((v) => {
      g.append("line")
        .attr("x1", 0)
        .attr("x2", iW)
        .attr("y1", y(v))
        .attr("y2", y(v))
        .attr("stroke", v === 50 ? `${color}18` : `${color}08`)
        .attr("stroke-dasharray", v === 50 ? "4,4" : "2,4");
    });

    // Fills the area between the score line and the baseline.
    const area = d3
      .area<TrendDataPoint>()
      .x((d) => x(d.month)!)
      .y0(iH)
      .y1((d) => y(d.score))
      .curve(d3.curveMonotoneX);
    g.append("path")
      .datum(data)
      .attr("d", area)
      .attr("fill", `url(#${uid}-area)`);

    // Draws the trend line and animates it from left to right on mount.
    const lineFn = d3
      .line<TrendDataPoint>()
      .x((d) => x(d.month)!)
      .y((d) => y(d.score))
      .curve(d3.curveMonotoneX);
    const path = g
      .append("path")
      .datum(data)
      .attr("d", lineFn)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .style("filter", `drop-shadow(0 0 4px ${color})`);

    const totalLength = path.node()?.getTotalLength() || 0;
    path
      .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(1200)
      .attr("stroke-dashoffset", 0);

    // Creates the vertical scan marker that moves during play-all sonification.
    const scanLine = g
      .append("line")
      .attr("y1", 0)
      .attr("y2", iH)
      .attr("stroke", color)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .style("opacity", 0)
      .style("pointer-events", "none");

    // Builds the tooltip group that is shown for hovered, focused, or replayed points.
    const tooltip = g
      .append("g")
      .attr("class", "st-tip")
      .style("display", "none")
      .style("pointer-events", "none");

    tooltip
      .append("line")
      .attr("class", "tip-line")
      .attr("stroke", `${color}50`)
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "2,2");

    const tipCard = tooltip.append("g").attr("class", "tip-card");
    tipCard
      .append("rect")
      .attr("class", "tip-bg")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("fill", "rgba(6,8,13,0.92)")
      .attr("stroke", `${color}40`)
      .attr("stroke-width", 0.5)
      .style("filter", `url(#${uid}-tshadow)`);

    tipCard
      .append("text")
      .attr("class", "tip-label")
      .attr("font-size", "9px")
      .attr("fill", "rgba(138,155,189,0.6)")
      .attr("font-family", "var(--font-fira-code, monospace)")
      .attr("letter-spacing", "0.08em");

    tipCard
      .append("text")
      .attr("class", "tip-val")
      .attr("font-size", "14px")
      .attr("fill", color)
      .attr("font-family", "var(--font-fira-code, monospace)")
      .attr("font-weight", "700");

    tipCard
      .append("rect")
      .attr("class", "tip-bar-bg")
      .attr("rx", 1.5)
      .attr("ry", 1.5)
      .attr("fill", `${color}14`);
    tipCard
      .append("rect")
      .attr("class", "tip-bar-fill")
      .attr("rx", 1.5)
      .attr("ry", 1.5)
      .attr("fill", color);

    const tipW = 58,
      tipH = 40;

    function showTooltip(d: TrendDataPoint, idx: number) {
      const tx = x(d.month)!;
      const ty = y(d.score);
      const above = ty - tipH - 14 > 0;
      const tipY = above ? ty - tipH - 10 : ty + 14;

      tooltip
        .select(".tip-line")
        .attr("x1", tx)
        .attr("x2", tx)
        .attr("y1", ty + (above ? -4 : 4))
        .attr("y2", tipY + (above ? tipH : 0));

      let cardX = tx - tipW / 2;
      if (cardX < 0) cardX = 0;
      if (cardX + tipW > iW) cardX = iW - tipW;

      tipCard.attr("transform", `translate(${cardX}, ${tipY})`);
      tipCard.select(".tip-bg").attr("width", tipW).attr("height", tipH);
      tipCard.select(".tip-label").attr("x", 7).attr("y", 12).text(d.month);
      tipCard
        .select(".tip-val")
        .attr("x", 7)
        .attr("y", 27)
        .text(`${d.score.toFixed(0)}pts`);

      const barW = tipW - 14;
      tipCard
        .select(".tip-bar-bg")
        .attr("x", 7)
        .attr("y", 32)
        .attr("width", barW)
        .attr("height", 3);
      tipCard
        .select(".tip-bar-fill")
        .attr("x", 7)
        .attr("y", 32)
        .attr("width", barW * (d.score / 100))
        .attr("height", 3);

      void idx; // Preserves the index for data-attribute matching used by later interactions.
      tooltip.style("display", "inline");
    }

    function hideTooltip() {
      tooltip.style("display", "none");
    }

    // Adds keyboard-focusable point markers for direct inspection of each month.
    g.selectAll(".st-dot")
      .data(data)
      .join("circle")
      .attr("class", "st-dot")
      .attr("cx", (d) => x(d.month)!)
      .attr("cy", (d) => y(d.score))
      .attr("r", 2.5)
      .attr("fill", color)
      .attr("stroke", "#0b0f18")
      .attr("stroke-width", 1.5)
      .attr("tabindex", 0)
      .attr("role", "img")
      .attr("aria-label", (d) => `${d.month}: ${d.score.toFixed(0)} points`)
      .attr("data-idx", (_, i) => i)
      .style("cursor", "pointer")
      .style("outline", "none")
      .style("filter", `drop-shadow(0 0 3px ${color})`)
      .attr("opacity", 0)
      .transition()
      .delay((_, i) => 400 + i * 80)
      .attr("opacity", 1);

    // Attaches pointer and keyboard events after the initial transition wiring is complete.
    g.selectAll<SVGCircleElement, TrendDataPoint>(".st-dot")
      .on("focus", function (_, d) {
        const idx = Number(d3.select(this).attr("data-idx"));
        playTone(d.score);
        d3.select(this)
          .transition()
          .duration(80)
          .attr("r", 5)
          .attr("stroke", color)
          .attr("stroke-width", 2)
          .style("filter", `url(#${uid}-glow)`);
        showTooltip(d, idx);
      })
      .on("blur", function () {
        d3.select(this)
          .transition()
          .duration(80)
          .attr("r", 2.5)
          .attr("stroke", "#0b0f18")
          .attr("stroke-width", 1.5)
          .style("filter", `drop-shadow(0 0 3px ${color})`);
        hideTooltip();
      })
      .on("keydown", function (event: KeyboardEvent) {
        const idx = Number(d3.select(this).attr("data-idx"));
        let target: number | null = null;
        if (event.key === "ArrowRight" || event.key === "ArrowDown")
          target = idx + 1;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
          target = idx - 1;
        if (target !== null && target >= 0 && target < data.length) {
          event.preventDefault();
          (
            g.select(`[data-idx="${target}"]`).node() as HTMLElement | null
          )?.focus();
        }
      });

    // Draws the month and score axes after the data layers are rendered.
    g.append("g")
      .attr("transform", `translate(0,${iH})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call((sel) => sel.select(".domain").remove())
      .selectAll("text")
      .attr("fill", "rgba(138,155,189,0.5)")
      .attr("font-size", "9px")
      .attr("font-family", "var(--font-fira-code)")
      .attr("dy", "10px");

    g.append("g")
      .call(d3.axisLeft(y).ticks(4).tickSize(0))
      .call((sel) => sel.select(".domain").remove())
      .selectAll("text")
      .attr("fill", "rgba(138,155,189,0.5)")
      .attr("font-size", "9px")
      .attr("font-family", "var(--font-fira-code)");

    // Plays through every point in order so the full trend can be heard and highlighted.
    function doPlayAll() {
      if (playingRef.current) {
        stopPlayAll();
        scanLine.transition().duration(200).style("opacity", 0);
        containerRef.current
          ?.querySelector<HTMLButtonElement>(".st-play-btn")
          ?.classList.remove("active");
        return;
      }
      playingRef.current = true;
      containerRef.current
        ?.querySelector<HTMLButtonElement>(".st-play-btn")
        ?.classList.add("active");

      let i = 0;
      function step() {
        if (!playingRef.current || i >= data.length) {
          playingRef.current = false;
          scanLine.transition().duration(300).style("opacity", 0);
          containerRef.current
            ?.querySelector<HTMLButtonElement>(".st-play-btn")
            ?.classList.remove("active");
          // Restores every point marker to its idle style before playback begins.
          g.selectAll(".st-dot")
            .attr("r", 2.5)
            .attr("stroke", "#0b0f18")
            .attr("stroke-width", 1.5)
            .style("filter", `drop-shadow(0 0 3px ${color})`);
          hideTooltip();
          return;
        }
        const d = data[i];
        const cx = x(d.month)!;
        scanLine.attr("x1", cx).attr("x2", cx).style("opacity", 0.5);
        playTone(d.score);
        showTooltip(d, i);

        g.selectAll(".st-dot")
          .attr("r", 2.5)
          .attr("stroke", "#0b0f18")
          .attr("stroke-width", 1.5)
          .style("filter", `drop-shadow(0 0 3px ${color})`);
        g.select(`[data-idx="${i}"]`)
          .attr("r", 5)
          .attr("stroke", color)
          .attr("stroke-width", 2)
          .style("filter", `url(#${uid}-glow)`);

        i++;
        playTimerRef.current = window.setTimeout(step, 180);
      }
      step();
    }

    if (containerRef.current) {
      (
        containerRef.current as unknown as Record<string, () => void>
      ).__playAll = doPlayAll;
    }

    return () => {
      stopPlayAll();
    };
  }, [data, color, stopPlayAll]);

  const handlePlay = useCallback(() => {
    (
      containerRef.current as unknown as Record<
        string,
        (() => void) | undefined
      >
    )?.__playAll?.();
  }, []);

  const handleToggleSound = useCallback(() => {
    sonifyRef.current = !sonifyRef.current;
    containerRef.current
      ?.querySelector<HTMLButtonElement>(".st-sound-btn")
      ?.setAttribute("data-muted", String(!sonifyRef.current));
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Holds the chart playback and sonification controls. */}
      <div
        className="absolute top-0 right-0 z-10 flex items-center gap-1"
        style={{ padding: "2px 4px" }}
      >
        {/* Starts or stops sequential playback of the trend line. */}
        <button
          className="st-play-btn flex items-center justify-center rounded-full transition-all"
          onClick={handlePlay}
          title="Play trend sonification"
          style={{
            width: 20,
            height: 20,
            background: `color-mix(in srgb, ${color} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 18%, transparent)`,
            color,
            cursor: "pointer",
          }}
        >
          <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
            <polygon points="2,0 9,5 2,10" />
          </svg>
        </button>

        {/* Toggles whether playback and hover interactions emit tones. */}
        <button
          className="st-sound-btn flex items-center justify-center rounded-full transition-all"
          data-muted="false"
          onClick={handleToggleSound}
          title="Toggle sonification"
          style={{
            width: 20,
            height: 20,
            background: `color-mix(in srgb, ${color} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 18%, transparent)`,
            color,
            cursor: "pointer",
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path
              d="M8 2L4 5.5H1.5v5H4L8 14z"
              fill="currentColor"
              stroke="none"
            />
            <path d="M11 5.5c.8.8 1.2 1.8 1.2 2.8s-.4 2-1.2 2.8" />
            <path d="M13 3.5C14.3 4.8 15 6.6 15 8.3s-.7 3.5-2 4.8" />
          </svg>
        </button>
      </div>

      <svg ref={svgRef} className="w-full h-full" />

      <style jsx>{`
        .st-play-btn:hover,
        .st-sound-btn:hover {
          filter: brightness(1.3);
        }
        .st-play-btn.active {
          box-shadow: 0 0 8px color-mix(in srgb, ${color} 30%, transparent);
        }
        .st-sound-btn[data-muted="true"] {
          opacity: 0.35;
        }
        .st-sound-btn[data-muted="true"]::after {
          content: "";
          position: absolute;
          width: 14px;
          height: 1.5px;
          background: #ff3a8c;
          transform: rotate(-45deg);
          border-radius: 1px;
        }
      `}</style>
    </div>
  );
}

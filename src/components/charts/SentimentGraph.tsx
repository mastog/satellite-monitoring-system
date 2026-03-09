"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";

interface SentimentGraphProps {
  data?: number[];
}

// Renders the 30-day sentiment chart used by the community dashboard.
export default function SentimentGraph({ data }: SentimentGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sonifyRef = useRef(true);
  const playingRef = useRef(false);
  const playTimerRef = useRef<number | null>(null);

  // Lazily creates and resumes the shared audio context used for optional chart sonification.
  function getAudioCtx(): AudioContext {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  }

  // Maps a sentiment value into a short tone so interactive playback can sonify the trend.
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

  // Stops any active play-all sequence before the graph is redrawn or replayed.
  const stopPlayAll = useCallback(() => {
    playingRef.current = false;
    if (playTimerRef.current !== null) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 500;
    const height = svgRef.current.clientHeight || 180;
    const margin = { top: 24, right: 15, bottom: 25, left: 35 };
    const iW = width - margin.left - margin.right;
    const iH = height - margin.top - margin.bottom;

    const days = 30;
    const values = data && data.length === days ? data : Array(days).fill(50);
    const chartData = values.map((v, i) => ({ day: i + 1, value: v }));

    svg
      .attr("role", "group")
      .attr(
        "aria-label",
        "30-day sentiment trend. Use Tab to enter, Arrow keys to navigate, or press Play to hear the full trend."
      );

    const defs = svg.append("defs");

    // Defines gradients and glow filters used by the line, area, and tooltip layers.
    const areaGrad = defs
      .append("linearGradient")
      .attr("id", "sg-area")
      .attr("x1", "0")
      .attr("y1", "0")
      .attr("x2", "0")
      .attr("y2", "1");
    areaGrad
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#00e5ff")
      .attr("stop-opacity", 0.18);
    areaGrad
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#00e5ff")
      .attr("stop-opacity", 0);

    const glowFilter = defs
      .append("filter")
      .attr("id", "sg-glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    glowFilter
      .append("feGaussianBlur")
      .attr("stdDeviation", "3.5")
      .attr("result", "blur");
    glowFilter
      .append("feFlood")
      .attr("flood-color", "#00e5ff")
      .attr("flood-opacity", "0.7")
      .attr("result", "color");
    glowFilter
      .append("feComposite")
      .attr("in", "color")
      .attr("in2", "blur")
      .attr("operator", "in")
      .attr("result", "glow");
    const gm = glowFilter.append("feMerge");
    gm.append("feMergeNode").attr("in", "glow");
    gm.append("feMergeNode").attr("in", "SourceGraphic");

    // Adds a drop shadow so the tooltip remains readable over the chart.
    const tipShadow = defs
      .append("filter")
      .attr("id", "sg-tip-shadow")
      .attr("x", "-20%")
      .attr("y", "-20%")
      .attr("width", "140%")
      .attr("height", "140%");
    tipShadow
      .append("feDropShadow")
      .attr("dx", "0")
      .attr("dy", "2")
      .attr("stdDeviation", "4")
      .attr("flood-color", "#00e5ff")
      .attr("flood-opacity", "0.3");

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([1, days]).range([0, iW]);
    const y = d3.scaleLinear().domain([0, 100]).range([iH, 0]);

    // Draws horizontal guides, with the neutral 50 line emphasized.
    [25, 50, 75].forEach((v) => {
      g.append("line")
        .attr("x1", 0)
        .attr("x2", iW)
        .attr("y1", y(v))
        .attr("y2", y(v))
        .attr(
          "stroke",
          v === 50 ? "rgba(0,229,255,0.12)" : "rgba(0,229,255,0.04)"
        )
        .attr("stroke-dasharray", v === 50 ? "4,4" : "2,4");
    });

    // Draws the filled area and the main sentiment trend line.
    const area = d3
      .area<(typeof chartData)[0]>()
      .x((d) => x(d.day))
      .y0(iH)
      .y1((d) => y(d.value))
      .curve(d3.curveMonotoneX);
    g.append("path")
      .datum(chartData)
      .attr("d", area)
      .attr("fill", "url(#sg-area)");

    const line = d3
      .line<(typeof chartData)[0]>()
      .x((d) => x(d.day))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);
    g.append("path")
      .datum(chartData)
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", "#00e5ff")
      .attr("stroke-width", 1.5)
      .style("filter", "drop-shadow(0 0 4px #00e5ff)");

    // Creates the scan line that becomes visible during play-all sonification.
    const scanLine = g
      .append("line")
      .attr("y1", 0)
      .attr("y2", iH)
      .attr("stroke", "#00e5ff")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .style("opacity", 0)
      .style("pointer-events", "none");

    // Builds the tooltip group that follows the hovered or focused point.
    const tooltip = g
      .append("g")
      .attr("class", "sg-tip")
      .style("display", "none")
      .style("pointer-events", "none");

    // Connects the tooltip card back to the active point.
    tooltip
      .append("line")
      .attr("class", "tip-line")
      .attr("stroke", "rgba(0,229,255,0.3)")
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "2,2");

    // Draws the tooltip container that holds the point details.
    const tipCard = tooltip.append("g").attr("class", "tip-card");
    tipCard
      .append("rect")
      .attr("class", "tip-bg")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("fill", "rgba(6,8,13,0.92)")
      .attr("stroke", "rgba(0,229,255,0.25)")
      .attr("stroke-width", 0.5)
      .style("filter", "url(#sg-tip-shadow)");

    // Displays the day label inside the tooltip.
    tipCard
      .append("text")
      .attr("class", "tip-day")
      .attr("font-size", "9px")
      .attr("fill", "rgba(138,155,189,0.6)")
      .attr("font-family", "var(--font-fira-code, 'Fira Code', monospace)")
      .attr("letter-spacing", "0.08em");

    // Displays the sentiment value inside the tooltip.
    tipCard
      .append("text")
      .attr("class", "tip-val")
      .attr("font-size", "14px")
      .attr("fill", "#00e5ff")
      .attr("font-family", "var(--font-fira-code, 'Fira Code', monospace)")
      .attr("font-weight", "700");

    // Draws the mini progress bar background inside the tooltip.
    tipCard
      .append("rect")
      .attr("class", "tip-bar-bg")
      .attr("rx", 1.5)
      .attr("ry", 1.5)
      .attr("fill", "rgba(0,229,255,0.08)");
    // Draws the mini progress bar fill scaled to the point value.
    tipCard
      .append("rect")
      .attr("class", "tip-bar-fill")
      .attr("rx", 1.5)
      .attr("ry", 1.5)
      .attr("fill", "#00e5ff");

    const tipW = 62,
      tipH = 40;

    function showTooltip(d: { day: number; value: number }) {
      const tx = x(d.day);
      const ty = y(d.value);
      const above = ty - tipH - 14 > 0;
      const tipY = above ? ty - tipH - 10 : ty + 14;

      // Connects the active point marker to the floating tooltip card.
      tooltip
        .select(".tip-line")
        .attr("x1", tx)
        .attr("x2", tx)
        .attr("y1", ty + (above ? -4 : 4))
        .attr("y2", tipY + (above ? tipH : 0));

      // Clamps the tooltip horizontally so it stays inside the chart viewport.
      let cardX = tx - tipW / 2;
      if (cardX < 0) cardX = 0;
      if (cardX + tipW > iW) cardX = iW - tipW;

      tipCard.attr("transform", `translate(${cardX}, ${tipY})`);
      tipCard.select(".tip-bg").attr("width", tipW).attr("height", tipH);
      tipCard
        .select(".tip-day")
        .attr("x", 7)
        .attr("y", 12)
        .text(`DAY ${d.day}`);
      tipCard
        .select(".tip-val")
        .attr("x", 7)
        .attr("y", 27)
        .text(`${d.value.toFixed(0)}%`);

      // Draws the miniature progress bar inside the tooltip card.
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
        .attr("width", barW * (d.value / 100))
        .attr("height", 3);

      tooltip.style("display", "inline");
    }

    function hideTooltip() {
      tooltip.style("display", "none");
    }

    // Adds interactive point markers for each day in the sentiment series.
    g.selectAll(".sg-dot")
      .data(chartData)
      .enter()
      .append("circle")
      .attr("class", "sg-dot")
      .attr("cx", (d) => x(d.day))
      .attr("cy", (d) => y(d.value))
      .attr("r", 2)
      .attr("fill", "#00e5ff")
      .attr("stroke", "rgba(6,8,13,0.8)")
      .attr("stroke-width", 1)
      .attr("tabindex", 0)
      .attr("role", "img")
      .attr("aria-label", (d) => `Day ${d.day}: ${d.value.toFixed(0)}% support`)
      .attr("data-day", (d) => d.day)
      .style("cursor", "pointer")
      .style("outline", "none")
      .on("focus", function (_, d) {
        playTone(d.value);
        d3.select(this)
          .transition()
          .duration(80)
          .attr("r", 5)
          .attr("stroke", "#00e5ff")
          .attr("stroke-width", 2)
          .style("filter", "url(#sg-glow)");
        showTooltip(d);
      })
      .on("blur", function () {
        d3.select(this)
          .transition()
          .duration(80)
          .attr("r", 2)
          .attr("stroke", "rgba(6,8,13,0.8)")
          .attr("stroke-width", 1)
          .style("filter", "none");
        hideTooltip();
      })
      .on("keydown", function (event: KeyboardEvent, d) {
        let target: number | null = null;
        if (event.key === "ArrowRight" || event.key === "ArrowDown")
          target = d.day + 1;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
          target = d.day - 1;
        if (target !== null && target >= 1 && target <= days) {
          event.preventDefault();
          (
            g.select(`[data-day="${target}"]`).node() as HTMLElement | null
          )?.focus();
        }
      });

    // Draws the day and score axes after the data layers are rendered.
    g.append("g")
      .attr("transform", `translate(0,${iH})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(6)
          .tickSize(0)
          .tickFormat((d) => `D${d}`)
      )
      .call((sel) => sel.select(".domain").remove())
      .selectAll("text")
      .attr("fill", "rgba(138,155,189,0.4)")
      .attr("font-size", "9px")
      .attr("dy", "8px");

    g.append("g")
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickSize(0)
          .tickFormat((d) => `${d}%`)
      )
      .call((sel) => sel.select(".domain").remove())
      .selectAll("text")
      .attr("fill", "rgba(138,155,189,0.4)")
      .attr("font-size", "9px");

    // Plays through the entire sentiment timeline so each point can be highlighted and optionally sonified.
    function doPlayAll() {
      if (playingRef.current) {
        stopPlayAll();
        scanLine.transition().duration(200).style("opacity", 0);
        // Restores the chart UI to its idle state before playback begins.
        containerRef.current
          ?.querySelector<HTMLButtonElement>(".sg-play-btn")
          ?.classList.remove("active");
        return;
      }
      playingRef.current = true;
      containerRef.current
        ?.querySelector<HTMLButtonElement>(".sg-play-btn")
        ?.classList.add("active");

      let i = 0;
      function step() {
        if (!playingRef.current || i >= days) {
          playingRef.current = false;
          scanLine.transition().duration(300).style("opacity", 0);
          containerRef.current
            ?.querySelector<HTMLButtonElement>(".sg-play-btn")
            ?.classList.remove("active");
          return;
        }
        const d = chartData[i];
        const cx = x(d.day);
        scanLine.attr("x1", cx).attr("x2", cx).style("opacity", 0.5);
        playTone(d.value);
        showTooltip(d);

        // Highlights the current point marker while playback advances.
        g.selectAll(".sg-dot")
          .attr("r", 2)
          .attr("stroke", "rgba(6,8,13,0.8)")
          .attr("stroke-width", 1)
          .style("filter", "none");
        g.select(`[data-day="${d.day}"]`)
          .attr("r", 5)
          .attr("stroke", "#00e5ff")
          .attr("stroke-width", 2)
          .style("filter", "url(#sg-glow)");

        i++;
        playTimerRef.current = window.setTimeout(step, 120);
      }
      step();
    }

    // Exposes the play-all handler to the external button rendered below the SVG.
    if (containerRef.current) {
      (
        containerRef.current as unknown as Record<string, () => void>
      ).__playAll = doPlayAll;
    }

    return () => {
      stopPlayAll();
    };
  }, [data, stopPlayAll]);

  const handlePlay = useCallback(() => {
    const fn = (
      containerRef.current as unknown as Record<
        string,
        (() => void) | undefined
      >
    )?.__playAll;
    fn?.();
  }, []);

  const handleToggleSound = useCallback(() => {
    sonifyRef.current = !sonifyRef.current;
    const btn =
      containerRef.current?.querySelector<HTMLButtonElement>(".sg-sound-btn");
    if (btn) btn.setAttribute("data-muted", String(!sonifyRef.current));
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Hosts the legend and playback controls for the chart. */}
      <div
        className="absolute top-0 right-0 z-10 flex items-center gap-1"
        style={{ padding: "2px 4px" }}
      >
        {/* Labels the metric represented by the line and area. */}
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(0,229,255,0.06)",
            border: "1px solid rgba(0,229,255,0.12)",
          }}
        >
          <div
            className="w-2 h-0.5 rounded-full"
            style={{ background: "#00e5ff", boxShadow: "0 0 4px #00e5ff" }}
          />
          <span
            style={{
              fontSize: "10px",
              color: "rgba(0,229,255,0.7)",
              fontFamily: "var(--font-fira-code, monospace)",
              letterSpacing: "0.05em",
            }}
          >
            SUPPORT %
          </span>
        </div>

        {/* Starts or stops sequential playback of the chart. */}
        <button
          className="sg-play-btn flex items-center justify-center rounded-full transition-all"
          onClick={handlePlay}
          title="Play trend sonification"
          style={{
            width: 20,
            height: 20,
            background: "rgba(0,229,255,0.06)",
            border: "1px solid rgba(0,229,255,0.15)",
            color: "#00e5ff",
            cursor: "pointer",
          }}
        >
          <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
            <polygon points="2,0 9,5 2,10" />
          </svg>
        </button>

        {/* Enables or disables chart sonification. */}
        <button
          className="sg-sound-btn flex items-center justify-center rounded-full transition-all"
          data-muted="false"
          onClick={handleToggleSound}
          title="Toggle sonification"
          style={{
            width: 20,
            height: 20,
            background: "rgba(0,229,255,0.06)",
            border: "1px solid rgba(0,229,255,0.15)",
            color: "#00e5ff",
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

      {/* Styles the HTML control buttons to match the chart's visual language. */}
      <style jsx>{`
        .sg-play-btn:hover,
        .sg-sound-btn:hover {
          background: rgba(0, 229, 255, 0.12) !important;
          border-color: rgba(0, 229, 255, 0.3) !important;
        }
        .sg-play-btn.active {
          background: rgba(0, 229, 255, 0.18) !important;
          border-color: rgba(0, 229, 255, 0.4) !important;
          box-shadow: 0 0 8px rgba(0, 229, 255, 0.2);
        }
        .sg-sound-btn[data-muted="true"] {
          color: rgba(138, 155, 189, 0.4) !important;
          border-color: rgba(138, 155, 189, 0.15) !important;
        }
        .sg-sound-btn[data-muted="true"]::after {
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

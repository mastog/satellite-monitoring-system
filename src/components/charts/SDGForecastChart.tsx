"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import type { ForecastPoint } from "@/lib/sdg/forecast";

interface SDGForecastChartProps {
  historical: { year: number; score: number }[];
  forecast: ForecastPoint[];
  color: string;
}

// Renders the historical-plus-forecast line chart used by the SDG prediction panel.
export default function SDGForecastChart({
  historical,
  forecast,
  color,
}: SDGForecastChartProps) {
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

  // Maps a score value to a short tone so keyboard and playback interactions can sonify the chart.
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

  // Stops any in-progress play-all sequence before the chart is redrawn or restarted.
  const stopPlayAll = useCallback(() => {
    playingRef.current = false;
    if (playTimerRef.current !== null) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!svgRef.current || historical.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 24, right: 14, bottom: 28, left: 34 };
    const width = svgRef.current.clientWidth || 400;
    const height = svgRef.current.clientHeight || 250;
    const iw = width - margin.left - margin.right;
    const ih = height - margin.top - margin.bottom;

    // Creates instance-specific IDs so gradients and filters do not collide when multiple charts exist on one page.
    const uid = `fc-${Math.random().toString(36).slice(2, 8)}`;

    svg
      .attr("role", "group")
      .attr(
        "aria-label",
        "SDG forecast chart. Use Tab to enter, Arrow keys to navigate historical and forecast points."
      );

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Merges historical and forecast metadata into the structures needed for rendering and keyboard navigation.
    const allYears = [
      ...historical.map((d) => d.year),
      ...forecast.map((d) => d.year),
    ];
    const minYear = d3.min(allYears)!;
    const maxYear = d3.max(allYears)!;
    const boundaryYear = historical[historical.length - 1].year;

    const bridgedForecast = [
      {
        year: boundaryYear,
        score: historical[historical.length - 1].score,
        lower: historical[historical.length - 1].score,
        upper: historical[historical.length - 1].score,
      },
      ...forecast,
    ];

    // Keeps a boundary-deduplicated point list so keyboard navigation can move through the entire timeline cleanly.
    const allPoints = [
      ...historical.map((d) => ({
        year: d.year,
        score: d.score,
        type: "hist" as const,
      })),
      ...forecast.map((d) => ({
        year: d.year,
        score: d.score,
        type: "forecast" as const,
      })),
    ];

    // Maps years and normalized scores into chart coordinates.
    const x = d3.scaleLinear().domain([minYear, maxYear]).range([0, iw]);
    const y = d3.scaleLinear().domain([0, 100]).range([ih, 0]);

    // Defines gradients and filters used by the forecast area, confidence band, and tooltip.
    const defs = svg.append("defs");

    const histGrad = defs
      .append("linearGradient")
      .attr("id", `${uid}-hg`)
      .attr("x1", "0")
      .attr("y1", "0")
      .attr("x2", "0")
      .attr("y2", "1");
    histGrad
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", color)
      .attr("stop-opacity", 0.2);
    histGrad
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", color)
      .attr("stop-opacity", 0);

    const ciGrad = defs
      .append("linearGradient")
      .attr("id", `${uid}-ci`)
      .attr("x1", "0")
      .attr("y1", "0")
      .attr("x2", "0")
      .attr("y2", "1");
    ciGrad
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", color)
      .attr("stop-opacity", 0.15);
    ciGrad
      .append("stop")
      .attr("offset", "50%")
      .attr("stop-color", color)
      .attr("stop-opacity", 0.08);
    ciGrad
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", color)
      .attr("stop-opacity", 0.02);

    // Adds a reusable glow filter for the highlighted forecast line.
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

    // Adds a shadow filter so the tooltip card remains readable over the chart.
    const tipShadow = defs
      .append("filter")
      .attr("id", `${uid}-ts`)
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

    // Draws horizontal guide lines for common score thresholds.
    [25, 50, 75].forEach((v) => {
      g.append("line")
        .attr("x1", 0)
        .attr("x2", iw)
        .attr("y1", y(v))
        .attr("y2", y(v))
        .attr("stroke", "rgba(255,255,255,0.04)")
        .attr("stroke-dasharray", "3,3");
    });

    // Highlights the forecast portion of the timeline so it is visually distinct from historical data.
    g.append("rect")
      .attr("x", x(boundaryYear))
      .attr("y", 0)
      .attr("width", iw - x(boundaryYear))
      .attr("height", ih)
      .attr("fill", `${color}04`);

    // Marks the point where measured history transitions into projected values.
    g.append("line")
      .attr("x1", x(boundaryYear))
      .attr("x2", x(boundaryYear))
      .attr("y1", 0)
      .attr("y2", ih)
      .attr("stroke", color)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,3")
      .attr("opacity", 0.4);

    g.append("text")
      .attr("x", x(boundaryYear) + 4)
      .attr("y", 10)
      .attr("fill", color)
      .attr("font-size", "9px")
      .attr("font-family", "var(--font-fira-code)")
      .attr("font-weight", "bold")
      .attr("letter-spacing", "0.1em")
      .attr("opacity", 0.6)
      .text("NOW");

    g.append("text")
      .attr("x", (x(boundaryYear) + iw) / 2)
      .attr("y", ih - 6)
      .attr("fill", color)
      .attr("font-size", "9px")
      .attr("font-family", "var(--font-orbitron)")
      .attr("font-weight", "bold")
      .attr("letter-spacing", "0.15em")
      .attr("text-anchor", "middle")
      .attr("opacity", 0.2)
      .text("FORECAST");

    // Draws the historical area fill under the observed data series.
    const histArea = d3
      .area<{ year: number; score: number }>()
      .x((d) => x(d.year))
      .y0(ih)
      .y1((d) => y(d.score))
      .curve(d3.curveMonotoneX);
    g.append("path")
      .datum(historical)
      .attr("d", histArea)
      .attr("fill", `url(#${uid}-hg)`);

    // Draws the forecast confidence interval so projection uncertainty is visible.
    const ciArea = d3
      .area<ForecastPoint>()
      .x((d) => x(d.year))
      .y0((d) => y(d.lower))
      .y1((d) => y(d.upper))
      .curve(d3.curveMonotoneX);
    g.append("path")
      .datum(bridgedForecast)
      .attr("d", ciArea)
      .attr("fill", `url(#${uid}-ci)`)
      .attr("opacity", 0)
      .transition()
      .delay(800)
      .duration(600)
      .attr("opacity", 1);

    // Draws the upper and lower confidence boundaries over the confidence band.
    const ciLine = (key: "upper" | "lower") =>
      d3
        .line<ForecastPoint>()
        .x((d) => x(d.year))
        .y((d) => y(d[key]))
        .curve(d3.curveMonotoneX);
    (["upper", "lower"] as const).forEach((key) => {
      g.append("path")
        .datum(bridgedForecast)
        .attr("d", ciLine(key))
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 0.7)
        .attr("stroke-dasharray", "2,3")
        .attr("opacity", 0)
        .transition()
        .delay(800)
        .duration(600)
        .attr("opacity", 0.3);
    });

    // Draws the observed historical score line.
    const histLine = d3
      .line<{ year: number; score: number }>()
      .x((d) => x(d.year))
      .y((d) => y(d.score))
      .curve(d3.curveMonotoneX);
    const histPath = g
      .append("path")
      .datum(historical)
      .attr("d", histLine)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .style("filter", `drop-shadow(0 0 4px ${color})`);

    const histLen = histPath.node()?.getTotalLength() || 0;
    histPath
      .attr("stroke-dasharray", `${histLen} ${histLen}`)
      .attr("stroke-dashoffset", histLen)
      .transition()
      .duration(1000)
      .attr("stroke-dashoffset", 0);

    // Draws the projected score line with a dashed treatment distinct from history.
    const fcLine = d3
      .line<ForecastPoint>()
      .x((d) => x(d.year))
      .y((d) => y(d.score))
      .curve(d3.curveMonotoneX);
    const fcPath = g
      .append("path")
      .datum(bridgedForecast)
      .attr("d", fcLine)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "6,4")
      .style("filter", `drop-shadow(0 0 4px ${color})`);

    const fcLen = fcPath.node()?.getTotalLength() || 0;
    fcPath
      .attr("stroke-dasharray", `${fcLen} ${fcLen}`)
      .attr("stroke-dashoffset", fcLen)
      .transition()
      .delay(900)
      .duration(800)
      .attr("stroke-dashoffset", 0)
      .on("end", () => {
        fcPath.attr("stroke-dasharray", "6,4");
      });

    // Creates the vertical scan marker used during forecast playback and inspection.
    const scanLine = g
      .append("line")
      .attr("y1", 0)
      .attr("y2", ih)
      .attr("stroke", color)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .style("opacity", 0)
      .style("pointer-events", "none");

    // Builds the shared tooltip group for hovered or replayed historical and forecast points.
    const tooltip = g
      .append("g")
      .attr("class", "fc-tip")
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
      .style("filter", `url(#${uid}-ts)`);
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
      .append("text")
      .attr("class", "tip-type")
      .attr("font-size", "8px")
      .attr("fill", "rgba(138,155,189,0.4)")
      .attr("font-family", "var(--font-fira-code, monospace)")
      .attr("letter-spacing", "0.1em");
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

    const tipW = 65,
      tipH = 46;

    function showTooltip(pt: (typeof allPoints)[0]) {
      const tx = x(pt.year);
      const ty = y(pt.score);
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
      if (cardX + tipW > iw) cardX = iw - tipW;

      tipCard.attr("transform", `translate(${cardX}, ${tipY})`);
      tipCard.select(".tip-bg").attr("width", tipW).attr("height", tipH);
      tipCard
        .select(".tip-label")
        .attr("x", 7)
        .attr("y", 12)
        .text(String(pt.year));
      tipCard
        .select(".tip-val")
        .attr("x", 7)
        .attr("y", 26)
        .text(`${pt.score.toFixed(0)}pts`);
      tipCard
        .select(".tip-type")
        .attr("x", 7)
        .attr("y", 35)
        .text(pt.type === "forecast" ? "FORECAST" : "HISTORICAL");

      const barW = tipW - 14;
      tipCard
        .select(".tip-bar-bg")
        .attr("x", 7)
        .attr("y", 39)
        .attr("width", barW)
        .attr("height", 3);
      tipCard
        .select(".tip-bar-fill")
        .attr("x", 7)
        .attr("y", 39)
        .attr("width", barW * (pt.score / 100))
        .attr("height", 3);

      tooltip.style("display", "inline");
    }

    function hideTooltip() {
      tooltip.style("display", "none");
    }

    // Adds interactive points for the historical observations.
    g.selectAll(".fc-dot-h")
      .data(historical)
      .join("circle")
      .attr("class", "fc-dot")
      .attr("cx", (d) => x(d.year))
      .attr("cy", (d) => y(d.score))
      .attr("r", 2.5)
      .attr("fill", color)
      .attr("stroke", "#0b0f18")
      .attr("stroke-width", 1.5)
      .style("filter", `drop-shadow(0 0 3px ${color})`)
      .attr("tabindex", 0)
      .attr("role", "img")
      .attr(
        "aria-label",
        (d) => `${d.year}: ${d.score.toFixed(0)} points (historical)`
      )
      .attr("data-idx", (_, i) => i)
      .style("cursor", "pointer")
      .style("outline", "none")
      .attr("opacity", 0)
      .transition()
      .delay((_, i) => 300 + i * 70)
      .attr("opacity", 1);

    // Adds interactive points for the forecast years.
    g.selectAll(".fc-dot-f")
      .data(forecast)
      .join("circle")
      .attr("class", "fc-dot")
      .attr("cx", (d) => x(d.year))
      .attr("cy", (d) => y(d.score))
      .attr("r", 3)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 1.5)
      .style("filter", `drop-shadow(0 0 4px ${color})`)
      .attr("tabindex", 0)
      .attr("role", "img")
      .attr(
        "aria-label",
        (d) => `${d.year}: ${d.score.toFixed(0)} points (forecast)`
      )
      .attr("data-idx", (_, i) => historical.length + i)
      .style("cursor", "pointer")
      .style("outline", "none")
      .attr("opacity", 0)
      .transition()
      .delay((_, i) => 1200 + i * 100)
      .attr("opacity", 0.8);

    // Labels the final forecast point so the projected destination is readable at a glance.
    if (forecast.length > 0) {
      const last = forecast[forecast.length - 1];
      g.append("text")
        .attr("x", x(last.year))
        .attr("y", y(last.score) - 10)
        .attr("text-anchor", "middle")
        .attr("fill", color)
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .attr("font-family", "var(--font-fira-code)")
        .style("filter", `drop-shadow(0 0 3px ${color})`)
        .attr("opacity", 0)
        .transition()
        .delay(1700)
        .duration(400)
        .attr("opacity", 0.9)
        .text(Math.round(last.score));
    }

    // Attaches hover and keyboard interactions to every point in the timeline.
    g.selectAll<SVGCircleElement, unknown>(".fc-dot")
      .on("focus", function () {
        const idx = Number(d3.select(this).attr("data-idx"));
        const pt = allPoints[idx];
        if (!pt) return;
        playTone(pt.score);
        d3.select(this)
          .transition()
          .duration(80)
          .attr("r", 5.5)
          .attr("stroke", color)
          .attr("stroke-width", 2.5)
          .style("filter", `url(#${uid}-glow)`);
        showTooltip(pt);
      })
      .on("blur", function () {
        const idx = Number(d3.select(this).attr("data-idx"));
        const isForecast = idx >= historical.length;
        d3.select(this)
          .transition()
          .duration(80)
          .attr("r", isForecast ? 3 : 2.5)
          .attr("stroke", isForecast ? color : "#0b0f18")
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
        if (target !== null && target >= 0 && target < allPoints.length) {
          event.preventDefault();
          (
            g.select(`[data-idx="${target}"]`).node() as HTMLElement | null
          )?.focus();
        }
      });

    // Draws the year and score axes after the data layers are in place.
    const tickYears = allYears.filter(
      (yr) => yr % 2 === 1 || yr === minYear || yr === maxYear
    );
    g.append("g")
      .attr("transform", `translate(0,${ih})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues(tickYears)
          .tickFormat((d) => String(d))
          .tickSize(0)
      )
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

    // Plays through the full timeline sequentially for sonified inspection.
    function doPlayAll() {
      if (playingRef.current) {
        stopPlayAll();
        scanLine.transition().duration(200).style("opacity", 0);
        containerRef.current
          ?.querySelector<HTMLButtonElement>(".fc-play-btn")
          ?.classList.remove("active");
        return;
      }
      playingRef.current = true;
      containerRef.current
        ?.querySelector<HTMLButtonElement>(".fc-play-btn")
        ?.classList.add("active");

      let i = 0;
      function step() {
        if (!playingRef.current || i >= allPoints.length) {
          playingRef.current = false;
          scanLine.transition().duration(300).style("opacity", 0);
          containerRef.current
            ?.querySelector<HTMLButtonElement>(".fc-play-btn")
            ?.classList.remove("active");
          g.selectAll(".fc-dot").each(function () {
            const el = d3.select(this);
            const idx = Number(el.attr("data-idx"));
            const isFc = idx >= historical.length;
            el.attr("r", isFc ? 3 : 2.5)
              .attr("stroke", isFc ? color : "#0b0f18")
              .attr("stroke-width", 1.5)
              .style("filter", `drop-shadow(0 0 3px ${color})`);
          });
          hideTooltip();
          return;
        }
        const pt = allPoints[i];
        const cx = x(pt.year);
        scanLine.attr("x1", cx).attr("x2", cx).style("opacity", 0.5);
        playTone(pt.score);
        showTooltip(pt);

        g.selectAll(".fc-dot").each(function () {
          const el = d3.select(this);
          const idx = Number(el.attr("data-idx"));
          const isFc = idx >= historical.length;
          el.attr("r", isFc ? 3 : 2.5)
            .attr("stroke", isFc ? color : "#0b0f18")
            .attr("stroke-width", 1.5)
            .style("filter", `drop-shadow(0 0 3px ${color})`);
        });
        g.select(`[data-idx="${i}"]`)
          .attr("r", 5.5)
          .attr("stroke", color)
          .attr("stroke-width", 2.5)
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
  }, [historical, forecast, color, stopPlayAll]);

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
      ?.querySelector<HTMLButtonElement>(".fc-sound-btn")
      ?.setAttribute("data-muted", String(!sonifyRef.current));
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <div
        className="absolute top-0 right-0 z-10 flex items-center gap-1"
        style={{ padding: "2px 4px" }}
      >
        <button
          className="fc-play-btn flex items-center justify-center rounded-full transition-all"
          onClick={handlePlay}
          title="Play forecast sonification"
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
        <button
          className="fc-sound-btn flex items-center justify-center rounded-full transition-all"
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
        .fc-play-btn:hover,
        .fc-sound-btn:hover {
          filter: brightness(1.3);
        }
        .fc-play-btn.active {
          box-shadow: 0 0 8px color-mix(in srgb, ${color} 30%, transparent);
        }
        .fc-sound-btn[data-muted="true"] {
          opacity: 0.35;
        }
        .fc-sound-btn[data-muted="true"]::after {
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

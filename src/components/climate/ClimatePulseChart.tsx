"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { ClimateEvent, ClimateEventType } from "@/lib/climate/data";
import { EVENT_TYPE_COLORS, ALL_EVENT_TYPES } from "@/lib/climate/data";

interface ClimatePulseChartProps {
  events: ClimateEvent[];
}

export default function ClimatePulseChart({ events }: ClimatePulseChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 180;
    const margin = { top: 12, right: 12, bottom: 28, left: 32 };
    const iW = width - margin.left - margin.right;
    const iH = height - margin.top - margin.bottom;

    svg.attr("width", width).attr("height", height);

    // Aggregates event severity into overlapping daily buckets across the last ninety days.
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 90);

    const days: Date[] = [];
    for (let i = 0; i <= 90; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      days.push(d);
    }

    // Limits the stacked chart to event types that are actually present in the current dataset.
    const presentTypes = ALL_EVENT_TYPES.filter((t) =>
      events.some((e) => e.type === t)
    );

    type DayData = { date: Date } & Record<ClimateEventType, number>;
    const dayData: DayData[] = days.map((day) => {
      const row = { date: day } as DayData;
      ALL_EVENT_TYPES.forEach((t) => {
        row[t] = 0;
      });

      events.forEach((ev) => {
        const evDate = new Date(ev.detectionDate);
        const diff = Math.abs(
          (day.getTime() - evDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diff <= 3) {
          row[ev.type] += ev.severity;
        }
      });
      return row;
    });

    const defs = svg.append("defs");

    // Defines one fill gradient per event type so each stacked area can retain its own color identity.
    presentTypes.forEach((t) => {
      const grad = defs
        .append("linearGradient")
        .attr("id", `clm-area-${t}`)
        .attr("x1", "0")
        .attr("y1", "0")
        .attr("x2", "0")
        .attr("y2", "1");
      grad
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", EVENT_TYPE_COLORS[t])
        .attr("stop-opacity", 0.3);
      grad
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", EVENT_TYPE_COLORS[t])
        .attr("stop-opacity", 0);
    });

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime().domain([startDate, now]).range([0, iW]);

    const stack = d3
      .stack<DayData>()
      .keys(presentTypes)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const stacked = stack(dayData);

    const maxY = d3.max(stacked, (layer) => d3.max(layer, (d) => d[1])) || 10;

    const y = d3
      .scaleLinear()
      .domain([0, maxY * 1.15])
      .range([iH, 0]);

    // Draws horizontal reference lines behind the stacked areas.
    y.ticks(4).forEach((tick) => {
      g.append("line")
        .attr("x1", 0)
        .attr("x2", iW)
        .attr("y1", y(tick))
        .attr("y2", y(tick))
        .attr("stroke", "rgba(255,107,44,0.035)")
        .attr("stroke-dasharray", "2,4");
    });

    // Renders the stacked severity areas and their top outlines for each active event type.
    const area = d3
      .area<d3.SeriesPoint<DayData>>()
      .x((d) => x(d.data.date))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(d3.curveMonotoneX);

    stacked.forEach((layer) => {
      const t = layer.key as ClimateEventType;
      g.append("path")
        .datum(layer)
        .attr("d", area)
        .attr("fill", `url(#clm-area-${t})`);

      const topLine = d3
        .line<d3.SeriesPoint<DayData>>()
        .x((d) => x(d.data.date))
        .y((d) => y(d[1]))
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(layer)
        .attr("d", topLine)
        .attr("fill", "none")
        .attr("stroke", EVENT_TYPE_COLORS[t])
        .attr("stroke-width", 1)
        .attr("opacity", 0.7)
        .style("filter", `drop-shadow(0 0 3px ${EVENT_TYPE_COLORS[t]})`);
    });

    // Adds the time and severity axes after the stacked layers are drawn.
    g.append("g")
      .attr("transform", `translate(0,${iH})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(6)
          .tickSize(0)
          .tickFormat((d) => {
            const date = d as Date;
            return d3.timeFormat("%b %d")(date);
          })
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
          .tickFormat((d) => String(d))
      )
      .call((sel) => sel.select(".domain").remove())
      .selectAll("text")
      .attr("fill", "rgba(138,155,189,0.4)")
      .attr("font-size", "9px");
  }, [events]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}

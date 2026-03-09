"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import type { GroundStation } from "@/lib/ground/data";
import { OPERATOR_COLORS, STATION_TYPE_SHAPES } from "@/lib/ground/data";
import { worldCountries, worldBorders } from "@/lib/geo/worldGeo";

interface StationMapProps {
  stations: GroundStation[];
  selectedStationId: string | null;
  onStationClick: (station: GroundStation) => void;
}

function drawMarker(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  cx: number,
  cy: number,
  shape: string,
  color: string,
  size: number,
  isSelected: boolean
) {
  const group = g
    .append("g")
    .attr("transform", `translate(${cx},${cy})`)
    .style("cursor", "pointer");

  const s = isSelected ? size * 1.5 : size;

  switch (shape) {
    case "diamond":
      group
        .append("polygon")
        .attr("points", `0,${-s} ${s},0 0,${s} ${-s},0`)
        .attr("fill", `${color}50`)
        .attr("stroke", color)
        .attr("stroke-width", isSelected ? 1.5 : 0.8);
      break;
    case "square":
      group
        .append("rect")
        .attr("x", -s * 0.7)
        .attr("y", -s * 0.7)
        .attr("width", s * 1.4)
        .attr("height", s * 1.4)
        .attr("fill", `${color}50`)
        .attr("stroke", color)
        .attr("stroke-width", isSelected ? 1.5 : 0.8);
      break;
    case "star": {
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? s : s * 0.45;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        pts.push(`${Math.cos(a) * r},${Math.sin(a) * r}`);
      }
      group
        .append("polygon")
        .attr("points", pts.join(" "))
        .attr("fill", `${color}50`)
        .attr("stroke", color)
        .attr("stroke-width", isSelected ? 1.5 : 0.8);
      break;
    }
    default:
      group
        .append("circle")
        .attr("r", s)
        .attr("fill", `${color}50`)
        .attr("stroke", color)
        .attr("stroke-width", isSelected ? 1.5 : 0.8);
  }

  // Adds an extra ring so the currently selected station stays visually distinct.
  if (isSelected) {
    group
      .append("circle")
      .attr("r", s + 7)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 0.6)
      .attr("opacity", 0.5)
      .attr("stroke-dasharray", "3,2");
  }

  return group;
}

export default function StationMap({
  stations,
  selectedStationId,
  onStationClick,
}: StationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    station: GroundStation;
  } | null>(null);

  const render = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    if (width < 10 || height < 10) return;

    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    const projection = d3
      .geoNaturalEarth1()
      .fitSize([width, height], worldCountries);

    const path = d3.geoPath(projection);

    // Defines the glow filter used by station markers.
    const defs = svg.append("defs");

    const glow = defs
      .append("filter")
      .attr("id", "gnd-glow")
      .attr("x", "-150%")
      .attr("y", "-150%")
      .attr("width", "400%")
      .attr("height", "400%");
    glow
      .append("feGaussianBlur")
      .attr("stdDeviation", "2.5")
      .attr("result", "blur");
    const glowMerge = glow.append("feMerge");
    glowMerge.append("feMergeNode").attr("in", "blur");
    glowMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Paints the ocean backdrop behind all geographic layers.
    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "#060a12");

    // Draws the latitude and longitude grid over the ocean background.
    svg
      .append("path")
      .datum(d3.geoGraticule10())
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "rgba(0,229,255,0.025)")
      .attr("stroke-width", 0.4);

    // Fills the country landmasses before borders and markers are layered on top.
    svg
      .selectAll(".country")
      .data(worldCountries.features)
      .enter()
      .append("path")
      .attr("class", "country")
      .attr("d", (d: any) => path(d) || "")
      .attr("fill", "#0c1320")
      .attr("stroke", "none");

    // Draws interior political borders so regions remain legible at map scale.
    svg
      .append("path")
      .datum(worldBorders)
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "rgba(0,229,255,0.04)")
      .attr("stroke-width", 0.3)
      .attr("stroke-linejoin", "round");

    // Draws coastline strokes to sharpen the land outline against the ocean.
    svg
      .selectAll(".coast")
      .data(worldCountries.features)
      .enter()
      .append("path")
      .attr("class", "coast")
      .attr("d", (d: any) => path(d) || "")
      .attr("fill", "none")
      .attr("stroke", "rgba(0,229,255,0.06)")
      .attr("stroke-width", 0.5);

    // Adds station coverage rings, markers, and hover interactions for each ground site.
    const markerGroup = svg.append("g");

    stations.forEach((station) => {
      const coords = projection([station.lng, station.lat]);
      if (!coords) return;

      const [cx, cy] = coords;
      const color = OPERATOR_COLORS[station.operator] || OPERATOR_COLORS.Other;
      const shape = STATION_TYPE_SHAPES[station.type];
      const isSelected = station.id === selectedStationId;

      // Shows an approximate coverage footprint, enlarged when the station is selected.
      const covRadius = Math.max(15, 45 - station.elevationMaskDeg * 3);
      markerGroup
        .append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", isSelected ? covRadius : covRadius * 0.6)
        .attr("fill", isSelected ? `${color}06` : "none")
        .attr("stroke", color)
        .attr("stroke-width", 0.4)
        .attr("stroke-dasharray", "3,2.5")
        .attr("opacity", isSelected ? 0.5 : 0.1);

      // Draws the station marker using the operator color and type-specific shape.
      const marker = drawMarker(
        markerGroup,
        cx,
        cy,
        shape,
        color,
        5,
        isSelected
      );
      marker.style("filter", "url(#gnd-glow)");

      // Adds a small status indicator that reflects the station's operational state.
      const statusColor =
        station.status === "operational"
          ? "#39ff7f"
          : station.status === "maintenance"
            ? "#ffd54f"
            : "#ff3b30";
      marker
        .append("circle")
        .attr("cx", 6)
        .attr("cy", -6)
        .attr("r", 2)
        .attr("fill", statusColor)
        .attr("stroke", "#060a12")
        .attr("stroke-width", 0.6);

      marker
        .on("mouseenter", (e: MouseEvent) => {
          const rect = containerRef.current!.getBoundingClientRect();
          setTooltip({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            station,
          });
        })
        .on("mouseleave", () => setTooltip(null))
        .on("click", () => onStationClick(station));
    });
  }, [stations, selectedStationId, onStationClick]);

  useEffect(() => {
    render();
    const ro = new ResizeObserver(() => render());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [render]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg ref={svgRef} className="block w-full h-full" />

      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: Math.min(
              tooltip.x + 14,
              (containerRef.current?.clientWidth || 500) - 180
            ),
            top: tooltip.y - 8,
            transform: "translateY(-100%)",
          }}
        >
          <div
            className="px-3 py-2 rounded-lg"
            style={{
              background: "rgba(6,10,18,0.94)",
              border: `1px solid ${OPERATOR_COLORS[tooltip.station.operator] || "#8a9bbd"}25`,
              backdropFilter: "blur(12px)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            }}
          >
            <div
              className="text-[11px] font-bold mb-0.5"
              style={{
                color: OPERATOR_COLORS[tooltip.station.operator] || "#8a9bbd",
              }}
            >
              {tooltip.station.name}
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px]"
                style={{ color: "var(--text-dim)" }}
              >
                {tooltip.station.operator}
              </span>
              <span
                className="text-[9px] font-bold uppercase"
                style={{
                  color:
                    tooltip.station.status === "operational"
                      ? "#39ff7f"
                      : tooltip.station.status === "maintenance"
                        ? "#ffd54f"
                        : "#ff3b30",
                }}
              >
                {tooltip.station.status}
              </span>
              <span
                className="text-[9px]"
                style={{
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-fira-code)",
                }}
              >
                {tooltip.station.throughputGbps}G
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import type { ClimateEvent } from "@/lib/climate/data";
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from "@/lib/climate/data";
import { worldCountries, worldBorders } from "@/lib/geo/worldGeo";

interface ClimateMapProps {
  events: ClimateEvent[];
  onEventClick: (event: ClimateEvent) => void;
  hoveredEventId?: string | null;
  onRenderedCount?: (count: number) => void;
}

export default function ClimateMap({
  events,
  onEventClick,
  hoveredEventId,
  onRenderedCount,
}: ClimateMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    event: ClimateEvent;
  } | null>(null);

  // Persists the current zoom transform so redraws do not discard the user's map position.
  const zoomTransformRef = useRef(d3.zoomIdentity);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<
    SVGSVGElement,
    unknown
  > | null>(null);

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
    // Shifts the fitted projection left so floating panels do not obscure the map center.
    const marginLeft = Math.round(width * 0.04);
    const marginRight = Math.round(width * 0.12);
    const projection = d3.geoNaturalEarth1().fitExtent(
      [
        [marginLeft, 8],
        [width - marginRight, height - 8],
      ],
      worldCountries
    );
    const path = d3.geoPath(projection);

    // Defines gradients and glow filters shared by the basemap and event markers.
    const defs = svg.append("defs");

    const oceanGrad = defs
      .append("radialGradient")
      .attr("id", "clm-ocean")
      .attr("cx", "50%")
      .attr("cy", "40%")
      .attr("r", "70%");
    oceanGrad.append("stop").attr("offset", "0%").attr("stop-color", "#080d18");
    oceanGrad
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#040810");

    // Defines the default glow applied to normal event markers.
    const glow = defs
      .append("filter")
      .attr("id", "clm-glow")
      .attr("x", "-200%")
      .attr("y", "-200%")
      .attr("width", "500%")
      .attr("height", "500%");
    glow
      .append("feGaussianBlur")
      .attr("stdDeviation", "5")
      .attr("result", "blur");
    const gm = glow.append("feMerge");
    gm.append("feMergeNode").attr("in", "blur");
    gm.append("feMergeNode").attr("in", "SourceGraphic");

    // Defines the stronger glow used when a marker is hovered or externally highlighted.
    const glowHi = defs
      .append("filter")
      .attr("id", "clm-glow-hi")
      .attr("x", "-300%")
      .attr("y", "-300%")
      .attr("width", "700%")
      .attr("height", "700%");
    glowHi
      .append("feGaussianBlur")
      .attr("stdDeviation", "8")
      .attr("result", "blur");
    const gmh = glowHi.append("feMerge");
    gmh.append("feMergeNode").attr("in", "blur");
    gmh.append("feMergeNode").attr("in", "SourceGraphic");

    const vigGrad = defs
      .append("radialGradient")
      .attr("id", "clm-vig")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "60%");
    vigGrad
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "transparent");
    vigGrad
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "rgba(6,8,13,0.45)");

    // Paints the ocean background outside the zoomable map layers.
    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "url(#clm-ocean)");

    // Collects the layers that should scale and pan together during zoom interactions.
    const mapGroup = svg.append("g").attr("class", "map-group");

    // Draws the geographic graticule inside the zoomable map layer.
    mapGroup
      .append("path")
      .datum(d3.geoGraticule10())
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "rgba(100,160,255,0.025)")
      .attr("stroke-width", 0.4)
      .attr("vector-effect", "non-scaling-stroke");

    // Fills landmasses and then overlays borders and coastlines.
    mapGroup
      .selectAll(".country")
      .data(worldCountries.features)
      .enter()
      .append("path")
      .attr("class", "country")
      .attr("d", (d: any) => path(d) || "")
      .attr("fill", "#151a22")
      .attr("stroke", "none");

    mapGroup
      .append("path")
      .datum(worldBorders)
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "rgba(100,180,255,0.08)")
      .attr("stroke-width", 0.5)
      .attr("stroke-linejoin", "round")
      .attr("vector-effect", "non-scaling-stroke");

    mapGroup
      .selectAll(".coast")
      .data(worldCountries.features)
      .enter()
      .append("path")
      .attr("class", "coast")
      .attr("d", (d: any) => path(d) || "")
      .attr("fill", "none")
      .attr("stroke", "rgba(80,160,255,0.12)")
      .attr("stroke-width", 0.7)
      .attr("vector-effect", "non-scaling-stroke");

    // Draws the climate event markers in severity order so larger events sit on top.
    const markerGroup = mapGroup.append("g");
    const sorted = [...events].sort((a, b) => a.severity - b.severity);
    let renderedCount = 0;

    sorted.forEach((event, idx) => {
      const coords = projection([event.lng, event.lat]);
      if (!coords) return;
      renderedCount++;
      const [cx, cy] = coords;
      const color = EVENT_TYPE_COLORS[event.type];
      const r = 2.5 + event.severity * 2;

      // Adds a diffuse haze around high-severity events to increase their visual weight.
      if (event.severity >= 4) {
        markerGroup
          .append("circle")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", r + 10)
          .attr("fill", `${color}06`)
          .attr("stroke", "none");
      }

      // Pulses active events so ongoing incidents stand out from historical ones.
      if (event.status === "active") {
        const pulse = markerGroup
          .append("circle")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", r)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 0.5);
        const delay = (idx * 0.4) % 2.5;
        pulse
          .append("animate")
          .attr("attributeName", "r")
          .attr("from", String(r))
          .attr("to", String(r + 16))
          .attr("dur", "2.8s")
          .attr("begin", `${delay}s`)
          .attr("repeatCount", "indefinite");
        pulse
          .append("animate")
          .attr("attributeName", "opacity")
          .attr("from", "0.45")
          .attr("to", "0")
          .attr("dur", "2.8s")
          .attr("begin", `${delay}s`)
          .attr("repeatCount", "indefinite");
      }

      // Adds an extra outline to emphasize critical-severity events.
      if (event.severity >= 4) {
        markerGroup
          .append("circle")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", r + 3)
          .attr("fill", "none")
          .attr("stroke", `${color}25`)
          .attr("stroke-width", 0.5)
          .attr("stroke-dasharray", "2,2");
      }

      // Draws the primary interactive marker and stores base geometry for lightweight hover updates.
      markerGroup
        .append("circle")
        .attr("class", "event-marker")
        .attr("data-event-id", event.id)
        .attr("data-base-r", r)
        .attr("data-color", color)
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", r)
        .attr("fill", `${color}45`)
        .attr("stroke", color)
        .attr("stroke-width", 0.8)
        .style("cursor", "pointer")
        .style("filter", "url(#clm-glow)")
        .on("mouseenter", function (e: MouseEvent) {
          d3.select(this)
            .transition()
            .duration(150)
            .attr("r", r + 4)
            .attr("fill", `${color}90`)
            .attr("stroke-width", 1.5)
            .style("filter", "url(#clm-glow-hi)");
          const rect = containerRef.current!.getBoundingClientRect();
          setTooltip({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            event,
          });
        })
        .on("mouseleave", function () {
          d3.select(this)
            .transition()
            .duration(150)
            .attr("r", r)
            .attr("fill", `${color}45`)
            .attr("stroke-width", 0.8)
            .style("filter", "url(#clm-glow)");
          setTooltip(null);
        })
        .on("click", () => onEventClick(event));

      // Adds a bright center point so small markers remain readable at low zoom levels.
      markerGroup
        .append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", Math.max(1, r * 0.3))
        .attr("fill", color)
        .attr("stroke", "none")
        .style("pointer-events", "none");
    });

    // Reports how many markers were rendered so parent UI can reflect the visible count.
    if (onRenderedCount) onRenderedCount(renderedCount);

    // Adds a fixed vignette above the map to darken the edges without affecting zoom behavior.
    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "url(#clm-vig)")
      .style("pointer-events", "none");

    // Configures the shared D3 zoom behavior and keeps the stored transform in sync.
    if (!zoomBehaviorRef.current) {
      zoomBehaviorRef.current = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
          zoomTransformRef.current = event.transform;
          d3.select(svgRef.current)
            .select(".map-group")
            .attr("transform", event.transform.toString());
        });
    }

    // Limits panning so the viewport cannot be dragged completely off the map.
    zoomBehaviorRef.current.translateExtent([
      [0, 0],
      [width, height],
    ]);

    svg.call(zoomBehaviorRef.current);

    // Restores the saved zoom transform after the map is redrawn.
    if (zoomTransformRef.current !== d3.zoomIdentity) {
      mapGroup.attr("transform", zoomTransformRef.current.toString());
      // Updates D3's internal zoom state without dispatching a new zoom event.
      svg.property("__zoom", zoomTransformRef.current);
    }
  }, [events, onEventClick, onRenderedCount]);

  // Applies external hover highlighting by mutating marker attributes without rebuilding the map.
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll(".event-marker").each(function () {
      const el = d3.select(this);
      const id = el.attr("data-event-id");
      const baseR = +el.attr("data-base-r");
      const color = el.attr("data-color");
      const isH = id === hoveredEventId;
      el.transition()
        .duration(180)
        .attr("r", isH ? baseR + 4 : baseR)
        .attr("fill", isH ? `${color}90` : `${color}45`)
        .attr("stroke-width", isH ? 1.5 : 0.8)
        .style("filter", isH ? "url(#clm-glow-hi)" : "url(#clm-glow)");
    });
  }, [hoveredEventId]);

  useEffect(() => {
    render();
    const ro = new ResizeObserver(() => {
      // Resets zoom on resize because the refit projection changes marker positions.
      zoomTransformRef.current = d3.zoomIdentity;
      render();
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [render]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg ref={svgRef} className="block w-full h-full" />
      {tooltip && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            left: Math.min(
              tooltip.x + 14,
              (containerRef.current?.clientWidth || 500) - 220
            ),
            top: tooltip.y - 8,
            transform: "translateY(-100%)",
          }}
        >
          <div
            className="px-3 py-2.5 rounded-lg"
            style={{
              background: "rgba(6,8,13,0.92)",
              border: `1px solid ${EVENT_TYPE_COLORS[tooltip.event.type]}25`,
              backdropFilter: "blur(14px)",
              boxShadow: `0 10px 30px rgba(0,0,0,0.5), 0 0 16px ${EVENT_TYPE_COLORS[tooltip.event.type]}10`,
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <div
                className="w-[6px] h-[6px] rounded-full"
                style={{
                  background: EVENT_TYPE_COLORS[tooltip.event.type],
                  boxShadow: `0 0 4px ${EVENT_TYPE_COLORS[tooltip.event.type]}`,
                }}
              />
              <span
                className="text-[11px] font-bold tracking-wider uppercase"
                style={{
                  color: EVENT_TYPE_COLORS[tooltip.event.type],
                  fontFamily: "var(--font-exo2)",
                }}
              >
                {EVENT_TYPE_LABELS[tooltip.event.type]}
              </span>
              {tooltip.event.magnitude != null && (
                <span
                  className="text-[11px] font-bold"
                  style={{
                    color: EVENT_TYPE_COLORS[tooltip.event.type],
                    fontFamily: "var(--font-fira-code)",
                  }}
                >
                  M{tooltip.event.magnitude.toFixed(1)}
                </span>
              )}
            </div>
            <div
              className="text-[13px] font-bold mb-1 max-w-[200px]"
              style={{ color: "var(--text-primary)" }}
            >
              {tooltip.event.title}
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-[11px] font-bold"
                style={{
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-fira-code)",
                }}
              >
                SEV {tooltip.event.severity}/5
              </span>
              <span
                className="text-[11px]"
                style={{
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-fira-code)",
                }}
              >
                {tooltip.event.areaAffectedKm2.toLocaleString()} km²
              </span>
              <span
                className="text-[11px]"
                style={{ color: "var(--text-dim)" }}
              >
                {tooltip.event.detectingSatellite}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { SDGScore } from "@/lib/sdg/engine";

export interface RegionDataset {
  region: string;
  scores: SDGScore[];
  color: string;
}

interface SDGRadarChartProps {
  scores: SDGScore[];
  comparisonData?: RegionDataset[];
}

const COMPARISON_COLORS = ["#00e5ff", "#ff6b2c", "#b44aff", "#39ff7f"];

// Renders the SDG radar chart in either single-region mode or multi-region comparison mode.
export default function SDGRadarChart({
  scores,
  comparisonData,
}: SDGRadarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || scores.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const isComparison = comparisonData && comparisonData.length > 0;
    const radarSize = isComparison ? 340 : 200;
    const legendWidth = isComparison ? 160 : 0;
    const width = radarSize + legendWidth;
    const height = isComparison ? 340 : 180;
    const cx = radarSize / 2;
    const cy = height / 2;
    const maxRadius = isComparison ? 120 : 70;
    const levels = 4;

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${cx}, ${cy})`);

    const angleSlice = (Math.PI * 2) / scores.length;

    // Draws the concentric reference rings that define the radar score scale.
    for (let level = 1; level <= levels; level++) {
      const r = (maxRadius / levels) * level;
      const ringPoints = scores.map((_, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        return [Math.cos(angle) * r, Math.sin(angle) * r];
      });
      ringPoints.push(ringPoints[0]);

      g.append("path")
        .attr("d", d3.line()(ringPoints as [number, number][]) || "")
        .attr("fill", "none")
        .attr("stroke", "rgba(0,229,255,0.08)")
        .attr("stroke-width", 0.5);

      // Shows numeric ring labels only in comparison mode where the chart is larger.
      if (isComparison) {
        g.append("text")
          .attr("x", 3)
          .attr("y", -r + 3)
          .attr("font-size", "9px")
          .attr("fill", "rgba(255,255,255,0.15)")
          .attr("font-family", "var(--font-fira-code)")
          .text(`${((level / levels) * 100).toFixed(0)}`);
      }
    }

    // Draws one radial axis for each SDG dimension.
    scores.forEach((_, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      g.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", Math.cos(angle) * maxRadius)
        .attr("y2", Math.sin(angle) * maxRadius)
        .attr("stroke", "rgba(0,229,255,0.06)")
        .attr("stroke-width", 0.5);
    });

    const defs = svg.append("defs");

    if (isComparison) {
      // Overlays one polygon per comparison region so score profiles can be compared directly.
      comparisonData.forEach((dataset, di) => {
        const color =
          dataset.color || COMPARISON_COLORS[di % COMPARISON_COLORS.length];

        // Reorders the comparison scores to match the base axis ordering before plotting.
        const dataPoints: [number, number][] = scores.map((baseScore, i) => {
          const matchScore = dataset.scores.find(
            (s) => s.sdgNumber === baseScore.sdgNumber
          );
          const value = matchScore ? matchScore.score : 0;
          const angle = angleSlice * i - Math.PI / 2;
          const r = (value / 100) * maxRadius;
          return [Math.cos(angle) * r, Math.sin(angle) * r];
        });
        dataPoints.push(dataPoints[0]);

        // Creates a region-specific fill gradient for this comparison polygon.
        const gradId = `radarGrad-${di}`;
        const gradient = defs
          .append("radialGradient")
          .attr("id", gradId)
          .attr("cx", "50%")
          .attr("cy", "50%")
          .attr("r", "50%");
        gradient
          .append("stop")
          .attr("offset", "0%")
          .attr("stop-color", color)
          .attr("stop-opacity", 0.12);
        gradient
          .append("stop")
          .attr("offset", "100%")
          .attr("stop-color", color)
          .attr("stop-opacity", 0.02);

        // Draws the region polygon with a staggered fade-in animation.
        g.append("path")
          .attr("d", d3.line()(dataPoints) || "")
          .attr("fill", `url(#${gradId})`)
          .attr("stroke", color)
          .attr("stroke-width", 1.5)
          .attr("opacity", 0)
          .transition()
          .duration(800)
          .delay(di * 150)
          .attr("opacity", 0.85);

        // Marks the individual SDG score positions for this region.
        scores.forEach((baseScore, i) => {
          const matchScore = dataset.scores.find(
            (s) => s.sdgNumber === baseScore.sdgNumber
          );
          const value = matchScore ? matchScore.score : 0;
          const angle = angleSlice * i - Math.PI / 2;
          const r = (value / 100) * maxRadius;

          g.append("circle")
            .attr("cx", Math.cos(angle) * r)
            .attr("cy", Math.sin(angle) * r)
            .attr("r", 3)
            .attr("fill", color)
            .attr("stroke", "#0b0f18")
            .attr("stroke-width", 1.5)
            .style("filter", `drop-shadow(0 0 3px ${color})`);
        });
      });

      // Draws the outer SDG labels once using the shared axis positions.
      scores.forEach((s, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const labelR = maxRadius + 18;
        const lx = Math.cos(angle) * labelR;
        const ly = Math.sin(angle) * labelR;

        g.append("text")
          .attr("x", lx)
          .attr("y", ly)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("font-size", "11px")
          .attr("font-weight", "700")
          .attr("fill", s.color)
          .attr("letter-spacing", "0.05em")
          .text(`SDG${s.sdgNumber}`);
      });

      // Renders the region legend beside the larger comparison chart.
      const legendX = radarSize + 8;
      const legendStartY = cy - (comparisonData.length * 24) / 2;
      const legendG = svg
        .append("g")
        .attr("transform", `translate(${legendX}, ${legendStartY})`);

      comparisonData.forEach((dataset, di) => {
        const color =
          dataset.color || COMPARISON_COLORS[di % COMPARISON_COLORS.length];
        const y = di * 24;

        legendG
          .append("rect")
          .attr("x", 0)
          .attr("y", y)
          .attr("width", 12)
          .attr("height", 3)
          .attr("rx", 1.5)
          .attr("fill", color);

        legendG
          .append("text")
          .attr("x", 18)
          .attr("y", y + 4)
          .attr("font-size", "10px")
          .attr("font-weight", "600")
          .attr("fill", color)
          .attr("letter-spacing", "0.04em")
          .text(
            dataset.region.length > 18
              ? dataset.region.slice(0, 18) + "…"
              : dataset.region
          );
      });
    } else {
      // Renders the simpler single-region polygon when comparison data is absent.
      const dataPoints: [number, number][] = scores.map((s, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const r = (s.score / 100) * maxRadius;
        return [Math.cos(angle) * r, Math.sin(angle) * r];
      });
      dataPoints.push(dataPoints[0]);

      const gradient = defs
        .append("radialGradient")
        .attr("id", "radarGradient")
        .attr("cx", "50%")
        .attr("cy", "50%")
        .attr("r", "50%");
      gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#00e5ff")
        .attr("stop-opacity", 0.15);
      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#b44aff")
        .attr("stop-opacity", 0.05);

      g.append("path")
        .attr("d", d3.line()(dataPoints) || "")
        .attr("fill", "url(#radarGradient)")
        .attr("stroke", "#00e5ff")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0)
        .transition()
        .duration(800)
        .attr("opacity", 1);

      // Marks the single-region score positions around the radar shape.
      scores.forEach((s, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const r = (s.score / 100) * maxRadius;

        g.append("circle")
          .attr("cx", Math.cos(angle) * r)
          .attr("cy", Math.sin(angle) * r)
          .attr("r", 3)
          .attr("fill", s.color)
          .attr("stroke", "#0b0f18")
          .attr("stroke-width", 1.5)
          .style("filter", `drop-shadow(0 0 3px ${s.color})`);

        // Labels
        const labelR = maxRadius + 14;
        const lx = Math.cos(angle) * labelR;
        const ly = Math.sin(angle) * labelR;

        g.append("text")
          .attr("x", lx)
          .attr("y", ly)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("font-size", "9px")
          .attr("font-weight", "700")
          .attr("fill", s.color)
          .attr("letter-spacing", "0.05em")
          .text(`SDG${s.sdgNumber}`);
      });
    }
  }, [scores, comparisonData]);

  return <svg ref={svgRef} className="w-full h-full" />;
}

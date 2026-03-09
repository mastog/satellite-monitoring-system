"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import type { DataPipeline } from "@/lib/ground/data";

interface DataFlowDiagramProps {
  pipelines: DataPipeline[];
  highlightStation?: string | null;
}

interface FlowNode {
  id: string;
  label: string;
  column: number; // 0=satellite, 1=station, 2=SDG
  x: number;
  y: number;
  color: string;
}

interface FlowLink {
  source: FlowNode;
  target: FlowNode;
  color: string;
  latency?: number;
}

const COL_COLORS = ["#ff6b2c", "#00e5ff", "#39ff7f"];
const COL_LABELS = ["SATELLITES", "GROUND STATIONS", "SDG INDICATORS"];

export default function DataFlowDiagram({
  pipelines,
  highlightStation,
}: DataFlowDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const animFrameRef = useRef<number>(0);

  const draw = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 200;
    const margin = { top: 28, right: 20, bottom: 10, left: 20 };
    const iW = width - margin.left - margin.right;
    const iH = height - margin.top - margin.bottom;

    svg.attr("width", width).attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Builds the diagram nodes for satellites, ground stations, and downstream SDG outputs.
    const satellites = [...new Set(pipelines.map((p) => p.satellite))];
    const stations = [...new Set(pipelines.map((p) => p.groundStation))];
    const sdgs = [...new Set(pipelines.flatMap((p) => p.sdgIndicators))];

    const colX = [0, iW * 0.4, iW * 0.8];

    const makeNodes = (items: string[], col: number): FlowNode[] =>
      items.map((item, i) => ({
        id: `${col}-${item}`,
        label: item,
        column: col,
        x: colX[col],
        y: ((i + 1) / (items.length + 1)) * iH,
        color: COL_COLORS[col],
      }));

    const satNodes = makeNodes(satellites, 0);
    const stationNodes = makeNodes(stations, 1);
    const sdgNodes = makeNodes(sdgs, 2);
    const allNodes = [...satNodes, ...stationNodes, ...sdgNodes];

    const nodeMap = new Map<string, FlowNode>();
    allNodes.forEach((n) => nodeMap.set(n.label, n));

    // Builds the directed links that connect each stage of the mock data-delivery pipeline.
    const links: FlowLink[] = [];
    pipelines.forEach((p) => {
      const satNode = nodeMap.get(p.satellite);
      const stationNode = nodeMap.get(p.groundStation);
      if (satNode && stationNode) {
        links.push({
          source: satNode,
          target: stationNode,
          color: COL_COLORS[0],
          latency: p.latencyMinutes,
        });
      }
      p.sdgIndicators.forEach((sdg) => {
        const sdgNode = nodeMap.get(sdg);
        if (stationNode && sdgNode) {
          links.push({
            source: stationNode,
            target: sdgNode,
            color: COL_COLORS[1],
          });
        }
      });
    });

    // Checks whether the current link should be emphasized because it touches the selected station.
    const isHighlighted = (link: FlowLink) => {
      if (!highlightStation) return true;
      return (
        link.source.label === highlightStation ||
        link.target.label === highlightStation
      );
    };

    // Labels the three pipeline columns so the diagram reads in processing order from left to right.
    COL_LABELS.forEach((label, i) => {
      g.append("text")
        .attr("x", colX[i])
        .attr("y", -12)
        .attr("text-anchor", "middle")
        .attr("fill", COL_COLORS[i])
        .attr("font-size", "9px")
        .attr("font-weight", "700")
        .attr("letter-spacing", "0.1em")
        .attr("font-family", "var(--font-exo2, sans-serif)")
        .text(label);
    });

    // Draws the static link paths before animated particles are layered on top.
    const linkGroup = g.append("g").attr("class", "links");
    links.forEach((link) => {
      const highlighted = isHighlighted(link);
      const pathD = `M${link.source.x},${link.source.y} C${(link.source.x + link.target.x) / 2},${link.source.y} ${(link.source.x + link.target.x) / 2},${link.target.y} ${link.target.x},${link.target.y}`;

      linkGroup
        .append("path")
        .attr("d", pathD)
        .attr("fill", "none")
        .attr("stroke", highlighted ? link.color : "rgba(138,155,189,0.05)")
        .attr("stroke-width", highlighted ? 1 : 0.5)
        .attr("opacity", highlighted ? 0.3 : 0.1);
    });

    // Creates per-link particle metadata used to animate data packets along the paths.
    const particleGroup = g.append("g").attr("class", "particles");
    const particles: {
      path: string;
      color: string;
      offset: number;
      speed: number;
      highlighted: boolean;
    }[] = [];

    links.forEach((link) => {
      const highlighted = isHighlighted(link);
      const pathD = `M${link.source.x},${link.source.y} C${(link.source.x + link.target.x) / 2},${link.source.y} ${(link.source.x + link.target.x) / 2},${link.target.y} ${link.target.x},${link.target.y}`;
      particles.push({
        path: pathD,
        color: link.color,
        offset: Math.random(),
        speed: 0.003 + Math.random() * 0.004,
        highlighted,
      });
    });

    // Creates the SVG circles that represent moving packets travelling through the network.
    const particleEls = particles.map((p) =>
      particleGroup
        .append("circle")
        .attr("r", p.highlighted ? 2 : 1)
        .attr("fill", p.color)
        .attr("opacity", p.highlighted ? 0.8 : 0.15)
    );

    // Runs the particle animation loop so packets continuously traverse the highlighted routes.
    function animate() {
      particles.forEach((p, i) => {
        p.offset = (p.offset + p.speed) % 1;

        // Samples the animated particle position from the current path geometry.
        const tempPath = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        tempPath.setAttribute("d", p.path);
        const totalLen = tempPath.getTotalLength();
        const point = tempPath.getPointAtLength(p.offset * totalLen);

        particleEls[i].attr("cx", point.x).attr("cy", point.y);
      });

      animFrameRef.current = requestAnimationFrame(animate);
    }
    animate();

    // Draws the endpoint nodes after the animated pipeline particles have been positioned.
    const nodeGroup = g.append("g").attr("class", "nodes");
    allNodes.forEach((node) => {
      const isStationHighlighted = highlightStation === node.label;

      // Draws the node marker and enlarges it when the station is highlighted.
      nodeGroup
        .append("circle")
        .attr("cx", node.x)
        .attr("cy", node.y)
        .attr("r", isStationHighlighted ? 5 : 3.5)
        .attr("fill", `${node.color}40`)
        .attr("stroke", node.color)
        .attr("stroke-width", isStationHighlighted ? 1.5 : 1);

      // Places the node label on the side that best matches the node's diagram column.
      const labelAnchor =
        node.column === 0 ? "end" : node.column === 2 ? "start" : "middle";
      const labelDx = node.column === 0 ? -8 : node.column === 2 ? 8 : 0;
      const labelDy = node.column === 1 ? -8 : 0;

      nodeGroup
        .append("text")
        .attr("x", node.x + labelDx)
        .attr("y", node.y + labelDy)
        .attr("text-anchor", labelAnchor)
        .attr("dominant-baseline", "middle")
        .attr(
          "fill",
          isStationHighlighted ? node.color : "rgba(138,155,189,0.6)"
        )
        .attr("font-size", "9px")
        .attr("font-family", "var(--font-fira-code, monospace)")
        .text(
          node.label.length > 20
            ? node.label.substring(0, 18) + "…"
            : node.label
        );
    });

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [pipelines, highlightStation]);

  useEffect(() => {
    const cleanup = draw();
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      cleanup?.();
    };
  }, [draw]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}

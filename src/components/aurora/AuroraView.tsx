"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { Reveal, CornerBrackets } from "@/components/ui/ScrollReveal";
import { useAppStore } from "@/store/appStore";

// Provides the procedural-noise helpers used by the interactive aurora pieces.
function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263 + 42) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
}

// Generates smooth 2D value noise that the visual pieces use for motion and texture.
function noise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const sy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

// Builds fractal Brownian motion from the base noise function for richer patterns.
function fbm(x: number, y: number, octaves = 4): number {
  let v = 0,
    amp = 0.5,
    freq = 1;
  for (let i = 0; i < octaves; i++) {
    v += amp * noise2D(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2;
  }
  return v;
}

// Clamps an arbitrary value into the provided numeric range.
function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

// Linearly interpolates between two numeric values.
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// Maps a value between two thresholds into a smooth 0-1 transition curve.
function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Stores one RGB color channel tuple used by the wave field renderer.
interface RGB {
  r: number;
  g: number;
  b: number;
}

// Converts a hex CSS color into an RGB tuple.
function hexToRgb(hex: string): RGB {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => part + part)
          .join("")
      : normalized;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

// Blends two RGB colors by a normalized amount.
function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  };
}

// Formats an RGB tuple into an rgba() string with the provided opacity.
function rgba(color: RGB, alpha: number) {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${alpha})`;
}

// Describes a single sampled point within a painted ribbon.
interface RibbonPt {
  x: number;
  y: number;
  ox: number;
  oy: number;
  nx: number;
  ny: number;
  hue: number;
  width: number;
}
// Stores one complete painted ribbon and the frame it was born on.
interface SilkRibbon {
  points: RibbonPt[];
  birth: number;
}

// Renders the interactive ribbon-painting canvas where pointer motion creates
// luminous trails that continue to undulate and fade after release.
function SilkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: "100px" });
  const mouseRef = useRef({ x: 0, y: 0, down: false, px: 0, py: 0 });
  const rafRef = useRef(0);
  const ribbonsRef = useRef<SilkRibbon[]>([]);
  const activeRef = useRef<SilkRibbon | null>(null);
  const frameRef = useRef(0);
  const hueRef = useRef(180);
  const sparkRef = useRef<
    {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      hue: number;
    }[]
  >([]);

  useEffect(() => {
    if (!isInView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 700,
      H = 480;
    canvas.width = W;
    canvas.height = H;

    // Draws one ribbon in multiple passes so the stroke has a glow, core, and highlight.
    const drawRibbon = (pts: RibbonPt[], alpha: number) => {
      if (pts.length < 2) return;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // Draws the widest, faintest glow that establishes the halo around the ribbon.
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1],
          b = pts[i];
        ctx.strokeStyle = `hsla(${b.hue},75%,55%,${alpha * 0.08})`;
        ctx.lineWidth = b.width * 3.5;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      // Draws the mid-strength glow that gives the ribbon body its color volume.
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1],
          b = pts[i];
        ctx.strokeStyle = `hsla(${b.hue},80%,62%,${alpha * 0.25})`;
        ctx.lineWidth = b.width * 1.2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      // Draws the main colored stroke that defines the ribbon shape.
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1],
          b = pts[i];
        ctx.strokeStyle = `hsla(${b.hue},85%,75%,${alpha * 0.7})`;
        ctx.lineWidth = b.width * 0.5;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      // Draws the bright center highlight that makes the ribbon look energized.
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1],
          b = pts[i];
        ctx.strokeStyle = `hsla(${b.hue},50%,93%,${alpha * 0.85})`;
        ctx.lineWidth = b.width * 0.12;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    };

    const loop = () => {
      const frame = frameRef.current++;
      const mouse = mouseRef.current;
      const ribbons = ribbonsRef.current;
      const sparks = sparkRef.current;

      // Samples a new point while the user is dragging so the active ribbon follows pointer motion.
      if (mouse.down && activeRef.current) {
        const dx = mouse.x - mouse.px;
        const dy = mouse.y - mouse.py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 2.5) {
          const speed = clamp(dist, 0, 40);
          const width = 3 + (1 - speed / 40) * 18;
          hueRef.current = (hueRef.current + dist * 0.25) % 360;
          const len = dist;
          const nx = -dy / len;
          const ny = dx / len;
          activeRef.current.points.push({
            x: mouse.x,
            y: mouse.y,
            ox: mouse.x,
            oy: mouse.y,
            nx,
            ny,
            hue: hueRef.current,
            width,
          });
          mouse.px = mouse.x;
          mouse.py = mouse.y;
          // Emits small spark particles from the ribbon tip to emphasize motion.
          for (let i = 0; i < 2; i++) {
            const a = Math.random() * Math.PI * 2;
            sparks.push({
              x: mouse.x,
              y: mouse.y,
              vx: Math.cos(a) * (0.5 + Math.random() * 1.5),
              vy: Math.sin(a) * (0.5 + Math.random() * 1.5),
              life: 35 + Math.random() * 25,
              hue: hueRef.current,
            });
          }
        }
      }

      // Advances and expires spark particles emitted from active drawing.
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.96;
        s.vy *= 0.96;
        if (--s.life <= 0) sparks.splice(i, 1);
      }

      // Animates released ribbons with layered sine waves so they keep moving after release.
      for (const ribbon of ribbons) {
        for (let i = 0; i < ribbon.points.length; i++) {
          const p = ribbon.points[i];
          const wave =
            Math.sin(i * 0.12 + frame * 0.025) * 2.2 +
            Math.sin(i * 0.07 - frame * 0.018) * 1.5 +
            Math.sin(i * 0.2 + frame * 0.04) * 0.8;
          p.x = p.ox + p.nx * wave;
          p.y = p.oy + p.ny * wave;
        }
      }

      // Removes old ribbons after their visible lifespan to keep the canvas lightweight.
      while (ribbons.length > 0 && frame - ribbons[0].birth > 448)
        ribbons.shift();
      while (ribbons.length > 20) ribbons.shift();

      // Clears the frame before redrawing the ribbon scene.
      ctx.fillStyle = "rgb(6,8,13)";
      ctx.fillRect(0, 0, W, H);

      // Adds a faint grain layer so the background feels less flat.
      ctx.fillStyle = "rgba(255,255,255,0.007)";
      for (let i = 0; i < 60; i++) {
        ctx.fillRect(
          (hash(i + frame * 7, 0) * W) | 0,
          (hash(0, i + frame * 7) * H) | 0,
          1,
          1
        );
      }

      // Draws all completed ribbons with age-based fading.
      for (const ribbon of ribbons) {
        const age = frame - ribbon.birth;
        const alpha = age > 400 ? Math.max(0, 1 - (age - 400) / 48) : 1;
        drawRibbon(ribbon.points, alpha);
      }

      // Renders the ribbon currently being painted so in-progress strokes appear before they are committed.
      if (activeRef.current) drawRibbon(activeRef.current.points, 1);

      // Renders transient spark particles that brighten the painted aurora trail.
      for (const s of sparks) {
        const a = s.life / 60;
        ctx.fillStyle = `hsla(${s.hue},80%,80%,${a * 0.7})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Vignette
      const vig = ctx.createRadialGradient(
        W / 2,
        H / 2,
        W * 0.28,
        W / 2,
        H / 2,
        W * 0.72
      );
      vig.addColorStop(0, "transparent");
      vig.addColorStop(1, "rgba(6,8,13,0.3)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isInView]);

  const toCanvas = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (700 / rect.width),
      y: (e.clientY - rect.top) * (480 / rect.height),
    };
  }, []);

  const handleDown = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = toCanvas(e);
      mouseRef.current = { x, y, down: true, px: x, py: y };
      activeRef.current = { points: [], birth: frameRef.current };
    },
    [toCanvas]
  );

  const handleMove = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = toCanvas(e);
      mouseRef.current.x = x;
      mouseRef.current.y = y;
    },
    [toCanvas]
  );

  const handleUp = useCallback(() => {
    mouseRef.current.down = false;
    if (activeRef.current && activeRef.current.points.length > 1) {
      // Stores the release frame used to time the ribbon fade-out.
      activeRef.current.birth = frameRef.current;
      ribbonsRef.current.push(activeRef.current);
    }
    activeRef.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-lg overflow-hidden cursor-crosshair"
      style={{ aspectRatio: "700 / 480" }}
      onMouseDown={handleDown}
      onMouseMove={handleMove}
      onMouseUp={handleUp}
      onMouseLeave={handleUp}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  hue: number;
  sat: number;
  trail: { x: number; y: number }[];
}

const G = 8;
const SOFTENING = 25;
const BODY_HUES = [187, 20, 275, 145, 345, 55];

const BG_STARS = Array.from({ length: 80 }, () => ({
  x: Math.random(),
  y: Math.random(),
  b: 0.15 + Math.random() * 0.4,
  sp: 0.02 + Math.random() * 0.04,
  ph: Math.random() * Math.PI * 2,
  sz: 0.3 + Math.random() * 0.7,
}));

function makeInitialBodies(cx: number, cy: number): Body[] {
  // Circular orbit speed: v = sqrt(G * M_star / r)
  // G=8, M=300 → sqrt(2400/r)
  return [
    { x: cx, y: cy, vx: 0, vy: 0, mass: 300, hue: 42, sat: 100, trail: [] },
    {
      x: cx + 100,
      y: cy,
      vx: 0,
      vy: -4.9,
      mass: 6,
      hue: 187,
      sat: 90,
      trail: [],
    },
    {
      x: cx,
      y: cy - 150,
      vx: 4.0,
      vy: 0,
      mass: 4,
      hue: 20,
      sat: 95,
      trail: [],
    },
  ];
}

function GravityCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: "100px" });
  const rafRef = useRef(0);
  const bodiesRef = useRef<Body[]>([]);
  const sizeRef = useRef({ w: 700, h: 480 });

  useEffect(() => {
    if (!isInView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 700,
      H = 480;
    canvas.width = W;
    canvas.height = H;
    sizeRef.current = { w: W, h: H };

    if (bodiesRef.current.length === 0) {
      bodiesRef.current = makeInitialBodies(W / 2, H / 2);
    }

    // Seeds small orbiting particles around the star so the scene suggests continuous solar activity.
    const solarWind = Array.from({ length: 30 }, () => ({
      angle: Math.random() * Math.PI * 2,
      r: 20 + Math.random() * 22,
      speed: 0.008 + Math.random() * 0.015,
      size: 0.3 + Math.random() * 0.7,
    }));

    let t = 0;

    const loop = () => {
      const bodies = bodiesRef.current;
      const dt = 0.6;

      // Advances the body simulation by applying the current gravitational interaction step.
      for (let i = 0; i < bodies.length; i++) {
        let ax = 0,
          ay = 0;
        for (let j = 0; j < bodies.length; j++) {
          if (i === j) continue;
          const dx = bodies[j].x - bodies[i].x;
          const dy = bodies[j].y - bodies[i].y;
          const distSq = dx * dx + dy * dy + SOFTENING * SOFTENING;
          const dist = Math.sqrt(distSq);
          const force = (G * bodies[j].mass) / distSq;
          ax += force * (dx / dist);
          ay += force * (dy / dist);
        }
        bodies[i].vx += ax * dt;
        bodies[i].vy += ay * dt;
      }
      for (const b of bodies) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 180) b.trail.shift();
      }

      const star = bodies[0];
      const camX = W / 2 - star.x;
      const camY = H / 2 - star.y;

      // Clears the frame before the next detonation update and redraw pass.
      ctx.fillStyle = "rgb(6,8,13)";
      ctx.fillRect(0, 0, W, H);

      // Background star field
      for (const s of BG_STARS) {
        const tw = s.b * (0.5 + 0.5 * Math.sin(t * s.sp * 60 + s.ph));
        ctx.fillStyle = `rgba(180,200,240,${tw})`;
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.sz, 0, Math.PI * 2);
        ctx.fill();
      }

      // Trails — dual-pass: glow + core
      ctx.lineCap = "round";
      for (let bi = 0; bi < bodies.length; bi++) {
        const b = bodies[bi];
        if (b.trail.length < 2) continue;
        const isStar = bi === 0;
        for (let k = 1; k < b.trail.length; k++) {
          const progress = k / b.trail.length;
          const tx1 = b.trail[k - 1].x + camX,
            ty1 = b.trail[k - 1].y + camY;
          const tx2 = b.trail[k].x + camX,
            ty2 = b.trail[k].y + camY;
          // Glow trail
          ctx.strokeStyle = `hsla(${b.hue},${b.sat}%,55%,${progress * 0.12})`;
          ctx.lineWidth = isStar ? 5 : Math.sqrt(b.mass) * 0.9 * progress + 0.8;
          ctx.beginPath();
          ctx.moveTo(tx1, ty1);
          ctx.lineTo(tx2, ty2);
          ctx.stroke();
          // Core trail
          ctx.strokeStyle = `hsla(${b.hue},${b.sat}%,72%,${progress * 0.4})`;
          ctx.lineWidth =
            (isStar ? 5 : Math.sqrt(b.mass) * 0.9 * progress + 0.8) * 0.3;
          ctx.beginPath();
          ctx.moveTo(tx1, ty1);
          ctx.lineTo(tx2, ty2);
          ctx.stroke();
        }
      }

      const starSX = star.x + camX,
        starSY = star.y + camY;

      // Solar wind particles
      for (const sw of solarWind) {
        sw.angle += sw.speed;
        const wx = starSX + Math.cos(sw.angle) * sw.r;
        const wy = starSY + Math.sin(sw.angle) * sw.r;
        const a = 0.35 + 0.25 * Math.sin(sw.angle * 3 + t * 2);
        ctx.fillStyle = `hsla(42,100%,85%,${a})`;
        ctx.beginPath();
        ctx.arc(wx, wy, sw.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render bodies
      for (let bi = 0; bi < bodies.length; bi++) {
        const b = bodies[bi];
        const sx = b.x + camX,
          sy = b.y + camY;
        const isStar = bi === 0;
        const baseR = Math.sqrt(b.mass) * (isStar ? 1.6 : 2.0);

        if (isStar) {
          const pulse = 1 + 0.06 * Math.sin(t * 2.5);
          const r = baseR * pulse;

          // Outer corona
          const c1 = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r * 4.5);
          c1.addColorStop(0, "hsla(42,100%,70%,0.07)");
          c1.addColorStop(0.4, "hsla(30,100%,55%,0.025)");
          c1.addColorStop(1, "transparent");
          ctx.fillStyle = c1;
          ctx.beginPath();
          ctx.arc(sx, sy, r * 4.5, 0, Math.PI * 2);
          ctx.fill();

          // Inner corona
          const c2 = ctx.createRadialGradient(sx, sy, r * 0.3, sx, sy, r * 2.5);
          c2.addColorStop(0, "hsla(45,100%,80%,0.18)");
          c2.addColorStop(0.5, "hsla(35,100%,60%,0.06)");
          c2.addColorStop(1, "transparent");
          ctx.fillStyle = c2;
          ctx.beginPath();
          ctx.arc(sx, sy, r * 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Lens flare rays
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(t * 0.08);
          for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI;
            const rayLen = r * 2.8 + Math.sin(t * 1.5 + i) * r;
            const fa = 0.05 + 0.025 * Math.sin(t * 2 + i * 1.5);
            ctx.strokeStyle = `hsla(45,100%,85%,${fa})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-Math.cos(ang) * rayLen, -Math.sin(ang) * rayLen);
            ctx.lineTo(Math.cos(ang) * rayLen, Math.sin(ang) * rayLen);
            ctx.stroke();
          }
          ctx.restore();

          // Star body: 3D sphere gradient
          const sg = ctx.createRadialGradient(
            sx - r * 0.25,
            sy - r * 0.25,
            r * 0.1,
            sx,
            sy,
            r
          );
          sg.addColorStop(0, "hsla(50,100%,97%,1)");
          sg.addColorStop(0.3, "hsla(45,100%,85%,1)");
          sg.addColorStop(0.7, "hsla(40,100%,65%,1)");
          sg.addColorStop(1, "hsla(30,95%,45%,0.9)");
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Planet: outer glow halo
          const glowR = baseR * 3.5;
          const glow = ctx.createRadialGradient(
            sx,
            sy,
            baseR * 0.5,
            sx,
            sy,
            glowR
          );
          glow.addColorStop(0, `hsla(${b.hue},${b.sat}%,60%,0.12)`);
          glow.addColorStop(0.4, `hsla(${b.hue},${b.sat}%,50%,0.04)`);
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
          ctx.fill();

          // Planet body: centered gradient, bright core fading to saturated edge
          const pg = ctx.createRadialGradient(sx, sy, 0, sx, sy, baseR);
          pg.addColorStop(0, `hsla(${b.hue},${b.sat - 10}%,80%,1)`);
          pg.addColorStop(0.5, `hsla(${b.hue},${b.sat}%,62%,1)`);
          pg.addColorStop(1, `hsla(${b.hue},${b.sat}%,42%,1)`);
          ctx.fillStyle = pg;
          ctx.beginPath();
          ctx.arc(sx, sy, baseR, 0, Math.PI * 2);
          ctx.fill();

          // Bright core spot
          ctx.fillStyle = `hsla(${b.hue},${b.sat - 15}%,92%,0.35)`;
          ctx.beginPath();
          ctx.arc(sx, sy, baseR * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      t += 0.016;
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isInView]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = sizeRef.current.w / rect.width;
    const scaleY = sizeRef.current.h / rect.height;
    const screenX = (e.clientX - rect.left) * scaleX;
    const screenY = (e.clientY - rect.top) * scaleY;
    const star = bodiesRef.current[0];
    const W = sizeRef.current.w,
      H = sizeRef.current.h;
    const worldX = screenX - (W / 2 - star.x);
    const worldY = screenY - (H / 2 - star.y);
    const dx = worldX - star.x,
      dy = worldY - star.y;
    const r = Math.sqrt(dx * dx + dy * dy);
    const v = Math.sqrt((G * star.mass) / Math.max(r, 40));
    const angle = Math.atan2(dy, dx) + Math.PI / 2;
    const mass = 2 + Math.random() * 8;
    bodiesRef.current.push({
      x: worldX,
      y: worldY,
      vx: star.vx + Math.cos(angle) * v,
      vy: star.vy + Math.sin(angle) * v,
      mass,
      hue: BODY_HUES[Math.floor(Math.random() * BODY_HUES.length)],
      sat: 80 + Math.random() * 15,
      trail: [],
    });
  }, []);

  const handleDblClick = useCallback(() => {
    bodiesRef.current = makeInitialBodies(
      sizeRef.current.w / 2,
      sizeRef.current.h / 2
    );
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-lg overflow-hidden cursor-crosshair"
      style={{ aspectRatio: "700 / 480" }}
      onClick={handleClick}
      onDoubleClick={handleDblClick}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

// Stores one spark fragment emitted from the blast front.
interface ShockwaveSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  trail: { x: number; y: number }[];
}

// Stores one concentric wave ring that expands from the detonation center.
interface WaveRing {
  radius: number;
  speed: number;
  width: number;
  alpha: number;
  reflection: number;
  delay: number;
  started: boolean;
}

// Stores one expanding blast front, its concentric rings, and emitted fragments.
interface Detonation {
  cx: number;
  cy: number;
  age: number;
  maxAge: number;
  flash: number;
  hazeRadius: number;
  rings: WaveRing[];
  sparks: ShockwaveSpark[];
  hue: number;
}

function ShockwaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: "100px" });
  const rafRef = useRef(0);
  const detsRef = useRef<Detonation[]>([]);
  const hueCounterRef = useRef(0);
  // Keeps a low-density atmospheric shimmer moving through the background.
  const hazeRef = useRef<
    | {
        x: number;
        y: number;
        vx: number;
        vy: number;
        hue: number;
        size: number;
        phase: number;
      }[]
    | null
  >(null);

  useEffect(() => {
    if (!isInView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 700,
      H = 480;
    canvas.width = W;
    canvas.height = H;

    if (!hazeRef.current) {
      hazeRef.current = Array.from({ length: 18 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.16,
        vy: -0.08 - Math.random() * 0.16,
        hue: 210 + Math.random() * 40,
        size: 10 + Math.random() * 24,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    let t = 0;

    const loop = () => {
      const dets = detsRef.current;
      const haze = hazeRef.current!;

      // Clears the frame before repainting the detonation scene.
      ctx.fillStyle = "rgb(6,8,13)";
      ctx.fillRect(0, 0, W, H);

      // Paints a faint radial backdrop so the shock fronts read against a darker center.
      const bg = ctx.createRadialGradient(
        W / 2,
        H / 2,
        0,
        W / 2,
        H / 2,
        W * 0.5
      );
      bg.addColorStop(0, "rgba(30,15,50,0.06)");
      bg.addColorStop(1, "transparent");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Updates and renders drifting haze that gives the chamber a pressurized atmosphere.
      for (const band of haze) {
        band.x += band.vx + Math.sin(t * 0.4 + band.phase) * 0.1;
        band.y += band.vy;
        if (band.y + band.size < 0) {
          band.y = H + band.size;
          band.x = Math.random() * W;
        }
        if (band.x + band.size < 0) band.x = W + band.size;
        if (band.x - band.size > W) band.x = -band.size;
        const hazeAlpha = 0.025 + 0.018 * Math.sin(t * 1.8 + band.phase);
        const plume = ctx.createRadialGradient(
          band.x,
          band.y,
          0,
          band.x,
          band.y,
          band.size
        );
        plume.addColorStop(0, `hsla(${band.hue},70%,68%,${hazeAlpha})`);
        plume.addColorStop(1, "transparent");
        ctx.fillStyle = plume;
        ctx.beginPath();
        ctx.arc(band.x, band.y, band.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Updates and renders each expanding blast front with layered pressure rings.
      for (let di = dets.length - 1; di >= 0; di--) {
        const det = dets[di];
        det.age++;
        const progress = det.age / det.maxAge;
        const frontAlpha = Math.max(0, 1 - progress);
        det.hazeRadius = 38 + (1 - Math.pow(1 - progress, 2.2)) * 210;

        // Draws the ignition flash at the center of the detonation.
        if (det.flash > 0) {
          const fr = det.flash / 12;
          const flashR = 62 * fr;
          const fg = ctx.createRadialGradient(
            det.cx,
            det.cy,
            0,
            det.cx,
            det.cy,
            flashR
          );
          fg.addColorStop(0, `hsla(${det.hue},100%,95%,${fr * 0.8})`);
          fg.addColorStop(0.28, `hsla(${det.hue},90%,74%,${fr * 0.45})`);
          fg.addColorStop(1, "transparent");
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.arc(det.cx, det.cy, flashR, 0, Math.PI * 2);
          ctx.fill();
          det.flash--;
        }

        // Draws a dense thermal bloom that follows the blast center before the rings overtake it.
        if (det.hazeRadius > 0) {
          const hazeGlow = ctx.createRadialGradient(
            det.cx,
            det.cy,
            det.rings[0]?.radius * 0.1 || 0,
            det.cx,
            det.cy,
            det.hazeRadius
          );
          hazeGlow.addColorStop(
            0,
            `hsla(${det.hue},85%,72%,${frontAlpha * 0.08})`
          );
          hazeGlow.addColorStop(
            0.46,
            `hsla(${det.hue},88%,62%,${frontAlpha * 0.05})`
          );
          hazeGlow.addColorStop(1, "transparent");
          ctx.fillStyle = hazeGlow;
          ctx.beginPath();
          ctx.arc(det.cx, det.cy, det.hazeRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draws a short-lived luminous core that collapses after the blast is released.
        const coreRadius = Math.max(0, 24 - progress * 24);
        if (coreRadius > 0) {
          const coreGlow = ctx.createRadialGradient(
            det.cx,
            det.cy,
            0,
            det.cx,
            det.cy,
            coreRadius
          );
          coreGlow.addColorStop(0, `rgba(255,255,255,${frontAlpha * 0.42})`);
          coreGlow.addColorStop(
            0.45,
            `hsla(${det.hue},92%,72%,${frontAlpha * 0.28})`
          );
          coreGlow.addColorStop(1, "transparent");
          ctx.fillStyle = coreGlow;
          ctx.beginPath();
          ctx.arc(det.cx, det.cy, coreRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        const orderedRings = [...det.rings].sort((a, b) => b.radius - a.radius);

        const drawShockBand = (
          centerX: number,
          centerY: number,
          radius: number,
          bandWidth: number,
          envelopeWidth: number,
          wakeWidth: number,
          baseHue: number,
          bandAlpha: number,
          envelopeAlpha: number,
          seamAlpha: number
        ) => {
          const wakeRadius = Math.max(0.5, radius - bandWidth * 0.52);
          const seamRadius = Math.max(0.5, radius + bandWidth * 0.34);

          // Paints the soft pressure envelope that keeps the ring readable from a distance.
          ctx.strokeStyle = `hsla(${baseHue},82%,72%,${envelopeAlpha})`;
          ctx.lineWidth = envelopeWidth;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();

          // Paints the dense wave body as an even-width luminous band.
          ctx.strokeStyle = `hsla(${baseHue},92%,80%,${bandAlpha})`;
          ctx.lineWidth = bandWidth;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();

          // Paints a darker wake inside the crest so adjacent rings stay visually separated.
          ctx.strokeStyle = `rgba(6,8,13,${bandAlpha * 0.36})`;
          ctx.lineWidth = wakeWidth;
          ctx.beginPath();
          ctx.arc(centerX, centerY, wakeRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Sharpens the crest with a narrow seam along the leading edge.
          ctx.strokeStyle = `rgba(255,255,255,${seamAlpha})`;
          ctx.lineWidth = Math.max(1, bandWidth * 0.16);
          ctx.beginPath();
          ctx.arc(centerX, centerY, seamRadius, 0, Math.PI * 2);
          ctx.stroke();
        };

        // Paints the charged atmosphere that sits between the synchronized rings.
        for (let ri = 0; ri < orderedRings.length - 1; ri++) {
          const outerRing = orderedRings[ri];
          const innerRing = orderedRings[ri + 1];
          const gap = outerRing.radius - innerRing.radius;
          if (gap <= 18) continue;

          const gapMid = innerRing.radius + gap / 2;
          const gapField = ctx.createRadialGradient(
            det.cx,
            det.cy,
            Math.max(0, gapMid - gap * 0.55),
            det.cx,
            det.cy,
            gapMid + gap * 0.55
          );
          const gapAlpha =
            Math.min(outerRing.alpha, innerRing.alpha) *
            frontAlpha *
            (0.07 + Math.abs(outerRing.alpha - innerRing.alpha) * 0.08);
          gapField.addColorStop(0, "transparent");
          gapField.addColorStop(
            0.36,
            `hsla(${det.hue + 6},74%,62%,${gapAlpha * 0.3})`
          );
          gapField.addColorStop(
            0.5,
            `hsla(${det.hue + 10},82%,74%,${gapAlpha * 0.5})`
          );
          gapField.addColorStop(
            0.64,
            `hsla(${det.hue + 2},70%,42%,${gapAlpha * 0.22})`
          );
          gapField.addColorStop(1, "transparent");
          ctx.fillStyle = gapField;
          ctx.beginPath();
          ctx.arc(det.cx, det.cy, gapMid + gap * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }

        // Updates and draws the three synchronized shock shells, including edge reflections.
        for (const ring of orderedRings) {
          if (!ring.started) {
            if (det.age < ring.delay) continue;
            ring.started = true;
          }

          ring.radius += ring.speed;
          ring.alpha *= 0.992;

          const edgeDistance = Math.min(
            det.cx,
            W - det.cx,
            det.cy,
            H - det.cy
          );
          if (!ring.reflection && ring.radius >= edgeDistance) {
            ring.reflection = 1;
          }

          let interference = 0;
          for (let oi = 0; oi < dets.length; oi++) {
            if (oi === di) continue;
            const other = dets[oi];
            for (const otherRing of other.rings) {
              const dx = other.cx - det.cx;
              const dy = other.cy - det.cy;
              const centerDistance = Math.hypot(dx, dy);
              const touchDistance = Math.abs(centerDistance - (ring.radius + otherRing.radius));
              const overlapDistance = Math.abs(centerDistance - Math.abs(ring.radius - otherRing.radius));
              const resonance = Math.max(
                0,
                1 - Math.min(touchDistance, overlapDistance) / 26
              );
              if (resonance > 0) interference = Math.max(interference, resonance);
            }
          }

          const ringAlpha = Math.max(0, ring.alpha * frontAlpha);
          const bandWidth = ring.width * (1.48 + interference * 0.14);
          const envelopeWidth = bandWidth * 1.8;
          const wakeWidth = bandWidth * 0.72;
          const bandAlpha = ringAlpha * (0.5 + interference * 0.08);
          const envelopeAlpha = ringAlpha * (0.08 + interference * 0.035);
          const seamAlpha = ringAlpha * (0.12 + interference * 0.05);

          drawShockBand(
            det.cx,
            det.cy,
            ring.radius,
            bandWidth,
            envelopeWidth,
            wakeWidth,
            det.hue,
            bandAlpha,
            envelopeAlpha,
            seamAlpha
          );

          if (ring.reflection > 0) {
            const reflectionAlpha = ringAlpha * ring.reflection * 0.72;
            const mirroredCenters = [
              [-det.cx, det.cy],
              [W + (W - det.cx), det.cy],
              [det.cx, -det.cy],
              [det.cx, H + (H - det.cy)],
            ] as const;

            for (const [mx, my] of mirroredCenters) {
              drawShockBand(
                mx,
                my,
                ring.radius,
                bandWidth,
                envelopeWidth,
                wakeWidth,
                det.hue + 10,
                reflectionAlpha * 0.38,
                reflectionAlpha * 0.12,
                reflectionAlpha * 0.14
              );
            }

            ring.reflection *= 0.986;
          }
        }

        // Updates and renders blast fragments with trails but without downward gravity.
        let liveSparks = 0;
        for (const spark of det.sparks) {
          if (spark.life >= spark.maxLife) continue;
          liveSparks++;
          spark.life++;
          spark.vx *= 0.994;
          spark.vy *= 0.994;
          spark.x += spark.vx;
          spark.y += spark.vy;

          const sparkRadius = spark.size * 0.9;
          if (spark.x <= sparkRadius) {
            spark.x = sparkRadius;
            spark.vx = Math.abs(spark.vx) * 0.92;
          } else if (spark.x >= W - sparkRadius) {
            spark.x = W - sparkRadius;
            spark.vx = -Math.abs(spark.vx) * 0.92;
          }

          if (spark.y <= sparkRadius) {
            spark.y = sparkRadius;
            spark.vy = Math.abs(spark.vy) * 0.92;
          } else if (spark.y >= H - sparkRadius) {
            spark.y = H - sparkRadius;
            spark.vy = -Math.abs(spark.vy) * 0.92;
          }

          spark.trail.push({ x: spark.x, y: spark.y });
          if (spark.trail.length > 12) spark.trail.shift();

          const sparkProgress = spark.life / spark.maxLife;
          const sparkAlpha = 1 - sparkProgress;
          const sparkHue = det.hue + sparkProgress * 110;
          const sparkLight = 88 - sparkProgress * 12;

          if (spark.trail.length > 1) {
            for (let ti = 1; ti < spark.trail.length; ti++) {
              const trailAlpha = (ti / spark.trail.length) * sparkAlpha * 0.28;
              ctx.strokeStyle = `hsla(${sparkHue},90%,${sparkLight}%,${trailAlpha})`;
              ctx.lineWidth = spark.size * (ti / spark.trail.length) * 1.4;
              ctx.beginPath();
              ctx.moveTo(spark.trail[ti - 1].x, spark.trail[ti - 1].y);
              ctx.lineTo(spark.trail[ti].x, spark.trail[ti].y);
              ctx.stroke();
            }
          }

          const sparkGlow = ctx.createRadialGradient(
            spark.x,
            spark.y,
            0,
            spark.x,
            spark.y,
            spark.size * 3.2
          );
          sparkGlow.addColorStop(
            0,
            `hsla(${sparkHue},95%,${sparkLight + 8}%,${sparkAlpha * 0.4})`
          );
          sparkGlow.addColorStop(1, "transparent");
          ctx.fillStyle = sparkGlow;
          ctx.beginPath();
          ctx.arc(spark.x, spark.y, spark.size * 3.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `hsla(${sparkHue},94%,${sparkLight}%,${sparkAlpha * 1})`;
          ctx.beginPath();
          ctx.arc(
            spark.x,
            spark.y,
            spark.size * (1 - sparkProgress * 0.35),
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        // Removes the blast front once the rings, reflections, and fragments have faded out.
        const ringsAlive = det.rings.some((ring) => ring.alpha > 0.03);
        if (det.age >= det.maxAge && !ringsAlive && liveSparks === 0) {
          dets.splice(di, 1);
        }
      }

      // Adds a dark radial falloff around the chamber edges.
      const vig = ctx.createRadialGradient(
        W / 2,
        H / 2,
        W * 0.25,
        W / 2,
        H / 2,
        W * 0.65
      );
      vig.addColorStop(0, "transparent");
      vig.addColorStop(1, "rgba(6,8,13,0.45)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      t += 0.016;
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isInView]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (700 / rect.width);
    const cy = (e.clientY - rect.top) * (480 / rect.height);
    const baseHue = [18, 30, 44, 276, 194][hueCounterRef.current % 5];
    hueCounterRef.current++;

    const sparks: ShockwaveSpark[] = [];
    const count = 102;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.16;
      const speed = 2.1 + Math.random() * 2.8;
      sparks.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 112 + Math.floor(Math.random() * 42),
        size: 0.9 + Math.random() * 1.4,
        trail: [],
      });
    }

      detsRef.current.push({
      cx,
      cy,
      flash: 12,
      age: 0,
      maxAge: 132,
      hazeRadius: 32,
      sparks,
      rings: [
        {
          radius: 0,
          speed: 2.9,
          width: 2.6,
          alpha: 0.92,
          reflection: 0,
          delay: 0,
          started: false,
        },
        {
          radius: 0,
          speed: 2.9,
          width: 2.6,
          alpha: 0.84,
          reflection: 0,
          delay: 26,
          started: false,
        },
        {
          radius: 0,
          speed: 2.9,
          width: 2.6,
          alpha: 0.76,
          reflection: 0,
          delay: 52,
          started: false,
        },
      ],
      hue: baseHue,
    });
    // Keeps the scene readable by capping the number of overlapping shock fronts.
    while (detsRef.current.length > 16) detsRef.current.shift();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-lg overflow-hidden cursor-crosshair"
      style={{ aspectRatio: "700 / 480" }}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

interface FlowParticle {
  x: number;
  y: number;
  px: number;
  py: number;
  speed: number;
  hue: number;
  life: number;
  maxLife: number;
}

const PARTICLE_COUNT = 3000;
const HUE_BUCKETS = 36;

function FlowFieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: "100px" });
  const mouseRef = useRef({ x: -1, y: -1 });
  const rafRef = useRef(0);
  const particlesRef = useRef<FlowParticle[] | null>(null);

  useEffect(() => {
    if (!isInView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 600,
      H = 420;
    canvas.width = W;
    canvas.height = H;

    // Init particles with staggered lifetimes
    if (!particlesRef.current) {
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => {
        const x = Math.random() * W;
        const y = Math.random() * H;
        return {
          x,
          y,
          px: x,
          py: y,
          speed: 1.2 + Math.random() * 1.3,
          hue: 0,
          life: Math.floor(Math.random() * 250),
          maxLife: 180 + Math.floor(Math.random() * 280),
        };
      });
    }

    // Fill background
    ctx.fillStyle = "rgb(6,8,13)";
    ctx.fillRect(0, 0, W, H);

    const scale = 0.005;
    let t = 0;
    // Reusable bucket arrays
    const buckets: { fx: number; fy: number; tx: number; ty: number }[][] =
      Array.from({ length: HUE_BUCKETS }, () => []);

    const loop = () => {
      const particles = particlesRef.current!;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Fade
      ctx.fillStyle = "rgba(6,8,13,0.025)";
      ctx.fillRect(0, 0, W, H);

      // Clear buckets
      for (let i = 0; i < HUE_BUCKETS; i++) buckets[i].length = 0;

      for (const p of particles) {
        // Respawn when lifetime exceeded — prevents edge accumulation
        p.life++;
        if (p.life >= p.maxLife) {
          p.x = Math.random() * W;
          p.y = Math.random() * H;
          p.px = p.x;
          p.py = p.y;
          p.life = 0;
          p.maxLife = 180 + Math.floor(Math.random() * 280);
          continue;
        }

        // Flow angle from multi-octave noise, centered around 0 to eliminate directional bias
        let angle =
          (fbm(p.x * scale, p.y * scale + t * 0.06, 2) - 0.375) * Math.PI * 8;

        // Mouse vortex
        if (mx >= 0) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const influence = (1 - dist / 140) * 0.8;
            const vortexAngle = Math.atan2(dy, dx) + Math.PI * 0.48;
            angle = angle * (1 - influence) + vortexAngle * influence;
          }
        }

        const vx = Math.cos(angle) * p.speed;
        const vy = Math.sin(angle) * p.speed;

        p.px = p.x;
        p.py = p.y;
        p.x += vx;
        p.y += vy;

        // Wrap
        if (p.x < 0) {
          p.x += W;
          p.px = p.x;
        }
        if (p.x > W) {
          p.x -= W;
          p.px = p.x;
        }
        if (p.y < 0) {
          p.y += H;
          p.py = p.y;
        }
        if (p.y > H) {
          p.y -= H;
          p.py = p.y;
        }

        // Hue from angle (double-mod to handle negative angles)
        p.hue = ((((angle / (Math.PI * 2)) % 1) + 1) % 1) * 360;

        // Skip if wrapped (would draw line across screen)
        const ddx = p.x - p.px;
        const ddy = p.y - p.py;
        if (ddx * ddx + ddy * ddy < 80) {
          const bucket = Math.floor((p.hue / 360) * HUE_BUCKETS) % HUE_BUCKETS;
          buckets[bucket].push({ fx: p.px, fy: p.py, tx: p.x, ty: p.y });
        }
      }

      // Batch draw by hue
      ctx.lineWidth = 0.8;
      for (let b = 0; b < HUE_BUCKETS; b++) {
        if (buckets[b].length === 0) continue;
        const hue = (b / HUE_BUCKETS) * 360;
        ctx.strokeStyle = `hsla(${hue},75%,55%,0.25)`;
        ctx.beginPath();
        for (const seg of buckets[b]) {
          ctx.moveTo(seg.fx, seg.fy);
          ctx.lineTo(seg.tx, seg.ty);
        }
        ctx.stroke();
      }

      t += 0.016;
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isInView]);

  const handleMouse = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 600 / rect.width;
    const scaleY = 420 / rect.height;
    mouseRef.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleLeave = useCallback(() => {
    mouseRef.current = { x: -1, y: -1 };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-lg overflow-hidden cursor-crosshair"
      style={{ aspectRatio: "600 / 420" }}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

// Stores one particle used by the tidal surface renderer.
interface TideParticle {
  x: number;
  y: number;
  px: number;
  py: number;
  ox: number;
  oy: number;
  size: number;
  phase: number;
}

// Renders a full-width shoreline where particle bands surge upward and recede like tidal wash.
function TidalFieldCanvas() {
  const accentColor = useAppStore((s) => s.userPreferences.accentColor);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: "120px" });
  const rafRef = useRef(0);
  const particlesRef = useRef<TideParticle[]>([]);

  useEffect(() => {
    if (!isInView) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let time = 0;

    const rootStyles = getComputedStyle(document.documentElement);
    const accent = hexToRgb(rootStyles.getPropertyValue("--accent").trim() || "#00e5ff");
    const accentWarm = mixRgb(accent, hexToRgb("#ffd9a6"), 0.24);
    const accentCold = mixRgb(accent, hexToRgb("#cae8ff"), 0.38);
    const shallowWater = mixRgb(accent, hexToRgb("#8de7ff"), 0.44);
    const foam = mixRgb(accentCold, hexToRgb("#ffffff"), 0.64);
    const sandDark = hexToRgb("#171313");
    const sandLight = mixRgb(hexToRgb("#57473b"), accentWarm, 0.18);

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(960, Math.floor(rect.width));
      height = Math.max(320, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const step = 8;
      const particles: TideParticle[] = [];
      for (let y = -8; y <= height + 8; y += step) {
        for (let x = -8; x <= width + 8; x += step) {
          const jitterX = (Math.random() - 0.5) * 4.8;
          const jitterY = (Math.random() - 0.5) * 4.8;
          const px = x + jitterX;
          const py = y + jitterY;
          particles.push({
            x: px,
            y: py,
            px,
            py,
            ox: px,
            oy: py,
            size: 0.7 + Math.random() * 1.3,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
      particlesRef.current = particles;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    const loop = () => {
      ctx.clearRect(0, 0, width, height);

      for (const particle of particlesRef.current) {
        particle.px = particle.x;
        particle.py = particle.y;

        const nx = particle.ox / width;
        const ny = particle.oy / height;
        const cycle = (Math.sin(time * 0.36 - 0.9) + 1) * 0.5;
        const wash = smoothstep(0.08, 0.96, cycle);
        const retreat = smoothstep(0.38, 0.96, (Math.sin(time * 0.36 + Math.PI * 0.45) + 1) * 0.5);
        const shorelineBase = lerp(height * 0.94, height * 0.3, wash);
        const shoreline =
          shorelineBase +
          Math.sin(nx * 10.5 + time * 0.82) * 12 +
          Math.cos(nx * 4.8 - time * 0.44) * 18 +
          (fbm(nx * 2.6 + time * 0.05, time * 0.04 + ny * 0.8, 3) - 0.5) * 26;
        const nextShoreline =
          lerp(height * 0.94, height * 0.3, smoothstep(0.08, 0.96, (Math.sin((time + 0.045) * 0.36 - 0.9) + 1) * 0.5)) +
          Math.sin(nx * 10.5 + (time + 0.045) * 0.82) * 12 +
          Math.cos(nx * 4.8 - (time + 0.045) * 0.44) * 18 +
          (fbm(nx * 2.6 + (time + 0.045) * 0.05, (time + 0.045) * 0.04 + ny * 0.8, 3) - 0.5) * 26;
        const shorelineVelocity = nextShoreline - shoreline;
        const distanceToFront = particle.oy - shoreline;
        const foamBand = 1 - smoothstep(10, 48, Math.abs(distanceToFront));
        const undertow = smoothstep(-120, -10, distanceToFront);
        const washBody = smoothstep(72, -26, distanceToFront);
        const sandMist = smoothstep(-6, -68, distanceToFront) * retreat;
        const surfBand = 1 - smoothstep(18, 110, Math.abs(distanceToFront));
        const waterBand = distanceToFront >= 0 ? 1 : 0;
        const retreatBand =
          smoothstep(-8, -42, distanceToFront) *
          (1 - smoothstep(-42, -108, distanceToFront)) *
          retreat;
        const lateralSweep =
          Math.sin(nx * 16 + time * 0.86 + particle.phase) * (0.45 + washBody * 1.3) +
          (fbm(nx * 4.6 + time * 0.06, ny * 4.1 - time * 0.03, 3) - 0.5) * (1.2 + washBody * 2.1);
        const forwardPush = washBody * (1.2 + foamBand * 1.7) * Math.max(0, -shorelineVelocity + 0.8);
        const backPull = sandMist * (0.8 + retreat * 2.6) * Math.max(0, shorelineVelocity + 0.35);
        const yDrift =
          -forwardPush +
          backPull +
          Math.sin(nx * 9.2 + particle.phase + time * 0.2) * 0.22;

        particle.x = particle.ox + lateralSweep;
        particle.y = particle.oy + yDrift;

        let color = shallowWater;
        let alpha = 0;
        let drawSize = particle.size * 0.78;
        const coastalBand = Math.max(waterBand, retreatBand, foamBand * 0.96);
        if (coastalBand < 0.035) continue;

        if (distanceToFront >= 0) {
          const depthFade = 1 - smoothstep(120, 280, distanceToFront);
          color = mixRgb(shallowWater, foam, foamBand * 0.14);
          alpha = 0.12 + depthFade * 0.1 + undertow * 0.08;
          drawSize = particle.size * (0.88 + depthFade * 0.2);
        }

        if (Math.abs(distanceToFront) <= 56) {
          color = mixRgb(accentCold, foam, 0.4 + foamBand * 0.5);
          alpha = (0.14 + foamBand * 0.48) * coastalBand;
          drawSize = particle.size * (0.92 + foamBand * 0.82);
        }

        if (distanceToFront < -8) {
          color = mixRgb(accentCold, foam, 0.58 + sandMist * 0.18);
          alpha = (0.03 + retreatBand * 0.16) * coastalBand;
          drawSize = particle.size * (0.42 + retreatBand * 0.18);
        }

        ctx.fillStyle = rgba(color, alpha);
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, drawSize, 0, Math.PI * 2);
        ctx.fill();

        if (foamBand > 0.32) {
          ctx.fillStyle = rgba(foam, (0.08 + foamBand * 0.22) * (0.72 + undertow * 0.28));
          ctx.beginPath();
          ctx.arc(
            particle.x + Math.cos(particle.phase + time * 0.8) * 0.7,
            particle.y + Math.sin(particle.phase + time * 0.6) * 0.7,
            drawSize * 0.48,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }

      time += 0.016;
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, [accentColor, isInView]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ height: "clamp(19rem, 36vw, 31rem)", background: "transparent" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

function PieceSection({
  number,
  title,
  subtitle,
  description,
  hint,
  accentColor,
  children,
}: {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  hint?: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal>
      <section className="space-y-5">
        {/* Displays the section number, title, subtitle, and framing copy for one artwork. */}
        <div className="flex items-baseline gap-4">
          <span
            className="text-[40px] font-bold leading-none"
            style={{
              fontFamily: "var(--font-orbitron)",
              color: "var(--text-dim)",
              opacity: 0.2,
            }}
          >
            {number}
          </span>
          <div>
            <h3
              className="text-[22px] font-bold tracking-[0.15em]"
              style={{ fontFamily: "var(--font-orbitron)", color: accentColor }}
            >
              {title}
            </h3>
            <p
              className="text-[13px] tracking-wider mt-0.5"
              style={{
                fontFamily: "var(--font-exo2)",
                color: "var(--text-secondary)",
              }}
            >
              {subtitle}
            </p>
          </div>
        </div>

        <p
          className="text-[13px] leading-relaxed max-w-2xl"
          style={{ fontFamily: "var(--font-exo2)", color: "var(--text-dim)" }}
        >
          {description}
        </p>

        {/* Shows the interaction instruction specific to the current artwork above the interactive frame. */}
        {hint ? (
          <p
            className="text-[11px] tracking-[0.15em] text-center"
            style={{
              fontFamily: "var(--font-fira-code)",
              color: "var(--text-dim)",
              opacity: 0.5,
            }}
          >
            {hint}
          </p>
        ) : null}

        {/* Wraps the interactive canvas in a shared frame with an accent-colored glow. */}
        <div
          className="rounded-lg overflow-hidden"
          style={{
            border: `1px solid color-mix(in srgb, ${accentColor} 20%, transparent)`,
            boxShadow: `0 0 30px color-mix(in srgb, ${accentColor} 6%, transparent), inset 0 0 30px rgba(0,0,0,0.3)`,
          }}
        >
          {children}
        </div>
      </section>
    </Reveal>
  );
}

/* Composes the generative-art gallery page and arranges the four interactive physics pieces. */

export default function AuroraView() {
  return (
    <div className="min-h-full p-6 pb-0">
      <div className="max-w-5xl mx-auto space-y-24">
        {/* Introduces the gallery with a cinematic hero and a concise description of the exhibit. */}
        <section className="relative pt-8 pb-8">
          {/* Places faint orbital geometry behind the hero to reinforce the space theme. */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <svg
              width="500"
              height="500"
              viewBox="0 0 500 500"
              fill="none"
              className="opacity-[0.04]"
            >
              <circle
                cx="250"
                cy="250"
                r="120"
                stroke="var(--accent)"
                strokeWidth="0.5"
              />
              <circle
                cx="250"
                cy="250"
                r="180"
                stroke="var(--accent)"
                strokeWidth="0.3"
              />
              <circle
                cx="250"
                cy="250"
                r="240"
                stroke="var(--accent)"
                strokeWidth="0.2"
              />
              <ellipse
                cx="250"
                cy="250"
                rx="200"
                ry="80"
                stroke="var(--accent)"
                strokeWidth="0.4"
                transform="rotate(-20 250 250)"
              />
            </svg>
          </div>

          <div className="flex items-center gap-10">
            {/* Shows the animated orbital emblem that anchors the hero visually. */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex-shrink-0"
            >
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center relative"
                style={{
                  background:
                    "radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)",
                  border: "1px solid rgba(0,229,255,0.15)",
                }}
              >
                <motion.svg
                  width="64"
                  height="64"
                  viewBox="0 0 64 64"
                  fill="none"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 80,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <circle
                    cx="32"
                    cy="32"
                    r="22"
                    stroke="var(--neon-cyan)"
                    strokeWidth="0.6"
                    fill="none"
                    opacity="0.2"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="12"
                    stroke="var(--neon-cyan)"
                    strokeWidth="1"
                    fill="none"
                    opacity="0.5"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="3.5"
                    fill="var(--neon-cyan)"
                    opacity="0.8"
                  />
                  <ellipse
                    cx="32"
                    cy="32"
                    rx="28"
                    ry="9"
                    stroke="var(--neon-cyan)"
                    strokeWidth="0.5"
                    fill="none"
                    opacity="0.2"
                    transform="rotate(-25 32 32)"
                  />
                  <ellipse
                    cx="32"
                    cy="32"
                    rx="28"
                    ry="9"
                    stroke="var(--neon-orange)"
                    strokeWidth="0.5"
                    fill="none"
                    opacity="0.12"
                    transform="rotate(40 32 32)"
                  />
                  <ellipse
                    cx="32"
                    cy="32"
                    rx="28"
                    ry="9"
                    stroke="var(--holo-purple)"
                    strokeWidth="0.4"
                    fill="none"
                    opacity="0.08"
                    transform="rotate(75 32 32)"
                  />
                  <circle
                    cx="56"
                    cy="24"
                    r="2"
                    fill="var(--neon-cyan)"
                    opacity="0.9"
                  >
                    <animate
                      attributeName="opacity"
                      values="0.9;0.3;0.9"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </motion.svg>
                <div className="absolute inset-2 rounded-full border border-white/5" />
              </div>
            </motion.div>

            {/* Displays the title stack and introductory copy for the gallery hero. */}
            <div className="flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <div
                  className="text-[12px] font-bold tracking-[0.4em] uppercase mb-2"
                  style={{
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-orbitron)",
                  }}
                >
                  GENERATIVE SPACE ART GALLERY
                </div>
                <h1
                  className="text-2xl font-bold tracking-[0.2em] text-glow-cyan mb-1"
                  style={{ fontFamily: "var(--font-orbitron)" }}
                >
                  AURORA
                </h1>
                <h2
                  className="text-base tracking-[0.08em] mb-4"
                  style={{
                    color: "var(--neon-orange)",
                    fontFamily: "var(--font-orbitron)",
                    fontWeight: 600,
                  }}
                >
                  INTERACTIVE COSMIC EXPERIMENTS
                </h2>
              </motion.div>

              <p
                className="max-w-2xl text-[15px] leading-[1.9] tracking-wide"
                style={{
                  fontFamily: "var(--font-exo2)",
                  color: "var(--text-secondary)",
                }}
              >
                Real-time visual pieces that translate orbital mechanics, wave
                motion, particle systems, and celestial dynamics into tactile
                interactive artworks built directly on the Canvas API.
              </p>

              {/* Lists the rendering systems and simulation families featured by the exhibit. */}
              <motion.div
                className="flex items-center gap-4 flex-wrap pt-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                {[
                  "Canvas 2D",
                  "Ribbon Physics",
                  "N-body Gravity",
                  "Particle Detonation",
                  "Flow Fields",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full"
                    style={{
                      fontFamily: "var(--font-fira-code)",
                      color: "var(--text-dim)",
                      border: "1px solid var(--border-subtle)",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Presents the aurora ribbon piece and its interaction model. */}
        <PieceSection
          number="01"
          title="SILK"
          subtitle="Aurora Filaments"
          description="Charged particles from the solar wind collide with Earth's magnetosphere, painting luminous curtains across the polar sky. Your gestures trace aurora filaments — broad ribbons where you sweep slowly, thin rays where you dart. After release, each filament undulates as if driven by fluctuating geomagnetic field lines, cycling through the emission spectrum: oxygen green, nitrogen blue, and the rare deep red of high-altitude excitation."
          hint="CLICK + DRAG TO PAINT · FILAMENTS FADE IN ~6s"
          accentColor="var(--neon-cyan)"
        >
          <SilkCanvas />
        </PieceSection>

        {/* Presents the orbital gravity piece and its interaction model. */}
        <PieceSection
          number="02"
          title="GRAVITY"
          subtitle="Stellar Nursery"
          description="A protostellar system takes shape in the void. A young sun anchors the gravitational well while nascent worlds trace their Keplerian orbits — luminous trails mapping the invisible curves of spacetime curvature. Spawn new planetesimals with a click: each enters a circular orbit, but N-body perturbations from neighboring masses sculpt the system into resonance, ejection, and capture — the same processes that shaped our own solar system four billion years ago."
          hint="CLICK TO SPAWN BODY · DOUBLE-CLICK TO RESET"
          accentColor="var(--neon-orange)"
        >
          <GravityCanvas />
        </PieceSection>

        {/* Presents the supernova shockwave piece and its interaction model. */}
        <PieceSection
          number="03"
          title="SHOCKWAVE"
          subtitle="Supernova Remnant"
          description="Witness the final breath of a massive star. Each click triggers a core-collapse supernova — stellar fragments hurled outward through the interstellar medium. The ejecta glow white-hot at birth, cooling through the thermal spectrum from gold to amber to the deep blue of expanding nebular gas. Blast waves trace the shock front as gravity reclaims the debris. Layer multiple supernovae to seed the cosmos with heavy elements — the iron in your blood was forged in explosions like these."
          hint="CLICK TO DETONATE · EACH CLICK CYCLES COLOR"
          accentColor="var(--holo-purple)"
        >
          <ShockwaveCanvas />
        </PieceSection>

        {/* Presents the solar-wind flow-field piece and its interaction model. */}
        <PieceSection
          number="04"
          title="FLOW FIELD"
          subtitle="Solar Wind"
          description="Three thousand charged particles stream outward through the heliosphere, their paths bent by the Sun's interplanetary magnetic field. Each particle is colored by its trajectory — the same chromatic mapping scientists use to visualize solar wind velocity in real magnetospheric data. Move your cursor to simulate a coronal mass ejection: a magnetic vortex that twists and redirects the plasma flow, creating turbulent eddies that slowly dissolve into laminar streams."
          hint="MOVE CURSOR TO CREATE CME VORTEX · LEAVE TO RELEASE"
          accentColor="var(--neon-green)"
        >
          <FlowFieldCanvas />
        </PieceSection>

        {/* Closes the gallery with a short reflection on the physics behind the visual experiments. */}
        <Reveal>
          <div className="relative text-center py-12">
            <CornerBrackets color="var(--accent)" size={20} />
            <p
              className="text-[12px] tracking-[0.25em] uppercase mb-3"
              style={{
                fontFamily: "var(--font-fira-code)",
                color: "var(--text-dim)",
              }}
            >
              The cosmos rendered in your browser
            </p>
            <p
              className="text-[15px] leading-relaxed max-w-md mx-auto"
              style={{
                fontFamily: "var(--font-exo2)",
                color: "var(--text-secondary)",
              }}
            >
              From auroral curtains to supernova remnants, from Keplerian orbits
              to heliospheric plasma — the same physics that drives our
              satellite monitoring system, visualized as interactive art.
            </p>
          </div>
        </Reveal>
      </div>

      {/* Renders the full-width shoreline study beneath the framed gallery pieces. */}
      <div className="relative mt-10 -mx-6 overflow-hidden">
        <TidalFieldCanvas />
      </div>
    </div>
  );
}

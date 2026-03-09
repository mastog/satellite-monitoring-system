// Draws the full arcade scene in a fixed layer order so background, actors,
// projectiles, particles, and screen effects compose consistently each frame.
import { Camera } from "../engine/Camera";
import { StarField } from "./StarField";
import { Effects } from "./Effects";
import {
  drawShape,
  drawCircle,
  drawLine,
  getShipDesign,
  asteroidShape,
  satelliteShape,
  debrisShape,
  bossShape,
  droneShape,
  meteorShape,
  junkHulkShape,
  enemyFighterShape,
  type ShipDesign,
} from "./ShapeGenerator";
import type { PlayerState } from "../entities/Player";
import type { EnemyInstance } from "../entities/Enemy";
import type { BulletInstance } from "../entities/Bullet";
import type { PickupInstance } from "../entities/Pickup";
import type { Particle } from "../systems/ParticleSystem";

// Limits how many historical trail points are retained for the player's
// exhaust plume so the effect stays smooth without growing unbounded.
const TRAIL_MAX = 110;

interface TrailPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private starField: StarField;
  effects: Effects;
  private designCache: Map<string, ShipDesign> = new Map();
  private trail: TrailPoint[] = [];

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.starField = new StarField();
    this.effects = new Effects();
  }

  // Reuses generated ship geometry per hull and size so the renderer does not
  // rebuild the same procedural outlines every frame.
  private getDesign(hull: string, size: number): ShipDesign {
    const key = `${hull}_${size}`;
    if (!this.designCache.has(key)) {
      this.designCache.set(key, getShipDesign(size, hull));
    }
    return this.designCache.get(key)!;
  }

  // Clears the frame to the game's base background color before drawing the new scene.
  clear(width: number, height: number): void {
    this.ctx.fillStyle = "#06080d";
    this.ctx.fillRect(0, 0, width, height);
  }

  // Delegates background star rendering to the starfield subsystem.
  renderStars(camera: Camera): void {
    this.starField.render(this.ctx, camera);
  }

  // Draws the player ship, including engine trail, invincibility blink, hull,
  // cockpit, and nozzle glow.
  renderPlayer(player: PlayerState, camera: Camera): void {
    if (!player.alive) {
      this.trail.length = 0;
      return;
    }

    const sx = camera.screenX(player.x);
    const sy = camera.screenY(player.y);
    const color = player.shipColor || "#00e5ff";

    const r = parseInt(color.slice(1, 3), 16) || 0;
    const g = parseInt(color.slice(3, 5), 16) || 0;
    const bVal = parseInt(color.slice(5, 7), 16) || 0;

    // Samples trail points from the ship tail rather than the center so the
    // exhaust plume appears to originate from the engines.
    const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
    const hull = player.shipHull || "viper";
    const design = this.getDesign(hull, 16);
    const cos = Math.cos(player.angle);
    const sin = Math.sin(player.angle);

    const TAIL_OFFSET = 12;
    const tailX = player.x - cos * TAIL_OFFSET;
    const tailY = player.y - sin * TAIL_OFFSET;

    if (speed > 0.15) {
      this.trail.unshift({
        x: tailX,
        y: tailY,
        vx: player.vx,
        vy: player.vy,
        age: 0,
      });
    }
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].age++;
      if (this.trail[i].age > TRAIL_MAX) {
        this.trail.splice(i, 1);
      }
    }

    // Builds a tapered ribbon from the stored trail points to render the
    // afterburner plume with width and opacity fading over time.
    if (this.trail.length >= 3) {
      const N = this.trail.length;

      const sx_ = new Array<number>(N);
      const sy_ = new Array<number>(N);
      const fr = new Array<number>(N);
      for (let i = 0; i < N; i++) {
        sx_[i] = camera.screenX(this.trail[i].x);
        sy_[i] = camera.screenY(this.trail[i].y);
        fr[i] = 1 - this.trail[i].age / TRAIL_MAX;
      }

      const nx = new Array<number>(N);
      const ny = new Array<number>(N);
      for (let i = 0; i < N; i++) {
        let tx: number, ty: number;
        if (i > 0 && i < N - 1) {
          tx = sx_[i - 1] - sx_[i + 1];
          ty = sy_[i - 1] - sy_[i + 1];
        } else if (i === 0) {
          tx = sx_[0] - sx_[1];
          ty = sy_[0] - sy_[1];
        } else {
          tx = sx_[N - 2] - sx_[N - 1];
          ty = sy_[N - 2] - sy_[N - 1];
        }
        const len = Math.sqrt(tx * tx + ty * ty) || 1;
        nx[i] = -ty / len;
        ny[i] = tx / len;
      }

      const c = this.ctx;
      c.save();
      c.globalCompositeOperation = "lighter";

      const FLAME = 8;

      // Draws the widest glow layer that gives the exhaust its outer halo.
      c.fillStyle = `rgb(${r},${g},${bVal})`;
      for (let i = 0; i < N - 1; i++) {
        const fa = fr[i],
          fb = fr[i + 1];
        const wA = Math.pow(fa, 0.35) * (8 + speed * 4);
        const wB = Math.pow(fb, 0.35) * (8 + speed * 4);
        const alpha = fa * fa * 0.06;
        if (alpha < 0.002 || wA + wB < 1) continue;
        c.globalAlpha = alpha;
        c.beginPath();
        c.moveTo(sx_[i] + nx[i] * wA, sy_[i] + ny[i] * wA);
        c.lineTo(sx_[i + 1] + nx[i + 1] * wB, sy_[i + 1] + ny[i + 1] * wB);
        c.lineTo(sx_[i + 1] - nx[i + 1] * wB, sy_[i + 1] - ny[i + 1] * wB);
        c.lineTo(sx_[i] - nx[i] * wA, sy_[i] - ny[i] * wA);
        c.closePath();
        c.fill();
      }

      // Draws the denser inner plume that carries most of the exhaust color.
      for (let i = 0; i < N - 1; i++) {
        const fa = fr[i],
          fb = fr[i + 1];
        const ffA = Math.max(0, 1 - this.trail[i].age / FLAME);
        const ffB = Math.max(0, 1 - this.trail[i + 1].age / FLAME);
        const wA = Math.pow(fa, 0.55) * (3.5 + speed * 1.5) + ffA * 2;
        const wB = Math.pow(fb, 0.55) * (3.5 + speed * 1.5) + ffB * 2;
        const alpha = fa * fa * 0.3 + ffA * 0.18;
        if (alpha < 0.003 || wA + wB < 0.5) continue;
        c.globalAlpha = alpha;
        c.fillStyle = `rgb(${r},${g},${bVal})`;
        c.beginPath();
        c.moveTo(sx_[i] + nx[i] * wA, sy_[i] + ny[i] * wA);
        c.lineTo(sx_[i + 1] + nx[i + 1] * wB, sy_[i + 1] + ny[i + 1] * wB);
        c.lineTo(sx_[i + 1] - nx[i + 1] * wB, sy_[i + 1] - ny[i + 1] * wB);
        c.lineTo(sx_[i] - nx[i] * wA, sy_[i] - ny[i] * wA);
        c.closePath();
        c.fill();
      }

      c.restore();
    }

    // Adds local glow at each engine nozzle so thrust remains visible even
    // when the full trail is short.
    for (const [ex, ey] of design.engines) {
      const nzx = ex * cos - ey * sin + sx;
      const nzy = ex * sin + ey * cos + sy;
      const fl = 0.7 + Math.random() * 0.3;
      drawCircle(
        this.ctx,
        nzx,
        nzy,
        (1.5 + speed * 0.5) * fl,
        color,
        0.4,
        `rgba(${r},${g},${bVal},0.4)`
      );
    }

    // Skips hull rendering on alternating frames while invincibility is active.
    if (
      player.invincibleFrames > 0 &&
      Math.floor(player.invincibleFrames / 4) % 2 === 0
    ) {
      return;
    }

    // Draws the translucent hull body fill.
    const fill = `rgba(${r},${g},${bVal},0.08)`;
    drawShape(
      this.ctx,
      sx,
      sy,
      design.hull,
      player.angle,
      "transparent",
      0,
      fill
    );

    // Draws the secondary panel lines that give the ship silhouette more structure.
    const dimColor = `rgba(${r},${g},${bVal},0.35)`;
    for (const detail of design.details) {
      drawShape(this.ctx, sx, sy, detail, player.angle, dimColor, 0.8);
    }

    // Draws the main hull outline used as the ship's primary silhouette.
    drawShape(
      this.ctx,
      sx,
      sy,
      design.hull,
      player.angle,
      color,
      1.8,
      undefined,
      color
    );

    // Draws the glowing cockpit core after the hull so it sits visually on top.
    const [ckx, cky] = design.cockpitPos;
    const cockpitX = ckx * cos - cky * sin + sx;
    const cockpitY = ckx * sin + cky * cos + sy;
    drawCircle(
      this.ctx,
      cockpitX,
      cockpitY,
      design.cockpitRadius,
      color,
      1,
      `rgba(${r},${g},${bVal},0.5)`,
      color
    );
  }

  renderEnemies(
    enemies: { forEach: (fn: (e: EnemyInstance) => void) => void },
    camera: Camera
  ): void {
    enemies.forEach((enemy) => {
      if (!camera.isVisible(enemy.x, enemy.y, enemy.radius + 20)) return;

      const sx = camera.screenX(enemy.x);
      const sy = camera.screenY(enemy.y);

      switch (enemy.type) {
        case "derelict_boss":
          this.renderBoss(sx, sy, enemy);
          break;
        case "rogue_satellite":
        case "elite_satellite":
          this.renderSatellite(sx, sy, enemy);
          break;
        case "asteroid_s":
        case "asteroid_m":
        case "asteroid_l":
          this.renderAsteroid(sx, sy, enemy);
          break;
        case "solar_flare":
          this.renderSolarFlare(sx, sy, enemy);
          break;
        case "meteor_swarm":
          this.renderMeteor(sx, sy, enemy);
          break;
        case "space_junk":
          this.renderJunkHulk(sx, sy, enemy);
          break;
        case "shield_drone":
          this.renderShieldDrone(sx, sy, enemy);
          break;
        case "kamikaze":
          this.renderKamikaze(sx, sy, enemy);
          break;
        default:
          this.renderDrone(sx, sy, enemy);
          break;
      }

      // HP bar for tougher enemies
      if (
        enemy.maxHp > 10 &&
        enemy.type !== "derelict_boss" &&
        enemy.type !== "solar_flare"
      ) {
        const ratio = enemy.hp / enemy.maxHp;
        if (ratio < 1) {
          this.drawHpBar(
            sx,
            sy - enemy.radius - 6,
            enemy.hp,
            enemy.maxHp,
            Math.min(40, enemy.radius * 2)
          );
        }
      }

      // Stun indicator
      if (enemy.stunFrames > 0) {
        drawCircle(
          this.ctx,
          sx,
          sy,
          enemy.radius + 6,
          "#00e5ff",
          1,
          undefined,
          "#00e5ff"
        );
      }

      // Temporal Anchor mark visuals: rewind phase -> bubble phase.
      if (enemy.temporalRewindFrames > 0 || enemy.temporalBubbleFrames > 0) {
        const c = this.ctx;
        const t = Date.now() * 0.004;
        const rewindPhase = enemy.temporalRewindFrames > 0;
        const bubbleAlpha = rewindPhase
          ? 0.45
          : 0.25 + Math.sin(t * 1.4 + enemy.id * 0.3) * 0.14;
        const bubbleRadius = enemy.radius + (rewindPhase ? 10 : 12);

        c.save();
        c.globalCompositeOperation = "lighter";

        // Outer shell
        c.globalAlpha = Math.max(0.18, bubbleAlpha);
        c.strokeStyle = rewindPhase ? "#8eb9ff" : "#d6e7ff";
        c.lineWidth = rewindPhase ? 1.6 : 1.3;
        c.beginPath();
        c.arc(sx, sy, bubbleRadius, 0, Math.PI * 2);
        c.stroke();

        // Rotating ticks / time glyphs
        c.translate(sx, sy);
        c.rotate((rewindPhase ? -1 : 1) * (t * 0.55 + enemy.id * 0.08));
        c.strokeStyle = rewindPhase
          ? "rgba(142,185,255,0.7)"
          : "rgba(236,244,255,0.75)";
        c.lineWidth = 1;
        const ticks = 9;
        for (let i = 0; i < ticks; i++) {
          const a = (i / ticks) * Math.PI * 2;
          const r0 = bubbleRadius - 4;
          const r1 = bubbleRadius + (i % 2 === 0 ? 1.5 : 0.5);
          c.beginPath();
          c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
          c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
          c.stroke();
        }
        c.restore();
      }
    });
  }

  // ── Per-type enemy renderers ─────────────────────────────────────────

  private renderDrone(sx: number, sy: number, enemy: EnemyInstance): void {
    const shape = droneShape(enemy.radius);
    drawShape(
      this.ctx,
      sx,
      sy,
      shape,
      enemy.angle,
      "transparent",
      0,
      `${enemy.color}18`
    );
    drawShape(
      this.ctx,
      sx,
      sy,
      shape,
      enemy.angle,
      enemy.color,
      1.2,
      undefined,
      enemy.color
    );
    const cos = Math.cos(enemy.angle);
    const sin = Math.sin(enemy.angle);
    const engineX = sx - cos * enemy.radius * 0.5;
    const engineY = sy - sin * enemy.radius * 0.5;
    const flicker = 0.5 + Math.random() * 0.5;
    drawCircle(
      this.ctx,
      engineX,
      engineY,
      1.5 * flicker,
      enemy.color,
      0.5,
      `${enemy.color}88`
    );
  }

  private renderSatellite(sx: number, sy: number, enemy: EnemyInstance): void {
    const shape = enemyFighterShape(enemy.radius);
    const cos = Math.cos(enemy.angle);
    const sin = Math.sin(enemy.angle);

    const engineX = sx - cos * enemy.radius * 0.5;
    const engineY = sy - sin * enemy.radius * 0.5;
    const flicker = 0.6 + Math.random() * 0.4;
    drawCircle(
      this.ctx,
      engineX,
      engineY,
      2.5 * flicker,
      "#ff4444",
      0.5,
      "#ff444488",
      "#ff4444"
    );

    const trailLen = 6 + Math.random() * 4;
    const tailX = engineX - cos * trailLen;
    const tailY = engineY - sin * trailLen;
    drawLine(
      this.ctx,
      engineX,
      engineY,
      tailX,
      tailY,
      "#ff4444",
      1.2,
      "#ff4444"
    );

    drawShape(
      this.ctx,
      sx,
      sy,
      shape,
      enemy.angle,
      "transparent",
      0,
      `${enemy.color}15`
    );
    const spineStart = [
      enemy.radius * 0.45 * cos + sx,
      enemy.radius * 0.45 * sin + sy,
    ] as const;
    const spineEnd = [
      -enemy.radius * 0.35 * cos + sx,
      -enemy.radius * 0.35 * sin + sy,
    ] as const;
    this.ctx.save();
    this.ctx.globalAlpha = 0.3;
    drawLine(
      this.ctx,
      spineStart[0],
      spineStart[1],
      spineEnd[0],
      spineEnd[1],
      enemy.color,
      0.7
    );
    this.ctx.restore();
    drawShape(
      this.ctx,
      sx,
      sy,
      shape,
      enemy.angle,
      enemy.color,
      1.5,
      undefined,
      enemy.color
    );

    if (enemy.projectile) {
      const noseX = sx + cos * enemy.radius * 0.6;
      const noseY = sy + sin * enemy.radius * 0.6;
      const pulse = 0.35 + Math.sin(Date.now() * 0.008) * 0.3;
      drawCircle(
        this.ctx,
        noseX,
        noseY,
        2,
        "#ff3a3a",
        1,
        `rgba(255,60,60,${pulse})`,
        "#ff3a3a"
      );
    }
  }

  private renderShieldDrone(
    sx: number,
    sy: number,
    enemy: EnemyInstance
  ): void {
    const shape = droneShape(enemy.radius);
    drawShape(
      this.ctx,
      sx,
      sy,
      shape,
      enemy.angle,
      "transparent",
      0,
      `${enemy.color}18`
    );
    drawShape(
      this.ctx,
      sx,
      sy,
      shape,
      enemy.angle,
      enemy.color,
      1.5,
      undefined,
      enemy.color
    );

    // Shield ring
    const time = Date.now() * 0.003;
    const pulse = 0.4 + Math.sin(time * 2) * 0.15;
    this.ctx.save();
    this.ctx.globalAlpha = pulse;
    this.ctx.strokeStyle = "#82b1ff";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, enemy.radius + 4, time, time + Math.PI * 1.4);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(
      sx,
      sy,
      enemy.radius + 4,
      time + Math.PI,
      time + Math.PI + Math.PI * 1.4
    );
    this.ctx.stroke();
    this.ctx.restore();
  }

  private renderKamikaze(sx: number, sy: number, enemy: EnemyInstance): void {
    const shape = droneShape(enemy.radius);
    // Pulsing red glow
    const pulse = 0.5 + Math.sin(Date.now() * 0.015) * 0.5;
    this.ctx.save();
    this.ctx.globalAlpha = pulse * 0.3;
    const glow = this.ctx.createRadialGradient(
      sx,
      sy,
      0,
      sx,
      sy,
      enemy.radius * 1.5
    );
    glow.addColorStop(0, "#ff1744");
    glow.addColorStop(1, "transparent");
    this.ctx.fillStyle = glow;
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, enemy.radius * 1.5, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    drawShape(
      this.ctx,
      sx,
      sy,
      shape,
      enemy.angle,
      "transparent",
      0,
      `${enemy.color}25`
    );
    drawShape(
      this.ctx,
      sx,
      sy,
      shape,
      enemy.angle,
      enemy.color,
      1.5,
      undefined,
      enemy.color
    );
  }

  private renderAsteroid(sx: number, sy: number, enemy: EnemyInstance): void {
    const shape = asteroidShape(enemy.radius, enemy.seed);
    const grad = this.ctx.createRadialGradient(sx, sy, 0, sx, sy, enemy.radius);
    grad.addColorStop(0, `${enemy.color}20`);
    grad.addColorStop(1, `${enemy.color}08`);
    drawShape(
      this.ctx,
      sx,
      sy,
      shape,
      enemy.angle,
      enemy.color,
      1.5,
      undefined
    );
    this.ctx.save();
    this.ctx.beginPath();
    const cos = Math.cos(enemy.angle);
    const sin = Math.sin(enemy.angle);
    for (let i = 0; i < shape.points.length; i++) {
      const [px, py] = shape.points[i];
      const rx = px * cos - py * sin + sx;
      const ry = px * sin + py * cos + sy;
      if (i === 0) this.ctx.moveTo(rx, ry);
      else this.ctx.lineTo(rx, ry);
    }
    this.ctx.closePath();
    this.ctx.fillStyle = grad;
    this.ctx.fill();
    this.ctx.restore();
  }

  private renderSolarFlare(sx: number, sy: number, enemy: EnemyInstance): void {
    this.ctx.save();
    this.ctx.globalAlpha = 0.4;
    const gradient = this.ctx.createLinearGradient(sx - 400, sy, sx + 400, sy);
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(0.3, enemy.color);
    gradient.addColorStop(0.7, enemy.color);
    gradient.addColorStop(1, "transparent");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(sx - 400, sy - 20, 800, 40);
    this.ctx.restore();
  }

  private renderMeteor(sx: number, sy: number, enemy: EnemyInstance): void {
    const moveAngle =
      enemy.vx !== 0 || enemy.vy !== 0
        ? Math.atan2(enemy.vy, enemy.vx)
        : enemy.angle;
    const shape = meteorShape(enemy.radius);
    drawShape(
      this.ctx,
      sx,
      sy,
      shape,
      moveAngle,
      enemy.color,
      1.5,
      `${enemy.color}35`,
      enemy.color
    );
    const cos = Math.cos(moveAngle);
    const sin = Math.sin(moveAngle);
    for (let i = 1; i <= 4; i++) {
      const trailX = sx - cos * enemy.radius * i * 0.55;
      const trailY = sy - sin * enemy.radius * i * 0.55;
      this.ctx.save();
      this.ctx.globalAlpha = 0.35 - i * 0.08;
      const r = enemy.radius * (0.35 - i * 0.06);
      if (r > 0) {
        drawCircle(
          this.ctx,
          trailX,
          trailY,
          r,
          enemy.color,
          0.5,
          `${enemy.color}55`
        );
      }
      this.ctx.restore();
    }
  }

  private renderJunkHulk(sx: number, sy: number, enemy: EnemyInstance): void {
    const shape = junkHulkShape(enemy.radius, enemy.seed);
    drawShape(
      this.ctx,
      sx,
      sy,
      shape,
      enemy.angle,
      "transparent",
      0,
      `${enemy.color}15`
    );
    drawShape(
      this.ctx,
      sx,
      sy,
      shape,
      enemy.angle,
      enemy.color,
      1.8,
      undefined,
      enemy.color
    );
    const cos = Math.cos(enemy.angle);
    const sin = Math.sin(enemy.angle);
    this.ctx.save();
    this.ctx.globalAlpha = 0.25;
    const h1x = -enemy.radius * 0.4 * cos + sx;
    const h1y = -enemy.radius * 0.4 * sin + sy;
    const h2x = enemy.radius * 0.3 * cos + sx;
    const h2y = enemy.radius * 0.3 * sin + sy;
    drawLine(this.ctx, h1x, h1y, h2x, h2y, enemy.color, 0.8);
    const perpCos = Math.cos(enemy.angle + Math.PI / 2);
    const perpSin = Math.sin(enemy.angle + Math.PI / 2);
    const v1x = sx - perpCos * enemy.radius * 0.3;
    const v1y = sy - perpSin * enemy.radius * 0.3;
    const v2x = sx + perpCos * enemy.radius * 0.3;
    const v2y = sy + perpSin * enemy.radius * 0.3;
    drawLine(this.ctx, v1x, v1y, v2x, v2y, enemy.color, 0.8);
    this.ctx.restore();
    if (Math.random() > 0.92) {
      const sparkX = sx + (Math.random() - 0.5) * enemy.radius * 0.8;
      const sparkY = sy + (Math.random() - 0.5) * enemy.radius * 0.8;
      drawCircle(
        this.ctx,
        sparkX,
        sparkY,
        1.5,
        "#ffcc00",
        1,
        "#ffcc0066",
        "#ffcc00"
      );
    }
  }

  private renderBoss(sx: number, sy: number, enemy: EnemyInstance): void {
    const shape = bossShape(enemy.radius, enemy.phase || 0);
    const time = Date.now() * 0.0022;
    const pulse = 0.4 + Math.sin(Date.now() * 0.004) * 0.22;

    // Outer hazard halo
    const haloGrad = this.ctx.createRadialGradient(
      sx,
      sy,
      enemy.radius * 0.3,
      sx,
      sy,
      enemy.radius * 1.9
    );
    haloGrad.addColorStop(0, `${enemy.color}20`);
    haloGrad.addColorStop(0.65, `${enemy.color}0f`);
    haloGrad.addColorStop(1, "transparent");
    this.ctx.save();
    this.ctx.fillStyle = haloGrad;
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, enemy.radius * 1.9, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    // Primary body
    drawShape(
      this.ctx,
      sx,
      sy,
      shape,
      enemy.angle,
      "transparent",
      0,
      `${enemy.color}22`
    );
    drawShape(
      this.ctx,
      sx,
      sy,
      shape,
      enemy.angle,
      enemy.color,
      2.4,
      undefined,
      enemy.color
    );

    // Rotating warning arcs
    this.ctx.save();
    this.ctx.globalAlpha = 0.38;
    this.ctx.strokeStyle = "#ffd6ea";
    this.ctx.lineWidth = 2.4;
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, enemy.radius * 1.08, time, time + Math.PI * 0.62);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(
      sx,
      sy,
      enemy.radius * 1.08,
      time + Math.PI,
      time + Math.PI + Math.PI * 0.62
    );
    this.ctx.stroke();
    this.ctx.restore();

    // Spoke spikes to break asteroid silhouette
    this.ctx.save();
    this.ctx.strokeStyle = `${enemy.color}cc`;
    this.ctx.lineWidth = 1.2;
    this.ctx.globalAlpha = 0.55;
    for (let i = 0; i < 10; i++) {
      const a = time * 0.8 + (i / 10) * Math.PI * 2;
      const ix = sx + Math.cos(a) * enemy.radius * 0.74;
      const iy = sy + Math.sin(a) * enemy.radius * 0.74;
      const ox = sx + Math.cos(a) * enemy.radius * 1.3;
      const oy = sy + Math.sin(a) * enemy.radius * 1.3;
      drawLine(this.ctx, ix, iy, ox, oy, `${enemy.color}cc`, 1.2);
    }
    this.ctx.restore();

    // Core reactor pulse
    const coreGrad = this.ctx.createRadialGradient(
      sx,
      sy,
      0,
      sx,
      sy,
      enemy.radius * 0.42
    );
    coreGrad.addColorStop(
      0,
      `${enemy.color}${Math.floor(pulse * 255)
        .toString(16)
        .padStart(2, "0")}`
    );
    coreGrad.addColorStop(0.7, `${enemy.color}44`);
    coreGrad.addColorStop(1, "transparent");
    this.ctx.save();
    this.ctx.fillStyle = coreGrad;
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, enemy.radius * 0.42, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    // Core ring
    this.ctx.save();
    this.ctx.globalAlpha = 0.42;
    this.ctx.strokeStyle = "#ffe4f1";
    this.ctx.lineWidth = 1.6;
    this.ctx.beginPath();
    this.ctx.arc(
      sx,
      sy,
      enemy.radius * 0.58,
      -time * 1.6,
      -time * 1.6 + Math.PI * 1.4
    );
    this.ctx.stroke();
    this.ctx.restore();

    this.drawHpBar(
      sx,
      sy - enemy.radius - 16,
      enemy.hp,
      enemy.maxHp,
      Math.max(90, enemy.radius * 1.9)
    );
  }

  renderBullets(
    bullets: { forEach: (fn: (b: BulletInstance) => void) => void },
    camera: Camera
  ): void {
    const FADE_FRAMES = 10;

    bullets.forEach((bullet) => {
      const wid = bullet.weaponId || "";
      // Gravity bullets rendered separately
      if (wid === "gravity") return;
      if (!camera.isVisible(bullet.x, bullet.y, 40)) return;

      const sx = camera.screenX(bullet.x);
      const sy = camera.screenY(bullet.y);

      const fadeThreshold = bullet.isLaser
        ? 0
        : Math.min(FADE_FRAMES, Math.floor(bullet.maxLife * 0.25));
      const fadeAlpha =
        fadeThreshold > 0 && bullet.life <= fadeThreshold
          ? Math.max(0.05, bullet.life / fadeThreshold)
          : 1;

      this.ctx.save();
      if (fadeAlpha < 1) this.ctx.globalAlpha = fadeAlpha;

      // ── EMP / Storm / Disintegrator / Chrono / Nova / Vortex / Freeze: expanding ring ──
      if (
        this.renderExpandingRing(bullet, sx, sy, wid) &&
        wid !== "relay_overclock"
      ) {
        this.ctx.restore();
        return;
      }

      // ── Laser / Beam types ──
      if (bullet.isLaser) {
        this.renderLaserBeam(bullet, sx, sy, camera, wid);
        this.ctx.restore();
        return;
      }

      // ── Enemy bullets ──
      if (bullet.isEnemy) {
        const trailLen = 4;
        const tx = sx - Math.cos(bullet.angle) * trailLen;
        const ty = sy - Math.sin(bullet.angle) * trailLen;
        drawLine(this.ctx, sx, sy, tx, ty, "#ff4444", 1.8, "#ff4444");
        drawCircle(this.ctx, sx, sy, 2.5, "#ff6666", 1, "#ff444488", "#ff4444");
        this.ctx.restore();
        return;
      }

      // ── Weapon-specific projectile rendering ──
      if (
        (wid === "lattice" || wid === "relay_overclock") &&
        bullet.prismBranches.length > 0
      ) {
        const phase =
          Date.now() * 0.006 + (bullet.executeThreshold || 0) * 0.19;
        const relayProgress =
          wid === "relay_overclock"
            ? Math.floor(bullet.executeThreshold || 0)
            : Infinity;
        const relayCount = bullet.prismBranches.length;
        const relaySeedCount =
          wid === "relay_overclock" ? Math.max(1, bullet.targetId || 1) : 0;
        const relayTransCount = Math.max(0, relayCount - relaySeedCount);
        const collapseWindow =
          wid === "relay_overclock"
            ? Math.max(2, bullet.relayCollapseFrames || 2)
            : 14;
        const collapseT =
          wid === "relay_overclock"
            ? Math.max(
                0,
                Math.min(1, (bullet.relayCollapseTick || 0) / collapseWindow)
              )
            : 0;
        const collapsedCount = Math.floor(collapseT * relayTransCount);
        for (let bi = 0; bi < bullet.prismBranches.length; bi++) {
          const br = bullet.prismBranches[bi];
          if (
            wid === "lattice" &&
            br.id !== undefined &&
            bullet.executeThreshold >= br.id
          )
            continue;
          if (wid === "relay_overclock" && bi >= relayProgress + 1) continue;
          if (wid === "relay_overclock" && bi < relaySeedCount) continue; // initial ring-covered enemies are seed nodes, not transmitted links
          if (wid === "relay_overclock" && bi < relaySeedCount + collapsedCount)
            continue;

          const bx = camera.screenX(br.x);
          const by = camera.screenY(br.y);
          let ax = sx;
          let ay = sy;
          if (wid === "relay_overclock") {
            if (
              br.id !== undefined &&
              br.id >= 0 &&
              br.id < bullet.prismBranches.length
            ) {
              const parent = bullet.prismBranches[br.id];
              ax = camera.screenX(parent.x);
              ay = camera.screenY(parent.y);
            } else {
              continue;
            }
          }

          const pulse =
            0.45 +
            0.35 *
              (0.5 +
                0.5 *
                  Math.sin(
                    phase + (wid === "relay_overclock" ? 0.8 + bi * 0.17 : 0)
                  ));
          const coreColor = wid === "relay_overclock" ? "#90f6ff" : "#7efff5";
          const isRelayFront =
            wid === "relay_overclock" && bi === relayProgress;
          if (wid === "relay_overclock") {
            // Curved relay arc for a softer, less rigid look.
            const dx = bx - ax;
            const dy = by - ay;
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            const bend =
              (2.8 + Math.min(7, len * 0.06)) *
              Math.sin(phase * 1.15 + bi * 0.63);
            const cx = (ax + bx) * 0.5 + nx * bend;
            const cy = (ay + by) * 0.5 + ny * bend;

            const fadeByCollapse = 1 - collapseT * 0.75;
            const haloAlpha =
              ((isRelayFront ? 0.11 : 0.07) +
                pulse * (isRelayFront ? 0.08 : 0.05)) *
              fadeByCollapse;
            const coreAlpha = (0.26 + pulse * 0.08) * fadeByCollapse;
            const outerW = isRelayFront ? 2.35 : 1.75;
            const innerW = isRelayFront ? 1.05 : 0.82;

            this.ctx.save();
            this.ctx.globalCompositeOperation = "lighter";
            this.ctx.strokeStyle = `rgba(144,246,255,${haloAlpha})`;
            this.ctx.lineWidth = outerW;
            this.ctx.shadowColor = coreColor;
            this.ctx.shadowBlur = isRelayFront ? 3.2 : 2;
            this.ctx.beginPath();
            this.ctx.moveTo(ax, ay);
            this.ctx.quadraticCurveTo(cx, cy, bx, by);
            this.ctx.stroke();

            this.ctx.strokeStyle = `rgba(235,255,255,${coreAlpha})`;
            this.ctx.lineWidth = innerW;
            this.ctx.shadowBlur = isRelayFront ? 1.5 : 1;
            this.ctx.beginPath();
            this.ctx.moveTo(ax, ay);
            this.ctx.quadraticCurveTo(cx, cy, bx, by);
            this.ctx.stroke();
            this.ctx.restore();
          } else {
            const halo = `rgba(126,255,245,${0.1 + pulse * 0.14})`;
            drawLine(this.ctx, ax, ay, bx, by, halo, 6, coreColor);
            drawLine(
              this.ctx,
              ax,
              ay,
              bx,
              by,
              `rgba(220,255,255,${0.45 + pulse * 0.24})`,
              2.2,
              coreColor
            );
            const t = (phase * 0.13 + bi * 0.11) % 1;
            const px = ax + (bx - ax) * t;
            const py = ay + (by - ay) * t;
            drawCircle(
              this.ctx,
              px,
              py,
              1.8,
              "#e9ffff",
              0.8,
              `${coreColor}aa`,
              coreColor
            );
          }
        }
      }
      if (wid === "harpoon") {
        // Draws the harpoon tether for both outbound and returning states so the hook always reads as connected to the ship.
        const ox = camera.screenX(bullet.originX);
        const oy = camera.screenY(bullet.originY);
        const c = this.ctx;
        const pulse = (Date.now() * 0.003) % 1;
        if (bullet.returning) {
          // Return: thick glowing cable under tension — hauling enemies back
          drawLine(c, ox, oy, sx, sy, "rgba(110,231,255,0.10)", 12, "#6ee7ff");
          drawLine(c, ox, oy, sx, sy, "rgba(110,231,255,0.32)", 4.5, "#6ee7ff");
          drawLine(c, ox, oy, sx, sy, "rgba(229,253,255,0.85)", 1.2);
          // Energy pulses racing back toward ship
          for (let i = 0; i < 4; i++) {
            const t = (pulse + i * 0.22) % 1;
            const px = ox + (sx - ox) * t;
            const py = oy + (sy - oy) * t;
            drawCircle(c, px, py, 2.5, "#eaffff", 0, "#6ee7ffaa");
          }
        } else {
          // Outbound: thin cable fed out from ship to hook tip
          drawLine(c, ox, oy, sx, sy, "rgba(110,231,255,0.06)", 7, "#6ee7ff");
          drawLine(c, ox, oy, sx, sy, "rgba(110,231,255,0.50)", 1.3, "#6ee7ff");
          // Single outward-travelling pulse
          const px = ox + (sx - ox) * pulse;
          const py = oy + (sy - oy) * pulse;
          drawCircle(c, px, py, 1.8, "#9df2ff", 0, "#6ee7ff66");
        }
      }
      this.renderProjectile(bullet, sx, sy, wid);

      this.ctx.restore();
    });
  }

  private renderExpandingRing(
    b: BulletInstance,
    sx: number,
    sy: number,
    wid: string
  ): boolean {
    const isRing =
      wid === "emp" ||
      wid === "nova" ||
      wid === "vortex" ||
      wid === "chrono" ||
      wid === "siege_burst" ||
      wid === "anchor" ||
      wid === "relay_overclock";
    if (!isRing) return false;

    const progress = 1 - b.life / b.maxLife;
    let currentRadius =
      b.novaMaxRadius > 0 ? b.novaRadius : b.aoe * Math.pow(progress, 0.6);
    if (wid === "relay_overclock") {
      currentRadius = b.aoe * Math.pow(progress, 1.25);
    }
    const ringAlpha = (1 - progress) * 0.7;
    const ringColor = b.color;

    this.ctx.save();

    // Color-specific rendering
    if (wid === "vortex") {
      // Spinning vortex arcs
      const time = Date.now() * 0.005;
      for (let arm = 0; arm < 3; arm++) {
        const baseAngle = time + arm * ((Math.PI * 2) / 3);
        this.ctx.globalAlpha = ringAlpha * 0.5;
        this.ctx.strokeStyle = "#e040fb";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for (let t = 0; t < 30; t++) {
          const frac = t / 30;
          const spiralAngle = baseAngle + frac * Math.PI * 1.5;
          const spiralR = currentRadius * frac;
          const px = sx + Math.cos(spiralAngle) * spiralR;
          const py = sy + Math.sin(spiralAngle) * spiralR;
          if (t === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        }
        this.ctx.stroke();
      }
    }

    if (wid === "chrono") {
      // Blue-tinted time distortion field
      this.ctx.globalAlpha = ringAlpha * 0.15;
      const grad = this.ctx.createRadialGradient(
        sx,
        sy,
        0,
        sx,
        sy,
        currentRadius
      );
      grad.addColorStop(0, "#448aff44");
      grad.addColorStop(0.7, "#448aff22");
      grad.addColorStop(1, "transparent");
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, currentRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    if (wid === "anchor") {
      const time = Date.now() * 0.0016;
      this.ctx.globalCompositeOperation = "lighter";

      // Core temporal fog
      this.ctx.globalAlpha = ringAlpha * 0.2;
      const grad = this.ctx.createRadialGradient(
        sx,
        sy,
        0,
        sx,
        sy,
        currentRadius
      );
      grad.addColorStop(0, "#d8e8ff66");
      grad.addColorStop(0.32, "#8fb8ff40");
      grad.addColorStop(0.78, "#5178e022");
      grad.addColorStop(1, "transparent");
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, currentRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // Rotating outer glyph ring
      this.ctx.save();
      this.ctx.translate(sx, sy);
      this.ctx.rotate(time);
      this.ctx.globalAlpha = ringAlpha * 0.72;
      this.ctx.strokeStyle = "#9dc0ff";
      this.ctx.lineWidth = Math.max(1.4, currentRadius * 0.015);
      this.ctx.beginPath();
      this.ctx.arc(0, 0, currentRadius * 0.86, 0, Math.PI * 2);
      this.ctx.stroke();

      const tickCount = 18;
      this.ctx.strokeStyle = "#dce9ff";
      this.ctx.lineWidth = 1;
      for (let i = 0; i < tickCount; i++) {
        const a = (i / tickCount) * Math.PI * 2;
        const inner = currentRadius * (i % 2 === 0 ? 0.72 : 0.77);
        const outer = currentRadius * 0.9;
        this.ctx.beginPath();
        this.ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        this.ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
        this.ctx.stroke();
      }
      this.ctx.restore();

      // Rewind pulse scanner
      const sweep = (time * 1.9) % (Math.PI * 2);
      this.ctx.globalAlpha = ringAlpha * 0.45;
      this.ctx.strokeStyle = "#e9f4ff";
      this.ctx.lineWidth = Math.max(2, currentRadius * 0.02);
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, currentRadius * 0.58, sweep - 0.34, sweep + 0.34);
      this.ctx.stroke();
    }

    if (wid === "relay_overclock") {
      this.ctx.globalCompositeOperation = "lighter";

      // Soft low-contrast haze (no flashing rotor)
      this.ctx.globalAlpha = ringAlpha * 0.14;
      const haze = this.ctx.createRadialGradient(
        sx,
        sy,
        currentRadius * 0.25,
        sx,
        sy,
        currentRadius
      );
      haze.addColorStop(0, "rgba(144,246,255,0.11)");
      haze.addColorStop(1, "transparent");
      this.ctx.fillStyle = haze;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, currentRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // Single subtle ring
      this.ctx.globalAlpha = ringAlpha * 0.6;
      this.ctx.strokeStyle = "rgba(144,246,255,0.62)";
      this.ctx.lineWidth = 1.35;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, currentRadius * 0.92, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.restore();
      return true;
    }

    if (wid === "siege_burst") {
      // White-hot compression core + cyan shock ring
      this.ctx.globalCompositeOperation = "lighter";
      this.ctx.globalAlpha = ringAlpha * 0.35;
      const core = this.ctx.createRadialGradient(
        sx,
        sy,
        0,
        sx,
        sy,
        currentRadius * 0.7
      );
      core.addColorStop(0, "#ffffffaa");
      core.addColorStop(0.35, "#ddf4ff66");
      core.addColorStop(1, "transparent");
      this.ctx.fillStyle = core;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, currentRadius * 0.7, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Glow rings (concentric layers)
    for (let ring = 3; ring >= 0; ring--) {
      const expand = ring * 3;
      const alpha = ringAlpha * (0.12 - ring * 0.025);
      if (alpha <= 0 || currentRadius + expand <= 0) continue;
      this.ctx.globalAlpha = alpha;
      this.ctx.strokeStyle = ringColor;
      this.ctx.lineWidth = 4 - ring;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, currentRadius + expand, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Main ring stroke
    this.ctx.globalAlpha = ringAlpha;
    this.ctx.strokeStyle = wid === "siege_burst" ? "#7fd8ff" : ringColor;
    this.ctx.lineWidth = 2.5 * (1 - progress * 0.6);
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, currentRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Inner fill gradient
    if (currentRadius > 0 && wid !== "chrono") {
      this.ctx.globalAlpha = ringAlpha * 0.25;
      const grad = this.ctx.createRadialGradient(
        sx,
        sy,
        0,
        sx,
        sy,
        currentRadius
      );
      grad.addColorStop(0, ringColor);
      grad.addColorStop(0.6, `${ringColor}44`);
      grad.addColorStop(1, "transparent");
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, currentRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
    return true;
  }

  private renderLaserBeam(
    b: BulletInstance,
    sx: number,
    sy: number,
    camera: Camera,
    wid: string
  ): void {
    const ex = camera.screenX(b.endX || b.x);
    const ey = camera.screenY(b.endY || b.y);
    const w = b.width || 2;

    // Frost beam: ice-blue with crystal shimmer
    if (wid === "frost") {
      drawLine(this.ctx, sx, sy, ex, ey, "#88eeff", w, "#88eeff");
      // Shimmer particles along beam
      this.ctx.save();
      this.ctx.globalCompositeOperation = "lighter";
      const dx = ex - sx,
        dy = ey - sy;
      const len = Math.sqrt(dx * dx + dy * dy);
      for (let i = 0; i < 5; i++) {
        const t = (Date.now() * 0.003 + i * 0.2) % 1;
        const px = sx + dx * t;
        const py = sy + dy * t;
        this.ctx.globalAlpha = 0.5;
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(px - 1, py - 1, 2, 2);
      }
      this.ctx.restore();
      return;
    }

    // Beam cannon: thick white-hot
    if (wid === "beam") {
      drawLine(this.ctx, sx, sy, ex, ey, "#fafafa22", w + 6, "#fafafa");
      drawLine(this.ctx, sx, sy, ex, ey, "#fafafa", w, "#fafafa");
      drawLine(this.ctx, sx, sy, ex, ey, "#ffffff", Math.max(1, w * 0.3));
      return;
    }

    // Prism beam: rainbow gradient
    if (wid === "prism") {
      const prismColors = [
        "#ff3a3a",
        "#ff7f24",
        "#ffee00",
        "#39ff7f",
        "#00e5ff",
        "#4f6bff",
        "#b44aff",
      ];
      const dx = ex - sx,
        dy = ey - sy;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const grad = this.ctx.createLinearGradient(sx, sy, ex, ey);
        for (let i = 0; i < prismColors.length; i++) {
          grad.addColorStop(i / (prismColors.length - 1), prismColors[i]);
        }
        this.ctx.save();
        this.ctx.strokeStyle = grad;
        this.ctx.lineWidth = w;
        this.ctx.shadowColor = "#ff6bef";
        this.ctx.shadowBlur = 6;
        this.ctx.beginPath();
        this.ctx.moveTo(sx, sy);
        this.ctx.lineTo(ex, ey);
        this.ctx.stroke();
        this.ctx.restore();
      }

      // Refracted branches from lock point
      if (b.prismBranches.length > 0) {
        for (let i = 0; i < b.prismBranches.length; i++) {
          const br = b.prismBranches[i];
          const bx = camera.screenX(br.x);
          const by = camera.screenY(br.y);
          const c = br.color || prismColors[i % prismColors.length];
          drawLine(
            this.ctx,
            ex,
            ey,
            bx,
            by,
            `${c}44`,
            Math.max(1, w * 0.85),
            c
          );
          drawLine(this.ctx, ex, ey, bx, by, c, Math.max(1, w * 0.5), c);
        }
      }
      return;
    }

    if (wid === "harpoon_tether") {
      drawLine(this.ctx, sx, sy, ex, ey, "#6ee7ff44", w + 1, "#6ee7ff");
      return;
    }

    // Default laser/lightning/synergy beams
    drawLine(this.ctx, sx, sy, ex, ey, b.color, w, b.color);
  }

  private renderProjectile(
    b: BulletInstance,
    sx: number,
    sy: number,
    wid: string
  ): void {
    // Ricochet: spinning disc
    if (wid === "ricochet") {
      const time = (Date.now() % 10000) * 0.01;
      this.ctx.save();
      this.ctx.translate(sx, sy);
      this.ctx.rotate(time);
      this.ctx.strokeStyle = "#b8c6db";
      this.ctx.lineWidth = 1.5;
      this.ctx.shadowColor = "#b8c6db";
      this.ctx.shadowBlur = 4;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
      this.ctx.stroke();
      // Cross lines
      this.ctx.beginPath();
      this.ctx.moveTo(-3, 0);
      this.ctx.lineTo(3, 0);
      this.ctx.moveTo(0, -3);
      this.ctx.lineTo(0, 3);
      this.ctx.stroke();
      this.ctx.restore();
      return;
    }

    // Boomerang: thick curved V-shape boomerang with self-spin
    if (wid === "boomerang") {
      const spin = (Date.now() % 10000) * 0.02; // ~3.2 rotations/sec
      const c = this.ctx;
      c.save();
      c.translate(sx, sy);
      c.rotate(spin);

      c.globalCompositeOperation = "lighter";
      c.shadowColor = "#39ff7f";
      c.shadowBlur = 12;

      // ── Thick curved-V boomerang ──
      // Two wide arms meeting at ~110° angle at the elbow (top center)
      // Each arm tapers from thick elbow to pointed tip
      c.beginPath();
      // Start at right arm tip (outer edge)
      c.moveTo(10, 3);
      // Right arm outer edge → curves up to elbow
      c.bezierCurveTo(7, -1, 4, -5, 0, -6);
      // Elbow → left arm outer edge curves down to left tip
      c.bezierCurveTo(-4, -5, -7, -1, -10, 3);
      // Left tip → round the tip end
      c.quadraticCurveTo(-9.5, 5, -8, 4);
      // Left arm inner edge → back to elbow inside
      c.bezierCurveTo(-5, 1, -2.5, -1.5, 0, -2);
      // Elbow inside → right arm inner edge
      c.bezierCurveTo(2.5, -1.5, 5, 1, 8, 4);
      // Round right tip end
      c.quadraticCurveTo(9.5, 5, 10, 3);
      c.closePath();

      // Fill: translucent neon green
      c.fillStyle = "rgba(57,255,127,0.22)";
      c.fill();

      // Outer stroke
      c.strokeStyle = "#39ff7f";
      c.lineWidth = 1.4;
      c.stroke();

      // ── Spine highlight along the center of each arm ──
      c.shadowBlur = 0;
      c.globalAlpha = 0.65;
      c.beginPath();
      c.moveTo(9, 3.5);
      c.bezierCurveTo(6, 0, 3, -3, 0, -4);
      c.bezierCurveTo(-3, -3, -6, 0, -9, 3.5);
      c.strokeStyle = "#aaffcc";
      c.lineWidth = 0.9;
      c.stroke();

      // ── Tip accents ──
      c.globalAlpha = 0.9;
      c.fillStyle = "#ddffe8";
      c.beginPath();
      c.arc(9.5, 3.5, 1.3, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.arc(-9.5, 3.5, 1.3, 0, Math.PI * 2);
      c.fill();

      c.restore();
      return;
    }

    // ── Twin Stingers (Viper starter): slim twin neon needles ──
    if (wid === "stinger") {
      const c = this.ctx;
      c.save();
      c.translate(sx, sy);
      c.rotate(b.angle);
      c.globalCompositeOperation = "lighter";
      c.shadowColor = "#00e5ff";
      c.shadowBlur = 8;

      // Needle body: elongated diamond, sharp tip forward
      c.beginPath();
      c.moveTo(10, 0); // front tip
      c.lineTo(2, -1.5); // top shoulder
      c.lineTo(-5, 0); // tail
      c.lineTo(2, 1.5); // bottom shoulder
      c.closePath();
      c.fillStyle = "#00e5ff";
      c.fill();

      // Bright white-hot tip
      c.beginPath();
      c.arc(9, 0, 1.1, 0, Math.PI * 2);
      c.fillStyle = "#ffffff";
      c.shadowBlur = 4;
      c.fill();

      // Trailing energy streak
      c.globalAlpha = 0.45;
      c.shadowBlur = 0;
      c.beginPath();
      c.moveTo(-5, 0);
      c.lineTo(-13, 0);
      c.strokeStyle = "#00e5ff";
      c.lineWidth = 0.9;
      c.stroke();

      c.restore();
      return;
    }

    // ── Frag Shell (Mantis starter): compact incendiary bolt ──
    if (wid === "frag") {
      const c = this.ctx;
      c.save();
      c.translate(sx, sy);
      c.rotate(b.angle);
      c.globalCompositeOperation = "lighter";

      // Adds a bright halo so the projectile stays visible against dense combat effects.
      c.shadowColor = "#ff6b2c";
      c.shadowBlur = 9;

      // Draws the compact bolt silhouette that defines the projectile body.
      c.beginPath();
      c.moveTo(5, 0); // nose tip
      c.lineTo(1.5, -1.8); // top shoulder
      c.lineTo(-2, -1.5); // top tail
      c.lineTo(-2, 1.5); // bottom tail
      c.lineTo(1.5, 1.8); // bottom shoulder
      c.closePath();
      c.fillStyle = "#ff7a38";
      c.fill();

      // Adds a hotter core highlight inside the bolt to suggest heat and energy concentration.
      c.shadowBlur = 10;
      c.beginPath();
      c.arc(1.5, 0, 1.4, 0, Math.PI * 2);
      c.fillStyle = "#ffcc66";
      c.fill();

      // Trailing streak
      c.globalAlpha = 0.4;
      c.shadowBlur = 0;
      c.beginPath();
      c.moveTo(-2, 0);
      c.lineTo(-9, 0);
      c.strokeStyle = "#ff6b2c";
      c.lineWidth = 1.2;
      c.stroke();

      c.restore();
      return;
    }

    // ── Shrapnel Corona fusion: stinger shard + frag ember hybrid ──
    if (wid === "shrapnel_corona") {
      const c = this.ctx;
      const ember =
        b.color.toLowerCase().includes("ff9") ||
        b.color.toLowerCase().includes("ffc") ||
        b.color.toLowerCase().includes("ff8");
      const main = ember ? "#ff9a4a" : "#71ecff";
      const edge = ember ? "#ffd29c" : "#b6f9ff";
      const trail = ember ? "rgba(255,146,76,0.42)" : "rgba(113,236,255,0.38)";
      const travelAngle =
        Math.abs(b.vx) > 0.001 || Math.abs(b.vy) > 0.001
          ? Math.atan2(b.vy, b.vx)
          : b.angle;

      c.save();
      c.translate(sx, sy);
      c.rotate(travelAngle);
      c.globalCompositeOperation = "lighter";

      // Outer bloom
      c.shadowColor = main;
      c.shadowBlur = ember ? 12 : 10;

      // Spear shard body
      c.beginPath();
      c.moveTo(8, 0);
      c.lineTo(1.8, -2.2);
      c.lineTo(-3.5, -1.5);
      c.lineTo(-6, 0);
      c.lineTo(-3.5, 1.5);
      c.lineTo(1.8, 2.2);
      c.closePath();
      c.fillStyle = ember ? "rgba(255,150,78,0.82)" : "rgba(113,236,255,0.85)";
      c.fill();

      // Facet edge
      c.strokeStyle = edge;
      c.lineWidth = 1.05;
      c.stroke();

      // Hot core bead
      c.shadowBlur = 8;
      c.beginPath();
      c.arc(1.5, 0, ember ? 1.35 : 1.2, 0, Math.PI * 2);
      c.fillStyle = ember ? "#fff2d7" : "#ebffff";
      c.fill();

      // Ionized wake
      c.shadowBlur = 0;
      c.globalAlpha = 0.52;
      c.beginPath();
      c.moveTo(-6, 0);
      c.lineTo(-13, 0);
      c.strokeStyle = trail;
      c.lineWidth = 1.3;
      c.stroke();

      c.restore();
      return;
    }

    // ── Impact Warhead (Titan starter): heavy slug with visible blast charge ──
    if (wid === "siege") {
      const t = (Date.now() % 2000) / 2000;
      const c = this.ctx;
      c.save();
      c.translate(sx, sy);
      c.rotate(b.angle);
      c.globalCompositeOperation = "lighter";

      // Wider glow than normal bullets — signals heavier caliber
      c.shadowColor = "#4fc3f7";
      c.shadowBlur = 14;

      // Slug body: 9px long, 2.5px half-width — slightly wider than default
      c.beginPath();
      c.moveTo(7, 0); // sharp nose
      c.lineTo(3, -2.5); // top shoulder
      c.lineTo(-2, -2.2); // top body
      c.lineTo(-3, 0); // blunt tail
      c.lineTo(-2, 2.2); // bottom body
      c.lineTo(3, 2.5); // bottom shoulder
      c.closePath();
      c.fillStyle = "rgba(79,195,247,0.35)";
      c.fill();
      c.strokeStyle = "#4fc3f7";
      c.lineWidth = 1.1;
      c.stroke();

      // Blue-white hot core
      c.shadowBlur = 12;
      c.beginPath();
      c.arc(1.5, 0, 1.6, 0, Math.PI * 2);
      c.fillStyle = "#ddf4ff";
      c.fill();

      // Bright nose tip
      c.shadowBlur = 6;
      c.beginPath();
      c.arc(6.5, 0, 0.9, 0, Math.PI * 2);
      c.fillStyle = "#ffffff";
      c.fill();

      // Long energized trail — heavier than normal bullets
      c.shadowBlur = 0;
      c.globalAlpha = 0.5;
      c.beginPath();
      c.moveTo(-3, 0);
      c.lineTo(-13, 0);
      c.strokeStyle = "#4fc3f7";
      c.lineWidth = 1.6;
      c.stroke();

      // One faint pulsing ellipse ring in the wake
      const phase = t;
      c.globalAlpha = (1 - phase) * 0.3;
      c.beginPath();
      c.ellipse(
        -6 - phase * 8,
        0,
        (1 + phase * 2) * 0.5,
        1 + phase * 2,
        0,
        0,
        Math.PI * 2
      );
      c.strokeStyle = "#4fc3f7";
      c.lineWidth = 0.7;
      c.stroke();

      c.restore();
      return;
    }

    // Flame: fiery particles
    if (wid === "flame") {
      const size = 2 + Math.random() * 2;
      const lifeRatio = b.life / b.maxLife;
      this.ctx.save();
      this.ctx.globalCompositeOperation = "lighter";
      this.ctx.globalAlpha = lifeRatio;
      // Gradient from yellow-white to red-orange
      const r = 255;
      const g = Math.floor(100 + lifeRatio * 155);
      const bVal = Math.floor(lifeRatio * 40);
      this.ctx.fillStyle = `rgb(${r},${g},${bVal})`;
      this.ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
      this.ctx.restore();
      return;
    }

    // Missile
    if (wid === "missile") {
      const len = 6;
      const tx = sx - Math.cos(b.angle) * len;
      const ty = sy - Math.sin(b.angle) * len;
      drawLine(this.ctx, sx, sy, tx, ty, "#39ff7f", 2.5, "#39ff7f");
      return;
    }

    // Temporal Anchor core glyph (dropped field origin)
    if (wid === "anchor") {
      const c = this.ctx;
      const spin = Date.now() * 0.006;
      c.save();
      c.translate(sx, sy);
      c.globalCompositeOperation = "lighter";
      c.shadowColor = "#d6e7ff";
      c.shadowBlur = 16;
      c.fillStyle = "rgba(190,220,255,0.35)";
      c.beginPath();
      c.arc(0, 0, 6, 0, Math.PI * 2);
      c.fill();
      c.rotate(spin);
      c.strokeStyle = "rgba(199,224,255,0.9)";
      c.lineWidth = 1.15;
      c.beginPath();
      c.arc(0, 0, 11, 0, Math.PI * 2);
      c.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        c.beginPath();
        c.moveTo(Math.cos(a) * 7.5, Math.sin(a) * 7.5);
        c.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
        c.stroke();
      }
      c.restore();
      return;
    }

    if (wid === "harpoon") {
      const c = this.ctx;
      const isRet = b.returning;
      c.save();
      c.translate(sx, sy);
      c.rotate(b.angle);
      c.globalCompositeOperation = "lighter";

      // Aura glow on return (hook is "hot" when dragging enemies)
      if (isRet) {
        const aura = c.createRadialGradient(0, 0, 0, 0, 0, 15);
        aura.addColorStop(0, "rgba(200,248,255,0.40)");
        aura.addColorStop(1, "transparent");
        c.globalAlpha = 1;
        c.fillStyle = aura;
        c.beginPath();
        c.arc(0, 0, 15, 0, Math.PI * 2);
        c.fill();
      }

      c.shadowColor = isRet ? "#eaffff" : "#6ee7ff";
      c.shadowBlur = isRet ? 20 : 10;
      c.globalAlpha = isRet ? 0.98 : 0.88;

      // Rear energy wake (larger and brighter when returning)
      const wakeLen = isRet ? 20 : 13;
      c.beginPath();
      c.moveTo(-5, 0);
      c.lineTo(-wakeLen, -2.8);
      c.lineTo(-wakeLen, 2.8);
      c.closePath();
      c.fillStyle = isRet ? "rgba(170,232,255,0.45)" : "rgba(110,231,255,0.22)";
      c.fill();

      // Main barrel body — streamlined spear silhouette
      c.beginPath();
      c.moveTo(12, 0); // tip
      c.lineTo(5, -3.2); // upper shoulder
      c.lineTo(-1.5, -2.5); // upper body
      c.lineTo(-5.5, 0); // tail
      c.lineTo(-1.5, 2.5); // lower body
      c.lineTo(5, 3.2); // lower shoulder
      c.closePath();
      c.fillStyle = isRet ? "#f2feff" : "#9df2ff";
      c.fill();
      c.strokeStyle = isRet ? "#d2fbff" : "#6ee7ff";
      c.lineWidth = 1.2;
      c.stroke();

      // Curved grappling barbs — curling back from the forward section
      c.strokeStyle = isRet ? "#ffffff" : "#c2f4ff";
      c.lineWidth = 1.4;
      c.lineCap = "round";
      // Upper barb
      c.beginPath();
      c.moveTo(8, -1.8);
      c.quadraticCurveTo(11.5, -5.5, 6.5, -8.5);
      c.stroke();
      // Lower barb
      c.beginPath();
      c.moveTo(8, 1.8);
      c.quadraticCurveTo(11.5, 5.5, 6.5, 8.5);
      c.stroke();

      // Sharp tip accent — high-contrast needle point
      c.strokeStyle = isRet ? "#ffffff" : "#e8fbff";
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(9.5, -0.6);
      c.lineTo(12, 0);
      c.lineTo(9.5, 0.6);
      c.stroke();

      c.restore();
      return;
    }

    if (wid === "lattice") {
      const c = this.ctx;
      const t = Date.now() * 0.0055 + (b.executeThreshold || 0) * 0.21;
      const pulse = 0.65 + 0.35 * Math.sin(t);
      c.save();
      c.translate(sx, sy);
      c.rotate(t * 0.45);
      c.globalCompositeOperation = "lighter";

      // Outer induction ring
      c.strokeStyle = `rgba(126,255,245,${0.38 + pulse * 0.22})`;
      c.lineWidth = 1.6;
      c.beginPath();
      c.arc(0, 0, 6.6, 0, Math.PI * 2);
      c.stroke();

      // Arc blades
      c.strokeStyle = "rgba(212,255,252,0.9)";
      c.lineWidth = 1.1;
      c.beginPath();
      c.arc(0, 0, 5.1, 0.15, 1.3);
      c.stroke();
      c.beginPath();
      c.arc(0, 0, 5.1, Math.PI + 0.15, Math.PI + 1.3);
      c.stroke();

      // Core
      c.fillStyle = "rgba(194,255,248,0.9)";
      c.shadowColor = "#7efff5";
      c.shadowBlur = 10;
      c.beginPath();
      c.arc(0, 0, 2.6, 0, Math.PI * 2);
      c.fill();
      c.restore();
      return;
    }

    if (wid === "rebound") {
      const t = Date.now() * 0.012;
      this.ctx.save();
      this.ctx.translate(sx, sy);
      this.ctx.rotate(t);
      this.ctx.globalCompositeOperation = "lighter";
      this.ctx.shadowColor = b.color;
      this.ctx.shadowBlur = 12;
      this.ctx.beginPath();
      this.ctx.moveTo(0, -4);
      this.ctx.lineTo(4, 0);
      this.ctx.lineTo(0, 4);
      this.ctx.lineTo(-4, 0);
      this.ctx.closePath();
      this.ctx.fillStyle = b.color;
      this.ctx.fill();
      this.ctx.restore();
      return;
    }

    if (wid === "rebound_orb") {
      const t = Date.now() * 0.0028;
      const pulse = 0.94 + Math.sin(Date.now() * 0.009) * 0.06;
      const rr = Math.max(24, b.aoe * 0.9);
      const ringWidth = Math.max(2, rr * 0.045);
      const levelGlow = Math.max(0, Math.min(1, (b.aoe - 52) / 36));
      const c = this.ctx;
      c.save();
      c.globalCompositeOperation = "lighter";

      // Controlled halo: visible, but not overbright.
      const haze = c.createRadialGradient(sx, sy, rr * 0.72, sx, sy, rr * 1.2);
      haze.addColorStop(0, "transparent");
      haze.addColorStop(0.45, `rgba(255,214,122,${0.06 + levelGlow * 0.14})`);
      haze.addColorStop(1, "transparent");
      c.fillStyle = haze;
      c.beginPath();
      c.arc(sx, sy, rr * 1.2, 0, Math.PI * 2);
      c.fill();

      // Main ring
      c.strokeStyle = `rgba(255,228,150,${0.32 + levelGlow * 0.34})`;
      c.lineWidth = ringWidth * pulse;
      c.shadowColor = "#ffd67a";
      c.shadowBlur = 2 + levelGlow * 7;
      c.beginPath();
      c.arc(sx, sy, rr, 0, Math.PI * 2);
      c.stroke();

      // Outer guide ring
      c.strokeStyle = `rgba(255,248,220,${0.22 + levelGlow * 0.2})`;
      c.lineWidth = 1;
      c.shadowBlur = 2;
      c.beginPath();
      c.arc(
        sx,
        sy,
        rr + ringWidth * 0.58 + Math.sin(t * 2.1) * 1.6,
        0,
        Math.PI * 2
      );
      c.stroke();

      // Inner guide ring
      c.strokeStyle = `rgba(255,199,108,${0.16 + levelGlow * 0.2})`;
      c.lineWidth = 0.75;
      c.beginPath();
      c.arc(sx, sy, rr - ringWidth * 0.66, 0, Math.PI * 2);
      c.stroke();

      // Subtle rotating cuts
      for (let i = 0; i < 4; i++) {
        c.strokeStyle = `rgba(255,255,240,${0.14 + levelGlow * 0.14})`;
        c.lineWidth = 0.65;
        c.shadowColor = "#ffd67a";
        c.shadowBlur = 1;
        const a0 = t * (i % 2 === 0 ? 1 : -1.2) + i * Math.PI * 0.5;
        c.beginPath();
        c.arc(sx, sy, rr, a0, a0 + Math.PI * 0.3);
        c.stroke();
      }
      c.restore();
      return;
    }

    if (wid === "relay_overclock") {
      // Relay Overclock projectile itself is invisible; only relay arcs and field ring are shown.
      return;
    }

    // Prism split sub-beams: rainbow orbs
    if (wid === "prism_split") {
      drawCircle(this.ctx, sx, sy, 3, b.color, 1.5, `${b.color}44`, b.color);
      return;
    }

    // ── Fission Pulse: radioactive chain-reaction orb ──
    if (wid === "pulse") {
      const t = (Date.now() % 3600) * 0.001; // 0-3.6, ~1 full rotation/3.6s
      const c = this.ctx;
      c.save();
      c.translate(sx, sy);
      c.globalCompositeOperation = "lighter";

      const canSplit = (b.splitCount || 0) > 0;
      const coreR = canSplit ? 3.8 : 2.4;

      // Outer radioactive haze
      c.globalAlpha = 0.22;
      const haze = c.createRadialGradient(0, 0, 0, 0, 0, coreR * 3.2);
      haze.addColorStop(0, "#b4ff00");
      haze.addColorStop(0.5, "#88cc0055");
      haze.addColorStop(1, "transparent");
      c.fillStyle = haze;
      c.beginPath();
      c.arc(0, 0, coreR * 3.2, 0, Math.PI * 2);
      c.fill();

      // Core sphere — white-hot center to radioactive green rim
      c.globalAlpha = 1;
      c.shadowColor = "#b4ff00";
      c.shadowBlur = canSplit ? 14 : 7;
      const coreGrad = c.createRadialGradient(0, 0, 0, 0, 0, coreR);
      coreGrad.addColorStop(0, "#ffffff");
      coreGrad.addColorStop(0.45, "#ddff55");
      coreGrad.addColorStop(0.85, "#88cc00");
      coreGrad.addColorStop(1, "#44880044");
      c.fillStyle = coreGrad;
      c.beginPath();
      c.arc(0, 0, coreR, 0, Math.PI * 2);
      c.fill();

      // Spinning orbital rings (only if can still split — shows chain potential)
      if (canSplit) {
        c.shadowBlur = 3;
        for (let ring = 0; ring < 2; ring++) {
          const spinDir = ring === 0 ? 1 : -1.4;
          const orbitAngle = t * Math.PI * 2 * spinDir + ring * (Math.PI * 0.5);
          c.save();
          c.rotate(orbitAngle);
          c.scale(1, 0.26); // flatten to ellipse
          c.strokeStyle = "#b4ff00";
          c.lineWidth = 0.75;
          c.globalAlpha = 0.55;
          c.beginPath();
          c.arc(0, 0, coreR * 1.8, 0, Math.PI * 2);
          c.stroke();
          c.restore();
        }
        // Small electron dot on the orbit
        const dotAngle = t * Math.PI * 2;
        c.globalAlpha = 0.9;
        c.shadowBlur = 5;
        c.fillStyle = "#eeffaa";
        c.beginPath();
        c.arc(
          Math.cos(dotAngle) * coreR * 1.8,
          Math.sin(dotAngle) * coreR * 0.47,
          1.1,
          0,
          Math.PI * 2
        );
        c.fill();
      }

      // Energy wake trail (backward along travel direction)
      const trailX = -Math.cos(b.angle) * (coreR + 5);
      const trailY = -Math.sin(b.angle) * (coreR + 5);
      c.globalAlpha = 0.45;
      c.shadowBlur = 4;
      c.beginPath();
      c.moveTo(
        -Math.cos(b.angle) * coreR * 0.5,
        -Math.sin(b.angle) * coreR * 0.5
      );
      c.lineTo(trailX, trailY);
      c.strokeStyle = "#88ff00";
      c.lineWidth = 1.1;
      c.stroke();

      c.restore();
      return;
    }

    // Default player bullet: elongated glow trail
    const len = 6;
    const tx = sx - Math.cos(b.angle) * len;
    const ty = sy - Math.sin(b.angle) * len;
    drawLine(this.ctx, sx, sy, tx, ty, b.color, 2.5, b.color);
  }

  renderPickups(
    pickups: { forEach: (fn: (p: PickupInstance) => void) => void },
    camera: Camera
  ): void {
    pickups.forEach((pickup) => {
      if (!camera.isVisible(pickup.x, pickup.y, 20)) return;

      const sx = camera.screenX(pickup.x);
      const sy = camera.screenY(pickup.y);
      const pulse = 0.8 + Math.sin(Date.now() * 0.006 + pickup.x) * 0.2;

      if (pickup.kind === "xp") {
        drawCircle(
          this.ctx,
          sx,
          sy,
          4 * pulse,
          "#39ff7f",
          1.5,
          "#39ff7f33",
          "#39ff7f"
        );
      } else if (pickup.kind === "hp") {
        drawCircle(
          this.ctx,
          sx,
          sy,
          5 * pulse,
          "#ff3a8c",
          1.5,
          "#ff3a8c33",
          "#ff3a8c"
        );
      } else {
        drawCircle(
          this.ctx,
          sx,
          sy,
          4 * pulse,
          "#ffcc00",
          1.5,
          "#ffcc0033",
          "#ffcc00"
        );
      }
    });
  }

  renderParticles(particles: Particle[]): void {
    for (const p of particles) {
      if (!p.active) continue;
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      if (p.additive) {
        this.ctx.globalCompositeOperation = "lighter";
      }
      this.ctx.fillRect(
        p.screenX - p.size / 2,
        p.screenY - p.size / 2,
        p.size,
        p.size
      );
      this.ctx.restore();
    }
  }

  renderEffects(width: number, height: number): void {
    this.effects.update();
    this.effects.render(this.ctx, width, height);
  }

  renderGravityWells(
    wells: {
      x: number;
      y: number;
      radius: number;
      life: number;
      maxLife: number;
      traveling: boolean;
      weaponId?: string;
    }[],
    camera: Camera
  ): void {
    const time = Date.now() * 0.003;
    for (const w of wells) {
      if (!camera.isVisible(w.x, w.y, w.radius + 20)) continue;
      const sx = camera.screenX(w.x);
      const sy = camera.screenY(w.y);
      const fadeIn = Math.min(1, (w.maxLife - w.life) / 15);
      const fadeOut = Math.min(1, w.life / (w.maxLife * 0.2));
      const alpha = Math.min(fadeIn, fadeOut) * 0.65;
      const pulse = 0.85 + Math.sin(time * 2.5) * 0.15;

      const baseColor = "#b44aff";
      const accentColor = "#d88aff";
      const armCount = 4;

      this.ctx.save();

      // Outer pull field gradient
      this.ctx.globalAlpha = alpha * 0.6;
      const outerGrad = this.ctx.createRadialGradient(
        sx,
        sy,
        w.radius * 0.15,
        sx,
        sy,
        w.radius
      );
      outerGrad.addColorStop(0, "#1a0033cc");
      outerGrad.addColorStop(0.3, "#2d0066aa");
      outerGrad.addColorStop(0.6, `${baseColor}22`);
      outerGrad.addColorStop(1, "transparent");
      this.ctx.fillStyle = outerGrad;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, w.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Spiral arms
      this.ctx.globalCompositeOperation = "lighter";
      for (let arm = 0; arm < armCount; arm++) {
        const baseAngle = time * 2.2 + arm * ((Math.PI * 2) / armCount);
        this.ctx.globalAlpha = alpha * 0.3 * pulse;
        this.ctx.strokeStyle = arm % 2 === 0 ? accentColor : baseColor;
        this.ctx.lineWidth = 1.8;
        this.ctx.beginPath();
        for (let t = 0; t < 40; t++) {
          const frac = t / 40;
          const spiralAngle = baseAngle + frac * Math.PI * 1.8;
          const spiralR = w.radius * (0.1 + frac * 0.85);
          const px = sx + Math.cos(spiralAngle) * spiralR;
          const py = sy + Math.sin(spiralAngle) * spiralR;
          if (t === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        }
        this.ctx.stroke();
      }

      // Swirling rings
      for (let ring = 0; ring < 3; ring++) {
        const ringRadius = w.radius * (0.25 + ring * 0.22);
        const ringAlpha = (0.45 - ring * 0.12) * alpha * pulse;
        this.ctx.globalAlpha = ringAlpha;
        this.ctx.strokeStyle = ring === 0 ? "#e8b4ff" : baseColor;
        this.ctx.lineWidth = 1.8 - ring * 0.4;
        this.ctx.beginPath();
        const rotOffset =
          time * (2 - ring * 0.4) * (ring % 2 === 0 ? 1 : -1) + ring * 1.5;
        const arcLen = Math.PI * (1 + ring * 0.3);
        this.ctx.arc(sx, sy, ringRadius, rotOffset, rotOffset + arcLen);
        this.ctx.stroke();
      }

      // Event horizon — dark center void
      this.ctx.globalCompositeOperation = "source-over";
      this.ctx.globalAlpha = alpha * 0.8;
      const coreVoid = this.ctx.createRadialGradient(
        sx,
        sy,
        0,
        sx,
        sy,
        w.radius * 0.18
      );
      coreVoid.addColorStop(0, "#06080dee");
      coreVoid.addColorStop(0.5, "#0a0015aa");
      coreVoid.addColorStop(1, "transparent");
      this.ctx.fillStyle = coreVoid;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, w.radius * 0.18, 0, Math.PI * 2);
      this.ctx.fill();

      // Accretion ring
      this.ctx.globalCompositeOperation = "lighter";
      this.ctx.globalAlpha = alpha * 0.7 * pulse;
      this.ctx.strokeStyle = "#e8b4ff";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, w.radius * 0.18, 0, Math.PI * 2);
      this.ctx.stroke();

      // Core glow point
      this.ctx.globalAlpha = alpha * 0.5 * pulse;
      const coreGlow = this.ctx.createRadialGradient(
        sx,
        sy,
        0,
        sx,
        sy,
        w.radius * 0.12
      );
      coreGlow.addColorStop(0, "#ffffff");
      coreGlow.addColorStop(0.3, "#e8b4ff");
      coreGlow.addColorStop(1, "transparent");
      this.ctx.fillStyle = coreGlow;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, w.radius * 0.12, 0, Math.PI * 2);
      this.ctx.fill();

      // Traveling indicator
      if (w.traveling) {
        this.ctx.globalAlpha = alpha * 0.4;
        const trailGrad = this.ctx.createRadialGradient(
          sx,
          sy,
          w.radius * 0.3,
          sx,
          sy,
          w.radius * 0.8
        );
        trailGrad.addColorStop(0, `${baseColor}55`);
        trailGrad.addColorStop(1, "transparent");
        this.ctx.fillStyle = trailGrad;
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, w.radius * 0.8, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  private drawHpBar(
    x: number,
    y: number,
    hp: number,
    maxHp: number,
    width: number
  ): void {
    const h = 4;
    const ratio = Math.max(0, hp / maxHp);
    this.ctx.fillStyle = "rgba(255,255,255,0.1)";
    this.ctx.fillRect(x - width / 2, y, width, h);
    this.ctx.fillStyle =
      ratio > 0.5 ? "#39ff7f" : ratio > 0.25 ? "#ffcc00" : "#ff3a8c";
    this.ctx.fillRect(x - width / 2, y, width * ratio, h);
  }
}

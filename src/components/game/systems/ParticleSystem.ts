// Manages pooled particles for combat feedback, pickups, and environmental effects.
import { POOL_PARTICLES } from "@/lib/game/balance";
import { Camera } from "../engine/Camera";

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  alphaDecay: number;
  sizeDecay: number;
  additive: boolean;
  screenX: number;
  screenY: number;
}

export class ParticleSystem {
  particles: Particle[];
  private nextFree = 0;

  constructor() {
    this.particles = new Array(POOL_PARTICLES);
    for (let i = 0; i < POOL_PARTICLES; i++) {
      this.particles[i] = {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0,
        size: 1,
        color: "#fff",
        alpha: 1,
        alphaDecay: 0.02,
        sizeDecay: 0,
        additive: true,
        screenX: 0,
        screenY: 0,
      };
    }
  }

  emit(
    x: number,
    y: number,
    count: number,
    color: string,
    opts?: {
      speedMin?: number;
      speedMax?: number;
      sizeMin?: number;
      sizeMax?: number;
      life?: number;
      additive?: boolean;
      angleMin?: number;
      angleMax?: number;
    }
  ): void {
    const speedMin = opts?.speedMin ?? 0.5;
    const speedMax = opts?.speedMax ?? 3;
    const sizeMin = opts?.sizeMin ?? 1;
    const sizeMax = opts?.sizeMax ?? 3;
    const life = opts?.life ?? 30;
    const additive = opts?.additive ?? true;
    const angleMin = opts?.angleMin ?? 0;
    const angleMax = opts?.angleMax ?? Math.PI * 2;

    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) break;

      const angle = angleMin + Math.random() * (angleMax - angleMin);
      const speed = speedMin + Math.random() * (speedMax - speedMin);

      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = life;
      p.maxLife = life;
      p.size = sizeMin + Math.random() * (sizeMax - sizeMin);
      p.color = color;
      p.alpha = 1;
      p.alphaDecay = 1 / life;
      p.sizeDecay = 0;
      p.additive = additive;
    }
  }

  /** Emits a radial burst used for compact explosions and impact effects. */
  explode(
    x: number,
    y: number,
    color: string,
    count: number = 20,
    speed: number = 4
  ): void {
    this.emit(x, y, count, color, {
      speedMin: speed * 0.3,
      speedMax: speed,
      sizeMin: 1,
      sizeMax: 4,
      life: 25,
    });
  }

  /** Emits a narrow directional exhaust stream that stays aligned with thrust. */
  thrust(x: number, y: number, angle: number, color: string, speed = 1): void {
    const intensity = Math.min(1, speed / 2);
    const count = Math.max(1, Math.round(2 + intensity * 3));
    this.emit(x, y, count, color, {
      speedMin: 1.5 + intensity,
      speedMax: 3.5 + intensity * 2,
      sizeMin: 1,
      sizeMax: 1.8 + intensity * 0.5,
      life: Math.floor(16 + intensity * 10),
      angleMin: angle - 0.06,
      angleMax: angle + 0.06,
    });
    // Adds occasional brighter sparks without breaking the directional exhaust shape.
    if (Math.random() < intensity * 0.3) {
      this.emit(x, y, 1, "#ffffff", {
        speedMin: 2.5,
        speedMax: 4.5,
        sizeMin: 1,
        sizeMax: 1.5,
        life: 10,
        angleMin: angle - 0.04,
        angleMax: angle + 0.04,
      });
    }
  }

  /** Emits a small sparkle burst when XP is collected. */
  sparkle(x: number, y: number, color: string): void {
    this.emit(x, y, 5, color, {
      speedMin: 0.5,
      speedMax: 2,
      sizeMin: 1,
      sizeMax: 2,
      life: 15,
    });
  }

  /** Emits a celebratory burst when the player levels up. */
  levelUp(x: number, y: number): void {
    this.emit(x, y, 40, "#39ff7f", {
      speedMin: 2,
      speedMax: 6,
      sizeMin: 2,
      sizeMax: 4,
      life: 40,
    });
    this.emit(x, y, 20, "#ffcc00", {
      speedMin: 1,
      speedMax: 4,
      sizeMin: 1,
      sizeMax: 3,
      life: 30,
    });
  }

  /** Emits icy shards for frost-themed impacts. */
  frostImpact(x: number, y: number): void {
    this.emit(x, y, 8, "#88eeff", {
      speedMin: 1,
      speedMax: 3,
      sizeMin: 1,
      sizeMax: 2,
      life: 15,
    });
    this.emit(x, y, 4, "#ffffff", {
      speedMin: 0.5,
      speedMax: 1.5,
      sizeMin: 1,
      sizeMax: 1.5,
      life: 10,
    });
  }

  /** Emits warm sparks for fire-themed impacts and detonations. */
  fireBurst(x: number, y: number): void {
    this.emit(x, y, 6, "#ff5722", {
      speedMin: 1,
      speedMax: 4,
      sizeMin: 1,
      sizeMax: 3,
      life: 12,
    });
    this.emit(x, y, 3, "#ffcc00", {
      speedMin: 0.5,
      speedMax: 2,
      sizeMin: 1,
      sizeMax: 2,
      life: 8,
    });
  }

  /** Emits sharp electric sparks for lightning-themed hits. */
  lightningStrike(x: number, y: number): void {
    this.emit(x, y, 6, "#00e5ff", {
      speedMin: 2,
      speedMax: 5,
      sizeMin: 1,
      sizeMax: 2,
      life: 8,
    });
  }

  /** Emits purple wisps for void or dark-energy effects. */
  voidImpact(x: number, y: number): void {
    this.emit(x, y, 10, "#7b1fa2", {
      speedMin: 1,
      speedMax: 3,
      sizeMin: 1.5,
      sizeMax: 3,
      life: 20,
    });
    this.emit(x, y, 5, "#e1bee7", {
      speedMin: 0.5,
      speedMax: 1.5,
      sizeMin: 1,
      sizeMax: 2,
      life: 15,
    });
  }

  /** Emits red motes for disintegration-style kills or hits. */
  disintegrate(x: number, y: number): void {
    this.emit(x, y, 15, "#d50000", {
      speedMin: 2,
      speedMax: 6,
      sizeMin: 1,
      sizeMax: 3,
      life: 20,
    });
    this.emit(x, y, 8, "#ff8a80", {
      speedMin: 1,
      speedMax: 3,
      sizeMin: 1,
      sizeMax: 2,
      life: 15,
    });
  }

  /** Emits a multicolor burst for prism-themed effects. */
  prismBurst(x: number, y: number): void {
    const colors = [
      "#ff3a3a",
      "#ff8800",
      "#ffee00",
      "#39ff7f",
      "#00e5ff",
      "#b44aff",
      "#ff3a8c",
    ];
    for (const color of colors) {
      this.emit(x, y, 3, color, {
        speedMin: 2,
        speedMax: 5,
        sizeMin: 1,
        sizeMax: 2.5,
        life: 18,
      });
    }
  }

  /** Emits a larger red burst for mine detonations. */
  mineExplosion(x: number, y: number): void {
    this.emit(x, y, 30, "#ff4444", {
      speedMin: 3,
      speedMax: 8,
      sizeMin: 2,
      sizeMax: 5,
      life: 25,
    });
    this.emit(x, y, 15, "#ffcc00", {
      speedMin: 2,
      speedMax: 5,
      sizeMin: 1,
      sizeMax: 3,
      life: 18,
    });
  }

  /** Emits a blue ripple burst for time-based abilities. */
  chronoPulse(x: number, y: number): void {
    this.emit(x, y, 12, "#448aff", {
      speedMin: 1,
      speedMax: 3,
      sizeMin: 1,
      sizeMax: 2,
      life: 25,
    });
  }

  update(camera: Camera): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life--;
      p.alpha -= p.alphaDecay;
      p.size -= p.sizeDecay;

      if (p.life <= 0 || p.alpha <= 0 || p.size <= 0) {
        p.active = false;
        continue;
      }

      // Converts world-space particles into screen coordinates before rendering.
      p.screenX = camera.screenX(p.x);
      p.screenY = camera.screenY(p.y);
    }
  }

  private acquire(): Particle | null {
    for (let i = this.nextFree; i < this.particles.length; i++) {
      if (!this.particles[i].active) {
        this.particles[i].active = true;
        this.nextFree = i + 1;
        return this.particles[i];
      }
    }
    for (let i = 0; i < this.nextFree; i++) {
      if (!this.particles[i].active) {
        this.particles[i].active = true;
        this.nextFree = i + 1;
        return this.particles[i];
      }
    }
    return null;
  }

  reset(): void {
    for (const p of this.particles) p.active = false;
    this.nextFree = 0;
  }
}

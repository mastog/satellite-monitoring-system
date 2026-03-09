// Runs the fixed-timestep update loop and interpolation-based render loop for gameplay.
import { TICK_MS } from "@/lib/game/balance";

export type UpdateFn = (dt: number) => void;
export type RenderFn = (alpha: number) => void;

export class GameLoop {
  private running = false;
  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private updateFn: UpdateFn;
  private renderFn: RenderFn;

  // Tracks rolling frame statistics so the game can expose current FPS.
  fps = 0;
  private frameCount = 0;
  private fpsTimer = 0;

  constructor(update: UpdateFn, render: RenderFn) {
    this.updateFn = update;
    this.renderFn = render;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.frameCount = 0;
    this.fpsTimer = 0;
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  get isRunning(): boolean {
    return this.running;
  }

  private loop = (now: number): void => {
    if (!this.running) return;

    let delta = now - this.lastTime;
    this.lastTime = now;

    // Caps large frame gaps so the simulation does not spend too long catching up after inactivity.
    if (delta > 200) delta = 200;

    this.accumulator += delta;

    // Accumulates frame timing into a once-per-second FPS measurement.
    this.fpsTimer += delta;
    this.frameCount++;
    if (this.fpsTimer >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer -= 1000;
    }

    // Advances simulation in fixed-size steps until the accumulated lag is consumed.
    while (this.accumulator >= TICK_MS) {
      this.updateFn(TICK_MS);
      this.accumulator -= TICK_MS;
    }

    // Renders once per animation frame using the remaining fractional step as interpolation alpha.
    const alpha = this.accumulator / TICK_MS;
    this.renderFn(alpha);

    this.rafId = requestAnimationFrame(this.loop);
  };
}

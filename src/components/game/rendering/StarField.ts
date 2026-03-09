// Renders a cached procedural starfield with multiple parallax layers behind gameplay.
import { Camera } from "../engine/Camera";
import { PRNG } from "../engine/PRNG";

interface StarLayer {
  parallax: number;
  density: number; // Controls how many stars are generated inside each cached cell.
  cellSize: number;
  minBright: number;
  maxBright: number;
  minSize: number;
  maxSize: number;
}

const LAYERS: StarLayer[] = [
  {
    parallax: 0.05,
    density: 3,
    cellSize: 256,
    minBright: 0.15,
    maxBright: 0.3,
    minSize: 0.5,
    maxSize: 1,
  },
  {
    parallax: 0.15,
    density: 2,
    cellSize: 256,
    minBright: 0.25,
    maxBright: 0.5,
    minSize: 0.8,
    maxSize: 1.5,
  },
  {
    parallax: 0.3,
    density: 1,
    cellSize: 256,
    minBright: 0.4,
    maxBright: 0.75,
    minSize: 1,
    maxSize: 2,
  },
];

export class StarField {
  private cache: Map<
    string,
    { x: number; y: number; brightness: number; size: number }[]
  > = new Map();

  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    for (const layer of LAYERS) {
      this.renderLayer(ctx, camera, layer);
    }
  }

  private renderLayer(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    layer: StarLayer
  ): void {
    const ox = camera.x * layer.parallax;
    const oy = camera.y * layer.parallax;

    const startCX = Math.floor((ox - camera.width / 2) / layer.cellSize) - 1;
    const endCX = Math.ceil((ox + camera.width / 2) / layer.cellSize) + 1;
    const startCY = Math.floor((oy - camera.height / 2) / layer.cellSize) - 1;
    const endCY = Math.ceil((oy + camera.height / 2) / layer.cellSize) + 1;

    for (let cx = startCX; cx <= endCX; cx++) {
      for (let cy = startCY; cy <= endCY; cy++) {
        const stars = this.getCellStars(cx, cy, layer);
        for (const star of stars) {
          const sx = star.x - ox + camera.width / 2;
          const sy = star.y - oy + camera.height / 2;

          if (
            sx < -10 ||
            sx > camera.width + 10 ||
            sy < -10 ||
            sy > camera.height + 10
          )
            continue;

          ctx.globalAlpha = star.brightness;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(
            sx - star.size / 2,
            sy - star.size / 2,
            star.size,
            star.size
          );
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  private getCellStars(cx: number, cy: number, layer: StarLayer) {
    const key = `${layer.parallax}:${cx}:${cy}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const prng = new PRNG(
      (cx * 73856093) ^ (cy * 19349669) ^ Math.floor(layer.parallax * 1000)
    );
    const stars: { x: number; y: number; brightness: number; size: number }[] =
      [];

    for (let i = 0; i < layer.density; i++) {
      stars.push({
        x: cx * layer.cellSize + prng.next() * layer.cellSize,
        y: cy * layer.cellSize + prng.next() * layer.cellSize,
        brightness: prng.range(layer.minBright, layer.maxBright),
        size: prng.range(layer.minSize, layer.maxSize),
      });
    }

    this.cache.set(key, stars);
    // Trims old cached cells so the star cache does not grow without bound during long runs.
    if (this.cache.size > 2000) {
      const iter = this.cache.keys();
      for (let i = 0; i < 500; i++) {
        const k = iter.next().value;
        if (k) this.cache.delete(k);
      }
    }

    return stars;
  }
}

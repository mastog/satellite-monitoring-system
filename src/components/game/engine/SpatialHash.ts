// Buckets circular entities into grid cells so nearby-collision queries stay efficient.
import { HASH_CELL_SIZE } from "@/lib/game/balance";

export interface Bounded {
  x: number;
  y: number;
  radius: number;
}

function key(cx: number, cy: number): number {
  // Converts signed cell coordinates into a stable numeric key for the backing map.
  const a = cx >= 0 ? cx * 2 : -cx * 2 - 1;
  const b = cy >= 0 ? cy * 2 : -cy * 2 - 1;
  return ((a + b) * (a + b + 1)) / 2 + b;
}

export class SpatialHash {
  private cellSize: number;
  private grid: Map<number, Bounded[]>;

  constructor(cellSize: number = HASH_CELL_SIZE) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  clear(): void {
    this.grid.clear();
  }

  insert(entity: Bounded): void {
    const minCX = Math.floor((entity.x - entity.radius) / this.cellSize);
    const maxCX = Math.floor((entity.x + entity.radius) / this.cellSize);
    const minCY = Math.floor((entity.y - entity.radius) / this.cellSize);
    const maxCY = Math.floor((entity.y + entity.radius) / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const k = key(cx, cy);
        let cell = this.grid.get(k);
        if (!cell) {
          cell = [];
          this.grid.set(k, cell);
        }
        cell.push(entity);
      }
    }
  }

  /** Returns all entities whose bounds overlap the query circle centered at `(x, y)`. */
  query(x: number, y: number, radius: number): Bounded[] {
    const results: Bounded[] = [];
    const seen = new Set<Bounded>();

    const minCX = Math.floor((x - radius) / this.cellSize);
    const maxCX = Math.floor((x + radius) / this.cellSize);
    const minCY = Math.floor((y - radius) / this.cellSize);
    const maxCY = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const k = key(cx, cy);
        const cell = this.grid.get(k);
        if (!cell) continue;
        for (const entity of cell) {
          if (seen.has(entity)) continue;
          seen.add(entity);
          const dx = entity.x - x;
          const dy = entity.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius + entity.radius) {
            results.push(entity);
          }
        }
      }
    }
    return results;
  }
}

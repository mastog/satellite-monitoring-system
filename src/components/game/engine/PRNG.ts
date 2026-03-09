// Wraps the Mulberry32 generator in a small utility class so the game can use
// deterministic randomness for repeatable waves, drops, and effects.
export class PRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  /** Returns the next pseudo-random float in the half-open range [0, 1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns a pseudo-random float in the half-open range [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Returns a pseudo-random integer in the closed range [min, max]. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** Returns a pseudo-random element from the supplied array. */
  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  /** Returns true when the sampled value falls below the supplied probability. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Returns a pseudo-random angle expressed in radians. */
  angle(): number {
    return this.next() * Math.PI * 2;
  }
}

// Holds the shared generator instance used by systems that rely on a global
// deterministic random source.
let globalPRNG = new PRNG(Date.now());

// Replaces the shared generator with a new seeded instance so a run can be
// replayed with deterministic randomness.
export function resetGlobalPRNG(seed: number) {
  globalPRNG = new PRNG(seed);
}

// Exposes the shared generator used by game systems that need deterministic randomness.
export function rng(): PRNG {
  return globalPRNG;
}

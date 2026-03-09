// Reuses preallocated objects so the game loop can avoid repeated allocations and garbage-collection spikes.
export class ObjectPool<T extends { active: boolean }> {
  private items: T[];
  private firstFree: number;

  constructor(factory: (index: number) => T, capacity: number) {
    this.items = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.items[i] = factory(i);
      this.items[i].active = false;
    }
    this.firstFree = 0;
  }

  /** Acquire a pooled object, returns null if pool exhausted */
  acquire(): T | null {
    // Starts from the last known free slot so acquisition usually finds an available object quickly.
    for (let i = this.firstFree; i < this.items.length; i++) {
      if (!this.items[i].active) {
        this.items[i].active = true;
        this.firstFree = i + 1;
        return this.items[i];
      }
    }
    // Wraps back to the beginning when the free slot lies before the cached search hint.
    for (let i = 0; i < this.firstFree; i++) {
      if (!this.items[i].active) {
        this.items[i].active = true;
        this.firstFree = i + 1;
        return this.items[i];
      }
    }
    return null;
  }

  /** Release object back to pool */
  release(item: T): void {
    item.active = false;
    const idx = this.items.indexOf(item);
    if (idx >= 0 && idx < this.firstFree) {
      this.firstFree = idx;
    }
  }

  /** Iterate over all active items */
  forEach(fn: (item: T, index: number) => void): void {
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].active) {
        fn(this.items[i], i);
      }
    }
  }

  /** Count active items */
  get activeCount(): number {
    let count = 0;
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].active) count++;
    }
    return count;
  }

  /** Release all items */
  releaseAll(): void {
    for (let i = 0; i < this.items.length; i++) {
      this.items[i].active = false;
    }
    this.firstFree = 0;
  }
}

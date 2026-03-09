// Defines collectible pickup state and movement for XP, health, and debris items.

export type PickupKind = "xp" | "hp" | "debris";

export interface PickupInstance {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: PickupKind;
  value: number;
  life: number; // Stores how many frames remain before the pickup despawns.
  magnetized: boolean;
}

export function createPickupTemplate(): PickupInstance {
  return {
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    kind: "xp",
    value: 1,
    life: 600, // Keeps the pickup alive for roughly ten seconds before despawn.
    magnetized: false,
  };
}

export function initPickup(
  p: PickupInstance,
  x: number,
  y: number,
  kind: PickupKind,
  value: number
): void {
  p.active = true;
  p.x = x;
  p.y = y;
  // Gives the newly spawned pickup a short outward scatter so drops do not stack perfectly.
  p.vx = (Math.random() - 0.5) * 3;
  p.vy = (Math.random() - 0.5) * 3;
  p.kind = kind;
  p.value = value;
  p.life = 600;
  p.magnetized = false;
}

export function updatePickup(
  p: PickupInstance,
  playerX: number,
  playerY: number,
  pickupRadius: number
): boolean {
  if (!p.active) return false;

  // Dampens the initial scatter velocity over time.
  p.vx *= 0.92;
  p.vy *= 0.92;

  // Pulls the pickup toward the player once it enters the pickup attraction radius.
  const dx = playerX - p.x;
  const dy = playerY - p.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < pickupRadius) {
    p.magnetized = true;
  }

  if (p.magnetized && dist > 4) {
    const pullSpeed = 6;
    p.vx = (dx / dist) * pullSpeed;
    p.vy = (dy / dist) * pullSpeed;
  }

  p.x += p.vx;
  p.y += p.vy;

  // Returns true once the pickup overlaps the player and should be consumed.
  if (dist < 16) {
    p.active = false;
    return true; // Signals that the pickup was collected this frame.
  }

  p.life--;
  if (p.life <= 0) {
    p.active = false;
  }
  return false;
}

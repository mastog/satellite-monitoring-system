// Defines runtime enemy state together with movement, damage, and special-effect updates.
import type { EnemyType } from "@/lib/game/enemies";

let nextEnemyId = 0;
export function resetEnemyIds() {
  nextEnemyId = 0;
}

export interface EnemyInstance {
  active: boolean;
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  damage: number;
  xpValue: number;
  color: string;
  seed: number;
  stunFrames: number;
  shotCooldown: number;
  phase?: number; // Stores the current boss phase when this enemy represents a phased encounter.
  splits?: EnemyType;
  splitCount?: number;
  projectile?: boolean;
  projectileCooldown?: number;
  // Stores the rewind and delayed-detonation state used by the Temporal Anchor effect.
  trail: { x: number; y: number }[];
  temporalRewindFrames: number;
  temporalPathCursor: number;
  temporalPathTarget: number;
  temporalPathStride: number;
  temporalBubbleFrames: number;
  temporalExplosionDamage: number;
  temporalExplosionRadius: number;
}

export function createEnemyTemplate(): EnemyInstance {
  return {
    active: false,
    id: 0,
    type: "micro_debris",
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    hp: 1,
    maxHp: 1,
    speed: 1,
    radius: 8,
    damage: 5,
    xpValue: 1,
    color: "#888",
    seed: 0,
    stunFrames: 0,
    shotCooldown: 0,
    trail: [],
    temporalRewindFrames: 0,
    temporalPathCursor: 0,
    temporalPathTarget: 0,
    temporalPathStride: 1,
    temporalBubbleFrames: 0,
    temporalExplosionDamage: 0,
    temporalExplosionRadius: 0,
  };
}

export function initEnemy(
  e: EnemyInstance,
  type: EnemyType,
  x: number,
  y: number,
  hp: number,
  speed: number,
  radius: number,
  damage: number,
  xpValue: number,
  color: string,
  opts?: {
    splits?: EnemyType;
    splitCount?: number;
    projectile?: boolean;
    projectileCooldown?: number;
    phase?: number;
    trail?: { x: number; y: number }[];
  }
): void {
  e.active = true;
  e.id = nextEnemyId++;
  e.type = type;
  e.x = x;
  e.y = y;
  e.vx = 0;
  e.vy = 0;
  e.angle = Math.random() * Math.PI * 2;
  e.hp = hp;
  e.maxHp = hp;
  e.speed = speed;
  e.radius = radius;
  e.damage = damage;
  e.xpValue = xpValue;
  e.color = color;
  e.seed = (nextEnemyId * 73856093) | 0;
  e.stunFrames = 0;
  e.shotCooldown = 0;
  e.splits = opts?.splits;
  e.splitCount = opts?.splitCount;
  e.projectile = opts?.projectile;
  e.projectileCooldown = opts?.projectileCooldown;
  e.phase = opts?.phase;
  e.trail = [{ x, y }];
  e.temporalRewindFrames = 0;
  e.temporalPathCursor = 0;
  e.temporalPathTarget = 0;
  e.temporalPathStride = 1;
  e.temporalBubbleFrames = 0;
  e.temporalExplosionDamage = 0;
  e.temporalExplosionRadius = 0;
}

export function updateEnemy(
  e: EnemyInstance,
  playerX: number,
  playerY: number
): void {
  if (!e.active) return;

  // Rewinds the enemy along its recorded trail while the temporal effect is active.
  if (e.temporalRewindFrames > 0) {
    const idx = Math.max(
      0,
      Math.min(e.trail.length - 1, Math.floor(e.temporalPathCursor))
    );
    const pos = e.trail[idx];
    if (pos) {
      e.x = pos.x;
      e.y = pos.y;
    }
    e.temporalPathCursor = Math.max(
      e.temporalPathTarget,
      e.temporalPathCursor - e.temporalPathStride
    );
    e.temporalRewindFrames--;
    if (e.shotCooldown > 0) e.shotCooldown--;
    return;
  }

  // Ticks down any active stun timer before normal movement resumes.
  if (e.stunFrames > 0) {
    e.stunFrames--;
    if (e.shotCooldown > 0) e.shotCooldown--;
    recordTrail(e);
    return;
  }

  // Advances the enemy according to its movement pattern relative to the player.
  const dx = playerX - e.x;
  const dy = playerY - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > 0) {
    if (e.type === "solar_flare") {
      // Keeps solar flares moving along the direction chosen when they were spawned.
      e.x += e.vx;
      e.y += e.vy;
    } else if (e.type === "meteor_swarm") {
      // Moves fixed-direction hazards at their configured speed.
      e.x += e.vx;
      e.y += e.vy;
    } else {
      // Uses player-homing movement for standard enemies.
      e.vx = (dx / dist) * e.speed;
      e.vy = (dy / dist) * e.speed;
      e.x += e.vx;
      e.y += e.vy;
    }
    e.angle = Math.atan2(dy, dx);
  }

  // Counts down the firing cooldown for projectile-capable enemies.
  if (e.shotCooldown > 0) e.shotCooldown--;
  recordTrail(e);
}

export function damageEnemy(e: EnemyInstance, damage: number): boolean {
  e.hp -= damage;
  if (e.hp <= 0) {
    e.active = false;
    return true; // Signals that the enemy died from this damage application.
  }
  return false;
}

export function shouldShoot(e: EnemyInstance): boolean {
  if (!e.projectile || e.stunFrames > 0) return false;
  if (e.shotCooldown <= 0) {
    e.shotCooldown = e.projectileCooldown || 90;
    return true;
  }
  return false;
}

function recordTrail(e: EnemyInstance): void {
  e.trail.push({ x: e.x, y: e.y });
  const MAX_TRAIL = 160; // ~2.6s at 60fps
  if (e.trail.length > MAX_TRAIL) {
    e.trail.shift();
  }
}

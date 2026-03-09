// ── Bullet / Projectile Entity ────────────────────────────────────────

export interface BulletInstance {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  damage: number;
  speed: number;
  life: number; // frames remaining
  maxLife: number;
  pierce: number; // hits remaining
  color: string;
  isEnemy: boolean; // enemy bullet?
  isLaser: boolean;
  width?: number; // laser width
  endX?: number; // laser end
  endY?: number;
  weaponId?: string;
  targetId?: number; // laser: locked enemy ID
  aoe: number; // splash radius
  homing: number; // homing strength (0 = none)
  hitIds: Set<number>; // enemy IDs already hit (for pierce)
  collisionDelay: number; // frames before this bullet can deal collision damage

  // Extended properties for new weapons
  bounces: number; // ricochet: remaining bounces
  returning: boolean; // boomerang: currently returning
  originX: number; // boomerang: origin X
  originY: number; // boomerang: origin Y
  slowAmount: number; // frost/chrono: slow factor (0-1)
  stunDuration: number; // emp/chrono: stun frames on hit
  executeThreshold: number;
  splitCount: number; // prism: sub-beam count on first hit
  prismBranches: { x: number; y: number; color: string; id?: number }[]; // branch beam endpoints
  relayTargetIds: number[]; // relay_overclock: enemy id per branch index
  relayStepSize: number; // relay_overclock: number of nodes processed per propagation tick
  relayWaitFrames: number; // relay_overclock: wait frames after each propagation tick
  relayCollapseFrames: number; // relay_overclock: tail collapse duration
  relayCollapseTick: number; // relay_overclock: elapsed collapse frames
  novaRadius: number; // nova/vortex/chrono: current expanding radius
  novaMaxRadius: number; // target radius for expanding ring
  returnEaseFrames: number; // boomerang/harpoon: reverse easing countdown
  returnEaseTotal: number; // boomerang/harpoon: reverse easing duration
  returnEaseBaseAngle: number; // boomerang/harpoon: outbound angle used for sign-flip easing
}

export function createBulletTemplate(): BulletInstance {
  return {
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    damage: 0,
    speed: 0,
    life: 0,
    maxLife: 60,
    pierce: 1,
    color: "#00e5ff",
    isEnemy: false,
    isLaser: false,
    aoe: 0,
    homing: 0,
    hitIds: new Set(),
    collisionDelay: 0,
    bounces: 0,
    returning: false,
    originX: 0,
    originY: 0,
    targetId: undefined,
    slowAmount: 0,
    stunDuration: 0,
    executeThreshold: 0,
    splitCount: 0,
    prismBranches: [],
    relayTargetIds: [],
    relayStepSize: 1,
    relayWaitFrames: 0,
    relayCollapseFrames: 2,
    relayCollapseTick: 0,
    novaRadius: 0,
    novaMaxRadius: 0,
    returnEaseFrames: 0,
    returnEaseTotal: 0,
    returnEaseBaseAngle: 0,
  };
}

export function initBullet(
  b: BulletInstance,
  x: number,
  y: number,
  angle: number,
  speed: number,
  damage: number,
  life: number,
  color: string,
  opts?: Partial<
    Pick<
      BulletInstance,
      | "pierce"
      | "isEnemy"
      | "isLaser"
      | "width"
      | "aoe"
      | "homing"
      | "weaponId"
      | "bounces"
      | "returning"
      | "originX"
      | "originY"
      | "slowAmount"
      | "stunDuration"
      | "executeThreshold"
      | "splitCount"
      | "novaRadius"
      | "novaMaxRadius"
      | "targetId"
      | "collisionDelay"
      | "returnEaseFrames"
      | "returnEaseTotal"
      | "returnEaseBaseAngle"
    >
  >
): void {
  b.active = true;
  b.x = x;
  b.y = y;
  b.angle = angle;
  b.speed = speed;
  b.vx = Math.cos(angle) * speed;
  b.vy = Math.sin(angle) * speed;
  b.damage = damage;
  b.life = life;
  b.maxLife = life;
  b.pierce = opts?.pierce ?? 1;
  b.color = color;
  b.isEnemy = opts?.isEnemy ?? false;
  b.isLaser = opts?.isLaser ?? false;
  b.width = opts?.width;
  b.aoe = opts?.aoe ?? 0;
  b.homing = opts?.homing ?? 0;
  b.weaponId = opts?.weaponId;
  b.hitIds.clear();
  b.bounces = opts?.bounces ?? 0;
  b.returning = opts?.returning ?? false;
  b.originX = opts?.originX ?? x;
  b.originY = opts?.originY ?? y;
  b.slowAmount = opts?.slowAmount ?? 0;
  b.stunDuration = opts?.stunDuration ?? 0;
  b.executeThreshold = opts?.executeThreshold ?? 0;
  b.splitCount = opts?.splitCount ?? 0;
  b.prismBranches = [];
  b.relayTargetIds = [];
  b.relayStepSize = 1;
  b.relayWaitFrames = 0;
  b.relayCollapseFrames = 2;
  b.relayCollapseTick = 0;
  b.novaRadius = opts?.novaRadius ?? 0;
  b.novaMaxRadius = opts?.novaMaxRadius ?? 0;
  b.targetId = opts?.targetId;
  b.collisionDelay = opts?.collisionDelay ?? 0;
  b.returnEaseFrames = opts?.returnEaseFrames ?? 0;
  b.returnEaseTotal = opts?.returnEaseTotal ?? 0;
  b.returnEaseBaseAngle = opts?.returnEaseBaseAngle ?? angle;
}

export function updateBullet(b: BulletInstance): void {
  if (!b.active) return;
  if (b.collisionDelay > 0) b.collisionDelay--;

  // Gravity well deceleration: homing field stores remaining travel frames
  if (b.weaponId === "gravity" && b.speed > 0) {
    if (b.homing > 0) {
      b.homing--;
      // Decelerate in the last 30% of travel
      const decelZone = 0.3;
      const origTravel = b.maxLife - (b.life - b.homing); // approximate
      if (b.homing < origTravel * decelZone) {
        const decelFactor = Math.max(0.02, b.homing / (origTravel * decelZone));
        b.vx = Math.cos(b.angle) * b.speed * decelFactor;
        b.vy = Math.sin(b.angle) * b.speed * decelFactor;
      }
    } else {
      // Travel phase ended — stop moving
      b.vx = 0;
      b.vy = 0;
    }
  }

  // Temporal anchor deceleration: travel first, then lock in place
  if (b.weaponId === "anchor" && b.speed > 0) {
    if (b.homing > 0) {
      b.homing--;
      // Anchor field should not bloom until the spike stabilizes.
      b.novaRadius = 0;
      if (b.homing < 14) {
        const decel = Math.max(0.05, b.homing / 14);
        b.vx = Math.cos(b.angle) * b.speed * decel;
        b.vy = Math.sin(b.angle) * b.speed * decel;
      }
    } else {
      b.vx = 0;
      b.vy = 0;
      // Quickly open field once anchor locks in place.
      if (b.novaMaxRadius > 0 && b.novaRadius < b.novaMaxRadius) {
        const deploySpeed = Math.max(6, b.novaMaxRadius / 10);
        b.novaRadius = Math.min(b.novaMaxRadius, b.novaRadius + deploySpeed);
      }
    }
  }

  // Boomerang: straight line out, then straight line homing back
  if (b.weaponId === "boomerang") {
    if (!b.returning) {
      // Outward phase: fly straight (don't touch angle/velocity)
      if (b.life <= b.maxLife * 0.5) {
        b.returning = true;
        b.returnEaseTotal = 16;
        b.returnEaseFrames = b.returnEaseTotal;
        b.returnEaseBaseAngle = b.angle;
      }
    } else {
      // Return phase: home directly toward player position
      const dx = b.originX - b.x;
      const dy = b.originY - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 15) {
        b.active = false; // caught
        return;
      }
      if (b.returnEaseFrames > 0 && b.returnEaseTotal > 0) {
        const t = 1 - b.returnEaseFrames / b.returnEaseTotal;
        // Signed cosine profile: +full -> 0 -> -full, along the same ballistic axis.
        const signedSpeed = b.speed * Math.cos(Math.PI * t);
        b.vx = Math.cos(b.returnEaseBaseAngle) * signedSpeed;
        b.vy = Math.sin(b.returnEaseBaseAngle) * signedSpeed;
        b.angle = Math.atan2(b.vy, b.vx);
        b.returnEaseFrames--;
      } else {
        const targetAngle = Math.atan2(dy, dx);
        b.angle = targetAngle;
        b.vx = Math.cos(b.angle) * b.speed * 1.3;
        b.vy = Math.sin(b.angle) * b.speed * 1.3;
      }
    }
  }

  // Void Harpoon: fixed outbound travel, then hard return to owner origin.
  if (b.weaponId === "harpoon") {
    if (!b.returning) {
      if (b.homing > 0) {
        b.homing--;
      } else {
        b.returning = true;
        b.returnEaseTotal = 18;
        b.returnEaseFrames = b.returnEaseTotal;
        b.returnEaseBaseAngle = b.angle;
        // Return-phase damage is periodic DoT; avoid a burst on the exact transition frame.
        b.collisionDelay = Math.max(b.collisionDelay, 5);
      }
    } else {
      const dx = b.originX - b.x;
      const dy = b.originY - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 18) {
        b.active = false;
        return;
      }
      if (b.returnEaseFrames > 0 && b.returnEaseTotal > 0) {
        const t = 1 - b.returnEaseFrames / b.returnEaseTotal;
        // Signed cosine profile: +full -> 0 -> -full, along the same ballistic axis.
        const signedSpeed = b.speed * Math.cos(Math.PI * t);
        b.vx = Math.cos(b.returnEaseBaseAngle) * signedSpeed;
        b.vy = Math.sin(b.returnEaseBaseAngle) * signedSpeed;
        b.angle = Math.atan2(b.vy, b.vx);
        b.returnEaseFrames--;
      } else {
        const targetAngle = Math.atan2(dy, dx);
        b.angle = targetAngle;
        b.vx = Math.cos(b.angle) * b.speed * 1.25;
        b.vy = Math.sin(b.angle) * b.speed * 1.25;
      }
      if (b.life < 18) b.life = 18;
    }
  }

  // Nova/vortex/chrono expanding ring
  if (
    b.novaMaxRadius > 0 &&
    b.novaRadius < b.novaMaxRadius &&
    !(b.weaponId === "anchor" && b.homing > 0)
  ) {
    const expandSpeed = b.novaMaxRadius / (b.maxLife * 0.6);
    b.novaRadius = Math.min(b.novaMaxRadius, b.novaRadius + expandSpeed);
  }

  b.x += b.vx;
  b.y += b.vy;
  b.life--;

  // Keep returning projectiles alive long enough to stay visible on the trip back.
  if ((b.weaponId === "boomerang" || b.weaponId === "harpoon") && b.returning) {
    if (b.life < 15) b.life = 15;
  } else if (b.life <= 0) {
    b.active = false;
  }
}

export function updateHomingBullet(
  b: BulletInstance,
  targetX: number,
  targetY: number
): void {
  if (!b.active || b.homing <= 0) return;

  const dx = targetX - b.x;
  const dy = targetY - b.y;
  const targetAngle = Math.atan2(dy, dx);

  // Gradually steer toward target
  let angleDiff = targetAngle - b.angle;
  // Normalize to [-PI, PI]
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  b.angle += angleDiff * b.homing;
  b.vx = Math.cos(b.angle) * b.speed;
  b.vy = Math.sin(b.angle) * b.speed;
}

// Defines the player state and movement or damage logic used during gameplay.
import {
  PLAYER_BASE_SPEED,
  PLAYER_BASE_HP,
  PLAYER_INVINCIBILITY_FRAMES,
  PLAYER_PICKUP_RADIUS,
  THRUST_ACCEL,
  DRAG,
  MAX_SPEED,
  MOUSE_DIST_REF,
  MIN_SPEED_RATIO,
  MAX_SPEED_LERP,
} from "@/lib/game/balance";
import type { ShipHull } from "@/store/gameStore";
import type { Input } from "../engine/Input";
import type { Camera } from "../engine/Camera";
import type { WeaponId } from "@/lib/game/weapons";
import type { UpgradeId } from "@/lib/game/upgrades";

export const DAMAGE_GUARD_WINDOW_FRAMES = 48; // Keeps a short rolling window for repeated-damage protection checks.
const DAMAGE_GUARD_BASE = 24; // Sets the early-game damage threshold that activates the guard.
const DAMAGE_GUARD_PER_MIN = 3.2; // Raises the guard threshold gradually as the run gets longer.
const DAMAGE_GUARD_QUAD = 0.22; // Adds extra mid- and late-game scaling to the guard threshold.

export interface ShipHullProfile {
  hpMult: number;
  speedMult: number;
  pickupMult: number;
  cooldownMult: number;
  damageMult: number;
  armorMult: number;
  aoeMult: number;
}

const SHIP_HULL_PROFILES: Record<ShipHull, ShipHullProfile> = {
  viper: {
    hpMult: 0.85,
    speedMult: 1.2,
    pickupMult: 1.05,
    cooldownMult: 0.9,
    damageMult: 0.95,
    armorMult: 1.04,
    aoeMult: 0.95,
  },
  mantis: {
    hpMult: 1.0,
    speedMult: 1.0,
    pickupMult: 1.0,
    cooldownMult: 1.0,
    damageMult: 1.15,
    armorMult: 1.0,
    aoeMult: 1.15,
  },
  titan: {
    hpMult: 1.35,
    speedMult: 0.84,
    pickupMult: 0.95,
    cooldownMult: 1.08,
    damageMult: 1.12,
    armorMult: 0.85,
    aoeMult: 1.2,
  },
};

export function getShipHullProfile(hull: ShipHull): ShipHullProfile {
  return SHIP_HULL_PROFILES[hull];
}

export interface PlayerState {
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  invincibleFrames: number;
  damageWindowFrames: number;
  damageWindowAccum: number;
  speed: number;
  pickupRadius: number;
  currentMaxSpeed: number;

  // Stores the currently selected hull and cosmetic color for rendering and tuning.
  shipHull: ShipHull;
  shipColor: string;

  // Stores the player's current progression state within the run.
  xp: number;
  level: number;
  score: number;
  kills: number;
  debrisCollected: number;

  // Stores the equipped weapons together with their current upgrade levels.
  weapons: { id: WeaponId; level: number }[];
  // Stores passive upgrade levels granted during the run.
  passives: Map<UpgradeId, number>;
  // Stores synergy ids that are forced active, such as a starter fusion bonus.
  forcedSynergies: Set<string>;

  // Stores derived combat stats that are recomputed whenever upgrades change.
  cooldownMult: number;
  damageMult: number;
  critChance: number;
  projSpeedMult: number;
  xpMult: number;
  regenPerSec: number;
  armorMult: number;
  aoeMult: number;
  extraProjectiles: number;

  // Stores the state of the kinetic rebound charge meter shown near the ship.
  reboundCharge: number;
  reboundThreshold: number;
  reboundFlashFrames: number;
}

function defaultStarterWeaponForHull(shipHull: ShipHull): WeaponId {
  return shipHull === "mantis"
    ? "frag"
    : shipHull === "titan"
      ? "siege"
      : "stinger";
}

export function createPlayer(
  shipHull: ShipHull = "viper",
  shipColor = "#00e5ff",
  starterWeapon?: WeaponId
): PlayerState {
  const profile = getShipHullProfile(shipHull);
  const initialWeapon = starterWeapon || defaultStarterWeaponForHull(shipHull);
  const weapons: { id: WeaponId; level: number }[] = [
    { id: initialWeapon, level: 1 },
  ];
  const passives = new Map<UpgradeId, number>();
  const forcedSynergies = new Set<string>();

  const player: PlayerState = {
    x: 0,
    y: 0,
    angle: 0,
    vx: 0,
    vy: 0,
    hp: PLAYER_BASE_HP * profile.hpMult,
    maxHp: PLAYER_BASE_HP * profile.hpMult,
    alive: true,
    invincibleFrames: 0,
    damageWindowFrames: 0,
    damageWindowAccum: 0,
    speed: PLAYER_BASE_SPEED * profile.speedMult,
    pickupRadius: PLAYER_PICKUP_RADIUS * profile.pickupMult,
    currentMaxSpeed: MAX_SPEED * profile.speedMult,

    shipHull,
    shipColor,

    xp: 0,
    level: 1,
    score: 0,
    kills: 0,
    debrisCollected: 0,

    weapons,
    passives,
    forcedSynergies,

    cooldownMult: profile.cooldownMult,
    damageMult: profile.damageMult,
    critChance: 0,
    projSpeedMult: 1,
    xpMult: 1,
    regenPerSec: 0,
    armorMult: profile.armorMult,
    aoeMult: profile.aoeMult,
    extraProjectiles: 0,
    reboundCharge: 0,
    reboundThreshold: 0,
    reboundFlashFrames: 0,
  };
  if (passives.size > 0) {
    recalcPlayerStats(player);
  }
  return player;
}

/** Computes the ship's facing angle from the cursor position without applying camera shake offsets. */
function computeFacingAngle(
  player: PlayerState,
  input: Input,
  camera: Camera
): { angle: number; dist: number } {
  const playerSX = player.x - camera.x + camera.width / 2;
  const playerSY = player.y - camera.y + camera.height / 2;
  const dx = input.mouseX - playerSX;
  const dy = input.mouseY - playerSY;
  return { angle: Math.atan2(dy, dx), dist: Math.sqrt(dx * dx + dy * dy) };
}

/** Updates only the ship facing so menus and pause states can keep the nose aligned to the cursor. */
export function updatePlayerFacing(
  player: PlayerState,
  input: Input,
  camera: Camera
): void {
  if (!player.alive) return;
  const { angle: target, dist } = computeFacingAngle(player, input, camera);
  if (dist > 5) {
    player.angle = target;
  }
}

export function updatePlayer(
  player: PlayerState,
  input: Input,
  camera: Camera
): void {
  if (!player.alive) return;

  // Counts down post-hit invincibility so the player cannot be damaged every frame.
  if (player.invincibleFrames > 0) player.invincibleFrames--;
  if (player.reboundFlashFrames > 0) player.reboundFlashFrames--;
  if (player.damageWindowFrames > 0) {
    player.damageWindowFrames--;
    if (player.damageWindowFrames <= 0) {
      player.damageWindowAccum = 0;
    }
  }

  const { angle: targetAngle, dist: mouseDist } = computeFacingAngle(
    player,
    input,
    camera
  );

  // Faces the ship toward the cursor immediately unless the cursor sits almost directly on the ship.
  if (mouseDist > 5) {
    player.angle = targetAngle;
  }

  // Adjusts the target speed cap based on cursor distance so close aiming allows finer control.
  const speedUpgrade = player.speed / PLAYER_BASE_SPEED;
  const distRatio = Math.min(1, mouseDist / MOUSE_DIST_REF);
  const targetMaxSpeed =
    (MIN_SPEED_RATIO + (1 - MIN_SPEED_RATIO) * distRatio) *
    MAX_SPEED *
    speedUpgrade;
  player.currentMaxSpeed +=
    (targetMaxSpeed - player.currentMaxSpeed) * MAX_SPEED_LERP;

  // Applies thrust toward the cursor direction each frame.
  const thrustAccel = THRUST_ACCEL * speedUpgrade;
  player.vx += Math.cos(player.angle) * thrustAccel;
  player.vy += Math.sin(player.angle) * thrustAccel;

  // Clamps velocity to the smoothed current speed cap.
  const spd = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
  if (spd > player.currentMaxSpeed) {
    player.vx = (player.vx / spd) * player.currentMaxSpeed;
    player.vy = (player.vy / spd) * player.currentMaxSpeed;
  }

  // Applies drag so the ship eases back from thrust rather than moving perpetually.
  player.vx *= 1 - DRAG;
  player.vy *= 1 - DRAG;

  // Advances the ship position using the updated velocity.
  player.x += player.vx;
  player.y += player.vy;

  // Restores health gradually when regeneration is available.
  if (player.regenPerSec > 0) {
    player.hp = Math.min(player.maxHp, player.hp + player.regenPerSec / 60);
  }
}

export function damagePlayer(
  player: PlayerState,
  amount: number,
  elapsedSec: number
): boolean {
  if (!player.alive || player.invincibleFrames > 0) return false;

  const finalDamage = amount * player.armorMult;
  player.hp -= finalDamage;

  if (player.damageWindowFrames <= 0) {
    player.damageWindowAccum = 0;
  }
  player.damageWindowFrames = DAMAGE_GUARD_WINDOW_FRAMES;
  player.damageWindowAccum += finalDamage;

  const guardThreshold = damageGuardThresholdForElapsedSec(elapsedSec);
  if (player.damageWindowAccum >= guardThreshold) {
    player.invincibleFrames = PLAYER_INVINCIBILITY_FRAMES;
    player.damageWindowAccum = 0;
    player.damageWindowFrames = 0;
  }

  if (player.hp <= 0) {
    player.hp = 0;
    player.alive = false;
    return true; // died
  }
  return false;
}

export function damageGuardThresholdForElapsedSec(elapsedSec: number): number {
  const elapsedMin = elapsedSec / 60;
  return (
    DAMAGE_GUARD_BASE +
    DAMAGE_GUARD_PER_MIN * elapsedMin +
    DAMAGE_GUARD_QUAD * elapsedMin * elapsedMin
  );
}

export function recalcPlayerStats(player: PlayerState): void {
  const profile = getShipHullProfile(player.shipHull);
  const p = player.passives;
  const hullLv = p.get("hull") || 0;
  const thrusterLv = p.get("thruster") || 0;
  const magnetLv = p.get("magnet") || 0;
  const cdLv = p.get("cooldown") || 0;
  const critLv = p.get("crit") || 0;
  const projLv = p.get("proj_speed") || 0;
  const xpLv = p.get("xp_boost") || 0;
  const regenLv = p.get("regen") || 0;
  const armorLv = p.get("armor") || 0;
  const areaLv = p.get("area") || 0;
  const multiLv = p.get("multishot") || 0;

  player.maxHp = PLAYER_BASE_HP * profile.hpMult * (1 + hullLv * 0.1);
  player.speed =
    PLAYER_BASE_SPEED * profile.speedMult * (1 + thrusterLv * 0.08);
  player.pickupRadius =
    PLAYER_PICKUP_RADIUS * profile.pickupMult * (1 + magnetLv * 0.15);
  player.cooldownMult = profile.cooldownMult * (1 - cdLv * 0.06);
  player.critChance = critLv * 0.05;
  player.projSpeedMult = 1 + projLv * 0.1;
  player.xpMult = 1 + xpLv * 0.08;
  player.regenPerSec = regenLv * 0.5;
  player.armorMult = profile.armorMult * (1 - armorLv * 0.05);
  player.damageMult = profile.damageMult;
  player.aoeMult = profile.aoeMult * (1 + areaLv * 0.08);
  player.extraProjectiles = multiLv;
  player.hp = Math.min(player.hp, player.maxHp);
}

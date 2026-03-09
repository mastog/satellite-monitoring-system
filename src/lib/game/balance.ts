// Centralizes the numeric tuning constants that control arcade difficulty, pacing, and feel.
export const TICK_RATE = 60;
export const TICK_MS = 1000 / TICK_RATE;

// Defines the baseline player movement, survivability, and pickup range before upgrades apply.
export const PLAYER_BASE_SPEED = 3.5;
export const PLAYER_BASE_HP = 100;
export const PLAYER_PICKUP_RADIUS = 48;
export const PLAYER_INVINCIBILITY_FRAMES = 48; // Keeps the player briefly immune after taking damage to prevent instant repeat hits.

// Defines the progression curve used to convert level targets into required experience.
export const XP_BASE = 10;
export const XP_EXPONENT = 1.35;

// Defines how enemy durability, pressure, and speed ramp as survival time increases.
export const ENEMY_HP_SCALE = 0.22; // Adds the linear health-growth term per elapsed minute.
export const ENEMY_HP_SCALE_QUAD = 0.01; // Adds extra late-game health growth through a quadratic term.
export const ENEMY_COUNT_SCALE = 0.2; // Adds the linear spawn-pressure term per elapsed minute.
export const ENEMY_COUNT_SCALE_QUAD = 0.02; // Adds extra late-game spawn pressure through a quadratic term.
export const ENEMY_SPEED_SCALE = 0.02; // Increases enemy movement speed slightly each minute.

// Defines boss cadence and health scaling for each major survival checkpoint.
export const BOSS_INTERVAL_SEC = 300; // Schedules a boss encounter every five minutes.
export const BOSS_BASE_HP = 1200;
export const BOSS_HP_SCALE = 1.9; // Multiplies boss health by the current boss wave number.

// Defines the off-screen spawn band so enemies enter from beyond the visible play area.
export const SPAWN_MIN_DISTANCE = 1200;
export const SPAWN_MAX_DISTANCE = 1600;

// Defines the pickup-attraction radius before magnet upgrades are applied.
export const MAGNET_BASE_RADIUS = 48;
export const MAGNET_SCALE_PER_LEVEL = 0.15;

// Controls how many upgrade options are shown at each level-up.
export const UPGRADE_CHOICES = 3;

// Sizes the reusable pools used to avoid per-frame allocations during combat.
export const POOL_BULLETS = 1024;
export const POOL_PARTICLES = 2048;
export const POOL_ENEMIES = 512;
export const POOL_PICKUPS = 512;

// Sets the collision-grid cell size used by the spatial hash.
export const HASH_CELL_SIZE = 128;

// Tunes how quickly the camera follows the player and how fast screen shake decays.
export const CAMERA_LERP = 0.08;
export const SHAKE_DECAY = 0.92;

// Tunes acceleration, drag, and pointer-distance scaling for ship movement.
export const THRUST_ACCEL = 0.08;
export const DRAG = 0.025;
export const MAX_SPEED = 2.64;
export const MOUSE_DIST_REF = 110; // Defines the pointer distance that unlocks full movement speed.
export const MIN_SPEED_RATIO = 0.05; // Keeps a small amount of movement authority even when the pointer sits on the ship.
export const MAX_SPEED_LERP = 0.05; // Smooths transitions when the target speed cap changes.

// Defines the large soft arena radius used for spawning and far-field culling.
export const ARENA_RADIUS = 50000;

export function xpForLevel(level: number): number {
  return Math.floor(XP_BASE * Math.pow(level, XP_EXPONENT));
}

export function enemyHpScale(elapsedMin: number): number {
  return (
    1 +
    ENEMY_HP_SCALE * elapsedMin +
    ENEMY_HP_SCALE_QUAD * elapsedMin * elapsedMin
  );
}

export function enemyCountScale(elapsedMin: number): number {
  return (
    1 +
    ENEMY_COUNT_SCALE * elapsedMin +
    ENEMY_COUNT_SCALE_QUAD * elapsedMin * elapsedMin
  );
}

export function enemySpeedScale(elapsedMin: number): number {
  return 1 + ENEMY_SPEED_SCALE * elapsedMin;
}

export function bossHp(waveNumber: number): number {
  return Math.floor(BOSS_BASE_HP * BOSS_HP_SCALE * waveNumber);
}

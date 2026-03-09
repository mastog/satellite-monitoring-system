// Defines the enemy catalog used by spawning, combat tuning, and reward logic.

export type EnemyType =
  | "micro_debris"
  | "asteroid_s"
  | "asteroid_m"
  | "asteroid_l"
  | "rogue_satellite"
  | "meteor_swarm"
  | "space_junk"
  | "drone_fighter"
  | "shield_drone"
  | "kamikaze"
  | "elite_satellite"
  | "solar_flare"
  | "derelict_boss";

export interface EnemyDef {
  type: EnemyType;
  name: string;
  baseHp: number;
  speed: number;
  radius: number;
  damage: number; // Stores the collision damage applied when the enemy reaches the player.
  xpValue: number;
  spawnAfterSec: number; // Stores the earliest elapsed time at which this enemy can start spawning.
  color: string;
  isBoss: boolean;
  splits?: EnemyType; // Points to the follow-up enemy type spawned when this enemy breaks apart.
  splitCount?: number;
  projectile?: boolean; // Marks whether the enemy can fire projectiles instead of relying only on contact damage.
  projectileCooldown?: number;
  swarmCount?: number; // Stores how many units are emitted when this definition represents a swarm-style spawn.
}

const ENEMIES: Record<EnemyType, EnemyDef> = {
  micro_debris: {
    type: "micro_debris",
    name: "Micro Debris",
    baseHp: 2,
    speed: 1.6,
    radius: 8,
    damage: 5,
    xpValue: 1,
    spawnAfterSec: 0,
    color: "#8899aa",
    isBoss: false,
  },
  asteroid_s: {
    type: "asteroid_s",
    name: "Small Asteroid",
    baseHp: 6,
    speed: 1.2,
    radius: 14,
    damage: 8,
    xpValue: 3,
    spawnAfterSec: 0,
    color: "#aa8866",
    isBoss: false,
  },
  asteroid_m: {
    type: "asteroid_m",
    name: "Medium Asteroid",
    baseHp: 16,
    speed: 0.9,
    radius: 24,
    damage: 12,
    xpValue: 6,
    spawnAfterSec: 0,
    color: "#aa8866",
    isBoss: false,
    splits: "asteroid_s",
    splitCount: 2,
  },
  asteroid_l: {
    type: "asteroid_l",
    name: "Large Asteroid",
    baseHp: 30,
    speed: 0.6,
    radius: 36,
    damage: 18,
    xpValue: 10,
    spawnAfterSec: 0,
    color: "#aa8866",
    isBoss: false,
    splits: "asteroid_m",
    splitCount: 2,
  },
  rogue_satellite: {
    type: "rogue_satellite",
    name: "Rogue Satellite",
    baseHp: 16,
    speed: 1.5,
    radius: 18,
    damage: 10,
    xpValue: 8,
    spawnAfterSec: 120,
    color: "#ff6b2c",
    isBoss: false,
    projectile: true,
    projectileCooldown: 220,
  },
  meteor_swarm: {
    type: "meteor_swarm",
    name: "Meteor Swarm",
    baseHp: 4,
    speed: 4,
    radius: 10,
    damage: 6,
    xpValue: 2,
    spawnAfterSec: 180,
    color: "#ff9944",
    isBoss: false,
    swarmCount: 10,
  },
  space_junk: {
    type: "space_junk",
    name: "Space Junk Cluster",
    baseHp: 40,
    speed: 0.8,
    radius: 32,
    damage: 15,
    xpValue: 15,
    spawnAfterSec: 300,
    color: "#66aacc",
    isBoss: false,
    splits: "micro_debris",
    splitCount: 6,
  },
  drone_fighter: {
    type: "drone_fighter",
    name: "Drone Fighter",
    baseHp: 10,
    speed: 2.2,
    radius: 12,
    damage: 8,
    xpValue: 5,
    spawnAfterSec: 60,
    color: "#ff9944",
    isBoss: false,
    projectile: true,
    projectileCooldown: 180,
  },
  shield_drone: {
    type: "shield_drone",
    name: "Shield Drone",
    baseHp: 50,
    speed: 1.0,
    radius: 20,
    damage: 12,
    xpValue: 12,
    spawnAfterSec: 180,
    color: "#82b1ff",
    isBoss: false,
  },
  kamikaze: {
    type: "kamikaze",
    name: "Kamikaze Drone",
    baseHp: 6,
    speed: 4.5,
    radius: 10,
    damage: 25,
    xpValue: 4,
    spawnAfterSec: 120,
    color: "#ff1744",
    isBoss: false,
  },
  elite_satellite: {
    type: "elite_satellite",
    name: "Elite Satellite",
    baseHp: 30,
    speed: 1.8,
    radius: 22,
    damage: 14,
    xpValue: 15,
    spawnAfterSec: 240,
    color: "#ffd740",
    isBoss: false,
    projectile: true,
    projectileCooldown: 100,
  },
  solar_flare: {
    type: "solar_flare",
    name: "Solar Flare",
    baseHp: 19998,
    speed: 3,
    radius: 600,
    damage: 25,
    xpValue: 0,
    spawnAfterSec: Infinity, // Keeps this hazard out of the normal endless spawn rotation.
    color: "#ffcc00",
    isBoss: false,
  },
  derelict_boss: {
    type: "derelict_boss",
    name: "Derelict Station",
    baseHp: 2400,
    speed: 0.38,
    radius: 82,
    damage: 28,
    xpValue: 180,
    spawnAfterSec: 300,
    color: "#ff3a8c",
    isBoss: true,
    projectile: true,
    projectileCooldown: 42,
  },
};

export function getEnemyDef(type: EnemyType): EnemyDef {
  return ENEMIES[type];
}

export function getSpawnableEnemies(elapsedSec: number): EnemyDef[] {
  return Object.values(ENEMIES).filter(
    (e) => !e.isBoss && e.spawnAfterSec <= elapsedSec
  );
}

export function getAllEnemyDefs(): EnemyDef[] {
  return Object.values(ENEMIES);
}

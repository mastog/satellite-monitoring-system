// Defines the multi-phase derelict-station boss and its phase-specific behavior.
import type { EnemyInstance } from "./Enemy";

export interface BossPhaseConfig {
  hpThreshold: number; // Stores the remaining-health threshold that activates this phase.
  turretCount: number;
  shotCooldown: number;
  spawnMinions: boolean;
  minionType: string;
  minionCount: number;
  minionInterval: number; // Stores how many frames to wait between minion spawns in this phase.
}

export const BOSS_PHASES: BossPhaseConfig[] = [
  {
    hpThreshold: 1.0,
    turretCount: 3,
    shotCooldown: 42,
    spawnMinions: true,
    minionType: "micro_debris",
    minionCount: 6,
    minionInterval: 240,
  },
  {
    hpThreshold: 0.72,
    turretCount: 5,
    shotCooldown: 30,
    spawnMinions: true,
    minionType: "drone_fighter",
    minionCount: 6,
    minionInterval: 180,
  },
  {
    hpThreshold: 0.42,
    turretCount: 8,
    shotCooldown: 20,
    spawnMinions: true,
    minionType: "rogue_satellite",
    minionCount: 4,
    minionInterval: 150,
  },
];

export function getBossPhase(boss: EnemyInstance): number {
  const hpRatio = boss.hp / boss.maxHp;
  for (let i = BOSS_PHASES.length - 1; i >= 0; i--) {
    if (hpRatio <= BOSS_PHASES[i].hpThreshold) {
      return i;
    }
  }
  return 0;
}

export function getBossPhaseConfig(phase: number): BossPhaseConfig {
  return BOSS_PHASES[Math.min(phase, BOSS_PHASES.length - 1)];
}

/** Returns evenly spaced turret anchor points around the boss hull. */
export function getTurretPositions(
  bossX: number,
  bossY: number,
  radius: number,
  turretCount: number,
  rotation: number
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < turretCount; i++) {
    const angle = rotation + (i / turretCount) * Math.PI * 2;
    positions.push({
      x: bossX + Math.cos(angle) * radius * 1.2,
      y: bossY + Math.sin(angle) * radius * 1.2,
    });
  }
  return positions;
}

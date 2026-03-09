// Controls time-based enemy spawning, difficulty escalation, horde windows,
// and boss cadence for the arcade mode.
import { ObjectPool } from "../engine/ObjectPool";
import type { EnemyInstance } from "../entities/Enemy";
import { initEnemy } from "../entities/Enemy";
import { getEnemyDef, type EnemyType } from "@/lib/game/enemies";
import {
  enemyHpScale,
  enemyCountScale,
  enemySpeedScale,
  bossHp,
  SPAWN_MIN_DISTANCE,
  SPAWN_MAX_DISTANCE,
  BOSS_INTERVAL_SEC,
} from "@/lib/game/balance";
import type { PlayerState } from "../entities/Player";

interface SpawnProfile {
  type: EnemyType;
  cost: number;
  minSec: number;
  weight: number;
  isShooter?: boolean;
}

const SPAWN_PROFILES: SpawnProfile[] = [
  { type: "micro_debris", cost: 0.75, minSec: 0, weight: 34 },
  { type: "asteroid_s", cost: 0.95, minSec: 0, weight: 180 },
  { type: "asteroid_m", cost: 1.8, minSec: 0, weight: 360 },
  { type: "asteroid_l", cost: 3.1, minSec: 0, weight: 720 },
  { type: "kamikaze", cost: 1.35, minSec: 120, weight: 8 },
  { type: "meteor_swarm", cost: 6.0, minSec: 180, weight: 90.0 },
  { type: "shield_drone", cost: 2.5, minSec: 180, weight: 5.2 },
  { type: "space_junk", cost: 3.3, minSec: 300, weight: 4.3 },
  {
    type: "drone_fighter",
    cost: 2.0,
    minSec: 150,
    weight: 0.45,
    isShooter: true,
  },
  {
    type: "rogue_satellite",
    cost: 2.4,
    minSec: 210,
    weight: 0.4,
    isShooter: true,
  },
  {
    type: "elite_satellite",
    cost: 3.4,
    minSec: 300,
    weight: 0.3,
    isShooter: true,
  },
];

export class WaveManager {
  elapsedFrames = 0;
  waveNumber = 0;
  bossesSpawned = 0;

  private spawnTimer = 0;
  private baseSpawnInterval = 16; // frames between spawn ticks
  private hordeActiveUntilSec = 0;
  private nextHordeSec = 80;
  private hordeRemainingBudget = 0;
  private hordeTotalBudget = 0;
  private hordeRoster: EnemyType[] = [];

  // Advances elapsed time, checks boss and horde thresholds, and emits the
  // next spawn slice when the timer is ready.
  update(player: PlayerState, enemies: ObjectPool<EnemyInstance>): void {
    this.elapsedFrames++;
    this.spawnTimer++;

    const elapsedSec = this.elapsedFrames / 60;
    const elapsedMin = elapsedSec / 60;

    // Adjusts spawn cadence to create steady pressure rather than isolated spikes.
    const pressure = enemyCountScale(elapsedMin);
    const spawnInterval = Math.max(
      2,
      Math.floor(this.baseSpawnInterval / (1 + pressure * 0.85))
    );

    // Spawns bosses whenever elapsed time crosses the next boss interval.
    const bossesExpected = Math.floor(elapsedSec / BOSS_INTERVAL_SEC);
    if (bossesExpected > this.bossesSpawned) {
      this.spawnBoss(player, enemies, elapsedMin);
      this.bossesSpawned = bossesExpected;
    }

    // Starts scripted horde windows at scheduled intervals.
    if (
      elapsedSec >= this.nextHordeSec &&
      elapsedSec >= this.hordeActiveUntilSec
    ) {
      this.startHorde(elapsedSec, elapsedMin);
    }

    // Performs regular spawning between boss and horde events.
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this.spawnWave(player, enemies, elapsedSec, elapsedMin);
    }
  }

  // Routes spawning into either normal-wave logic or horde-wave logic.
  private spawnWave(
    player: PlayerState,
    enemies: ObjectPool<EnemyInstance>,
    elapsedSec: number,
    elapsedMin: number
  ): void {
    if (elapsedSec < this.hordeActiveUntilSec) {
      this.spawnHordeWave(player, enemies, elapsedSec, elapsedMin);
      return;
    }

    this.spawnNormalWave(player, enemies, elapsedSec, elapsedMin);
  }

  // Builds the default spawn mix used outside scripted horde windows.
  private spawnNormalWave(
    player: PlayerState,
    enemies: ObjectPool<EnemyInstance>,
    elapsedSec: number,
    elapsedMin: number
  ): void {
    const available = SPAWN_PROFILES.filter((p) => p.minSec <= elapsedSec);
    if (available.length === 0) return;

    // Stops spawning when the field is already denser than the target band.
    const targetDensity = this.targetActiveEnemies(elapsedMin);
    if (enemies.activeCount >= Math.floor(targetDensity * 1.2)) return;

    let { asteroids: activeAsteroids, planes: activePlanes } =
      this.countActiveByCategory(enemies);
    const maxPlanesByTime = this.maxPlanesByTime(elapsedSec);

    // Increases spawn budget when the field feels too empty.
    let budget = this.spawnBudget(elapsedMin);
    if (enemies.activeCount < Math.floor(targetDensity * 0.9)) {
      budget *= 1.8;
    }

    const shooterCap = this.maxActiveShooters(targetDensity);
    let activeShooters = this.countActiveShooters(enemies);
    let shootersThisTick = 0;
    let safety = 0;

    // Spends the available budget while respecting density, plane, and shooter caps.
    while (
      budget >= 0.75 &&
      safety < 90 &&
      enemies.activeCount < targetDensity
    ) {
      const maxPlanesByRatio = Math.floor(activeAsteroids / 30);
      const allowedPlanesNow = Math.min(maxPlanesByTime, maxPlanesByRatio);
      const candidatePool =
        activePlanes >= allowedPlanesNow
          ? available.filter((p) => !this.isPlaneType(p.type))
          : available;

      const picked = this.pickSpawnProfile(
        candidatePool,
        elapsedMin,
        activeShooters,
        shootersThisTick,
        shooterCap
      );
      if (!picked) break;

      if (picked.type === "meteor_swarm") {
        this.spawnMeteorSwarm(player, enemies, elapsedMin);
        activeAsteroids += getEnemyDef("meteor_swarm").swarmCount || 10;
        budget -= picked.cost;
        safety++;
        continue;
      }

      this.spawnSingleEnemy(player, enemies, picked.type, elapsedMin);
      budget -= picked.cost;
      if (this.isAsteroidType(picked.type)) activeAsteroids++;
      if (this.isPlaneType(picked.type)) activePlanes++;
      if (picked.isShooter) {
        activeShooters++;
        shootersThisTick++;
      }
      safety++;
    }

    // Adds fallback fodder if the board still feels too empty after normal spawning.
    if (enemies.activeCount < Math.floor(targetDensity * 0.75)) {
      const fallbackCount = Math.min(48, Math.floor(targetDensity * 0.4));
      for (let i = 0; i < fallbackCount; i++) {
        const t: EnemyType =
          i % 2 === 0
            ? "asteroid_l"
            : i % 4 === 0
              ? "asteroid_s"
              : "asteroid_m";
        this.spawnSingleEnemy(player, enemies, t, elapsedMin);
      }
    }
  }

  // Spends the temporary horde budget using the restricted horde roster.
  private spawnHordeWave(
    player: PlayerState,
    enemies: ObjectPool<EnemyInstance>,
    elapsedSec: number,
    elapsedMin: number
  ): void {
    if (this.hordeRemainingBudget <= 0) return;

    const available = SPAWN_PROFILES.filter(
      (p) => p.minSec <= elapsedSec && this.hordeRoster.includes(p.type)
    );
    if (available.length === 0) return;

    const minCost = available.reduce((m, p) => Math.min(m, p.cost), Infinity);
    const pressure = enemyCountScale(elapsedMin);
    const waveProgress =
      this.hordeTotalBudget > 0
        ? 1 - this.hordeRemainingBudget / this.hordeTotalBudget
        : 0;
    const tickBudget = Math.min(
      this.hordeRemainingBudget,
      7 + pressure * 4 + elapsedMin * 1.2 + waveProgress * 7
    );

    let spend = tickBudget;
    let safety = 0;
    while (spend >= minCost && safety < 90) {
      const picked = this.pickHordeProfile(available, elapsedMin, elapsedSec);
      if (!picked) break;
      if (spend < picked.cost) {
        safety++;
        continue;
      }

      if (picked.type === "meteor_swarm") {
        this.spawnMeteorSwarm(player, enemies, elapsedMin);
      } else {
        this.spawnSingleEnemy(player, enemies, picked.type, elapsedMin);
      }

      spend -= picked.cost;
      this.hordeRemainingBudget -= picked.cost;
      safety++;
      if (this.hordeRemainingBudget <= 0) break;
    }
  }

  // Initializes a new horde window with its duration, budget, and roster.
  private startHorde(elapsedSec: number, elapsedMin: number): void {
    const duration = Math.min(16, 10 + elapsedMin * 0.45);
    this.hordeActiveUntilSec = elapsedSec + duration;
    this.hordeTotalBudget = this.hordeBudgetTotal(elapsedMin);
    this.hordeRemainingBudget = this.hordeTotalBudget;
    this.hordeRoster = this.buildHordeRoster(elapsedSec, elapsedMin);
    const nextGap = Math.max(45, 80 - elapsedMin * 1.6);
    this.nextHordeSec = elapsedSec + nextGap;
  }

  private hordeBudgetTotal(elapsedMin: number): number {
    return Math.min(
      900,
      140 + elapsedMin * 85 + Math.pow(elapsedMin, 1.6) * 22
    );
  }

  private spawnBudget(elapsedMin: number): number {
    const pressure = enemyCountScale(elapsedMin);
    const base = 8 + pressure * 4 + elapsedMin * 1.4;
    return Math.min(base, 64);
  }

  private targetActiveEnemies(elapsedMin: number): number {
    const base = 38 + elapsedMin * 56 + Math.pow(elapsedMin, 1.75) * 7;
    const accel = Math.pow(Math.max(0, elapsedMin - 2), 1.6) * 3.5;
    return Math.floor(Math.min(base + accel, 500));
  }

  private maxActiveShooters(targetDensity: number): number {
    return Math.max(2, Math.floor(targetDensity * 0.08));
  }

  private maxPlanesByTime(elapsedSec: number): number {
    if (elapsedSec < 90) return 0;
    return Math.min(20, Math.floor((elapsedSec - 90) / 60) + 1);
  }

  private countActiveShooters(enemies: ObjectPool<EnemyInstance>): number {
    let count = 0;
    enemies.forEach((e) => {
      if (e.projectile) count++;
    });
    return count;
  }

  private countActiveByCategory(enemies: ObjectPool<EnemyInstance>): {
    asteroids: number;
    planes: number;
  } {
    let asteroids = 0;
    let planes = 0;
    enemies.forEach((e) => {
      if (this.isAsteroidType(e.type)) asteroids++;
      if (this.isPlaneType(e.type)) planes++;
    });
    return { asteroids, planes };
  }

  private isAsteroidType(type: EnemyType): boolean {
    return (
      type === "asteroid_s" ||
      type === "asteroid_m" ||
      type === "asteroid_l" ||
      type === "meteor_swarm"
    );
  }

  private isPlaneType(type: EnemyType): boolean {
    return (
      type === "drone_fighter" ||
      type === "rogue_satellite" ||
      type === "elite_satellite" ||
      type === "shield_drone" ||
      type === "kamikaze"
    );
  }

  private pickSpawnProfile(
    available: SpawnProfile[],
    elapsedMin: number,
    activeShooters: number,
    shootersThisTick: number,
    shooterCap: number
  ): SpawnProfile | null {
    const scored = available
      .map((p) => {
        let weight = p.weight;

        // Keep ranged pressure as supporting threat, not the main difficulty driver.
        if (p.isShooter) {
          const shooterPenalty = elapsedMin < 8 ? 0.42 : 0.28;
          weight *= shooterPenalty;
          if (activeShooters >= shooterCap) weight = 0;
          if (shootersThisTick >= 1) weight = 0;
        }

        // Nudge toward horde density in mid/late game.
        if (p.type === "micro_debris") {
          weight *= elapsedMin < 5 ? 1.45 : 1.7;
        }
        if (p.type === "asteroid_s") {
          weight *= elapsedMin < 5 ? 0.55 : 0.45;
        }
        if (
          p.type === "asteroid_m" ||
          p.type === "kamikaze" ||
          p.type === "shield_drone"
        ) {
          weight *= elapsedMin > 6 ? 1.2 : 0.9;
        }
        if (p.type === "space_junk" || p.type === "asteroid_l") {
          weight *= elapsedMin > 10 ? 1.55 : 1.2;
        }
        if (p.type === "meteor_swarm") {
          weight *= elapsedMin > 7 ? 1.1 : 0.5;
        }

        return { profile: p, weight: Math.max(0, weight) };
      })
      .filter((s) => s.weight > 0);

    if (scored.length === 0) return null;

    const total = scored.reduce((sum, s) => sum + s.weight, 0);
    let r = Math.random() * total;
    for (const s of scored) {
      r -= s.weight;
      if (r <= 0) return s.profile;
    }
    return scored[scored.length - 1].profile;
  }

  private pickHordeProfile(
    available: SpawnProfile[],
    elapsedMin: number,
    elapsedSec: number
  ): SpawnProfile | null {
    const scored = available
      .map((p) => {
        let weight = p.weight;

        // Horde mode: early waves are mostly asteroid pressure, then mixed compositions.
        if (p.type === "micro_debris") {
          weight *= elapsedSec < 180 ? 1.25 : 1.1;
        }
        if (p.type === "asteroid_s") {
          weight *= elapsedSec < 180 ? 0.5 : 0.45;
        }
        if (p.type === "asteroid_m") {
          weight *= elapsedSec > 120 ? 1.25 : 1.05;
        }
        if (p.type === "asteroid_l") {
          weight *= elapsedSec > 120 ? 1.55 : 1.2;
        }
        if (p.type === "meteor_swarm") {
          weight *= elapsedSec < 180 ? 0.4 : elapsedSec < 300 ? 0.8 : 1.15;
        }
        if (p.type === "space_junk" || p.type === "shield_drone") {
          weight *= elapsedSec < 210 ? 0.7 : 1.15;
        }

        // Enemy craft unlock progressively in horde mode; still not dominant.
        if (p.isShooter) {
          weight *= elapsedSec < 180 ? 0.2 : elapsedSec < 300 ? 0.35 : 0.55;
        }
        if (p.type === "kamikaze") {
          weight *= elapsedSec < 180 ? 0.45 : 0.9;
        }

        // Late waves get more varied compositions.
        if (
          elapsedMin > 7 &&
          (p.type === "rogue_satellite" || p.type === "elite_satellite")
        ) {
          weight *= 1.25;
        }

        return { profile: p, weight: Math.max(0, weight) };
      })
      .filter((s) => s.weight > 0);

    if (scored.length === 0) return null;
    const total = scored.reduce((sum, s) => sum + s.weight, 0);
    let r = Math.random() * total;
    for (const s of scored) {
      r -= s.weight;
      if (r <= 0) return s.profile;
    }
    return scored[scored.length - 1].profile;
  }

  private buildHordeRoster(
    elapsedSec: number,
    elapsedMin: number
  ): EnemyType[] {
    const unlocked = SPAWN_PROFILES.filter((p) => p.minSec <= elapsedSec);
    if (unlocked.length === 0) return ["asteroid_l"];

    const rosterSize = elapsedSec < 180 ? 1 : elapsedSec < 420 ? 2 : 3;
    const pool = [...unlocked];
    const roster: EnemyType[] = [];

    for (let i = 0; i < rosterSize && pool.length > 0; i++) {
      const scored = pool
        .map((p) => ({
          profile: p,
          weight: Math.max(
            0,
            this.hordeRosterWeight(p, elapsedSec, elapsedMin, i)
          ),
        }))
        .filter((s) => s.weight > 0);

      if (scored.length === 0) break;
      const total = scored.reduce((sum, s) => sum + s.weight, 0);
      let r = Math.random() * total;
      let picked = scored[scored.length - 1].profile;
      for (const s of scored) {
        r -= s.weight;
        if (r <= 0) {
          picked = s.profile;
          break;
        }
      }

      roster.push(picked.type);
      const idx = pool.findIndex((p) => p.type === picked.type);
      if (idx >= 0) pool.splice(idx, 1);
    }

    return roster.length > 0 ? roster : ["asteroid_s"];
  }

  private hordeRosterWeight(
    p: SpawnProfile,
    elapsedSec: number,
    elapsedMin: number,
    pickIndex: number
  ): number {
    let w = p.weight;

    // First slot should strongly favor a clear primary identity.
    if (pickIndex === 0) {
      if (p.type === "asteroid_s") w *= 0.5;
      if (p.type === "asteroid_m") w *= 1.3;
      if (p.type === "asteroid_l") w *= 1.75;
      if (p.type === "meteor_swarm") w *= elapsedSec < 180 ? 0.45 : 1.1;
      if (p.isShooter) w *= 0.18;
    } else {
      // Secondary/tertiary slots add variation without becoming full mix.
      if (p.type === "asteroid_s") w *= 0.7;
      if (
        p.type === "asteroid_l" ||
        p.type === "space_junk" ||
        p.type === "shield_drone"
      )
        w *= 1.4;
      if (p.isShooter) w *= elapsedSec < 300 ? 0.45 : 0.75;
      if (p.type === "kamikaze") w *= elapsedSec < 180 ? 0.6 : 1;
    }

    // Late game allows more elite identities in the roster.
    if (
      elapsedMin > 7 &&
      (p.type === "rogue_satellite" || p.type === "elite_satellite")
    ) {
      w *= 1.35;
    }

    return w;
  }

  private spawnSingleEnemy(
    player: PlayerState,
    enemies: ObjectPool<EnemyInstance>,
    type: EnemyType,
    elapsedMin: number
  ): void {
    const e = enemies.acquire();
    if (!e) return;

    const def = getEnemyDef(type);
    const { x, y } = this.randomSpawnPosition(player.x, player.y);
    const hpMult = enemyHpScale(elapsedMin);
    const speedMult = Math.min(1.35, enemySpeedScale(elapsedMin));

    initEnemy(
      e,
      type,
      x,
      y,
      Math.floor(def.baseHp * hpMult),
      def.speed * speedMult,
      def.radius,
      def.damage,
      def.xpValue,
      def.color,
      {
        splits: def.splits,
        splitCount: def.splitCount,
        projectile: def.projectile,
        projectileCooldown: def.projectileCooldown,
      }
    );
  }

  private spawnMeteorSwarm(
    player: PlayerState,
    enemies: ObjectPool<EnemyInstance>,
    elapsedMin: number
  ): void {
    const def = getEnemyDef("meteor_swarm");
    const count = def.swarmCount || 10;
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = SPAWN_MAX_DISTANCE;

    for (let i = 0; i < count; i++) {
      const e = enemies.acquire();
      if (!e) break;

      const perpOffset = (i - count / 2) * 20;
      const sx =
        player.x +
        Math.cos(angle) * spawnDist +
        Math.cos(angle + Math.PI / 2) * perpOffset;
      const sy =
        player.y +
        Math.sin(angle) * spawnDist +
        Math.sin(angle + Math.PI / 2) * perpOffset;

      const hpMult = enemyHpScale(elapsedMin);
      const speedMult = Math.min(1.45, enemySpeedScale(elapsedMin));
      initEnemy(
        e,
        "meteor_swarm",
        sx,
        sy,
        Math.floor(def.baseHp * hpMult),
        def.speed * speedMult,
        def.radius,
        def.damage,
        def.xpValue,
        def.color
      );

      // Fixed velocity toward player area
      e.vx = -Math.cos(angle) * def.speed * speedMult;
      e.vy = -Math.sin(angle) * def.speed * speedMult;
    }
  }

  private spawnBoss(
    player: PlayerState,
    enemies: ObjectPool<EnemyInstance>,
    elapsedMin: number
  ): void {
    const e = enemies.acquire();
    if (!e) return;

    const waveNum = this.bossesSpawned + 1;
    const { x, y } = this.randomSpawnPosition(player.x, player.y);
    const hp = bossHp(waveNum);
    const def = getEnemyDef("derelict_boss");
    const speedMult = Math.min(1.25, enemySpeedScale(elapsedMin));

    initEnemy(
      e,
      "derelict_boss",
      x,
      y,
      Math.floor(hp * enemyHpScale(elapsedMin)),
      def.speed * speedMult,
      def.radius,
      def.damage,
      def.xpValue * waveNum,
      def.color,
      {
        projectile: true,
        projectileCooldown: def.projectileCooldown,
        phase: 0,
      }
    );

    this.waveNumber = waveNum;
  }

  private randomSpawnPosition(
    px: number,
    py: number
  ): { x: number; y: number } {
    const angle = Math.random() * Math.PI * 2;
    const dist =
      SPAWN_MIN_DISTANCE +
      Math.random() * (SPAWN_MAX_DISTANCE - SPAWN_MIN_DISTANCE);
    return {
      x: px + Math.cos(angle) * dist,
      y: py + Math.sin(angle) * dist,
    };
  }

  get elapsedSeconds(): number {
    return this.elapsedFrames / 60;
  }

  reset(): void {
    this.elapsedFrames = 0;
    this.waveNumber = 0;
    this.bossesSpawned = 0;
    this.spawnTimer = 0;
    this.hordeActiveUntilSec = 0;
    this.nextHordeSec = 80;
    this.hordeRemainingBudget = 0;
    this.hordeTotalBudget = 0;
    this.hordeRoster = [];
  }
}

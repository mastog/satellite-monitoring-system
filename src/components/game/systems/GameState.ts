// Orchestrates the entire arcade runtime by connecting input, simulation
// systems, entity pools, rendering, and progression callbacks.
import { ObjectPool } from "../engine/ObjectPool";
import { Camera } from "../engine/Camera";
import { Input } from "../engine/Input";
import { Renderer } from "../rendering/Renderer";
import { ParticleSystem } from "./ParticleSystem";
import { WeaponSystem } from "./WeaponSystem";
import { CollisionSystem } from "./CollisionSystem";
import { WaveManager } from "./WaveManager";
import { UpgradeSystem } from "./UpgradeSystem";
import {
  createPlayer,
  updatePlayer,
  updatePlayerFacing,
  damageGuardThresholdForElapsedSec,
  type PlayerState,
} from "../entities/Player";
import {
  createBulletTemplate,
  updateBullet,
  updateHomingBullet,
  type BulletInstance,
} from "../entities/Bullet";
import {
  createEnemyTemplate,
  updateEnemy,
  shouldShoot,
  resetEnemyIds,
  type EnemyInstance,
} from "../entities/Enemy";
import { createPickupTemplate, type PickupInstance } from "../entities/Pickup";
import { initBullet } from "../entities/Bullet";
import { initEnemy } from "../entities/Enemy";
import { getEnemyDef } from "@/lib/game/enemies";
import {
  getBossPhase,
  getBossPhaseConfig,
  getTurretPositions,
} from "../entities/Boss";
import {
  xpForLevel,
  POOL_BULLETS,
  POOL_ENEMIES,
  POOL_PICKUPS,
} from "@/lib/game/balance";
import { getWeapon, getWeaponLevel } from "@/lib/game/weapons";
import type { WeaponId } from "@/lib/game/weapons";
import { getActiveSynergies } from "@/lib/game/synergies";
import { drawCircle } from "../rendering/ShapeGenerator";
import {
  clearAegisConstellationRuntime,
  getAegisConstellationNodes,
  updateAegisConstellationRuntime,
} from "./fusionOrbitals";
import type { LevelUpChoice, GameStats } from "../engine/GameCanvas";
import type { ShipHull } from "@/store/gameStore";

export interface GameCallbacks {
  onGameOver?: (finalState: {
    score: number;
    time: number;
    level: number;
    kills: number;
    debris: number;
    weapons: string[];
  }) => void;
  onLevelUp?: (choices: LevelUpChoice[]) => void;
  onPause?: (paused: boolean) => void;
  onStatsUpdate?: (stats: GameStats) => void;
  onIntelFragment?: (payload: { reason: "boss" }) => void;
  onSynergyUnlocked?: (payload: {
    id: string;
    name: string;
    description: string;
    color: string;
  }) => void;
}

export interface GameState {
  update: (dt: number) => void;
  render: (alpha: number, fps: number) => void;
  reset: () => void;
  chooseUpgrade: (index: number) => void;
  rerollUpgradeChoices: () => void;
  setPaused: (p: boolean) => void;
  togglePause: () => void;
  isRunning: boolean;
  isLevelUp: boolean;
  isPaused: boolean;
}

export function createGame(
  canvas: HTMLCanvasElement,
  camera: Camera,
  input: Input,
  callbacksRef: React.MutableRefObject<GameCallbacks>,
  shipRef: React.MutableRefObject<{
    hull?: ShipHull;
    color?: string;
    starterWeapon?: WeaponId;
  }>
): GameState {
  // Uses low-overhead canvas settings so more frame budget remains available
  // for simulation and rendering work.
  const ctx = (canvas.getContext("2d", {
    alpha: false,
    desynchronized: true,
  } as CanvasRenderingContext2DSettings) || canvas.getContext("2d"))!;
  const renderer = new Renderer(ctx);
  const particles = new ParticleSystem();
  const weaponSystem = new WeaponSystem();
  const collisionSystem = new CollisionSystem();
  const waveManager = new WaveManager();
  const upgradeSystem = new UpgradeSystem();

  const bullets = new ObjectPool<BulletInstance>(
    createBulletTemplate,
    POOL_BULLETS
  );
  const enemies = new ObjectPool<EnemyInstance>(
    createEnemyTemplate,
    POOL_ENEMIES
  );
  const pickups = new ObjectPool<PickupInstance>(
    createPickupTemplate,
    POOL_PICKUPS
  );

  let player = createPlayer(
    shipRef.current.hull,
    shipRef.current.color,
    shipRef.current.starterWeapon
  );
  let paused = false;
  let running = false;
  let gameOver = false;
  let statsThrottle = 0;
  const announcedSynergyIds = new Set<string>();

  // Tracks active gravity-well visuals separately from bullets so the renderer
  // can draw persistent field effects.
  const gravityWells: {
    x: number;
    y: number;
    radius: number;
    life: number;
    maxLife: number;
    traveling: boolean;
    weaponId?: string;
  }[] = [];

  // Restores the run to a fresh starting state while preserving the selected
  // ship loadout and starter configuration.
  function reset() {
    resetEnemyIds();
    player = createPlayer(
      shipRef.current.hull,
      shipRef.current.color,
      shipRef.current.starterWeapon
    );
    bullets.releaseAll();
    enemies.releaseAll();
    pickups.releaseAll();
    particles.reset();
    weaponSystem.reset();
    collisionSystem.reset();
    waveManager.reset();
    upgradeSystem.reset();
    gravityWells.length = 0;
    paused = false;
    running = true;
    gameOver = false;
    announcedSynergyIds.clear();
    camera.x = 0;
    camera.y = 0;
  }

  // Advances one simulation step, including player control, bullets, enemies,
  // collisions, progression, and callback dispatch.
  function update(_dt: number) {
    if (!running || gameOver) return;

    // Keeps facing updates responsive while the game is paused or the level-up
    // overlay is blocking the rest of the simulation.
    if (paused || upgradeSystem.isLevelUp) {
      updatePlayerFacing(player, input, camera);
      return;
    }

    updatePlayer(player, input, camera);
    camera.follow(player.x, player.y);
    camera.updateShake();

    input.worldMouseX = camera.worldX(input.mouseX);
    input.worldMouseY = camera.worldY(input.mouseY);

    // Emits thrust particles from the ship tail whenever the player is moving.
    if (player.alive && (player.vx !== 0 || player.vy !== 0)) {
      const thrustAngle = Math.atan2(-player.vy, -player.vx);
      const spd = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
      const TAIL_OFFSET = 12;
      const tailX = player.x - Math.cos(player.angle) * TAIL_OFFSET;
      const tailY = player.y - Math.sin(player.angle) * TAIL_OFFSET;
      particles.thrust(
        tailX,
        tailY,
        thrustAngle,
        player.shipColor || "#00e5ff",
        spd
      );
    }

    waveManager.update(player, enemies);

    weaponSystem.update(player, enemies, bullets, particles);

    bullets.forEach((b) => {
      if (b.weaponId === "harpoon_tether") {
        b.active = false;
        return;
      }

      // Applies steering only to projectile types that continuously home in on targets.
      if (
        b.homing > 0 &&
        b.weaponId !== "gravity" &&
        b.weaponId !== "emp" &&
        b.weaponId !== "anchor" &&
        b.weaponId !== "harpoon"
      ) {
        let nearDist = Infinity;
        let nearX = b.x;
        let nearY = b.y;
        enemies.forEach((e) => {
          const d = (e.x - b.x) ** 2 + (e.y - b.y) ** 2;
          if (d < nearDist) {
            nearDist = d;
            nearX = e.x;
            nearY = e.y;
          }
        });
        updateHomingBullet(b, nearX, nearY);
      }

      // Keeps return-path weapons anchored to the player's live position rather
      // than the original cast point.
      if (b.weaponId === "boomerang" && b.returning) {
        b.originX = player.x;
        b.originY = player.y;
      }

      if (b.weaponId === "harpoon") {
        b.originX = player.x;
        b.originY = player.y;
      }

      if (b.weaponId === "rebound_orb") {
        let target: EnemyInstance | null = null;
        let bestDistSq = Infinity;

        // Prefers the existing rebound-orb lock when the target is still valid.
        if (b.targetId !== undefined) {
          enemies.forEach((e) => {
            if (!e.active || e.id !== b.targetId) return;
            const dx = e.x - b.x;
            const dy = e.y - b.y;
            const dSq = dx * dx + dy * dy;
            if (dSq <= 1700 * 1700) {
              target = e;
              bestDistSq = dSq;
            }
          });
        }

        // Reacquires the nearest valid target when the previous lock is lost.
        if (!target) {
          enemies.forEach((e) => {
            if (!e.active) return;
            const dx = e.x - b.x;
            const dy = e.y - b.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < bestDistSq && dSq <= 1700 * 1700) {
              bestDistSq = dSq;
              target = e;
            }
          });
        }

        if (target) {
          const lockedTarget = target as EnemyInstance;
          const baseSpeed = Math.max(1.6, b.speed);
          const dist = Math.sqrt(bestDistSq);
          const leadTime = Math.min(20, dist / Math.max(0.1, baseSpeed));
          const tx = lockedTarget.x + lockedTarget.vx * leadTime;
          const ty = lockedTarget.y + lockedTarget.vy * leadTime;

          const desired = Math.atan2(ty - b.y, tx - b.x);
          let angleDiff = desired - b.angle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          const maxTurn = dist < 120 ? 0.24 : 0.16;
          if (angleDiff > maxTurn) angleDiff = maxTurn;
          if (angleDiff < -maxTurn) angleDiff = -maxTurn;
          b.angle += angleDiff;

          // Reduces speed near the target so the rebound orb keeps a tighter orbit.
          const nearRadius = 96;
          const speedScale =
            dist < nearRadius ? Math.max(0.55, dist / nearRadius) : 1.06;

          b.vx = Math.cos(b.angle) * baseSpeed * speedScale;
          b.vy = Math.sin(b.angle) * baseSpeed * speedScale;
          b.targetId = lockedTarget.id;
        } else {
          b.targetId = undefined;
          b.vx *= 0.988;
          b.vy *= 0.988;
        }
      }

      if (b.weaponId === "vortex") {
        b.x = player.x;
        b.y = player.y;
      }

      updateBullet(b);
    });

    // Update beam endpoints from the player's current position every frame.
    updateLaserTracking(player, bullets, enemies, "laser", "laser");
    updateLaserTracking(player, bullets, enemies, "frost", "frost");
    updatePrismTracking(player, bullets, enemies);

    enemies.forEach((e) => {
      updateEnemy(e, player.x, player.y);

      // Boss phase tracking
      if (e.type === "derelict_boss" && e.active) {
        const phase = getBossPhase(e);
        if (e.phase !== phase) {
          e.phase = phase;
          const config = getBossPhaseConfig(phase);
          e.projectileCooldown = config.shotCooldown;
          if (config.spawnMinions) {
            for (let i = 0; i < config.minionCount; i++) {
              const minion = enemies.acquire();
              if (!minion) break;
              const mDef = getEnemyDef(config.minionType as any);
              const angle = Math.random() * Math.PI * 2;
              initEnemy(
                minion,
                config.minionType as any,
                e.x + Math.cos(angle) * 80,
                e.y + Math.sin(angle) * 80,
                mDef.baseHp,
                mDef.speed,
                mDef.radius,
                mDef.damage,
                mDef.xpValue,
                mDef.color,
                {
                  projectile: mDef.projectile,
                  projectileCooldown: mDef.projectileCooldown,
                }
              );
            }
          }
        }

        // Boss turret shots
        if (shouldShoot(e)) {
          const config = getBossPhaseConfig(e.phase || 0);
          const turrets = getTurretPositions(
            e.x,
            e.y,
            e.radius,
            config.turretCount,
            Date.now() * 0.001
          );
          for (const turret of turrets) {
            const b = bullets.acquire();
            if (!b) break;
            const angleToPlayer = Math.atan2(
              player.y - turret.y,
              player.x - turret.x
            );
            initBullet(
              b,
              turret.x,
              turret.y,
              angleToPlayer,
              3,
              12,
              180,
              "#ff3a8c",
              { isEnemy: true }
            );
          }
        }
      }

      // Regular enemy shooting
      if (e.type !== "derelict_boss" && shouldShoot(e)) {
        const b = bullets.acquire();
        if (b) {
          const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
          initBullet(b, e.x, e.y, angleToPlayer, 3, 8, 140, "#ff4444", {
            isEnemy: true,
          });
        }
      }

      // Remove enemies that are too far away
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      if (dx * dx + dy * dy > 2200 * 2200 && e.type !== "derelict_boss") {
        e.active = false;
      }
    });

    // Track gravity wells for rendering
    gravityWells.length = 0;
    bullets.forEach((b) => {
      if (b.weaponId === "gravity" && b.active) {
        gravityWells.push({
          x: b.x,
          y: b.y,
          radius: b.aoe,
          life: b.life,
          maxLife: b.maxLife,
          traveling: b.homing > 0,
          weaponId: b.weaponId,
        });
      }
    });

    // Update Aegis Constellation runtime once per frame (shared by collision + render).
    const frameSynergies = getActiveSynergies(
      player.weapons,
      player.passives,
      player.forcedSynergies
    );
    for (const syn of frameSynergies) {
      if (announcedSynergyIds.has(syn.id)) continue;
      announcedSynergyIds.add(syn.id);
      callbacksRef.current.onSynergyUnlocked?.({
        id: syn.id,
        name: syn.name,
        description: syn.description,
        color: syn.color,
      });
    }
    if (frameSynergies.some((s) => s.effect === "aegis_constellation")) {
      const enemyList: EnemyInstance[] = [];
      enemies.forEach((e) => {
        if (e.active) enemyList.push(e);
      });
      updateAegisConstellationRuntime(player, enemyList, Date.now());
    } else {
      clearAegisConstellationRuntime(player);
    }

    // Collisions
    collisionSystem.update(
      player,
      enemies,
      bullets,
      pickups,
      particles,
      renderer,
      camera,
      waveManager.elapsedSeconds,
      {
        enemyKilled: (enemy) => {
          player.kills++;
          player.score += enemy.xpValue * 10;

          if (enemy.type === "derelict_boss") {
            callbacksRef.current.onIntelFragment?.({ reason: "boss" });
          }

          if (enemy.splits && enemy.splitCount) {
            const splitDef = getEnemyDef(enemy.splits);
            for (let i = 0; i < enemy.splitCount; i++) {
              const child = enemies.acquire();
              if (!child) break;
              const angle =
                (i / enemy.splitCount) * Math.PI * 2 + Math.random() * 0.5;
              initEnemy(
                child,
                enemy.splits,
                enemy.x + Math.cos(angle) * 15,
                enemy.y + Math.sin(angle) * 15,
                splitDef.baseHp,
                splitDef.speed,
                splitDef.radius,
                splitDef.damage,
                splitDef.xpValue,
                splitDef.color,
                { splits: splitDef.splits, splitCount: splitDef.splitCount }
              );
            }
          }
        },
        playerHit: (_damage) => {},
        playerDied: () => {
          gameOver = true;
          running = false;
          callbacksRef.current.onGameOver?.({
            score: player.score,
            time: waveManager.elapsedSeconds,
            level: player.level,
            kills: player.kills,
            debris: player.debrisCollected,
            weapons: player.weapons.map((w) => w.id),
          });
        },
        pickupCollected: (kind, value) => {
          if (kind === "xp") {
            player.xp += Math.floor(value * player.xpMult);
            player.score += value;
          } else if (kind === "hp") {
            player.hp = Math.min(player.maxHp, player.hp + value);
          } else if (kind === "debris") {
            player.debrisCollected += value;
            player.score += value * 50;
          }
        },
      }
    );

    // Particles
    particles.update(camera);

    // Orbital/drone weapon rendering particles
    for (const weapon of player.weapons) {
      if (weapon.id === "orbital" || weapon.id === "drone") {
        const stats = getWeaponLevel(weapon.id, weapon.level);
        const orbCount = stats.projectiles;
        const orbRadius = stats.range;
        const time = Date.now() * 0.002 * stats.speed;
        const pColor = weapon.id === "orbital" ? "#b44aff" : "#00bcd4";
        for (let i = 0; i < orbCount; i++) {
          const angle = time + (i / orbCount) * Math.PI * 2;
          const ox = player.x + Math.cos(angle) * orbRadius;
          const oy = player.y + Math.sin(angle) * orbRadius;
          particles.emit(ox, oy, 1, pColor, {
            speedMin: 0,
            speedMax: 0.5,
            life: 5,
            sizeMin: 2,
            sizeMax: 3,
          });
        }
      }
    }
    const combatSynergies = getActiveSynergies(
      player.weapons,
      player.passives,
      player.forcedSynergies
    );
    const hasAegisConstellation = combatSynergies.some(
      (s) => s.effect === "aegis_constellation"
    );
    if (hasAegisConstellation) {
      const nodes = getAegisConstellationNodes(player);
      for (const node of nodes) {
        const color = node.lockRatio > 0.2 ? "#cfffff" : "#8ee9ff";
        particles.emit(node.x, node.y, 1, color, {
          speedMin: 0.12,
          speedMax: 0.9,
          life: 8,
          sizeMin: 1.2,
          sizeMax: 2.6,
        });
      }
    }

    // Level-up check
    if (upgradeSystem.checkLevelUp(player)) {
      particles.levelUp(player.x, player.y);
      callbacksRef.current.onLevelUp?.(upgradeSystem.pendingChoices);
    }

    // Stats broadcast (throttled to 10fps)
    statsThrottle++;
    if (statsThrottle >= 6) {
      statsThrottle = 0;

      // Gather active synergies for HUD
      const activeSynergies = combatSynergies;
      const guardThreshold = damageGuardThresholdForElapsedSec(
        waveManager.elapsedSeconds
      );

      callbacksRef.current.onStatsUpdate?.({
        hp: player.hp,
        maxHp: player.maxHp,
        invincibleFrames: player.invincibleFrames,
        xp: player.xp,
        xpNeeded: xpForLevel(player.level),
        level: player.level,
        score: player.score,
        time: waveManager.elapsedSeconds,
        wave: waveManager.waveNumber,
        enemyCount: enemies.activeCount,
        debrisCollected: player.debrisCollected,
        kills: player.kills,
        weapons: player.weapons.map((w) => {
          const def = getWeapon(w.id);
          return {
            id: w.id,
            name: def.name,
            level: w.level,
            maxLevel: def.maxLevel,
            color: def.color,
            rarity: def.rarity,
            icon: def.icon,
          };
        }),
        passives: Array.from(player.passives.entries()).map(([id, level]) => ({
          id,
          level,
        })),
        synergies: activeSynergies.map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color,
        })),
        guard: {
          accum: player.damageWindowAccum,
          threshold: guardThreshold,
          pct: Math.min(
            1,
            player.damageWindowAccum / Math.max(1, guardThreshold)
          ),
          windowFrames: player.damageWindowFrames,
        },
        fps: 0,
      });
    }
  }

  // Helper: update laser-type beam tracking (laser, frost)
  function updateLaserTracking(
    p: PlayerState,
    bPool: ObjectPool<BulletInstance>,
    ePool: ObjectPool<EnemyInstance>,
    weaponId: string,
    beamWeaponId: string
  ) {
    const laserWeapon = p.weapons.find((w) => w.id === weaponId);
    if (!laserWeapon) return;

    const laserRange = getWeaponLevel(weaponId as any, laserWeapon.level).range;
    const laserRangeSq = laserRange * laserRange;
    const activeLasers: BulletInstance[] = [];
    bPool.forEach((b) => {
      if (b.active && b.isLaser && b.weaponId === beamWeaponId)
        activeLasers.push(b);
    });
    if (activeLasers.length === 0) return;

    // Builds a lookup table of live enemy positions so beam-style weapons can retarget by enemy ID without repeated scans.
    const enemyPos = new Map<number, { x: number; y: number }>();
    ePool.forEach((e) => enemyPos.set(e.id, { x: e.x, y: e.y }));

    for (let i = 0; i < activeLasers.length; i++) {
      const b = activeLasers[i];
      b.x = p.x;
      b.y = p.y;

      const target =
        b.targetId !== undefined ? enemyPos.get(b.targetId) : undefined;

      if (target) {
        const a = Math.atan2(target.y - p.y, target.x - p.x);
        b.angle = a;
        b.endX = target.x;
        b.endY = target.y;
      } else {
        // Target is gone (dead/despawned) — end this beam and let CD count
        b.active = false;
      }
    }
  }

  function render(_alpha: number, fps: number) {
    const w = camera.width;
    const h = camera.height;

    renderer.clear(w, h);
    renderer.renderStars(camera);
    renderer.renderGravityWells(gravityWells, camera);
    renderer.renderPickups(pickups, camera);
    renderer.renderEnemies(enemies, camera);
    renderer.renderBullets(bullets, camera);
    renderer.renderPlayer(player, camera);
    renderer.renderParticles(particles.particles);

    // Orbital/drone orb rendering
    for (const weapon of player.weapons) {
      if ((weapon.id === "orbital" || weapon.id === "drone") && player.alive) {
        const stats = getWeaponLevel(weapon.id, weapon.level);
        const orbCount = stats.projectiles;
        const orbRadius = stats.range;
        const time = Date.now() * 0.002 * stats.speed;
        for (let i = 0; i < orbCount; i++) {
          const angle = time + (i / orbCount) * Math.PI * 2;
          const sx = camera.screenX(player.x + Math.cos(angle) * orbRadius);
          const sy = camera.screenY(player.y + Math.sin(angle) * orbRadius);
          const color = weapon.id === "orbital" ? "#b44aff" : "#00bcd4";
          const orbSize = 6;
          drawCircle(ctx, sx, sy, orbSize, color, 2, `${color}44`, color);
        }
      }
    }
    const renderSynergies = getActiveSynergies(
      player.weapons,
      player.passives,
      player.forcedSynergies
    );
    if (
      player.alive &&
      renderSynergies.some((s) => s.effect === "aegis_constellation")
    ) {
      const now = Date.now();
      const nodes = getAegisConstellationNodes(player);
      const pulse = 0.8 + 0.2 * Math.sin(now * 0.0052);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      // No link lines. Render each node as an ion drone with bloom + motion wake.
      for (const n of nodes) {
        const sx = camera.screenX(n.x);
        const sy = camera.screenY(n.y);
        const tx = n.dirX;
        const ty = n.dirY;
        const nodeR = 6 + n.lockRatio * 2.2;
        const tailLen = Math.max(
          7,
          Math.min(24, n.speed * 0.05 + n.lockRatio * 11)
        );

        // Soft halo
        const halo = ctx.createRadialGradient(
          sx,
          sy,
          nodeR * 0.4,
          sx,
          sy,
          nodeR * (3 + n.lockRatio)
        );
        halo.addColorStop(0, `rgba(226,255,255,${0.34 + n.lockRatio * 0.2})`);
        halo.addColorStop(0.42, "rgba(127,247,255,0.22)");
        halo.addColorStop(1, "transparent");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(sx, sy, nodeR * (3 + n.lockRatio), 0, Math.PI * 2);
        ctx.fill();

        // Particle wake (not a stroke line): layered ion dust trail.
        const trailSteps = 5;
        for (let k = 1; k <= trailSteps; k++) {
          const tStep = k / trailSteps;
          const px = sx - tx * tailLen * tStep;
          const py = sy - ty * tailLen * tStep;
          const alpha = (1 - tStep) * (0.24 + n.lockRatio * 0.2);
          const pr = Math.max(0.85, nodeR * 0.44 * (1 - tStep * 0.62));
          drawCircle(
            ctx,
            px,
            py,
            pr,
            `rgba(205,255,255,${alpha})`,
            0,
            `rgba(127,247,255,${alpha * 0.66})`,
            `rgba(127,247,255,${alpha})`
          );
        }

        // Energy shell
        drawCircle(
          ctx,
          sx,
          sy,
          nodeR,
          "#eaffff",
          1.35,
          "rgba(127,247,255,0.18)",
          "#7ff7ff"
        );
        // Core
        drawCircle(
          ctx,
          sx,
          sy,
          Math.max(2.1, nodeR * 0.46 * pulse),
          "#ffffff",
          1.1,
          "rgba(219,255,255,0.9)",
          "#d9ffff"
        );
      }
      ctx.restore();
    }

    renderer.renderEffects(w, h);
  }

  // Prism: persistent lock beam + refracted rainbow branch beams from lock point.
  function updatePrismTracking(
    p: PlayerState,
    bPool: ObjectPool<BulletInstance>,
    ePool: ObjectPool<EnemyInstance>
  ) {
    const prismWeapon = p.weapons.find((w) => w.id === "prism");
    if (!prismWeapon) return;

    const stats = getWeaponLevel("prism", prismWeapon.level);
    const rangeSq = stats.range * stats.range;
    const branchCount = Math.max(0, Math.min(7, Math.floor(stats.special)));
    const branchReach = Math.max(180, Math.min(360, stats.range * 0.32));
    const branchColors = [
      "#ff3a3a",
      "#ff7f24",
      "#ffee00",
      "#39ff7f",
      "#00e5ff",
      "#4f6bff",
      "#b44aff",
    ];

    const enemiesList: EnemyInstance[] = [];
    ePool.forEach((e) => {
      if (!e.active) return;
      enemiesList.push(e);
    });

    let nearestInRange: EnemyInstance | undefined;
    let nearestDistSq = Infinity;
    for (const e of enemiesList) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dSq = dx * dx + dy * dy;
      if (dSq <= rangeSq && dSq < nearestDistSq) {
        nearestInRange = e;
        nearestDistSq = dSq;
      }
    }

    const activePrisms: BulletInstance[] = [];
    bPool.forEach((b) => {
      if (b.active && b.isLaser && b.weaponId === "prism") activePrisms.push(b);
    });

    const desiredCount = Math.max(1, stats.projectiles);
    while (activePrisms.length < desiredCount) {
      const nb = bPool.acquire();
      if (!nb) break;
      initBullet(
        nb,
        p.x,
        p.y,
        p.angle,
        0,
        stats.damage * p.damageMult,
        6,
        "#ff6bef",
        {
          pierce: stats.pierce,
          isLaser: true,
          width: 3,
          weaponId: "prism",
          splitCount: stats.special,
        }
      );
      nb.prismBranches = [];
      activePrisms.push(nb);
    }

    bPool.forEach((b) => {
      if (!(b.active && b.isLaser && b.weaponId === "prism")) return;

      b.x = p.x;
      b.y = p.y;

      const target = nearestInRange;

      if (!target) {
        b.active = false;
        return;
      }

      // Prism beams always snap to the nearest target in range.
      b.targetId = target.id;

      b.life = Math.max(b.life, 3);
      b.maxLife = Math.max(b.maxLife, 3);
      b.angle = Math.atan2(target.y - p.y, target.x - p.x);
      b.endX = target.x;
      b.endY = target.y;

      const candidates = enemiesList
        .filter((e) => e.id !== target.id)
        .map((e) => {
          const dx = e.x - target.x;
          const dy = e.y - target.y;
          return { e, dSq: dx * dx + dy * dy };
        })
        .filter((it) => it.dSq <= branchReach * branchReach)
        .sort((a, b_) => a.dSq - b_.dSq);

      const take = Math.min(branchCount, candidates.length);
      b.prismBranches = [];
      for (let i = 0; i < take; i++) {
        const t = candidates[i].e;
        b.prismBranches.push({
          x: t.x,
          y: t.y,
          color: branchColors[i % branchColors.length],
        });
      }
    });
  }

  return {
    update,
    render,
    reset,
    chooseUpgrade(index: number) {
      upgradeSystem.applyChoice(player, index);
    },
    rerollUpgradeChoices() {
      if (upgradeSystem.rerollChoices(player)) {
        callbacksRef.current.onLevelUp?.(upgradeSystem.pendingChoices);
      }
    },
    setPaused(p: boolean) {
      paused = p;
      callbacksRef.current.onPause?.(p);
    },
    togglePause() {
      paused = !paused;
      callbacksRef.current.onPause?.(paused);
    },
    get isRunning() {
      return running;
    },
    get isLevelUp() {
      return upgradeSystem.isLevelUp;
    },
    get isPaused() {
      return paused;
    },
  };
}

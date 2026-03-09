// Resolves all runtime interactions between bullets, enemies, the player,
// pickups, persistent weapon fields, and synergy-specific effects.
import { SpatialHash } from "../engine/SpatialHash";
import { ObjectPool } from "../engine/ObjectPool";
import type { PlayerState } from "../entities/Player";
import { damagePlayer } from "../entities/Player";
import { type EnemyInstance, damageEnemy } from "../entities/Enemy";
import type { BulletInstance } from "../entities/Bullet";
import { initBullet } from "../entities/Bullet";
import {
  type PickupInstance,
  updatePickup,
  initPickup,
} from "../entities/Pickup";
import type { ParticleSystem } from "./ParticleSystem";
import type { Camera } from "../engine/Camera";
import type { Renderer } from "../rendering/Renderer";
import { getWeaponLevel as getWeaponLevelFn } from "@/lib/game/weapons";
import { getActiveSynergies } from "@/lib/game/synergies";
import { getAegisConstellationNodes } from "./fusionOrbitals";

export interface CollisionEvents {
  enemyKilled: (enemy: EnemyInstance) => void;
  playerHit: (damage: number) => void;
  playerDied: () => void;
  pickupCollected: (kind: string, value: number) => void;
}

export class CollisionSystem {
  private hash = new SpatialHash();
  private lastUpdateMs = 0;
  private lastPlayerX = 0;
  private lastPlayerY = 0;
  private hasLastPlayerPos = false;

  // Rebuilds the spatial index, resolves all collision categories, and emits
  // gameplay events such as kills, pickups, and player damage.
  update(
    player: PlayerState,
    enemies: ObjectPool<EnemyInstance>,
    bullets: ObjectPool<BulletInstance>,
    pickups: ObjectPool<PickupInstance>,
    particles: ParticleSystem,
    renderer: Renderer,
    camera: Camera,
    elapsedSec: number,
    events: CollisionEvents
  ): void {
    const nowMs = Date.now();
    const frameMs =
      this.lastUpdateMs > 0
        ? Math.max(8, Math.min(50, nowMs - this.lastUpdateMs))
        : 16.67;
    this.lastUpdateMs = nowMs;
    const prevPlayerX = this.hasLastPlayerPos ? this.lastPlayerX : player.x;
    const prevPlayerY = this.hasLastPlayerPos ? this.lastPlayerY : player.y;

    // Rebuilds the spatial hash each frame so projectile queries stay localized.
    this.hash.clear();
    enemies.forEach((e) => {
      this.hash.insert(e as any);
    });

    // Resolves all player-owned projectiles against enemies.
    bullets.forEach((bullet) => {
      if (bullet.isEnemy || !bullet.active) return;
      if (bullet.collisionDelay > 0) return;

      const wid = bullet.weaponId || "";

      // Handles beam-style weapons separately because they use segment tests instead of point hits.
      if (
        bullet.isLaser &&
        bullet.endX !== undefined &&
        bullet.endY !== undefined
      ) {
        this.checkLaserHits(
          bullet,
          enemies,
          particles,
          pickups,
          player,
          events,
          bullets
        );
        return;
      }

      // Resolves gravity-well pull and damage-over-time behavior.
      if (wid === "gravity") {
        this.checkGravityWell(
          bullet,
          enemies,
          particles,
          pickups,
          player,
          events
        );
        return;
      }

      // Resolves Temporal Anchor rewind and delayed explosion behavior.
      if (wid === "anchor") {
        this.checkTemporalAnchor(
          bullet,
          enemies,
          particles,
          pickups,
          player,
          events
        );
        return;
      }

      // Resolves node and edge damage for the Thunder Lattice field.
      if (wid === "lattice") {
        this.checkThunderLattice(
          bullet,
          enemies,
          particles,
          pickups,
          player,
          events
        );
        return;
      }

      // Resolves the Relay Overclock seed pulse and later chained propagation.
      if (wid === "relay_overclock") {
        this.checkRelayOverclock(
          bullet,
          enemies,
          particles,
          pickups,
          player,
          events
        );
        return;
      }

      // Resolves persistent rebound orb area damage.
      if (wid === "rebound_orb") {
        this.checkReboundOrb(
          bullet,
          enemies,
          particles,
          pickups,
          player,
          events
        );
        return;
      }

      // Resolves the EMP burst as an area damage and stun event.
      if (wid === "emp") {
        this.checkAOEBurst(bullet, enemies, particles, pickups, player, events);
        return;
      }

      // Resolves expanding-ring style damage for nova, vortex, and similar burst effects.
      if (wid === "nova" || wid === "vortex" || wid === "siege_burst") {
        this.checkExpandingRing(
          bullet,
          enemies,
          particles,
          pickups,
          player,
          events
        );
        return;
      }

      // Resolves the Chrono field's slowing and damage-over-time behavior.
      if (wid === "chrono") {
        this.checkChronoField(
          bullet,
          enemies,
          particles,
          pickups,
          player,
          events
        );
        return;
      }

      // Falls back to standard projectile-vs-enemy collision for non-field weapons.
      const isHarpoon = wid === "harpoon";
      const candidates: EnemyInstance[] = [];
      if (isHarpoon) {
        enemies.forEach((e) => {
          if (e.active) candidates.push(e);
        });
      } else {
        const nearby = this.hash.query(bullet.x, bullet.y, 30);
        for (const n of nearby) candidates.push(n as unknown as EnemyInstance);
      }

      for (const enemy of candidates) {
        if (!enemy.active || (!isHarpoon && bullet.hitIds.has(enemy.id)))
          continue;

        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const cableDist = isHarpoon
          ? pointToSegmentDist(
              enemy.x,
              enemy.y,
              bullet.originX,
              bullet.originY,
              bullet.x,
              bullet.y
            )
          : Infinity;
        const tipHit = dist < enemy.radius + (isHarpoon ? 11 : 4);
        const cableHit = isHarpoon && cableDist < enemy.radius + 10;

        if (tipHit || cableHit) {
          if (isHarpoon) {
            // Keeps the outbound harpoon inert so only the return pass can pull and damage targets.
            if (!bullet.returning) continue;

            // Prevents dragged enemies from being pulled directly into guaranteed player-contact damage range.
            const safeRadius = 96 + enemy.radius;
            const toPlayerX = enemy.x - player.x;
            const toPlayerY = enemy.y - player.y;
            const toPlayerDist = Math.hypot(toPlayerX, toPlayerY);
            // Applies pull only when the hook head is in contact and the target is still outside the safety radius.
            if (tipHit && toPlayerDist >= safeRadius) {
              const pdx = bullet.x - enemy.x;
              const pdy = bullet.y - enemy.y;
              const pd = Math.max(1, Math.hypot(pdx, pdy));
              const pullForce =
                8.5 + Math.min(4, (bullet.stunDuration || 40) * 0.05);
              enemy.x += (pdx / pd) * pullForce;
              enemy.y += (pdy / pd) * pullForce;
            }
            enemy.stunFrames = Math.max(
              enemy.stunFrames,
              Math.floor((bullet.stunDuration || 36) * 0.35)
            );

            // Applies periodic damage during the return phase instead of an initial burst on tether creation.
            if (bullet.life % 4 !== 0) continue;

            let hdmg = bullet.damage * 0.3;
            if (Math.random() < player.critChance) hdmg *= 2;
            const hkilled = damageEnemy(enemy, hdmg);
            particles.explode(
              enemy.x,
              enemy.y,
              enemy.color,
              hkilled ? 12 : 4,
              hkilled ? 3 : 2
            );
            if (hkilled) {
              this.onEnemyKilled(enemy, pickups, player, events);
            }
            continue;
          }

          bullet.hitIds.add(enemy.id);

          let dmg = bullet.damage;
          const isCrit = Math.random() < player.critChance;
          if (isCrit) dmg *= 2;

          // Applies the frost slow effect on projectile impact.
          if (bullet.slowAmount > 0) {
            enemy.stunFrames = Math.max(enemy.stunFrames, 15);
          }

          // Applies the configured stun duration for stun-capable projectiles.
          if (bullet.stunDuration > 0) {
            enemy.stunFrames = Math.max(enemy.stunFrames, bullet.stunDuration);
          }

          // Forces Siege rounds to detonate on first contact rather than continuing through the target.
          if (wid === "siege") {
            this.splashDamage(
              bullet.x,
              bullet.y,
              bullet.aoe,
              dmg,
              enemies,
              particles,
              pickups,
              player,
              events
            );
            this.spawnSiegeShockwave(bullet.x, bullet.y, bullet.aoe, bullets);
            particles.explode(bullet.x, bullet.y, "#4fc3f7", 34, 7);
            particles.emit(bullet.x, bullet.y, 20, "#ddf4ff", {
              speedMin: 2,
              speedMax: 6,
              sizeMin: 1,
              sizeMax: 3,
              life: 18,
            });
            bullet.active = false;
            break;
          }

          const killed = damageEnemy(enemy, dmg);
          particles.explode(
            enemy.x,
            enemy.y,
            enemy.color,
            killed ? 15 : 5,
            killed ? 4 : 2
          );

          if (killed) {
            this.onEnemyKilled(enemy, pickups, player, events);
          }

          // Triggers Fission Pulse child projectiles immediately on hit.
          if (bullet.weaponId === "pulse" && bullet.splitCount > 0) {
            this.fissionSplit(bullet, enemy, bullets, player, particles);
          }

          // Retargets ricochet projectiles after impact, even if the first target dies.
          if (bullet.bounces > 0) {
            this.ricochetBounce(bullet, enemy, enemies);
          }

          // Applies splash damage for projectiles that carry an area radius.
          if (bullet.aoe > 0 && wid !== "gravity") {
            this.splashDamage(
              bullet.x,
              bullet.y,
              bullet.aoe,
              bullet.damage * 0.5,
              enemies,
              particles,
              pickups,
              player,
              events
            );
          }

          bullet.pierce--;
          if (bullet.pierce <= 0 && bullet.bounces <= 0) {
            bullet.active = false;
            break;
          }
          if (bullet.bounces > 0) break; // bounced to new target
        }
      }
    });

    // Resolves enemy projectile hits against the player.
    bullets.forEach((bullet) => {
      if (!bullet.isEnemy || !bullet.active || !player.alive) return;

      const dx = bullet.x - player.x;
      const dy = bullet.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 14) {
        bullet.active = false;
        const died = damagePlayer(player, bullet.damage, elapsedSec);
        events.playerHit(bullet.damage);
        renderer.effects.damagePulse();
        camera.shake(5);
        if (died) events.playerDied();
      }
    });

    // Resolves direct enemy-body contact damage against the player.
    enemies.forEach((e) => {
      if (!player.alive || player.invincibleFrames > 0) return;

      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < e.radius + 12) {
        const died = damagePlayer(player, e.damage, elapsedSec);
        events.playerHit(e.damage);
        renderer.effects.damagePulse();
        camera.shake(8);
        if (died) events.playerDied();
      }
    });

    // Resolves contact damage for orbital weapons and drones that circle the player.
    for (const weapon of player.weapons) {
      if (weapon.id !== "orbital" && weapon.id !== "drone") continue;
      const stats = getWeaponLevelFn(weapon.id, weapon.level);
      const orbCount = stats.projectiles;
      const orbRadius = stats.range;
      const orbDamage = stats.damage * player.damageMult;
      const orbSpeed = stats.speed;
      const time = nowMs * 0.002 * orbSpeed;
      const prevTime = (nowMs - frameMs) * 0.002 * orbSpeed;
      const hitRadius = weapon.id === "orbital" ? 10 : 12;
      const contactDamageScale = weapon.id === "orbital" ? 0.16 : 0.14;

      for (let i = 0; i < orbCount; i++) {
        const angle = time + (i / orbCount) * Math.PI * 2;
        const prevAngle = prevTime + (i / orbCount) * Math.PI * 2;
        const ox = player.x + Math.cos(angle) * orbRadius;
        const oy = player.y + Math.sin(angle) * orbRadius;
        const px = prevPlayerX + Math.cos(prevAngle) * orbRadius;
        const py = prevPlayerY + Math.sin(prevAngle) * orbRadius;

        enemies.forEach((e) => {
          if (!e.active) return;
          const hitThreshold = e.radius + hitRadius;
          const dx = ox - e.x;
          const dy = oy - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const sweptDist = pointToSegmentDist(e.x, e.y, px, py, ox, oy);

          if (dist <= hitThreshold || sweptDist <= hitThreshold) {
            const killed = damageEnemy(e, orbDamage * contactDamageScale);
            if (killed) {
              particles.explode(e.x, e.y, e.color, 15, 4);
              this.onEnemyKilled(e, pickups, player, events);
            }
          }
        });
      }
    }

    // Resolves the Aegis Drone Constellation fusion by sweeping each orbit node against nearby enemies.
    const activeSynergies = getActiveSynergies(
      player.weapons,
      player.passives,
      player.forcedSynergies
    );
    const hasAegisConstellation = activeSynergies.some(
      (s) => s.effect === "aegis_constellation"
    );
    if (hasAegisConstellation) {
      const nodesNow = getAegisConstellationNodes(player);

      const hitRadius = 14;
      const contactDamage = 26 * player.damageMult * 0.24;

      for (let i = 0; i < nodesNow.length; i++) {
        const nx = nodesNow[i].x;
        const ny = nodesNow[i].y;
        const px = nodesNow[i].px ?? nx;
        const py = nodesNow[i].py ?? ny;

        enemies.forEach((e) => {
          if (!e.active) return;
          const hitThreshold = e.radius + hitRadius;
          const dx = nx - e.x;
          const dy = ny - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const sweptDist = pointToSegmentDist(e.x, e.y, px, py, nx, ny);
          if (dist <= hitThreshold || sweptDist <= hitThreshold) {
            const killed = damageEnemy(e, contactDamage);
            if (killed) {
              particles.explode(e.x, e.y, "#7ff7ff", 17, 4);
              this.onEnemyKilled(e, pickups, player, events);
            }
          }
        });
      }
    }

    // Advances delayed explosions for enemies suspended inside temporal bubbles.
    this.processTemporalBubbles(enemies, particles, pickups, player, events);

    // Resolves pickup collection once items enter the player's collection radius.
    pickups.forEach((p) => {
      const collected = updatePickup(
        p,
        player.x,
        player.y,
        player.pickupRadius
      );
      if (collected) {
        events.pickupCollected(p.kind, p.value);
        particles.sparkle(
          player.x,
          player.y,
          p.kind === "xp" ? "#39ff7f" : p.kind === "hp" ? "#ff3a8c" : "#ffcc00"
        );
      }
    });

    this.lastPlayerX = player.x;
    this.lastPlayerY = player.y;
    this.hasLastPlayerPos = true;
  }

  // Resolves beam-style collision by testing enemies against the beam segment and optional prism branches.
  private checkLaserHits(
    bullet: BulletInstance,
    enemies: ObjectPool<EnemyInstance>,
    particles: ParticleSystem,
    pickups: ObjectPool<PickupInstance>,
    player: PlayerState,
    events: CollisionEvents,
    bullets: ObjectPool<BulletInstance>
  ): void {
    const wid = bullet.weaponId || "";
    const isPrism = wid === "prism";
    const isMirror = false;
    // Clears hit tracking for persistent prism beams so the same target can take repeated damage ticks.
    if (isPrism || isMirror) {
      bullet.hitIds.clear();
    }
    let hitCount = 0;
    enemies.forEach((e) => {
      if (hitCount >= bullet.pierce || bullet.hitIds.has(e.id)) return;

      const dist = pointToSegmentDist(
        e.x,
        e.y,
        bullet.x,
        bullet.y,
        bullet.endX!,
        bullet.endY!
      );

      if (dist < e.radius + (bullet.width || 2)) {
        bullet.hitIds.add(e.id);
        hitCount++;

        let dmg = bullet.damage;
        if (Math.random() < player.critChance) dmg *= 2;

        if (bullet.stunDuration > 0) {
          enemy_stun(e, bullet.stunDuration);
        }

        if (bullet.slowAmount > 0) {
          enemy_stun(e, 20);
        }

        const killed = damageEnemy(e, dmg);
        if (killed) {
          particles.explode(e.x, e.y, e.color, 15, 4);
          this.onEnemyKilled(e, pickups, player, events);
        }
      }
    });

    // Resolves prism branch beams that refract from the main lock target to nearby enemies.
    if (
      (isPrism || isMirror) &&
      bullet.endX !== undefined &&
      bullet.endY !== undefined &&
      bullet.prismBranches.length > 0
    ) {
      enemies.forEach((e) => {
        if (bullet.hitIds.has(e.id)) return;

        let hitByBranch = false;
        for (const branch of bullet.prismBranches) {
          const d = pointToSegmentDist(
            e.x,
            e.y,
            bullet.endX!,
            bullet.endY!,
            branch.x,
            branch.y
          );
          if (d < e.radius + Math.max(1.5, (bullet.width || 2) * 0.75)) {
            hitByBranch = true;
            break;
          }
        }
        if (!hitByBranch) return;

        bullet.hitIds.add(e.id);
        let dmg = bullet.damage * 0.62;
        if (Math.random() < player.critChance) dmg *= 2;

        const killed = damageEnemy(e, dmg);
        if (killed) {
          particles.explode(e.x, e.y, e.color, 13, 3);
          this.onEnemyKilled(e, pickups, player, events);
        }
      });
    }

    if (isPrism) {
      // Re-arms prism beam collision frequently enough to behave like a continuous damage source.
      bullet.collisionDelay = 3;
    }
  }

  // Resolves the Temporal Anchor field by selecting enemies inside the radius,
  // rewinding them, and arming their delayed bubble explosion.
  private checkTemporalAnchor(
    bullet: BulletInstance,
    enemies: ObjectPool<EnemyInstance>,
    particles: ParticleSystem,
    pickups: ObjectPool<PickupInstance>,
    player: PlayerState,
    events: CollisionEvents
  ): void {
    if (bullet.homing > 0) return;
    const radius = bullet.aoe;
    // Runs the rewind-and-bubble sequence only once for each spawned anchor field.
    if (bullet.executeThreshold > 0) return;
    bullet.executeThreshold = 1;

    particles.explode(bullet.x, bullet.y, "#b7d0ff", 30, 6);

    const LOOKBACK_FRAMES = 120; // 2 seconds @ 60fps
    const REWIND_FRAMES = 20;
    const BUBBLE_DELAY_FRAMES = 36;

    enemies.forEach((e) => {
      const dx = bullet.x - e.x;
      const dy = bullet.y - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) return;

      const currentIdx = Math.max(0, e.trail.length - 1);
      const targetIdx = Math.max(0, currentIdx - LOOKBACK_FRAMES);
      const span = Math.max(1, currentIdx - targetIdx);
      const stride = span / REWIND_FRAMES;

      e.temporalPathCursor = currentIdx;
      e.temporalPathTarget = targetIdx;
      e.temporalPathStride = Math.max(1, stride);
      e.temporalRewindFrames = REWIND_FRAMES;
      e.temporalBubbleFrames = BUBBLE_DELAY_FRAMES;
      e.temporalExplosionRadius = Math.max(34, radius * 0.28);
      e.temporalExplosionDamage =
        bullet.damage * (1.95 + (1 - dist / Math.max(1, radius)) * 0.95);
      e.stunFrames = Math.max(
        e.stunFrames,
        REWIND_FRAMES + BUBBLE_DELAY_FRAMES + 8
      );

      particles.emit(e.x, e.y, 12, "#a8c6ff", {
        speedMin: 0.4,
        speedMax: 2.1,
        sizeMin: 1,
        sizeMax: 3,
        life: 20,
      });
    });
  }

  // Resolves Thunder Lattice node pulses and edge hits across the complete graph.
  private checkThunderLattice(
    bullet: BulletInstance,
    enemies: ObjectPool<EnemyInstance>,
    particles: ParticleSystem,
    pickups: ObjectPool<PickupInstance>,
    player: PlayerState,
    events: CollisionEvents
  ): void {
    const nodeRadius = bullet.aoe * 0.3;
    const wireThickness = Math.max(4.5, bullet.aoe * 0.05);
    const tickNow = bullet.life % 6 === 0;
    enemies.forEach((e) => {
      const dNode = Math.hypot(e.x - bullet.x, e.y - bullet.y);
      const nodeHit = dNode <= nodeRadius + e.radius;
      let wireHit = false;
      if (!nodeHit) {
        for (const br of bullet.prismBranches) {
          // Evaluates each lattice edge once so complete-graph links do not double-apply damage.
          if (br.id !== undefined && bullet.executeThreshold >= br.id) continue;
          const dSeg = pointToSegmentDist(
            e.x,
            e.y,
            bullet.x,
            bullet.y,
            br.x,
            br.y
          );
          if (dSeg < e.radius + wireThickness) {
            wireHit = true;
            break;
          }
        }
      }
      if (!nodeHit && !wireHit) return;
      if (!tickNow) return;

      const scale = nodeHit ? 0.22 : 0.13;
      const killed = damageEnemy(e, bullet.damage * scale);
      if (killed) {
        particles.explode(e.x, e.y, "#7efff5", 11, 3);
        this.onEnemyKilled(e, pickups, player, events);
      }
    });
  }

  // Builds and advances the Relay Overclock propagation graph over multiple ticks.
  private checkRelayOverclock(
    bullet: BulletInstance,
    enemies: ObjectPool<EnemyInstance>,
    particles: ParticleSystem,
    pickups: ObjectPool<PickupInstance>,
    player: PlayerState,
    events: CollisionEvents
  ): void {
    const all: EnemyInstance[] = [];
    enemies.forEach((e) => {
      if (e.active) all.push(e);
    });
    if (all.length === 0) return;

    // Builds the propagation graph only on the first evaluation of the cast.
    if (bullet.relayTargetIds.length === 0) {
      const seedRadius = Math.max(40, bullet.aoe);
      const relayRadius = Math.max(32, bullet.splitCount || 120);
      const relayRadiusSq = relayRadius * relayRadius;
      const visited = new Set<number>();
      const queue: EnemyInstance[] = [];
      const branches: { x: number; y: number; color: string; id?: number }[] =
        [];
      const targetIds: number[] = [];

      // Seeds the graph with all enemies already inside the initial pulse radius.
      for (const e of all) {
        const dx = e.x - bullet.x;
        const dy = e.y - bullet.y;
        if (
          dx * dx + dy * dy <=
          (seedRadius + e.radius) * (seedRadius + e.radius)
        ) {
          visited.add(e.id);
          queue.push(e);
          branches.push({ x: e.x, y: e.y, color: "#90f6ff", id: -1 });
          targetIds.push(e.id);
        }
      }
      if (queue.length === 0) return;
      const seedCount = queue.length;

      // Expands outward with a BFS so the relay visually propagates through connected enemies.
      for (let qi = 0; qi < queue.length; qi++) {
        const cur = queue[qi];
        for (const n of all) {
          if (visited.has(n.id)) continue;
          const dx = n.x - cur.x;
          const dy = n.y - cur.y;
          if (dx * dx + dy * dy > relayRadiusSq) continue;
          visited.add(n.id);
          queue.push(n);
          branches.push({ x: n.x, y: n.y, color: "#90f6ff", id: qi });
          targetIds.push(n.id);
        }
      }

      bullet.prismBranches = branches;
      bullet.relayTargetIds = targetIds;
      bullet.targetId = seedCount; // store count of seed nodes
      bullet.executeThreshold = 0;
      bullet.collisionDelay = 0;

      // Distributes the propagation steps across a short fixed frame budget so the chain feels animated.
      const TOTAL_PROP_BUDGET = 12;
      const propCount = Math.max(0, targetIds.length - seedCount);
      const stepSize =
        propCount > 0
          ? Math.max(1, Math.ceil(propCount / TOTAL_PROP_BUDGET))
          : 1;
      const rounds = propCount > 0 ? Math.ceil(propCount / stepSize) : 0;
      const waitFrames =
        rounds > 0
          ? Math.max(
              0,
              Math.floor((TOTAL_PROP_BUDGET - rounds) / Math.max(1, rounds))
            )
          : 0;
      bullet.relayStepSize = stepSize;
      bullet.relayWaitFrames = waitFrames;
      bullet.relayCollapseFrames = 10;
      bullet.relayCollapseTick = 0;

      // Applies the seed hits immediately before the chained propagation begins.
      for (let i = 0; i < seedCount; i++) {
        const target = queue[i];
        if (!target || !target.active) continue;
        let dmg = bullet.damage;
        if (Math.random() < player.critChance) dmg *= 2;
        const killed = damageEnemy(target, dmg);
        particles.emit(target.x, target.y, 5, "#9ef7ff", {
          speedMin: 0.6,
          speedMax: 2.2,
          sizeMin: 1,
          sizeMax: 2.2,
          life: 12,
        });
        if (killed) {
          particles.explode(target.x, target.y, "#90f6ff", 10, 3);
          this.onEnemyKilled(target, pickups, player, events);
        }
      }
      bullet.executeThreshold = seedCount;
      bullet.collisionDelay = bullet.relayWaitFrames;
      return;
    }

    if (bullet.relayTargetIds.length === 0) return;

    // Advances propagation in steps so the relay chain does not feel instantaneous.
    const enemyById = new Map<number, EnemyInstance>();
    for (const e of all) enemyById.set(e.id, e);

    // Keeps visual relay endpoints attached to live target positions while the chain is active.
    for (
      let i = 0;
      i < bullet.relayTargetIds.length && i < bullet.prismBranches.length;
      i++
    ) {
      const t = enemyById.get(bullet.relayTargetIds[i]);
      if (!t || !t.active) continue;
      bullet.prismBranches[i].x = t.x;
      bullet.prismBranches[i].y = t.y;
    }

    const start = Math.floor(bullet.executeThreshold || 0);
    if (start >= bullet.relayTargetIds.length) {
      // Propagation complete: run a dedicated tail collapse phase (not counted in 12-frame propagation budget).
      bullet.relayCollapseTick = Math.min(
        bullet.relayCollapseFrames,
        (bullet.relayCollapseTick || 0) + 1
      );
      if (bullet.relayCollapseTick >= bullet.relayCollapseFrames) {
        bullet.active = false;
      }
      return;
    }

    const STEP_PER_TICK = Math.max(1, bullet.relayStepSize || 1);
    const end = Math.min(bullet.relayTargetIds.length, start + STEP_PER_TICK);

    for (let i = start; i < end; i++) {
      const target = enemyById.get(bullet.relayTargetIds[i]);
      if (!target || !target.active) continue;
      let dmg = bullet.damage;
      if (Math.random() < player.critChance) dmg *= 2;
      const killed = damageEnemy(target, dmg);
      particles.emit(target.x, target.y, 5, "#9ef7ff", {
        speedMin: 0.6,
        speedMax: 2.2,
        sizeMin: 1,
        sizeMax: 2.2,
        life: 12,
      });
      if (killed) {
        particles.explode(target.x, target.y, "#90f6ff", 10, 3);
        this.onEnemyKilled(target, pickups, player, events);
      }
    }

    bullet.executeThreshold = end;
    bullet.collisionDelay = Math.max(0, bullet.relayWaitFrames || 0);
  }

  private checkReboundOrb(
    bullet: BulletInstance,
    enemies: ObjectPool<EnemyInstance>,
    particles: ParticleSystem,
    pickups: ObjectPool<PickupInstance>,
    player: PlayerState,
    events: CollisionEvents
  ): void {
    const radius = bullet.aoe;
    const ringThickness = Math.max(12, radius * 0.26);
    const ringCenter = radius * 0.62;
    enemies.forEach((e) => {
      const dx = bullet.x - e.x;
      const dy = bullet.y - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist > radius + e.radius + ringThickness * 0.2) return;

      if (bullet.life % 6 === 0) {
        const ringDelta = Math.abs(dist - ringCenter);
        const ringFalloff = Math.max(
          0,
          1 - ringDelta / Math.max(1, ringThickness)
        );
        const coreFalloff = Math.max(0, 1 - dist / Math.max(1, radius * 0.72));
        const profile = Math.max(ringFalloff, coreFalloff * 0.58);
        let dmg = bullet.damage * (0.03 + profile * 0.07);
        if (Math.random() < player.critChance) dmg *= 2;
        const killed = damageEnemy(e, dmg);
        if (killed) {
          particles.explode(e.x, e.y, "#ffd98a", 12, 3);
          this.onEnemyKilled(e, pickups, player, events);
        }
      }
    });
  }

  private checkAOEBurst(
    bullet: BulletInstance,
    enemies: ObjectPool<EnemyInstance>,
    particles: ParticleSystem,
    pickups: ObjectPool<PickupInstance>,
    player: PlayerState,
    events: CollisionEvents
  ): void {
    enemies.forEach((e) => {
      if (bullet.hitIds.has(e.id)) return;

      const dx = bullet.x - e.x;
      const dy = bullet.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < bullet.aoe) {
        bullet.hitIds.add(e.id);

        // Stun
        const stunFrames = bullet.stunDuration > 0 ? bullet.stunDuration : 30;
        e.stunFrames = Math.max(e.stunFrames, stunFrames);

        const falloff = 1 - dist / bullet.aoe;
        let dmg = bullet.damage * falloff;
        if (Math.random() < player.critChance) dmg *= 2;

        const killed = damageEnemy(e, dmg);
        if (killed) {
          particles.explode(e.x, e.y, e.color, 15, 4);
          this.onEnemyKilled(e, pickups, player, events);
        }
      }
    });
  }

  private checkExpandingRing(
    bullet: BulletInstance,
    enemies: ObjectPool<EnemyInstance>,
    particles: ParticleSystem,
    pickups: ObjectPool<PickupInstance>,
    player: PlayerState,
    events: CollisionEvents
  ): void {
    const currentRadius = bullet.novaRadius;
    if (currentRadius <= 0) return;

    enemies.forEach((e) => {
      if (bullet.hitIds.has(e.id)) return;

      const dx = bullet.x - e.x;
      const dy = bullet.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Hit enemies at the ring edge (within ring thickness)
      const ringThickness = 30;
      if (
        dist < currentRadius + ringThickness &&
        dist > Math.max(0, currentRadius - ringThickness)
      ) {
        bullet.hitIds.add(e.id);

        let dmg = bullet.damage;
        if (Math.random() < player.critChance) dmg *= 2;

        const killed = damageEnemy(e, dmg);
        if (killed) {
          particles.explode(e.x, e.y, e.color, 15, 4);
          this.onEnemyKilled(e, pickups, player, events);
        }
      }
    });
  }

  private checkChronoField(
    bullet: BulletInstance,
    enemies: ObjectPool<EnemyInstance>,
    particles: ParticleSystem,
    pickups: ObjectPool<PickupInstance>,
    player: PlayerState,
    events: CollisionEvents
  ): void {
    const radius =
      bullet.novaMaxRadius > 0
        ? Math.min(bullet.novaRadius, bullet.aoe)
        : bullet.aoe;

    enemies.forEach((e) => {
      const dx = bullet.x - e.x;
      const dy = bullet.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        // Slow enemy (stun effect simulates slow)
        e.stunFrames = Math.max(e.stunFrames, 3);

        // Stun from freeze wave
        if (bullet.stunDuration > 0 && !bullet.hitIds.has(e.id)) {
          e.stunFrames = Math.max(e.stunFrames, bullet.stunDuration);
          bullet.hitIds.add(e.id);
        }

        // Damage over time
        if (bullet.life % 6 === 0) {
          const killed = damageEnemy(e, bullet.damage * 0.1);
          if (killed) {
            particles.explode(e.x, e.y, e.color, 15, 4);
            this.onEnemyKilled(e, pickups, player, events);
          }
        }
      }
    });
  }

  private checkDisintegrator(
    bullet: BulletInstance,
    enemies: ObjectPool<EnemyInstance>,
    particles: ParticleSystem,
    pickups: ObjectPool<PickupInstance>,
    player: PlayerState,
    events: CollisionEvents
  ): void {
    const currentRadius = bullet.novaRadius;
    if (currentRadius <= 0) return;

    enemies.forEach((e) => {
      if (bullet.hitIds.has(e.id)) return;

      const dx = bullet.x - e.x;
      const dy = bullet.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < currentRadius) {
        bullet.hitIds.add(e.id);

        // Execute targets that fall below the configured health ratio.
        const hpRatio = e.hp / e.maxHp;
        if (hpRatio <= bullet.executeThreshold) {
          const killed = damageEnemy(e, e.hp + 1);
          if (killed) {
            particles.explode(e.x, e.y, "#d50000", 20, 6);
            this.onEnemyKilled(e, pickups, player, events);
          }
          return;
        }

        const falloff = 1 - dist / currentRadius;
        let dmg = bullet.damage * falloff;
        if (Math.random() < player.critChance) dmg *= 2;

        const killed = damageEnemy(e, dmg);
        if (killed) {
          particles.explode(e.x, e.y, e.color, 15, 4);
          this.onEnemyKilled(e, pickups, player, events);
        }
      }
    });
  }

  private checkGravityWell(
    bullet: BulletInstance,
    enemies: ObjectPool<EnemyInstance>,
    particles: ParticleSystem,
    pickups: ObjectPool<PickupInstance>,
    player: PlayerState,
    events: CollisionEvents
  ): void {
    const wid = bullet.weaponId || "";
    const isStationary = wid === "gravity" && bullet.homing <= 0;
    const pullMult = isStationary ? 4 : 2;
    const dmgMult = isStationary ? 0.03 : 0.01;

    enemies.forEach((e) => {
      const dx = bullet.x - e.x;
      const dy = bullet.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < bullet.aoe && dist > 3) {
        const distRatio = 1 - dist / bullet.aoe;
        const pullForce = pullMult * distRatio * (1 + distRatio);
        e.x += (dx / dist) * pullForce;
        e.y += (dy / dist) * pullForce;

        if (dist < bullet.aoe * 0.75) {
          const falloff = 1 - dist / (bullet.aoe * 0.75);
          const killed = damageEnemy(e, bullet.damage * dmgMult * falloff);
          if (killed) {
            particles.explode(e.x, e.y, e.color, 15, 4);
            this.onEnemyKilled(e, pickups, player, events);
          }
        }
      }
    });
  }

  private processTemporalBubbles(
    enemies: ObjectPool<EnemyInstance>,
    particles: ParticleSystem,
    pickups: ObjectPool<PickupInstance>,
    player: PlayerState,
    events: CollisionEvents
  ): void {
    enemies.forEach((e) => {
      if (!e.active) return;
      if (e.temporalRewindFrames > 0) return;
      if (e.temporalBubbleFrames <= 0) return;

      e.temporalBubbleFrames--;
      if (e.temporalBubbleFrames > 0) {
        if (e.temporalBubbleFrames % 8 === 0) {
          particles.emit(e.x, e.y, 4, "#c4d8ff", {
            speedMin: 0.25,
            speedMax: 1.4,
            sizeMin: 1,
            sizeMax: 2.2,
            life: 14,
          });
        }
        return;
      }

      const cx = e.x;
      const cy = e.y;
      const radius = Math.max(24, e.temporalExplosionRadius);
      const baseDamage = Math.max(1, e.temporalExplosionDamage);

      particles.explode(cx, cy, "#dce9ff", 22, 5);

      enemies.forEach((target) => {
        if (!target.active) return;
        const dx = target.x - cx;
        const dy = target.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > radius + target.radius) return;

        const falloff = Math.max(0.2, 1 - dist / Math.max(1, radius));
        const killed = damageEnemy(target, baseDamage * falloff);
        target.stunFrames = Math.max(target.stunFrames, 10);
        if (killed) {
          particles.explode(target.x, target.y, target.color, 12, 3);
          this.onEnemyKilled(target, pickups, player, events);
        }
      });

      e.temporalExplosionRadius = 0;
      e.temporalExplosionDamage = 0;
    });
  }

  /** Fission Pulse: spawn 2 child bullets on hit position with short collision delay */
  private fissionSplit(
    bullet: BulletInstance,
    enemy: EnemyInstance,
    bullets: ObjectPool<BulletInstance>,
    player: PlayerState,
    particles: ParticleSystem
  ): void {
    particles.emit(enemy.x, enemy.y, 6, "#b4ff00", {
      speedMin: 2,
      speedMax: 5,
      life: 12,
    });
    for (let i = 0; i < 2; i++) {
      const sub = bullets.acquire();
      if (!sub) break;
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = enemy.radius + 6;
      const sx = enemy.x + Math.cos(angle) * spawnDist;
      const sy = enemy.y + Math.sin(angle) * spawnDist;
      initBullet(
        sub,
        sx,
        sy,
        angle,
        bullet.speed,
        bullet.damage,
        Math.max(20, Math.floor(bullet.maxLife * 0.65)),
        "#b4ff00",
        {
          pierce: 1,
          weaponId: "pulse",
          splitCount: bullet.splitCount - 1,
          collisionDelay: 3,
        }
      );
      sub.hitIds.add(enemy.id);
    }
  }

  private ricochetBounce(
    bullet: BulletInstance,
    hitEnemy: EnemyInstance,
    enemies: ObjectPool<EnemyInstance>
  ): void {
    // Find next nearest enemy that hasn't been hit
    let nearDist = Infinity;
    let nearX = bullet.x;
    let nearY = bullet.y;
    let found = false;

    enemies.forEach((e) => {
      if (e.id === hitEnemy.id || bullet.hitIds.has(e.id) || !e.active) return;
      const dx = e.x - bullet.x;
      const dy = e.y - bullet.y;
      const d = dx * dx + dy * dy;
      if (d < nearDist && d < 300 * 300) {
        nearDist = d;
        nearX = e.x;
        nearY = e.y;
        found = true;
      }
    });

    if (found) {
      bullet.bounces--;
      bullet.angle = Math.atan2(nearY - bullet.y, nearX - bullet.x);
      bullet.vx = Math.cos(bullet.angle) * bullet.speed;
      bullet.vy = Math.sin(bullet.angle) * bullet.speed;
      bullet.life = Math.min(bullet.life + 20, bullet.maxLife);
    } else {
      bullet.bounces = 0;
    }
  }

  private splashDamage(
    x: number,
    y: number,
    radius: number,
    damage: number,
    enemies: ObjectPool<EnemyInstance>,
    particles: ParticleSystem,
    pickups: ObjectPool<PickupInstance>,
    player: PlayerState,
    events: CollisionEvents
  ): void {
    enemies.forEach((e) => {
      const dx = x - e.x;
      const dy = y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        const killed = damageEnemy(e, damage * (1 - dist / radius));
        if (killed) {
          particles.explode(e.x, e.y, e.color, 10, 3);
          this.onEnemyKilled(e, pickups, player, events);
        }
      }
    });
  }

  private spawnSiegeShockwave(
    x: number,
    y: number,
    radius: number,
    bullets: ObjectPool<BulletInstance>
  ): void {
    const ring = bullets.acquire();
    if (!ring) return;
    initBullet(ring, x, y, 0, 0, 0, 14, "#7fd8ff", {
      pierce: 99,
      weaponId: "siege_burst",
      aoe: radius,
      novaMaxRadius: radius,
    });
  }

  private onEnemyKilled(
    enemy: EnemyInstance,
    pickups: ObjectPool<PickupInstance>,
    player: PlayerState,
    events: CollisionEvents
  ): void {
    events.enemyKilled(enemy);

    const xpCount = Math.min(5, Math.max(1, Math.floor(enemy.xpValue / 3)));
    const xpEach = Math.ceil(enemy.xpValue / xpCount);
    for (let i = 0; i < xpCount; i++) {
      const p = pickups.acquire();
      if (p)
        initPickup(
          p,
          enemy.x + (Math.random() - 0.5) * 20,
          enemy.y + (Math.random() - 0.5) * 20,
          "xp",
          xpEach
        );
    }

    if (Math.random() < 0.08) {
      const p = pickups.acquire();
      if (p) initPickup(p, enemy.x, enemy.y, "hp", 10);
    }

    if (Math.random() < 0.15) {
      const p = pickups.acquire();
      if (p) initPickup(p, enemy.x, enemy.y, "debris", 1);
    }
  }

  reset(): void {
    this.hash.clear();
    this.lastUpdateMs = 0;
    this.lastPlayerX = 0;
    this.lastPlayerY = 0;
    this.hasLastPlayerPos = false;
  }
}

function pointToSegmentDist(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 === 0) return Math.sqrt(apx * apx + apy * apy);
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  const closestX = ax + t * abx;
  const closestY = ay + t * aby;
  const dx = px - closestX;
  const dy = py - closestY;
  return Math.sqrt(dx * dx + dy * dy);
}

function enemy_stun(e: EnemyInstance, frames: number): void {
  e.stunFrames = Math.max(e.stunFrames, frames);
}

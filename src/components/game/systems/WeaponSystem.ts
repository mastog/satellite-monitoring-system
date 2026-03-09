// Owns all weapon firing logic, including cooldown tracking, target selection,
// volley creation, persistent-projectile gating, and synergy-triggered casts.
import { ObjectPool } from "../engine/ObjectPool";
import { type BulletInstance, initBullet } from "../entities/Bullet";
import type { PlayerState } from "../entities/Player";
import type { EnemyInstance } from "../entities/Enemy";
import { getWeaponLevel, type WeaponId } from "@/lib/game/weapons";
import { getActiveSynergies } from "@/lib/game/synergies";
import type { ParticleSystem } from "./ParticleSystem";

type Stats = ReturnType<typeof getWeaponLevel>;
type EnemyPool = { forEach: (fn: (e: EnemyInstance) => void) => void };

export class WeaponSystem {
  private cooldowns: Map<string, number> = new Map();
  private boomerangAwaitReturn: Set<string> = new Set();
  private latticeSeq = 1;

  // Advances cooldowns, selects targets, and emits bullets for every equipped
  // weapon and active synergy on the current frame.
  update(
    player: PlayerState,
    enemies: EnemyPool,
    bullets: ObjectPool<BulletInstance>,
    particles: ParticleSystem
  ): void {
    if (!player.alive) return;

    // Finds the nearest enemy once so auto-targeting weapons can share the result.
    let nearestEnemy: EnemyInstance | null = null;
    let nearestDist = Infinity;

    enemies.forEach((e) => {
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const d = dx * dx + dy * dy;
      if (d < nearestDist) {
        nearestDist = d;
        nearestEnemy = e;
      }
    });

    const ne = nearestEnemy as EnemyInstance | null;
    const autoAimAngle = ne
      ? Math.atan2(ne.y - player.y, ne.x - player.x)
      : player.angle;

    // Clears the old rebound charge fields because the rebound weapon now fires directly.
    player.reboundCharge = 0;
    player.reboundThreshold = 0;
    player.reboundFlashFrames = 0;

    for (const weapon of player.weapons) {
      const cdKey = weapon.id;
      const cd = this.cooldowns.get(cdKey) || 0;

      if (cd > 0) {
        this.cooldowns.set(cdKey, cd - 1);
        continue;
      }

      const stats = getWeaponLevel(weapon.id, weapon.level);
      const cooldown = Math.max(
        3,
        Math.floor(stats.cooldown * player.cooldownMult)
      );
      const ep = player.extraProjectiles;

      // Delays the next cast for persistent-return weapons until the prior
      // projectile has fully finished its outbound and return cycle.
      if (
        weapon.id === "boomerang" ||
        weapon.id === "harpoon" ||
        weapon.id === "rebound"
      ) {
        const activeWid = weapon.id === "rebound" ? "rebound_orb" : weapon.id;
        let hasActiveReturnProj = false;
        bullets.forEach((bul) => {
          if (bul.active && bul.weaponId === activeWid)
            hasActiveReturnProj = true;
        });

        if (hasActiveReturnProj) {
          this.boomerangAwaitReturn.add(cdKey);
          continue;
        }

        if (this.boomerangAwaitReturn.has(cdKey)) {
          this.cooldowns.set(cdKey, cooldown);
          this.boomerangAwaitReturn.delete(cdKey);
          continue;
        }

        if (weapon.id === "boomerang") {
          if (this.fireBoomerang(player, autoAimAngle, stats, ep, bullets)) {
            this.boomerangAwaitReturn.add(cdKey);
          }
        } else if (weapon.id === "harpoon") {
          this.fireVoidHarpoon(
            player,
            autoAimAngle,
            stats,
            ep,
            bullets,
            enemies
          );
          this.boomerangAwaitReturn.add(cdKey);
        } else {
          this.fireReboundOrb(player, autoAimAngle, stats, bullets, particles);
          this.boomerangAwaitReturn.add(cdKey);
        }
        continue;
      }

      let fired = true;

      switch (weapon.id) {
        // ═══ COMMON ═══
        case "stinger":
          this.fireBurst(
            player,
            player.angle,
            stats,
            ep,
            bullets,
            "stinger",
            "#00e5ff",
            0.05
          );
          break;
        case "frag":
          this.fireFrag(player, player.angle, stats, ep, bullets);
          break;
        case "siege":
          this.fireSiege(player, player.angle, stats, ep, bullets);
          break;
        case "pulse":
          this.fireFission(player, player.angle, stats, ep, bullets);
          break;
        case "flak":
          this.fireArc(
            player,
            player.angle,
            stats,
            ep,
            bullets,
            "flak",
            "#ffcc00"
          );
          break;
        case "ricochet":
          this.fireRicochet(player, autoAimAngle, stats, ep, bullets);
          break;
        // ═══ UNCOMMON ═══
        case "orbital":
          fired = false;
          break; // Orbital contact damage is handled by the collision system.
        case "laser":
          fired = this.fireLaser(
            player,
            stats,
            bullets,
            enemies,
            "laser",
            "#ff3a8c"
          );
          break;
        case "missile":
          this.fireHoming(
            player,
            autoAimAngle,
            stats,
            ep,
            bullets,
            "missile",
            "#39ff7f"
          );
          break;
        case "frost":
          fired = this.fireFrost(player, stats, bullets, enemies);
          break;
        case "drone":
          fired = false;
          break; // Drone contact logic is handled alongside orbital weapons.
        case "flame":
          this.fireFlame(player, player.angle, stats, bullets);
          break;

        // ═══ RARE ═══
        case "emp":
          this.fireAOE(player, stats, bullets, particles, "emp", "#00e5ff");
          break;
        case "gravity":
          this.fireGravity(player, autoAimAngle, stats, bullets);
          break;
        case "lightning":
          this.fireLightning(
            player,
            stats,
            bullets,
            enemies,
            "lightning",
            "#00e5ff"
          );
          break;
        case "nova":
          this.fireNova(player, stats, bullets, particles, "nova", "#ff8c00");
          break;
        case "anchor":
          fired = this.fireTemporalAnchor(
            player,
            enemies,
            stats,
            bullets,
            particles,
            autoAimAngle
          );
          break;
        case "lattice":
          this.fireThunderLattice(player, stats, bullets, particles);
          break;
        case "vortex":
          this.fireVortex(player, stats, bullets, particles);
          break;
        case "beam":
          fired = this.fireBeam(
            player,
            player.angle,
            stats,
            bullets,
            "beam",
            "#fafafa"
          );
          break;

        // ═══ LEGENDARY ═══
        case "chrono":
          this.fireChrono(player, stats, bullets, particles);
          break;
        case "prism":
          fired = false; // Prism beams are maintained as persistent locks in GameState.
          break;
        default:
          fired = false;
      }

      if (fired) {
        this.cooldowns.set(cdKey, cooldown);
      }
    }

    // Processes synergy-triggered bonus casts after the main weapon loop so
    // they share the same cooldown infrastructure.
    const activeSynergies = getActiveSynergies(
      player.weapons,
      player.passives,
      player.forcedSynergies
    );

    for (const synergy of activeSynergies) {
      const cdKey = `syn_${synergy.id}`;
      const cd = this.cooldowns.get(cdKey) || 0;
      if (cd > 0) {
        this.cooldowns.set(cdKey, cd - 1);
        continue;
      }

      let fired = false;
      switch (synergy.effect) {
        case "aegis_constellation":
          fired = false; // passive orbit fusion handled in collision/render
          break;
        case "shrapnel_corona":
          fired = this.fireShrapnelCorona(player, bullets, particles);
          break;
        case "relay_overclock":
          fired = this.fireRelayOverclock(player, bullets, particles);
          break;
      }

      if (fired) {
        const baseCd =
          synergy.effect === "shrapnel_corona"
            ? 46
            : synergy.effect === "relay_overclock"
              ? 24
              : 60;
        this.cooldowns.set(
          cdKey,
          Math.max(5, Math.floor(baseCd * player.cooldownMult))
        );
      }
    }
  }

  // Implements the individual firing patterns used by each weapon family.

  /** Fires the Fission Pulse volley and encodes the remaining split depth on each projectile. */
  private fireFission(
    p: PlayerState,
    angle: number,
    s: Stats,
    ep: number,
    b: ObjectPool<BulletInstance>
  ): void {
    const count = s.projectiles + ep;
    const splitDepth = Math.floor(s.aoe); // s.aoe stores max split depth
    for (let i = 0; i < count; i++) {
      const bul = b.acquire();
      if (!bul) break;
      const a = angle + (i - (count - 1) / 2) * 0.08;
      initBullet(
        bul,
        p.x,
        p.y,
        a,
        s.speed * p.projSpeedMult,
        s.damage * p.damageMult,
        Math.floor(s.range / s.speed),
        "#b4ff00",
        { pierce: s.pierce, weaponId: "pulse", splitCount: splitDepth }
      );
    }
  }

  /** Fires a compact straight burst used by single-direction projectile weapons. */
  private fireBurst(
    p: PlayerState,
    angle: number,
    s: Stats,
    ep: number,
    b: ObjectPool<BulletInstance>,
    wid: WeaponId,
    color: string,
    spread: number
  ): void {
    const count = s.projectiles + ep;
    for (let i = 0; i < count; i++) {
      const bul = b.acquire();
      if (!bul) break;
      const a = angle + (i - (count - 1) / 2) * spread;
      initBullet(
        bul,
        p.x,
        p.y,
        a,
        s.speed * p.projSpeedMult,
        s.damage * p.damageMult,
        Math.floor(s.range / s.speed),
        color,
        { pierce: s.pierce, weaponId: wid }
      );
    }
  }

  /** Fires a fan-shaped spread, optionally adding randomness for scatter weapons such as flak. */
  private fireArc(
    p: PlayerState,
    angle: number,
    s: Stats,
    ep: number,
    b: ObjectPool<BulletInstance>,
    wid: WeaponId,
    color: string
  ): void {
    const count = s.projectiles + ep;
    const arcRad = (s.special * Math.PI) / 180;
    for (let i = 0; i < count; i++) {
      const bul = b.acquire();
      if (!bul) break;
      // Adds random scatter to flak so each shot feels like a short-range blast rather than a rigid fan.
      const a =
        wid === "flak"
          ? angle + (Math.random() - 0.5) * arcRad
          : angle - arcRad / 2 + (i / (count - 1 || 1)) * arcRad;
      const spd =
        wid === "flak"
          ? s.speed * p.projSpeedMult * (0.8 + Math.random() * 0.4)
          : s.speed * p.projSpeedMult;
      initBullet(
        bul,
        p.x,
        p.y,
        a,
        spd,
        s.damage * p.damageMult,
        Math.floor(s.range / s.speed),
        color,
        { pierce: s.pierce, weaponId: wid }
      );
    }
  }

  /** Fires frag shells that explode with splash damage on impact. */
  private fireFrag(
    p: PlayerState,
    angle: number,
    s: Stats,
    ep: number,
    b: ObjectPool<BulletInstance>
  ): void {
    const count = s.projectiles + ep;
    const arcRad = (s.special * Math.PI) / 180;
    for (let i = 0; i < count; i++) {
      const bul = b.acquire();
      if (!bul) break;
      const a =
        count === 1 ? angle : angle - arcRad / 2 + (i / (count - 1)) * arcRad;
      initBullet(
        bul,
        p.x,
        p.y,
        a,
        s.speed * p.projSpeedMult,
        s.damage * p.damageMult,
        Math.floor(s.range / s.speed),
        "#ff6b2c",
        { pierce: s.pierce, weaponId: "frag", aoe: s.aoe * p.aoeMult }
      );
    }
  }

  /** Fires the Shrapnel Corona synergy as two circular projectile rings with different density and damage profiles. */
  private fireShrapnelCorona(
    p: PlayerState,
    b: ObjectPool<BulletInstance>,
    particles: ParticleSystem
  ): boolean {
    const outerCount = 10 + p.extraProjectiles * 2;
    const innerCount = 8 + p.extraProjectiles * 2;
    let spawned = 0;
    const phase = Date.now() * 0.00085;

    const launchRing = (
      count: number,
      radiusOffset: number,
      angleOffset: number,
      speed: number,
      damage: number,
      aoe: number,
      colorA: string,
      colorB: string
    ) => {
      for (let i = 0; i < count; i++) {
        const bul = b.acquire();
        if (!bul) break;
        const t = i / count;
        const a = t * Math.PI * 2 + angleOffset;
        const sx = p.x + Math.cos(a) * radiusOffset;
        const sy = p.y + Math.sin(a) * radiusOffset;
        const tint = i % 2 === 0 ? colorA : colorB;
        initBullet(
          bul,
          sx,
          sy,
          a,
          speed * p.projSpeedMult,
          damage * p.damageMult,
          Math.floor(560 / Math.max(0.01, speed * p.projSpeedMult)),
          tint,
          {
            pierce: 1,
            weaponId: "shrapnel_corona",
            aoe: aoe * p.aoeMult,
          }
        );
        spawned++;
      }
    };

    launchRing(outerCount, 8, phase, 8.4, 36, 54, "#71ecff", "#ff9a4a");
    launchRing(
      innerCount,
      3.5,
      phase + Math.PI / outerCount,
      9.8,
      28,
      40,
      "#9af6ff",
      "#ffc174"
    );

    if (spawned > 0) {
      particles.emit(p.x, p.y, 18, "#74ebff", {
        speedMin: 1.2,
        speedMax: 3.4,
        sizeMin: 1.1,
        sizeMax: 2.5,
        life: 20,
      });
      particles.emit(p.x, p.y, 14, "#ff8f47", {
        speedMin: 1.6,
        speedMax: 3.8,
        sizeMin: 1,
        sizeMax: 2.2,
        life: 16,
      });
    }

    return spawned > 0;
  }

  /** Fires the Relay Overclock synergy as a seed pulse that later expands through chained propagation. */
  private fireRelayOverclock(
    p: PlayerState,
    b: ObjectPool<BulletInstance>,
    particles: ParticleSystem
  ): boolean {
    const pulse = b.acquire();
    if (!pulse) return false;
    initBullet(pulse, p.x, p.y, p.angle, 0, 3.2 * p.damageMult, 40, "#90f6ff", {
      pierce: 99,
      weaponId: "relay_overclock",
      aoe: 190 * p.aoeMult, // initial near-field hit radius
      splitCount: 122, // chain propagation radius (reusing splitCount channel)
      executeThreshold: 0, // cast trigger guard (0 = not processed yet)
    });
    particles.emit(p.x, p.y, 14, "#9ef7ff", {
      speedMin: 0.8,
      speedMax: 2.8,
      sizeMin: 1,
      sizeMax: 2.4,
      life: 18,
    });
    return true;
  }

  /** Fires the Siege round as a heavy slug intended to detonate into circular splash damage. */
  private fireSiege(
    p: PlayerState,
    angle: number,
    s: Stats,
    ep: number,
    b: ObjectPool<BulletInstance>
  ): void {
    const count = s.projectiles + ep;
    for (let i = 0; i < count; i++) {
      const bul = b.acquire();
      if (!bul) break;
      const a = angle + (i - (count - 1) / 2) * 0.1;
      initBullet(
        bul,
        p.x,
        p.y,
        a,
        s.speed * p.projSpeedMult,
        s.damage * p.damageMult,
        Math.floor(s.range / s.speed),
        "#4fc3f7",
        { pierce: s.pierce, weaponId: "siege", aoe: s.aoe * p.aoeMult }
      );
    }
  }

  /** Fires ricochet discs that can retarget after impact. */
  private fireRicochet(
    p: PlayerState,
    angle: number,
    s: Stats,
    ep: number,
    b: ObjectPool<BulletInstance>
  ): void {
    const count = s.projectiles + ep;
    for (let i = 0; i < count; i++) {
      const bul = b.acquire();
      if (!bul) break;
      const a = angle + (i - (count - 1) / 2) * 0.15;
      initBullet(
        bul,
        p.x,
        p.y,
        a,
        s.speed * p.projSpeedMult,
        s.damage * p.damageMult,
        Math.floor(s.range / s.speed),
        "#b8c6db",
        { pierce: 1, weaponId: "ricochet", bounces: s.special }
      );
    }
  }

  /** Fires boomerang blades that stay active until they complete a return cycle. */
  private fireBoomerang(
    p: PlayerState,
    angle: number,
    s: Stats,
    ep: number,
    b: ObjectPool<BulletInstance>
  ): boolean {
    const count = s.projectiles + ep;
    let launched = 0;

    for (let i = 0; i < count; i++) {
      const bul = b.acquire();
      if (!bul) break;
      const a = angle + (i - (count - 1) / 2) * 0.3;
      initBullet(
        bul,
        p.x,
        p.y,
        a,
        s.speed * p.projSpeedMult,
        s.damage * p.damageMult,
        Math.floor(s.range / s.speed) * 2,
        "#39ff7f",
        { pierce: s.pierce, weaponId: "boomerang", originX: p.x, originY: p.y }
      );
      launched++;
    }
    return launched > 0;
  }

  /** Fires auto-targeting beam weapons by locking onto enemies currently inside range. */
  private fireLaser(
    p: PlayerState,
    s: Stats,
    b: ObjectPool<BulletInstance>,
    enemies: EnemyPool,
    wid: WeaponId,
    color: string
  ): boolean {
    const rangeSq = s.range * s.range;
    const targets: { id: number; x: number; y: number; dist: number }[] = [];
    enemies.forEach((e) => {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dSq = dx * dx + dy * dy;
      if (dSq <= rangeSq)
        targets.push({ id: e.id, x: e.x, y: e.y, dist: Math.sqrt(dSq) });
    });
    if (targets.length === 0) return false;
    targets.sort((a, b) => a.dist - b.dist);

    for (let i = 0; i < s.projectiles; i++) {
      const target = targets[i % targets.length];
      const bul = b.acquire();
      if (!bul) break;
      const a = Math.atan2(target.y - p.y, target.x - p.x);
      initBullet(
        bul,
        p.x,
        p.y,
        a,
        0,
        s.damage * p.damageMult,
        s.special,
        color,
        {
          pierce: s.pierce,
          isLaser: true,
          width: 3,
          weaponId: wid,
          targetId: target.id,
        }
      );
      bul.endX = target.x;
      bul.endY = target.y;
    }
    return true;
  }

  /** Fires the frost beam variant, which combines beam damage with a slow effect. */
  private fireFrost(
    p: PlayerState,
    s: Stats,
    b: ObjectPool<BulletInstance>,
    enemies: EnemyPool
  ): boolean {
    const rangeSq = s.range * s.range;
    const targets: { id: number; x: number; y: number; dist: number }[] = [];
    enemies.forEach((e) => {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dSq = dx * dx + dy * dy;
      if (dSq <= rangeSq)
        targets.push({ id: e.id, x: e.x, y: e.y, dist: Math.sqrt(dSq) });
    });
    if (targets.length === 0) return false;
    targets.sort((a, b) => a.dist - b.dist);

    for (let i = 0; i < s.projectiles; i++) {
      const target = targets[i % targets.length];
      const bul = b.acquire();
      if (!bul) break;
      const a = Math.atan2(target.y - p.y, target.x - p.x);
      initBullet(
        bul,
        p.x,
        p.y,
        a,
        0,
        s.damage * p.damageMult,
        s.special,
        "#88eeff",
        {
          pierce: s.pierce,
          isLaser: true,
          width: 4,
          weaponId: "frost",
          slowAmount: 0.5,
          targetId: target.id,
        }
      );
      bul.endX = target.x;
      bul.endY = target.y;
    }
    return true;
  }

  /** Fires homing projectiles with initial spread but shared target-seeking behavior. */
  private fireHoming(
    p: PlayerState,
    angle: number,
    s: Stats,
    ep: number,
    b: ObjectPool<BulletInstance>,
    wid: WeaponId,
    color: string
  ): void {
    const count = s.projectiles + ep;
    for (let i = 0; i < count; i++) {
      const bul = b.acquire();
      if (!bul) break;
      const spread = (i - (count - 1) / 2) * 0.2;
      initBullet(
        bul,
        p.x,
        p.y,
        angle + spread,
        s.speed * p.projSpeedMult,
        s.damage * p.damageMult,
        Math.floor(s.range / s.speed),
        color,
        { pierce: 1, homing: s.special, aoe: s.aoe * p.aoeMult, weaponId: wid }
      );
    }
  }

  /** Fires instantaneous beam segments that span directly to their computed endpoints. */
  private fireBeam(
    p: PlayerState,
    angle: number,
    s: Stats,
    b: ObjectPool<BulletInstance>,
    wid: WeaponId,
    color: string
  ): boolean {
    for (let i = 0; i < s.projectiles; i++) {
      const bul = b.acquire();
      if (!bul) return i > 0;
      const a = angle + (i - (s.projectiles - 1) / 2) * 0.12;
      const beamWidth = wid === "beam" ? s.special * 0.6 : 3;
      initBullet(
        bul,
        p.x,
        p.y,
        a,
        0,
        s.damage * p.damageMult,
        s.special,
        color,
        {
          pierce: s.pierce,
          isLaser: true,
          width: beamWidth,
          weaponId: wid,
          aoe: s.aoe * p.aoeMult,
        }
      );
      bul.endX = p.x + Math.cos(a) * s.range;
      bul.endY = p.y + Math.sin(a) * s.range;
    }
    return true;
  }

  /** Fires a short-lived cone of flame projectiles with randomized spread and speed. */
  private fireFlame(
    p: PlayerState,
    angle: number,
    s: Stats,
    b: ObjectPool<BulletInstance>
  ): void {
    const arcRad = (s.special * Math.PI) / 180;
    for (let i = 0; i < s.projectiles; i++) {
      const bul = b.acquire();
      if (!bul) break;
      const a = angle + (Math.random() - 0.5) * arcRad;
      const spd = s.speed * p.projSpeedMult * (0.7 + Math.random() * 0.6);
      initBullet(
        bul,
        p.x,
        p.y,
        a,
        spd,
        s.damage * p.damageMult,
        Math.floor(s.range / s.speed),
        "#ff5722",
        { pierce: s.pierce, weaponId: "flame" }
      );
    }
  }

  /** Spawns an EMP burst projectile that applies area damage and stun on contact. */
  private fireAOE(
    p: PlayerState,
    s: Stats,
    b: ObjectPool<BulletInstance>,
    particles: ParticleSystem,
    wid: WeaponId,
    color: string
  ): void {
    const bul = b.acquire();
    if (!bul) return;
    const aoeRadius = s.aoe * p.aoeMult;
    initBullet(bul, p.x, p.y, 0, 0, s.damage * p.damageMult, 18, color, {
      pierce: 99,
      aoe: aoeRadius,
      weaponId: wid,
      stunDuration: s.special,
      novaMaxRadius: aoeRadius,
    });
    particles.explode(p.x, p.y, color, 30, 6);
  }

  /** Spawns a gravity well that travels outward before becoming a stationary pull field. */
  private fireGravity(
    p: PlayerState,
    angle: number,
    s: Stats,
    b: ObjectPool<BulletInstance>
  ): void {
    const bul = b.acquire();
    if (!bul) return;
    const travelFrames = Math.floor(s.range / s.speed);
    const totalLife = Math.floor(s.special);
    initBullet(
      bul,
      p.x,
      p.y,
      angle,
      s.speed * p.projSpeedMult,
      s.damage * p.damageMult,
      totalLife,
      "#b44aff",
      {
        pierce: 99,
        aoe: s.aoe * p.aoeMult,
        weaponId: "gravity",
        homing: travelFrames,
      }
    );
  }

  /** Builds a chained lightning path across nearby enemies in distance order. */
  private fireLightning(
    p: PlayerState,
    s: Stats,
    b: ObjectPool<BulletInstance>,
    enemies: EnemyPool,
    wid: WeaponId,
    color: string
  ): void {
    const targets: EnemyInstance[] = [];
    enemies.forEach((e) => {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy < s.range * s.range) targets.push(e);
    });
    targets.sort((a, b_) => {
      const da = (a.x - p.x) ** 2 + (a.y - p.y) ** 2;
      const db = (b_.x - p.x) ** 2 + (b_.y - p.y) ** 2;
      return da - db;
    });
    const chainCount = Math.min(s.special, targets.length);
    if (chainCount === 0) return;
    let prevX = p.x;
    let prevY = p.y;
    const boltLife = 6 + Math.floor(s.special * 0.6);
    for (let i = 0; i < chainCount; i++) {
      const t = targets[i];
      const bul = b.acquire();
      if (!bul) break;
      initBullet(
        bul,
        prevX,
        prevY,
        0,
        0,
        s.damage * p.damageMult * (1 - i * 0.1),
        boltLife,
        color,
        { pierce: 1, isLaser: true, weaponId: wid }
      );
      bul.endX = t.x;
      bul.endY = t.y;
      prevX = t.x;
      prevY = t.y;
    }
  }

  /** Spawns an expanding nova ring centered on the player. */
  private fireNova(
    p: PlayerState,
    s: Stats,
    b: ObjectPool<BulletInstance>,
    particles: ParticleSystem,
    wid: WeaponId,
    color: string
  ): void {
    const bul = b.acquire();
    if (!bul) return;
    const aoeRadius = s.aoe * p.aoeMult;
    initBullet(bul, p.x, p.y, 0, 0, s.damage * p.damageMult, 30, color, {
      pierce: 99,
      aoe: aoeRadius,
      weaponId: wid,
      novaMaxRadius: aoeRadius,
    });
    particles.explode(p.x, p.y, color, 25, 5);
  }

  /** Spawns a vortex field that remains centered on the player while active. */
  private fireVortex(
    p: PlayerState,
    s: Stats,
    b: ObjectPool<BulletInstance>,
    particles: ParticleSystem
  ): void {
    const bul = b.acquire();
    if (!bul) return;
    const aoeRadius = s.aoe * p.aoeMult;
    initBullet(
      bul,
      p.x,
      p.y,
      0,
      0,
      s.damage * p.damageMult,
      s.special,
      "#e040fb",
      {
        pierce: 99,
        aoe: aoeRadius,
        weaponId: "vortex",
        novaMaxRadius: aoeRadius,
      }
    );
    particles.emit(p.x, p.y, 15, "#e040fb", {
      speedMin: 1,
      speedMax: 3,
      life: 20,
    });
  }

  /** Launches the rebound orb directly as a persistent hunting projectile with area damage. */
  private fireReboundOrb(
    p: PlayerState,
    angle: number,
    s: Stats,
    b: ObjectPool<BulletInstance>,
    particles: ParticleSystem
  ): void {
    const orb = b.acquire();
    if (!orb) return;
    const spawnX = p.x + Math.cos(angle) * 24;
    const spawnY = p.y + Math.sin(angle) * 24;
    initBullet(
      orb,
      spawnX,
      spawnY,
      angle,
      2.5 * p.projSpeedMult,
      s.damage * p.damageMult * 1.8,
      s.special,
      "#ffde8c",
      {
        pierce: 99,
        weaponId: "rebound_orb",
        aoe: s.aoe * p.aoeMult,
        homing: 0,
      }
    );
    particles.explode(spawnX, spawnY, "#ffde8c", 10, 2);
  }

  /** Fires the Void Harpoon volley, optionally assigning nearby targets before the hooks return. */
  private fireVoidHarpoon(
    p: PlayerState,
    angle: number,
    s: Stats,
    ep: number,
    b: ObjectPool<BulletInstance>,
    enemies: EnemyPool
  ): void {
    const count = s.projectiles + ep;
    const targets: EnemyInstance[] = [];
    enemies.forEach((e) => {
      if (e.active) targets.push(e);
    });
    targets.sort((a, b_) => {
      const da = (a.x - p.x) * (a.x - p.x) + (a.y - p.y) * (a.y - p.y);
      const db = (b_.x - p.x) * (b_.x - p.x) + (b_.y - p.y) * (b_.y - p.y);
      return da - db;
    });

    for (let i = 0; i < count; i++) {
      const bul = b.acquire();
      if (!bul) break;
      let a = angle + (i - (count - 1) / 2) * 0.08;
      let targetId: number | undefined;
      // Assigns different nearby targets within the same volley so harpoons do not all stack on one enemy.
      if (i < targets.length) {
        const t = targets[i];
        a = Math.atan2(t.y - p.y, t.x - p.x);
        targetId = t.id;
      }
      const speed = s.speed * p.projSpeedMult;
      const outboundFrames = Math.max(
        14,
        Math.floor(s.range / Math.max(0.01, speed))
      );
      const life = outboundFrames * 2 + 28;
      initBullet(
        bul,
        p.x,
        p.y,
        a,
        speed,
        s.damage * p.damageMult,
        life,
        "#6ee7ff",
        {
          pierce: 99,
          weaponId: "harpoon",
          stunDuration: s.special,
          originX: p.x,
          originY: p.y,
          homing: outboundFrames,
          targetId,
          collisionDelay: 1,
        }
      );
    }
  }

  /** Drops a Temporal Anchor field at a chosen cluster center to trigger rewind and delayed detonation behavior. */
  private fireTemporalAnchor(
    p: PlayerState,
    enemies: EnemyPool,
    s: Stats,
    b: ObjectPool<BulletInstance>,
    particles: ParticleSystem,
    fallbackAngle: number
  ): boolean {
    const center = this.pickTemporalAnchorDropPoint(
      p,
      enemies,
      s,
      fallbackAngle
    );
    if (!center) return false;
    let spawned = 0;
    const bul = b.acquire();
    if (bul) {
      const fieldFrames = Math.max(48, Math.floor(s.special));
      initBullet(
        bul,
        center.x,
        center.y,
        0,
        0,
        s.damage * p.damageMult,
        fieldFrames,
        "#7cb7ff",
        {
          pierce: 99,
          aoe: s.aoe * p.aoeMult,
          weaponId: "anchor",
          homing: 0,
          executeThreshold: 0,
          novaMaxRadius: s.aoe * p.aoeMult,
        }
      );
      spawned++;
    }
    if (spawned <= 0) return false;
    particles.emit(center.x, center.y, 24, "#7cb7ff", {
      speedMin: 1,
      speedMax: 4,
      life: 24,
    });
    return true;
  }

  private pickTemporalAnchorDropPoint(
    p: PlayerState,
    enemies: EnemyPool,
    s: Stats,
    fallbackAngle: number
  ): { x: number; y: number } | null {
    const range = Math.max(120, s.range);
    const rangeSq = range * range;
    const candidates: EnemyInstance[] = [];
    enemies.forEach((e) => {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy <= rangeSq) candidates.push(e);
    });

    if (candidates.length > 0) {
      const a = this.pickTemporalAnchorAngle(p, enemies, s, fallbackAngle);
      const dirX = Math.cos(a);
      const dirY = Math.sin(a);
      // Use densest enemy near chosen direction as center.
      let best: EnemyInstance | null = null;
      let bestScore = -Infinity;
      for (const e of candidates) {
        const vx = e.x - p.x;
        const vy = e.y - p.y;
        const d = Math.hypot(vx, vy) || 1;
        const align = (vx / d) * dirX + (vy / d) * dirY;
        const score = align * 2 - d * 0.002;
        if (score > bestScore) {
          bestScore = score;
          best = e;
        }
      }
      if (best) return { x: best.x, y: best.y };
    }
    return null;
  }

  /** Chooses a Temporal Anchor angle by preferring dense nearby enemy clusters over isolated distant targets. */
  private pickTemporalAnchorAngle(
    p: PlayerState,
    enemies: EnemyPool,
    s: Stats,
    fallbackAngle: number
  ): number {
    const candidates: EnemyInstance[] = [];
    const acquireRange = Math.min(760, s.range * 1.2);
    const acquireRangeSq = acquireRange * acquireRange;
    const clusterRadius = 180;
    const clusterRadiusSq = clusterRadius * clusterRadius;

    enemies.forEach((e) => {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dSq = dx * dx + dy * dy;
      if (dSq <= acquireRangeSq) candidates.push(e);
    });
    if (candidates.length === 0) return fallbackAngle;

    let best: EnemyInstance | null = null;
    let bestScore = -Infinity;

    for (const e of candidates) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dSq = dx * dx + dy * dy;
      let neighbors = 0;

      for (const other of candidates) {
        if (other.id === e.id) continue;
        const ox = other.x - e.x;
        const oy = other.y - e.y;
        if (ox * ox + oy * oy <= clusterRadiusSq) neighbors++;
      }

      // Strongly prefer dense packs, mildly prefer closer packs.
      const proximityBonus = 1 - Math.min(1, Math.sqrt(dSq) / acquireRange);
      const score = neighbors * 1.2 + proximityBonus * 2;
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }

    if (!best) return fallbackAngle;
    return Math.atan2(best.y - p.y, best.x - p.x);
  }

  /** Thunder Lattice: deploys linked electric nodes */
  private fireThunderLattice(
    p: PlayerState,
    s: Stats,
    b: ObjectPool<BulletInstance>,
    particles: ParticleSystem
  ): void {
    const maxNodes = Math.max(1, Math.floor(s.projectiles));
    const active: BulletInstance[] = [];
    b.forEach((bul) => {
      if (bul.active && bul.weaponId === "lattice") active.push(bul);
    });

    // Reclaim oldest node if over cap.
    if (active.length >= maxNodes) {
      let oldest = active[0];
      for (let i = 1; i < active.length; i++) {
        if ((active[i].executeThreshold || 0) < (oldest.executeThreshold || 0))
          oldest = active[i];
      }
      particles.explode(oldest.x, oldest.y, "#8ff4ff", 10, 2);
      oldest.active = false;
      const idx = active.indexOf(oldest);
      if (idx >= 0) active.splice(idx, 1);
    }

    const bul = b.acquire();
    if (!bul) return;
    const drift = Math.min(16, Math.hypot(p.vx, p.vy) * 2.1);
    const back = 18;
    const px =
      p.x - Math.cos(p.angle) * back + (Math.random() - 0.5) * (8 + drift);
    const py =
      p.y - Math.sin(p.angle) * back + (Math.random() - 0.5) * (8 + drift);
    const seq = this.latticeSeq++;
    initBullet(
      bul,
      px,
      py,
      0,
      0,
      s.damage * p.damageMult,
      Math.floor(s.special),
      "#7efff5",
      {
        pierce: 99,
        weaponId: "lattice",
        aoe: s.aoe * p.aoeMult,
        executeThreshold: seq,
      }
    );
    active.push(bul);

    // Fully connect all active nodes (complete graph).
    for (let i = 0; i < active.length; i++) {
      const cur = active[i];
      cur.prismBranches = [];
      for (let j = 0; j < active.length; j++) {
        if (i === j) continue;
        const other = active[j];
        cur.prismBranches.push({
          x: other.x,
          y: other.y,
          color: "#7efff5",
          id: other.executeThreshold,
        });
      }
    }
    particles.emit(px, py, 10, "#7efff5", {
      speedMin: 0.6,
      speedMax: 2.2,
      life: 18,
    });
  }

  /** Chrono field (expanding slow zone) */
  private fireChrono(
    p: PlayerState,
    s: Stats,
    b: ObjectPool<BulletInstance>,
    particles: ParticleSystem
  ): void {
    const bul = b.acquire();
    if (!bul) return;
    const aoeRadius = s.aoe * p.aoeMult;
    initBullet(
      bul,
      p.x,
      p.y,
      0,
      0,
      s.damage * p.damageMult,
      s.special,
      "#448aff",
      {
        pierce: 99,
        aoe: aoeRadius,
        weaponId: "chrono",
        slowAmount: 0.6,
        novaMaxRadius: aoeRadius,
      }
    );
    particles.emit(p.x, p.y, 12, "#448aff", {
      speedMin: 0.5,
      speedMax: 2,
      life: 25,
    });
  }

  /** Prism beam: persistent lock beam that refracts branch beams */
  private firePrism(
    p: PlayerState,
    s: Stats,
    b: ObjectPool<BulletInstance>,
    enemies: EnemyPool
  ): boolean {
    const rangeSq = s.range * s.range;
    const targets: { id: number; x: number; y: number; dist: number }[] = [];
    enemies.forEach((e) => {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dSq = dx * dx + dy * dy;
      if (dSq <= rangeSq)
        targets.push({ id: e.id, x: e.x, y: e.y, dist: Math.sqrt(dSq) });
    });
    if (targets.length === 0) return false;
    targets.sort((a, b_) => a.dist - b_.dist);

    for (let i = 0; i < s.projectiles; i++) {
      const target = targets[i % targets.length];
      const bul = b.acquire();
      if (!bul) break;
      const a = Math.atan2(target.y - p.y, target.x - p.x);
      initBullet(bul, p.x, p.y, a, 0, s.damage * p.damageMult, 16, "#ff6bef", {
        pierce: s.pierce,
        isLaser: true,
        width: 3,
        weaponId: "prism",
        splitCount: s.special,
        targetId: target.id,
      });
      bul.endX = target.x;
      bul.endY = target.y;
      bul.prismBranches = [];
    }
    return true;
  }

  reset(): void {
    this.cooldowns.clear();
    this.boomerangAwaitReturn.clear();
    this.latticeSeq = 1;
  }
}

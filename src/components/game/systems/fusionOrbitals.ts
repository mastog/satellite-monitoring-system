import type { EnemyInstance } from "../entities/Enemy";
import type { PlayerState } from "../entities/Player";

export interface AegisConstellationNode {
  x: number;
  y: number;
  px: number;
  py: number;
  dirX: number;
  dirY: number;
  speed: number;
  lockRatio: number;
}

const NODE_COUNT = 5;
const BASE_RADIUS = 124;
const ORBIT_SPEED = 0.86;
const SEEK_ACQUIRE = 280;
const SEEK_RELEASE = 340;
const MAX_LEASH = 74;
const LEAD_SEC = 0.16;
const MAX_SPEED = 760;
const BASE_STIFFNESS = 185;

interface AegisNodeRuntime {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  dirX: number;
  dirY: number;
  speed: number;
  phaseOffset: number;
  lockRatio: number;
  targetId?: number;
}

interface AegisRuntimeState {
  lastMs: number;
  nodes: AegisNodeRuntime[];
}

const aegisRuntime = new WeakMap<PlayerState, AegisRuntimeState>();

/**
 * Stateful orbital runtime:
 * - fixed equal-radius base orbit
 * - sticky target locks to avoid rapid retarget twitch
 * - critically damped spring movement for smooth pursuit
 */
export function updateAegisConstellationRuntime(
  player: PlayerState,
  enemies: EnemyInstance[],
  nowMs: number
): AegisConstellationNode[] {
  let state = aegisRuntime.get(player);
  if (!state) {
    const nodes: AegisNodeRuntime[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const phaseOffset = (i / NODE_COUNT) * Math.PI * 2;
      const bx = player.x + Math.cos(phaseOffset) * BASE_RADIUS;
      const by = player.y + Math.sin(phaseOffset) * BASE_RADIUS;
      nodes.push({
        x: bx,
        y: by,
        px: bx,
        py: by,
        vx: 0,
        vy: 0,
        dirX: -Math.sin(phaseOffset),
        dirY: Math.cos(phaseOffset),
        speed: 0,
        phaseOffset,
        lockRatio: 0,
      });
    }
    state = { lastMs: nowMs, nodes };
    aegisRuntime.set(player, state);
  }

  if (nowMs <= state.lastMs) {
    return state.nodes.map((n) => ({
      x: n.x,
      y: n.y,
      px: n.px,
      py: n.py,
      dirX: n.dirX,
      dirY: n.dirY,
      speed: n.speed,
      lockRatio: n.lockRatio,
    }));
  }
  const dt = Math.max(1 / 180, Math.min(1 / 30, (nowMs - state.lastMs) / 1000));
  state.lastMs = nowMs;

  const t = nowMs * 0.001;
  const phaseBase = t * ORBIT_SPEED;
  const acquireSq = SEEK_ACQUIRE * SEEK_ACQUIRE;
  const releaseSq = SEEK_RELEASE * SEEK_RELEASE;

  const enemyById = new Map<number, EnemyInstance>();
  const activeEnemies = enemies.filter((e) => e.active);
  for (const e of activeEnemies) enemyById.set(e.id, e);

  const usedTargetIds = new Set<number>();
  const basePositions = state.nodes.map((node, i) => {
    const phase = phaseBase + node.phaseOffset + i * 0.03;
    return {
      x: player.x + Math.cos(phase) * BASE_RADIUS,
      y: player.y + Math.sin(phase) * BASE_RADIUS,
      phase,
    };
  });

  // Preserve current target locks when valid, and force unique assignment.
  for (let i = 0; i < state.nodes.length; i++) {
    const node = state.nodes[i];
    if (node.targetId === undefined) continue;
    const target = enemyById.get(node.targetId);
    if (!target) {
      node.targetId = undefined;
      continue;
    }
    const dxp = target.x - player.x;
    const dyp = target.y - player.y;
    if (dxp * dxp + dyp * dyp > releaseSq) {
      node.targetId = undefined;
      continue;
    }
    if (usedTargetIds.has(target.id)) {
      node.targetId = undefined;
      continue;
    }
    usedTargetIds.add(target.id);
  }

  // Reacquire missing targets with strict uniqueness; no duplicate target locks.
  for (let i = 0; i < state.nodes.length; i++) {
    const node = state.nodes[i];
    if (node.targetId !== undefined) continue;
    const base = basePositions[i];

    let bestUnique: EnemyInstance | undefined;
    let bestUniqueScore = Infinity;

    for (const e of activeEnemies) {
      const dxPlayer = e.x - player.x;
      const dyPlayer = e.y - player.y;
      const dPlayerSq = dxPlayer * dxPlayer + dyPlayer * dyPlayer;
      if (dPlayerSq > acquireSq) continue;
      if (usedTargetIds.has(e.id)) continue;

      const dx = e.x - base.x;
      const dy = e.y - base.y;
      const score = dx * dx + dy * dy;
      if (score < bestUniqueScore) {
        bestUniqueScore = score;
        bestUnique = e;
      }
    }

    const chosen = bestUnique;
    if (chosen) {
      node.targetId = chosen.id;
      usedTargetIds.add(chosen.id);
    }
  }

  // Smooth movement update.
  for (let i = 0; i < state.nodes.length; i++) {
    const node = state.nodes[i];
    const base = basePositions[i];
    node.px = node.x;
    node.py = node.y;

    let desiredX = base.x;
    let desiredY = base.y;
    let nextLock = 0;

    if (node.targetId !== undefined) {
      const target = enemyById.get(node.targetId);
      if (!target) {
        node.targetId = undefined;
      } else {
        const tx = target.x + target.vx * LEAD_SEC;
        const ty = target.y + target.vy * LEAD_SEC;
        const dx = tx - base.x;
        const dy = ty - base.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const pull = Math.min(MAX_LEASH, dist);
        const nx = dx / dist;
        const ny = dy / dist;
        const tangentJitter =
          Math.sin(t * 3.4 + base.phase * 0.7) * (1.2 + node.lockRatio * 2.6);
        desiredX = base.x + nx * pull + -ny * tangentJitter;
        desiredY = base.y + ny * pull + nx * tangentJitter;
        nextLock = pull / MAX_LEASH;
      }
    }

    node.lockRatio += (nextLock - node.lockRatio) * Math.min(1, dt * 9);
    const stiffness = BASE_STIFFNESS + node.lockRatio * 110;
    const damping = 2 * Math.sqrt(stiffness);
    const ax = (desiredX - node.x) * stiffness - node.vx * damping;
    const ay = (desiredY - node.y) * stiffness - node.vy * damping;
    node.vx += ax * dt;
    node.vy += ay * dt;

    const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
    const speedCap = MAX_SPEED;
    if (speed > speedCap) {
      node.vx = (node.vx / speed) * speedCap;
      node.vy = (node.vy / speed) * speedCap;
    }
    node.x += node.vx * dt;
    node.y += node.vy * dt;

    // Stable direction for tail rendering (low-pass filtered).
    if (speed > 8) {
      const ndx = node.vx / speed;
      const ndy = node.vy / speed;
      const blend = Math.min(1, dt * 14);
      node.dirX += (ndx - node.dirX) * blend;
      node.dirY += (ndy - node.dirY) * blend;
      const dLen =
        Math.sqrt(node.dirX * node.dirX + node.dirY * node.dirY) || 1;
      node.dirX /= dLen;
      node.dirY /= dLen;
    }
    node.speed += (speed - node.speed) * Math.min(1, dt * 10);
  }

  return state.nodes.map((n) => ({
    x: n.x,
    y: n.y,
    px: n.px,
    py: n.py,
    dirX: n.dirX,
    dirY: n.dirY,
    speed: n.speed,
    lockRatio: n.lockRatio,
  }));
}

export function getAegisConstellationNodes(
  player: PlayerState
): AegisConstellationNode[] {
  const state = aegisRuntime.get(player);
  if (!state) return [];
  return state.nodes.map((n) => ({
    x: n.x,
    y: n.y,
    px: n.px,
    py: n.py,
    dirX: n.dirX,
    dirY: n.dirY,
    speed: n.speed,
    lockRatio: n.lockRatio,
  }));
}

export function clearAegisConstellationRuntime(player: PlayerState): void {
  aegisRuntime.delete(player);
}

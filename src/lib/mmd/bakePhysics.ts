/**
 * Converts runtime MMD physics into a reusable baked animation.
 * The baker steps animation, IK, grants, and Bullet physics frame by frame,
 * records the transforms of physics-driven bones, and optionally smooths the
 * result so playback can later use simple interpolation without running
 * real-time physics again.
 */

import * as THREE from "three";
// @ts-ignore -- vendored JS (no types)
import { MMDAnimationHelper } from "./MMDAnimationHelper.js";

// Defines the typed data structures produced and consumed by the bake pipeline.

export interface BakedAnimation {
  fps: number;
  totalFrames: number;
  duration: number;
  /** Lists the names of the physics-driven bones captured in this bake. */
  physicsBoneNames: string[];
  /**
   * Stores baked positions in a flat array indexed by bone first, then frame.
   * This layout keeps playback reads simple and cache-friendly.
   */
  positions: Float32Array;
  /**
   * Stores baked quaternions in a flat array indexed by bone first, then frame.
   * Each quaternion is packed as xyzw for direct application during playback.
   */
  quaternions: Float32Array;
}

export interface BakeOptions {
  fps?: number;
  warmup?: number;
  unitStep?: number;
  maxStepNum?: number;
  worldScale?: number;
  /** Overrides the gravity vector used by the temporary baking physics world. */
  gravity?: THREE.Vector3;
  /** Controls the temporal smoothing window applied after raw capture. */
  smoothWindow?: number;
  onProgress?: (pct: number) => void;
  /** Allows the caller to abort baking during long-running jobs. */
  shouldAbort?: () => boolean;
}

// Implements the main bake entry point that captures the final physics-driven animation.

/**
 * Runs the full animation pipeline frame by frame and returns only the
 * transforms for bones controlled by physics. Non-physics bones continue to
 * play their normal animation clips at runtime.
 *
 * The caller should always provide a fresh mesh instance for each bake so
 * Ammo.js state cannot leak across runs.
 *
 * The baker yields periodically so long-running jobs do not freeze the UI.
 */
export async function bakeAnimation(
  mesh: THREE.SkinnedMesh,
  clip: THREE.AnimationClip,
  options: BakeOptions = {}
): Promise<BakedAnimation | null> {
  const fps = options.fps ?? 30;
  const warmup = options.warmup ?? 300;
  const smoothWindow = options.smoothWindow ?? 5;
  const dt = 1 / fps;
  const totalFrames = Math.ceil(clip.duration * fps);

  // Identifies only the bones controlled by Bullet rigid bodies so the baked
  // output contains the minimum data required for playback.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mmd = (mesh.geometry.userData as any).MMD;
  const rigidBodies: { type: number; boneIndex: number }[] = mmd.rigidBodies;
  const physIdxSet = new Set<number>();
  for (const rb of rigidBodies) {
    if (rb.type !== 0 && rb.boneIndex !== -1) physIdxSet.add(rb.boneIndex);
  }

  const physicsBoneNames: string[] = [];
  const physicsBoneIndices: number[] = [];
  mesh.skeleton.bones.forEach((bone: THREE.Bone, idx: number) => {
    if (physIdxSet.has(idx)) {
      physicsBoneNames.push(bone.name);
      physicsBoneIndices.push(idx);
    }
  });

  const boneCount = physicsBoneNames.length;
  const positions = new Float32Array(boneCount * totalFrames * 3);
  const quaternions = new Float32Array(boneCount * totalFrames * 4);

  // Creates a temporary MMD animation helper with physics enabled so the
  // bake can evaluate the same runtime pipeline used during live playback.
  const worldScale = options.worldScale ?? 10;
  const gravity =
    options.gravity ?? new THREE.Vector3(0, -9.8 * 10 * worldScale, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const helper = new (MMDAnimationHelper as any)({
    sync: false,
    resetPhysicsOnLoop: false,
  });
  helper.add(mesh, {
    animation: clip,
    physics: true,
    warmup: 0,
    unitStep: options.unitStep ?? 1 / 200,
    maxStepNum: options.maxStepNum ?? 15,
    worldScale,
    gravity,
  });

  const BATCH_SIZE = 10;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getPhysics = () => (helper as any).objects?.get(mesh)?.physics;

  // Captures the rest pose so the bake can temporarily reset and re-drape the
  // cloth and hair before recording starts.
  const bones = mesh.skeleton.bones as THREE.Bone[];
  const restP = bones.map((b) => b.position.clone());
  const restQ = bones.map((b) => b.quaternion.clone());

  const phys = getPhysics();
  if (phys) phys.warmup(warmup);

  // Captures the first animated pose so the later blend can transition from
  // rest pose into frame zero without violent cloth snaps.
  helper.update(dt);
  const f0P = bones.map((b) => b.position.clone());
  const f0Q = bones.map((b) => b.quaternion.clone());

  // Resets back to the rest pose and re-drapes the physics state before the
  // controlled blend into frame zero.
  if (phys) phys.reset();
  bones.forEach((b, i) => {
    b.position.copy(restP[i]);
    b.quaternion.copy(restQ[i]);
  });
  mesh.updateMatrixWorld(true);
  if (phys) phys.warmup(warmup);

  // Blends from the rest pose into the first animated frame while temporarily
  // boosting gravity so cloth and hair settle downward instead of floating or clipping.
  const SUPER_GRAVITY_SCALE = 5;
  const superGravity = gravity.clone().multiplyScalar(SUPER_GRAVITY_SCALE);
  if (phys) phys.setGravity(superGravity);

  // Scales the number of blend steps with the pose difference so larger
  // transitions get more settling time.
  let maxAngle = 0;
  bones.forEach((_, i) => {
    if (physIdxSet.has(i)) return;
    const angle = restQ[i].angleTo(f0Q[i]);
    if (angle > maxAngle) maxAngle = angle;
  });
  const BLEND_STEPS = Math.max(
    120,
    Math.ceil(((maxAngle * 180) / Math.PI) * 3)
  );

  for (let s = 1; s <= BLEND_STEPS; s++) {
    const alpha = s / BLEND_STEPS;
    bones.forEach((b, i) => {
      if (physIdxSet.has(i)) return;
      b.position.lerpVectors(restP[i], f0P[i], alpha);
      b.quaternion.slerpQuaternions(restQ[i], f0Q[i], alpha);
    });
    mesh.updateMatrixWorld(true);
    if (phys) phys.update(dt);
  }

  // Restores the normal gravity vector and lets the mesh settle at frame zero.
  if (phys) {
    phys.setGravity(gravity);
    phys.warmup(200);
  }

  // Runs one non-recording pass through the clip so cloth can settle into a
  // natural periodic state before the actual recording begins.
  for (let frame = 0; frame < totalFrames; frame++) {
    helper.update(dt);

    if (frame % BATCH_SIZE === 0) {
      await new Promise<void>((r) => setTimeout(r, 0));
      if (options.shouldAbort?.()) {
        const p = getPhysics();
        helper.remove(mesh);
        if (p?.dispose) p.dispose();
        return null;
      }
    }
  }

  // Applies another short settling phase at the loop boundary so recording
  // starts from a stable frame-zero state without resetting the cloth.
  if (phys) {
    phys.setGravity(superGravity);
    phys.warmup(200);
    phys.setGravity(gravity);
    phys.warmup(100);
  }

  // Records the physics-driven bone transforms frame by frame into flat arrays.
  for (let frame = 0; frame < totalFrames; frame++) {
    helper.update(dt);

    for (let i = 0; i < boneCount; i++) {
      const bone = mesh.skeleton.bones[physicsBoneIndices[i]];
      const pOff = (i * totalFrames + frame) * 3;
      const qOff = (i * totalFrames + frame) * 4;

      positions[pOff] = bone.position.x;
      positions[pOff + 1] = bone.position.y;
      positions[pOff + 2] = bone.position.z;

      quaternions[qOff] = bone.quaternion.x;
      quaternions[qOff + 1] = bone.quaternion.y;
      quaternions[qOff + 2] = bone.quaternion.z;
      quaternions[qOff + 3] = bone.quaternion.w;
    }

    if (frame % BATCH_SIZE === 0) {
      await new Promise<void>((r) => setTimeout(r, 0));
      if (options.shouldAbort?.()) {
        const p = getPhysics();
        helper.remove(mesh);
        if (p?.dispose) p.dispose();
        return null;
      }
      options.onProgress?.(frame / totalFrames);
    }
  }

  // Tears down the helper and disposes the physics objects created for the bake.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const helperObjects = (helper as any).objects?.get(mesh);
  const physics = helperObjects?.physics;
  helper.remove(mesh);
  if (physics?.dispose) physics.dispose();

  // Applies optional temporal smoothing to reduce small frame-to-frame jitter.
  if (smoothWindow >= 2) {
    smoothBakedData(
      positions,
      quaternions,
      boneCount,
      totalFrames,
      smoothWindow
    );
  }

  options.onProgress?.(1);

  return {
    fps,
    totalFrames,
    duration: clip.duration,
    physicsBoneNames,
    positions,
    quaternions,
  };
}

// ── Temporal gaussian smoothing ────────────────────────

function smoothBakedData(
  positions: Float32Array,
  quaternions: Float32Array,
  boneCount: number,
  totalFrames: number,
  windowSize: number
) {
  const halfW = Math.floor(windowSize / 2);
  const sigma = Math.max(halfW / 2, 0.5);

  // Pre-compute normalised gaussian weights
  const weights: number[] = [];
  let wSum = 0;
  for (let j = -halfW; j <= halfW; j++) {
    const w = Math.exp((-0.5 * (j * j)) / (sigma * sigma));
    weights.push(w);
    wSum += w;
  }
  for (let i = 0; i < weights.length; i++) weights[i] /= wSum;

  // Per-bone scratch buffers (reused)
  const tmpP = new Float32Array(totalFrames * 3);
  const tmpQ = new Float32Array(totalFrames * 4);

  for (let b = 0; b < boneCount; b++) {
    const pBase = b * totalFrames * 3;
    const qBase = b * totalFrames * 4;

    // Copy raw data
    for (let f = 0; f < totalFrames; f++) {
      tmpP[f * 3] = positions[pBase + f * 3];
      tmpP[f * 3 + 1] = positions[pBase + f * 3 + 1];
      tmpP[f * 3 + 2] = positions[pBase + f * 3 + 2];
      tmpQ[f * 4] = quaternions[qBase + f * 4];
      tmpQ[f * 4 + 1] = quaternions[qBase + f * 4 + 1];
      tmpQ[f * 4 + 2] = quaternions[qBase + f * 4 + 2];
      tmpQ[f * 4 + 3] = quaternions[qBase + f * 4 + 3];
    }

    // Weighted average
    for (let f = 0; f < totalFrames; f++) {
      let px = 0,
        py = 0,
        pz = 0;
      let qx = 0,
        qy = 0,
        qz = 0,
        qw = 0;

      // Reference quaternion (centre of window) for hemisphere alignment
      const rqx = tmpQ[f * 4];
      const rqy = tmpQ[f * 4 + 1];
      const rqz = tmpQ[f * 4 + 2];
      const rqw = tmpQ[f * 4 + 3];

      for (let k = 0; k < weights.length; k++) {
        const idx = Math.max(0, Math.min(totalFrames - 1, f + k - halfW));
        const w = weights[k];

        px += tmpP[idx * 3] * w;
        py += tmpP[idx * 3 + 1] * w;
        pz += tmpP[idx * 3 + 2] * w;

        // Flip quaternion if in opposite hemisphere before averaging
        let fx = tmpQ[idx * 4];
        let fy = tmpQ[idx * 4 + 1];
        let fz = tmpQ[idx * 4 + 2];
        let fw = tmpQ[idx * 4 + 3];
        if (fx * rqx + fy * rqy + fz * rqz + fw * rqw < 0) {
          fx = -fx;
          fy = -fy;
          fz = -fz;
          fw = -fw;
        }
        qx += fx * w;
        qy += fy * w;
        qz += fz * w;
        qw += fw * w;
      }

      positions[pBase + f * 3] = px;
      positions[pBase + f * 3 + 1] = py;
      positions[pBase + f * 3 + 2] = pz;

      const len = Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw) || 1;
      quaternions[qBase + f * 4] = qx / len;
      quaternions[qBase + f * 4 + 1] = qy / len;
      quaternions[qBase + f * 4 + 2] = qz / len;
      quaternions[qBase + f * 4 + 3] = qw / len;
    }
  }
}

// ── Playback helper (called every frame during dance) ──

// Reusable quaternions to avoid GC
const _q0 = new THREE.Quaternion();
const _q1 = new THREE.Quaternion();

/**
 * Applies the baked physics bone transforms for the given playback time,
 * linearly interpolating between the two surrounding keyframes.
 */
export function applyBakedFrame(
  baked: BakedAnimation,
  bones: Record<string, THREE.Bone>,
  time: number
): void {
  const wrapped = ((time % baked.duration) + baked.duration) % baked.duration;
  const ft = wrapped * baked.fps;
  const f0 = Math.min(Math.floor(ft), baked.totalFrames - 1);
  const f1 = Math.min(f0 + 1, baked.totalFrames - 1);
  const alpha = ft - Math.floor(ft);

  for (let i = 0; i < baked.physicsBoneNames.length; i++) {
    const bone = bones[baked.physicsBoneNames[i]];
    if (!bone) continue;

    const pBase = i * baked.totalFrames * 3;
    const qBase = i * baked.totalFrames * 4;
    const p0 = pBase + f0 * 3;
    const p1 = pBase + f1 * 3;
    const q0 = qBase + f0 * 4;
    const q1 = qBase + f1 * 4;

    // Lerp position
    bone.position.set(
      baked.positions[p0] + (baked.positions[p1] - baked.positions[p0]) * alpha,
      baked.positions[p0 + 1] +
        (baked.positions[p1 + 1] - baked.positions[p0 + 1]) * alpha,
      baked.positions[p0 + 2] +
        (baked.positions[p1 + 2] - baked.positions[p0 + 2]) * alpha
    );

    // Slerp quaternion
    _q0.set(
      baked.quaternions[q0],
      baked.quaternions[q0 + 1],
      baked.quaternions[q0 + 2],
      baked.quaternions[q0 + 3]
    );
    _q1.set(
      baked.quaternions[q1],
      baked.quaternions[q1 + 1],
      baked.quaternions[q1 + 2],
      baked.quaternions[q1 + 3]
    );
    bone.quaternion.slerpQuaternions(_q0, _q1, alpha);
  }
}

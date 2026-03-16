/**
 * Coordinates the full pre-bake workflow for every character-and-dance
 * combination. The orchestrator checks cache versioning, finds missing bake
 * entries, loads Ammo.js, runs bakes on fresh meshes, and persists the
 * results so the viewer can later play them without live physics.
 */

import * as THREE from "three";
// @ts-ignore -- vendored JS (no types)
import { MMDLoader } from "./MMDLoader.js";
import { loadAmmo } from "./loadAmmo";
import { bakeAnimation } from "./bakePhysics";
import {
  getOrFetchBaked,
  getAllKeys,
  putBaked,
  bakeKey,
  deleteBaked,
  ensureBakeVersion,
} from "./bakeCache";
import type { CharacterModel } from "./modelData";

export interface BakeProgress {
  current: number;
  total: number;
  characterName: string;
  animLabel: string;
}

// Defines the bake parameters shared by the full pre-bake workflow.
const BAKE_FPS = 30;
const BAKE_WARMUP = 500;
const BAKE_UNIT_STEP = 1 / 200;
const BAKE_MAX_SUBSTEPS = 15;
const BAKE_WORLD_SCALE = 10;
const BAKE_SMOOTH_WINDOW = 5;

/** Stores the gravity vector passed into the bake helper. */
const BAKE_GRAVITY = new THREE.Vector3(0, -9.8 * 10 * BAKE_WORLD_SCALE, 0);

/**
 * Encodes the bake configuration into a version string so any parameter change
 * automatically invalidates the old IndexedDB cache.
 */
const BAKE_VERSION = `v5-fps${BAKE_FPS}-wu${BAKE_WARMUP}-us${Math.round(1 / BAKE_UNIT_STEP)}-ms${BAKE_MAX_SUBSTEPS}-ws${BAKE_WORLD_SCALE}-sw${BAKE_SMOOTH_WINDOW}-ps2`;

interface DanceInfo {
  path: string;
  id: string;
}

/** Loads a PMX mesh through MMDLoader using a promise wrapper. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadMesh(loader: any, pmxPath: string): Promise<THREE.SkinnedMesh> {
  return new Promise<THREE.SkinnedMesh>((resolve, reject) => {
    loader.load(
      pmxPath,
      (m: THREE.SkinnedMesh) => resolve(m),
      undefined,
      (err: unknown) => reject(err)
    );
  });
}

/** Loads a VMD animation clip for a specific mesh using a promise wrapper. */
function loadVMD(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader: any,
  vmdPath: string,
  mesh: THREE.SkinnedMesh
): Promise<THREE.AnimationClip> {
  return new Promise<THREE.AnimationClip>((resolve, reject) => {
    loader.loadAnimation(
      vmdPath,
      mesh,
      (c: THREE.AnimationClip) => resolve(c),
      undefined,
      (err: unknown) => reject(err)
    );
  });
}

/** Disposes the Three.js resources attached to a loaded mesh. */
function disposeMesh(mesh: THREE.SkinnedMesh): void {
  mesh.geometry?.dispose();
  if (Array.isArray(mesh.material)) {
    (mesh.material as THREE.Material[]).forEach((m) => m.dispose());
  } else if (mesh.material) {
    (mesh.material as THREE.Material).dispose();
  }
}

/**
 * Bakes every missing character-and-dance combination and stores the results
 * in IndexedDB. If the cache is already complete, the function returns early.
 */
export async function preBakeAll(
  characters: CharacterModel[],
  dances: DanceInfo[],
  onProgress?: (p: BakeProgress) => void
): Promise<void> {
  // Validates the cache version before any expensive work begins.
  await ensureBakeVersion(BAKE_VERSION);

  // Reads the existing bake keys so the orchestrator only processes missing pairs.
  const existingKeys = await getAllKeys();

  // Flattens the missing character-and-dance combinations into a linear work queue.
  interface MissingEntry {
    char: CharacterModel;
    animId: string; // vmd path
    animLabel: string; // display name
  }
  const missing: MissingEntry[] = [];

  for (const char of characters) {
    for (const d of dances) {
      const key = bakeKey(char.id, d.path);
      if (!existingKeys.has(key)) {
        missing.push({ char, animId: d.path, animLabel: d.id });
      }
    }
  }

  // Exits immediately when every combination is already cached.
  if (missing.length === 0) return;

  // Collects only the combinations that still require a local bake pass after
  // cache hydration is attempted.
  const unresolved: MissingEntry[] = [];

  // Tries to hydrate each missing bake from server-hosted cache files before
  // falling back to local baking.
  for (let i = 0; i < missing.length; i++) {
    const entry = missing[i];

    const hydrated = await getOrFetchBaked(
      bakeKey(entry.char.id, entry.animId)
    );

    if (!hydrated) {
      unresolved.push(entry);
    }
  }

  // Skips the expensive physics pipeline entirely when every bake was downloaded from the server.
  if (unresolved.length === 0) return;

  // Ensures Ammo.js is available before the first bake job starts.
  await loadAmmo();

  // Processes each missing bake on a fresh mesh instance so physics state never leaks across jobs.
  const loader = new MMDLoader();

  for (let i = 0; i < unresolved.length; i++) {
    const entry = unresolved[i];

    onProgress?.({
      current: i + 1,
      total: unresolved.length,
      characterName: entry.char.name.en,
      animLabel: entry.animLabel,
    });
    // Yields to the macrotask queue so the browser has time to paint progress
    // updates before the next synchronous bake step begins.
    await new Promise<void>((r) => setTimeout(r, 0));

    try {
      // Loads a fresh mesh so the bake starts from clean Ammo and Three.js state.
      const mesh = await loadMesh(loader, entry.char.pmxPath);
      mesh.scale.setScalar(0.1);

      // Loads the requested animation clip onto that fresh mesh.
      const clip = await loadVMD(loader, entry.animId, mesh);

      // Runs the actual physics bake, including the pre-simulation settling pass.
      const baked = await bakeAnimation(mesh, clip, {
        fps: BAKE_FPS,
        warmup: BAKE_WARMUP,
        unitStep: BAKE_UNIT_STEP,
        maxStepNum: BAKE_MAX_SUBSTEPS,
        worldScale: BAKE_WORLD_SCALE,
        gravity: BAKE_GRAVITY,
        smoothWindow: BAKE_SMOOTH_WINDOW,
      });

      if (baked) {
        await putBaked(bakeKey(entry.char.id, entry.animId), baked);
      }

      // Disposes the mesh's Three.js resources after the bake completes.
      disposeMesh(mesh);
    } catch (err) {
      console.error(
        `Failed to bake ${entry.char.id} / ${entry.animLabel}:`,
        err
      );
    }
  }
}

/**
 * Rebuilds one specific cached bake from scratch after deleting the old entry.
 */
export async function rebakeOne(
  char: CharacterModel,
  vmdPath: string
): Promise<void> {
  await loadAmmo();

  const key = bakeKey(char.id, vmdPath);
  await deleteBaked(key);

  const loader = new MMDLoader();
  const mesh = await loadMesh(loader, char.pmxPath);
  mesh.scale.setScalar(0.1);

  const clip = await loadVMD(loader, vmdPath, mesh);

  const baked = await bakeAnimation(mesh, clip, {
    fps: BAKE_FPS,
    warmup: BAKE_WARMUP,
    unitStep: BAKE_UNIT_STEP,
    maxStepNum: BAKE_MAX_SUBSTEPS,
    worldScale: BAKE_WORLD_SCALE,
    gravity: BAKE_GRAVITY,
    smoothWindow: BAKE_SMOOTH_WINDOW,
  });

  if (baked) {
    await putBaked(key, baked);
  }

  disposeMesh(mesh);
}

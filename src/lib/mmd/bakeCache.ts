/**
 * Persists baked physics animations in IndexedDB so expensive bake jobs can be
 * reused across sessions. Cache versioning is tracked separately so changing
 * bake parameters automatically invalidates stale entries.
 */

import type { BakedAnimation } from "./bakePhysics";

const DB_NAME = "sms-bake-cache";
const DB_VERSION = 1;
const STORE_NAME = "bakes";
const VERSION_KEY = "__bake_version__";
const REMOTE_BAKE_BASE_PATH = "/mmd-bakes";

/** Defines the serializable cache record stored in IndexedDB. */
interface StoredBake {
  fps: number;
  totalFrames: number;
  duration: number;
  physicsBoneNames: string[];
  positions: ArrayBuffer;
  quaternions: ArrayBuffer;
}

/**
 * Defines the JSON payload format used when baked animations are hosted by the
 * server instead of being generated on each client.
 */
export interface SerializedBake {
  fps: number;
  totalFrames: number;
  duration: number;
  physicsBoneNames: string[];
  positions: number[];
  quaternions: number[];
}

let dbPromise: Promise<IDBDatabase> | null = null;

// Opens the IndexedDB database once and reuses the same promise for future callers.
export function openBakeDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// Loads one cached bake and reconstructs the typed arrays used by runtime playback.
export async function getBaked(key: string): Promise<BakedAnimation | null> {
  const db = await openBakeDB();
  return new Promise<BakedAnimation | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => {
      const stored = req.result as StoredBake | undefined;
      if (!stored) {
        resolve(null);
        return;
      }
      resolve({
        fps: stored.fps,
        totalFrames: stored.totalFrames,
        duration: stored.duration,
        physicsBoneNames: stored.physicsBoneNames,
        positions: new Float32Array(stored.positions),
        quaternions: new Float32Array(stored.quaternions),
      });
    };
    req.onerror = () => reject(req.error);
  });
}

// Stores one baked animation by copying its typed-array payload into serializable buffers.
export async function putBaked(
  key: string,
  baked: BakedAnimation
): Promise<void> {
  const db = await openBakeDB();
  const stored: StoredBake = {
    fps: baked.fps,
    totalFrames: baked.totalFrames,
    duration: baked.duration,
    physicsBoneNames: baked.physicsBoneNames,
    positions: (baked.positions.buffer as ArrayBuffer).slice(
      baked.positions.byteOffset,
      baked.positions.byteOffset + baked.positions.byteLength
    ),
    quaternions: (baked.quaternions.buffer as ArrayBuffer).slice(
      baked.quaternions.byteOffset,
      baked.quaternions.byteOffset + baked.quaternions.byteLength
    ),
  };
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(stored, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Returns every cached bake key except the reserved version sentinel.
export async function getAllKeys(): Promise<Set<string>> {
  const db = await openBakeDB();
  return new Promise<Set<string>>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAllKeys();
    req.onsuccess = () => {
      const keys = new Set(req.result as string[]);
      keys.delete(VERSION_KEY);
      resolve(keys);
    };
    req.onerror = () => reject(req.error);
  });
}

// Builds the stable cache key used for one character-and-animation combination.
export function bakeKey(charId: string, animId: string): string {
  return `${charId}::${animId}`;
}

// Converts an in-memory bake into the JSON shape used for server-hosted cache files.
export function serializeBakedAnimation(
  baked: BakedAnimation
): SerializedBake {
  return {
    fps: baked.fps,
    totalFrames: baked.totalFrames,
    duration: baked.duration,
    physicsBoneNames: baked.physicsBoneNames,
    positions: Array.from(baked.positions),
    quaternions: Array.from(baked.quaternions),
  };
}

// Rebuilds typed arrays after a bake payload has been downloaded from the server.
export function deserializeBakedAnimation(
  stored: SerializedBake
): BakedAnimation {
  return {
    fps: stored.fps,
    totalFrames: stored.totalFrames,
    duration: stored.duration,
    physicsBoneNames: stored.physicsBoneNames,
    positions: new Float32Array(stored.positions),
    quaternions: new Float32Array(stored.quaternions),
  };
}

// Encodes cache keys into filename-safe IDs so baked payloads can be stored in public assets.
export function bakeAssetFileName(key: string): string {
  return `${btoa(key)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")}.json`;
}

// Downloads one baked animation from the server when a precomputed payload exists there.
export async function fetchRemoteBaked(
  key: string
): Promise<BakedAnimation | null> {
  const response = await fetch(
    `${REMOTE_BAKE_BASE_PATH}/${bakeAssetFileName(key)}`,
    {
      cache: "force-cache",
    }
  );
  if (!response.ok) return null;
  const payload = (await response.json()) as SerializedBake;
  return deserializeBakedAnimation(payload);
}

// Reuses local cached bakes first, then hydrates IndexedDB from the server-hosted payload when available.
export async function getOrFetchBaked(
  key: string
): Promise<BakedAnimation | null> {
  const local = await getBaked(key);
  if (local) return local;

  try {
    const remote = await fetchRemoteBaked(key);
    if (!remote) return null;
    await putBaked(key, remote);
    return remote;
  } catch {
    return null;
  }
}

/** Deletes a single cached bake entry. */
export async function deleteBaked(key: string): Promise<void> {
  const db = await openBakeDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Clears every cached bake entry from IndexedDB. */
export async function clearAllBakes(): Promise<void> {
  const db = await openBakeDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Ensures the cache version matches the current bake parameter version.
 * A mismatch clears all stored bakes so future reads cannot use outdated data.
 */
export async function ensureBakeVersion(version: string): Promise<boolean> {
  const db = await openBakeDB();
  const stored = await new Promise<string | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(VERSION_KEY);
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
  });

  if (stored === version) return false;

  // Clears the cache on version mismatch so stale bake payloads cannot be reused.
  await clearAllBakes();

  // Persists the new version sentinel after the reset completes.
  const db2 = await openBakeDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db2.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(version, VERSION_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  return true;
}

"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sparkles } from "@react-three/drei";
import * as THREE from "three";
// @ts-ignore -- vendored JS from three.js r170 (no types)
import { MMDLoader } from "@/lib/mmd/MMDLoader.js";
// @ts-ignore -- vendored JS from three.js r170 (no types)
import { MMDAnimationHelper } from "@/lib/mmd/MMDAnimationHelper.js";
import { applyBakedFrame } from "@/lib/mmd/bakePhysics";
import type { BakedAnimation } from "@/lib/mmd/bakePhysics";
import { getOrFetchBaked, bakeKey } from "@/lib/mmd/bakeCache";
import { MODELS } from "@/lib/mmd/modelData";
import type { DanceItem } from "@/lib/mmd/modelData";
import SvgIcon from "@/components/ui/SvgIcon";
import { usePointsStore } from "@/store/pointsStore";
import { motion } from "framer-motion";

const MODEL_Y = -0.9;
const STAGE_Y = -0.9;
const MAX_DELTA = 0.05;

// Loads the PMX model, manages the baked-animation lifecycle, and switches
// between idle and dance playback states.
function PMXModel({
  characterId,
  pmxPath,
  dancing,
  vmdPath,
  bakeVersion,
  onReady,
  onLoading,
}: {
  characterId: string;
  pmxPath: string;
  dancing: boolean;
  vmdPath: string;
  bakeVersion?: number;
  onReady?: () => void;
  onLoading?: () => void;
}) {
  const meshRef = useRef<THREE.SkinnedMesh | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const helperRef = useRef<any>(null);
  const idleTimeRef = useRef(0);
  const danceTimeRef = useRef(0);
  const bonesRef = useRef<Record<string, THREE.Bone>>({});
  const restPoseRef = useRef<
    Map<string, { q: THREE.Quaternion; p: THREE.Vector3 }>
  >(new Map());
  const restMorphRef = useRef<number[]>([]);
  const bakedRef = useRef<BakedAnimation | null>(null);
  const vmdClipCacheRef = useRef<Map<string, THREE.AnimationClip>>(new Map());
  const [ready, setReady] = useState(false);

  const dancingRef = useRef(dancing);
  dancingRef.current = dancing;
  const vmdPathRef = useRef(vmdPath);
  vmdPathRef.current = vmdPath;
  const vmdLoadedRef = useRef("");

  const { scene } = useThree();

  // Restores the captured rest pose so a dance can be restarted or replaced
  // without carrying over previous bone transforms.
  const restorePose = (mesh: THREE.SkinnedMesh) => {
    restPoseRef.current.forEach(({ q, p }, name) => {
      const bone = bonesRef.current[name];
      if (bone) {
        bone.quaternion.copy(q);
        bone.position.copy(p);
      }
    });
    if (mesh.morphTargetInfluences && restMorphRef.current.length > 0) {
      for (let i = 0; i < mesh.morphTargetInfluences.length; i++) {
        mesh.morphTargetInfluences[i] = restMorphRef.current[i] ?? 0;
      }
    }
  };

  // Creates the MMD animation helper used to drive VMD playback on the loaded mesh.
  const createDanceHelper = (
    mesh: THREE.SkinnedMesh,
    clip: THREE.AnimationClip
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const helper = new (MMDAnimationHelper as any)({ sync: false });
    helper.add(mesh, { animation: clip, physics: false });
    return helper;
  };

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    onLoading?.();

    // Loads the character mesh and the initial dance clip together so the
    // viewer can show either the idle pose or a baked dance immediately.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loader = new MMDLoader() as any;
    const initialVmd = vmdPathRef.current;

    loader.loadWithAnimation(
      pmxPath,
      initialVmd,
      async (mmd: {
        mesh: THREE.SkinnedMesh;
        animation: THREE.AnimationClip;
      }) => {
        if (cancelled) {
          mmd.mesh.geometry?.dispose();
          return;
        }

        const mesh = mmd.mesh;
        const vmdClip = mmd.animation;
        mesh.scale.setScalar(0.1);
        mesh.position.set(0, MODEL_Y, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = false;

        if (Array.isArray(mesh.material)) {
          (mesh.material as THREE.ShaderMaterial[]).forEach((mat) => {
            if (mat.uniforms?.emissive) {
              (mat.uniforms.emissive.value as THREE.Color).multiplyScalar(0.15);
            }
            mat.needsUpdate = true;
          });
        }
        mesh.visible = false;

        // Captures the skeleton rest pose so later dance switches can reset the
        // model before a new clip is applied.
        const bones: Record<string, THREE.Bone> = {};
        const rest = new Map<
          string,
          { q: THREE.Quaternion; p: THREE.Vector3 }
        >();
        mesh.skeleton.bones.forEach((bone: THREE.Bone) => {
          bones[bone.name] = bone;
          rest.set(bone.name, {
            q: bone.quaternion.clone(),
            p: bone.position.clone(),
          });
        });
        bonesRef.current = bones;
        restPoseRef.current = rest;
        if (mesh.morphTargetInfluences)
          restMorphRef.current = [...mesh.morphTargetInfluences];

        vmdClipCacheRef.current.set(initialVmd, vmdClip);

        if (dancingRef.current) {
          const baked = await getOrFetchBaked(bakeKey(characterId, initialVmd));
          if (cancelled) return;
          bakedRef.current = baked;
          helperRef.current = createDanceHelper(mesh, vmdClip);
          danceTimeRef.current = 0;
        } else {
          bakedRef.current = null;
          idleTimeRef.current = 0;
        }

        meshRef.current = mesh;
        vmdLoadedRef.current = initialVmd;
        scene.add(mesh);

        requestAnimationFrame(() => {
          if (cancelled) return;
          mesh.visible = true;
          setReady(true);
          onReady?.();
        });
      },
      undefined,
      (err: unknown) => console.error("MMD load error:", err)
    );

    return () => {
      cancelled = true;
      if (meshRef.current) {
        scene.remove(meshRef.current);
        meshRef.current.geometry?.dispose();
        if (Array.isArray(meshRef.current.material)) {
          meshRef.current.material.forEach((m: THREE.Material) => m.dispose());
        }
      }
      if (helperRef.current && meshRef.current)
        helperRef.current.remove(meshRef.current);
      meshRef.current = null;
      helperRef.current = null;
      bonesRef.current = {};
      restPoseRef.current = new Map();
      restMorphRef.current = [];
      bakedRef.current = null;
      vmdClipCacheRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  useEffect(() => {
    // Switches the model between idle and dance mode without reloading the mesh.
    const mesh = meshRef.current;
    if (!mesh) return;
    let cancelled = false;
    if (helperRef.current) {
      helperRef.current.remove(mesh);
      helperRef.current = null;
    }
    restorePose(mesh);
    mesh.updateMatrixWorld(true);

    if (dancing) {
      const vmdClip = vmdClipCacheRef.current.get(vmdPathRef.current);
      if (!vmdClip) return;
      const setup = async () => {
        const baked = await getOrFetchBaked(
          bakeKey(characterId, vmdPathRef.current)
        );
        if (cancelled) return;
        bakedRef.current = baked;
        helperRef.current = createDanceHelper(mesh, vmdClip);
        danceTimeRef.current = 0;
      };
      setup();
    } else {
      bakedRef.current = null;
      idleTimeRef.current = 0;
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dancing]);

  useEffect(() => {
    // Swaps to a different VMD clip while reusing the already loaded PMX mesh.
    const mesh = meshRef.current;
    if (!mesh) return;
    if (vmdPath === vmdLoadedRef.current) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loader = new MMDLoader() as any;
    const cachedClip = vmdClipCacheRef.current.get(vmdPath);

    const applyClip = async (clip: THREE.AnimationClip) => {
      if (cancelled || !meshRef.current) return;
      if (helperRef.current) helperRef.current.remove(mesh);
      helperRef.current = null;
      restorePose(mesh);
      mesh.updateMatrixWorld(true);
      const baked = await getOrFetchBaked(bakeKey(characterId, vmdPath));
      if (cancelled) return;
      bakedRef.current = baked;
      if (dancingRef.current) {
        helperRef.current = createDanceHelper(mesh, clip);
        danceTimeRef.current = 0;
      }
      mesh.updateMatrixWorld(true);
      vmdLoadedRef.current = vmdPath;
    };

    if (cachedClip) {
      applyClip(cachedClip);
    } else {
      loader.loadAnimation(
        vmdPath,
        mesh,
        (clip: THREE.AnimationClip) => {
          vmdClipCacheRef.current.set(vmdPath, clip);
          applyClip(clip);
        },
        undefined,
        (err: unknown) => console.error("VMD load error:", err)
      );
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vmdPath]);

  // Refresh baked animation data when the active bake version changes.
  useEffect(() => {
    if (!bakeVersion || !dancingRef.current) return;
    let cancelled = false;
    getOrFetchBaked(bakeKey(characterId, vmdPathRef.current)).then((baked) => {
      if (!cancelled) bakedRef.current = baked;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bakeVersion]);

  useFrame((_, rawDelta) => {
    if (!ready || !meshRef.current) return;
    const delta = Math.min(rawDelta, MAX_DELTA);

    if (dancingRef.current && helperRef.current) {
      helperRef.current.update(delta);
      danceTimeRef.current += delta;
      if (bakedRef.current) {
        applyBakedFrame(
          bakedRef.current,
          bonesRef.current,
          danceTimeRef.current
        );
        meshRef.current.updateMatrixWorld(true);
      }
    } else {
      idleTimeRef.current += delta;
      const t = idleTimeRef.current;
      const bones = bonesRef.current;
      const center =
        bones["\u30BB\u30F3\u30BF\u30FC"] ||
        bones["center"] ||
        bones["\u5168\u3066\u306E\u89AA"];
      const upper = bones["\u4E0A\u534A\u8EAB"] || bones["upper body"];
      const head = bones["\u982D"] || bones["head"];
      if (center) center.position.y += Math.sin(t * 1.2) * 0.003;
      if (upper) {
        upper.rotation.z = Math.sin(t * 0.5) * 0.012;
        upper.rotation.x = Math.sin(t * 0.6) * 0.008;
      }
      if (head) {
        head.rotation.z = Math.sin(t * 0.8) * 0.015;
        head.rotation.x = Math.sin(t * 0.6) * 0.008;
      }
    }
  });

  return null;
}

// Builds the decorative stage platform that grounds the character viewer inside the 3D scene.
const RING_WIDTH = 0.025;

function Stage({ visible, color }: { visible: boolean; color: string }) {
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (outerRingRef.current) outerRingRef.current.rotation.z += delta * 0.15;
    if (innerRingRef.current) innerRingRef.current.rotation.z -= delta * 0.25;
  });
  if (!visible) return null;
  return (
    <group position={[0, STAGE_Y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.4 + RING_WIDTH, 96]} />
        <meshStandardMaterial color="#000" transparent opacity={0.12} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[1.4 + RING_WIDTH, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.06} />
      </mesh>
      <mesh
        ref={outerRingRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.002, 0]}
      >
        <ringGeometry args={[1.4, 1.4 + RING_WIDTH, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[1.0, 1.0 + RING_WIDTH, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} />
      </mesh>
      <mesh
        ref={innerRingRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.002, 0]}
      >
        <ringGeometry args={[0.6, 0.6 + RING_WIDTH, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

function LoadingIndicator() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 2;
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.3, 0.05, 16, 32]} />
      <meshBasicMaterial color="#00e5ff" transparent opacity={0.6} />
    </mesh>
  );
}

// Renders the full MMD viewer, combining the 3D canvas with the model and dance selectors.
export default function MMDViewer({
  bakeVersion: externalBakeVersion,
}: {
  bakeVersion?: number;
}) {
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [selectedDance, setSelectedDance] = useState<DanceItem | null>(null);
  const [activeDance, setActiveDance] = useState<DanceItem | null>(null);
  const [danceTransition, setDanceTransition] = useState<{
    phase: "idle_reset" | "engaging";
    fromLabel: string;
    toLabel: string;
  } | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [viewportReady, setViewportReady] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  // Tracks whether baked animation data is still being prepared and how far that preprocessing has progressed.
  const [bakeReady, setBakeReady] = useState(false);
  const [bakeProgress, setBakeProgress] = useState<{
    current: number;
    total: number;
    characterName: string;
    animLabel: string;
  } | null>(null);
  const [internalBakeVersion, setInternalBakeVersion] = useState(0);
  const bakeVersion = externalBakeVersion ?? internalBakeVersion;

  const { purchases, purchaseItem, points, dances, fetchDances } =
    usePointsStore();
  const danceSwitchTimerRef = useRef<number | null>(null);
  const DANCE_IDLE_RESET_MS = 500;
  const DANCE_ENGAGE_MS = 380;

  useEffect(() => {
    fetchDances();
  }, [fetchDances]);

  useEffect(
    () => () => {
      if (danceSwitchTimerRef.current !== null) {
        window.clearTimeout(danceSwitchTimerRef.current);
        danceSwitchTimerRef.current = null;
      }
    },
    []
  );

  // Pre-bakes every available character-and-dance combination after the dance list loads so later switching feels immediate.
  useEffect(() => {
    if (dances.length === 0) return;
    let cancelled = false;

    import("@/lib/mmd/preBakeAll").then(({ preBakeAll }) => {
      import("@/lib/mmd/modelData").then(({ CHARACTER_MODELS }) => {
        const danceInfos = dances.map((d) => ({ path: d.vmdPath, id: d.id }));
        preBakeAll(CHARACTER_MODELS, danceInfos, (p) => {
          if (!cancelled) setBakeProgress(p);
        })
          .then(() => {
            if (!cancelled) {
              setBakeReady(true);
              setInternalBakeVersion((v) => v + 1);
            }
          })
          .catch((err) => {
            console.error("Pre-bake error:", err);
            if (!cancelled) setBakeReady(true);
          });
      });
    });

    return () => {
      cancelled = true;
    };
  }, [dances]);

  const isModelOwned = useCallback(
    (modelId: string) =>
      purchases.some((p) => p.itemType === "model" && p.itemId === modelId),
    [purchases]
  );

  const isDanceOwned = useCallback(
    (danceId: string) =>
      purchases.some((p) => p.itemType === "dance" && p.itemId === danceId),
    [purchases]
  );

  const currentModelOwned = isModelOwned(selectedModel.id);
  const currentDanceOwned = selectedDance
    ? isDanceOwned(selectedDance.id)
    : true;
  const canPlay = currentModelOwned && currentDanceOwned;

  // Holds the blur overlay until the viewport has visibly settled with the loaded model.
  useEffect(() => {
    if (!currentModelOwned || dances.length === 0 || !bakeReady || !sceneReady) {
      setViewportReady(false);
      return;
    }

    const timer = window.setTimeout(() => setViewportReady(true), 180);
    return () => window.clearTimeout(timer);
  }, [bakeReady, currentModelOwned, dances.length, sceneReady]);

  const handleBuy = async (type: "model" | "dance", id: string) => {
    setPurchasing(true);
    await purchaseItem(type, id);
    setPurchasing(false);
  };

  // Tracks whether the square 3D viewport should stay in its loading state.
  const showViewportLoading =
    currentModelOwned && (dances.length === 0 || !bakeReady || !viewportReady);
  // Labels the viewport overlay according to the active loading stage.
  const loadingTitle = !bakeReady ? "Baking Physics" : "Loading Viewer";
  const loadingSubtitle = !bakeReady
    ? bakeProgress
      ? `${bakeProgress.characterName} — ${bakeProgress.animLabel}`
      : "Preparing motion cache"
    : dances.length === 0
      ? "Loading dance library"
      : "Loading model assets and stage";

  const startDanceTransition = useCallback(
    (targetDance: DanceItem) => {
      if (danceSwitchTimerRef.current !== null) {
        window.clearTimeout(danceSwitchTimerRef.current);
        danceSwitchTimerRef.current = null;
      }

      const fromLabel = activeDance?.name || "Idle";
      setSelectedDance(targetDance);
      setDanceTransition({
        phase: "idle_reset",
        fromLabel,
        toLabel: targetDance.name,
      });
      setActiveDance(null);

      danceSwitchTimerRef.current = window.setTimeout(() => {
        setActiveDance(targetDance);
        setDanceTransition({
          phase: "engaging",
          fromLabel: "Idle",
          toLabel: targetDance.name,
        });
        danceSwitchTimerRef.current = window.setTimeout(() => {
          setDanceTransition(null);
          danceSwitchTimerRef.current = null;
        }, DANCE_ENGAGE_MS);
      }, DANCE_IDLE_RESET_MS);
    },
    [activeDance]
  );

  const handleSelectIdle = useCallback(() => {
    if (danceSwitchTimerRef.current !== null) {
      window.clearTimeout(danceSwitchTimerRef.current);
      danceSwitchTimerRef.current = null;
    }
    setSelectedDance(null);
    setActiveDance(null);
    setDanceTransition(null);
  }, []);

  const handleSelectDance = useCallback(
    (dance: DanceItem) => {
      if (!isDanceOwned(dance.id)) return;
      if (
        selectedDance?.id === dance.id &&
        activeDance?.id === dance.id &&
        !danceTransition
      )
        return;

      // Route dance changes through the idle pose before starting the next clip.
      startDanceTransition(dance);
    },
    [
      activeDance,
      danceTransition,
      isDanceOwned,
      selectedDance,
      startDanceTransition,
    ]
  );

  return (
    <div className="flex gap-4 h-full" style={{ minHeight: "380px" }}>
      {/* Hosts the live 3D viewport where the selected model and dance are rendered. */}
      <div
        className="rounded-xl overflow-hidden relative flex-1"
        style={{
          background: "rgba(0,0,0,0.4)",
          border: "1px solid var(--border-subtle)",
          minWidth: 0,
        }}
      >
        {/* Applies the blur transition only to the left 3D viewport content. */}
        <motion.div
          className="absolute inset-0 rounded-[inherit]"
          animate={{
            filter: showViewportLoading ? "blur(10px)" : "blur(0px)",
            scale: showViewportLoading ? 1.01 : 1,
          }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {!currentModelOwned ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div
                  className="mb-3 flex w-full items-center justify-center"
                  style={{ color: "var(--text-dim)" }}
                >
                  <SvgIcon name="lock" size={36} />
                </div>
                <div
                  className="text-[15px] font-bold tracking-wider"
                  style={{ color: "var(--text-dim)" }}
                >
                  MODEL LOCKED
                </div>
                <button
                  onClick={() => handleBuy("model", selectedModel.id)}
                  disabled={purchasing || points < selectedModel.price}
                  className="mt-3 px-4 py-1.5 rounded-lg text-[13px] font-bold tracking-wider transition-all"
                  style={{
                    background: "var(--neon-cyan-dim)",
                    color: "var(--neon-cyan)",
                    border: "1px solid rgba(0,229,255,0.3)",
                    opacity: purchasing || points < selectedModel.price ? 0.5 : 1,
                  }}
                >
                  {purchasing ? "BUYING..." : `BUY - ${selectedModel.price} PTS`}
                </button>
              </div>
            </div>
          ) : dances.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <motion.div
                className="w-10 h-10 rounded-full"
                style={{
                  border: "2px solid rgba(0,229,255,0.15)",
                  borderTopColor: "var(--neon-cyan)",
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          ) : (
            <Canvas
              camera={{ position: [0, 0.3, 4.0], fov: 32 }}
              style={{ background: "transparent" }}
              gl={{ alpha: true, antialias: true }}
              shadows
            >
              <Suspense fallback={<LoadingIndicator />}>
                <ambientLight intensity={0.1} />
                <hemisphereLight args={["#c8b8a0", "#2a2a3a", 0.15]} />
                <directionalLight
                  position={[2.5, 5, 3]}
                  intensity={1.4}
                  color="#fff5e8"
                  castShadow
                  shadow-mapSize-width={1024}
                  shadow-mapSize-height={1024}
                />
                <directionalLight
                  position={[-3, 2, -1]}
                  intensity={0.06}
                  color="#b0c0d0"
                />
                <directionalLight
                  position={[-1, 3, -5]}
                  intensity={0.9}
                  color="#e0e8ff"
                />
                <pointLight
                  position={[0.5, 0.3, 3.5]}
                  intensity={0.4}
                  color={selectedModel.elementColor}
                  distance={8}
                />

                <PMXModel
                  characterId={selectedModel.id}
                  pmxPath={selectedModel.pmxPath}
                  dancing={canPlay && !!activeDance}
                  vmdPath={activeDance?.vmdPath || dances[0].vmdPath}
                  bakeVersion={bakeVersion}
                  onReady={() => setSceneReady(true)}
                  onLoading={() => setSceneReady(false)}
                />
                <Stage visible={sceneReady} color={selectedModel.elementColor} />
                {sceneReady && (
                  <Sparkles
                    count={30}
                    scale={4}
                    size={2}
                    speed={0.3}
                    color={selectedModel.elementColor}
                    opacity={0.4}
                  />
                )}
                <OrbitControls
                  enablePan={false}
                  minDistance={2}
                  maxDistance={6}
                  minPolarAngle={Math.PI / 6}
                  maxPolarAngle={Math.PI / 2.2}
                  target={[0, 0.15, 0]}
                />
              </Suspense>
            </Canvas>
          )}
        </motion.div>

        {/* Covers the 3D viewport while scene assets or cached animation data are still loading. */}
        {showViewportLoading && (
          <motion.div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[inherit]"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background:
                "radial-gradient(120% 120% at 50% 0%, rgba(255,255,255,0.05) 0%, rgba(6,8,13,0.78) 34%, rgba(6,8,13,0.9) 100%)",
              backdropFilter: "blur(14px)",
            }}
          >
            <div className="relative flex flex-col items-center gap-4">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: "1px solid rgba(255,153,102,0.24)",
                    boxShadow: "0 0 30px rgba(255,153,102,0.14)",
                  }}
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 9,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <motion.div
                  className="absolute inset-[10px] rounded-full"
                  style={{ border: "1px dashed rgba(255,255,255,0.16)" }}
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 14,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <motion.div
                  className="h-4 w-4 rounded-full"
                  style={{
                    background: "var(--neon-orange)",
                    boxShadow: "0 0 20px rgba(255,153,102,0.35)",
                  }}
                  animate={{
                    scale: [0.92, 1.1, 0.92],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
              </div>

              <div className="text-center">
                <div
                  className="text-[12px] font-bold tracking-[0.22em] uppercase"
                  style={{
                    color: "var(--neon-orange)",
                    fontFamily: "var(--font-orbitron)",
                  }}
                >
                  {loadingTitle}
                </div>
                <div
                  className="mt-2 text-[12px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {loadingSubtitle}
                </div>
                {!bakeReady && bakeProgress && (
                  <>
                    <div
                      className="mt-3 h-1.5 w-40 overflow-hidden rounded-full"
                      style={{ background: "rgba(255,153,102,0.12)" }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: "var(--neon-orange)" }}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(bakeProgress.current / bakeProgress.total) * 100}%`,
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <div
                      className="mt-1.5 text-[11px]"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {bakeProgress.current} / {bakeProgress.total}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Hosts the controls used to change the character model and dance clip. */}
      <div
        className="flex flex-col gap-3 justify-center"
        style={{ width: "210px", flexShrink: 0 }}
      >
        {/* Lets the user switch between the available MMD character models. */}
        <div>
          <div
            className="text-[12px] font-bold tracking-[0.12em] uppercase mb-1.5"
            style={{ color: "var(--text-dim)" }}
          >
            CHARACTER
          </div>
          <div className="flex flex-col gap-1.5">
            {MODELS.map((m) => {
              const owned = isModelOwned(m.id);
              const active = selectedModel.id === m.id;
              return (
                <motion.button
                  key={m.id}
                  onClick={() => {
                    setSceneReady(false);
                    setSelectedModel(m);
                  }}
                  className="w-full py-1.5 px-2 rounded-lg text-[13px] font-bold tracking-wider transition-all text-left flex items-center gap-2"
                  style={{
                    background: active
                      ? "var(--neon-cyan-dim)"
                      : "rgba(0,0,0,0.3)",
                    color: active ? "var(--neon-cyan)" : "var(--text-dim)",
                    border: active
                      ? "1px solid rgba(0,229,255,0.3)"
                      : "1px solid var(--border-subtle)",
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: m.elementColor }}
                  />
                  {!owned && (
                    <SvgIcon
                      name="lock"
                      size={10}
                      style={{
                        display: "inline-block",
                        verticalAlign: "middle",
                      }}
                    />
                  )}
                  <span className="truncate">{m.name}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Lets the user switch between the available dance animations. */}
        <div>
          <div
            className="text-[12px] font-bold tracking-[0.12em] uppercase mb-1.5"
            style={{ color: "var(--text-dim)" }}
          >
            DANCE
          </div>
          <div className="flex flex-col gap-1.5">
            <motion.button
              onClick={handleSelectIdle}
              className="w-full py-1.5 px-2 rounded-lg text-[13px] font-bold tracking-wider transition-all text-left"
              style={{
                background:
                  !selectedDance && !danceTransition
                    ? "var(--neon-orange-dim)"
                    : "rgba(0,0,0,0.3)",
                color:
                  !selectedDance && !danceTransition
                    ? "var(--neon-orange)"
                    : "var(--text-dim)",
                border:
                  !selectedDance && !danceTransition
                    ? "1px solid rgba(255,107,44,0.3)"
                    : "1px solid var(--border-subtle)",
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              IDLE
            </motion.button>
            {dances.map((d) => {
              const owned = isDanceOwned(d.id);
              const active = selectedDance?.id === d.id;
              return (
                <motion.button
                  key={d.id}
                  onClick={() => handleSelectDance(d)}
                  className="w-full py-1.5 px-2 rounded-lg text-[13px] font-bold tracking-wider transition-all text-left flex items-center gap-2"
                  style={{
                    background: active
                      ? "var(--neon-orange-dim)"
                      : "rgba(0,0,0,0.3)",
                    color: active ? "var(--neon-orange)" : "var(--text-dim)",
                    border: active
                      ? "1px solid rgba(255,107,44,0.3)"
                      : "1px solid var(--border-subtle)",
                    opacity: owned ? 1 : 0.6,
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {!owned && (
                    <SvgIcon
                      name="lock"
                      size={10}
                      style={{
                        display: "inline-block",
                        verticalAlign: "middle",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <span className="truncate">{d.name}</span>
                  {!owned && (
                    <span
                      className="text-[11px] px-1 py-0.5 rounded cursor-pointer ml-auto flex-shrink-0"
                      style={{
                        background: "rgba(0,229,255,0.1)",
                        color: "var(--neon-cyan)",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBuy("dance", d.id);
                      }}
                    >
                      {d.price}pts
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

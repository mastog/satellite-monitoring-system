"use client";

import {
  useRef,
  useMemo,
  useCallback,
  Suspense,
  createContext,
  useContext,
  memo,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Stars,
  Sphere,
  Line,
  Html,
  useTexture,
  useProgress,
} from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { useAppStore, SatelliteData } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";
import { useVisibleSatellites } from "@/store/selectors";
import { formatAltitude, formatVelocity } from "@/lib/units";
import { propagate, generateOrbitPath } from "@/lib/satellite/propagator";
import {
  computeDashboardStats,
  computeLeoDensity,
} from "@/lib/stats/dashboardStats";

/* Shares the accumulated simulation clock so orbiting scene elements stay synchronized. */
const SimTimeContext = createContext<React.RefObject<number>>({
  current: 0,
} as React.RefObject<number>);

/* Converts geographic coordinates into a Cartesian position on the globe surface for markers, satellites, and overlays. */
function latLngToVector3(
  lat: number,
  lng: number,
  radius: number
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/* Stores a reusable vector so overlay scaling can measure camera distance without allocating a new object every frame. */
const _distVec = new THREE.Vector3();

/* Scales HTML overlays against camera distance so labels remain legible without visually overpowering the globe when the camera moves closer. */
function ScaledHtml({
  scaleFactor = 10,
  fadeFrames = 5,
  children,
  style,
  position,
}: {
  scaleFactor?: number;
  fadeFrames?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  position?: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const frames = useRef(0);
  const shown = useRef(false);

  useFrame(({ camera }) => {
    if (!groupRef.current || !innerRef.current) return;
    frames.current++;
    const dist = camera.position.distanceTo(
      groupRef.current.getWorldPosition(_distVec)
    );
    const s = scaleFactor / dist;
    innerRef.current.style.transform = `scale(${s})`;
    if (!shown.current && frames.current >= fadeFrames) {
      innerRef.current.style.opacity = "1";
      shown.current = true;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <Html style={style}>
        <div
          ref={innerRef}
          style={{
            opacity: 0,
            transition: "opacity 0.2s ease",
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </Html>
    </group>
  );
}

/* Renders the layered Earth model, including the day-night shader, cloud shell, and atmospheric glow used by the tracking scene. */
function Earth({ children }: { children?: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);

  const [dayMap, nightMap, cloudsMap, bumpMap] = useTexture([
    "/textures/earth_day.jpg",
    "/textures/earth_night.jpg",
    "/textures/earth_clouds.jpg",
    "/textures/earth_bump.jpg",
  ]);

  const earthMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayMap },
        nightTexture: { value: nightMap },
        bumpTexture: { value: bumpMap },
        sunDirection: { value: new THREE.Vector3(5, 3, 5).normalize() },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform sampler2D bumpTexture;
        uniform vec3 sunDirection;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        varying vec3 vWorldNormal;

        void main() {
          vec3 dayColor = texture2D(dayTexture, vUv).rgb;
          vec3 nightColor = texture2D(nightTexture, vUv).rgb;

          // Computes how directly the surface normal faces the simulated sun direction.
          float sunDot = dot(vWorldNormal, sunDirection);
          float dayFactor = smoothstep(-0.15, 0.25, sunDot);

          // Blends the day and night textures to create a terminator line.
          vec3 surfaceColor = mix(nightColor * 1.5, dayColor, dayFactor);

          // Adds a Fresnel-based atmosphere that brightens near the silhouette.
          vec3 viewDir = normalize(-vPosition);
          float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
          vec3 atmosphere = vec3(0.0, 0.9, 1.0) * fresnel * 0.4;

          // Adds a faint latitude and longitude grid to reinforce the tracking aesthetic.
          float gridLat = smoothstep(0.98, 1.0, abs(sin(vUv.y * 3.14159 * 18.0)));
          float gridLng = smoothstep(0.98, 1.0, abs(sin(vUv.x * 3.14159 * 36.0)));
          float grid = max(gridLat, gridLng) * 0.04;

          vec3 finalColor = surfaceColor + atmosphere + vec3(grid) * vec3(0.0, 0.9, 1.0);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });
  }, [dayMap, nightMap, bumpMap]);

  return (
    <group ref={groupRef}>
      {/* Renders the main Earth surface with the custom day-night shader. */}
      <Sphere args={[2, 64, 64]}>
        <primitive object={earthMaterial} attach="material" />
      </Sphere>
      {/* Adds a translucent cloud shell above the surface texture. */}
      <Sphere args={[2.02, 64, 64]}>
        <meshBasicMaterial
          map={cloudsMap}
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </Sphere>
      {/* Adds the first atmospheric glow shell close to the planet surface. */}
      <Sphere args={[2.08, 64, 64]}>
        <meshBasicMaterial
          color="#00e5ff"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
        />
      </Sphere>
      {/* Adds a larger, softer outer atmosphere halo. */}
      <Sphere args={[2.2, 32, 32]}>
        <meshBasicMaterial
          color="#00e5ff"
          transparent
          opacity={0.015}
          side={THREE.BackSide}
        />
      </Sphere>
      {children}
    </group>
  );
}

/* Marks the authenticated user's approximate location and animates the marker so it stays visible against the globe. */
function UserLocationMarker() {
  const { userLocation } = useAppStore();
  const markerRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!markerRef.current) return;
    // Pulses the marker body so the user's position remains easy to spot.
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
    markerRef.current.scale.setScalar(pulse);
    // Expands and fades the ring to create a repeating radar-like beacon effect.
    if (ringRef.current) {
      const ringScale = ((state.clock.elapsedTime * 0.5) % 1) * 3;
      ringRef.current.scale.setScalar(ringScale);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.5 * (1 - ((state.clock.elapsedTime * 0.5) % 1));
    }
  });

  if (!userLocation) return null;

  const position = latLngToVector3(userLocation.lat, userLocation.lng, 2.04);
  const normal = position.clone().normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    normal
  );

  return (
    <group position={position} quaternion={quaternion}>
      {/* Renders the main location pin anchored to the Earth surface normal. */}
      <group ref={markerRef}>
        <mesh position={[0, 0.06, 0]}>
          <coneGeometry args={[0.025, 0.08, 8]} />
          <meshBasicMaterial color="#39ff7f" transparent opacity={0.9} />
        </mesh>
        {/* Adds a glowing point at the tip so the marker reads clearly at distance. */}
        <mesh position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshBasicMaterial color="#39ff7f" transparent opacity={0.8} />
        </mesh>
      </group>
      {/* Draws the animated ring that radiates out from the selected location. */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.03, 0.04, 24]} />
        <meshBasicMaterial
          color="#39ff7f"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Shows the text label for the user's location marker without overwhelming the globe. */}
      <ScaledHtml
        scaleFactor={10}
        position={[0, 0.2, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            background: "rgba(11,15,24,0.85)",
            border: "1px solid rgba(57,255,127,0.4)",
            borderRadius: "4px",
            padding: "3px 8px",
            whiteSpace: "nowrap",
            fontFamily: "var(--font-orbitron)",
            fontSize: "12px",
            fontWeight: 700,
            color: "#39ff7f",
            letterSpacing: "0.12em",
            textShadow: "0 0 6px rgba(57,255,127,0.5)",
          }}
        >
          YOUR LOCATION
        </div>
      </ScaledHtml>
    </group>
  );
}

/* Renders a single satellite marker, hover card, and tracking controls within the globe scene. */
function parseSnapshotDate(snapshotAt?: string): Date | null {
  if (!snapshotAt) return null;
  const parsed = new Date(snapshotAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/* Renders a single satellite marker, hover card, and tracking controls within the globe scene. */
const SatellitePoint = memo(function SatellitePoint({
  satellite: sat,
  earthRadius = 2,
}: {
  satellite: SatelliteData;
  earthRadius?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const setSelectedSatellite = useAppStore((s) => s.setSelectedSatellite);
  const toggleTracked = useAppStore((s) => s.toggleTracked);
  const setShowAuthModal = useAppStore((s) => s.setShowAuthModal);
  const userPreferences = useAppStore((s) => s.userPreferences);
  const timeOffset = useAppStore((s) => s.timeOffset);
  const isSelected = useAppStore(
    useCallback((s) => s.selectedSatellite?.id === sat.id, [sat.id])
  );
  const isTracked = useAppStore(
    useCallback((s) => s.trackedSatellites.includes(sat.id), [sat.id])
  );
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const liveSnapshotDate = useMemo(
    () => parseSnapshotDate(sat.snapshotAt),
    [sat.snapshotAt]
  );

  // Keeps live rendering anchored to the server snapshot time so the marker
  // and orbit trail share the same propagated reference point.
  const currentPos = useMemo(() => {
    if (sat.tle1 && sat.tle2 && (timeOffset !== 0 || liveSnapshotDate)) {
      const baseDate = liveSnapshotDate ?? new Date();
      const targetDate = new Date(baseDate.getTime() + timeOffset);
      const pos = propagate(sat.tle1, sat.tle2, targetDate);
      if (pos) return pos;
    }
    return { lat: sat.lat, lng: sat.lng, alt: sat.alt, velocity: sat.velocity };
  }, [
    liveSnapshotDate,
    timeOffset,
    sat.tle1,
    sat.tle2,
    sat.lat,
    sat.lng,
    sat.alt,
    sat.velocity,
  ]);

  const scaleRadius = earthRadius + (currentPos.alt / 6371) * earthRadius;
  const position = latLngToVector3(currentPos.lat, currentPos.lng, scaleRadius);
  const color =
    sat.type === "debris"
      ? "#ff3a5c"
      : sat.type === "station"
        ? "#ffd54f"
        : sat.type === "weather"
          ? "#39ff7f"
          : "#00e5ff";

  useFrame((state) => {
    if (meshRef.current) {
      const scale = isSelected
        ? 1.5 + Math.sin(state.clock.elapsedTime * 4) * 0.3
        : 1;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedSatellite(isSelected ? null : sat);
        }}
      >
        <sphereGeometry args={[sat.type === "debris" ? 0.015 : 0.035, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
        {isSelected && (
          <ScaledHtml scaleFactor={10} style={{ pointerEvents: "auto" }}>
            <div
              style={{
                position: "relative",
                background:
                  "linear-gradient(165deg, rgba(12,16,28,0.95) 0%, rgba(6,8,13,0.97) 100%)",
                borderRadius: "8px",
                padding: "0",
                backdropFilter: "blur(16px)",
                whiteSpace: "nowrap",
                fontFamily: "var(--font-exo2)",
                boxShadow: `0 0 20px rgba(0,0,0,0.5), 0 0 1px ${color}60`,
                overflow: "hidden",
                minWidth: "200px",
                userSelect: "none" as const,
              }}
            >
              {/* Adds a colored glow strip so the hover card reflects the satellite's category at a glance. */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                  opacity: 0.7,
                }}
              />

              {/* Shows the satellite name, type, and tracking action at the top of the hover card. */}
              <div
                style={{
                  padding: "7px 10px 4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {/* Displays a small color cue for the current satellite type. */}
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: color,
                    boxShadow: `0 0 6px ${color}`,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: "var(--text-primary, #e8ecf4)",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    fontFamily: "var(--font-orbitron)",
                    flex: 1,
                  }}
                >
                  {sat.name}
                </span>
                <span
                  style={{
                    fontSize: "8px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase" as const,
                    color: color,
                    background: `${color}12`,
                    border: `1px solid ${color}30`,
                    borderRadius: "3px",
                    padding: "2px 5px 1px",
                    fontFamily: "var(--font-fira-code)",
                    flexShrink: 0,
                    lineHeight: 1,
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {sat.type}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isAuthenticated) {
                      setShowAuthModal(true);
                      return;
                    }
                    toggleTracked(sat.id);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "18px",
                    height: "18px",
                    padding: 0,
                    borderRadius: "4px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    background: isTracked
                      ? "rgba(57,255,127,0.12)"
                      : "rgba(255,255,255,0.04)",
                    border: isTracked
                      ? "1px solid rgba(57,255,127,0.35)"
                      : "1px solid rgba(255,255,255,0.08)",
                    color: isTracked ? "#39ff7f" : "rgba(255,255,255,0.5)",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  {isTracked ? (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 8 7 12 13 4" />
                    </svg>
                  ) : (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <line x1="8" y1="3" x2="8" y2="13" />
                      <line x1="3" y1="8" x2="13" y2="8" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Separates the card header from the telemetry section below it. */}
              <div
                style={{
                  height: "1px",
                  margin: "0 10px",
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
                }}
              />

              {/* Shows the key orbital telemetry values for the hovered satellite. */}
              <div
                style={{
                  display: "flex",
                  padding: "4px 10px 7px",
                  gap: "0",
                  fontFamily: "var(--font-fira-code)",
                }}
              >
                {/* Displays the current altitude derived from the propagated position. */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "8px",
                      letterSpacing: "0.18em",
                      color: "rgba(138,155,189,0.6)",
                      marginBottom: "1px",
                    }}
                  >
                    ALT
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#39ff7f",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {formatAltitude(
                      currentPos.alt,
                      userPreferences.preferredUnits
                    )}
                  </div>
                </div>
                {/* Separates adjacent telemetry values inside the compact stats strip. */}
                <div
                  style={{
                    width: "1px",
                    alignSelf: "stretch",
                    margin: "2px 8px",
                    background: "rgba(255,255,255,0.06)",
                  }}
                />
                {/* Displays the current orbital velocity. */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "8px",
                      letterSpacing: "0.18em",
                      color: "rgba(138,155,189,0.6)",
                      marginBottom: "1px",
                    }}
                  >
                    VEL
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#ff6b2c",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {formatVelocity(
                      currentPos.velocity,
                      userPreferences.preferredUnits
                    )}
                  </div>
                </div>
                {/* Separates adjacent telemetry values inside the compact stats strip. */}
                <div
                  style={{
                    width: "1px",
                    alignSelf: "stretch",
                    margin: "2px 8px",
                    background: "rgba(255,255,255,0.06)",
                  }}
                />
                {/* Displays the current latitude and longitude. */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "8px",
                      letterSpacing: "0.18em",
                      color: "rgba(138,155,189,0.6)",
                      marginBottom: "1px",
                    }}
                  >
                    POS
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "rgba(138,155,189,0.85)",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {currentPos.lat >= 0 ? "+" : ""}
                    {currentPos.lat.toFixed(1)}°{" "}
                    {currentPos.lng >= 0 ? "+" : ""}
                    {currentPos.lng.toFixed(1)}°
                  </div>
                </div>
              </div>
            </div>
          </ScaledHtml>
        )}
      </mesh>
      {/* Adds an extra glow around satellites that the user has explicitly chosen to track. */}
      {isTracked && (
        <mesh position={position}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.15} />
        </mesh>
      )}
    </group>
  );
});

/* Renders the background debris field that gives the orbit scene additional environmental context. */
function DebrisField({ count = 500 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const positions = useMemo(() => {
    const arr: { pos: THREE.Vector3; scale: number }[] = [];
    for (let i = 0; i < count; i++) {
      const lat = Math.random() * 180 - 90;
      const lng = Math.random() * 360 - 180;
      const alt = 2 + Math.random() * 2.5;
      arr.push({
        pos: latLngToVector3(lat, lng, alt),
        scale: 0.005 + Math.random() * 0.01,
      });
    }
    return arr;
  }, [count]);

  const simTimeRef = useContext(SimTimeContext);

  useFrame(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    const t = simTimeRef.current;
    positions.forEach((p, i) => {
      dummy.position.copy(p.pos);
      dummy.position.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        t * 0.01 * (1 + (i % 3) * 0.2)
      );
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color="#ff3a5c" transparent opacity={0.4} />
    </instancedMesh>
  );
}

/* Renders a short historical trail so each satellite shows recent orbital motion. */
function SatelliteTrail({
  satellite: sat,
  earthRadius = 2,
}: {
  satellite: SatelliteData;
  earthRadius?: number;
}) {
  const timeOffset = useAppStore((s) => s.timeOffset);
  const liveSnapshotDate = useMemo(
    () => parseSnapshotDate(sat.snapshotAt),
    [sat.snapshotAt]
  );

  const { points, colors } = useMemo(() => {
    if (!sat.tle1 || !sat.tle2)
      return { points: [] as THREE.Vector3[], colors: [] as THREE.Color[] };

    // Uses the same snapshot timestamp as the live marker so the trail ends
    // exactly at the visible satellite position during live playback.
    const now = new Date(
      (liveSnapshotDate ?? new Date()).getTime() + timeOffset
    );
    const pastStart = new Date(now.getTime() - 10 * 60000);
    const path = generateOrbitPath(sat.tle1, sat.tle2, pastStart, 10, 1);
    if (path.length < 2)
      return { points: [] as THREE.Vector3[], colors: [] as THREE.Color[] };

    const baseColor = new THREE.Color(
      sat.type === "debris"
        ? "#ff3a5c"
        : sat.type === "station"
          ? "#ffd54f"
          : sat.type === "weather"
            ? "#39ff7f"
            : "#00e5ff"
    );

    const pts: THREE.Vector3[] = [];
    const cols: THREE.Color[] = [];
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      const scaleR = earthRadius + (p.alt / 6371) * earthRadius;
      pts.push(latLngToVector3(p.lat, p.lng, scaleR));
      // Fades older trail points so the brightest segment always aligns with the current satellite position.
      const fade = i / (path.length - 1);
      cols.push(
        new THREE.Color(
          baseColor.r * fade,
          baseColor.g * fade,
          baseColor.b * fade
        )
      );
    }
    return { points: pts, colors: cols };
  }, [
    liveSnapshotDate,
    sat.tle1,
    sat.tle2,
    sat.type,
    sat.lat,
    sat.lng,
    timeOffset,
    earthRadius,
  ]);

  if (points.length < 2) return null;

  return (
    <Line
      points={points}
      vertexColors={colors}
      lineWidth={1}
      transparent
      opacity={0.5}
    />
  );
}

/* Composes the Earth, satellites, debris, and overlays into the main interactive tracking scene. */
function Scene() {
  const { simulationSpeed, isPaused } = useAppStore();
  const satellites = useVisibleSatellites();
  const simTimeRef = useRef(0);

  // Advances the shared simulation clock according to playback speed and pauses it when the scene is paused.
  useFrame((_, delta) => {
    if (!isPaused) {
      simTimeRef.current += delta * simulationSpeed;
    }
  });

  return (
    <SimTimeContext.Provider value={simTimeRef}>
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 3, 5]} intensity={0.6} color="#e8f0ff" />
      <pointLight position={[-5, -3, -5]} intensity={0.2} color="#00e5ff" />

      <Stars
        radius={100}
        depth={80}
        count={6000}
        factor={3}
        saturation={0.1}
        fade
        speed={0.3}
      />

      <Suspense fallback={null}>
        <Earth>
          <UserLocationMarker />
        </Earth>
      </Suspense>

      {/* Renders the live satellite markers together with their short historical trails. */}
      {satellites.map((sat) => (
        <group key={sat.id}>
          <SatellitePoint satellite={sat} />
          <SatelliteTrail satellite={sat} />
        </group>
      ))}

      {/* Renders the ambient debris layer behind the tracked satellites. */}
      <DebrisField count={400} />

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={15}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
      />

      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </SimTimeContext.Provider>
  );
}

/* Wraps the Three.js canvas with the surrounding HUD panels and legends used by the tracking page. */
function SceneReadySignal({
  onReady,
}: {
  onReady?: () => void;
}) {
  const { active, progress } = useProgress();
  const didNotify = useRef(false);

  useFrame(() => {
    if (!onReady || didNotify.current) return;
    if (!active && progress >= 100) {
      didNotify.current = true;
      onReady();
    }
  });

  return null;
}

/* Wraps the Three.js canvas with the surrounding HUD panels and legends used by the tracking page. */
export default function EarthScene({ onReady }: { onReady?: () => void }) {
  const satellites = useAppStore((s) => s.satellites);
  const stats = useMemo(() => computeDashboardStats(satellites), [satellites]);
  const leoDensity = useMemo(() => computeLeoDensity(satellites), [satellites]);

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 2, 6], fov: 45 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        style={{ background: "transparent" }}
        onPointerMissed={() =>
          useAppStore.getState().setSelectedSatellite(null)
        }
      >
        <Scene />
        <SceneReadySignal onReady={onReady} />
      </Canvas>

      {/* Anchors the summary HUD that stays fixed above the canvas. */}
      <div
        className="absolute top-6 left-4 pointer-events-none orbital-hud"
        style={{ width: 240, padding: 0 }}
      >
        <div className="panel-header" style={{ padding: "10px 14px" }}>
          <div className="dot" />
          <span>ORBITAL VIEW</span>
        </div>

        {/* Shows compact scene-wide counts for satellites, debris, and tracking state. */}
        <div
          style={{
            padding: "10px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {[
            {
              icon: (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--neon-red)"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                  <path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ),
              label: "DEBRIS TRACKED",
              value: stats.globalDebris,
              color: "var(--neon-red)",
            },
            {
              icon: (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--neon-cyan)"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              ),
              label: "ACTIVE SATS",
              value: stats.globalActiveSats,
              color: "var(--neon-cyan)",
            },
            {
              icon: (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--neon-orange)"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M12 20V10" />
                  <path d="M18 20V4" />
                  <path d="M6 20v-4" />
                </svg>
              ),
              label: "LEO DENSITY",
              value: leoDensity,
              color: "var(--neon-orange)",
            },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-2.5">
              <div style={{ flexShrink: 0, opacity: 0.8 }}>{stat.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-fira-code)",
                    fontSize: "10px",
                    letterSpacing: "0.1em",
                    color: "var(--text-dim)",
                    textTransform: "uppercase" as const,
                    lineHeight: 1,
                    marginBottom: 3,
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-fira-code)",
                    fontSize: "15px",
                    fontWeight: 700,
                    color: stat.color,
                    textShadow: `0 0 10px ${stat.color}40`,
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Explains the color coding used for the different satellite categories in the scene. */}
      <div
        className="absolute bottom-4 left-4 pointer-events-none orbital-hud"
        style={{ padding: 0, width: 240 }}
      >
        <div className="panel-header" style={{ padding: "10px 14px" }}>
          <div className="dot" />
          <span>CLASSIFICATION</span>
        </div>

        <div
          style={{
            padding: "8px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {[
            { color: "#00e5ff", label: "ACTIVE" },
            { color: "#ffd54f", label: "STATION" },
            { color: "#39ff7f", label: "WEATHER" },
            { color: "#ff3a5c", label: "DEBRIS" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2.5"
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                transition: "background 0.15s",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: item.color,
                  boxShadow: `0 0 8px ${item.color}60`,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: item.color,
                  fontFamily: "var(--font-fira-code)",
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                }}
              >
                {item.label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: `${item.color}15`,
                  marginLeft: 4,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Adds a bottom fade so the HUD transitions cleanly into the page background. */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, var(--void-black) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}

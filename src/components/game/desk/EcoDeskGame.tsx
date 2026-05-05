"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useAuthStore } from "@/store/authStore";
import {
  ECO_ROLES,
  FUNDING_FILES,
  MONITORING_DOSSIERS,
  POLICY_FILES,
  type EcoRole,
  type FundingAction,
  type MonitoringAction,
  type PolicyAction,
  type ScenarioCard,
} from "@/lib/game/ecoDesk";

// Mirrors the lobby room summaries returned by the room registry endpoint.
interface LobbyRoomSummary {
  id: string;
  code: string;
  title: string;
  status: string;
  currentRound: number;
  maxRounds: number;
  role: EcoRole | null;
  ready: boolean;
  availableRoles: EcoRole[];
  updatedAt: string;
  seats: Array<{
    role: EcoRole;
    ready: boolean;
    userName: string;
  }>;
}

// Mirrors the full room payload returned by desk room endpoints.
interface RoomState {
  id: string;
  code: string;
  title: string;
  status: "waiting" | "active" | "finished";
  currentRound: number;
  maxRounds: number;
  deadlineAt: string | null;
  winner: string | null;
  metrics: {
    treasury: number;
    publicTrust: number;
    airQuality: number;
    waterSecurity: number;
    biodiversity: number;
    heatRisk: number;
  };
  scenario: ScenarioCard;
  availableRoles: EcoRole[];
  userRole: EcoRole | null;
  currentUserAction: Record<string, unknown> | null;
  seats: Array<{
    userId: string;
    userName: string;
    role: EcoRole;
    ready: boolean;
    isSelf: boolean;
  }>;
  submissions: Array<{
    role: EcoRole;
    submittedAt: string;
    isSelf: boolean;
  }>;
  rounds: Array<{
    roundNumber: number;
    scenarioTitle: string;
    resolvedAt: string | null;
    resolutionLog: string[];
  }>;
  messages: Array<{
    id: string;
    kind: "text" | "voice" | "system";
    body: string;
    userName: string;
    metadata: Record<string, unknown>;
    createdAt: string;
    isSelf: boolean;
  }>;
}

type DeskFileId =
  | "situation"
  | "monitoring_brief"
  | "monitoring_matrix"
  | "monitoring_dispatch"
  | "policy_mandate"
  | "policy_coalition"
  | "policy_rollout"
  | "funding_allocation"
  | "funding_release"
  | "funding_match";

// Seeds new role drafts before server-saved actions are loaded.
const DEFAULT_MONITORING: MonitoringAction = {
  dossierId: MONITORING_DOSSIERS[0].id,
  focus: "air",
  scanIntensity: 2,
  verificationDepth: 2,
  evidenceTone: "cautious",
  releaseWindow: "staged",
  fieldRelay: true,
};

const DEFAULT_POLICY: PolicyAction = {
  policyId: POLICY_FILES[0].id,
  emphasis: "compliance",
  intensity: 2,
  publicMessage: "transparent",
  coalitionTarget: "municipal",
  rollout: "regional",
  legalShield: true,
};

const DEFAULT_FUNDING: FundingAction = {
  rapid: 25,
  resilience: 25,
  science: 25,
  community: 25,
  reserveRelease: false,
  releaseMode: "balanced",
  oversight: "balanced",
  externalMatch: false,
};

// Defines role names, colors, and short labels used across the desk UI.
const ROLE_META: Record<
  EcoRole,
  { label: string; accent: string; paper: string; short: string }
> = {
  monitoring: {
    label: "Monitoring Director",
    accent: "#89f2d4",
    paper: "#f6edd7",
    short: "MON",
  },
  policy: {
    label: "Policy Director",
    accent: "#f6a96a",
    paper: "#f8ead8",
    short: "POL",
  },
  funding: {
    label: "Funding Director",
    accent: "#8fb4ff",
    paper: "#efe7d4",
    short: "FND",
  },
};

// Defines role guidance shown in the left control column and shared dossier.
const ROLE_PLAYBOOK: Record<
  EcoRole,
  {
    strap: string;
    objective: string;
    directive: string;
    stamp: string;
  }
> = {
  monitoring: {
    strap: "Evidence custody",
    objective:
      "Deliver the clearest possible satellite-backed evidence pack before Policy overreacts or Funding misallocates.",
    directive:
      "You are not scoring points. You are deciding which reality the rest of the desk is allowed to believe this quarter.",
    stamp: "OBSERVE / VERIFY / TRIAGE",
  },
  policy: {
    strap: "Civic leverage",
    objective:
      "Convert evidence into enforceable direction without collapsing trust or exhausting legitimacy too early.",
    directive:
      "Strong policy wins the quarter only if the public can survive it and the treasury can carry it forward.",
    stamp: "DRAFT / ALIGN / ENACT",
  },
  funding: {
    strap: "Treasury discipline",
    objective:
      "Route scarce budget toward the pressure point that actually changes the scenario instead of merely looking decisive.",
    directive:
      "You are building staying power. Every release this round constrains what the desk can survive next round.",
    stamp: "ALLOCATE / BUFFER / RELEASE",
  },
};

const FOCUS_LABELS: Record<MonitoringAction["focus"], string> = {
  air: "Air corridor",
  water: "Water system",
  forest: "Habitat corridor",
  heat: "Heat grid",
};

const EMPHASIS_LABELS: Record<PolicyAction["emphasis"], string> = {
  compliance: "Compliance push",
  incentive: "Incentive path",
  emergency: "Emergency powers",
};

const RELEASE_WINDOW_LABELS: Record<MonitoringAction["releaseWindow"], string> = {
  immediate: "Immediate release",
  staged: "Staged release",
};

const ROLLOUT_LABELS: Record<PolicyAction["rollout"], string> = {
  pilot: "Pilot rollout",
  regional: "Regional rollout",
  national: "National rollout",
};

const COALITION_LABELS: Record<PolicyAction["coalitionTarget"], string> = {
  industry: "Industry bloc",
  municipal: "Municipal bloc",
  public: "Public bloc",
};

const RELEASE_MODE_LABELS: Record<FundingAction["releaseMode"], string> = {
  frontload: "Frontload",
  balanced: "Balanced",
  guarded: "Guarded",
};

const OVERSIGHT_LABELS: Record<FundingAction["oversight"], string> = {
  tight: "Tight audit",
  balanced: "Balanced audit",
  fast: "Fast release",
};

// Sets the initial draggable coordinates and z-order for each desk file.
const DEFAULT_FILE_LAYOUTS: Record<
  DeskFileId,
  { x: number; y: number; z: number }
> = {
  situation: { x: 0, y: -88, z: 28 },
  monitoring_brief: { x: -240, y: -112, z: 60 },
  monitoring_matrix: { x: 0, y: 118, z: 61 },
  monitoring_dispatch: { x: 240, y: -28, z: 62 },
  policy_mandate: { x: -240, y: -110, z: 60 },
  policy_coalition: { x: 0, y: 118, z: 61 },
  policy_rollout: { x: 240, y: -30, z: 62 },
  funding_allocation: { x: -240, y: -110, z: 60 },
  funding_release: { x: 0, y: 118, z: 61 },
  funding_match: { x: 240, y: -26, z: 62 },
};

function minutesLeft(deadlineAt: string | null) {
  if (!deadlineAt) return "OPEN";
  const remaining = Math.max(
    0,
    Math.floor((new Date(deadlineAt).getTime() - Date.now()) / 1000)
  );
  const minutes = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (remaining % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function buildVoicePeaks(durationMs: number) {
  const seed = Math.max(12, Math.round(durationMs / 90));
  return Array.from({ length: 28 }, (_, index) => {
    const wave = Math.sin(index * 0.73 + seed * 0.04) * 0.28 + 0.54;
    return Number(Math.max(0.16, Math.min(0.98, wave)).toFixed(3));
  });
}

function clampAllocation(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function allocationRatio(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function metricDeltaLabel(next: number, previous: number, invert = false) {
  const delta = (invert ? previous - next : next - previous) || 0;
  if (delta === 0) return { text: "steady", tone: "text-stone-300" };
  if (delta > 0) return { text: `+${delta}`, tone: "text-emerald-300" };
  return { text: `${delta}`, tone: "text-red-300" };
}

function DialChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-[18px] border border-stone-300/70 bg-white/45 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">{label}</p>
      <p className="mt-1 text-[12px] font-semibold text-stone-950" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

// Renders compact loading feedback inside network-bound buttons.
function ButtonLoader({
  label,
  tone = "light",
}: {
  label: string;
  tone?: "light" | "dark";
}) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <span
        className={`h-3 w-3 animate-spin rounded-full border-2 border-r-transparent ${
          tone === "dark" ? "border-stone-900" : "border-white"
        }`}
      />
      <span>{label}</span>
    </span>
  );
}

function fileChoiceStyle(selected: boolean, accent: string) {
  return {
    borderColor: selected ? `${accent}` : "rgba(120,110,92,0.28)",
    background: selected ? `${accent}` : "rgba(255,255,255,0.82)",
    color: selected ? "#140f0b" : "#1c1813",
    boxShadow: selected ? "0 10px 24px rgba(0,0,0,0.12)" : "none",
  };
}

function fileRotationForX(x: number) {
  return Math.max(-7.5, Math.min(7.5, x * 0.026));
}

// Renders one resolved quarter in the communications archive.
function ArchiveEntry({
  round,
}: {
  round: RoomState["rounds"][number];
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">
            Round {round.roundNumber}
          </p>
          <h4 className="mt-2 text-sm font-semibold text-white">{round.scenarioTitle}</h4>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
          {round.resolvedAt
            ? new Date(round.resolvedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "pending"}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {round.resolutionLog.map((entry) => (
          <p key={`${round.roundNumber}-${entry}`} className="text-xs leading-6 text-stone-300/78">
            {entry}
          </p>
        ))}
      </div>
    </div>
  );
}

// Shows the metric changes after all role files resolve a quarter.
function ResolutionOverlay({
  summary,
  onClose,
}: {
  summary: {
    roundNumber: number;
    scenarioTitle: string;
    resolutionLog: string[];
    before: RoomState["metrics"];
    after: RoomState["metrics"];
  };
  onClose: () => void;
}) {
  const metricRows = [
    { key: "treasury", label: "Treasury", invert: false },
    { key: "publicTrust", label: "Public Trust", invert: false },
    { key: "airQuality", label: "Air", invert: false },
    { key: "waterSecurity", label: "Water", invert: false },
    { key: "biodiversity", label: "Biodiversity", invert: false },
    { key: "heatRisk", label: "Heat Risk", invert: true },
  ] as const;

  return (
    <AnimatePresence>
      <motion.div
        key={`${summary.roundNumber}-${summary.scenarioTitle}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[80] flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(13,14,18,0.78),rgba(5,6,8,0.9))] px-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-4xl rounded-[36px] border border-[#d4b27a]/25 bg-[linear-gradient(180deg,rgba(24,21,18,0.98),rgba(10,10,12,0.98))] p-7 shadow-[0_40px_120px_rgba(0,0,0,0.52)]"
        >
          <div className="flex items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-[10px] uppercase tracking-[0.32em] text-[#d4b27a]">
                Quarter Resolution
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[0.03em] text-white">
                Round {summary.roundNumber} · {summary.scenarioTitle}
              </h2>
              <div className="mt-5 space-y-3">
                {summary.resolutionLog.map((entry) => (
                  <p key={entry} className="text-sm leading-7 text-stone-200/84">
                    {entry}
                  </p>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-stone-300"
            >
              Return to desk
            </button>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {metricRows.map((row) => {
              const before = summary.before[row.key];
              const after = summary.after[row.key];
              const delta = metricDeltaLabel(after, before, row.invert);
              return (
                <div
                  key={row.key}
                  className="rounded-[22px] border border-white/10 bg-white/[0.045] px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-stone-400">
                      {row.label}
                    </p>
                    <span className={`text-xs font-semibold ${delta.tone}`}>{delta.text}</span>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
                        Before
                      </p>
                      <p className="mt-1 text-lg font-semibold text-stone-200">{row.invert ? 100 - before : before}</p>
                    </div>
                    <div className="h-px flex-1 bg-white/10" />
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
                        After
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white">{row.invert ? 100 - after : after}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Flashes the filed role stamp after a submitted desk action.
function DeskStampBurst({
  role,
}: {
  role: EcoRole;
}) {
  return (
    <AnimatePresence>
      <motion.div
        key={role}
        initial={{ opacity: 0, scale: 1.18 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute left-1/2 top-1/2 z-[78] -translate-x-1/2 -translate-y-1/2"
      >
        <div
          className="rounded-[28px] border-2 px-7 py-5 text-center shadow-[0_28px_80px_rgba(0,0,0,0.32)]"
          style={{
            borderColor: `${ROLE_META[role].accent}`,
            color: `${ROLE_META[role].accent}`,
            background: "rgba(14,14,18,0.68)",
          }}
        >
          <p className="text-[11px] uppercase tracking-[0.34em]">Filed</p>
          <p className="mt-2 text-2xl font-semibold tracking-[0.16em]">
            {ROLE_META[role].short}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Renders the walnut desk, paper props, and environmental window state.
function DeskBackdrop({
  scenario,
  metrics,
}: {
  scenario: ScenarioCard;
  metrics: RoomState["metrics"];
}) {
  const hazeScale = 0.18 + (100 - metrics.airQuality) / 260;
  const heatTint = metrics.heatRisk / 100;

  return (
    <Canvas camera={{ position: [0, 4.6, 8.4], fov: 34 }}>
      <color attach="background" args={["#0f1014"]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 7, 5]} intensity={1.8} color="#ffe3b2" />
      <spotLight
        position={[-3.4, 7.6, 5]}
        intensity={28}
        color="#ffd597"
        angle={0.34}
        penumbra={0.8}
      />

      <group position={[0, -0.3, 0]}>
        <RoundedBox args={[10.8, 0.5, 7.2]} radius={0.24} smoothness={4}>
          <meshStandardMaterial color="#4f3529" roughness={0.7} metalness={0.1} />
        </RoundedBox>
        <mesh position={[0, 0.32, 0]}>
          <boxGeometry args={[10.1, 0.06, 6.6]} />
          <meshStandardMaterial color="#6a4938" roughness={0.54} metalness={0.08} />
        </mesh>
      </group>

      <group position={[0, 2.4, -2.55]}>
        <mesh>
          <boxGeometry args={[4.5, 2.65, 0.2]} />
          <meshStandardMaterial color="#2b2e33" roughness={0.82} />
        </mesh>
        <mesh position={[0, 0, 0.11]}>
          <planeGeometry args={[4, 2.15]} />
          <meshBasicMaterial color={scenario.backdrop.skyBottom} />
        </mesh>
        <mesh position={[0, 0.04, 0.12]}>
          <planeGeometry args={[4, 2.15]} />
          <meshBasicMaterial
            transparent
            opacity={0.62}
            color={scenario.backdrop.skyTop}
          />
        </mesh>
        <mesh position={[0.2, -0.2, 0.13]}>
          <planeGeometry args={[4.1, 1.15]} />
          <meshBasicMaterial
            transparent
            opacity={Math.min(0.62, hazeScale + heatTint * 0.18)}
            color={scenario.backdrop.haze}
          />
        </mesh>
        <mesh position={[0, -0.88, 0.14]}>
          <planeGeometry args={[4.1, 0.42]} />
          <meshBasicMaterial color={scenario.backdrop.ground} />
        </mesh>
      </group>

      <group position={[-3.25, 0.1, 1.08]} rotation={[-0.9, 0.26, 0.05]}>
        <mesh>
          <boxGeometry args={[1.95, 0.07, 2.6]} />
          <meshStandardMaterial color="#f4ead2" roughness={0.94} />
        </mesh>
      </group>
      <group position={[0, 0.12, 0.2]} rotation={[-0.92, 0, 0]}>
        <mesh>
          <boxGeometry args={[2.3, 0.09, 3.05]} />
          <meshStandardMaterial color="#efe1c3" roughness={0.94} />
        </mesh>
      </group>
      <group position={[3.25, 0.1, 1.08]} rotation={[-0.9, -0.26, -0.05]}>
        <mesh>
          <boxGeometry args={[1.95, 0.07, 2.6]} />
          <meshStandardMaterial color="#f1e8d7" roughness={0.95} />
        </mesh>
      </group>
    </Canvas>
  );
}

// Renders a draggable paper file with live z-order and position state.
function DeskFile({
  fileId,
  title,
  subtitle,
  accent,
  focused,
  layout,
  onFocus,
  onMove,
  width = "w-[20.5rem]",
  children,
}: {
  fileId: DeskFileId;
  title: string;
  subtitle?: string;
  accent: string;
  focused: boolean;
  layout: { x: number; y: number; z: number };
  onFocus: (id: DeskFileId) => void;
  onMove: (id: DeskFileId, x: number, y: number) => void;
  width?: string;
  children: ReactNode;
}) {
  const x = useMotionValue(layout.x);
  const y = useMotionValue(layout.y);
  const rotation = useTransform(x, fileRotationForX);

  useEffect(() => {
    x.set(layout.x);
    y.set(layout.y);
  }, [layout.x, layout.y, x, y]);

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.08}
      dragTransition={{ power: 0, timeConstant: 0 }}
      initial={false}
      className={`absolute cursor-grab active:cursor-grabbing ${width}`}
      style={{
        left: "calc(50% - 10.25rem)",
        top: "50%",
        x,
        y,
        zIndex: layout.z,
      }}
      animate={{
        scale: focused ? 1.04 : 1,
        filter: focused
          ? "drop-shadow(0 34px 70px rgba(0,0,0,0.34))"
          : "drop-shadow(0 20px 44px rgba(0,0,0,0.22))",
      }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      whileDrag={{ scale: 1.025 }}
      onPointerDown={() => onFocus(fileId)}
      onDragStart={() => onFocus(fileId)}
      onDragEnd={() => onMove(fileId, x.get(), y.get())}
    >
      <motion.div
        initial={false}
        style={{
          rotate: rotation,
          background:
            "linear-gradient(180deg, rgba(252,248,239,0.99) 0%, rgba(239,228,205,0.99) 100%)",
          boxShadow:
            "0 30px 70px rgba(0,0,0,0.26), 0 1px 0 rgba(255,255,255,0.85) inset",
        }}
        className="rounded-[28px] border border-stone-300/90 px-4 py-4"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">
              Desk File
            </p>
            <h3 className="mt-1 text-[15px] font-semibold tracking-[0.02em] text-stone-950">
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-1 text-[11px] leading-5 text-stone-600">{subtitle}</p>
            ) : null}
          </div>
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase text-white"
            style={{ background: accent }}
          >
            {focused ? "FOCUSED" : "ACTIVE"}
          </span>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

// Captures text and voice dispatches for the room ledger.
function MessageComposer({
  disabled,
  onSendText,
  onSendVoice,
}: {
  disabled: boolean;
  onSendText: (value: string) => Promise<void>;
  onSendVoice: (payload: {
    message: string;
    metadata: Record<string, unknown>;
  }) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);

  const submitText = useCallback(async () => {
    const next = value.trim();
    if (!next) return;
    setValue("");
    await onSendText(next);
  }, [onSendText, value]);

  const toggleVoice = useCallback(async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    startedAtRef.current = Date.now();
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      const durationMs = Date.now() - startedAtRef.current;
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      await onSendVoice({
        message: "Voice dispatch",
        metadata: {
          audioDataUrl: dataUrl,
          durationMs,
          peaks: buildVoicePeaks(durationMs),
        },
      });
    };
    recorder.start();
    setRecording(true);
  }, [onSendVoice, recording]);

  return (
    <div className="space-y-3 rounded-[28px] border border-white/10 bg-black/25 p-4">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        placeholder="Brief your team. Call the threat, justify the file, or warn about tradeoffs."
        className="h-24 w-full resize-none rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void submitText()}
          className="flex-1 rounded-full bg-[#e8dbc4] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-900 transition hover:bg-white"
        >
          Send Note
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void toggleVoice()}
          className="rounded-full border border-white/20 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white transition hover:border-white/40"
        >
          {recording ? "Stop Voice" : "Record Voice"}
        </button>
      </div>
    </div>
  );
}

export default function EcoDeskGame() {
  const { checkAuth, isAuthenticated, isLoading, user } = useAuthStore();
  const [rooms, setRooms] = useState<LobbyRoomSummary[]>([]);
  const [activeRoom, setActiveRoom] = useState<RoomState | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [selectedRole, setSelectedRole] = useState<EcoRole>("monitoring");
  const [pendingRoom, setPendingRoom] = useState<RoomState | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [ledgerTab, setLedgerTab] = useState<"comms" | "archive">("comms");
  const [focusedFile, setFocusedFile] = useState<DeskFileId>("situation");
  const [fileLayouts, setFileLayouts] = useState(DEFAULT_FILE_LAYOUTS);
  const zCounterRef = useRef(80);
  const [stampRole, setStampRole] = useState<EcoRole | null>(null);
  const [resolutionSummary, setResolutionSummary] = useState<{
    roundNumber: number;
    scenarioTitle: string;
    resolutionLog: string[];
    before: RoomState["metrics"];
    after: RoomState["metrics"];
  } | null>(null);

  const [monitoringDraft, setMonitoringDraft] =
    useState<MonitoringAction>(DEFAULT_MONITORING);
  const [policyDraft, setPolicyDraft] = useState<PolicyAction>(DEFAULT_POLICY);
  const [fundingDraft, setFundingDraft] = useState<FundingAction>(DEFAULT_FUNDING);
  const previousMetricsRef = useRef<RoomState["metrics"] | null>(null);
  const previousResolvedRoundRef = useRef<number | null>(null);
  const busy = busyAction !== null;

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const refreshRooms = useCallback(async () => {
    if (!isAuthenticated) return;
    const res = await fetch("/api/game/rooms");
    if (!res.ok) return;
    const data = await res.json();
    setRooms(data.rooms ?? []);
  }, [isAuthenticated]);

  const refreshActiveRoom = useCallback(async () => {
    if (!activeRoom?.id) return;
    const res = await fetch(`/api/game/rooms/${activeRoom.id}`);
    if (!res.ok) return;
    const data = await res.json();
    setActiveRoom(data.room ?? null);
  }, [activeRoom?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshRooms();
  }, [isAuthenticated, refreshRooms]);

  useEffect(() => {
    if (!isAuthenticated || activeRoom) return;
    const timer = window.setInterval(() => {
      void refreshRooms();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [activeRoom, isAuthenticated, refreshRooms]);

  // Keeps the open room synchronized with seat presence and ledger updates.
  useEffect(() => {
    if (!activeRoom?.id) return;
    const timer = window.setInterval(() => {
      void refreshActiveRoom();
    }, 1500);
    return () => window.clearInterval(timer);
  }, [activeRoom?.id, refreshActiveRoom]);

  // Builds the resolution overlay from the latest archived quarter.
  useEffect(() => {
    if (!activeRoom) {
      previousMetricsRef.current = null;
      previousResolvedRoundRef.current = null;
      return;
    }

    const latestResolvedRound = activeRoom.rounds[0];
    if (
      latestResolvedRound &&
      latestResolvedRound.resolvedAt &&
      previousResolvedRoundRef.current !== latestResolvedRound.roundNumber &&
      previousMetricsRef.current
    ) {
      setResolutionSummary({
        roundNumber: latestResolvedRound.roundNumber,
        scenarioTitle: latestResolvedRound.scenarioTitle,
        resolutionLog: latestResolvedRound.resolutionLog,
        before: previousMetricsRef.current,
        after: activeRoom.metrics,
      });
      previousResolvedRoundRef.current = latestResolvedRound.roundNumber;
    } else if (latestResolvedRound?.resolvedAt) {
      previousResolvedRoundRef.current = latestResolvedRound.roundNumber;
    }

    previousMetricsRef.current = activeRoom.metrics;
  }, [activeRoom]);

  // Hydrates the local role form from the current server-saved action.
  useEffect(() => {
    const payload = activeRoom?.currentUserAction;
    if (!payload || !activeRoom?.userRole) return;

    if (activeRoom.userRole === "monitoring") {
      setMonitoringDraft((current) => ({
        ...current,
        dossierId:
          typeof payload.dossierId === "string"
            ? payload.dossierId
            : current.dossierId,
        focus:
          payload.focus === "air" ||
          payload.focus === "water" ||
          payload.focus === "forest" ||
          payload.focus === "heat"
            ? payload.focus
            : current.focus,
        scanIntensity:
          payload.scanIntensity === 1 ||
          payload.scanIntensity === 2 ||
          payload.scanIntensity === 3
            ? payload.scanIntensity
            : current.scanIntensity,
        verificationDepth:
          payload.verificationDepth === 1 ||
          payload.verificationDepth === 2 ||
          payload.verificationDepth === 3
            ? payload.verificationDepth
            : current.verificationDepth,
        evidenceTone:
          payload.evidenceTone === "cautious" ||
          payload.evidenceTone === "assertive"
            ? payload.evidenceTone
            : current.evidenceTone,
        releaseWindow:
          payload.releaseWindow === "immediate" ||
          payload.releaseWindow === "staged"
            ? payload.releaseWindow
            : current.releaseWindow,
        fieldRelay:
          typeof payload.fieldRelay === "boolean"
            ? payload.fieldRelay
            : current.fieldRelay,
      }));
    }
    if (activeRoom.userRole === "policy") {
      setPolicyDraft((current) => ({
        ...current,
        policyId:
          typeof payload.policyId === "string"
            ? payload.policyId
            : current.policyId,
        emphasis:
          payload.emphasis === "compliance" ||
          payload.emphasis === "incentive" ||
          payload.emphasis === "emergency"
            ? payload.emphasis
            : current.emphasis,
        intensity:
          payload.intensity === 1 ||
          payload.intensity === 2 ||
          payload.intensity === 3
            ? payload.intensity
            : current.intensity,
        publicMessage:
          payload.publicMessage === "transparent" ||
          payload.publicMessage === "urgent"
            ? payload.publicMessage
            : current.publicMessage,
        coalitionTarget:
          payload.coalitionTarget === "industry" ||
          payload.coalitionTarget === "municipal" ||
          payload.coalitionTarget === "public"
            ? payload.coalitionTarget
            : current.coalitionTarget,
        rollout:
          payload.rollout === "pilot" ||
          payload.rollout === "regional" ||
          payload.rollout === "national"
            ? payload.rollout
            : current.rollout,
        legalShield:
          typeof payload.legalShield === "boolean"
            ? payload.legalShield
            : current.legalShield,
      }));
    }
    if (activeRoom.userRole === "funding") {
      setFundingDraft((current) => ({
        ...current,
        rapid:
          typeof payload.rapid === "number" ? clampAllocation(payload.rapid) : current.rapid,
        resilience:
          typeof payload.resilience === "number"
            ? clampAllocation(payload.resilience)
            : current.resilience,
        science:
          typeof payload.science === "number"
            ? clampAllocation(payload.science)
            : current.science,
        community:
          typeof payload.community === "number"
            ? clampAllocation(payload.community)
            : current.community,
        reserveRelease:
          typeof payload.reserveRelease === "boolean"
            ? payload.reserveRelease
            : current.reserveRelease,
        releaseMode:
          payload.releaseMode === "frontload" ||
          payload.releaseMode === "balanced" ||
          payload.releaseMode === "guarded"
            ? payload.releaseMode
            : current.releaseMode,
        oversight:
          payload.oversight === "tight" ||
          payload.oversight === "balanced" ||
          payload.oversight === "fast"
            ? payload.oversight
            : current.oversight,
        externalMatch:
          typeof payload.externalMatch === "boolean"
            ? payload.externalMatch
            : current.externalMatch,
      }));
    }
  }, [activeRoom?.currentUserAction, activeRoom?.userRole]);

  // Focuses the first private file for the current role.
  useEffect(() => {
    if (!activeRoom?.userRole) {
      setFocusedFile("situation");
      return;
    }
    setFocusedFile(
      activeRoom.userRole === "monitoring"
        ? "monitoring_brief"
        : activeRoom.userRole === "policy"
          ? "policy_mandate"
          : "funding_allocation"
    );
  }, [activeRoom?.userRole]);

  // Moves the selected file above the rest of the desktop stack.
  const bringFileToFront = useCallback((fileId: DeskFileId) => {
    zCounterRef.current += 1;
    setFocusedFile(fileId);
    setFileLayouts((current) => ({
      ...current,
      [fileId]: {
        ...current[fileId],
        z: zCounterRef.current,
      },
    }));
  }, []);

  // Stores the final dragged file position and z-order.
  const moveFile = useCallback((fileId: DeskFileId, x: number, y: number) => {
    zCounterRef.current += 1;
    setFileLayouts((current) => ({
      ...current,
      [fileId]: {
        ...current[fileId],
        x,
        y,
        z: zCounterRef.current,
      },
    }));
  }, []);

  const mySeat = useMemo(
    () => activeRoom?.seats.find((seat) => seat.isSelf) ?? null,
    [activeRoom]
  );

  const mySubmission = useMemo(
    () => activeRoom?.submissions.find((entry) => entry.isSelf) ?? null,
    [activeRoom]
  );

  const activeDraft = useMemo(() => {
    switch (activeRoom?.userRole) {
      case "monitoring":
        return monitoringDraft;
      case "policy":
        return policyDraft;
      case "funding":
        return fundingDraft;
      default:
        return null;
    }
  }, [activeRoom?.userRole, fundingDraft, monitoringDraft, policyDraft]);

  const fundingTotal = useMemo(
    () =>
      fundingDraft.rapid +
      fundingDraft.resilience +
      fundingDraft.science +
      fundingDraft.community,
    [fundingDraft]
  );

  const currentDirective = activeRoom?.userRole
    ? ROLE_PLAYBOOK[activeRoom.userRole]
    : null;
  const visibleFile = activeRoom?.userRole ?? null;

  const submissionCount = activeRoom?.submissions.length ?? 0;

  const turnForecast = useMemo(() => {
    if (!activeRoom?.userRole) return null;

    if (activeRoom.userRole === "monitoring") {
      const dossier = MONITORING_DOSSIERS.find(
        (entry) => entry.id === monitoringDraft.dossierId
      );
      return {
        title: "Evidence posture",
        lines: [
          `${dossier?.title ?? "Spectral Scan"} will prioritize ${FOCUS_LABELS[monitoringDraft.focus].toLowerCase()}.`,
          `Scan intensity ${monitoringDraft.scanIntensity} with verification depth ${monitoringDraft.verificationDepth} raises evidence confidence ${
            monitoringDraft.scanIntensity === 3 ? "fastest" : monitoringDraft.scanIntensity === 2 ? "moderately" : "carefully"
          }.`,
          `${
            monitoringDraft.evidenceTone === "assertive"
              ? "Assertive framing boosts urgency but can shave trust if the desk overreaches."
              : "Cautious framing protects trust but may leave urgency on the table."
          }`,
          `${RELEASE_WINDOW_LABELS[monitoringDraft.releaseWindow]} will ${monitoringDraft.fieldRelay ? "include" : "exclude"} local relay confirmation.`,
        ],
      };
    }

    if (activeRoom.userRole === "policy") {
      const file = POLICY_FILES.find((entry) => entry.id === policyDraft.policyId);
      return {
        title: "Policy forecast",
        lines: [
          `${file?.title ?? "Compliance Order"} is being pushed through a ${EMPHASIS_LABELS[
            policyDraft.emphasis
          ].toLowerCase()}.`,
          `Intensity ${policyDraft.intensity} ${
            policyDraft.intensity === 3
              ? "leans hard into enforcement and backlash."
              : policyDraft.intensity === 2
                ? "balances force and legitimacy."
                : "plays cautiously for coalition survival."
          }`,
          `${
            policyDraft.publicMessage === "urgent"
              ? "Urgent messaging sharpens action but heightens public stress."
              : "Transparent messaging steadies trust and softens the optics."
          }`,
          `${ROLLOUT_LABELS[policyDraft.rollout]} targeting ${COALITION_LABELS[
            policyDraft.coalitionTarget
          ].toLowerCase()} with ${policyDraft.legalShield ? "legal shielding" : "no legal shielding"}.`,
        ],
      };
    }

    return {
      title: "Treasury forecast",
      lines: [
        `Rapid response currently takes ${allocationRatio(
          fundingDraft.rapid,
          fundingTotal
        )}% of your package.`,
        `Science and resilience together consume ${allocationRatio(
          fundingDraft.science + fundingDraft.resilience,
          fundingTotal
        )}% of the quarter.`,
        fundingDraft.reserveRelease
          ? "Reserve release is armed, giving the desk a short burst at the cost of future flexibility."
          : "Reserve stays sealed, preserving endurance but reducing this round’s shock absorption.",
        `${RELEASE_MODE_LABELS[fundingDraft.releaseMode]} release and ${OVERSIGHT_LABELS[
          fundingDraft.oversight
        ].toLowerCase()} ${fundingDraft.externalMatch ? "with external co-finance." : "without external co-finance."}`,
      ],
    };
  }, [activeRoom?.userRole, fundingDraft, fundingTotal, monitoringDraft, policyDraft]);

  const createRoom = useCallback(async () => {
    if (busy) return;
    setBusyAction("create");
    setTextError(null);
    try {
      const res = await fetch("/api/game/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create room");
      const roomRes = await fetch(`/api/game/rooms/${data.roomId}`);
      const roomData = await roomRes.json();
      setActiveRoom(roomData.room);
      await refreshRooms();
    } catch (error) {
      setTextError(error instanceof Error ? error.message : "Failed to create room");
    } finally {
      setBusyAction(null);
    }
  }, [busy, refreshRooms, selectedRole]);

  const lookupRoomCode = useCallback(async () => {
    if (busy) return;
    setBusyAction("lookup");
    setTextError(null);
    try {
      const res = await fetch(`/api/game/rooms/code/${roomCodeInput.trim().toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Room not found");
      setPendingRoom(data.room);
    } catch (error) {
      setPendingRoom(null);
      setTextError(error instanceof Error ? error.message : "Room not found");
    } finally {
      setBusyAction(null);
    }
  }, [busy, roomCodeInput]);

  const joinRoomAsRole = useCallback(async (roomId: string, role: EcoRole) => {
    if (busy) return;
    setBusyAction(`join:${roomId}:${role}`);
    setTextError(null);
    try {
      const res = await fetch(`/api/game/rooms/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join room");
      setActiveRoom(data.room);
      setPendingRoom(null);
      await refreshRooms();
    } catch (error) {
      setTextError(error instanceof Error ? error.message : "Failed to join room");
    } finally {
      setBusyAction(null);
    }
  }, [busy, refreshRooms]);

  const openRoom = useCallback(async (roomId: string) => {
    if (busy) return;
    setBusyAction(`return:${roomId}`);
    setTextError(null);
    try {
      const res = await fetch(`/api/game/rooms/${roomId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to return to room");
      setActiveRoom(data.room);
    } catch (error) {
      setTextError(error instanceof Error ? error.message : "Failed to return to room");
    } finally {
      setBusyAction(null);
    }
  }, [busy]);

  const setReady = useCallback(
    async (ready: boolean) => {
      if (!activeRoom || busy) return;
      setBusyAction("ready");
      setTextError(null);
      try {
        const res = await fetch(`/api/game/rooms/${activeRoom.id}/ready`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ready }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update seat");
        setActiveRoom(data.room);
      } catch (error) {
        setTextError(error instanceof Error ? error.message : "Failed to update seat");
      } finally {
        setBusyAction(null);
      }
    },
    [activeRoom, busy]
  );

  const submitAction = useCallback(async () => {
    if (!activeRoom || !activeDraft || actionSubmitting) return;
    setActionSubmitting(true);
    setTextError(null);
    try {
      const res = await fetch(`/api/game/rooms/${activeRoom.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: activeDraft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit file");
      setActiveRoom(data.room);
      if (activeRoom.userRole) {
        setStampRole(activeRoom.userRole);
        window.setTimeout(() => setStampRole(null), 360);
      }
    } catch (error) {
      setTextError(error instanceof Error ? error.message : "Failed to submit file");
    } finally {
      setActionSubmitting(false);
    }
  }, [activeDraft, activeRoom, actionSubmitting]);

  const sendTextMessage = useCallback(
    async (message: string) => {
      if (!activeRoom) return;
      const res = await fetch(`/api/game/rooms/${activeRoom.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "text", message }),
      });
      const data = await res.json();
      if (res.ok) setActiveRoom(data.room);
    },
    [activeRoom]
  );

  const sendVoiceMessage = useCallback(
    async (payload: { message: string; metadata: Record<string, unknown> }) => {
      if (!activeRoom) return;
      const res = await fetch(`/api/game/rooms/${activeRoom.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "voice",
          message: payload.message,
          metadata: payload.metadata,
        }),
      });
      const data = await res.json();
      if (res.ok) setActiveRoom(data.room);
    },
    [activeRoom]
  );

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-[#0b0b0f] text-stone-200">
        Loading game systems...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-[#09090d] p-8">
        <div className="max-w-xl rounded-[34px] border border-white/10 bg-[#111217]/80 p-8 text-stone-200 shadow-[0_32px_80px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#dcb980]">
            ORBITAL GOVERNANCE ACCESS
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[0.04em] text-white">
            Bureau of Salvaged Earth
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-300/78">
            This replacement game is a cooperative, networked policy room. Sign
            in first, then assemble a three-person desk and run synchronized
            environmental turns as Monitoring, Policy, and Funding.
          </p>
        </div>
      </div>
    );
  }

  if (!activeRoom) {
    return (
      <div className="h-full min-h-0 overflow-hidden bg-[radial-gradient(circle_at_18%_12%,rgba(212,178,122,0.16),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(58,96,109,0.24),transparent_34%),#08080d] px-5 py-5 text-stone-100 [&_button:not(:disabled)]:cursor-pointer [&_button:disabled]:cursor-not-allowed">
        <div className="mx-auto grid h-full min-h-0 max-w-[1420px] gap-5 xl:grid-cols-[0.58fr_1.42fr]">
          <section className="relative flex min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(155deg,rgba(25,23,24,0.96),rgba(10,10,14,0.98))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#d4b27a]/12 blur-3xl" />
            <p className="text-[11px] uppercase tracking-[0.34em] text-[#d4b27a]">
              BUREAU OF SALVAGED EARTH
            </p>
            <h1 className="mt-2 max-w-md text-[clamp(1.7rem,3vw,2.55rem)] font-semibold leading-tight tracking-[0.015em] text-white">
              Environmental triage desk.
            </h1>
            <p className="mt-2 max-w-md text-[13px] leading-6 text-stone-300/76">
              Select a default responsibility, open a coded desk, or claim an
              open seat from the active registry.
            </p>

            <div className="mt-4 grid gap-2">
              {ECO_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className="group cursor-pointer rounded-[20px] border px-3.5 py-2.5 text-left transition duration-150 hover:-translate-y-0.5"
                  style={{
                    borderColor:
                      selectedRole === role
                        ? `${ROLE_META[role].accent}aa`
                        : "rgba(255,255,255,0.1)",
                    background:
                      selectedRole === role
                        ? `${ROLE_META[role].accent}1f`
                        : "rgba(255,255,255,0.035)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.22em] text-stone-400">
                        Default seat · {ROLE_META[role].short}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-white">
                        {ROLE_META[role].label}
                      </p>
                    </div>
                    <span
                      className="h-2.5 w-2.5 rounded-full transition group-hover:scale-125"
                      style={{ background: ROLE_META[role].accent }}
                    />
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void createRoom()}
              className="mt-4 w-full cursor-pointer rounded-[22px] bg-[#eadcc5] px-4 py-3.5 text-left text-stone-900 shadow-[0_18px_40px_rgba(234,220,197,0.18)] transition duration-150 hover:-translate-y-0.5 hover:bg-[#f6e8d1] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {busyAction === "create" ? (
                <span className="flex min-h-[4.75rem] items-center text-lg font-semibold">
                  <ButtonLoader label="Opening desk" tone="dark" />
                </span>
              ) : (
                <>
                  <p className="text-[9px] uppercase tracking-[0.26em] text-stone-600">
                    New coded room
                  </p>
                  <p className="mt-1 text-lg font-semibold">Open as {selectedRole.toUpperCase()}</p>
                  <p className="mt-1 text-[13px] leading-5 text-stone-700/82">
                    Room code is assigned automatically. Seats stay replaceable when
                    players go offline.
                  </p>
                </>
              )}
            </button>
            <div className="mt-auto truncate rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-stone-300/75">
              Signed in as {user.name}
            </div>
          </section>

          {textError && (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100 xl:col-span-2">
              {textError}
            </div>
          )}

          <section className="flex min-h-0 flex-col rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,15,20,0.96),rgba(7,7,11,0.99))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.38)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#d4b27a]">
                  Active room registry
                </p>
                <p className="mt-1.5 max-w-xl text-sm leading-6 text-stone-300/74">
                  Rooms with no online players are removed automatically. Vacant
                  seats remain claimable, even after the simulation has begun.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="flex overflow-hidden rounded-full border border-white/10 bg-black/25">
                  <input
                    value={roomCodeInput}
                    onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())}
                    maxLength={6}
                    className="w-36 bg-transparent px-4 py-2 text-[11px] tracking-[0.28em] text-white outline-none placeholder:text-stone-500"
                    placeholder="CODE"
                  />
                  <button
                    type="button"
                    disabled={busy || roomCodeInput.trim().length < 6}
                    onClick={() => void lookupRoomCode()}
                    className="cursor-pointer border-l border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-stone-200 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {busyAction === "lookup" ? (
                      <ButtonLoader label="Scan" />
                    ) : (
                      "Lookup"
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void refreshRooms()}
                  className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-stone-300 transition hover:border-white/25"
                >
                  Refresh
                </button>
              </div>
            </div>

            {pendingRoom && (
              <div className="mt-4 rounded-[26px] border border-[#d4b27a]/20 bg-[#d4b27a]/8 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#d4b27a]">
                      Lookup result · {pendingRoom.code}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      {pendingRoom.title}
                    </h3>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-stone-300">
                    round {pendingRoom.currentRound}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {ECO_ROLES.map((role) => {
                    const available = pendingRoom.availableRoles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        disabled={!available || busy}
                        onClick={() => void joinRoomAsRole(pendingRoom.id, role)}
                        className="cursor-pointer rounded-2xl border px-3 py-3 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35"
                        style={{
                          borderColor: `${ROLE_META[role].accent}55`,
                          background: available
                            ? `${ROLE_META[role].accent}18`
                            : "rgba(255,255,255,0.025)",
                        }}
                      >
                        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">
                          {ROLE_META[role].short}
                        </p>
                        <p className="mt-2 text-sm font-medium text-white">
                          {busyAction === `join:${pendingRoom.id}:${role}` ? (
                            <ButtonLoader label="Joining" />
                          ) : available ? (
                            `Join ${ROLE_META[role].label}`
                          ) : (
                            "Occupied"
                          )}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-5 grid min-h-0 flex-1 auto-rows-max gap-3 overflow-auto pr-1 lg:grid-cols-2">
              {rooms.length > 0 ? (
                rooms.map((room) => (
                  <div
                    key={room.id}
                    className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">
                          {room.code}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-white">
                          {room.title}
                        </h3>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-500">
                          Round {room.currentRound}/{room.maxRounds} · {room.status}
                        </p>
                      </div>
                      {room.role ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void openRoom(room.id)}
                          className="cursor-pointer rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-900"
                        >
                          {busyAction === `return:${room.id}` ? (
                            <ButtonLoader label="Return" tone="dark" />
                          ) : (
                            "Return"
                          )}
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-3 grid gap-2">
                      {ECO_ROLES.map((role) => {
                        const seat = room.seats.find((entry) => entry.role === role);
                        const available = !seat;
                        return (
                          <button
                            key={`${room.id}-${role}`}
                            type="button"
                            disabled={!available || busy}
                            onClick={() => void joinRoomAsRole(room.id, role)}
                            className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            style={{
                              borderColor: available
                                ? `${ROLE_META[role].accent}55`
                                : "rgba(255,255,255,0.08)",
                              background: available
                                ? `${ROLE_META[role].accent}13`
                                : "rgba(255,255,255,0.025)",
                              opacity: available ? 1 : 0.72,
                            }}
                          >
                            <span>
                              <span className="block text-[10px] uppercase tracking-[0.2em] text-stone-400">
                                {ROLE_META[role].short}
                              </span>
                              <span className="mt-0.5 block text-sm font-medium text-white">
                                {ROLE_META[role].label}
                              </span>
                            </span>
                            <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
                              {busyAction === `join:${room.id}:${role}` ? (
                                <ButtonLoader label="claiming" />
                              ) : seat ? (
                                seat.userName
                              ) : (
                                "claim"
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[30px] border border-dashed border-white/12 bg-white/[0.025] p-8 text-center lg:col-span-2">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-stone-500">
                    No active rooms
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-300/72">
                    Open the first numbered bureau from the left panel.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-hidden bg-[#0a090a] text-stone-100 [&_button:not(:disabled)]:cursor-pointer [&_button:disabled]:cursor-not-allowed">
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden px-6 py-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#d4b27a]">
              BUREAU OF SALVAGED EARTH
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[0.04em] text-white">
              {activeRoom.title}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-stone-300">
              {activeRoom.code}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-stone-300">
              Round {activeRoom.currentRound}/{activeRoom.maxRounds}
            </span>
            <button
              type="button"
              onClick={() => setActiveRoom(null)}
              className="cursor-pointer rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-stone-300 transition hover:border-white/25"
            >
              Lobby
            </button>
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-[19.5rem_minmax(0,1fr)_22rem] gap-4 overflow-hidden">
          <div className="flex min-h-0 flex-col gap-3 rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(21,20,24,0.98),rgba(11,10,14,0.98))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.36)]">
            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.26em] text-[#d4b27a]">
                    Input layer
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    Desk control stack
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-stone-300">
                  {activeRoom.status}
                </span>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.26em] text-[#d4b27a]">
                    Active role
                  </p>
                  <p className="mt-1 text-lg font-semibold leading-tight text-white">
                    {mySeat ? ROLE_META[mySeat.role].label : "Observer"}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-stone-300">
                  {mySeat ? ROLE_META[mySeat.role].short : "OBS"}
                </span>
              </div>
              {currentDirective ? (
                <>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-stone-400">
                    {currentDirective.strap}
                  </p>
                  <p className="mt-2 text-[12px] leading-6 text-stone-200/88">
                    {currentDirective.objective}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-[12px] leading-6 text-stone-200/78">
                  Join a seat to receive your role-specific files and quarter mandate.
                </p>
              )}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">
                    Team status
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {submissionCount}/{ECO_ROLES.length} files submitted
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-stone-300">
                  {activeRoom.deadlineAt ? minutesLeft(activeRoom.deadlineAt) : "OPEN"}
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {ECO_ROLES.map((role) => {
                  const seat = activeRoom.seats.find((entry) => entry.role === role);
                  return (
                    <div
                      key={role}
                      className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-3 py-2 text-[11px]"
                    >
                      <div className="min-w-0">
                        <p className="truncate uppercase tracking-[0.16em] text-stone-300">
                          {ROLE_META[role].short} · {seat?.userName ?? "vacant"}
                        </p>
                      </div>
                      <span className="shrink-0 text-stone-400">
                        {!seat
                          ? "open"
                          : activeRoom.status === "active"
                            ? activeRoom.submissions.some((entry) => entry.role === role)
                              ? "filed"
                              : "pending"
                            : seat.ready
                              ? "ready"
                              : "pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() =>
                    activeRoom.status === "waiting"
                      ? void setReady(!mySeat?.ready)
                      : void submitAction()
                  }
                  disabled={
                    busy ||
                    actionSubmitting ||
                    (activeRoom.status !== "waiting" && !activeRoom.userRole)
                  }
                  className="cursor-pointer rounded-full bg-[#eadcc5] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-900 transition hover:bg-[#f6e8d1] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {activeRoom.status === "waiting"
                    ? busyAction === "ready"
                      ? (
                        <ButtonLoader
                          label={mySeat?.ready ? "Unlocking" : "Ready"}
                          tone="dark"
                        />
                      )
                      : mySeat?.ready
                        ? "Unlock Seat"
                        : "Ready Seat"
                    : actionSubmitting
                      ? <ButtonLoader label="Filing" tone="dark" />
                      : mySubmission
                      ? "Refill File"
                      : "Submit File"}
                </button>
              </div>
            </div>
          </div>

          <div className="relative min-h-0 overflow-hidden rounded-[38px] border border-white/10 bg-[#121113] shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
            <DeskBackdrop scenario={activeRoom.scenario} metrics={activeRoom.metrics} />
            <div className="pointer-events-none absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,transparent_0%,rgba(4,4,7,0.32)_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_22%,rgba(4,4,7,0.08)_56%,rgba(4,4,7,0.28)_100%)]" />
            <div className="pointer-events-none absolute left-6 top-6 right-6 flex items-start justify-between gap-4">
              <div className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-stone-300">
                Round desk · simultaneous filing
              </div>
              <div className="rounded-full border border-[#d4b27a]/20 bg-[#d4b27a]/10 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-[#f3dfbd]">
                Scenario {activeRoom.scenario.title}
              </div>
            </div>

            <DeskFile
              fileId="situation"
              title={activeRoom.scenario.title}
              subtitle="Shared situation dossier."
              accent="#d4b27a"
              layout={fileLayouts.situation}
              focused={focusedFile === "situation"}
              onFocus={bringFileToFront}
              onMove={moveFile}
            >
              <p className="text-[13px] leading-6 text-stone-800">
                {activeRoom.scenario.summary}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <DialChip label="Vector" value={activeRoom.scenario.primaryVector.toUpperCase()} accent="#2f7d73" />
                <DialChip label="Policy" value={activeRoom.scenario.policyTrack.toUpperCase()} accent="#ab6736" />
                <DialChip label="Funding" value={activeRoom.scenario.fundingTrack.toUpperCase()} accent="#436db7" />
              </div>
              <div className="mt-4 rounded-[20px] border border-stone-300/70 bg-white/40 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">
                  Immediate brief
                </p>
                <p className="mt-2 text-[12px] leading-6 text-stone-700">
                  {activeRoom.scenario.dossierPrompt}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <DialChip label="Treasury" value={`${activeRoom.metrics.treasury}`} accent="#b68837" />
                <DialChip label="Trust" value={`${activeRoom.metrics.publicTrust}`} accent="#637a8d" />
                <DialChip label="Air" value={`${activeRoom.metrics.airQuality}`} accent="#2f7d73" />
                <DialChip label="Water" value={`${activeRoom.metrics.waterSecurity}`} accent="#436db7" />
                <DialChip label="Biodiversity" value={`${activeRoom.metrics.biodiversity}`} accent="#6d9f34" />
                <DialChip label="Heat risk" value={`${100 - activeRoom.metrics.heatRisk}`} accent="#d26643" />
              </div>
              {currentDirective && (
                <div className="mt-4 rounded-[20px] border border-stone-300/60 bg-black/[0.04] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">
                    Current desk directive
                  </p>
                  <p className="mt-2 text-[12px] leading-6 text-stone-800">
                    {currentDirective.directive}
                  </p>
                </div>
              )}
            </DeskFile>

            {visibleFile === "monitoring" && (
              <>
                <DeskFile
                  fileId="monitoring_brief"
                  title="Signal Brief"
                  subtitle="Pick the evidence source."
                  accent={ROLE_META.monitoring.accent}
                  layout={fileLayouts.monitoring_brief}
                  focused={focusedFile === "monitoring_brief"}
                  onFocus={bringFileToFront}
                  onMove={moveFile}
                >
                  <p className="mb-3 text-[11px] leading-5 text-stone-700">
                    Choose the packet that will define what the rest of the desk believes this quarter.
                  </p>
                  <div className="space-y-2">
                    {MONITORING_DOSSIERS.map((dossier) => (
                      <button
                        key={dossier.id}
                        type="button"
                        onClick={() =>
                          activeRoom.userRole === "monitoring" &&
                          setMonitoringDraft((current) => ({ ...current, dossierId: dossier.id }))
                        }
                        className="w-full rounded-[16px] border px-3 py-2.5 text-left"
                        style={fileChoiceStyle(
                          monitoringDraft.dossierId === dossier.id,
                          ROLE_META.monitoring.accent
                        )}
                      >
                        <p className="text-[12px] font-semibold">{dossier.title}</p>
                        <p className="mt-1 text-[11px] leading-5 text-stone-800/90">{dossier.detail}</p>
                      </button>
                    ))}
                  </div>
                </DeskFile>

                <DeskFile
                  fileId="monitoring_matrix"
                  title="Verification Matrix"
                  subtitle="Set focus and scrutiny."
                  accent={ROLE_META.monitoring.accent}
                  layout={fileLayouts.monitoring_matrix}
                  focused={focusedFile === "monitoring_matrix"}
                  onFocus={bringFileToFront}
                  onMove={moveFile}
                >
                  <p className="mb-3 text-[11px] leading-5 text-stone-700">
                    Focus picks the threat lane. Verification depth and tone decide how hard the desk leans into the evidence.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["air", "water", "forest", "heat"] as const).map((focus) => (
                      <button
                        key={focus}
                        type="button"
                        onClick={() =>
                          activeRoom.userRole === "monitoring" &&
                          setMonitoringDraft((current) => ({ ...current, focus }))
                        }
                        className="rounded-[16px] border px-3 py-2 text-center text-[9px] font-semibold uppercase leading-4 tracking-[0.12em] whitespace-normal break-words"
                        style={fileChoiceStyle(
                          monitoringDraft.focus === focus,
                          ROLE_META.monitoring.accent
                        )}
                      >
                        {focus}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-stone-600">
                    Focus picks the ecosystem lane. The selected lane gets the strongest evidence bonus this quarter.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(["cautious", "assertive"] as const).map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() =>
                          activeRoom.userRole === "monitoring" &&
                          setMonitoringDraft((current) => ({ ...current, evidenceTone: tone }))
                        }
                        className="rounded-[16px] border px-3 py-2 text-center text-[9px] font-semibold uppercase leading-4 tracking-[0.12em] whitespace-normal break-words"
                        style={fileChoiceStyle(
                          monitoringDraft.evidenceTone === tone,
                          ROLE_META.monitoring.accent
                        )}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-stone-600">
                    Tone controls whether your evidence calms the room or pushes it toward emergency action.
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {([1, 2, 3] as const).map((depth) => (
                      <button
                        key={depth}
                        type="button"
                        onClick={() =>
                          activeRoom.userRole === "monitoring" &&
                          setMonitoringDraft((current) => ({ ...current, verificationDepth: depth }))
                        }
                        className="rounded-[16px] border px-3 py-2 text-center text-[9px] font-semibold uppercase leading-4 tracking-[0.12em] whitespace-normal break-words"
                        style={fileChoiceStyle(
                          monitoringDraft.verificationDepth === depth,
                          ROLE_META.monitoring.accent
                        )}
                      >
                        v{depth}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-stone-600">
                    Verification depth trades speed for certainty. Higher depth makes the signal more trustworthy.
                  </p>
                </DeskFile>

                <DeskFile
                  fileId="monitoring_dispatch"
                  title="Release Order"
                  subtitle="Decide how the desk sees it."
                  accent={ROLE_META.monitoring.accent}
                  layout={fileLayouts.monitoring_dispatch}
                  focused={focusedFile === "monitoring_dispatch"}
                  onFocus={bringFileToFront}
                  onMove={moveFile}
                >
                  <p className="mb-3 text-[11px] leading-5 text-stone-700">
                    Release timing and relay posture determine whether the warning lands as a calm brief or an immediate alarm.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["immediate", "staged"] as const).map((windowMode) => (
                      <button
                        key={windowMode}
                        type="button"
                        onClick={() =>
                          activeRoom.userRole === "monitoring" &&
                          setMonitoringDraft((current) => ({ ...current, releaseWindow: windowMode }))
                        }
                        className="rounded-[16px] border px-3 py-2 text-center text-[9px] font-semibold uppercase leading-4 tracking-[0.12em] whitespace-normal break-words"
                        style={fileChoiceStyle(
                          monitoringDraft.releaseWindow === windowMode,
                          ROLE_META.monitoring.accent
                        )}
                      >
                        {windowMode}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-stone-600">
                    Release window decides whether the desk is confronted all at once or eased into the evidence.
                  </p>
                  <div className="mt-3">
                    <label className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-stone-500">
                      <span>Scan intensity</span>
                      <span>{monitoringDraft.scanIntensity}</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={1}
                      value={monitoringDraft.scanIntensity}
                      onChange={(event) =>
                        setMonitoringDraft((current) => ({
                          ...current,
                          scanIntensity: Number(event.target.value) as 1 | 2 | 3,
                        }))
                      }
                      className="mt-2 w-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      activeRoom.userRole === "monitoring" &&
                      setMonitoringDraft((current) => ({ ...current, fieldRelay: !current.fieldRelay }))
                    }
                    className="mt-3 rounded-[16px] border px-3 py-2 text-center text-[9px] font-semibold uppercase leading-4 tracking-[0.12em] whitespace-normal break-words"
                    style={fileChoiceStyle(monitoringDraft.fieldRelay, ROLE_META.monitoring.accent)}
                  >
                    {monitoringDraft.fieldRelay ? "Field relay armed" : "No field relay"}
                  </button>
                  {turnForecast && (
                    <div className="mt-3 rounded-[18px] border border-stone-400/15 bg-white/45 px-3 py-3 text-[11px] leading-5 text-stone-700">
                      <p className="font-semibold text-stone-900">{turnForecast.title}</p>
                      <p className="mt-1">{turnForecast.lines[0]}</p>
                    </div>
                  )}
                </DeskFile>
              </>
            )}

            {visibleFile === "policy" && (
              <>
                <DeskFile
                  fileId="policy_mandate"
                  title="Mandate File"
                  subtitle="Choose the policy instrument."
                  accent={ROLE_META.policy.accent}
                  layout={fileLayouts.policy_mandate}
                  focused={focusedFile === "policy_mandate"}
                  onFocus={bringFileToFront}
                  onMove={moveFile}
                >
                  <p className="mb-3 text-[11px] leading-5 text-stone-700">
                    Pick the governing instrument that turns evidence into obligations, incentives, or emergency authority.
                  </p>
                  <div className="space-y-2">
                    {POLICY_FILES.map((policyFile) => (
                      <button
                        key={policyFile.id}
                        type="button"
                        onClick={() =>
                          activeRoom.userRole === "policy" &&
                          setPolicyDraft((current) => ({ ...current, policyId: policyFile.id }))
                        }
                        className="w-full rounded-[16px] border px-3 py-2.5 text-left"
                        style={fileChoiceStyle(
                          policyDraft.policyId === policyFile.id,
                          ROLE_META.policy.accent
                        )}
                      >
                        <p className="text-[12px] font-semibold">{policyFile.title}</p>
                        <p className="mt-1 text-[11px] leading-5 text-stone-800/90">{policyFile.detail}</p>
                      </button>
                    ))}
                  </div>
                </DeskFile>

                <DeskFile
                  fileId="policy_coalition"
                  title="Coalition Sheet"
                  subtitle="Set message and coalition."
                  accent={ROLE_META.policy.accent}
                  layout={fileLayouts.policy_coalition}
                  focused={focusedFile === "policy_coalition"}
                  onFocus={bringFileToFront}
                  onMove={moveFile}
                >
                  <p className="mb-3 text-[11px] leading-5 text-stone-700">
                    These choices shape who supports the plan and how the desk explains the move to the outside world.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["compliance", "incentive", "emergency"] as const).map((emphasis) => (
                      <button
                        key={emphasis}
                        type="button"
                        onClick={() =>
                          activeRoom.userRole === "policy" &&
                          setPolicyDraft((current) => ({ ...current, emphasis }))
                        }
                        className="rounded-[16px] border px-3 py-2 text-center text-[9px] font-semibold uppercase leading-4 tracking-[0.12em] whitespace-normal break-words"
                        style={fileChoiceStyle(
                          policyDraft.emphasis === emphasis,
                          ROLE_META.policy.accent
                        )}
                      >
                        {emphasis}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-stone-600">
                    Emphasis defines whether the desk coerces compliance, buys alignment, or invokes emergency powers.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(["transparent", "urgent"] as const).map((message) => (
                      <button
                        key={message}
                        type="button"
                        onClick={() =>
                          activeRoom.userRole === "policy" &&
                          setPolicyDraft((current) => ({ ...current, publicMessage: message }))
                        }
                        className="rounded-[16px] border px-3 py-2 text-center text-[9px] font-semibold uppercase leading-4 tracking-[0.12em] whitespace-normal break-words"
                        style={fileChoiceStyle(
                          policyDraft.publicMessage === message,
                          ROLE_META.policy.accent
                        )}
                      >
                        {message}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-stone-600">
                    Public message affects trust. Urgent language moves faster; transparent language preserves legitimacy.
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(["industry", "municipal", "public"] as const).map((target) => (
                      <button
                        key={target}
                        type="button"
                        onClick={() =>
                          activeRoom.userRole === "policy" &&
                          setPolicyDraft((current) => ({ ...current, coalitionTarget: target }))
                        }
                        className="rounded-[16px] border px-3 py-2 text-center text-[9px] font-semibold uppercase leading-4 tracking-[0.12em] whitespace-normal break-words"
                        style={fileChoiceStyle(
                          policyDraft.coalitionTarget === target,
                          ROLE_META.policy.accent
                        )}
                      >
                        {target}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-stone-600">
                    Coalition target tells you which bloc absorbs the shock and carries the policy through.
                  </p>
                </DeskFile>

                <DeskFile
                  fileId="policy_rollout"
                  title="Rollout Order"
                  subtitle="Scale, shield, and enforce."
                  accent={ROLE_META.policy.accent}
                  layout={fileLayouts.policy_rollout}
                  focused={focusedFile === "policy_rollout"}
                  onFocus={bringFileToFront}
                  onMove={moveFile}
                >
                  <p className="mb-3 text-[11px] leading-5 text-stone-700">
                    Rollout decides reach, intensity decides force, and legal shielding reduces the risk of backlash.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["pilot", "regional", "national"] as const).map((rollout) => (
                      <button
                        key={rollout}
                        type="button"
                        onClick={() =>
                          activeRoom.userRole === "policy" &&
                          setPolicyDraft((current) => ({ ...current, rollout }))
                        }
                        className="rounded-[16px] border px-3 py-2 text-center text-[9px] font-semibold uppercase leading-4 tracking-[0.12em] whitespace-normal break-words"
                        style={fileChoiceStyle(
                          policyDraft.rollout === rollout,
                          ROLE_META.policy.accent
                        )}
                      >
                        {rollout}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-stone-600">
                    Rollout controls scale. Pilot contains risk, while national deployment hits harder and wider.
                  </p>
                  <div className="mt-3">
                    <label className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-stone-500">
                      <span>Intensity</span>
                      <span>{policyDraft.intensity}</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={1}
                      value={policyDraft.intensity}
                      onChange={(event) =>
                        setPolicyDraft((current) => ({
                          ...current,
                          intensity: Number(event.target.value) as 1 | 2 | 3,
                        }))
                      }
                      className="mt-2 w-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      activeRoom.userRole === "policy" &&
                      setPolicyDraft((current) => ({ ...current, legalShield: !current.legalShield }))
                    }
                    className="mt-3 rounded-[16px] border px-3 py-2 text-center text-[9px] font-semibold uppercase leading-4 tracking-[0.12em] whitespace-normal break-words"
                    style={fileChoiceStyle(policyDraft.legalShield, ROLE_META.policy.accent)}
                  >
                    {policyDraft.legalShield ? "Legal shield engaged" : "No legal shield"}
                  </button>
                  {turnForecast && (
                    <div className="mt-3 rounded-[18px] border border-stone-400/15 bg-white/45 px-3 py-3 text-[11px] leading-5 text-stone-700">
                      <p className="font-semibold text-stone-900">{turnForecast.title}</p>
                      <p className="mt-1">{turnForecast.lines[0]}</p>
                    </div>
                  )}
                </DeskFile>
              </>
            )}

            {visibleFile === "funding" && (
              <>
                <DeskFile
                  fileId="funding_allocation"
                  title="Allocation Ledger"
                  subtitle="Split the quarter package."
                  accent={ROLE_META.funding.accent}
                  layout={fileLayouts.funding_allocation}
                  focused={focusedFile === "funding_allocation"}
                  onFocus={bringFileToFront}
                  onMove={moveFile}
                >
                  <p className="mb-3 text-[11px] leading-5 text-stone-700">
                    Divide the quarter budget across response, resilience, science quality, and community stability.
                  </p>
                  <div className="space-y-3">
                    {FUNDING_FILES.map((file) => (
                      <div key={file.id}>
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-stone-600">
                          <span>{file.title}</span>
                          <span>
                            {fundingDraft[file.id as keyof FundingAction]} ·{" "}
                            {allocationRatio(
                              fundingDraft[file.id as keyof FundingAction] as number,
                              fundingTotal
                            )}
                            %
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={fundingDraft[file.id as keyof FundingAction] as number}
                          onChange={(event) =>
                            setFundingDraft((current) => ({
                              ...current,
                              [file.id]: clampAllocation(Number(event.target.value)),
                            }))
                          }
                          className="mt-2 w-full"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-stone-600">
                    Each slider reallocates the same quarter package. Moving one track usually weakens another.
                  </p>
                </DeskFile>

                <DeskFile
                  fileId="funding_release"
                  title="Release Protocol"
                  subtitle="Control release posture."
                  accent={ROLE_META.funding.accent}
                  layout={fileLayouts.funding_release}
                  focused={focusedFile === "funding_release"}
                  onFocus={bringFileToFront}
                  onMove={moveFile}
                >
                  <p className="mb-3 text-[11px] leading-5 text-stone-700">
                    Release mode controls speed, oversight controls scrutiny, and reserve release defines how much cushion you burn.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["frontload", "balanced", "guarded"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          activeRoom.userRole === "funding" &&
                          setFundingDraft((current) => ({ ...current, releaseMode: mode }))
                        }
                        className="rounded-[16px] border px-3 py-2 text-center text-[9px] font-semibold uppercase leading-4 tracking-[0.12em] whitespace-normal break-words"
                        style={fileChoiceStyle(
                          fundingDraft.releaseMode === mode,
                          ROLE_META.funding.accent
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-stone-600">
                    Release mode sets tempo: fast now, balanced over time, or guarded to preserve future flexibility.
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(["tight", "balanced", "fast"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          activeRoom.userRole === "funding" &&
                          setFundingDraft((current) => ({ ...current, oversight: mode }))
                        }
                        className="rounded-[16px] border px-3 py-2 text-center text-[9px] font-semibold uppercase leading-4 tracking-[0.12em] whitespace-normal break-words"
                        style={fileChoiceStyle(
                          fundingDraft.oversight === mode,
                          ROLE_META.funding.accent
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-stone-600">
                    Oversight trades safety against speed. Fast release moves money; tight audit reduces waste.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setFundingDraft((current) => ({
                        ...current,
                        reserveRelease: !current.reserveRelease,
                      }))
                    }
                    className="mt-3 rounded-[16px] border px-3 py-2 text-center text-[9px] font-semibold uppercase leading-4 tracking-[0.12em] whitespace-normal break-words"
                    style={fileChoiceStyle(fundingDraft.reserveRelease, ROLE_META.funding.accent)}
                  >
                    {fundingDraft.reserveRelease ? "Reserve release armed" : "Keep reserve sealed"}
                  </button>
                </DeskFile>

                <DeskFile
                  fileId="funding_match"
                  title="Match Docket"
                  subtitle="Bring in outside money or stay internal."
                  accent={ROLE_META.funding.accent}
                  layout={fileLayouts.funding_match}
                  focused={focusedFile === "funding_match"}
                  onFocus={bringFileToFront}
                  onMove={moveFile}
                >
                  <p className="mb-3 text-[11px] leading-5 text-stone-700">
                    External matching adds money, but also changes the desk’s speed and political constraints.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      activeRoom.userRole === "funding" &&
                      setFundingDraft((current) => ({ ...current, externalMatch: !current.externalMatch }))
                    }
                    className="rounded-[16px] border px-3 py-2 text-center text-[9px] font-semibold uppercase leading-4 tracking-[0.12em] whitespace-normal break-words"
                    style={fileChoiceStyle(fundingDraft.externalMatch, ROLE_META.funding.accent)}
                  >
                    {fundingDraft.externalMatch ? "External match requested" : "No external match"}
                  </button>
                  {turnForecast && (
                    <div className="mt-3 rounded-[18px] border border-stone-400/15 bg-white/45 px-3 py-3 text-[11px] leading-5 text-stone-700">
                      {turnForecast.lines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  )}
                </DeskFile>
              </>
            )}

            {!visibleFile && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-[30px] border border-white/10 bg-black/35 px-8 py-7 text-center shadow-[0_28px_80px_rgba(0,0,0,0.32)]">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#d4b27a]">
                    Observer deck
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">Claim a seat to access a live file</h3>
                  <p className="mt-3 max-w-md text-sm leading-7 text-stone-300/78">
                    Monitoring, Policy, and Funding files are private to the role that owns them for the current quarter.
                  </p>
                </div>
              </div>
            )}

            {resolutionSummary && (
              <ResolutionOverlay
                summary={resolutionSummary}
                onClose={() => setResolutionSummary(null)}
              />
            )}
            {stampRole && <DeskStampBurst role={stampRole} />}
          </div>

          <div className="flex min-h-0 flex-col gap-4 overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,16,21,0.98),rgba(9,9,13,0.98))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.36)]">
            <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#d4b27a]">
                COMMS LEDGER
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLedgerTab("comms")}
                  className="rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em]"
                  style={{
                    borderColor:
                      ledgerTab === "comms" ? "rgba(212,178,122,0.5)" : "rgba(255,255,255,0.12)",
                    background:
                      ledgerTab === "comms" ? "rgba(212,178,122,0.14)" : "rgba(255,255,255,0.03)",
                  }}
                >
                  Desk traffic
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerTab("archive")}
                  className="rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em]"
                  style={{
                    borderColor:
                      ledgerTab === "archive" ? "rgba(212,178,122,0.5)" : "rgba(255,255,255,0.12)",
                    background:
                      ledgerTab === "archive" ? "rgba(212,178,122,0.14)" : "rgba(255,255,255,0.03)",
                  }}
                >
                  Archive
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-[26px] border border-white/10 bg-black/20 p-4">
              {ledgerTab === "comms" ? (
                <div className="space-y-3">
                  {activeRoom.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-[22px] border px-4 py-3 ${
                        message.isSelf
                          ? "border-[#d9c3a0]/30 bg-[#d9c3a0]/10"
                          : "border-white/10 bg-white/4"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400">
                          {message.userName}
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {message.kind === "voice" ? (
                        <div className="space-y-3">
                          <p className="text-sm text-stone-100">{message.body}</p>
                          <div className="flex items-center gap-1">
                            {Array.isArray(message.metadata.peaks) &&
                              (message.metadata.peaks as number[]).map((peak, index) => (
                                <span
                                  key={`${message.id}-${index}`}
                                  className="w-1 rounded-full bg-[#e4d4b8]"
                                  style={{ height: `${Math.max(6, peak * 28)}px` }}
                                />
                              ))}
                          </div>
                          {typeof message.metadata.audioDataUrl === "string" && (
                            <audio
                              controls
                              src={message.metadata.audioDataUrl}
                              className="w-full"
                            />
                          )}
                        </div>
                      ) : (
                        <p className="text-sm leading-6 text-stone-200/84">
                          {message.body}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {activeRoom.rounds.map((round) => (
                    <ArchiveEntry key={round.roundNumber} round={round} />
                  ))}
                </div>
              )}
            </div>

            <MessageComposer
              disabled={activeRoom.status === "finished"}
              onSendText={sendTextMessage}
              onSendVoice={sendVoiceMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

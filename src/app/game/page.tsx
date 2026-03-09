"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import type {
  GameAction,
  GameStats,
  LevelUpChoice,
} from "@/components/game/engine/GameCanvas";
import type { WeaponId } from "@/lib/game/weapons";
import GameHUD from "@/components/game/ui/GameHUD";
import UpgradeModal from "@/components/game/ui/UpgradeModal";
import PauseMenu from "@/components/game/ui/PauseMenu";
import GameOverScreen from "@/components/game/ui/GameOverScreen";
import GameStartScreen from "@/components/game/ui/GameStartScreen";
import { useAuthStore } from "@/store/authStore";
import { usePointsStore } from "@/store/pointsStore";
import {
  STARTER_BASE_SKILLS,
  STARTER_DECRYPT_COST,
  normalizeStarterUnlocked,
} from "@/lib/game/starterProgress";

const GameCanvas = dynamic(
  () => import("@/components/game/engine/GameCanvas"),
  {
    ssr: false,
  }
);

type Screen = "start" | "playing" | "paused" | "levelup" | "gameover";

interface DecryptReward {
  id: WeaponId;
  name: string;
  rarity: string;
  isNew: boolean;
  color: string;
  icon: string;
}

interface IntelToast {
  id: number;
  title: string;
  detail: string;
}

interface FusionToast {
  id: number;
  name: string;
  detail: string;
  color: string;
}

const GUEST_PROGRESS_KEY = "sat-game-starter-progress:guest";

export default function GamePage() {
  const {
    highScores,
    addHighScore,
    loadHighScores,
    addRunStats,
    selectedHull,
    selectedColor,
    setSelectedHull,
    setSelectedColor,
  } = useGameStore();
  const { isAuthenticated, user } = useAuthStore();
  const { points, fetchPoints } = usePointsStore();

  const [screen, setScreen] = useState<Screen>("start");
  const [stats, setStats] = useState<GameStats | null>(null);
  const [levelUpChoices, setLevelUpChoices] = useState<LevelUpChoice[]>([]);
  const [canRerollLevelUp, setCanRerollLevelUp] = useState(false);
  const [gameAction, setGameAction] = useState<GameAction | null>(null);
  const [selectedStarterWeapon, setSelectedStarterWeapon] =
    useState<WeaponId>("stinger");
  const [selectedStarterSynergyId, setSelectedStarterSynergyId] = useState<
    string | undefined
  >(undefined);
  const [starterUnlockedSkills, setStarterUnlockedSkills] =
    useState<WeaponId[]>(STARTER_BASE_SKILLS);
  const [intelFragments, setIntelFragments] = useState(0);
  const [decryptCost, setDecryptCost] = useState(STARTER_DECRYPT_COST);
  const [decrypting, setDecrypting] = useState(false);
  const [lastDecryptReward, setLastDecryptReward] =
    useState<DecryptReward | null>(null);
  const [intelToasts, setIntelToasts] = useState<IntelToast[]>([]);
  const [fusionToasts, setFusionToasts] = useState<FusionToast[]>([]);
  const [finalState, setFinalState] = useState<{
    score: number;
    time: number;
    level: number;
    kills: number;
    debris: number;
    weapons: string[];
  } | null>(null);

  const actionCounter = useRef(0);
  const toastCounter = useRef(0);

  const pushIntelToast = useCallback(() => {
    const id = toastCounter.current++;
    setIntelToasts((prev) => [
      ...prev,
      {
        id,
        title: "Intel Fragment Secured",
        detail: "Boss core decrypted into one fragment.",
      },
    ]);
    window.setTimeout(() => {
      setIntelToasts((prev) => prev.filter((entry) => entry.id !== id));
    }, 2200);
  }, []);

  const pushFusionToast = useCallback(
    (payload: { name: string; description: string; color: string }) => {
      const id = toastCounter.current++;
      setFusionToasts((prev) => [
        ...prev,
        {
          id,
          name: payload.name,
          detail: payload.description,
          color: payload.color || "#7ff7ff",
        },
      ]);
      window.setTimeout(() => {
        setFusionToasts((prev) => prev.filter((entry) => entry.id !== id));
      }, 2800);
    },
    []
  );

  useEffect(() => {
    loadHighScores();
  }, [loadHighScores]);

  const loadGuestProgress = useCallback(() => {
    try {
      const raw = localStorage.getItem(GUEST_PROGRESS_KEY);
      if (!raw) {
        setStarterUnlockedSkills(STARTER_BASE_SKILLS);
        setIntelFragments(0);
        return;
      }
      const parsed = JSON.parse(raw) as { unlocked?: string[]; intel?: number };
      const unlocked = normalizeStarterUnlocked(parsed.unlocked || []);
      setStarterUnlockedSkills(unlocked);
      setIntelFragments(Math.max(0, parsed.intel || 0));
    } catch {
      setStarterUnlockedSkills(STARTER_BASE_SKILLS);
      setIntelFragments(0);
    }
  }, []);

  const saveGuestProgress = useCallback(
    (unlocked: WeaponId[], intel: number) => {
      try {
        localStorage.setItem(
          GUEST_PROGRESS_KEY,
          JSON.stringify({ unlocked, intel })
        );
      } catch {}
    },
    []
  );

  const loadStarterProgress = useCallback(async () => {
    setLastDecryptReward(null);
    if (!isAuthenticated || !user) {
      loadGuestProgress();
      setDecryptCost(STARTER_DECRYPT_COST);
      return;
    }
    try {
      const res = await fetch("/api/game/starter-skills");
      if (!res.ok) throw new Error("starter progress fetch failed");
      const data = await res.json();
      const unlocked = normalizeStarterUnlocked(data.unlockedSkillIds || []);
      setStarterUnlockedSkills(unlocked);
      setIntelFragments(Math.max(0, data.intelFragments || 0));
      setDecryptCost(Math.max(1, data.decryptCost || STARTER_DECRYPT_COST));
    } catch {
      loadGuestProgress();
      setDecryptCost(STARTER_DECRYPT_COST);
    }
  }, [isAuthenticated, user, loadGuestProgress]);

  useEffect(() => {
    loadStarterProgress();
  }, [loadStarterProgress]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPoints();
    }
  }, [isAuthenticated, fetchPoints]);

  useEffect(() => {
    if (!starterUnlockedSkills.includes(selectedStarterWeapon)) {
      setSelectedStarterWeapon(starterUnlockedSkills[0] || "stinger");
    }
  }, [starterUnlockedSkills, selectedStarterWeapon]);

  // Lets the player start a new run from the intro screen by pressing Enter.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Enter" && screen === "start") {
        handleStart();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen]);

  const sendAction = useCallback((action: GameAction) => {
    actionCounter.current++;
    setGameAction({ ...action } as GameAction);
  }, []);

  const handleStart = useCallback(() => {
    setScreen("playing");
    setFinalState(null);
    setLastDecryptReward(null);
    sendAction({ type: "start" });
  }, [sendAction]);

  const handleIntelFragment = useCallback(
    async (payload: { reason: "boss" }) => {
      if (isAuthenticated && user) {
        try {
          const res = await fetch("/api/game/starter-skills", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "grant_fragment",
              reason: payload.reason,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setIntelFragments(Math.max(0, data.intelFragments || 0));
            pushIntelToast();
          }
        } catch {}
        return;
      }

      setIntelFragments((prev) => {
        const next = prev + 1;
        saveGuestProgress(starterUnlockedSkills, next);
        return next;
      });
      pushIntelToast();
    },
    [
      isAuthenticated,
      user,
      saveGuestProgress,
      starterUnlockedSkills,
      pushIntelToast,
    ]
  );

  const handleSynergyUnlocked = useCallback(
    (payload: {
      id: string;
      name: string;
      description: string;
      color: string;
    }) => {
      pushFusionToast({
        name: payload.name,
        description: payload.description,
        color: payload.color,
      });
    },
    [pushFusionToast]
  );

  const handleDecryptIntel = useCallback(async () => {
    if (decrypting || intelFragments <= 0) return;
    setDecrypting(true);
    try {
      if (isAuthenticated && user) {
        const res = await fetch("/api/game/starter-skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "decrypt" }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const unlocked = normalizeStarterUnlocked(data.unlockedSkillIds || []);
        setStarterUnlockedSkills(unlocked);
        setIntelFragments(Math.max(0, data.intelFragments || 0));
        setDecryptCost(Math.max(1, data.decryptCost || STARTER_DECRYPT_COST));
        setLastDecryptReward(data.reward || null);
        await fetchPoints();
        return;
      }
      // Decrypting requires account points.
      return;
    } finally {
      setDecrypting(false);
    }
  }, [decrypting, intelFragments, isAuthenticated, user, fetchPoints]);

  const handleGameOver = useCallback(
    (state: typeof finalState) => {
      if (!state) return;
      setFinalState(state);
      setScreen("gameover");
      addHighScore(state.score);
      addRunStats(state.kills, state.debris);
    },
    [addHighScore, addRunStats]
  );

  const handleLevelUp = useCallback(
    (choices: LevelUpChoice[]) => {
      setLevelUpChoices(choices);
      setScreen("levelup");
      setCanRerollLevelUp((prev) => (screen === "levelup" ? prev : true));
    },
    [screen]
  );

  const handleChooseUpgrade = useCallback(
    (index: number) => {
      sendAction({ type: "chooseUpgrade", index });
      setScreen("playing");
      setLevelUpChoices([]);
      setCanRerollLevelUp(false);
    },
    [sendAction]
  );

  const handleRerollUpgrade = useCallback(() => {
    if (!canRerollLevelUp) return;
    sendAction({ type: "rerollUpgrade" });
    setCanRerollLevelUp(false);
  }, [canRerollLevelUp, sendAction]);

  const handlePause = useCallback((paused: boolean) => {
    setScreen(paused ? "paused" : "playing");
  }, []);

  const handleResume = useCallback(() => {
    sendAction({ type: "resume" });
    setScreen("playing");
  }, [sendAction]);

  const handleRestart = useCallback(() => {
    setFinalState(null);
    setScreen("playing");
    sendAction({ type: "restart" });
  }, [sendAction]);

  const handleQuit = useCallback(() => {
    // When quitting from pause, count as a completed run with score
    if (stats && screen === "paused") {
      const state = {
        score: stats.score,
        time: stats.time,
        level: stats.level,
        kills: stats.kills,
        debris: stats.debrisCollected,
        weapons: stats.weapons.map((w) => w.name),
      };
      setFinalState(state);
      setScreen("gameover");
      addHighScore(state.score);
      addRunStats(state.kills, state.debris);
      return;
    }
    setFinalState(null);
    setScreen("start");
  }, [stats, screen, addHighScore, addRunStats]);

  return (
    <div className="relative w-full h-full min-h-0 z-[60] bg-[#06080d]">
      <div className="absolute inset-0">
        <GameCanvas
          onGameOver={handleGameOver}
          onLevelUp={handleLevelUp}
          onPause={handlePause}
          onStatsUpdate={setStats}
          onIntelFragment={handleIntelFragment}
          onSynergyUnlocked={handleSynergyUnlocked}
          gameAction={gameAction}
          shipHull={selectedHull}
          shipColor={selectedColor}
          starterWeapon={selectedStarterWeapon}
          starterSynergyId={selectedStarterSynergyId}
        />
      </div>
      {screen === "start" && (
        <GameStartScreen
          onStart={handleStart}
          highScore={highScores[0] || 0}
          selectedHull={selectedHull}
          selectedColor={selectedColor}
          selectedStarterWeapon={selectedStarterWeapon}
          ownedStarterWeaponIds={starterUnlockedSkills}
          intelFragments={intelFragments}
          decryptCost={decryptCost}
          userPoints={points}
          isAuthenticated={isAuthenticated}
          isDecrypting={decrypting}
          lastDecryptReward={lastDecryptReward}
          selectedStarterSynergyId={selectedStarterSynergyId}
          onHullChange={setSelectedHull}
          onColorChange={setSelectedColor}
          onStarterWeaponChange={setSelectedStarterWeapon}
          onDecryptIntel={handleDecryptIntel}
          onStarterSynergyChange={setSelectedStarterSynergyId}
        />
      )}

      {(screen === "playing" ||
        screen === "levelup" ||
        screen === "paused") && <GameHUD stats={stats} />}

      <div className="pointer-events-none absolute right-4 top-4 z-[160] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
        <AnimatePresence initial={false}>
          {fusionToasts.map((toast) => (
            <motion.div
              key={`fusion-${toast.id}`}
              initial={{
                opacity: 0,
                x: 34,
                scale: 0.9,
                y: -6,
                filter: "blur(6px)",
              }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                y: 0,
                filter: "blur(0px)",
              }}
              exit={{
                opacity: 0,
                x: 30,
                scale: 0.95,
                y: -2,
                filter: "blur(4px)",
              }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-2xl border px-3.5 py-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_14px_36px_rgba(6,10,22,0.72)] backdrop-blur-md"
              style={{
                borderColor: `${toast.color}99`,
                background: `linear-gradient(135deg, ${toast.color}22 0%, rgba(8,14,30,0.94) 34%, rgba(3,8,20,0.95) 100%)`,
              }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(120% 115% at 6% 0%, ${toast.color}40 0%, rgba(125,211,252,0.06) 38%, rgba(2,6,23,0.1) 100%)`,
                }}
              />
              <div className="relative flex items-start gap-2.5">
                <div
                  className="mt-0.5 h-7 w-7 rounded-lg border text-center text-sm leading-7"
                  style={{
                    borderColor: `${toast.color}aa`,
                    color: toast.color,
                    background: `${toast.color}1f`,
                  }}
                >
                  ✶
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold tracking-[0.2em] text-slate-200/90 uppercase">
                    Fusion Unlocked
                  </p>
                  <p className="truncate text-xs font-semibold text-white">
                    {toast.name}
                  </p>
                  <p className="line-clamp-2 text-[11px] leading-snug text-slate-200/90">
                    {toast.detail}
                  </p>
                </div>
              </div>
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 2.75, ease: "linear" }}
                className="absolute bottom-0 left-0 h-[2px] w-full origin-left"
                style={{
                  background: `linear-gradient(90deg, ${toast.color}dd 0%, ${toast.color}88 55%, transparent 100%)`,
                }}
              />
            </motion.div>
          ))}
          {intelToasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 30, scale: 0.94, filter: "blur(5px)" }}
              animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: 24, scale: 0.96, filter: "blur(3px)" }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-xl border border-cyan-300/40 bg-slate-950/85 px-3 py-2 shadow-[0_8px_32px_rgba(8,145,178,0.28)] backdrop-blur-md"
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(120% 120% at 0% 0%, rgba(34,211,238,0.22) 0%, rgba(34,211,238,0.06) 42%, rgba(15,23,42,0.1) 100%)",
                }}
              />
              <div className="relative flex items-start gap-2.5">
                <div className="mt-0.5 h-7 w-7 rounded-lg border border-cyan-200/45 bg-cyan-300/12 text-center text-sm leading-7 text-cyan-200">
                  ⟡
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold tracking-[0.14em] text-cyan-100 uppercase">
                    {toast.title}
                  </p>
                  <p className="text-[11px] leading-snug text-slate-200/90">
                    {toast.detail}
                  </p>
                </div>
              </div>
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 2.15, ease: "linear" }}
                className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-gradient-to-r from-cyan-300/80 via-teal-200/70 to-transparent"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <UpgradeModal
        choices={levelUpChoices}
        equippedWeapons={
          stats?.weapons.map((w) => ({ id: w.id, level: w.level })) || []
        }
        equippedPassives={
          stats?.passives.map((p) => ({ id: p.id, level: p.level })) || []
        }
        onChoose={handleChooseUpgrade}
        onReroll={handleRerollUpgrade}
        canReroll={canRerollLevelUp}
        visible={screen === "levelup"}
      />

      <PauseMenu
        visible={screen === "paused"}
        stats={stats}
        onResume={handleResume}
        onQuit={handleQuit}
      />

      {screen === "gameover" && finalState && (
        <GameOverScreen
          visible
          score={finalState.score}
          time={finalState.time}
          level={finalState.level}
          kills={finalState.kills}
          debris={finalState.debris}
          weapons={finalState.weapons}
          highScores={highScores}
          onRestart={handleRestart}
          onQuit={handleQuit}
        />
      )}
    </div>
  );
}

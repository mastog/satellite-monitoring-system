"use client";

import { useEffect, useRef, useCallback } from "react";
import { GameLoop } from "./GameLoop";
import { Input } from "./Input";
import { Camera } from "./Camera";
import { createGame, GameState } from "../systems/GameState";
import type { ShipHull } from "@/store/gameStore";
import type { WeaponId } from "@/lib/game/weapons";

interface GameCanvasProps {
  onScoreChange?: (score: number) => void;
  onGameOver?: (finalState: {
    score: number;
    time: number;
    level: number;
    kills: number;
    debris: number;
    weapons: string[];
  }) => void;
  onLevelUp?: (choices: LevelUpChoice[]) => void;
  onPause?: (paused: boolean) => void;
  onStatsUpdate?: (stats: GameStats) => void;
  onIntelFragment?: (payload: { reason: "boss" }) => void;
  onSynergyUnlocked?: (payload: {
    id: string;
    name: string;
    description: string;
    color: string;
  }) => void;
  gameAction?: GameAction | null;
  shipHull?: ShipHull;
  shipColor?: string;
  starterWeapon?: WeaponId;
}

export interface LevelUpChoice {
  type: "weapon" | "passive";
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  color: string;
  icon: string;
  rarity?: string;
}

export interface GameStats {
  hp: number;
  maxHp: number;
  invincibleFrames: number;
  xp: number;
  xpNeeded: number;
  level: number;
  score: number;
  time: number;
  wave: number;
  enemyCount: number;
  debrisCollected: number;
  kills: number;
  weapons: {
    id: string;
    name: string;
    level: number;
    maxLevel: number;
    color: string;
    rarity: string;
    icon: string;
  }[];
  passives: { id: string; level: number }[];
  synergies: { id: string; name: string; color: string }[];
  guard: {
    accum: number;
    threshold: number;
    pct: number;
    windowFrames: number;
  };
  fps: number;
}

export type GameAction =
  | { type: "start" }
  | { type: "chooseUpgrade"; index: number }
  | { type: "rerollUpgrade" }
  | { type: "resume" }
  | { type: "restart" };

export default function GameCanvas({
  onGameOver,
  onLevelUp,
  onPause,
  onStatsUpdate,
  onIntelFragment,
  onSynergyUnlocked,
  gameAction,
  shipHull,
  shipColor,
  starterWeapon,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const loopRef = useRef<GameLoop | null>(null);
  const inputRef = useRef<Input | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const lastActionRef = useRef<GameAction | null>(null);
  const wakeLockRef = useRef<any>(null);

  const callbacksRef = useRef({
    onGameOver,
    onLevelUp,
    onPause,
    onStatsUpdate,
    onIntelFragment,
    onSynergyUnlocked,
  });
  callbacksRef.current = {
    onGameOver,
    onLevelUp,
    onPause,
    onStatsUpdate,
    onIntelFragment,
    onSynergyUnlocked,
  };

  // Keep ship settings current so resets use the latest selection.
  const shipRef = useRef({
    hull: shipHull,
    color: shipColor,
    starterWeapon,
  });
  shipRef.current = {
    hull: shipHull,
    color: shipColor,
    starterWeapon,
  };

  // Keep canvas display size and internal resolution aligned.
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = w;
    canvas.height = h;
    cameraRef.current?.resize(w, h);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    handleResize();

    const input = new Input();
    input.attach(canvas);
    inputRef.current = input;

    const camera = new Camera(canvas.width, canvas.height);
    cameraRef.current = camera;
    camera.resize(canvas.width, canvas.height);

    const game = createGame(canvas, camera, input, callbacksRef, shipRef);
    gameRef.current = game;

    const loop = new GameLoop(
      (dt) => game.update(dt),
      (_alpha) => game.render(_alpha, loop.fps)
    );
    loopRef.current = loop;

    window.addEventListener("resize", handleResize);

    return () => {
      loop.stop();
      input.detach();
      if (
        wakeLockRef.current &&
        typeof wakeLockRef.current.release === "function"
      ) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      window.removeEventListener("resize", handleResize);
      gameRef.current = null;
    };
  }, [handleResize]);

  // Request a wake lock while the game is active.
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if (!("wakeLock" in navigator)) return;
        if (wakeLockRef.current) return;
        const wl = await (navigator as any).wakeLock.request("screen");
        wakeLockRef.current = wl;
        if (wl && typeof wl.addEventListener === "function") {
          wl.addEventListener("release", () => {
            wakeLockRef.current = null;
          });
        }
      } catch {}
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    requestWakeLock();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!gameAction || gameAction === lastActionRef.current) return;
    lastActionRef.current = gameAction;
    const game = gameRef.current;
    const loop = loopRef.current;
    if (!game || !loop) return;

    switch (gameAction.type) {
      case "start":
        game.reset();
        loop.start();
        if ("wakeLock" in navigator && !wakeLockRef.current) {
          (navigator as any).wakeLock
            .request("screen")
            .then((wl: any) => {
              wakeLockRef.current = wl;
              if (wl && typeof wl.addEventListener === "function") {
                wl.addEventListener("release", () => {
                  wakeLockRef.current = null;
                });
              }
            })
            .catch(() => {});
        }
        break;
      case "chooseUpgrade":
        game.chooseUpgrade(gameAction.index);
        break;
      case "rerollUpgrade":
        game.rerollUpgradeChoices();
        break;
      case "resume":
        game.setPaused(false);
        break;
      case "restart":
        loop.stop();
        game.reset();
        loop.start();
        if ("wakeLock" in navigator && !wakeLockRef.current) {
          (navigator as any).wakeLock
            .request("screen")
            .then((wl: any) => {
              wakeLockRef.current = wl;
              if (wl && typeof wl.addEventListener === "function") {
                wl.addEventListener("release", () => {
                  wakeLockRef.current = null;
                });
              }
            })
            .catch(() => {});
        }
        break;
    }
  }, [gameAction]);

  // Lets the player toggle pause with keyboard shortcuts while preventing pauses during level-up selection.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "KeyP" || e.code === "Escape") {
        const game = gameRef.current;
        if (!game || !game.isRunning) return;
        if (game.isLevelUp) return; // don't pause during level-up
        game.togglePause();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        background: "#06080d",
        cursor: "crosshair",
      }}
    />
  );
}

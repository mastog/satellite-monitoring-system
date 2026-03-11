import { create } from "zustand";

export type ShipHull = "viper" | "mantis" | "titan";

interface GameStoreState {
  // Holds the signed-in player's personal leaderboard returned by the server.
  highScores: number[];
  setHighScores: (scores: number[]) => void;
  clearHighScores: () => void;
  loadHighScores: () => void;

  // Persists the selected hull and color that configure the player's ship
  // presentation in menus and gameplay.
  selectedHull: ShipHull;
  selectedColor: string;
  setSelectedHull: (hull: ShipHull) => void;
  setSelectedColor: (color: string) => void;

  // Tracks whether a run is currently active so the UI can switch between
  // menu, gameplay, and summary states.
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;

  // Aggregates long-term progress statistics used by the game summary views.
  totalKills: number;
  totalDebris: number;
  totalRuns: number;
  addRunStats: (kills: number, debris: number) => void;
}

const STATS_KEY = "sat-game-stats";
const SHIP_KEY = "sat-game-ship";

export const useGameStore = create<GameStoreState>((set) => ({
  highScores: [],
  setHighScores: (scores) =>
    set({
      highScores: [...scores].sort((a, b) => b - a).slice(0, 10),
    }),
  clearHighScores: () => set({ highScores: [] }),
  loadHighScores: () => {
    try {
      const statsRaw = localStorage.getItem(STATS_KEY);
      if (statsRaw) {
        const stats = JSON.parse(statsRaw);
        set({
          totalKills: stats.totalKills || 0,
          totalDebris: stats.totalDebris || 0,
          totalRuns: stats.totalRuns || 0,
        });
      }

      const shipRaw = localStorage.getItem(SHIP_KEY);
      if (shipRaw) {
        const ship = JSON.parse(shipRaw);
        if (ship.hull) set({ selectedHull: ship.hull });
        if (ship.color) set({ selectedColor: ship.color });
      }
    } catch {}
  },

  selectedHull: "viper",
  selectedColor: "#00e5ff",
  setSelectedHull: (hull) => {
    set({ selectedHull: hull });
    try {
      const ship = JSON.parse(localStorage.getItem(SHIP_KEY) || "{}");
      ship.hull = hull;
      localStorage.setItem(SHIP_KEY, JSON.stringify(ship));
    } catch {}
  },
  setSelectedColor: (color) => {
    set({ selectedColor: color });
    try {
      const ship = JSON.parse(localStorage.getItem(SHIP_KEY) || "{}");
      ship.color = color;
      localStorage.setItem(SHIP_KEY, JSON.stringify(ship));
    } catch {}
  },

  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  totalKills: 0,
  totalDebris: 0,
  totalRuns: 0,
  addRunStats: (kills, debris) => {
    set((s) => {
      const newState = {
        totalKills: s.totalKills + kills,
        totalDebris: s.totalDebris + debris,
        totalRuns: s.totalRuns + 1,
      };
      try {
        localStorage.setItem(STATS_KEY, JSON.stringify(newState));
      } catch {}
      return newState;
    });
  },
}));

import { create } from "zustand";

export interface SatelliteData {
  id: string;
  name: string;
  noradId: number;
  lat: number;
  lng: number;
  alt: number;
  velocity: number;
  type: "active" | "debris" | "station" | "weather";
  tle1?: string;
  tle2?: string;
  group?: string;
  epochAge?: number;
  // Carries the server snapshot timestamp so live markers and orbit trails can
  // stay aligned to the same propagated frame.
  snapshotAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  displayName: string;
  email: string;
  joinedAt: string;
  location: { lat: number; lng: number };
  collected: string[];
  medals: string[];
  readCount: number;
  observed: number;
  points: number;
  rank: string;
}

export interface UserPreferences {
  displayName: string;
  preferredUnits: "km" | "mi";
  accentColor: string;
  cinematicFilter: "standard" | "monochrome" | "noir" | "bleach";
}

interface AppState {
  // Stores the complete satellite dataset, the current selection, and the
  // client-side tracking list used by the tracking experience.
  satellites: SatelliteData[];
  setSatellites: (sats: SatelliteData[]) => void;
  selectedSatellite: SatelliteData | null;
  setSelectedSatellite: (sat: SatelliteData | null) => void;
  trackedSatellites: string[];
  toggleTracked: (id: string) => void;

  // Controls how many non-debris satellites are shown and keeps the shuffle
  // seed used to make density-based sampling stable across renders.
  satelliteDensity: number;
  setSatelliteDensity: (n: number) => void;
  _densitySeed: number;
  reshuffleSatellites: () => void;

  // Synchronizes the local tracked list with the authenticated user's
  // persisted server-side preferences.
  syncTrackedToServer: () => void;
  loadTrackedFromServer: () => Promise<void>;

  // Stores user profile and location data shared across top-level views.
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (loc: { lat: number; lng: number }) => void;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;

  // Stores unit and appearance preferences that affect formatting and global
  // presentation across the shell.
  userPreferences: UserPreferences;
  setUserPreferences: (partial: Partial<UserPreferences>) => void;

  // Controls visibility of the global authentication modal.
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;

  // Controls simulation playback speed and pause state for time-aware scenes.
  simulationSpeed: number;
  setSimulationSpeed: (speed: number) => void;
  isPaused: boolean;
  togglePause: () => void;

  // Tracks which floating information panels are currently open.
  activePanels: string[];
  togglePanel: (id: string) => void;

  // Stores the primary region selected in the SDG dashboard.
  selectedRegion: string;
  setSelectedRegion: (region: string) => void;

  // Stores the comparison-mode regions used for side-by-side SDG analysis.
  comparisonRegions: string[];
  isComparisonMode: boolean;
  setComparisonRegions: (regions: string[]) => void;
  toggleComparisonRegion: (region: string) => void;
  setComparisonMode: (enabled: boolean) => void;

  // Stores the timeline scrubber offset in milliseconds, where zero means
  // live data and negative values represent historical playback.
  timeOffset: number;
  setTimeOffset: (offset: number) => void;

  // Clears state that should not survive after the current user signs out.
  resetUserState: () => void;
}

const defaultPreferences: UserPreferences = {
  displayName: "",
  preferredUnits: "km",
  accentColor: "cyan",
  cinematicFilter: "standard",
};

export const useAppStore = create<AppState>((set, get) => ({
  satellites: [],
  setSatellites: (sats) => set({ satellites: sats }),
  selectedSatellite: null,
  setSelectedSatellite: (sat) => set({ selectedSatellite: sat }),
  trackedSatellites: [],
  toggleTracked: (id) => {
    set((s) => ({
      trackedSatellites: s.trackedSatellites.includes(id)
        ? s.trackedSatellites.filter((t) => t !== id)
        : [...s.trackedSatellites, id],
    }));
    queueMicrotask(() => get().syncTrackedToServer());
  },

  satelliteDensity: 12,
  setSatelliteDensity: (n) =>
    set({ satelliteDensity: Math.max(3, Math.min(30, n)) }),
  _densitySeed: Date.now(),
  reshuffleSatellites: () => set({ _densitySeed: Date.now() }),

  syncTrackedToServer: () => {
    const { trackedSatellites } = get();
    fetch("/api/user/tracked-satellites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ satelliteIds: trackedSatellites }),
    }).catch(() => {});
  },

  loadTrackedFromServer: async () => {
    try {
      const res = await fetch("/api/user/tracked-satellites");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.trackedSatelliteIds)) {
        set({ trackedSatellites: data.trackedSatelliteIds });
      }
    } catch {}
  },

  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),
  userProfile: null,
  setUserProfile: (profile) => set({ userProfile: profile }),

  userPreferences: defaultPreferences,
  setUserPreferences: (partial) =>
    set((s) => ({
      userPreferences: { ...s.userPreferences, ...partial },
    })),

  showAuthModal: false,
  setShowAuthModal: (show) => set({ showAuthModal: show }),

  simulationSpeed: 1,
  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),
  isPaused: false,
  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),

  activePanels: ["status", "telemetry"],
  togglePanel: (id) =>
    set((s) => ({
      activePanels: s.activePanels.includes(id)
        ? s.activePanels.filter((p) => p !== id)
        : [...s.activePanels, id],
    })),

  selectedRegion: "Global",
  setSelectedRegion: (region) => set({ selectedRegion: region }),

  comparisonRegions: [],
  isComparisonMode: false,
  setComparisonRegions: (regions) =>
    set({ comparisonRegions: regions.slice(0, 4) }),
  toggleComparisonRegion: (region) =>
    set((s) => {
      if (s.comparisonRegions.includes(region)) {
        return {
          comparisonRegions: s.comparisonRegions.filter((r) => r !== region),
        };
      }
      if (s.comparisonRegions.length >= 4) return s;
      return { comparisonRegions: [...s.comparisonRegions, region] };
    }),
  setComparisonMode: (enabled) =>
    set({ isComparisonMode: enabled, comparisonRegions: enabled ? [] : [] }),

  timeOffset: 0,
  setTimeOffset: (offset) =>
    set({ timeOffset: Math.max(-43200000, Math.min(0, offset)) }),

  resetUserState: () =>
    set({
      trackedSatellites: [],
      selectedSatellite: null,
      userProfile: null,
      _densitySeed: Date.now(),
    }),
}));

"use client";

import { useEffect, useRef, useMemo } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import TopBar from "@/components/layout/TopBar";
import Footer from "@/components/layout/Footer";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";
import { useContentVotesStore } from "@/store/contentVotesStore";
import { usePostsStore } from "@/store/postsStore";
import { useNotificationStore } from "@/store/notificationStore";
import { usePointsStore } from "@/store/pointsStore";
import { computeMedals, SDG_VOTE_KEYS } from "@/lib/stats/medalComputation";
import {
  generateMockSatellites,
  generateMockDebris,
} from "@/lib/satellite/mockData";
import { useSatellitePropagate } from "@/lib/satellite/usePropagate";
import type { UserPreferences } from "@/store/appStore";
import dynamic from "next/dynamic";

const AuthModal = dynamic(() => import("@/components/auth/AuthModal"), {
  ssr: false,
});

const PREFS_STORAGE_KEY = "sat-monitor-prefs";

export default function ClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    setUserLocation,
    showAuthModal,
    setShowAuthModal,
    setUserProfile,
    setUserPreferences,
    userPreferences,
    satellites,
    setSatellites,
    resetUserState,
    loadTrackedFromServer,
    trackedSatellites,
  } = useAppStore();
  const { user, isAuthenticated, checkAuth, logout } = useAuthStore();
  const { fetchVotes, reset: resetContentVotes } = useContentVotesStore();
  const { fetchPosts, resetUserState: resetPostsUserState } = usePostsStore();
  const { fetchNotifications } = useNotificationStore();
  const { fetchPoints } = usePointsStore();
  const prevAuth = useRef(isAuthenticated);
  const pathname = usePathname();
  // Keeps the shared footer mounted for every route so global navigation and credits stay consistently available.

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load content votes on mount and when auth state changes
  useEffect(() => {
    fetchVotes();
  }, [fetchVotes, isAuthenticated]);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<UserPreferences>;
        setUserPreferences(parsed);
      }
    } catch {
      // ignore parse errors
    }
  }, [setUserPreferences]);

  // Save preferences to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(userPreferences));
    } catch {
      // ignore storage errors
    }
  }, [userPreferences]);

  // Apply accent color data attribute to <html> element
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-accent",
      userPreferences.accentColor || "cyan"
    );
  }, [userPreferences.accentColor]);

  // Apply UI scale CSS variable to <html> element
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--ui-scale",
      String(userPreferences.uiScale ?? 1)
    );
  }, [userPreferences.uiScale]);

  // Hydrate userProfile when auth state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      setUserProfile({
        id: user.id,
        name: user.name,
        displayName: "",
        email: user.email,
        joinedAt: user.createdAt,
        location: { lat: 0, lng: 0 },
        collected: [],
        medals: [],
        readCount: 0,
        observed: 0,
        points: 0,
        rank: "Newcomer",
      });
    } else {
      setUserProfile(null);
    }
  }, [isAuthenticated, user, setUserProfile]);

  // Request user geolocation on mount
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          // Default to London if denied
          setUserLocation({ lat: 51.5074, lng: -0.1278 });
        }
      );
    }
  }, [setUserLocation]);

  // Initialize satellite data: fetch live TLEs, fallback to mock
  useEffect(() => {
    if (satellites.length > 0) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/satellites/tle");
        if (!res.ok) throw new Error("TLE fetch failed");
        const data = await res.json();
        if (
          !cancelled &&
          Array.isArray(data.satellites) &&
          data.satellites.length > 0
        ) {
          const debris = generateMockDebris(50);
          setSatellites([...data.satellites, ...debris]);
          return;
        }
      } catch {
        // fallback below
      }
      if (!cancelled) {
        const sats = generateMockSatellites();
        const debris = generateMockDebris(50);
        setSatellites([...sats, ...debris]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [satellites.length, setSatellites]);

  // Re-propagate satellite positions every 10 seconds
  useSatellitePropagate(10000);

  // Poll notifications every 60s when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  // Medal-check: detect newly earned medals and create notifications
  const { userVotes } = useContentVotesStore();

  const voteKeys = useMemo(() => Object.keys(userVotes), [userVotes]);
  const sdgVoteCount = useMemo(
    () => SDG_VOTE_KEYS.filter((k) => voteKeys.includes(k)).length,
    [voteKeys]
  );
  const trackedNames = useMemo(
    () =>
      trackedSatellites
        .map((id) => satellites.find((s) => s.id === id)?.name ?? "")
        .filter(Boolean),
    [trackedSatellites, satellites]
  );

  const prevEarnedRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      prevEarnedRef.current = null;
      return;
    }

    const medals = computeMedals(
      trackedSatellites.length,
      trackedNames,
      voteKeys,
      sdgVoteCount
    );

    const currentEarned = medals.filter((m) => m.earned);
    const earnedSet = new Set(currentEarned.map((m) => m.id));

    // First run: snapshot current state without firing notifications
    if (prevEarnedRef.current === null) {
      prevEarnedRef.current = earnedSet;
      return;
    }

    const newMedals = currentEarned.filter(
      (m) => !prevEarnedRef.current!.has(m.id)
    );

    prevEarnedRef.current = earnedSet;

    if (newMedals.length > 0) {
      fetch("/api/notifications/check-medals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          earnedMedals: newMedals.map((m) => ({
            id: m.id,
            name: m.name,
            icon: m.icon,
          })),
        }),
      })
        .then(() => fetchNotifications())
        .catch(() => {});
    }
  }, [
    isAuthenticated,
    trackedSatellites.length,
    trackedNames,
    voteKeys,
    sdgVoteCount,
    fetchNotifications,
  ]);

  // Logout cleanup / login re-fetch
  useEffect(() => {
    if (prevAuth.current && !isAuthenticated) {
      // User logged out — clear user-specific state
      resetUserState();
      resetContentVotes();
      resetPostsUserState();
    }
    if (!prevAuth.current && isAuthenticated) {
      // User logged in — re-fetch user-specific data
      fetchVotes();
      fetchPosts();
      fetchPoints();
      loadTrackedFromServer();
    }
    prevAuth.current = isAuthenticated;
  }, [
    isAuthenticated,
    resetUserState,
    resetContentVotes,
    resetPostsUserState,
    fetchVotes,
    fetchPosts,
    fetchPoints,
    loadTrackedFromServer,
  ]);

  const topOffset = isAuthenticated ? "4rem" : "5.75rem";

  /* Keep scrollable pages bottom-anchored when footer expands/collapses.
     When <main> shrinks (footer opens), increase scrollTop so the bottom
     stays fixed and content pushes upward. Vice versa when it grows. */
  const mainRef = useRef<HTMLElement>(null);
  const prevMainHeight = useRef(0);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    if (pathname === "/game") return;
    prevMainHeight.current = main.clientHeight;

    const observer = new ResizeObserver(() => {
      const h = main.clientHeight;
      const delta = prevMainHeight.current - h;
      if (delta !== 0 && main.scrollHeight > main.clientHeight + 1) {
        main.scrollTop = Math.max(0, main.scrollTop + delta);
      }
      prevMainHeight.current = h;
    });

    observer.observe(main);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden relative flex flex-col">
      <TopBar
        onSignInClick={() => setShowAuthModal(true)}
        authUser={
          isAuthenticated && user
            ? { name: user.name, email: user.email, role: user.role }
            : null
        }
        onLogout={logout}
      />

      {/* Sign in banner */}
      {!isAuthenticated && (
        <motion.div
          className="fixed top-16 left-0 right-0 z-40 text-center py-1.5"
          style={{
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--holo-purple) 12%, transparent), var(--accent-dim))",
            borderBottom: "1px solid var(--border-subtle)",
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <span
            className="text-[14px] tracking-wider"
            style={{ color: "var(--text-dim)" }}
          >
            Sign in to save your tracking progress and earn achievements
          </span>
          <button
            onClick={() => setShowAuthModal(true)}
            className="ml-3 text-[14px] font-bold tracking-wider underline"
            style={{ color: "var(--accent)" }}
          >
            SIGN IN
          </button>
        </motion.div>
      )}

      {/* Content area — flex-1 fills space above footer; shrinks when footer expands */}
      <main
        ref={mainRef}
        className="flex-1 min-h-0 overflow-y-auto z-0"
        style={{ marginTop: topOffset }}
      >
        {children}
      </main>

      {/* Footer — flex-shrink-0 pushes main upward when expanded */}
      <Footer />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}

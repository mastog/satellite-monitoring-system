"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import GlassPanel from "@/components/ui/GlassPanel";
import { useAuthStore } from "@/store/authStore";
import { useAppStore } from "@/store/appStore";
import { useContentVotesStore } from "@/store/contentVotesStore";
import { usePointsStore } from "@/store/pointsStore";
import { computeMedals, SDG_VOTE_KEYS } from "@/lib/stats/medalComputation";
import { POINTS_ACHIEVEMENT } from "@/lib/points/economy";
import MedalIcon, { MEDAL_COLORS } from "@/components/ui/MedalIcon";
import SvgIcon from "@/components/ui/SvgIcon";
// Loads the character viewer only on the client because the viewer depends on
// browser-only rendering APIs.

const MMDViewer = dynamic(() => import("@/components/3d/MMDViewer"), {
  ssr: false,
});

export default function ProfileView() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { isAuthenticated, user } = useAuthStore();
  const {
    userPreferences,
    setUserPreferences,
    setShowAuthModal,
    trackedSatellites,
    satellites,
  } = useAppStore();

  const { userVotes, fetched: votesFetched } = useContentVotesStore();
  const { points, totalEarned, level, fetchPoints, fetchDances } =
    usePointsStore();

  // Loads the player's points and unlocked dances after authentication so the
  // profile starts with current progression data.
  useEffect(() => {
    if (isAuthenticated) {
      fetchPoints();
      fetchDances();
    }
  }, [isAuthenticated, fetchPoints, fetchDances]);

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

  const medals = useMemo(
    () =>
      computeMedals(
        trackedSatellites.length,
        trackedNames,
        voteKeys,
        sdgVoteCount
      ),
    [trackedSatellites.length, trackedNames, voteKeys, sdgVoteCount]
  );

  const earnedCount = medals.filter((m) => m.earned).length;

  // Tracks the medal IDs currently equipped on the profile card.
  const [equippedMedals, setEquippedMedals] = useState<string[]>([]);
  const MAX_EQUIPPED = 3;

  // Loads the equipped-medal selection stored on the server for the current user.
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/user/equipped-medals")
      .then((r) => r.json())
      .then((data) => {
        if (data.equippedMedals) setEquippedMedals(data.equippedMedals);
      })
      .catch((e) => console.error("fetch equipped medals error:", e));
  }, [isAuthenticated]);

  const toggleEquipMedal = useCallback(
    async (medalId: string) => {
      const isEquipped = equippedMedals.includes(medalId);
      const newList = isEquipped
        ? equippedMedals.filter((id) => id !== medalId)
        : [...equippedMedals, medalId];

      if (newList.length > MAX_EQUIPPED) return;

      // Updates the local equipped set immediately so the profile reacts
      // before the server request completes.
      setEquippedMedals(newList);

      try {
        const res = await fetch("/api/user/equipped-medals", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ medalIds: newList }),
        });
        const data = await res.json();
        if (data.error) {
          // Restores the previous local selection if the server rejects the update.
          setEquippedMedals(equippedMedals);
          console.error("equip medal error:", data.error);
        }
      } catch (e) {
        setEquippedMedals(equippedMedals);
        console.error("equip medal error:", e);
      }
    },
    [equippedMedals]
  );

  // Synchronizes newly earned medals with the server after the satellite and
  // vote data needed for medal computation has finished loading.
  const dataReady = isAuthenticated && satellites.length > 0 && votesFetched;
  const syncingRef = useRef(false);
  useEffect(() => {
    if (!dataReady || syncingRef.current) return;
    syncingRef.current = true;

    const earnedIds = medals.filter((m) => m.earned).map((m) => m.id);

    fetch("/api/points/sync-medals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ earnedMedalIds: earnedIds }),
    })
      .then((r) => r.json())
      .then((data) => {
        // Refreshes points only when the server reports an actual medal change.
        if (data.awarded > 0 || data.revoked > 0) {
          fetchPoints();
        }
      })
      .catch((e) => console.error("sync-medals error:", e))
      .finally(() => {
        syncingRef.current = false;
      });
  }, [dataReady, medals, fetchPoints]);

  // Removes equipped medals that the user no longer qualifies for and persists
  // the trimmed selection back to the server.
  useEffect(() => {
    if (!dataReady || equippedMedals.length === 0) return;
    const earnedIds = new Set(medals.filter((m) => m.earned).map((m) => m.id));
    const valid = equippedMedals.filter((id) => earnedIds.has(id));
    if (valid.length < equippedMedals.length) {
      setEquippedMedals(valid);
      fetch("/api/user/equipped-medals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medalIds: valid }),
      }).catch((e) => console.error("auto-unequip error:", e));
    }
  }, [dataReady, medals, equippedMedals]);

  // Picks the accent color used to present the player's current level tier.
  const levelColor =
    level.level >= 5
      ? "var(--neon-orange)"
      : level.level >= 3
        ? "var(--holo-purple)"
        : "var(--neon-cyan)";

  return (
    <div className="min-h-full p-6 space-y-6 pb-8">
      {/* Renders the profile header with the player's identity and top-level progression summary. */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2
          className="text-lg font-bold tracking-[0.15em] text-glow-cyan"
          style={{ fontFamily: "var(--font-orbitron)" }}
        >
          MY PROFILE
        </h2>
        <p
          className="text-[15px] mt-1 tracking-wide"
          style={{ color: "var(--text-dim)" }}
        >
          Manage your identity, preferences, and track your achievements
        </p>
      </motion.div>

      {!isAuthenticated ? (
        /* Prompts unauthenticated visitors to sign in before accessing personalized profile data. */
        <GlassPanel>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4" style={{ color: "var(--accent)" }}>
              <SvgIcon name="crosshair" size={48} />
            </div>
            <h3
              className="text-base font-bold tracking-wider mb-2"
              style={{
                fontFamily: "var(--font-orbitron)",
                color: "var(--text-primary)",
              }}
            >
              Join the Observer Network
            </h3>
            <p
              className="text-[15px] max-w-sm mb-6 leading-relaxed"
              style={{ color: "var(--text-dim)" }}
            >
              Sign in to track satellites, earn achievement medals, save your
              observation history, and connect with fellow space enthusiasts.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="cyber-btn px-6 py-2.5 text-[15px] font-bold tracking-[0.12em]"
            >
              Sign In to Get Started
            </button>
          </div>
        </GlassPanel>
      ) : (
        <>
          {/* Shows the signed-in user's identity details and top-level progression summary. */}
          <GlassPanel>
            <div className="flex items-center gap-5">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold"
                style={{
                  background:
                    "linear-gradient(135deg, var(--neon-cyan-dim), var(--holo-purple-dim))",
                  border: "1px solid rgba(0,229,255,0.2)",
                  fontFamily: "var(--font-orbitron)",
                  color: "var(--neon-cyan)",
                }}
              >
                {(userPreferences.displayName ||
                  user?.name ||
                  "?")[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="text-base font-bold tracking-wider"
                    style={{
                      fontFamily: "var(--font-orbitron)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {userPreferences.displayName || user?.name || "Observer"}
                  </span>
                  <span
                    className="text-[12px] px-2 py-0.5 rounded-full font-bold tracking-wider"
                    style={{
                      background: `${levelColor}15`,
                      color: levelColor,
                      border: `1px solid ${levelColor}40`,
                    }}
                  >
                    LV{level.level} {level.name}
                  </span>
                </div>
                <div
                  className="text-[14px] mt-0.5"
                  style={{ color: "var(--text-dim)" }}
                >
                  {user?.email}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  {user?.createdAt && (
                    <span
                      className="text-[13px] tracking-wider"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Joined{" "}
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 text-center">
                {[
                  {
                    label: "Points",
                    value: points,
                    color: "var(--neon-orange)",
                  },
                  {
                    label: "Tracked",
                    value: trackedSatellites.length,
                    color: "var(--neon-cyan)",
                  },
                  {
                    label: "Voted",
                    value: voteKeys.length,
                    color: "var(--neon-cyan)",
                  },
                  {
                    label: "Medals",
                    value: earnedCount,
                    color: "var(--neon-cyan)",
                  },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div
                      className="text-lg font-bold"
                      style={{
                        fontFamily: "var(--font-orbitron)",
                        color: stat.color,
                      }}
                    >
                      {stat.value}
                    </div>
                    <div
                      className="text-[14px] tracking-wider uppercase"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visualizes progress toward the next player level using current point totals. */}
            {level.nextThreshold && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-[12px] tracking-wider"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Progress to LV{level.level + 1}
                  </span>
                  <span
                    className="text-[12px] font-bold"
                    style={{
                      color: levelColor,
                      fontFamily: "var(--font-fira-code)",
                    }}
                  >
                    {totalEarned} / {level.nextThreshold} pts
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: levelColor }}
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min((totalEarned / level.nextThreshold) * 100, 100)}%`,
                    }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}
          </GlassPanel>

          {/* Provides collapsible profile settings for editable preferences and display options. */}
          <div>
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="flex items-center gap-2 text-[14px] font-bold tracking-[0.12em] uppercase mb-2 transition-colors"
              style={{ color: "var(--text-dim)" }}
            >
              <motion.span
                animate={{ rotate: settingsOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                style={{ display: "inline-block" }}
              >
                {"\u25B6"}
              </motion.span>
              Settings
            </button>
            <AnimatePresence>
              {settingsOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassPanel>
                    <div className="space-y-4">
                      {/* Lets the user edit the display name shown across profile-driven surfaces. */}
                      <div>
                        <label
                          className="text-[14px] font-bold tracking-[0.1em] uppercase block mb-1.5"
                          style={{ color: "var(--text-dim)" }}
                        >
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={userPreferences.displayName}
                          onChange={(e) =>
                            setUserPreferences({ displayName: e.target.value })
                          }
                          placeholder={user?.name || "Enter display name"}
                          className="w-full px-3 py-2 rounded-lg text-[15px] outline-none transition-colors"
                          style={{
                            background: "rgba(0,0,0,0.4)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-primary)",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        />
                      </div>

                      {/* Lets the user choose the distance unit used by satellite and orbit readouts. */}
                      <div>
                        <label
                          className="text-[14px] font-bold tracking-[0.1em] uppercase block mb-1.5"
                          style={{ color: "var(--text-dim)" }}
                        >
                          Distance Units
                        </label>
                        <div className="flex gap-2">
                          {(["km", "mi"] as const).map((unit) => (
                            <button
                              key={unit}
                              onClick={() =>
                                setUserPreferences({ preferredUnits: unit })
                              }
                              className="flex-1 py-2 rounded-lg text-[14px] font-bold tracking-[0.1em] uppercase transition-all"
                              style={{
                                background:
                                  userPreferences.preferredUnits === unit
                                    ? "var(--neon-cyan-dim)"
                                    : "rgba(0,0,0,0.3)",
                                color:
                                  userPreferences.preferredUnits === unit
                                    ? "var(--neon-cyan)"
                                    : "var(--text-dim)",
                                border:
                                  userPreferences.preferredUnits === unit
                                    ? "1px solid rgba(0,229,255,0.3)"
                                    : "1px solid var(--border-subtle)",
                              }}
                            >
                              {unit === "km" ? "Kilometers" : "Miles"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </GlassPanel>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Splits the lower profile area between achievement medals and the character viewer. */}
          <div className="grid grid-cols-2 gap-4 items-stretch">
            {/* Lists earned and locked medals together with their current equip state. */}
            <GlassPanel title="ACHIEVEMENT MEDALS">
              {/* Shows how many of the available medal equip slots are currently occupied. */}
              <div className="flex items-center justify-between mb-3">
                <div
                  className="text-[12px] font-bold tracking-[0.12em] uppercase"
                  style={{ color: "var(--text-dim)" }}
                >
                  Equipped Showcase
                </div>
                <div
                  className="text-[12px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background:
                      equippedMedals.length >= MAX_EQUIPPED
                        ? "rgba(255,107,44,0.1)"
                        : "rgba(0,229,255,0.08)",
                    color:
                      equippedMedals.length >= MAX_EQUIPPED
                        ? "var(--neon-orange)"
                        : "var(--neon-cyan)",
                    border:
                      equippedMedals.length >= MAX_EQUIPPED
                        ? "1px solid rgba(255,107,44,0.2)"
                        : "1px solid rgba(0,229,255,0.15)",
                    fontFamily: "var(--font-fira-code)",
                  }}
                >
                  {equippedMedals.length}/{MAX_EQUIPPED} SLOTS
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {medals.map((medal, i) => {
                  const isEquipped = equippedMedals.includes(medal.id);
                  const canEquip =
                    medal.earned &&
                    !isEquipped &&
                    equippedMedals.length < MAX_EQUIPPED;

                  return (
                    <motion.div
                      key={medal.id}
                      className="rounded-lg text-center relative"
                      style={{
                        background: isEquipped
                          ? "rgba(180,74,255,0.06)"
                          : medal.earned
                            ? "rgba(0,229,255,0.03)"
                            : "rgba(0,0,0,0.25)",
                        border: isEquipped
                          ? "1px solid rgba(180,74,255,0.3)"
                          : medal.earned
                            ? "1px solid rgba(0,229,255,0.12)"
                            : "1px solid var(--border-subtle)",
                        opacity: medal.earned ? 1 : 0.55,
                        boxShadow: isEquipped
                          ? "0 0 16px rgba(180,74,255,0.12), inset 0 1px 0 rgba(180,74,255,0.1)"
                          : medal.earned
                            ? "inset 0 1px 0 rgba(0,229,255,0.06)"
                            : "none",
                      }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: medal.earned ? 1 : 0.55, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.03 }}
                    >
                      {/* Adds a stronger top accent so equipped medals stand out from the rest of the grid. */}
                      {isEquipped && (
                        <div
                          style={{
                            height: 2,
                            borderRadius: "8px 8px 0 0",
                            background:
                              "linear-gradient(90deg, transparent, var(--holo-purple), transparent)",
                          }}
                        />
                      )}

                      <div
                        style={{
                          padding: isEquipped ? "10px 10px 12px" : "12px 10px",
                        }}
                      >
                        {/* Shows inline earned and equipped status badges for the current medal. */}
                        <div
                          className="flex items-center justify-between"
                          style={{ minHeight: 16, marginBottom: 6 }}
                        >
                          {isEquipped ? (
                            <span
                              className="text-[9px] font-bold tracking-[0.12em] uppercase px-1.5 py-px rounded-full"
                              style={{
                                background: "rgba(180,74,255,0.15)",
                                color: "var(--holo-purple)",
                                fontFamily: "var(--font-fira-code)",
                              }}
                            >
                              EQUIPPED
                            </span>
                          ) : medal.earned ? (
                            <span
                              className="text-[9px] font-bold tracking-[0.12em] uppercase px-1.5 py-px rounded-full"
                              style={{
                                background: "rgba(57,255,127,0.08)",
                                color: "var(--neon-green)",
                                fontFamily: "var(--font-fira-code)",
                              }}
                            >
                              EARNED
                            </span>
                          ) : (
                            <span />
                          )}
                          {medal.earned && (
                            <span
                              className="text-[10px] font-bold"
                              style={{
                                color: "var(--neon-orange)",
                                fontFamily: "var(--font-fira-code)",
                              }}
                            >
                              +{POINTS_ACHIEVEMENT}
                            </span>
                          )}
                        </div>

                        {/* Displays the medal icon with its locked or unlocked visual treatment. */}
                        <div
                          className="mb-1.5 flex items-center justify-center"
                          style={{
                            color: isEquipped
                              ? "var(--holo-purple)"
                              : medal.earned
                                ? MEDAL_COLORS[medal.id] || "var(--neon-cyan)"
                                : "var(--text-dim)",
                          }}
                        >
                          <MedalIcon medalId={medal.id} size={22} />
                        </div>

                        {/* Shows the medal name beneath the icon. */}
                        <div
                          className="text-[12px] font-bold tracking-wider leading-tight"
                          style={{
                            color: isEquipped
                              ? "var(--holo-purple)"
                              : medal.earned
                                ? "var(--neon-cyan)"
                                : "var(--text-dim)",
                            fontFamily: "var(--font-orbitron)",
                          }}
                        >
                          {medal.name}
                        </div>

                        {/* Explains the unlock condition or purpose of the medal. */}
                        <div
                          className="text-[11px] mt-1 leading-snug"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {medal.description}
                        </div>

                        {/* Visualizes partial progress for medals that have not yet been earned. */}
                        {!medal.earned && (
                          <div className="mt-2.5">
                            <div
                              className="h-1 rounded-full"
                              style={{ background: "rgba(255,255,255,0.06)" }}
                            >
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${medal.progress}%`,
                                  background:
                                    "linear-gradient(90deg, var(--holo-purple), rgba(180,74,255,0.6))",
                                  boxShadow:
                                    medal.progress > 0
                                      ? "0 0 6px rgba(180,74,255,0.3)"
                                      : "none",
                                }}
                              />
                            </div>
                            <div
                              className="text-[11px] mt-1 font-bold"
                              style={{
                                color: "var(--holo-purple)",
                                fontFamily: "var(--font-fira-code)",
                              }}
                            >
                              {medal.progress}%
                            </div>
                          </div>
                        )}

                        {/* Lets the user equip or remove an earned medal from the active profile set. */}
                        {medal.earned && (
                          <motion.button
                            onClick={() => toggleEquipMedal(medal.id)}
                            disabled={!canEquip && !isEquipped}
                            className="mt-2.5 w-full py-1 rounded text-[10px] font-bold tracking-[0.1em] uppercase transition-all"
                            style={{
                              background: isEquipped
                                ? "rgba(180,74,255,0.12)"
                                : canEquip
                                  ? "rgba(0,229,255,0.06)"
                                  : "rgba(0,0,0,0.2)",
                              color: isEquipped
                                ? "var(--holo-purple)"
                                : canEquip
                                  ? "var(--neon-cyan)"
                                  : "var(--text-dim)",
                              border: isEquipped
                                ? "1px solid rgba(180,74,255,0.25)"
                                : canEquip
                                  ? "1px solid rgba(0,229,255,0.15)"
                                  : "1px solid var(--border-subtle)",
                              cursor:
                                canEquip || isEquipped ? "pointer" : "default",
                              fontFamily: "var(--font-fira-code)",
                            }}
                            whileHover={
                              canEquip || isEquipped ? { scale: 1.05 } : {}
                            }
                            whileTap={
                              canEquip || isEquipped ? { scale: 0.95 } : {}
                            }
                          >
                            {isEquipped
                              ? "UNEQUIP"
                              : canEquip
                                ? "EQUIP"
                                : "FULL"}
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </GlassPanel>

            {/* Hosts the MMD character viewer alongside the medal collection without leaving the profile page. */}
            <div className="flex flex-col" style={{ minHeight: 0 }}>
              <GlassPanel
                title="CHARACTER VIEWER"
                accentColor="var(--neon-orange)"
                className="flex-1 flex flex-col [&>div:last-child]:flex-1"
              >
                <MMDViewer />
              </GlassPanel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

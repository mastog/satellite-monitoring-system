"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import MedalIcon, { MEDAL_COLORS } from "@/components/ui/MedalIcon";

interface MedalInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface UserProfile {
  id: string;
  name: string;
  level: { level: number; name: string };
  points: number;
  totalEarned: number;
  joinedAt: string;
  equippedMedals: MedalInfo[];
  medalCount: number;
  postCount: number;
}

interface UserHoverCardProps {
  userId: string;
  authorName: string;
  children: React.ReactNode;
}

// Caches fetched profile payloads per user so repeated hover interactions can reuse recent data.
const profileCache = new Map<
  string,
  { data: UserProfile; fetchedAt: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // Treats cached profiles as fresh for five minutes before refetching.

/** Seeds the local hover-card cache with profiles that were already loaded elsewhere in the UI. */
export function prefillProfileCache(profiles: UserProfile[]) {
  const now = Date.now();
  for (const p of profiles) {
    profileCache.set(p.id, { data: p, fetchedAt: now });
  }
}

function timeAgoShort(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

export default function UserHoverCard({
  userId,
  authorName,
  children,
}: UserHoverCardProps) {
  const [show, setShow] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const fetchProfile = useCallback(async () => {
    // Reuses a fresh cached profile first so the hover card can open without waiting on the network.
    const cached = profileCache.get(userId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      setProfile(cached.data);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/user/${userId}/profile`);
      if (res.ok) {
        const data: UserProfile = await res.json();
        profileCache.set(userId, { data, fetchedAt: Date.now() });
        setProfile(data);
      }
    } catch (e) {
      console.error("UserHoverCard fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Measures the rendered card and clamps its position so the floating panel stays inside the viewport.
  useEffect(() => {
    if (!show || !triggerRef.current) return;

    const cardWidth = 280;
    const gap = 8;
    const margin = 12;

    // Places the card off-screen for one frame so its actual height can be measured safely.
    setStyle({
      position: "fixed",
      top: "-9999px",
      left: "-9999px",
      width: `${cardWidth}px`,
      zIndex: 150,
      visibility: "hidden" as const,
    });

    // Repositions the card once its dimensions are known and the trigger geometry is available.
    const raf = requestAnimationFrame(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const cardHeight = cardRef.current?.offsetHeight ?? 200;

      // Starts by placing the panel below the hovered trigger.
      let top = rect.bottom + gap;
      let left = rect.left;

      // Adjusts the horizontal position to keep the card inside the left and right viewport margins.
      if (left + cardWidth > vw - margin) {
        left = vw - margin - cardWidth;
      }
      if (left < margin) left = margin;

      // Moves the card above the trigger when there is not enough room underneath.
      if (top + cardHeight > vh - margin) {
        top = rect.top - gap - cardHeight;
        // Prevents the fallback top placement from running past the top viewport margin.
        if (top < margin) top = margin;
      }

      setStyle({
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        width: `${cardWidth}px`,
        zIndex: 150,
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [show, profile]);

  const handleMouseEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    timerRef.current = setTimeout(() => {
      setShow(true);
      fetchProfile();
    }, 400);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    leaveTimerRef.current = setTimeout(() => {
      setShow(false);
    }, 200);
  };

  const handleCardEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  const handleCardLeave = () => {
    leaveTimerRef.current = setTimeout(() => {
      setShow(false);
    }, 200);
  };

  const levelColor = profile
    ? profile.level.level >= 5
      ? "var(--neon-orange)"
      : profile.level.level >= 3
        ? "var(--holo-purple)"
        : "var(--neon-cyan)"
    : "var(--neon-cyan)";

  const card = (
    <AnimatePresence>
      {show && (
        <motion.div
          ref={cardRef}
          style={style}
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onMouseEnter={handleCardEnter}
          onMouseLeave={handleCardLeave}
          className="rounded-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="p-3.5"
            style={{
              background: "rgba(12,16,24,0.96)",
              border: "1px solid rgba(0,229,255,0.15)",
              borderRadius: "8px",
              backdropFilter: "blur(12px)",
              boxShadow:
                "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(0,229,255,0.05)",
            }}
          >
            {loading && !profile ? (
              <div className="flex items-center gap-2 py-2">
                <div
                  className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{
                    borderColor: "var(--neon-cyan)",
                    borderTopColor: "transparent",
                  }}
                />
                <span
                  className="text-[13px]"
                  style={{ color: "var(--text-dim)" }}
                >
                  Loading...
                </span>
              </div>
            ) : profile ? (
              <div className="space-y-2.5">
                {/* Shows the primary identity block with the user's name and current level badge. */}
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--neon-cyan-dim), var(--holo-purple-dim))",
                      border: "1px solid rgba(0,229,255,0.2)",
                      fontFamily: "var(--font-orbitron)",
                      color: "var(--neon-cyan)",
                    }}
                  >
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div
                      className="text-[14px] font-bold tracking-wider truncate"
                      style={{
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-orbitron)",
                      }}
                    >
                      {profile.name}
                    </div>
                    <div>
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded-full font-bold tracking-wider inline-block"
                        style={{
                          background: `${levelColor}15`,
                          color: levelColor,
                          border: `1px solid ${levelColor}40`,
                        }}
                      >
                        LV{profile.level.level} {profile.level.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summarizes points, post count, medal count, and join age in a compact telemetry row. */}
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div
                      className="text-[13px] font-bold"
                      style={{
                        color: "var(--neon-orange)",
                        fontFamily: "var(--font-fira-code)",
                      }}
                    >
                      {profile.points}
                    </div>
                    <div
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: "var(--text-dim)" }}
                    >
                      pts
                    </div>
                  </div>
                  <div
                    className="w-px h-6"
                    style={{ background: "var(--border-subtle)" }}
                  />
                  <div className="text-center">
                    <div
                      className="text-[13px] font-bold"
                      style={{
                        color: "var(--neon-cyan)",
                        fontFamily: "var(--font-fira-code)",
                      }}
                    >
                      {profile.postCount}
                    </div>
                    <div
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: "var(--text-dim)" }}
                    >
                      posts
                    </div>
                  </div>
                  <div
                    className="w-px h-6"
                    style={{ background: "var(--border-subtle)" }}
                  />
                  <div className="text-center">
                    <div
                      className="text-[13px] font-bold"
                      style={{
                        color: "var(--neon-cyan)",
                        fontFamily: "var(--font-fira-code)",
                      }}
                    >
                      {profile.medalCount}
                    </div>
                    <div
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: "var(--text-dim)" }}
                    >
                      medals
                    </div>
                  </div>
                  <div
                    className="w-px h-6"
                    style={{ background: "var(--border-subtle)" }}
                  />
                  <div className="text-center">
                    <div
                      className="text-[11px] font-bold"
                      style={{
                        color: "var(--text-dim)",
                        fontFamily: "var(--font-fira-code)",
                      }}
                    >
                      {timeAgoShort(profile.joinedAt)}
                    </div>
                    <div
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: "var(--text-dim)" }}
                    >
                      joined
                    </div>
                  </div>
                </div>

                {/* Displays only the medals the user has equipped so the hover card stays concise. */}
                {profile.equippedMedals.length > 0 && (
                  <div
                    className="flex items-center gap-1 pt-2 mt-0.5"
                    style={{ borderTop: "1px solid var(--border-subtle)" }}
                  >
                    {profile.equippedMedals.map((medal) => {
                      const mc = MEDAL_COLORS[medal.id] || "var(--holo-purple)";
                      return (
                        <div
                          key={medal.id}
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 cursor-default"
                          style={{
                            background: "rgba(180,74,255,0.08)",
                            border: "1px solid rgba(180,74,255,0.22)",
                            color: mc,
                          }}
                          title={`${medal.name}: ${medal.description}`}
                        >
                          <MedalIcon medalId={medal.id} size={18} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[13px]" style={{ color: "var(--text-dim)" }}>
                {authorName}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div
      ref={triggerRef}
      className="inline-flex items-center gap-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {mounted && createPortal(card, document.body)}
    </div>
  );
}

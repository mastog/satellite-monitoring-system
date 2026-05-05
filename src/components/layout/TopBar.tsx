"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import NotificationBell from "./NotificationBell";
import VoiceAssistant from "./VoiceAssistant";
import AppearancePanel from "./AppearancePanel";
import { useAppStore } from "@/store/appStore";

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "CMD",
    path: "/",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "tracking",
    label: "TRK",
    path: "/tracking",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2a10 10 0 0 1 10 10" />
        <path d="M12 2a10 10 0 0 0-10 10" />
        <path d="M12 22a10 10 0 0 1-10-10" />
        <path d="M12 22a10 10 0 0 0 10-10" />
      </svg>
    ),
  },
  {
    id: "sdg",
    label: "SDG",
    path: "/sdg",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    id: "climate",
    label: "CLM",
    path: "/climate",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
        <circle
          cx="11.5"
          cy="18"
          r="1.5"
          fill="currentColor"
          stroke="none"
          opacity="0.5"
        />
        <line
          x1="11.5"
          y1="18"
          x2="11.5"
          y2="8"
          strokeWidth="2"
          opacity="0.35"
        />
      </svg>
    ),
  },
  {
    id: "community",
    label: "COM",
    path: "/community",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "science",
    label: "SCI",
    path: "/science",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M9 3h6v7l4 9H5l4-9V3z" />
        <path d="M9 3h6" />
        <circle cx="12" cy="16" r="1" />
      </svg>
    ),
  },
  {
    id: "game",
    label: "DSK",
    path: "/game",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" />
      </svg>
    ),
  },
];

interface TopBarProps {
  onSignInClick?: () => void;
  authUser?: { name: string; email: string; role?: string } | null;
  onLogout?: () => void;
  onFooterToggle?: () => void;
}

/* Maps each numeric glyph to the segments used by the seven-segment UTC display. */
const SEGMENT_MAP: Record<string, string[]> = {
  "0": ["a", "b", "c", "d", "e", "f"],
  "1": ["b", "c"],
  "2": ["a", "b", "g", "e", "d"],
  "3": ["a", "b", "c", "d", "g"],
  "4": ["f", "g", "b", "c"],
  "5": ["a", "f", "g", "c", "d"],
  "6": ["a", "f", "g", "e", "c", "d"],
  "7": ["a", "b", "c"],
  "8": ["a", "b", "c", "d", "e", "f", "g"],
  "9": ["a", "b", "c", "d", "f", "g"],
};

/* Renders one digit inside the segmented UTC readout. */
function SevenSegmentDigit({ value }: { value: string }) {
  const activeSegments = SEGMENT_MAP[value] ?? [];

  return (
    <span className="seven-seg-digit" aria-hidden="true">
      {["a", "b", "c", "d", "e", "f", "g"].map((segment) => (
        <span
          key={segment}
          className={`seven-seg-digit__segment seven-seg-digit__segment--${segment}`}
          data-on={activeSegments.includes(segment) ? "true" : "false"}
        />
      ))}
    </span>
  );
}

export default function TopBar({
  onSignInClick,
  authUser,
  onLogout,
  onFooterToggle,
}: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isProfilePage =
    pathname === "/profile" || pathname.startsWith("/profile/");
  const navigateToProfile = () => router.push("/profile");
  const [time, setTime] = useState<Date | null>(null);
  const [showAppearance, setShowAppearance] = useState(false);
  const appearanceBtnRef = useRef<HTMLButtonElement>(null);
  const { userPreferences, setUserPreferences } = useAppStore();

  useEffect(() => {
    const updateClock = () => setTime(new Date());
    const initialTick = window.setTimeout(updateClock, 0);
    const timer = window.setInterval(updateClock, 1000);
    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(timer);
    };
  }, []);

  const hours = time ? time.getUTCHours() : 0;
  const minutes = time ? time.getUTCMinutes() : 0;
  const seconds = time ? time.getUTCSeconds() : 0;
  const hourAngle = hours * 30 + minutes * 0.5;
  const secondAngle = seconds * 6;
  const timeDisplay = time ? time.toISOString().substring(11, 19) : "--:--:--";

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4"
      style={{
        background:
          "linear-gradient(180deg, rgba(6,8,13,0.95) 0%, rgba(6,8,13,0.7) 100%)",
        borderBottom: "1px solid var(--border-subtle)",
        backdropFilter: "blur(16px)",
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Anchors the brand mark and title on the left side of the top navigation bar. */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onFooterToggle}
          className="relative flex items-center justify-center w-8 h-8 cursor-pointer"
          title="Toggle footer"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 32 32"
            fill="none"
            className="text-glow-accent"
          >
            <circle
              cx="16"
              cy="16"
              r="12"
              stroke="var(--accent)"
              strokeWidth="1"
              fill="none"
              opacity="0.3"
            />
            <circle
              cx="16"
              cy="16"
              r="6"
              stroke="var(--accent)"
              strokeWidth="1.5"
              fill="none"
            />
            <circle cx="16" cy="16" r="2" fill="var(--accent)" />
            <ellipse
              cx="16"
              cy="16"
              rx="15"
              ry="5"
              stroke="var(--accent)"
              strokeWidth="0.8"
              fill="none"
              opacity="0.4"
              transform="rotate(-30 16 16)"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={onFooterToggle}
          className="hidden sm:block cursor-pointer"
          title="Toggle footer"
        >
          <span
            className="text-sm font-bold tracking-[0.2em] text-glow-accent"
            style={{ fontFamily: "var(--font-orbitron)" }}
          >
            SMS
          </span>
        </button>
        <div
          className="h-6 w-px ml-1"
          style={{ background: "var(--border-subtle)" }}
        />
      </div>

      {/* Renders the primary page navigation links in the center of the top bar. */}
      <nav className="flex items-center gap-1 ml-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.path ||
            (item.path !== "/" && pathname.startsWith(item.path));
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className="topbar-hover-btn topbar-nav-btn relative flex items-center gap-1.5 px-3 py-1.5 rounded-md"
              data-active={isActive ? "true" : "false"}
              style={{
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              <span className="topbar-hover-btn__scan" />
              <span className="topbar-hover-btn__edge topbar-hover-btn__edge--left" />
              <span className="topbar-hover-btn__edge topbar-hover-btn__edge--right" />
              {item.icon}
              <span
                className="text-[14px] font-bold tracking-[0.1em]"
                style={{ fontFamily: "var(--font-exo2)" }}
              >
                {item.label}
              </span>
              <span className="topbar-nav-btn__plate" />
              <span className="topbar-nav-btn__spark" />
            </button>
          );
        })}
      </nav>

      {/* Groups the assistant, account actions, appearance controls, and clock on the right side. */}
      <div className="ml-auto" />
      <div className="flex items-center gap-3">
        {/* Opens the voice assistant so navigation and queries can be triggered by speech. */}
        <VoiceAssistant />

        {/* Shows unread notifications only when an authenticated user is available. */}
        {authUser && <NotificationBell />}

        {/* Opens the appearance controls used to customize the dashboard theme. */}
        <div className="relative">
          <button
            ref={appearanceBtnRef}
            onClick={() => setShowAppearance(!showAppearance)}
            className="topbar-hover-btn topbar-icon-btn w-7 h-7 rounded-md flex items-center justify-center cursor-pointer"
            data-active={showAppearance ? "true" : "false"}
            style={{
              background: showAppearance ? "var(--accent-dim)" : "transparent",
              border: showAppearance ? "1px solid var(--accent)" : undefined,
            }}
            title="Appearance"
          >
            <span className="topbar-hover-btn__scan" />
            <span className="topbar-hover-btn__edge topbar-hover-btn__edge--left" />
            <span className="topbar-hover-btn__edge topbar-hover-btn__edge--right" />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke={
                showAppearance ? "var(--accent)" : "var(--text-secondary)"
              }
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="9" />
              <path
                d="M12 3a9 9 0 0 0 0 18"
                fill="currentColor"
                opacity="0.15"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <AppearancePanel
            isOpen={showAppearance}
            onClose={() => setShowAppearance(false)}
            toggleRef={appearanceBtnRef}
            accentColor={userPreferences.accentColor || "cyan"}
            onAccentColorChange={(color) =>
              setUserPreferences({ accentColor: color })
            }
            cinematicFilter={userPreferences.cinematicFilter || "standard"}
            onCinematicFilterChange={(filter) =>
              setUserPreferences({ cinematicFilter: filter })
            }
          />
        </div>

        {/* Shows sign-in actions or the authenticated user menu depending on session state. */}
        <AnimatePresence mode="wait">
          {authUser ? (
            <motion.div
              key="user"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="topbar-profile-rig"
              data-page-active={isProfilePage ? "true" : "false"}
            >
              <span className="topbar-session-trace" aria-hidden="true">
                <svg viewBox="0 0 194 48" preserveAspectRatio="none">
                  <path
                    pathLength="100"
                    d="M1 24A23 23 0 0 1 24 1H170A23 23 0 0 1 193 24A23 23 0 0 1 170 47H24A23 23 0 0 1 1 24Z"
                  />
                </svg>
              </span>
              <button
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.currentTarget.blur();
                  navigateToProfile();
                }}
                className="topbar-profile-main"
                data-page-active={isProfilePage ? "true" : "false"}
                title="My Profile"
              >
                <span className="topbar-profile-main__crest">
                  <span className="topbar-profile-main__avatar">
                    {authUser.name.charAt(0).toUpperCase()}
                  </span>
                </span>
                <span className="topbar-profile-main__meta">
                  <span className="topbar-profile-main__eyebrow">PILOT ACCESS</span>
                  <span className="topbar-profile-main__value">
                    {authUser.name}
                  </span>
                </span>
              </button>
              <button
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.currentTarget.blur();
                  onLogout?.();
                }}
                className="topbar-profile-out"
                title="Sign out"
              >
                <span className="topbar-profile-out__glyph">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
                    <path d="M16 17l5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>
                </span>
                <span className="topbar-profile-out__beam" />
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="signin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onSignInClick}
              className="topbar-signin-chip"
            >
              <span className="topbar-session-trace" aria-hidden="true">
                <svg viewBox="0 0 194 48" preserveAspectRatio="none">
                  <path
                    pathLength="100"
                    d="M1 24A23 23 0 0 1 24 1H170A23 23 0 0 1 193 24A23 23 0 0 1 170 47H24A23 23 0 0 1 1 24Z"
                  />
                </svg>
              </span>
              <span className="topbar-profile-main__crest">
                <span className="topbar-profile-main__avatar">S</span>
              </span>
              <span className="topbar-profile-main__meta">
                <span className="topbar-profile-main__eyebrow">SESSION</span>
                <span className="topbar-profile-main__value">SIGN IN</span>
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Displays the live UTC clock used throughout the application's monitoring views. */}
        <div className="topbar-clock-rig">
          <div className="topbar-clock-rig__readout">
            <span className="topbar-clock-rig__label">UTC</span>
            <div className="topbar-clock-rig__time" aria-label={timeDisplay}>
              {timeDisplay.split("").map((char, index) =>
                char === ":" ? (
                  <span key={`sep-${index}`} className="seven-seg-separator" />
                ) : (
                  <SevenSegmentDigit key={`${char}-${index}`} value={char} />
                )
              )}
            </div>
          </div>
          <span className="topbar-clock-rig__dial">
            <span className="topbar-clock-rig__ticks" />
            <span
              className="topbar-clock-rig__hand topbar-clock-rig__hand--hour"
              style={{ transform: `translateX(-50%) rotate(${hourAngle}deg)` }}
            />
            <span
              className="topbar-clock-rig__hand topbar-clock-rig__hand--second"
              style={{
                transform: `translateX(-50%) rotate(${secondAngle}deg)`,
              }}
            />
            <span className="topbar-clock-rig__pivot" />
          </span>
        </div>
      </div>
    </motion.header>
  );
}

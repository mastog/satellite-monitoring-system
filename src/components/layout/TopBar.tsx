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
    label: "OPS",
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
}

export default function TopBar({
  onSignInClick,
  authUser,
  onLogout,
}: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navigateToProfile = () => router.push("/profile");
  const [time, setTime] = useState<Date | null>(null);
  const [showAppearance, setShowAppearance] = useState(false);
  const appearanceBtnRef = useRef<HTMLButtonElement>(null);
  const { userPreferences, setUserPreferences } = useAppStore();

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
        <div className="relative flex items-center justify-center w-8 h-8">
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
        </div>
        <span
          className="text-sm font-bold tracking-[0.2em] text-glow-accent hidden sm:block"
          style={{ fontFamily: "var(--font-orbitron)" }}
        >
          SMS
        </span>
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
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors"
              style={{
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              {item.icon}
              <span
                className="text-[14px] font-bold tracking-[0.1em]"
                style={{ fontFamily: "var(--font-exo2)" }}
              >
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-1 right-1 h-[2px] rounded-full"
                  style={{
                    background: "var(--accent)",
                    boxShadow: "0 0 8px var(--accent-glow)",
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
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
            className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200 cursor-pointer"
            style={{
              background: showAppearance ? "var(--accent-dim)" : "transparent",
              border: showAppearance
                ? "1px solid var(--accent)"
                : "1px solid var(--border-subtle)",
            }}
            title="Appearance"
          >
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
            uiScale={userPreferences.uiScale ?? 1}
            onUiScaleChange={(scale) => setUserPreferences({ uiScale: scale })}
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
              className="flex items-center gap-2"
            >
              <button
                onClick={navigateToProfile}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[14px] font-bold cursor-pointer transition-all"
                style={{
                  background: "var(--accent-dim)",
                  border:
                    "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                  color: "var(--accent)",
                  fontFamily: "var(--font-orbitron)",
                }}
                title="My Profile"
              >
                {authUser.name.charAt(0).toUpperCase()}
              </button>
              <button
                onClick={onLogout}
                className="text-[13px] font-bold tracking-wider uppercase transition-colors"
                style={{ color: "var(--text-dim)" }}
              >
                OUT
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="signin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onSignInClick}
              className="cyber-btn !py-1.5 !px-3 !text-[13px]"
            >
              SIGN IN
            </motion.button>
          )}
        </AnimatePresence>

        <div
          className="h-6 w-px"
          style={{ background: "var(--border-subtle)" }}
        />

        {/* Displays the live UTC clock used throughout the application's monitoring views. */}
        <div className="text-right">
          <div
            className="text-[13px] tracking-[0.12em] uppercase"
            style={{ color: "var(--text-dim)" }}
          >
            UTC
          </div>
          <div
            className="text-[15px] font-mono font-semibold"
            style={{
              fontFamily: "var(--font-fira-code)",
              color: "var(--text-primary)",
            }}
          >
            {time ? time.toISOString().substring(11, 19) : "--:--:--"}
          </div>
        </div>
      </div>
    </motion.header>
  );
}

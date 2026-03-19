"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotificationStore } from "@/store/notificationStore";

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  conjunction: {
    color: "#ff6b2c",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ff6b2c"
        strokeWidth="2"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  comment_reply: {
    color: "#00e5ff",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#00e5ff"
        strokeWidth="2"
      >
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  medal_unlock: {
    color: "#ffd54f",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="#ffd54f"
        stroke="none"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
};

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    isOpen,
    toggleOpen,
    setIsOpen,
    markAsRead,
    markAllRead,
  } = useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Closes the notification panel when the user clicks anywhere outside the bell or dropdown.
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, setIsOpen]);

  return (
    <div className="relative">
      {/* Toggles the notification dropdown and shows the current alert entry point. */}
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        className="topbar-hover-btn topbar-icon-btn relative flex items-center justify-center w-7 h-7 rounded-md overflow-visible"
        data-active={isOpen ? "true" : "false"}
        style={{
          background: isOpen ? "rgba(0,229,255,0.08)" : "transparent",
          border: isOpen ? "1px solid rgba(0,229,255,0.3)" : "none",
          color: isOpen ? "var(--neon-cyan)" : "var(--text-dim)",
        }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <span className="topbar-hover-btn__scan" />
        <span className="topbar-hover-btn__edge topbar-hover-btn__edge--left" />
        <span className="topbar-hover-btn__edge topbar-hover-btn__edge--right" />
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>

        {/* Displays the unread notification count directly on the bell icon. */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5">
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ background: "#ff3a5c" }}
              animate={{
                scale: [1, 1.6, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <span
              className="relative flex items-center justify-center rounded-full text-[11px] font-bold leading-none"
              style={{
                minWidth: 16,
                height: 16,
                padding: "0 4px",
                background: "#ff3a5c",
                color: "white",
                fontFamily: "var(--font-fira-code)",
                boxShadow: "0 0 8px rgba(255,58,92,0.6)",
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Hosts the notification list, loading states, and empty-state messaging. */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            className="absolute right-0 top-[calc(100%+8px)] z-[100]"
            style={{
              width: 320,
            }}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background:
                  "linear-gradient(180deg, rgba(6,8,13,0.97) 0%, rgba(10,14,24,0.97) 100%)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(0,229,255,0.15)",
                boxShadow:
                  "0 8px 32px rgba(0,0,0,0.6), 0 0 1px rgba(0,229,255,0.3)",
              }}
            >
              {/* Shows the dropdown title and the bulk action for clearing unread indicators. */}
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background:
                        unreadCount > 0 ? "var(--neon-cyan)" : "var(--text-dim)",
                      boxShadow:
                        unreadCount > 0
                          ? "0 0 6px var(--neon-cyan-glow)"
                          : "none",
                    }}
                  />
                  <span
                    className="text-[13px] font-bold tracking-[0.15em] uppercase"
                    style={{
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-orbitron)",
                    }}
                  >
                    NOTIFICATIONS
                  </span>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAllRead();
                    }}
                    className="text-[12px] font-bold tracking-wider uppercase transition-colors"
                    style={{ color: "var(--neon-cyan)" }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Lists the current notifications in newest-first order. */}
              <div className="overflow-y-auto" style={{ maxHeight: 350 }}>
                {notifications.length === 0 ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="text-center">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--text-dim)"
                        strokeWidth="1"
                        className="mx-auto mb-2 opacity-30"
                      >
                        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 01-3.46 0" />
                      </svg>
                      <span
                        className="text-[13px] tracking-wider"
                        style={{ color: "var(--text-dim)" }}
                      >
                        No notifications
                      </span>
                    </div>
                  </div>
                ) : (
                  notifications.map((n, i) => {
                    const config =
                      TYPE_CONFIG[n.type] || TYPE_CONFIG.comment_reply;
                    return (
                      <motion.div
                        key={n.id}
                        onClick={() => {
                          if (!n.read) markAsRead([n.id]);
                        }}
                        className="flex items-start gap-2.5 px-4 py-3 cursor-pointer transition-colors"
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.03)",
                          borderLeft: !n.read
                            ? `2px solid ${config.color}`
                            : "2px solid transparent",
                          background: !n.read
                            ? `${config.color}06`
                            : "transparent",
                        }}
                        initial={{ opacity: 0, x: 6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.2 }}
                        whileHover={{ background: "rgba(255,255,255,0.03)" }}
                      >
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{
                            background: `${config.color}12`,
                          }}
                        >
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="text-[14px] font-bold truncate"
                              style={{
                                color: !n.read
                                  ? "var(--text-primary)"
                                  : "var(--text-secondary)",
                              }}
                            >
                              {n.title}
                            </span>
                            <span
                              className="text-[11px] tracking-wider flex-shrink-0"
                              style={{
                                color: "var(--text-dim)",
                                fontFamily: "var(--font-fira-code)",
                              }}
                            >
                              {relativeTime(n.createdAt)}
                            </span>
                          </div>
                          <p
                            className="text-[13px] leading-relaxed mt-0.5 line-clamp-2"
                            style={{ color: "var(--text-dim)" }}
                          >
                            {n.body}
                          </p>
                        </div>
                        {!n.read && (
                          <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
                            style={{
                              background: config.color,
                              boxShadow: `0 0 4px ${config.color}`,
                            }}
                          />
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

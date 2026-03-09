"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePostsStore } from "@/store/postsStore";
import { useAuthStore } from "@/store/authStore";
import PostCard from "./PostCard";
import PostEditor from "./PostEditor";
import { prefillProfileCache } from "./UserHoverCard";

type SortMode = "latest" | "replies" | "hot-week" | "hot-all";

const SORT_ICONS: Record<SortMode, React.ReactNode> = {
  latest: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  replies: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  "hot-week": (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 2c.3 3.2-1.5 5.5-3 7.5C7.5 11.5 6 14 6 16.5 6 20 9 22 12 22s6-2 6-5.5c0-2.5-1.5-5-3-7C13.5 7.5 11.7 5.2 12 2z" />
    </svg>
  ),
  "hot-all": (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
};

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: "latest", label: "LATEST" },
  { id: "replies", label: "REPLIES" },
  { id: "hot-week", label: "HOT (7D)" },
  { id: "hot-all", label: "HOT (ALL)" },
];

export default function PostsList() {
  const { posts, isLoading, fetchPosts } = usePostsStore();
  const { isAuthenticated } = useAuthStore();
  const [showEditor, setShowEditor] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("latest");

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Prefetches author profile data so hover cards can open without an extra per-post request.
  useEffect(() => {
    if (posts.length === 0) return;
    const uniqueIds = [...new Set(posts.map((p) => p.authorId))];
    if (uniqueIds.length === 0) return;

    fetch("/api/user/profiles/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: uniqueIds }),
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((profiles) => {
        if (Array.isArray(profiles)) prefillProfileCache(profiles);
      })
      .catch(() => {});
  }, [posts]);

  const sortedPosts = useMemo(() => {
    const sorted = [...posts];
    switch (sortMode) {
      case "latest":
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "replies":
        sorted.sort((a, b) => {
          const aTime = a.lastCommentAt
            ? new Date(a.lastCommentAt).getTime()
            : 0;
          const bTime = b.lastCommentAt
            ? new Date(b.lastCommentAt).getTime()
            : 0;
          return bTime - aTime;
        });
        break;
      case "hot-week":
        sorted.sort((a, b) => b.weeklyHotness - a.weeklyHotness);
        break;
      case "hot-all":
        sorted.sort((a, b) => b.totalHotness - a.totalHotness);
        break;
    }
    return sorted;
  }, [posts, sortMode]);

  return (
    <div className="space-y-4">
      {/* Lets readers switch the ordering strategy used for the post feed. */}
      <div
        className="flex items-center gap-1 p-1 rounded-lg"
        style={{
          background: "rgba(0,0,0,0.3)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <span
          className="text-[12px] font-bold tracking-[0.12em] uppercase px-2 flex-shrink-0"
          style={{ color: "var(--text-dim)", fontFamily: "var(--font-exo2)" }}
        >
          SORT
        </span>
        <div
          className="h-4 w-px flex-shrink-0"
          style={{ background: "var(--border-subtle)" }}
        />
        {SORT_OPTIONS.map((opt) => {
          const active = sortMode === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setSortMode(opt.id)}
              className="relative flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-md text-[13px] font-bold tracking-[0.08em] transition-all"
              style={{
                background: active ? "var(--neon-cyan-dim)" : "transparent",
                color: active ? "var(--neon-cyan)" : "var(--text-dim)",
                border: active
                  ? "1px solid rgba(0,229,255,0.2)"
                  : "1px solid transparent",
              }}
            >
              {SORT_ICONS[opt.id]}
              <span>{opt.label}</span>
              {active && (
                <motion.div
                  layoutId="sortIndicator"
                  className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                  style={{
                    background: "var(--neon-cyan)",
                    boxShadow: "0 0 6px var(--neon-cyan-glow)",
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Swaps between the inline composer and its entry button based on the current editor state. */}
      <AnimatePresence mode="wait">
        {showEditor ? (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <PostEditor onCancel={() => setShowEditor(false)} />
          </motion.div>
        ) : (
          <motion.div
            key="create-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {isAuthenticated ? (
              <button
                onClick={() => setShowEditor(true)}
                className="w-full py-3 rounded-lg text-[15px] font-bold tracking-[0.12em] transition-all flex items-center justify-center gap-2"
                style={{
                  background: "var(--neon-cyan-dim)",
                  color: "var(--neon-cyan)",
                  border: "1px solid rgba(0,229,255,0.2)",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                CREATE POST
              </button>
            ) : (
              <div
                className="w-full py-3 rounded-lg text-[14px] font-bold tracking-wider text-center"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  color: "var(--text-dim)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                Sign in to create posts and join the discussion
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Replaces the feed with a loading indicator while posts are being fetched. */}
      {isLoading && (
        <div className="text-center py-8">
          <motion.div
            className="inline-block w-6 h-6 rounded-full"
            style={{
              border: "2px solid var(--neon-cyan)",
              borderTopColor: "transparent",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
          <div
            className="text-[14px] mt-2 tracking-wider"
            style={{ color: "var(--text-dim)" }}
          >
            Loading posts...
          </div>
        </div>
      )}

      {/* Shows an empty-state card when no posts are available after loading finishes. */}
      {!isLoading && posts.length === 0 && (
        <div
          className="text-center py-12 rounded-lg"
          style={{
            background: "rgba(0,0,0,0.2)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div className="text-2xl mb-2" style={{ opacity: 0.5 }}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-dim)"
              strokeWidth="1"
              className="mx-auto"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div
            className="text-[15px] tracking-wider"
            style={{ color: "var(--text-dim)" }}
          >
            No posts yet — be the first to start a discussion
          </div>
        </div>
      )}

      <AnimatePresence>
        {sortedPosts.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: i * 0.05 }}
          >
            <PostCard post={post} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

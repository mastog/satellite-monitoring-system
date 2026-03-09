"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePostsStore } from "@/store/postsStore";
import { useAuthStore } from "@/store/authStore";
import { useAppStore } from "@/store/appStore";
import CommentSection from "./CommentSection";
import PostEditor from "./PostEditor";
import UserHoverCard from "./UserHoverCard";
import type { Post } from "@/lib/posts/types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function PostCard({ post }: { post: Post }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { deletePost, votePost, userVotes } = usePostsStore();
  const { isAuthenticated, user } = useAuthStore();
  const { setShowAuthModal } = useAppStore();

  const isAuthor = isAuthenticated && user?.id === post.authorId;
  const userVote = userVotes[post.id];

  const handleDelete = async () => {
    await deletePost(post.id);
    setConfirmDelete(false);
  };

  if (editing) {
    return (
      <PostEditor
        editPost={{ id: post.id, title: post.title, body: post.body }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <motion.div
      className="glass-panel overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <div className="p-4">
        {/* Summarizes authorship, creation time, and author-only management actions for the post. */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <UserHoverCard userId={post.authorId} authorName={post.authorName}>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-bold"
                style={{
                  background: "var(--neon-cyan-dim)",
                  color: "var(--neon-cyan)",
                  border: "1px solid rgba(0,229,255,0.2)",
                }}
              >
                {post.authorName.charAt(0).toUpperCase()}
              </div>
              <span
                className="text-[14px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {post.authorName}
              </span>
            </UserHoverCard>
            <span
              className="text-[13px]"
              style={{
                color: "var(--text-dim)",
                fontFamily: "var(--font-fira-code)",
              }}
            >
              {timeAgo(post.createdAt)}
            </span>
          </div>
          {isAuthor && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditing(true)}
                className="p-1 rounded transition-all"
                style={{
                  color: "var(--text-dim)",
                  border: "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--neon-cyan)";
                  e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-dim)";
                  e.currentTarget.style.borderColor = "transparent";
                }}
                title="Edit post"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1 rounded transition-all"
                style={{
                  color: "var(--text-dim)",
                  border: "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--neon-red)";
                  e.currentTarget.style.borderColor = "rgba(255,58,92,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-dim)";
                  e.currentTarget.style.borderColor = "transparent";
                }}
                title="Delete post"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Expands an inline confirmation prompt before the post is removed permanently. */}
        <AnimatePresence>
          {confirmDelete && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 p-2 rounded-lg flex items-center justify-between"
              style={{
                background: "rgba(255,58,92,0.08)",
                border: "1px solid rgba(255,58,92,0.2)",
              }}
            >
              <span
                className="text-[14px] font-bold"
                style={{ color: "var(--neon-red)" }}
              >
                Delete this post?
              </span>
              <div className="flex gap-1">
                <button
                  onClick={handleDelete}
                  className="px-2 py-0.5 rounded text-[13px] font-bold"
                  style={{
                    background: "rgba(255,58,92,0.15)",
                    color: "var(--neon-red)",
                    border: "1px solid rgba(255,58,92,0.3)",
                  }}
                >
                  DELETE
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-0.5 rounded text-[13px] font-bold"
                  style={{
                    color: "var(--text-dim)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Uses the title as a toggle target so readers can expand or collapse the post quickly. */}
        <h3
          className="text-[15px] font-semibold mb-1 cursor-pointer"
          style={{ color: "var(--text-primary)" }}
          onClick={() => setExpanded(!expanded)}
        >
          {post.title}
        </h3>

        {/* Shows either a truncated preview or the full post body based on the current expansion state. */}
        <p
          className="text-[15px] leading-relaxed cursor-pointer"
          style={{ color: "var(--text-secondary)" }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded
            ? post.body
            : post.body.length > 200
              ? post.body.slice(0, 200) + "..."
              : post.body}
        </p>

        {/* Lists the post tags and styles SDG tags differently from broader topic tags. */}
        {post.tags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-[12px] px-1.5 py-0.5 rounded font-bold"
                style={{
                  background: tag.startsWith("SDG")
                    ? "rgba(0,229,255,0.08)"
                    : "rgba(180,74,255,0.08)",
                  color: tag.startsWith("SDG")
                    ? "var(--neon-cyan)"
                    : "var(--holo-purple)",
                  border: tag.startsWith("SDG")
                    ? "1px solid rgba(0,229,255,0.15)"
                    : "1px solid rgba(180,74,255,0.15)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Groups voting controls, engagement counters, and the expand toggle under the post body. */}
        <div
          className="flex items-center justify-between mt-3 pt-2"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  setShowAuthModal(true);
                  return;
                }
                votePost(post.id, "support");
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[13px] font-bold tracking-wider transition-all leading-none"
              style={{
                background:
                  userVote === "support"
                    ? "var(--neon-green-dim)"
                    : "transparent",
                color:
                  userVote === "support"
                    ? "var(--neon-green)"
                    : "var(--text-dim)",
                border:
                  userVote === "support"
                    ? "1px solid rgba(57,255,127,0.3)"
                    : "1px solid var(--border-subtle)",
              }}
            >
              <span
                className="inline-flex items-center leading-none"
                style={{ fontSize: "12px" }}
              >
                {"\u25B2"}
              </span>
              <span
                className="inline-flex items-center leading-none"
                style={{ fontFamily: "var(--font-fira-code)" }}
              >
                {post.supportCount}
              </span>
            </button>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  setShowAuthModal(true);
                  return;
                }
                votePost(post.id, "oppose");
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[13px] font-bold tracking-wider transition-all leading-none"
              style={{
                background:
                  userVote === "oppose" ? "var(--neon-red-dim)" : "transparent",
                color:
                  userVote === "oppose" ? "var(--neon-red)" : "var(--text-dim)",
                border:
                  userVote === "oppose"
                    ? "1px solid rgba(255,58,92,0.3)"
                    : "1px solid var(--border-subtle)",
              }}
            >
              <span
                className="inline-flex items-center leading-none"
                style={{ fontSize: "12px" }}
              >
                {"\u25BC"}
              </span>
              <span
                className="inline-flex items-center leading-none"
                style={{ fontFamily: "var(--font-fira-code)" }}
              >
                {post.opposeCount}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            {/* Displays the number of comments already attached to this discussion. */}
            <span
              className="inline-flex items-center gap-1 text-[13px] tracking-wider"
              style={{
                color: "var(--text-dim)",
                fontFamily: "var(--font-fira-code)",
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {post.commentCount}
            </span>

            {/* Surfaces the aggregate hotness score only when the post has earned measurable momentum. */}
            {post.totalHotness > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[13px] tracking-wider"
                style={{
                  color:
                    post.weeklyHotness > 0
                      ? "var(--neon-orange)"
                      : "var(--text-dim)",
                  fontFamily: "var(--font-fira-code)",
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2c.3 3.2-1.5 5.5-3 7.5C7.5 11.5 6 14 6 16.5 6 20 9 22 12 22s6-2 6-5.5c0-2.5-1.5-5-3-7C13.5 7.5 11.7 5.2 12 2z" />
                </svg>
                {post.totalHotness}
              </span>
            )}

            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[13px] font-bold tracking-wider transition-all"
              style={{ color: "var(--text-dim)" }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  transition: "transform 0.2s",
                  transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              {expanded ? "COLLAPSE" : "EXPAND"}
            </button>
          </div>
        </div>

        {/* Mounts the full comment thread only after expansion so collapsed cards stay lighter to render. */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-3 pt-3"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              <CommentSection postId={post.id} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

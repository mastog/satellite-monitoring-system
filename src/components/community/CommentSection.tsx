"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePostsStore } from "@/store/postsStore";
import { useAuthStore } from "@/store/authStore";
import { useAppStore } from "@/store/appStore";
import UserHoverCard from "./UserHoverCard";

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

interface CommentSectionProps {
  postId: string;
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const {
    commentsByPost,
    fetchComments,
    createComment,
    updateComment,
    deleteComment,
    voteComment,
    userVotes,
  } = usePostsStore();

  const { isAuthenticated, user } = useAuthStore();
  const { setShowAuthModal } = useAppStore();

  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const comments = commentsByPost[postId] || [];

  useEffect(() => {
    fetchComments(postId);
  }, [postId, fetchComments]);

  const handleSubmit = async () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    await createComment(postId, trimmed);
    setNewComment("");
  };

  const handleEditSave = async (commentId: string) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    const ok = await updateComment(postId, commentId, trimmed);
    if (ok) {
      setEditingId(null);
      setEditText("");
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditText("");
  };

  const startEdit = (commentId: string, currentBody: string) => {
    setEditingId(commentId);
    setEditText(currentBody);
  };

  const handleDelete = async (commentId: string) => {
    await deleteComment(postId, commentId);
  };

  const handleVote = async (commentId: string, vote: "support" | "oppose") => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    await voteComment(postId, commentId, vote);
  };

  return (
    <div className="space-y-4">
      {/* Shows the discussion label together with the current number of loaded comments. */}
      <div className="flex items-center gap-2">
        <span
          className="text-[14px] font-bold tracking-[0.15em] uppercase"
          style={{
            fontFamily: "var(--font-orbitron)",
            color: "var(--neon-cyan)",
          }}
        >
          Comments
        </span>
        <span
          className="text-[14px] px-2 py-0.5 rounded-full"
          style={{
            fontFamily: "var(--font-fira-code)",
            color: "var(--text-dim)",
            background: "rgba(0,229,255,0.06)",
            border: "1px solid rgba(0,229,255,0.12)",
          }}
        >
          {comments.length}
        </span>
      </div>

      {/* Renders each comment with motion layout so edits, deletions, and insertions animate smoothly. */}
      <AnimatePresence mode="popLayout">
        {comments.map((comment, i) => {
          const isAuthor = user?.id === comment.authorId;
          const isEditing = editingId === comment.id;
          const currentVote = userVotes[comment.id] as
            | "support"
            | "oppose"
            | undefined;

          return (
            <motion.div
              key={comment.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              className="rounded-lg p-3"
              style={{
                background: "rgba(0,0,0,0.35)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {/* Displays the author identity, relative timestamp, and ownership actions for this comment. */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <UserHoverCard
                    userId={comment.authorId}
                    authorName={comment.authorName}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-bold"
                      style={{
                        background: "rgba(0,229,255,0.1)",
                        border: "1px solid rgba(0,229,255,0.2)",
                        color: "var(--neon-cyan)",
                        fontFamily: "var(--font-orbitron)",
                      }}
                    >
                      {comment.authorName.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className="text-[15px] font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {comment.authorName}
                    </span>
                  </UserHoverCard>
                  <span
                    className="text-[13px]"
                    style={{
                      color: "var(--text-dim)",
                      fontFamily: "var(--font-fira-code)",
                    }}
                  >
                    {timeAgo(comment.createdAt)}
                  </span>
                </div>

                {/* Exposes edit and delete controls only to the comment author while the item is not in edit mode. */}
                {isAuthor && !isEditing && (
                  <div className="flex items-center gap-1">
                    {/* Starts inline editing and seeds the textarea with the existing comment body. */}
                    <button
                      onClick={() => startEdit(comment.id, comment.body)}
                      className="p-1 rounded transition-colors"
                      style={{ color: "var(--text-dim)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "var(--neon-cyan)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "var(--text-dim)")
                      }
                      title="Edit comment"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                    </button>
                    {/* Removes the current comment from the post when the author confirms the action. */}
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="p-1 rounded transition-colors"
                      style={{ color: "var(--text-dim)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "var(--neon-red)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "var(--text-dim)")
                      }
                      title="Delete comment"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Switches between an editable textarea and the persisted comment body for inline updates. */}
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full rounded-md p-2 text-[14px] resize-none outline-none"
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(0,229,255,0.2)",
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-fira-code)",
                      minHeight: "60px",
                    }}
                    rows={3}
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={handleEditCancel}
                      className="px-3 py-1 rounded text-[13px] font-bold tracking-wider transition-all"
                      style={{
                        color: "var(--text-dim)",
                        border: "1px solid var(--border-subtle)",
                        background: "transparent",
                      }}
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={() => handleEditSave(comment.id)}
                      disabled={!editText.trim()}
                      className="px-3 py-1 rounded text-[13px] font-bold tracking-wider transition-all"
                      style={{
                        background: editText.trim()
                          ? "rgba(0,229,255,0.12)"
                          : "rgba(0,0,0,0.2)",
                        color: editText.trim()
                          ? "var(--neon-cyan)"
                          : "var(--text-dim)",
                        border: editText.trim()
                          ? "1px solid rgba(0,229,255,0.25)"
                          : "1px solid var(--border-subtle)",
                      }}
                    >
                      SAVE
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  className="text-[14px] leading-relaxed whitespace-pre-wrap mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {comment.body}
                </p>
              )}

              {/* Keeps support and oppose voting available whenever the comment is not being edited. */}
              {!isEditing && (
                <div className="flex items-center gap-3 mt-2">
                  {/* Records a supportive vote and highlights the control when that is the viewer's active choice. */}
                  <button
                    onClick={() => handleVote(comment.id, "support")}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[13px] font-bold tracking-wider transition-all leading-none"
                    style={{
                      background:
                        currentVote === "support"
                          ? "var(--neon-green-dim)"
                          : "transparent",
                      color:
                        currentVote === "support"
                          ? "var(--neon-green)"
                          : "var(--text-dim)",
                      border:
                        currentVote === "support"
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
                      {comment.supportCount}
                    </span>
                  </button>

                  {/* Records an opposing vote and highlights the control when that is the viewer's active choice. */}
                  <button
                    onClick={() => handleVote(comment.id, "oppose")}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[13px] font-bold tracking-wider transition-all leading-none"
                    style={{
                      background:
                        currentVote === "oppose"
                          ? "var(--neon-red-dim)"
                          : "transparent",
                      color:
                        currentVote === "oppose"
                          ? "var(--neon-red)"
                          : "var(--text-dim)",
                      border:
                        currentVote === "oppose"
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
                      {comment.opposeCount}
                    </span>
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Explains that no discussion exists yet when the post has no comments loaded. */}
      {comments.length === 0 && (
        <div
          className="text-center py-6 text-[15px] tracking-wide"
          style={{ color: "var(--text-dim)" }}
        >
          No comments yet. Be the first to contribute to this discussion.
        </div>
      )}

      {/* Lets authenticated users add a new comment, or prompts anonymous visitors to sign in first. */}
      <div
        className="rounded-lg p-3 space-y-3"
        style={{
          background: "rgba(0,0,0,0.25)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {isAuthenticated ? (
          <>
            <label
              className="text-[13px] font-bold tracking-[0.12em] uppercase block"
              style={{
                fontFamily: "var(--font-orbitron)",
                color: "var(--text-dim)",
              }}
            >
              Add Comment
            </label>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your analysis..."
              className="w-full rounded-md p-2.5 text-[14px] resize-none outline-none placeholder:text-[var(--text-dim)]"
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                minHeight: "72px",
              }}
              rows={3}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "rgba(0,229,255,0.3)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--border-subtle)")
              }
            />
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim()}
                className="px-4 py-1.5 rounded text-[14px] font-bold tracking-[0.1em] transition-all"
                style={{
                  background: newComment.trim()
                    ? "rgba(0,229,255,0.12)"
                    : "rgba(0,0,0,0.2)",
                  color: newComment.trim()
                    ? "var(--neon-cyan)"
                    : "var(--text-dim)",
                  border: newComment.trim()
                    ? "1px solid rgba(0,229,255,0.25)"
                    : "1px solid var(--border-subtle)",
                  fontFamily: "var(--font-orbitron)",
                  cursor: newComment.trim() ? "pointer" : "default",
                }}
              >
                TRANSMIT
              </button>
            </div>
          </>
        ) : (
          <div
            className="text-center py-4 text-[15px] tracking-wide"
            style={{ color: "var(--text-dim)" }}
          >
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              style={{
                color: "var(--neon-cyan)",
                fontFamily: "var(--font-orbitron)",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Sign in
            </button>{" "}
            to comment
          </div>
        )}
      </div>
    </div>
  );
}

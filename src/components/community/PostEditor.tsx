"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePostsStore } from "@/store/postsStore";

// Maps post keywords to preview tags so the editor can suggest SDG and topic labels before submission.
const SDG_KEYWORDS: Record<string, string[]> = {
  "SDG 6": ["water", "sanitation", "groundwater"],
  "SDG 9": ["infrastructure", "industry", "innovation"],
  "SDG 11": ["city", "urban", "air quality", "green space"],
  "SDG 12": ["waste", "mining", "agriculture", "deforestation"],
  "SDG 13": ["climate", "temperature", "sea level", "carbon", "emissions"],
  "SDG 15": ["forest", "vegetation", "biodiversity", "soil", "ecosystem"],
  Satellite: ["satellite", "sentinel", "landsat", "modis", "remote sensing"],
  Space: ["space", "debris", "orbit"],
};

function extractTags(text: string): string[] {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  for (const [tag, keywords] of Object.entries(SDG_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      matched.push(tag);
    }
  }
  return matched;
}

// Returns the badge palette used to visually distinguish SDG, Satellite, and Space tags in the preview row.
function tagColor(tag: string): { bg: string; text: string; border: string } {
  if (tag.startsWith("SDG")) {
    return {
      bg: "rgba(0,229,255,0.08)",
      text: "var(--neon-cyan, #00e5ff)",
      border: "rgba(0,229,255,0.25)",
    };
  }
  if (tag === "Satellite") {
    return {
      bg: "rgba(57,255,127,0.08)",
      text: "var(--neon-green, #39ff7f)",
      border: "rgba(57,255,127,0.25)",
    };
  }
  // Falls back to the Space palette for any non-SDG tag that is not handled by a dedicated branch above.
  return {
    bg: "rgba(180,74,255,0.08)",
    text: "var(--holo-purple, #b44aff)",
    border: "rgba(180,74,255,0.25)",
  };
}

// Defines the editor contract for both creating a new post and editing an existing one.
interface PostEditorProps {
  onCancel: () => void;
  editPost?: { id: string; title: string; body: string } | null;
}

// Renders the shared post form and adapts its behavior for create and edit flows.
export default function PostEditor({ onCancel, editPost }: PostEditorProps) {
  const { createPost, updatePost, error } = usePostsStore();

  const [title, setTitle] = useState(editPost?.title ?? "");
  const [body, setBody] = useState(editPost?.body ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewTags, setPreviewTags] = useState<string[]>([]);

  const isEditMode = Boolean(editPost);

  // Stores the active debounce timer so rapid typing does not recompute tag suggestions on every keystroke.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedExtractTags = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPreviewTags(extractTags(text));
    }, 300);
  }, []);

  // Rebuilds preview tags from the latest body text after the debounce window expires.
  useEffect(() => {
    debouncedExtractTags(body);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [body, debouncedExtractTags]);

  // Seeds the preview immediately when editing an existing post so tags are visible before any new typing.
  useEffect(() => {
    if (editPost?.body) {
      setPreviewTags(extractTags(editPost.body));
    }
  }, [editPost]);

  // Submits the form through the matching store action and closes the editor only after a successful save.
  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    setIsSubmitting(true);

    if (isEditMode && editPost) {
      const ok = await updatePost(editPost.id, title.trim(), body.trim());
      setIsSubmitting(false);
      if (ok) onCancel();
    } else {
      const post = await createPost(title.trim(), body.trim());
      setIsSubmitting(false);
      if (post) onCancel();
    }
  };

  // Presents the animated editor shell, field inputs, tag preview, and action buttons.
  return (
    <motion.div
      className="glass-panel p-6 space-y-5"
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* Labels the form according to whether the user is creating a new post or editing an existing one. */}
      <motion.h3
        className="text-base font-bold tracking-[0.15em] text-glow-cyan"
        style={{ fontFamily: "var(--font-orbitron)" }}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        {isEditMode ? "EDIT POST" : "NEW POST"}
      </motion.h3>

      {/* Displays the latest store error inline so failed submissions stay visible near the form fields. */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="text-[15px] p-3 rounded-lg flex items-center gap-2"
            style={{
              background: "rgba(255,58,92,0.08)",
              border: "1px solid rgba(255,58,92,0.25)",
              color: "var(--neon-red, #ff3a5c)",
            }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collects the post title and applies focus styling consistent with the rest of the editor. */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <label
          className="block text-[14px] font-bold tracking-[0.12em] mb-1.5"
          style={{
            color: "var(--neon-cyan, #00e5ff)",
            fontFamily: "var(--font-orbitron)",
          }}
        >
          TITLE
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter post title..."
          className="w-full px-4 py-2.5 rounded-lg text-[14px] outline-none transition-all"
          style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
            color: "var(--text-primary, #e0e6ed)",
            fontFamily: "var(--font-fira-code)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(0,229,255,0.35)";
            e.currentTarget.style.boxShadow = "0 0 12px rgba(0,229,255,0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor =
              "var(--border-subtle, rgba(255,255,255,0.06))";
            e.currentTarget.style.boxShadow = "none";
          }}
          disabled={isSubmitting}
        />
      </motion.div>

      {/* Captures the main post content and feeds the automatic tag preview logic. */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label
          className="block text-[14px] font-bold tracking-[0.12em] mb-1.5"
          style={{
            color: "var(--neon-cyan, #00e5ff)",
            fontFamily: "var(--font-orbitron)",
          }}
        >
          BODY
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your post content... Mention topics like climate, satellite, water, forest to auto-tag."
          rows={6}
          className="w-full px-4 py-3 rounded-lg text-[14px] outline-none transition-all resize-y"
          style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
            color: "var(--text-primary, #e0e6ed)",
            fontFamily: "var(--font-fira-code)",
            minHeight: "120px",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(0,229,255,0.35)";
            e.currentTarget.style.boxShadow = "0 0 12px rgba(0,229,255,0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor =
              "var(--border-subtle, rgba(255,255,255,0.06))";
            e.currentTarget.style.boxShadow = "none";
          }}
          disabled={isSubmitting}
        />
      </motion.div>

      {/* Shows the tags inferred from the current body text before the post is submitted. */}
      <AnimatePresence>
        {previewTags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            <span
              className="block text-[14px] font-bold tracking-[0.12em] mb-2"
              style={{
                color: "var(--neon-green, #39ff7f)",
                fontFamily: "var(--font-orbitron)",
              }}
            >
              AUTO-DETECTED TAGS
            </span>
            <div className="flex flex-wrap gap-2">
              {previewTags.map((tag) => {
                const colors = tagColor(tag);
                return (
                  <motion.span
                    key={tag}
                    className="px-2.5 py-1 rounded-md text-[14px] font-bold tracking-wider"
                    style={{
                      background: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                      fontFamily: "var(--font-fira-code)",
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {tag}
                  </motion.span>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keeps cancel and submit controls aligned at the bottom of the form. */}
      <motion.div
        className="flex items-center justify-end gap-3 pt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg text-[14px] font-bold tracking-[0.1em] transition-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
            color: "var(--text-dim, #6b7b8d)",
          }}
        >
          CANCEL
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !title.trim() || !body.trim()}
          className="cyber-btn px-5 py-2 rounded-lg text-[14px] font-bold tracking-[0.12em] transition-all"
          style={{
            background:
              isSubmitting || !title.trim() || !body.trim()
                ? "rgba(0,229,255,0.05)"
                : "rgba(0,229,255,0.12)",
            border: "1px solid rgba(0,229,255,0.3)",
            color:
              isSubmitting || !title.trim() || !body.trim()
                ? "rgba(0,229,255,0.35)"
                : "var(--neon-cyan, #00e5ff)",
            cursor:
              isSubmitting || !title.trim() || !body.trim()
                ? "not-allowed"
                : "pointer",
            fontFamily: "var(--font-orbitron)",
          }}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <motion.span
                className="inline-block w-3 h-3 rounded-full"
                style={{
                  border: "2px solid var(--neon-cyan, #00e5ff)",
                  borderTopColor: "transparent",
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
              {isEditMode ? "UPDATING..." : "TRANSMITTING..."}
            </span>
          ) : isEditMode ? (
            "UPDATE POST"
          ) : (
            "TRANSMIT POST"
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}

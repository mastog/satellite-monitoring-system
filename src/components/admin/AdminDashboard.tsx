"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";

// Defines the normalized record shapes rendered by the admin dashboard tables.
interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  points: number;
  totalEarned?: number;
  postCount: number;
  commentCount: number;
  createdAt: string;
}

interface AdminPost {
  id: string;
  title: string;
  body: string;
  tags: string[];
  authorId: string;
  authorName: string;
  authorEmail: string;
  supportCount: number;
  opposeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AdminComment {
  id: string;
  body: string;
  postId: string;
  postTitle: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  supportCount: number;
  opposeCount: number;
  createdAt: string;
  updatedAt: string;
}

type Tab = "users" | "posts" | "comments";

// Provides small formatting helpers shared across the admin tables.
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + "..." : s;
}

// Describes the selectable role options shown in the admin role control.
interface RoleOption {
  value: string;
  label: string;
  color: string;
  icon: React.ReactNode;
  description: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "user",
    label: "USER",
    color: "var(--neon-cyan)",
    description: "Standard access",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    value: "admin",
    label: "ADMIN",
    color: "var(--neon-orange)",
    description: "Full system access",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

// Renders the custom role dropdown used when an administrator edits a user's role.
function FormRoleSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected =
    ROLE_OPTIONS.find((o) => o.value === value) || ROLE_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Opens and closes the role dropdown while showing the currently selected role. */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
        style={{
          background: "rgba(0,0,0,0.4)",
          border: open
            ? `1px solid ${selected.color}40`
            : "1px solid var(--border-subtle)",
          boxShadow: open
            ? `0 0 12px ${selected.color}10, inset 0 0 12px ${selected.color}05`
            : "none",
        }}
      >
        {/* Displays the icon associated with the selected role. */}
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{
            background: `${selected.color}12`,
            border: `1px solid ${selected.color}25`,
            color: selected.color,
          }}
        >
          {selected.icon}
        </div>

        {/* Displays the selected role name and its access-level description. */}
        <div className="flex-1 min-w-0">
          <div
            className="text-[14px] font-bold tracking-[0.1em]"
            style={{
              color: selected.color,
              fontFamily: "var(--font-orbitron)",
            }}
          >
            {selected.label}
          </div>
          <div className="text-[12px]" style={{ color: "var(--text-dim)" }}>
            {selected.description}
          </div>
        </div>

        {/* Rotates to indicate whether the dropdown is expanded. */}
        <motion.svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: "var(--text-dim)", flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </motion.svg>
      </button>

      {/* Lists the available roles with the current selection highlighted. */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-50 left-0 right-0 mt-1.5 rounded-lg overflow-hidden origin-top"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,14,24,0.98) 0%, rgba(6,8,13,0.98) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow:
                "0 12px 40px rgba(0,0,0,0.7), 0 0 1px rgba(0,229,255,0.2)",
              backdropFilter: "blur(20px)",
            }}
          >
            {ROLE_OPTIONS.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 text-left transition-all relative"
                  style={{
                    background: isSelected
                      ? `${option.color}08`
                      : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.background = `${option.color}06`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isSelected
                      ? `${option.color}08`
                      : "transparent";
                  }}
                >
                  {/* Marks the currently selected role inside the expanded list. */}
                  {isSelected && (
                    <motion.div
                      layoutId="roleSelectIndicator"
                      className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full"
                      style={{
                        background: option.color,
                        boxShadow: `0 0 8px ${option.color}`,
                      }}
                    />
                  )}

                  {/* Displays the icon for this candidate role option. */}
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                    style={{
                      background: `${option.color}12`,
                      border: `1px solid ${option.color}${isSelected ? "40" : "18"}`,
                      color: option.color,
                    }}
                  >
                    {option.icon}
                  </div>

                  {/* Shows the role label and description for this dropdown option. */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[14px] font-bold tracking-[0.1em]"
                      style={{
                        color: isSelected
                          ? option.color
                          : "var(--text-primary)",
                        fontFamily: "var(--font-orbitron)",
                      }}
                    >
                      {option.label}
                    </div>
                    <div
                      className="text-[12px]"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {option.description}
                    </div>
                  </div>

                  {/* Marks the currently selected option so role changes are easy to verify before closing. */}
                  {isSelected && (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={option.color}
                      strokeWidth="2.5"
                      className="shrink-0"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </motion.svg>
                  )}
                </button>
              );
            })}

            {/* Adds a subtle closing accent at the bottom of the expanded dropdown panel. */}
            <div
              className="h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${selected.color}30, transparent)`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Provides the reusable cards, inputs, dialogs, and badges used throughout the dashboard. */

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="flex-1 min-w-[140px] rounded-xl px-4 py-3"
      style={{
        background: `${color}08`,
        border: `1px solid ${color}20`,
      }}
    >
      <div
        className="text-[12px] font-bold tracking-[0.15em] uppercase mb-1"
        style={{ color: "var(--text-dim)", fontFamily: "var(--font-orbitron)" }}
      >
        {label}
      </div>
      <div
        className="text-2xl font-bold"
        style={{ color, fontFamily: "var(--font-fira-code)" }}
      >
        {value}
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[12px] font-bold tracking-wider uppercase"
      style={{
        background: isAdmin ? "rgba(255,107,44,0.12)" : "rgba(0,229,255,0.08)",
        color: isAdmin ? "var(--neon-orange)" : "var(--neon-cyan)",
        border: isAdmin
          ? "1px solid rgba(255,107,44,0.25)"
          : "1px solid rgba(0,229,255,0.15)",
      }}
    >
      {role}
    </span>
  );
}

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: "var(--text-dim)" }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 rounded-lg text-[15px] outline-none transition-colors"
        style={{
          background: "rgba(0,0,0,0.3)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-fira-code)",
        }}
      />
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="w-full max-w-md mx-4 rounded-xl p-6"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,14,24,0.98) 0%, rgba(6,8,13,0.98) 100%)",
          border: "1px solid rgba(255,58,92,0.2)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="text-[15px] font-bold tracking-[0.1em] uppercase mb-2"
          style={{
            color: "var(--neon-red)",
            fontFamily: "var(--font-orbitron)",
          }}
        >
          {title}
        </div>
        <p
          className="text-[15px] mb-6"
          style={{ color: "var(--text-secondary)" }}
        >
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-[14px] font-bold tracking-wider transition-colors"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-[14px] font-bold tracking-wider transition-colors"
            style={{
              background: "rgba(255,58,92,0.15)",
              border: "1px solid rgba(255,58,92,0.3)",
              color: "var(--neon-red)",
            }}
          >
            DELETE
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* Wraps create and edit workflows in a shared modal shell with consistent chrome and actions. */

function ModalForm({
  title,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg mx-4 rounded-xl"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,14,24,0.98) 0%, rgba(6,8,13,0.98) 100%)",
          border: "1px solid rgba(0,229,255,0.15)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <span
            className="text-[14px] font-bold tracking-[0.12em] uppercase"
            style={{
              color: "var(--neon-cyan)",
              fontFamily: "var(--font-orbitron)",
            }}
          >
            {title}
          </span>
          <button onClick={onClose} style={{ color: "var(--text-dim)" }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
        <div
          className="flex justify-end gap-3 px-5 py-3"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[14px] font-bold tracking-wider"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            CANCEL
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 rounded-lg text-[14px] font-bold tracking-wider"
            style={{
              background: "var(--neon-cyan-dim)",
              border: "1px solid rgba(0,229,255,0.3)",
              color: "var(--neon-cyan)",
            }}
          >
            SAVE
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-[12px] font-bold tracking-[0.12em] uppercase mb-1.5"
        style={{ color: "var(--text-dim)", fontFamily: "var(--font-orbitron)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function FormInput({
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg text-[15px] outline-none"
      style={{
        background: "rgba(0,0,0,0.4)",
        border: "1px solid var(--border-subtle)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-fira-code)",
      }}
    />
  );
}

function FormNumberInput({
  value,
  onChange,
  placeholder,
  step = 1,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: number;
}) {
  const adjust = (delta: number) => {
    const current = parseInt(value, 10) || 0;
    onChange(String(current + delta));
  };

  return (
    <div className="relative flex items-center">
      <style>{`
        .sci-number-input::-webkit-outer-spin-button,
        .sci-number-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .sci-number-input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="sci-number-input w-full pl-3 pr-16 py-2 rounded-lg text-[15px] outline-none"
        style={{
          background: "rgba(0,0,0,0.4)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-fira-code)",
        }}
      />
      <div className="absolute right-1 flex flex-col gap-[2px]">
        <button
          type="button"
          onClick={() => adjust(step)}
          className="flex items-center justify-center w-6 h-[14px] rounded transition-all duration-150"
          style={{
            background: "rgba(0,229,255,0.08)",
            border: "1px solid rgba(0,229,255,0.2)",
            color: "var(--neon-cyan)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0,229,255,0.2)";
            e.currentTarget.style.borderColor = "rgba(0,229,255,0.5)";
            e.currentTarget.style.boxShadow = "0 0 6px rgba(0,229,255,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(0,229,255,0.08)";
            e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
            <path
              d="M1 4L4 1L7 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => adjust(-step)}
          className="flex items-center justify-center w-6 h-[14px] rounded transition-all duration-150"
          style={{
            background: "rgba(0,229,255,0.08)",
            border: "1px solid rgba(0,229,255,0.2)",
            color: "var(--neon-cyan)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0,229,255,0.2)";
            e.currentTarget.style.borderColor = "rgba(0,229,255,0.5)";
            e.currentTarget.style.boxShadow = "0 0 6px rgba(0,229,255,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(0,229,255,0.08)";
            e.currentTarget.style.borderColor = "rgba(0,229,255,0.2)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
            <path
              d="M1 1L4 4L7 1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function FormTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 rounded-lg text-[15px] outline-none resize-none"
      style={{
        background: "rgba(0,0,0,0.4)",
        border: "1px solid var(--border-subtle)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-fira-code)",
      }}
    />
  );
}

/* Coordinates admin data loading, mutations, filters, and modal state for all management tabs. */

export default function AdminDashboard() {
  const { isAuthenticated, user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Tracks which destructive or editing dialogs are open so the dashboard can coordinate mutations safely.
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editPost, setEditPost] = useState<AdminPost | null>(null);
  const [editComment, setEditComment] = useState<AdminComment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: string;
    id: string;
    name: string;
  } | null>(null);

  // Holds the draft values for the create-user form before submission.
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("user");

  // Holds the currently edited user fields so the modal can patch an existing record.
  const [editFormName, setEditFormName] = useState("");
  const [editFormEmail, setEditFormEmail] = useState("");
  const [editFormRole, setEditFormRole] = useState("user");
  const [editFormPoints, setEditFormPoints] = useState("");
  const [editFormTitle, setEditFormTitle] = useState("");
  const [editFormBody, setEditFormBody] = useState("");

  const [error, setError] = useState<string | null>(null);

  /* Loads each admin dataset from its matching API endpoint and keeps the local tables in sync. */

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      console.error("Fetch users error:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/posts");
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();
      setPosts(data.posts);
    } catch (err) {
      console.error("Fetch posts error:", err);
      setError("Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/comments");
      if (!res.ok) throw new Error("Failed to fetch comments");
      const data = await res.json();
      setComments(data.comments);
    } catch (err) {
      console.error("Fetch comments error:", err);
      setError("Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetches all record types on first render so the summary cards can show complete counts immediately.
  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin" || initialFetchDone.current)
      return;
    initialFetchDone.current = true;
    fetchUsers();
    fetchPosts();
    fetchComments();
  }, [isAuthenticated, user?.role, fetchUsers, fetchPosts, fetchComments]);

  // Refreshes only the active tab after a tab change so the visible table stays current without refetching everything.
  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") return;
    if (activeTab === "users") fetchUsers();
    else if (activeTab === "posts") fetchPosts();
    else if (activeTab === "comments") fetchComments();
  }, [
    activeTab,
    isAuthenticated,
    user?.role,
    fetchUsers,
    fetchPosts,
    fetchComments,
  ]);

  /* Applies create, update, role-change, and delete mutations against the admin APIs. */

  const handleCreateUser = async () => {
    if (!formName || !formEmail || !formPassword) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create user");
        return;
      }
      setShowCreateUser(false);
      setFormName("");
      setFormEmail("");
      setFormPassword("");
      setFormRole("user");
      fetchUsers();
    } catch {
      setError("Failed to create user");
    }
  };

  const handleEditUser = async () => {
    if (!editUser) return;
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFormName,
          email: editFormEmail,
          role: editFormRole,
          ...(editFormPoints !== "" && {
            points: parseInt(editFormPoints, 10),
          }),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update user");
        return;
      }
      setEditUser(null);
      fetchUsers();
    } catch {
      setError("Failed to update user");
    }
  };

  const handleEditPost = async () => {
    if (!editPost) return;
    try {
      const res = await fetch(`/api/admin/posts/${editPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editFormTitle, body: editFormBody }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update post");
        return;
      }
      setEditPost(null);
      fetchPosts();
    } catch {
      setError("Failed to update post");
    }
  };

  const handleEditComment = async () => {
    if (!editComment) return;
    try {
      const res = await fetch(`/api/admin/comments/${editComment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editFormBody }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update comment");
        return;
      }
      setEditComment(null);
      fetchComments();
    } catch {
      setError("Failed to update comment");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    try {
      const res = await fetch(`/api/admin/${type}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete");
        return;
      }
      setDeleteConfirm(null);
      if (type === "users") fetchUsers();
      else if (type === "posts") fetchPosts();
      else if (type === "comments") fetchComments();
    } catch {
      setError("Failed to delete");
    }
  };

  /* Prevents non-admin users from seeing the management interface. */

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="h-full flex items-center justify-center">
        <div
          className="text-center rounded-xl p-8"
          style={{
            background: "rgba(255,58,92,0.06)",
            border: "1px solid rgba(255,58,92,0.15)",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mx-auto mb-4"
            style={{ color: "var(--neon-red)" }}
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2
            className="text-lg font-bold tracking-wider uppercase mb-2"
            style={{
              color: "var(--neon-red)",
              fontFamily: "var(--font-orbitron)",
            }}
          >
            ACCESS DENIED
          </h2>
          <p className="text-[15px]" style={{ color: "var(--text-dim)" }}>
            Administrator privileges required
          </p>
        </div>
      </div>
    );
  }

  /* Derives the search-filtered table rows shown in the active tab. */

  const q = search.toLowerCase();
  const filteredUsers = users.filter(
    (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  );
  const filteredPosts = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.authorName.toLowerCase().includes(q)
  );
  const filteredComments = comments.filter(
    (c) =>
      c.body.toLowerCase().includes(q) || c.authorName.toLowerCase().includes(q)
  );

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "users", label: "USERS", count: users.length },
    { id: "posts", label: "POSTS", count: posts.length },
    { id: "comments", label: "COMMENTS", count: comments.length },
  ];

  return (
    <div className="min-h-full p-4 md:p-6">
      <motion.div
        className="max-w-7xl mx-auto space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Introduces the dashboard and provides the primary action for creating a new user. */}
        <div className="flex items-center gap-3">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ color: "var(--neon-orange)" }}
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <h1
            className="text-xl font-bold tracking-[0.15em] uppercase"
            style={{
              fontFamily: "var(--font-orbitron)",
              color: "var(--text-primary)",
            }}
          >
            ADMIN CONTROL
          </h1>
        </div>

        {/* Surfaces API failures near the top of the page so administrative actions fail loudly. */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-between px-4 py-2.5 rounded-lg"
              style={{
                background: "rgba(255,58,92,0.1)",
                border: "1px solid rgba(255,58,92,0.25)",
              }}
            >
              <span
                className="text-[15px]"
                style={{ color: "var(--neon-red)" }}
              >
                {error}
              </span>
              <button
                onClick={() => setError(null)}
                style={{ color: "var(--neon-red)" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summarizes the loaded counts for users, posts, and comments. */}
        <div className="flex flex-wrap gap-3">
          <StatCard
            label="Total Users"
            value={users.length}
            color="var(--neon-cyan)"
          />
          <StatCard
            label="Total Posts"
            value={posts.length}
            color="var(--neon-orange)"
          />
          <StatCard
            label="Total Comments"
            value={comments.length}
            color="var(--neon-purple)"
          />
        </div>

        {/* Combines tab selection with context-aware search over the active dataset. */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearch("");
                }}
                className="relative px-4 py-2 rounded-lg text-[14px] font-bold tracking-[0.1em] transition-colors"
                style={{
                  background:
                    activeTab === tab.id
                      ? "var(--neon-cyan-dim)"
                      : "transparent",
                  color:
                    activeTab === tab.id
                      ? "var(--neon-cyan)"
                      : "var(--text-dim)",
                  border:
                    activeTab === tab.id
                      ? "1px solid rgba(0,229,255,0.2)"
                      : "1px solid transparent",
                  fontFamily: "var(--font-orbitron)",
                }}
              >
                {tab.label}
                <span
                  className="ml-2 text-[12px] px-1.5 py-0.5 rounded"
                  style={{
                    background:
                      activeTab === tab.id
                        ? "rgba(0,229,255,0.15)"
                        : "rgba(255,255,255,0.05)",
                    fontFamily: "var(--font-fira-code)",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex-1 w-full sm:w-auto sm:max-w-xs ml-auto">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={
                activeTab === "users"
                  ? "Search by name or email..."
                  : activeTab === "posts"
                    ? "Search by title or author..."
                    : "Search by content or author..."
              }
            />
          </div>
          {activeTab === "users" && (
            <button
              onClick={() => {
                setFormName("");
                setFormEmail("");
                setFormPassword("");
                setFormRole("user");
                setShowCreateUser(true);
              }}
              className="px-4 py-2 rounded-lg text-[14px] font-bold tracking-wider shrink-0"
              style={{
                background: "var(--neon-cyan-dim)",
                border: "1px solid rgba(0,229,255,0.3)",
                color: "var(--neon-cyan)",
                fontFamily: "var(--font-orbitron)",
              }}
            >
              + CREATE USER
            </button>
          )}
        </div>

        {/* Replaces table content with a loading state while the dashboard is waiting on data. */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <motion.div
              className="w-8 h-8 rounded-full"
              style={{
                border: "2px solid var(--neon-cyan)",
                borderTopColor: "transparent",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        )}

        {/* Switches between the three admin data tables based on the active tab. */}
        {!loading && (
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "rgba(6,8,13,0.5)",
              border: "1px solid var(--border-subtle)",
              backdropFilter: "blur(8px)",
            }}
          >
            {/* Lists users with role management and edit or delete actions. */}
            {activeTab === "users" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr
                      style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    >
                      {[
                        "",
                        "Name",
                        "Email",
                        "Role",
                        "Points",
                        "Posts",
                        "Comments",
                        "Joined",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-[12px] font-bold tracking-[0.12em] uppercase"
                          style={{
                            color: "var(--text-dim)",
                            fontFamily: "var(--font-orbitron)",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="transition-colors"
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.03)",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(0,229,255,0.03)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <td className="px-4 py-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold"
                            style={{
                              background:
                                u.role === "admin"
                                  ? "rgba(255,107,44,0.12)"
                                  : "var(--neon-cyan-dim)",
                              color:
                                u.role === "admin"
                                  ? "var(--neon-orange)"
                                  : "var(--neon-cyan)",
                              border:
                                u.role === "admin"
                                  ? "1px solid rgba(255,107,44,0.25)"
                                  : "1px solid rgba(0,229,255,0.2)",
                              fontFamily: "var(--font-orbitron)",
                            }}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        </td>
                        <td
                          className="px-4 py-3 text-[15px]"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {u.name}
                        </td>
                        <td
                          className="px-4 py-3 text-[14px]"
                          style={{
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          {u.email}
                        </td>
                        <td className="px-4 py-3">
                          <RoleBadge role={u.role} />
                        </td>
                        <td
                          className="px-4 py-3 text-[15px]"
                          style={{
                            color: "var(--neon-cyan)",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          {u.points}
                        </td>
                        <td
                          className="px-4 py-3 text-[15px]"
                          style={{
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          {u.postCount}
                        </td>
                        <td
                          className="px-4 py-3 text-[15px]"
                          style={{
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          {u.commentCount}
                        </td>
                        <td
                          className="px-4 py-3 text-[14px]"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditUser(u);
                                setEditFormName(u.name);
                                setEditFormEmail(u.email);
                                setEditFormRole(u.role);
                                setEditFormPoints(String(u.points));
                              }}
                              className="px-2.5 py-1 rounded text-[13px] font-bold tracking-wider transition-colors"
                              style={{
                                background: "rgba(0,229,255,0.08)",
                                color: "var(--neon-cyan)",
                                border: "1px solid rgba(0,229,255,0.15)",
                              }}
                            >
                              EDIT
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  type: "users",
                                  id: u.id,
                                  name: u.name,
                                })
                              }
                              className="px-2.5 py-1 rounded text-[13px] font-bold tracking-wider transition-colors"
                              style={{
                                background: "rgba(255,58,92,0.08)",
                                color: "var(--neon-red)",
                                border: "1px solid rgba(255,58,92,0.15)",
                              }}
                            >
                              DEL
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-12 text-center text-[15px]"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {search
                            ? "No users match your search"
                            : "No users found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Lists posts so moderators can inspect authorship, engagement, and removal actions. */}
            {activeTab === "posts" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr
                      style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    >
                      {[
                        "Title",
                        "Author",
                        "Tags",
                        "Votes",
                        "Comments",
                        "Created",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-[12px] font-bold tracking-[0.12em] uppercase"
                          style={{
                            color: "var(--text-dim)",
                            fontFamily: "var(--font-orbitron)",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPosts.map((p) => (
                      <tr
                        key={p.id}
                        className="transition-colors"
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.03)",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(0,229,255,0.03)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <td
                          className="px-4 py-3 text-[15px] max-w-[200px]"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {truncate(p.title, 40)}
                        </td>
                        <td
                          className="px-4 py-3 text-[14px]"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {p.authorName}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {p.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 rounded text-[12px]"
                                style={{
                                  background: "rgba(180,74,255,0.08)",
                                  color: "var(--neon-purple)",
                                  border: "1px solid rgba(180,74,255,0.15)",
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td
                          className="px-4 py-3 text-[14px]"
                          style={{ fontFamily: "var(--font-fira-code)" }}
                        >
                          <span style={{ color: "var(--neon-green)" }}>
                            {p.supportCount}
                          </span>
                          <span style={{ color: "var(--text-dim)" }}>/</span>
                          <span style={{ color: "var(--neon-red)" }}>
                            {p.opposeCount}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 text-[15px]"
                          style={{
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          {p.commentCount}
                        </td>
                        <td
                          className="px-4 py-3 text-[14px]"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {formatDate(p.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditPost(p);
                                setEditFormTitle(p.title);
                                setEditFormBody(p.body);
                              }}
                              className="px-2.5 py-1 rounded text-[13px] font-bold tracking-wider transition-colors"
                              style={{
                                background: "rgba(0,229,255,0.08)",
                                color: "var(--neon-cyan)",
                                border: "1px solid rgba(0,229,255,0.15)",
                              }}
                            >
                              EDIT
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  type: "posts",
                                  id: p.id,
                                  name: p.title,
                                })
                              }
                              className="px-2.5 py-1 rounded text-[13px] font-bold tracking-wider transition-colors"
                              style={{
                                background: "rgba(255,58,92,0.08)",
                                color: "var(--neon-red)",
                                border: "1px solid rgba(255,58,92,0.15)",
                              }}
                            >
                              DEL
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredPosts.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-12 text-center text-[15px]"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {search
                            ? "No posts match your search"
                            : "No posts found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Lists comments for moderation together with their parent post context. */}
            {activeTab === "comments" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr
                      style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    >
                      {[
                        "Comment",
                        "Author",
                        "Post",
                        "Votes",
                        "Created",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-[12px] font-bold tracking-[0.12em] uppercase"
                          style={{
                            color: "var(--text-dim)",
                            fontFamily: "var(--font-orbitron)",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComments.map((c) => (
                      <tr
                        key={c.id}
                        className="transition-colors"
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.03)",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(0,229,255,0.03)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <td
                          className="px-4 py-3 text-[15px] max-w-[250px]"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {truncate(c.body, 60)}
                        </td>
                        <td
                          className="px-4 py-3 text-[14px]"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {c.authorName}
                        </td>
                        <td
                          className="px-4 py-3 text-[14px] max-w-[150px]"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {truncate(c.postTitle, 30)}
                        </td>
                        <td
                          className="px-4 py-3 text-[14px]"
                          style={{ fontFamily: "var(--font-fira-code)" }}
                        >
                          <span style={{ color: "var(--neon-green)" }}>
                            {c.supportCount}
                          </span>
                          <span style={{ color: "var(--text-dim)" }}>/</span>
                          <span style={{ color: "var(--neon-red)" }}>
                            {c.opposeCount}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 text-[14px]"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {formatDate(c.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditComment(c);
                                setEditFormBody(c.body);
                              }}
                              className="px-2.5 py-1 rounded text-[13px] font-bold tracking-wider transition-colors"
                              style={{
                                background: "rgba(0,229,255,0.08)",
                                color: "var(--neon-cyan)",
                                border: "1px solid rgba(0,229,255,0.15)",
                              }}
                            >
                              EDIT
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  type: "comments",
                                  id: c.id,
                                  name: truncate(c.body, 30),
                                })
                              }
                              className="px-2.5 py-1 rounded text-[13px] font-bold tracking-wider transition-colors"
                              style={{
                                background: "rgba(255,58,92,0.08)",
                                color: "var(--neon-red)",
                                border: "1px solid rgba(255,58,92,0.15)",
                              }}
                            >
                              DEL
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredComments.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-12 text-center text-[15px]"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {search
                            ? "No comments match your search"
                            : "No comments found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Mounts the create, edit, and confirm dialogs only when their corresponding state is active. */}
      <AnimatePresence>
        {showCreateUser && (
          <ModalForm
            title="Create User"
            onClose={() => setShowCreateUser(false)}
            onSubmit={handleCreateUser}
          >
            <FormField label="Name">
              <FormInput
                value={formName}
                onChange={setFormName}
                placeholder="Full name"
              />
            </FormField>
            <FormField label="Email">
              <FormInput
                value={formEmail}
                onChange={setFormEmail}
                type="email"
                placeholder="user@example.com"
              />
            </FormField>
            <FormField label="Password">
              <FormInput
                value={formPassword}
                onChange={setFormPassword}
                type="password"
                placeholder="Min 6 characters"
              />
            </FormField>
            <FormField label="Role">
              <FormRoleSelect value={formRole} onChange={setFormRole} />
            </FormField>
          </ModalForm>
        )}

        {editUser && (
          <ModalForm
            title="Edit User"
            onClose={() => setEditUser(null)}
            onSubmit={handleEditUser}
          >
            <FormField label="Name">
              <FormInput
                value={editFormName}
                onChange={setEditFormName}
                placeholder="Full name"
              />
            </FormField>
            <FormField label="Email">
              <FormInput
                value={editFormEmail}
                onChange={setEditFormEmail}
                type="email"
                placeholder="user@example.com"
              />
            </FormField>
            <FormField label="Role">
              <FormRoleSelect value={editFormRole} onChange={setEditFormRole} />
            </FormField>
            <FormField label="Points (balance)">
              <FormNumberInput
                value={editFormPoints}
                onChange={setEditFormPoints}
                placeholder="0"
                step={10}
              />
            </FormField>
          </ModalForm>
        )}

        {editPost && (
          <ModalForm
            title="Edit Post"
            onClose={() => setEditPost(null)}
            onSubmit={handleEditPost}
          >
            <FormField label="Title">
              <FormInput
                value={editFormTitle}
                onChange={setEditFormTitle}
                placeholder="Post title"
              />
            </FormField>
            <FormField label="Body">
              <FormTextarea
                value={editFormBody}
                onChange={setEditFormBody}
                placeholder="Post content"
                rows={6}
              />
            </FormField>
          </ModalForm>
        )}

        {editComment && (
          <ModalForm
            title="Edit Comment"
            onClose={() => setEditComment(null)}
            onSubmit={handleEditComment}
          >
            <FormField label="Body">
              <FormTextarea
                value={editFormBody}
                onChange={setEditFormBody}
                placeholder="Comment content"
                rows={4}
              />
            </FormField>
          </ModalForm>
        )}

        {deleteConfirm && (
          <ConfirmDialog
            title="Confirm Deletion"
            message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
            onConfirm={handleDelete}
            onCancel={() => setDeleteConfirm(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

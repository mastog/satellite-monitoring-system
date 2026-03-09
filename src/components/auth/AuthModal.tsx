"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Renders the modal used for both sign-in and account creation flows.
export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const { login, register, isLoading, error, clearError } = useAuthStore();

  // Submits the active auth form and closes the modal only after the store
  // reports a successful authenticated state.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      await login(email, password);
    } else {
      await register(email, password, name);
    }
    // Re-reads store state after the async auth call so the modal only closes
    // when authentication actually succeeded.
    const state = useAuthStore.getState();
    if (state.isAuthenticated) {
      setEmail("");
      setPassword("");
      setName("");
      onClose();
    }
  };

  // Switches between login and registration modes while clearing stale errors.
  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    clearError();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Darkens and blurs the page behind the auth form. */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: "rgba(6,8,13,0.85)",
              backdropFilter: "blur(8px)",
            }}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Hosts the full authentication form and its mode switcher. */}
          <motion.div
            className="relative glass-panel w-full max-w-md mx-4"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Draws the top accent line that identifies the modal as an active panel. */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background:
                  "linear-gradient(90deg, var(--neon-cyan), var(--holo-purple))",
              }}
            />

            <div className="p-6">
              {/* Displays the current auth mode and the dismiss action. */}
              <div className="flex items-center justify-between mb-6">
                <h2
                  className="text-base font-bold tracking-[0.2em] text-glow-cyan"
                  style={{ fontFamily: "var(--font-orbitron)" }}
                >
                  {mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
                </h2>
                <button
                  onClick={onClose}
                  className="text-sm opacity-50 hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-secondary)" }}
                >
                  [ESC]
                </button>
              </div>

              {/* Lets the user swap between login and registration without leaving the modal. */}
              <div
                className="flex gap-1 p-1 rounded-lg mb-6"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {(["login", "register"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setMode(tab);
                      clearError();
                    }}
                    className="flex-1 py-2 rounded-md text-[14px] font-bold tracking-[0.12em] uppercase transition-all"
                    style={{
                      background:
                        mode === tab ? "var(--neon-cyan-dim)" : "transparent",
                      color:
                        mode === tab ? "var(--neon-cyan)" : "var(--text-dim)",
                      border:
                        mode === tab
                          ? "1px solid rgba(0,229,255,0.2)"
                          : "1px solid transparent",
                    }}
                  >
                    {tab === "login" ? "LOGIN" : "REGISTER"}
                  </button>
                ))}
              </div>

              {/* Collects the credential fields required for the active auth mode. */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {mode === "register" && (
                    <motion.div
                      key="name"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <label
                        className="block text-[14px] font-bold tracking-[0.12em] uppercase mb-1.5"
                        style={{ color: "var(--text-dim)" }}
                      >
                        NAME
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your display name"
                        required={mode === "register"}
                        className="w-full px-3 py-2.5 rounded-lg text-[14px] bg-transparent outline-none transition-colors"
                        style={{
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-exo2)",
                          caretColor: "var(--neon-cyan)",
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label
                    className="block text-[14px] font-bold tracking-[0.12em] uppercase mb-1.5"
                    style={{ color: "var(--text-dim)" }}
                  >
                    EMAIL
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@sms.io"
                    required
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] bg-transparent outline-none transition-colors"
                    style={{
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-exo2)",
                      caretColor: "var(--neon-cyan)",
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-[14px] font-bold tracking-[0.12em] uppercase mb-1.5"
                    style={{ color: "var(--text-dim)" }}
                  >
                    PASSWORD
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] bg-transparent outline-none transition-colors"
                    style={{
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-exo2)",
                      caretColor: "var(--neon-cyan)",
                    }}
                  />
                </div>

                {/* Surfaces the latest auth error returned by the store. */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-[15px] p-2.5 rounded-lg"
                      style={{
                        background: "var(--neon-red-dim)",
                        border: "1px solid rgba(255,58,92,0.3)",
                        color: "var(--neon-red)",
                      }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="cyber-btn w-full !py-3 !text-[15px]"
                  style={{
                    opacity: isLoading ? 0.6 : 1,
                  }}
                >
                  {isLoading
                    ? "PROCESSING..."
                    : mode === "login"
                      ? "AUTHENTICATE"
                      : "CREATE ACCOUNT"}
                </button>
              </form>

              {/* Switch prompt */}
              <div className="mt-4 text-center">
                <span
                  className="text-[14px]"
                  style={{ color: "var(--text-dim)" }}
                >
                  {mode === "login" ? "No account? " : "Already registered? "}
                </span>
                <button
                  onClick={switchMode}
                  className="text-[14px] font-bold"
                  style={{ color: "var(--neon-cyan)" }}
                >
                  {mode === "login" ? "Register" : "Sign In"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

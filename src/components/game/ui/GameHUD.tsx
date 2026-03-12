"use client";

import { motion } from "framer-motion";
import type { GameStats } from "../engine/GameCanvas";
import { getUpgrade, type UpgradeId } from "@/lib/game/upgrades";

interface GameHUDProps {
  stats: GameStats | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const RARITY_BORDERS: Record<string, string> = {
  common: "rgba(255,255,255,0.15)",
  uncommon: "rgba(57,255,127,0.35)",
  rare: "rgba(0,229,255,0.45)",
  legendary: "rgba(255,107,239,0.6)",
};

const RARITY_BG: Record<string, string> = {
  common: "rgba(255,255,255,0.03)",
  uncommon: "rgba(57,255,127,0.06)",
  rare: "rgba(0,229,255,0.08)",
  legendary: "rgba(255,107,239,0.10)",
};

export default function GameHUD({ stats }: GameHUDProps) {
  const isGuarded = (stats?.invincibleFrames ?? 0) > 0;

  if (!stats) return null;

  const hpPct = stats.maxHp > 0 ? stats.hp / stats.maxHp : 0;
  const xpPct = stats.xpNeeded > 0 ? stats.xp / stats.xpNeeded : 0;
  const hpColor =
    hpPct > 0.5 ? "#39ff7f" : hpPct > 0.25 ? "#ffcc00" : "#ff3a8c";
  const guardPct = stats.guard?.pct ?? 0;
  const guardAccum = stats.guard?.accum ?? 0;
  const guardThreshold = stats.guard?.threshold ?? 1;

  const guardColor = isGuarded
    ? "#7fd8ff"
    : guardPct > 0.8
      ? "#7fd8ff"
      : guardPct > 0.45
        ? "#52b7ff"
        : "rgba(127,216,255,0.55)";

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        pointerEvents: "none",
        userSelect: "none",
        fontFamily: "var(--font-fira-code)",
      }}
    >
      {/* FPS — top-right */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 12,
          fontSize: 11,
          color: "rgba(138,155,189,0.35)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {stats.fps}
      </div>

      {/* ═══ LEFT COLUMN: Time/Score → HP/XP → Skills ═══ */}
      <div
        style={{
          position: "absolute",
          left: 12,
          top: 12,
          bottom: 96,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minHeight: 0,
          maxHeight: "none",
          overflowY: "auto",
          width: 190,
        }}
      >
        {/* ── Time / Score header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            padding: "4px 6px",
            background: "rgba(6,8,13,0.6)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 4,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-orbitron)",
              fontSize: 14,
              fontWeight: 700,
              color: "#e4eaf4",
              letterSpacing: "0.04em",
            }}
          >
            {formatTime(stats.time)}
          </span>
          <span
            style={{
              fontFamily: "var(--font-fira-code)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--accent)",
              opacity: 0.85,
            }}
          >
            {stats.score.toLocaleString()}
          </span>
        </div>

        {/* ═══ HP / XP — above skills ═══ */}

        {/* HP */}
        <div
          style={{
            padding: "4px 6px",
            background: isGuarded
              ? "linear-gradient(180deg, rgba(14,24,34,0.72), rgba(6,8,13,0.64))"
              : "rgba(6,8,13,0.55)",
            border: isGuarded
              ? "1px solid rgba(127,216,255,0.45)"
              : "1px solid rgba(255,255,255,0.06)",
            borderRadius: 4,
            boxShadow: isGuarded ? "0 0 18px rgba(127,216,255,0.2)" : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 3,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-orbitron)",
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.2em",
                color: `${hpColor}99`,
                textTransform: "uppercase" as const,
              }}
            >
              HULL
            </span>
            <span
              style={{
                fontFamily: "var(--font-fira-code)",
                fontSize: 11,
                fontWeight: 700,
                color: hpColor,
                textShadow: `0 0 6px ${hpColor}44`,
              }}
            >
              {Math.ceil(stats.hp)}
              <span style={{ fontWeight: 400, fontSize: 9, opacity: 0.35 }}>
                /{Math.ceil(stats.maxHp)}
              </span>
            </span>
          </div>
          <div
            style={{
              position: "relative",
              height: 8,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <motion.div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                minWidth: 1,
                borderRadius: 1,
                background: `linear-gradient(90deg, ${hpColor}20, ${hpColor}bb, ${hpColor})`,
                boxShadow: `0 0 10px ${hpColor}55, inset 0 1px 0 rgba(255,255,255,0.2)`,
              }}
              animate={{ width: `${hpPct * 100}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            />
            <motion.div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: 2,
                background: hpColor,
                boxShadow: `0 0 6px ${hpColor}`,
                borderRadius: 1,
              }}
              animate={{ left: `${Math.max(0, hpPct * 100 - 0.5)}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            />
            {[25, 50, 75].map((p) => (
              <div
                key={p}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${p}%`,
                  width: 1,
                  background: "rgba(0,0,0,0.4)",
                }}
              />
            ))}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.1) 1px, rgba(0,0,0,0.1) 2px)",
                pointerEvents: "none",
              }}
            />
            {isGuarded && (
              <motion.div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  width: "28%",
                  background:
                    "linear-gradient(90deg, transparent, rgba(127,216,255,0.5), transparent)",
                  mixBlendMode: "screen",
                }}
                animate={{ left: ["-30%", "105%"] }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              />
            )}
            {isGuarded && (
              <motion.div
                style={{
                  position: "absolute",
                  inset: -1,
                  borderRadius: 2,
                  border: "1px solid rgba(200,245,255,0.95)",
                  boxShadow: "0 0 18px rgba(127,216,255,0.85)",
                }}
                animate={{ opacity: [0.2, 0.9, 0.2], scale: [1, 1.04, 1] }}
                transition={{
                  repeat: Infinity,
                  duration: 0.8,
                  ease: "easeInOut",
                }}
              />
            )}
          </div>
          <div style={{ marginTop: 4 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-orbitron)",
                  fontSize: 7,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase" as const,
                  color: isGuarded ? "#bfeeff" : "rgba(127,216,255,0.65)",
                }}
              >
                Impact Buffer
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: isGuarded ? "#dff6ff" : "rgba(127,216,255,0.62)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {Math.ceil(guardAccum)}/{Math.ceil(guardThreshold)}
              </span>
            </div>
            <div
              style={{
                position: "relative",
                height: 4,
                background: "rgba(127,216,255,0.08)",
                border: "1px solid rgba(127,216,255,0.18)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <motion.div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  minWidth: 1,
                  background: `linear-gradient(90deg, rgba(127,216,255,0.22), ${guardColor})`,
                  boxShadow: `0 0 8px ${guardColor}`,
                }}
                animate={{ width: `${guardPct * 100}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
              {isGuarded && (
                <motion.div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "repeating-linear-gradient(90deg, rgba(191,238,255,0.26) 0 8px, rgba(127,216,255,0.08) 8px 16px)",
                  }}
                  animate={{ backgroundPositionX: ["0px", "16px"] }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.5,
                    ease: "linear",
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* XP */}
        <div
          style={{
            padding: "4px 6px",
            background: "rgba(6,8,13,0.55)",
            border: "1px solid rgba(57,255,127,0.06)",
            borderRadius: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 3,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-orbitron)",
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.2em",
                color: "rgba(57,255,127,0.5)",
                textTransform: "uppercase" as const,
              }}
            >
              EXP
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
              <span
                style={{
                  fontFamily: "var(--font-fira-code)",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "rgba(57,255,127,0.6)",
                }}
              >
                {stats.xp}
                <span style={{ fontWeight: 400, fontSize: 9, opacity: 0.35 }}>
                  /{stats.xpNeeded}
                </span>
              </span>
              <span
                style={{
                  fontFamily: "var(--font-orbitron)",
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#39ff7f",
                  textShadow: "0 0 6px #39ff7f44",
                }}
              >
                LV{stats.level}
              </span>
            </div>
          </div>
          <div
            style={{
              position: "relative",
              height: 5,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(57,255,127,0.08)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <motion.div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                minWidth: 1,
                borderRadius: 1,
                background:
                  "linear-gradient(90deg, rgba(57,255,127,0.15), rgba(57,255,127,0.7))",
                boxShadow: "0 0 6px rgba(57,255,127,0.25)",
              }}
              animate={{ width: `${xpPct * 100}%` }}
              transition={{ type: "spring", stiffness: 150, damping: 20 }}
            />
          </div>
        </div>

        <div
          style={{
            height: 1,
            marginTop: 4,
            marginBottom: 2,
            background: "rgba(255,255,255,0.08)",
          }}
        />

        {/* ── Weapons ── */}
        {stats.weapons.map((w) => (
          <div
            key={w.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "2px 8px",
              borderRadius: 4,
              background: RARITY_BG[w.rarity] || RARITY_BG.common,
              border: `1px solid ${RARITY_BORDERS[w.rarity] || RARITY_BORDERS.common}`,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
                background: `${w.color}22`,
                color: w.color,
                fontFamily: "var(--font-orbitron)",
              }}
            >
              {w.icon}
            </div>
            <span
              style={{
                fontSize: 12,
                textTransform: "uppercase" as const,
                letterSpacing: "0.06em",
                color: w.color,
                maxWidth: 90,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap" as const,
              }}
            >
              {w.name}
            </span>
            <div
              style={{
                display: "flex",
                gap: 1,
                marginLeft: "auto",
                flexShrink: 0,
              }}
            >
              {Array.from({ length: w.maxLevel }, (_, i) => (
                <div
                  key={i}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 1,
                    background: i < w.level ? w.color : "rgba(255,255,255,0.1)",
                    boxShadow: i < w.level ? `0 0 3px ${w.color}66` : "none",
                  }}
                />
              ))}
            </div>
          </div>
        ))}

        {/* ── Synergies ── */}
        {stats.synergies && stats.synergies.length > 0 && (
          <>
            <div
              style={{
                height: 1,
                marginTop: 4,
                marginBottom: 2,
                background: "rgba(255,255,255,0.08)",
              }}
            />
            {stats.synergies.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: `${s.color}10`,
                  border: `1px solid ${s.color}40`,
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 700,
                    flexShrink: 0,
                    background: `${s.color}33`,
                    color: s.color,
                  }}
                >
                  +
                </div>
                <span
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    color: s.color,
                    maxWidth: 110,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  {s.name}
                </span>
              </div>
            ))}
          </>
        )}

        {/* ── Passives ── */}
        {stats.passives && stats.passives.length > 0 && (
          <>
            <div
              style={{
                height: 1,
                marginTop: 4,
                marginBottom: 2,
                background: "rgba(255,255,255,0.08)",
              }}
            />
            {stats.passives.map((p) => {
              const def = getUpgradeDef(p.id);
              if (!def) return null;
              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      fontWeight: 700,
                      flexShrink: 0,
                      background: `${def.color}22`,
                      color: def.color,
                    }}
                  >
                    {def.icon}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.06em",
                      color: def.color,
                      maxWidth: 90,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap" as const,
                    }}
                  >
                    {def.name}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: 1,
                      marginLeft: "auto",
                      flexShrink: 0,
                    }}
                  >
                    {Array.from({ length: def.maxLevel }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 1,
                          background:
                            i < p.level ? def.color : "rgba(255,255,255,0.08)",
                          boxShadow:
                            i < p.level ? `0 0 2px ${def.color}44` : "none",
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* ═══ BOTTOM-RIGHT: Mini Stats ═══ */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 2,
          fontVariantNumeric: "tabular-nums",
          fontSize: 13,
        }}
      >
        <span style={{ color: "rgba(138,155,189,0.65)" }}>
          ENEMIES: {stats.enemyCount}
        </span>
        <span style={{ color: "rgba(138,155,189,0.65)" }}>
          KILLS: {stats.kills}
        </span>
        <span style={{ color: "#ffcc00" }}>
          DEBRIS: {stats.debrisCollected}
        </span>
      </div>
    </div>
  );
}

function getUpgradeDef(
  id: string
): { name: string; icon: string; color: string; maxLevel: number } | null {
  try {
    const def = getUpgrade(id as UpgradeId);
    return def;
  } catch {
    return null;
  }
}

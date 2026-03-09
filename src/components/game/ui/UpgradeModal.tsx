"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { LevelUpChoice } from "../engine/GameCanvas";
import { SYNERGIES } from "@/lib/game/synergies";
import { getUpgrade } from "@/lib/game/upgrades";
import { getWeapon } from "@/lib/game/weapons";

interface EquippedWeapon {
  id: string;
  level: number;
}

interface UpgradeModalProps {
  choices: LevelUpChoice[];
  equippedWeapons: EquippedWeapon[];
  equippedPassives: { id: string; level: number }[];
  onChoose: (index: number) => void;
  onReroll: () => void;
  canReroll: boolean;
  visible: boolean;
}

type RarityKey = "common" | "uncommon" | "rare" | "legendary";

const rarityTheme: Record<
  RarityKey,
  {
    edge: string;
    glow: string;
    badgeBg: string;
    label: string;
  }
> = {
  common: {
    edge: "rgba(193, 210, 228, 0.45)",
    glow: "rgba(193, 210, 228, 0.15)",
    badgeBg: "rgba(193, 210, 228, 0.16)",
    label: "COMMON",
  },
  uncommon: {
    edge: "rgba(83, 255, 173, 0.62)",
    glow: "rgba(83, 255, 173, 0.2)",
    badgeBg: "rgba(83, 255, 173, 0.16)",
    label: "UNCOMMON",
  },
  rare: {
    edge: "rgba(75, 222, 255, 0.7)",
    glow: "rgba(75, 222, 255, 0.24)",
    badgeBg: "rgba(75, 222, 255, 0.18)",
    label: "RARE",
  },
  legendary: {
    edge: "rgba(255, 155, 81, 0.78)",
    glow: "rgba(255, 155, 81, 0.28)",
    badgeBg: "rgba(255, 155, 81, 0.2)",
    label: "LEGENDARY",
  },
};

interface PotentialSynergy {
  weaponA: { name: string; color: string; level: number; maxLevel: number };
  weaponB: { name: string; color: string; level: number; maxLevel: number };
  needA: number;
  needB: number;
  synergy: { name: string; description: string; color: string; id: string };
  isNew: boolean;
}

// Renders the level-up modal that presents upgrade choices, rarity styling,
// and potential synergy previews.
export default function UpgradeModal({
  choices,
  equippedWeapons,
  equippedPassives,
  onChoose,
  onReroll,
  canReroll,
  visible,
}: UpgradeModalProps) {
  const equippedIds = new Set(equippedWeapons.map((w) => w.id));
  const equippedLevelMap = new Map(equippedWeapons.map((w) => [w.id, w.level]));
  const passiveLevelMap = new Map(equippedPassives.map((p) => [p.id, p.level]));

  // Resolves the effective level state for a requirement after considering the
  // current choice being previewed.
  const requirementState = (
    req: { kind: "weapon" | "passive"; id: string; level: number },
    choice: LevelUpChoice,
    isNew: boolean
  ) => {
    if (req.kind === "weapon") {
      const def = getWeapon(req.id as never);
      const choiceLevel =
        choice.type === "weapon" && choice.id === req.id
          ? isNew
            ? 1
            : choice.level
          : equippedLevelMap.get(req.id) || 0;

      return {
        name: def.name,
        color: def.color,
        level: choiceLevel,
        maxLevel: def.maxLevel,
      };
    }

    const def = getUpgrade(req.id as never);
    const choiceLevel =
      choice.type === "passive" && choice.id === req.id
        ? choice.level
        : passiveLevelMap.get(req.id) || 0;

    return {
      name: def.name,
      color: def.color,
      level: choiceLevel,
      maxLevel: def.maxLevel,
    };
  };

  // Computes synergies that are already active so the modal only previews
  // combinations the current choices could newly advance toward.
  const activeSynergyIds = new Set(
    SYNERGIES.filter((syn) =>
      syn.requirements.every((req) => {
        if (req.kind === "weapon") {
          return (equippedLevelMap.get(req.id) || 0) >= req.level;
        }
        return (passiveLevelMap.get(req.id) || 0) >= req.level;
      })
    ).map((syn) => syn.id)
  );

  // Collects the potential synergies implied by the current set of choices.
  const seenSynergies = new Set<string>();
  const potentialSynergies: PotentialSynergy[] = [];

  for (const c of choices) {
    const isNew = c.type === "weapon" && !equippedIds.has(c.id);

    for (const syn of SYNERGIES.filter((s) =>
      s.requirements.some((req) => req.id === c.id)
    )) {
      if (activeSynergyIds.has(syn.id)) continue;

      const selfReq = syn.requirements.find((req) => req.id === c.id);
      const otherReq = syn.requirements.find((req) => req.id !== c.id);
      if (!selfReq || !otherReq) continue;

      const otherBaseOk =
        otherReq.kind === "weapon"
          ? equippedIds.has(otherReq.id)
          : (passiveLevelMap.get(otherReq.id) || 0) > 0;
      if (!otherBaseOk) continue;

      if (seenSynergies.has(syn.id)) continue;
      seenSynergies.add(syn.id);

      const reqA = syn.requirements[0];
      const reqB = syn.requirements[1];
      const stA = requirementState(reqA as never, c, isNew);
      const stB = requirementState(reqB as never, c, isNew);

      potentialSynergies.push({
        weaponA: stA,
        weaponB: stB,
        needA: reqA.level,
        needB: reqB.level,
        synergy: syn,
        isNew,
      });
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute inset-0 z-50 flex items-center justify-center px-4 py-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24 }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 120% at 50% 0%, rgba(255,146,74,0.2), rgba(25,16,44,0.78) 42%, rgba(5,8,18,0.9) 100%)",
              backdropFilter: "blur(7px)",
            }}
          />

          <motion.div
            className="relative z-10 w-full max-w-[940px] flex flex-col gap-3"
            initial={{ y: 20, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 16, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative z-10 flex flex-col gap-3">
              <header
                className="px-6 py-4 rounded-2xl"
                style={{
                  background:
                    "linear-gradient(145deg, rgba(45,28,66,0.82), rgba(20,30,52,0.82) 54%, rgba(43,24,38,0.82) 100%)",
                  boxShadow:
                    "0 10px 34px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p
                      className="text-[11px] uppercase tracking-[0.24em]"
                      style={{
                        color: "#8cc7e6",
                        fontFamily: "var(--font-fira-code)",
                      }}
                    >
                      Command Uplink
                    </p>
                    <h2
                      className="mt-1 text-[26px] uppercase tracking-[0.18em] font-bold"
                      style={{
                        color: "#ffe9d7",
                        fontFamily: "var(--font-orbitron)",
                      }}
                    >
                      Level Up Protocol
                    </h2>
                    <p
                      className="mt-1 text-[13px]"
                      style={{ color: "rgba(211,232,245,0.72)" }}
                    >
                      Choose one tactical module to load immediately.
                    </p>
                  </div>

                  <div
                    className="rounded-lg px-3 py-1.5 text-right"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255,147,98,0.18), rgba(91,214,255,0.16))",
                    }}
                  >
                    <div
                      className="text-[10px] uppercase tracking-[0.2em]"
                      style={{
                        color: "rgba(196,225,242,0.74)",
                        fontFamily: "var(--font-fira-code)",
                      }}
                    >
                      Upgrade Picks
                    </div>
                    <div
                      className="text-[18px] font-bold leading-none"
                      style={{ color: "#ffe9c8" }}
                    >
                      {choices.length}
                    </div>
                  </div>
                </div>
              </header>

              <section
                className="px-4 py-4 rounded-2xl"
                style={{
                  background:
                    "linear-gradient(150deg, rgba(24,18,42,0.78), rgba(19,26,44,0.78) 48%, rgba(31,18,34,0.8) 100%)",
                  boxShadow:
                    "0 10px 32px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-full min-h-0">
                  {/* Renders one upgrade card per offered choice with rarity, ownership, and description metadata. */}
                  {choices.map((choice, i) => {
                    const rarity = (choice.rarity || "common") as RarityKey;
                    const theme = rarityTheme[rarity] || rarityTheme.common;
                    const isNewWeapon =
                      choice.type === "weapon" && !equippedIds.has(choice.id);

                    return (
                      <motion.button
                        key={`${choice.id}-${i}`}
                        type="button"
                        onClick={() => onChoose(i)}
                        className="relative h-full min-h-[300px] rounded-xl text-left overflow-hidden"
                        style={{
                          background:
                            "linear-gradient(165deg, rgba(22,19,40,0.93), rgba(21,28,47,0.9) 45%, rgba(30,19,36,0.94) 100%)",
                          boxShadow: `0 12px 24px ${theme.glow}, inset 0 1px 0 rgba(255,255,255,0.07)`,
                        }}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.06, duration: 0.32 }}
                        whileHover={{
                          y: -7,
                          scale: 1.018,
                          rotate: i === 1 ? 0 : i === 0 ? -0.8 : 0.8,
                          boxShadow: `0 18px 34px ${theme.glow}, 0 0 0 1px ${choice.color}44 inset`,
                        }}
                        whileTap={{ scale: 0.986 }}
                      >
                        <div
                          className="absolute inset-x-0 top-0 h-[3px]"
                          style={{
                            background: `linear-gradient(90deg, ${choice.color}, transparent 86%)`,
                          }}
                        />
                        <div
                          className="absolute -top-7 -right-7 w-28 h-28 rounded-full pointer-events-none"
                          style={{
                            background: `radial-gradient(circle, ${choice.color}33 0%, transparent 72%)`,
                          }}
                        />
                        <div
                          className="absolute -left-8 bottom-[-24px] w-24 h-24 rounded-full pointer-events-none"
                          style={{
                            background: `radial-gradient(circle, ${choice.color}24 0%, transparent 70%)`,
                          }}
                        />

                        <div className="relative z-10 h-full p-4 flex flex-col">
                          <div className="flex items-start justify-between gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-[18px] font-bold"
                              style={{
                                color: choice.color,
                                background: `linear-gradient(160deg, ${choice.color}22, rgba(255,255,255,0.04))`,
                                fontFamily: "var(--font-orbitron)",
                              }}
                            >
                              {choice.icon}
                            </div>

                            <div className="flex flex-col items-end gap-1.5">
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.16em]"
                                style={{
                                  color: "#d3ecfb",
                                  background: theme.badgeBg,
                                }}
                              >
                                {theme.label}
                              </span>
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.16em]"
                                style={{
                                  color: isNewWeapon ? "#66ffbc" : choice.color,
                                  background: isNewWeapon
                                    ? "rgba(102,255,188,0.12)"
                                    : `${choice.color}15`,
                                }}
                              >
                                {isNewWeapon
                                  ? "NEW"
                                  : choice.type === "weapon"
                                    ? "WEAPON"
                                    : "PASSIVE"}
                              </span>
                            </div>
                          </div>

                          <h3
                            className="mt-2 text-[16px] leading-tight font-bold"
                            style={{ color: "#fff7ec" }}
                          >
                            {choice.name}
                          </h3>

                          <div className="mt-2 flex items-center gap-1.5">
                            {Array.from(
                              { length: choice.maxLevel },
                              (_, levelIndex) => (
                                <span
                                  key={levelIndex}
                                  className="h-1.5 rounded-full"
                                  style={{
                                    width: 16,
                                    background:
                                      levelIndex < choice.level
                                        ? choice.color
                                        : "rgba(255,255,255,0.16)",
                                    boxShadow:
                                      levelIndex < choice.level
                                        ? `0 0 10px ${choice.color}66`
                                        : "none",
                                  }}
                                />
                              )
                            )}
                          </div>

                          <p
                            className="mt-2 text-[12px] leading-[1.45] min-h-[78px]"
                            style={{ color: "rgba(238,233,247,0.84)" }}
                          >
                            {choice.description}
                          </p>

                          <div className="mt-auto pt-3 flex items-center justify-between">
                            <span
                              className="text-[11px] uppercase tracking-[0.16em]"
                              style={{
                                color: "rgba(184,215,234,0.72)",
                                fontFamily: "var(--font-fira-code)",
                              }}
                            >
                              Lv {choice.level}/{choice.maxLevel}
                            </span>
                            <span
                              className="text-[11px] uppercase tracking-[0.16em]"
                              style={{
                                color: choice.color,
                                fontFamily: "var(--font-fira-code)",
                                textShadow: `0 0 10px ${choice.color}66`,
                              }}
                            >
                              Select Module
                            </span>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </section>

              <footer
                className="px-6 py-3 rounded-2xl"
                style={{
                  minHeight: 118,
                  background:
                    "linear-gradient(135deg, rgba(35,24,46,0.78), rgba(25,30,43,0.74))",
                  boxShadow:
                    "0 10px 28px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex flex-col items-center">
                  <motion.button
                    type="button"
                    onClick={onReroll}
                    disabled={!canReroll}
                    className="px-4 py-2 rounded-lg text-[11px] uppercase tracking-[0.16em] font-bold"
                    style={{
                      color: canReroll ? "#fff4df" : "rgba(255,244,223,0.46)",
                      background: canReroll
                        ? "linear-gradient(135deg, rgba(255,150,96,0.44), rgba(68,188,255,0.36))"
                        : "rgba(34,30,48,0.8)",
                      boxShadow: canReroll
                        ? "0 0 0 1px rgba(255,255,255,0.08) inset, 0 0 20px rgba(255,176,119,0.32)"
                        : "none",
                      fontFamily: "var(--font-orbitron)",
                      cursor: canReroll ? "pointer" : "not-allowed",
                    }}
                    whileHover={canReroll ? { scale: 1.03 } : undefined}
                    whileTap={canReroll ? { scale: 0.98 } : undefined}
                  >
                    {canReroll ? "Reroll Choices" : "Reroll Spent"}
                  </motion.button>

                  <div className="w-full mt-2 min-h-[58px] flex items-center justify-center">
                    {potentialSynergies.length > 0 ? (
                      <motion.div
                        className="w-full max-w-[760px] rounded-lg px-3 py-2 text-center"
                        style={{
                          background:
                            "linear-gradient(120deg, rgba(255,156,96,0.22), rgba(90,204,255,0.2))",
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        {potentialSynergies.map((synergyItem, index) => {
                          const bothReady =
                            synergyItem.weaponA.level >= synergyItem.needA &&
                            synergyItem.weaponB.level >= synergyItem.needB;

                          return (
                            <div
                              key={`${synergyItem.synergy.id}-${index}`}
                              className={index > 0 ? "mt-2 pt-2" : ""}
                              style={
                                index > 0
                                  ? {
                                      borderTop:
                                        "1px solid rgba(255,153,92,0.18)",
                                    }
                                  : undefined
                              }
                            >
                              <p
                                className="text-[11px] uppercase tracking-[0.16em]"
                                style={{
                                  color: bothReady ? "#69ffc1" : "#ff9e67",
                                }}
                              >
                                {bothReady
                                  ? "Fusion Ready"
                                  : synergyItem.isNew
                                    ? "Fusion Potential"
                                    : "Fusion Progress"}
                              </p>
                              <p
                                className="mt-1 text-[12px] leading-tight"
                                style={{ color: "#d9eaf4" }}
                              >
                                <span
                                  style={{ color: synergyItem.weaponA.color }}
                                >
                                  {synergyItem.weaponA.name}
                                </span>
                                <span
                                  style={{ color: "rgba(197,220,235,0.72)" }}
                                >
                                  {" Lv "}
                                  {synergyItem.weaponA.level}/
                                  {synergyItem.weaponA.maxLevel}
                                </span>
                                {" + "}
                                <span
                                  style={{ color: synergyItem.weaponB.color }}
                                >
                                  {synergyItem.weaponB.name}
                                </span>
                                <span
                                  style={{ color: "rgba(197,220,235,0.72)" }}
                                >
                                  {" Lv "}
                                  {synergyItem.weaponB.level}/
                                  {synergyItem.weaponB.maxLevel}
                                </span>
                                {" -> "}
                                <span
                                  style={{ color: synergyItem.synergy.color }}
                                >
                                  {synergyItem.synergy.name}
                                </span>
                              </p>
                            </div>
                          );
                        })}
                      </motion.div>
                    ) : (
                      <p
                        className="text-[11px] uppercase tracking-[0.15em] text-center"
                        style={{
                          color: "rgba(174,203,222,0.58)",
                          fontFamily: "var(--font-fira-code)",
                        }}
                      >
                        No fusion path revealed in current choices.
                      </p>
                    )}
                  </div>
                </div>
              </footer>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

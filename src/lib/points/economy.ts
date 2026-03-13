import { prisma } from "@/lib/prisma";

// Defines the point rewards granted for the application's main contribution actions.
export const POINTS_ACHIEVEMENT = 25;
export const POINTS_VOTE = 1;
export const POINTS_POST = 5;
export const POINTS_COMMENT = 2;
export const POINTS_QUIZ_CORRECT = 5;

// Defines the point costs charged by the in-app shop and cosmetic unlock flows.
export const PRICE_MODEL = 50;
export const PRICE_DANCE = 30;

// Defines the cumulative score thresholds that map users to level names.
interface LevelDef {
  level: number;
  name: string;
  min: number;
}

const LEVEL_THRESHOLDS: LevelDef[] = [
  { level: 1, name: "Observer", min: 0 },
  { level: 2, name: "Analyst", min: 50 },
  { level: 3, name: "Specialist", min: 150 },
  { level: 4, name: "Expert", min: 300 },
  { level: 5, name: "Commander", min: 500 },
];

export function getLevel(totalEarned: number): {
  level: number;
  name: string;
  currentMin: number;
  nextThreshold: number | null;
} {
  // Selects the highest level whose minimum threshold is already satisfied.
  let current = LEVEL_THRESHOLDS[0];
  for (const t of LEVEL_THRESHOLDS) {
    if (totalEarned >= t.min) current = t;
  }
  const nextIdx =
    LEVEL_THRESHOLDS.findIndex((t) => t.level === current.level) + 1;
  const nextThreshold =
    nextIdx < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[nextIdx].min : null;
  return {
    level: current.level,
    name: current.name,
    currentMin: current.min,
    nextThreshold,
  };
}

export async function awardPoints(
  userId: string,
  amount: number,
  _reason: string
) {
  // Ignores non-positive values because they do not represent a valid award.
  if (amount <= 0) return;
  await prisma.user.update({
    where: { id: userId },
    data: {
      points: { increment: amount },
      totalEarned: { increment: amount },
    },
  });
}

export async function deductPoints(
  userId: string,
  amount: number,
  _reason: string
) {
  // Skips empty deductions.
  if (amount <= 0) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true },
  });
  if (!user) return;
  // Clamps the spendable balance at zero.
  await prisma.user.update({
    where: { id: userId },
    data: {
      points: Math.max(user.points - amount, 0),
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";
import { getWeapon, type WeaponId } from "@/lib/game/weapons";
import {
  STARTER_BASE_SKILLS,
  STARTER_DECRYPT_COST,
  normalizeStarterUnlocked,
  rollStarterReward,
} from "@/lib/game/starterProgress";
import { normalizeUnlockedSynergies } from "@/lib/game/synergies";

const ITEM_INTEL_FRAGMENT = "game_intel_fragment";
const ITEM_SKILL_UNLOCK = "game_skill_unlock";
const ITEM_SYNERGY_UNLOCK = "game_synergy_unlock";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user, purchases] = await Promise.all([
      prisma.user.findUnique({
        where: { id: authUser.id },
        select: { points: true },
      }),
      prisma.purchase.findMany({
        where: {
          userId: authUser.id,
          itemType: {
            in: [ITEM_INTEL_FRAGMENT, ITEM_SKILL_UNLOCK, ITEM_SYNERGY_UNLOCK],
          },
        },
        orderBy: { purchasedAt: "asc" },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const intelFragments = purchases.filter(
      (p) => p.itemType === ITEM_INTEL_FRAGMENT
    ).length;
    const unlockedSkillIds = normalizeStarterUnlocked(
      purchases
        .filter((p) => p.itemType === ITEM_SKILL_UNLOCK)
        .map((p) => p.itemId)
    );
    const unlockedSynergyIds = normalizeUnlockedSynergies(
      purchases
        .filter((p) => p.itemType === ITEM_SYNERGY_UNLOCK)
        .map((p) => p.itemId)
    );

    return NextResponse.json({
      points: user.points,
      intelFragments,
      unlockedSkillIds,
      unlockedSynergyIds,
      decryptCost: STARTER_DECRYPT_COST,
      baseSkills: STARTER_BASE_SKILLS,
    });
  } catch (err) {
    console.error("game/starter-skills GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const action = body?.action as string | undefined;
    if (action !== "grant_fragment" && action !== "decrypt") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (action === "grant_fragment") {
      await prisma.purchase.create({
        data: {
          userId: authUser.id,
          itemType: ITEM_INTEL_FRAGMENT,
          itemId:
            globalThis.crypto?.randomUUID?.() ||
            `${Date.now()}-${Math.random()}`,
          cost: 0,
        },
      });
      const intelFragments = await prisma.purchase.count({
        where: { userId: authUser.id, itemType: ITEM_INTEL_FRAGMENT },
      });
      return NextResponse.json({ success: true, intelFragments });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: authUser.id },
        select: { points: true },
      });
      if (!user) throw new Error("USER_NOT_FOUND");

      const fragments = await tx.purchase.findMany({
        where: { userId: authUser.id, itemType: ITEM_INTEL_FRAGMENT },
        orderBy: { purchasedAt: "asc" },
      });
      if (fragments.length <= 0) throw new Error("NO_FRAGMENT");
      if (user.points < STARTER_DECRYPT_COST)
        throw new Error("INSUFFICIENT_POINTS");

      const unlockRows = await tx.purchase.findMany({
        where: { userId: authUser.id, itemType: ITEM_SKILL_UNLOCK },
      });
      const unlockedSkillIds = normalizeStarterUnlocked(
        unlockRows.map((p) => p.itemId)
      );
      const reward = rollStarterReward(unlockedSkillIds);

      await tx.purchase.delete({ where: { id: fragments[0].id } });
      await tx.purchase.create({
        data: {
          userId: authUser.id,
          itemType: ITEM_SKILL_UNLOCK,
          itemId: reward.weaponId,
          cost: 0,
        },
      });

      const nextPoints = Math.max(0, user.points - STARTER_DECRYPT_COST);
      await tx.user.update({
        where: { id: authUser.id },
        data: { points: nextPoints },
      });

      const intelFragments = fragments.length - 1;
      const unlockedNext = normalizeStarterUnlocked([
        ...unlockedSkillIds,
        reward.weaponId,
      ]);
      const rewardWeapon = getWeapon(reward.weaponId as WeaponId);

      return {
        points: nextPoints,
        intelFragments,
        unlockedSkillIds: unlockedNext,
        reward: {
          id: reward.weaponId,
          name: rewardWeapon.name,
          rarity: reward.rarity,
          isNew: reward.isNew,
          color: rewardWeapon.color,
          icon: rewardWeapon.icon,
        },
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
      decryptCost: STARTER_DECRYPT_COST,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "NO_FRAGMENT") {
      return NextResponse.json(
        { error: "No encrypted intel available" },
        { status: 400 }
      );
    }
    if (msg === "INSUFFICIENT_POINTS") {
      return NextResponse.json(
        { error: "Insufficient points" },
        { status: 400 }
      );
    }
    if (msg === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("game/starter-skills POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

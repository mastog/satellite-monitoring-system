import { getAllWeapons, type WeaponId } from "@/lib/game/weapons";

export const STARTER_DECRYPT_COST = 40;
export const STARTER_BASE_SKILLS: WeaponId[] = ["stinger"];
export const CLEAR_WAVE_INTEL_CHANCE = 0.015;

export const STARTER_RARITY_WEIGHTS: Record<
  "common" | "uncommon" | "rare" | "legendary",
  number
> = {
  common: 58,
  uncommon: 25,
  rare: 13,
  legendary: 4,
};

export interface StarterRewardResult {
  weaponId: WeaponId;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  isNew: boolean;
}

export function normalizeStarterUnlocked(ids: string[]): WeaponId[] {
  const all = new Set(getAllWeapons().map((w) => w.id));
  const normalized = ids.filter((id): id is WeaponId =>
    all.has(id as WeaponId)
  );
  for (const base of STARTER_BASE_SKILLS) {
    if (!normalized.includes(base)) normalized.unshift(base);
  }
  return Array.from(new Set(normalized));
}

function rollWeightedRarity(): "common" | "uncommon" | "rare" | "legendary" {
  const entries = Object.entries(STARTER_RARITY_WEIGHTS) as Array<
    ["common" | "uncommon" | "rare" | "legendary", number]
  >;
  const total = entries.reduce((acc, [, w]) => acc + w, 0);
  let r = Math.random() * total;
  for (const [rarity, weight] of entries) {
    if (r < weight) return rarity;
    r -= weight;
  }
  return "common";
}

export function rollStarterReward(
  unlockedIds: WeaponId[]
): StarterRewardResult {
  const unlocked = new Set(unlockedIds);
  const weapons = getAllWeapons();
  const rarity = rollWeightedRarity();
  const sameRarity = weapons.filter((w) => w.rarity === rarity);
  const unownedSameRarity = sameRarity.filter((w) => !unlocked.has(w.id));
  const pool = unownedSameRarity.length > 0 ? unownedSameRarity : sameRarity;
  const reward = pool[Math.floor(Math.random() * pool.length)] || weapons[0];
  return {
    weaponId: reward.id,
    rarity: reward.rarity,
    isNew: !unlocked.has(reward.id),
  };
}

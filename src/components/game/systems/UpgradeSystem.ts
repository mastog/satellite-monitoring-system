// ── Upgrade System: Level-up choices, weapon/passive pools ────────────
import { UPGRADE_CHOICES, xpForLevel } from "@/lib/game/balance";
import {
  getAllWeapons,
  getWeapon,
  WEAPON_IDS,
  type WeaponId,
} from "@/lib/game/weapons";
import {
  getAllUpgrades,
  getUpgrade,
  UPGRADE_IDS,
  type UpgradeId,
} from "@/lib/game/upgrades";
import { SYNERGIES, hasRequirementBase } from "@/lib/game/synergies";
import { type PlayerState, recalcPlayerStats } from "../entities/Player";
import type { LevelUpChoice } from "../engine/GameCanvas";

/** Rarity weighting — higher = more likely to appear */
const RARITY_WEIGHTS: Record<string, number> = {
  common: 50,
  uncommon: 30,
  rare: 12,
  legendary: 3,
};

/** Minimum player level required to see weapons of this rarity */
const RARITY_LEVEL_GATE: Record<string, number> = {
  common: 1,
  uncommon: 1,
  rare: 3,
  legendary: 5,
};

/** Maximum weapon slots */
const MAX_WEAPONS = 6;
const SYNERGY_REQUIRED_LEVEL = 3;

/** Upgrade weight tuning */
const EXISTING_WEAPON_UPGRADE_WEIGHT = 85;
const SYNERGY_MISSING_HALF_BONUS = 45;

export class UpgradeSystem {
  pendingChoices: LevelUpChoice[] = [];
  isLevelUp = false;
  hasUsedReroll = false;

  /** Check if player has enough XP to level up */
  checkLevelUp(player: PlayerState): boolean {
    const needed = xpForLevel(player.level);
    if (player.xp >= needed) {
      player.xp -= needed;
      player.level++;
      this.generateChoices(player);
      this.isLevelUp = true;
      this.hasUsedReroll = false;
      return true;
    }
    return false;
  }

  /** Generate N random upgrade choices with rarity weighting */
  private generateChoices(player: PlayerState): void {
    const pool: { choice: LevelUpChoice; weight: number }[] = [];
    const equipped = new Set(player.weapons.map((w) => w.id));

    // Ignore already-active synergies when boosting "missing-half" candidates.
    const activeSynergyIds = new Set(
      SYNERGIES.filter((syn) => {
        return syn.requirements.every((req) => {
          if (req.kind === "weapon") {
            const w = player.weapons.find((it) => it.id === req.id);
            return !!w && w.level >= req.level;
          }
          return (player.passives.get(req.id) || 0) >= req.level;
        });
      }).map((syn) => syn.id)
    );

    // Weapon upgrades for equipped weapons (always higher weight)
    for (const w of player.weapons) {
      const def = getWeapon(w.id);
      if (w.level < def.maxLevel) {
        pool.push({
          choice: {
            type: "weapon",
            id: w.id,
            name: def.name,
            description: `Level ${w.level + 1}: +damage, improved stats`,
            level: w.level + 1,
            maxLevel: def.maxLevel,
            color: def.color,
            icon: def.icon,
            rarity: def.rarity,
          },
          weight: EXISTING_WEAPON_UPGRADE_WEIGHT,
        });
      }
    }

    // Adds not-yet-equipped weapons when the player still has open weapon slots.
    if (player.weapons.length < MAX_WEAPONS) {
      for (const id of WEAPON_IDS) {
        if (equipped.has(id)) continue;
        const def = getWeapon(id);
        // Skips weapons whose rarity gate exceeds the player's current level.
        if (player.level < (RARITY_LEVEL_GATE[def.rarity] || 1)) continue;

        let synergyBonus = 0;
        for (const syn of SYNERGIES) {
          if (activeSynergyIds.has(syn.id)) continue;
          const selfReq = syn.requirements.find(
            (req) => req.kind === "weapon" && req.id === id
          );
          if (!selfReq) continue;
          const otherReq = syn.requirements.find((req) => req !== selfReq);
          if (!otherReq) continue;
          if (hasRequirementBase(otherReq, equipped, player.passives)) {
            synergyBonus += SYNERGY_MISSING_HALF_BONUS;
          }
        }

        pool.push({
          choice: {
            type: "weapon",
            id: def.id,
            name: def.name,
            description: def.description,
            level: 1,
            maxLevel: def.maxLevel,
            color: def.color,
            icon: def.icon,
            rarity: def.rarity,
          },
          weight: (RARITY_WEIGHTS[def.rarity] || 10) + synergyBonus,
        });
      }
    }

    // Adds passive upgrades that still have remaining levels to offer.
    for (const id of UPGRADE_IDS) {
      const def = getUpgrade(id);
      const currentLv = player.passives.get(id) || 0;
      if (currentLv < def.maxLevel) {
        let passiveSynergyBonus = 0;
        for (const syn of SYNERGIES) {
          if (activeSynergyIds.has(syn.id)) continue;
          const selfReq = syn.requirements.find(
            (req) => req.kind === "passive" && req.id === id
          );
          if (!selfReq) continue;
          const otherReq = syn.requirements.find((req) => req !== selfReq);
          if (!otherReq) continue;
          if (hasRequirementBase(otherReq, equipped, player.passives)) {
            passiveSynergyBonus += SYNERGY_MISSING_HALF_BONUS;
          }
        }
        pool.push({
          choice: {
            type: "passive",
            id: def.id,
            name: def.name,
            description: `+${def.perLevel}${def.unit}`,
            level: currentLv + 1,
            maxLevel: def.maxLevel,
            color: def.color,
            icon: def.icon,
          },
          weight: 25 + passiveSynergyBonus,
        });
      }
    }

    // Samples the final upgrade choices using weights so rarities and synergy bonuses influence the result.
    const selected = this.weightedSample(pool, UPGRADE_CHOICES);
    this.pendingChoices = selected.map((s) => s.choice);
  }

  /** Weighted random sampling without replacement */
  private weightedSample<T extends { weight: number }>(
    items: T[],
    count: number
  ): T[] {
    const result: T[] = [];
    const available = [...items];

    for (let i = 0; i < count && available.length > 0; i++) {
      const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
      let rand = Math.random() * totalWeight;
      let picked = 0;

      for (let j = 0; j < available.length; j++) {
        rand -= available[j].weight;
        if (rand <= 0) {
          picked = j;
          break;
        }
      }

      result.push(available[picked]);
      available.splice(picked, 1);
    }

    return result;
  }

  /** Player chose an upgrade */
  applyChoice(player: PlayerState, index: number): void {
    if (index < 0 || index >= this.pendingChoices.length) return;

    const choice = this.pendingChoices[index];

    if (choice.type === "weapon") {
      const existing = player.weapons.find((w) => w.id === choice.id);
      if (existing) {
        existing.level = choice.level;
      } else {
        player.weapons.push({ id: choice.id as WeaponId, level: 1 });
      }
    } else {
      const currentLv = player.passives.get(choice.id as UpgradeId) || 0;
      player.passives.set(choice.id as UpgradeId, currentLv + 1);
      recalcPlayerStats(player);
    }

    this.pendingChoices = [];
    this.isLevelUp = false;
    this.hasUsedReroll = false;
  }

  /** Reroll current level-up choices once per level-up event */
  rerollChoices(player: PlayerState): boolean {
    if (!this.isLevelUp || this.hasUsedReroll) return false;
    this.generateChoices(player);
    this.hasUsedReroll = true;
    return true;
  }

  reset(): void {
    this.pendingChoices = [];
    this.isLevelUp = false;
    this.hasUsedReroll = false;
  }
}

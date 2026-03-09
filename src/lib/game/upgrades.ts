// Defines the passive upgrade catalog used by level-up rewards and the in-game upgrade modal.

export type UpgradeId =
  | "thruster"
  | "hull"
  | "magnet"
  | "cooldown"
  | "crit"
  | "proj_speed"
  | "xp_boost"
  | "regen"
  | "armor"
  | "area"
  | "multishot";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
  perLevel: number; // Stores the amount added at each upgrade level so the UI and systems can compute scaling.
  unit: string; // Stores the display suffix used when presenting the upgrade effect to the player.
  color: string;
}

const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  thruster: {
    id: "thruster",
    name: "Thruster Boost",
    description: "Increases movement speed",
    icon: "T",
    maxLevel: 5,
    perLevel: 8,
    unit: "% speed",
    color: "#39ff7f",
  },
  hull: {
    id: "hull",
    name: "Hull Plating",
    description: "Increases maximum HP",
    icon: "H",
    maxLevel: 5,
    perLevel: 10,
    unit: "% max HP",
    color: "#00e5ff",
  },
  magnet: {
    id: "magnet",
    name: "Magnet Field",
    description: "Increases pickup radius",
    icon: "F",
    maxLevel: 5,
    perLevel: 15,
    unit: "% pickup range",
    color: "#b44aff",
  },
  cooldown: {
    id: "cooldown",
    name: "Cooldown Reduction",
    description: "Reduces weapon cooldowns",
    icon: "C",
    maxLevel: 5,
    perLevel: 6,
    unit: "% CDR",
    color: "#00e5ff",
  },
  crit: {
    id: "crit",
    name: "Critical Strike",
    description: "Chance to deal 2x damage",
    icon: "X",
    maxLevel: 5,
    perLevel: 5,
    unit: "% crit",
    color: "#ff3a8c",
  },
  proj_speed: {
    id: "proj_speed",
    name: "Projectile Speed",
    description: "Increases bullet velocity",
    icon: "V",
    maxLevel: 3,
    perLevel: 10,
    unit: "% velocity",
    color: "#ff6b2c",
  },
  xp_boost: {
    id: "xp_boost",
    name: "XP Boost",
    description: "Increases XP gained",
    icon: "B",
    maxLevel: 3,
    perLevel: 8,
    unit: "% XP",
    color: "#39ff7f",
  },
  regen: {
    id: "regen",
    name: "Regeneration",
    description: "Restores HP over time",
    icon: "R",
    maxLevel: 3,
    perLevel: 0.5,
    unit: " HP/s",
    color: "#39ff7f",
  },
  armor: {
    id: "armor",
    name: "Armor",
    description: "Reduces damage taken",
    icon: "A",
    maxLevel: 3,
    perLevel: 5,
    unit: "% DR",
    color: "#8899aa",
  },
  area: {
    id: "area",
    name: "Area Boost",
    description: "Increases AoE radius",
    icon: "W",
    maxLevel: 3,
    perLevel: 8,
    unit: "% AoE",
    color: "#b44aff",
  },
  multishot: {
    id: "multishot",
    name: "Multi-shot",
    description: "Extra projectile on all weapons",
    icon: "+",
    maxLevel: 2,
    perLevel: 1,
    unit: " proj",
    color: "#ff3a8c",
  },
};

export function getUpgrade(id: UpgradeId): UpgradeDef {
  return UPGRADES[id];
}

export function getAllUpgrades(): UpgradeDef[] {
  return Object.values(UPGRADES);
}

export const UPGRADE_IDS: UpgradeId[] = Object.keys(UPGRADES) as UpgradeId[];

import type { UpgradeId } from "./upgrades";
import type { WeaponId } from "./weapons";

export type SynergyRequirement =
  | { kind: "weapon"; id: WeaponId; level: number }
  | { kind: "passive"; id: UpgradeId; level: number };

export interface SynergyDef {
  id: string;
  name: string;
  description: string;
  requirements: [SynergyRequirement, SynergyRequirement];
  color: string;
  effect: string;
}

export const SYNERGIES: SynergyDef[] = [
  {
    id: "aegis_constellation",
    name: "Aegis Drone Constellation",
    description:
      "Five fused shield drones orbit in a living formation, breaking orbit to hunt nearby enemies.",
    requirements: [
      { kind: "weapon", id: "drone", level: 3 },
      { kind: "weapon", id: "orbital", level: 3 },
    ],
    color: "#7ff7ff",
    effect: "aegis_constellation",
  },
  {
    id: "shrapnel_corona",
    name: "Shrapnel Corona",
    description:
      "Stinger shards and frag embers erupt in a full-azimuth corona barrage.",
    requirements: [
      { kind: "weapon", id: "stinger", level: 3 },
      { kind: "weapon", id: "frag", level: 3 },
    ],
    color: "#7ee8ff",
    effect: "shrapnel_corona",
  },
  {
    id: "relay_overclock",
    name: "Relay Overclock",
    description:
      "A near-field pulse tags all nearby targets, then overclocked relay arcs propagate through connected enemies.",
    requirements: [
      { kind: "weapon", id: "ricochet", level: 3 },
      { kind: "passive", id: "cooldown", level: 3 },
    ],
    color: "#90f6ff",
    effect: "relay_overclock",
  },
];

export function normalizeUnlockedSynergies(ids: string[]): string[] {
  const valid = new Set(SYNERGIES.map((s) => s.id));
  const out: string[] = [];
  for (const id of ids) {
    if (!valid.has(id)) continue;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

type EquippedWeapon = { id: WeaponId; level: number };
type PassiveLevels = Map<UpgradeId, number>;

function requirementMet(
  req: SynergyRequirement,
  weapons: EquippedWeapon[],
  passives: PassiveLevels
): boolean {
  if (req.kind === "weapon") {
    const w = weapons.find((it) => it.id === req.id);
    return !!w && w.level >= req.level;
  }
  return (passives.get(req.id) || 0) >= req.level;
}

export function getActiveSynergies(
  equippedWeapons: EquippedWeapon[],
  passiveLevels: PassiveLevels,
  forcedSynergyIds?: Iterable<string>
): SynergyDef[] {
  const forced = new Set(forcedSynergyIds || []);
  return SYNERGIES.filter(
    (s) =>
      forced.has(s.id) ||
      (requirementMet(s.requirements[0], equippedWeapons, passiveLevels) &&
        requirementMet(s.requirements[1], equippedWeapons, passiveLevels))
  );
}

export function hasRequirementBase(
  req: SynergyRequirement,
  equippedWeaponIds: Set<WeaponId>,
  passiveLevels: PassiveLevels
): boolean {
  if (req.kind === "weapon") return equippedWeaponIds.has(req.id);
  return (passiveLevels.get(req.id) || 0) > 0;
}

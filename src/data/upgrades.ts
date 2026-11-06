// Car upgrades — bought with coins in the Shop, level by level.
// Every upgrade MUST change the race (see RaceScreen): Engine raises
// top speed, Turbo raises BOOST power, Extra Heart adds starting
// hearts, Star Magnet pulls stars toward the car. Costs rise per
// level so the best cars take many races to max out.

import type { UpgradesState } from '../types';

export type UpgradeId = keyof UpgradesState;

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  emoji: string;
  tagline: string;
  /** The visible car stat this upgrade raises (Engine = Top Speed, Turbo = Acceleration/Boost). */
  statLabel: string;
  /** Max level. */
  maxLevel: number;
  /** Coins per level: costs[level-1] buys level `level`. */
  costs: number[];
  /** Gems to jump straight to max level from any level (the instant-buy sink) — 0 = not offered. */
  gemInstantCost: number;
  /** Short per-level effect text shown in the Shop. */
  effect: string;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'engine', name: 'Engine', emoji: '⚙️', tagline: 'Faster top speed!',
    statLabel: 'Top Speed',
    maxLevel: 5, costs: [150, 300, 500, 750, 1000], gemInstantCost: 40,
    effect: '+4% top speed per level',
  },
  {
    id: 'turbo', name: 'Turbo Boost', emoji: '🚀', tagline: 'Stronger BOOST!',
    // Was labelled "Acceleration" while only strengthening boost —
    // renamed, and speed now really ramps up (see RaceScreen).
    statLabel: 'Boost Power',
    maxLevel: 5, costs: [150, 300, 500, 750, 1000], gemInstantCost: 40,
    effect: '+6% BOOST power per level',
  },
  {
    id: 'heart', name: 'Extra Heart', emoji: '❤️', tagline: 'Start with more hearts!',
    statLabel: 'Hearts',
    maxLevel: 2, costs: [400, 800], gemInstantCost: 30,
    effect: '+1 heart per level',
  },
  {
    id: 'magnet', name: 'Star Magnet', emoji: '🧲', tagline: 'Stars fly to your car!',
    statLabel: 'Magnet',
    maxLevel: 3, costs: [250, 500, 900], gemInstantCost: 30,
    effect: 'Stars drift toward you',
  },
];

export function upgradeById(id: UpgradeId): UpgradeDef {
  return UPGRADES.find((u) => u.id === id) ?? UPGRADES[0];
}

/** Coins to buy the NEXT level of an upgrade (0 when maxed). */
export function nextUpgradeCost(id: UpgradeId, level: number): number {
  const def = upgradeById(id);
  if (level >= def.maxLevel) return 0;
  return def.costs[level] ?? 0;
}

export const MAX_UPGRADES: UpgradesState = { engine: 5, turbo: 5, heart: 2, magnet: 3 };

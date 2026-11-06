// Kids Car Racing — shared types.
// Fun-only game for ages 3-8. No education, no ads, no accounts, no network.
// Currency is COINS: the stored `points` value IS the coin balance
// (existing players keep every point they earned — it just shows as
// coins now). Star = 10 coins; win bonus grows per level/difficulty.

export type DifficultyId = 'low' | 'mid' | 'high';

export interface Difficulty {
  id: DifficultyId;
  label: string;
  hearts: number;
  /** Multiplier on road speed. */
  speedMul: number;
  /** Base ms between traffic-car spawns (before the level factor). */
  trafficIntervalMs: number;
  /** Bonus coins added on a win. */
  winBonus: number;
}

export const DIFFICULTIES: Record<DifficultyId, Difficulty> = {
  low: { id: 'low', label: 'Low', hearts: 5, speedMul: 0.82, trafficIntervalMs: 2000, winBonus: 50 },
  mid: { id: 'mid', label: 'Mid', hearts: 4, speedMul: 1.0, trafficIntervalMs: 1500, winBonus: 100 },
  high: { id: 'high', label: 'High', hearts: 3, speedMul: 1.22, trafficIntervalMs: 1050, winBonus: 150 },
};

export const DIFFICULTY_ORDER: DifficultyId[] = ['low', 'mid', 'high'];

/** Upgrade levels owned by the player (0 = not bought yet). */
export interface UpgradesState {
  engine: number;
  turbo: number;
  heart: number;
  magnet: number;
}

export const DEFAULT_UPGRADES: UpgradesState = { engine: 0, turbo: 0, heart: 0, magnet: 0 };

export interface Profile {
  /** Driver / player name, typed on the home page. */
  name: string;
  /** Coin balance (stored field is still `points` — same value, new name in the UI). */
  points: number;
  /** Number of levels won (trophies). */
  trophies: number;
  /** Highest level unlocked by winning (1-based). Win level N unlocks N+1. */
  unlockedLevel: number;
  /** Level ids bought with coins (shortcut past the win-to-unlock rule). */
  purchasedLevels: number[];
  /** Skin ids the player owns. */
  ownedSkins: string[];
  /** Currently equipped skin id (skin = performance kit, its Speed stat still applies). */
  equippedSkin: string;
  /** Vehicle ids the player owns (cars bought in the Shop). */
  ownedVehicles: string[];
  /** Currently equipped vehicle id. Empty = use the selected driver's vehicle. */
  selectedVehicle: string;
  /** Paint ids the player owns. */
  ownedPaints: string[];
  /** Currently equipped paint id — repaints the car in the race (overrides the skin colour). */
  equippedPaint: string;
  /** Upgrade levels (see src/data/upgrades.ts). */
  upgrades: UpgradesState;
  /** Best score ever in a single race. */
  bestScore: number;
  /** Selected cartoon driver id (see src/data/drivers.ts). */
  selectedDriver: string;
  /** Driver ids the player owns. Rocky is owned from the start. */
  ownedDrivers: string[];
  /** Card / race view: '2d' flat cartoon or '3d' glossy angled look. */
  viewMode: '2d' | '3d';
  /** True when the one-time Unlock All purchase (RevenueCat) is owned. */
  unlockAll: boolean;
  /** True when the one-time Ad-Free purchase (RevenueCat) is owned — no rewarded-ad prompts at all. */
  adFree: boolean;
  /** Hard currency. Scarce: first wins, perfect races, daily mission, rewarded ads, Gem packs. */
  gems: number;
  /** Trial car for the NEXT race only (granted by ad or 5 gems) — reverts after one race. */
  trialVehicleId: string;
  /** Trial paint for the NEXT race only. */
  trialPaintId: string;
  /** Last date (YYYY-MM-DD) the daily-mission gem bonus (+5 gems for the first win of the day) was given. */
  lastGemMission: string;
  /** RevenueCat transaction ids already granted coins for — a purchase is never double-granted. */
  grantedTransactions: string[];
  /** Last date (YYYY-MM-DD) the +50 daily coin bonus was given. */
  lastDailyBonus: string;
}

export const DEFAULT_PROFILE: Profile = {
  name: '',
  points: 0,
  trophies: 0,
  unlockedLevel: 1,
  purchasedLevels: [],
  ownedSkins: ['ruby'],
  equippedSkin: 'ruby',
  ownedVehicles: ['car'],
  selectedVehicle: '',
  ownedPaints: ['cherry'],
  equippedPaint: 'cherry',
  upgrades: { ...DEFAULT_UPGRADES },
  bestScore: 0,
  selectedDriver: 'rocky',
  ownedDrivers: ['rocky'],
  viewMode: '3d',
  unlockAll: false,
  adFree: false,
  gems: 0,
  trialVehicleId: '',
  trialPaintId: '',
  lastGemMission: '',
  grantedTransactions: [],
  lastDailyBonus: '',
};

export type RaceResult = {
  won: boolean;
  stars: number;
  score: number;
  pointsEarned: number;
  levelId: number;
  difficulty: DifficultyId;
  /** Fastest speed reached in the race (MPH, shown on the HUD/results). */
  topSpeedMph?: number;
  /** Race time in seconds. */
  timeSeconds?: number;
  /** Hearts left at the end of the race (for the Perfect Race gem bonus). */
  heartsLeft?: number;
  /** Max hearts the race started with (difficulty + Extra Heart upgrade). */
  maxHearts?: number;
  /** Gems earned by this race (first win / perfect race / daily mission). */
  gemsEarned?: number;
  /** True when the Double Coins rewarded ad was already used for this result. */
  coinsDoubled?: boolean;
};

// Kids Car Racing — shared types.
// Fun-only game for ages 3-8. No education, no ads, no accounts, no network.

export type DifficultyId = 'low' | 'mid' | 'high';

export interface Difficulty {
  id: DifficultyId;
  label: string;
  hearts: number;
  /** Multiplier on road speed. */
  speedMul: number;
  /** Base ms between traffic-car spawns (before the level factor). */
  trafficIntervalMs: number;
  /** Bonus points added on a win. */
  winBonus: number;
}

export const DIFFICULTIES: Record<DifficultyId, Difficulty> = {
  low: { id: 'low', label: 'Low', hearts: 5, speedMul: 0.82, trafficIntervalMs: 2000, winBonus: 50 },
  mid: { id: 'mid', label: 'Mid', hearts: 4, speedMul: 1.0, trafficIntervalMs: 1500, winBonus: 100 },
  high: { id: 'high', label: 'High', hearts: 3, speedMul: 1.22, trafficIntervalMs: 1050, winBonus: 150 },
};

export const DIFFICULTY_ORDER: DifficultyId[] = ['low', 'mid', 'high'];

export interface Profile {
  /** Driver / player name, typed on the home page. */
  name: string;
  /** Total points. Star = 10 points; win bonus grows per level/difficulty. */
  points: number;
  /** Number of levels won (trophies). */
  trophies: number;
  /** Highest level unlocked (1-based). Win level N unlocks N+1. */
  unlockedLevel: number;
  /** Skin ids the player owns. */
  ownedSkins: string[];
  /** Currently equipped skin id. */
  equippedSkin: string;
  /** Best score ever in a single race. */
  bestScore: number;
  /** Selected cartoon driver id (see src/data/drivers.ts). */
  selectedDriver: string;
  /** Driver ids the player owns. Rocky is owned from the start. */
  ownedDrivers: string[];
  /** Card / race view: '2d' flat cartoon or '3d' glossy angled look. */
  viewMode: '2d' | '3d';
}

export const DEFAULT_PROFILE: Profile = {
  name: '',
  points: 0,
  trophies: 0,
  unlockedLevel: 1,
  ownedSkins: ['ruby'],
  equippedSkin: 'ruby',
  bestScore: 0,
  selectedDriver: 'rocky',
  ownedDrivers: ['rocky'],
  viewMode: '3d',
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
};

// The 10 levels (maps). Each has its own scenery/colours, star goal
// and speed. Win level N to unlock level N+1, or buy a later level
// with coins to skip ahead. Level 1 is free; `price` is the coin
// shortcut price (0 = free).

export interface Level {
  id: number;
  name: string;
  starGoal: number;
  /** Base road speed in px/second (before difficulty multiplier). */
  baseSpeed: number;
  /** Traffic gets denser on later levels: interval multiplier (<1 = more cars). */
  trafficFactor: number;
  sky: [string, string];
  grass: string;
  road: string;
  /** Emoji used for roadside scenery. */
  scenery: string[];
  /** Emoji shown on the level card / results. */
  icon: string;
  tagline: string;
  /** Coins to unlock early without winning the previous level. */
  price: number;
  /** Optional Gem price for the premium tier (later maps) — an alternative to the coin price. */
  gemPrice?: number;
}

export const LEVELS: Level[] = [
  {
    id: 1, name: 'Sunny Park', starGoal: 20, baseSpeed: 300, trafficFactor: 1.0,
    sky: ['#7DD3FC', '#FEF9C3'], grass: '#4ADE80', road: '#475569',
    scenery: ['🌳', '🌼', '🌳', '🦋', '🌼'], icon: '🌞', tagline: 'Easy and sunny!', price: 0,
  },
  {
    id: 2, name: 'Beach Road', starGoal: 25, baseSpeed: 330, trafficFactor: 0.92,
    sky: ['#38BDF8', '#FDE68A'], grass: '#FCD34D', road: '#475569',
    scenery: ['🌴', '🐚', '🌴', '☀️', '🐚'], icon: '🏖️', tagline: 'Sand, sea and stars!', price: 200,
  },
  {
    id: 3, name: 'City Zoom', starGoal: 30, baseSpeed: 360, trafficFactor: 0.85,
    sky: ['#A5B4FC', '#FBCFE8'], grass: '#94A3B8', road: '#334155',
    scenery: ['🏢', '🚦', '🏢', '🏪', '🚦'], icon: '🏙️', tagline: 'Zoom through the city!', price: 300,
  },
  {
    id: 4, name: 'Rainbow Hills', starGoal: 35, baseSpeed: 390, trafficFactor: 0.78,
    sky: ['#F9A8D4', '#A5F3FC'], grass: '#86EFAC', road: '#475569',
    scenery: ['🌈', '🌸', '🌈', '🦄', '🌸'], icon: '🌈', tagline: 'Over the rainbow hills!', price: 400,
  },
  {
    id: 5, name: 'Mountain Road', starGoal: 40, baseSpeed: 420, trafficFactor: 0.7,
    sky: ['#93C5FD', '#E0E7FF'], grass: '#65A30D', road: '#3F3F46',
    scenery: ['⛰️', '🌲', '⛰️', '❄️', '🌲'], icon: '⛰️', tagline: 'The big mountain challenge!', price: 500,
  },
  {
    id: 6, name: 'Jungle Safari', starGoal: 45, baseSpeed: 440, trafficFactor: 0.65,
    sky: ['#86EFAC', '#FEF9C3'], grass: '#16A34A', road: '#475569',
    scenery: ['🌴', '🐒', '🌴', '🦜', '🍌'], icon: '🦁', tagline: 'Roar through the jungle!', price: 600, gemPrice: 20,
  },
  {
    id: 7, name: 'Snow Valley', starGoal: 50, baseSpeed: 460, trafficFactor: 0.6,
    sky: ['#DBEAFE', '#FFFFFF'], grass: '#E0F2FE', road: '#64748B',
    scenery: ['⛄', '❄️', '🎄', '⛄', '❄️'], icon: '⛄', tagline: 'Snowy, slippery fun!', price: 700, gemPrice: 25,
  },
  {
    id: 8, name: 'Desert Dash', starGoal: 55, baseSpeed: 480, trafficFactor: 0.58,
    sky: ['#FDE68A', '#FDBA74'], grass: '#F59E0B', road: '#78716C',
    scenery: ['🌵', '🐪', '🌵', '☀️', '🏜️'], icon: '🌵', tagline: 'Hot, fast desert dash!', price: 800, gemPrice: 30,
  },
  {
    id: 9, name: 'Candy Land', starGoal: 60, baseSpeed: 500, trafficFactor: 0.55,
    sky: ['#FBCFE8', '#FDE68A'], grass: '#F9A8D4', road: '#9D174D',
    scenery: ['🍭', '🍬', '🧁', '🍭', '🍬'], icon: '🍭', tagline: 'Sweet and speedy!', price: 900, gemPrice: 40,
  },
  {
    id: 10, name: 'Night City', starGoal: 65, baseSpeed: 520, trafficFactor: 0.5,
    sky: ['#1E1B4B', '#7C3AED'], grass: '#334155', road: '#1F2937',
    scenery: ['🌙', '⭐', '🏙️', '🌙', '💡'], icon: '🌙', tagline: 'Race under the stars!', price: 1000, gemPrice: 50,
  },
];

/** A level is playable when it is unlocked by winning the previous
    level, bought with coins, or owned via Unlock All. */
export function isLevelUnlocked(levelId: number, unlockedLevel: number, purchasedLevels: number[], unlockAll: boolean): boolean {
  if (unlockAll) return true;
  return levelId <= unlockedLevel || purchasedLevels.includes(levelId);
}

export const STAR_POINTS = 10;

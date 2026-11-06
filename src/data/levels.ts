// The 10 levels (maps). Each has its own scenery/colours, star goal
// and speed. Win level N to unlock level N+1, or buy a later level
// with coins to skip ahead. Level 1 is free; `price` is the coin
// shortcut price (0 = free).
//
// Per-map identity (fixes "maps only change the sky colour"): every
// map now carries its own roadside scenery, kerb/edge colours, traffic
// colours and obstacle emojis, so the place changes more than the sky.
// Night City is a night map (moon + stars, no sun).

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
  /** Emoji used for roadside scenery (drawn on BOTH roadsides, scaling with depth, scrolling past). */
  scenery: string[];
  /** Emoji shown on the level card / results. */
  icon: string;
  tagline: string;
  /** Coins to unlock early without winning the previous level. */
  price: number;
  /** Optional Gem price for the premium tier (later maps) — an alternative to the coin price. */
  gemPrice?: number;
  /** True for night maps: draw a moon + stars, never a sun. */
  night?: boolean;
  /** True for the sunset map (Sunny Park): photographic sunset sky
      photo + palm/lamp roadside scenery, dusk ground and road. */
  sunset?: boolean;
  /** Kerb-block colour (per map, so it stays visible on pale maps). */
  kerb: string;
  /** Road-edge line colour (per map, so it stays visible on pale maps). */
  edge: string;
  /** Traffic-car body colours for this map. */
  trafficColors: string[];
  /** Obstacle emoji for this map (cones). */
  obstacleEmoji: string;
  /** Puddle/splash emoji for this map. */
  puddleEmoji: string;
}

export const LEVELS: Level[] = [
  {
    id: 1, name: 'Sunny Park', starGoal: 20, baseSpeed: 300, trafficFactor: 1.0,
    sky: ['#FF9E4A', '#5B2A4A'], grass: '#2E2426', road: '#33313A',
    scenery: ['🌴', '💡', '🌴', '🌴', '💡'], icon: '🌞', tagline: 'Sunset race!', price: 0,
    kerb: '#F97316', edge: '#FDE68A', trafficColors: ['#3B82F6', '#FACC15', '#F97316', '#8B5CF6', '#14B8A6'],
    obstacleEmoji: '🚧', puddleEmoji: '💧', sunset: true,
  },
  {
    id: 2, name: 'Beach Road', starGoal: 25, baseSpeed: 330, trafficFactor: 0.92,
    sky: ['#38BDF8', '#FDE68A'], grass: '#FCD34D', road: '#475569',
    scenery: ['🌴', '🐚', '🌴', '☀️', '🐚'], icon: '🏖️', tagline: 'Sand, sea and stars!', price: 200,
    kerb: '#0EA5E9', edge: '#FFFFFF', trafficColors: ['#F97316', '#0EA5E9', '#F43F5E', '#FACC15', '#14B8A6'],
    obstacleEmoji: '🏖️', puddleEmoji: '🌊',
  },
  {
    id: 3, name: 'City Zoom', starGoal: 30, baseSpeed: 360, trafficFactor: 0.85,
    sky: ['#A5B4FC', '#FBCFE8'], grass: '#94A3B8', road: '#334155',
    scenery: ['🏢', '🚦', '🏢', '🏪', '🚦'], icon: '🏙️', tagline: 'Zoom through the city!', price: 300,
    kerb: '#FACC15', edge: '#FFFFFF', trafficColors: ['#FACC15', '#EF4444', '#3B82F6', '#FFFFFF', '#F97316'],
    obstacleEmoji: '🚧', puddleEmoji: '💧',
  },
  {
    id: 4, name: 'Rainbow Hills', starGoal: 35, baseSpeed: 390, trafficFactor: 0.78,
    sky: ['#F9A8D4', '#A5F3FC'], grass: '#86EFAC', road: '#475569',
    scenery: ['🌈', '🌸', '🌈', '🦄', '🌸'], icon: '🌈', tagline: 'Over the rainbow hills!', price: 400,
    kerb: '#EC4899', edge: '#FFFFFF', trafficColors: ['#EC4899', '#8B5CF6', '#FACC15', '#22C55E', '#38BDF8'],
    obstacleEmoji: '🌸', puddleEmoji: '💧',
  },
  {
    id: 5, name: 'Mountain Road', starGoal: 40, baseSpeed: 420, trafficFactor: 0.7,
    sky: ['#93C5FD', '#E0E7FF'], grass: '#65A30D', road: '#3F3F46',
    scenery: ['⛰️', '🌲', '⛰️', '❄️', '🌲'], icon: '⛰️', tagline: 'The big mountain challenge!', price: 500,
    kerb: '#F97316', edge: '#FEF3C7', trafficColors: ['#65A30D', '#78716C', '#F97316', '#0EA5E9', '#F43F5E'],
    obstacleEmoji: '🪨', puddleEmoji: '💧',
  },
  {
    id: 6, name: 'Jungle Safari', starGoal: 45, baseSpeed: 440, trafficFactor: 0.65,
    sky: ['#86EFAC', '#FEF9C3'], grass: '#16A34A', road: '#475569',
    scenery: ['🌴', '🐒', '🌴', '🦜', '🍌'], icon: '🦁', tagline: 'Roar through the jungle!', price: 600, gemPrice: 20,
    kerb: '#84CC16', edge: '#FEF9C3', trafficColors: ['#16A34A', '#84CC16', '#FACC15', '#F97316', '#78350F'],
    obstacleEmoji: '🌴', puddleEmoji: '💧',
  },
  {
    id: 7, name: 'Snow Valley', starGoal: 50, baseSpeed: 460, trafficFactor: 0.6,
    sky: ['#DBEAFE', '#FFFFFF'], grass: '#E0F2FE', road: '#64748B',
    scenery: ['⛄', '❄️', '🎄', '⛄', '❄️'], icon: '⛄', tagline: 'Snowy, slippery fun!', price: 700, gemPrice: 25,
    kerb: '#2563EB', edge: '#1E40AF', trafficColors: ['#2563EB', '#38BDF8', '#EF4444', '#F8FAFC', '#7C3AED'],
    obstacleEmoji: '⛄', puddleEmoji: '❄️',
  },
  {
    id: 8, name: 'Desert Dash', starGoal: 55, baseSpeed: 480, trafficFactor: 0.58,
    sky: ['#FDE68A', '#FDBA74'], grass: '#F59E0B', road: '#78716C',
    scenery: ['🌵', '🐪', '🌵', '☀️', '🏜️'], icon: '🌵', tagline: 'Hot, fast desert dash!', price: 800, gemPrice: 30,
    kerb: '#92400E', edge: '#FEF3C7', trafficColors: ['#F59E0B', '#D97706', '#F97316', '#78716C', '#EF4444'],
    obstacleEmoji: '🌵', puddleEmoji: '🏜️',
  },
  {
    id: 9, name: 'Candy Land', starGoal: 60, baseSpeed: 500, trafficFactor: 0.55,
    sky: ['#FBCFE8', '#FDE68A'], grass: '#F9A8D4', road: '#9D174D',
    scenery: ['🍭', '🍬', '🧁', '🍭', '🍬'], icon: '🍭', tagline: 'Sweet and speedy!', price: 900, gemPrice: 40,
    kerb: '#BE185D', edge: '#FFFFFF', trafficColors: ['#EC4899', '#F43F5E', '#8B5CF6', '#FACC15', '#22C55E'],
    obstacleEmoji: '🍭', puddleEmoji: '🍬',
  },
  {
    id: 10, name: 'Night City', starGoal: 65, baseSpeed: 520, trafficFactor: 0.5,
    sky: ['#1E1B4B', '#7C3AED'], grass: '#334155', road: '#1F2937',
    scenery: ['🌙', '⭐', '🏙️', '🌙', '💡'], icon: '🌙', tagline: 'Race under the stars!', price: 1000, gemPrice: 50,
    night: true, kerb: '#FACC15', edge: '#FDE68A',
    trafficColors: ['#FACC15', '#A78BFA', '#38BDF8', '#F43F5E', '#F8FAFC'],
    obstacleEmoji: '🚧', puddleEmoji: '💧',
  },
];

/** A level is playable when it is unlocked by winning the previous
    level, bought with coins, or owned via Unlock All. */
export function isLevelUnlocked(levelId: number, unlockedLevel: number, purchasedLevels: number[], unlockAll: boolean): boolean {
  if (unlockAll) return true;
  return levelId <= unlockedLevel || purchasedLevels.includes(levelId);
}

export const STAR_POINTS = 10;

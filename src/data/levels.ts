// The 5 levels. Each has its own scenery/colours, star goal and speed.
// Win level N to unlock level N+1.

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
}

export const LEVELS: Level[] = [
  {
    id: 1, name: 'Sunny Park', starGoal: 20, baseSpeed: 300, trafficFactor: 1.0,
    sky: ['#7DD3FC', '#FEF9C3'], grass: '#4ADE80', road: '#475569',
    scenery: ['🌳', '🌼', '🌳', '🦋', '🌼'], icon: '🌞', tagline: 'Easy and sunny!',
  },
  {
    id: 2, name: 'Beach Road', starGoal: 25, baseSpeed: 330, trafficFactor: 0.92,
    sky: ['#38BDF8', '#FDE68A'], grass: '#FCD34D', road: '#475569',
    scenery: ['🌴', '🐚', '🌴', '☀️', '🐚'], icon: '🏖️', tagline: 'Sand, sea and stars!',
  },
  {
    id: 3, name: 'City Zoom', starGoal: 30, baseSpeed: 360, trafficFactor: 0.85,
    sky: ['#A5B4FC', '#FBCFE8'], grass: '#94A3B8', road: '#334155',
    scenery: ['🏢', '🚦', '🏢', '🏪', '🚦'], icon: '🏙️', tagline: 'Zoom through the city!',
  },
  {
    id: 4, name: 'Rainbow Hills', starGoal: 35, baseSpeed: 390, trafficFactor: 0.78,
    sky: ['#F9A8D4', '#A5F3FC'], grass: '#86EFAC', road: '#475569',
    scenery: ['🌈', '🌸', '🌈', '🦄', '🌸'], icon: '🌈', tagline: 'Over the rainbow hills!',
  },
  {
    id: 5, name: 'Mountain Road', starGoal: 40, baseSpeed: 420, trafficFactor: 0.7,
    sky: ['#93C5FD', '#E0E7FF'], grass: '#65A30D', road: '#3F3F46',
    scenery: ['⛰️', '🌲', '⛰️', '❄️', '🌲'], icon: '⛰️', tagline: 'The big mountain challenge!',
  },
];

export const STAR_POINTS = 10;

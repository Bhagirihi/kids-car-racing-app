// Vehicles + paint skins. Skins are bought with points and equipped.
// 12-colour striped palette (like the top-down sports-car sheet:
// red, yellow, green, purple, blue, orange, silver, gold, black,
// white…) — each car is drawn in code with white racing stripes
// (see CarView top view). No external images, no real brand names.

export interface Vehicle {
  id: string;
  name: string;
  emoji: string;
  /** Coins to buy in the Shop; 0 = owned from the start (or comes with its driver). */
  price: number;
  /** Optional Gem price for the premium tier — an alternative to the coin price, never instead of it. */
  gemPrice?: number;
  /** Base speed / handling, 1–5. Speed gives a real top-speed bonus in the race. */
  speed: number;
  handling: number;
  /** The vehicle's own body colour (used when no paint is equipped). */
  carColor: string;
  carAccent: string;
}

export const VEHICLES: Vehicle[] = [
  { id: 'car', name: 'Red Car', emoji: '🚗', price: 0, speed: 3, handling: 3, carColor: '#EF4444', carAccent: '#FCA5A5' },
  { id: 'rickshaw', name: 'Auto Rickshaw', emoji: '🛺', price: 250, speed: 2, handling: 4, carColor: '#FACC15', carAccent: '#FDE68A' },
  { id: 'bus', name: 'Blue Bus', emoji: '🚌', price: 300, speed: 2, handling: 5, carColor: '#3B82F6', carAccent: '#93C5FD' },
  // New Shop cars — code-drawn (CarView + emoji), no real brands.
  { id: 'race', name: 'Race Car', emoji: '🏎️', price: 400, gemPrice: 25, speed: 5, handling: 4, carColor: '#DC2626', carAccent: '#FCA5A5' },
  { id: 'taxi', name: 'Taxi', emoji: '🚕', price: 250, speed: 3, handling: 4, carColor: '#FACC15', carAccent: '#FDE68A' },
  { id: 'icecream', name: 'Ice Cream Truck', emoji: '🍦', price: 500, gemPrice: 30, speed: 3, handling: 3, carColor: '#F9A8D4', carAccent: '#FBCFE8' },
  { id: 'schoolbus', name: 'School Bus', emoji: '🚍', price: 600, gemPrice: 35, speed: 2, handling: 5, carColor: '#F59E0B', carAccent: '#FCD34D' },
  { id: 'monster', name: 'Monster Truck', emoji: '🛻', price: 800, gemPrice: 40, speed: 4, handling: 3, carColor: '#7C3AED', carAccent: '#C4B5FD' },
  // Driver vehicles — picked by choosing a driver on the home page.
  // Price 0 here: they are owned when their driver is owned (see storage.ts migrate).
  { id: 'police', name: 'Police Car', emoji: '🚓', price: 0, speed: 4, handling: 3, carColor: '#2563EB', carAccent: '#93C5FD' },
  { id: 'fire', name: 'Fire Truck', emoji: '🚒', price: 0, speed: 3, handling: 3, carColor: '#DC2626', carAccent: '#FCA5A5' },
  { id: 'ambulance', name: 'Ambulance', emoji: '🚑', price: 0, speed: 4, handling: 4, carColor: '#F1F5F9', carAccent: '#EF4444' },
  { id: 'duck', name: 'Duck Car', emoji: '🦆', price: 0, speed: 3, handling: 5, carColor: '#FACC15', carAccent: '#FDE68A' },
];

export interface Skin {
  id: string;
  name: string;
  /** Paint colour of the car body. */
  color: string;
  accent: string;
  /** Racing-stripe colour (white on most, gold on Rainbow). */
  stripe: string;
  price: number; // points; 0 = owned from the start
  emoji: string;
  /** Kid-friendly garage stats, 1–5 each (shown as bars). Speed
      gives a tiny top-speed bonus in the race; the others are for
      fun in the garage. */
  speed: number;
  acceleration: number;
  handling: number;
}

export const SKINS: Skin[] = [
  { id: 'ruby', name: 'Ruby Red', color: '#EF4444', accent: '#FCA5A5', stripe: '#FFFFFF', price: 0, emoji: '❤️', speed: 3, acceleration: 3, handling: 3 },
  { id: 'sunny', name: 'Sunny Yellow', color: '#FACC15', accent: '#FDE68A', stripe: '#FFFFFF', price: 100, emoji: '☀️', speed: 3, acceleration: 4, handling: 3 },
  { id: 'ocean', name: 'Ocean Blue', color: '#3B82F6', accent: '#93C5FD', stripe: '#FFFFFF', price: 150, emoji: '🌊', speed: 4, acceleration: 3, handling: 4 },
  { id: 'lime', name: 'Lime Green', color: '#84CC16', accent: '#BEF264', stripe: '#FFFFFF', price: 180, emoji: '🍋', speed: 4, acceleration: 4, handling: 3 },
  { id: 'mint', name: 'Mint Green', color: '#22C55E', accent: '#86EFAC', stripe: '#FFFFFF', price: 200, emoji: '🍃', speed: 3, acceleration: 3, handling: 5 },
  { id: 'snow', name: 'Snow White', color: '#F8FAFC', accent: '#E2E8F0', stripe: '#3B82F6', price: 250, emoji: '❄️', speed: 4, acceleration: 3, handling: 4 },
  { id: 'bubblegum', name: 'Bubblegum Pink', color: '#EC4899', accent: '#F9A8D4', stripe: '#FFFFFF', price: 250, emoji: '🎀', speed: 3, acceleration: 5, handling: 3 },
  { id: 'orange', name: 'Orange Blaze', color: '#F97316', accent: '#FDBA74', stripe: '#FFFFFF', price: 300, emoji: '🔥', speed: 5, acceleration: 3, handling: 3 },
  { id: 'midnight', name: 'Midnight Black', color: '#1F2937', accent: '#4B5563', stripe: '#FFFFFF', price: 350, emoji: '🌙', speed: 5, acceleration: 4, handling: 4 },
  { id: 'silver', name: 'Silver Star', color: '#9CA3AF', accent: '#E5E7EB', stripe: '#1F2937', price: 350, emoji: '⭐', speed: 4, acceleration: 4, handling: 5 },
  { id: 'gold', name: 'Golden Cup', color: '#D97706', accent: '#FCD34D', stripe: '#FFFFFF', price: 450, emoji: '🏆', speed: 5, acceleration: 5, handling: 4 },
  { id: 'rainbow', name: 'Rainbow Star', color: '#8B5CF6', accent: '#FACC15', stripe: '#FACC15', price: 400, emoji: '🌈', speed: 4, acceleration: 5, handling: 5 },
];

export function skinById(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function vehicleById(id: string): Vehicle {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
}

/** Paints — a separate Shop tab from skins. A paint repaints ANY car
    you own in the race (it overrides the skin colour); a skin is a
    performance kit whose Speed stat still applies. First paint free. */
export interface Paint {
  id: string;
  name: string;
  color: string;
  accent: string;
  stripe: string;
  price: number; // coins; 0 = owned from the start
  /** Optional Gem price for the premium tier — an alternative to the coin price. */
  gemPrice?: number;
  emoji: string;
}

export const PAINTS: Paint[] = [
  { id: 'cherry', name: 'Cherry Red', color: '#EF4444', accent: '#FCA5A5', stripe: '#FFFFFF', price: 0, emoji: '🍒' },
  { id: 'sunshine', name: 'Sunshine Yellow', color: '#FACC15', accent: '#FDE68A', stripe: '#FFFFFF', price: 100, emoji: '☀️' },
  { id: 'ocean', name: 'Ocean Blue', color: '#3B82F6', accent: '#93C5FD', stripe: '#FFFFFF', price: 150, emoji: '🌊' },
  { id: 'lime', name: 'Lime Green', color: '#84CC16', accent: '#BEF264', stripe: '#FFFFFF', price: 150, emoji: '🍋' },
  { id: 'teal', name: 'Teal Splash', color: '#14B8A6', accent: '#5EEAD4', stripe: '#FFFFFF', price: 200, emoji: '💧' },
  { id: 'mint', name: 'Mint Green', color: '#22C55E', accent: '#86EFAC', stripe: '#FFFFFF', price: 200, emoji: '🍃' },
  { id: 'sky', name: 'Sky Blue', color: '#38BDF8', accent: '#BAE6FD', stripe: '#FFFFFF', price: 200, emoji: '☁️' },
  { id: 'lavender', name: 'Lavender', color: '#A78BFA', accent: '#DDD6FE', stripe: '#FFFFFF', price: 250, emoji: '💜' },
  { id: 'bubblegum', name: 'Bubblegum Pink', color: '#EC4899', accent: '#F9A8D4', stripe: '#FFFFFF', price: 250, emoji: '🎀' },
  { id: 'peach', name: 'Peachy Orange', color: '#FB923C', accent: '#FED7AA', stripe: '#FFFFFF', price: 250, emoji: '🍑' },
  { id: 'blaze', name: 'Orange Blaze', color: '#F97316', accent: '#FDBA74', stripe: '#FFFFFF', price: 300, emoji: '🔥' },
  { id: 'coral', name: 'Coral Red', color: '#F43F5E', accent: '#FDA4AF', stripe: '#FFFFFF', price: 300, emoji: '🪸' },
  { id: 'forest', name: 'Forest Green', color: '#15803D', accent: '#86EFAC', stripe: '#FFFFFF', price: 300, emoji: '🌲' },
  { id: 'gold', name: 'Golden Cup', color: '#D97706', accent: '#FCD34D', stripe: '#FFFFFF', price: 350, gemPrice: 20, emoji: '🏆' },
  { id: 'silver', name: 'Silver Star', color: '#9CA3AF', accent: '#E5E7EB', stripe: '#1F2937', price: 350, gemPrice: 20, emoji: '⭐' },
  { id: 'midnight', name: 'Midnight Black', color: '#1F2937', accent: '#4B5563', stripe: '#FFFFFF', price: 350, gemPrice: 20, emoji: '🌙' },
  { id: 'snow', name: 'Snow White', color: '#F8FAFC', accent: '#E2E8F0', stripe: '#3B82F6', price: 400, emoji: '❄️' },
  { id: 'chocolate', name: 'Chocolate', color: '#78350F', accent: '#D6A57A', stripe: '#FFFFFF', price: 400, emoji: '🍫' },
  { id: 'rainbow', name: 'Rainbow Star', color: '#8B5CF6', accent: '#FACC15', stripe: '#FACC15', price: 400, gemPrice: 25, emoji: '🌈' },
  { id: 'neon', name: 'Neon Lime', color: '#A3E635', accent: '#D9F99D', stripe: '#1F2937', price: 400, gemPrice: 25, emoji: '⚡' },
];

export function paintById(id: string): Paint {
  return PAINTS.find((p) => p.id === id) ?? PAINTS[0];
}

/** Traffic cars come in 5 colours (web-demo pacing fix: varied, frequent). */
export const TRAFFIC_COLORS = ['#F97316', '#8B5CF6', '#14B8A6', '#F43F5E', '#0EA5E9'];

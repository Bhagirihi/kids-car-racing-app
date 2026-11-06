// Vehicles + paint skins. Skins are bought with points and equipped.
// 12-colour striped palette (like the top-down sports-car sheet:
// red, yellow, green, purple, blue, orange, silver, gold, black,
// white…) — each car is drawn in code with white racing stripes
// (see CarView top view). No external images, no real brand names.

export interface Vehicle {
  id: string;
  name: string;
  emoji: string;
}

export const VEHICLES: Vehicle[] = [
  { id: 'car', name: 'Red Car', emoji: '🚗' },
  { id: 'rickshaw', name: 'Auto Rickshaw', emoji: '🛺' },
  { id: 'bus', name: 'Blue Bus', emoji: '🚌' },
  // Driver vehicles — picked by choosing a driver on the home page.
  { id: 'police', name: 'Police Car', emoji: '🚓' },
  { id: 'fire', name: 'Fire Truck', emoji: '🚒' },
  { id: 'ambulance', name: 'Ambulance', emoji: '🚑' },
  { id: 'duck', name: 'Duck Car', emoji: '🦆' },
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

/** Traffic cars come in 5 colours (web-demo pacing fix: varied, frequent). */
export const TRAFFIC_COLORS = ['#F97316', '#8B5CF6', '#14B8A6', '#F43F5E', '#0EA5E9'];

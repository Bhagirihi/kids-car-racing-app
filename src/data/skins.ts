// Vehicles + paint skins. Skins are bought with points and equipped.
// No external images — cars are drawn with styled Views (see CarView).

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
  price: number; // points; 0 = owned from the start
  emoji: string;
}

export const SKINS: Skin[] = [
  { id: 'ruby', name: 'Ruby Red', color: '#EF4444', accent: '#FCA5A5', price: 0, emoji: '❤️' },
  { id: 'sunny', name: 'Sunny Yellow', color: '#FACC15', accent: '#FDE68A', price: 100, emoji: '☀️' },
  { id: 'ocean', name: 'Ocean Blue', color: '#3B82F6', accent: '#93C5FD', price: 150, emoji: '🌊' },
  { id: 'mint', name: 'Mint Green', color: '#22C55E', accent: '#86EFAC', price: 200, emoji: '🍃' },
  { id: 'bubblegum', name: 'Bubblegum Pink', color: '#EC4899', accent: '#F9A8D4', price: 250, emoji: '🎀' },
  { id: 'rainbow', name: 'Rainbow Star', color: '#8B5CF6', accent: '#FACC15', price: 400, emoji: '🌈' },
];

export function skinById(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function vehicleById(id: string): Vehicle {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
}

/** Traffic cars come in 5 colours (web-demo pacing fix: varied, frequent). */
export const TRAFFIC_COLORS = ['#F97316', '#8B5CF6', '#14B8A6', '#F43F5E', '#0EA5E9'];

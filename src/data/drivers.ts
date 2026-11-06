// Cartoon drivers — original animal characters in the style of the
// reference art (big eyes, big smile, glossy 3D-cartoon look), drawn
// entirely in code (see DriverFace). No images are copied or embedded.
// Each driver brings their own vehicle to the race; Rocky is free.

export interface Driver {
  id: string;
  /** "Rocky" */
  name: string;
  /** "Police Dog" — shown on the card under the name. */
  job: string;
  /** Vehicle this driver races in (see VEHICLES in skins.ts). */
  vehicleId: string;
  vehicleName: string;
  vehicleEmoji: string;
  /** Fallback / small emoji, e.g. 🐶 */
  faceEmoji: string;
  /** Fur / face colours. */
  fur: string;
  furLight: string;
  ear: string;
  muzzle: string;
  /** Ear shape: round ears, long bunny ears, or none (duck). */
  ears: 'round' | 'long' | 'none';
  /** Optional darker mane drawn behind the face (Leo). */
  mane?: string;
  /** Hat style drawn on top of the face. */
  hat: 'police' | 'fire' | 'nurse' | 'race';
  hatColor: string;
  hatAccent: string;
  /** The driver's own vehicle colour (shown on the card preview). */
  carColor: string;
  carAccent: string;
  /** Points to unlock; 0 = free from the start. */
  price: number;
  /** Driver ability — one icon + one word, shown on the driver card
      and wired into the race (see RaceScreen / App startRace):
      Rocky = shield (first hit is free), Leo = fire boost (stronger
      BOOST), Bella = +1 heart, Dash = faster top speed. */
  abilityIcon: string;
  abilityName: string;
  abilityTag: string;
  /** Short fun line shown on the card. */
  tagline: string;
}

export const DRIVERS: Driver[] = [
  {
    id: 'rocky',
    name: 'Rocky',
    job: 'Police Dog',
    vehicleId: 'police',
    vehicleName: 'Police Car',
    vehicleEmoji: '🚓',
    faceEmoji: '🐶',
    fur: '#F59E0B',
    furLight: '#FCD34D',
    ear: '#92400E',
    muzzle: '#FFFBEB',
    ears: 'round',
    hat: 'police',
    hatColor: '#1D4ED8',
    hatAccent: '#FACC15',
    carColor: '#2563EB',
    carAccent: '#93C5FD',
    price: 0,
    tagline: 'Beep beep, let’s go!',
    abilityIcon: '🛡️',
    abilityName: 'Shield',
    abilityTag: 'First hit is free!',
  },
  {
    id: 'leo',
    name: 'Leo',
    job: 'Firefighter Lion',
    vehicleId: 'fire',
    vehicleName: 'Fire Truck',
    vehicleEmoji: '🚒',
    faceEmoji: '🦁',
    fur: '#FBBF24',
    furLight: '#FDE68A',
    ear: '#92400E',
    muzzle: '#FFFBEB',
    ears: 'round',
    mane: '#92400E',
    hat: 'fire',
    hatColor: '#DC2626',
    hatAccent: '#FACC15',
    carColor: '#DC2626',
    carAccent: '#FCA5A5',
    price: 150,
    tagline: 'Woo-woo! Rescue time!',
    abilityIcon: '🔥',
    abilityName: 'Fire Boost',
    abilityTag: 'Stronger BOOST!',
  },
  {
    id: 'bella',
    name: 'Bella',
    job: 'Doctor Bunny',
    vehicleId: 'ambulance',
    vehicleName: 'Ambulance',
    vehicleEmoji: '🚑',
    faceEmoji: '🐰',
    fur: '#FFFFFF',
    furLight: '#FDF2F8',
    ear: '#F9A8D4',
    muzzle: '#FFF1F2',
    ears: 'long',
    hat: 'nurse',
    hatColor: '#FFFFFF',
    hatAccent: '#EF4444',
    carColor: '#F1F5F9',
    carAccent: '#EF4444',
    price: 200,
    tagline: 'Hop to it — let’s help!',
    abilityIcon: '❤️',
    abilityName: '+1 Heart',
    abilityTag: 'Starts with an extra heart!',
  },
  {
    id: 'dash',
    name: 'Dash',
    job: 'Speedy Duck Racer',
    vehicleId: 'duck',
    vehicleName: 'Duck Car',
    vehicleEmoji: '🦆',
    faceEmoji: '🦆',
    fur: '#FACC15',
    furLight: '#FEF08A',
    ear: '#FACC15',
    muzzle: '#FB923C',
    ears: 'none',
    hat: 'race',
    hatColor: '#16A34A',
    hatAccent: '#FFFFFF',
    carColor: '#FACC15',
    carAccent: '#FDE68A',
    price: 300,
    tagline: 'Quack quack, zoom zoom!',
    abilityIcon: '⚡',
    abilityName: 'Top Speed',
    abilityTag: 'Faster top speed!',
  },
];

export function driverById(id: string): Driver {
  return DRIVERS.find((d) => d.id === id) ?? DRIVERS[0];
}

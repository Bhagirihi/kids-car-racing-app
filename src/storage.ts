// Profile persistence with AsyncStorage — coins (points), trophies,
// unlocked levels and owned skins/cars/paints/upgrades survive
// closing the app (unlike the web demo, which kept everything only
// in memory for the session).
// Backward compatible: old profiles (v1) gain the new fields from
// DEFAULT_PROFILE, keep their points as coins, and keep their
// drivers' vehicles as owned vehicles.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PROFILE, Profile } from './types';
import { DRIVERS } from './data/drivers';

const KEY = '@kids-car-racing:profile:v1';

function migrate(parsed: Partial<Profile>): Profile {
  const base: Profile = {
    ...DEFAULT_PROFILE,
    ...parsed,
    ownedSkins: parsed.ownedSkins ?? [...DEFAULT_PROFILE.ownedSkins],
    ownedDrivers: parsed.ownedDrivers ?? [...DEFAULT_PROFILE.ownedDrivers],
    selectedDriver: parsed.selectedDriver ?? DEFAULT_PROFILE.selectedDriver,
    viewMode: parsed.viewMode ?? DEFAULT_PROFILE.viewMode,
    purchasedLevels: parsed.purchasedLevels ?? [],
    ownedVehicles: parsed.ownedVehicles ?? [...DEFAULT_PROFILE.ownedVehicles],
    selectedVehicle: parsed.selectedVehicle ?? '',
    ownedPaints: parsed.ownedPaints ?? [...DEFAULT_PROFILE.ownedPaints],
    equippedPaint: parsed.equippedPaint ?? 'cherry',
    upgrades: { ...DEFAULT_PROFILE.upgrades, ...(parsed.upgrades ?? {}) },
    unlockAll: parsed.unlockAll ?? false,
    adFree: parsed.adFree ?? false,
    gems: parsed.gems ?? 0,
    trialVehicleId: parsed.trialVehicleId ?? '',
    trialPaintId: parsed.trialPaintId ?? '',
    lastGemMission: parsed.lastGemMission ?? '',
    grantedTransactions: parsed.grantedTransactions ?? [],
    lastDailyBonus: parsed.lastDailyBonus ?? '',
  };
  // A driver you own brings their vehicle with them.
  for (const d of DRIVERS) {
    if (base.ownedDrivers.includes(d.id) && !base.ownedVehicles.includes(d.vehicleId)) {
      base.ownedVehicles.push(d.vehicleId);
    }
  }
  return base;
}

export async function loadProfile(): Promise<Profile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return migrate({});
    return migrate(JSON.parse(raw) as Partial<Profile>);
  } catch {
    return migrate({});
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Offline local save failing should never crash the game.
  }
}

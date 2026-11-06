// Profile persistence with AsyncStorage — points, trophies, unlocked
// levels and owned skins survive closing the app (unlike the web demo,
// which kept everything only in memory for the session).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PROFILE, Profile } from './types';

const KEY = '@kids-car-racing:profile:v1';

export async function loadProfile(): Promise<Profile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PROFILE, ownedSkins: [...DEFAULT_PROFILE.ownedSkins] };
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      ownedSkins: parsed.ownedSkins ?? [...DEFAULT_PROFILE.ownedSkins],
      ownedDrivers: parsed.ownedDrivers ?? [...DEFAULT_PROFILE.ownedDrivers],
      selectedDriver: parsed.selectedDriver ?? DEFAULT_PROFILE.selectedDriver,
      viewMode: parsed.viewMode ?? DEFAULT_PROFILE.viewMode,
    };
  } catch {
    return {
      ...DEFAULT_PROFILE,
      ownedSkins: [...DEFAULT_PROFILE.ownedSkins],
      ownedDrivers: [...DEFAULT_PROFILE.ownedDrivers],
    };
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Offline local save failing should never crash the game.
  }
}

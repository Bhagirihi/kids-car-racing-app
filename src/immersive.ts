// Immersive race mode — hide the Android status bar + navigation
// bar (footer / gesture bar) while racing, show them again on
// Home / Results / Pause.
//
// Status bar hiding is done with expo-status-bar's <StatusBar hidden>
// component (see App.tsx + RaceScreen.tsx). The navigation bar can
// only be hidden at runtime, so this helper wraps expo-navigation-bar.
//
// SDK 58's expo-navigation-bar API is the declarative <NavigationBar>
// component plus NavigationBar.setHidden(hidden) — there is NO
// setBehaviorAsync in this version (the old async visibility API is
// deprecated). setHidden is synchronous and Android-only; on iOS /
// web it warns and does nothing, so everything here is try/catch-
// guarded and a missing native module can never crash the game.
// (Native side: ExpoNavigationBar.setHidden uses sticky immersive
// flags, so a swipe from the edge can still bring the bar back
// temporarily — the player is never trapped without system UI.)

import { NavigationBar } from 'expo-navigation-bar';

export async function setImmersiveMode(immersive: boolean): Promise<void> {
  try {
    NavigationBar.setHidden(immersive);
  } catch {
    // No native module (iOS / web / old Expo Go): ignore silently.
  }
}

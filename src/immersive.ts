// Immersive race mode — hide the Android status bar + navigation
// bar (footer / gesture bar) while racing, show them again on
// Home / Results / Pause.
//
// BOTH bars are hidden imperatively here: expo-navigation-bar's
// setHidden for the nav bar + expo-status-bar's setStatusBarHidden
// for the status bar. The declarative <StatusBar> components in
// App.tsx / RaceScreen.tsx stay as the Expo-recommended path; the
// imperative calls are the belt-and-braces, so the hide does not
// depend on which <StatusBar> happens to be mounted last.
//
// Why a one-shot hide is NOT enough (found 2026-11-06 from Dhruv's
// phone screenshots): expo-navigation-bar's native setHidden uses
// BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE — an edge swipe brings the
// bars back, and any activity change can re-show them. So the hide
// must be (a) applied the moment RACE! is tapped, before the race
// screen paints (see App.tsx startRace), and (b) re-applied while
// racing (see RaceScreen's 700 ms re-hide interval + AppState
// listener). There is NO setBehaviorAsync in SDK 58 — the old async
// visibility API is deprecated; setHidden + re-apply is the way.
// Everything is try/catch-guarded: on iOS / web the native calls
// warn and do nothing, and a missing module can never crash the game.

import { NavigationBar } from 'expo-navigation-bar';
import { setStatusBarHidden } from 'expo-status-bar';

export async function setImmersiveMode(immersive: boolean): Promise<void> {
  try {
    NavigationBar.setHidden(immersive);
  } catch {
    // No native module (iOS / web / old Expo Go): ignore silently.
  }
  try {
    setStatusBarHidden(immersive, 'none');
  } catch {
    // Same guard as above.
  }
}

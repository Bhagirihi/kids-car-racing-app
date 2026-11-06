// Kids Car Racing — Expo SDK 58, TypeScript, React 19.
// Fun-only game for ages 3-8. Offline, no ads by default, no chat, no accounts.
// Screens: Home → Race → Results. Profile (coins / gems / trophies /
// unlocked levels / cars / paints / upgrades) persists in AsyncStorage.
//
// Money model (see README "Coin Shop & Parents Shop"):
// - Coins: earned by playing (stars, win bonus, daily +50). Spend in the Shop.
// - Gems: scarce — first win of a map +5, perfect race +10, first win of the
//   day +5, rewarded ads +10, or Gem packs in the Parents Shop.
// - Real money (RevenueCat, parent-gated): coin packs, gem packs, one-time
//   Unlock All, one-time Ad-Free. Unconfigured = not buyable, grants nothing.
// - Rewarded ads only, never banners/interstitials (see src/ads.ts). When
//   Ad-Free is owned, no rewarded-ad prompt is shown anywhere.

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { HomeScreen } from './src/screens/HomeScreen';
import { RaceScreen } from './src/screens/RaceScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { loadProfile, saveProfile } from './src/storage';
import { setImmersiveMode } from './src/immersive';
import { music } from './src/music';
import { isSfxEnabled, setSfxEnabled } from './src/sfx';
import { driverById, DRIVERS } from './src/data/drivers';
import { skinById, SKINS, VEHICLES, PAINTS, paintById } from './src/data/skins';
import { LEVELS } from './src/data/levels';
import { MAX_UPGRADES, UPGRADES, nextUpgradeCost, type UpgradeId } from './src/data/upgrades';
import { showRewardedAd } from './src/ads';
import { DEFAULT_PROFILE, DifficultyId, Profile, RaceResult } from './src/types';
import type { DriverViewMode } from './src/components/DriverFace';

type Screen =
  | { kind: 'home' }
  | { kind: 'race'; levelId: number; difficulty: DifficultyId; vehicleId: string; driverId: string; viewMode: DriverViewMode; extraHearts: number }
  | { kind: 'results'; result: RaceResult; race: { levelId: number; difficulty: DifficultyId; vehicleId: string; driverId: string; viewMode: DriverViewMode } };

const DAILY_COINS = 50;
const GEM_FIRST_WIN = 5;
const GEM_PERFECT_RACE = 10;
const GEM_DAILY_MISSION = 5;
const GEM_AD_REWARD = 10;
const GEM_TRIAL_COST = 5;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [screen, setScreen] = useState<Screen>({ kind: 'home' });
  const [musicOn, setMusicOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);
  const [dailyBonus, setDailyBonus] = useState(0);
  const dailyDone = useRef(false);

  // Landscape-only game: lock orientation on launch (app.json also
  // declares "landscape"). Phone must be held sideways.
  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    loadProfile().then((loaded) => {
      setProfile(loaded);
      // Daily coin bonus: +50 once per day, on the first Home open.
      if (!dailyDone.current && loaded.lastDailyBonus !== todayStr()) {
        dailyDone.current = true;
        const next = { ...loaded, points: loaded.points + DAILY_COINS, lastDailyBonus: todayStr() };
        setProfile(next);
        void saveProfile(next);
        setDailyBonus(DAILY_COINS);
      } else {
        dailyDone.current = true;
      }
    });
  }, []);

  // Immersive mode: hide the Android status bar + navigation bar
  // (footer / gesture bar) the moment a race starts, show them again
  // on Home / Results. Pause is handled inside RaceScreen (it calls
  // setImmersiveMode(false) while paused and re-hides on resume).
  // Cleanup restores the bars if the app unmounts mid-race.
  useEffect(() => {
    void setImmersiveMode(screen.kind === 'race');
    return () => {
      void setImmersiveMode(false);
    };
  }, [screen.kind]);

  const updateProfile = (next: Profile) => {
    setProfile(next);
    void saveProfile(next);
  };

  const toggleMusic = () => {
    const on = music.setEnabled(!musicOn);
    setMusicOn(on);
  };

  const toggleSfx = () => {
    const on = !sfxOn;
    setSfxEnabled(on);
    setSfxOn(on);
  };

  /** Clear a one-race trial (it reverts after the race, win or lose). */
  const clearTrial = (base: Profile): Profile =>
    base.trialVehicleId || base.trialPaintId
      ? { ...base, trialVehicleId: '', trialPaintId: '' }
      : base;

  const handleFinish = (result: RaceResult, race: { levelId: number; difficulty: DifficultyId; vehicleId: string; driverId: string; viewMode: DriverViewMode }) => {
    music.pause();
    setProfile((prev) => {
      const base0 = prev ?? DEFAULT_PROFILE;
      const base = clearTrial(base0);
      // Gem achievements: first win of a map +5, perfect race
      // (won with no hearts lost) +10, first win of the day +5.
      let gemsEarned = 0;
      if (result.won) {
        const firstWin = base.unlockedLevel === result.levelId;
        if (firstWin) gemsEarned += GEM_FIRST_WIN;
        if ((result.heartsLeft ?? 0) >= (result.maxHearts ?? 0) && (result.maxHearts ?? 0) > 0) gemsEarned += GEM_PERFECT_RACE;
        if (base.lastGemMission !== todayStr()) gemsEarned += GEM_DAILY_MISSION;
      }
      const next: Profile = {
        ...base,
        points: base.points + result.pointsEarned,
        gems: base.gems + gemsEarned,
        lastGemMission: result.won ? todayStr() : base.lastGemMission,
        trophies: base.trophies + (result.won ? 1 : 0),
        unlockedLevel: result.won
          ? Math.max(base.unlockedLevel, Math.min(LEVELS.length, result.levelId + 1))
          : base.unlockedLevel,
        bestScore: Math.max(base.bestScore, result.score),
      };
      void saveProfile(next);
      // Attach the gem bonus to the result shown on the trophy screen.
      setScreen({
        kind: 'results',
        result: { ...result, gemsEarned, coinsDoubled: false },
        race,
      });
      return next;
    });
  };

  if (!profile) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD93D' }}>
          <ActivityIndicator size="large" color="#B91C1C" />
          <StatusBar style="dark" />
        </View>
      </SafeAreaProvider>
    );
  }

  const skin = skinById(profile.equippedSkin);
  const driver = driverById(profile.selectedDriver);
  // Paint repaints the car in the race (trial paint first, then equipped paint).
  const paint = paintById(profile.trialPaintId || profile.equippedPaint);
  const raceVehicleId = profile.trialVehicleId || profile.selectedVehicle || driver.vehicleId;
  const raceVehicle = VEHICLES.find((v) => v.id === raceVehicleId) ?? VEHICLES[0];

  const startRace = (levelId: number, difficulty: DifficultyId, vehicleId: string, extraHearts = 0) => {
    music.start();
    setScreen({ kind: 'race', levelId, difficulty, vehicleId, driverId: profile.selectedDriver, viewMode: profile.viewMode, extraHearts });
  };

  if (screen.kind === 'race') {
    return (
      <SafeAreaProvider>
        {/* Status bar hidden for the whole race. RaceScreen renders its
            own <StatusBar> after this one, so on pause it can show the
            bar again (last mounted <StatusBar> wins). */}
        <StatusBar hidden />
        <RaceScreen
          levelId={screen.levelId}
          difficulty={screen.difficulty}
          vehicleId={screen.vehicleId}
          driver={driver}
          viewMode={screen.viewMode}
          skinColor={paint.color}
          skinAccent={paint.accent}
          skinId={skin.id}
          upgrades={profile.upgrades}
          vehicleSpeed={raceVehicle.speed}
          extraHearts={screen.extraHearts}
          musicOn={musicOn}
          sfxOn={sfxOn}
          onToggleMusic={toggleMusic}
          onToggleSfx={toggleSfx}
          onFinish={(r) => handleFinish(r, screen)}
          onQuit={() => {
            music.pause();
            setProfile((prev) => {
              const next = clearTrial(prev ?? DEFAULT_PROFILE);
              void saveProfile(next);
              return next;
            });
            setScreen({ kind: 'home' });
          }}
        />
      </SafeAreaProvider>
    );
  }

  if (screen.kind === 'results') {
    const { result, race } = screen;
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <ResultsScreen
          result={result}
          profile={profile}
          driver={driverById(race.driverId)}
          viewMode={race.viewMode}
          onNextLevel={() => startRace(Math.min(LEVELS.length, race.levelId + 1), race.difficulty, race.vehicleId)}
          onRaceAgain={() => startRace(race.levelId, race.difficulty, race.vehicleId)}
          onHome={() => setScreen({ kind: 'home' })}
          onDoubleCoins={
            !profile.adFree && !result.coinsDoubled
              ? async () => {
                  const ad = await showRewardedAd('double-coins');
                  if (ad !== 'earned') return ad;
                  setProfile((prev) => {
                    const base = prev ?? DEFAULT_PROFILE;
                    const next = { ...base, points: base.points + result.pointsEarned };
                    void saveProfile(next);
                    return next;
                  });
                  setScreen((s) =>
                    s.kind === 'results'
                      ? { ...s, result: { ...s.result, pointsEarned: s.result.pointsEarned * 2, coinsDoubled: true } }
                      : s,
                  );
                  return 'earned';
                }
              : undefined
          }
          onRetryWithHeart={
            !profile.adFree && !result.won
              ? async () => {
                  const ad = await showRewardedAd('retry-heart');
                  if (ad !== 'earned') return ad;
                  startRace(race.levelId, race.difficulty, race.vehicleId, 1);
                  return 'earned';
                }
              : undefined
          }
        />
      </SafeAreaProvider>
    );
  }

  // --- Shop helpers (coin/gem spending, all validated here) ---
  const spendCoins = (base: Profile, price: number): Profile | null =>
    base.points < price ? null : { ...base, points: base.points - price };
  const spendGems = (base: Profile, price: number): Profile | null =>
    base.gems < price ? null : { ...base, gems: base.gems - price };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <HomeScreen
        profile={profile}
        musicOn={musicOn}
        sfxOn={sfxOn}
        dailyBonus={dailyBonus}
        onToggleMusic={toggleMusic}
        onToggleSfx={toggleSfx}
        onSaveName={(name) => updateProfile({ ...profile, name })}
        onBuySkin={(skinId) => {
          const s = SKINS.find((x) => x.id === skinId);
          if (!s || profile.ownedSkins.includes(skinId)) return;
          const next = spendCoins(profile, s.price);
          if (!next) return;
          updateProfile({ ...next, ownedSkins: [...next.ownedSkins, skinId], equippedSkin: skinId });
        }}
        onEquipSkin={(skinId) => {
          if (profile.ownedSkins.includes(skinId)) updateProfile({ ...profile, equippedSkin: skinId });
        }}
        onSelectDriver={(driverId) => {
          if (profile.ownedDrivers.includes(driverId)) updateProfile({ ...profile, selectedDriver: driverId });
        }}
        onBuyDriver={(driverId) => {
          const d = DRIVERS.find((x) => x.id === driverId);
          if (!d || profile.ownedDrivers.includes(driverId)) return;
          const next = spendCoins(profile, d.price);
          if (!next) return;
          updateProfile({
            ...next,
            ownedDrivers: [...next.ownedDrivers, driverId],
            ownedVehicles: next.ownedVehicles.includes(d.vehicleId) ? next.ownedVehicles : [...next.ownedVehicles, d.vehicleId],
            selectedDriver: driverId,
          });
        }}
        onToggleViewMode={(mode) => updateProfile({ ...profile, viewMode: mode })}
        onBuyVehicle={(vehicleId, currency) => {
          const v = VEHICLES.find((x) => x.id === vehicleId);
          if (!v || profile.ownedVehicles.includes(vehicleId) || v.price === 0) return;
          const next = currency === 'gems' && v.gemPrice ? spendGems(profile, v.gemPrice) : spendCoins(profile, v.price);
          if (!next) return;
          updateProfile({ ...next, ownedVehicles: [...next.ownedVehicles, vehicleId], selectedVehicle: vehicleId });
        }}
        onEquipVehicle={(vehicleId) => {
          if (profile.ownedVehicles.includes(vehicleId)) updateProfile({ ...profile, selectedVehicle: vehicleId });
        }}
        onBuyPaint={(paintId, currency) => {
          const p = PAINTS.find((x) => x.id === paintId);
          if (!p || profile.ownedPaints.includes(paintId)) return;
          const next = currency === 'gems' && p.gemPrice ? spendGems(profile, p.gemPrice) : spendCoins(profile, p.price);
          if (!next) return;
          updateProfile({ ...next, ownedPaints: [...next.ownedPaints, paintId], equippedPaint: paintId });
        }}
        onEquipPaint={(paintId) => {
          if (profile.ownedPaints.includes(paintId)) updateProfile({ ...profile, equippedPaint: paintId });
        }}
        onBuyUpgrade={(upgradeId, how) => {
          const def = UPGRADES.find((u) => u.id === upgradeId);
          if (!def) return;
          const level = profile.upgrades[upgradeId];
          if (how === 'gems') {
            // Instant max-out with gems (the sink): jump straight to max level.
            if (level >= def.maxLevel || profile.gems < def.gemInstantCost) return;
            const next = spendGems(profile, def.gemInstantCost);
            if (!next) return;
            updateProfile({ ...next, upgrades: { ...next.upgrades, [upgradeId]: def.maxLevel } });
            return;
          }
          if (level >= def.maxLevel) return;
          const next = spendCoins(profile, nextUpgradeCost(upgradeId, level));
          if (!next) return;
          updateProfile({ ...next, upgrades: { ...next.upgrades, [upgradeId]: level + 1 } });
        }}
        onBuyLevel={(levelId, currency) => {
          const lv = LEVELS.find((x) => x.id === levelId);
          if (!lv || profile.purchasedLevels.includes(levelId) || levelId <= profile.unlockedLevel) return;
          const next = currency === 'gems' && lv.gemPrice ? spendGems(profile, lv.gemPrice) : spendCoins(profile, lv.price);
          if (!next) return;
          updateProfile({ ...next, purchasedLevels: [...next.purchasedLevels, levelId] });
        }}
        onGrantCoins={(coins, transactionId) => {
          if (profile.grantedTransactions.includes(transactionId)) return;
          updateProfile({
            ...profile,
            points: profile.points + coins,
            grantedTransactions: [...profile.grantedTransactions, transactionId],
          });
        }}
        onGrantGems={(gems, transactionId) => {
          if (profile.grantedTransactions.includes(transactionId)) return;
          updateProfile({
            ...profile,
            gems: profile.gems + gems,
            grantedTransactions: [...profile.grantedTransactions, transactionId],
          });
        }}
        onUnlockAll={() => {
          updateProfile({
            ...profile,
            unlockAll: true,
            ownedVehicles: VEHICLES.map((v) => v.id),
            ownedPaints: PAINTS.map((p) => p.id),
            ownedSkins: SKINS.map((s) => s.id),
            ownedDrivers: DRIVERS.map((d) => d.id),
            purchasedLevels: LEVELS.map((l) => l.id),
            upgrades: { ...MAX_UPGRADES },
          });
        }}
        onAdFree={() => updateProfile({ ...profile, adFree: true })}
        onEarnGemsAd={async () => {
          if (profile.adFree) return 'not-configured';
          const ad = await showRewardedAd('earn-gems');
          if (ad !== 'earned') return ad;
          updateProfile({ ...profile, gems: profile.gems + GEM_AD_REWARD });
          return 'earned';
        }}
        onTrialVehicle={async (vehicleId, how) => {
          if (how === 'gems') {
            if (profile.gems < GEM_TRIAL_COST) return 'failed';
            updateProfile({ ...profile, gems: profile.gems - GEM_TRIAL_COST, trialVehicleId: vehicleId });
            return 'earned';
          }
          if (profile.adFree) return 'not-configured';
          const ad = await showRewardedAd('trial');
          if (ad !== 'earned') return ad;
          updateProfile({ ...profile, trialVehicleId: vehicleId });
          return 'earned';
        }}
        onTrialPaint={async (paintId, how) => {
          if (how === 'gems') {
            if (profile.gems < GEM_TRIAL_COST) return 'failed';
            updateProfile({ ...profile, gems: profile.gems - GEM_TRIAL_COST, trialPaintId: paintId });
            return 'earned';
          }
          if (profile.adFree) return 'not-configured';
          const ad = await showRewardedAd('trial');
          if (ad !== 'earned') return ad;
          updateProfile({ ...profile, trialPaintId: paintId });
          return 'earned';
        }}
        onPlay={(levelId, difficulty, vehicleId) => startRace(levelId, difficulty, vehicleId)}
      />
    </SafeAreaProvider>
  );
}

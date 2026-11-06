// Kids Car Racing — Expo SDK 58, TypeScript, React 19.
// Fun-only game for ages 3–8. Offline, no ads, no chat, no accounts.
// Screens: Home → Race → Results. Profile (points / trophies /
// unlocked levels / skins) persists in AsyncStorage.

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { HomeScreen } from './src/screens/HomeScreen';
import { RaceScreen } from './src/screens/RaceScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { loadProfile, saveProfile } from './src/storage';
import { music } from './src/music';
import { isSfxEnabled, setSfxEnabled } from './src/sfx';
import { driverById, DRIVERS } from './src/data/drivers';
import { skinById, SKINS } from './src/data/skins';
import { DEFAULT_PROFILE, DifficultyId, Profile, RaceResult } from './src/types';
import type { DriverViewMode } from './src/components/DriverFace';

type Screen =
  | { kind: 'home' }
  | { kind: 'race'; levelId: number; difficulty: DifficultyId; vehicleId: string; driverId: string; viewMode: DriverViewMode }
  | { kind: 'results'; result: RaceResult; race: { levelId: number; difficulty: DifficultyId; vehicleId: string; driverId: string; viewMode: DriverViewMode } };

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [screen, setScreen] = useState<Screen>({ kind: 'home' });
  const [musicOn, setMusicOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);

  useEffect(() => {
    loadProfile().then(setProfile);
  }, []);

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

  const handleFinish = (result: RaceResult, race: { levelId: number; difficulty: DifficultyId; vehicleId: string; driverId: string; viewMode: DriverViewMode }) => {
    music.pause();
    setProfile((prev) => {
      const base = prev ?? DEFAULT_PROFILE;
      const next: Profile = {
        ...base,
        points: base.points + result.pointsEarned,
        trophies: base.trophies + (result.won ? 1 : 0),
        unlockedLevel: result.won
          ? Math.max(base.unlockedLevel, Math.min(5, result.levelId + 1))
          : base.unlockedLevel,
        bestScore: Math.max(base.bestScore, result.score),
      };
      void saveProfile(next);
      return next;
    });
    setScreen({ kind: 'results', result, race });
  };

  if (!profile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD93D' }}>
        <ActivityIndicator size="large" color="#B91C1C" />
        <StatusBar style="dark" />
      </View>
    );
  }

  const skin = skinById(profile.equippedSkin);
  const driver = driverById(profile.selectedDriver);

  if (screen.kind === 'race') {
    return (
      <>
        <StatusBar style="dark" />
        <RaceScreen
          levelId={screen.levelId}
          difficulty={screen.difficulty}
          vehicleId={screen.vehicleId}
          driver={driver}
          viewMode={screen.viewMode}
          skinColor={skin.color}
          skinAccent={skin.accent}
          musicOn={musicOn}
          sfxOn={sfxOn}
          onToggleMusic={toggleMusic}
          onToggleSfx={toggleSfx}
          onFinish={(r) => handleFinish(r, screen)}
          onQuit={() => { music.pause(); setScreen({ kind: 'home' }); }}
        />
      </>
    );
  }

  if (screen.kind === 'results') {
    const { result, race } = screen;
    return (
      <>
        <StatusBar style="dark" />
        <ResultsScreen
          result={result}
          profile={profile}
          driver={driverById(race.driverId)}
          viewMode={race.viewMode}
          onNextLevel={() => setScreen({ kind: 'race', levelId: race.levelId + 1, difficulty: race.difficulty, vehicleId: race.vehicleId, driverId: race.driverId, viewMode: race.viewMode })}
          onRaceAgain={() => setScreen({ kind: 'race', levelId: race.levelId, difficulty: race.difficulty, vehicleId: race.vehicleId, driverId: race.driverId, viewMode: race.viewMode })}
          onHome={() => setScreen({ kind: 'home' })}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <HomeScreen
        profile={profile}
        musicOn={musicOn}
        sfxOn={sfxOn}
        onToggleMusic={toggleMusic}
        onToggleSfx={toggleSfx}
        onSaveName={(name) => updateProfile({ ...profile, name })}
        onBuySkin={(skinId) => {
          const s = SKINS.find((x) => x.id === skinId);
          if (!s || profile.ownedSkins.includes(skinId) || profile.points < s.price) return;
          updateProfile({
            ...profile,
            points: profile.points - s.price,
            ownedSkins: [...profile.ownedSkins, skinId],
            equippedSkin: skinId,
          });
        }}
        onEquipSkin={(skinId) => {
          if (profile.ownedSkins.includes(skinId)) updateProfile({ ...profile, equippedSkin: skinId });
        }}
        onSelectDriver={(driverId) => {
          if (profile.ownedDrivers.includes(driverId)) updateProfile({ ...profile, selectedDriver: driverId });
        }}
        onBuyDriver={(driverId) => {
          const d = DRIVERS.find((x) => x.id === driverId);
          if (!d || profile.ownedDrivers.includes(driverId) || profile.points < d.price) return;
          updateProfile({
            ...profile,
            points: profile.points - d.price,
            ownedDrivers: [...profile.ownedDrivers, driverId],
            selectedDriver: driverId,
          });
        }}
        onToggleViewMode={(mode) => updateProfile({ ...profile, viewMode: mode })}
        onPlay={(levelId, difficulty, vehicleId) => {
          music.start();
          setScreen({ kind: 'race', levelId, difficulty, vehicleId, driverId: profile.selectedDriver, viewMode: profile.viewMode });
        }}
      />
    </>
  );
}

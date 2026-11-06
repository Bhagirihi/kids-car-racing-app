// Trophy results screen — LANDSCAPE game layout.
// Left: big driver face + trophy. Right: title, stats (stars, score,
// top speed, time, points, trophies) and big game buttons.
// Personalised with the driver's name and the chosen 2D / 3D look.

import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DriverFace, DriverViewMode } from '../components/DriverFace';
import type { Driver } from '../data/drivers';
import { LEVELS } from '../data/levels';
import { Profile, RaceResult } from '../types';

interface Props {
  result: RaceResult;
  profile: Profile;
  driver: Driver;
  viewMode: DriverViewMode;
  onNextLevel: () => void;
  onRaceAgain: () => void;
  onHome: () => void;
  /** Rewarded-ad "Double my coins" (won races). Undefined when Ad-Free or already used. Returns the ad result. */
  onDoubleCoins?: () => Promise<'earned' | 'not-configured' | 'cancelled' | 'failed'>;
  /** Rewarded-ad "Try again +1 heart" (lost races). Undefined when Ad-Free or the race was won. */
  onRetryWithHeart?: () => Promise<'earned' | 'not-configured' | 'cancelled' | 'failed'>;
}

export function ResultsScreen({ result, profile, driver, viewMode, onNextLevel, onRaceAgain, onHome, onDoubleCoins, onRetryWithHeart }: Props) {
  const level = LEVELS.find((l) => l.id === result.levelId) ?? LEVELS[0];
  const name = profile.name.trim() || 'Super Driver';
  const hasNext = result.won && result.levelId < LEVELS.length;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const time = result.timeSeconds ?? 0;
  const mm = String(Math.floor(time / 60)).padStart(2, '0');
  const ss = String(time % 60).padStart(2, '0');
  const [adMsg, setAdMsg] = useState('');
  const [adBusy, setAdBusy] = useState(false);
  const runAd = async (kind: 'double' | 'retry') => {
    const fn = kind === 'double' ? onDoubleCoins : onRetryWithHeart;
    if (!fn || adBusy) return;
    setAdBusy(true);
    const r = await fn();
    setAdBusy(false);
    if (r === 'earned') setAdMsg(kind === 'double' ? 'Coins doubled! 🎉' : 'Extra heart ready — good luck!');
    else if (r === 'not-configured') setAdMsg('Ads are not set up yet — nothing was granted.');
    else if (r === 'cancelled') setAdMsg('Ad closed early — nothing was granted.');
    else setAdMsg('The ad could not load — nothing was granted.');
  };
  return (
    <LinearGradient colors={result.won ? ['#FDE68A', '#86EFAC'] : ['#BFDBFE', '#FBCFE8']} style={styles.bg}>
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8, paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
        {/* LEFT — driver + trophy */}
        <View style={styles.left}>
          <DriverFace driver={driver} mode={viewMode} size={120} />
          <Text style={styles.emoji}>{result.won ? '🏆' : '💪'}</Text>
          <Text style={styles.driverLine}>{driver.faceEmoji} {driver.name} — “{driver.tagline}”</Text>
        </View>
        {/* RIGHT — title, stats, game buttons */}
        <View style={[styles.right, { width: Math.min(480, width * 0.58) }]}>
          <Text style={styles.title}>{result.won ? `Great job, ${name}!` : `Good try, ${name}!`}</Text>
          <Text style={styles.sub}>
            {result.won ? `You won ${level.name}!` : `You got ${result.stars}/${level.starGoal} stars on ${level.name}. Try again!`}
          </Text>
          <View style={styles.statsGrid}>
            <Text style={styles.stat}>⭐ Stars{'\n'}{result.stars} / {level.starGoal}</Text>
            <Text style={styles.stat}>🏆 Score{'\n'}{result.score}</Text>
            <Text style={styles.stat}>💨 Top speed{'\n'}{result.topSpeedMph ?? 0} MPH</Text>
            <Text style={styles.stat}>⏱️ Time{'\n'}{mm}:{ss}</Text>
            <Text style={styles.stat}>🪙 Coins{'\n'}+{result.pointsEarned}{result.coinsDoubled ? ' ×2!' : ''}</Text>
            <Text style={styles.stat}>💎 Gems{'\n'}+{result.gemsEarned ?? 0}</Text>
            <Text style={styles.stat}>💰 Total{'\n'}{profile.points} 🪙 • {profile.gems} 💎</Text>
          </View>
          {adMsg ? <Text style={styles.adMsg}>{adMsg}</Text> : null}
          <View style={styles.btnRow}>
            {result.won && onDoubleCoins && !result.coinsDoubled && (
              <TouchableOpacity style={[styles.btn, styles.adBtn]} onPress={() => void runAd('double')} disabled={adBusy}>
                <Text style={styles.btnText}>📺 Double Coins</Text>
              </TouchableOpacity>
            )}
            {!result.won && onRetryWithHeart && (
              <TouchableOpacity style={[styles.btn, styles.adBtn]} onPress={() => void runAd('retry')} disabled={adBusy}>
                <Text style={styles.btnText}>📺 Try Again +1 ❤️</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.btnRow}>
            {hasNext && (
              <TouchableOpacity style={[styles.btn, styles.nextBtn]} onPress={onNextLevel}>
                <Text style={styles.btnText}>➡ Next Level</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.btn, styles.againBtn]} onPress={onRaceAgain}>
              <Text style={styles.btnText}>🔁 Race Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.homeBtn]} onPress={onHome}>
              <Text style={styles.btnText}>🏠 Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  root: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  left: { alignItems: 'center', width: 210 },
  driverLine: { fontSize: 15, fontWeight: '800', color: '#475569', textAlign: 'center', marginTop: 8 },
  emoji: { fontSize: 64 },
  right: { justifyContent: 'center' },
  title: { fontSize: 36, fontWeight: '900', color: '#1E293B', textAlign: 'center' },
  sub: { fontSize: 17, fontWeight: '700', color: '#64748B', textAlign: 'center', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  stat: { width: '31%', backgroundColor: '#fff', borderRadius: 16, padding: 12, fontSize: 16, fontWeight: '900', color: '#1E293B', textAlign: 'center', elevation: 3 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  adBtn: { backgroundColor: '#7C3AED' },
  adMsg: { textAlign: 'center', fontWeight: '800', color: '#5B21B6', marginTop: 10 },
  btn: { flex: 1, borderRadius: 20, paddingVertical: 18, borderBottomWidth: 5, borderBottomColor: 'rgba(0,0,0,0.25)', elevation: 4 },
  nextBtn: { backgroundColor: '#22C55E' },
  againBtn: { backgroundColor: '#F59E0B' },
  homeBtn: { backgroundColor: '#3B82F6' },
  btnText: { color: '#fff', fontSize: 19, fontWeight: '900', textAlign: 'center' },
});

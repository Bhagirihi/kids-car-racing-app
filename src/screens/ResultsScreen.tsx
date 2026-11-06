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
  doubleLabel?: string;
  retryLabel?: string;
  /** 'ad' talks about ads; 'gems' is the offline bonus that spends gems. */
  bonusMode?: 'ad' | 'gems';
}

export function ResultsScreen({ result, profile, driver, viewMode, onNextLevel, onRaceAgain, onHome, onDoubleCoins, onRetryWithHeart, doubleLabel, retryLabel, bonusMode = 'ad' }: Props) {
  const level = LEVELS.find((l) => l.id === result.levelId) ?? LEVELS[0];
  const name = profile.name.trim() || 'Super Driver';
  const hasNext = result.won && result.levelId < LEVELS.length;
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < 430;
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
    else if (r === 'cancelled') setAdMsg('Closed early — nothing was granted.');
    else setAdMsg(bonusMode === 'gems' ? 'Need a few more gems.' : 'Could not play the ad — nothing was granted.');
  };
  const starBurst = '⭐'.repeat(Math.min(12, Math.max(result.stars, result.won ? 3 : 1)));
  return (
    <LinearGradient colors={result.won ? ['#FDE68A', '#FDBA74', '#86EFAC'] : ['#BFDBFE', '#FBCFE8']} style={styles.bg}>
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8, paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
        <View style={styles.stage}>
          <View style={styles.left}>
            <Text style={[styles.emoji, compact && { fontSize: 48 }]}>{result.won ? '🏆' : '💪'}</Text>
            <DriverFace driver={driver} mode={viewMode} size={compact ? 84 : 108} />
            <Text style={styles.driverLine}>{driver.faceEmoji} {driver.name}</Text>
            <Text style={styles.burst}>{starBurst}</Text>
          </View>
          <View style={styles.right}>
            <Text style={[styles.title, compact && { fontSize: 28 }]}>{result.won ? `You win, ${name}!` : `So close, ${name}!`}</Text>
            <Text style={styles.sub}>
              {result.won ? `${level.icon} ${level.name} is yours!` : `${result.stars}/${level.starGoal} stars on ${level.icon} ${level.name}`}
            </Text>
            <View style={styles.statsGrid}>
              <Text style={styles.stat}>⭐ {result.stars}/{level.starGoal}</Text>
              <Text style={styles.stat}>🏆 {result.score}</Text>
              <Text style={styles.stat}>💨 {result.topSpeedMph ?? 0}</Text>
              <Text style={styles.stat}>⏱️ {mm}:{ss}</Text>
              <Text style={styles.stat}>🪙 +{result.pointsEarned}{result.coinsDoubled ? ' ×2' : ''}</Text>
              <Text style={styles.stat}>💎 +{result.gemsEarned ?? 0}</Text>
            </View>
            {adMsg ? <Text style={styles.adMsg}>{adMsg}</Text> : null}
          </View>
        </View>
        <View style={styles.btnRow}>
          {result.won && onDoubleCoins && !result.coinsDoubled && (
            <TouchableOpacity style={[styles.btn, styles.adBtn]} onPress={() => void runAd('double')} disabled={adBusy}>
              <Text style={styles.btnText}>{doubleLabel ?? 'Double Coins'}</Text>
            </TouchableOpacity>
          )}
          {!result.won && onRetryWithHeart && (
            <TouchableOpacity style={[styles.btn, styles.adBtn]} onPress={() => void runAd('retry')} disabled={adBusy}>
              <Text style={styles.btnText}>{retryLabel ?? 'Try Again +1 ❤️'}</Text>
            </TouchableOpacity>
          )}
          {hasNext && (
            <TouchableOpacity style={[styles.btn, styles.nextBtn]} onPress={onNextLevel}>
              <Text style={styles.btnText}>➡ Next</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.btn, styles.againBtn]} onPress={onRaceAgain}>
            <Text style={styles.btnText}>🔁 Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.homeBtn]} onPress={onHome}>
            <Text style={styles.btnText}>🏠 Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  root: { flex: 1, justifyContent: 'space-between' },
  stage: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  left: { alignItems: 'center', width: 200 },
  driverLine: { fontSize: 16, fontWeight: '900', color: '#1E293B', textAlign: 'center', marginTop: 4 },
  burst: { fontSize: 18, marginTop: 2, letterSpacing: 1 },
  emoji: { fontSize: 64 },
  right: { flex: 1, justifyContent: 'center', maxWidth: 520 },
  title: { fontSize: 34, fontWeight: '900', color: '#1E293B', textAlign: 'center' },
  sub: { fontSize: 16, fontWeight: '800', color: '#475569', textAlign: 'center', marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, justifyContent: 'center' },
  stat: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, fontSize: 16, fontWeight: '900', color: '#1E293B', textAlign: 'center', elevation: 3 },
  btnRow: { flexDirection: 'row', gap: 10 },
  adBtn: { backgroundColor: '#7C3AED' },
  adMsg: { textAlign: 'center', fontWeight: '800', color: '#5B21B6', marginTop: 10 },
  btn: { flex: 1, borderRadius: 20, paddingVertical: 18, borderBottomWidth: 5, borderBottomColor: 'rgba(0,0,0,0.25)', elevation: 4 },
  nextBtn: { backgroundColor: '#22C55E' },
  againBtn: { backgroundColor: '#F59E0B' },
  homeBtn: { backgroundColor: '#3B82F6' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '900', textAlign: 'center' },
});

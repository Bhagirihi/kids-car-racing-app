// Trophy results screen — LANDSCAPE, sleek dark podium style.
// Gold "YOU WIN!" on a dark gold-lit background, confetti falling,
// chunky reward rows in dark glass, big chunky buttons. A win must
// feel like a party to a 4-year-old (competitor Must #4).
// Behaviour is unchanged: same props, same ad/gem double + retry,
// same Next / Again / Home flow.

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

// Confetti pieces — fixed pseudo-random scatter (stable per render).
const CONFETTI = [
  { left: '6%', top: '8%', color: '#FFC531', size: 10, rot: '20deg' },
  { left: '14%', top: '22%', color: '#2FD8FF', size: 8, rot: '-30deg' },
  { left: '24%', top: '6%', color: '#FF3B30', size: 9, rot: '45deg' },
  { left: '33%', top: '16%', color: '#37D67A', size: 8, rot: '10deg' },
  { left: '46%', top: '5%', color: '#FF7A1A', size: 10, rot: '-15deg' },
  { left: '58%', top: '18%', color: '#FFC531', size: 8, rot: '35deg' },
  { left: '68%', top: '7%', color: '#2FD8FF', size: 9, rot: '-40deg' },
  { left: '78%', top: '20%', color: '#FF3B30', size: 8, rot: '25deg' },
  { left: '88%', top: '9%', color: '#37D67A', size: 10, rot: '-20deg' },
  { left: '94%', top: '24%', color: '#FF7A1A', size: 8, rot: '50deg' },
  { left: '10%', top: '38%', color: '#FFC531', size: 7, rot: '-10deg' },
  { left: '90%', top: '40%', color: '#2FD8FF', size: 7, rot: '30deg' },
];

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
    <LinearGradient colors={result.won ? ['#3A2A10', '#171208', '#0A0C12'] : ['#12151F', '#0A0C12']} style={styles.bg}>
      {/* Confetti — the party, on wins and on close finishes alike. */}
      {CONFETTI.map((c, i) => (
        <View key={i} style={[styles.confetti, { left: c.left, top: c.top, width: c.size, height: c.size * 1.4, backgroundColor: c.color, transform: [{ rotate: c.rot }] }]} />
      ))}
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8, paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
        <View style={styles.stage}>
          <View style={styles.left}>
            <Text style={[styles.emoji, compact && { fontSize: 48 }]}>{result.won ? '🏆' : '💪'}</Text>
            <DriverFace driver={driver} mode={viewMode} size={compact ? 84 : 108} />
            <Text style={styles.driverLine}>{driver.faceEmoji} {driver.name}</Text>
            <Text style={styles.burst}>{starBurst}</Text>
          </View>
          <View style={styles.right}>
            <Text style={[styles.title, compact && { fontSize: 28 }]}>{result.won ? 'YOU WIN!' : `SO CLOSE!`}</Text>
            <Text style={styles.sub}>
              {result.won ? `${name} — 1st place on ${level.icon} ${level.name}!` : `${name} — ${result.stars}/${level.starGoal} stars on ${level.icon} ${level.name}`}
            </Text>
            <View style={styles.statsGrid}>
              <Text style={styles.stat}>⭐ {result.stars}/{level.starGoal}</Text>
              <Text style={styles.stat}>🏆 {result.score}</Text>
              <Text style={styles.stat}>💨 {result.topSpeedMph ?? 0} MPH</Text>
              <Text style={styles.stat}>⏱️ {mm}:{ss}</Text>
              <Text style={[styles.stat, styles.statGold]}>🪙 +{result.pointsEarned}{result.coinsDoubled ? ' ×2' : ''}</Text>
              <Text style={[styles.stat, styles.statGold]}>💎 +{result.gemsEarned ?? 0}</Text>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  confetti: { position: 'absolute', borderRadius: 2, zIndex: 1 },
  root: { flex: 1, justifyContent: 'space-between', zIndex: 2 },
  stage: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  left: { alignItems: 'center', width: 200 },
  driverLine: { fontSize: 16, fontWeight: '900', color: '#F2F4F8', textAlign: 'center', marginTop: 4 },
  burst: { fontSize: 18, marginTop: 2, letterSpacing: 1 },
  emoji: { fontSize: 64 },
  right: { flex: 1, justifyContent: 'center', maxWidth: 520 },
  title: { fontSize: 40, fontWeight: '900', fontStyle: 'italic', color: '#FFC531', textAlign: 'center', textShadowColor: 'rgba(255,150,50,0.5)', textShadowRadius: 10 },
  sub: { fontSize: 16, fontWeight: '800', color: '#C7CEDE', textAlign: 'center', marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, justifyContent: 'center' },
  stat: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, fontSize: 16, fontWeight: '900', color: '#F2F4F8', textAlign: 'center', elevation: 3 },
  statGold: { color: '#FFC531', borderColor: 'rgba(255,197,49,0.45)' },
  btnRow: { flexDirection: 'row', gap: 10 },
  adBtn: { backgroundColor: '#7C3AED', borderBottomColor: '#5B21B6' },
  adMsg: { textAlign: 'center', fontWeight: '800', color: '#C4B5FD', marginTop: 10 },
  btn: { flex: 1, borderRadius: 20, paddingVertical: 18, borderBottomWidth: 5, borderBottomColor: 'rgba(0,0,0,0.25)', elevation: 4 },
  nextBtn: { backgroundColor: '#FF6A00', borderBottomColor: '#8F3200' },
  againBtn: { backgroundColor: '#0E9FD0', borderBottomColor: '#064A63' },
  homeBtn: { backgroundColor: '#2A3040', borderBottomColor: '#0B0D13' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '900', fontStyle: 'italic', textAlign: 'center' },
});

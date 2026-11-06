// Trophy results screen — LANDSCAPE game layout.
// Left: big driver face + trophy. Right: title, stats (stars, score,
// top speed, time, points, trophies) and big game buttons.
// Personalised with the driver's name and the chosen 2D / 3D look.

import React from 'react';
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
}

export function ResultsScreen({ result, profile, driver, viewMode, onNextLevel, onRaceAgain, onHome }: Props) {
  const level = LEVELS.find((l) => l.id === result.levelId) ?? LEVELS[0];
  const name = profile.name.trim() || 'Super Driver';
  const hasNext = result.won && result.levelId < LEVELS.length;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const time = result.timeSeconds ?? 0;
  const mm = String(Math.floor(time / 60)).padStart(2, '0');
  const ss = String(time % 60).padStart(2, '0');
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
            <Text style={styles.stat}>✨ Points{'\n'}+{result.pointsEarned}</Text>
            <Text style={styles.stat}>💰 Total{'\n'}{profile.points} • 🏆 {profile.trophies}</Text>
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
  btn: { flex: 1, borderRadius: 20, paddingVertical: 18, borderBottomWidth: 5, borderBottomColor: 'rgba(0,0,0,0.25)', elevation: 4 },
  nextBtn: { backgroundColor: '#22C55E' },
  againBtn: { backgroundColor: '#F59E0B' },
  homeBtn: { backgroundColor: '#3B82F6' },
  btnText: { color: '#fff', fontSize: 19, fontWeight: '900', textAlign: 'center' },
});

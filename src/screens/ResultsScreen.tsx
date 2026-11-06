// Trophy results screen, personalised with the driver's name — and
// the selected cartoon driver (in the chosen 2D / 3D look).

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  return (
    <LinearGradient colors={result.won ? ['#FDE68A', '#86EFAC'] : ['#BFDBFE', '#FBCFE8']} style={styles.bg}>
      <View style={styles.card}>
        <DriverFace driver={driver} mode={viewMode} size={96} />
        <Text style={styles.driverLine}>{driver.faceEmoji} {driver.name} the {driver.job} — “{driver.tagline}”</Text>
        <Text style={styles.emoji}>{result.won ? '🏆' : '💪'}</Text>
        <Text style={styles.title}>
          {result.won ? `Great job, ${name}!` : `Good try, ${name}!`}
        </Text>
        <Text style={styles.sub}>
          {result.won
            ? `You won ${level.name}!`
            : `You got ${result.stars}/${level.starGoal} stars on ${level.name}. Try again!`}
        </Text>
        <View style={styles.rows}>
          <Text style={styles.row}>⭐ Stars: {result.stars} / {level.starGoal}</Text>
          <Text style={styles.row}>🏆 Score: {result.score}</Text>
          <Text style={styles.row}>✨ Points earned: +{result.pointsEarned}</Text>
          <Text style={styles.row}>💰 Total points: {profile.points}</Text>
          <Text style={styles.row}>🏆 Trophies: {profile.trophies}</Text>
        </View>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', alignItems: 'center', elevation: 4 },
  driverLine: { fontSize: 15, fontWeight: '800', color: '#64748B', textAlign: 'center', marginTop: 8 },
  emoji: { fontSize: 64 },
  title: { fontSize: 26, fontWeight: '900', color: '#1E293B', textAlign: 'center', marginTop: 8 },
  sub: { fontSize: 16, fontWeight: '700', color: '#64748B', textAlign: 'center', marginTop: 6 },
  rows: { marginTop: 16, width: '100%', gap: 6 },
  row: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  btn: { borderRadius: 18, padding: 16, marginTop: 12, width: '100%' },
  nextBtn: { backgroundColor: '#22C55E' },
  againBtn: { backgroundColor: '#F59E0B' },
  homeBtn: { backgroundColor: '#3B82F6' },
  btnText: { color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center' },
});

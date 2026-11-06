// Home page: driver name, points / trophies / skins at a glance,
// DRIVERS — cartoon animal drivers with a 2D / 3D view toggle
// (tapping a card picks that driver + their vehicle for the race),
// level picker (locked levels show 🔒), difficulty Low/Mid/High,
// skin picker (buy with points, then equip), Play button.

import React, { useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LEVELS } from '../data/levels';
import { DRIVERS, driverById } from '../data/drivers';
import { SKINS, skinById } from '../data/skins';
import { CarView } from '../components/CarView';
import { DriverFace, DriverViewMode } from '../components/DriverFace';
import { DIFFICULTY_ORDER, DIFFICULTIES, DifficultyId, Profile } from '../types';

interface Props {
  profile: Profile;
  musicOn: boolean;
  sfxOn: boolean;
  onToggleMusic: () => void;
  onToggleSfx: () => void;
  onSaveName: (name: string) => void;
  onBuySkin: (skinId: string) => void;
  onEquipSkin: (skinId: string) => void;
  onSelectDriver: (driverId: string) => void;
  onBuyDriver: (driverId: string) => void;
  onToggleViewMode: (mode: DriverViewMode) => void;
  onPlay: (levelId: number, difficulty: DifficultyId, vehicleId: string) => void;
}

export function HomeScreen(props: Props) {
  const { profile } = props;
  const [name, setName] = useState(profile.name);
  const [levelId, setLevelId] = useState(1);
  const [difficulty, setDifficulty] = useState<DifficultyId>('low');
  const [shopMsg, setShopMsg] = useState('');

  const equipped = skinById(profile.equippedSkin);
  const selectedDriver = driverById(profile.selectedDriver);
  const viewMode = profile.viewMode;

  return (
    <LinearGradient colors={['#7DD3FC', '#FEF9C3']} style={styles.bg}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>🏁 Kids Car Racing 🏎️</Text>
        <Text style={styles.subtitle}>Fun-only racing for ages 3–8 • No ads • Offline</Text>

        {/* Driver name + points at a glance */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Your driver</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="Type your name…"
            placeholderTextColor="#94A3B8"
            value={name}
            maxLength={14}
            onChangeText={setName}
            onBlur={() => props.onSaveName(name.trim())}
            returnKeyType="done"
            onSubmitEditing={() => props.onSaveName(name.trim())}
          />
          <View style={styles.statsRow}>
            <Text style={styles.stat}>⭐ {profile.points} points</Text>
            <Text style={styles.stat}>🏆 {profile.trophies} trophies</Text>
            <Text style={styles.stat}>🎨 {profile.ownedSkins.length}/6 skins</Text>
          </View>
          <Text style={styles.best}>Best score: {profile.bestScore} • 🐶 {profile.ownedDrivers.length}/4 drivers</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity style={styles.toggle} onPress={props.onToggleMusic}>
              <Text style={styles.toggleText}>{props.musicOn ? '🎵 Music: On' : '🎵 Music: Off'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toggle} onPress={props.onToggleSfx}>
              <Text style={styles.toggleText}>{props.sfxOn ? '🔊 Sound: On' : '🔊 Sound: Off'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Drivers — cartoon animal drivers. Tapping a card picks that
            driver + their vehicle for the race. Locked drivers are bought
            with points, like skins. The 2D / 3D toggle switches the card
            preview (and the driver in the race) between the flat cartoon
            look and the glossy 3D look. */}
        <View style={styles.driverHeader}>
          <Text style={styles.section}>🐶 Pick your driver</Text>
          <View style={styles.viewToggle}>
            {(['2d', '3d'] as DriverViewMode[]).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => props.onToggleViewMode(m)}
                style={[styles.viewBtn, viewMode === m && styles.viewBtnSelected]}
              >
                <Text style={[styles.viewBtnText, viewMode === m && styles.viewBtnTextSelected]}>
                  {m === '2d' ? '2D' : '3D'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <Text style={styles.viewHint}>
          {viewMode === '2d' ? '2D — flat cartoon, like the game banner' : '3D — glossy and shaded, like the big close-up'}
        </Text>
        {shopMsg ? <Text style={styles.shopMsg}>{shopMsg}</Text> : null}
        <View style={styles.grid}>
          {DRIVERS.map((d) => {
            const owned = profile.ownedDrivers.includes(d.id);
            const isSelected = profile.selectedDriver === d.id;
            return (
              <TouchableOpacity
                key={d.id}
                style={[styles.driverCard, isSelected && styles.levelSelected]}
                onPress={() => {
                  if (owned) { props.onSelectDriver(d.id); setShopMsg(`${d.name} is racing! ${d.tagline}`); }
                  else if (profile.points >= d.price) { props.onBuyDriver(d.id); setShopMsg(`${d.name} joined your team! 🎉`); }
                  else setShopMsg(`Need ${d.price - profile.points} more points for ${d.name}.`);
                }}
              >
                <DriverFace driver={d} mode={viewMode} size={84} />
                <View style={{ marginTop: 4, alignItems: 'center' }}>
                  <CarView color={d.carColor} accent={d.carAccent} emoji={d.vehicleEmoji} width={64} mode={viewMode} />
                </View>
                <Text style={styles.levelName}>{d.faceEmoji} {d.name}</Text>
                <Text style={styles.levelGoal}>{d.job} • {d.vehicleName}</Text>
                <Text style={styles.levelTag}>“{d.tagline}”</Text>
                <Text style={styles.levelGoal}>
                  {isSelected ? '✅ Racing!' : owned ? 'Tap to pick' : d.price === 0 ? 'FREE' : `⭐ ${d.price} points`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.equippedNote}>Racing now: {selectedDriver.faceEmoji} {selectedDriver.name} — {selectedDriver.vehicleName}</Text>

        {/* Levels — win level N to unlock N+1 */}
        <Text style={styles.section}>🗺️ Pick a level</Text>
        <View style={styles.grid}>
          {LEVELS.map((lv) => {
            const locked = lv.id > profile.unlockedLevel;
            const selected = lv.id === levelId;
            return (
              <TouchableOpacity
                key={lv.id}
                disabled={locked}
                onPress={() => setLevelId(lv.id)}
                style={[styles.levelCard, selected && styles.levelSelected, locked && styles.levelLocked]}
              >
                <Text style={styles.levelIcon}>{locked ? '🔒' : lv.icon}</Text>
                <Text style={styles.levelName}>{lv.name}</Text>
                <Text style={styles.levelGoal}>⭐ {lv.starGoal} stars</Text>
                <Text style={styles.levelTag}>{locked ? 'Win level ' + (lv.id - 1) + ' first!' : lv.tagline}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Difficulty */}
        <Text style={styles.section}>💪 How hard?</Text>
        <View style={styles.row}>
          {DIFFICULTY_ORDER.map((id) => {
            const d = DIFFICULTIES[id];
            return (
              <TouchableOpacity
                key={id}
                onPress={() => setDifficulty(id)}
                style={[styles.diffBtn, difficulty === id && styles.diffSelected]}
              >
                <Text style={styles.diffLabel}>{d.label}</Text>
                <Text style={styles.diffDetail}>❤️ {d.hearts} hearts</Text>
                <Text style={styles.diffDetail}>+{d.winBonus} win bonus</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Skins shop — buy with points, then equip (paints your car) */}
        <Text style={styles.section}>🎨 Car skins</Text>
        {shopMsg ? <Text style={styles.shopMsg}>{shopMsg}</Text> : null}
        <View style={styles.grid}>
          {SKINS.map((s) => {
            const owned = profile.ownedSkins.includes(s.id);
            const isEquipped = profile.equippedSkin === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.skinCard, isEquipped && styles.levelSelected]}
                onPress={() => {
                  if (owned) { props.onEquipSkin(s.id); setShopMsg(s.name + ' equipped!'); }
                  else if (profile.points >= s.price) { props.onBuySkin(s.id); setShopMsg(s.name + ' bought! 🎉'); }
                  else setShopMsg(`Need ${s.price - profile.points} more points for ${s.name}.`);
                }}
              >
                <View style={[styles.skinSwatch, { backgroundColor: s.color }]}>
                  <Text style={styles.skinEmoji}>{s.emoji}</Text>
                </View>
                <Text style={styles.levelName}>{s.name}</Text>
                <Text style={styles.levelGoal}>
                  {isEquipped ? '✅ Equipped' : owned ? 'Tap to equip' : `⭐ ${s.price} points`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.equippedNote}>Equipped now: {equipped.emoji} {equipped.name}</Text>

        <TouchableOpacity style={styles.playBtn} onPress={() => props.onPlay(levelId, difficulty, selectedDriver.vehicleId)}>
          <Text style={styles.playText}>▶ START RACE</Text>
        </TouchableOpacity>
        <Text style={styles.parentNote}>
          For parents: offline, no ads, no chat, no accounts. Points, trophies and skins are
          saved on this phone only.
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '900', color: '#B91C1C', textAlign: 'center', marginTop: 8 },
  subtitle: { textAlign: 'center', color: '#475569', marginBottom: 14, fontWeight: '600' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  nameInput: { borderWidth: 2, borderColor: '#FACC15', borderRadius: 12, padding: 12, fontSize: 18, marginTop: 8, color: '#1E293B', backgroundColor: '#FEFCE8' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  stat: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  best: { marginTop: 6, color: '#64748B', fontWeight: '700' },
  toggleRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  toggle: { flex: 1, backgroundColor: '#E0F2FE', borderRadius: 12, padding: 10, alignItems: 'center' },
  toggleText: { fontWeight: '800', color: '#075985' },
  section: { fontSize: 20, fontWeight: '900', color: '#1E293B', marginTop: 20, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  levelCard: { width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 3, borderColor: 'transparent' },
  levelSelected: { borderColor: '#F59E0B' },
  levelLocked: { opacity: 0.55 },
  levelIcon: { fontSize: 30, textAlign: 'center' },
  levelName: { fontWeight: '800', textAlign: 'center', color: '#1E293B' },
  levelGoal: { textAlign: 'center', color: '#64748B', fontWeight: '700' },
  levelTag: { textAlign: 'center', color: '#94A3B8', fontSize: 12 },
  row: { flexDirection: 'row', gap: 10 },
  driverHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  viewToggle: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 12, padding: 3, gap: 3 },
  viewBtn: { borderRadius: 9, paddingVertical: 6, paddingHorizontal: 14 },
  viewBtnSelected: { backgroundColor: '#2563EB' },
  viewBtnText: { fontWeight: '900', color: '#475569', fontSize: 15 },
  viewBtnTextSelected: { color: '#fff' },
  viewHint: { color: '#64748B', fontWeight: '700', fontSize: 13, marginBottom: 8 },
  driverCard: { width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 3, borderColor: 'transparent', alignItems: 'center' },
  diffBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 3, borderColor: 'transparent', alignItems: 'center' },
  diffSelected: { borderColor: '#F59E0B' },
  diffLabel: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  diffDetail: { color: '#64748B', fontWeight: '700', textAlign: 'center' },
  vehicleBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 3, borderColor: 'transparent', alignItems: 'center' },
  vehicleEmoji: { fontSize: 36 },
  skinCard: { width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 3, borderColor: 'transparent', alignItems: 'center' },
  skinSwatch: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  skinEmoji: { fontSize: 26 },
  shopMsg: { textAlign: 'center', fontWeight: '800', color: '#B45309', marginBottom: 6 },
  equippedNote: { textAlign: 'center', marginTop: 8, fontWeight: '800', color: '#1E293B' },
  playBtn: { backgroundColor: '#22C55E', borderRadius: 20, padding: 18, marginTop: 22, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6 },
  playText: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  parentNote: { textAlign: 'center', color: '#64748B', marginTop: 14, fontSize: 13 },
});

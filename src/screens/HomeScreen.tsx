// Home page — LANDSCAPE game menu, not a vertical app list.
// Wide layout: big title + name + PLAY button on the left, drivers /
// levels / difficulty / skins as horizontal game rows on the right.
// Designed for a phone held sideways (~800x360). Safe-area insets
// keep content clear of the notch and gesture bar on both sides.

import React, { useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const [garageId, setGarageId] = useState(profile.equippedSkin);
  const [shopMsg, setShopMsg] = useState('');
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const leftW = Math.max(250, Math.min(320, width * 0.36));

  const selectedDriver = driverById(profile.selectedDriver);
  const viewMode = profile.viewMode;

  return (
    <LinearGradient colors={['#38BDF8', '#7DD3FC', '#FEF9C3']} style={styles.bg}>
      <View style={[styles.root, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 6, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 }]}>
        {/* LEFT — hero + PLAY (game menu, not an app header) */}
        <View style={[styles.left, { width: leftW }]}>
          <Text style={styles.title}>🏁 KIDS CAR</Text>
          <Text style={styles.title2}>RACING 🏎️</Text>
          <Text style={styles.tagline}>Fun-only racing • Ages 3–8 • No ads</Text>

          <TextInput
            style={styles.nameInput}
            placeholder="Your driver name…"
            placeholderTextColor="#94A3B8"
            value={name}
            maxLength={14}
            onChangeText={setName}
            onBlur={() => props.onSaveName(name.trim())}
            returnKeyType="done"
            onSubmitEditing={() => props.onSaveName(name.trim())}
          />
          <View style={styles.badges}>
            <Text style={styles.badge}>⭐ {profile.points}</Text>
            <Text style={styles.badge}>🏆 {profile.trophies}</Text>
            <Text style={styles.badge}>🎨 {profile.ownedSkins.length}/12</Text>
            <Text style={styles.badge}>🐶 {profile.ownedDrivers.length}/4</Text>
          </View>

          <TouchableOpacity style={styles.playBtn} onPress={() => props.onPlay(levelId, difficulty, selectedDriver.vehicleId)}>
            <Text style={styles.playText}>▶  START RACE</Text>
          </TouchableOpacity>
          <Text style={styles.racingNow}>
            {selectedDriver.faceEmoji} {selectedDriver.name} • {LEVELS[levelId - 1].icon} {LEVELS[levelId - 1].name} • {DIFFICULTIES[difficulty].label}
          </Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity style={styles.roundBtn} onPress={props.onToggleMusic}>
              <Text style={styles.roundText}>{props.musicOn ? '🎵' : '🔇'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.roundBtn} onPress={props.onToggleSfx}>
              <Text style={styles.roundText}>{props.sfxOn ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>
            <Text style={styles.parentNote}>Offline • No ads • No chat</Text>
          </View>
        </View>

        {/* RIGHT — game rows: drivers, levels, difficulty, skins */}
        <ScrollView style={styles.right} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          {shopMsg ? <Text style={styles.shopMsg}>{shopMsg}</Text> : null}

          <View style={styles.rowHeader}>
            <Text style={styles.section}>🐶 Pick your driver</Text>
            <View style={styles.viewToggle}>
              {(['2d', '3d'] as DriverViewMode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => props.onToggleViewMode(m)}
                  style={[styles.viewBtn, viewMode === m && styles.viewBtnSelected]}
                >
                  <Text style={[styles.viewBtnText, viewMode === m && styles.viewBtnTextSelected]}>{m.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
            {DRIVERS.map((d) => {
              const owned = profile.ownedDrivers.includes(d.id);
              const isSelected = profile.selectedDriver === d.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.gameCard, isSelected && styles.selected]}
                  onPress={() => {
                    if (owned) { props.onSelectDriver(d.id); setShopMsg(`${d.name} is racing! ${d.tagline}`); }
                    else if (profile.points >= d.price) { props.onBuyDriver(d.id); setShopMsg(`${d.name} joined your team! 🎉`); }
                    else setShopMsg(`Need ${d.price - profile.points} more points for ${d.name}.`);
                  }}
                >
                  <DriverFace driver={d} mode={viewMode} size={62} />
                  <CarView color={d.carColor} accent={d.carAccent} emoji={d.vehicleEmoji} width={56} mode={viewMode} />
                  <Text style={styles.cardName}>{d.faceEmoji} {d.name}</Text>
                  <Text style={styles.cardSub}>{isSelected ? '✅ Racing!' : owned ? 'Tap to pick' : d.price === 0 ? 'FREE' : `⭐ ${d.price}`}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.section}>🗺️ Pick a level</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
            {LEVELS.map((lv) => {
              const locked = lv.id > profile.unlockedLevel;
              const selected = lv.id === levelId;
              return (
                <TouchableOpacity
                  key={lv.id}
                  disabled={locked}
                  onPress={() => setLevelId(lv.id)}
                  style={[styles.gameCard, styles.levelCard, selected && styles.selected, locked && styles.locked]}
                >
                  <Text style={styles.levelIcon}>{locked ? '🔒' : lv.icon}</Text>
                  <Text style={styles.cardName}>{lv.name}</Text>
                  <Text style={styles.cardSub}>⭐ {lv.starGoal} stars</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.section}>💪 How hard?</Text>
          <View style={styles.hRow}>
            {DIFFICULTY_ORDER.map((id) => {
              const d = DIFFICULTIES[id];
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => setDifficulty(id)}
                  style={[styles.diffBtn, difficulty === id && styles.selected]}
                >
                  <Text style={styles.diffLabel}>{d.label} • ❤️ {d.hearts}</Text>
                  <Text style={styles.cardSub}>+{d.winBonus} win bonus</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.section}>🏎️ Garage — pick a car</Text>
          <View style={styles.garageRow}>
            <View style={styles.garageGrid}>
              {SKINS.map((s) => {
                const owned = profile.ownedSkins.includes(s.id);
                const isEquipped = profile.equippedSkin === s.id;
                const isPicked = garageId === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.garageCard, isPicked && styles.selected, isEquipped && styles.equippedCard]}
                    onPress={() => setGarageId(s.id)}
                  >
                    <CarView color={s.color} accent={s.accent} emoji={selectedDriver.vehicleEmoji} width={44} mode={viewMode} angle="top" stripe={s.stripe} />
                    <Text style={styles.cardName}>{s.name}</Text>
                    <Text style={styles.cardSub}>{isEquipped ? '✅ Equipped' : owned ? 'Owned' : `⭐ ${s.price}`}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.detailPanel}>
              {(() => {
                const s = skinById(garageId);
                const owned = profile.ownedSkins.includes(s.id);
                const isEquipped = profile.equippedSkin === s.id;
                return (
                  <>
                    <CarView color={s.color} accent={s.accent} emoji={selectedDriver.vehicleEmoji} width={64} mode={viewMode} angle="top" stripe={s.stripe} />
                    <Text style={styles.detailName}>{s.emoji} {s.name}</Text>
                    <StatBar label="Speed" value={s.speed} />
                    <StatBar label="Acceleration" value={s.acceleration} />
                    <StatBar label="Handling" value={s.handling} />
                    <Text style={styles.detailPrice}>{s.price === 0 ? 'FREE' : `⭐ ${s.price} points`}</Text>
                    <TouchableOpacity
                      style={[styles.detailBtn, isEquipped && styles.detailBtnDone]}
                      onPress={() => {
                        if (isEquipped) { setShopMsg(s.name + ' is already equipped!'); }
                        else if (owned) { props.onEquipSkin(s.id); setShopMsg(s.name + ' equipped!'); }
                        else if (profile.points >= s.price) { props.onBuySkin(s.id); setShopMsg(s.name + ' bought! 🎉'); }
                        else setShopMsg(`Need ${s.price - profile.points} more points for ${s.name}.`);
                      }}
                    >
                      <Text style={styles.detailBtnText}>{isEquipped ? '✅ Equipped' : owned ? 'EQUIP CAR' : 'BUY CAR'}</Text>
                    </TouchableOpacity>
                  </>
                );
              })()}
            </View>
          </View>
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statTrack}>
        <View style={[styles.statFill, { width: `${(value / 5) * 100}%` }]} />
      </View>
      <Text style={styles.statValue}>{value}/5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  root: { flex: 1, flexDirection: 'row', gap: 12 },
  left: { justifyContent: 'center', gap: 6 },
  title: { fontSize: 34, fontWeight: '900', color: '#B91C1C', textShadowColor: 'rgba(255,255,255,0.8)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
  title2: { fontSize: 34, fontWeight: '900', color: '#1E40AF', textShadowColor: 'rgba(255,255,255,0.8)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
  tagline: { fontWeight: '800', color: '#475569', fontSize: 13 },
  nameInput: { borderWidth: 3, borderColor: '#FACC15', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, fontSize: 17, fontWeight: '800', color: '#1E293B', backgroundColor: '#FEFCE8' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, fontWeight: '900', color: '#1E293B', fontSize: 14 },
  playBtn: { backgroundColor: '#22C55E', borderRadius: 20, paddingVertical: 14, marginTop: 6, borderBottomWidth: 5, borderBottomColor: '#15803D', elevation: 5 },
  playText: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  racingNow: { textAlign: 'center', fontWeight: '800', color: '#1E293B', fontSize: 13 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  roundBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  roundText: { fontSize: 20 },
  parentNote: { fontWeight: '700', color: '#475569', fontSize: 12 },
  right: { flex: 1 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { fontSize: 17, fontWeight: '900', color: '#1E293B', marginTop: 8, marginBottom: 6 },
  viewToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 12, padding: 3, gap: 3 },
  viewBtn: { borderRadius: 9, paddingVertical: 5, paddingHorizontal: 12 },
  viewBtnSelected: { backgroundColor: '#2563EB' },
  viewBtnText: { fontWeight: '900', color: '#475569', fontSize: 14 },
  viewBtnTextSelected: { color: '#fff' },
  hRow: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  gameCard: { width: 132, backgroundColor: '#fff', borderRadius: 16, padding: 8, borderWidth: 3, borderColor: 'transparent', alignItems: 'center' },
  levelCard: { width: 128 },
  skinCard: { width: 118 },
  selected: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  locked: { opacity: 0.55 },
  levelIcon: { fontSize: 26 },
  cardName: { fontWeight: '900', textAlign: 'center', color: '#1E293B', fontSize: 13, marginTop: 2 },
  cardSub: { textAlign: 'center', color: '#64748B', fontWeight: '700', fontSize: 12 },
  diffBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 10, borderWidth: 3, borderColor: 'transparent', alignItems: 'center' },
  diffLabel: { fontSize: 15, fontWeight: '900', color: '#1E293B' },
  skinSwatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  skinEmoji: { fontSize: 22 },
  shopMsg: { textAlign: 'center', fontWeight: '800', color: '#B45309', marginBottom: 4 },
  garageRow: { flexDirection: 'row', gap: 8 },
  garageGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  garageCard: { width: '31%', backgroundColor: '#fff', borderRadius: 12, padding: 6, borderWidth: 3, borderColor: 'transparent', alignItems: 'center' },
  equippedCard: { backgroundColor: '#FFFBEB' },
  detailPanel: { width: 168, backgroundColor: '#fff', borderRadius: 16, padding: 10, alignItems: 'center', borderWidth: 3, borderColor: '#F59E0B' },
  detailName: { fontWeight: '900', color: '#1E293B', fontSize: 15, marginTop: 4, textAlign: 'center' },
  detailPrice: { fontWeight: '900', color: '#B45309', marginTop: 6 },
  detailBtn: { backgroundColor: '#22C55E', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, marginTop: 8 },
  detailBtnDone: { backgroundColor: '#94A3B8' },
  detailBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, width: '100%' },
  statLabel: { width: 78, fontSize: 11, fontWeight: '800', color: '#475569' },
  statTrack: { flex: 1, height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  statFill: { height: '100%', backgroundColor: '#F59E0B' },
  statValue: { fontSize: 11, fontWeight: '900', color: '#1E293B', width: 22 },
});

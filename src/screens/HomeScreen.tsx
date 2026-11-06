// Home page — LANDSCAPE game menu, not a vertical app list.
// Wide layout: big title + name + PLAY button on the left, drivers /
// levels / difficulty / SHOP as horizontal game rows on the right.
// Designed for a phone held sideways (~800x360). Safe-area insets
// keep content clear of the notch and gesture bar on both sides.
//
// Coins are the currency (stored as `points` — existing players keep
// every coin they earned). The Shop sells cars, paints, upgrades,
// skins, maps and drivers for coins; locked items cannot be raced
// until they are bought or unlocked by winning. Real-money purchases
// live ONLY in the parent-gated Parents Shop (see ParentsShop.tsx).

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Image, ImageBackground, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LEVELS, isLevelUnlocked } from '../data/levels';
import { DRIVERS, driverById } from '../data/drivers';
import { PAINTS, SKINS, VEHICLES, paintById, skinById, vehicleById, type Vehicle } from '../data/skins';
import { UPGRADES, nextUpgradeCost, type UpgradeId } from '../data/upgrades';
import { CarView } from '../components/CarView';
import { SLEEK_BG } from '../theme';
import { DriverFace, DriverViewMode } from '../components/DriverFace';
import { ParentsShop } from '../components/ParentsShop';
import { isAdsConfigured } from '../ads';
import { DIFFICULTY_ORDER, DIFFICULTIES, DifficultyId, Profile } from '../types';

type ShopTab = 'cars' | 'paint' | 'upgrades' | 'skins' | 'maps' | 'drivers';

interface Props {
  profile: Profile;
  musicOn: boolean;
  sfxOn: boolean;
  /** Coins granted by the daily bonus on this launch (0 = already claimed today). */
  dailyBonus: number;
  onToggleMusic: () => void;
  onToggleSfx: () => void;
  onSaveName: (name: string) => void;
  onBuySkin: (skinId: string) => void;
  onEquipSkin: (skinId: string) => void;
  onSelectDriver: (driverId: string) => void;
  onBuyDriver: (driverId: string) => void;
  onToggleViewMode: (mode: DriverViewMode) => void;
  onBuyVehicle: (vehicleId: string, currency: 'coins' | 'gems') => void;
  onEquipVehicle: (vehicleId: string) => void;
  onBuyPaint: (paintId: string, currency: 'coins' | 'gems') => void;
  onEquipPaint: (paintId: string) => void;
  onBuyUpgrade: (upgradeId: UpgradeId, how: 'coins' | 'gems') => void;
  onBuyLevel: (levelId: number, currency: 'coins' | 'gems') => void;
  onGrantCoins: (coins: number, transactionId: string) => void;
  onGrantGems: (gems: number, transactionId: string) => void;
  onUnlockAll: () => void;
  onAdFree: () => void;
  /** Watch a rewarded ad for +10 gems. Returns the ad result. */
  onEarnGemsAd: () => Promise<'earned' | 'not-configured' | 'cancelled' | 'failed'>;
  /** Trial a locked car for the next race only — 'gems' spends 5 gems, 'ad' watches a rewarded ad. */
  onTrialVehicle: (vehicleId: string, how: 'gems' | 'ad') => Promise<'earned' | 'not-configured' | 'cancelled' | 'failed'>;
  onTrialPaint: (paintId: string, how: 'gems' | 'ad') => Promise<'earned' | 'not-configured' | 'cancelled' | 'failed'>;
  onPlay: (levelId: number, difficulty: DifficultyId, vehicleId: string) => void;
}

const NOT_ENOUGH = 'Not enough coins — play more races or ask a parent.';

// Photo showroom assets (assets/cars/): the mockup's own hero + garage
// photos, plus generated side-profile shots. Static requires so Metro
// bundles them on native and web.
const HOME_HERO = require('../../assets/cars/home-hero.jpg');
const GARAGE_RED = require('../../assets/cars/garage-red.jpg');
const GARAGE_MIDNIGHT = require('../../assets/cars/garage-midnight.jpg');

/** Hue family of a hex colour: 'red' covers red/orange/gold, 'blue'
 *  covers blues; green / purple / grey / white / black match no photo. */
function colorFamily(hex: string): 'red' | 'blue' | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const r = parseInt(m[1].slice(0, 2), 16) / 255;
  const g = parseInt(m[1].slice(2, 4), 16) / 255;
  const b = parseInt(m[1].slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 0.12) return null;
  let hue = 0;
  if (max === r) hue = ((g - b) / (max - min)) * 60;
  else if (max === g) hue = 120 + ((b - r) / (max - min)) * 60;
  else hue = 240 + ((r - g) / (max - min)) * 60;
  if (hue < 0) hue += 360;
  if (hue < 60 || hue >= 330) return 'red';
  if (hue >= 195 && hue <= 250) return 'blue';
  return null;
}

/** Showroom photo for a paint colour, or null (fall back to the drawn CarView). */
function photoForColor(hex: string) {
  const f = colorFamily(hex);
  return f === 'red' ? GARAGE_RED : f === 'blue' ? GARAGE_MIDNIGHT : null;
}

/** Showroom class label per vehicle (mockup style: "NIGHT SERIES · RARE"). */
const VEHICLE_CLASS: Record<string, string> = {
  race: 'RACE SERIES', car: 'STREET SERIES', police: 'POLICE SERIES',
  fire: 'RESCUE SERIES', ambulance: 'RESCUE SERIES', bus: 'CITY SERIES',
  schoolbus: 'CITY SERIES', taxi: 'CITY SERIES', rickshaw: 'CITY SERIES',
  icecream: 'TREAT SERIES', monster: 'MONSTER SERIES', duck: 'FUN SERIES',
};

function vehicleRarity(v: Vehicle): string {
  return v.price >= 800 ? 'RARE' : v.price >= 400 ? 'SUPER' : v.price > 0 ? 'CLASSIC' : 'STARTER';
}

const DIFF_KID: Record<DifficultyId, { label: string; face: string }> = {
  low: { label: 'Easy', face: '🐢' },
  mid: { label: 'Super', face: '😄' },
  high: { label: 'Turbo', face: '🚀' },
};

export function HomeScreen(props: Props) {
  const { profile } = props;
  const [name, setName] = useState(profile.name);
  const [levelId, setLevelId] = useState(() => Math.min(LEVELS.length, Math.max(1, profile.unlockedLevel)));
  const [difficulty, setDifficulty] = useState<DifficultyId>('low');
  const [panel, setPanel] = useState<'tracks' | 'garage'>('tracks');
  const [shopTab, setShopTab] = useState<ShopTab>('cars');
  const [pickedVehicle, setPickedVehicle] = useState(profile.selectedVehicle || driverById(profile.selectedDriver).vehicleId);
  const [pickedPaint, setPickedPaint] = useState(profile.equippedPaint);
  const [pickedSkin, setPickedSkin] = useState(profile.equippedSkin);
  const [shopMsg, setShopMsg] = useState(props.dailyBonus > 0 ? `🎉 Daily bonus! +${props.dailyBonus} coins!` : '');
  const [parentsOpen, setParentsOpen] = useState(false);
  // Home pickers collapse behind their chips (tap to expand) so the
  // hero photo dominates; null = no picker open.
  const [openPicker, setOpenPicker] = useState<'driver' | 'map' | 'difficulty' | null>(null);
  // Locked-map purchase needs a CONFIRM step: first tap selects +
  // asks, second tap on the same card buys. No more one-tap spends.
  const [pendingBuyLevel, setPendingBuyLevel] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = height < 420;
  const leftW = Math.max(240, Math.min(340, width * 0.38));
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -6, duration: 620, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 620, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  const selectedDriver = driverById(profile.selectedDriver);
  const viewMode = profile.viewMode;
  // Race vehicle: the equipped Shop car, or the driver's vehicle when no car is equipped.
  const raceVehicle = profile.selectedVehicle ? vehicleById(profile.selectedVehicle) : vehicleById(selectedDriver.vehicleId);
  // Body colour: the vehicle's own colour by default; a paint only
  // repaints when explicitly equipped (equippedPaint '' = vehicle colour).
  const paint = profile.equippedPaint
    ? paintById(profile.equippedPaint)
    : { color: raceVehicle.carColor, accent: raceVehicle.carAccent, stripe: skinById(profile.equippedSkin).stripe };
  const skin = skinById(profile.equippedSkin);
  // A trial replaces the equipped car/paint for one race (lobby trial).
  const driving = profile.trialVehicleId ? vehicleById(profile.trialVehicleId) : raceVehicle;
  const drivingPaint = profile.trialPaintId ? paintById(profile.trialPaintId) : paint;
  const trying = Boolean(profile.trialVehicleId || profile.trialPaintId);
  const unlockedMaps = LEVELS.filter((lv) => isLevelUnlocked(lv.id, profile.unlockedLevel, profile.purchasedLevels, profile.unlockAll)).length;

  const tabs: { id: ShopTab; label: string }[] = [
    { id: 'cars', label: '🚗 Cars' },
    { id: 'paint', label: '🎨 Paint' },
    { id: 'upgrades', label: '⚙️ Upgrades' },
    { id: 'skins', label: '✨ Skins' },
    { id: 'maps', label: '🗺️ Maps' },
    { id: 'drivers', label: '🐶 Drivers' },
  ];

  // --- TRACKS (home) — the mockup layout: the hero photo fills the
  // screen, title top-left, coins + sound top-right, current picks as
  // chips mid-left, GARAGE / MAPS / SHOP dock bottom-left, giant PLAY
  // bottom-right. Pickers collapse behind their chips (tap to expand);
  // every handler below is the same one the old rows used.
  if (panel === 'tracks') {
    const currentLevel = LEVELS[levelId - 1];
    const diffKid = DIFF_KID[difficulty];
    return (
      <ImageBackground source={HOME_HERO} style={styles.bg} resizeMode="cover">
        <LinearGradient colors={['rgba(7,8,12,0.80)', 'rgba(7,8,12,0.10)', 'rgba(7,8,12,0.08)', 'rgba(7,8,12,0.85)']} style={styles.bg}>
          <View style={[styles.heroRoot, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 10, paddingLeft: insets.left + 14, paddingRight: insets.right + 14 }]}>
            {/* Top: title left, coins/gems/trophies + sound + Parents right */}
            <View style={styles.heroTop}>
              <View>
                <Text style={[styles.title, compact && { fontSize: 30 }]}>KIDS CAR</Text>
                <Text style={[styles.title2, compact && { fontSize: 30 }]}>RACING</Text>
              </View>
              <View style={styles.heroTopRight}>
                <View style={styles.badges}>
                  <Text style={styles.badge}>🪙 {profile.points}</Text>
                  <Text style={styles.badge}>💎 {profile.gems}</Text>
                  <Text style={styles.badge}>🏆 {profile.trophies}</Text>
                </View>
                <View style={styles.toggleRow}>
                  <TouchableOpacity style={styles.roundBtn} onPress={props.onToggleMusic}>
                    <Text style={styles.roundText}>{props.musicOn ? '🎵' : '🔇'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.roundBtn} onPress={props.onToggleSfx}>
                    <Text style={styles.roundText}>{props.sfxOn ? '🔊' : '🔇'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.parentsBtn} onPress={() => setParentsOpen(true)}>
                    <Text style={styles.parentsBtnText}>👨‍👩‍👧 Parents</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Middle-left: name + current picks as chips (tap a chip to change it) */}
            <View style={styles.chipRow}>
              <TextInput
                style={styles.nameInputCompact}
                placeholder="Your name"
                placeholderTextColor="#94A3B8"
                value={name}
                maxLength={14}
                onChangeText={setName}
                onBlur={() => props.onSaveName(name.trim())}
                returnKeyType="done"
                onSubmitEditing={() => props.onSaveName(name.trim())}
              />
              <TouchableOpacity
                style={[styles.pickChip, openPicker === 'driver' && styles.pickChipOpen]}
                onPress={() => setOpenPicker(openPicker === 'driver' ? null : 'driver')}
              >
                <DriverFace driver={selectedDriver} mode={viewMode} size={30} />
                <Text style={styles.pickChipText}>{selectedDriver.faceEmoji} {selectedDriver.name}</Text>
                <Text style={styles.pickChipSub}>{selectedDriver.abilityIcon} {selectedDriver.abilityName}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pickChip, openPicker === 'map' && styles.pickChipOpen]}
                onPress={() => setOpenPicker(openPicker === 'map' ? null : 'map')}
              >
                <Text style={styles.pickChipIcon}>{currentLevel.icon}</Text>
                <Text style={styles.pickChipText}>{currentLevel.name}</Text>
                <Text style={styles.pickChipSub}>Level {currentLevel.id}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pickChip, openPicker === 'difficulty' && styles.pickChipOpen]}
                onPress={() => setOpenPicker(openPicker === 'difficulty' ? null : 'difficulty')}
              >
                <Text style={styles.pickChipIcon}>{diffKid.face}</Text>
                <Text style={styles.pickChipText}>{diffKid.label}</Text>
                <Text style={styles.pickChipSub}>❤️ {DIFFICULTIES[difficulty].hearts}</Text>
              </TouchableOpacity>
            </View>

            {trying ? <Text style={[styles.trialChip, { alignSelf: 'flex-start', marginTop: 6 }]}>🎁 One race in the {driving.name}!</Text> : null}
            {shopMsg ? <Text style={[styles.shopMsg, { marginTop: 4, textAlign: 'left' }]}>{shopMsg}</Text> : null}

            {/* Expanded picker — same cards + handlers as the old rows, compact */}
            {openPicker === 'driver' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerPanel}>
                {DRIVERS.map((d) => {
                  const owned = profile.ownedDrivers.includes(d.id);
                  const isSelected = profile.selectedDriver === d.id;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.gameCard, styles.pickerCard, isSelected && styles.selected, !owned && styles.locked]}
                      onPress={() => {
                        if (owned) { props.onSelectDriver(d.id); setShopMsg(`${d.name} jumps in! ${d.tagline}`); }
                        else if (profile.points >= d.price) { props.onBuyDriver(d.id); setShopMsg(`${d.name} joined your team! 🎉`); }
                        else { setShopTab('drivers'); setPanel('garage'); setShopMsg(`Get ${d.name} in the Garage! Need ${d.price - profile.points} more coins.`); }
                      }}
                    >
                      <DriverFace driver={d} mode={viewMode} size={30} />
                      <Text style={styles.cardName}>{d.faceEmoji} {d.name}</Text>
                      <Text style={styles.cardSub}>{isSelected ? '✅ Racing!' : owned ? 'Tap to drive' : `🪙 ${d.price}`}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
            {openPicker === 'map' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerPanel}>
                {LEVELS.map((lv) => {
                  const locked = !isLevelUnlocked(lv.id, profile.unlockedLevel, profile.purchasedLevels, profile.unlockAll);
                  const selected = lv.id === levelId;
                  return (
                    <TouchableOpacity
                      key={lv.id}
                      onPress={() => {
                        if (!locked) { setLevelId(lv.id); setShopMsg(lv.tagline); }
                        else { setShopTab('maps'); setPanel('garage'); setShopMsg(`${lv.name} is locked. Win the track before it, or unlock it here.`); }
                      }}
                      style={[styles.gameCard, styles.pickerCard, selected && styles.selected, locked && styles.locked]}
                    >
                      <Text style={styles.levelIconCompact}>{locked ? '🔒' : lv.icon}</Text>
                      <Text style={styles.cardName}>{lv.name}</Text>
                      <Text style={styles.cardSub}>{locked ? 'Locked' : `⭐ ${lv.starGoal}`}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
            {openPicker === 'difficulty' && (
              <View style={styles.pickerPanel}>
                {DIFFICULTY_ORDER.map((id) => {
                  const d = DIFFICULTIES[id];
                  const kid = DIFF_KID[id];
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => setDifficulty(id)}
                      style={[styles.diffBtn, styles.pickerDiffBtn, difficulty === id && styles.selected]}
                    >
                      <Text style={styles.diffLabel}>{kid.face} {kid.label}</Text>
                      <Text style={styles.cardSub}>❤️ {d.hearts}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={{ flex: 1 }} />

            {/* Bottom dock: GARAGE / MAPS / SHOP left, giant PLAY right */}
            <View style={styles.dock}>
              <View style={styles.dockLeft}>
                <TouchableOpacity style={styles.dockBtn} onPress={() => { setShopTab('cars'); setPanel('garage'); }}>
                  <Text style={styles.dockBtnText}>🛠️ GARAGE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dockBtn} onPress={() => { setShopTab('maps'); setPanel('garage'); }}>
                  <Text style={styles.dockBtnText}>🗺️ MAPS</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dockBtn} onPress={() => { setShopTab('cars'); setPanel('garage'); }}>
                  <Text style={styles.dockBtnText}>🛒 SHOP</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.playBtnHero}
                onPress={() => {
                  props.onSaveName(name.trim());
                  props.onPlay(levelId, difficulty, driving.id);
                }}
              >
                <Text style={[styles.playText, compact && { fontSize: 26 }]}>▶  RACE!</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.racingNow}>
              {selectedDriver.faceEmoji} {selectedDriver.name}  •  {currentLevel.icon} {currentLevel.name}  •  {diffKid.face} {diffKid.label}
            </Text>
          </View>
        </LinearGradient>
        {parentsOpen && (
          <ParentsShop
            coins={profile.points}
            gems={profile.gems}
            unlockAll={profile.unlockAll}
            adFree={profile.adFree}
            grantedTransactions={profile.grantedTransactions}
            onGrantCoins={props.onGrantCoins}
            onGrantGems={props.onGrantGems}
            onUnlockAll={props.onUnlockAll}
            onAdFree={props.onAdFree}
            onClose={() => setParentsOpen(false)}
          />
        )}
      </ImageBackground>
    );
  }

  return (
    <LinearGradient colors={[...SLEEK_BG]} style={styles.bg}>
      <View style={[styles.root, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 6, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 }]}>
        {/* LEFT — hero + PLAY (game menu, not an app header) */}
        <View style={[styles.left, { width: leftW }]}>
          <View>
            <Text style={[styles.title, compact && { fontSize: 30 }]}>KIDS CAR</Text>
            <Text style={[styles.title2, compact && { fontSize: 30 }]}>RACING</Text>
          </View>
          <TextInput
            style={styles.nameInput}
            placeholder="Your name"
            placeholderTextColor="#94A3B8"
            value={name}
            maxLength={14}
            onChangeText={setName}
            onBlur={() => props.onSaveName(name.trim())}
            returnKeyType="done"
            onSubmitEditing={() => props.onSaveName(name.trim())}
          />
          <View style={styles.badges}>
            <Text style={styles.badge}>🪙 {profile.points}</Text>
            <Text style={styles.badge}>💎 {profile.gems}</Text>
            <Text style={styles.badge}>🏆 {profile.trophies}</Text>
            <Text style={styles.badge}>🗺️ {unlockedMaps}/10</Text>
          </View>

          <View style={styles.heroSlot}>
            <Animated.View style={[styles.hero, { transform: [{ translateY: bob }] }]}>
              <DriverFace driver={selectedDriver} mode={viewMode} size={compact ? 52 : 68} />
              <CarView color={drivingPaint.color} accent={drivingPaint.accent} emoji={driving.emoji} width={compact ? 96 : 118} mode={viewMode} stripe={drivingPaint.stripe} />
            </Animated.View>
          </View>

          {trying ? <Text style={styles.trialChip}>🎁 One race in the {driving.name}!</Text> : null}

          <TouchableOpacity
            style={styles.playBtn}
            onPress={() => {
              props.onSaveName(name.trim());
              props.onPlay(levelId, difficulty, driving.id);
            }}
          >
            <Text style={[styles.playText, compact && { fontSize: 26 }]}>▶  RACE!</Text>
          </TouchableOpacity>
          <Text style={styles.racingNow} numberOfLines={1}>
            {selectedDriver.faceEmoji} {selectedDriver.name}  •  {LEVELS[levelId - 1].icon} {LEVELS[levelId - 1].name}  •  {DIFF_KID[difficulty].face} {DIFF_KID[difficulty].label}
          </Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity style={styles.roundBtn} onPress={props.onToggleMusic}>
              <Text style={styles.roundText}>{props.musicOn ? '🎵' : '🔇'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.roundBtn} onPress={props.onToggleSfx}>
              <Text style={styles.roundText}>{props.sfxOn ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.parentsBtn} onPress={() => setParentsOpen(true)}>
              <Text style={styles.parentsBtnText}>👨‍👩‍👧 Parents</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* RIGHT — game rows: drivers, levels, difficulty, SHOP */}
        <ScrollView style={styles.right} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          {shopMsg ? <Text style={styles.shopMsg}>{shopMsg}</Text> : null}

              <View style={styles.garageBar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setPanel('tracks')}>
                  <Text style={styles.backBtnText}>◀ TRACKS</Text>
                </TouchableOpacity>
                <Text style={styles.garageTitle}>🛠️ Garage</Text>
                <View style={styles.viewToggle}>
                  {(['2d', '3d'] as DriverViewMode[]).map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => props.onToggleViewMode(m)}
                      style={[styles.viewBtn, viewMode === m && styles.viewBtnSelected]}
                    >
                      <Text style={[styles.viewBtnText, viewMode === m && styles.viewBtnTextSelected]}>{m === '2d' ? 'Cartoon' : 'Shiny'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
          {!profile.adFree && isAdsConfigured && profile.trophies > 0 && (
            <TouchableOpacity
              style={styles.earnGemsBtn}
              onPress={async () => {
                const r = await props.onEarnGemsAd();
                if (r === 'earned') setShopMsg('+10 gems! 💎 Keep racing to earn more!');
                else if (r === 'not-configured') setShopMsg('Ads are not set up yet — no gems were added.');
                else if (r === 'cancelled') setShopMsg('Ad closed early — no gems this time.');
                else setShopMsg('The ad could not load — no gems were added.');
              }}
            >
              <Text style={styles.earnGemsText}>📺 Watch an ad — Earn 10 💎 Gems!</Text>
            </TouchableOpacity>
          )}
          <View style={styles.tabRow}>
            {tabs.map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setShopTab(t.id)}
                style={[styles.tabBtn, shopTab === t.id && styles.tabBtnSelected]}
              >
                <Text style={[styles.tabBtnText, shopTab === t.id && styles.tabBtnTextSelected]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {shopTab === 'cars' && (
            <View>
              {(() => {
                const v = vehicleById(pickedVehicle);
                const owned = profile.ownedVehicles.includes(v.id);
                const isEquipped = raceVehicle.id === v.id;
                // Paint preview: a tapped swatch repaints the showroom
                // hero (photo by colour family, else the drawn car in
                // that paint). '' = the vehicle's own colour.
                const previewPaint = pickedPaint ? paintById(pickedPaint) : null;
                const previewColor = previewPaint ? previewPaint.color : v.carColor;
                const previewAccent = previewPaint ? previewPaint.accent : v.carAccent;
                const photo = previewPaint
                  ? photoForColor(previewPaint.color)
                  : v.id === 'race' || v.id === 'car'
                    ? GARAGE_RED
                    : null;
                const glow = photo === GARAGE_MIDNIGHT ? '#2FD8FF' : photo ? '#FF7A1A' : previewColor;
                const vIdx = VEHICLES.findIndex((x) => x.id === v.id);
                const prevCar = () => setPickedVehicle(VEHICLES[(vIdx - 1 + VEHICLES.length) % VEHICLES.length].id);
                const nextCar = () => setPickedVehicle(VEHICLES[(vIdx + 1) % VEHICLES.length].id);
                return (
                  <>
                    <View style={styles.showroom}>
                      <TouchableOpacity style={styles.showArrow} onPress={prevCar}>
                        <Text style={styles.showArrowText}>◀</Text>
                      </TouchableOpacity>
                      <View style={styles.showHero}>
                        {photo ? (
                          <Image source={photo} style={styles.showHeroImg} resizeMode="cover" />
                        ) : (
                          <View style={styles.showDrawn}>
                            <CarView color={previewColor} accent={previewAccent} emoji={v.emoji} width={200} mode={viewMode} angle="front" stripe={skin.stripe} vehicleId={v.id} />
                          </View>
                        )}
                        <View style={[styles.showGlow, { backgroundColor: glow, shadowColor: glow }]} />
                      </View>
                      <View style={styles.showInfo}>
                        <Text style={styles.showClass}>{VEHICLE_CLASS[v.id] ?? 'RACE SERIES'} • {vehicleRarity(v)}</Text>
                        <Text style={styles.showName}>{v.emoji} {v.name}</Text>
                        <StatBar label="Speed" value={v.speed} />
                        <StatBar label="Acceleration" value={skin.acceleration} />
                        <StatBar label="Handling" value={v.handling} />
                        <Text style={styles.cardSub}>Handling = how fast the car slides between lanes.</Text>
                        <Text style={styles.detailPrice}>{v.price === 0 ? 'FREE' : `🪙 ${v.price} coins${v.gemPrice ? ` or 💎 ${v.gemPrice}` : ''}`}</Text>
                        <View style={styles.swatchRow}>
                          {PAINTS.map((p) => (
                            <TouchableOpacity
                              key={p.id}
                              style={[styles.swatch, { backgroundColor: p.color }, pickedPaint === p.id && styles.swatchSelected]}
                              onPress={() => {
                                setPickedPaint(p.id);
                                if (profile.ownedPaints.includes(p.id)) { props.onEquipPaint(p.id); setShopMsg(`${p.name} painted on the ${v.name}!`); }
                                else setShopMsg(`${p.name} preview — buy it in the Paint tab for 🪙 ${p.price}.`);
                              }}
                            />
                          ))}
                        </View>
                        <TouchableOpacity
                          style={[styles.detailBtn, isEquipped && styles.detailBtnDone]}
                          onPress={() => {
                            const driverForCar = DRIVERS.find((d) => d.vehicleId === v.id);
                            if (isEquipped) setShopMsg(v.name + ' is already equipped!');
                            else if (owned) { props.onEquipVehicle(v.id); setShopMsg(v.name + ' equipped!'); }
                            else if (v.price === 0 && driverForCar) { props.onSelectDriver(driverForCar.id); setShopMsg(`${driverForCar.name} is racing in the ${v.name}! ${driverForCar.tagline}`); }
                            else if (profile.points >= v.price) { props.onBuyVehicle(v.id, 'coins'); setShopMsg(v.name + ' bought! 🎉'); }
                            else setShopMsg(`${NOT_ENOUGH} Need ${v.price - profile.points} more coins for ${v.name}.`);
                          }}
                        >
                          <Text style={styles.detailBtnText}>{isEquipped ? '✅ Equipped' : owned ? 'EQUIP CAR' : v.price === 0 ? `PICK ${DRIVERS.find((d) => d.vehicleId === v.id)?.name.toUpperCase() ?? 'DRIVER'}` : 'BUY CAR'}</Text>
                        </TouchableOpacity>
                        {!owned && v.gemPrice ? (
                          <TouchableOpacity
                            style={[styles.detailBtn, styles.gemBtn]}
                            onPress={() => {
                              const gemPrice = v.gemPrice ?? 0;
                              if (profile.gems >= gemPrice) { props.onBuyVehicle(v.id, 'gems'); setShopMsg(v.name + ' bought with gems! 💎🎉'); }
                              else setShopMsg(`Need ${gemPrice - profile.gems} more gems for ${v.name}.`);
                            }}
                          >
                            <Text style={styles.detailBtnText}>💎 {v.gemPrice} — BUY WITH GEMS</Text>
                          </TouchableOpacity>
                        ) : null}
                        {!owned && v.price > 0 ? (
                          <>
                            <TouchableOpacity
                              style={[styles.detailBtn, styles.tryBtn]}
                              onPress={async () => {
                                if (profile.gems < 5) { setShopMsg('Need 5 gems to try this car for one race.'); return; }
                                const r = await props.onTrialVehicle(v.id, 'gems');
                                if (r === 'earned') { setPanel('tracks'); setShopMsg(v.name + ' is ready! Tap RACE for one try.'); }
                                else setShopMsg('Could not start the try. Your gems are safe.');
                              }}
                            >
                              <Text style={styles.detailBtnText}>🎁 TRY 1 RACE — 💎 5</Text>
                            </TouchableOpacity>
                            {isAdsConfigured && !profile.adFree && profile.trophies > 0 ? (
                              <TouchableOpacity
                                style={[styles.detailBtn, styles.gemBtn]}
                                onPress={async () => {
                                  const r = await props.onTrialVehicle(v.id, 'ad');
                                  if (r === 'earned') { setPanel('tracks'); setShopMsg(v.name + ' is ready! Tap RACE for one try.'); }
                                  else if (r === 'cancelled') setShopMsg('Ad closed early — no try this time.');
                                  else setShopMsg('The ad could not load — no try this time.');
                                }}
                              >
                                <Text style={styles.detailBtnText}>📺 TRY — watch an ad</Text>
                              </TouchableOpacity>
                            ) : null}
                          </>
                        ) : null}
                      </View>
                      <TouchableOpacity style={styles.showArrow} onPress={nextCar}>
                        <Text style={styles.showArrowText}>▶</Text>
                      </TouchableOpacity>
                    </View>
                    {/* Compact thumbnail strip — every car stays one tap away */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
                      {VEHICLES.map((vv) => {
                        const isPicked = pickedVehicle === vv.id;
                        const isEq = raceVehicle.id === vv.id;
                        return (
                          <TouchableOpacity
                            key={vv.id}
                            style={[styles.thumb, isPicked && styles.selected, isEq && styles.equippedCard]}
                            onPress={() => setPickedVehicle(vv.id)}
                          >
                            <CarView color={vv.carColor} accent={vv.carAccent} emoji={vv.emoji} width={30} mode={viewMode} angle="top" stripe="#FFFFFF" vehicleId={vv.id} />
                            <Text style={styles.thumbName}>{vv.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </>
                );
              })()}
            </View>
          )}

          {shopTab === 'paint' && (
            <View style={styles.garageRow}>
              <View style={styles.garageGrid}>
                {PAINTS.map((p) => {
                  const owned = profile.ownedPaints.includes(p.id);
                  const isEquipped = profile.equippedPaint === p.id;
                  const isPicked = pickedPaint === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.garageCard, isPicked && styles.selected, isEquipped && styles.equippedCard]}
                      onPress={() => setPickedPaint(p.id)}
                    >
                      <CarView color={p.color} accent={p.accent} emoji={raceVehicle.emoji} width={44} mode={viewMode} angle="top" stripe={p.stripe} vehicleId={raceVehicle.id} />
                      <Text style={styles.cardName}>{p.name}</Text>
                      <Text style={styles.cardSub}>{isEquipped ? '✅ Equipped' : owned ? 'Owned' : p.price === 0 ? 'FREE' : `🪙 ${p.price}`}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.detailPanel}>
                {(() => {
                  const p = paintById(pickedPaint);
                  const owned = profile.ownedPaints.includes(p.id);
                  const isEquipped = profile.equippedPaint === p.id;
                  return (
                    <>
                      {(() => {
                        // The showroom hero reacts to the picked paint:
                        // red/orange paints get the red flame photo, blue
                        // paints the midnight photo, anything else the
                        // drawn car in that paint colour.
                        const photo = photoForColor(p.color);
                        return photo ? (
                          <View style={styles.paintHero}>
                            <Image source={photo} style={styles.paintHeroImg} resizeMode="cover" />
                            <View style={[styles.showGlow, { backgroundColor: photo === GARAGE_MIDNIGHT ? '#2FD8FF' : '#FF7A1A', shadowColor: photo === GARAGE_MIDNIGHT ? '#2FD8FF' : '#FF7A1A' }]} />
                          </View>
                        ) : (
                          <CarView color={p.color} accent={p.accent} emoji={raceVehicle.emoji} width={84} mode={viewMode} angle="top" stripe={p.stripe} vehicleId={raceVehicle.id} />
                        );
                      })()}
                      <Text style={styles.detailName}>{p.emoji} {p.name}</Text>
                      <Text style={styles.cardSub}>Repaints any car you own! Start a race to see it on the road.</Text>
                      <Text style={styles.detailPrice}>{p.price === 0 ? 'FREE' : `🪙 ${p.price} coins${p.gemPrice ? ` or 💎 ${p.gemPrice}` : ''}`}</Text>
                      <TouchableOpacity
                        style={[styles.detailBtn, isEquipped && styles.detailBtnDone]}
                        onPress={() => {
                          if (isEquipped) setShopMsg(p.name + ' is already on your car!');
                          else if (owned) { props.onEquipPaint(p.id); setShopMsg(p.name + ' painted on!'); }
                          else if (profile.points >= p.price) { props.onBuyPaint(p.id, 'coins'); setShopMsg(p.name + ' bought! 🎉'); }
                          else setShopMsg(`${NOT_ENOUGH} Need ${p.price - profile.points} more coins for ${p.name}.`);
                        }}
                      >
                        <Text style={styles.detailBtnText}>{isEquipped ? '✅ Equipped' : owned ? 'PAINT CAR' : 'BUY PAINT'}</Text>
                      </TouchableOpacity>
                      {!owned && p.gemPrice ? (
                        <TouchableOpacity
                          style={[styles.detailBtn, styles.gemBtn]}
                          onPress={() => {
                            const gemPrice = p.gemPrice ?? 0;
                            if (profile.gems >= gemPrice) { props.onBuyPaint(p.id, 'gems'); setShopMsg(p.name + ' bought with gems! 💎🎉'); }
                            else setShopMsg(`Need ${gemPrice - profile.gems} more gems for ${p.name}.`);
                          }}
                        >
                          <Text style={styles.detailBtnText}>💎 {p.gemPrice} — BUY WITH GEMS</Text>
                        </TouchableOpacity>
                      ) : null}
                      {!owned && p.price > 0 ? (
                        <>
                          <TouchableOpacity
                            style={[styles.detailBtn, styles.tryBtn]}
                            onPress={async () => {
                              if (profile.gems < 5) { setShopMsg('Need 5 gems to try this paint for one race.'); return; }
                              const r = await props.onTrialPaint(p.id, 'gems');
                              if (r === 'earned') { setPanel('tracks'); setShopMsg(p.name + ' is ready! Tap RACE for one try.'); }
                              else setShopMsg('Could not start the try. Your gems are safe.');
                            }}
                          >
                            <Text style={styles.detailBtnText}>🎁 TRY 1 RACE — 💎 5</Text>
                          </TouchableOpacity>
                          {isAdsConfigured && !profile.adFree && profile.trophies > 0 ? (
                            <TouchableOpacity
                              style={[styles.detailBtn, styles.gemBtn]}
                              onPress={async () => {
                                const r = await props.onTrialPaint(p.id, 'ad');
                                if (r === 'earned') { setPanel('tracks'); setShopMsg(p.name + ' is ready! Tap RACE for one try.'); }
                                else if (r === 'cancelled') setShopMsg('Ad closed early — no try this time.');
                                else setShopMsg('The ad could not load — no try this time.');
                              }}
                            >
                              <Text style={styles.detailBtnText}>📺 TRY — watch an ad</Text>
                            </TouchableOpacity>
                          ) : null}
                        </>
                      ) : null}
                    </>
                  );
                })()}
              </View>
            </View>
          )}

          {shopTab === 'upgrades' && (
            <View>
              {UPGRADES.map((u) => {
                const level = profile.upgrades[u.id];
                const maxed = level >= u.maxLevel;
                const cost = nextUpgradeCost(u.id, level);
                return (
                  <View key={u.id} style={styles.upgradeRow}>
                    <Text style={styles.upgradeEmoji}>{u.emoji}</Text>
                    <View style={styles.upgradeInfo}>
                      <Text style={styles.upgradeName}>{u.name} — Lv {level}/{u.maxLevel} • {u.statLabel}</Text>
                      <Text style={styles.cardSub}>{u.tagline} {u.effect}</Text>
                      <Text style={styles.upgradePips}>{'●'.repeat(level)}{'○'.repeat(u.maxLevel - level)}</Text>
                    </View>
                    <View style={styles.upgradeBtns}>
                      <TouchableOpacity
                        style={[styles.detailBtn, maxed && styles.detailBtnDone]}
                        onPress={() => {
                          if (maxed) setShopMsg(u.name + ' is already maxed out!');
                          else if (profile.points >= cost) { props.onBuyUpgrade(u.id, 'coins'); setShopMsg(u.name + ' upgraded to Lv ' + (level + 1) + '! 🎉'); }
                          else setShopMsg(`${NOT_ENOUGH} Need ${cost - profile.points} more coins for ${u.name} Lv ${level + 1}.`);
                        }}
                      >
                        <Text style={styles.detailBtnText}>{maxed ? 'MAXED!' : `🪙 ${cost} — UPGRADE`}</Text>
                      </TouchableOpacity>
                      {!maxed && u.gemInstantCost > 0 ? (
                        <TouchableOpacity
                          style={[styles.detailBtn, styles.gemBtn]}
                          onPress={() => {
                            if (profile.gems >= u.gemInstantCost) { props.onBuyUpgrade(u.id, 'gems'); setShopMsg(u.name + ' maxed out instantly with gems! 💎🎉'); }
                            else setShopMsg(`Need ${u.gemInstantCost - profile.gems} more gems to max ${u.name} now.`);
                          }}
                        >
                          <Text style={styles.detailBtnText}>💎 {u.gemInstantCost} — MAX NOW!</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })}
              <Text style={styles.cardSub}>Upgrades really change the race: Engine = faster, Turbo Boost = stronger BOOST, Extra Heart = more hearts, Magnet = stars fly to you! Speed ramps up from the start of every race — Turbo only makes BOOST stronger.</Text>
            </View>
          )}

          {shopTab === 'skins' && (
            <View style={styles.garageRow}>
              <View style={styles.garageGrid}>
                {SKINS.map((s) => {
                  const owned = profile.ownedSkins.includes(s.id);
                  const isEquipped = profile.equippedSkin === s.id;
                  const isPicked = pickedSkin === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.garageCard, isPicked && styles.selected, isEquipped && styles.equippedCard]}
                      onPress={() => setPickedSkin(s.id)}
                    >
                      <CarView color={raceVehicle.carColor} accent={raceVehicle.carAccent} emoji={selectedDriver.vehicleEmoji} width={44} mode={viewMode} angle="top" stripe={s.stripe} vehicleId={raceVehicle.id} />
                      <Text style={styles.cardName}>{s.name}</Text>
                      <Text style={styles.cardSub}>{isEquipped ? '✅ Equipped' : owned ? 'Owned' : `🪙 ${s.price}`}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.detailPanel}>
                {(() => {
                  const s = skinById(pickedSkin);
                  const owned = profile.ownedSkins.includes(s.id);
                  const isEquipped = profile.equippedSkin === s.id;
                  return (
                    <>
                      <CarView color={raceVehicle.carColor} accent={raceVehicle.carAccent} emoji={selectedDriver.vehicleEmoji} width={64} mode={viewMode} angle="top" stripe={s.stripe} vehicleId={raceVehicle.id} />
                      <Text style={styles.detailName}>{s.emoji} {s.name}</Text>
                      <Text style={styles.cardSub}>A skin is a stripe + speed kit — it never changes your car's body colour. Paint does that.</Text>
                      <StatBar label="Speed" value={s.speed} />
                      <StatBar label="Acceleration" value={s.acceleration} />
                      <StatBar label="Handling" value={s.handling} />
                      <Text style={styles.cardSub}>Handling = how fast the car slides between lanes.</Text>
                      <Text style={styles.detailPrice}>{s.price === 0 ? 'FREE' : `🪙 ${s.price} coins`}</Text>
                      <TouchableOpacity
                        style={[styles.detailBtn, isEquipped && styles.detailBtnDone]}
                        onPress={() => {
                          if (isEquipped) setShopMsg(s.name + ' is already equipped!');
                          else if (owned) { props.onEquipSkin(s.id); setShopMsg(s.name + ' equipped!'); }
                          else if (profile.points >= s.price) { props.onBuySkin(s.id); setShopMsg(s.name + ' bought! 🎉'); }
                          else setShopMsg(`${NOT_ENOUGH} Need ${s.price - profile.points} more coins for ${s.name}.`);
                        }}
                      >
                        <Text style={styles.detailBtnText}>{isEquipped ? '✅ Equipped' : owned ? 'EQUIP SKIN' : 'BUY SKIN'}</Text>
                      </TouchableOpacity>
                    </>
                  );
                })()}
              </View>
            </View>
          )}

          {shopTab === 'maps' && (
            <View style={styles.shopGrid}>
              {LEVELS.map((lv) => {
                const unlocked = isLevelUnlocked(lv.id, profile.unlockedLevel, profile.purchasedLevels, profile.unlockAll);
                const selected = lv.id === levelId;
                return (
                  <TouchableOpacity
                    key={lv.id}
                    style={[styles.shopCard, selected && styles.selected, !unlocked && styles.locked]}
                    onPress={() => {
                      if (unlocked) { setLevelId(lv.id); setPendingBuyLevel(null); setShopMsg(lv.name + ' selected! ' + lv.tagline); return; }
                      if (pendingBuyLevel !== lv.id) { setPendingBuyLevel(lv.id); setShopMsg(`Tap ${lv.name} again to buy it for 🪙 ${lv.price} — or pick another map.`); return; }
                      setPendingBuyLevel(null);
                      if (profile.points >= lv.price) { props.onBuyLevel(lv.id, 'coins'); setLevelId(lv.id); setShopMsg(lv.name + ' unlocked! 🎉'); }
                      else if (lv.gemPrice && profile.gems >= lv.gemPrice) { props.onBuyLevel(lv.id, 'gems'); setLevelId(lv.id); setShopMsg(lv.name + ' unlocked with gems! 💎🎉'); }
                      else setShopMsg(`${NOT_ENOUGH} Need ${lv.price - profile.points} more coins for ${lv.name}.`);
                    }}
                  >
                    <Text style={styles.levelIcon}>{unlocked ? lv.icon : `${lv.icon} 🔒`}</Text>
                    <Text style={styles.cardName}>{lv.name}</Text>
                    <Text style={styles.cardSub}>{unlocked ? `⭐ ${lv.starGoal} stars` : pendingBuyLevel === lv.id ? '👆 Tap again to buy!' : `🪙 ${lv.price}${lv.gemPrice ? ` or 💎 ${lv.gemPrice}` : ''}`}</Text>
                    <Text style={styles.cardSub}>{lv.tagline}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {shopTab === 'drivers' && (
            <View style={styles.shopGrid}>
              {DRIVERS.map((d) => {
                const owned = profile.ownedDrivers.includes(d.id);
                const isSelected = profile.selectedDriver === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.shopCard, isSelected && styles.selected]}
                    onPress={() => {
                      if (owned) { props.onSelectDriver(d.id); setShopMsg(`${d.name} is racing! ${d.tagline}`); }
                      else if (profile.points >= d.price) { props.onBuyDriver(d.id); setShopMsg(`${d.name} joined your team! 🎉`); }
                      else setShopMsg(`${NOT_ENOUGH} Need ${d.price - profile.points} more coins for ${d.name}.`);
                    }}
                  >
                    <DriverFace driver={d} mode={viewMode} size={56} />
                    <Text style={styles.cardName}>{d.faceEmoji} {d.name}</Text>
                    <Text style={styles.abilityLine}>{d.abilityIcon} {d.abilityName}</Text>
                    <Text style={styles.cardSub}>{isSelected ? '✅ Racing!' : owned ? 'Tap to pick' : d.price === 0 ? 'FREE' : `🪙 ${d.price}`}</Text>
                    <Text style={styles.cardSub}>{d.tagline}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>

      {parentsOpen && (
        <ParentsShop
          coins={profile.points}
          gems={profile.gems}
          unlockAll={profile.unlockAll}
          adFree={profile.adFree}
          grantedTransactions={profile.grantedTransactions}
          onGrantCoins={props.onGrantCoins}
          onGrantGems={props.onGrantGems}
          onUnlockAll={props.onUnlockAll}
          onAdFree={props.onAdFree}
          onClose={() => setParentsOpen(false)}
        />
      )}
    </LinearGradient>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  const fill = label === 'Speed' ? '#FF8A1A' : label === 'Acceleration' ? '#2FD8FF' : '#37D67A';
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statTrack}>
        <View style={[styles.statFill, { width: `${(value / 5) * 100}%`, backgroundColor: fill, shadowColor: fill, shadowOpacity: 0.8, shadowRadius: 6 }]} />
      </View>
      <Text style={styles.statValue}>{value}/5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Sleek dark theme: near-black panels, white italic titles, orange
  // PLAY, gold selection. Nothing pale or app-like remains.
  bg: { flex: 1 },
  root: { flex: 1, flexDirection: 'row', gap: 12 },
  left: { justifyContent: 'flex-start', gap: 4 },
  title: { fontSize: 38, fontWeight: '900', fontStyle: 'italic', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0, lineHeight: 36 },
  title2: { fontSize: 38, fontWeight: '900', fontStyle: 'italic', color: '#FF7A1A', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0, lineHeight: 36 },
  heroSlot: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 72 },
  hero: { alignItems: 'center' },
  trialChip: { textAlign: 'center', fontWeight: '900', color: '#FFE9A8', backgroundColor: 'rgba(255,197,49,0.16)', borderRadius: 999, overflow: 'hidden', paddingVertical: 4, paddingHorizontal: 10, fontSize: 12, borderWidth: 1, borderColor: 'rgba(255,197,49,0.4)' },
  garageBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  backBtn: { backgroundColor: '#37D67A', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 3, borderBottomColor: '#0E7A45' },
  backBtnText: { color: '#06281A', fontWeight: '900', fontSize: 14 },
  garageTitle: { fontSize: 20, fontWeight: '900', fontStyle: 'italic', color: '#F2F4F8', flex: 1 },
  tagline: { fontWeight: '800', color: '#9AA3B5', fontSize: 14 },
  nameInput: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.22)', borderRadius: 14, paddingVertical: 6, paddingHorizontal: 12, fontSize: 16, fontWeight: '800', color: '#F2F4F8', backgroundColor: 'rgba(10,12,20,0.62)', textAlign: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { backgroundColor: 'rgba(10,12,20,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, fontWeight: '900', color: '#FFFFFF', fontSize: 15, elevation: 2 },
  playBtn: { backgroundColor: '#FF6A00', borderRadius: 18, paddingVertical: 16, borderBottomWidth: 6, borderBottomColor: '#8F3200', elevation: 8, shadowColor: '#FF6A00', shadowOpacity: 0.5, shadowRadius: 12 },
  playText: { color: '#fff', fontSize: 32, fontWeight: '900', fontStyle: 'italic', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 },
  racingNow: { textAlign: 'center', fontWeight: '800', color: '#C7CEDE', fontSize: 13 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(10,12,20,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  roundText: { fontSize: 21 },
  parentNote: { fontWeight: '700', color: '#9AA3B5', fontSize: 12 },
  parentsBtn: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', borderWidth: 2, borderColor: '#6366F1' },
  parentsBtnText: { fontWeight: '900', color: '#A5B4FC', fontSize: 13 },
  unlockAllBadge: { textAlign: 'center', fontWeight: '900', color: '#FFC531', fontSize: 13 },
  right: { flex: 1 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewToggle: { flexDirection: 'row', backgroundColor: 'rgba(10,12,20,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 3, gap: 3 },
  viewBtn: { borderRadius: 9, paddingVertical: 5, paddingHorizontal: 12 },
  viewBtnSelected: { backgroundColor: '#FFC531' },
  viewBtnText: { fontWeight: '900', color: '#9AA3B5', fontSize: 14 },
  viewBtnTextSelected: { color: '#0B0D13' },
  gameCard: { width: 108, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, paddingVertical: 3, paddingHorizontal: 6, borderWidth: 3, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', elevation: 3 },
  selected: { borderColor: '#FFC531', backgroundColor: 'rgba(255,197,49,0.14)' },
  locked: { opacity: 0.55 },
  levelIcon: { fontSize: 26 },
  cardName: { fontWeight: '900', textAlign: 'center', color: '#F2F4F8', fontSize: 14, marginTop: 2 },
  cardSub: { textAlign: 'center', color: '#9AA3B5', fontWeight: '700', fontSize: 12 },
  abilityLine: { textAlign: 'center', color: '#2FD8FF', fontWeight: '900', fontSize: 12, marginTop: 1 },
  diffBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 8, borderWidth: 3, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', elevation: 3 },
  diffLabel: { fontSize: 15, fontWeight: '900', color: '#F2F4F8' },
  shopMsg: { textAlign: 'center', fontWeight: '800', color: '#FFC531', marginBottom: 4 },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tabBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13, borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)' },
  tabBtnSelected: { backgroundColor: '#FFC531', borderColor: '#FFE1A0' },
  tabBtnText: { fontWeight: '900', color: '#C7CEDE', fontSize: 13 },
  tabBtnTextSelected: { color: '#0B0D13' },
  garageRow: { flexDirection: 'row', gap: 8 },
  garageGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  garageCard: { width: '31%', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 8, borderWidth: 3, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', elevation: 3 },
  equippedCard: { backgroundColor: 'rgba(255,197,49,0.14)' },
  detailPanel: { width: 182, backgroundColor: '#161B28', borderRadius: 18, padding: 12, alignItems: 'center', borderWidth: 3, borderColor: '#FFC531', elevation: 3, shadowColor: '#FFC531', shadowOpacity: 0.25, shadowRadius: 10 },
  detailName: { fontWeight: '900', fontStyle: 'italic', color: '#F2F4F8', fontSize: 16, marginTop: 4, textAlign: 'center' },
  detailPrice: { fontWeight: '900', color: '#FFC531', marginTop: 6, fontSize: 14 },
  detailBtn: { backgroundColor: '#FF6A00', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16, marginTop: 10, borderBottomWidth: 3, borderBottomColor: '#8F3200' },
  detailBtnDone: { backgroundColor: '#475569' },
  detailBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, width: '100%' },
  statLabel: { width: 78, fontSize: 11, fontWeight: '800', color: '#C7CEDE' },
  statTrack: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 4, overflow: 'hidden' },
  statFill: { height: '100%', backgroundColor: '#FF8A1A' },
  statValue: { fontSize: 11, fontWeight: '900', color: '#F2F4F8', width: 22 },
  shopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shopCard: { width: '31%', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 10, borderWidth: 3, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', elevation: 3 },
  upgradeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 10, marginBottom: 8, elevation: 3 },
  upgradeEmoji: { fontSize: 30 },
  upgradeInfo: { flex: 1 },
  upgradeName: { fontWeight: '900', color: '#F2F4F8', fontSize: 15 },
  upgradePips: { color: '#FFC531', fontSize: 16, letterSpacing: 2 },
  upgradeBtns: { gap: 6, alignItems: 'flex-end' },
  earnGemsBtn: { backgroundColor: '#7C3AED', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start', marginBottom: 8, elevation: 3 },
  earnGemsText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  gemBtn: { backgroundColor: '#7C3AED', borderBottomColor: '#5B21B6' },
  tryBtn: { backgroundColor: '#F59E0B', borderBottomColor: '#B45309' },
  // --- Mockup-gap fixes: hero home + photo showroom ---
  heroRoot: { flex: 1 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroTopRight: { alignItems: 'flex-end', gap: 6 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' },
  nameInputCompact: { width: 118, borderWidth: 2, borderColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, fontSize: 14, fontWeight: '800', color: '#F2F4F8', backgroundColor: 'rgba(10,12,20,0.62)', textAlign: 'center' },
  pickChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(10,12,20,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingVertical: 4, paddingLeft: 6, paddingRight: 12 },
  pickChipOpen: { borderColor: '#FFC531', backgroundColor: 'rgba(255,197,49,0.14)' },
  pickChipText: { fontWeight: '900', color: '#FFFFFF', fontSize: 14 },
  pickChipSub: { fontWeight: '800', color: '#2FD8FF', fontSize: 12 },
  pickChipIcon: { fontSize: 20 },
  pickerPanel: { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(10,12,20,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 18, padding: 8, marginTop: 8, alignSelf: 'flex-start', maxWidth: '100%' },
  pickerCard: { width: 96, paddingVertical: 4 },
  pickerDiffBtn: { flex: 0, minWidth: 110 },
  levelIconCompact: { fontSize: 22 },
  dock: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginTop: 8 },
  dockLeft: { flexDirection: 'row', gap: 8 },
  dockBtn: { backgroundColor: 'rgba(10,12,20,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 },
  dockBtnText: { color: '#fff', fontSize: 15, fontWeight: '900', fontStyle: 'italic' },
  playBtnHero: { backgroundColor: '#FF6A00', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 44, borderBottomWidth: 6, borderBottomColor: '#8F3200', elevation: 8, shadowColor: '#FF6A00', shadowOpacity: 0.5, shadowRadius: 12, minWidth: 240 },
  // Showroom (Garage Cars tab): photo hero + info + thumbnail strip.
  showroom: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  showArrow: { width: 40, alignSelf: 'center', backgroundColor: 'rgba(10,12,20,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  showArrowText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  showHero: { flex: 1.35, height: 208, borderRadius: 18, overflow: 'hidden', backgroundColor: '#0B0D13', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', position: 'relative' },
  showHeroImg: { width: '100%', height: '100%' },
  showDrawn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0D13' },
  showGlow: { position: 'absolute', bottom: 10, left: '15%', right: '15%', height: 6, borderRadius: 999, opacity: 0.85, shadowOpacity: 0.9, shadowRadius: 12, elevation: 4 },
  showInfo: { flex: 1, backgroundColor: '#161B28', borderRadius: 18, padding: 12, borderWidth: 3, borderColor: '#FFC531', elevation: 3, shadowColor: '#FFC531', shadowOpacity: 0.25, shadowRadius: 10 },
  showClass: { fontWeight: '900', color: '#2FD8FF', fontSize: 12, letterSpacing: 1 },
  showName: { fontWeight: '900', fontStyle: 'italic', color: '#F2F4F8', fontSize: 22, marginTop: 2 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  swatchSelected: { borderColor: '#FFC531', borderWidth: 3 },
  thumbRow: { flexDirection: 'row', gap: 6, paddingTop: 8, paddingRight: 4 },
  thumb: { width: 74, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 4, borderWidth: 3, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  thumbName: { fontWeight: '800', textAlign: 'center', color: '#C7CEDE', fontSize: 10, marginTop: 1 },
  paintHero: { width: '100%', height: 108, borderRadius: 14, overflow: 'hidden', backgroundColor: '#0B0D13', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', position: 'relative', marginBottom: 4 },
  paintHeroImg: { width: '100%', height: '100%' },
});

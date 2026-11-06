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
  Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LEVELS, isLevelUnlocked } from '../data/levels';
import { DRIVERS, driverById } from '../data/drivers';
import { PAINTS, SKINS, VEHICLES, paintById, skinById, vehicleById } from '../data/skins';
import { UPGRADES, nextUpgradeCost, type UpgradeId } from '../data/upgrades';
import { CarView } from '../components/CarView';
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

  return (
    <LinearGradient colors={['#38BDF8', '#7DD3FC', '#FEF9C3']} style={styles.bg}>
      <View style={[styles.root, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 6, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 }]}>
        {/* LEFT — hero + PLAY (game menu, not an app header) */}
        <View style={[styles.left, { width: leftW }]}>
          <Text style={[styles.title, compact && { fontSize: 32 }]}>🏁 RACE!</Text>
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

          {panel === 'tracks' ? (
            <>
              <Text style={styles.section}>🐶 Who's driving?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
                {DRIVERS.map((d) => {
                  const owned = profile.ownedDrivers.includes(d.id);
                  const isSelected = profile.selectedDriver === d.id;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.gameCard, isSelected && styles.selected, !owned && styles.locked]}
                      onPress={() => {
                        if (owned) { props.onSelectDriver(d.id); setShopMsg(`${d.name} jumps in! ${d.tagline}`); }
                        else if (profile.points >= d.price) { props.onBuyDriver(d.id); setShopMsg(`${d.name} joined your team! 🎉`); }
                        else { setShopTab('drivers'); setPanel('garage'); setShopMsg(`Get ${d.name} in the Garage! Need ${d.price - profile.points} more coins.`); }
                      }}
                    >
                      <DriverFace driver={d} mode={viewMode} size={40} />
                      <Text style={styles.cardName}>{d.faceEmoji} {d.name}</Text>
                      <Text style={styles.cardSub}>{isSelected ? '✅ Racing!' : owned ? 'Tap to drive' : `🪙 ${d.price} — tap to buy`}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.section}>🗺️ Which track?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
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
                      style={[styles.gameCard, styles.levelCard, selected && styles.selected, locked && styles.locked]}
                    >
                      <Text style={styles.levelIcon}>{locked ? '🔒' : lv.icon}</Text>
                      <Text style={styles.cardName}>{lv.name}</Text>
                      <Text style={styles.cardSub}>{locked ? 'Locked' : `⭐ ${lv.starGoal}`}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.section}>💨 How fast?</Text>
              <View style={styles.hRow}>
                {DIFFICULTY_ORDER.map((id) => {
                  const d = DIFFICULTIES[id];
                  const kid = DIFF_KID[id];
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => setDifficulty(id)}
                      style={[styles.diffBtn, difficulty === id && styles.selected]}
                    >
                      <Text style={styles.diffLabel}>{kid.face} {kid.label}</Text>
                      <Text style={styles.cardSub}>❤️ {d.hearts}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity style={styles.garageLaunch} onPress={() => { setShopTab('cars'); setPanel('garage'); }}>
                  <Text style={styles.garageLaunchText}>🛠️ Garage</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
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
          {!profile.adFree && isAdsConfigured && (
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
            <View style={styles.garageRow}>
              <View style={styles.garageGrid}>
                {VEHICLES.map((v) => {
                  const owned = profile.ownedVehicles.includes(v.id);
                  const isEquipped = raceVehicle.id === v.id;
                  const isPicked = pickedVehicle === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.garageCard, isPicked && styles.selected, isEquipped && styles.equippedCard]}
                      onPress={() => setPickedVehicle(v.id)}
                    >
                      <CarView color={v.carColor} accent={v.carAccent} emoji={v.emoji} width={44} mode={viewMode} angle="top" stripe="#FFFFFF" vehicleId={v.id} />
                      <Text style={styles.cardName}>{v.name}</Text>
                      <Text style={styles.cardSub}>{isEquipped ? '✅ Equipped' : owned ? 'Owned' : v.price === 0 ? `With ${DRIVERS.find((d) => d.vehicleId === v.id)?.name ?? 'driver'}` : `🪙 ${v.price}`}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.detailPanel}>
                {(() => {
                  const v = vehicleById(pickedVehicle);
                  const owned = profile.ownedVehicles.includes(v.id);
                  const isEquipped = raceVehicle.id === v.id;
                  return (
                    <>
                      <CarView color={v.carColor} accent={v.carAccent} emoji={v.emoji} width={64} mode={viewMode} angle="top" stripe={skin.stripe} vehicleId={v.id} />
                      <Text style={styles.detailName}>{v.emoji} {v.name}</Text>
                      <StatBar label="Speed" value={v.speed} />
                      <StatBar label="Handling" value={v.handling} />
                      <Text style={styles.cardSub}>Handling = how fast the car slides between lanes.</Text>
                      <Text style={styles.detailPrice}>{v.price === 0 ? 'FREE' : `🪙 ${v.price} coins${v.gemPrice ? ` or 💎 ${v.gemPrice}` : ''}`}</Text>
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
                          {isAdsConfigured && !profile.adFree ? (
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
                    </>
                  );
                })()}
              </View>
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
                      <CarView color={p.color} accent={p.accent} emoji={raceVehicle.emoji} width={84} mode={viewMode} angle="top" stripe={p.stripe} vehicleId={raceVehicle.id} />
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
                          {isAdsConfigured && !profile.adFree ? (
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
                    <Text style={styles.cardSub}>{isSelected ? '✅ Racing!' : owned ? 'Tap to pick' : d.price === 0 ? 'FREE' : `🪙 ${d.price}`}</Text>
                    <Text style={styles.cardSub}>{d.tagline}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
            </>
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
  left: { justifyContent: 'flex-start', gap: 4 },
  title: { fontSize: 40, fontWeight: '900', color: '#B91C1C', textShadowColor: 'rgba(255,255,255,0.9)', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  heroSlot: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 72 },
  hero: { alignItems: 'center' },
  trialChip: { textAlign: 'center', fontWeight: '900', color: '#7C2D12', backgroundColor: '#FEF3C7', borderRadius: 999, overflow: 'hidden', paddingVertical: 4, paddingHorizontal: 10, fontSize: 12 },
  garageLaunch: { flex: 1.1, backgroundColor: '#F97316', borderRadius: 16, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: '#9A3412', elevation: 4 },
  garageLaunchText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  garageBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  backBtn: { backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 3, borderBottomColor: '#15803D' },
  backBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  garageTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B', flex: 1 },
  title2: { fontSize: 42, fontWeight: '900', color: '#1E40AF', textShadowColor: 'rgba(255,255,255,0.9)', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  tagline: { fontWeight: '800', color: '#334155', fontSize: 14 },
  nameInput: { borderWidth: 3, borderColor: '#FACC15', borderRadius: 14, paddingVertical: 6, paddingHorizontal: 12, fontSize: 16, fontWeight: '800', color: '#1E293B', backgroundColor: '#FEFCE8', textAlign: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, fontWeight: '900', color: '#1E293B', fontSize: 15, elevation: 2 },
  playBtn: { backgroundColor: '#22C55E', borderRadius: 24, paddingVertical: 14, borderBottomWidth: 6, borderBottomColor: '#15803D', elevation: 6 },
  playText: { color: '#fff', fontSize: 30, fontWeight: '900', textAlign: 'center' },
  racingNow: { textAlign: 'center', fontWeight: '800', color: '#1E293B', fontSize: 13 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  roundText: { fontSize: 21 },
  parentNote: { fontWeight: '700', color: '#475569', fontSize: 12 },
  parentsBtn: { backgroundColor: '#E0E7FF', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', borderWidth: 2, borderColor: '#6366F1' },
  parentsBtnText: { fontWeight: '900', color: '#3730A3', fontSize: 13 },
  unlockAllBadge: { textAlign: 'center', fontWeight: '900', color: '#B45309', fontSize: 13 },
  right: { flex: 1 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { fontSize: 15, fontWeight: '900', color: '#1E293B', marginTop: 2, marginBottom: 2, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 999, paddingVertical: 2, paddingHorizontal: 10, alignSelf: 'flex-start', elevation: 2 },
  viewToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 12, padding: 3, gap: 3 },
  viewBtn: { borderRadius: 9, paddingVertical: 5, paddingHorizontal: 12 },
  viewBtnSelected: { backgroundColor: '#2563EB' },
  viewBtnText: { fontWeight: '900', color: '#475569', fontSize: 14 },
  viewBtnTextSelected: { color: '#fff' },
  hRow: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  gameCard: { width: 108, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 3, paddingHorizontal: 6, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', elevation: 3 },
  levelCard: { width: 100 },
  selected: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  locked: { opacity: 0.55 },
  levelIcon: { fontSize: 26 },
  cardName: { fontWeight: '900', textAlign: 'center', color: '#1E293B', fontSize: 14, marginTop: 2 },
  cardSub: { textAlign: 'center', color: '#64748B', fontWeight: '700', fontSize: 12 },
  diffBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 8, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', elevation: 3 },
  diffLabel: { fontSize: 15, fontWeight: '900', color: '#1E293B' },
  shopMsg: { textAlign: 'center', fontWeight: '800', color: '#B45309', marginBottom: 4 },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tabBtn: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13, borderWidth: 2, borderColor: 'transparent' },
  tabBtnSelected: { backgroundColor: '#2563EB', borderColor: '#1E40AF' },
  tabBtnText: { fontWeight: '900', color: '#475569', fontSize: 13 },
  tabBtnTextSelected: { color: '#fff' },
  garageRow: { flexDirection: 'row', gap: 8 },
  garageGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  garageCard: { width: '31%', backgroundColor: '#fff', borderRadius: 14, padding: 8, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', elevation: 3 },
  equippedCard: { backgroundColor: '#FFFBEB' },
  detailPanel: { width: 182, backgroundColor: '#fff', borderRadius: 18, padding: 12, alignItems: 'center', borderWidth: 3, borderColor: '#F59E0B', elevation: 3 },
  detailName: { fontWeight: '900', color: '#1E293B', fontSize: 16, marginTop: 4, textAlign: 'center' },
  detailPrice: { fontWeight: '900', color: '#B45309', marginTop: 6, fontSize: 14 },
  detailBtn: { backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16, marginTop: 10, borderBottomWidth: 3, borderBottomColor: '#15803D' },
  detailBtnDone: { backgroundColor: '#94A3B8' },
  detailBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, width: '100%' },
  statLabel: { width: 78, fontSize: 11, fontWeight: '800', color: '#475569' },
  statTrack: { flex: 1, height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  statFill: { height: '100%', backgroundColor: '#F59E0B' },
  statValue: { fontSize: 11, fontWeight: '900', color: '#1E293B', width: 22 },
  shopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shopCard: { width: '31%', backgroundColor: '#fff', borderRadius: 16, padding: 10, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', elevation: 3 },
  upgradeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 16, padding: 10, marginBottom: 8, elevation: 3 },
  upgradeEmoji: { fontSize: 30 },
  upgradeInfo: { flex: 1 },
  upgradeName: { fontWeight: '900', color: '#1E293B', fontSize: 15 },
  upgradePips: { color: '#F59E0B', fontSize: 16, letterSpacing: 2 },
  upgradeBtns: { gap: 6, alignItems: 'flex-end' },
  earnGemsBtn: { backgroundColor: '#7C3AED', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start', marginBottom: 8, elevation: 3 },
  earnGemsText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  gemBtn: { backgroundColor: '#7C3AED', borderBottomColor: '#5B21B6' },
  tryBtn: { backgroundColor: '#F59E0B', borderBottomColor: '#B45309' },
});

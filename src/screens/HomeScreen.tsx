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

import React, { useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
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

export function HomeScreen(props: Props) {
  const { profile } = props;
  const [name, setName] = useState(profile.name);
  const [levelId, setLevelId] = useState(1);
  const [difficulty, setDifficulty] = useState<DifficultyId>('low');
  const [shopTab, setShopTab] = useState<ShopTab>('cars');
  const [pickedVehicle, setPickedVehicle] = useState(profile.selectedVehicle || 'car');
  const [pickedPaint, setPickedPaint] = useState(profile.equippedPaint);
  const [pickedSkin, setPickedSkin] = useState(profile.equippedSkin);
  const [shopMsg, setShopMsg] = useState(props.dailyBonus > 0 ? `🎉 Daily bonus! +${props.dailyBonus} coins!` : '');
  const [parentsOpen, setParentsOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const leftW = Math.max(250, Math.min(320, width * 0.36));

  const selectedDriver = driverById(profile.selectedDriver);
  const viewMode = profile.viewMode;
  // Race vehicle: the equipped Shop car, or the driver's vehicle when no car is equipped.
  const raceVehicle = profile.selectedVehicle ? vehicleById(profile.selectedVehicle) : vehicleById(selectedDriver.vehicleId);
  // Paint repaints the car in the race (overrides the skin colour).
  const paint = paintById(profile.equippedPaint);
  const skin = skinById(profile.equippedSkin);
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
            <Text style={styles.badge}>🪙 {profile.points} Coins</Text>
            <Text style={styles.badge}>💎 {profile.gems} Gems</Text>
            <Text style={styles.badge}>🏆 {profile.trophies}</Text>
            <Text style={styles.badge}>🚗 {profile.ownedVehicles.length}/12</Text>
            <Text style={styles.badge}>🗺️ {unlockedMaps}/10</Text>
          </View>

          <TouchableOpacity style={styles.playBtn} onPress={() => props.onPlay(levelId, difficulty, raceVehicle.id)}>
            <Text style={styles.playText}>▶  START RACE</Text>
          </TouchableOpacity>
          <Text style={styles.racingNow}>
            {selectedDriver.faceEmoji} {selectedDriver.name} • {raceVehicle.emoji} {raceVehicle.name} • {LEVELS[levelId - 1].icon} {LEVELS[levelId - 1].name} • {DIFFICULTIES[difficulty].label}
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
          <TouchableOpacity style={styles.parentsBtn} onPress={() => setParentsOpen(true)}>
            <Text style={styles.parentsBtnText}>👨‍👩‍👧 For Parents</Text>
          </TouchableOpacity>
          {profile.unlockAll ? <Text style={styles.unlockAllBadge}>🏆 Unlock All owned!</Text> : null}
        </View>

        {/* RIGHT — game rows: drivers, levels, difficulty, SHOP */}
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
                    else setShopMsg(`${NOT_ENOUGH} Need ${d.price - profile.points} more coins for ${d.name}.`);
                  }}
                >
                  <DriverFace driver={d} mode={viewMode} size={62} />
                  <CarView color={d.carColor} accent={d.carAccent} emoji={d.vehicleEmoji} width={56} mode={viewMode} />
                  <Text style={styles.cardName}>{d.faceEmoji} {d.name}</Text>
                  <Text style={styles.cardSub}>{isSelected ? '✅ Racing!' : owned ? 'Tap to pick' : d.price === 0 ? 'FREE' : `🪙 ${d.price}`}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.section}>🗺️ Pick a map</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
            {LEVELS.map((lv) => {
              const locked = !isLevelUnlocked(lv.id, profile.unlockedLevel, profile.purchasedLevels, profile.unlockAll);
              const selected = lv.id === levelId;
              return (
                <TouchableOpacity
                  key={lv.id}
                  onPress={() => {
                    if (!locked) setLevelId(lv.id);
                    else if (profile.points >= lv.price) { props.onBuyLevel(lv.id, 'coins'); setLevelId(lv.id); setShopMsg(`${lv.name} unlocked! 🎉`); }
                    else if (lv.gemPrice && profile.gems >= lv.gemPrice) { props.onBuyLevel(lv.id, 'gems'); setLevelId(lv.id); setShopMsg(`${lv.name} unlocked with gems! 💎🎉`); }
                    else setShopMsg(`${NOT_ENOUGH} Need ${lv.price - profile.points} more coins for ${lv.name}.`);
                  }}
                  style={[styles.gameCard, styles.levelCard, selected && styles.selected, locked && styles.locked]}
                >
                  <Text style={styles.levelIcon}>{locked ? '🔒' : lv.icon}</Text>
                  <Text style={styles.cardName}>{lv.name}</Text>
                  <Text style={styles.cardSub}>{locked ? `🪙 ${lv.price}${lv.gemPrice ? ` or 💎 ${lv.gemPrice}` : ''}` : `⭐ ${lv.starGoal} stars`}</Text>
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

          {/* SHOP — tabs: Cars, Paint, Upgrades, Skins, Maps, Drivers */}
          <Text style={styles.section}>🛍️ Shop — spend your coins!</Text>
          {!profile.adFree && (
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
                      <CarView color={v.carColor} accent={v.carAccent} emoji={v.emoji} width={44} mode={viewMode} angle="top" stripe="#FFFFFF" />
                      <Text style={styles.cardName}>{v.name}</Text>
                      <Text style={styles.cardSub}>{isEquipped ? '✅ Equipped' : owned ? 'Owned' : v.price === 0 ? 'FREE' : `🪙 ${v.price}`}</Text>
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
                      <CarView color={paint.color} accent={paint.accent} emoji={v.emoji} width={64} mode={viewMode} angle="top" stripe={paint.stripe} />
                      <Text style={styles.detailName}>{v.emoji} {v.name}</Text>
                      <StatBar label="Speed" value={v.speed} />
                      <StatBar label="Handling" value={v.handling} />
                      <Text style={styles.detailPrice}>{v.price === 0 ? 'FREE' : `🪙 ${v.price} coins${v.gemPrice ? ` or 💎 ${v.gemPrice}` : ''}`}</Text>
                      <TouchableOpacity
                        style={[styles.detailBtn, isEquipped && styles.detailBtnDone]}
                        onPress={() => {
                          if (isEquipped) setShopMsg(v.name + ' is already equipped!');
                          else if (owned) { props.onEquipVehicle(v.id); setShopMsg(v.name + ' equipped!'); }
                          else if (v.price === 0) setShopMsg(v.name + ' comes with its driver — pick that driver to race it!');
                          else if (profile.points >= v.price) { props.onBuyVehicle(v.id, 'coins'); setShopMsg(v.name + ' bought! 🎉'); }
                          else setShopMsg(`${NOT_ENOUGH} Need ${v.price - profile.points} more coins for ${v.name}.`);
                        }}
                      >
                        <Text style={styles.detailBtnText}>{isEquipped ? '✅ Equipped' : owned ? 'EQUIP CAR' : 'BUY CAR'}</Text>
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
                        <TouchableOpacity
                          style={[styles.detailBtn, styles.tryBtn]}
                          onPress={async () => {
                            if (profile.gems >= 5) {
                              const r = await props.onTrialVehicle(v.id, 'gems');
                              if (r === 'earned') setShopMsg(v.name + ' trial ready for your next race! 💎 (5 gems)');
                              return;
                            }
                            if (!isAdsConfigured) { setShopMsg('Ads are not set up yet — the trial needs 5 gems instead.'); return; }
                            const r = await props.onTrialVehicle(v.id, 'ad');
                            if (r === 'earned') setShopMsg(v.name + ' trial ready for your next race! Start a race to try it!');
                            else if (r === 'not-configured') setShopMsg('Ads are not set up yet — the trial needs 5 gems instead.');
                            else if (r === 'cancelled') setShopMsg('Ad closed early — no trial this time.');
                            else setShopMsg('The ad could not load — no trial this time.');
                          }}
                        >
                          <Text style={styles.detailBtnText}>🎁 TRY 1 RACE — 📺 ad or 💎 5</Text>
                        </TouchableOpacity>
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
                      <CarView color={p.color} accent={p.accent} emoji={raceVehicle.emoji} width={44} mode={viewMode} angle="top" stripe={p.stripe} />
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
                      <CarView color={p.color} accent={p.accent} emoji={raceVehicle.emoji} width={64} mode={viewMode} angle="top" stripe={p.stripe} />
                      <Text style={styles.detailName}>{p.emoji} {p.name}</Text>
                      <Text style={styles.cardSub}>Repaints any car you own!</Text>
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
                        <TouchableOpacity
                          style={[styles.detailBtn, styles.tryBtn]}
                          onPress={async () => {
                            if (profile.gems >= 5) {
                              const r = await props.onTrialPaint(p.id, 'gems');
                              if (r === 'earned') setShopMsg(p.name + ' trial ready for your next race! 💎 (5 gems)');
                              return;
                            }
                            if (!isAdsConfigured) { setShopMsg('Ads are not set up yet — the trial needs 5 gems instead.'); return; }
                            const r = await props.onTrialPaint(p.id, 'ad');
                            if (r === 'earned') setShopMsg(p.name + ' trial ready for your next race! Start a race to try it!');
                            else if (r === 'not-configured') setShopMsg('Ads are not set up yet — the trial needs 5 gems instead.');
                            else if (r === 'cancelled') setShopMsg('Ad closed early — no trial this time.');
                            else setShopMsg('The ad could not load — no trial this time.');
                          }}
                        >
                          <Text style={styles.detailBtnText}>🎁 TRY 1 RACE — 📺 ad or 💎 5</Text>
                        </TouchableOpacity>
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
              <Text style={styles.cardSub}>Upgrades really change the race: Engine = faster, Turbo = stronger BOOST, Extra Heart = more hearts, Magnet = stars fly to you!</Text>
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
                      <CarView color={s.color} accent={s.accent} emoji={selectedDriver.vehicleEmoji} width={44} mode={viewMode} angle="top" stripe={s.stripe} />
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
                      <CarView color={s.color} accent={s.accent} emoji={selectedDriver.vehicleEmoji} width={64} mode={viewMode} angle="top" stripe={s.stripe} />
                      <Text style={styles.detailName}>{s.emoji} {s.name}</Text>
                      <StatBar label="Speed" value={s.speed} />
                      <StatBar label="Acceleration" value={s.acceleration} />
                      <StatBar label="Handling" value={s.handling} />
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
                      if (unlocked) { setLevelId(lv.id); setShopMsg(lv.name + ' selected! ' + lv.tagline); }
                      else if (profile.points >= lv.price) { props.onBuyLevel(lv.id, 'coins'); setLevelId(lv.id); setShopMsg(lv.name + ' unlocked! 🎉'); }
                      else if (lv.gemPrice && profile.gems >= lv.gemPrice) { props.onBuyLevel(lv.id, 'gems'); setLevelId(lv.id); setShopMsg(lv.name + ' unlocked with gems! 💎🎉'); }
                      else setShopMsg(`${NOT_ENOUGH} Need ${lv.price - profile.points} more coins for ${lv.name}.`);
                    }}
                  >
                    <Text style={styles.levelIcon}>{unlocked ? lv.icon : '🔒'}</Text>
                    <Text style={styles.cardName}>{lv.name}</Text>
                    <Text style={styles.cardSub}>{unlocked ? `⭐ ${lv.starGoal} stars` : `🪙 ${lv.price}${lv.gemPrice ? ` or 💎 ${lv.gemPrice}` : ''}`}</Text>
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
  left: { justifyContent: 'center', gap: 6 },
  title: { fontSize: 42, fontWeight: '900', color: '#B91C1C', textShadowColor: 'rgba(255,255,255,0.9)', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  title2: { fontSize: 42, fontWeight: '900', color: '#1E40AF', textShadowColor: 'rgba(255,255,255,0.9)', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  tagline: { fontWeight: '800', color: '#334155', fontSize: 14 },
  nameInput: { borderWidth: 3, borderColor: '#FACC15', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, fontSize: 18, fontWeight: '800', color: '#1E293B', backgroundColor: '#FEFCE8' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, fontWeight: '900', color: '#1E293B', fontSize: 15, elevation: 2 },
  playBtn: { backgroundColor: '#22C55E', borderRadius: 24, paddingVertical: 18, marginTop: 8, borderBottomWidth: 6, borderBottomColor: '#15803D', elevation: 6 },
  playText: { color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  racingNow: { textAlign: 'center', fontWeight: '800', color: '#1E293B', fontSize: 13 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  roundText: { fontSize: 21 },
  parentNote: { fontWeight: '700', color: '#475569', fontSize: 12 },
  parentsBtn: { backgroundColor: '#E0E7FF', borderRadius: 14, paddingVertical: 9, marginTop: 6, alignItems: 'center', borderWidth: 2, borderColor: '#6366F1' },
  parentsBtnText: { fontWeight: '900', color: '#3730A3', fontSize: 14 },
  unlockAllBadge: { textAlign: 'center', fontWeight: '900', color: '#B45309', fontSize: 13 },
  right: { flex: 1 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginTop: 10, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 14, alignSelf: 'flex-start', elevation: 2 },
  viewToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 12, padding: 3, gap: 3 },
  viewBtn: { borderRadius: 9, paddingVertical: 5, paddingHorizontal: 12 },
  viewBtnSelected: { backgroundColor: '#2563EB' },
  viewBtnText: { fontWeight: '900', color: '#475569', fontSize: 14 },
  viewBtnTextSelected: { color: '#fff' },
  hRow: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  gameCard: { width: 140, backgroundColor: '#fff', borderRadius: 18, padding: 10, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', elevation: 3 },
  levelCard: { width: 136 },
  selected: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  locked: { opacity: 0.55 },
  levelIcon: { fontSize: 30 },
  cardName: { fontWeight: '900', textAlign: 'center', color: '#1E293B', fontSize: 14, marginTop: 2 },
  cardSub: { textAlign: 'center', color: '#64748B', fontWeight: '700', fontSize: 12 },
  diffBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', elevation: 3 },
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

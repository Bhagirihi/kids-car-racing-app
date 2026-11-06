// Parents Shop — real-money purchases, behind a parent gate.
// A child can never reach a buy button without first answering a
// maths question correctly. With no RevenueCat key / products
// configured, the shop plainly says "Not set up yet" and every buy
// button does nothing and charges nothing — coins are never granted
// and Unlock All is never applied without a real successful
// purchase (see src/revenuecat.ts). Prices shown are ONLY the
// priceString values RevenueCat returns — never hardcoded here.

import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  AD_FREE_PRODUCT_ID, COIN_PACKS, GEM_PACKS, UNLOCK_ALL_PRODUCT_ID, fetchOfferings, isRevenueCatConfigured,
  purchaseAdFree, purchaseCoinPack, purchaseGemPack, purchaseUnlockAll, restorePurchases,
  type RcPackage,
} from '../revenuecat';

interface Props {
  coins: number;
  gems: number;
  unlockAll: boolean;
  adFree: boolean;
  grantedTransactions: string[];
  onGrantCoins: (coins: number, transactionId: string) => void;
  onGrantGems: (gems: number, transactionId: string) => void;
  onUnlockAll: () => void;
  onAdFree: () => void;
  onClose: () => void;
}

function newQuestion(): { a: number; b: number } {
  return { a: 5 + Math.floor(Math.random() * 11), b: 5 + Math.floor(Math.random() * 11) };
}

export function ParentsShop(props: Props) {
  const [gate, setGate] = useState(newQuestion());
  const [answer, setAnswer] = useState('');
  const [passed, setPassed] = useState(false);
  const [gateMsg, setGateMsg] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');
  const [packages, setPackages] = useState<RcPackage[]>([]);
  const [loaded, setLoaded] = useState(false);

  const configured = isRevenueCatConfigured;

  // Load the real offering only after the parent gate is passed.
  useEffect(() => {
    if (!passed || !configured) return;
    let alive = true;
    fetchOfferings()
      .then((pkgs) => { if (alive) { setPackages(pkgs); setLoaded(true); } })
      .catch((e: unknown) => { if (alive) { setMsg(e instanceof Error ? e.message : 'Could not load products.'); setLoaded(true); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passed]);

  const priceFor = (productId: string): string => {
    const pkg = packages.find((p) => p.productId === productId);
    return pkg ? pkg.priceString : '';
  };

  const checkGate = () => {
    if (parseInt(answer, 10) === gate.a + gate.b) {
      setPassed(true);
      setGateMsg('');
    } else {
      setGateMsg('That is not right — try again, grown-up!');
      setGate(newQuestion());
      setAnswer('');
    }
  };

  const buyCoins = async (productId: string, coins: number) => {
    if (!configured) return;
    setBusy(productId);
    setMsg('');
    try {
      const grant = await purchaseCoinPack(productId, props.grantedTransactions);
      if (grant.granted) {
        props.onGrantCoins(grant.coins, grant.transactionId);
        setMsg(`+${grant.coins} coins added! 🎉`);
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Purchase did not complete. No coins were added.');
    } finally {
      setBusy('');
    }
  };

  const buyGems = async (productId: string) => {
    if (!configured) return;
    setBusy(productId);
    setMsg('');
    try {
      const grant = await purchaseGemPack(productId, props.grantedTransactions);
      if (grant.granted) {
        props.onGrantGems(grant.gems, grant.transactionId);
        setMsg(`+${grant.gems} gems added! 💎`);
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Purchase did not complete. No gems were added.');
    } finally {
      setBusy('');
    }
  };

  const buyUnlockAll = async () => {
    if (!configured) return;
    setBusy(UNLOCK_ALL_PRODUCT_ID);
    setMsg('');
    try {
      const ok = await purchaseUnlockAll();
      if (ok) {
        props.onUnlockAll();
        setMsg('Unlock All is yours! Every car, paint, map, driver and upgrade is now unlocked. 🎉');
      } else {
        setMsg('Purchase did not complete — Unlock All was not applied.');
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Purchase did not complete. Nothing was unlocked.');
    } finally {
      setBusy('');
    }
  };

  const buyAdFree = async () => {
    if (!configured) return;
    setBusy(AD_FREE_PRODUCT_ID);
    setMsg('');
    try {
      const ok = await purchaseAdFree();
      if (ok) {
        props.onAdFree();
        setMsg('Ad-Free is on! No rewarded-ad prompts will be shown. 🎉');
      } else {
        setMsg('Purchase did not complete — Ad-Free was not applied.');
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Purchase did not complete. Nothing was changed.');
    } finally {
      setBusy('');
    }
  };

  const restore = async () => {
    if (!configured) return;
    setBusy('restore');
    setMsg('');
    try {
      const result = await restorePurchases();
      let grantedCoins = 0;
      let grantedGems = 0;
      for (const tx of result.coinTransactions) {
        if (props.grantedTransactions.includes(tx.transactionId)) continue;
        const pack = COIN_PACKS.find((p) => p.productId === tx.productId);
        if (pack) { props.onGrantCoins(pack.coins, tx.transactionId); grantedCoins += pack.coins; }
      }
      for (const tx of result.gemTransactions) {
        if (props.grantedTransactions.includes(tx.transactionId)) continue;
        const pack = GEM_PACKS.find((p) => p.productId === tx.productId);
        if (pack) { props.onGrantGems(pack.gems, tx.transactionId); grantedGems += pack.gems; }
      }
      if (result.unlockAll) props.onUnlockAll();
      if (result.adFree) props.onAdFree();
      if (result.unlockAll || result.adFree || grantedCoins > 0 || grantedGems > 0) {
        setMsg(`Restored!${result.unlockAll ? ' Unlock All is back.' : ''}${result.adFree ? ' Ad-Free is back.' : ''}${grantedCoins > 0 ? ` +${grantedCoins} coins from earlier purchases.` : ''}${grantedGems > 0 ? ` +${grantedGems} gems from earlier purchases.` : ''}`);
      } else {
        setMsg('Nothing to restore — no earlier purchases were found for this account.');
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Restore did not complete.');
    } finally {
      setBusy('');
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>👨‍👩‍👧 For Parents</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={props.onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {!passed ? (
          <View>
            <Text style={styles.body}>
              This area is for grown-ups only. Please answer the question to continue — kids, no peeking!
            </Text>
            <Text style={styles.question}>What is {gate.a} + {gate.b}?</Text>
            <TextInput
              style={styles.answerInput}
              placeholder="Your answer"
              placeholderTextColor="#94A3B8"
              value={answer}
              onChangeText={setAnswer}
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={checkGate}
            />
            {gateMsg ? <Text style={styles.error}>{gateMsg}</Text> : null}
            <TouchableOpacity style={styles.primaryBtn} onPress={checkGate}>
              <Text style={styles.primaryBtnText}>CONTINUE</Text>
            </TouchableOpacity>
            <Text style={styles.note}>Purchases are made by a parent, in the parent's account. Children cannot buy anything from the game itself.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.body}>Your coins: 🪙 {props.coins} • Gems: 💎 {props.gems}{props.unlockAll ? ' • ✅ Unlock All owned' : ''}{props.adFree ? ' • ✅ Ad-Free' : ''}</Text>

            {!configured ? (
              <View style={styles.notSetup}>
                <Text style={styles.notSetupTitle}>⚠️ Not set up yet — purchases are not available</Text>
                <Text style={styles.body}>
                  The coin packs, gem packs, Unlock All and Ad-Free below are not buyable yet. The developer still has to create the
                  products in RevenueCat and Google Play (see the README, "Parents Shop / RevenueCat setup").
                  Nothing here can charge you, and no coins or unlocks are granted from this screen until that setup is done.
                </Text>
              </View>
            ) : !loaded ? (
              <Text style={styles.body}>Loading products…</Text>
            ) : packages.length === 0 ? (
              <Text style={styles.body}>No products are available in the RevenueCat offering yet. Check the products in the RevenueCat dashboard.</Text>
            ) : null}

            <Text style={styles.section}>🪙 Coin Packs</Text>
            {COIN_PACKS.map((pack) => {
              const price = priceFor(pack.productId);
              return (
                <View key={pack.productId} style={styles.packRow}>
                  <Text style={styles.packName}>🪙 {pack.label}</Text>
                  <Text style={styles.packPrice}>{configured && loaded && price ? price : '—'}</Text>
                  <TouchableOpacity
                    style={[styles.buyBtn, (!configured || busy.length > 0) && styles.buyBtnDisabled]}
                    disabled={!configured || busy.length > 0}
                    onPress={() => void buyCoins(pack.productId, pack.coins)}
                  >
                    <Text style={styles.buyBtnText}>{busy === pack.productId ? '…' : 'BUY'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            <Text style={styles.section}>💎 Gem Packs</Text>
            {GEM_PACKS.map((pack) => {
              const price = priceFor(pack.productId);
              return (
                <View key={pack.productId} style={styles.packRow}>
                  <Text style={styles.packName}>💎 {pack.label}</Text>
                  <Text style={styles.packPrice}>{configured && loaded && price ? price : '—'}</Text>
                  <TouchableOpacity
                    style={[styles.buyBtn, (!configured || busy.length > 0) && styles.buyBtnDisabled]}
                    disabled={!configured || busy.length > 0}
                    onPress={() => void buyGems(pack.productId)}
                  >
                    <Text style={styles.buyBtnText}>{busy === pack.productId ? '…' : 'BUY'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            <Text style={styles.section}>🏆 Unlock All — one-time purchase</Text>
            <View style={styles.packRow}>
              <Text style={styles.packName}>Every car, paint, map, driver + max upgrades</Text>
              <Text style={styles.packPrice}>{configured && loaded ? priceFor(UNLOCK_ALL_PRODUCT_ID) || '—' : '—'}</Text>
              <TouchableOpacity
                style={[styles.buyBtn, styles.unlockBtn, (!configured || props.unlockAll || busy.length > 0) && styles.buyBtnDisabled]}
                disabled={!configured || props.unlockAll || busy.length > 0}
                onPress={() => void buyUnlockAll()}
              >
                <Text style={styles.buyBtnText}>{props.unlockAll ? 'OWNED' : busy === UNLOCK_ALL_PRODUCT_ID ? '…' : 'BUY'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.section}>📺 Ad-Free — one-time purchase</Text>
            <View style={styles.packRow}>
              <Text style={styles.packName}>No rewarded-ad prompts, ever</Text>
              <Text style={styles.packPrice}>{configured && loaded ? priceFor(AD_FREE_PRODUCT_ID) || '—' : '—'}</Text>
              <TouchableOpacity
                style={[styles.buyBtn, styles.unlockBtn, (!configured || props.adFree || busy.length > 0) && styles.buyBtnDisabled]}
                disabled={!configured || props.adFree || busy.length > 0}
                onPress={() => void buyAdFree()}
              >
                <Text style={styles.buyBtnText}>{props.adFree ? 'OWNED' : busy === AD_FREE_PRODUCT_ID ? '…' : 'BUY'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.restoreBtn, (!configured || busy.length > 0) && styles.buyBtnDisabled]}
              disabled={!configured || busy.length > 0}
              onPress={() => void restore()}
            >
              <Text style={styles.restoreText}>{busy === 'restore' ? 'Restoring…' : '↩️  Restore Purchases'}</Text>
            </TouchableOpacity>

            {msg ? <Text style={styles.msg}>{msg}</Text> : null}
            <Text style={styles.note}>
              Coin packs are spent in the in-game Shop (cars, paints, maps, upgrades). Unlock All is a single
              one-time purchase. All purchases are handled by Google Play through RevenueCat.
            </Text>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Sleek dark theme, matching the rest of the game.
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3,4,7,0.7)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  card: { width: '82%', maxHeight: '92%', backgroundColor: '#161B28', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 20, padding: 16, elevation: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '900', fontStyle: 'italic', color: '#F2F4F8' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 16, fontWeight: '900', color: '#C7CEDE' },
  body: { fontSize: 14, fontWeight: '700', color: '#C7CEDE', marginTop: 8, lineHeight: 20 },
  question: { fontSize: 22, fontWeight: '900', color: '#F2F4F8', textAlign: 'center', marginTop: 14 },
  answerInput: { borderWidth: 2, borderColor: '#FFC531', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, fontSize: 18, fontWeight: '800', color: '#F2F4F8', backgroundColor: 'rgba(10,12,20,0.62)', marginTop: 10, textAlign: 'center' },
  error: { color: '#FF7A70', fontWeight: '800', textAlign: 'center', marginTop: 8 },
  primaryBtn: { backgroundColor: '#FF6A00', borderBottomWidth: 3, borderBottomColor: '#8F3200', borderRadius: 14, paddingVertical: 12, marginTop: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  note: { fontSize: 12, fontWeight: '700', color: '#9AA3B5', marginTop: 10, lineHeight: 17 },
  notSetup: { backgroundColor: 'rgba(255,197,49,0.14)', borderWidth: 1, borderColor: 'rgba(255,197,49,0.4)', borderRadius: 12, padding: 10, marginTop: 10 },
  notSetupTitle: { fontSize: 14, fontWeight: '900', color: '#FFC531' },
  section: { fontSize: 16, fontWeight: '900', fontStyle: 'italic', color: '#F2F4F8', marginTop: 14, marginBottom: 6 },
  packRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, marginBottom: 6 },
  packName: { flex: 1, fontWeight: '800', color: '#F2F4F8', fontSize: 14 },
  packPrice: { fontWeight: '900', color: '#FFC531', fontSize: 14 },
  buyBtn: { backgroundColor: '#FF6A00', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  unlockBtn: { backgroundColor: '#F59E0B' },
  buyBtnDisabled: { backgroundColor: '#475569' },
  buyBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  restoreBtn: { backgroundColor: 'rgba(99,102,241,0.2)', borderWidth: 1, borderColor: '#6366F1', borderRadius: 12, paddingVertical: 10, marginTop: 8, alignItems: 'center' },
  restoreText: { fontWeight: '900', color: '#A5B4FC', fontSize: 14 },
  msg: { fontWeight: '800', color: '#37D67A', marginTop: 10, textAlign: 'center' },
});

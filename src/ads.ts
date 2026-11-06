// Rewarded ads — the ONLY ads in this kids game. No banners, no
// interstitials, ever. Rewarded video is offered ONLY from explicit
// buttons: (a) Results "Double my coins", (b) failed race "Try
// again (+1 heart)", (c) Shop trial of a locked premium car/paint
// for 1 race, (d) Shop "Earn 10 Gems". When Ad-Free is owned, no
// rewarded-ad prompt is shown at all.
//
// HONESTY / POLICY GATES — do not skip these:
// - This is a 3–8 kids app. AdMob needs a development/production
//   build — it is NOT available in Expo Go, so the SDK is loaded
//   lazily (dynamic import, Rasoi utils/admob.ts pattern) and the
//   Expo Go path never touches it.
// - The AdMob app ID and rewarded unit ID come ONLY from env
//   (EXPO_PUBLIC_ADMOB_APP_ID / EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID)
//   — never hardcoded here. If either is missing/empty, ads are
//   unconfigured: every rewarded button must say "Ads are not set
//   up yet" and grant NOTHING. No fake ad, no coins/gems granted
//   without a real completed-ad (earned-reward) callback.
// - A real ad must also be Families-compliant before publishing
//   with ads on (see README "Ads / AdMob setup") — Play Families
//   rules restrict ads in kids apps, and that confirmation is
//   Dhruv's step, not something code can claim.

import Constants from 'expo-constants';

declare const process:
  | { env: Record<string, string | undefined> }
  | undefined;

function envVar(name: string): string {
  try {
    if (typeof process !== 'undefined' && process?.env) {
      return process.env[name] ?? '';
    }
  } catch {
    return '';
  }
  return '';
}

/** True when running inside Expo Go (prebuilt binary, no AdMob native module). */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}

const appId = envVar('EXPO_PUBLIC_ADMOB_APP_ID').trim();
const rewardedUnitId = envVar('EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID').trim();

/** True only when both AdMob ids are set. False = unconfigured (the state right now). */
export const isAdsConfigured = appId.length > 0 && rewardedUnitId.length > 0;

export type AdPurpose = 'double-coins' | 'retry-heart' | 'trial' | 'earn-gems';
export type AdResult = 'earned' | 'not-configured' | 'cancelled' | 'failed';

let adsModule: any = null;

async function loadAdsModule(): Promise<any> {
  if (adsModule) return adsModule;
  // Dynamic import by runtime string so the bundle never hard-requires
  // the native SDK on the Expo Go / unconfigured path.
  const moduleName = 'react-native-google-mobile-ads';
  const mod = await import(moduleName);
  adsModule = mod;
  return mod;
}

/**
 * Show one rewarded video. Resolves 'earned' ONLY when the SDK
 * reports the user earned the reward (watched the ad through).
 * 'not-configured' when AdMob is not set up / Expo Go / SDK missing
 * — the caller must grant NOTHING in that case. 'cancelled' when
 * the ad was dismissed early, 'failed' when it could not load/show.
 */
export async function showRewardedAd(_purpose: AdPurpose): Promise<AdResult> {
  if (!isAdsConfigured || isExpoGo()) return 'not-configured';
  try {
    const mod = await loadAdsModule();
    const { RewardedAd, RewardedAdEventType, AdEventType } = mod;
    if (!RewardedAd || typeof RewardedAd.createForAdRequest !== 'function') return 'not-configured';
    const ad = RewardedAd.createForAdRequest(rewardedUnitId);
    return await new Promise<AdResult>((resolve) => {
      let settled = false;
      const done = (r: AdResult) => {
        if (!settled) { settled = true; resolve(r); }
      };
      const earnedUnsub = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        done('earned');
      });
      const closedUnsub = ad.addAdEventListener(AdEventType.CLOSED, () => {
        earnedUnsub();
        closedUnsub();
        done('cancelled');
      });
      const errorUnsub = ad.addAdEventListener(AdEventType.ERROR, () => {
        earnedUnsub();
        closedUnsub();
        errorUnsub();
        done('failed');
      });
      ad.load();
      // Show once loaded; if it never loads, the error listener settles it.
      const loadedUnsub = ad.addAdEventListener(AdEventType.LOADED, () => {
        loadedUnsub();
        ad.show();
      });
      // Safety net: never hang the game waiting on an ad.
      setTimeout(() => done('failed'), 60000);
    });
  } catch {
    return 'not-configured';
  }
}

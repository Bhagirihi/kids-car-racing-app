// RevenueCat payments — the ONLY place the app talks to RevenueCat.
// Everything else reads plain objects from App state, so screens
// never import react-native-purchases and never see the SDK.
//
// Configuration comes ONLY from one environment variable — never
// hardcoded, never invented, never pasted here:
//   EXPO_PUBLIC_REVENUECAT_API_KEY   (Google Play public SDK key)
// Set it in a local .env file for `expo start` (see .env.example),
// or as an EAS secret for builds. EXPO_PUBLIC variables are inlined
// at build time, so changing the key requires restarting the dev
// server / rebuilding. If the variable is missing or empty, there is
// NO client: `isRevenueCatConfigured` is false, and the Parents Shop
// must say plainly "Not set up yet — purchases are not available"
// and every buy button must do nothing and charge nothing. The coin
// shop (earned coins) works fully without RevenueCat.
//
// ENTITLEMENT / PRODUCT IDS: single correction point, below. They
// MUST match the identifiers created in the RevenueCat dashboard
// exactly; if the dashboard uses different names, change these
// constants and nothing else. The app never claims Unlock All is
// owned unless that entitlement is active in a CustomerInfo returned
// by RevenueCat. Coin packs are consumables (no entitlement): coins
// are granted only after purchasePackage returns without error AND
// the purchased product id matches the pack — and the App records
// the transaction id so a purchase is never double-granted.
//
// NATIVE MODULE NOTE: react-native-purchases is a native module and
// is NOT included in Expo Go, so it is loaded LAZILY (dynamic
// import) only on the configured path. The unconfigured path never
// touches the module at all, so the app still runs in Expo Go.
// The configured path (real offerings / purchase / restore) needs a
// development build — it cannot be tested in Expo Go. If the native
// module is unavailable, every function here throws a truthful
// "development build required" error instead of reporting a fake
// success or a fake purchase.
//
// PRICES: prices are NEVER hardcoded here. The only prices the UI
// ever shows are `priceString` values returned by RevenueCat for
// the current offering's packages. If RevenueCat returns no
// offering or no packages, the UI shows "Not set up yet" and never
// invents a price. No ₹ / $ amount appears anywhere in the
// purchase flow in code.

declare const process:
  | { env: Record<string, string | undefined> }
  | undefined;

function envVar(name: string): string {
  try {
    if (typeof process !== 'undefined' && process?.env) {
      return process.env[name] ?? '';
    }
  } catch {
    // Never crash on env access — missing config just means unconfigured.
  }
  return '';
}

// Single place to correct the entitlement / product ids (see above).
export const UNLOCK_ALL_ENTITLEMENT_ID = 'unlock_all';
export const UNLOCK_ALL_PRODUCT_ID = 'car_racing_unlock_all';
export const AD_FREE_ENTITLEMENT_ID = 'ad_free';
export const AD_FREE_PRODUCT_ID = 'car_racing_ad_free';
export const OFFERING_ID = 'default';

export interface CoinPack {
  productId: string;
  coins: number;
  label: string;
}

/** Coin packs sold to parents. Coins are the in-game currency. */
export const COIN_PACKS: CoinPack[] = [
  { productId: 'car_racing_coins_500', coins: 500, label: '500 Coins' },
  { productId: 'car_racing_coins_1500', coins: 1500, label: '1,500 Coins' },
  { productId: 'car_racing_coins_5000', coins: 5000, label: '5,000 Coins' },
];

export interface GemPack {
  productId: string;
  gems: number;
  label: string;
}

/** Gem packs sold to parents. Gems are the scarce hard currency. */
export const GEM_PACKS: GemPack[] = [
  { productId: 'car_racing_gems_50', gems: 50, label: '50 Gems' },
  { productId: 'car_racing_gems_150', gems: 150, label: '150 Gems' },
  { productId: 'car_racing_gems_500', gems: 500, label: '500 Gems' },
];

export interface RcPackage {
  /** RevenueCat package identifier (e.g. $rc_... or a custom id). */
  identifier: string;
  /** Store product id (e.g. car_racing_coins_500). */
  productId: string;
  title: string;
  description: string;
  /** Price as RevenueCat reports it (e.g. "₹99.00") — never hardcoded. */
  priceString: string;
}

const apiKey = envVar('EXPO_PUBLIC_REVENUECAT_API_KEY').trim();

export const isRevenueCatConfigured = apiKey.length > 0;

let configured = false;
let purchasesModule: any = null;

// Load the native SDK lazily (see the native-module note above) and
// configure it once. Throws a truthful error if the module is
// unavailable instead of ever faking a configured state.
async function loadPurchases(): Promise<any> {
  if (!isRevenueCatConfigured) {
    throw new Error('RevenueCat is not set up yet — purchases are not available.');
  }
  if (!purchasesModule) {
    try {
      const mod = await import('react-native-purchases');
      purchasesModule = mod.default ?? mod;
    } catch {
      throw new Error('RevenueCat needs a development build — it is not available in Expo Go. Install a dev build of this code, then try again.');
    }
  }
  if (!purchasesModule || typeof purchasesModule.configure !== 'function') {
    throw new Error('RevenueCat needs a development build — it is not available in Expo Go. Install a dev build of this code, then try again.');
  }
  if (!configured) {
    purchasesModule.configure({ apiKey });
    configured = true;
  }
  return purchasesModule;
}

function isUnlockAllCustomerInfo(customerInfo: any): boolean {
  if (!customerInfo) return false;
  const active = customerInfo.entitlements?.active;
  if (!active) return false;
  return Boolean(active[UNLOCK_ALL_ENTITLEMENT_ID]);
}

function toRcPackage(pkg: any): RcPackage {
  const product = pkg?.product ?? {};
  return {
    identifier: String(pkg?.identifier ?? product?.identifier ?? ''),
    productId: String(product?.identifier ?? ''),
    title: String(product?.title ?? pkg?.identifier ?? ''),
    description: String(product?.description ?? ''),
    priceString: String(product?.priceString ?? ''),
  };
}

// Fetch the current offering's packages (prices come from RevenueCat
// only). Returns [] when there is no current offering or no packages
// — callers must show "Not set up yet", never invent prices.
export async function fetchOfferings(): Promise<RcPackage[]> {
  const Purchases = await loadPurchases();
  const offerings = await Purchases.getOfferings();
  const packages = offerings?.current?.availablePackages ?? [];
  return packages.map(toRcPackage).filter((p: RcPackage) => p.identifier.length > 0);
}

async function findPackageByProduct(productId: string): Promise<any> {
  const Purchases = await loadPurchases();
  const offerings = await Purchases.getOfferings();
  const packages = offerings?.current?.availablePackages ?? [];
  const pkg = packages.find((p: any) => String(p?.product?.identifier ?? '') === productId);
  if (!pkg) {
    throw new Error('That product is not available in the current RevenueCat offering. Check the products in the RevenueCat dashboard, then try again.');
  }
  return { Purchases, pkg };
}

/** Best-effort transaction id for a purchased product, from the
    customer's non-subscription transactions (used to dedupe grants).
    Returns '' when RevenueCat reports none — the caller then falls
    back to a unique grant key, and the purchase itself (which
    succeeded without error) is still the authority. */
function transactionIdFor(customerInfo: any, productId: string, alreadyGranted: string[]): string {
  const txs = customerInfo?.nonSubscriptionTransactions ?? [];
  const match = [...txs].reverse().find(
    (t: any) => String(t?.productIdentifier ?? '') === productId && !alreadyGranted.includes(String(t?.transactionIdentifier ?? '')),
  );
  return match ? String(match.transactionIdentifier ?? '') : '';
}

export interface CoinGrant {
  /** Coins to add — only when `granted` is true. */
  coins: number;
  /** Transaction id to record in the profile so this purchase is never granted twice. */
  transactionId: string;
  granted: boolean;
}

export interface GemGrant {
  /** Gems to add — only when `granted` is true. */
  gems: number;
  /** Transaction id to record in the profile so this purchase is never granted twice. */
  transactionId: string;
  granted: boolean;
}

// Shared consumable purchase: succeeds only when purchasePackage
// returns without error and the purchased product id matches.
// A user-cancelled purchase or any other error is thrown so the UI
// can surface it truthfully — it is never reported as success.
async function purchaseConsumable(productId: string, alreadyGranted: string[]): Promise<string> {
  const { Purchases, pkg } = await findPackageByProduct(productId);
  const result = await Purchases.purchasePackage(pkg);
  const purchasedProductId = String(result?.productIdentifier ?? result?.product?.identifier ?? productId);
  if (purchasedProductId !== productId) {
    throw new Error('The purchase did not match the product. Nothing was granted.');
  }
  const customerInfo = result?.customerInfo ?? (await Purchases.getCustomerInfo().catch(() => null));
  const txId = transactionIdFor(customerInfo, productId, alreadyGranted);
  return txId || `rc-${productId}-${Date.now()}`;
}

// Buy one coin pack. Coins are granted ONLY when purchasePackage
// returns without error and the purchased product id matches the
// pack. A user-cancelled purchase or any other error is thrown so
// the UI can surface it truthfully — it is never reported as success.
export async function purchaseCoinPack(productId: string, alreadyGranted: string[]): Promise<CoinGrant> {
  const pack = COIN_PACKS.find((p) => p.productId === productId);
  if (!pack) throw new Error('Unknown coin pack.');
  const transactionId = await purchaseConsumable(productId, alreadyGranted);
  return { coins: pack.coins, transactionId, granted: true };
}

// Buy one gem pack. Same honesty rules as coin packs.
export async function purchaseGemPack(productId: string, alreadyGranted: string[]): Promise<GemGrant> {
  const pack = GEM_PACKS.find((p) => p.productId === productId);
  if (!pack) throw new Error('Unknown gem pack.');
  const transactionId = await purchaseConsumable(productId, alreadyGranted);
  return { gems: pack.gems, transactionId, granted: true };
}

// Buy Unlock All (one-time). Returns true ONLY when the resulting
// CustomerInfo has the unlock_all entitlement active.
export async function purchaseUnlockAll(): Promise<boolean> {
  const { Purchases, pkg } = await findPackageByProduct(UNLOCK_ALL_PRODUCT_ID);
  const result = await Purchases.purchasePackage(pkg);
  const customerInfo = result?.customerInfo ?? result;
  return isUnlockAllCustomerInfo(customerInfo);
}

// Buy Ad-Free (one-time). Returns true ONLY when the resulting
// CustomerInfo has the ad_free entitlement active. Ad-Free hides
// every rewarded-ad prompt; it does not unlock cars/maps.
export async function purchaseAdFree(): Promise<boolean> {
  const { Purchases, pkg } = await findPackageByProduct(AD_FREE_PRODUCT_ID);
  const result = await Purchases.purchasePackage(pkg);
  const customerInfo = result?.customerInfo ?? result;
  const active = customerInfo?.entitlements?.active;
  return Boolean(active?.[AD_FREE_ENTITLEMENT_ID]);
}

// True only when the unlock_all entitlement is active in RevenueCat's
// CustomerInfo. Any error is thrown so callers can surface it — it
// is never swallowed into a fake "not owned" or a fake "owned".
export async function checkUnlockAll(): Promise<boolean> {
  const Purchases = await loadPurchases();
  const customerInfo = await Purchases.getCustomerInfo();
  return isUnlockAllCustomerInfo(customerInfo);
}

export interface RestoreResult {
  unlockAll: boolean;
  adFree: boolean;
  /** Coin-pack transactions found on restore (product + tx id), so
      the App can grant coins for purchases made on another device
      that were never granted here — deduped by transaction id. */
  coinTransactions: { productId: string; transactionId: string }[];
  /** Same for gem packs. */
  gemTransactions: { productId: string; transactionId: string }[];
}

// Restore previous purchases. Returns whether Unlock All / Ad-Free
// are active plus any coin/gem-pack transactions to grant. "Nothing
// to restore" is not an error — the UI must say so, not claim success.
export async function restorePurchases(): Promise<RestoreResult> {
  const Purchases = await loadPurchases();
  const customerInfo = await Purchases.restorePurchases();
  const txs = customerInfo?.nonSubscriptionTransactions ?? [];
  const coinTransactions = txs
    .filter((t: any) => COIN_PACKS.some((p) => p.productId === String(t?.productIdentifier ?? '')))
    .map((t: any) => ({
      productId: String(t?.productIdentifier ?? ''),
      transactionId: String(t?.transactionIdentifier ?? ''),
    }))
    .filter((t: { transactionId: string }) => t.transactionId.length > 0);
  const gemTransactions = txs
    .filter((t: any) => GEM_PACKS.some((p) => p.productId === String(t?.productIdentifier ?? '')))
    .map((t: any) => ({
      productId: String(t?.productIdentifier ?? ''),
      transactionId: String(t?.transactionIdentifier ?? ''),
    }))
    .filter((t: { transactionId: string }) => t.transactionId.length > 0);
  const active = customerInfo?.entitlements?.active;
  return {
    unlockAll: isUnlockAllCustomerInfo(customerInfo),
    adFree: Boolean(active?.[AD_FREE_ENTITLEMENT_ID]),
    coinTransactions,
    gemTransactions,
  };
}

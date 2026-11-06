# Kids Car Racing 🏎️

Fun-only racing game for children aged 3–8. **No education, no
accounts, no network calls** — fully offline, parent-safe. No banner
or interstitial ads, ever; rewarded video only, and only when AdMob
is set up (it is not yet — see "Ads / AdMob setup").

## Play — LANDSCAPE ONLY

Hold the phone sideways. The app locks to landscape
(`app.json` orientation + `expo-screen-orientation` lock in
`App.tsx`) and every screen is laid out wide: game-menu home
(title + PLAY on the left, drivers/levels/garage rows on the
right), full-screen rear-view race, landscape trophy screen.
Safe-area insets keep the HUD and thumb buttons clear of the
notch and gesture bar.


- **Home page** — type your driver name, see points / trophies / skins.
- **Drivers** — 4 original cartoon animal drivers, drawn in code
  (no images copied from anywhere):
  - 🐶 **Rocky the Police Dog** — blue police car 🚓, FREE, the default
    — "Beep beep, let's go!"
  - 🦁 **Leo the Firefighter Lion** — red fire truck 🚒, 150 points
    — "Woo-woo! Rescue time!"
  - 🐰 **Bella the Doctor Bunny** — white ambulance 🚑, 200 points
    — "Hop to it — let's help!"
  - 🦆 **Dash the Speedy Duck Racer** — yellow duck car 🦆, 300 points
    — "Quack quack, zoom zoom!"
  Tapping a card picks that driver + their vehicle for the race.
  Locked drivers are bought with points (like skins) and the choice
  is saved with AsyncStorage.
- **2D / 3D view** — a 2D | 3D toggle on the home page switches the
  whole game between two looks, and the choice is saved:
  - **2D** — flat cartoon front view: flat colours, simple shapes,
    no shadows (like the "Kids games for boys" banner).
  - **3D** — glossy, angled view: gradient faces, highlight gloss,
    bigger eyes with sparkle, pink cheeks, soft drop shadows, bigger
    wheels with hubcaps and a slight tilt (like the police-dog
    close-up). The toggle changes the driver cards, the driver
    peeking out of the car in the race, the car itself, and the face
    on the results screen.
- **10 maps** — Sunny Park, Beach Road, City Zoom, Rainbow Hills,
  Mountain Road, Jungle Safari, Snow Valley, Desert Dash, Candy Land,
  Night City. Each has its own scenery, star goal and speed.
  Win level N to unlock level N+1, or buy a later map with coins
  (200–1,000) or gems (20–50, maps 6–10).
- **Difficulty** — Low (5 hearts, slow traffic), Mid (4 hearts),
  High (3 hearts, fast traffic).
- **Coins & Gems** — the two currencies, shown on Home and in the Shop.
  Coins: a star is 10 coins, plus a win bonus that grows per
  level/difficulty, plus +50 coins once a day (first Home open).
  Gems 💎 are scarce: +5 for the first win of a map, +10 for a
  perfect race (won with no hearts lost), +5 for the first win of
  the day, +10 for a rewarded ad, or Gem packs in the Parents Shop.
  Coins, gems, trophies, unlocked levels and everything bought are
  saved with AsyncStorage, so they survive closing the app — and
  existing players keep every point they earned: points ARE coins.
- **Shop (Garage)** — tabs: Cars, Paint, Upgrades, Skins, Maps, Drivers.
  Locked items cannot be raced until bought or unlocked. Not enough
  coins shows "Not enough coins — play more races or ask a parent."
  - **Cars** — 12 vehicles: Red Car, Auto Rickshaw, Blue Bus, Race Car
    (400 🪙 / 25 💎), Taxi, Ice Cream Truck (500 / 30 💎), School Bus
    (600 / 35 💎), Monster Truck (800 / 40 💎), plus the drivers'
    Police Car, Fire Truck, Ambulance, Duck Car (come with their driver).
    Each car has Speed / Handling stats (1–5); Speed gives a real
    top-speed bonus in the race.
  - **Paint** — 20 paints, separate from skins: buy once, repaint ANY
    car you own (the equipped paint colours the car in the race).
    Premium paints (Golden, Silver, Midnight, Rainbow, Neon) also
    have a gem price (20–25 💎).
  - **Upgrades** — Engine (Top Speed), Turbo Boost (Acceleration),
    Extra Heart, Star Magnet — level by level for coins, costs rising
    per level. Each upgrade really changes the race (Engine +4% top
    speed/level, Turbo +6% BOOST power/level, Extra Heart +1 starting
    heart/level, Magnet pulls stars toward the car). The top tier of
    each can be bought instantly with gems (30–40 💎) instead of grinding.
  - **Skins** — 12 paint skins in the 12-colour striped palette
    (Ruby Red, Sunny Yellow, Ocean Blue, Lime, Mint, Snow White,
    Bubblegum Pink, Orange Blaze, Midnight Black, Silver Star,
    Golden Cup, Rainbow Star), bought with coins and equipped.
    A skin is a performance kit: its Speed stat still applies in the race.
  - **Maps / Drivers** — buy locked maps and drivers for coins (or
    gems for premium maps) right in the Shop.
  - **Garage trial** — on a locked premium car/paint, "TRY 1 RACE"
    grants it for the next race only, for 5 gems or one rewarded ad.
    It reverts after that race, win or lose.
- **Rewarded ads only — no banners, no interstitials** (`src/ads.ts`).
  Offered only from explicit buttons: Results "📺 Double Coins"
  (coins x2 after a win), failed race "📺 Try Again +1 ❤️", Shop
  trial for 1 race, Shop "📺 Earn 10 💎 Gems". Nothing is granted
  without a real completed-ad callback. Ad-Free owners see no
  rewarded-ad prompt at all. **Ads are NOT set up yet** — see
  "Ads / AdMob setup" below.
- **For Parents** — a small "👨‍👩‍👧 For Parents" button on Home, behind
  a maths-question parent gate (kids cannot reach any buy button
  without answering it). Behind the gate: coin packs, gem packs,
  one-time Unlock All (every car, paint, map, driver + max upgrades),
  one-time Ad-Free, and Restore Purchases. **Purchases are NOT set
  up yet** — see "Parents Shop / RevenueCat setup" below. The coin
  shop (earned coins/gems) works fully without RevenueCat.
- **Race (rear view)** — landscape, full-screen: your car seen from
  behind at bottom-centre, road vanishing to the horizon with
  level scenery (trees/hills, city buildings…), cars/stars growing
  as they come down the road. Game HUD: position (10TH → 1ST),
  LAP 1/3, timer, big MPH + speed bar, and a progress/minimap bar.
  Left thumb joystick (◀ ▶) + right horn / **hold-to-BOOST 🚀**
  (+30% speed while held) / pause buttons, swipe steering too.
  Collect stars to win, dodge cones / puddles / slow cars (each
  costs a heart — gentle, no harsh fail), balloon bonuses, 3-2-1
  countdown, trophy results screen with top speed and race time.
- **Immersive mode** — the moment a race starts, the Android status
  bar AND the navigation bar (footer / gesture bar) hide, so the
  road fills the whole screen edge-to-edge with no app chrome.
  Done in code (`src/immersive.ts` + `expo-navigation-bar`:
  `NavigationBar.setHidden(true)` — the SDK 58 API; there is no
  `setBehaviorAsync` in this version — plus `<StatusBar hidden>` in
  `App.tsx` / `RaceScreen.tsx`). The
  bars come back when the race ends (results), when you pause
  (pause button stays in the HUD), or when you go Home. The HUD
  uses safe-area insets only for padding — the road and scenery
  still bleed to the edges. On Home / Results the status bar is
  visible as normal.
- **Pacing** — traffic moves at road speed, a new car every
  ~1–2 s (Low 2.0 s / Mid 1.5 s / High 1.05 s, faster on later
  levels), 2 cars already on the road at race start, 5 traffic colours.

## Music & sound — real, not fake

- `assets/music-loop.wav` — a cheerful 140 BPM loop generated
  programmatically (melody + bass + beat), played on a loop with
  `expo-audio`. Music toggle is on the home page and in the race HUD.
- `assets/sfx-*.wav` — horn / star / bump / win sounds, also
  generated, played with `expo-audio`. Sound toggle is separate.

## Run it

```bash
cd ~/workspace/kids-car-racing-app
npm install
npx expo start
```

Then scan the QR code with **Expo Go** on your Android phone
(same Wi-Fi as this machine). Or press `a` in the terminal to open
on a connected Android device/emulator.

## Tech

- Expo SDK 58, TypeScript, React 19 / React Native 0.88
  (versions matched to `~/workspace/shubh-muhurat-app/package.json`)
- `expo-linear-gradient`, `@react-native-async-storage/async-storage`,
  `expo-audio`, `expo-splash-screen`, `expo-status-bar`,
  `expo-screen-orientation` (landscape lock),
  `expo-navigation-bar` (hide the nav bar in immersive race mode),
  `react-native-purchases` (RevenueCat, lazy-loaded — Expo Go safe),
  `react-native-google-mobile-ads` (rewarded video only, lazy-loaded)
- Graphics are styled Views / LinearGradient / emoji only —
  no external images.

## Structure

```
App.tsx                    — Home → Race → Results state machine + profile, coin/gem economy, trials, ads, RevenueCat grants
src/types.ts               — Difficulty table, Profile (coins, gems, cars, paints, upgrades, trials), RaceResult
src/data/levels.ts         — 10 maps (scenery, star goal, speed, coin/gem unlock price)
src/data/drivers.ts        — 4 cartoon drivers (Rocky, Leo, Bella, Dash)
src/data/skins.ts          — 12 vehicles, 12 skins, 20 paints (coin/gem prices)
src/data/upgrades.ts       — Engine / Turbo / Extra Heart / Star Magnet (coin levels + gem instant max)
src/revenuecat.ts          — RevenueCat: coin/gem packs, Unlock All, Ad-Free, Restore (lazy native SDK, env key only)
src/ads.ts                 — Rewarded ads only, guarded: unconfigured/Expo Go = grants nothing
src/components/ParentsShop.tsx — parent-gated Parents Shop (maths gate, packs, Unlock All, Ad-Free, Restore)
src/storage.ts             — AsyncStorage profile persistence
src/immersive.ts           — hide/show Android status + nav bars
  (expo-navigation-bar) for immersive race mode
src/music.ts               — looping music player (expo-audio)
src/sfx.ts                 — horn / star / bump / win sounds
src/components/CarView.tsx — glossy car drawn with Views (2D / 3D modes;
  front, rear-view and striped top-down angles)
src/components/DriverFace.tsx — cartoon driver face, 2D flat / 3D glossy
src/screens/HomeScreen.tsx — landscape game menu: name, points, drivers + 2D/3D toggle, levels, difficulty, garage (12 skins + stat bars)
src/screens/RaceScreen.tsx — rear-view perspective race, game HUD (position/LAP/timer/MPH/progress), joystick + thumb buttons, traffic timer, collisions
src/screens/ResultsScreen.tsx — landscape trophy screen: driver + trophy left, stats + game buttons right
```

## Parents Shop / RevenueCat setup — REQUIRED before real money can flow

Real-money purchases do NOT work yet, by design. The Parents Shop
currently says "Not set up yet — purchases are not available" and
every buy button does nothing and charges nothing. Do these steps,
in order, before a parent can buy anything:

1. **RevenueCat project** — create a project at revenuecat.com for
   this app (package `com.bytesphere.kidscarracing`).
2. **Google Play products** — in Play Console, create these
   one-time / consumable products (exact ids — they are the single
   correction point in `src/revenuecat.ts`):
   - Coin packs (consumable): `car_racing_coins_500`,
     `car_racing_coins_1500`, `car_racing_coins_5000`
   - Gem packs (consumable): `car_racing_gems_50`,
     `car_racing_gems_150`, `car_racing_gems_500`
   - Unlock All (one-time): `car_racing_unlock_all`
   - Ad-Free (one-time): `car_racing_ad_free`
   Set your own prices in Play Console — the app NEVER hardcodes a
   price; it only shows RevenueCat's `priceString`.
3. **RevenueCat offering + entitlements** — create offering `default`
   containing all the products above, and entitlements `unlock_all`
   (linked to `car_racing_unlock_all`) and `ad_free` (linked to
   `car_racing_ad_free`).
4. **Play service account** — in Play Console → Setup → API access,
   create/grant a service account, download its JSON key, and upload
   it in RevenueCat (Android app settings) so RevenueCat can validate
   purchases server-side. Never paste the JSON in chat or commit it.
5. **API key** — copy the Google Play public SDK key from RevenueCat
   (Project Settings → API keys) into a local `.env` as
   `EXPO_PUBLIC_REVENUECAT_API_KEY=` (see `.env.example`), or as an
   EAS secret for builds. Never commit a real key.
6. **Dev build** — RevenueCat and AdMob are native modules: they do
   NOT work in Expo Go. Test purchases only in a development build
   (`npx expo run:android` / EAS dev build). Verify a purchase grants
   coins/gems exactly once (transaction ids are recorded in the
   profile so a purchase is never double-granted) and Restore
   brings back Unlock All / Ad-Free / ungranted packs.

## Ads / AdMob setup — REQUIRED before ads can earn

Rewarded ads do NOT work yet, by design. Every rewarded button
currently says "Ads are not set up yet" and grants nothing.

1. **AdMob app + rewarded unit** — in the AdMob console, create an
   app for this game and one Rewarded video ad unit. Copy the app ID
   and the rewarded unit ID into `.env` as
   `EXPO_PUBLIC_ADMOB_APP_ID=` and
   `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID=` (see `.env.example`).
   Never hardcode an id in code.
2. **Dev build** — AdMob is a native module (`react-native-google-mobile-ads`,
   already in `package.json`): it does NOT work in Expo Go. Test ads
   only in a development build, with test ads first.
3. **⚠️ Families compliance — confirm before publishing with ads on.**
   This is a 3–8 kids app, and Play Families rules restrict ads in
   kids apps. Use a Google-certified / Families-compliant rewarded
   setup (child-directed ad requests, no personalised ads, no
   inappropriate categories) and confirm the setup is
   Families-compliant before shipping a build with ads enabled.
   If in doubt, ship with ads off (leave the AdMob ids empty — the
   game works fully without them) and let parents buy coin/gem packs
   instead. Ad-Free owners never see a rewarded prompt.

## Not yet done

- Not tested on a real phone yet (Expo Go check pending — an
  emulator setup is in progress on the VM).
- No EAS build, no Play listing — local project only.
- RevenueCat products / offering / entitlements not created yet
  (see above) — real-money purchases cannot happen until they are.
- AdMob app / rewarded unit not created yet (see above) — rewarded
  ads grant nothing until they are.

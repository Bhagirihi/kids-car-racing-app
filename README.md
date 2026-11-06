# Kids Car Racing 🏎️

Fun-only racing game for children aged 3–8. **No education, no ads, no
accounts, no network calls** — fully offline, parent-safe.

## Play

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
- **5 levels** — Sunny Park, Beach Road, City Zoom, Rainbow Hills,
  Mountain Road. Each has its own scenery, star goal and speed.
  Win level N to unlock level N+1.
- **Difficulty** — Low (5 hearts, slow traffic), Mid (4 hearts),
  High (3 hearts, fast traffic).
- **Points** — a star is 10 points, plus a win bonus that grows per
  level/difficulty. Points, trophies, unlocked levels and skins are
  saved with AsyncStorage, so they survive closing the app.
- **Skins** — 6 paint skins bought with points and equipped.
  A skin paints your car; the driver picks the vehicle and the face.
  Vehicles: Red Car 🚗, Auto Rickshaw 🛺, Blue Bus 🚌, plus the
  drivers' Police Car 🚓, Fire Truck 🚒, Ambulance 🚑, Duck Car 🦆.
- **Race** — 3-lane scrolling road, big ◀ ▶ buttons + swipe steering,
  collect stars to win, dodge cones / puddles / slow cars (each costs
  a heart — gentle, no harsh fail), horn, balloon bonuses, pause,
  sound on/off, music on/off, 3-2-1 countdown, trophy results screen.
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
  `expo-audio`, `expo-splash-screen`, `expo-status-bar`
- Graphics are styled Views / LinearGradient / emoji only —
  no external images.

## Structure

```
App.tsx                    — Home → Race → Results state machine + profile
src/types.ts               — Difficulty table, Profile, RaceResult
src/data/levels.ts         — 5 levels (scenery, star goal, speed)
src/data/drivers.ts        — 4 cartoon drivers (Rocky, Leo, Bella, Dash)
src/data/skins.ts          — vehicles, 6 skins, 5 traffic colours
src/storage.ts             — AsyncStorage profile persistence
src/music.ts               — looping music player (expo-audio)
src/sfx.ts                 — horn / star / bump / win sounds
src/components/CarView.tsx — glossy car drawn with Views (2D / 3D modes)
src/components/DriverFace.tsx — cartoon driver face, 2D flat / 3D glossy
src/screens/HomeScreen.tsx — name, points, drivers + 2D/3D toggle, levels, difficulty, skins shop
src/screens/RaceScreen.tsx — game loop, traffic timer, collisions, HUD, driver in car
src/screens/ResultsScreen.tsx — personalised trophy screen with the driver
```

## Not yet done

- Not tested on a real phone yet (Expo Go check pending).
- No EAS build, no Play listing — local project only.

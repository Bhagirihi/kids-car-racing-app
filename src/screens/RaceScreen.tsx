// The race — LANDSCAPE, rear-view perspective.
// Player car seen from behind at bottom-centre, road vanishing to
// the horizon. This file was rebuilt for the "picture = play space"
// pass (39 visual issues): every number the player sees now comes
// from the same geometry the picture is drawn with.
//
// Rules that did NOT change: 3 lanes, stars to win, cones/puddles/
// slow cars cost a heart, fast traffic every ~1-2 s, 2 cars
// pre-spawned. Coins/gems/trials still flow through onFinish.
//
// What changed (issue numbers are the canvas table):
// - Spawns AT the horizon (never above it), scaling in from it.
// - Scenery on BOTH roadsides, scaling with depth, scrolling past.
// - Night City: moon + stars, no sun. Day maps: sun.
// - The ground moves: grass tufts + roadside items + dashes all
//   scroll with the same speed, and surge on boost.
// - Kerbs: ONE scrolling pattern, shrinking with depth, per-map colour.
// - Lane dashes lean with the lanes (rotated), not upright pasted bars.
// - Lanes use the INNER road width (kerb inset), so no lane sits on
//   the border. Edge/kerb colours are per map (visible on Snow).
// - Traffic is rear-view cars (CarView), same perspective as you.
// - 9 real rival racers on the road: position is how many you have
//   actually passed, not a star counter. Passing one shows its place.
// - Laps: a real checkered lap line sweeps down the road at each lap
//   boundary, and a finish line sweeps down before the trophy screen.
// - Hit test uses the car's ACTUAL eased x (the picture), and a hit
//   box derived from the rendered car size + lane width at this screen
//   size. Collection is centre-based. Spawns have a per-lane gap check.
// - Balloons float ABOVE the road. Controls sit above the collection
//   line, so no star slides unseen under a thumb.
// - A bump shakes the car (no fade-out) and the blink lasts the full
//   1.2 s of invincibility.
// - Speed ramps up from the start (no instant top speed); MPH, road,
//   scenery and dashes all surge together on boost.
// - Minimap/progress bar is race progress (distance + stars), labelled
//   as such — it reaches the flag exactly when you win.
// - Sunset fix (2026-11-06): the loop now syncs the HUD numbers AND
//   the rendered entities with the refs — before that, stars/traffic/
//   rivals were collected and hit while invisible on the road.
// - Steer buttons are big LEFT / RIGHT arrows with labels (not media
//   triangles). Dragging moves the car with the finger, continuously.
// - Handling (vehicle + skin) changes how fast the car slides between
//   lanes. Car, buttons and hit box all scale with screen width.
// - 2D/3D actually changes the race look: 3D is glossy (shine,
//   shadows, glowing sun/moon); 2D is flat (no gloss/shadows).
// - Road fix (2026-11-06, from Dhruv's phone photo): horizon 0.44H,
//   bottom width full screen, solid edge lines + long kerb blocks,
//   white lane dashes, passed cars culled at the player so nothing
//   piles at the bottom edge; player car 26% so it no longer
//   overlaps next-lane traffic. Immersive: bars hidden at the RACE!
//   tap + re-hidden every 700 ms while racing (see immersive.ts).

import React, { useEffect, useRef, useState } from 'react';
import {
  AppState, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setImmersiveMode } from '../immersive';
import { CarView, shapeForVehicle } from '../components/CarView';
import { DriverFace, DriverViewMode } from '../components/DriverFace';
import type { Driver } from '../data/drivers';
import { LEVELS, STAR_POINTS } from '../data/levels';
import { vehicleById, skinById } from '../data/skins';
import { music } from '../music';
import { playSfx } from '../sfx';
import { DIFFICULTIES, DifficultyId, RaceResult, UpgradesState } from '../types';

type Kind = 'star' | 'traffic' | 'cone' | 'puddle' | 'balloon' | 'rival' | 'lapline' | 'finishline';
interface Entity { id: number; kind: Kind; lane: number; y: number; color?: string; xShift?: number; rivalPlace?: number; vehicleId?: string }
interface SceneryItem { id: number; side: -1 | 1; y: number; emoji: string; offset: number }
interface GrassTuft { id: number; side: -1 | 1; y: number; offset: number }

const TICK_MS = 30;
const RIVALS_TOTAL = 9;

// Photo player-car sprites (assets/cars/): direct rear views with a
// transparent background. Only 'race' and 'police' have one — every
// other vehicle keeps the drawn rear CarView.
const RACE_PHOTOS: Record<string, any> = {
  race: require('../../assets/cars/race-red.png'),
  police: require('../../assets/cars/race-police.png'),
};

// Sunset sky backdrop (Sunny Park only): a band cropped from the
// mockup's own race photo — orange clouds, palm tops, street lamps.
// The scrolling road is still drawn by the engine below the horizon.
const SUNSET_SKY = require('../../assets/cars/race-sunset-sky.jpg');

function heartLine(n: number): string {
  if (n <= 0) return '💔';
  if (n <= 5) return '❤️'.repeat(n);
  return `❤️ ×${n}`;
}

/** Asphalt drawn as thin slices so the edges match the lane math on
 *  web and native. A single CSS border-trapezoid collapses into a
 *  triangle once the side borders are wider than the view.
 *  The slice borders are the ONE kerb pattern: per-map kerb/edge
 *  colours, alternating in 15px blocks that scroll with `offset`
 *  (the road scroll), and shrinking toward the horizon. */
// Darken a #rrggbb colour by factor f (0..1) — asphalt depth
// shading: the far road is a little darker than the near road.
const shadeHex = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
};

const RoadSurface = React.memo(function RoadSurface(props: {
  width: number;
  height: number;
  horizon: number;
  topW: number;
  botW: number;
  color: string;
  kerb: string;
  edge: string;
  offset: number;
}) {
  const roadH = Math.max(1, props.height - props.horizon);
  const stripH = 3;
  const count = Math.ceil(roadH / stripH);
  const halfAt = (y: number) => {
    const t = Math.max(0, Math.min(1, (y - props.horizon) / roadH));
    return props.topW / 2 + t * ((props.botW - props.topW) / 2);
  };
  // Solid edge lines: one continuous line per road edge, so the
  // edge reads as a line, not dotted pixels. A thin rotated strip
  // from horizon to bottom, inset 16px inside the kerb band.
  const edgeLen = Math.hypot(roadH, (props.botW - props.topW) / 2);
  const edgeDeg = (Math.atan2((props.botW - props.topW) / 2, roadH) * 180) / Math.PI;
  const edgeMidY = props.horizon + roadH / 2;
  const edgeMidHalf = (props.topW + props.botW) / 4; // half-width at mid-height
  const strips = [];
  for (let i = 0; i < count; i++) {
    const y = props.horizon + i * stripH;
    const half = halfAt(y + stripH);
    const t = Math.max(0, Math.min(1, (y - props.horizon) / roadH));
    // Kerb band: wide, LONG blocks (45px) alternating kerb colour /
    // white on BOTH sides — reads as kerbs, not dotted pixels. The
    // 45px block divides the 90px scroll wrap, so the pattern never
    // jumps when the offset wraps.
    const kerbW = Math.max(4, Math.round(t * 14));
    const kerbBlock = Math.floor((y + props.offset) / 45) % 2 === 0;
    const kerbColor = kerbBlock ? props.kerb : '#FFFFFF';
    strips.push(
      <View
        key={i}
        style={{
          position: 'absolute',
          top: y,
          left: props.width / 2 - half,
          width: half * 2,
          height: stripH + 1,
          backgroundColor: shadeHex(props.color, 0.78 + 0.22 * t),
          borderLeftWidth: kerbW,
          borderRightWidth: kerbW,
          borderLeftColor: kerbColor,
          borderRightColor: kerbColor,
        }}
      />,
    );
  }
  return (
    <>
      {strips}
      {[-1, 1].map((side) => (
        <View
          key={'edge' + side}
          style={{
            position: 'absolute',
            left: props.width / 2 + side * edgeMidHalf - side * 16 - 2.5,
            top: edgeMidY - edgeLen / 2,
            width: 5,
            height: edgeLen,
            backgroundColor: props.edge,
            borderRadius: 3,
            // Left edge leans top-right / bottom-left (clockwise,
            // +deg); right edge is the mirror. -side, not side.
            transform: [{ rotate: `${-side * edgeDeg}deg` }],
          }}
        />
      ))}
    </>
  );
});

interface Props {
  levelId: number;
  difficulty: DifficultyId;
  vehicleId: string;
  driver: Driver;
  viewMode: DriverViewMode;
  skinColor: string;
  skinAccent: string;
  skinId?: string;
  upgrades?: UpgradesState;
  vehicleSpeed?: number;
  extraHearts?: number;
  musicOn: boolean;
  sfxOn: boolean;
  onToggleMusic: () => void;
  onToggleSfx: () => void;
  onFinish: (r: RaceResult) => void;
  onQuit: () => void;
}

export function RaceScreen(props: Props) {
  const level = LEVELS.find((l) => l.id === props.levelId) ?? LEVELS[0];
  const diff = DIFFICULTIES[props.difficulty];
  const vehicle = vehicleById(props.vehicleId);
  const skin = skinById(props.skinId ?? 'ruby');
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const is3d = props.viewMode === '3d';

  // Perspective geometry (live window size, landscape).
  // Wide at the bottom, FULL width under the car, horizon low so
  // the sky is ~44% of the frame like the mockup — a long wide
  // road, not a narrow spike in the middle of the ground.
  const HORIZON = H * 0.44;
  const ROAD_TOP_W = Math.max(56, W * 0.2);
  const ROAD_BOT_W = W * 1.0;
  const ROAD_H = H - HORIZON;
  const KERB = Math.max(5, W * 0.008); // kerb inset: lanes sit inside the painted asphalt
  const roadHalfOuterAt = (y: number) => {
    const t = Math.max(0, Math.min(1, (y - HORIZON) / ROAD_H));
    return (ROAD_TOP_W / 2) + t * ((ROAD_BOT_W - ROAD_TOP_W) / 2);
  };
  const roadHalfAt = (y: number) => Math.max(6, roadHalfOuterAt(y) - KERB);
  const laneX = (lane: number, y: number) => W / 2 + (lane - 1) * (roadHalfAt(y) * 2 / 3);
  const depthScale = (y: number) => 0.35 + 0.65 * Math.max(0, Math.min(1, (y - HORIZON) / ROAD_H));
  // Car / buttons / hit box scale with screen width (no fixed 150px car).
  // Big player car, like the mockup: the red flame car fills ~26% of
  // the screen width — big, but with room for adjacent-lane traffic
  // beside it instead of overlapping it. The hit box is derived from
  // CAR_W, so it scales with the picture (no invisible hits).
  // (Was 30% / max 360: the car was so wide it overlapped traffic
  // in the next lane at the player's row — see the phone photo.)
  const CAR_W = Math.round(Math.max(160, Math.min(320, W * 0.26)));
  const CAR_H = Math.round(CAR_W * 0.78);
  const PLAYER_Y = Math.round(H - CAR_H - insets.bottom - 10);
  const BTN = Math.round(Math.max(56, Math.min(84, W * 0.085)));
  // Round joystick pad (mockup: dark glass circle + knob, bottom-left).
  const JOY = Math.round(Math.max(104, Math.min(148, W * 0.115)));
  // Lean of the converging lanes, in degrees — dashes rotate by it.
  const LEAN_DEG = (Math.atan2((ROAD_BOT_W - ROAD_TOP_W) / 2, ROAD_H) * 180) / Math.PI;

  // Handling is REAL: vehicle handling + skin handling decide how fast
  // the car picture slides between lanes (easing per tick).
  const totalHandling = vehicle.handling + (skin.handling - 3) * 0.5;
  const easePerTick = Math.max(0.07, Math.min(0.3, 0.08 + totalHandling * 0.022));

  const upgrades: UpgradesState = props.upgrades ?? { engine: 0, turbo: 0, heart: 0, magnet: 0 };
  const vehicleSpeed = props.vehicleSpeed ?? 3;
  // Upgrades that change the race (bought in the Shop):
  // Engine +4% top speed/level, Turbo +6% BOOST power/level,
  // Extra Heart +1 starting heart/level, Star Magnet pulls stars.
  // Turbo upgrade and the skin's Acceleration stat both make BOOST stronger.
  const boostMul = (1.3 + upgrades.turbo * 0.06) * (1 + (skin.acceleration - 3) * 0.04) * (props.driver.id === 'leo' ? 1.1 : 1); // Leo: Fire Boost

  const [goFlash, setGoFlash] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [lane, setLane] = useState(1);
  const [carLane, setCarLane] = useState(1);
  const [visualX, setVisualX] = useState(W / 2);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [scenery, setScenery] = useState<SceneryItem[]>([]);
  const [tufts, setTufts] = useState<GrassTuft[]>([]);
  const [stars, setStars] = useState(0);
  const [balloons, setBalloons] = useState(0);
  const [hearts, setHearts] = useState(diff.hearts + upgrades.heart + (props.extraHearts ?? 0));
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [roadOffset, setRoadOffset] = useState(0);
  const [flash, setFlash] = useState(false);
  const [toast, setToast] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [mph, setMph] = useState(0);
  const [boosting, setBoosting] = useState(false);
  const [rivalsPassed, setRivalsPassed] = useState(0);
  const [lap, setLap] = useState(1);
  const [distance, setDistance] = useState(0);
  const [knobX, setKnobX] = useState(0); // joystick knob, -1 (left) .. 1 (right)
  const boostRef = useRef(false);
  const setBoost = (on: boolean) => { boostRef.current = on; setBoosting(on); };

  const laneRef = useRef(1);
  const visualXRef = useRef(W / 2);
  const racingRef = useRef(false);
  const laneVisual = useRef(1);
  const carLaneRef = useRef(1);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entitiesRef = useRef<Entity[]>([]);
  const sceneryRef = useRef<SceneryItem[]>([]);
  const tuftsRef = useRef<GrassTuft[]>([]);
  const starsRef = useRef(0);
  const balloonsRef = useRef(0);
  const heartsRef = useRef(diff.hearts + upgrades.heart + (props.extraHearts ?? 0));
  const maxHeartsRef = useRef(diff.hearts + upgrades.heart + (props.extraHearts ?? 0));
  const scoreRef = useRef(0);
  const finishedRef = useRef(false);
  const finishingRef = useRef(false); // finish line is sweeping down
  const idRef = useRef(1);
  const invulnerableUntil = useRef(0);
  const shieldUsedRef = useRef(false); // Rocky: Shield — first hit is free
  const elapsedRef = useRef(0);
  const topSpeedRef = useRef(0);
  const distanceRef = useRef(0);
  const rivalsPassedRef = useRef(0);
  const lapRef = useRef(1);
  const speedRampRef = useRef(0); // 0 -> 1 over the first ~2.5 s: real acceleration
  const lastSpawnYRef = useRef<Record<number, number>>({ 0: 0, 1: 0, 2: 0 });
  const sceneryIdRef = useRef(1000);
  const flashUntilRef = useRef(0);

  const trafficTimer = useRef(-2000);
  const starTimer = useRef(400);
  const obstacleTimer = useRef(-1000);
  const balloonTimer = useRef(0);
  const sceneryTimer = useRef(0);

  const trafficInterval = diff.trafficIntervalMs * level.trafficFactor;
  const scrollSpeed = level.baseSpeed * diff.speedMul * (0.96 + skin.speed * 0.015) * (1 + upgrades.engine * 0.04) * (1 + (vehicleSpeed - 3) * 0.02) * (props.driver.id === 'dash' ? 1.05 : 1); // Dash: Top Speed
  const currentMph = Math.round((90 + scrollSpeed * 0.28 + skin.speed * 4) * (1 + upgrades.engine * 0.04));
  // Total race distance for the progress bar: 3 laps, one lap per
  // third of the star goal. Progress = max(star progress, distance
  // progress), so the car reaches the flag exactly when you win.
  const lapLength = Math.max(1, Math.round((level.starGoal * 500) / 3));
  const totalDistance = lapLength * 3;
  const raceProgress = Math.min(1, Math.max(stars / level.starGoal, distance / totalDistance));
  const position = RIVALS_TOTAL + 1 - rivalsPassed; // 10th -> 1st, by rivals actually passed
  const ordinal = (n: number) => (n === 1 ? '1ST' : n === 2 ? '2ND' : n === 3 ? '3RD' : `${n}TH`);
  // (Timer + score still run — elapsed/score feed the Results screen;
  // the race HUD itself shows place / lap / stars only, like the mockup.)

  useEffect(() => {
    void setImmersiveMode(!paused);
    return () => { void setImmersiveMode(false); };
  }, [paused]);

  // Re-hide the system bars while racing: with transient-by-swipe
  // behaviour an edge swipe (or Expo Go / an activity change) can
  // bring the bars back mid-race — re-apply every 700 ms until
  // paused or unmounted. Runs from mount (countdown included),
  // not just once. On pause the interval stops and the effect
  // above shows the bars again; on resume both re-hide them.
  useEffect(() => {
    if (paused) return;
    const iv = setInterval(() => { void setImmersiveMode(true); }, 700);
    return () => clearInterval(iv);
  }, [paused]);

  // If the app goes to the background and comes back while racing,
  // Android may re-show the bars — hide them again on foreground.
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && !pausedRef.current) void setImmersiveMode(true);
    });
    return () => sub.remove();
  }, []);

  // Keep the visual x centred when the window size changes.
  useEffect(() => { visualXRef.current = laneX(laneRef.current, PLAYER_Y); setVisualX(visualXRef.current); }, [W, H]); // eslint-disable-line react-hooks/exhaustive-deps

  const moveLane = (dir: -1 | 1) => {
    const next = Math.max(0, Math.min(2, laneRef.current + dir));
    laneRef.current = next;
    // While the race clock is stopped, snap the car. During the race it slides.
    if (!racingRef.current) {
      laneVisual.current = next;
      carLaneRef.current = next;
      setCarLane(next);
    }
  };

  // Dragging moves the car WITH the finger, continuously: the target
  // lane is a float from the finger's x on the road.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_e, g) => {
        const laneFloat = Math.max(0, Math.min(2, 1 + (g.moveX - W / 2) / Math.max(40, roadHalfAt(PLAYER_Y) * 2 / 3)));
        laneRef.current = Math.round(laneFloat);
        setLane(laneRef.current);
      },
      onPanResponderRelease: (_e, g) => {
        // Tap (no real drag): left half = one lane left, right half = one lane right.
        if (Math.abs(g.dx) < 12 && Math.abs(g.dy) < 12) moveLane(g.moveX < W / 2 ? -1 : 1);
      },
    }),
  ).current;

  // Round joystick (bottom-left): drag the knob left/right to steer —
  // wired to the same lane-change logic as tap-half / drag steering.
  // The knob steers once per crossing past the threshold, then resets
  // when it comes back to centre, so one drag can zig-zag lanes.
  const joyDirRef = useRef(0);
  const joyPadXRef = useRef(0);
  const joyPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { joyDirRef.current = 0; },
      onPanResponderMove: (_e, g) => {
        const nx = Math.max(-1, Math.min(1, g.dx / 44));
        setKnobX(nx);
        const dir = nx > 0.55 ? 1 : nx < -0.55 ? -1 : 0;
        if (dir !== 0 && joyDirRef.current !== dir) {
          joyDirRef.current = dir;
          moveLane(dir as -1 | 1);
        } else if (dir === 0) {
          joyDirRef.current = 0;
        }
      },
      onPanResponderRelease: (_e, g) => {
        setKnobX(0);
        joyDirRef.current = 0;
        // Tap (no real drag): left half of the pad = one lane left, right half = one lane right.
        if (Math.abs(g.dx) < 12 && Math.abs(g.dy) < 12) {
          moveLane(g.moveX < joyPadXRef.current + JOY / 2 ? -1 : 1);
        }
      },
    }),
  ).current;

  const finish = (won: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const starPoints = starsRef.current * STAR_POINTS;
    const winBonus = won ? diff.winBonus + level.id * 20 : 0;
    const balloonPoints = balloonsRef.current * 20;
    const pointsEarned = starPoints + winBonus + balloonPoints;
    if (won) playSfx('win');
    props.onFinish({
      won, stars: starsRef.current, score: scoreRef.current, pointsEarned,
      levelId: level.id, difficulty: props.difficulty,
      topSpeedMph: topSpeedRef.current, timeSeconds: Math.round(elapsedRef.current),
      heartsLeft: heartsRef.current, maxHearts: maxHeartsRef.current,
    });
  };

  // Spawn AT the horizon (y = HORIZON), never above it. A per-lane gap
  // check stops objects piling into one lane: a lane is only used when
  // its last object is far enough down the road.
  const spawn = (kind: Kind, y?: number, extra?: Partial<Entity>) => {
    const gapOk = (l: number) => (lastSpawnYRef.current[l] ?? 0) === 0 || (lastSpawnYRef.current[l] ?? 0) > HORIZON + 130;
    let laneIdx = Math.floor(Math.random() * 3);
    if (!extra?.lane && !gapOk(laneIdx)) {
      const open = [0, 1, 2].filter(gapOk);
      if (!open.length) return; // skip this spawn rather than piling up
      laneIdx = open[Math.floor(Math.random() * open.length)];
    }
    let useLane = extra?.lane ?? laneIdx;
    if (kind === 'star' && extra?.lane === undefined) {
      // Never spawn a star on top of a rival that is already on screen —
      // it reads as the rival wearing the star.
      const clear = (l: number) => !entitiesRef.current.some(
        (o) => o.kind === 'rival' && o.lane === l && o.y > HORIZON && o.y < PLAYER_Y,
      );
      if (!clear(useLane)) {
        const openLanes = [0, 1, 2].filter(clear);
        if (openLanes.length) {
          useLane = openLanes[Math.floor(Math.random() * openLanes.length)];
        } else {
          // Every lane has a rival on screen: use the lane whose rival is
          // nearest the horizon, so the star meets it up there, tiny.
          let best = useLane;
          let bestY = Infinity;
          for (const l of [0, 1, 2]) {
            const ry = Math.min(
              ...entitiesRef.current
                .filter((o) => o.kind === 'rival' && o.lane === l && o.y > HORIZON && o.y < PLAYER_Y)
                .map((o) => o.y),
              Infinity,
            );
            if (ry < bestY) { bestY = ry; best = l; }
          }
          useLane = best;
        }
      }
    }
    const e: Entity = { id: idRef.current++, kind, lane: useLane, y: y ?? HORIZON, ...extra };
    if (kind === 'traffic') {
      const colors = level.trafficColors.length ? level.trafficColors : ['#F97316'];
      e.color = colors[Math.floor(Math.random() * colors.length)];
      e.vehicleId = Math.random() < 0.2 ? 'bus' : Math.random() < 0.35 ? 'taxi' : 'car';
    }
    lastSpawnYRef.current[useLane] = e.y;
    entitiesRef.current = [...entitiesRef.current, e];
  };

  const spawnRivals = () => {
    // 9 real rivals, spread down the road ahead of you, each in a
    // lane with a gap. Passing one is what moves your place up.
    // Three rows of three (one per lane), ~36px apart down the road:
    // the old formula divided the (small) road band by 9, so all 9
    // rivals spawned within ~10px of each other — a pile of cars at
    // the horizon. Rows read as depth (a car behind another in its
    // lane), which is how a starting grid looks.
    const lanes = [0, 1, 2, 0, 1, 2, 0, 1, 2];
    const colors = level.trafficColors;
    lanes.forEach((laneIdx, i) => {
      const y = HORIZON + 40 + Math.floor(i / 3) * 36 + (i % 3) * 5;
      entitiesRef.current = [...entitiesRef.current, {
        id: idRef.current++, kind: 'rival', lane: laneIdx, y,
        color: colors[i % colors.length], rivalPlace: RIVALS_TOTAL - i,
        vehicleId: i % 4 === 0 ? 'bus' : i % 4 === 1 ? 'race' : 'car',
      }];
      lastSpawnYRef.current[laneIdx] = y;
    });
  };

  const spawnScenery = (y: number) => {
    ([-1, 1] as const).forEach((side) => {
      if (Math.random() < 0.75) {
        sceneryRef.current = [...sceneryRef.current, {
          id: sceneryIdRef.current++, side, y,
          emoji: level.scenery[Math.floor(Math.random() * level.scenery.length)],
          offset: 24 + Math.random() * 70,
        }];
      }
    });
  };

  // Countdown, then start music + pre-spawn rivals + 2 traffic cars AT the horizon.
  useEffect(() => {
    if (countdown <= 0) {
      setGoFlash(true);
      pokeToast('👆 Drag the joystick to steer!');
      music.start();
      spawnRivals();
      // Pre-spawned traffic starts at the horizon but ONLY in the side
      // lanes: a car in the centre lane would reach the player in ~1.5 s,
      // before a kid can even react.
      spawn('traffic', HORIZON, { lane: 0 });
      spawn('traffic', HORIZON + 60, { lane: 2 });
      spawnScenery(HORIZON + 20);
      setTimeout(() => setGoFlash(false), 480);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  // Pause freezes the music too, so the break feels like a game pause.
  useEffect(() => {
    if (countdown > 0) return;
    if (paused) {
      music.pause();
      setBoost(false);
    } else {
      music.resume();
    }
  }, [paused, countdown]);

  // Race clock (1 s ticks, for the HUD timer).
  useEffect(() => {
    if (countdown > 0 || paused || finishedRef.current) return;
    const iv = setInterval(() => { elapsedRef.current += 1; setElapsed(elapsedRef.current); }, 1000);
    return () => clearInterval(iv);
  }, [countdown, paused]);

  const pokeToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1100);
  };

  // Game loop.
  useEffect(() => {
    if (countdown > 0 || paused || finishedRef.current) return;
    racingRef.current = true;
    const iv = setInterval(() => {
      if (finishedRef.current) return;
      const dt = TICK_MS / 1000;
      // Speed RAMPS up: 0.4 -> 1 over ~2.5 s, so the car accelerates
      // instead of teleporting to top speed.
      speedRampRef.current = Math.min(1, speedRampRef.current + dt / 2.5);
      const ramp = 0.4 + 0.6 * speedRampRef.current;
      const dy = scrollSpeed * ramp * (boostRef.current ? boostMul : 1) * dt;
      const mphNow = Math.round(currentMph * ramp * (boostRef.current ? boostMul : 1) * (0.97 + 0.05 * Math.abs(Math.sin(distanceRef.current / 300))));
      setRoadOffset((o) => (o + dy) % 90);
      topSpeedRef.current = Math.max(topSpeedRef.current, mphNow);
      setMph(mphNow);
      distanceRef.current += dy;
      setDistance(distanceRef.current);

      // The picture eases toward the target lane — handling decides
      // how fast. The HIT TEST uses this eased x, never the target lane.
      const targetX = laneX(laneRef.current, PLAYER_Y);
      visualXRef.current += (targetX - visualXRef.current) * easePerTick;
      setVisualX(visualXRef.current);

      // Flash lasts the FULL invincibility time (1.2 s), not 0.3 s.
      if (Date.now() > flashUntilRef.current && flash) setFlash(false);

      trafficTimer.current += TICK_MS;
      if (trafficTimer.current >= trafficInterval + 1000) { trafficTimer.current = 0; spawn('traffic'); }
      starTimer.current += TICK_MS;
      if (starTimer.current >= 900) { starTimer.current = 0; spawn('star'); }
      obstacleTimer.current += TICK_MS;
      if (obstacleTimer.current >= 3200) { obstacleTimer.current = 0; spawn(Math.random() < 0.5 ? 'cone' : 'puddle'); }
      balloonTimer.current += TICK_MS;
      if (balloonTimer.current >= 9000) { balloonTimer.current = 0; spawn('balloon'); }
      sceneryTimer.current += TICK_MS;
      if (sceneryTimer.current >= 1400) { sceneryTimer.current = 0; spawnScenery(HORIZON); }

      const now = Date.now();
      let nextStars = starsRef.current;
      let nextBalloons = balloonsRef.current;
      let nextHearts = heartsRef.current;
      let nextScore = scoreRef.current + Math.round(dy / 10);
      const kept: Entity[] = [];
      // Hit box derived from the RENDERED car: half-width/height scale
      // with CAR_W and the lane width at this screen size.
      const hitHalfW = CAR_W * 0.42;
      const hitHalfH = CAR_H * 0.42;
      const playerCentreY = PLAYER_Y + CAR_H / 2;
      for (const e of entitiesRef.current) {
        const speed = e.kind === 'traffic' ? dy * 0.55 : e.kind === 'rival' ? dy * (0.06 + (e.id % 5) * 0.02) : e.kind === 'cone' || e.kind === 'puddle' ? dy * 0.7 : dy;
        let y = e.y + speed;
        let xShift = e.xShift ?? 0;
        if (e.kind === 'star' && upgrades.magnet > 0 && Math.abs(y - PLAYER_Y) < 350) {
          const targetX2 = laneX(laneRef.current, y) - laneX(e.lane, y);
          const step = Math.max(-upgrades.magnet * 3.5, Math.min(upgrades.magnet * 3.5, targetX2 - xShift));
          xShift += step;
          y += dy * 0.25 * upgrades.magnet;
        }
        // Anything that has fully passed the player (its top is
        // below the player car) can no longer be hit or collected —
        // drop it HERE instead of letting it pile up at the bottom
        // edge overlapping the player car (the bus + cars piled at
        // the bottom of Dhruv's phone photo). Lap/finish lines sweep
        // the full road, so they keep the old cull; rivals are
        // counted as passed in their block below, then dropped there.
        if (e.kind !== 'rival' && e.kind !== 'lapline' && e.kind !== 'finishline' && y > PLAYER_Y + CAR_H) continue;
        if (y > H + 100) continue;
        const s = depthScale(y);
        const entityX = laneX(e.lane, y) + xShift;
        // Centre-based overlap: the entity's picture is scaled from
        // its centre, so the test uses centres, not the top of its box.
        const entityH = (e.kind === 'traffic' || e.kind === 'rival' ? 52 : 44) * s;
        const entityCentreY = y + entityH / 2;
        const dx = Math.abs(entityX - visualXRef.current);
        const dyC = Math.abs(entityCentreY - playerCentreY);
        const hit = dx < hitHalfW + entityH * 0.3 && dyC < hitHalfH + entityH * 0.4;
        if (e.kind === 'rival') {
          // Rivals are racers to pass, not obstacles: no heart lost.
          // Passing one (its centre goes below the player) moves your place up.
          if (entityCentreY > playerCentreY + hitHalfH && !e.rivalPlace) { /* already counted */ }
          if (y > PLAYER_Y + CAR_H && e.rivalPlace !== undefined) {
            rivalsPassedRef.current += 1;
            setRivalsPassed(rivalsPassedRef.current);
            setToast(`🎉 You passed ${e.rivalPlace === 2 ? 'the leader' : 'a racer'} — ${ordinal(RIVALS_TOTAL + 1 - rivalsPassedRef.current)}!`);
            setTimeout(() => setToast(''), 1400);
            e.rivalPlace = undefined;
          }
          // Counted as passed above — now gone, no bottom pile-up.
          if (y > PLAYER_Y + CAR_H) continue;
          kept.push({ ...e, y, xShift });
          continue;
        }
        if (e.kind === 'lapline' || e.kind === 'finishline') { kept.push({ ...e, y, xShift }); continue; }
        if (hit && (e.kind === 'star' || e.kind === 'balloon')) {
          if (e.kind === 'star') { nextStars += 1; nextScore += STAR_POINTS; playSfx('star'); }
          else { nextBalloons += 1; nextScore += 20; pokeToast('🎈 Balloon bonus! +20'); }
          continue;
        }
        if (hit && now > invulnerableUntil.current) {
          // Rocky: Shield eats the first hit — no heart lost.
          if (props.driver.id === 'rocky' && !shieldUsedRef.current) {
            shieldUsedRef.current = true;
            invulnerableUntil.current = now + 1200;
            flashUntilRef.current = now + 1200;
            setFlash(true);
            setTimeout(() => setFlash(false), 1200);
            playSfx('bump');
            pokeToast('🛡️ Shield saved you!');
            continue;
          }
          nextHearts -= 1;
          // Low (Easy) cannot be lost: a 3-year-old always reaches the
          // finish line — the last heart never drops.
          if (props.difficulty === 'low' && nextHearts <= 0) {
            nextHearts = 1;
            pokeToast('Almost! Keep going! 💪');
          }
          invulnerableUntil.current = now + 1200;
          flashUntilRef.current = now + 1200;
          setFlash(true);
          // Blink/shake lasts the FULL 1.2 s of invincibility.
          setTimeout(() => setFlash(false), 1200);
          playSfx('bump');
          pokeToast(e.kind === 'traffic' ? '💥 Oops! Slow car!' : e.kind === 'cone' ? '💥 Cone bump!' : '💦 Puddle splash!');
          continue;
        }
        kept.push({ ...e, y, xShift });
      }
      entitiesRef.current = kept;
      // Sync the rendered entities with the refs (the loop only ever
      // wrote the ref, so stars, traffic, cones and rivals were being
      // collected / hit while INVISIBLE — the road looked empty even
      // as the star count climbed and rivals were "passed").
      setEntities(kept);
      // Gap check must follow the road: the last object in each lane
      // is the LOWEST one still on screen (0 = lane is clear).
      const lowest: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
      for (const e of kept) {
        if (e.kind === 'lapline' || e.kind === 'finishline') continue;
        lowest[e.lane] = Math.max(lowest[e.lane] ?? 0, e.y);
      }
      lastSpawnYRef.current = lowest;
      starsRef.current = nextStars;
      balloonsRef.current = nextBalloons;
      heartsRef.current = nextHearts;
      scoreRef.current = nextScore;
      // Sync the displayed HUD numbers with the refs (they were only
      // ever written to the refs, so the star count and hearts on the
      // HUD froze at their starting values while lap/position moved).
      setStars(nextStars);
      setBalloons(nextBalloons);
      setHearts(nextHearts);
      setScore(nextScore);

      // Laps: a real checkered lap line sweeps down the road at each
      // lap boundary (star goal split in thirds).
      const newLap = Math.min(3, 1 + Math.floor((nextStars / level.starGoal) * 3));
      if (newLap > lapRef.current) {
        lapRef.current = newLap;
        setLap(newLap);
        entitiesRef.current = [...entitiesRef.current, { id: idRef.current++, kind: 'lapline', lane: 1, y: HORIZON }];
        setToast(`🏁 Lap ${newLap}/3!`);
        setTimeout(() => setToast(''), 1400);
      }

      // Scenery + grass tufts scroll with the same dy as the road.
      const nextScenery: SceneryItem[] = [];
      for (const s of sceneryRef.current) {
        const ny = s.y + dy;
        if (ny < H + 60) nextScenery.push({ ...s, y: ny });
      }
      sceneryRef.current = nextScenery;
      setScenery(nextScenery);
      const nextTufts: GrassTuft[] = [];
      for (const t of tuftsRef.current) {
        const ny = t.y + dy;
        if (ny < H + 40) nextTufts.push({ ...t, y: ny });
      }
      // Keep a steady stream of grass tufts on both sides.
      if (nextTufts.length < 10 && Math.random() < 0.5) {
        nextTufts.push({ id: sceneryIdRef.current++, side: Math.random() < 0.5 ? -1 : 1, y: HORIZON + 10, offset: 30 + Math.random() * 130 });
      }
      tuftsRef.current = nextTufts;
      setTufts(nextTufts);

      // Win: sweep a real finish line down the road first, THEN the
      // trophy screen — the road shows the line, the win is not a cut.
      if (nextStars >= level.starGoal && !finishingRef.current) {
        finishingRef.current = true;
        entitiesRef.current = [...entitiesRef.current, { id: idRef.current++, kind: 'finishline', lane: 1, y: HORIZON }];
        setEntities([...entitiesRef.current]);
        setTimeout(() => finish(true), 900);
      } else if (nextHearts <= 0) {
        finish(false);
      }
    }, TICK_MS);
    return () => {
      racingRef.current = false;
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown, paused]);

  const entityEmoji = (e: Entity): string => {
    switch (e.kind) {
      case 'star': return '⭐';
      case 'cone': return level.obstacleEmoji;
      case 'puddle': return level.puddleEmoji;
      case 'balloon': return '🎈';
      default: return '';
    }
  };

  // Converging lane dashes: 8 long, bright dashes scrolling down,
  // leaning with the lanes. 90px spacing divides the 720px cycle
  // AND the 90px scroll wrap, so the pattern never jumps.
  const dashes = Array.from({ length: 8 }, (_, i) => HORIZON + (((roadOffset + i * 90) % 720) / 720) * ROAD_H);
  // Grass tufts rendered from state (they scroll with dy, like everything else).
  const shakeX = flash ? (Math.floor(Date.now() / 90) % 2 === 0 ? 7 : -7) : 0;
  const speedLines = boosting || mph > currentMph * 1.1;

  return (
    <LinearGradient colors={level.sky} style={styles.bg}>
      <StatusBar hidden={!paused} />
      {/* Sunset map: the photographic sunset sky (palms, lamps, orange
          clouds) fills the sky down to just past the horizon; the
          drawn road + dusk ground cover everything below it. The
          photo already carries the setting sun, so no sun emoji and
          no emoji hill band on this map. */}
      {level.sunset ? (
        <Image
          source={SUNSET_SKY}
          style={{ position: 'absolute', top: 0, left: 0, width: W, height: HORIZON + 48 }}
          resizeMode="cover"
        />
      ) : level.night ? (
        <>
          <Text style={[styles.moon, { left: W * 0.28, top: insets.top + 6 }]}>🌙</Text>
          <Text style={[styles.nightStars, { left: W * 0.28 + 52, top: insets.top + 20 }]}>✦ ✦</Text>
          <Text style={[styles.nightStars, { left: W * 0.34, top: insets.top + 44 }]}>✦</Text>
        </>
      ) : (
        <Text style={[styles.sun, { left: W * 0.28, top: insets.top + 2, fontSize: is3d ? 34 : 30 }]}>☀️</Text>
      )}
      {/* Horizon hills — a distant silhouette band, so the sky is not a bare void (not on the sunset map: the photo has its own). */}
      {level.sunset ? null : (
        <View style={{ position: 'absolute', left: 0, right: 0, top: HORIZON - 26, flexDirection: 'row', justifyContent: 'space-around', opacity: is3d ? 0.9 : 0.65 }}>
          <Text style={{ fontSize: 26 }}>{level.night ? '🏙️' : '⛰️'}</Text>
          <Text style={{ fontSize: 20 }}>{level.night ? '🌙' : '🌲'}</Text>
          <Text style={{ fontSize: 28 }}>{level.night ? '🏙️' : '⛰️'}</Text>
          <Text style={{ fontSize: 20 }}>{level.night ? '⭐' : '🌲'}</Text>
          <Text style={{ fontSize: 26 }}>{level.night ? '🏙️' : '⛰️'}</Text>
        </View>
      )}
      {/* Ground: flat colour + scrolling grass tufts, so the ground visibly moves. */}
      <View style={[styles.ground, { top: HORIZON, backgroundColor: level.grass }]} />
      {/* No grass tufts on the sunset map — green sprouts look wrong
          on the dusk ground; the palms + lamps are the roadside there. */}
      {level.sunset ? null : tufts.map((t) => {
        const s = depthScale(t.y);
        const x = W / 2 + t.side * (roadHalfOuterAt(t.y) + t.offset * s);
        return (
          <Text key={'tuft' + t.id} style={{ position: 'absolute', left: x - 10 * s, top: t.y, fontSize: 18 * s + 8, opacity: 0.9 }}>
            {level.night ? '🌿' : '🌱'}
          </Text>
        );
      })}
      {/* Roadside scenery — BOTH sides, scaling with depth, scrolling past. */}
      {scenery.map((s) => {
        const sc = depthScale(s.y);
        const x = W / 2 + s.side * (roadHalfOuterAt(s.y) + s.offset * sc);
        // Sunset palms + lamps read bigger, like the mockup's roadside.
        const fs = level.sunset ? 34 * sc + 14 : 26 * sc + 10;
        return (
          <Text key={'sc' + s.id} style={{ position: 'absolute', left: x - 18 * sc, top: s.y - 20 * sc, fontSize: fs, zIndex: 1 }}>
            {s.emoji}
          </Text>
        );
      })}

      <RoadSurface
        width={W}
        height={H}
        horizon={HORIZON}
        topW={ROAD_TOP_W}
        botW={ROAD_BOT_W}
        color={level.road}
        kerb={level.kerb}
        edge={level.edge}
        offset={roadOffset}
      />
      {/* Kerbs + edge lines are drawn by RoadSurface (one pattern, per-map, scrolling). */}
      {/* Lane dashes — leaning with the lanes, not upright pasted bars. */}
      {[-1, 1].map((side) =>
        dashes.map((y, i) => (
          <View
            key={'d' + side + i}
            style={[styles.laneDash, {
              top: y,
              left: W / 2 + (side * roadHalfAt(y)) / 3 - 3,
              width: 5 + depthScale(y) * 4,
              height: 14 + depthScale(y) * 26,
              transform: [{ rotate: `${side * LEAN_DEG}deg` }],
            }]}
          />
        )),
      )}
      {/* Speed lines at the screen edges when boosting / at top speed. */}
      {speedLines ? (
        <>
          <View style={[styles.speedLine, { left: 6, top: H * 0.45, height: H * 0.3 }]} />
          <View style={[styles.speedLine, { right: 6, top: H * 0.45, height: H * 0.3 }]} />
        </>
      ) : null}

      {/* Touch area over the road (drag steering) */}
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />

      {/* Entities — grow as they come down from the horizon */}
      {entities.map((e) => {
        const s = depthScale(e.y);
        const x = laneX(e.lane, e.y);
        if (e.kind === 'lapline' || e.kind === 'finishline') {
          const w = roadHalfAt(e.y) * 2;
          return (
            <View key={e.id} style={{ position: 'absolute', left: W / 2 - w / 2, top: e.y, width: w, height: 10 + 10 * s }}>
              <View style={{ flexDirection: 'row', flex: 1 }}>
                {Array.from({ length: 12 }, (_, i) => (
                  <View key={i} style={{ flex: 1, backgroundColor: i % 2 === 0 ? '#111827' : '#FFFFFF' }} />
                ))}
              </View>
              {e.kind === 'finishline' && <Text style={{ textAlign: 'center', fontWeight: '900', color: '#fff', fontSize: 14 + 10 * s, textShadowColor: '#000', textShadowRadius: 4 }}>🏁 FINISH!</Text>}
              {e.kind === 'lapline' && <Text style={{ textAlign: 'center', fontWeight: '900', color: '#fff', fontSize: 12 + 8 * s, textShadowColor: '#000', textShadowRadius: 4 }}>LAP {lap}/3</Text>}
            </View>
          );
        }
        if (e.kind === 'traffic' || e.kind === 'rival') {
          // Rear-view cars ahead of you — same perspective as the player,
          // big enough to read like the mockup's blue + yellow rivals.
          const w = Math.max(40, 110 * s);
          return (
            <View key={e.id} style={{ position: 'absolute', left: x - w / 2 + (e.xShift ?? 0), top: e.y, width: w, alignItems: 'center' }}>
              <CarView color={e.color ?? '#F97316'} accent="#FCA5A5" width={w} mode={props.viewMode} angle="rear" stripe="#FFFFFF" vehicleId={e.vehicleId ?? 'car'} />
              {e.kind === 'rival' && e.rivalPlace !== undefined ? (
                <Text style={{ fontSize: 11 + 6 * s, fontWeight: '900', color: '#fff', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, paddingHorizontal: 4, marginTop: 2 }}>
                  {ordinal(e.rivalPlace)}
                </Text>
              ) : null}
            </View>
          );
        }
        if (e.kind === 'balloon') {
          // Balloons FLOAT above the road — never in a lane on the asphalt.
          return (
            <View key={e.id} style={{ position: 'absolute', left: x - 22 + (e.xShift ?? 0), top: e.y - 64 * s, width: 44, alignItems: 'center', transform: [{ scale: s }] }}>
              <Text style={{ fontSize: 34 }}>🎈</Text>
            </View>
          );
        }
        // Golden 3D-looking stars, large and glowing like the mockup —
        // rendering only; collection logic and star goal are unchanged.
        const isStar = e.kind === 'star';
        return (
          <View key={e.id} style={{ position: 'absolute', left: x - 32 + (e.xShift ?? 0), top: e.y, width: 64, alignItems: 'center', transform: [{ scale: s }] }}>
            <Text
              style={{
                fontSize: isStar ? 46 : 28,
                textShadowColor: isStar ? '#FFD700' : 'rgba(0,0,0,0.4)',
                textShadowRadius: isStar ? 16 : 4,
                textShadowOffset: { width: 0, height: 0 },
              }}
            >
              {entityEmoji(e)}
            </Text>
          </View>
        );
      })}

      {/* Player car — rear view, anchored so wheels + exhaust stay
          inside the box. 'race' / 'police' use their photo sprite
          (contain, inside the same CAR_W x CAR_H box — the hit box is
          unchanged); every other vehicle keeps the drawn rear CarView
          with the driver face inside the rear window. */}
      <View style={{ position: 'absolute', left: visualX - CAR_W / 2, top: PLAYER_Y, width: CAR_W, height: CAR_H, zIndex: 3 }}>
        {RACE_PHOTOS[props.vehicleId] ? (
          <>
            <View style={{ position: 'absolute', bottom: 0, left: 0, transform: [{ translateX: shakeX }] }}>
              <Image source={RACE_PHOTOS[props.vehicleId]} style={{ width: CAR_W, height: CAR_H }} resizeMode="contain" />
            </View>
            {boosting ? <Text style={{ position: 'absolute', bottom: -6, alignSelf: 'center', fontSize: 22 }}>🔥</Text> : null}
            {/* Driver face as a small circle overlapping the top-centre
                of the photo car (the photo's rear window is dark glass). */}
            <View style={{ position: 'absolute', top: 4, left: CAR_W / 2 - CAR_W * 0.14, width: CAR_W * 0.28, height: CAR_W * 0.28, zIndex: 3, overflow: 'hidden', borderRadius: 999, backgroundColor: '#1E293B', borderWidth: 2, borderColor: '#0F172A' }}>
              <DriverFace driver={props.driver} mode={props.viewMode} size={CAR_W * 0.28} />
            </View>
          </>
        ) : (
          <>
            <View style={{ position: 'absolute', top: 14, left: CAR_W / 2 - CAR_W * 0.15, width: CAR_W * 0.3, height: CAR_W * 0.3, zIndex: 3, overflow: 'hidden', borderRadius: 999, backgroundColor: '#1E293B', borderWidth: 2, borderColor: '#0F172A' }}>
              <DriverFace driver={props.driver} mode={props.viewMode} size={CAR_W * 0.3} />
            </View>
            <View style={{ position: 'absolute', bottom: 0, left: 0 }}>
              <CarView color={props.skinColor} accent={props.skinAccent} width={CAR_W} mode={props.viewMode} angle="rear" stripe={skin.stripe} vehicleId={props.vehicleId} flashing={flash} shakeX={shakeX} boosting={boosting} />
            </View>
          </>
        )}
        {is3d && <View style={{ position: 'absolute', bottom: -4, left: CAR_W * 0.06, right: CAR_W * 0.06, height: 8, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 999 }} />}
      </View>

      {/* HUD — top-left, exactly like the mockup: big place + LAP under it.
          (Timer + score still run — they show on the Results screen.) */}
      <View style={[styles.hudLeft, styles.hudPill, { top: insets.top + 6, left: insets.left + 10 }]}>
        <Text style={styles.positionText}>{ordinal(position)}</Text>
        <Text style={styles.lapText}>LAP {lap}/3</Text>
      </View>

      {/* HUD — top-centre: star progress bar with the star count, like
          the mockup ("⭐ 14 / 25"). No map/difficulty label bar — the
          star bar IS the progress. */}
      <View style={[styles.progressWrap, { top: insets.top + 10 }]}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${raceProgress * 100}%` }]} />
          <Text style={[styles.progressCar, { left: `${raceProgress * 88}%` }]}>🚗</Text>
          <Text style={[styles.progressFlag, { right: -6 }]}>🏁</Text>
        </View>
        <Text style={styles.starCount}>⭐ {stars} / {level.starGoal}</Text>
      </View>

      {/* HUD — top-right: hearts + pause first (mockup), then the rest. */}
      <View style={[styles.hudTopRight, { top: insets.top + 6, right: insets.right + 10, alignItems: 'center' }]}>
        <Text style={styles.heartsText}>{heartLine(hearts)}</Text>
        <TouchableOpacity style={styles.roundBtn} onPress={() => setPaused((p) => !p)}>
          <Text style={styles.roundText}>{paused ? '▶' : '⏸'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.roundBtn} onPress={() => { playSfx('horn'); setToast('📣 Beep beep!'); setTimeout(() => setToast(''), 900); }}>
          <Text style={styles.roundText}>📣</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.roundBtn} onPress={props.onToggleMusic}>
          <Text style={styles.roundText}>{props.musicOn ? '🎵' : '🔇'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.roundBtn} onPress={props.onToggleSfx}>
          <Text style={styles.roundText}>{props.sfxOn ? '🔊' : '🔇'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.roundBtn} onPress={props.onQuit}>
          <Text style={styles.roundText}>🏠</Text>
        </TouchableOpacity>
      </View>

      {toast ? <Text style={[styles.toast, { bottom: insets.bottom + 110 }]}>{toast}</Text> : null}
      {(countdown > 0 || goFlash) && (
        <View style={styles.countdown} pointerEvents="none">
          <Text style={styles.countdownText}>{countdown > 0 ? countdown : 'GO!'}</Text>
          <Text style={styles.countdownSub}>{countdown > 0 ? 'Get ready…' : 'Zoom!'}</Text>
        </View>
      )}

      {/* Round joystick, bottom-left (mockup): drag the knob left/right
          to steer; tap its left/right half for one lane. Replaces the
          big LEFT / RIGHT buttons. Tap-half + drag steering on the road
          itself still work (see the full-screen pan responder). */}
      <View
        style={[styles.joyPad, { left: insets.left + 10, bottom: insets.bottom + 16, width: JOY, height: JOY, borderRadius: JOY / 2 }]}
        onLayout={(e) => { joyPadXRef.current = e.nativeEvent.layout.x; }}
        {...joyPan.panHandlers}
      >
        <View style={[styles.joyKnob, { width: JOY * 0.44, height: JOY * 0.44, borderRadius: (JOY * 0.44) / 2, transform: [{ translateX: knobX * JOY * 0.26 }] }]}>
          <Text style={styles.joyKnobText}>↔️</Text>
        </View>
        <Text style={styles.joyHint}>STEER</Text>
      </View>

      {/* Bottom-right (mockup): big italic MPH number with "MPH" under
          it, then the round orange BOOST beside it — with at least
          26px clearance from the right edge, so the number is never
          clipped like in proof2. */}
      <View style={[styles.mphCluster, { right: insets.right + 26, bottom: insets.bottom + 18 }]}>
        <View style={styles.mphBox}>
          <Text style={[styles.mphText, boosting && styles.mphBoost]}>{mph}</Text>
          <Text style={styles.mphUnitText}>MPH</Text>
          <View style={styles.speedTrack}>
            <View style={[styles.speedFill, { width: `${Math.min(100, (mph / 280) * 100)}%` }]} />
          </View>
        </View>
        <TouchableOpacity
          style={[styles.boostBtn, { width: BTN + 12, height: BTN + 12, borderRadius: (BTN + 12) / 2 }, boosting && styles.boostBtnActive]}
          onPressIn={() => setBoost(true)}
          onPressOut={() => setBoost(false)}
          disabled={paused || countdown > 0}
        >
          <Text style={styles.boostText}>🚀</Text>
          <Text style={styles.boostLabel}>BOOST</Text>
        </TouchableOpacity>
      </View>

      {paused && (
        <View style={styles.pausedOverlay}>
          <Text style={styles.pausedText}>⏸ Paused</Text>
          <TouchableOpacity style={styles.resumeBtn} onPress={() => setPaused(false)}>
            <Text style={styles.resumeText}>▶ RESUME</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quitBtn} onPress={props.onQuit}>
            <Text style={styles.quitText}>🏠 Home</Text>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  sun: { position: 'absolute', fontSize: 30, zIndex: 1 },
  moon: { position: 'absolute', fontSize: 32, zIndex: 1 },
  nightStars: { position: 'absolute', fontSize: 16, color: '#FDE68A', zIndex: 1 },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  laneDash: { position: 'absolute', backgroundColor: '#FFFFFF', borderRadius: 3 },
  speedLine: { position: 'absolute', width: 5, backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 3 },
  hudLeft: { position: 'absolute', zIndex: 5 },
  hudPill: { backgroundColor: 'rgba(10,12,20,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12 },
  positionText: { fontSize: 44, fontWeight: '900', fontStyle: 'italic', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  lapText: { fontSize: 18, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  hudSmall: { fontSize: 15, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  progressWrap: { position: 'absolute', left: '30%', right: '30%', flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 5 },
  progressTrack: { flex: 1, height: 12, backgroundColor: 'rgba(8,10,16,0.66)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 6, overflow: 'visible' },
  progressFill: { height: '100%', backgroundColor: '#FF8A1A', borderRadius: 6, shadowColor: '#FFAA28', shadowOpacity: 0.8, shadowRadius: 6 },
  progressCar: { position: 'absolute', top: -14, fontSize: 18 },
  progressFlag: { position: 'absolute', top: -16, fontSize: 18 },
  starCount: { fontSize: 16, fontWeight: '900', color: '#fff', backgroundColor: 'rgba(8,10,16,0.66)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  heartsText: { fontSize: 18, marginRight: 2 },
  hudTopRight: { position: 'absolute', flexDirection: 'row', gap: 6, zIndex: 5 },
  mphCluster: { position: 'absolute', flexDirection: 'row', gap: 10, alignItems: 'flex-end', zIndex: 5 },
  mphBox: { alignItems: 'flex-end' },
  mphText: { fontSize: 54, fontWeight: '900', fontStyle: 'italic', color: '#fff', textShadowColor: 'rgba(255,150,50,0.45)', textShadowRadius: 8, lineHeight: 54 },
  mphBoost: { color: '#FFC531' },
  mphUnitText: { fontSize: 16, fontWeight: '900', color: '#fff', textAlign: 'right', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  speedTrack: { width: 130, height: 10, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 5, overflow: 'hidden', marginTop: 2 },
  speedFill: { height: '100%', backgroundColor: '#FFC531' },
  roundBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(10,12,20,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  roundText: { fontSize: 17 },
  toast: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontWeight: '900', color: '#fff', fontSize: 18, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  flame: { position: 'absolute', bottom: -6, alignSelf: 'center', fontSize: 22 },
  countdown: { position: 'absolute', top: '28%', left: 0, right: 0, alignItems: 'center', zIndex: 8 },
  countdownText: { fontSize: 90, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 8 },
  countdownSub: { fontSize: 20, fontWeight: '800', color: '#fff' },
  // Round joystick pad (mockup): dark glass circle, orange knob that
  // slides left/right with the drag, STEER label underneath.
  joyPad: {
    position: 'absolute', backgroundColor: 'rgba(8,10,16,0.55)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', zIndex: 5,
  },
  joyKnob: { backgroundColor: '#FF6A00', borderBottomWidth: 5, borderBottomColor: '#8F3200', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#FF6A00', shadowOpacity: 0.5, shadowRadius: 8 },
  joyKnobText: { fontSize: 22, color: '#fff' },
  joyHint: { position: 'absolute', bottom: 10, fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.75)', letterSpacing: 1 },
  boostBtn: { backgroundColor: '#FF6A00', borderBottomWidth: 5, borderBottomColor: '#8F3200', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#FF6A00', shadowOpacity: 0.5, shadowRadius: 10 },
  boostBtnActive: { backgroundColor: '#FFC531', borderBottomColor: '#B45309' },
  boostText: { fontSize: 30 },
  boostLabel: { fontSize: 11, fontWeight: '900', color: '#fff' },
  pausedOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 30,
    backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  pausedText: { fontSize: 40, fontWeight: '900', color: '#fff' },
  resumeBtn: { backgroundColor: '#22C55E', borderRadius: 22, paddingVertical: 16, paddingHorizontal: 36, marginTop: 16, borderBottomWidth: 5, borderBottomColor: '#15803D' },
  resumeText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  quitBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 22 },
  quitText: { color: '#fff', fontSize: 18, fontWeight: '900' },
});

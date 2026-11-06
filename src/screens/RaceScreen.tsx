// The race — LANDSCAPE, rear-view perspective (like the reference
// race screenshots, kid-friendly: cartoon drivers, stars/hearts).
// Player car seen from behind at bottom-centre, road vanishing to
// the horizon with level scenery (trees/hills, city buildings…),
// HUD like a real racing game: position + LAP, timer, big MPH +
// speed bar, and a progress/minimap bar. Left thumb joystick for
// steering, right thumb buttons for horn / pause.
//
// Perspective: entities start small at the horizon and grow as they
// come down the road; lane positions spread out the same way.
// Game rules unchanged: 3 lanes, stars to win, cones/puddles/slow
// cars cost a heart, fast traffic every ~1–2 s, 2 cars pre-spawned.

import React, { useEffect, useRef, useState } from 'react';
import {
  PanResponder, StyleSheet, Text, TouchableOpacity, View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setImmersiveMode } from '../immersive';
import { CarView } from '../components/CarView';
import { DriverFace, DriverViewMode } from '../components/DriverFace';
import type { Driver } from '../data/drivers';
import { LEVELS, STAR_POINTS } from '../data/levels';
import { TRAFFIC_COLORS, vehicleById, skinById } from '../data/skins';
import { music } from '../music';
import { isSfxEnabled, playSfx } from '../sfx';
import { DIFFICULTIES, DifficultyId, RaceResult, UpgradesState } from '../types';

type Kind = 'star' | 'traffic' | 'cone' | 'puddle' | 'balloon';
interface Entity { id: number; kind: Kind; lane: number; y: number; color?: string; xShift?: number }

const TICK_MS = 30;

interface Props {
  levelId: number;
  difficulty: DifficultyId;
  vehicleId: string;
  driver: Driver;
  viewMode: DriverViewMode;
  skinColor: string;
  skinAccent: string;
  skinId?: string;
  /** Bought upgrades (Engine / Turbo / Extra Heart / Star Magnet) — they change the race, see below. */
  upgrades?: UpgradesState;
  /** Base speed stat (1–5) of the equipped vehicle. */
  vehicleSpeed?: number;
  /** Extra starting heart granted by a rewarded ad retry (failed race). */
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

  // Perspective geometry (live window size, landscape).
  const HORIZON = H * 0.34;
  const ROAD_TOP_W = W * 0.2;
  const ROAD_BOT_W = W * 0.62;
  const ROAD_H = H - HORIZON;
  const PLAYER_Y = H - 118;
  const roadHalfAt = (y: number) => {
    const t = Math.max(0, Math.min(1, (y - HORIZON) / ROAD_H));
    return (ROAD_TOP_W / 2) + t * ((ROAD_BOT_W - ROAD_TOP_W) / 2);
  };
  const laneX = (lane: number, y: number) => W / 2 + (lane - 1) * (roadHalfAt(y) * 2 / 3);
  const depthScale = (y: number) => 0.35 + 0.65 * Math.max(0, Math.min(1, (y - HORIZON) / ROAD_H));

  const upgrades: UpgradesState = props.upgrades ?? { engine: 0, turbo: 0, heart: 0, magnet: 0 };
  const vehicleSpeed = props.vehicleSpeed ?? 3;
  // Upgrades that change the race (bought in the Shop):
  // Engine +4% top speed/level, Turbo +6% BOOST power/level,
  // Extra Heart +1 starting heart/level, Star Magnet pulls stars.
  const boostMul = 1.3 + upgrades.turbo * 0.06;

  const [countdown, setCountdown] = useState(3);
  const [lane, setLane] = useState(1);
  const [entities, setEntities] = useState<Entity[]>([]);
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
  // Hold-to-BOOST: +30% speed while held (thumb button, bottom-right).
  const [boosting, setBoosting] = useState(false);
  const boostRef = useRef(false);
  const setBoost = (on: boolean) => {
    boostRef.current = on;
    setBoosting(on);
  };

  const laneRef = useRef(1);
  const entitiesRef = useRef<Entity[]>([]);
  const starsRef = useRef(0);
  const balloonsRef = useRef(0);
  const heartsRef = useRef(diff.hearts + upgrades.heart + (props.extraHearts ?? 0));
  const maxHeartsRef = useRef(diff.hearts + upgrades.heart + (props.extraHearts ?? 0));
  const scoreRef = useRef(0);
  const finishedRef = useRef(false);
  const idRef = useRef(1);
  const invulnerableUntil = useRef(0);
  const elapsedRef = useRef(0);
  const topSpeedRef = useRef(0);

  const trafficTimer = useRef(0);
  const starTimer = useRef(400);
  const obstacleTimer = useRef(1800);
  const balloonTimer = useRef(9000);

  const trafficInterval = diff.trafficIntervalMs * level.trafficFactor;
  // Skin Speed stat gives a tiny top-speed bonus (garage stats matter),
  // Engine upgrade +4%/level, vehicle Speed stat +2% per point above 3.
  const scrollSpeed = level.baseSpeed * diff.speedMul * (0.96 + skin.speed * 0.015) * (1 + upgrades.engine * 0.04) * (1 + (vehicleSpeed - 3) * 0.02);
  const currentMph = Math.round((90 + scrollSpeed * 0.28 + skin.speed * 4) * (1 + upgrades.engine * 0.04));

  // Immersive mode: bars stay hidden while racing, but come back
  // while paused (so the pause screen is a normal screen again) and
  // re-hide on resume. Unmount restores them — App also restores on
  // screen change, so a quit/finish can never leave them hidden.
  useEffect(() => {
    void setImmersiveMode(!paused);
    return () => {
      void setImmersiveMode(false);
    };
  }, [paused]);

  const moveLane = (dir: -1 | 1) => {
    const next = Math.max(0, Math.min(2, laneRef.current + dir));
    laneRef.current = next;
    setLane(next);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_e, g) => {
        if (Math.abs(g.dx) > 30) moveLane(g.dx > 0 ? 1 : -1);
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
      won,
      stars: starsRef.current,
      score: scoreRef.current,
      pointsEarned,
      levelId: level.id,
      difficulty: props.difficulty,
      topSpeedMph: topSpeedRef.current,
      timeSeconds: Math.round(elapsedRef.current),
      heartsLeft: heartsRef.current,
      maxHearts: maxHeartsRef.current,
    });
  };

  const spawn = (kind: Kind, y?: number) => {
    const laneIdx = Math.floor(Math.random() * 3);
    const e: Entity = { id: idRef.current++, kind, lane: laneIdx, y: y ?? HORIZON - 50 };
    if (kind === 'traffic') {
      e.color = TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)];
    }
    entitiesRef.current = [...entitiesRef.current, e];
  };

  // Countdown, then start music + pre-spawn 2 traffic cars.
  useEffect(() => {
    if (countdown <= 0) {
      music.start();
      spawn('traffic', HORIZON - 40);
      spawn('traffic', HORIZON - 140);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  // Race clock (1 s ticks, for the HUD timer).
  useEffect(() => {
    if (countdown > 0 || paused || finishedRef.current) return;
    const iv = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => clearInterval(iv);
  }, [countdown, paused]);

  // Game loop.
  useEffect(() => {
    if (countdown > 0 || paused || finishedRef.current) return;
    const iv = setInterval(() => {
      const dt = TICK_MS / 1000;
      // Single scroll delta — pacing fix — boosted +30% while the
      // BOOST button is held (boostRef, not state: the interval
      // closure would go stale on the state value).
      const dy = scrollSpeed * (boostRef.current ? boostMul : 1) * dt;
      const mphNow = Math.round(currentMph * (boostRef.current ? boostMul : 1));
      setRoadOffset((o) => (o + dy) % 90);
      topSpeedRef.current = Math.max(topSpeedRef.current, mphNow);
      setMph(mphNow);

      trafficTimer.current += TICK_MS;
      if (trafficTimer.current >= trafficInterval) {
        trafficTimer.current = 0;
        spawn('traffic');
      }
      starTimer.current += TICK_MS;
      if (starTimer.current >= 900) { starTimer.current = 0; spawn('star'); }
      obstacleTimer.current += TICK_MS;
      if (obstacleTimer.current >= 2200) {
        obstacleTimer.current = 0;
        spawn(Math.random() < 0.5 ? 'cone' : 'puddle');
      }
      balloonTimer.current += TICK_MS;
      if (balloonTimer.current >= 9000) { balloonTimer.current = 0; spawn('balloon'); }

      const now = Date.now();
      let nextStars = starsRef.current;
      let nextBalloons = balloonsRef.current;
      let nextHearts = heartsRef.current;
      let nextScore = scoreRef.current + Math.round(dy / 10);
      const kept: Entity[] = [];
      for (const e of entitiesRef.current) {
        const speed = e.kind === 'traffic' ? dy * 0.9 : dy;
        let y = e.y + speed;
        let xShift = e.xShift ?? 0;
        // Star Magnet: stars within ~350px drift sideways toward the
        // player's lane and rush down faster, so they are easier to grab.
        if (e.kind === 'star' && upgrades.magnet > 0 && Math.abs(y - PLAYER_Y) < 350) {
          const targetX = laneX(laneRef.current, y) - laneX(e.lane, y);
          const step = Math.max(-upgrades.magnet * 3.5, Math.min(upgrades.magnet * 3.5, targetX - xShift));
          xShift += step;
          y += dy * 0.25 * upgrades.magnet;
        }
        if (y > H + 100) continue;
        // Hit test by on-screen x (not just lane) so a magnet-pulled
        // star that has drifted into the player's lane counts.
        const entityX = laneX(e.lane, y) + xShift;
        const playerX = laneX(laneRef.current, PLAYER_Y);
        const hit = Math.abs(y - PLAYER_Y) < 66 && Math.abs(entityX - playerX) < 70;
        if (hit && (e.kind === 'star' || e.kind === 'balloon')) {
          if (e.kind === 'star') { nextStars += 1; nextScore += STAR_POINTS; playSfx('star'); }
          else { nextBalloons += 1; nextScore += 20; setToast('🎈 Balloon bonus! +20'); setTimeout(() => setToast(''), 1200); }
          continue;
        }
        if (hit && now > invulnerableUntil.current) {
          nextHearts -= 1;
          invulnerableUntil.current = now + 1200;
          setFlash(true);
          setTimeout(() => setFlash(false), 300);
          playSfx('bump');
          setToast(e.kind === 'traffic' ? '💥 Oops! Slow car!' : e.kind === 'cone' ? '💥 Cone bump!' : '💦 Puddle splash!');
          setTimeout(() => setToast(''), 1200);
          continue;
        }
        kept.push({ ...e, y, xShift });
      }
      entitiesRef.current = kept;
      starsRef.current = nextStars;
      balloonsRef.current = nextBalloons;
      heartsRef.current = nextHearts;
      scoreRef.current = nextScore;
      setEntities(kept);
      setStars(nextStars);
      setBalloons(nextBalloons);
      setHearts(nextHearts);
      setScore(nextScore);

      if (nextStars >= level.starGoal) finish(true);
      else if (nextHearts <= 0) finish(false);
    }, TICK_MS);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown, paused]);

  const entityEmoji = (e: Entity): string => {
    switch (e.kind) {
      case 'star': return '⭐';
      case 'traffic': return '🚙';
      case 'cone': return '🚧';
      case 'puddle': return '💧';
      case 'balloon': return '🎈';
    }
  };

  const progress = Math.min(1, stars / level.starGoal);
  const lap = Math.min(3, 1 + Math.floor(progress * 3));
  const position = Math.max(1, 10 - Math.floor(progress * 9));
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  // Converging lane dashes (perspective): 6 dashes scrolling down.
  const dashes = Array.from({ length: 6 }, (_, i) => {
    const y = HORIZON + (((roadOffset + i * 90) % 540) / 540) * ROAD_H;
    return y;
  });

  return (
    <LinearGradient colors={level.sky} style={styles.bg}>
      {/* Status bar: hidden while racing, back while paused. This
          <StatusBar> mounts after App's, so it wins while racing. */}
      <StatusBar hidden={!paused} />
      {/* Horizon scenery — distant hills / trees / city per level */}
      <View style={[styles.horizon, { top: HORIZON - 52 }]}>
        <Text style={styles.horizonEmoji}>{level.scenery.join('  ')}</Text>
        <Text style={styles.sun}>☀️</Text>
      </View>
      <View style={[styles.ground, { top: HORIZON, backgroundColor: level.grass }]} />

      {/* Road — trapezoid vanishing to the horizon (border trick) */}
      <View
        style={{
          position: 'absolute',
          top: HORIZON,
          left: (W - ROAD_BOT_W) / 2,
          width: ROAD_TOP_W,
          height: 0,
          borderLeftWidth: (ROAD_BOT_W - ROAD_TOP_W) / 2,
          borderLeftColor: 'transparent',
          borderRightWidth: (ROAD_BOT_W - ROAD_TOP_W) / 2,
          borderRightColor: 'transparent',
          borderBottomWidth: ROAD_H,
          borderBottomColor: level.road,
        }}
      />
      {/* Checkered kerbs along the converging edges */}
      {dashes.map((y, i) => (
        <View key={'k' + i} style={[styles.kerbBit, { top: y, left: W / 2 - roadHalfAt(y) - 5 }]} />
      ))}
      {dashes.map((y, i) => (
        <View key={'l' + i} style={[styles.kerbBit, { top: y, left: W / 2 + roadHalfAt(y) - 5 }]} />
      ))}
      {/* Converging lane dashes */}
      {[-1, 1].map((side) =>
        dashes.map((y, i) => (
          <View
            key={'d' + side + i}
            style={[styles.laneDash, {
              top: y,
              left: W / 2 + (side * roadHalfAt(y)) / 3 - 3,
              width: 5 + depthScale(y) * 3,
              height: 10 + depthScale(y) * 16,
            }]}
          />
        )),
      )}

      {/* Touch area over the road (swipe steering) */}
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />

      {/* Entities — grow as they come down from the horizon */}
      {entities.map((e) => {
        const s = depthScale(e.y);
        const x = laneX(e.lane, e.y);
        return (
          <View
            key={e.id}
            style={{ position: 'absolute', left: x - 22 + (e.xShift ?? 0), top: e.y, width: 44, alignItems: 'center', transform: [{ scale: s }] }}
          >
            {e.kind === 'traffic' ? (
              <View style={[styles.trafficCar, { backgroundColor: e.color }]}>
                <Text style={{ fontSize: 22 }}>🚙</Text>
              </View>
            ) : (
              <Text style={{ fontSize: e.kind === 'star' ? 30 : 28 }}>{entityEmoji(e)}</Text>
            )}
          </View>
        );
      })}

      {/* Player car — rear view, bottom-centre, driver face above it */}
      <View style={{ position: 'absolute', left: laneX(lane, PLAYER_Y) - 75, top: PLAYER_Y - 40 }}>
        <View style={{ alignItems: 'center', marginBottom: -10, zIndex: 3 }}>
          <DriverFace driver={props.driver} mode={props.viewMode} size={48} />
        </View>
        <CarView color={props.skinColor} accent={props.skinAccent} emoji={vehicle.emoji} width={150} flashing={flash} mode={props.viewMode} angle="rear" stripe={skin.stripe} />
      </View>

      {/* HUD — top-left: position / LAP / timer, on a dark pill so
          the white text reads over any scenery */}
      <View style={[styles.hudLeft, styles.hudPill, { top: insets.top + 6, left: insets.left + 10 }]}>
        <Text style={styles.positionText}>{position}TH</Text>
        <Text style={styles.hudSmall}>LAP {lap}/3 • {mm}:{ss}</Text>
        <Text style={styles.hudSmall}>⭐ {stars}/{level.starGoal} • 🏆 {score}</Text>
        <Text style={styles.hudSmall}>{'❤️'.repeat(Math.max(0, hearts))}</Text>
      </View>

      {/* HUD — top-centre: progress / minimap bar */}
      <View style={[styles.progressWrap, { top: insets.top + 10 }]}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          <Text style={[styles.progressCar, { left: `${progress * 88}%` }]}>🚗</Text>
        </View>
        <Text style={styles.progressLabel}>{level.icon} {level.name} • {diff.label}</Text>
      </View>

      {/* HUD — top-right: big speed + speed bar (like the references) */}
      <View style={[styles.hudRight, styles.hudPill, { top: insets.top + 6, right: insets.right + 10 }]}>
        <Text style={[styles.mphText, boosting && styles.mphBoost]}>{mph}<Text style={styles.mphUnit}> MPH</Text></Text>
        <View style={styles.speedTrack}>
          <View style={[styles.speedFill, { width: `${Math.min(100, (mph / 280) * 100)}%` }]} />
        </View>
        <View style={styles.hudBtns}>
          <TouchableOpacity style={styles.roundBtn} onPress={props.onToggleMusic}>
            <Text style={styles.roundText}>{props.musicOn ? '🎵' : '🔇'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.roundBtn} onPress={props.onToggleSfx}>
            <Text style={styles.roundText}>{isSfxEnabled() ? '🔊' : '🔇'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.roundBtn} onPress={props.onQuit}>
            <Text style={styles.roundText}>🏠</Text>
          </TouchableOpacity>
        </View>
      </View>

      {toast ? <Text style={[styles.toast, { bottom: insets.bottom + 110 }]}>{toast}</Text> : null}
      {countdown > 0 && (
        <View style={styles.countdown}>
          <Text style={styles.countdownText}>{countdown}</Text>
          <Text style={styles.countdownSub}>Get ready…</Text>
        </View>
      )}

      {/* Left thumb joystick — steering */}
      <View style={[styles.joystick, { left: insets.left + 14, bottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.steerBtn} onPress={() => moveLane(-1)}>
          <Text style={styles.steerText}>◀</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.steerBtn} onPress={() => moveLane(1)}>
          <Text style={styles.steerText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Right thumb buttons — horn + BOOST (hold) + pause.
          BOOST is the big one: hold it for +30% speed. */}
      <View style={[styles.rightBtns, { right: insets.right + 14, bottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.hornBtn} onPress={() => { playSfx('horn'); setToast('📣 Beep beep!'); setTimeout(() => setToast(''), 900); }}>
          <Text style={styles.hornText}>📣</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.boostBtn, boosting && styles.boostBtnActive]}
          onPressIn={() => setBoost(true)}
          onPressOut={() => setBoost(false)}
          disabled={paused || countdown > 0}
        >
          <Text style={styles.boostText}>🚀</Text>
          <Text style={styles.boostLabel}>BOOST</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pauseBtn} onPress={() => setPaused((p) => !p)}>
          <Text style={styles.hornText}>{paused ? '▶' : '⏸'}</Text>
        </TouchableOpacity>
      </View>

      {paused && (
        <View style={styles.pausedOverlay}>
          <Text style={styles.pausedText}>⏸ Paused</Text>
          <TouchableOpacity style={styles.resumeBtn} onPress={() => setPaused(false)}>
            <Text style={styles.resumeText}>▶ RESUME RACE</Text>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  horizon: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  horizonEmoji: { fontSize: 34 },
  sun: { position: 'absolute', right: 24, top: -8, fontSize: 30 },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  kerbBit: { position: 'absolute', width: 10, height: 16, backgroundColor: '#EF4444', borderRadius: 2 },
  laneDash: { position: 'absolute', backgroundColor: '#FDE68A', borderRadius: 3 },
  trafficCar: { width: 52, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  hudLeft: { position: 'absolute', zIndex: 5 },
  // Dark pill behind HUD text so it reads over bright sky / road.
  hudPill: { backgroundColor: 'rgba(15,23,42,0.45)', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12 },
  positionText: { fontSize: 36, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  hudSmall: { fontSize: 15, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  progressWrap: { position: 'absolute', left: '32%', right: '32%', alignItems: 'center', zIndex: 5 },
  progressTrack: { width: '100%', height: 12, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 6, overflow: 'visible' },
  progressFill: { height: '100%', backgroundColor: '#22C55E', borderRadius: 6 },
  progressCar: { position: 'absolute', top: -14, fontSize: 18 },
  progressLabel: { fontSize: 13, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4, marginTop: 4 },
  hudRight: { position: 'absolute', alignItems: 'flex-end', zIndex: 5 },
  mphText: { fontSize: 42, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  mphBoost: { color: '#FDE047' },
  mphUnit: { fontSize: 16 },
  speedTrack: { width: 130, height: 10, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 5, overflow: 'hidden', marginTop: 2 },
  speedFill: { height: '100%', backgroundColor: '#F59E0B' },
  hudBtns: { flexDirection: 'row', gap: 6, marginTop: 6 },
  roundBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  roundText: { fontSize: 17 },
  toast: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontWeight: '900', color: '#fff', fontSize: 18, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  countdown: { position: 'absolute', top: '30%', left: 0, right: 0, alignItems: 'center' },
  countdownText: { fontSize: 90, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 8 },
  countdownSub: { fontSize: 20, fontWeight: '800', color: '#fff' },
  joystick: {
    position: 'absolute', flexDirection: 'row', gap: 10, backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999, padding: 10, zIndex: 5,
  },
  steerBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F59E0B', borderBottomWidth: 5, borderBottomColor: '#B45309', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  steerText: { fontSize: 30, color: '#fff', fontWeight: '900' },
  rightBtns: { position: 'absolute', flexDirection: 'row', gap: 10, alignItems: 'center', zIndex: 5 },
  hornBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EF4444', borderBottomWidth: 5, borderBottomColor: '#991B1B', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  hornText: { fontSize: 28 },
  // Hold-to-BOOST: the biggest thumb button, labelled so a 3-year-old
  // can find it. Orange normally, glowing yellow while held.
  boostBtn: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#F97316', borderBottomWidth: 5, borderBottomColor: '#9A3412', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  boostBtnActive: { backgroundColor: '#EAB308', borderBottomColor: '#A16207' },
  boostText: { fontSize: 30 },
  boostLabel: { fontSize: 11, fontWeight: '900', color: '#fff' },
  pauseBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  pausedOverlay: { position: 'absolute', top: '28%', left: '28%', right: '28%', backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 8 },
  pausedText: { fontSize: 28, fontWeight: '900', color: '#1E293B' },
  resumeBtn: { backgroundColor: '#22C55E', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 24, marginTop: 14, borderBottomWidth: 4, borderBottomColor: '#15803D' },
  resumeText: { color: '#fff', fontSize: 20, fontWeight: '900' },
});

// The race: 3-lane scrolling road, big touch steering + swipe,
// collect stars to win, dodge cones / puddles / slow traffic cars.
//
// PACING FIX (from the web demo): everything on the road moves with ONE
// speed — the road scroll speed. Traffic is NOT slow: a new traffic
// car spawns roughly every 1–2 s (Low 2.0 s / Mid 1.5 s / High 1.05 s
// base, faster on later levels), 2 cars are already on the road at
// race start, and traffic comes in 5 colours. No long empty stretches.

import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions, PanResponder, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CarView } from '../components/CarView';
import { DriverFace, DriverViewMode } from '../components/DriverFace';
import type { Driver } from '../data/drivers';
import { LEVELS, STAR_POINTS } from '../data/levels';
import { TRAFFIC_COLORS, vehicleById } from '../data/skins';
import { music } from '../music';
import { isSfxEnabled, playSfx } from '../sfx';
import { DIFFICULTIES, DifficultyId, RaceResult } from '../types';

type Kind = 'star' | 'traffic' | 'cone' | 'puddle' | 'balloon';
interface Entity { id: number; kind: Kind; lane: number; y: number; color?: string }

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const ROAD_W = Math.min(340, SCREEN_W * 0.86);
const ROAD_X = (SCREEN_W - ROAD_W) / 2;
const LANE_W = ROAD_W / 3;
const PLAYER_Y = SCREEN_H - 250;
const TICK_MS = 30;

function laneCenter(lane: number): number {
  return ROAD_X + LANE_W * lane + LANE_W / 2;
}

interface Props {
  levelId: number;
  difficulty: DifficultyId;
  vehicleId: string;
  /** Selected cartoon driver — face peeks out of the car. */
  driver: Driver;
  /** 2D flat or 3D glossy look, chosen on the home page. */
  viewMode: DriverViewMode;
  skinColor: string;
  skinAccent: string;
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
  // props.skinColor / props.skinAccent are the equipped skin's colours
  // (resolved in App.tsx via skinById(profile.equippedSkin)).

  const [countdown, setCountdown] = useState(3);
  const [lane, setLane] = useState(1);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [stars, setStars] = useState(0);
  const [balloons, setBalloons] = useState(0);
  const [hearts, setHearts] = useState(diff.hearts);
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [roadOffset, setRoadOffset] = useState(0);
  const [flash, setFlash] = useState(false);
  const [toast, setToast] = useState('');

  const laneRef = useRef(1);
  const entitiesRef = useRef<Entity[]>([]);
  const starsRef = useRef(0);
  const balloonsRef = useRef(0);
  const heartsRef = useRef(diff.hearts);
  const scoreRef = useRef(0);
  const finishedRef = useRef(false);
  const idRef = useRef(1);
  const invulnerableUntil = useRef(0);

  // Timers (ms) for spawns — traffic has its OWN timer (the pacing fix).
  const trafficTimer = useRef(0);
  const starTimer = useRef(400);
  const obstacleTimer = useRef(1800);
  const balloonTimer = useRef(9000);

  const trafficInterval = diff.trafficIntervalMs * level.trafficFactor;
  // ONE speed for road + entities (pacing fix). Traffic moves at 90% of it
  // so it still feels like slower cars you overtake — but it arrives fast.
  const scrollSpeed = level.baseSpeed * diff.speedMul;

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
        else if (g.dy < -30) { /* swipe up = tiny speed boost, just for fun */ }
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
    });
  };

  const spawn = (kind: Kind, y = -80) => {
    const laneIdx = Math.floor(Math.random() * 3);
    const e: Entity = { id: idRef.current++, kind, lane: laneIdx, y };
    if (kind === 'traffic') {
      e.color = TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)];
    }
    entitiesRef.current = [...entitiesRef.current, e];
  };

  // Countdown, then start music + pre-spawn 2 traffic cars.
  useEffect(() => {
    if (countdown <= 0) {
      music.start();
      spawn('traffic', -120);
      spawn('traffic', -380);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  // Game loop.
  useEffect(() => {
    if (countdown > 0 || paused || finishedRef.current) return;
    const iv = setInterval(() => {
      const dt = TICK_MS / 1000;
      const dy = scrollSpeed * dt; // single scroll delta — pacing fix
      setRoadOffset((o) => (o + dy) % 56);

      // --- spawns ---
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

      // --- move + collide ---
      const now = Date.now();
      let nextStars = starsRef.current;
      let nextBalloons = balloonsRef.current;
      let nextHearts = heartsRef.current;
      let nextScore = scoreRef.current + Math.round(dy / 10);
      const kept: Entity[] = [];
      for (const e of entitiesRef.current) {
        const speed = e.kind === 'traffic' ? dy * 0.9 : dy;
        const y = e.y + speed;
        if (y > SCREEN_H + 100) continue;
        const hit = Math.abs(y - PLAYER_Y) < 62 && e.lane === laneRef.current;
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
        kept.push({ ...e, y });
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

  return (
    <LinearGradient colors={level.sky} style={styles.bg}>
      {/* HUD */}
      <View style={styles.hud}>
        <Text style={styles.hudText}>⭐ {stars}/{level.starGoal}</Text>
        <Text style={styles.hudText}>🏆 {score}</Text>
        <Text style={styles.hudText}>{'❤️'.repeat(Math.max(0, hearts))}</Text>
      </View>
      <Text style={styles.levelLabel}>{props.driver.faceEmoji} {props.driver.name} • {level.icon} {level.name} • {diff.label}</Text>

      {/* Road */}
      <View style={styles.roadWrap} {...pan.panHandlers}>
        <View style={[styles.road, { backgroundColor: level.road }]}>
          {/* checkered kerbs */}
          <View style={[styles.kerb, { left: 0 }]} />
          <View style={[styles.kerb, { right: 0 }]} />
          {/* dashed lane lines scrolling with the road */}
          {Array.from({ length: 9 }, (_, i) => (
            <View key={'a' + i} style={[styles.laneLine, { left: ROAD_W / 3 - 3, top: ((roadOffset + i * 56) % 504) - 56 }]} />
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <View key={'b' + i} style={[styles.laneLine, { left: (ROAD_W * 2) / 3 - 3, top: ((roadOffset + i * 56) % 504) - 56 }]} />
          ))}
          {/* roadside scenery */}
          <Text style={[styles.scenery, { left: -34, top: 60 }]}>{level.scenery[0]}</Text>
          <Text style={[styles.scenery, { right: -34, top: 220 }]}>{level.scenery[1]}</Text>
          <Text style={[styles.scenery, { left: -34, top: 400 }]}>{level.scenery[2]}</Text>

          {/* entities */}
          {entities.map((e) => (
            <View
              key={e.id}
              style={{ position: 'absolute', left: laneCenter(e.lane) - ROAD_X - 22, top: e.y, width: 44, alignItems: 'center' }}
            >
              {e.kind === 'traffic' ? (
                <View style={[styles.trafficCar, { backgroundColor: e.color }]}>
                  <Text style={{ fontSize: 22 }}>🚙</Text>
                </View>
              ) : (
                <Text style={{ fontSize: e.kind === 'star' ? 30 : 28 }}>{entityEmoji(e)}</Text>
              )}
            </View>
          ))}

          {/* player car — driver face peeks out above it */}
          <View style={{ position: 'absolute', left: laneCenter(lane) - ROAD_X - 38, top: PLAYER_Y }}>
            <View style={{ alignItems: 'center', marginBottom: -14, zIndex: 3 }}>
              <DriverFace driver={props.driver} mode={props.viewMode} size={52} />
            </View>
            <CarView color={props.skinColor} accent={props.skinAccent} emoji={vehicle.emoji} flashing={flash} mode={props.viewMode} />
          </View>

          {/* exhaust puffs */}
          <Text style={{ position: 'absolute', left: laneCenter(lane) - ROAD_X - 10, top: PLAYER_Y + 58, fontSize: 16 }}>💨</Text>
        </View>
      </View>

      {toast ? <Text style={styles.toast}>{toast}</Text> : null}
      {countdown > 0 && (
        <View style={styles.countdown}>
          <Text style={styles.countdownText}>{countdown}</Text>
          <Text style={styles.countdownSub}>Get ready…</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.steerBtn} onPress={() => moveLane(-1)}><Text style={styles.steerText}>◀</Text></TouchableOpacity>
        <TouchableOpacity
          style={styles.hornBtn}
          onPress={() => { playSfx('horn'); setToast('📣 Beep beep!'); setTimeout(() => setToast(''), 900); }}
        >
          <Text style={styles.hornText}>📣 Horn</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.steerBtn} onPress={() => moveLane(1)}><Text style={styles.steerText}>▶</Text></TouchableOpacity>
      </View>
      <View style={styles.smallRow}>
        <TouchableOpacity style={styles.smallBtn} onPress={() => setPaused((p) => !p)}>
          <Text style={styles.smallText}>{paused ? '▶ Resume' : '⏸ Pause'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallBtn} onPress={props.onToggleMusic}>
          <Text style={styles.smallText}>{props.musicOn ? '🎵 Music: On' : '🎵 Music: Off'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallBtn} onPress={props.onToggleSfx}>
          <Text style={styles.smallText}>{isSfxEnabled() ? '🔊 Sound: On' : '🔊 Sound: Off'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallBtn} onPress={props.onQuit}>
          <Text style={styles.smallText}>🏠 Home</Text>
        </TouchableOpacity>
      </View>
      {paused && (
        <View style={styles.pausedOverlay}><Text style={styles.pausedText}>⏸ Paused — tap Resume to keep racing!</Text></View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, paddingTop: 44 },
  hud: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.9)', marginHorizontal: 14, borderRadius: 14, padding: 10 },
  hudText: { fontSize: 17, fontWeight: '900', color: '#1E293B' },
  levelLabel: { textAlign: 'center', fontWeight: '800', color: '#1E293B', marginTop: 8, fontSize: 15 },
  roadWrap: { flex: 1, alignItems: 'center', marginTop: 8 },
  road: { width: ROAD_W, flex: 1, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  kerb: { position: 'absolute', top: 0, bottom: 0, width: 10, backgroundColor: '#EF4444', opacity: 0.85 },
  laneLine: { position: 'absolute', width: 6, height: 34, backgroundColor: '#FDE68A', borderRadius: 3 },
  scenery: { position: 'absolute', fontSize: 30 },
  trafficCar: { width: 52, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toast: { textAlign: 'center', fontWeight: '800', color: '#B45309', fontSize: 16, marginTop: 4 },
  countdown: { position: 'absolute', top: '38%', left: 0, right: 0, alignItems: 'center' },
  countdownText: { fontSize: 90, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 8 },
  countdownSub: { fontSize: 20, fontWeight: '800', color: '#fff' },
  controls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  steerBtn: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  steerText: { fontSize: 36, color: '#fff', fontWeight: '900' },
  hornBtn: { backgroundColor: '#EF4444', borderRadius: 20, paddingVertical: 16, paddingHorizontal: 18 },
  hornText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  smallRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 12, paddingBottom: 18, flexWrap: 'wrap', gap: 6 },
  smallBtn: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 },
  smallText: { fontWeight: '800', color: '#1E293B' },
  pausedOverlay: { position: 'absolute', top: '45%', left: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 18 },
  pausedText: { textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#1E293B' },
});

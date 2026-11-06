// A glossy die-cast car drawn with styled Views — no images at all.
// Sleek direction (approved mockup): layered gloss highlights, chrome
// wheels with hubcaps, neon underglow in 3D, and a friendly face
// (eyes + smile) on the front view — the car is a character, not a
// flat box with an emoji on top. No emoji is ever drawn on the body.
//
// Every vehicle has its OWN shape (fixes "every vehicle is the same
// sedan"): the shape comes from `vehicleId`, not from the emoji.
// - bus / schoolbus: tall, wide, flat roof, a row of windows.
// - monster: wide body, giant wheels, raised body.
// - rickshaw: narrow, rounded canopy, small wheels.
// - icecream: boxy truck + ice-cream cone on the roof.
// - race: low, sleek, big spoiler.
// - taxi: sedan + TAXI sign on the roof. fire: boxy truck + ladder.
//   ambulance: boxy van + red cross. duck: round body + beak.
//   police: sedan + light bar. car: plain sedan.
// The same shape is used in all three angles (front / rear / top),
// so the home hero, the garage and the race car are one car.
//
// Colour rule (one body-colour source of truth): `color` is the body
// colour (the vehicle's own colour, or an explicitly equipped paint).
// `stripe` comes from the equipped skin. A skin never changes the
// body colour — it only changes the stripe + its Speed stat.
// `flashing` no longer fades the car out: it shakes it (see RaceScreen,
// which passes a shake offset instead of relying on opacity here).

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type VehicleShape = 'sedan' | 'bus' | 'monster' | 'rickshaw' | 'truck' | 'race' | 'round';

export interface ShapeSpec {
  shape: VehicleShape;
  /** Body height as a fraction of width (rear view). */
  bodyH: number;
  /** Body width as a fraction of width (rear view). */
  bodyW: number;
  /** Wheel diameter as a fraction of width. */
  wheel: number;
  /** Top-view body length as a multiple of width. */
  topLen: number;
  /** Extra thing on the roof (rear + top views). */
  roof?: 'cone' | 'taxi' | 'ladder' | 'cross' | 'lights' | 'beak' | 'spoiler';
}

export function shapeForVehicle(vehicleId: string): ShapeSpec {
  switch (vehicleId) {
    case 'bus': return { shape: 'bus', bodyH: 0.78, bodyW: 1.0, wheel: 0.22, topLen: 3.2 };
    case 'schoolbus': return { shape: 'bus', bodyH: 0.78, bodyW: 1.0, wheel: 0.22, topLen: 3.2, roof: 'lights' };
    case 'monster': return { shape: 'monster', bodyH: 0.58, bodyW: 1.08, wheel: 0.36, topLen: 1.8 };
    case 'rickshaw': return { shape: 'rickshaw', bodyH: 0.66, bodyW: 0.72, wheel: 0.18, topLen: 1.4 };
    case 'icecream': return { shape: 'truck', bodyH: 0.72, bodyW: 1.0, wheel: 0.22, topLen: 2.2, roof: 'cone' };
    case 'fire': return { shape: 'truck', bodyH: 0.72, bodyW: 1.0, wheel: 0.22, topLen: 2.3, roof: 'ladder' };
    case 'ambulance': return { shape: 'truck', bodyH: 0.72, bodyW: 0.98, wheel: 0.22, topLen: 2.2, roof: 'cross' };
    case 'race': return { shape: 'race', bodyH: 0.5, bodyW: 1.0, wheel: 0.2, topLen: 1.9, roof: 'spoiler' };
    case 'taxi': return { shape: 'sedan', bodyH: 0.58, bodyW: 0.96, wheel: 0.2, topLen: 1.9, roof: 'taxi' };
    case 'police': return { shape: 'sedan', bodyH: 0.58, bodyW: 0.96, wheel: 0.2, topLen: 1.9, roof: 'lights' };
    case 'duck': return { shape: 'round', bodyH: 0.62, bodyW: 0.92, wheel: 0.2, topLen: 1.6, roof: 'beak' };
    default: return { shape: 'sedan', bodyH: 0.58, bodyW: 0.96, wheel: 0.2, topLen: 1.9 };
  }
}

interface Props {
  color: string;
  accent: string;
  emoji?: string;
  width?: number;
  /** Brief hit reaction — the car shakes (handled by the parent via
      `shakeX`); this prop is kept for compat and must NOT fade the car. */
  flashing?: boolean;
  /** Horizontal shake offset in px after a bump (0 = none). */
  shakeX?: number;
  /** '2d' = flat cartoon (small shine, no shadow); '3d' = glossy,
      bigger wheels with hubcaps, stronger shadow (matches DriverFace). */
  mode?: '2d' | '3d';
  angle?: 'front' | 'rear' | 'top';
  /** Racing-stripe colour (from the equipped skin). */
  stripe?: string;
  /** Vehicle id — decides the body shape. Defaults to a plain sedan. */
  vehicleId?: string;
  /** Show the boost flame inside the car box (rear view only). */
  boosting?: boolean;
}

function RoofBit({ roof, width, accent }: { roof?: string; width: number; accent: string }) {
  if (!roof) return null;
  if (roof === 'cone') {
    // Drawn ice-cream cone: tan triangle + pink scoop (no emoji).
    return (
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: width * 0.16, height: width * 0.16, borderRadius: width * 0.08, backgroundColor: '#F9A8D4', borderWidth: 1, borderColor: '#BE185D' }} />
        <View style={{ width: 0, height: 0, borderLeftWidth: width * 0.09, borderRightWidth: width * 0.09, borderTopWidth: width * 0.16, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#D97706', marginTop: -2 }} />
      </View>
    );
  }
  if (roof === 'taxi') {
    return (
      <View style={{ backgroundColor: '#FACC15', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: '#78350F' }}>
        <Text style={{ fontSize: width * 0.09, fontWeight: '900', color: '#78350F' }}>TAXI</Text>
      </View>
    );
  }
  if (roof === 'ladder') {
    return <View style={{ width: width * 0.5, height: 6, backgroundColor: '#CBD5E1', borderRadius: 3, borderWidth: 1, borderColor: '#64748B' }} />;
  }
  if (roof === 'cross') {
    return (
      <View style={{ width: width * 0.16, height: width * 0.16, backgroundColor: '#EF4444', borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: width * 0.11 }}>+</Text>
      </View>
    );
  }
  if (roof === 'lights') {
    return (
      <View style={{ flexDirection: 'row', gap: 3 }}>
        <View style={{ width: width * 0.11, height: width * 0.07, backgroundColor: '#EF4444', borderRadius: 3 }} />
        <View style={{ width: width * 0.11, height: width * 0.07, backgroundColor: '#3B82F6', borderRadius: 3 }} />
      </View>
    );
  }
  if (roof === 'beak') {
    return <View style={{ width: width * 0.2, height: width * 0.09, backgroundColor: '#FB923C', borderRadius: 999 }} />;
  }
  return null;
}

export const CarView = React.memo(function CarView({ color, accent, emoji, width = 76, flashing, shakeX = 0, mode = '2d', angle = 'front', stripe = '#FFFFFF', vehicleId = 'car', boosting }: Props) {
  const is3d = mode === '3d';
  const spec = shapeForVehicle(vehicleId);
  const wheel = Math.max(14, width * spec.wheel);
  const shake = { transform: [{ translateX: shakeX }] };

  if (angle === 'rear') {
    const bodyH = width * spec.bodyH;
    const bodyW = width * spec.bodyW;
    const h = bodyH + width * 0.16 + wheel * 0.5; // window + body + wheels, all inside the box
    const isBus = spec.shape === 'bus';
    return (
      <View style={[styles.car, { width, height: h }, shake]}>
        {is3d && <View style={[styles.carShadow, { width: width * 0.92, bottom: 0 }]} />}
        {/* roof bit (cone / TAXI / ladder / cross / light bar / beak) */}
        {spec.roof && spec.roof !== 'spoiler' && (
          <View style={{ alignItems: 'center', marginBottom: -7, zIndex: 2 }}><RoofBit roof={spec.roof} width={width} accent={accent} /></View>
        )}
        {/* spoiler (race car) or flat bus roof */}
        {spec.roof === 'spoiler' && <View style={[styles.spoiler, { backgroundColor: accent, width: width * 0.96 }]} />}
        {isBus && <View style={[styles.busRoof, { backgroundColor: accent, width: bodyW }]} />}
        {/* rear window — tall on a bus, with window panes */}
        <View style={[styles.rearWindow, { width: bodyW * (isBus ? 0.86 : 0.62), height: isBus ? 30 : 24 }]}>
          {isBus ? (
            <View style={{ flexDirection: 'row', gap: 3, padding: 3 }}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={{ flex: 1, height: 20, backgroundColor: '#7DD3FC', borderRadius: 3 }} />
              ))}
            </View>
          ) : null}
        </View>
        {/* body */}
        <View style={[styles.rearBody, { backgroundColor: color, width: bodyW, height: bodyH, borderRadius: spec.shape === 'round' ? 22 : 14 }, is3d && styles.body3d]}>
          {spec.shape !== 'bus' && <View style={[styles.rearStripe, { backgroundColor: stripe }]} />}
          {spec.shape !== 'bus' && <View style={[styles.rearStripe, { backgroundColor: stripe, left: '70%' }]} />}
          {isBus && <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>{[0, 1, 2].map((i) => (<View key={i} style={{ width: 16, height: 10, backgroundColor: '#FEF08A', borderRadius: 3 }} />))}</View>}
          {/* Gloss: top highlight bar + diagonal shine sweep — the
              die-cast look. No emoji on the body. */}
          <View style={[styles.shine, styles.shineStrong]} />
          <View style={[styles.shineDiag, { width: bodyW * 0.28 }]} />
          <View style={[styles.bottomShade, { width: bodyW }]} />
        </View>
        {/* tail lights — chrome-rimmed, glowing */}
        <View style={[styles.tailLight, { left: Math.max(2, width * 0.04) }]} />
        <View style={[styles.tailLight, { right: Math.max(2, width * 0.04) }]} />
        {is3d && <View style={[styles.underglow, { width: width * 0.8, backgroundColor: accent }]} />}
        {/* boost flame — INSIDE the car box, under the bumper */}
        {boosting ? <Text style={{ position: 'absolute', bottom: wheel * 0.4, alignSelf: 'center', fontSize: width * 0.22 }}>🔥</Text> : null}
        {/* wheels — inside the box, never below it */}
        <View style={[styles.rearWheel, { left: 2, width: wheel, height: wheel, borderRadius: wheel / 2, bottom: 0 }]}>
          {is3d && <View style={[styles.hubcap, { width: wheel * 0.42, height: wheel * 0.42, borderRadius: wheel * 0.21 }]} />}
        </View>
        <View style={[styles.rearWheel, { right: 2, width: wheel, height: wheel, borderRadius: wheel / 2, bottom: 0 }]}>
          {is3d && <View style={[styles.hubcap, { width: wheel * 0.42, height: wheel * 0.42, borderRadius: wheel * 0.21 }]} />}
        </View>
        {spec.shape === 'monster' && (
          <>
            <View style={[styles.rearWheel, { left: width * 0.3, width: wheel * 0.7, height: wheel * 0.7, borderRadius: wheel * 0.35, bottom: 0 }]} />
            <View style={[styles.rearWheel, { right: width * 0.3, width: wheel * 0.7, height: wheel * 0.7, borderRadius: wheel * 0.35, bottom: 0 }]} />
          </>
        )}
      </View>
    );
  }

  if (angle === 'top') {
    const h = width * spec.topLen;
    const narrow = spec.shape === 'rickshaw' ? 0.8 : 1;
    return (
      <View style={[styles.car, { width: width * narrow, height: h }, shake]}>
        {/* side wheels — bigger on a monster truck */}
        {[0.14, 0.62].map((t) => (
          <React.Fragment key={t}>
            <View style={[styles.topWheel, { left: -7, top: h * t, width: spec.shape === 'monster' ? 20 : 12, height: spec.shape === 'monster' ? 34 : 22 }]} />
            <View style={[styles.topWheel, { right: -7, top: h * t, width: spec.shape === 'monster' ? 20 : 12, height: spec.shape === 'monster' ? 34 : 22 }]} />
          </React.Fragment>
        ))}
        <View style={[styles.topBody, { backgroundColor: color, width: width * narrow, height: h, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' }, is3d && styles.body3d]}>
          {spec.shape !== 'bus' && <View style={[styles.topStripe, { backgroundColor: stripe, left: width * 0.32 }]} />}
          {spec.shape !== 'bus' && <View style={[styles.topStripe, { backgroundColor: stripe, left: width * 0.56 }]} />}
          <View style={[styles.shine, styles.shineStrong]} />
          {/* windshield + roof + rear window */}
          <View style={[styles.topGlass, { top: h * 0.14 }]} />
          <View style={[styles.topRoof, { backgroundColor: accent, top: h * 0.4, height: spec.shape === 'bus' ? '34%' : '22%' }]}>
            {spec.roof && spec.roof !== 'spoiler' ? <RoofBit roof={spec.roof} width={width * 1.4} accent={accent} /> : null}
          </View>
          <View style={[styles.topGlass, { top: h * 0.72 }]} />
        </View>
      </View>
    );
  }

  // Front view (home hero): same shape family as the rear view.
  const h = width * (spec.shape === 'bus' ? 0.95 : spec.shape === 'monster' ? 0.8 : 0.72);
  const wheelF = is3d ? wheel : wheel * 0.85;
  return (
    <View style={[styles.car, { width, height: h }, shake, is3d && styles.car3d]}>
      {is3d && <View style={[styles.carShadow, { width: width * 0.9, bottom: 0 }]} />}
      <View style={[styles.cabin, { backgroundColor: '#1E293B', width: width * (spec.shape === 'bus' ? 0.86 : 0.58), height: spec.shape === 'bus' ? 34 : 30 }]}>
        {spec.roof && spec.roof !== 'spoiler' ? (
          <RoofBit roof={spec.roof} width={width} accent={accent} />
        ) : (
          /* The car has a face: eyes + smile on the windshield. */
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: width * 0.08 }}>
            <View style={[styles.faceEye, { width: width * 0.09, height: width * 0.11, borderRadius: width * 0.045 }]} />
            <View style={[styles.faceSmile, { width: width * 0.16, height: width * 0.07, borderBottomWidth: 3, borderBottomColor: '#fff', borderRadius: width * 0.08 }]} />
            <View style={[styles.faceEye, { width: width * 0.09, height: width * 0.11, borderRadius: width * 0.045 }]} />
          </View>
        )}
      </View>
      <View style={[styles.body, { backgroundColor: color, width, height: h * 0.52, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' }, styles.body3d]}>
        <View style={[styles.shine, styles.shineStrong]} />
        <View style={[styles.shineDiag, { width: width * 0.3 }]} />
        <View style={[styles.light, { left: 6 }]} />
        <View style={[styles.light, { right: 6 }]} />
        <View style={[styles.bottomShade, { width }]} />
      </View>
      {is3d && <View style={[styles.underglow, { width: width * 0.8, backgroundColor: accent }]} />}
      <View style={[styles.wheel, { left: 4, width: wheelF, height: wheelF, borderRadius: wheelF / 2, bottom: 0 }]}>
        <View style={[styles.hubcap, { width: wheelF * 0.46, height: wheelF * 0.46, borderRadius: wheelF * 0.23 }]} />
      </View>
      <View style={[styles.wheel, { right: 4, width: wheelF, height: wheelF, borderRadius: wheelF / 2, bottom: 0 }]}>
        <View style={[styles.hubcap, { width: wheelF * 0.46, height: wheelF * 0.46, borderRadius: wheelF * 0.23 }]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  car: { position: 'relative', alignItems: 'center' },
  car3d: { transform: [{ rotate: '-1deg' }] },
  carShadow: {
    position: 'absolute', bottom: 0, height: 8, backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 999, zIndex: 0,
  },
  cabin: {
    height: 30, borderTopLeftRadius: 14, borderTopRightRadius: 14,
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  body: {
    borderRadius: 14, marginTop: -6, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
  body3d: { shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  shine: {
    position: 'absolute', top: 3, left: 8, right: 8, height: 7,
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 4,
  },
  shine3d: { height: 10, backgroundColor: 'rgba(255,255,255,0.7)' },
  shineStrong: { height: 9, backgroundColor: 'rgba(255,255,255,0.75)' },
  shineDiag: {
    position: 'absolute', top: 0, bottom: 0, left: '12%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    transform: [{ rotate: '18deg' }],
  },
  bottomShade: {
    position: 'absolute', bottom: 0, left: 0, height: 8,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  underglow: {
    position: 'absolute', bottom: -3, alignSelf: 'center', height: 6,
    borderRadius: 999, opacity: 0.55, zIndex: 0,
  },
  faceEye: { backgroundColor: '#fff' },
  faceSmile: { marginTop: 6 }, 
  light: {
    position: 'absolute', bottom: 5, width: 12, height: 8,
    backgroundColor: '#FEF08A', borderRadius: 4,
  },
  wheel: {
    position: 'absolute', bottom: 0, backgroundColor: '#1F2937',
    borderWidth: 3, borderColor: '#9CA3AF', zIndex: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  hubcap: {
    backgroundColor: '#E5E7EB', borderWidth: 2, borderColor: '#9CA3AF',
    shadowColor: '#fff', shadowOpacity: 0.6, shadowRadius: 2,
  },
  // Rear view
  spoiler: { height: 10, borderRadius: 5, marginBottom: 2, zIndex: 1 },
  busRoof: { height: 8, borderRadius: 4, marginBottom: 2, zIndex: 1 },
  rearWindow: {
    height: 26, backgroundColor: '#1E293B', borderTopLeftRadius: 12,
    borderTopRightRadius: 12, zIndex: 1, marginBottom: -4, overflow: 'hidden',
  },
  rearBody: {
    borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
  },
  rearStripe: { position: 'absolute', top: 0, bottom: 0, left: '18%', width: '12%', opacity: 0.9 },
  tailLight: {
    position: 'absolute', bottom: 8, width: 22, height: 10,
    backgroundColor: '#EF4444', borderRadius: 5, zIndex: 2,
  },
  rearWheel: {
    position: 'absolute', bottom: 0, backgroundColor: '#1F2937',
    borderWidth: 3, borderColor: '#9CA3AF', zIndex: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  // Top view
  topBody: { borderRadius: 18, overflow: 'hidden', position: 'relative' },
  topStripe: { position: 'absolute', top: 0, bottom: 0, width: '12%', opacity: 0.9 },
  topGlass: {
    position: 'absolute', left: '18%', right: '18%', height: '14%',
    backgroundColor: '#7DD3FC', borderRadius: 8,
  },
  topRoof: {
    position: 'absolute', left: '14%', right: '14%', height: '22%',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  topWheel: {
    position: 'absolute', width: 12, height: 22, backgroundColor: '#1F2937',
    borderRadius: 6, zIndex: 2,
  },
});

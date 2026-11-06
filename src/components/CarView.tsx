// A glossy little car drawn with styled Views — no images at all.
// `color` comes from the equipped skin; `emoji` is the vehicle face
// (🚗 / 🛺 / 🚌) shown on the roof so kids recognise their vehicle.
//
// Three angles (style inspiration: the reference race screenshots):
// - 'front' — the original side/front cartoon car (home cards).
// - 'rear'  — rear view from behind: spoiler, rear window, red tail
//   lights, exhaust — the player car in the landscape race.
// - 'top'   — top-down view with white racing stripes down the
//   middle (the 12-colour sports-car sheet) — used in the garage.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  color: string;
  accent: string;
  emoji: string;
  width?: number;
  /** Brief red flash after a bump. */
  flashing?: boolean;
  /** '2d' = flat cartoon (small shine, no shadow); '3d' = glossy,
      bigger wheels with hubcaps, stronger shadow (matches DriverFace). */
  mode?: '2d' | '3d';
  angle?: 'front' | 'rear' | 'top';
  /** Racing-stripe colour for the top view. */
  stripe?: string;
}

export function CarView({ color, accent, emoji, width = 76, flashing, mode = '2d', angle = 'front', stripe = '#FFFFFF' }: Props) {
  const is3d = mode === '3d';

  if (angle === 'rear') {
    const h = width * 0.62;
    return (
      <View style={[styles.car, { width, height: h, opacity: flashing ? 0.45 : 1 }]}>
        {is3d && <View style={[styles.carShadow, { width: width * 0.92, bottom: -12 }]} />}
        {/* spoiler */}
        <View style={[styles.spoiler, { backgroundColor: accent, width: width * 0.9 }]} />
        {/* rear window */}
        <View style={[styles.rearWindow, { width: width * 0.62 }]} />
        {/* body with racing stripe */}
        <View style={[styles.rearBody, { backgroundColor: color, width, height: h * 0.62 }, is3d && styles.body3d]}>
          <View style={[styles.rearStripe, { backgroundColor: stripe }]} />
          <View style={[styles.rearStripe, { backgroundColor: stripe, left: undefined, right: width * 0.18 }]} />
          <View style={[styles.shine, is3d && styles.shine3d]} />
          <Text style={{ fontSize: width * 0.22, textAlign: 'center' }}>{emoji}</Text>
        </View>
        {/* tail lights */}
        <View style={[styles.tailLight, { left: 6 }]} />
        <View style={[styles.tailLight, { right: 6 }]} />
        {/* exhaust puffs */}
        <Text style={{ position: 'absolute', bottom: -18, left: width * 0.2, fontSize: 14 }}>💨</Text>
        {/* big rear wheels */}
        <View style={[styles.rearWheel, { left: 2, width: 26, height: 26, borderRadius: 13 }]} />
        <View style={[styles.rearWheel, { right: 2, width: 26, height: 26, borderRadius: 13 }]} />
      </View>
    );
  }

  if (angle === 'top') {
    const h = width * 1.9;
    return (
      <View style={[styles.car, { width, height: h, opacity: flashing ? 0.45 : 1 }]}>
        {/* side wheels */}
        {[0.14, 0.62].map((t) => (
          <React.Fragment key={t}>
            <View style={[styles.topWheel, { left: -7, top: h * t }]} />
            <View style={[styles.topWheel, { right: -7, top: h * t }]} />
          </React.Fragment>
        ))}
        <View style={[styles.topBody, { backgroundColor: color, width, height: h }, is3d && styles.body3d]}>
          {/* racing stripes down the middle */}
          <View style={[styles.topStripe, { backgroundColor: stripe, left: width * 0.32 }]} />
          <View style={[styles.topStripe, { backgroundColor: stripe, left: width * 0.56 }]} />
          <View style={[styles.shine, is3d && styles.shine3d]} />
          {/* windshield + roof + rear window */}
          <View style={[styles.topGlass, { top: h * 0.16 }]} />
          <View style={[styles.topRoof, { backgroundColor: accent, top: h * 0.42 }]}>
            <Text style={{ fontSize: width * 0.32, textAlign: 'center' }}>{emoji}</Text>
          </View>
          <View style={[styles.topGlass, { top: h * 0.72 }]} />
        </View>
      </View>
    );
  }

  const h = width * 0.72;
  const wheel = is3d ? 24 : 20;
  return (
    <View style={[styles.car, { width, height: h, opacity: flashing ? 0.45 : 1 }, is3d && styles.car3d]}>
      {is3d && <View style={[styles.carShadow, { width: width * 0.9 }]} />}
      <View style={[styles.cabin, { backgroundColor: accent, width: width * 0.58 }]}>
        <Text style={{ fontSize: width * 0.3 }}>{emoji}</Text>
      </View>
      <View style={[styles.body, { backgroundColor: color, width, height: h * 0.52 }, is3d && styles.body3d]}>
        <View style={[styles.shine, is3d && styles.shine3d]} />
        <View style={[styles.light, { left: 6 }]} />
        <View style={[styles.light, { right: 6 }]} />
      </View>
      <View style={[styles.wheel, { left: 4, width: wheel, height: wheel, borderRadius: wheel / 2 }]}>
        {is3d && <View style={styles.hubcap} />}
      </View>
      <View style={[styles.wheel, { right: 4, width: wheel, height: wheel, borderRadius: wheel / 2 }]}>
        {is3d && <View style={styles.hubcap} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  car: { position: 'relative', alignItems: 'center' },
  car3d: { transform: [{ rotate: '-1deg' }] },
  carShadow: {
    position: 'absolute', bottom: -10, height: 8, backgroundColor: 'rgba(0,0,0,0.2)',
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
  light: {
    position: 'absolute', bottom: 5, width: 12, height: 8,
    backgroundColor: '#FEF08A', borderRadius: 4,
  },
  wheel: {
    position: 'absolute', bottom: -6, backgroundColor: '#1F2937',
    borderWidth: 3, borderColor: '#9CA3AF', zIndex: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  hubcap: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  // Rear view
  spoiler: { height: 10, borderRadius: 5, marginBottom: 2, zIndex: 1 },
  rearWindow: {
    height: 26, backgroundColor: '#1E293B', borderTopLeftRadius: 12,
    borderTopRightRadius: 12, zIndex: 1, marginBottom: -4,
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
    position: 'absolute', bottom: -8, backgroundColor: '#1F2937',
    borderWidth: 3, borderColor: '#9CA3AF', zIndex: 2,
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

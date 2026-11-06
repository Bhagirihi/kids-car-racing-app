// A glossy little car drawn with styled Views — no images at all.
// `color` comes from the equipped skin; `emoji` is the vehicle face
// (🚗 / 🛺 / 🚌) shown on the roof so kids recognise their vehicle.

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
}

export function CarView({ color, accent, emoji, width = 76, flashing, mode = '2d' }: Props) {
  const is3d = mode === '3d';
  const h = width * 0.72;
  const wheel = is3d ? 24 : 20;
  return (
    <View style={[styles.car, { width, height: h, opacity: flashing ? 0.45 : 1 }, is3d && styles.car3d]}>
      {/* soft shadow under the car (3D only) */}
      {is3d && <View style={[styles.carShadow, { width: width * 0.9 }]} />}
      {/* roof / cabin */}
      <View style={[styles.cabin, { backgroundColor: accent, width: width * 0.58 }]}>
        <Text style={{ fontSize: width * 0.3 }}>{emoji}</Text>
      </View>
      {/* body — glossy: bright top strip (bigger in 3D) */}
      <View style={[styles.body, { backgroundColor: color, width, height: h * 0.52 }, is3d && styles.body3d]}>
        <View style={[styles.shine, is3d && styles.shine3d]} />
        <View style={[styles.light, { left: 6 }]} />
        <View style={[styles.light, { right: 6 }]} />
      </View>
      {/* wheels */}
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
});

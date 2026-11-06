// A cartoon driver face drawn with styled Views + LinearGradient —
// no images. Two looks, switched by `mode`:
//   2D — flat cartoon front view: flat colours, simple shapes, no
//        shadows, straight on (like the "Kids games for boys" banner).
//   3D — glossy, angled view: gradient face, highlight gloss, bigger
//        eyes with sparkle dots, pink cheeks, soft drop shadow and a
//        slight tilt (like the police-dog close-up).
// The same component renders the card preview, the driver peeking out
// of the car in the race, and the face on the results screen.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Driver } from '../data/drivers';

export type DriverViewMode = '2d' | '3d';

interface Props {
  driver: Driver;
  mode: DriverViewMode;
  size?: number;
}

export const DriverFace = React.memo(function DriverFace({ driver, mode, size = 84 }: Props) {
  const is3d = mode === '3d';
  const S = size;
  const face = S * 0.86; // face circle diameter
  const eye = S * 0.2;
  const pupil = S * 0.1;

  // Hat per driver — a simple shape on top of the face.
  const hat = (
    <>
      {driver.hat === 'police' && (
        <View style={[styles.hatPolice, { width: S * 0.72, height: S * 0.26, backgroundColor: driver.hatColor, top: -S * 0.02 }]}>
          <View style={[styles.hatBadge, { backgroundColor: driver.hatAccent }]}>
            <View style={styles.starDot} />
          </View>
          <View style={[styles.hatBrim, { backgroundColor: '#172554', width: S * 0.8 }]} />
        </View>
      )}
      {driver.hat === 'fire' && (
        <View style={[styles.hatDome, { width: S * 0.76, height: S * 0.3, backgroundColor: driver.hatColor, top: -S * 0.02 }]}>
          <View style={[styles.hatBadge, { backgroundColor: driver.hatAccent }]} />
          <View style={[styles.hatBrim, { backgroundColor: '#7F1D1D', width: S * 0.84 }]} />
        </View>
      )}
      {driver.hat === 'nurse' && (
        <View style={[styles.hatNurse, { width: S * 0.6, height: S * 0.24, backgroundColor: driver.hatColor, top: -S * 0.01 }]}>
          <View style={[styles.crossV, { backgroundColor: driver.hatAccent }]} />
          <View style={[styles.crossH, { backgroundColor: driver.hatAccent }]} />
        </View>
      )}
      {driver.hat === 'race' && (
        <View style={[styles.hatDome, { width: S * 0.74, height: S * 0.28, backgroundColor: driver.hatColor, top: -S * 0.02 }]}>
          <View style={[styles.hatStripe, { backgroundColor: driver.hatAccent }]} />
        </View>
      )}
    </>
  );

  const faceInner = (
    <>
      {/* muzzle / beak */}
      <View
        style={[
          styles.muzzle,
          {
            width: S * 0.52,
            height: S * 0.3,
            backgroundColor: driver.muzzle,
            bottom: S * 0.06,
          },
        ]}
      />
      {/* eyes */}
      <View style={[styles.eye, { width: eye, height: eye * 1.15, left: S * 0.16, top: S * 0.3 }]}>
        <View style={[styles.pupil, { width: pupil, height: pupil * 1.15 }]} />
        <View style={[styles.sparkle, { width: S * 0.045, height: S * 0.045, top: 2, left: 2 }]} />
      </View>
      <View style={[styles.eye, { width: eye, height: eye * 1.15, right: S * 0.16, top: S * 0.3 }]}>
        <View style={[styles.pupil, { width: pupil, height: pupil * 1.15 }]} />
        <View style={[styles.sparkle, { width: S * 0.045, height: S * 0.045, top: 2, left: 2 }]} />
      </View>
      {/* nose */}
      <View style={[styles.nose, { width: S * 0.16, height: S * 0.1, top: S * 0.52 }]} />
      {/* smile */}
      <View style={[styles.smile, { width: S * 0.3, height: S * 0.14, borderBottomWidth: Math.max(2, S * 0.035), top: S * 0.58 }]} />
      {/* cheeks — stronger in 3D */}
      <View style={[styles.cheek, { width: S * 0.13, height: S * 0.09, left: S * 0.08, top: S * 0.52, opacity: is3d ? 0.75 : 0.4 }]} />
      <View style={[styles.cheek, { width: S * 0.13, height: S * 0.09, right: S * 0.08, top: S * 0.52, opacity: is3d ? 0.75 : 0.4 }]} />
      {/* 3D gloss highlight */}
      {is3d && <View style={[styles.gloss, { width: S * 0.22, height: S * 0.14, top: S * 0.1, left: S * 0.12 }]} />}
      {hat}
    </>
  );

  return (
    <View style={[styles.wrap, { width: S, height: S * 1.04 }, is3d && styles.wrap3d]}>
      {/* soft drop shadow under the face (3D only) */}
      {is3d && <View style={[styles.dropShadow, { width: S * 0.72, height: S * 0.1, bottom: -S * 0.02 }]} />}
      {/* mane behind the face (Leo) */}
      {driver.mane && (
        <View style={[styles.mane, { width: S * 0.98, height: S * 0.98, backgroundColor: driver.mane, top: S * 0.02 }]} />
      )}
      {/* ears */}
      {driver.ears === 'round' && (
        <>
          <View style={[styles.earRound, { width: S * 0.26, height: S * 0.3, backgroundColor: driver.ear, left: S * 0.02, top: S * 0.04, transform: [{ rotate: '-24deg' }] }]} />
          <View style={[styles.earRound, { width: S * 0.26, height: S * 0.3, backgroundColor: driver.ear, right: S * 0.02, top: S * 0.04, transform: [{ rotate: '24deg' }] }]} />
        </>
      )}
      {driver.ears === 'long' && (
        <>
          <View style={[styles.earLong, { width: S * 0.18, height: S * 0.48, backgroundColor: driver.ear, left: S * 0.14, top: -S * 0.14, transform: [{ rotate: '-12deg' }] }]} />
          <View style={[styles.earLong, { width: S * 0.18, height: S * 0.48, backgroundColor: driver.ear, right: S * 0.14, top: -S * 0.14, transform: [{ rotate: '12deg' }] }]} />
        </>
      )}
      {/* duck tuft */}
      {driver.ears === 'none' && (
        <View style={[styles.tuft, { width: S * 0.14, height: S * 0.14, backgroundColor: driver.fur, top: S * 0.02 }]} />
      )}
      {/* face — flat colour in 2D, gradient in 3D */}
      {is3d ? (
        <LinearGradient
          colors={[driver.furLight, driver.fur]}
          style={[styles.face, { width: face, height: face, borderRadius: face / 2, top: S * 0.08 }]}
        >
          {faceInner}
        </LinearGradient>
      ) : (
        <View style={[styles.face, { width: face, height: face, borderRadius: face / 2, backgroundColor: driver.fur, top: S * 0.08 }]}>
          {faceInner}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { position: 'relative', alignItems: 'center' },
  // 3D: slight tilt + lift, like the close-up art.
  wrap3d: { transform: [{ rotate: '-3deg' }] },
  dropShadow: {
    position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 999, zIndex: 0,
  },
  mane: { position: 'absolute', borderRadius: 999, zIndex: 0 },
  earRound: { position: 'absolute', borderRadius: 999, zIndex: 1 },
  earLong: { position: 'absolute', borderRadius: 999, zIndex: 1 },
  tuft: { position: 'absolute', borderRadius: 999, zIndex: 1 },
  face: {
    position: 'absolute', alignItems: 'center', zIndex: 2, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, elevation: 5,
  },
  muzzle: { position: 'absolute', borderRadius: 999 },
  eye: {
    position: 'absolute', backgroundColor: '#fff', borderRadius: 999,
    alignItems: 'center', justifyContent: 'center', zIndex: 3,
  },
  pupil: { backgroundColor: '#1F2937', borderRadius: 999 },
  sparkle: { position: 'absolute', backgroundColor: '#fff', borderRadius: 999 },
  nose: { position: 'absolute', backgroundColor: '#78350F', borderRadius: 999, zIndex: 3 },
  smile: {
    position: 'absolute', borderColor: '#7C2D12', borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999, zIndex: 3,
  },
  cheek: { position: 'absolute', backgroundColor: '#F472B6', borderRadius: 999, zIndex: 3 },
  gloss: {
    position: 'absolute', backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 999, transform: [{ rotate: '-20deg' }], zIndex: 4,
  },
  hatPolice: {
    position: 'absolute', borderTopLeftRadius: 12, borderTopRightRadius: 12,
    alignItems: 'center', justifyContent: 'center', zIndex: 5,
  },
  hatDome: {
    position: 'absolute', borderTopLeftRadius: 999, borderTopRightRadius: 999,
    alignItems: 'center', zIndex: 5,
  },
  hatNurse: {
    position: 'absolute', borderTopLeftRadius: 10, borderTopRightRadius: 10,
    alignItems: 'center', justifyContent: 'center', zIndex: 5,
  },
  hatBadge: {
    width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  starDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  hatBrim: { position: 'absolute', bottom: -4, height: 7, borderRadius: 4 },
  hatStripe: { width: 10, height: '100%', borderRadius: 5 },
  crossV: { position: 'absolute', width: 6, height: 16, borderRadius: 3 },
  crossH: { position: 'absolute', width: 16, height: 6, borderRadius: 3 },
});

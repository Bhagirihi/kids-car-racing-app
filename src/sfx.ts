// Short sound effects, also real generated WAVs (see assets/sfx-*.wav),
// played with expo-audio. Guarded so a missing/failed player never
// crashes the game. Sound on/off is separate from the music toggle.

import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const HORN = require('../assets/sfx-horn.wav');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const STAR = require('../assets/sfx-star.wav');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BUMP = require('../assets/sfx-bump.wav');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const WIN = require('../assets/sfx-win.wav');

export type SfxName = 'horn' | 'star' | 'bump' | 'win';

const SOURCES: Record<SfxName, unknown> = { horn: HORN, star: STAR, bump: BUMP, win: WIN };

let enabled = true;
const players: Partial<Record<SfxName, AudioPlayer>> = {};

export function setSfxEnabled(on: boolean) {
  enabled = on;
}

export function isSfxEnabled(): boolean {
  return enabled;
}

export function playSfx(name: SfxName) {
  if (!enabled) return;
  try {
    let p = players[name];
    if (!p) {
      p = createAudioPlayer(SOURCES[name] as never);
      players[name] = p;
    }
    p.seekTo(0);
    p.play();
  } catch {
    /* ignore — sound is optional */
  }
}

// Music: a REAL cheerful loop, not a fake button.
// assets/music-loop.wav was generated programmatically (sine/triangle
// melody + bass + soft beat, 140 BPM, ~8 s, loops seamlessly) — no
// downloaded audio file. Played with expo-audio (SDK 58), looping.

import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MUSIC_SOURCE = require('../assets/music-loop.wav');

class Music {
  private player: AudioPlayer | null = null;
  private enabled = true;
  private playing = false;

  private ensurePlayer(): AudioPlayer | null {
    if (!this.player) {
      try {
        this.player = createAudioPlayer(MUSIC_SOURCE);
        this.player.loop = true;
        this.player.volume = 0.5;
      } catch {
        this.player = null;
      }
    }
    return this.player;
  }

  /** Start the loop (call from a user gesture — first tap / Start). */
  start() {
    if (!this.enabled) return;
    const p = this.ensurePlayer();
    if (!p || this.playing) return;
    try {
      p.play();
      this.playing = true;
    } catch {
      /* audio unavailable on this device — game still works */
    }
  }

  pause() {
    if (!this.player || !this.playing) return;
    try {
      this.player.pause();
    } catch {
      /* ignore */
    }
    this.playing = false;
  }

  resume() {
    if (this.enabled && !this.playing) this.start();
  }

  /** Music on/off toggle. Returns the new state. */
  setEnabled(on: boolean): boolean {
    this.enabled = on;
    if (on) this.start();
    else this.pause();
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const music = new Music();

// Synth sound set for the flood rescue (built on the shared WebAudio voices).

import { sfx, synth } from '../../engine/audio'
import type { SurvivorKind } from './sim'

const { tone, noise } = synth

export const floodSfx = {
  /** Someone hops aboard. */
  hop(i = 0) {
    tone(440 + i * 60, 0.08, 'triangle', 0.1, 0, undefined, 880 + i * 80)
    tone(1320, 0.12, 'sine', 0.06, 0.07)
    noise(0.12, 0.08, 'bandpass', 1600, 1, 0.02, 600)
  },
  /** Dropped off at the temple: pitch climbs with each passenger of the trip. */
  saved(k = 1) {
    const base = 523 * Math.pow(2, Math.min(8, k - 1) / 12)
    tone(base, 0.1, 'square', 0.05)
    tone(base * 1.5, 0.18, 'square', 0.045, 0.07)
  },
  family() {
    ;[0, 4, 7, 12, 16].forEach((s, i) => tone(392 * Math.pow(2, s / 12), 0.22, 'triangle', 0.11, i * 0.08))
    setTimeout(() => sfx.sparkle(), 420)
  },
  trip() {
    ;[0, 7, 12].forEach((s, i) => tone(659 * Math.pow(2, s / 12), 0.14, 'square', 0.05, i * 0.06))
  },
  crash() {
    noise(0.28, 0.24, 'lowpass', 700, 0.8, 0, 120)
    tone(110, 0.22, 'square', 0.08, 0, undefined, 55)
    noise(0.06, 0.12, 'bandpass', 2400, 3, 0.03)
  },
  bump() {
    tone(180, 0.08, 'triangle', 0.08, 0, undefined, 120)
  },
  thunder() {
    noise(0.12, 0.2, 'highpass', 2500, 0.7)
    noise(1.6, 0.22, 'lowpass', 420, 0.7, 0.08, 80)
    tone(55, 1.2, 'sine', 0.1, 0.1, undefined, 38)
  },
  rain() {
    noise(1.4, 0.035, 'highpass', 4200, 0.4)
  },
  squeak() {
    tone(1100, 0.07, 'square', 0.05, 0, undefined, 1900)
    tone(1900, 0.06, 'square', 0.04, 0.08, undefined, 1200)
  },
  power() {
    sfx.sparkle()
    noise(0.3, 0.08, 'bandpass', 600, 0.8, 0, 3000)
  },
  boost() {
    sfx.bark()
    noise(0.5, 0.1, 'bandpass', 500, 0.8, 0.05, 2600)
  },
  full() {
    tone(220, 0.12, 'square', 0.05)
    tone(196, 0.16, 'square', 0.05, 0.12)
  },
  danger() {
    tone(988, 0.1, 'square', 0.04)
    tone(740, 0.1, 'square', 0.04, 0.13)
    tone(988, 0.1, 'square', 0.04, 0.26)
  },
  flood() {
    noise(0.6, 0.14, 'lowpass', 900, 0.8, 0, 200)
    tone(300, 0.3, 'sine', 0.07, 0, undefined, 120)
  },
  heli() {
    for (let i = 0; i < 6; i++) noise(0.05, 0.08, 'lowpass', 500, 1, i * 0.09)
  },
  lizard() {
    noise(0.2, 0.08, 'bandpass', 1000, 1, 0, 400)
    tone(700, 0.1, 'sine', 0.06, 0.05, undefined, 1400)
  },
  tick() {
    tone(1800, 0.03, 'square', 0.035)
  },
  /** A little voice for whoever is calling. */
  voice(kind: SurvivorKind) {
    switch (kind) {
      case 'cat':
      case 'vipcat':
        tone(760, 0.22, 'triangle', 0.07, 0, undefined, 520)
        break
      case 'dog':
        sfx.bark()
        break
      case 'chicken':
        for (let i = 0; i < 3; i++) tone(900 + i * 60, 0.05, 'square', 0.035, i * 0.07, undefined, 700)
        break
      case 'buffalo':
        tone(150, 0.6, 'sawtooth', 0.05, 0, undefined, 105)
        break
      case 'uncle':
        // The rooster.
        tone(700, 0.1, 'square', 0.04, 0, undefined, 950)
        tone(950, 0.12, 'square', 0.04, 0.11, undefined, 1050)
        tone(1050, 0.3, 'square', 0.04, 0.24, undefined, 700)
        break
      case 'granny':
        // Her radio: a tinny luk thung lick.
        ;[0, 3, 5, 7, 5, 3].forEach((s, i) => tone(587 * Math.pow(2, s / 12), 0.1, 'square', 0.025, i * 0.1))
        break
      default:
        tone(520, 0.08, 'triangle', 0.06, 0, undefined, 700)
        tone(700, 0.1, 'triangle', 0.05, 0.1, undefined, 560)
    }
  },
}

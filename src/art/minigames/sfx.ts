// Extra sound effects for the temple mini-games, built on the shared synth
// voices (src/engine/audio.ts) so they follow the sound on/off setting.

import { synth } from '../../engine/audio'

const { tone, noise } = synth
const hz = (semi: number) => 261.63 * Math.pow(2, semi / 12)
const PENTA = [0, 2, 4, 7, 9]

export const tsfx = {
  /** Quick air swish (throws, swings). */
  swish(pitch = 1) {
    noise(0.14, 0.09, 'bandpass', 900 * pitch, 1.2, 0, 3200 * pitch)
  },
  /** Wooden striker on bronze: thud + click. */
  thwack() {
    noise(0.05, 0.16, 'lowpass', 700, 0.8)
    tone(190, 0.08, 'triangle', 0.1, 0, undefined, 110)
    noise(0.02, 0.08, 'bandpass', 3000, 3)
  },
  /** Rising blip for combo counts. */
  combo(n: number) {
    const s = PENTA[n % 5] + 12 * Math.floor(Math.min(n, 14) / 5)
    tone(hz(s + 12), 0.1, 'square', 0.035)
    tone(hz(s + 19), 0.14, 'triangle', 0.05, 0.04)
  },
  /** One star appearing on the result card (0..2). */
  star(i: number) {
    const base = [7, 11, 14][i] ?? 14
    tone(hz(base + 12), 0.18, 'square', 0.035)
    tone(hz(base + 24), 0.28, 'triangle', 0.06, 0.05)
    noise(0.08, 0.04, 'highpass', 5000, 0.7, 0.02)
  },
  /** Little praise jingle ("เยี่ยม!"). */
  praise() {
    ;[0, 4, 7].forEach((s, i) => tone(hz(s + 24), 0.12, 'triangle', 0.05, i * 0.05))
  },
  /** Result fanfare. */
  fanfare() {
    ;[0, 4, 7, 12, 16].forEach((s, i) => tone(hz(s + 12), 0.26, 'triangle', 0.08, i * 0.07))
    tone(hz(24), 0.7, 'sine', 0.06, 0.36)
  },
  /** A siamsi stick clattering on the tiles. */
  clack() {
    noise(0.03, 0.14, 'bandpass', 2200, 5)
    noise(0.03, 0.1, 'bandpass', 2600, 5, 0.09)
    noise(0.02, 0.06, 'bandpass', 2400, 5, 0.16)
  },
  /** Plastic bag / paper rustle. */
  rustle() {
    for (let i = 0; i < 3; i++) noise(0.05, 0.05, 'highpass', 3500, 0.8, i * 0.05)
  },
  /** Coin into a wooden box. */
  plink() {
    tone(2400, 0.08, 'square', 0.03)
    tone(3200, 0.16, 'sine', 0.05, 0.03)
    noise(0.05, 0.08, 'lowpass', 500, 1, 0.09)
  },
  /** Soft pat (petting, pressing gold leaf). */
  pat() {
    noise(0.05, 0.1, 'lowpass', 420, 0.8)
  },
  /** Lighting a wick. */
  ignite() {
    noise(0.22, 0.09, 'lowpass', 500, 0.7, 0, 1800)
    tone(880, 0.12, 'sine', 0.03, 0.12, undefined, 1320)
  },
  /** Small splash into water. */
  splash() {
    noise(0.18, 0.14, 'bandpass', 1600, 0.9, 0, 400)
    tone(700, 0.1, 'sine', 0.06, 0.02, undefined, 240)
  },
  /** Water drops. */
  drip(i = 0) {
    tone(900 + (i % 4) * 140, 0.07, 'sine', 0.06, 0, undefined, 1500 + (i % 3) * 200)
  },
  /** Deep temple gong. */
  gong() {
    tone(82, 3.2, 'sine', 0.22)
    tone(164, 2.4, 'sine', 0.08)
    tone(247, 1.6, 'sine', 0.05)
    noise(0.12, 0.08, 'lowpass', 400, 0.8)
  },
  /** Soft footstep. */
  step(i = 0) {
    noise(0.04, 0.035, 'lowpass', 300 + (i % 2) * 80, 0.8)
  },
  /** Magic shimmer rising. */
  shimmer() {
    for (let i = 0; i < 6; i++) tone(hz(PENTA[i % 5] + 24 + 12 * Math.floor(i / 5)), 0.2, 'sine', 0.03, i * 0.045)
  },
  /** Powder puff. */
  puff() {
    noise(0.16, 0.07, 'highpass', 2000, 0.5, 0, 6000)
  },
}

// Extra sound set for the volunteer jobs and the kitchen, built on the shared
// synth voices (src/engine/audio.ts).

import { synth } from '../../engine/audio'

const { tone, noise } = synth
const hz = (semi: number) => 523.25 * Math.pow(2, semi / 12)
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]

export const wsfx = {
  /** Broom bristles on stone. */
  swish(power = 1) {
    noise(0.12, 0.05 + power * 0.05, 'bandpass', 2600, 0.9, 0, 5200)
  },
  /** Wet mop squeak. */
  squeak() {
    tone(1400 + Math.random() * 300, 0.06, 'sine', 0.035, 0, undefined, 2100)
  },
  /** Leaves landing in the basket. */
  rustle() {
    for (let i = 0; i < 4; i++) noise(0.05, 0.07, 'highpass', 3000 + i * 400, 0.8, i * 0.035)
  },
  /** Rising combo ping (n = streak length). */
  combo(n: number) {
    const s = PENTA[Math.min(PENTA.length - 1, Math.max(0, n - 1))]
    tone(hz(s), 0.12, 'square', 0.04)
    tone(hz(s + 12), 0.18, 'sine', 0.05, 0.04)
  },
  /** Short "ta-da" for a praise pop-up. */
  praise() {
    ;[0, 4, 7, 12].forEach((s, i) => tone(hz(s), 0.16, 'triangle', 0.07, i * 0.06))
    tone(hz(24), 0.3, 'sine', 0.04, 0.24)
  },
  /** Toss whoosh (pellets leaving the hand). */
  toss() {
    noise(0.14, 0.06, 'bandpass', 900, 0.8, 0, 2600)
  },
  /** Big catfish gulp. */
  bigGulp() {
    tone(180, 0.12, 'sine', 0.16, 0, undefined, 90)
    tone(420, 0.08, 'sine', 0.08, 0.08, undefined, 700)
  },
  /** Lighter click and catch. */
  flick() {
    noise(0.02, 0.14, 'bandpass', 3500, 5)
    noise(0.18, 0.05, 'lowpass', 800, 0.6, 0.03)
  },
  /** Candle catching fire. */
  whoomp() {
    noise(0.22, 0.08, 'lowpass', 500, 0.7, 0, 1600)
    tone(330, 0.2, 'sine', 0.04, 0.02, undefined, 660)
  },
  /** Water trickle burst. */
  trickle() {
    for (let i = 0; i < 3; i++) tone(900 + Math.random() * 900, 0.05, 'sine', 0.03, i * 0.05, undefined, 1500 + Math.random() * 600)
  },
  /** Brass squeak-squeak. */
  shine() {
    tone(2100, 0.05, 'sine', 0.03, 0, undefined, 3000)
    tone(2600, 0.05, 'sine', 0.025, 0.06, undefined, 3600)
  },
  /** Knife on the board. */
  chop() {
    noise(0.03, 0.14, 'bandpass', 1800, 2.5)
    tone(240, 0.05, 'sine', 0.08, 0, undefined, 160)
  },
  /** Hot wok flare. */
  flare() {
    noise(0.4, 0.09, 'lowpass', 700, 0.8, 0, 2400)
  },
  /** Loud sizzle burst. */
  sizzle() {
    noise(0.28, 0.07, 'highpass', 4200, 0.7)
  },
  /** Happy "mmm!" boing for a tasty dish. */
  yum() {
    tone(392, 0.12, 'triangle', 0.09, 0, undefined, 784)
    tone(784, 0.22, 'triangle', 0.08, 0.13, undefined, 1046)
    tone(hz(24), 0.35, 'sine', 0.04, 0.3)
  },
  /** Sad trombone for a burnt dish. */
  wahwah() {
    ;[0, -1, -2].forEach((s, i) => tone(233 * Math.pow(2, s / 12), 0.28, 'sawtooth', 0.035, i * 0.3))
    tone(233 * Math.pow(2, -4 / 12), 0.7, 'sawtooth', 0.035, 0.9, undefined, 190)
  },
  /** Stars landing on the result card. */
  star(i: number) {
    tone(hz(PENTA[4 + i * 2]), 0.2, 'square', 0.045)
    tone(hz(PENTA[4 + i * 2] + 12), 0.3, 'sine', 0.05, 0.03)
  },
}

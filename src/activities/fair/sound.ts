// Extra synthesised sounds for the hub markets and the temple fair (train
// horn, crossing bell, balloon pops, cork gun, ring clinks, ta-da). Uses its
// own tiny WebAudio graph and respects the player's sound setting, so the
// shared engine/audio.ts stays untouched.

import { game } from '../../game/state'

let ctx: AudioContext | null = null
let out: GainNode | null = null
/** Browsers only allow audio after a user gesture; stay silent until then. */
let gestured = false
if (typeof window !== 'undefined') {
  const on = () => (gestured = true)
  window.addEventListener('pointerdown', on, { once: true, capture: true })
  window.addEventListener('keydown', on, { once: true, capture: true })
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined' || !gestured) return null
  if (game.value.settings.sound === false) return null
  if (!ctx) {
    const AC = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as typeof AudioContext | undefined
    if (!AC) return null
    try {
      ctx = new AC()
    } catch {
      return null
    }
    out = ctx.createGain()
    out.gain.value = 0.55
    out.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => undefined)
  return ctx
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, when = 0, glide?: number) {
  const c = ac()
  if (!c || !out) return
  const t = c.currentTime + when
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function noise(dur: number, vol = 0.2, freq = 1500, when = 0, type: BiquadFilterType = 'bandpass') {
  const c = ac()
  if (!c || !out) return
  const t = c.currentTime + when
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  const g = c.createGain()
  g.gain.value = vol
  src.connect(f).connect(g).connect(out)
  src.start(t)
}

export const fairSfx = {
  /** Diesel horn: two long notes. */
  horn() {
    tone(233, 0.7, 'sawtooth', 0.08)
    tone(294, 0.7, 'sawtooth', 0.06)
    tone(233, 0.9, 'sawtooth', 0.08, 0.85)
    tone(294, 0.9, 'sawtooth', 0.06, 0.85)
  },
  /** Crossing bell ding-ding. */
  crossing(n = 6) {
    for (let i = 0; i < n; i++) tone(1320, 0.18, 'triangle', 0.08, i * 0.32)
  },
  /** Balloon pop. */
  pop() {
    noise(0.12, 0.35, 2200)
    tone(880, 0.08, 'square', 0.05, 0, 220)
  },
  /** Dart thunk into the board. */
  thunk() {
    noise(0.05, 0.25, 500, 0, 'lowpass')
    tone(160, 0.08, 'sine', 0.12)
  },
  /** Cork gun "pok". */
  cork() {
    noise(0.06, 0.3, 900)
    tone(420, 0.06, 'square', 0.06, 0, 180)
  },
  /** Something falls off the shelf. */
  knock() {
    tone(300, 0.1, 'triangle', 0.12, 0, 120)
    noise(0.08, 0.15, 700, 0.05, 'lowpass')
  },
  /** Ring clinks on a bottle. */
  clink() {
    tone(1760, 0.15, 'sine', 0.12)
    tone(2637, 0.12, 'sine', 0.06, 0.02)
  },
  /** Ring misses and rolls. */
  miss() {
    tone(330, 0.14, 'triangle', 0.08, 0, 220)
    tone(262, 0.18, 'triangle', 0.06, 0.12, 180)
  },
  /** Little fanfare. */
  tada() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, i * 0.09))
  },
  /** Ticket counter tick. */
  tick() {
    tone(1568, 0.05, 'square', 0.04)
  },
  /** Big splash (dunk tank). */
  dunk() {
    noise(0.5, 0.3, 700, 0, 'lowpass')
    tone(200, 0.3, 'sine', 0.1, 0, 80)
  },
  /** Spooky wobble (haunted house). */
  spooky() {
    tone(220, 0.9, 'sine', 0.06, 0, 160)
    tone(233, 0.9, 'sine', 0.05, 0.05, 150)
  },
  /** Jump scare sting: a stab and a squeaky "eek". */
  scare() {
    noise(0.18, 0.28, 1800)
    tone(880, 0.12, 'square', 0.06, 0, 1760)
    tone(1320, 0.2, 'triangle', 0.08, 0.1, 1980)
  },
  /** Firework: whistle up is done by the rocket; this is the boom. */
  boom(size = 1) {
    noise(0.5 * size, 0.3, 300, 0, 'lowpass')
    tone(90, 0.35, 'sine', 0.14 * size, 0, 45)
  },
  /** Crackling glitter. */
  crackle() {
    for (let i = 0; i < 6; i++) noise(0.03, 0.12, 3000 + i * 300, 0.25 + i * 0.07)
  },
  /** Bumper car bonk. */
  bump() {
    tone(180, 0.12, 'square', 0.08, 0, 90)
    noise(0.08, 0.2, 600, 0, 'lowpass')
  },
  /** Pole spark crackle. */
  zap() {
    noise(0.05, 0.08, 4000)
  },
  /** The โทน drum: low "ตึ่ง". */
  drum(accent = false) {
    tone(accent ? 140 : 170, 0.22, 'sine', accent ? 0.2 : 0.14, 0, accent ? 90 : 120)
    noise(0.04, 0.08, 900, 0, 'lowpass')
  },
  /** The ฉิ่ง: bright "ching" (closed = "ฉับ"). */
  ching(open = true) {
    tone(2637, open ? 0.35 : 0.06, 'sine', open ? 0.06 : 0.05)
    tone(3520, open ? 0.25 : 0.05, 'sine', 0.03)
  },
  /** A perfect note. */
  ding() {
    tone(1568, 0.1, 'triangle', 0.08)
    tone(2093, 0.14, 'triangle', 0.06, 0.05)
  },
  /** Claw motor whirr. */
  whirr(dur = 0.4) {
    tone(110, dur, 'sawtooth', 0.03, 0, 130)
  },
  /** Boxing bell. */
  ring() {
    tone(1200, 0.5, 'triangle', 0.1)
    tone(1800, 0.4, 'sine', 0.05)
  },
  /** Slurp of a straw. */
  slurp() {
    noise(0.25, 0.12, 1200)
    tone(500, 0.2, 'sine', 0.04, 0, 900)
  },
  /** A soft melody note (ramwong band). */
  note(freq: number, dur = 0.22, vol = 0.05) {
    tone(freq, dur, 'triangle', vol)
  },
  /** Crowd cheer (a rumble of noise). */
  cheer() {
    noise(0.8, 0.14, 1000)
    noise(0.6, 0.1, 2200, 0.1)
  },
}

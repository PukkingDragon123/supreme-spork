// Synthesised sound effects and a gentle generative ambience (WebAudio).
// No audio files are needed, which keeps the app tiny and offline-friendly.

let ctx: AudioContext | null = null
let master: GainNode | null = null
let sfxGain: GainNode | null = null
let musicGain: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
let enabled = { sound: true, music: true }
let ambientTimer: ReturnType<typeof setInterval> | null = null
let ambientMood: 'day' | 'night' = 'day'

function ac(): AudioContext | null {
  if (ctx) return ctx
  const AC = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as typeof AudioContext | undefined
  if (!AC) return null
  try {
    ctx = new AC()
  } catch {
    return null
  }
  master = ctx.createGain()
  master.gain.value = 0.8
  master.connect(ctx.destination)
  sfxGain = ctx.createGain()
  sfxGain.gain.value = enabled.sound ? 0.9 : 0
  sfxGain.connect(master)
  musicGain = ctx.createGain()
  musicGain.gain.value = enabled.music ? 0.22 : 0
  musicGain.connect(master)
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const d = noiseBuf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return ctx
}

/** Must be called from a user gesture before any sound can play. */
export function unlockAudio() {
  const c = ac()
  if (c && c.state === 'suspended') c.resume().catch(() => undefined)
  if (enabled.music) startAmbient()
}

export function setAudioEnabled(sound: boolean, music: boolean) {
  enabled = { sound, music }
  if (sfxGain) sfxGain.gain.value = sound ? 0.9 : 0
  if (musicGain) musicGain.gain.value = music ? 0.22 : 0
  if (music && ctx) startAmbient()
  if (!music) stopAmbient()
}

export function setAmbientMood(m: 'day' | 'night') {
  ambientMood = m
}

function env(g: GainNode, t: number, a: number, peak: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a)
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + decay)
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, when = 0, dest?: AudioNode, glideTo?: number) {
  const c = ac()
  if (!c || !sfxGain) return
  const t = c.currentTime + when
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur)
  env(g, t, 0.005, vol, dur)
  o.connect(g).connect(dest ?? sfxGain)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function noise(dur: number, vol = 0.2, filter: BiquadFilterType = 'bandpass', freq = 1200, q = 1, when = 0, sweepTo?: number) {
  const c = ac()
  if (!c || !sfxGain || !noiseBuf) return
  const t = c.currentTime + when
  const src = c.createBufferSource()
  src.buffer = noiseBuf
  const f = c.createBiquadFilter()
  f.type = filter
  f.frequency.setValueAtTime(freq, t)
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur)
  f.Q.value = q
  const g = c.createGain()
  env(g, t, 0.004, vol, dur)
  src.connect(f).connect(g).connect(sfxGain)
  src.start(t, Math.random() * 0.5)
  src.stop(t + dur + 0.05)
}

/** Temple bell: inharmonic partials with a long decay. */
function bellTone(freq: number, vol = 0.25, decay = 2.6, dest?: AudioNode) {
  const partials = [
    [1, 1],
    [2.0, 0.5],
    [2.76, 0.32],
    [3.9, 0.2],
    [5.4, 0.12],
    [0.5, 0.25],
  ]
  for (const [ratio, amp] of partials) tone(freq * ratio, decay * (1.2 - ratio * 0.08), 'sine', vol * amp, 0, dest)
  noise(0.04, vol * 0.4, 'highpass', 3000, 0.7)
}

const PENTA = [0, 2, 4, 7, 9]
const noteHz = (semi: number) => 261.63 * Math.pow(2, semi / 12)

export const sfx = {
  tap() {
    tone(900, 0.05, 'sine', 0.08, 0, undefined, 700)
  },
  open() {
    tone(520, 0.08, 'triangle', 0.1)
    tone(780, 0.1, 'triangle', 0.08, 0.05)
  },
  close() {
    tone(700, 0.08, 'triangle', 0.08)
    tone(470, 0.1, 'triangle', 0.07, 0.05)
  },
  coin() {
    tone(1318, 0.08, 'square', 0.05)
    tone(1760, 0.22, 'square', 0.05, 0.07)
  },
  coins(n = 5) {
    for (let i = 0; i < n; i++) tone(1400 + Math.random() * 500, 0.12, 'square', 0.03, i * 0.06)
  },
  bell(index = 0) {
    const f = noteHz(PENTA[index % 5] + 12 * Math.floor(index / 5)) * 1.5
    bellTone(f, 0.22, 2.4)
  },
  bigBell() {
    bellTone(98, 0.4, 6)
  },
  chime() {
    ;[0, 4, 7, 12].forEach((s, i) => tone(noteHz(s + 12), 0.5, 'sine', 0.1, i * 0.08))
  },
  merit() {
    ;[7, 12].forEach((s, i) => tone(noteHz(s + 12), 0.35, 'triangle', 0.08, i * 0.07))
  },
  levelUp() {
    ;[0, 2, 4, 7, 9, 12, 16].forEach((s, i) => tone(noteHz(s + 12), 0.3, 'triangle', 0.13, i * 0.09))
    setTimeout(() => bellTone(noteHz(12), 0.2, 2), 650)
  },
  splash() {
    noise(0.25, 0.18, 'bandpass', 1400, 0.8, 0, 500)
  },
  plop() {
    tone(620, 0.09, 'sine', 0.14, 0, undefined, 180)
  },
  gulp() {
    tone(300, 0.07, 'sine', 0.12, 0, undefined, 520)
  },
  bark() {
    tone(520, 0.09, 'square', 0.06, 0, undefined, 300)
    noise(0.08, 0.05, 'bandpass', 900, 2)
    tone(560, 0.08, 'square', 0.05, 0.14, undefined, 330)
  },
  munch() {
    for (let i = 0; i < 3; i++) noise(0.04, 0.12, 'bandpass', 2400, 3, i * 0.11)
  },
  scratch() {
    noise(0.05, 0.05, 'highpass', 4000, 0.6)
  },
  click() {
    noise(0.02, 0.12, 'bandpass', 2600, 4)
    tone(1600, 0.03, 'sine', 0.05)
  },
  rattle() {
    for (let i = 0; i < 5; i++) noise(0.03, 0.1, 'bandpass', 1800 + Math.random() * 800, 5, i * 0.05)
  },
  whoosh() {
    noise(0.35, 0.1, 'bandpass', 400, 0.8, 0, 2400)
  },
  pour(dur = 1) {
    noise(dur, 0.08, 'lowpass', 1800, 0.6, 0, 700)
  },
  hum(step = 0) {
    const f = [196, 196, 220, 196, 175][step % 5]
    tone(f, 0.32, 'triangle', 0.07)
    tone(f * 2, 0.32, 'sine', 0.025)
  },
  candle() {
    noise(0.12, 0.06, 'lowpass', 900, 0.5)
  },
  sparkle() {
    ;[19, 24, 28].forEach((s, i) => tone(noteHz(s), 0.18, 'sine', 0.05, i * 0.05))
  },
  error() {
    tone(180, 0.18, 'square', 0.05)
  },
  purchase() {
    sfx.coins(8)
    setTimeout(() => sfx.chime(), 300)
  },
}

// ---------------------------------------------------------------------------
// Generative ambience: slow pentatonic ranat-like notes, birds by day and
// crickets by night.

function startAmbient() {
  if (ambientTimer || !ac()) return
  let nextNote = 0
  let step = 0
  ambientTimer = setInterval(() => {
    const c = ac()
    if (!c || !musicGain || c.state !== 'running') return
    const now = c.currentTime
    if (now < nextNote) return
    step++
    const scale = PENTA.map((p) => p + (ambientMood === 'night' ? -3 : 0))
    const phrase = [0, 2, 1, 3, 4, 2, 1, 0]
    const deg = phrase[step % phrase.length] + (Math.random() < 0.2 ? 1 : 0)
    const semi = scale[deg % 5] + 12 * Math.floor(deg / 5)
    const f = noteHz(semi + 12)
    // Ranat-ish struck note.
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'triangle'
    o.frequency.value = f
    env(g, now, 0.004, 0.5, 0.9)
    o.connect(g).connect(musicGain)
    o.start(now)
    o.stop(now + 1)
    if (step % 8 === 0) {
      const d = c.createOscillator()
      const dg = c.createGain()
      d.type = 'sine'
      d.frequency.value = noteHz(scale[0] - 12)
      env(dg, now, 0.2, 0.35, 3)
      d.connect(dg).connect(musicGain)
      d.start(now)
      d.stop(now + 3.4)
    }
    if (ambientMood === 'day' && Math.random() < 0.18) {
      // Bird chirp.
      const b = c.createOscillator()
      const bg = c.createGain()
      b.type = 'sine'
      const t = now + 0.2
      b.frequency.setValueAtTime(2600, t)
      b.frequency.exponentialRampToValueAtTime(3800, t + 0.06)
      b.frequency.exponentialRampToValueAtTime(2800, t + 0.12)
      env(bg, t, 0.01, 0.18, 0.12)
      b.connect(bg).connect(musicGain)
      b.start(t)
      b.stop(t + 0.2)
    } else if (ambientMood === 'night' && Math.random() < 0.35) {
      for (let i = 0; i < 4; i++) {
        const k = c.createOscillator()
        const kg = c.createGain()
        k.type = 'square'
        k.frequency.value = 4200
        const t = now + 0.1 + i * 0.05
        env(kg, t, 0.002, 0.04, 0.02)
        k.connect(kg).connect(musicGain)
        k.start(t)
        k.stop(t + 0.05)
      }
    }
    nextNote = now + (Math.random() < 0.25 ? 1.3 : 0.65)
  }, 120)
}

function stopAmbient() {
  if (ambientTimer) clearInterval(ambientTimer)
  ambientTimer = null
}

let hapticsOn = true
export function setHaptics(on: boolean) {
  hapticsOn = on
}

export function haptic(ms = 12) {
  if (!hapticsOn) return
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* unsupported */
  }
}

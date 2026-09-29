// The chant guide: the soundtrack and the clock of a prayer stage.
//
// - A real recording (imported or bundled) plays when there is one, and the
//   timeline clock follows the audio so the karaoke highlight stays on it.
// - Otherwise a guide voice reads each line: the device's Thai speech voice
//   at a slow, low chant-like rate, or (no Thai voice) a hummed syllable
//   voice synthesized with vowel formants, exactly on the beat.
// - Under it all: a soft drone bed, a wood-block tick (เกราะ) on the beat and
//   small bells (ระฆัง/ฉิ่ง) at line starts, through the shared sound/music
//   buses so the game's audio settings apply.

import { audioBus, holdAmbient } from './audio'
import { LEAD_IN, audioAt, timeAt, speakable, speechRateFor, learnSps, DEFAULT_SPS, type StagePlan } from '../game/chantTiming'
import { lineWords, syllableUnits } from '../game/chantScore'
import type { HintLevel } from '../game/data/prayers'
import type { ChantRecording } from './chantSources'

export type GuidePref = 'auto' | 'speech' | 'hum' | 'off'
export type GuideVoice = 'file' | 'speech' | 'hum' | 'none'

export interface GuideOptions {
  plan: StagePlan
  hint: HintLevel
  pref: GuidePref
  recording?: ChantRecording | null
  /** Microphone scoring is on: keep the guide quieter. */
  mic?: boolean
  speechVoice?: SpeechSynthesisVoice | null
  /** Play the count-in bells (stages) or start straight away (book preview). */
  countIn?: boolean
}

const perf = () => performance.now() / 1000
const LOOKAHEAD = 0.3
const F0 = 118

/** How loud the guide voice is for each hint level (0 = no voice). */
export const HINT_VOICE: Record<HintLevel, number> = { learn: 1, read: 1, fade: 0.55, memory: 0 }
/** How loud the beat tick is for each hint level. */
export const HINT_TICK: Record<HintLevel, number> = { learn: 1, read: 0.55, fade: 0, memory: 0.5 }

export function pickVoice(o: { pref: GuidePref; hint: HintLevel; hasFile: boolean; hasSpeech: boolean }): GuideVoice {
  if (o.pref === 'off' || HINT_VOICE[o.hint] <= 0) return 'none'
  if (o.pref === 'hum') return 'hum'
  if (o.pref === 'speech') return o.hasSpeech ? 'speech' : 'hum'
  if (o.hasFile) return 'file'
  return o.hasSpeech ? 'speech' : 'hum'
}

// ---------------------------------------------------------------------------
// Thai speech voice

let voiceP: Promise<SpeechSynthesisVoice | null> | null = null

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

/** The device's Thai voice, if it has one (voices can load late). */
export function thaiVoice(): Promise<SpeechSynthesisVoice | null> {
  if (!speechSupported()) return Promise.resolve(null)
  if (!voiceP)
    voiceP = new Promise((resolve) => {
      const pick = () => {
        const vs = window.speechSynthesis.getVoices()
        const th = vs.filter((v) => v.lang?.toLowerCase().replace('_', '-').startsWith('th'))
        return th.find((v) => v.localService) ?? th[0] ?? null
      }
      const now = pick()
      if (now) return resolve(now)
      const to = setTimeout(() => resolve(pick()), 1500)
      try {
        window.speechSynthesis.addEventListener?.('voiceschanged', () => {
          const v = pick()
          if (v) {
            clearTimeout(to)
            resolve(v)
          }
        })
      } catch {
        // older engines
      }
    })
  return voiceP
}

const SPS_KEY = 'boondee.chant.sps'
function loadSps(uri: string): number {
  try {
    const m = JSON.parse(localStorage.getItem(SPS_KEY) ?? '{}') as Record<string, number>
    return m[uri] > 0 ? m[uri] : DEFAULT_SPS
  } catch {
    return DEFAULT_SPS
  }
}
function storeSps(uri: string, v: number) {
  try {
    const m = JSON.parse(localStorage.getItem(SPS_KEY) ?? '{}') as Record<string, number>
    m[uri] = v
    localStorage.setItem(SPS_KEY, JSON.stringify(m))
  } catch {
    // storage unavailable
  }
}

// ---------------------------------------------------------------------------
// Hummed syllable voice

type Vowel = 'a' | 'i' | 'ue' | 'u' | 'e' | 'ae' | 'o' | 'aw' | 'ai' | 'ua'
const FORMANTS: Record<Vowel, [number, number]> = {
  a: [760, 1250],
  i: [300, 2250],
  ue: [360, 1450],
  u: [320, 820],
  e: [450, 1950],
  ae: [640, 1750],
  o: [460, 860],
  aw: [560, 920],
  ai: [700, 1500],
  ua: [420, 900],
}

export function vowelOf(syl: string): Vowel {
  if (/[ไใ]/.test(syl)) return 'ai'
  if (/[ิี]/.test(syl)) return 'i'
  if (/[ึื]/.test(syl)) return 'ue'
  if (/[ุู]/.test(syl)) return 'u'
  if (/แ/.test(syl)) return 'ae'
  if (/เ/.test(syl)) return 'e'
  if (/โ/.test(syl)) return 'o'
  if (/[ะัาำ]/.test(syl)) return 'a'
  if (/อ/.test(syl.slice(1))) return 'aw'
  if (/ว/.test(syl.slice(1))) return 'ua'
  return 'o'
}

const FRICATIVE = 'สศษซฉชฌฝฟหฮ'
const PLOSIVE = 'กขคฆตถทธปผพภฏฐฑฒดบจฎ'
const NASAL_FINAL = 'มนงญณ'

function onsetOf(syl: string): 'hiss' | 'click' | 'soft' {
  const c = syl.replace(/^[เแโใไ]/, '')[0] ?? ''
  if (FRICATIVE.includes(c)) return 'hiss'
  if (PLOSIVE.includes(c)) return 'click'
  return 'soft'
}

// ---------------------------------------------------------------------------

interface SynthEvent {
  t: number
  kind: 'count' | 'gong' | 'bell' | 'tick' | 'syl' | 'end'
  n?: number
  dur?: number
  text?: string
  vol?: number
  /** Syllable position: first/last of the line (pitch cadence). */
  edge?: 'first' | 'last'
}

export class ChantGuide {
  readonly plan: StagePlan
  readonly voice: GuideVoice
  private opts: GuideOptions
  private events: SynthEvent[] = []
  private evCursor = 0
  private running = false
  private started = false
  private anchorWall = 0
  private anchorT = 0
  private lastT = 0
  // Drone.
  private drone: { nodes: AudioScheduledSourceNode[]; gain: GainNode } | null = null
  private reverb: { input: GainNode } | null = null
  // Recording.
  private audio: HTMLAudioElement | null = null
  private playingSeg: number | null = null
  private pendingFrom = -1
  private lastCt = -1
  private lastCtWall = 0
  // Speech.
  private spoken = new Set<number>()
  private sps = DEFAULT_SPS
  private speaking: { line: number; at: number; rate: number; syl: number } | null = null

  constructor(opts: GuideOptions) {
    this.opts = opts
    this.plan = opts.plan
    this.voice = pickVoice({ pref: opts.pref, hint: opts.hint, hasFile: !!opts.recording && opts.plan.source === 'file', hasSpeech: !!opts.speechVoice })
    if (opts.speechVoice) this.sps = loadSps(opts.speechVoice.voiceURI || opts.speechVoice.name)
    this.buildEvents()
    if (this.voice === 'file' && opts.recording) {
      const a = new Audio()
      a.preload = 'auto'
      a.src = opts.recording.url
      const pp = a as HTMLAudioElement & { preservesPitch?: boolean; webkitPreservesPitch?: boolean; mozPreservesPitch?: boolean }
      pp.preservesPitch = true
      pp.webkitPreservesPitch = true
      pp.mozPreservesPitch = true
      this.audio = a
    }
  }

  private get level(): number {
    return (this.opts.mic ? 0.55 : 1) * HINT_VOICE[this.opts.hint]
  }

  private buildEvents() {
    const p = this.plan
    const ev: SynthEvent[] = []
    if (this.opts.countIn !== false) {
      for (let i = 0; i < 3; i++) ev.push({ t: i * 0.8, kind: 'count', n: i })
      ev.push({ t: Math.max(0, LEAD_IN - 0.15), kind: 'gong' })
    }
    const tick = HINT_TICK[this.opts.hint] * (this.opts.mic ? 0.5 : 1)
    p.lineStart.forEach((t, i) => {
      if (i > 0) ev.push({ t: t - 0.02, kind: 'bell', n: i })
    })
    if (tick > 0) for (const w of p.words) ev.push({ t: w.start, kind: 'tick', vol: tick })
    if (this.voice === 'hum') {
      for (const w of p.words) {
        const lineWs = p.words.filter((x) => x.line === w.line)
        const firstW = lineWs[0] === w
        const lastW = lineWs[lineWs.length - 1] === w
        w.syl.forEach((s, k) => {
          const edge = firstW && k === 0 ? 'first' : lastW && k === w.syl.length - 1 ? 'last' : undefined
          ev.push({ t: s.start, kind: 'syl', dur: s.dur, text: s.text, edge })
        })
      }
    }
    ev.push({ t: Math.max(0, p.total - 0.4), kind: 'end' })
    ev.sort((a, b) => a.t - b.t)
    this.events = ev
  }

  // --- clock ---------------------------------------------------------------

  /** Timeline seconds. With a recording playing, this follows the audio. */
  now(): number {
    if (!this.running) return this.lastT
    const w = perf()
    let t = this.anchorT + (w - this.anchorWall)
    const at = this.audioClock(w)
    if (at !== null) {
      t = at
      this.anchorT = at
      this.anchorWall = w
    }
    if (t < this.lastT) t = this.lastT
    this.lastT = t
    return t
  }

  get isRunning() {
    return this.running
  }

  start(at = 0) {
    this.anchorWall = perf()
    this.anchorT = at
    this.lastT = at
    this.evCursor = this.events.findIndex((e) => e.t >= at - 0.01)
    if (this.evCursor < 0) this.evCursor = this.events.length
    this.running = true
    this.started = true
    holdAmbient(true)
    this.startDrone()
    this.update()
  }

  pause() {
    if (!this.running) return
    this.lastT = this.now()
    this.running = false
    this.stopDrone(0.3)
    this.audio?.pause()
    this.playingSeg = null
    this.cancelSpeech()
  }

  resume() {
    if (this.running || !this.started) return
    this.anchorWall = perf()
    this.anchorT = this.lastT
    this.running = true
    this.startDrone()
    // Skip beats that would have played during the pause.
    while (this.evCursor < this.events.length && this.events[this.evCursor].t < this.lastT) this.evCursor++
  }

  stop() {
    this.running = false
    this.stopDrone(0.8)
    this.cancelSpeech()
    if (this.audio) {
      this.audio.pause()
      this.audio.removeAttribute('src')
      this.audio.load()
      this.audio = null
    }
    holdAmbient(false)
  }

  /** Call once per animation frame. */
  update() {
    if (!this.running) return
    const t = this.now()
    this.syncFile(t)
    this.syncSpeech(t)
    this.schedule(t)
  }

  // --- recording -----------------------------------------------------------

  private audioClock(w: number): number | null {
    const a = this.audio
    if (!a || this.playingSeg === null || a.paused) return null
    const ct = a.currentTime
    if (this.pendingFrom >= 0) {
      // Wait until playback really moves before handing it the clock.
      if (ct <= this.pendingFrom + 0.01) return null
      this.pendingFrom = -1
    }
    if (ct !== this.lastCt) {
      this.lastCt = ct
      this.lastCtWall = w
    }
    const rate = this.plan.rate || 1
    const pos = Math.min(ct + (w - this.lastCtWall) * rate, ct + 0.35)
    return timeAt(this.plan.segments, this.playingSeg, pos)
  }

  private syncFile(t: number) {
    const a = this.audio
    if (!a) return
    a.muted = !(audioBus()?.sound ?? true)
    a.volume = Math.max(0, Math.min(1, this.level))
    const segs = this.plan.segments
    if (this.playingSeg !== null) {
      const s = segs[this.playingSeg]
      if (t >= s.t1 - 0.02 || a.ended) {
        a.pause()
        this.playingSeg = null
      }
      return
    }
    const want = audioAt(segs, t)
    if (!want) return
    try {
      a.playbackRate = this.plan.rate || 1
      a.currentTime = want.pos
      this.pendingFrom = want.pos
      this.playingSeg = want.seg
      this.lastCt = -1
      void a.play()?.catch(() => {
        this.playingSeg = null
      })
    } catch {
      this.playingSeg = null
    }
  }

  // --- speech --------------------------------------------------------------

  private cancelSpeech() {
    if (this.voice !== 'speech' || !speechSupported()) return
    try {
      window.speechSynthesis.cancel()
    } catch {
      // ignore
    }
    this.speaking = null
  }

  private syncSpeech(t: number) {
    if (this.voice !== 'speech' || !this.opts.speechVoice) return
    const p = this.plan
    for (let i = 0; i < p.lines.length; i++) {
      if (this.spoken.has(i)) continue
      if (t < p.lineStart[i] - 0.12) break
      this.spoken.add(i)
      if (t > p.lineEnd[i] - 0.3) continue
      this.speakLine(i)
    }
  }

  private speakLine(i: number) {
    const v = this.opts.speechVoice!
    const p = this.plan
    const text = speakable(p.lines[i])
    if (!text || !(audioBus()?.sound ?? true)) return
    const syl = lineWords(p.lines[i]).reduce((s, w) => s + syllableUnits(w), 0)
    const slot = Math.max(0.5, p.lineEnd[i] - p.lineStart[i])
    const rate = speechRateFor((slot * 1000) / Math.max(1, syl), this.sps)
    try {
      const synth = window.speechSynthesis
      if (synth.speaking || synth.pending) synth.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.voice = v
      u.lang = v.lang || 'th-TH'
      u.rate = rate
      u.pitch = 0.72
      u.volume = Math.max(0, Math.min(1, this.level))
      const rec = { line: i, at: 0, rate, syl }
      u.onstart = () => (rec.at = perf())
      u.onend = () => {
        if (!rec.at || this.speaking !== rec) return
        this.sps = learnSps(this.sps, rec.syl, perf() - rec.at, rec.rate)
        storeSps(v.voiceURI || v.name, this.sps)
      }
      this.speaking = rec
      synth.speak(u)
    } catch {
      // speech failed: the beat and highlight carry on
    }
  }

  // --- synth ---------------------------------------------------------------

  private schedule(t: number) {
    const bus = audioBus()
    if (!bus || bus.ctx.state !== 'running') {
      while (this.evCursor < this.events.length && this.events[this.evCursor].t < t + LOOKAHEAD) this.evCursor++
      return
    }
    const horizon = t + LOOKAHEAD
    while (this.evCursor < this.events.length && this.events[this.evCursor].t < horizon) {
      const e = this.events[this.evCursor++]
      if (e.t < t - 0.06) continue
      const when = bus.ctx.currentTime + Math.max(0, e.t - t)
      this.play(e, when)
    }
  }

  private play(e: SynthEvent, when: number) {
    switch (e.kind) {
      case 'count':
        this.bellAt(when, 523.25 * [1, 1.125, 1.25][e.n ?? 0], 0.16, 2)
        break
      case 'gong':
        this.bellAt(when, 98, 0.32, 5)
        break
      case 'bell':
        this.chingAt(when, (e.n ?? 0) % 2 === 0)
        break
      case 'tick':
        this.tickAt(when, e.vol ?? 1)
        break
      case 'syl':
        this.humAt(when, e.dur ?? 0.3, e.text ?? '', e.edge)
        break
      case 'end':
        this.bellAt(when, 196, 0.2, 3.5)
        break
    }
  }

  private reverbIn(): AudioNode | null {
    const bus = audioBus()
    if (!bus) return null
    if (!this.reverb) {
      const c = bus.ctx
      const len = Math.round(c.sampleRate * 1.6)
      const ir = c.createBuffer(2, len, c.sampleRate)
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch)
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2)
      }
      const conv = c.createConvolver()
      conv.buffer = ir
      const input = c.createGain()
      input.gain.value = 0.32
      const out = c.createGain()
      out.gain.value = 0.9
      input.connect(conv).connect(out).connect(bus.sfx)
      this.reverb = { input }
    }
    return this.reverb.input
  }

  private env(g: GainNode, when: number, attack: number, peak: number, decay: number) {
    g.gain.setValueAtTime(0.0001, when)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay)
  }

  private bellAt(when: number, f: number, vol: number, decay: number) {
    const bus = audioBus()
    if (!bus) return
    const c = bus.ctx
    const out = c.createGain()
    out.gain.value = 1
    out.connect(bus.sfx)
    const rv = this.reverbIn()
    if (rv) out.connect(rv)
    for (const [r, a] of [
      [1, 1],
      [2, 0.45],
      [2.76, 0.3],
      [3.9, 0.16],
      [5.4, 0.09],
      [0.5, 0.22],
    ]) {
      const o = c.createOscillator()
      const g = c.createGain()
      o.frequency.value = f * r
      this.env(g, when, 0.004, vol * a, decay * (1.2 - r * 0.08))
      o.connect(g).connect(out)
      o.start(when)
      o.stop(when + decay * 1.3)
    }
  }

  /** ฉิ่ง: a small bright bell at each line start. */
  private chingAt(when: number, open: boolean) {
    const bus = audioBus()
    if (!bus) return
    const c = bus.ctx
    const out = c.createGain()
    out.gain.value = this.opts.mic ? 0.5 : 1
    out.connect(bus.sfx)
    const rv = this.reverbIn()
    if (rv) out.connect(rv)
    const base = open ? 2093 : 1975
    for (const [r, a, d] of [
      [1, 0.05, open ? 1.3 : 0.25],
      [1.34, 0.035, open ? 1 : 0.2],
      [2.1, 0.02, 0.5],
    ]) {
      const o = c.createOscillator()
      const g = c.createGain()
      o.frequency.value = base * r
      this.env(g, when, 0.002, a, d)
      o.connect(g).connect(out)
      o.start(when)
      o.stop(when + d + 0.1)
    }
  }

  /** เกราะ: a hollow wood-block "tok" on the beat. */
  private tickAt(when: number, vol: number) {
    const bus = audioBus()
    if (!bus) return
    const c = bus.ctx
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(820, when)
    o.frequency.exponentialRampToValueAtTime(610, when + 0.07)
    this.env(g, when, 0.002, 0.2 * vol, 0.08)
    o.connect(g).connect(bus.sfx)
    o.start(when)
    o.stop(when + 0.12)
    const n = c.createBufferSource()
    n.buffer = bus.noise
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1700
    bp.Q.value = 6
    const ng = c.createGain()
    this.env(ng, when, 0.001, 0.22 * vol, 0.03)
    n.connect(bp).connect(ng).connect(bus.sfx)
    n.start(when, Math.random() * 0.5)
    n.stop(when + 0.06)
  }

  /** One hummed syllable: a buzz shaped by two vowel formants, with a consonant onset. */
  private humAt(when: number, dur: number, syl: string, edge?: 'first' | 'last') {
    const bus = audioBus()
    if (!bus) return
    const c = bus.ctx
    const vol = 0.2 * this.level
    if (vol <= 0) return
    const d = Math.max(0.12, dur * 0.94)
    const [F1, F2] = FORMANTS[vowelOf(syl)]
    const f0 = F0 * (edge === 'first' ? 1.04 : edge === 'last' ? 0.9 : 1) * (1 + (Math.random() - 0.5) * 0.006)
    const o = c.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(f0, when)
    if (edge === 'last') o.frequency.exponentialRampToValueAtTime(f0 * 0.93, when + d)
    const b1 = c.createBiquadFilter()
    b1.type = 'bandpass'
    b1.frequency.value = F1
    b1.Q.value = 5
    const b2 = c.createBiquadFilter()
    b2.type = 'bandpass'
    b2.frequency.value = F2
    b2.Q.value = 7
    const g2 = c.createGain()
    g2.gain.value = 0.45
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(2800, when)
    const nasal = NASAL_FINAL.includes(syl[syl.length - 1] ?? '') || syl.includes('ํ')
    if (nasal) lp.frequency.setValueAtTime(2800, when + d * 0.6), lp.frequency.exponentialRampToValueAtTime(420, when + d * 0.8)
    const g = c.createGain()
    const on = onsetOf(syl)
    const att = on === 'soft' ? 0.05 : 0.025
    g.gain.setValueAtTime(0.0001, when)
    g.gain.exponentialRampToValueAtTime(vol, when + att)
    g.gain.setValueAtTime(vol, when + Math.max(att, d - 0.07))
    g.gain.exponentialRampToValueAtTime(0.0001, when + d)
    o.connect(b1).connect(lp)
    o.connect(b2).connect(g2).connect(lp)
    lp.connect(g)
    g.connect(bus.sfx)
    const rv = this.reverbIn()
    if (rv) g.connect(rv)
    o.start(when)
    o.stop(when + d + 0.05)
    if (on !== 'soft') {
      const n = c.createBufferSource()
      n.buffer = bus.noise
      const f = c.createBiquadFilter()
      f.type = on === 'hiss' ? 'highpass' : 'bandpass'
      f.frequency.value = on === 'hiss' ? 4200 : 1800
      f.Q.value = on === 'hiss' ? 0.7 : 2
      const ng = c.createGain()
      this.env(ng, when, 0.003, vol * (on === 'hiss' ? 0.5 : 0.7), on === 'hiss' ? 0.06 : 0.018)
      n.connect(f).connect(ng).connect(bus.sfx)
      n.start(when, Math.random() * 0.5)
      n.stop(when + 0.1)
    }
  }

  private startDrone() {
    const bus = audioBus()
    if (!bus || this.drone) return
    const c = bus.ctx
    const now = c.currentTime
    const gain = c.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.55, now + 1.6)
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 340
    lp.Q.value = 0.8
    lp.connect(gain).connect(bus.music)
    const nodes: AudioScheduledSourceNode[] = []
    for (const [f, type, v] of [
      [F0 / 2, 'sawtooth', 0.22],
      [F0, 'triangle', 0.32],
      [(F0 * 3) / 2, 'sine', 0.12],
      [F0 / 2 + 0.35, 'sawtooth', 0.12],
    ] as [number, OscillatorType, number][]) {
      const o = c.createOscillator()
      o.type = type
      o.frequency.value = f
      const g = c.createGain()
      g.gain.value = v
      o.connect(g).connect(lp)
      o.start(now)
      nodes.push(o)
    }
    // Slow breathing of the filter.
    const lfo = c.createOscillator()
    lfo.frequency.value = 0.09
    const depth = c.createGain()
    depth.gain.value = 110
    lfo.connect(depth).connect(lp.frequency)
    lfo.start(now)
    nodes.push(lfo)
    this.drone = { nodes, gain }
  }

  private stopDrone(fade: number) {
    const d = this.drone
    const bus = audioBus()
    this.drone = null
    if (!d || !bus) return
    const now = bus.ctx.currentTime
    try {
      d.gain.gain.cancelScheduledValues(now)
      d.gain.gain.setValueAtTime(Math.max(0.0001, d.gain.gain.value), now)
      d.gain.gain.exponentialRampToValueAtTime(0.0001, now + fade)
      for (const n of d.nodes) n.stop(now + fade + 0.05)
    } catch {
      // already stopped
    }
  }
}

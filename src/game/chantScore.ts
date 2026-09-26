// Chant timing and scoring. A chant is laid out as a timeline of word windows
// and the player's voice (or taps) is judged against it without any speech
// recognition. Pure and deterministic so it can be unit tested in Node.

import type { VoiceFrame } from '../engine/voice'

export const BOW_TOKEN = '(กราบ)'
export const BOW_PAUSE_MS = 1400
export const TAIL_MS = 500

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

const isConsonant = (c: number) => c >= 0x0e01 && c <= 0x0e2e
const isLeadingVowel = (c: number) => c >= 0x0e40 && c <= 0x0e44
const isToneMark = (c: number) => (c >= 0x0e48 && c <= 0x0e4b) || c === 0x0e4e
const isFollowingVowel = (c: number) => (c >= 0x0e30 && c <= 0x0e39) || c === 0x0e45 || c === 0x0e47 || c === 0x0e4d

/** Heuristic: a Thai consonant opens a syllable when a leading vowel (เ แ โ ใ ไ) precedes it or a vowel sign follows it; bare consonants are finals or cluster heads. */
export function estimateSyllables(word: string): number {
  let n = 0
  for (let i = 0; i < word.length; i++) {
    if (!isConsonant(word.charCodeAt(i))) continue
    if (i > 0 && isLeadingVowel(word.charCodeAt(i - 1))) {
      n++
      continue
    }
    let j = i + 1
    while (j < word.length && isToneMark(word.charCodeAt(j))) j++
    if (j < word.length && isFollowingVowel(word.charCodeAt(j))) n++
  }
  return Math.min(6, Math.max(1, n))
}

export interface TimelineWord {
  index: number
  text: string
  line: number
  /** Seconds from the chant start. */
  start: number
  dur: number
  bow?: boolean
}

export interface TimelineOptions {
  msPerSyllable?: number
  gapMs?: number
  lineGapMs?: number
  leadInMs?: number
}

export function buildTimeline(lines: string[], opts: TimelineOptions = {}): { words: TimelineWord[]; total: number } {
  const { msPerSyllable = 380, gapMs = 120, lineGapMs = 600, leadInMs = 1500 } = opts
  const words: TimelineWord[] = []
  let t = leadInMs
  let lastLine = -1
  lines.forEach((line, li) => {
    for (const tok of line.split(/\s+/)) {
      if (!tok) continue
      if (tok === BOW_TOKEN) {
        const prev = words[words.length - 1]
        if (prev && !prev.bow) {
          prev.bow = true
          t += BOW_PAUSE_MS
        }
        continue
      }
      if (words.length) t += li === lastLine ? gapMs : lineGapMs
      const dur = estimateSyllables(tok) * msPerSyllable
      words.push({ index: words.length, text: tok, line: li, start: t / 1000, dur: dur / 1000 })
      t += dur
      lastLine = li
    }
  })
  return { words, total: (t + TAIL_MS) / 1000 }
}

export type Judge = 'perfect' | 'good' | 'miss'
export type ChantMode = 'voice' | 'tap'

// Voice judging.
export const PERFECT_COVERAGE = 0.55
export const GOOD_COVERAGE = 0.25
export const PERFECT_ONSET = 0.3
/** Onsets may start this long before a word. */
export const ONSET_EARLY = 0.25
/** A voice word is judged this long after its window closes. */
export const JUDGE_LAG = 0.15
/** Default analyser window + VAD attack delay subtracted from voice frames. */
export const VOICE_LATENCY = 0.06
/** Only rests longer than this are expected to be quiet. */
export const REST_MIN_GAP = 0.4
const REST_GRACE = 0.2
const REST_LEAD = 0.15
/** A loudness rise this big while already voiced counts as a new onset. */
const REATTACK = 0.12
const REATTACK_GAP = 0.12
const FLOW_FULL_COVERAGE = 0.75
const SLUR_RHYTHM = 0.3
export const NOISE_PENALTY = 0.8

// Tap judging.
export const TAP_WINDOW = 0.35
export const TAP_PERFECT = 0.12
export const TAP_GOOD = 0.3

export const WEIGHTS = { completeness: 0.4, rhythm: 0.25, flow: 0.2, focus: 0.15 }
export const STAR_SCORES = [50, 72, 88] as const

export interface ChantResult {
  score: number
  stars: 0 | 1 | 2 | 3
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  perfect: number
  good: number
  miss: number
  maxCombo: number
  rhythm: number
  flow: number
  focus: number
  completeness: number
}

export function starsFor(score: number): 0 | 1 | 2 | 3 {
  return score >= STAR_SCORES[2] ? 3 : score >= STAR_SCORES[1] ? 2 : score >= STAR_SCORES[0] ? 1 : 0
}

export function gradeFor(score: number): ChantResult['grade'] {
  return score >= 95 ? 'S' : score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D'
}

export interface ChantScorerOptions {
  mode: ChantMode
  /** Seconds subtracted from incoming times (defaults to VOICE_LATENCY in voice mode, 0 for taps). */
  latency?: number
  onJudge?: (i: number, j: Judge) => void
}

interface WordState {
  active: number
  onset: number | null
  louds: number[]
  pitches: number[]
  tap: number | null
  rhythm: number
  flow: number
  focus: number
}

const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0)

function std(a: number[]): number {
  if (a.length < 2) return 0
  const m = mean(a)
  return Math.sqrt(mean(a.map((v) => (v - m) * (v - m))))
}

function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y)
  const h = s.length >> 1
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2
}

/** Steadiness of a voiced word: monotone pitch and even volume score high. */
function steadiness(louds: number[], pitches: number[]): number {
  const loud = louds.length >= 2 ? clamp01(1 - (std(louds) - 0.08) / 0.3) : 0.5
  let pitch = 0.5
  if (pitches.length >= 3) {
    const med = median(pitches)
    const kept = pitches.filter((p) => p > med * 0.63 && p < med * 1.6) // drop octave errors
    const m = mean(kept)
    if (kept.length >= 3 && m > 0) pitch = clamp01(1 - (std(kept) / m - 0.03) / 0.12)
  }
  return 0.6 * pitch + 0.4 * loud
}

export class ChantScorer {
  readonly words: TimelineWord[]
  readonly mode: ChantMode
  readonly latency: number
  readonly judgements: (Judge | undefined)[]
  onJudge?: (i: number, j: Judge) => void
  combo = 0
  maxCombo = 0
  private state: WordState[]
  private rests: [number, number][] = []
  private restTotal = 0
  private noise = 0
  private stray = 0
  private cursor = 0
  private restCursor = 0
  private lastT: number | null = null
  private wasActive = false
  private lastOnset = -Infinity
  private peak = 0
  private valley = 0
  private armed = false
  private result: ChantResult | null = null

  constructor(timeline: { words: TimelineWord[] } | TimelineWord[], opts: ChantScorerOptions) {
    this.words = Array.isArray(timeline) ? timeline : timeline.words
    this.mode = opts.mode
    this.latency = opts.latency ?? (opts.mode === 'voice' ? VOICE_LATENCY : 0)
    this.onJudge = opts.onJudge
    this.judgements = this.words.map(() => undefined)
    this.state = this.words.map(() => ({ active: 0, onset: null, louds: [], pitches: [], tap: null, rhythm: 0, flow: 0, focus: 0 }))
    for (let i = 1; i < this.words.length; i++) {
      const end = this.words[i - 1].start + this.words[i - 1].dur
      const next = this.words[i].start
      if (next - end <= REST_MIN_GAP) continue
      const a = end + REST_GRACE
      const b = next - REST_LEAD
      if (b > a) {
        this.rests.push([a, b])
        this.restTotal += b - a
      }
    }
  }

  get finished(): boolean {
    return this.result !== null
  }

  /** Feed one analysed microphone frame (voice mode); frames must arrive in time order. */
  feed(frame: VoiceFrame) {
    if (this.mode !== 'voice' || this.result) return
    const t = frame.t - this.latency
    const prev = this.lastT ?? t
    if (!(t >= prev)) return
    this.lastT = t
    const active = frame.active
    const loud = Number.isFinite(frame.loudness) ? frame.loudness : 0

    if (active && t > prev) this.accumulate(prev, t)

    let onset = false
    if (active && !this.wasActive) {
      onset = true
    } else if (active) {
      if (!this.armed) {
        this.peak = Math.max(this.peak, loud)
        if (loud < this.peak - REATTACK / 2) {
          this.armed = true
          this.valley = loud
        }
      } else {
        this.valley = Math.min(this.valley, loud)
        if (loud - this.valley >= REATTACK && t - this.lastOnset >= REATTACK_GAP) onset = true
      }
    }
    if (onset) {
      this.onsetAt(t)
      this.lastOnset = t
      this.armed = false
      this.peak = loud
    }
    this.wasActive = active

    if (active) {
      for (let k = this.cursor; k < this.words.length; k++) {
        const w = this.words[k]
        if (w.start > t) break
        if (t > w.start + w.dur) continue
        this.state[k].louds.push(loud)
        if (frame.pitch !== null && Number.isFinite(frame.pitch) && frame.pitch > 0) this.state[k].pitches.push(frame.pitch)
      }
    }
    this.judgeUntil(t)
  }

  /** Register a tap (tap mode). Returns the judgement it produced, or null for a stray tap. */
  tap(time: number): Judge | null {
    if (this.mode !== 'tap' || this.result) return null
    const t = time - this.latency
    this.judgeUntil(t)
    let best = -1
    for (let k = this.cursor; k < this.words.length; k++) {
      const w = this.words[k]
      if (w.start - t > TAP_WINDOW) break
      if (Math.abs(t - w.start) > TAP_WINDOW) continue
      if (best < 0 || Math.abs(t - w.start) < Math.abs(t - this.words[best].start)) best = k
    }
    if (best < 0) {
      this.stray++
      return null
    }
    // Words skipped over are missed so judgements stay in order.
    while (this.cursor < best) this.judgeNext()
    this.state[best].tap = t
    return this.judgeNext()
  }

  /** Move the clock forward, judging every word whose window has closed (call each frame in tap mode). */
  advance(time: number) {
    if (this.result) return
    this.judgeUntil(time - this.latency)
  }

  finish(): ChantResult {
    if (this.result) return this.result
    while (this.cursor < this.words.length) this.judgeNext()
    const n = this.words.length
    let perfect = 0
    let good = 0
    for (const j of this.judgements) {
      if (j === 'perfect') perfect++
      else if (j === 'good') good++
    }
    const miss = n - perfect - good
    const avg = (f: (s: WordState) => number) => (n ? this.state.reduce((s, w) => s + f(w), 0) / n : 0)

    const completeness = n ? (perfect + good) / n : 0
    const rhythm = avg((s) => s.rhythm)
    let flow: number
    let focus: number
    if (this.mode === 'voice') {
      const noiseFrac = this.restTotal > 0 ? clamp01(this.noise / this.restTotal) : 0
      flow = avg((s) => s.flow) * (1 - NOISE_PENALTY * noiseFrac)
      focus = avg((s) => s.focus)
    } else {
      flow = n ? (0.5 * (perfect + good)) / n + (0.5 * this.maxCombo) / n : 0
      flow *= 1 - NOISE_PENALTY * clamp01(this.stray / Math.max(1, n))
      focus = this.tapRegularity()
    }

    const pct = (v: number) => Math.round(clamp01(v) * 100)
    const raw =
      WEIGHTS.completeness * clamp01(completeness) + WEIGHTS.rhythm * clamp01(rhythm) + WEIGHTS.flow * clamp01(flow) + WEIGHTS.focus * clamp01(focus)
    const score = Math.max(0, Math.min(100, Math.round(raw * 100)))
    this.result = {
      score,
      stars: starsFor(score),
      grade: gradeFor(score),
      perfect,
      good,
      miss,
      maxCombo: this.maxCombo,
      rhythm: pct(rhythm),
      flow: pct(flow),
      focus: pct(focus),
      completeness: pct(completeness),
    }
    return this.result
  }

  private deadline(w: TimelineWord): number {
    return this.mode === 'voice' ? w.start + w.dur + JUDGE_LAG : w.start + Math.max(w.dur, TAP_WINDOW)
  }

  private judgeUntil(t: number) {
    while (this.cursor < this.words.length && t > this.deadline(this.words[this.cursor])) this.judgeNext()
  }

  private judgeNext(): Judge {
    const i = this.cursor++
    const j = this.mode === 'voice' ? this.judgeVoice(i) : this.judgeTap(i)
    this.judgements[i] = j
    if (j === 'miss') this.combo = 0
    else this.maxCombo = Math.max(this.maxCombo, ++this.combo)
    this.onJudge?.(i, j)
    return j
  }

  private judgeVoice(i: number): Judge {
    const w = this.words[i]
    const s = this.state[i]
    const cov = w.dur > 0 ? clamp01(s.active / w.dur) : 0
    const j: Judge =
      cov >= PERFECT_COVERAGE && s.onset !== null && Math.abs(s.onset) <= PERFECT_ONSET ? 'perfect' : cov >= GOOD_COVERAGE ? 'good' : 'miss'
    s.flow = clamp01(cov / FLOW_FULL_COVERAGE)
    if (j !== 'miss') {
      s.rhythm = s.onset !== null ? clamp01(1 - Math.max(0, Math.abs(s.onset) - 0.1) / 0.35) : SLUR_RHYTHM
      s.focus = steadiness(s.louds, s.pitches)
    }
    s.louds = []
    s.pitches = []
    return j
  }

  private judgeTap(i: number): Judge {
    const s = this.state[i]
    if (s.tap === null) return 'miss'
    const e = Math.abs(s.tap - this.words[i].start)
    const j: Judge = e <= TAP_PERFECT ? 'perfect' : e <= TAP_GOOD ? 'good' : 'miss'
    if (j !== 'miss') s.rhythm = clamp01(1 - Math.max(0, e - 0.06) / 0.24)
    else s.tap = null
    return j
  }

  /** Voice was active during [a, b]: add it to word coverage and rest noise. */
  private accumulate(a: number, b: number) {
    for (let k = this.cursor; k < this.words.length; k++) {
      const w = this.words[k]
      if (w.start >= b) break
      const o = Math.min(b, w.start + w.dur) - Math.max(a, w.start)
      if (o > 0) this.state[k].active += o
    }
    while (this.restCursor < this.rests.length && this.rests[this.restCursor][1] <= a) this.restCursor++
    for (let r = this.restCursor; r < this.rests.length; r++) {
      const [s, e] = this.rests[r]
      if (s >= b) break
      const o = Math.min(b, e) - Math.max(a, s)
      if (o > 0) this.noise += o
    }
  }

  /** Keep, per word, the onset nearest its start within [start - ONSET_EARLY, start + dur]. */
  private onsetAt(t: number) {
    for (let k = this.cursor; k < this.words.length; k++) {
      const w = this.words[k]
      if (w.start - ONSET_EARLY > t) break
      if (t > w.start + w.dur) continue
      const e = t - w.start
      const s = this.state[k]
      if (s.onset === null || Math.abs(e) < Math.abs(s.onset)) s.onset = e
    }
  }

  private tapRegularity(): number {
    const n = this.words.length
    if (n < 2) return n && this.state[0].tap !== null ? 1 : 0
    let sum = 0
    for (let i = 1; i < n; i++) {
      const a = this.state[i - 1].tap
      const b = this.state[i].tap
      if (a === null || b === null) continue
      const d = Math.abs(b - a - (this.words[i].start - this.words[i - 1].start))
      sum += clamp01(1 - Math.max(0, d - 0.04) / 0.25)
    }
    return sum / (n - 1)
  }
}

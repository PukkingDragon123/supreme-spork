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

const THAI_O = 0x0e2d
const THAI_WO = 0x0e27
const THAI_YO = 0x0e22

/** Is the vowel/tone sequence after position j a following vowel (skipping tone marks)? */
function vowelAfter(word: string, j: number): boolean {
  while (j < word.length && isToneMark(word.charCodeAt(j))) j++
  return j < word.length && isFollowingVowel(word.charCodeAt(j))
}

/**
 * Split a Pali/Thai word into syllables. Heuristic: a consonant opens a
 * syllable when a leading vowel (เ แ โ ใ ไ) precedes it, a vowel sign
 * follows it, or อ/ว/ย act as its vowel (ผ่อ, กวน); bare consonants are
 * finals or cluster heads (ส-วาก, ค-รี).
 */
export function splitSyllables(word: string): string[] {
  const onsets: number[] = []
  for (let i = 0; i < word.length; i++) {
    const c = word.charCodeAt(i)
    if (!isConsonant(c)) continue
    if (i > 0 && isLeadingVowel(word.charCodeAt(i - 1))) {
      onsets.push(i - 1)
      continue
    }
    if (vowelAfter(word, i + 1)) {
      onsets.push(i)
      continue
    }
    let j = i + 1
    while (j < word.length && isToneMark(word.charCodeAt(j))) j++
    const k = word.charCodeAt(j)
    // A vowel carrier (ผ่อ, กวน), unless the carrier opens its own syllable (ส-วาก).
    if (j < word.length && (k === THAI_O || k === THAI_WO || k === THAI_YO) && !vowelAfter(word, j + 1)) onsets.push(i)
  }
  if (!onsets.length) return word ? [word] : []
  onsets[0] = 0
  const out: string[] = []
  for (let k = 0; k < onsets.length; k++) {
    const a = onsets[k]
    const b = k + 1 < onsets.length ? onsets[k + 1] : word.length
    if (b > a) out.push(word.slice(a, b))
  }
  return out
}

/** Syllables of a word, clamped to 1..6 (kept for older callers and tests). */
export function estimateSyllables(word: string): number {
  return Math.min(6, Math.max(1, splitSyllables(word).length))
}

/** Syllable count used for timing: long Pali compounds get the time they need. */
export function syllableUnits(word: string): number {
  return Math.min(10, Math.max(1, splitSyllables(word).length))
}

export interface TimelineSyllable {
  text: string
  /** Seconds from the chant start. */
  start: number
  dur: number
}

export interface TimelineWord {
  index: number
  text: string
  line: number
  /** Seconds from the chant start. */
  start: number
  dur: number
  bow?: boolean
  /** Syllables with their own highlight windows (evenly split across the word). */
  syl: TimelineSyllable[]
}

export interface TimelineOptions {
  msPerSyllable?: number
  gapMs?: number
  lineGapMs?: number
  leadInMs?: number
}

/** Split a word's window evenly between its syllables. */
export function syllableWindows(text: string, start: number, dur: number): TimelineSyllable[] {
  const parts = splitSyllables(text)
  const list = parts.length ? parts : [text]
  const d = dur / list.length
  return list.map((p, i) => ({ text: p, start: start + i * d, dur: d }))
}

/** Words of a line, without bow markers. */
export function lineWords(line: string): string[] {
  return line.split(/\s+/).filter((w) => w && w !== BOW_TOKEN)
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
      const dur = syllableUnits(tok) * msPerSyllable
      words.push({ index: words.length, text: tok, line: li, start: t / 1000, dur: dur / 1000, syl: syllableWindows(tok, t / 1000, dur / 1000) })
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

/** Timing windows per strictness level (2 = the classic defaults above). */
export interface JudgeWindows {
  tapWindow: number
  tapPerfect: number
  tapGood: number
  /** A late tap still counts while inside this fraction of the word. */
  inside: number
  perfectOnset: number
  perfectCoverage: number
  goodCoverage: number
}

export const JUDGE_WINDOWS: Record<1 | 2 | 3 | 4, JudgeWindows> = {
  1: { tapWindow: 0.4, tapPerfect: 0.14, tapGood: 0.34, inside: 1, perfectOnset: 0.36, perfectCoverage: 0.5, goodCoverage: 0.2 },
  2: { tapWindow: TAP_WINDOW, tapPerfect: TAP_PERFECT, tapGood: TAP_GOOD, inside: 1, perfectOnset: PERFECT_ONSET, perfectCoverage: PERFECT_COVERAGE, goodCoverage: GOOD_COVERAGE },
  3: { tapWindow: 0.3, tapPerfect: 0.1, tapGood: 0.24, inside: 0.6, perfectOnset: 0.25, perfectCoverage: 0.6, goodCoverage: 0.3 },
  4: { tapWindow: 0.25, tapPerfect: 0.08, tapGood: 0.19, inside: 0.4, perfectOnset: 0.2, perfectCoverage: 0.65, goodCoverage: 0.35 },
}

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
  return starsWith(score, STAR_SCORES)
}

/** Stars for a score against a stage's own thresholds. */
export function starsWith(score: number, t: readonly [number, number, number]): 0 | 1 | 2 | 3 {
  return score >= t[2] ? 3 : score >= t[1] ? 2 : score >= t[0] ? 1 : 0
}

export function gradeFor(score: number): ChantResult['grade'] {
  return score >= 95 ? 'S' : score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D'
}

export interface ChantScorerOptions {
  mode: ChantMode
  /** Seconds subtracted from incoming times (defaults to VOICE_LATENCY in voice mode, 0 for taps). */
  latency?: number
  onJudge?: (i: number, j: Judge) => void
  /** Timing strictness (default 2). */
  judge?: 1 | 2 | 3 | 4
  /** Scores for 1★/2★/3★ (default STAR_SCORES). */
  stars?: readonly [number, number, number]
  /** Memory-quiz words (tap mode): they stay open longer so there is time to read the choices. */
  quiz?: number[]
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
  forced?: 'miss' | 'answer'
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
  readonly win: JudgeWindows
  readonly starScores: readonly [number, number, number]
  private readonly quiz: Set<number>
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
    this.win = JUDGE_WINDOWS[opts.judge ?? 2] ?? JUDGE_WINDOWS[2]
    this.starScores = opts.stars ?? STAR_SCORES
    this.quiz = new Set(opts.quiz ?? [])
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
    const W = this.win.tapWindow
    for (let k = this.cursor; k < this.words.length; k++) {
      const w = this.words[k]
      if (w.start - t > W) break
      // Early by up to the tap window, or while (the first part of) the word is highlighted.
      if (t < w.start - W || t > this.lateLimit(w)) continue
      if (this.state[k].tap !== null) continue
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

  /**
   * Memory quiz (tap mode): the player picked a word for blank `i`. A wrong
   * pick is a miss; a right one is judged on timing but never worse than good.
   */
  answer(i: number, time: number, correct: boolean): Judge | null {
    if (this.mode !== 'tap' || this.result || i < this.cursor || i >= this.words.length) return null
    const t = time - this.latency
    while (this.cursor < i) this.judgeNext()
    const s = this.state[i]
    if (!correct) {
      s.tap = null
      s.forced = 'miss'
    } else {
      s.tap = t
      s.forced = 'answer'
    }
    return this.judgeNext()
  }

  /** Seconds between a word's start and the tap that judged it (tap mode), or null. */
  tapOffset(i: number): number | null {
    const s = this.state[i]
    return s && s.tap !== null ? s.tap - this.words[i].start : null
  }

  /** Words judged so far. */
  get judgedCount(): number {
    return this.cursor
  }

  /** A running estimate of the final score from the words judged so far (0 before any). */
  liveScore(): number {
    const n = this.cursor
    if (!n) return 0
    let hits = 0
    let rhythm = 0
    let flow = 0
    let focus = 0
    for (let i = 0; i < n; i++) {
      const j = this.judgements[i]
      const s = this.state[i]
      if (j !== 'miss') hits++
      rhythm += s.rhythm
      flow += this.mode === 'voice' ? s.flow : j !== 'miss' ? 1 : 0
      focus += this.mode === 'voice' ? s.focus : s.rhythm
    }
    const comp = hits / n
    const fl = this.mode === 'voice' ? flow / n : 0.5 * comp + 0.5 * Math.min(1, this.maxCombo / n)
    const raw = WEIGHTS.completeness * comp + WEIGHTS.rhythm * (rhythm / n) + WEIGHTS.flow * fl + WEIGHTS.focus * Math.min(1, (focus / n) * 1.1)
    return Math.max(0, Math.min(100, Math.round(raw * 100)))
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
      stars: starsWith(score, this.starScores),
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
    return this.mode === 'voice' ? w.start + w.dur + JUDGE_LAG : this.lateLimit(w)
  }

  /** Latest tap time that still belongs to word w. */
  private lateLimit(w: TimelineWord): number {
    if (this.quiz.has(w.index)) return w.start + Math.max(w.dur, 0.9) + 0.3
    return w.start + Math.max(w.dur * this.win.inside, this.win.tapWindow)
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
      cov >= this.win.perfectCoverage && s.onset !== null && Math.abs(s.onset) <= this.win.perfectOnset ? 'perfect' : cov >= this.win.goodCoverage ? 'good' : 'miss'
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
    const w = this.words[i]
    const e = Math.abs(s.tap - w.start)
    const W = this.win
    // Perfect near the word's start; tapping anywhere else inside the highlighted word is still good.
    const inside = s.forced === 'answer' || (s.tap >= w.start - W.tapWindow && s.tap <= this.lateLimit(w))
    const j: Judge = e <= W.tapPerfect ? 'perfect' : e <= W.tapGood || inside ? 'good' : 'miss'
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

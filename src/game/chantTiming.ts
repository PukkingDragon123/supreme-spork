// Chant timing: turns a stage into a timeline of words and syllables, either
// from the synthetic tempo or from a real recording's line timings, and maps
// between the timeline clock and the audio file. Also auto-aligns recordings
// by their pauses and picks words for memory quizzes. Pure (no DOM), unit
// tested in Node.

import { BOW_TOKEN, TAIL_MS, buildTimeline, lineWords, syllableUnits, syllableWindows, type TimelineWord } from './chantScore'
import { chantById, stageRange, stageSourceLines, stageLines, type PrayerStage } from './data/prayers'

/** Seconds before the first word (count-in, bell, drone swell). */
export const LEAD_IN = 2.4
/** Silence between rounds when a recording is replayed. */
export const ROUND_GAP = 1.2
/** Recorded audio starts this long before the first line's mark. */
export const PRE_ROLL = 0.3
/** Share of a line's slot that is voice (the rest is the breath before the next line). */
const LINE_FILL = 0.9
/** Gap between words inside a line, in syllable units. */
const WORD_GAP_UNITS = 0.3

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)

// ---------------------------------------------------------------------------
// Line timing files (public/audio/chant/<id>.json or made with the tap tool)

export interface LineTiming {
  /** Audio time (seconds) where each chant line starts. */
  lines: number[]
  /** Audio time the chanting ends (default: the file length). */
  end?: number
  /** Optional word start times per line (null = spread by syllables). */
  words?: (number[] | null)[]
  /** Made by auto-align rather than by a person. */
  auto?: boolean
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/**
 * Validate a timing file for a chant with `nLines` lines. Accepts
 * `{ "lines": [..], "end": 42 }` or a bare array of line start times.
 * Times must be non-negative and increasing.
 */
export function parseTiming(raw: unknown, nLines: number): LineTiming | null {
  const obj = Array.isArray(raw) ? { lines: raw } : raw
  if (!obj || typeof obj !== 'object') return null
  const o = obj as Record<string, unknown>
  const lines = o.lines
  if (!Array.isArray(lines) || lines.length !== nLines || !lines.every(isNum)) return null
  for (let i = 0; i < lines.length; i++) if (lines[i] < 0 || (i > 0 && lines[i] <= lines[i - 1])) return null
  const out: LineTiming = { lines: [...lines] }
  if (isNum(o.end) && o.end > lines[lines.length - 1]) out.end = o.end
  if (Array.isArray(o.words) && o.words.length === nLines)
    out.words = o.words.map((w) => (Array.isArray(w) && w.length && w.every(isNum) ? [...w] : null))
  if (o.auto === true) out.auto = true
  return out
}

/** Pretty JSON for a timing file (what the tap tool exports). */
export function timingJson(chantId: string, t: LineTiming): string {
  const r = (v: number) => Math.round(v * 100) / 100
  return JSON.stringify({ chant: chantId, lines: t.lines.map(r), ...(t.end ? { end: r(t.end) } : {}) }, null, 2)
}

// ---------------------------------------------------------------------------
// Stage plans

export interface AudioSegment {
  /** Timeline seconds while this segment plays. */
  t0: number
  t1: number
  /** Audio file seconds at t0 / t1. */
  a0: number
  a1: number
  /** Which recording plays (index into the stage's recordings; sets chain several). */
  src: number
}

export interface StagePlan {
  lines: string[]
  /** Chant line index of every plan line (verse lookup). */
  src: number[]
  words: TimelineWord[]
  total: number
  /** Timeline start/end of every line (first word start, last word end). */
  lineStart: number[]
  lineEnd: number[]
  /** Playback rate of the recording (file plans). */
  rate: number
  /** Recording segments (empty for synth plans). */
  segments: AudioSegment[]
  source: 'synth' | 'file'
}

function lineSpans(words: TimelineWord[], nLines: number) {
  const lineStart: number[] = Array(nLines).fill(0)
  const lineEnd: number[] = Array(nLines).fill(0)
  for (let i = 0; i < nLines; i++) {
    const ws = words.filter((w) => w.line === i)
    if (ws.length) {
      lineStart[i] = ws[0].start
      lineEnd[i] = ws[ws.length - 1].start + ws[ws.length - 1].dur
    } else if (i > 0) lineStart[i] = lineEnd[i] = lineEnd[i - 1]
  }
  return { lineStart, lineEnd }
}

/** Timeline from the stage tempo (the synthesized guide). */
export function synthPlan(st: PrayerStage, tempo = st.tempo): StagePlan {
  const lines = stageLines(st)
  const { words, total } = buildTimeline(lines, { msPerSyllable: tempo, leadInMs: LEAD_IN * 1000 })
  return { lines, src: stageSourceLines(st), words, total, ...lineSpans(words, lines.length), rate: 1, segments: [], source: 'synth' }
}

/** Natural pace of a recording in ms per syllable over lines [a, b). */
export function recordingPace(chantLines: string[], timing: LineTiming, duration: number, a: number, b: number): number {
  const endOf = (i: number) => (i + 1 < chantLines.length ? timing.lines[i + 1] : (timing.end ?? duration))
  let syl = 0
  let secs = 0
  for (let i = a; i < b; i++) {
    for (const w of lineWords(chantLines[i])) syl += syllableUnits(w)
    secs += (endOf(i) - timing.lines[i]) * LINE_FILL
  }
  return syl > 0 ? (secs * 1000) / syl : 400
}

/** Playback rate that moves a recording toward the stage tempo (gently). */
export function recordingRate(paceMs: number, stageTempo: number): number {
  const r = clamp(paceMs / stageTempo, 0.85, 1.3)
  return Math.abs(r - 1) < 0.06 ? 1 : Math.round(r * 100) / 100
}

/** One recording feeding a plan: lines [from, to) of the recorded chant. */
export interface RecordedPart {
  /** The recorded chant's lines. */
  lines: string[]
  timing: LineTiming
  duration: number
  from: number
  to: number
  /** Stage-chant line index of `from` (a set's part starts after the parts before it). */
  offset: number
}

/** Pause between two recordings chained in one round (boss sets). */
export const PART_GAP = 0.8

function recordedPlan(st: PrayerStage, parts: RecordedPart[], rateOpt?: number): StagePlan {
  const rounds = Math.max(1, st.rounds ?? 1)
  let sylTotal = 0
  let paceSum = 0
  for (const p of parts) {
    let syl = 0
    for (let i = p.from; i < p.to; i++) for (const w of lineWords(p.lines[i])) syl += syllableUnits(w)
    paceSum += recordingPace(p.lines, p.timing, p.duration, p.from, p.to) * syl
    sylTotal += syl
  }
  const rate = rateOpt ?? recordingRate(sylTotal ? paceSum / sylTotal : 400, st.tempo)
  const words: TimelineWord[] = []
  const segments: AudioSegment[] = []
  const lines: string[] = []
  const src: number[] = []
  let cursor = LEAD_IN
  for (let r = 0; r < rounds; r++) {
    if (r > 0) cursor += ROUND_GAP - PART_GAP
    parts.forEach((p, k) => {
      const cl = p.lines
      const end = p.timing.end ?? p.duration
      const lastEnd = p.to < cl.length ? p.timing.lines[p.to] : end
      const a0 = Math.max(0, p.timing.lines[p.from] - PRE_ROLL)
      const a1 = Math.max(a0 + 0.1, lastEnd)
      const span = (a1 - a0) / rate
      const t0 = cursor
      segments.push({ t0, t1: t0 + span, a0, a1, src: k })
      const toT = (audio: number) => t0 + (audio - a0) / rate
      for (let i = p.from; i < p.to; i++) {
        const li = lines.length
        lines.push(cl[i])
        src.push(p.offset + i - p.from)
        const ls = p.timing.lines[i]
        const isLast = i + 1 >= cl.length
        const le = i + 1 < cl.length ? p.timing.lines[i + 1] : end
        const speech = (le - ls) * (isLast ? 1 : LINE_FILL)
        const toks = cl[i].split(/\s+/).filter(Boolean)
        const ws = toks.filter((w) => w !== BOW_TOKEN)
        const marks = p.timing.words?.[i]
        const units = ws.map(syllableUnits)
        const total = units.reduce((s, u) => s + u, 0) + WORD_GAP_UNITS * Math.max(0, ws.length - 1)
        const unit = total > 0 ? speech / total : 0
        let acc = 0
        let wi = 0
        for (const tok of toks) {
          if (tok === BOW_TOKEN) {
            const prev = words[words.length - 1]
            if (prev && prev.line === li) prev.bow = true
            continue
          }
          let s0: number
          let s1: number
          if (marks && marks.length === ws.length) {
            s0 = marks[wi]
            s1 = wi + 1 < ws.length ? marks[wi + 1] - 0.08 : ls + speech
            if (!(s1 > s0)) s1 = s0 + units[wi] * 0.2
          } else {
            s0 = ls + acc * unit
            s1 = s0 + units[wi] * unit
          }
          acc += units[wi] + WORD_GAP_UNITS
          const start = toT(s0)
          const dur = Math.max(0.12, (s1 - s0) / rate)
          words.push({ index: words.length, text: tok, line: li, start, dur, syl: syllableWindows(tok, start, dur) })
          wi++
        }
      }
      cursor = t0 + span + PART_GAP
    })
  }
  const last = segments[segments.length - 1]
  const total = last.t1 + TAIL_MS / 1000
  return { lines, src, words, total, ...lineSpans(words, lines.length), rate, segments, source: 'file' }
}

/**
 * Timeline from a real recording: words are spread across each line's
 * marked slot by syllables (or placed at marked word times), rounds replay
 * the recording, and `segments` say which audio plays when.
 */
export function filePlan(st: PrayerStage, timing: LineTiming, duration: number, opts: { rate?: number } = {}): StagePlan {
  const cl = chantById(st.chant).lines
  const [a, b] = stageRange(st)
  return recordedPlan(st, [{ lines: cl, timing, duration, from: a, to: b, offset: a }], opts.rate)
}

/**
 * Timeline for a boss set (e.g. นะโม + ไตรสรณคมน์) from one recording per
 * part, played one after another. Null when the stage sings only part of the set.
 */
export function setPlan(st: PrayerStage, parts: { lines: string[]; timing: LineTiming; duration: number }[], opts: { rate?: number } = {}): StagePlan | null {
  const c = chantById(st.chant)
  if (!c.parts || st.part || parts.length !== c.parts.length) return null
  let offset = 0
  const rec: RecordedPart[] = parts.map((p) => {
    const r = { ...p, from: 0, to: p.lines.length, offset }
    offset += p.lines.length
    return r
  })
  if (offset !== c.lines.length) return null
  return recordedPlan(st, rec, opts.rate)
}

/** What a plan needs to know about a recording. */
export interface RecordingInfo {
  chantId: string
  timing: LineTiming | null
  duration: number
}

/**
 * The plan for a stage: its recording (or, for a boss set, one recording per
 * part) when the line timing covers what the stage sings, else the tempo.
 */
export function planStage(st: PrayerStage, recs: RecordingInfo[], opts: { rate?: number } = {}): StagePlan {
  const c = chantById(st.chant)
  const usable = (r: RecordingInfo, needEnd: boolean) => {
    const t = r.timing
    const n = chantById(r.chantId).lines.length
    if (!t || t.lines.length !== n) return false
    // Singing up to the last line needs to know where the chanting ends.
    return !needEnd || (t.end ?? r.duration) > t.lines[n - 1] + 0.3
  }
  if (recs.length === 1 && recs[0].chantId === st.chant) {
    const r = recs[0]
    const [, b] = stageRange(st)
    if (usable(r, b >= c.lines.length)) return filePlan(st, r.timing!, r.duration || r.timing!.end || 0, opts)
  } else if (c.parts && recs.length === c.parts.length && recs.every((r, i) => r.chantId === c.parts![i] && usable(r, true))) {
    const p = setPlan(
      st,
      recs.map((r) => ({ lines: chantById(r.chantId).lines, timing: r.timing!, duration: r.duration })),
      opts,
    )
    if (p) return p
  }
  return synthPlan(st)
}

/** Where the recording should be at timeline time t (null = silence between segments). */
export function audioAt(segments: AudioSegment[], t: number): { seg: number; pos: number } | null {
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i]
    if (t >= s.t0 && t < s.t1) return { seg: i, pos: s.a0 + ((t - s.t0) / (s.t1 - s.t0)) * (s.a1 - s.a0) }
  }
  return null
}

/** Timeline time for an audio position inside segment `seg`. */
export function timeAt(segments: AudioSegment[], seg: number, pos: number): number {
  const s = segments[seg]
  return s.t0 + ((pos - s.a0) / (s.a1 - s.a0)) * (s.t1 - s.t0)
}

// ---------------------------------------------------------------------------
// Auto-align: find the line breaks of a recording from its loudness envelope.

/** Relative length of every line (syllables plus word gaps). */
export function lineWeights(lines: string[]): number[] {
  return lines.map((l) => {
    const ws = lineWords(l)
    return ws.reduce((s, w) => s + syllableUnits(w), 0) + WORD_GAP_UNITS * Math.max(0, ws.length - 1) + 0.01
  })
}

function percentile(a: Float32Array | number[], p: number): number {
  const s = Array.from(a).sort((x, y) => x - y)
  if (!s.length) return 0
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))))]
}

/**
 * Guess where each line starts from an RMS envelope (one value every `hop`
 * seconds): voice regions are found with an adaptive threshold, then the
 * pauses that best match the lines' relative lengths become line breaks.
 */
export function autoAlign(env: Float32Array | number[], hop: number, weights: number[]): LineTiming | null {
  const n = env.length
  const L = weights.length
  if (n < 10 || !L) return null
  const floor = percentile(env, 0.1)
  const peak = percentile(env, 0.95)
  if (!(peak > floor * 1.5) || peak <= 0) return null
  const thr = floor + 0.15 * (peak - floor)
  const voiced = new Uint8Array(n)
  for (let i = 0; i < n; i++) voiced[i] = env[i] > thr ? 1 : 0
  // Close tiny gaps (between syllables) and drop tiny blips (clicks).
  const fill = Math.round(0.12 / hop)
  const blip = Math.round(0.08 / hop)
  const runs = (v: 0 | 1, maxLen: number, set: 0 | 1) => {
    let i = 0
    while (i < n) {
      if (voiced[i] !== v) {
        i++
        continue
      }
      let j = i
      while (j < n && voiced[j] === v) j++
      if (j - i <= maxLen && i > 0 && j < n) for (let k = i; k < j; k++) voiced[k] = set
      i = j
    }
  }
  runs(0, fill, 1)
  runs(1, blip, 0)
  let first = voiced.indexOf(1)
  let last = voiced.lastIndexOf(1)
  if (first < 0 || last <= first) return null
  const start = first * hop
  const end = (last + 1) * hop
  if (L === 1) return { lines: [Math.max(0, start - 0.02)], end, auto: true }
  // Pauses inside the chant.
  const minPause = Math.round(0.15 / hop)
  const pauses: { a: number; b: number }[] = []
  for (let i = first; i <= last; ) {
    if (voiced[i]) {
      i++
      continue
    }
    let j = i
    while (j <= last && !voiced[j]) j++
    if (j - i >= minPause) pauses.push({ a: i * hop, b: j * hop })
    i = j
  }
  const tot = weights.reduce((s, w) => s + w, 0)
  const span = end - start
  const expected: number[] = []
  let acc = 0
  for (let k = 0; k < L - 1; k++) {
    acc += weights[k]
    expected.push(start + (acc / tot) * span)
  }
  const need = L - 1
  let breaks: number[]
  if (pauses.length >= need) {
    // DP: pick `need` pauses in order, close to where lines should break; longer pauses are likelier.
    const m = pauses.length
    const cost = (k: number, p: number) => {
      const c = (pauses[p].a + pauses[p].b) / 2
      const d = (c - expected[k]) / span
      return d * d * 40 - Math.min(1.2, pauses[p].b - pauses[p].a) * 0.6
    }
    const INF = 1e9
    const dp: number[][] = Array.from({ length: need }, () => Array(m).fill(INF))
    const from: number[][] = Array.from({ length: need }, () => Array(m).fill(-1))
    for (let p = 0; p < m; p++) dp[0][p] = cost(0, p)
    for (let k = 1; k < need; k++) {
      let best = INF
      let bestP = -1
      for (let p = k; p < m; p++) {
        if (dp[k - 1][p - 1] < best) {
          best = dp[k - 1][p - 1]
          bestP = p - 1
        }
        if (bestP >= 0) {
          dp[k][p] = best + cost(k, p)
          from[k][p] = bestP
        }
      }
    }
    let p = -1
    let best = INF
    for (let q = need - 1; q < m; q++)
      if (dp[need - 1][q] < best) {
        best = dp[need - 1][q]
        p = q
      }
    const pick: number[] = []
    for (let k = need - 1; k >= 0 && p >= 0; k--) {
      pick.unshift(p)
      p = from[k][p]
    }
    breaks = pick.map((q) => pauses[q].b)
  } else breaks = expected
  const lines = [Math.max(0, start - 0.02), ...breaks.map((b) => Math.max(0, b - 0.02))]
  for (let i = 1; i < lines.length; i++) if (lines[i] <= lines[i - 1]) lines[i] = lines[i - 1] + 0.05
  return { lines, end, auto: true }
}

/** RMS envelope of mono samples, one value per `hop` seconds. */
export function envelope(samples: Float32Array, sampleRate: number, hop = 0.02): Float32Array {
  const size = Math.max(1, Math.round(sampleRate * hop))
  const n = Math.floor(samples.length / size)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let s = 0
    for (let j = i * size, e = j + size; j < e; j++) s += samples[j] * samples[j]
    out[i] = Math.sqrt(s / size)
  }
  return out
}

// ---------------------------------------------------------------------------
// Guide voice (speech synthesis) pacing

/** Typical speaking speed of Thai voices at rate 1, in syllables per second. */
export const DEFAULT_SPS = 5

/** Speech rate that makes a voice (speaking `sps1` syllables/s at rate 1) keep a tempo in ms per syllable. */
export function speechRateFor(tempoMs: number, sps1 = DEFAULT_SPS): number {
  return Math.round(clamp(1000 / tempoMs / Math.max(1, sps1), 0.3, 1.5) * 100) / 100
}

/** Update the voice's measured speed after it spoke `syllables` in `spokenSec` at `rate`. */
export function learnSps(prev: number, syllables: number, spokenSec: number, rate: number): number {
  if (!(spokenSec > 0.3) || !(syllables > 0) || !(rate > 0)) return prev
  const sps1 = clamp(syllables / spokenSec / rate, 1.5, 14)
  return Math.round((prev * 0.6 + sps1 * 0.4) * 100) / 100
}

/** Text a guide voice should read for a line (bow markers removed). */
export function speakable(line: string): string {
  return lineWords(line).join(' ')
}

// ---------------------------------------------------------------------------
// Memory quiz: some blanks become "pick the right word" in tap mode.

export interface QuizWord {
  /** Timeline word index. */
  i: number
  /** Three choices including the answer, in display order. */
  choices: string[]
  answer: number
}

function hash(n: number): number {
  let x = (n ^ 0x9e3779b9) >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0
  return (x ^ (x >>> 16)) >>> 0
}

/**
 * Pick quiz words: about `share` of the words (never the very first, never
 * two in a row), each with two distractors from the chant's own words, of a
 * similar length when possible.
 */
export function pickQuiz(words: TimelineWord[], pool: string[], seed = 1, share = 0.4): QuizWord[] {
  const uniq = [...new Set(pool)]
  const out: QuizWord[] = []
  let lastQ = -3
  for (const w of words) {
    if (w.index === 0 || w.index - lastQ < 2) continue
    if (hash(w.index * 131 + seed) % 1000 >= share * 1000) continue
    const others = uniq.filter((x) => x !== w.text)
    if (others.length < 2) continue
    const u = syllableUnits(w.text)
    others.sort((x, y) => {
      const dx = Math.abs(syllableUnits(x) - u)
      const dy = Math.abs(syllableUnits(y) - u)
      return dx - dy || (hash(seed + x.length * 7 + w.index) % 3) - 1
    })
    const near = others.slice(0, Math.min(others.length, 4))
    const h = hash(seed * 17 + w.index)
    const d1 = near[h % near.length]
    const rest = near.filter((x) => x !== d1)
    const d2 = rest[(h >>> 8) % rest.length]
    const answer = (h >>> 16) % 3
    const choices = [d1, d2]
    choices.splice(answer, 0, w.text)
    out.push({ i: w.index, choices, answer })
    lastQ = w.index
  }
  return out
}

// Microphone input for chanting: level, pitch and voice activity. No speech
// recognition; the maths helpers are pure so they can be unit tested in Node.

export interface PitchResult {
  freq: number
  clarity: number
}

export interface VoiceFrame {
  /** Seconds since the input started (callers may restamp it). */
  t: number
  /** Raw RMS level of the analyser window. */
  level: number
  /** 0 at the activation threshold, 1 about LOUDNESS_RANGE_DB louder. */
  loudness: number
  active: boolean
  pitch: number | null
  clarity: number
}

export const PITCH_MIN_CLARITY = 0.5
export const VAD_ATTACK = 0.04
export const VAD_RELEASE = 0.18
export const LOUDNESS_RANGE_DB = 36

const PITCH_PEAK_K = 0.9
const PITCH_INTERVAL = 0.05
const SILENCE_RMS = 1e-4

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)

export function rms(buf: Float32Array): number {
  const n = buf.length
  if (!n) return 0
  let s = 0
  for (let i = 0; i < n; i++) s += buf[i] * buf[i]
  return Math.sqrt(s / n)
}

/**
 * Fundamental frequency via the normalised square difference function
 * (McLeod pitch method) with parabolic interpolation of the chosen peak.
 * Returns null for silence or unpitched noise.
 */
export function detectPitch(buf: Float32Array, sampleRate: number, minHz = 70, maxHz = 500): PitchResult | null {
  // Voice pitch needs no more than ~22 kHz, so halve 44.1/48 kHz input (4x less work).
  const step = sampleRate > 30000 && maxHz < 2000 ? 2 : 1
  const sr = sampleRate / step
  const n = Math.floor(buf.length / step)
  const minLag = Math.max(2, Math.floor(sr / maxHz))
  const maxLag = Math.min(n - 2, Math.ceil(sr / minHz))
  if (maxLag <= minLag) return null

  const x = new Float32Array(n)
  let mean = 0
  for (let i = 0; i < n; i++) {
    x[i] = step === 2 ? (buf[2 * i] + buf[2 * i + 1]) / 2 : buf[i]
    mean += x[i]
  }
  mean /= n
  let energy = 0
  for (let i = 0; i < n; i++) {
    x[i] -= mean
    energy += x[i] * x[i]
  }
  if (!(Math.sqrt(energy / n) >= SILENCE_RMS)) return null

  const nsdf = new Float32Array(maxLag + 2)
  let m = 2 * energy
  for (let tau = 0; tau <= maxLag + 1; tau++) {
    let r = 0
    for (let i = 0, e = n - tau; i < e; i++) r += x[i] * x[i + tau]
    nsdf[tau] = m > 1e-12 ? (2 * r) / m : 0
    m -= x[n - 1 - tau] * x[n - 1 - tau] + x[tau] * x[tau]
  }

  // Skip the lobe around lag 0, then keep the highest point of each positive lobe.
  const peaks: number[] = []
  let tau = 1
  while (tau <= maxLag && nsdf[tau] > 0) tau++
  while (tau <= maxLag) {
    while (tau <= maxLag && nsdf[tau] <= 0) tau++
    let pk = -1
    while (tau <= maxLag && nsdf[tau] > 0) {
      if (pk < 0 || nsdf[tau] > nsdf[pk]) pk = tau
      tau++
    }
    if (pk >= minLag && nsdf[pk] >= nsdf[pk - 1] && nsdf[pk] >= nsdf[pk + 1]) peaks.push(pk)
  }
  if (!peaks.length) return null

  let top = 0
  for (const p of peaks) top = Math.max(top, nsdf[p])
  const p = peaks.find((q) => nsdf[q] >= PITCH_PEAK_K * top)!
  const a = nsdf[p - 1]
  const b = nsdf[p]
  const c = nsdf[p + 1]
  const den = a - 2 * b + c
  const shift = den !== 0 ? clamp((0.5 * (a - c)) / den, -1, 1) : 0
  const clarity = Math.min(1, b - 0.25 * (a - c) * shift)
  if (clarity < PITCH_MIN_CLARITY) return null
  return { freq: sr / (p + shift), clarity }
}

export interface VadOptions {
  /** Level must exceed floor × ratio + margin to count as voice. */
  ratio?: number
  margin?: number
  attack?: number
  release?: number
}

const FLOOR_MIN = 1e-4
const FLOOR_MAX = 0.08
const FLOOR_FALL_TAU = 0.15
const FLOOR_RISE = Math.LN2 / 2
const FLOOR_RISE_ACTIVE = Math.LN2 / 8
/** The floor is seeded from the average level over this long before voice can register. */
export const VAD_WARMUP = 0.3
const DIGITAL_SILENCE = 1e-6

/** Energy-based voice activity with an adaptive noise floor and hysteresis. */
export class VoiceActivityDetector {
  floor = FLOOR_MIN
  active = false
  loudness = 0
  ratio: number
  margin: number
  attack: number
  release: number
  private warm = 0
  private warmSum = 0
  private warmN = 0
  private over = 0
  private under = 0

  constructor(opts: VadOptions = {}) {
    this.ratio = opts.ratio ?? 2.2
    this.margin = opts.margin ?? 0.003
    this.attack = opts.attack ?? VAD_ATTACK
    this.release = opts.release ?? VAD_RELEASE
  }

  get threshold(): number {
    return this.floor * this.ratio + this.margin
  }

  update(level: number, dt: number): boolean {
    const lv = Number.isFinite(level) && level > 0 ? level : 0
    const step = Number.isFinite(dt) ? clamp(dt, 0, 0.25) : 0
    if (this.warm < VAD_WARMUP) {
      this.warm += step
      if (lv > DIGITAL_SILENCE) {
        this.warmSum += lv
        this.warmN++
        this.floor = clamp(this.warmSum / this.warmN, FLOOR_MIN, FLOOR_MAX)
      }
      this.loudness = 0
      return false
    }
    const thr = this.threshold
    if (lv > thr) {
      this.over += step
      this.under = 0
    } else {
      this.under += step
      this.over = 0
    }
    if (!this.active && this.over >= this.attack - 1e-9) this.active = true
    else if (this.active && this.under >= this.release - 1e-9) this.active = false

    // Floor follows quiet moments quickly and creeps up slowly (slower still while voiced).
    // Digital silence (a muted or stalled track) leaves it alone.
    if (lv > DIGITAL_SILENCE) {
      if (lv < this.floor) this.floor += (lv - this.floor) * (1 - Math.exp(-step / FLOOR_FALL_TAU))
      else this.floor = Math.min(lv, this.floor * Math.exp(step * (this.active ? FLOOR_RISE_ACTIVE : FLOOR_RISE)))
      this.floor = clamp(this.floor, FLOOR_MIN, FLOOR_MAX)
    }

    this.loudness = lv > thr ? clamp((20 * Math.log10(lv / thr)) / LOUDNESS_RANGE_DB, 0, 1) : 0
    return this.active
  }

  reset() {
    this.warm = 0
    this.warmSum = 0
    this.warmN = 0
    this.floor = FLOOR_MIN
    this.active = false
    this.loudness = 0
    this.over = 0
    this.under = 0
  }
}

export type VoiceStartResult = 'ok' | 'denied' | 'unsupported' | 'error'

type AudioContextCtor = typeof AudioContext

function audioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor }
  return w.AudioContext ?? w.webkitAudioContext
}

function startFailure(e: unknown): VoiceStartResult {
  const name = (e as { name?: string } | null)?.name ?? ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError' || name === 'NotSupportedError') return 'unsupported'
  return 'error'
}

const silentFrame = (t: number): VoiceFrame => ({ t, level: 0, loudness: 0, active: false, pitch: null, clarity: 0 })

// Older WebKit may lack these or return no promise.
function resumeQuietly(ctx: AudioContext) {
  try {
    ctx.resume()?.catch(() => undefined)
  } catch {
    // ignore
  }
}

function closeQuietly(ctx: AudioContext) {
  try {
    ctx.close()?.catch(() => undefined)
  } catch {
    // ignore
  }
}

const stopTracks = (stream: MediaStream) => stream.getTracks().forEach((tr) => tr.stop())

/** Live microphone analysis: call read(dt) once per animation frame. */
export class VoiceInput {
  readonly vad = new VoiceActivityDetector()
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private buf: Float32Array<ArrayBuffer> = new Float32Array(0)
  private bytes: Uint8Array<ArrayBuffer> | null = null
  private pitch: PitchResult | null = null
  private sincePitch = PITCH_INTERVAL
  private lastResume = 0
  private t = 0
  private gen = 0
  private pending: Promise<VoiceStartResult> | null = null

  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function' && !!audioContextCtor()
  }

  get running(): boolean {
    return this.analyser !== null
  }

  /** Call from a user gesture: the AudioContext is created before the permission prompt. */
  async start(): Promise<VoiceStartResult> {
    if (this.running) return 'ok'
    if (!VoiceInput.isSupported()) return 'unsupported'
    if (!this.pending) this.pending = this.open().finally(() => (this.pending = null))
    return this.pending
  }

  private async open(): Promise<VoiceStartResult> {
    const gen = ++this.gen
    let ctx: AudioContext
    try {
      ctx = new (audioContextCtor()!)()
    } catch {
      return 'error'
    }
    resumeQuietly(ctx)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
      })
    } catch (e) {
      closeQuietly(ctx)
      return startFailure(e)
    }
    if (gen !== this.gen) {
      stopTracks(stream)
      closeQuietly(ctx)
      return 'error'
    }
    try {
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0
      // A muted path to the destination keeps some browsers pulling the graph.
      const mute = ctx.createGain()
      mute.gain.value = 0
      source.connect(analyser)
      analyser.connect(mute).connect(ctx.destination)
      if (ctx.state === 'suspended') resumeQuietly(ctx)
      this.ctx = ctx
      this.stream = stream
      this.source = source
      this.analyser = analyser
      this.buf = new Float32Array(analyser.fftSize)
      this.bytes = typeof analyser.getFloatTimeDomainData === 'function' ? null : new Uint8Array(analyser.fftSize)
      this.vad.reset()
      this.pitch = null
      this.sincePitch = PITCH_INTERVAL
      this.t = 0
      this.lastResume = 0
      return 'ok'
    } catch {
      stopTracks(stream)
      closeQuietly(ctx)
      return 'error'
    }
  }

  /** Analyse the latest audio. Safe to call at any time; returns a silent frame when not running. */
  read(dt: number): VoiceFrame {
    const step = Number.isFinite(dt) && dt > 0 ? dt : 0
    this.t += step
    const a = this.analyser
    const ctx = this.ctx
    if (!a || !ctx) return silentFrame(this.t)
    try {
      if (ctx.state !== 'running' && this.t - this.lastResume > 1) {
        this.lastResume = this.t
        resumeQuietly(ctx)
      }
      const buf = this.buf
      if (this.bytes) {
        a.getByteTimeDomainData(this.bytes)
        for (let i = 0; i < buf.length; i++) buf[i] = (this.bytes[i] - 128) / 128
      } else a.getFloatTimeDomainData(buf)
      const level = rms(buf)
      const active = this.vad.update(level, step)
      this.sincePitch += step
      if (active || level > this.vad.threshold) {
        if (this.sincePitch >= PITCH_INTERVAL) {
          this.sincePitch = 0
          this.pitch = detectPitch(buf, ctx.sampleRate)
        }
      } else {
        this.pitch = null
        this.sincePitch = PITCH_INTERVAL
      }
      return {
        t: this.t,
        level,
        loudness: this.vad.loudness,
        active,
        pitch: this.pitch?.freq ?? null,
        clarity: this.pitch?.clarity ?? 0,
      }
    } catch {
      return silentFrame(this.t)
    }
  }

  stop() {
    this.gen++
    if (this.stream) stopTracks(this.stream)
    try {
      this.source?.disconnect()
    } catch {
      // already disconnected
    }
    if (this.ctx) closeQuietly(this.ctx)
    this.ctx = null
    this.stream = null
    this.source = null
    this.analyser = null
    this.bytes = null
    this.pitch = null
  }
}

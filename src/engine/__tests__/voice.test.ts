import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectPitch, rms, VAD_ATTACK, VAD_RELEASE, VAD_WARMUP, VoiceActivityDetector, VoiceInput } from '../voice'
import { mulberry32 } from '../rng'

const SR = 44100
const N = 2048

const wave = (f: (i: number) => number, n = N) => Float32Array.from({ length: n }, (_, i) => f(i))
const sine = (hz: number, amp = 0.5) => wave((i) => amp * Math.sin((2 * Math.PI * hz * i) / SR))
const noise = (amp: number, seed: number) => {
  const r = mulberry32(seed)
  return wave(() => amp * (r() * 2 - 1))
}

describe('rms', () => {
  it('measures known signals', () => {
    expect(rms(wave(() => 0.3))).toBeCloseTo(0.3, 6)
    expect(rms(wave((i) => (i % 2 ? 0.25 : -0.25)))).toBeCloseTo(0.25, 6)
    // 441 Hz has a period of exactly 100 samples, so 2000 samples are whole cycles.
    expect(rms(wave((i) => 0.8 * Math.sin((2 * Math.PI * 441 * i) / SR), 2000))).toBeCloseTo(0.8 / Math.SQRT2, 5)
  })

  it('is zero for silence and empty buffers', () => {
    expect(rms(new Float32Array(N))).toBe(0)
    expect(rms(new Float32Array(0))).toBe(0)
  })
})

describe('detectPitch', () => {
  for (const hz of [150, 220]) {
    it(`finds a ${hz} Hz sine within 3 Hz`, () => {
      const p = detectPitch(sine(hz), SR)
      expect(p).not.toBeNull()
      expect(Math.abs(p!.freq - hz)).toBeLessThan(3)
      expect(p!.clarity).toBeGreaterThan(0.9)
    })
  }

  it('finds the fundamental of a harmonic-rich voice-like tone', () => {
    const hz = 130
    const buf = wave((i) => {
      let v = 0
      for (let k = 1; k <= 6; k++) v += (0.4 / k) * Math.sin((2 * Math.PI * hz * k * i) / SR + k)
      return v
    })
    const p = detectPitch(buf, SR)
    expect(p).not.toBeNull()
    expect(Math.abs(p!.freq - hz)).toBeLessThan(3)
  })

  it('works at quiet levels and with a DC offset', () => {
    const buf = wave((i) => 0.1 + 0.005 * Math.sin((2 * Math.PI * 180 * i) / SR))
    expect(Math.abs(detectPitch(buf, SR)!.freq - 180)).toBeLessThan(3)
  })

  it('returns null for silence', () => {
    expect(detectPitch(new Float32Array(N), SR)).toBeNull()
  })

  it('returns null for low white noise', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      expect(detectPitch(noise(0.01, seed), SR)).toBeNull()
      expect(detectPitch(noise(0.0005, seed + 100), SR)).toBeNull()
    }
  })
})

describe('VoiceActivityDetector', () => {
  const dt = 1 / 60

  it('stays inactive on steady low noise', () => {
    const vad = new VoiceActivityDetector()
    const r = mulberry32(7)
    for (let i = 0; i < 600; i++) expect(vad.update(0.002 * (0.8 + 0.4 * r()), dt)).toBe(false)
    expect(vad.floor).toBeGreaterThan(0.0012)
    expect(vad.floor).toBeLessThan(0.003)
    expect(vad.loudness).toBe(0)
  })

  it('activates after the attack time and releases after silence', () => {
    const vad = new VoiceActivityDetector()
    for (let i = 0; i < 120; i++) vad.update(0.002, dt)

    expect(vad.update(0.05, dt)).toBe(false)
    let t = dt
    while (!vad.active) {
      vad.update(0.05, dt)
      t += dt
    }
    expect(t).toBeGreaterThanOrEqual(VAD_ATTACK)
    expect(t).toBeLessThan(VAD_ATTACK + 2 * dt)
    for (let i = 0; i < 20; i++) expect(vad.update(0.05, dt)).toBe(true)
    expect(vad.loudness).toBeGreaterThan(0.3)

    // A short dip keeps it active; a pause longer than the release ends it.
    for (let i = 0; i < 6; i++) expect(vad.update(0.002, dt)).toBe(true)
    vad.update(0.05, dt)
    let quiet = 0
    while (vad.active) {
      vad.update(0.002, dt)
      quiet += dt
      expect(quiet).toBeLessThan(1)
    }
    expect(quiet).toBeGreaterThanOrEqual(VAD_RELEASE - 1e-9)
    expect(quiet).toBeLessThan(VAD_RELEASE + 2 * dt)
  })

  it('seeds its floor during warm-up, ignoring digital silence', () => {
    const vad = new VoiceActivityDetector()
    for (let i = 0; i < 10; i++) expect(vad.update(0, dt)).toBe(false)
    // Loud from the very start is not voice until the warm-up has passed.
    for (let t = 0; t < VAD_WARMUP; t += dt) expect(vad.update(0.006, dt)).toBe(false)
    for (let i = 0; i < 300; i++) expect(vad.update(0.006, dt)).toBe(false)
    for (let i = 0; i < 30; i++) vad.update(0, dt)
    expect(vad.floor).toBeGreaterThan(0.005)
  })

  it('adapts its floor down quickly and up slowly', () => {
    const vad = new VoiceActivityDetector()
    for (let i = 0; i < 60; i++) vad.update(0.02, dt)
    for (let i = 0; i < 60; i++) vad.update(0.001, dt)
    expect(vad.floor).toBeLessThan(0.0015)
    // A louder room raises the floor over a few seconds, without flagging voice forever.
    for (let i = 0; i < 600; i++) vad.update(0.006, dt)
    expect(vad.active).toBe(false)
    expect(vad.floor).toBeGreaterThan(0.004)
  })
})

describe('VoiceInput', () => {
  it('is unsupported in Node and reads silent frames without throwing', async () => {
    expect(VoiceInput.isSupported()).toBe(false)
    const v = new VoiceInput()
    expect(v.running).toBe(false)
    const f = v.read(0.5)
    expect(f).toEqual({ t: 0.5, level: 0, loudness: 0, active: false, pitch: null, clarity: 0 })
    expect(v.read(NaN).t).toBe(0.5)
    expect(await v.start()).toBe('unsupported')
    v.stop()
    expect(v.running).toBe(false)
  })

  describe('with a fake browser', () => {
    let signal: (i: number) => number = () => 0
    const stopped: string[] = []
    let closed = 0
    const node = () => ({ connect: (n: unknown) => n, disconnect() {} })
    class FakeContext {
      sampleRate = SR
      state = 'running'
      destination = node()
      resume = async () => undefined
      close = async () => void closed++
      createMediaStreamSource = () => node()
      createGain = () => ({ ...node(), gain: { value: 1 } })
      createAnalyser = () => ({
        ...node(),
        fftSize: 0,
        smoothingTimeConstant: 0.8,
        getFloatTimeDomainData(b: Float32Array) {
          for (let i = 0; i < b.length; i++) b[i] = signal(i)
        },
      })
    }
    const stream = { getTracks: () => [{ stop: () => stopped.push('mic') }] }

    beforeEach(() => {
      signal = () => 0
      stopped.length = 0
      closed = 0
      vi.stubGlobal('window', { AudioContext: FakeContext })
    })
    afterEach(() => vi.unstubAllGlobals())

    it('starts, detects a voice with its pitch, and stops', async () => {
      const getUserMedia = vi.fn(async () => stream)
      vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
      expect(VoiceInput.isSupported()).toBe(true)
      const v = new VoiceInput()
      const [a, b] = await Promise.all([v.start(), v.start()])
      expect([a, b]).toEqual(['ok', 'ok'])
      expect(getUserMedia).toHaveBeenCalledTimes(1)
      expect(getUserMedia).toHaveBeenCalledWith({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } })
      expect(v.running).toBe(true)

      const r = mulberry32(3)
      signal = () => 0.002 * (r() * 2 - 1)
      for (let i = 0; i < 60; i++) expect(v.read(1 / 60).active).toBe(false)
      signal = (i) => 0.2 * Math.sin((2 * Math.PI * 150 * i) / SR)
      let f = v.read(1 / 60)
      for (let i = 0; i < 10; i++) f = v.read(1 / 60)
      expect(f.active).toBe(true)
      expect(f.loudness).toBeGreaterThan(0.5)
      expect(Math.abs(f.pitch! - 150)).toBeLessThan(3)

      v.stop()
      expect(v.running).toBe(false)
      expect(stopped).toEqual(['mic'])
      expect(closed).toBe(1)
      expect(v.read(1 / 60).active).toBe(false)
    })

    it('reports a denied permission', async () => {
      vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: async () => Promise.reject({ name: 'NotAllowedError' }) } })
      const v = new VoiceInput()
      expect(await v.start()).toBe('denied')
      expect(v.running).toBe(false)
      expect(closed).toBe(1)
    })
  })
})

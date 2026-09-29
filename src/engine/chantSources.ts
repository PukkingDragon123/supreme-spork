// Where a chant's real recording comes from: a file the player imported
// (IndexedDB) or one bundled at public/audio/chant/<chantId>.(mp3|m4a|ogg|wav)
// with an optional line-timing file <chantId>.json. Without a timing file
// the recording is auto-aligned by its pauses (and can be fixed with the
// tap-to-mark tool). See public/audio/chant/README.md.

import { CHANT_BY_ID } from '../game/data/chants'
import { autoAlign, envelope, lineWeights, parseTiming, type LineTiming } from '../game/chantTiming'
import { deleteTiming, getImported, getTiming, saveTiming, type TimingSource } from '../services/chantAudioStore'

export const AUDIO_EXTS = ['mp3', 'm4a', 'ogg', 'wav'] as const
export const AUDIO_DIR = 'audio/chant/'

export interface ChantRecording {
  chantId: string
  kind: TimingSource
  /** Object URL of the audio (valid for the session). */
  url: string
  blob: Blob
  name: string
  /** Seconds (0 when unknown). */
  duration: number
  timing: LineTiming | null
  timingFrom: 'manual' | 'file' | 'auto' | null
}

interface ManifestEntry {
  file?: string
  timing?: string
  lines?: number[]
  end?: number
}

interface Manifest {
  probe?: boolean
  chants?: Record<string, ManifestEntry | string>
}

const baseUrl = (p: string) => {
  try {
    return new URL(AUDIO_DIR + p, document.baseURI).href
  } catch {
    return AUDIO_DIR + p
  }
}

/** A dev server or SPA host answers unknown paths with index.html: that is not audio. */
function looksLikeAudio(res: Response): boolean {
  const ct = (res.headers.get('content-type') ?? '').toLowerCase()
  return res.ok && !ct.includes('text/html') && (ct === '' || ct.startsWith('audio/') || ct.includes('octet-stream') || ct.includes('mp4') || ct.includes('ogg'))
}

let manifestP: Promise<Manifest | null> | null = null

function loadManifest(): Promise<Manifest | null> {
  if (__SINGLE_FILE__) return Promise.resolve(null)
  if (!manifestP)
    manifestP = fetch(baseUrl(`manifest.json?d=${new Date().toISOString().slice(0, 10)}`), { cache: 'no-cache' })
      .then(async (r) => {
        if (!r.ok || (r.headers.get('content-type') ?? '').includes('text/html')) return null
        return (await r.json()) as Manifest
      })
      .catch(() => null)
  return manifestP
}

const probed = new Map<string, Promise<{ url: string; entry: ManifestEntry } | null>>()

/** Find the bundled public file for a chant (manifest first, then by file name). */
function findPublic(chantId: string): Promise<{ url: string; entry: ManifestEntry } | null> {
  let p = probed.get(chantId)
  if (!p) {
    p = (async () => {
      const man = await loadManifest()
      const raw = man?.chants?.[chantId]
      const entry: ManifestEntry | null = typeof raw === 'string' ? { file: raw } : (raw ?? null)
      if (entry?.file) return { url: baseUrl(entry.file), entry }
      if (__SINGLE_FILE__ || man?.probe === false) return null
      for (const ext of AUDIO_EXTS) {
        try {
          const res = await fetch(baseUrl(`${chantId}.${ext}`), { method: 'HEAD', cache: 'no-cache' })
          if (looksLikeAudio(res)) return { url: baseUrl(`${chantId}.${ext}`), entry: entry ?? {} }
        } catch {
          // keep looking
        }
      }
      return null
    })()
    probed.set(chantId, p)
  }
  return p
}

async function publicTiming(chantId: string, entry: ManifestEntry, nLines: number): Promise<LineTiming | null> {
  if (entry.lines) return parseTiming({ lines: entry.lines, end: entry.end }, nLines)
  const url = baseUrl(entry.timing ?? `${chantId}.json`)
  try {
    const r = await fetch(url, { cache: 'no-cache' })
    if (!r.ok || (r.headers.get('content-type') ?? '').includes('text/html')) return null
    return parseTiming(await r.json(), nLines)
  } catch {
    return null
  }
}

type OfflineCtor = new (channels: number, length: number, rate: number) => OfflineAudioContext

/** Decode at a low sample rate (small in memory) for analysis. */
export async function decodeForAnalysis(blob: Blob): Promise<{ samples: Float32Array; rate: number; duration: number } | null> {
  try {
    const w = window as unknown as { OfflineAudioContext?: OfflineCtor; webkitOfflineAudioContext?: OfflineCtor }
    const Ctor = w.OfflineAudioContext ?? w.webkitOfflineAudioContext
    if (!Ctor) return null
    const rate = 8000
    const ctx = new Ctor(1, rate, rate)
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer())
    const ch = buf.getChannelData(0)
    return { samples: ch, rate: buf.sampleRate, duration: buf.duration }
  } catch {
    return null
  }
}

/** Duration from the media element (cheap; no decoding). */
function mediaDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    try {
      const a = new Audio()
      const done = (v: number) => {
        a.removeAttribute('src')
        resolve(Number.isFinite(v) && v > 0 ? v : 0)
      }
      const to = setTimeout(() => done(0), 4000)
      a.preload = 'metadata'
      a.onloadedmetadata = () => (clearTimeout(to), done(a.duration))
      a.onerror = () => (clearTimeout(to), done(0))
      a.src = url
    } catch {
      resolve(0)
    }
  })
}

const cache = new Map<string, Promise<ChantRecording | null>>()

/** Forget cached recordings (after an import, delete or new timing). */
export function invalidateRecording(chantId?: string) {
  if (chantId) cache.delete(chantId)
  else cache.clear()
}

/** The best recording for a chant, with its line timing (null = use the synthesized guide). */
export function loadRecording(chantId: string): Promise<ChantRecording | null> {
  let p = cache.get(chantId)
  if (!p) {
    p = resolve(chantId).catch(() => null)
    cache.set(chantId, p)
  }
  return p
}

async function resolve(chantId: string): Promise<ChantRecording | null> {
  const chant = CHANT_BY_ID[chantId]
  if (!chant) return null
  const nLines = chant.lines.length
  let kind: TimingSource
  let blob: Blob
  let name: string
  let fileTiming: LineTiming | null = null
  const imp = await getImported(chantId)
  if (imp) {
    kind = 'import'
    blob = imp.blob
    name = imp.name
  } else {
    const pub = await findPublic(chantId)
    if (!pub) return null
    const res = await fetch(pub.url)
    if (!res.ok) return null
    blob = await res.blob()
    kind = 'public'
    name = pub.url.split('/').pop() ?? chantId
    fileTiming = await publicTiming(chantId, pub.entry, nLines)
  }
  const url = URL.createObjectURL(blob)
  let timing: LineTiming | null = null
  let timingFrom: ChantRecording['timingFrom'] = null
  const stored = await getTiming(kind, chantId)
  const storedOk = stored ? parseTiming(stored, nLines) : null
  if (storedOk && !storedOk.auto) {
    timing = storedOk
    timingFrom = 'manual'
  } else if (fileTiming) {
    timing = fileTiming
    timingFrom = 'file'
  } else if (storedOk) {
    timing = storedOk
    timingFrom = 'auto'
  }
  let duration = 0
  if (!timing) {
    const dec = await decodeForAnalysis(blob)
    if (dec) {
      duration = dec.duration
      const t = autoAlign(envelope(dec.samples, dec.rate, 0.02), 0.02, lineWeights(chant.lines))
      const ok = t ? parseTiming(t, nLines) : null
      if (ok) {
        timing = { ...ok, auto: true }
        timingFrom = 'auto'
        void saveTiming(kind, chantId, timing)
      }
    }
  }
  if (!duration) duration = await mediaDuration(url)
  return { chantId, kind, url, blob, name, duration, timing, timingFrom }
}

/**
 * Recordings for a stage's chant: its own file, or for a boss set (e.g.
 * wai_set = namo + refuge) one file per part when every part has one.
 */
export async function loadChantAudio(chantId: string): Promise<ChantRecording[]> {
  const own = await loadRecording(chantId)
  if (own) return [own]
  const parts = CHANT_BY_ID[chantId]?.parts
  if (!parts?.length) return []
  const recs = await Promise.all(parts.map((id) => loadRecording(id)))
  return recs.every((r): r is ChantRecording => !!r) ? recs : []
}

/** Save hand-marked timing for a chant's current recording. */
export async function saveManualTiming(rec: Pick<ChantRecording, 'chantId' | 'kind'>, timing: LineTiming) {
  await saveTiming(rec.kind, rec.chantId, { ...timing, auto: false })
  invalidateRecording(rec.chantId)
}

/** Drop hand-marked timing (back to the timing file or auto-align). */
export async function resetTiming(rec: Pick<ChantRecording, 'chantId' | 'kind'>) {
  await deleteTiming(rec.kind, rec.chantId)
  invalidateRecording(rec.chantId)
}

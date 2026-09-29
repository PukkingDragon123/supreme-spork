// Chant recordings on this device: audio the player imports in-game and the
// line timings they mark, kept in IndexedDB (falls back to memory when
// IndexedDB is unavailable, e.g. some private windows).

import type { LineTiming } from '../game/chantTiming'

export interface StoredChantAudio {
  chantId: string
  blob: Blob
  name: string
  type: string
  size: number
  addedAt: number
}

/** Timing source: the player's imported file or the bundled public file. */
export type TimingSource = 'import' | 'public'

interface StoredTiming {
  key: string
  timing: LineTiming
  savedAt: number
}

const DB = 'boondee-chant'
const AUDIO = 'audio'
const TIMING = 'timing'

const memAudio = new Map<string, StoredChantAudio>()
const memTiming = new Map<string, StoredTiming>()
let dbp: Promise<IDBDatabase | null> | null = null

function open(): Promise<IDBDatabase | null> {
  if (dbp) return dbp
  dbp = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null)
      const req = indexedDB.open(DB, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(AUDIO)) db.createObjectStore(AUDIO, { keyPath: 'chantId' })
        if (!db.objectStoreNames.contains(TIMING)) db.createObjectStore(TIMING, { keyPath: 'key' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbp
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        if (!db) return reject(new Error('no-idb'))
        try {
          const tx = db.transaction(store, mode)
          const req = fn(tx.objectStore(store))
          tx.oncomplete = () => resolve(req ? (req.result as T) : undefined)
          tx.onerror = () => reject(tx.error)
          tx.onabort = () => reject(tx.error)
        } catch (e) {
          reject(e)
        }
      }),
  )
}

const tkey = (src: TimingSource, id: string) => `${src}:${id}`

export async function getImported(chantId: string): Promise<StoredChantAudio | null> {
  try {
    return (await run<StoredChantAudio>(AUDIO, 'readonly', (s) => s.get(chantId))) ?? null
  } catch {
    return memAudio.get(chantId) ?? null
  }
}

export async function listImported(): Promise<string[]> {
  try {
    return ((await run<IDBValidKey[]>(AUDIO, 'readonly', (s) => s.getAllKeys())) ?? []).map(String)
  } catch {
    return [...memAudio.keys()]
  }
}

export async function saveImported(chantId: string, file: Blob, name = 'recording'): Promise<StoredChantAudio> {
  const rec: StoredChantAudio = { chantId, blob: file, name, type: file.type || 'audio/mpeg', size: file.size, addedAt: Date.now() }
  try {
    await run(AUDIO, 'readwrite', (s) => s.put(rec))
  } catch {
    memAudio.set(chantId, rec)
  }
  // A new recording needs new timings.
  await deleteTiming('import', chantId)
  return rec
}

export async function deleteImported(chantId: string): Promise<void> {
  try {
    await run(AUDIO, 'readwrite', (s) => s.delete(chantId))
  } catch {
    memAudio.delete(chantId)
  }
  await deleteTiming('import', chantId)
}

export async function getTiming(src: TimingSource, chantId: string): Promise<LineTiming | null> {
  try {
    return (await run<StoredTiming>(TIMING, 'readonly', (s) => s.get(tkey(src, chantId))))?.timing ?? null
  } catch {
    return memTiming.get(tkey(src, chantId))?.timing ?? null
  }
}

export async function saveTiming(src: TimingSource, chantId: string, timing: LineTiming): Promise<void> {
  const rec: StoredTiming = { key: tkey(src, chantId), timing, savedAt: Date.now() }
  try {
    await run(TIMING, 'readwrite', (s) => s.put(rec))
  } catch {
    memTiming.set(rec.key, rec)
  }
}

export async function deleteTiming(src: TimingSource, chantId: string): Promise<void> {
  try {
    await run(TIMING, 'readwrite', (s) => s.delete(tkey(src, chantId)))
  } catch {
    memTiming.delete(tkey(src, chantId))
  }
}

// Per-device chant preferences (guide voice, meaning captions). Kept in
// localStorage because they depend on the device (its voices, headphones).

import { signal } from '@preact/signals'
import type { GuidePref } from '../engine/chantGuide'

export interface ChantPrefs {
  guide: GuidePref
  /** Show the meaning of the current verse while chanting. */
  caption: boolean
}

const KEY = 'boondee.chant.prefs'
const DEFAULTS: ChantPrefs = { guide: 'auto', caption: true }

function load(): ChantPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<ChantPrefs>
    return {
      guide: raw.guide === 'speech' || raw.guide === 'hum' || raw.guide === 'off' ? raw.guide : 'auto',
      caption: raw.caption !== false,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export const chantPrefs = signal<ChantPrefs>(typeof localStorage === 'undefined' ? { ...DEFAULTS } : load())

export function setChantPrefs(p: Partial<ChantPrefs>) {
  chantPrefs.value = { ...chantPrefs.value, ...p }
  try {
    localStorage.setItem(KEY, JSON.stringify(chantPrefs.value))
  } catch {
    // storage unavailable: keep for this session
  }
}

export const GUIDE_LABEL: Record<GuidePref, string> = {
  auto: 'อัตโนมัติ',
  speech: 'เสียงพูด',
  hum: 'เสียงฮัม',
  off: 'ปิด',
}

/** Chant book → open a chant directly (set before opening the 'chants' panel). */
export const chantBookFocus = signal<string | null>(null)

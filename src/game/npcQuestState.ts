// Save-game namespace for NPC quests (GameState.npcQuests). Pure: no imports
// from the rest of the game so state.ts can use it without an import cycle.

export interface NpcQuestProgress {
  /** Progress per step (sequential: only the first unfinished step advances). */
  p: number[]
  /** When the quest was accepted (ms). */
  at: number
}

export interface NpcQuestsState {
  /** Accepted, not yet turned in. */
  active: Record<string, NpcQuestProgress>
  /** Times each quest was turned in. */
  done: Record<string, number>
  /** Day key (YYYY-MM-DD) of the last turn-in, for daily repeats. */
  last: Record<string, string>
  /** Quest shown in the HUD tracker pill. */
  tracked: string | null
  /** Quest-giver hotspot ids the player has talked to. */
  met: string[]
  /** Collectible rewards waiting for the collectibles module to take them. */
  pending: Record<string, number>
}

export function emptyNpcQuests(): NpcQuestsState {
  return { active: {}, done: {}, last: {}, tracked: null, met: [], pending: {} }
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

function numMap(v: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!isObj(v)) return out
  for (const [k, n] of Object.entries(v)) if (typeof n === 'number' && Number.isFinite(n) && n > 0) out[k] = Math.floor(n)
  return out
}

/** Repair whatever an old or hand-edited save holds under `npcQuests`. */
export function normalizeNpcQuests(raw: unknown): NpcQuestsState {
  const base = emptyNpcQuests()
  if (!isObj(raw)) return base
  if (isObj(raw.active)) {
    for (const [id, v] of Object.entries(raw.active)) {
      if (!isObj(v)) continue
      const p = Array.isArray(v.p) ? v.p.map((n) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0)) : []
      base.active[id] = { p, at: typeof v.at === 'number' ? v.at : Date.now() }
    }
  }
  base.done = numMap(raw.done)
  base.pending = numMap(raw.pending)
  if (isObj(raw.last)) for (const [k, d] of Object.entries(raw.last)) if (typeof d === 'string') base.last[k] = d
  base.tracked = typeof raw.tracked === 'string' ? raw.tracked : null
  base.met = Array.isArray(raw.met) ? [...new Set(raw.met.filter((x): x is string => typeof x === 'string'))] : []
  return base
}

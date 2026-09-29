// Daily event missions: a seeded pick from the event's pool, and progress
// updates from tracked game events. Pure (the caller mutates a copy).

import { Rng } from '../../engine/rng'
import type { GameEvent } from '../data/quests'
import type { MissionState } from './save'
import type { MissionDef } from './types'

/** Pick today's missions: stable for the day and the player, no two on the same game event. */
export function rollMissions(pool: MissionDef[], count: number, day: string, seed: string, level: number, areas: string[]): MissionState[] {
  const rng = new Rng(`${day}:${seed}:missions`)
  const ok = pool.filter((m) => (m.level ?? 1) <= level && (!m.area || areas.includes(m.area)))
  // Pinned missions (e.g. the event's own "rescue N in one run") come first.
  const picked: MissionDef[] = ok.filter((m) => m.always).slice(0, count)
  for (const m of rng.shuffle(ok.filter((x) => !x.always))) {
    if (picked.length >= count) break
    if (picked.some((p) => p.event === m.event)) continue
    picked.push(m)
  }
  return picked.map((m) => ({ id: m.id, progress: 0, claimed: false }))
}

/** Apply one tracked event to the missions in place. Returns ids that just completed. */
export function applyTrack(missions: MissionState[], pool: MissionDef[], event: GameEvent, amount: number): string[] {
  const done: string[] = []
  for (const m of missions) {
    const def = pool.find((d) => d.id === m.id)
    if (!def || def.event !== event || m.claimed || m.progress >= def.target) continue
    const before = m.progress
    m.progress = def.mode === 'max' ? Math.max(m.progress, amount) : m.progress + amount
    m.progress = Math.min(def.target, m.progress)
    if (before < def.target && m.progress >= def.target) done.push(m.id)
  }
  return done
}

export function missionReady(m: MissionState, def: MissionDef | undefined): boolean {
  return !!def && !m.claimed && m.progress >= def.target
}

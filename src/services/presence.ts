// Online presence: who else is at this temple right now. The local backend
// simulates other players deterministically (so everyone sees a lively
// temple offline); a realtime backend (e.g. Supabase Realtime channels per
// map) can implement the same interface.

import type { RemotePlayer } from '../scenes/world'
import { simulatedProfile, starterFriendCodes } from './social'
import { PETS } from '../game/data/pets'
import { Rng } from '../engine/rng'

export interface PresenceBackend {
  /** Players currently on a map (not including you). */
  playersOn(mapId: string, you: { code: string; friends: string[] }): RemotePlayer[]
  /** Rough number of players online across the game. */
  onlineCount(): number
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function codeFor(seed: string): string {
  const r = new Rng(seed)
  let s = 'BD-'
  for (let i = 0; i < 6; i++) s += CODE_CHARS[r.int(0, CODE_CHARS.length - 1)]
  return s
}

export class LocalPresence implements PresenceBackend {
  playersOn(mapId: string, you: { code: string; friends: string[] }): RemotePlayer[] {
    // Crowds change every 10 minutes; busier in the evening and on big temples.
    const slot = Math.floor(Date.now() / 600_000)
    const hour = new Date().getHours()
    const r = new Rng(`presence:${mapId}:${slot}`)
    const busy = hour >= 17 && hour <= 21 ? 2 : hour >= 6 && hour <= 9 ? 1 : 0
    const indoor = mapId.includes(':')
    // Hub markets and the temple fair are the social hot spots: a real crowd.
    const hub = !indoor && (mapId.startsWith('hub_') || mapId.startsWith('fair_'))
    const n = hub ? r.int(8, 11) + busy * 2 : Math.max(0, r.int(1, 3) + busy - (indoor ? 1 : 0))
    const out: RemotePlayer[] = []
    // An online friend sometimes happens to be here too.
    const friends = [...you.friends, ...starterFriendCodes(you.code)]
    for (const code of friends) {
      const p = simulatedProfile(code)
      if (p.online && new Rng(`${code}:${mapId}:${slot}`).chance(0.18)) out.push(this.toRemote(code, true))
      if (out.length >= (hub ? 3 : 2)) break
    }
    for (let i = 0; i < n; i++) out.push(this.toRemote(codeFor(`${mapId}:${slot}:${i}`)))
    return out.filter((p) => p.id !== you.code)
  }

  onlineCount(): number {
    const hour = new Date().getHours()
    const base = 180 + Math.round(140 * Math.sin(((hour - 8) / 24) * Math.PI * 2 + 1))
    return base + (Math.floor(Date.now() / 60_000) % 37)
  }

  private toRemote(code: string, friend = false): RemotePlayer {
    const p = simulatedProfile(code)
    const r = new Rng(`pet:${code}`)
    const buyable = PETS.filter((x) => !x.premium || r.chance(0.3))
    return {
      id: code,
      name: friend ? `★ ${p.name}` : p.name,
      look: p.look,
      level: p.level,
      pet: r.chance(0.45) ? r.pick(buyable).id : null,
    }
  }
}

let backend: PresenceBackend = new LocalPresence()

export function setPresenceBackend(b: PresenceBackend) {
  backend = b
}

export function presence(): PresenceBackend {
  return backend
}

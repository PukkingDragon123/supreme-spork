// Saved online-play bookkeeping (GameState.online): daily caps for gifts,
// trades and สาธุ between real players, friends met online, and privacy
// switches. Dependency-free so state.ts can import it without cycles.

export interface OnlineFriend {
  /** Their in-game friend code (BD-XXXXXX). */
  code: string
  /** Nickname when you added them (they may have changed it since). */
  name: string
  at: number
}

export interface OnlineState {
  /** Day key the counters below belong to. */
  day: string
  giftsIn: number
  giftsOut: number
  trades: number
  sathuIn: number
  sathuOut: number
  friends: OnlineFriend[]
  /** Don't show yourself to other players. */
  hidden: boolean
  /** Show your home province on your player card. */
  shareProvince: boolean
}

export function defaultOnline(): OnlineState {
  return { day: '', giftsIn: 0, giftsOut: 0, trades: 0, sathuIn: 0, sathuOut: 0, friends: [], hidden: false, shareProvince: true }
}

const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0)

export function normalizeOnline(raw: unknown): OnlineState {
  const b = defaultOnline()
  if (!raw || typeof raw !== 'object') return b
  const r = raw as Record<string, unknown>
  const friends: OnlineFriend[] = []
  if (Array.isArray(r.friends)) {
    for (const f of r.friends) {
      if (!f || typeof f !== 'object') continue
      const x = f as Record<string, unknown>
      if (typeof x.code !== 'string' || !/^BD-[A-Z0-9]{6}$/.test(x.code) || friends.some((y) => y.code === x.code)) continue
      friends.push({ code: x.code, name: typeof x.name === 'string' ? x.name.slice(0, 24) : '', at: count(x.at) })
    }
  }
  return {
    day: typeof r.day === 'string' ? r.day : '',
    giftsIn: count(r.giftsIn),
    giftsOut: count(r.giftsOut),
    trades: count(r.trades),
    sathuIn: count(r.sathuIn),
    sathuOut: count(r.sathuOut),
    friends: friends.slice(-100),
    hidden: r.hidden === true,
    shareProvince: r.shareProvince !== false,
  }
}

/** Reset the daily counters when the day changed (call inside mutate). */
export function rollOnlineDay(o: OnlineState, day: string): OnlineState {
  if (o.day === day) return o
  return { ...o, day, giftsIn: 0, giftsOut: 0, trades: 0, sathuIn: 0, sathuOut: 0 }
}

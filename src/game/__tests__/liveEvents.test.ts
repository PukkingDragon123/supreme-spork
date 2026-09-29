import { beforeEach, describe, expect, it } from 'vitest'
import { game, defaultState, migrate } from '../state'
import * as A from '../actions'
import * as E from '../liveEvents'
import { notices } from '../events'
import { meritForLevel } from '../economy'
import { dayKey } from '../time'
import { FLOOD_EVENT, FLOOD_TIERS } from '../events/flood'
import { LIVE_EVENTS } from '../events/registry'
import { seasonAt, fmtCountdown, localMidnight } from '../events/season'
import { normalizeLiveEvents, emptyProgress } from '../events/save'
import { applyTrack, rollMissions } from '../events/missions'
import { claimable, tierForPoints, tierProgress, tierState } from '../battlepass'
import { grantReward, DUPE_COINS } from '../events/rewards'
import { pendingPurchase } from '../../services/payments'

const ID = FLOOD_EVENT.id

function atLevel(lv: number) {
  game.value = { ...defaultState(), onboarded: true, merit: meritForLevel(lv) }
  notices.value = []
  A.ensureDaily()
}

beforeEach(() => atLevel(12))

describe('season window', () => {
  it('rolls back to back from the epoch and is always live', () => {
    const def = FLOOD_EVENT.season
    const a = seasonAt('flood', def, new Date(2026, 0, 5, 10))
    expect(a.index).toBe(0)
    expect(a.start.getTime()).toBe(localMidnight('2026-01-05').getTime())
    const b = seasonAt('flood', def, new Date(2026, 0, 26, 0, 30))
    expect(b.index).toBe(1)
    expect(b.key).toBe('flood#1')
    const now = new Date()
    const c = seasonAt('flood', def, now)
    expect(c.msLeft).toBeGreaterThan(0)
    expect(c.start.getTime()).toBeLessThanOrEqual(now.getTime())
    expect(c.end.getTime()).toBeGreaterThan(now.getTime())
  })

  it('formats countdowns in Thai', () => {
    expect(fmtCountdown(3 * 86400_000 + 5 * 3600_000)).toBe('3 วัน 5 ชม.')
    expect(fmtCountdown(2 * 3600_000 + 7 * 60_000)).toBe('2 ชม. 7 นาที')
    expect(fmtCountdown(65_000)).toBe('1:05')
  })
})

describe('battle pass maths', () => {
  const pass = FLOOD_EVENT.pass
  it('has 30 tiers with the finale pets', () => {
    expect(FLOOD_TIERS).toHaveLength(30)
    expect(FLOOD_TIERS[29].free).toEqual([{ kind: 'pet', id: 'soggy_cat' }])
    expect(FLOOD_TIERS[29].premium).toEqual([{ kind: 'pet', id: 'tub_rescue' }])
    const cos = (row: 'free' | 'premium') => FLOOD_TIERS.flatMap((t) => t[row]).filter((r) => r.kind === 'outfit').map((r) => (r as { id: string }).id)
    expect(cos('free').sort()).toEqual(['back_swim_ring', 'hand_bailer', 'head_basin', 'neck_whistle', 'shoes_rain_boots', 'top_swim_vest'])
    expect(cos('premium')).toContain('suit_rescue')
    expect(cos('premium')).toHaveLength(7)
  })

  it('maps points to tiers and progress', () => {
    expect(tierForPoints(0, pass)).toBe(0)
    expect(tierForPoints(149, pass)).toBe(0)
    expect(tierForPoints(150, pass)).toBe(1)
    expect(tierForPoints(99999, pass)).toBe(30)
    const tp = tierProgress(225, pass)
    expect(tp).toMatchObject({ tier: 1, into: 75, need: 150, maxed: false })
    expect(tp.pct).toBeCloseTo(0.5)
    expect(tierProgress(4500, pass).maxed).toBe(true)
  })

  it('knows claimable, claimed and premium-locked tiers', () => {
    const p = { points: 450, premium: false, claimedFree: [1], claimedPremium: [] as number[] }
    expect(tierState(p, pass, 1, 'free')).toBe('claimed')
    expect(tierState(p, pass, 2, 'free')).toBe('claimable')
    expect(tierState(p, pass, 4, 'free')).toBe('locked')
    expect(tierState(p, pass, 2, 'premium')).toBe('premium_locked')
    expect(claimable(p, pass)).toEqual([
      { tier: 2, row: 'free' },
      { tier: 3, row: 'free' },
    ])
    expect(claimable({ ...p, premium: true }, pass)).toHaveLength(5)
  })
})

describe('missions', () => {
  const pool = FLOOD_EVENT.missions
  it('rolls a stable daily set with the pinned rescue mission first', () => {
    const a = rollMissions(pool, 4, '2026-09-29', 'BD-AAAAAA', 12, ['wat', 'river'])
    const b = rollMissions(pool, 4, '2026-09-29', 'BD-AAAAAA', 12, ['wat', 'river'])
    expect(a).toEqual(b)
    expect(a).toHaveLength(4)
    expect(a[0].id).toBe('fm_rescue12')
    const events = a.map((m) => pool.find((d) => d.id === m.id)!.event)
    expect(new Set(events).size).toBe(4)
  })

  it('sums or keeps the best single amount', () => {
    const ms = [
      { id: 'fm_rescue12', progress: 0, claimed: false },
      { id: 'fm_catfish15', progress: 0, claimed: false },
    ]
    applyTrack(ms, pool, 'flood_rescue', 7)
    applyTrack(ms, pool, 'flood_rescue', 5)
    expect(ms[0].progress).toBe(7)
    const done = applyTrack(ms, pool, 'flood_rescue', 14)
    expect(done).toEqual(['fm_rescue12'])
    expect(ms[0].progress).toBe(12)
    applyTrack(ms, pool, 'catfish_fed', 9)
    applyTrack(ms, pool, 'catfish_fed', 9)
    expect(ms[1].progress).toBe(15)
  })
})

describe('save normalisation', () => {
  it('fills the field for old saves and survives junk', () => {
    const old = migrate({ merit: 10 })
    expect(old.liveEvents).toEqual({ v: 1, events: {}, lifetime: {} })
    const junk = normalizeLiveEvents({ events: { flood: { season: 'flood#3', points: -5, claimedFree: [2, 2, 'x', 1], missions: [{ id: 'a', progress: 3 }, null] }, bad: 4 }, lifetime: 7 })
    expect(junk.events.flood.points).toBe(0)
    expect(junk.events.flood.claimedFree).toEqual([1, 2])
    expect(junk.events.flood.missions).toEqual([{ id: 'a', progress: 3, claimed: false }])
    expect(junk.events.bad).toBeUndefined()
    expect(normalizeLiveEvents(null)).toEqual({ v: 1, events: {}, lifetime: {} })
  })
})

describe('event flow', () => {
  it('is locked below level 10', () => {
    atLevel(9)
    expect(E.isEventUnlocked(ID)).toBe(false)
    expect(E.ensureEvent(ID)).toBe(false)
    expect(E.startRun(ID)).toBe(false)
    expect(game.value.liveEvents.events[ID]).toBeUndefined()
  })

  it('creates a season with welcome tickets and a daily free ticket', () => {
    expect(E.ensureEvent(ID)).toBe(true)
    const p = game.value.liveEvents.events[ID]
    expect(p.season).toBe(E.eventSeason(ID).key)
    expect(p.tickets).toBe(E.WELCOME_TICKETS)
    expect(p.missions).toHaveLength(FLOOD_EVENT.missionsPerDay)
    expect(E.dailyTicketReady(ID)).toBe(true)
    expect(E.claimDailyTicket(ID)).toBe(true)
    expect(E.claimDailyTicket(ID)).toBe(false)
    expect(game.value.liveEvents.events[ID].tickets).toBe(E.WELCOME_TICKETS + 1)
    expect(game.value.liveEvents.events[ID].freeDay).toBe(dayKey())
  })

  it('spends a ticket per run and turns scores into points, merit and coins', () => {
    E.ensureEvent(ID)
    const t0 = E.eventProgress(ID).tickets
    expect(E.startRun(ID)).toBe(true)
    expect(E.eventProgress(ID).tickets).toBe(t0 - 1)
    const merit0 = game.value.merit
    const r = E.finishRun(ID, { score: 320, rescued: 14, animals: 5, stars: 2 })!
    expect(r.points).toBe(320)
    expect(r.tierAfter).toBe(2)
    expect(game.value.merit).toBeGreaterThan(merit0)
    expect(E.eventProgress(ID).best).toBe(320)
    expect(game.value.liveEvents.lifetime[ID].rescued).toBe(14)
  })

  it('cannot start without tickets', () => {
    E.ensureEvent(ID)
    E.devSetEvent(ID, { tickets: 0 })
    expect(E.startRun(ID)).toBe(false)
  })

  it('buys extra tickets with coins up to the daily cap', () => {
    E.ensureEvent(ID)
    game.value = { ...game.value, coins: 1000 }
    for (let i = 0; i < 3; i++) expect(E.buyTicket(ID)).toBe(true)
    expect(E.buyTicket(ID)).toBe(false)
    expect(game.value.coins).toBe(1000 - 3 * FLOOD_EVENT.ticket.coinPrice!)
  })

  it('progresses missions through onTrack and pays tickets + points', () => {
    E.ensureEvent(ID)
    A.track('flood_rescue', 13)
    const m = E.eventProgress(ID).missions.find((x) => x.id === 'fm_rescue12')!
    expect(m.progress).toBe(12)
    const t0 = E.eventProgress(ID).tickets
    const got = E.claimMission(ID, 'fm_rescue12')
    expect(got).toEqual({ tickets: 1, points: 80 })
    expect(E.eventProgress(ID).tickets).toBe(t0 + 1)
    expect(E.eventProgress(ID).points).toBe(80)
    expect(E.claimMission(ID, 'fm_rescue12')).toBeNull()
  })

  it('claims free tiers, keeps premium locked until bought', async () => {
    E.ensureEvent(ID)
    E.devSetEvent(ID, { points: 150 * 5 })
    const coins0 = game.value.coins
    const all = E.claimAll(ID)
    expect(all.map((x) => x.tier)).toEqual([1, 2, 3, 4, 5])
    expect(all.every((x) => x.row === 'free')).toBe(true)
    expect(game.value.coins).toBe(coins0 + 60)
    expect(game.value.inventory.rice).toBeGreaterThanOrEqual(5)
    expect(game.value.outfits).toContain('head_basin')
    expect(E.claimTier(ID, 3, 'premium')).toBeNull()

    const buying = E.buyPremium(ID, 'boondee.pass.flood')
    expect(pendingPurchase.value?.productId).toBe('boondee.pass.flood')
    pendingPurchase.value!.resolve({ ok: true, transactionId: 'sandbox-test' })
    pendingPurchase.value = null
    expect(await buying).toBe(true)
    expect(E.eventProgress(ID).premium).toBe(true)
    expect(game.value.purchases[0].id).toBe('boondee.pass.flood')
    // Premium unlocks the already-reached tiers retroactively.
    const prem = E.claimAll(ID)
    expect(prem.map((x) => `${x.row}${x.tier}`)).toEqual(['premium1', 'premium2', 'premium3', 'premium4', 'premium5'])
    expect(game.value.outfits).toContain('head_rescue_helmet')
    expect(E.eventProgress(ID).tickets).toBeGreaterThanOrEqual(E.WELCOME_TICKETS + 2)
  })

  it('the plus pass adds bonus tiers', async () => {
    E.ensureEvent(ID)
    const buying = E.buyPremium(ID, 'boondee.pass.flood.plus')
    pendingPurchase.value!.resolve({ ok: true, transactionId: 'sandbox-plus' })
    pendingPurchase.value = null
    expect(await buying).toBe(true)
    expect(E.eventProgress(ID).points).toBe(1500)
    expect(E.claimableCount(ID)).toBeGreaterThanOrEqual(20)
  })

  it('a cancelled purchase changes nothing', async () => {
    E.ensureEvent(ID)
    const buying = E.buyPremium(ID, 'boondee.pass.flood')
    pendingPurchase.value!.resolve({ ok: false, cancelled: true })
    pendingPurchase.value = null
    expect(await buying).toBe(false)
    expect(E.eventProgress(ID).premium).toBe(false)
  })

  it('resets points on a new season but keeps lifetime and cosmetics', () => {
    E.ensureEvent(ID)
    E.devSetEvent(ID, { points: 900 })
    E.claimAll(ID)
    const later = new Date(Date.now() + FLOOD_EVENT.season.lengthDays * 86400_000)
    E.ensureEvent(ID, later)
    const p = game.value.liveEvents.events[ID]
    expect(p.season).toBe(E.eventSeason(ID, later).key)
    expect(p.points).toBe(0)
    expect(p.claimedFree).toEqual([])
    expect(game.value.outfits).toContain('head_basin')
    expect(game.value.liveEvents.lifetime[ID].seasons).toBe(2)
  })

  it('every registered event has a sane pass', () => {
    for (const def of LIVE_EVENTS) {
      expect(def.pass.tiers.map((t) => t.tier)).toEqual(def.pass.tiers.map((_, k) => k + 1))
      expect(def.missions.length).toBeGreaterThanOrEqual(def.missionsPerDay)
    }
    expect(emptyProgress('x#1').tickets).toBe(0)
  })
})

describe('grantReward adapter', () => {
  it('grants outfits, pets, items, coins and merit', () => {
    const c0 = game.value.coins
    const m0 = game.value.merit
    expect(grantReward({ kind: 'outfit', id: 'suit_rescue' }).ok).toBe(true)
    expect(grantReward({ kind: 'pet', id: 'tub_rescue' }).ok).toBe(true)
    expect(grantReward({ kind: 'item', id: 'rice', n: 3 }).ok).toBe(true)
    grantReward({ kind: 'coins', n: 50 })
    grantReward({ kind: 'merit', n: 40 })
    const s = game.value
    expect(s.outfits).toContain('suit_rescue')
    expect(s.pets).toContain('tub_rescue')
    expect(s.pet).toBeNull()
    expect(s.coins).toBe(c0 + 50)
    expect(s.merit).toBe(m0 + 40)
  })

  it('turns duplicates into coins', () => {
    grantReward({ kind: 'pet', id: 'soggy_cat' })
    const c0 = game.value.coins
    const r = grantReward({ kind: 'pet', id: 'soggy_cat' })
    expect(r.dupe).toBe(true)
    expect(game.value.coins).toBe(c0 + DUPE_COINS)
    expect(game.value.pets.filter((p) => p === 'soggy_cat')).toHaveLength(1)
  })
})

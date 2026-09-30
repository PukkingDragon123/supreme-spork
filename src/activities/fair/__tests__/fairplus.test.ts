import { beforeEach, describe, expect, it } from 'vitest'
import { game, defaultState } from '../../../game/state'
import { ensureDaily, onTrack } from '../../../game/actions'
import { COLLECTIBLE_BY_ID } from '../../../game/data/collectibles'
import { PLACE_SHOPS, SNACK_BY_ID } from '../../../game/data/placeShops'
import { FAIR_GAMES } from '../../../game/hubs'
import {
  bestFish,
  BUMP_MIN,
  bumpPoints,
  catchWear,
  cheerGrade,
  CLAW_PITY,
  CLAW_PRIZES,
  clawGripChance,
  clawOutcome,
  clawPrizeFor,
  FISH,
  FISH_RANK,
  fishFor,
  GOOD_WIN,
  judgeTap,
  notePoints,
  paperWear,
  PERFECT_WIN,
  ramwongChart,
  ramwongTarget,
  RAMWONG_BPM,
  SCOOP_LIFT_MAX,
  SCOOP_R,
  scoopCatches,
} from '../rules'
import { FIREWORKS_EVERY, FIREWORKS_LEN, fireworksAt, fireworksLabel, showPlan } from '../schedule'
import { mergeScore, safeName, sanitizeScore, sanitizeStep, type LiveScore } from '../live'
import { finishRide, rideCost, rideCostFor, RIDE_IDS, RIDES, startRide } from '../rides'
import { wheelTurn } from '../wheel'
import { ringInReach } from '../carousel'
import { fairHotspotActions, isFairHotspot } from '../hotspots'
import { GHOST_COUNT, inScare } from '../../../scenes/maps/places/fair-ghost'

beforeEach(() => {
  game.value = { ...defaultState(), onboarded: true }
  ensureDaily()
})

describe('ตักปลาทอง', () => {
  it('rolls every kind, rare ones rarely', () => {
    expect(fishFor(0)).toBe('orange')
    expect(fishFor(0.59)).toBe('orange')
    expect(fishFor(0.7)).toBe('black')
    expect(fishFor(0.9)).toBe('calico')
    expect(fishFor(0.99)).toBe('lion')
    const sum = FISH_RANK.reduce((a, k) => a + FISH[k].chance, 0)
    expect(sum).toBeCloseTo(1)
    expect(FISH.lion.pts).toBeGreaterThan(FISH.calico.pts)
  })

  it('soaks the paper faster when you swish it about', () => {
    expect(paperWear(1, 0)).toBeGreaterThan(0)
    expect(paperWear(1, 100)).toBeGreaterThan(paperWear(1, 10))
    expect(paperWear(1, 10_000)).toBe(paperWear(1, 1_000))
    expect(catchWear('lion')).toBeGreaterThan(catchWear('orange'))
  })

  it('catches fish under the scoop only when lifted gently', () => {
    expect(scoopCatches(0, 0)).toBe(true)
    expect(scoopCatches(SCOOP_R, SCOOP_LIFT_MAX)).toBe(true)
    expect(scoopCatches(SCOOP_R + 1, 0)).toBe(false)
    expect(scoopCatches(0, SCOOP_LIFT_MAX + 1)).toBe(false)
  })

  it('takes the rarest fish home', () => {
    expect(bestFish([])).toBeNull()
    expect(bestFish(['orange', 'black', 'orange'])).toBe('black')
    expect(bestFish(['calico', 'lion', 'orange'])).toBe('lion')
    for (const k of FISH_RANK) expect(COLLECTIBLE_BY_ID[FISH[k].collectible]).toBeTruthy()
  })
})

describe('รถบั๊มพ์', () => {
  it('only counts real bumps, and doubles side and rear hits', () => {
    expect(bumpPoints(BUMP_MIN - 1, 1)).toBe(0)
    expect(bumpPoints(BUMP_MIN, -1)).toBe(1)
    expect(bumpPoints(80, 0)).toBe(2)
    expect(bumpPoints(80, 1)).toBe(2)
    expect(bumpPoints(80, -1, true)).toBe(3)
    expect(bumpPoints(80, 1, true)).toBe(6)
  })
})

describe('รำวง', () => {
  const chart = ramwongChart(34)
  it('builds a sorted, deterministic chart inside the song', () => {
    expect(chart.length).toBeGreaterThan(20)
    const beat = 60 / RAMWONG_BPM
    expect(chart[0].t).toBeGreaterThanOrEqual(beat * 4 - 1e-6)
    for (let i = 1; i < chart.length; i++) expect(chart[i].t).toBeGreaterThanOrEqual(chart[i - 1].t)
    expect(chart[chart.length - 1].t).toBeLessThan(34)
    expect(ramwongChart(34)).toEqual(chart)
    expect(new Set(chart.map((n) => n.side))).toEqual(new Set(['L', 'R']))
  })

  it('grades taps by timing', () => {
    expect(judgeTap(0)).toBe('perfect')
    expect(judgeTap(-PERFECT_WIN)).toBe('perfect')
    expect(judgeTap(PERFECT_WIN + 0.01)).toBe('good')
    expect(judgeTap(-GOOD_WIN)).toBe('good')
    expect(judgeTap(GOOD_WIN + 0.01)).toBe('miss')
    expect(notePoints('miss', 30)).toBe(0)
    expect(notePoints('good', 0)).toBe(1)
    expect(notePoints('perfect', 0)).toBe(2)
    expect(notePoints('perfect', 10)).toBe(3)
  })

  it('asks for about 70% of a perfect run for three stars', () => {
    expect(ramwongTarget(chart)).toBe(Math.round(chart.length * 1.4))
    expect(ramwongTarget([])).toBe(10)
  })
})

describe('ตู้คีบตุ๊กตา', () => {
  it('grips better in the middle and never misses on pity', () => {
    expect(clawGripChance(10, 9)).toBe(0)
    expect(clawGripChance(0, 9)).toBeGreaterThan(clawGripChance(8, 9))
    expect(clawGripChance(8.9, 9)).toBeGreaterThanOrEqual(0.2)
    expect(clawGripChance(8, 9, CLAW_PITY)).toBe(1)
  })

  it('misses, drops, slips or wins', () => {
    const base = { offset: 0, width: 9, weight: 1, fails: 0, gripRoll: 0, slipRoll: 0.99 }
    expect(clawOutcome({ ...base, offset: 20 })).toBe('miss')
    expect(clawOutcome({ ...base, gripRoll: 0.99 })).toBe('drop')
    expect(clawOutcome({ ...base, slipRoll: 0 })).toBe('slip')
    expect(clawOutcome(base)).toBe('win')
    // The pity grab never drops or slips.
    expect(clawOutcome({ ...base, fails: CLAW_PITY, gripRoll: 0.99, slipRoll: 0 })).toBe('win')
  })

  it('stocks real collectibles with sensible odds', () => {
    expect(CLAW_PRIZES.reduce((a, p) => a + p.chance, 0)).toBeCloseTo(1)
    for (const p of CLAW_PRIZES) expect(COLLECTIBLE_BY_ID[p.id]?.series).toBe('ตุ๊กตาตู้คีบงานวัด')
    expect(clawPrizeFor(0)).toBe(CLAW_PRIZES[0].id)
    expect(clawPrizeFor(0.999)).toBe('fair_claw_golden')
  })
})

describe('ลิเก cheer', () => {
  it('grades the cheer around the pose', () => {
    expect(cheerGrade(26, 26)).toBe('perfect')
    expect(cheerGrade(26.25, 26)).toBe('perfect')
    expect(cheerGrade(25.67, 26)).toBe('good')
    expect(cheerGrade(26.6, 26)).toBe('good')
    expect(cheerGrade(25, 26)).toBe('early')
    expect(cheerGrade(27.5, 26)).toBe('late')
  })
})

describe('fireworks on the wall clock', () => {
  it('runs a show every three minutes', () => {
    const t0 = FIREWORKS_EVERY * 1000
    expect(fireworksAt(t0)).toMatchObject({ live: true, t: 0, show: 1000 })
    expect(fireworksAt(t0 + FIREWORKS_LEN - 1).live).toBe(true)
    const after = fireworksAt(t0 + FIREWORKS_LEN)
    expect(after.live).toBe(false)
    expect(after.show).toBe(1001)
    expect(after.next).toBeCloseTo((FIREWORKS_EVERY - FIREWORKS_LEN) / 1000)
    expect(fireworksAt(t0 - 5000)).toMatchObject({ live: false, show: 1000, next: 5 })
  })

  it('plans the same bursts for everyone, ending in a finale', () => {
    const p = showPlan(42)
    expect(showPlan(42)).toEqual(p)
    expect(showPlan(43)).not.toEqual(p)
    for (let i = 1; i < p.length; i++) expect(p[i].t).toBeGreaterThanOrEqual(p[i - 1].t)
    for (const b of p) {
      expect(b.t).toBeGreaterThanOrEqual(0)
      expect(b.t).toBeLessThanOrEqual(FIREWORKS_LEN / 1000)
      expect(b.x).toBeGreaterThan(0)
      expect(b.x).toBeLessThan(1)
    }
    const len = FIREWORKS_LEN / 1000
    const finale = p.filter((b) => b.t > len - 5).length
    const early = p.filter((b) => b.t < 5).length
    expect(finale).toBeGreaterThan(early)
  })

  it('counts down in Thai', () => {
    expect(fireworksLabel({ live: false, show: 1, t: 0, next: 84.2 })).toBe('พลุรอบหน้าอีก 1:25')
    expect(fireworksLabel({ live: true, show: 1, t: 3, next: 0 })).toContain('ตอนนี้')
  })
})

describe('live fair (net) payloads', () => {
  it('only accepts known games and clamps numbers', () => {
    expect(sanitizeScore(null)).toBeNull()
    expect(sanitizeScore({ game: 'hack', score: 5, stars: 1 })).toBeNull()
    expect(sanitizeScore({ game: 'darts', score: 'x', stars: 1 })).toBeNull()
    expect(sanitizeScore({ game: 'darts', score: 12.6, stars: 9 })).toEqual({ game: 'darts', score: 13, stars: 3 })
    expect(sanitizeScore({ game: 'scoop', score: -4, stars: -1 })).toEqual({ game: 'scoop', score: 0, stars: 0 })
    expect(sanitizeScore({ game: 'ramwong', score: 1e9, stars: 2 })?.score).toBe(999)
  })

  it('accepts dance steps and fixes bad grades', () => {
    expect(sanitizeStep({ beat: 3, side: 'L', grade: 'perfect' })).toEqual({ beat: 3, side: 'L', grade: 'perfect' })
    expect(sanitizeStep({ beat: 3, side: 'X' })).toBeNull()
    expect(sanitizeStep({ beat: Number.NaN, side: 'R' })).toBeNull()
    expect(sanitizeStep({ beat: 2, side: 'R', grade: '<b>' })?.grade).toBe('good')
  })

  it('renders names as short plain text', () => {
    expect(safeName(undefined)).toBe('ผู้เล่น')
    expect(safeName('  <img>ภูผา  ')).toBe('imgภูผา')
    expect(safeName('x'.repeat(40))).toHaveLength(16)
  })

  it('keeps the best recent score per player and game', () => {
    const e = (from: string, game: LiveScore['game'], score: number, at: number): LiveScore => ({ from, game, score, stars: 1, name: from, at })
    let l: LiveScore[] = []
    l = mergeScore(l, e('a', 'darts', 10, 1000))
    l = mergeScore(l, e('b', 'darts', 5, 2000))
    l = mergeScore(l, e('a', 'darts', 7, 3000))
    expect(l.filter((x) => x.from === 'a')).toHaveLength(1)
    expect(l.find((x) => x.from === 'a')?.score).toBe(10)
    l = mergeScore(l, e('a', 'darts', 14, 4000))
    expect(l[0]).toMatchObject({ from: 'a', score: 14 })
    l = mergeScore(l, e('c', 'rings', 3, 4000 + 16 * 60_000))
    expect(l.map((x) => x.from)).toEqual(['c'])
    let many: LiveScore[] = []
    for (let i = 0; i < 30; i++) many = mergeScore(many, e(`p${i}`, 'cork', i, 1000 + i))
    expect(many).toHaveLength(12)
  })
})

describe('rides and shows', () => {
  it('is free the first go each day, then costs coins', () => {
    expect(rideCostFor({ price: 20 }, 0)).toBe(0)
    expect(rideCostFor({ price: 20 }, 1)).toBe(20)
    expect(rideCostFor({ price: 0 }, 9)).toBe(0)
    game.value = { ...game.value, coins: 25 }
    expect(rideCost('wheel')).toBe(0)
    expect(startRide('wheel')).toBe(true)
    expect(game.value.coins).toBe(25)
    expect(rideCost('wheel')).toBe(20)
    expect(startRide('wheel')).toBe(true)
    expect(game.value.coins).toBe(5)
    expect(startRide('wheel')).toBe(false)
    // The likay show is always free.
    for (let i = 0; i < 3; i++) expect(startRide('likay')).toBe(true)
    expect(game.value.coins).toBe(5)
  })

  it('counts as a fair game and gives once-only souvenirs once', () => {
    let games = 0
    const off = onTrack((ev, n) => {
      if (ev === 'fair_game') games += n
    })
    const r1 = finishRide('wheel', { id: 'fair_wheel_photo', once: true })
    expect(r1.got).toBe('fair_wheel_photo')
    expect(game.value.collection.owned.fair_wheel_photo).toBe(1)
    const r2 = finishRide('wheel', { id: 'fair_wheel_photo', once: true })
    expect(r2.got).toBeNull()
    const r3 = finishRide('claw', { id: 'fair_claw_cat' })
    const r4 = finishRide('claw', { id: 'fair_claw_cat' })
    expect(r3.got).toBe('fair_claw_cat')
    expect(r4.got).toBe('fair_claw_cat')
    expect(game.value.collection.owned.fair_claw_cat).toBe(2)
    off()
    expect(games).toBe(4)
  })

  it('turns the wheel from the bottom back to the bottom, slowing at the top', () => {
    expect(wheelTurn(0)).toBe(0)
    expect(wheelTurn(1)).toBeCloseTo(1)
    expect(wheelTurn(0.5)).toBeCloseTo(0.5)
    let prev = -1
    for (let k = 0; k <= 1.0001; k += 0.02) {
      const v = wheelTurn(k)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
    const top = wheelTurn(0.51) - wheelTurn(0.49)
    const bottom = wheelTurn(0.02) - wheelTurn(0)
    expect(top).toBeLessThan(bottom)
  })

  it('lets you grab the carousel ring only within reach', () => {
    expect(ringInReach(0, 0)).toBe(true)
    expect(ringInReach(11, -13)).toBe(true)
    expect(ringInReach(13, 0)).toBe(false)
    expect(ringInReach(0, 15)).toBe(false)
  })

  it('has a name, a blurb and three steps per ride', () => {
    expect(RIDE_IDS.sort()).toEqual(['carousel', 'claw', 'likay', 'wheel'])
    for (const id of RIDE_IDS) expect(RIDES[id].steps).toHaveLength(3)
  })
})

describe('fair hotspots', () => {
  it('knows every family and gives each one an action', () => {
    for (const g of Object.keys(FAIR_GAMES)) {
      expect(isFairHotspot(g)).toBe(true)
      expect(fairHotspotActions(g).length).toBeGreaterThan(0)
    }
    for (const r of RIDE_IDS) expect(fairHotspotActions(r)[0].label).toBeTruthy()
    expect(fairHotspotActions('prizes')[0].label).toBe('แลกของรางวัล')
    const eat = fairHotspotActions('eat:fair_temple_takoyaki')
    expect(eat.map((a) => a.label)).toEqual(['ซื้อกินเลย', 'ดูร้าน'])
    expect(isFairHotspot('nope')).toBe(false)
  })

  it('stocks every food cart with known snacks', () => {
    const carts = ['popcorn', 'quail', 'lookchin', 'squid', 'tokyo', 'takoyaki', 'saimai', 'icepop', 'redsoda', 'pressed']
    for (const c of carts) {
      const shop = PLACE_SHOPS[`fair_temple_${c}`]
      expect(shop?.place).toBe('fair_temple')
      for (const sn of shop.snacks) expect(SNACK_BY_ID[sn]).toBeTruthy()
    }
  })

  it('has every fair souvenir in the collection registry', () => {
    for (const id of ['fair_wheel_photo', 'fair_carousel_ring', 'fair_brave_cert', 'fair_money_garland', 'fair_firework_pin', 'fair_bumper_badge', 'fair_ramwong_fan']) {
      expect(COLLECTIBLE_BY_ID[id]?.source).toBe('reward')
      expect(COLLECTIBLE_BY_ID[id]?.place).toBe('fair_temple')
    }
  })
})

describe('บ้านผีสิง', () => {
  it('triggers a scare inside its zone only', () => {
    const z = { zone: { x: 10, y: 20, w: 30, h: 10 } }
    expect(inScare(10, 20, z)).toBe(true)
    expect(inScare(40, 30, z)).toBe(true)
    expect(inScare(41, 25, z)).toBe(false)
    expect(inScare(20, 19, z)).toBe(false)
    expect(GHOST_COUNT).toBe(6)
  })
})

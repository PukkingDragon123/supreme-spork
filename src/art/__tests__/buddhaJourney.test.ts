import { beforeEach, describe, expect, it } from 'vitest'
import { game, defaultState } from '../../game/state'
import { mutate } from '../../game/state'
import * as P from '../../game/prayer'
import { CHAPTERS, STAGES, STAGE_BY_ID } from '../../game/data/prayers'
import {
  avatarStage,
  bandAt,
  chapterOfStage,
  gatePoint,
  JOURNEY,
  JOURNEY_STAGES,
  journeyHeight,
  journeyLayout,
  roadAt,
  standOffset,
  templeGates,
  thaiNum,
  walkFrom,
  walkPoint,
  type LocalPt,
} from '../buddhaJourneyStory'

const view = () => ({ unlocked: (id: string) => P.stageUnlocked(STAGE_BY_ID[id]), passed: (id: string) => P.stagePassed(STAGE_BY_ID[id]) })

function pass(ids: string[], stars = 1) {
  mutate((d) => {
    for (const id of ids) d.prayer.stars[id] = stars
  })
}

beforeEach(() => {
  game.value = { ...defaultState(), onboarded: true }
})

describe('story chapters and stages', () => {
  it('every prayer stage is painted in exactly one chapter, in play order', () => {
    expect(JOURNEY_STAGES).toEqual(STAGES.map((s) => s.id))
    expect(new Set(JOURNEY_STAGES).size).toBe(STAGES.length)
    for (const st of STAGES) expect(chapterOfStage(st.id)).toBeTruthy()
  })

  it('tells the eight great scenes of the Buddha’s life in order', () => {
    expect(JOURNEY.map((c) => c.id)).toEqual(['birth', 'palace', 'renounce', 'ascetic', 'enlighten', 'sermon', 'teaching', 'nibbana'])
    expect(JOURNEY.map((c) => c.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    for (const c of JOURNEY) {
      expect(c.scenes.length).toBeGreaterThan(0)
      for (const s of c.scenes) {
        expect(s.title.length).toBeGreaterThan(1)
        expect(s.caption.length).toBeGreaterThan(20)
        expect(s.caption).toMatch(/[฀-๿]/)
      }
    }
  })

  it('keeps each chapter inside one temple so temple unlocks stay whole', () => {
    for (const c of JOURNEY) {
      const temples = new Set(c.stages.map((id) => STAGE_BY_ID[id].chapter))
      expect(temples.size).toBe(1)
    }
    // Boss stages close a temple and sit last in their chapter.
    for (const st of STAGES.filter((s) => s.big)) {
      const c = chapterOfStage(st.id)!
      expect(c.stages[c.stages.length - 1]).toBe(st.id)
    }
  })

  it('has one node per stage and a road through every node in order', () => {
    for (const c of JOURNEY) {
      expect(c.nodes.length).toBe(c.stages.length)
      const idx = c.route.filter((r): r is number => typeof r === 'number')
      expect(idx).toEqual(c.stages.map((_, i) => i))
      const first = c.route[0] as LocalPt
      expect(typeof c.route[0]).not.toBe('number')
      expect(first[1]).toBe(0)
    }
    // The road leaves each chapter exactly where the next one picks it up.
    for (let i = 0; i + 1 < JOURNEY.length; i++) {
      const out = JOURNEY[i].route[JOURNEY[i].route.length - 1] as LocalPt
      const next = JOURNEY[i + 1].route[0] as LocalPt
      expect(out[1]).toBe(JOURNEY[i].h)
      expect(out[0]).toBe(next[0])
    }
  })

  it('writes chapter numbers with Thai digits', () => {
    expect(thaiNum(5)).toBe('๕')
    expect(thaiNum(12)).toBe('๑๒')
  })
})

describe('map layout', () => {
  it('fits nodes on the map at phone widths and climbs chapter by chapter', () => {
    for (const w of [176, 180, 195, 215, 240]) {
      const L = journeyLayout(w)
      expect(L.h).toBe(journeyHeight())
      expect(L.nodes.length).toBe(STAGES.length)
      L.nodes.forEach((n, i) => {
        expect(n.stageId).toBe(JOURNEY_STAGES[i])
        expect(n.x).toBeGreaterThanOrEqual(12)
        expect(n.x).toBeLessThanOrEqual(w - 12)
        const band = L.bands[JOURNEY.findIndex((c) => c.id === n.chapter)]
        expect(n.y).toBeGreaterThan(band.top)
        expect(n.y).toBeLessThan(band.bottom)
        expect(bandAt(L, n.y).id).toBe(n.chapter)
        if (i > 0) {
          expect(n.s).toBeGreaterThan(L.nodes[i - 1].s)
          expect(n.y).toBeLessThan(L.nodes[i - 1].y + 1)
        }
      })
    }
  })

  it('leaves the stage nodes clear of the painted scenes', () => {
    for (const c of JOURNEY)
      c.nodes.forEach(([dx, up], i) => {
        for (const s of c.scenes) {
          const [a, b, d, e] = s.box
          const inside = dx > a + 2 && dx < d - 2 && up > b + 2 && up < e - 2
          expect(inside, `${c.stages[i]} inside scene ${s.id}`).toBe(false)
        }
      })
  })

  it('samples a continuous road through the node positions', () => {
    const L = journeyLayout(195)
    for (let i = 1; i < L.road.xs.length; i++) {
      const step = Math.hypot(L.road.xs[i] - L.road.xs[i - 1], L.road.ys[i] - L.road.ys[i - 1])
      expect(step).toBeLessThan(2.5)
    }
    for (const n of L.nodes) {
      const p = roadAt(L.road, n.s)
      expect(Math.abs(p.x - n.x)).toBeLessThan(0.6)
      expect(Math.abs(p.y - n.y)).toBeLessThan(0.6)
    }
    expect(roadAt(L.road, -5).y).toBe(L.road.ys[0])
    expect(roadAt(L.road, 1e9).y).toBe(L.road.ys[L.road.ys.length - 1])
  })

  it('puts a gate on the road where each temple begins', () => {
    const L = journeyLayout(195)
    const gates = templeGates()
    expect(gates.map((g) => g.temple)).toEqual(CHAPTERS.map((c) => c.id))
    for (const g of gates) {
      expect(STAGE_BY_ID[g.stageId].n).toBe(1)
      const node = L.nodes.find((n) => n.stageId === g.stageId)!
      const p = gatePoint(L, g.stageId)
      expect(p.s).toBeLessThan(node.s)
      expect(p.y).toBeGreaterThan(node.y + 14)
    }
  })

  it('walks the avatar from beside one node to beside the next', () => {
    const L = journeyLayout(195)
    const a = L.nodes[3]
    const b = L.nodes[4]
    const start = walkPoint(L.road, a, b, L.cx, 0)
    const end = walkPoint(L.road, a, b, L.cx, 1)
    const oa = standOffset(a, L.cx)
    const ob = standOffset(b, L.cx)
    expect(start.x).toBeCloseTo(a.x + oa[0], 0)
    expect(start.y).toBeCloseTo(a.y + oa[1], 0)
    expect(end.x).toBeCloseTo(b.x + ob[0], 0)
    expect(end.y).toBeCloseTo(b.y + ob[1], 0)
    // Midway it is on the road.
    const mid = walkPoint(L.road, a, b, L.cx, 0.5)
    const p = roadAt(L.road, (a.s + b.s) / 2)
    expect(mid.x).toBeCloseTo(p.x, 3)
    // Standing spots lean towards the middle of the map.
    expect(Math.sign(oa[0])).toBe(a.x <= L.cx ? 1 : -1)
  })
})

describe('where the avatar stands (uses the real unlock rules)', () => {
  it('starts at the first stage', () => {
    expect(avatarStage(view())).toBe('wat-1')
  })

  it('moves to the next stage after a pass', () => {
    pass(['wat-1', 'wat-2', 'wat-3'])
    expect(avatarStage(view())).toBe('wat-4')
  })

  it('crosses into the next temple once its star gate opens', () => {
    pass(STAGES.filter((s) => s.chapter === 'wat').map((s) => s.id))
    // 10 stars at 1★ each: the shrine (8★) is open.
    expect(P.chapterUnlocked('shrine')).toBe(true)
    expect(avatarStage(view())).toBe('shrine-1')
  })

  it('waits at the last passed stage while the next temple is locked by stars', () => {
    pass(STAGES.filter((s) => s.chapter === 'wat' || s.chapter === 'shrine').map((s) => s.id))
    // 16 stars: the river temple needs 18.
    expect(P.totalStars()).toBe(16)
    expect(P.chapterUnlocked('river')).toBe(false)
    expect(avatarStage(view())).toBe('shrine-6')
    // Two more stars from replays open the gate, and the avatar moves on.
    pass(['wat-1'], 3)
    expect(avatarStage(view())).toBe('river-1')
  })

  it('stays at the far end when every open stage is passed', () => {
    pass(JOURNEY_STAGES, 3)
    expect(avatarStage(view())).toBe('mountain-8')
  })

  it('walks only a few steps forward', () => {
    expect(walkFrom(null, 'wat-2')).toBeNull()
    expect(walkFrom('wat-2', 'wat-2')).toBeNull()
    expect(walkFrom('wat-1', 'wat-2')).toBe('wat-1')
    expect(walkFrom('wat-9', 'shrine-1')).toBe('wat-9')
    expect(walkFrom('wat-3', 'wat-2')).toBeNull()
    expect(walkFrom('wat-1', 'wat-9')).toBeNull()
    expect(walkFrom('nope', 'wat-2')).toBeNull()
  })
})

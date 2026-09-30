import { beforeAll, describe, expect, it } from 'vitest'
import { gripPose, poseInfo, reachPose, rollPose, stirPose, workPose, wristOf, WP } from '../../../art/poses/work'
import { wateringSpoutFromHandle } from '../../../art/jobs'
import { JobScene } from '../base'
import type { Surface } from '../../../engine/pixel'

beforeAll(() => {
  // Sound effects look for window.AudioContext; there is none under node.
  const g = globalThis as unknown as { window?: object }
  g.window ??= {}
})

describe('work poses', () => {
  it('registers every fixed pose with the act_w_ prefix', () => {
    for (const name of Object.values(WP)) {
      expect(name.startsWith('act_w_')).toBe(true)
      expect(poseInfo(name)).toBeTruthy()
    }
    expect(stirPose(1).startsWith('act_w_stir_')).toBe(true)
    expect(rollPose(2).startsWith('act_w_roll_')).toBe(true)
  })

  it('reports wrists in sprite space (doll + 1 px outline)', () => {
    const name = workPose({ name: 'act_w_test_wrist', view: 'front', L: { w: [10, 30] }, R: 'rest', expr: 'smile' })
    expect(wristOf(name, 'L')).toEqual([11, 31])
    expect(wristOf(name, 'R')).toEqual([22.9, 33])
    expect(wristOf('stand', 'L')).toBeNull()
  })

  it('puts both hands on the handle for any broom lean', () => {
    for (const lean of [-0.9, -0.5, -0.1, 0, 0.2, 0.45, 0.8]) {
      const g = gripPose(lean)
      const L = wristOf(g.name, 'L')!
      const R = wristOf(g.name, 'R')!
      const ax = Math.sin(g.lean)
      const ay = -Math.cos(g.lean)
      // Both wrists lie on the line through the hold point along the handle.
      for (const [x, y] of [L, R]) {
        const cross = (x - g.c[0]) * ay - (y - g.c[1]) * ax
        expect(Math.abs(cross)).toBeLessThan(1e-6)
      }
      // The upper hand is on the side the handle leans toward.
      const upper = L[1] < R[1] ? L : R
      if (g.lean > 0) expect(upper).toBe(R)
      if (g.lean < 0) expect(upper).toBe(L)
    }
  })

  it('quantises leans so nearby angles share a pose', () => {
    expect(gripPose(0.3).name).toBe(gripPose(0.33).name)
    expect(gripPose(0.3).name).not.toBe(gripPose(-0.3).name)
    expect(Math.abs(gripPose(5).lean)).toBeLessThanOrEqual(0.96 + 1e-9)
  })

  it('reaches the requested distance from the shoulder', () => {
    const name = reachPose('back', 'R', -Math.PI / 2, 9)
    const w = wristOf(name, 'R')!
    expect(Math.hypot(w[0] - 1 - 23.5, w[1] - 1 - 25)).toBeCloseTo(9, 5)
    expect(poseInfo(name)?.view).toBe('back')
  })
})

describe('watering can grip', () => {
  it('mirrors the spout across the hand', () => {
    for (const tilt of [0, 0.5, 1]) {
      const [lx, ly] = wateringSpoutFromHandle(100, 50, tilt, false)
      const [rx, ry] = wateringSpoutFromHandle(100, 50, tilt, true)
      expect(ly).toBeCloseTo(ry, 6)
      expect(100 - lx).toBeCloseTo(rx - 100, 6)
    }
  })

  it('dips the spout when the can tilts', () => {
    const [, y0] = wateringSpoutFromHandle(0, 0, 0)
    const [, y1] = wateringSpoutFromHandle(0, 0, 1)
    expect(y1).toBeGreaterThan(y0)
  })
})

class TestScene extends JobScene {
  done = 0
  progress() {
    return this.done
  }
  goalText() {
    return ''
  }
  protected anchor() {}
  protected populate() {}
  protected tick() {}
  protected draw(_g: Surface) {}
}

describe('job streaks and praise', () => {
  it('counts quick successes, praises at 3 and resets after the window', () => {
    const s = new TestScene()
    s.resize(190, 400)
    s.start()
    expect(s.streak(10, 10)).toBe(1)
    expect(s.streak(10, 10)).toBe(2)
    expect(s.praises).toHaveLength(0)
    expect(s.streak(10, 10)).toBe(3)
    expect(s.praises.map((p) => p.text)).toEqual(['ดีมาก!'])
    expect(s.bestCombo).toBe(3)
    s.update(2)
    expect(s.combo).toBe(0)
    expect(s.streak(10, 10)).toBe(1)
    expect(s.bestCombo).toBe(3)
  })

  it('cheers when the job is completed', () => {
    const s = new TestScene()
    s.resize(190, 400)
    s.start()
    s.done = 1
    s.update(0.016)
    expect(s.phase).toBe('done')
    expect(s.praises.at(-1)?.text).toBe(s.cheerText())
  })
})

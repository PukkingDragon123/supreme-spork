import { describe, expect, it } from 'vitest'
import { InterpBuffer, InterpTable, faceOf } from '../netInterp'

const walk = (t: number, x: number, y = 100, moving = true) => ({ t, x, y, face: 'right' as const, moving })

describe('InterpBuffer', () => {
  it('draws a little in the past, between the two samples around that time', () => {
    const b = new InterpBuffer({ delay: 100 })
    b.push(walk(0, 0))
    b.push(walk(100, 10))
    b.push(walk(200, 20))
    const p = b.sample(250)! // render time 150 → halfway between x=10 and x=20
    expect(p.x).toBeCloseTo(15)
    expect(p.moving).toBe(true)
    expect(p.face).toBe('right')
  })

  it('holds the first sample until there is something to interpolate', () => {
    const b = new InterpBuffer({ delay: 100 })
    b.push(walk(1000, 50, 60, false))
    expect(b.sample(1000)).toEqual({ x: 50, y: 60, face: 'right', moving: false })
    expect(b.sample(99999)).toEqual({ x: 50, y: 60, face: 'right', moving: false })
  })

  it('snaps on a big jump instead of sliding across the map', () => {
    const b = new InterpBuffer({ delay: 100, teleport: 50 })
    b.push(walk(0, 0))
    b.push(walk(100, 10))
    b.push(walk(200, 400))
    expect(b.size).toBe(1)
    expect(b.sample(250)!.x).toBe(400)
  })

  it('drops out-of-order samples', () => {
    const b = new InterpBuffer({ delay: 0 })
    b.push(walk(100, 10))
    b.push(walk(50, 99))
    expect(b.latest()!.x).toBe(10)
  })

  it('extrapolates a walking player briefly, then waits there', () => {
    const b = new InterpBuffer({ delay: 100, extrapolate: 200 })
    b.push(walk(0, 0))
    b.push(walk(100, 10)) // 0.1 px/ms
    expect(b.sample(250)!.x).toBeCloseTo(15) // 50 ms past the newest
    expect(b.sample(390)!.x).toBeCloseTo(29) // 190 ms past, still gliding
    const held = b.sample(1000)!
    expect(held.x).toBeCloseTo(30)
    expect(held.moving).toBe(false)
  })

  it('a player who stood still starts walking now, not from an old timestamp', () => {
    const b = new InterpBuffer({ delay: 100 })
    b.push(walk(0, 0, 100, false))
    b.push(walk(5000, 6, 100, true))
    // Without the rebase this would crawl from x=0 over 5 seconds.
    expect(b.sample(5100)!.x).toBeCloseTo(6)
    expect(b.sample(5050)!.x).toBeCloseTo(3)
  })

  it('stops the walk animation once they arrive', () => {
    const b = new InterpBuffer({ delay: 100 })
    b.push(walk(0, 0))
    b.push(walk(100, 10, 100, false))
    expect(b.sample(150)!.moving).toBe(true)
    expect(b.sample(400)!.moving).toBe(false)
  })

  it('ignores garbage numbers', () => {
    const b = new InterpBuffer()
    b.push({ t: 0, x: NaN, y: 1, face: 'up', moving: false })
    expect(b.sample(0)).toBeNull()
  })
})

describe('InterpTable and facing', () => {
  it('keeps one buffer per player and forgets the ones who left', () => {
    const t = new InterpTable({ delay: 0 })
    t.push('a', walk(0, 1))
    t.push('b', walk(0, 2))
    t.retain(['b'])
    expect(t.has('a')).toBe(false)
    expect(t.sample('b', 0)!.x).toBe(2)
  })

  it('faces the way they move', () => {
    expect(faceOf(5, 1, 'up')).toBe('right')
    expect(faceOf(-5, 1, 'up')).toBe('left')
    expect(faceOf(0, -3, 'left')).toBe('up')
    expect(faceOf(0, 0, 'left')).toBe('left')
  })
})

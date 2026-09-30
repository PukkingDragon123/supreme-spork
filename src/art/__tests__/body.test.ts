import { describe, expect, it } from 'vitest'
import { bodyDefaults, bodyOf, bodyWiden, normalizeBody, reshapeIndex, srcCol, srcRows, switchGender, EYE_COUNT } from '../body'
import { cleanLook, encodeLook } from '../../services/netValidate'
import { DEFAULT_LOOK, type AvatarLook } from '../avatar'

describe('body options', () => {
  it('fills missing fields from the preset', () => {
    expect(bodyOf({ gender: 'm' })).toEqual(bodyDefaults('m'))
    expect(bodyOf({ gender: 'f' })).toEqual(bodyDefaults('f'))
    expect(bodyOf(null)).toEqual(bodyDefaults('f'))
  })

  it('clamps bad values to defaults', () => {
    const b = bodyOf({ gender: 'm', height: 9, build: -1, brows: 1.5, beard: 3 } as Partial<AvatarLook>)
    expect(b.height).toBe(2)
    expect(b.build).toBe(1)
    expect(b.brows).toBe(1)
    expect(b.beard).toBe(3)
  })

  it('normalizes an old save look', () => {
    const old = { ...DEFAULT_LOOK, gender: 'm' as const, face: 42 }
    const n = normalizeBody(old)
    expect(n.faceShape).toBe(1)
    expect(n.brows).toBe(1)
    expect(n.face).toBe(0)
    expect(n.hair).toBe(old.hair)
  })

  it('gender switch moves default features, keeps picked ones', () => {
    const f: AvatarLook = { ...DEFAULT_LOOK, gender: 'f', faceShape: 0, brows: 3 }
    const p = switchGender(f, 'm')
    expect(p.gender).toBe('m')
    expect(p.faceShape).toBe(1)
    expect(p.brows).toBeUndefined()
  })

  it('boys are broader, slim is narrower, only in the right regions', () => {
    expect(bodyWiden('m', 1, 'torso', 'doll')).toBe(1)
    expect(bodyWiden('m', 1, 'legs', 'doll')).toBe(0)
    expect(bodyWiden('f', 1, 'torso', 'doll')).toBe(0)
    expect(bodyWiden('f', 2, 'legs', 'doll')).toBe(1)
    expect(bodyWiden('m', 3, 'torso', 'doll')).toBe(2)
    expect(bodyWiden('f', 0, 'torso', 'doll')).toBe(-1)
    expect(bodyWiden('f', 0, 'torso', 'sprite')).toBe(0)
  })
})

describe('reshape maps', () => {
  it('widens around the seams', () => {
    // 10 wide, seams at 3 and 6, +1 each side
    const row = Array.from({ length: 10 }, (_, x) => srcCol(x, 1, 3, 6, 10))
    expect(row).toEqual([1, 2, 3, 3, 4, 5, 6, 6, 7, 8])
    const thin = Array.from({ length: 10 }, (_, x) => srcCol(x, -1, 3, 6, 10))
    expect(thin).toEqual([-1, 0, 1, 2, 4, 5, 7, 8, 9, -1])
    const side = Array.from({ length: 10 }, (_, x) => srcCol(x, 1, -1, 6, 10, false, true))
    expect(side).toEqual([0, 1, 2, 3, 4, 5, 6, 6, 7, 8])
  })

  it('adds and drops rows bottom-aligned', () => {
    expect(srcRows(5, 6, [{ at: 2, n: 1 }])).toEqual([0, 1, 2, 2, 3, 4])
    expect(srcRows(5, 5, [{ at: 1, n: -2 }])).toEqual([-1, -1, 0, 3, 4])
    expect(srcRows(4, 4, [])).toEqual([0, 1, 2, 3])
  })

  it('builds a full index', () => {
    const idx = reshapeIndex({ w: 4, h: 3, outH: 3, widen: () => 0, xl: 0, xr: 3, left: true, right: true, rows: [] })
    expect(Array.from(idx)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })
})

describe('eye & face options', () => {
  it('defaults: boys get faint blush, girls the classic', () => {
    expect(bodyOf({ gender: 'm' }).blush).toBe(1)
    expect(bodyOf({ gender: 'f' }).blush).toBe(2)
    expect(bodyOf({ gender: 'f' }).eyeSize).toBe(1)
  })

  it('migrates the old rosy-cheek mark to blush', () => {
    const n = normalizeBody({ ...DEFAULT_LOOK, marks: 4 })
    expect(n.marks).toBe(0)
    expect(n.blush).toBe(3)
    const kept = normalizeBody({ ...DEFAULT_LOOK, marks: 4, blush: 0 })
    expect(kept.marks).toBe(4)
    expect(kept.blush).toBe(0)
  })

  it('remote looks keep and clamp the new fields', () => {
    const l: AvatarLook = { ...DEFAULT_LOOK, eyeColor: 4, eyeSize: 2, eyelid: 3, lashes: 1, shine: 2, browColor: 3, blush: 0, lips: 5, faceDeco: 3 }
    const back = cleanLook(encodeLook(l))
    for (const k of ['eyeColor', 'eyeSize', 'eyelid', 'lashes', 'shine', 'browColor', 'blush', 'lips', 'faceDeco'] as const) expect(back[k]).toBe(l[k])
    const bad = cleanLook({ ...encodeLook(l), eyeColor: 40, lips: -1, faceDeco: 'x' })
    expect(bad.eyeColor).toBe(0)
    expect(bad.lips).toBe(0)
    expect(bad.faceDeco).toBe(0)
  })
})

describe('online looks', () => {
  it('round-trips body fields and clamps junk', () => {
    const l: AvatarLook = { ...DEFAULT_LOOK, gender: 'm', height: 3, build: 2, beard: 4, marks: 2, face: EYE_COUNT - 1 }
    const back = cleanLook(encodeLook(l))
    expect(back.height).toBe(3)
    expect(back.build).toBe(2)
    expect(back.beard).toBe(4)
    expect(back.marks).toBe(2)
    expect(back.face).toBe(EYE_COUNT - 1)
    const bad = cleanLook({ ...encodeLook(l), height: 99, mouth: 'x', nose: -3 })
    expect(bad.height).toBe(2)
    expect(bad.mouth).toBe(0)
    expect(bad.nose).toBe(0)
  })
})

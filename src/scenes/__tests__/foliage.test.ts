import { describe, expect, it } from 'vitest'
import type { MapDef } from '../world'
import { keepOutPoints, MAX_SWAY, placePlants, trunkRect, type Plant } from '../foliage'
import { PLANTS } from '../../art/foliage'
import { AUTO_PLANTS } from '../maps/foliage/auto'
import { FOLIAGE } from '../maps/foliage'

function fakeMap(over: Partial<MapDef> = {}): MapDef {
  return {
    id: 'test_map',
    w: 300,
    h: 600,
    skyH: 60,
    ground: '#86c95f',
    bake: () => undefined,
    props: [],
    obstacles: [],
    hotspots: [{ id: 'hall', label: 'hall', icon: 'temple', rect: { x: 100, y: 100, w: 100, h: 80 }, at: { x: 150, y: 200 } }],
    spawn: { x: 150, y: 560 },
    lights: [],
    pickupSpots: [{ x: 40, y: 300 }],
    wander: [],
    pois: [{ x: 250, y: 400, face: 'up' }],
    dogs: [],
    ...over,
  }
}

describe('foliage placement', () => {
  it('keeps clear of hotspot at points, the spawn, pickups and pois', () => {
    const map = fakeMap()
    const pts = keepOutPoints(map)
    expect(pts).toContainEqual({ x: 150, y: 200 })
    expect(pts).toContainEqual(map.spawn)
    const plants: Plant[] = [
      ['banana', 152, 202],
      ['fern', 150, 560],
      ['ixora', 42, 300],
      ['pot', 250, 402],
      ['mango', 30, 500],
    ]
    const { kept, dropped } = placePlants(map, plants)
    expect(kept.map((p) => p.k)).toEqual(['mango'])
    expect(dropped).toHaveLength(4)
  })

  it('drops plants inside hotspot rects unless flagged w', () => {
    const map = fakeMap()
    expect(placePlants(map, [['fern', 120, 120]]).kept).toHaveLength(0)
    expect(placePlants(map, [['fern', 120, 120, 0, 'w']]).kept).toHaveLength(1)
  })

  it('drops plants off the map', () => {
    expect(placePlants(fakeMap(), [['fern', -5, 100]]).kept).toHaveLength(0)
  })

  it('caps the number of swaying plants', () => {
    const plants: Plant[] = Array.from({ length: 20 }, (_, i) => ['grass', 20 + (i % 10) * 25, 400 + Math.floor(i / 10) * 60, 0, 's'] as Plant)
    const { kept } = placePlants(fakeMap({ pois: [], pickupSpots: [] }), plants)
    expect(kept.filter((p) => p.sway)).toHaveLength(MAX_SWAY)
  })

  it('only trunks block, and bake / n flags never do', () => {
    expect(trunkRect({ k: 'fern', x: 50, y: 50 })).toBeNull()
    const r = trunkRect({ k: 'mango', x: 50, y: 50 })
    expect(r).toEqual({ x: 47, y: 47, w: 6, h: 4 })
    expect(trunkRect({ k: 'mango', x: 50, y: 50 }, 'n')).toBeNull()
    expect(trunkRect({ k: 'mango', x: 50, y: 50 }, 'b')).toBeNull()
  })
})

describe('foliage specs', () => {
  it('use known plant kinds and variants', () => {
    for (const [id, list] of Object.entries(AUTO_PLANTS))
      for (const [k, x, y, v = 0, flags = ''] of list) {
        expect(PLANTS[k], `${id}: ${k}`).toBeTruthy()
        expect(Number.isInteger(v) && v >= 0 && v < PLANTS[k].variants, `${id}: ${k} v${v}`).toBe(true)
        expect(x >= 0 && y >= 0, `${id}: ${k}@${x},${y}`).toBe(true)
        expect(/^[sfbnwdz0-9-]*$/.test(flags), `${id}: flags ${flags}`).toBe(true)
      }
  })

  it('dress the home temples, the fair and many places', () => {
    for (const id of ['wat', 'shrine', 'river', 'mountain', 'fair_temple']) expect(FOLIAGE[id], id).toBeTruthy()
    expect(Object.keys(FOLIAGE).length).toBeGreaterThan(25)
  })
})

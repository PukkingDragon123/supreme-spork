// Foliage dressing for the walkable maps. A FoliageSpec lists plants (from the
// kit in src/art/foliage.ts) and ground painters; dressMap() merges them into
// a MapDef without touching the map's own file:
//   - ground painters and `bake` plants go into the map's baked layer,
//   - other plants become static props (y-sorted with the player),
//   - big trees get a baked dappled shadow and a few shimmering sun flecks,
//   - a handful of `sway` plants animate in the breeze (three cached frames),
//   - trees drop petals / leaves now and then, and rustle when tapped,
//   - only trunks become obstacles.
// Plants that would stand on a hotspot `at`, the spawn, an entry, a pickup
// spot, a poi or a vendor (or inside a hotspot rect) are dropped, so dressing
// can never block the map. See src/scenes/maps/foliage/*.ts for the specs.

import type { Surface } from '../engine/pixel'
import { rand, pick } from '../engine/rng'
import { sfx } from '../engine/audio'
import { dapple, grassTufts, plantSize, plantSprite, PLANTS, type PlantKind } from '../art/foliage'
import { questNpcsOn } from '../game/data/questNpcs'
import type { Life } from './life'
import type { Rect } from './pathfind'
import type { MapDef, PlacedProp, WorldScene } from './world'

/**
 * One plant: `[kind, x, y, variant?, flags?]`. Flags: `s` sway (animated),
 * `f` flip, `b` bake into the ground layer (walls, far edges), `n` no trunk
 * obstacle, `w` allow inside a hotspot rect (decorating a building front),
 * `d` no dappled shade, `z<n>` sort offset (ivy defaults to its height + 4,
 * so it hangs over the wall it grows on).
 */
export type Plant = [PlantKind, number, number, number?, string?]

export interface FoliageSpec {
  plants?: Plant[]
  /** Painted into the baked layer after the map's own bake (before baked plants). */
  ground?(g: Surface, night: boolean): void
  /** Extra obstacles (e.g. a planter box) – keep them tiny. */
  obstacles?: Rect[]
  /** Grass tufts and wild flowers over every lawn pixel (density per 100 px²). */
  tufts?: number
}

interface Placed {
  k: PlantKind
  x: number
  y: number
  v: number
  flip: boolean
  sway: boolean
  bake: boolean
  shade: boolean
}

/** Max animated plants per map (performance). */
export const MAX_SWAY = 8

type Pt = { x: number; y: number }

/** Points a plant must keep clear of. */
export function keepOutPoints(map: MapDef): Pt[] {
  return [
    ...map.hotspots.map((h) => h.at),
    // Quest givers are merged into the map later (WorldScene), keep their spots too.
    ...questNpcsOn(map.id).flatMap((n) => [n.at ?? { x: n.x, y: n.y + 14 }, { x: n.x, y: n.y }]),
    map.spawn,
    ...Object.values(map.entries ?? {}),
    ...map.pickupSpots,
    ...map.pois,
    ...(map.vendors ?? []),
  ]
}

const within = (r: Rect, x: number, y: number, pad = 0) => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad

/**
 * Which plants of a spec can be placed on a map (pure; exported for tests).
 * Returns the kept plants and the reasons others were dropped.
 */
export function placePlants(map: MapDef, plants: Plant[]): { kept: Placed[]; dropped: string[] } {
  const pts = keepOutPoints(map)
  const kept: Placed[] = []
  const dropped: string[] = []
  let sways = 0
  for (const [k, x, y, v = 0, flags = ''] of plants) {
    const info = PLANTS[k]
    const why = (() => {
      if (x < 0 || x > map.w || y < 0 || y > map.h) return 'off map'
      const clear = info.trunk && !flags.includes('n') ? Math.max(9, info.trunk[0]) : 7
      const hit = pts.find((p) => Math.abs(p.x - x) < clear && Math.abs(p.y - y) < clear * 0.8)
      if (hit) return `too close to ${Math.round(hit.x)},${Math.round(hit.y)}`
      if (!flags.includes('w')) {
        const h = map.hotspots.find((h) => within(h.rect, x, y, -2))
        if (h) return `inside hotspot ${h.id}`
      }
      return null
    })()
    if (why) {
      dropped.push(`${k}@${x},${y}: ${why}`)
      continue
    }
    const sway = flags.includes('s') && sways < MAX_SWAY
    if (sway) sways++
    kept.push({ k, x, y, v, flip: flags.includes('f'), sway, bake: flags.includes('b'), shade: !!info.shade && !flags.includes('d') })
  }
  return { kept, dropped }
}

/** Trunk obstacle of a placed plant (null for walk-through plants). */
export function trunkRect(p: { k: PlantKind; x: number; y: number }, flags = ''): Rect | null {
  const t = PLANTS[p.k].trunk
  if (!t || flags.includes('n') || flags.includes('b')) return null
  return { x: Math.round(p.x - t[0] / 2), y: Math.round(p.y - t[1] + 1), w: t[0], h: t[1] }
}

/** Merge a foliage spec into a map. */
export function dressMap(map: MapDef, spec: FoliageSpec): MapDef {
  const plants = spec.plants ?? []
  const { kept, dropped } = placePlants(map, plants)
  if (dropped.length && import.meta.env?.DEV) console.info(`[foliage] ${map.id}: dropped ${dropped.length}`, dropped)
  const flagsOf = new Map<Placed, string>()
  for (const p of kept) flagsOf.set(p, plants.find((q) => q[0] === p.k && q[1] === p.x && q[2] === p.y)?.[4] ?? '')
  const props: PlacedProp[] = []
  const obstacles: Rect[] = [...(spec.obstacles ?? [])]
  for (const p of kept) {
    const r = trunkRect(p, flagsOf.get(p))
    if (r) obstacles.push(r)
    if (p.sway || p.bake) continue
    const small = PLANTS[p.k].r < 14
    const zf = /z(-?\d+)/.exec(flagsOf.get(p) ?? '')
    const z = zf ? +zf[1] : p.k === 'ivy' ? plantSize('ivy').h + 4 : undefined
    props.push({ sprite: plantSprite(p.k, p.v), x: p.x, y: p.y, flip: p.flip, z, shadow: small && p.k !== 'ivy' ? [Math.round(PLANTS[p.k].r * 0.7), 2] : undefined })
  }
  const bake0 = map.bake
  const life0 = map.life
  return {
    ...map,
    bake(g, night) {
      bake0.call(map, g, night)
      if (spec.tufts) grassTufts(g, map.w, map.h, spec.tufts, map.w + map.h, map.skyH + 8)
      spec.ground?.(g, night)
      for (const p of kept) {
        if (!p.shade) continue
        const r = PLANTS[p.k].r
        dapple(g, p.x, p.y - 2, r * 0.85, r * 0.34, p.x + p.y, night ? 0.4 : 0.55)
      }
      for (const p of kept) {
        if (!p.bake) continue
        const s = plantSprite(p.k, p.v)
        g.draw(s.canvas, p.x - s.ax, p.y - s.ay, p.flip)
      }
    },
    props: [...map.props, ...props],
    obstacles: [...map.obstacles, ...obstacles],
    life(s) {
      const base = life0 ? life0.call(map, s) : []
      return kept.length ? [...base, new FoliageLife(s, kept)] : base
    },
  }
}

// ---------------------------------------------------------------------------

/**
 * The living part of the dressing: swaying plants, falling petals and leaves,
 * shimmering sun flecks under big trees and a rustle when a plant is tapped.
 */
export class FoliageLife implements Life {
  private sway: (Placed & { ph: number; rustle: number })[]
  private fallers: Placed[]
  private shady: Placed[]
  constructor(
    private s: WorldScene,
    plants: Placed[],
  ) {
    this.sway = plants.filter((p) => p.sway).map((p) => ({ ...p, ph: rand(0, 6), rustle: 0 }))
    this.fallers = plants.filter((p) => PLANTS[p.k].fall)
    this.shady = plants.filter((p) => p.shade)
  }

  private top(p: Placed) {
    return p.y - plantSize(p.k).h * 0.7
  }

  update(dt: number) {
    for (const p of this.sway) p.rustle = Math.max(0, p.rustle - dt)
    const wind = this.s.wind()
    for (const p of this.fallers) {
      const rate = (PLANTS[p.k].r > 20 ? 0.18 : 0.08) * (0.6 + Math.max(0, wind))
      if (Math.random() > dt * rate) continue
      if (!this.s.onScreen(p.x, p.y, 10)) continue
      this.drop(p)
    }
  }

  private drop(p: Placed, burst = false) {
    const info = PLANTS[p.k]
    const r = info.r
    const c = pick(info.fall ?? ['#8fbf5a'])
    const petal = c.startsWith('#f') || c.startsWith('#e8') || c.startsWith('#ff')
    this.s.particles.add({
      kind: petal ? 'petal' : 'leaf',
      x: p.x + rand(-r * 0.8, r * 0.8),
      y: this.top(p) + rand(-4, 8),
      vx: rand(-4, 4) + this.s.wind() * 6 + (burst ? rand(-10, 10) : 0),
      vy: rand(5, 11),
      max: rand(2.2, 3.6),
      color: c,
      color2: petal ? '#fffaf0' : '#6a9a45',
    })
  }

  ground(g: Surface, t: number) {
    if (this.s.isNight()) return
    for (const p of this.shady) {
      if (!this.s.onScreen(p.x, p.y, 40)) continue
      const r = PLANTS[p.k].r
      for (let i = 0; i < 5; i++) {
        const a = p.x * 0.7 + i * 1.9
        const x = p.x + Math.cos(a) * r * 0.55 + Math.sin(t * 0.7 + i) * 1.5
        const y = p.y - 2 + Math.sin(a * 1.3) * r * 0.22
        const k = 0.5 + 0.5 * Math.sin(t * (0.9 + i * 0.23) + a)
        g.alpha(0.1 + k * 0.14)
        g.ellipse(Math.round(x), Math.round(y), 1.5 + (i % 2), 1, '#fff6c8')
      }
      g.alpha(1)
    }
  }

  sorted(add: (y: number, draw: () => void) => void, t: number) {
    const wind = this.s.wind()
    for (const p of this.sway) {
      const { w, h } = plantSize(p.k)
      if (!this.s.onScreen(p.x, p.y - h / 2, Math.max(w, h))) continue
      add(p.y, () => {
        const wob = Math.sin(t * (p.rustle > 0 ? 9 : 1.3) + p.ph) * (p.rustle > 0 ? 1.4 : 0.7) + wind * 0.8
        const frame = wob > 0.45 ? 1 : wob < -0.45 ? -1 : 0
        const sp = plantSprite(p.k, p.v, p.flip ? -frame : frame)
        if (PLANTS[p.k].r < 14 && p.k !== 'ivy') {
          const g = this.s.gfx
          g.alpha(0.18)
          g.ellipse(p.x, p.y, Math.round(PLANTS[p.k].r * 0.7), 2, '#3a2838')
          g.alpha(1)
        }
        this.s.gfx.draw(sp.canvas, p.x - sp.ax, p.y - sp.ay, p.flip)
      })
    }
  }

  tap(x: number, y: number): boolean {
    for (const p of [...this.sway, ...this.fallers]) {
      const { w, h } = plantSize(p.k)
      if (Math.abs(x - p.x) > w * 0.4 || y > p.y + 2 || y < p.y - h) continue
      if ('rustle' in p) (p as { rustle: number }).rustle = 0.9
      if (PLANTS[p.k].fall) for (let i = 0; i < 4; i++) this.drop(p, true)
      if (PLANTS[p.k].r > 20 && Math.random() < 0.35) this.s.burstBirds(p.x, this.top(p), 2)
      sfx.scratch()
      return true
    }
    return false
  }
}

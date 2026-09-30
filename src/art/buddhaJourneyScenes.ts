// The eight painted chapters of the Buddha-journey map. Each chapter paints
// its ground (terrain, water) and then its objects (scenery and figures)
// around the stage nodes, and registers its animated fx. Coordinates inside
// a chapter are [dx from the centre line, up from the chapter's bottom].

import type { Surface } from '../engine/pixel'
import type { Sprite } from '../engine/sprite'
import type { Sculpted } from './hall'
import { softGlow } from './hall'
import type { JourneyChapterId, JourneyLayout } from './buddhaJourneyStory'
import {
  aureole,
  bamboo,
  banana,
  bridge,
  bush,
  canopy,
  flowerDots,
  grassTuft,
  hash01,
  J,
  lilyPad,
  lotusFlower,
  muralCloud,
  muralTree,
  muralWaves,
  paintGround,
  paintWater,
  palmTree,
  pavilion,
  pointIn,
  riverPoly,
  rng,
  rockPile,
  thaiRoof,
  tieredTree,
  TREE_DAY,
  TREE_NIGHT2,
  TREE_OLIVE,
  TREE_TEAL,
  TREE_NIGHT,
  trunk,
  wallRun,
  type FxItem,
  type Light,
  type PaintCtx,
  type TreeStyle,
} from './buddhaJourneyPaint'
import {
  attendantSprite,
  babyBuddha,
  bierSprite,
  channaSprite,
  chariotSprite,
  deerSprite,
  devaSprite,
  discipleSprite,
  drawSculpt,
  drawSprite,
  elephantKneelSprite,
  goldCartSprite,
  indraSprite,
  kanthakaSprite,
  maraSprite,
  mayaSprite,
  monkSeatedSprite,
  monkWalkSprite,
  offeringSprite,
  oldManSprite,
  princeSculpt,
  recliningBuddha,
  samanaSprite,
  seatedBuddha,
  sickSprite,
  soldierSprite,
  sotthiyaSprite,
  standingBuddha,
  sujataSprite,
  thoraniSculpt,
  traySprite,
} from './buddhaJourneyFigures'

import { birdsFx, cloudFx, firefliesFx, fxSprite, glintsFx, glowFx, petalsFx, sparklesFx } from './buddhaJourneyFx'

export interface ScenePainter {
  ground: (c: PaintCtx) => void
  objects: (c: PaintCtx) => void
}

const TAU = Math.PI * 2
type Box = [number, number, number, number]

// ---------------------------------------------------------------------------
// Shared helpers

function bandGround(c: PaintCtx, seed: number) {
  paintGround(c.g, 0, c.band.top, c.g.w, c.band.bottom - c.band.top, c.night, seed)
}

/** Is a map point within d of the road? */
function nearRoad(L: JourneyLayout, x: number, y: number, d: number) {
  const r = L.road
  const d2 = d * d
  for (let i = 0; i < r.xs.length; i += 2) {
    const dy = r.ys[i] - y
    if (dy > d || dy < -d) continue
    const dx = r.xs[i] - x
    if (dx * dx + dy * dy < d2) return true
  }
  return false
}

function nearNode(L: JourneyLayout, x: number, y: number, d: number) {
  return L.nodes.some((n) => Math.abs(n.x - x) < d && Math.abs(n.y - y) < d * 1.1)
}

function inBoxes(c: PaintCtx, x: number, y: number, boxes: Box[], m = 0) {
  const dx = x - c.cx
  const up = c.band.bottom - y
  return boxes.some(([a, b, d, e]) => dx >= a - m && dx <= d + m && up >= b - m && up <= e + m)
}

function inWater(c: PaintCtx, x: number, y: number, m = 3) {
  return c.water.some((p) => pointIn(p, x, y) || pointIn(p, x + m, y) || pointIn(p, x - m, y) || pointIn(p, x, y + m) || pointIn(p, x, y - m))
}

type FillKind = 'tree' | 'bloom' | 'tier' | 'palm' | 'bush' | 'banana' | 'bamboo' | 'rock' | 'flowers'

/**
 * Fill the free parts of a chapter with mural scenery (trees, bushes,
 * flowers, rocks), keeping clear of the road, the stage nodes, water and the
 * painted scenes. Drawn back to front.
 */
function fill(c: PaintCtx, seed: number, kinds: FillKind[], opts: { density?: number; step?: number; avoid?: Box[]; bloom?: string; st?: TreeStyle } = {}) {
  const r = rng(seed)
  const step = opts.step ?? 16
  const density = opts.density ?? 0.6
  const h = c.band.bottom - c.band.top
  const avoid = [...c.chapter.scenes.map((s) => s.box), ...(opts.avoid ?? [])]
  const styles = opts.st ? [opts.st] : c.night ? [TREE_NIGHT, TREE_NIGHT2] : [TREE_DAY, TREE_OLIVE, TREE_TEAL, TREE_DAY]
  const items: { x: number; y: number; k: FillKind; s: number }[] = []
  let row = 0
  for (let up = 6; up < h - 4; up += step * 0.72, row++) {
    for (let dx = -104 + (row % 2) * step * 0.5; dx <= 104; dx += step) {
      if (r() > density) continue
      const ddx = dx + (r() - 0.5) * step * 0.7
      const uu = up + (r() - 0.5) * step * 0.5
      const x = Math.round(c.X(ddx))
      const y = Math.round(c.Y(uu))
      let k = kinds[Math.floor(r() * kinds.length)]
      const big = k === 'tree' || k === 'bloom' || k === 'tier' || k === 'palm' || k === 'bamboo' || k === 'banana'
      // Tall things need headroom below the chapter's top edge.
      if (big && uu > h - 26) k = 'bush'
      if (c.night && k === 'rock') k = 'bush'
      const clear = k === 'flowers' ? 6 : k === 'bush' || k === 'rock' ? 10 : 12
      if (nearRoad(c.L, x, y, clear)) continue
      if (nearNode(c.L, x, y, k === 'flowers' ? 12 : 16)) continue
      if (inBoxes(c, x, y, avoid, big ? 11 : 4)) continue
      if (inWater(c, x, y, big ? 5 : 2)) continue
      items.push({ x, y, k, s: r() })
    }
  }
  items.sort((a, b) => a.y - b.y)
  for (const it of items) {
    const g = c.g
    const sd = Math.floor(it.s * 1000) + seed
    const st = styles[Math.floor(hash01(sd * 3) * styles.length)]
    switch (it.k) {
      case 'tree':
        shadowAt(c, it.x, it.y, 8)
        muralTree(g, it.x, it.y, 8 + Math.round(it.s * 4), st, sd)
        break
      case 'bloom':
        shadowAt(c, it.x, it.y, 8)
        muralTree(g, it.x, it.y, 8 + Math.round(it.s * 3), st, sd, c.night ? undefined : opts.bloom ?? J.pinkL)
        break
      case 'tier':
        shadowAt(c, it.x, it.y, 6)
        tieredTree(g, it.x, it.y, 22 + Math.round(it.s * 8), st, sd)
        break
      case 'palm':
        palmTree(g, it.x, it.y, 20 + Math.round(it.s * 8), st, sd)
        break
      case 'banana':
        banana(g, it.x, it.y, 14 + Math.round(it.s * 4), st, sd)
        break
      case 'bamboo':
        bamboo(g, it.x, it.y, 22 + Math.round(it.s * 8), sd, c.night)
        break
      case 'bush':
        bush(g, it.x, it.y, 9 + Math.round(it.s * 6), st, sd, c.night ? undefined : it.s < 0.35 ? opts.bloom ?? J.pinkL : undefined)
        break
      case 'rock':
        rockPile(g, it.x, it.y, 8 + Math.round(it.s * 6), 6 + Math.round(it.s * 4), sd, c.night)
        break
      case 'flowers':
        if (c.night) grassTuft(g, it.x, it.y, true, 2)
        else {
          flowerDots(g, it.x - 3, it.y - 2, 6, 4, 4, sd, [J.pinkL, '#fff4d8', J.goldL, J.sal])
          grassTuft(g, it.x, it.y + 1, false)
        }
        break
    }
  }
}

/** Grass tufts sprinkled everywhere free. */
function tufts(c: PaintCtx, seed: number, n: number) {
  const r = rng(seed)
  for (let i = 0; i < n; i++) {
    const x = Math.round(r() * c.g.w)
    const y = Math.round(c.band.top + 5 + r() * (c.band.bottom - c.band.top - 8))
    if (nearRoad(c.L, x, y, 7) || inWater(c, x, y, 1)) continue
    grassTuft(c.g, x, y, c.night, r() < 0.3 ? 2 : 1)
  }
}

/** A gold holy figure with its aureole; registers the halo glow. */
function holy(c: PaintCtx, f: Sculpted, dx: number, up: number, halo: [number, number, number], glow = 1) {
  const x = c.X(dx)
  const y = c.Y(up)
  const [hw, hh, hup] = halo
  c.both((g) => aureole(g, x, y - hup, hw, hh))
  c.both((g) => drawSculpt(g, f, x, y))
  c.light(dx, up + hup, hh * 0.9, '#ffd98a', 0.32 * glow)
  c.addFx(glowFx(x, y - hup, hh * 0.75, 0.22 * glow, '#ffe6a0', 1.1, 1.4))
}

/** A sculpted figure (gold, so it also shines at night). */
function figure(c: PaintCtx, f: Sculpted, dx: number, up: number, emissive = true) {
  if (emissive) c.both((g) => drawSculpt(g, f, c.X(dx), c.Y(up)))
  else drawSculpt(c.g, f, c.X(dx), c.Y(up))
}

function sprite(c: PaintCtx, s: Sprite, dx: number, up: number, flip = false, emissive = false) {
  if (emissive) c.both((g) => drawSprite(g, s, c.X(dx), c.Y(up), flip))
  else drawSprite(c.g, s, c.X(dx), c.Y(up), flip)
}

function shadowAt(c: PaintCtx, x: number, y: number, rx: number) {
  c.g.ditherCircle(x, y + 0.5, rx, c.night ? '#0e1a2a' : J.gndDD, 0.8, 0.3)
}

/** Ground shadow ellipse under a figure. */
function shadow(c: PaintCtx, dx: number, up: number, rx: number) {
  shadowAt(c, c.X(dx), c.Y(up), rx)
}

function tree(c: PaintCtx, dx: number, up: number, size: number, seed: number, st?: TreeStyle, bloom?: string) {
  shadow(c, dx, up, size * 0.9)
  muralTree(c.g, c.X(dx), c.Y(up), size, st ?? (c.night ? TREE_NIGHT : TREE_DAY), seed, bloom)
}

/** Stylised river from a list of local centre points; returns its polygon. */
function river(c: PaintCtx, pts: [number, number][], half: number, seed: number): [number, number][] {
  const center = pts.map(([dx, up]) => [c.X(dx), c.Y(up)] as [number, number])
  const smooth: [number, number][] = []
  for (let i = 0; i + 1 < center.length; i++) {
    const [ax, ay] = center[i]
    const [bx, by] = center[i + 1]
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 4)
    for (let k = 0; k < n; k++) smooth.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n])
  }
  smooth.push(center[center.length - 1])
  const poly = riverPoly(smooth, (i) => half + Math.sin(i * 0.35 + seed) * 1.5)
  paintWater(c.g, poly, seed, c.night)
  c.water.push(poly)
  c.addFx(glintsFx(polyBox(poly), (x, y) => pointIn(poly, x + 0.5, y + 0.5) && pointIn(poly, x + 3.5, y + 0.5), Math.round(smooth.length / 2), seed))
  return poly
}

function pond(c: PaintCtx, dx: number, up: number, rx: number, ry: number, seed: number): [number, number][] {
  const poly: [number, number][] = []
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU
    poly.push([c.X(dx + Math.cos(a) * rx), c.Y(up + Math.sin(a) * ry + Math.sin(a * 3 + seed) * 1.2)])
  }
  paintWater(c.g, poly, seed, c.night)
  c.water.push(poly)
  c.addFx(glintsFx(polyBox(poly), (x, y) => pointIn(poly, x + 0.5, y + 0.5) && pointIn(poly, x + 3.5, y + 0.5), 4, seed))
  return poly
}

function polyBox(poly: [number, number][]): Box {
  let a = Infinity
  let b = Infinity
  let d = -Infinity
  let e = -Infinity
  for (const [x, y] of poly) {
    a = Math.min(a, x)
    b = Math.min(b, y)
    d = Math.max(d, x)
    e = Math.max(e, y)
  }
  return [a, b, d, e]
}

/** Bridges where the road crosses this chapter's water. */
function bridges(c: PaintCtx) {
  const r = c.L.road
  const n = r.xs.length
  const wet = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    if (r.ys[i] < c.band.top - 4 || r.ys[i] > c.band.bottom + 4) continue
    if (c.water.some((poly) => pointIn(poly, r.xs[i], r.ys[i]))) wet[i] = 1
  }
  // Widen each wet run a little so the planks reach the banks.
  const span = new Uint8Array(n)
  for (let i = 0; i < n; i++) if (wet[i]) for (let k = -7; k <= 7; k++) if (i + k >= 0 && i + k < n) span[i + k] = 1
  const plank = c.night ? '#6a4a3a' : '#a8743e'
  const plankL = c.night ? '#8a6a52' : '#c9924e'
  const rail = c.night ? '#3a2620' : '#6a4028'
  // Planks laid across the road's direction, then the two rails.
  for (let pass = 0; pass < 3; pass++)
    for (let i = 0; i < n; i += pass === 1 ? 3 : 1) {
      if (!span[i]) continue
      const a2 = r.xs[Math.min(n - 1, i + 2)] - r.xs[Math.max(0, i - 2)]
      const b2 = r.ys[Math.min(n - 1, i + 2)] - r.ys[Math.max(0, i - 2)]
      const l = Math.hypot(a2, b2) || 1
      const nx = -b2 / l
      const ny = a2 / l
      const x = r.xs[i]
      const y = r.ys[i]
      if (pass === 0) c.g.thickLine(x - nx * 8, y - ny * 8, x + nx * 8, y + ny * 8, 3, J.ink)
      else if (pass === 1) c.g.line(x - nx * 7, y - ny * 7, x + nx * 7, y + ny * 7, (i / 3) % 2 < 1 ? plankL : plank)
      else {
        c.g.px(Math.round(x - nx * 8), Math.round(y - ny * 8), rail)
        c.g.px(Math.round(x + nx * 8), Math.round(y + ny * 8), rail)
      }
    }
  void bridge
}

function lotusPatch(c: PaintCtx, pts: [number, number, number][]) {
  for (const [dx, up, open] of pts) {
    lilyPad(c.g, c.X(dx + 2), c.Y(up - 1), 3.5, c.night)
    lotusFlower(c.g, c.X(dx), c.Y(up), open)
  }
}

/** Starry night ground (mural night scenes keep a dark flat background). */
function nightGround(c: PaintCtx, seed: number) {
  const g = c.g
  const h = c.band.bottom - c.band.top
  g.gradientV(0, c.band.top, g.w, h, ['#1c2452', '#22305e', '#243a62', '#26405a'], 8)
  const r = rng(seed)
  for (let i = 0; i < (g.w * h) / 1100; i++) g.ditherCircle(r() * g.w, c.band.top + r() * h, 8 + r() * 16, r() < 0.5 ? '#2c3a6a' : '#1a2446', 0.5, 0.5)
}

function stars(c: PaintCtx, box: Box, n: number, seed: number) {
  const r = rng(seed)
  const [a, b, d, e] = box
  for (let i = 0; i < n; i++) {
    const x = Math.round(c.X(a + r() * (d - a)))
    const y = Math.round(c.Y(b + r() * (e - b)))
    if (nearRoad(c.L, x, y, 7)) continue
    const k = r()
    c.both((g) => {
      g.px(x, y, k < 0.3 ? '#ffffff' : '#b8c0f0')
      if (k < 0.1) {
        g.px(x - 1, y, '#7880c0')
        g.px(x + 1, y, '#7880c0')
        g.px(x, y - 1, '#7880c0')
        g.px(x, y + 1, '#7880c0')
      }
    })
  }
  const [x0, y0, x1, y1] = [c.X(a), c.Y(e), c.X(d), c.Y(b)]
  c.addFx({
    box: [x0, y0, x1, y1],
    z: 2,
    draw: (g, t) => {
      for (let i = 0; i < 10; i++) {
        const k = (t * 0.4 + hash01(seed + i)) % 1
        const cyc = Math.floor(t * 0.4 + hash01(seed + i))
        const x = Math.round(x0 + hash01(seed + i * 7 + cyc * 13) * (x1 - x0))
        const y = Math.round(y0 + hash01(seed + i * 11 + cyc * 17) * (y1 - y0))
        const a2 = Math.sin(k * Math.PI)
        g.alpha(a2)
        g.px(x, y, '#ffffff')
        g.px(x - 1, y, '#c8d0f8')
        g.px(x + 1, y, '#c8d0f8')
        g.px(x, y - 1, '#c8d0f8')
        g.px(x, y + 1, '#c8d0f8')
        g.reset()
      }
    },
  })
}

function moon(c: PaintCtx, dx: number, up: number, r: number) {
  const x = c.X(dx)
  const y = c.Y(up)
  c.both((g) => {
    softGlow(g, x, y, r * 3.2, 0.35, '#c8d8ff')
    g.circle(x, y, r + 1, '#e8dcc0')
    g.circle(x, y, r, '#fff8e4')
    g.circle(x - r * 0.3, y - r * 0.2, r * 0.35, '#f4ead0')
    g.circle(x + r * 0.35, y + r * 0.3, r * 0.22, '#efe2c4')
    g.px(Math.round(x + r * 0.1), Math.round(y - r * 0.55), '#efe2c4')
  })
  c.light(dx, up, r * 3, '#dfe8ff', 0.5)
  c.addFx(glowFx(x, y, r * 2.4, 0.12, '#dfe8ff', 0.6, 1.2))
}

/** A lamp on a post (ตะเกียง) that glows at night. */
function lamp(c: PaintCtx, dx: number, up: number) {
  const x = c.X(dx)
  const y = c.Y(up)
  c.g.rect(x - 1, y - 10, 3, 10, J.ink)
  c.g.rect(x, y - 10, 1, 10, J.trunk)
  c.both((g) => {
    g.rect(x - 2, y - 14, 5, 5, J.ink)
    g.rect(x - 1, y - 13, 3, 3, J.goldL)
    g.px(x, y - 12, '#ffffff')
  })
  c.light(dx, up + 12, 12, '#ffcf7a', 0.9)
  c.addFx(glowFx(x + 0.5, y - 12, 7, 0.22, '#ffcf7a', 3, 2.6))
}

/** Seven-tiered white parasol (เศวตฉัตร) floating above a holy child. */
function parasol(c: PaintCtx, dx: number, up: number) {
  const x = c.X(dx)
  const y = c.Y(up)
  c.both((g) => {
    g.rect(x, y, 1, 14, J.goldD)
    // Tiers from the widest (bottom) up; each a white canopy with a gold fringe.
    for (let i = 0; i < 4; i++) {
      const w = 14 - i * 3
      const yy = y + 1 - i * 3
      const x0 = Math.round(x - w / 2)
      g.rect(x0 - 1, yy - 2, w + 3, 4, J.inkS)
      g.rect(x0, yy - 1, w + 1, 2, '#fffaf0')
      g.hline(x0, x0 + w, yy, '#e8dcc4')
      for (let k = x0; k <= x0 + w; k += 2) g.px(k, yy + 1, J.goldM)
    }
    g.rect(x - 1, y - 12, 3, 2, J.inkS)
    g.px(x, y - 12, J.goldL)
  })
}

// ---------------------------------------------------------------------------
// 1. Birth at Lumbini

const birth: ScenePainter = {
  ground(c) {
    bandGround(c, 11)
    pond(c, 70, 44, 22, 12, 3)
  },
  objects(c) {
    const g = c.g
    tufts(c, 12, 60)
    lotusPatch(c, [
      [62, 44, 1],
      [78, 48, 0],
      [84, 40, 1],
      [70, 38, 0],
    ])
    lilyPad(g, c.X(58), c.Y(50), 3)
    fill(c, 13, ['tree', 'bloom', 'bush', 'bush', 'flowers', 'flowers', 'palm'], { avoid: [[46, 28, 96, 60]], bloom: J.sal })

    // --- The seven steps: lotus blossoms springing up under the baby's feet.
    const steps: [number, number][] = [
      [-88, 24],
      [-80, 31],
      [-72, 37],
      [-63, 42],
      [-54, 46],
      [-45, 49],
      [-36, 51],
    ]
    steps.forEach(([dx, up], i) => {
      shadow(c, dx, up, 5)
      lilyPad(g, c.X(dx + 3), c.Y(up - 1), 4)
      lotusFlower(g, c.X(dx), c.Y(up) + 1, 1, i === 6 ? '#fbc4d6' : J.lotus)
    })
    const [bx, by] = steps[6]
    c.both((gg) => aureole(gg, c.X(bx), c.Y(by + 14), 15, 24))
    figure(c, babyBuddha(0.21), bx, by + 3)
    parasol(c, bx, by + 34)
    c.light(bx, by + 12, 18, '#ffe6a0', 0.7)
    c.addFx(sparklesFx(c.X(bx), c.Y(by + 12), 13, 8, 71))
    c.addFx(glowFx(c.X(bx), c.Y(by + 12), 13, 0.25, '#fff0b0'))
    // Lotuses breathing (a soft white bloom that passes along the steps).
    c.addFx({
      box: [c.X(-92), c.Y(62), c.X(-30), c.Y(16)],
      z: 8,
      draw: (gg, t) => {
        steps.forEach(([dx, up], i) => {
          const k = Math.sin(t * 1.6 - i * 0.6)
          if (k > 0.55) {
            gg.alpha((k - 0.55) * 2.2)
            gg.px(c.X(dx), c.Y(up) - 6, '#ffffff')
            gg.px(c.X(dx) - 1, c.Y(up) - 5, J.pinkL)
            gg.px(c.X(dx) + 1, c.Y(up) - 5, J.pinkL)
            gg.reset()
          }
        })
      },
    })
    // Devas scattering flowers from the sky.
    for (const [dx, up, f] of [
      [-80, 80, false],
      [-58, 88, true],
    ] as [number, number, boolean][]) {
      muralCloud(g, c.X(dx), c.Y(up - 11), 20)
      sprite(c, devaSprite(), dx, up - 9, f)
    }
    c.addFx(petalsFx([c.X(-94), c.Y(80), c.X(-30), c.Y(52)], 9, 21, [J.pinkL, '#fff4d8', J.goldL]))

    // --- Queen Māyā under the sal tree.
    const tx = 66
    shadow(c, tx, 124, 16)
    trunk(g, c.X(tx), c.Y(124), 30, 7, TREE_DAY, -0.4)
    g.thickLine(c.X(tx - 3), c.Y(140), c.X(44), c.Y(142), 4, J.ink)
    g.thickLine(c.X(tx - 3), c.Y(140), c.X(44), c.Y(142), 2, J.trunk)
    canopy(g, c.X(tx - 4), c.Y(174), 34, 28, TREE_DAY, 91, 12, J.sal)
    canopy(g, c.X(40), c.Y(148), 10, 7, TREE_DAY, 92, 5, J.sal)
    // A royal screen behind the queen and her ladies.
    for (let x = 28; x <= 94; x++) {
      const up = 104
      const hgt = 17 + Math.round(Math.sin((x - 28) * 0.35) * 1.5)
      g.rect(c.X(x), c.Y(up + hgt), 1, hgt, x % 6 < 3 ? J.red : J.redD)
      g.px(c.X(x), c.Y(up + hgt), J.gold)
      if (x % 4 === 0) g.px(c.X(x), c.Y(up + hgt) + 3, J.goldL)
    }
    g.hline(c.X(28), c.X(94), c.Y(122), J.ink)
    for (const px of [28, 94]) {
      g.rect(c.X(px) - 1, c.Y(125), 3, 22, J.ink)
      g.rect(c.X(px), c.Y(124), 1, 20, J.gold)
      g.rect(c.X(px) - 1, c.Y(126), 3, 2, J.goldL)
    }
    shadow(c, 44, 104, 7)
    sprite(c, mayaSprite(), 44, 104)
    shadow(c, 62, 104, 5)
    sprite(c, attendantSprite('b'), 60, 104, true)
    shadow(c, 76, 104, 5)
    sprite(c, attendantSprite('e'), 74, 104, true)
    shadow(c, 88, 105, 4)
    sprite(c, attendantSprite('r'), 87, 105, true)
    c.addFx(petalsFx([c.X(26), c.Y(196), c.X(96), c.Y(104)], 16, 41, [J.sal, J.pinkL, '#fff4d8']))
    c.addFx(birdsFx(c.Y(204), c.g.w, 3))
    c.addFx(cloudFx(0, c.Y(150), 24, 2.5, c.g.w, false))
  },
}

// ---------------------------------------------------------------------------
// 2. Palace life and the four sights

const palace: ScenePainter = {
  ground(c) {
    bandGround(c, 21)
    const g = c.g
    // Paved palace court at the lower right.
    g.rect(c.X(6), c.Y(94), 92, 88, '#dccb9e')
    for (let y = c.Y(94); y < c.Y(6); y += 4) for (let x = c.X(6) + ((y >> 2) % 2) * 3; x < c.X(98); x += 6) g.px(x, y, '#cbb888')
    g.hline(c.X(6), c.X(97), c.Y(94), J.ink)
    g.hline(c.X(6), c.X(97), c.Y(93), '#efe2bc')
    g.vline(c.X(6), c.Y(94), c.Y(6), J.ink)
    // A garden canal curving round the court.
    river(c, [
      [-2, -4],
      [-1, 60],
      [8, 100],
      [60, 110],
      [104, 112],
    ], 4, 5)
  },
  objects(c) {
    const g = c.g
    tufts(c, 22, 50)
    bridges(c)
    fill(c, 23, ['tree', 'bloom', 'bush', 'flowers', 'tier', 'bush'], { avoid: [[4, 0, 96, 122]] })
    // --- The palace (ปราสาท): white walls, stacked red roofs and a gold spire.
    wallRun(g, c.X(8), c.X(97), c.Y(8), 7)
    const px0 = c.X(56)
    const py = c.Y(22)
    g.rect(px0 - 27, py - 23, 54, 24, J.ink)
    g.rect(px0 - 26, py - 22, 52, 22, J.wall)
    for (let i = 0; i < 5; i++) {
      g.rect(px0 - 23 + i * 10, py - 19, 5, 15, J.ink)
      g.rect(px0 - 22 + i * 10, py - 18, 3, 13, i === 2 ? J.goldM : '#3a2a4a')
    }
    g.hline(px0 - 26, px0 + 25, py - 3, J.wallD)
    thaiRoof(g, px0, py - 46, 66, 22, 3)
    for (let i = 0; i < 28; i++) {
      const w = Math.max(1, Math.round(9 * (1 - i / 28)))
      g.rect(px0 - Math.floor(w / 2) - 1, py - 48 - i, w + 2, 1, J.ink)
      g.rect(px0 - Math.floor(w / 2), py - 48 - i, w, 1, i % 4 === 0 ? J.goldL : J.goldM)
    }
    c.e.rect(px0 - 1, py - 76, 2, 3, J.goldLL)
    pavilion(g, c.X(20), c.Y(42), 18, 10)
    pavilion(g, c.X(88), c.Y(48), 14, 9, J.roofG, J.roofGD)
    // The young prince in the palace hall, dancers before him.
    figure(c, princeSculpt('palace', 0.2), 56, 6)
    c.light(56, 16, 14, '#ffe0a0', 0.6)
    sprite(c, attendantSprite('p'), 36, 8)
    sprite(c, attendantSprite('e'), 76, 8, true)
    for (const fx of [12, 34, 78]) {
      g.vline(c.X(fx), c.Y(26), c.Y(14), J.ink)
      c.addFx({
        box: [c.X(fx), c.Y(28), c.X(fx) + 7, c.Y(20)],
        z: 6,
        draw: (gg, t) => {
          for (let k = 0; k < 6; k++) {
            const wv = Math.round(Math.sin(t * 5 + k * 0.9 + fx) * 1)
            gg.rect(c.X(fx) + 1 + k, c.Y(26) + wv, 1, 3, k % 2 ? J.goldM : J.red)
          }
        },
      })
    }
    tree(c, 14, 78, 9, 12, TREE_DAY, J.pinkL)
    tree(c, 92, 86, 8, 13)
    // The prince's chariot sets out with Channa.
    shadow(c, 70, 126, 14)
    sprite(c, chariotSprite(), 70, 126, true)
    c.light(70, 136, 10, '#ffe0a0', 0.4)

    // --- The four sights, each beside its stage on the road.
    shadow(c, -80, 70, 6)
    bush(g, c.X(-90), c.Y(66), 10, TREE_DAY, 301)
    sprite(c, oldManSprite(), -78, 70)
    shadow(c, -42, 126, 13)
    g.rect(c.X(-57), c.Y(147), 28, 2, J.ink)
    g.rect(c.X(-56), c.Y(146), 26, 1, '#c9a676')
    g.vline(c.X(-56), c.Y(146), c.Y(127), J.trunkD)
    g.vline(c.X(-31), c.Y(146), c.Y(127), J.trunkD)
    sprite(c, sickSprite(), -42, 126)
    // Death, shown gently: a shrouded bier under a little pavilion, a candle.
    shadow(c, 74, 196, 14)
    pavilion(g, c.X(74), c.Y(194), 24, 11, J.roofG, J.roofGD)
    sprite(c, bierSprite(), 74, 196)
    c.light(83, 203, 8, '#ffcf7a', 0.8)
    c.addFx(glowFx(c.X(83), c.Y(205), 5, 0.3, '#ffcf7a', 5, 2))
    // The samana, calm, under a tree.
    tree(c, -84, 236, 11, 17)
    shadow(c, -66, 212, 5)
    sprite(c, samanaSprite(), -66, 212)
    c.addFx(glowFx(c.X(-66), c.Y(222), 9, 0.14, '#fff0c0', 1))
    c.addFx(cloudFx(40, c.Y(160), 26, 3, c.g.w, false))
    c.addFx(birdsFx(c.Y(180), c.g.w, 7))
  },
}

// ---------------------------------------------------------------------------
// 3. The Great Renunciation (night)

const renounce: ScenePainter = {
  ground(c) {
    nightGround(c, 31)
    river(c, [
      [-110, 88],
      [-60, 96],
      [-10, 108],
      [40, 118],
      [110, 122],
    ], 8, 13)
  },
  objects(c) {
    const g = c.g
    stars(c, [-96, 4, 96, 220], 70, 33)
    moon(c, 64, 196, 10)
    tufts(c, 32, 40)
    bridges(c)
    fill(c, 34, ['tree', 'bush', 'palm', 'tier', 'bush', 'rock'], { density: 0.6, avoid: [[46, 170, 96, 222]] })
    // --- Kapilavastu's wall and gate, behind the rider.
    wallRun(g, c.X(54), c.X(97), c.Y(54), 12, true)
    const gx = c.X(82)
    g.rect(gx - 9, c.Y(74), 18, 21, J.ink)
    g.rect(gx - 8, c.Y(73), 16, 19, '#7a7a92')
    g.rect(gx - 5, c.Y(68), 10, 14, '#140e20')
    thaiRoof(g, gx, c.Y(88), 24, 12, 2, '#6a2a3a', '#40182a', '#c9a24a')
    c.both((gg) => gg.rect(gx - 1, c.Y(62), 3, 4, J.goldL))
    c.light(82, 62, 10, '#ffcf7a', 0.9)
    // Kanthaka leaps away with the prince; devas hold up the hooves.
    const hx = 40
    const hy = 26
    muralCloud(g, c.X(30), c.Y(hy - 4), 14, '#5a6498', '#3a4274')
    muralCloud(g, c.X(50), c.Y(hy - 4), 14, '#5a6498', '#3a4274')
    sprite(c, devaSprite(), 28, hy - 3, false, true)
    sprite(c, devaSprite(), 51, hy - 3, true, true)
    c.addFx({
      box: [c.X(hx - 16), c.Y(hy + 34), c.X(hx + 16), c.Y(hy - 6)],
      z: 12,
      draw: (gg, t) => {
        const f = (Math.floor(t * 4) % 2) as 0 | 1
        softGlow(gg, c.X(hx - 2), c.Y(hy + 18), 18, 0.22, '#ffe6a0')
        drawSprite(gg, kanthakaSprite(f), c.X(hx), c.Y(hy) + (f ? -1 : 0), true)
      },
    })
    sprite(c, channaSprite(), 62, hy + 2, true)
    c.addFx(sparklesFx(c.X(hx), c.Y(hy + 14), 15, 6, 91))

    // --- Cutting the topknot on the far bank of the Anomā.
    const sx = -64
    const sy = 130
    g.ellipse(c.X(sx), c.Y(sy) + 1, 22, 5, '#4a4a5a')
    g.ellipse(c.X(sx), c.Y(sy), 20, 4, '#6a6a7a')
    c.both((gg) => aureole(gg, c.X(sx), c.Y(sy + 16), 18, 30))
    figure(c, princeSculpt('sword', 0.26), sx, sy)
    c.light(sx, sy + 16, 24, '#ffe6a0', 0.7)
    c.addFx(glowFx(c.X(sx), c.Y(sy + 16), 18, 0.18, '#ffe6a0', 1.1, 2))
    // The hair rises to Indra, who holds the jewelled casket.
    const ix = -60
    const iy = 190
    muralCloud(g, c.X(ix), c.Y(iy - 12), 26, '#5a6498', '#3a4274')
    sprite(c, devaSprite(), ix - 5, iy - 10, false, true)
    c.both((gg) => {
      gg.rect(c.X(ix + 3), c.Y(iy + 2), 8, 6, J.ink)
      gg.rect(c.X(ix + 4), c.Y(iy + 1), 6, 4, J.goldM)
      gg.px(c.X(ix + 6), c.Y(iy + 3), J.goldLL)
      gg.px(c.X(ix + 7), c.Y(iy + 3) + 1, '#ff6a8a')
    })
    c.light(ix + 7, iy, 14, '#fff0b0', 0.8)
    c.addFx(sparklesFx(c.X(ix + 7), c.Y(iy + 2), 9, 5, 97))
    c.addFx({
      box: [c.X(sx - 8), c.Y(iy + 4), c.X(sx + 14), c.Y(sy + 22)],
      z: 14,
      draw: (gg, t) => {
        for (let i = 0; i < 7; i++) {
          const k = (t * 0.22 + i / 7) % 1
          const x = c.X(sx + 1) + Math.sin(k * 6 + i) * 2 + k * 8
          const y = c.Y(sy + 26) - k * (iy - sy - 26)
          gg.alpha(Math.sin(k * Math.PI))
          gg.px(Math.round(x), Math.round(y), '#fff6c8')
          gg.px(Math.round(x), Math.round(y) + 1, J.goldM)
          gg.reset()
        }
      },
    })
    c.addFx(firefliesFx([c.X(-96), c.Y(222), c.X(96), c.Y(4)], 14, 51, true))
    c.addFx(cloudFx(20, c.Y(160), 30, 2, c.g.w, true))
  },
}

// ---------------------------------------------------------------------------
// 4. Seeking the way: fasting, the lute, Sujātā and the golden tray

const ascetic: ScenePainter = {
  ground(c) {
    bandGround(c, 41)
    const g = c.g
    const r = rng(44)
    for (let i = 0; i < 30; i++) g.ditherCircle(c.X(-96 + r() * 192), c.Y(r() * 330), 8 + r() * 12, J.gndDD, 0.35, 0.5)
    // The Nerañjarā at the top right.
    river(c, [
      [110, 318],
      [72, 296],
      [52, 266],
      [58, 236],
      [92, 214],
      [120, 204],
    ], 9, 23)
  },
  objects(c) {
    const g = c.g
    tufts(c, 42, 70)
    bridges(c)
    fill(c, 43, ['tree', 'tier', 'tree', 'bush', 'banana', 'palm', 'bush', 'flowers'], { density: 0.85 })
    // --- The years of fasting: the thin Bodhisatta and the five ascetics.
    tree(c, 60, 44, 14, 45)
    holy(c, seatedBuddha('fasting', 0.3), 60, 14, [26, 36, 14], 0.8)
    const five: [number, number, boolean][] = [
      [30, 12, false],
      [40, 6, false],
      [82, 8, true],
      [92, 16, true],
      [20, 22, false],
    ]
    for (const [dx, up, f] of five) {
      shadow(c, dx, up, 4)
      sprite(c, discipleSprite('side', f), dx, up)
    }
    // --- Indra's three-stringed lute: the middle way.
    const lx = -58
    const ly = 94
    muralCloud(g, c.X(lx), c.Y(ly - 2), 34)
    muralCloud(g, c.X(lx + 16), c.Y(ly + 5), 18)
    sprite(c, indraSprite(), lx, ly, false, true)
    c.addFx({
      box: [c.X(lx - 20), c.Y(ly + 34), c.X(lx + 26), c.Y(ly - 4)],
      z: 16,
      draw: (gg, t) => {
        for (let i = 0; i < 3; i++) {
          const k = (t * 0.35 + i / 3) % 1
          const x = c.X(lx + 6) + i * 5 + Math.sin(k * 5 + i) * 2
          const y = c.Y(ly + 8) - k * 22
          gg.alpha(Math.sin(k * Math.PI))
          const col = '#fff6c8'
          gg.rect(Math.round(x), Math.round(y), 1, 4, col)
          gg.rect(Math.round(x) - 2, Math.round(y) + 3, 2, 2, col)
          gg.px(Math.round(x) + 1, Math.round(y), col)
          gg.reset()
        }
      },
    })
    // --- Sujātā offers milk-rice under the banyan tree.
    const bx = -66
    const by = 162
    shadow(c, bx, by, 26)
    trunk(g, c.X(bx), c.Y(by + 2), 28, 9, TREE_DAY)
    for (const k of [-18, -12, 12, 18]) g.vline(c.X(bx + k), c.Y(by + 28), c.Y(by + 2), J.trunkD)
    canopy(g, c.X(bx), c.Y(by + 46), 32, 20, TREE_DAY, 49, 11)
    holy(c, seatedBuddha('meditate', 0.26), bx, by, [22, 32, 12], 0.9)
    sprite(c, sujataSprite(), bx + 27, by)
    sprite(c, attendantSprite('e'), bx + 39, by + 2)
    // --- The golden tray floats upstream.
    const path: [number, number][] = [
      [96, 214],
      [66, 230],
      [54, 256],
      [64, 286],
      [98, 310],
    ].map(([dx, up]) => [c.X(dx), c.Y(up)] as [number, number])
    c.addFx({
      box: [c.X(40), c.Y(324), c.X(97), c.Y(200)],
      z: 18,
      draw: (gg, t) => {
        const k = (t * 0.05) % 1
        const f = k * (path.length - 1)
        const i = Math.min(path.length - 2, Math.floor(f))
        const u = f - i
        const x = path[i][0] + (path[i + 1][0] - path[i][0]) * u
        const y = path[i][1] + (path[i + 1][1] - path[i][1]) * u + Math.sin(t * 3) * 0.6
        softGlow(gg, x, y, 12, 0.55, '#ffe08a')
        for (let q = 1; q <= 3; q++) {
          const kk = Math.max(0, f - q * 0.12)
          const ii = Math.min(path.length - 2, Math.floor(kk))
          const uu = kk - ii
          const rx = path[ii][0] + (path[ii + 1][0] - path[ii][0]) * uu
          const ry = path[ii][1] + (path[ii + 1][1] - path[ii][1]) * uu
          gg.alpha(0.6 - q * 0.15)
          gg.hline(Math.round(rx - 3 - q), Math.round(rx + 3 + q), Math.round(ry + 2), J.foam)
          gg.reset()
        }
        drawSprite(gg, traySprite(), x, y + 2)
      },
    })
    // The Bodhisatta watching from the bank.
    holy(c, standingBuddha('abhaya', 0.2), 36, 236, [14, 34, 16], 0.7)
    c.addFx(birdsFx(c.Y(270), c.g.w, 11))
    c.addFx(firefliesFx([c.X(-96), c.Y(330), c.X(96), c.Y(0)], 8, 61))
  },
}

// ---------------------------------------------------------------------------
// 5. Enlightenment under the Bodhi tree (night, the full moon of Visākha)

const enlighten: ScenePainter = {
  ground(c) {
    nightGround(c, 51)
    const g = c.g
    // The earth before the throne, lit gold.
    g.ditherCircle(c.X(18), c.Y(236), 60, '#34406a', 0.6, 0.35)
  },
  objects(c) {
    const g = c.g
    stars(c, [-96, 4, 96, 428], 110, 53)
    moon(c, 70, 410, 10)
    tufts(c, 52, 50)
    fill(c, 54, ['tree', 'palm', 'bush', 'tier', 'bush'], { density: 0.55, avoid: [[-40, 60, 96, 390], [50, 392, 96, 428]] })

    // --- Sotthiya brings eight handfuls of kusa grass.
    shadow(c, -58, 24, 6)
    sprite(c, sotthiyaSprite(), -58, 24)
    for (const [dx, up] of [
      [-80, 20],
      [-34, 16],
    ])
      grassTuft(g, c.X(dx), c.Y(up), true, 2)

    // --- The Bodhi tree, huge and glowing.
    const tx = 22
    const ty = 250
    const bodhi: TreeStyle = { dark: '#163e30', mid: '#236244', light: '#3a8a52', hi: '#8ccc62', trunk: '#5a3a2a', trunkD: '#3a2418' }
    trunk(g, c.X(tx), c.Y(ty + 20), 44, 12, bodhi)
    // Big boughs reaching out under the crown.
    for (const [ex, eu] of [
      [-30, 300],
      [70, 306],
      [-6, 318],
      [52, 322],
    ]) {
      g.thickLine(c.X(tx), c.Y(ty + 50), c.X(ex), c.Y(eu), 5, J.ink)
      g.thickLine(c.X(tx), c.Y(ty + 50), c.X(ex), c.Y(eu), 3, bodhi.trunk)
    }
    // The crown in mural clusters, the lowest ones lit gold by the Buddha's radiance.
    const lit: TreeStyle = { dark: '#24502e', mid: '#3f7c3a', light: '#7cae46', hi: '#e2dc6a', trunk: bodhi.trunk, trunkD: bodhi.trunkD }
    const clusters: [number, number, number, number, TreeStyle][] = [
      [-2, 364, 30, 16, bodhi],
      [-36, 348, 26, 18, bodhi],
      [40, 350, 26, 18, bodhi],
      [0, 338, 34, 20, bodhi],
      [-46, 318, 20, 14, bodhi],
      [50, 320, 20, 14, bodhi],
      [-22, 312, 24, 14, lit],
      [26, 312, 24, 14, lit],
      [2, 316, 22, 12, lit],
    ]
    clusters.forEach(([dx, up, rx, ry, st], i) => canopy(g, c.X(tx + dx), c.Y(up), rx, ry, st, 55 + i * 13, 8, '#e8d86a'))
    // Heart-shaped Bodhi leaves with long drip tips hang from the crown.
    const leafRows = ['x.x', 'xxx', 'xxx', '.x.', '.x.']
    for (let i = 0; i < 22; i++) {
      const a = Math.PI * (0.08 + (i / 21) * 0.84)
      const lx = Math.round(c.X(tx) + Math.cos(a) * 60 * (0.9 + hash01(i) * 0.1))
      const ly = Math.round(c.Y(334) + Math.sin(a) * 44 + 2 + hash01(i * 5) * 4)
      g.vline(lx + 1, ly - 3, ly - 1, '#2a1c14')
      c.both((gg) =>
        leafRows.forEach((row, j) => {
          for (let k = 0; k < 3; k++) if (row[k] === 'x') gg.px(lx + k, ly + j, j < 2 ? '#c8e87a' : '#8ccc62')
        }),
      )
    }
    // Heart-shaped Bodhi leaves glinting in the canopy.
    const leafR = rng(56)
    const leaves: [number, number][] = []
    for (let i = 0; i < 70; i++) {
      const a = leafR() * TAU
      const d = Math.sqrt(leafR())
      const x = Math.round(c.X(tx) + Math.cos(a) * 60 * d)
      const y = Math.round(c.Y(332) + Math.sin(a) * 44 * d)
      leaves.push([x, y])
      g.px(x, y, '#9ad26a')
      g.px(x + 1, y, '#9ad26a')
      g.px(x, y + 1, '#6aa84a')
    }
    c.addFx({
      box: [c.X(tx - 66), c.Y(382), c.X(tx + 66), c.Y(282)],
      z: 10,
      draw: (gg, t) => {
        leaves.forEach(([x, y], i) => {
          const k = Math.sin(t * 1.3 + i * 1.7)
          if (k < 0.6) return
          const a = (k - 0.6) * 2.5
          gg.alpha(a)
          gg.px(x, y, '#fff3a6')
          gg.px(x + 1, y, '#ffe58a')
          gg.px(x, y + 1, '#ffe58a')
          gg.px(x - 1, y, '#c8e87a')
          gg.px(x, y - 1, '#c8e87a')
          gg.reset()
          if (k > 0.93) softGlow(gg, x, y, 5, 0.5, '#fff3a6')
        })
      },
    })
    c.light(tx, 330, 70, '#ffe08a', 0.25)
    // The throne: a lotus pedestal with the kusa-grass cushion.
    const sy = 250
    g.rect(c.X(tx - 26), c.Y(sy - 2), 53, 8, J.ink)
    for (let i = 0; i < 13; i++) {
      const px = c.X(tx - 24 + i * 4)
      g.ellipse(px + 2, c.Y(sy - 2) + 1, 2.4, 3.6, i % 2 ? '#f3a6c0' : '#f8c4d4')
    }
    g.rect(c.X(tx - 22), c.Y(sy + 2), 45, 4, J.ink)
    g.rect(c.X(tx - 21), c.Y(sy + 1), 43, 2, '#b8c46a')
    g.hline(c.X(tx - 21), c.X(tx + 21), c.Y(sy + 2), '#dbe58a')
    // The Buddha subduing Māra, and his radiance.
    c.addFx({
      box: [c.X(tx - 50), c.Y(sy + 90), c.X(tx + 50), c.Y(sy - 6)],
      z: 3,
      draw: (gg, t) => {
        const cx = c.X(tx)
        const cy = c.Y(sy + 24)
        gg.ctx.save()
        gg.ctx.globalCompositeOperation = 'lighter'
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * TAU + t * 0.12
          const len = 40 + Math.sin(t * 1.5 + i * 2) * 5
          gg.alpha(0.1 + 0.05 * Math.sin(t * 2 + i))
          gg.line(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len * 0.9, '#ffe9a0')
        }
        gg.ctx.restore()
        gg.reset()
      },
    })
    holy(c, seatedBuddha('earth', 0.44), tx, sy + 2, [44, 62, 22], 1.4)
    c.addFx(sparklesFx(c.X(tx), c.Y(sy + 26), 28, 12, 57))
    // Māra's weapons turn into flowers and fall at the Buddha's seat.
    c.addFx(petalsFx([c.X(tx - 40), c.Y(sy + 70), c.X(tx + 40), c.Y(sy - 4)], 12, 58, [J.goldL, '#fff4d8', J.pinkL, '#ffd0e0']))

    // --- Mae Thorani rises from the earth before the throne and wrings her hair.
    const mx = 2
    const my = 166
    const th = thoraniSculpt(0.42)
    // The mound of earth she rises from, and her soft radiance.
    g.ellipse(c.X(mx), c.Y(my) + 2, 17, 5, J.ink)
    g.ellipse(c.X(mx), c.Y(my) + 1, 16, 4, '#5a4a3a')
    g.ellipse(c.X(mx - 3), c.Y(my), 10, 2.5, '#7a6448')
    softGlow(g, c.X(mx), c.Y(my + 22), 30, 0.4, '#bfe8ff')
    c.light(mx, my + 18, 30, '#c8f0ff', 0.4)
    // The flood: from the end of her hair, down and out across Māra's army.
    const tip: [number, number] = [c.X(mx + th.tip[0] * 0.42), c.Y(my + th.tip[1] * 0.42)]
    const lake: [number, number][] = [
      [tip[0] - 2, tip[1] + 2],
      [tip[0] + 4, tip[1] + 6],
      [c.X(14), c.Y(my - 22)],
      [c.X(40), c.Y(140)],
      [c.X(62), c.Y(146)],
      [c.X(84), c.Y(150)],
      [c.X(104), c.Y(146)],
      [c.X(104), c.Y(64)],
      [c.X(70), c.Y(58)],
      [c.X(44), c.Y(68)],
      [c.X(26), c.Y(90)],
      [c.X(8), c.Y(118)],
      [tip[0] - 6, tip[1] + 14],
    ]
    muralWaves(g, lake, true)
    c.water.push(lake)
    // Māra on Girimekhala and his soldiers, tumbling in the waves.
    sprite(c, maraSprite(), 66, 100)
    const soldiers: [number, number, number, boolean][] = [
      [36, 112, 0, false],
      [50, 88, 1, true],
      [84, 80, 0, true],
      [92, 124, 1, false],
      [44, 132, 1, false],
      [74, 70, 0, false],
      [22, 104, 0, true],
    ]
    for (const [dx, up, k, f] of soldiers) sprite(c, soldierSprite(k), dx, up, f)
    // Waves over their legs: they are sinking into the flood.
    const over: [number, number][] = [...soldiers.map(([dx, up]) => [dx, up] as [number, number]), [66, 100], [58, 100], [74, 100]]
    for (const [dx, up] of over) {
      const x = c.X(dx)
      const y = c.Y(up)
      g.rect(x - 7, y - 3, 14, 4, '#163a6a')
      for (let k = -6; k < 6; k += 4) {
        g.px(x + k, y - 3, '#4a86c0')
        g.px(x + k + 1, y - 4, '#cfeaff')
        g.px(x + k + 2, y - 4, '#4a86c0')
      }
    }
    figure(c, th, mx, my)
    c.addFx(glowFx(c.X(mx), c.Y(my + 18), 18, 0.2, '#d8f4ff', 1.4, 2))
    c.addFx({
      box: [tip[0] - 10, c.Y(my + 20), c.X(97), c.Y(56)],
      z: 20,
      draw: (gg, t, env) => {
        // A braided stream pouring from her hair to the ground.
        const run = 18
        for (let i = 0; i < run; i++) {
          const k = (t * 1.3 + i / run) % 1
          const x = tip[0] + Math.sin(k * 6 + i) * (0.5 + k * 3) + k * 6
          const y = tip[1] + k * 20
          gg.px(Math.round(x), Math.round(y), i % 3 ? '#cfeaff' : '#ffffff')
          if (i % 2) gg.px(Math.round(x) + 1, Math.round(y), '#8cc8f0')
        }
        // Surf rolling outwards across the flood.
        for (let i = 0; i < 16; i++) {
          const ph = ((env.still ? 0.5 : t * 0.35) + i / 16) % 1
          const ang = -0.9 + (i % 5) * 0.28
          const d = 10 + ph * 70
          const x = tip[0] + 6 + Math.cos(ang) * d
          const y = tip[1] + 18 + Math.sin(ang) * d * 0.35 + ph * 6
          if (!pointIn(lake, x, y)) continue
          gg.alpha(Math.sin(ph * Math.PI))
          gg.px(Math.round(x), Math.round(y), '#ffffff')
          gg.px(Math.round(x) + 1, Math.round(y) - 1, '#ffffff')
          gg.px(Math.round(x) + 2, Math.round(y) - 1, '#cfeaff')
          gg.px(Math.round(x) + 3, Math.round(y), '#8cc8f0')
          gg.reset()
        }
      },
    })
    c.addFx(firefliesFx([c.X(-96), c.Y(420), c.X(96), c.Y(4)], 18, 59, true))
    c.addFx(cloudFx(30, c.Y(410), 30, 2, c.g.w, true))
  },
}

// ---------------------------------------------------------------------------
// 6. The first sermon at the Deer Park

const sermon: ScenePainter = {
  ground(c) {
    bandGround(c, 61)
    const g = c.g
    // A raised earthen terrace for the teaching.
    g.ellipse(c.X(52), c.Y(40), 44, 16, J.ink)
    g.ellipse(c.X(52), c.Y(41), 43, 15, '#d8c99a')
    g.ellipse(c.X(48), c.Y(44), 32, 9, '#e6d9ae')
  },
  objects(c) {
    const g = c.g
    tufts(c, 62, 60)
    fill(c, 63, ['tree', 'bloom', 'bush', 'flowers', 'tier', 'flowers'], { density: 0.7 })
    // --- The Buddha teaching the five ascetics.
    tree(c, 76, 90, 14, 64)
    g.rect(c.X(36), c.Y(58), 33, 6, J.ink)
    g.rect(c.X(37), c.Y(57), 31, 4, J.gold)
    g.hline(c.X(37), c.X(67), c.Y(57), J.goldL)
    for (let i = 0; i < 8; i++) g.px(c.X(39 + i * 4), c.Y(55), J.goldD)
    holy(c, seatedBuddha('teach', 0.34), 52, 58, [34, 48, 18], 1.1)
    const five: [number, number, boolean][] = [
      [22, 30, false],
      [34, 24, false],
      [52, 22, false],
      [70, 24, true],
      [82, 30, true],
    ]
    for (const [dx, up, f] of five) {
      shadow(c, dx, up, 4)
      sprite(c, discipleSprite('back', f), dx, up)
    }
    // --- The Dhamma wheel with two resting deer (the emblem of the sermon).
    const wx = -56
    const wy = 150
    g.rect(c.X(wx - 3), c.Y(wy - 2), 7, 20, J.ink)
    g.rect(c.X(wx - 2), c.Y(wy - 2), 5, 19, J.goldD)
    g.rect(c.X(wx - 12), c.Y(wy - 20), 25, 5, J.ink)
    g.rect(c.X(wx - 11), c.Y(wy - 19), 23, 3, J.goldM)
    sprite(c, deerSprite('rest'), wx - 16, wy - 22)
    sprite(c, deerSprite('rest'), wx + 16, wy - 22, true)
    const cxw = c.X(wx)
    const cyw = c.Y(wy + 14)
    c.light(wx, wy + 14, 22, '#ffe08a', 0.8)
    c.addFx({
      box: [cxw - 20, cyw - 20, cxw + 20, cyw + 20],
      z: 12,
      draw: (gg, t, env) => {
        const rot = env.still ? 0 : t * 0.6
        softGlow(gg, cxw, cyw, 18, 0.35, '#ffe08a')
        gg.circle(cxw, cyw, 12, J.ink)
        gg.circle(cxw, cyw, 11, J.goldM)
        gg.circle(cxw, cyw, 9, J.goldD)
        gg.circle(cxw, cyw, 8, '#fff2c4')
        for (let i = 0; i < 8; i++) {
          const a = rot + (i / 8) * TAU
          gg.line(cxw, cyw, cxw + Math.cos(a) * 8, cyw + Math.sin(a) * 8, J.goldD)
          gg.px(Math.round(cxw + Math.cos(a) * 11), Math.round(cyw + Math.sin(a) * 11), J.goldLL)
        }
        gg.circle(cxw, cyw, 2.5, J.goldD)
        gg.circle(cxw, cyw, 1.5, J.goldL)
      },
    })
    // Deer grazing in the park.
    const herd: [number, number, 'stand' | 'graze' | 'rest', boolean][] = [
      [-84, 120, 'graze', false],
      [-24, 128, 'stand', true],
      [-80, 176, 'rest', false],
      [-30, 184, 'graze', true],
      [8, 88, 'rest', true],
    ]
    for (const [dx, up, p, f] of herd) {
      shadow(c, dx, up, 5)
      c.addFx({
        box: [c.X(dx - 8), c.Y(up + 12), c.X(dx + 8), c.Y(up)],
        z: 9,
        draw: (gg, t, env) => {
          const pose = p === 'graze' && Math.sin(t * 0.8 + dx) > 0.3 ? 'stand' : p
          fxSprite(gg, deerSprite(pose), c.X(dx), c.Y(up), f, env.night)
        },
      })
    }
    c.addFx(birdsFx(c.Y(170), c.g.w, 19))
    c.addFx(cloudFx(10, c.Y(120), 26, 3, c.g.w, false))
  },
}

// ---------------------------------------------------------------------------
// 7. Spreading the Dhamma

const teaching: ScenePainter = {
  ground(c) {
    bandGround(c, 71)
    const g = c.g
    // Jetavana: ground covered with gold coins.
    for (let i = 0; i < 260; i++) {
      const x = Math.round(c.X(-92 + hash01(i * 3) * 70))
      const y = Math.round(c.Y(64 + hash01(i * 7) * 34))
      g.px(x, y, i % 3 ? J.goldM : J.goldL)
      g.px(x + 1, y, J.goldD)
    }
    // The village lane of the alms round.
    g.rect(c.X(14), c.Y(152), 84, 12, J.ink)
    g.rect(c.X(14), c.Y(151), 84, 10, J.sandD)
    g.rect(c.X(14), c.Y(149), 84, 6, J.sand)
  },
  objects(c) {
    const g = c.g
    tufts(c, 72, 60)
    fill(c, 73, ['tree', 'bush', 'flowers', 'banana', 'bloom', 'tier'], { density: 0.7 })
    // --- Veḷuvana, the bamboo grove.
    for (const [dx, up, sd] of [
      [14, 24, 1],
      [90, 30, 2],
      [80, 62, 3],
      [24, 60, 4],
    ])
      bamboo(g, c.X(dx), c.Y(up), 28, sd)
    pavilion(g, c.X(52), c.Y(20), 26, 12)
    figure(c, seatedBuddha('meditate', 0.2), 52, 20)
    c.light(52, 30, 12, '#ffe0a0', 0.6)
    for (const [dx, up] of [
      [34, 12],
      [42, 8],
      [62, 8],
      [70, 12],
    ])
      sprite(c, monkSeatedSprite('back'), dx, up)
    // --- Jetavana: the monastery gate and Anāthapiṇḍika's cart of gold.
    pavilion(g, c.X(-40), c.Y(108), 34, 14, J.roofG, J.roofGD)
    figure(c, seatedBuddha('teach', 0.18), -40, 108)
    sprite(c, goldCartSprite(), -76, 76)
    sprite(c, offeringSprite(), -58, 72, true)
    c.addFx(sparklesFx(c.X(-60), c.Y(80), 22, 6, 77))
    // --- The alms round along the lane.
    const lane = c.Y(150)
    sprite(c, offeringSprite(), 30, 156)
    tree(c, 88, 186, 10, 74)
    pavilion(g, c.X(58), c.Y(170), 22, 10, J.roofL, J.roof)
    c.addFx({
      box: [c.X(12), lane - 30, c.X(97), lane + 4],
      z: 11,
      draw: (gg, t, env) => {
        // A line of monks walks slowly along the lane towards the villagers.
        const speed = env.still ? 0 : 4
        const span = 64
        for (let i = 0; i < 5; i++) {
          const x = c.X(98) - ((t * speed + i * 12) % span)
          const fade = Math.min(1, (c.X(98) - x) / 6, (x - c.X(34)) / 6)
          if (fade <= 0) continue
          const s = monkWalkSprite((Math.floor(t * 3 + i) % 2) as 0 | 1)
          gg.alpha(fade)
          fxSprite(gg, s, x, lane + 1, true, env.night)
          gg.reset()
        }
      },
    })
    // --- Nālāgiri, tamed by loving-kindness.
    holy(c, standingBuddha('abhaya', 0.26), -26, 206, [20, 44, 20], 1.1)
    shadow(c, -64, 204, 14)
    sprite(c, elephantKneelSprite(), -62, 204, true)
    c.addFx({
      box: [c.X(-64), c.Y(234), c.X(-40), c.Y(210)],
      z: 13,
      draw: (gg, t) => {
        // Little hearts of mettā drifting from the Buddha to the elephant.
        for (let i = 0; i < 3; i++) {
          const k = (t * 0.3 + i / 3) % 1
          const x = c.X(-30) - k * 22
          const y = c.Y(222) - Math.sin(k * Math.PI) * 8
          gg.alpha(Math.sin(k * Math.PI))
          gg.px(Math.round(x), Math.round(y), '#ff8ab0')
          gg.px(Math.round(x) + 2, Math.round(y), '#ff8ab0')
          gg.rect(Math.round(x), Math.round(y) + 1, 3, 1, '#ff8ab0')
          gg.px(Math.round(x) + 1, Math.round(y) + 2, '#ff8ab0')
          gg.reset()
        }
      },
    })
    sprite(c, monkSeatedSprite('front'), -6, 200)
    wallRun(g, c.X(-96), c.X(-40), c.Y(250), 10)
    c.addFx(birdsFx(c.Y(260), c.g.w, 23))
    c.addFx(cloudFx(60, c.Y(240), 28, 2.5, c.g.w, false))
  },
}

// ---------------------------------------------------------------------------
// 8. The Parinibbāna and the relic stupa

const nibbana: ScenePainter = {
  ground(c) {
    const g = c.g
    bandGround(c, 81)
    // A warm dawn wash over the upper half.
    g.gradientV(0, c.band.top, g.w, 150, ['#f7e0b0', '#efd6a0', '#d8d49a', J.gnd], 8)
    // The round terrace of the relic stupa.
    g.ellipse(c.X(0), c.Y(186), 50, 16, J.ink)
    g.ellipse(c.X(0), c.Y(187), 49, 15, '#e9dcb4')
    g.ellipse(c.X(0), c.Y(190), 40, 10, '#f3e8c6')
    for (let a = 0; a < TAU; a += TAU / 20) g.px(Math.round(c.X(Math.cos(a) * 45)), Math.round(c.Y(187 + Math.sin(a) * 13)), J.goldD)
    pond(c, -62, 200, 18, 8, 83)
    pond(c, 62, 206, 16, 7, 84)
  },
  objects(c) {
    const g = c.g
    tufts(c, 82, 40)
    lotusPatch(c, [
      [-66, 200, 1],
      [-54, 204, 0],
      [60, 206, 1],
      [70, 204, 0],
    ])
    fill(c, 83, ['bloom', 'tree', 'bush', 'flowers', 'tier'], { density: 0.65, bloom: J.sal, avoid: [[-50, 170, 50, 206]] })
    // --- Between the twin sal trees.
    const bx = -40
    const by = 58
    for (const tx of [-84, 4]) {
      shadow(c, tx, by, 12)
      trunk(g, c.X(tx), c.Y(by), 40, 7, TREE_DAY)
      canopy(g, c.X(tx), c.Y(by + 56), 22, 20, TREE_DAY, 85 + tx, 9, J.sal)
    }
    // The couch (แท่น) and the reclining Buddha.
    g.rect(c.X(bx - 34), c.Y(by + 6), 70, 8, J.ink)
    g.rect(c.X(bx - 33), c.Y(by + 5), 68, 6, J.red)
    g.hline(c.X(bx - 33), c.X(bx + 34), c.Y(by + 5), J.redL)
    for (let i = 0; i < 9; i++) g.px(c.X(bx - 30 + i * 8), c.Y(by + 2), J.goldM)
    g.rect(c.X(bx - 32), c.Y(by), 4, 2, J.ink)
    g.rect(c.X(bx + 30), c.Y(by), 4, 2, J.ink)
    c.both((gg) => {
      gg.ellipse(c.X(bx), c.Y(by + 14), 40, 12, J.goldDD)
      gg.ellipse(c.X(bx), c.Y(by + 14), 39, 11, J.goldM)
      gg.ellipse(c.X(bx), c.Y(by + 14), 34, 8, J.goldL)
    })
    figure(c, recliningBuddha(0.5), bx, by + 6)
    c.light(bx, by + 16, 40, '#ffe6a0', 0.6)
    c.addFx(glowFx(c.X(bx), c.Y(by + 16), 30, 0.14, '#ffe6a0', 0.8, 2))
    // Monks keeping vigil, composed.
    for (const [dx, up] of [
      [-70, 36],
      [-56, 32],
      [-40, 30],
      [-24, 32],
      [-10, 36],
    ])
      sprite(c, monkSeatedSprite('back'), dx, up)
    // Devas scattering flowers.
    muralCloud(g, c.X(-60), c.Y(122), 24)
    sprite(c, devaSprite(), -62, 124, false)
    muralCloud(g, c.X(-20), c.Y(128), 20)
    sprite(c, devaSprite(), -20, 130, true)
    c.addFx(petalsFx([c.X(-96), c.Y(130), c.X(16), c.Y(40)], 22, 87, [J.sal, J.pinkL, '#fff4d8', J.goldL]))
    // --- Around the relic stupa: lamps, flags and pilgrims.
    for (const dx of [-38, 38]) lamp(c, dx, 184)
    for (const dx of [-26, 26]) {
      g.vline(c.X(dx), c.Y(214), c.Y(186), J.ink)
      c.addFx({
        box: [c.X(dx), c.Y(216), c.X(dx) + 5, c.Y(196)],
        z: 6,
        draw: (gg, t) => {
          for (let k = 0; k < 14; k++) {
            const wv = Math.round(Math.sin(t * 3 + k * 0.5 + dx) * 1.5)
            gg.rect(c.X(dx) + 1 + wv * (k / 14), c.Y(212) + k, 3, 1, k % 4 < 2 ? J.goldM : '#fffaf0')
          }
        },
      })
    }
    c.addFx({
      box: [c.X(-60), c.Y(270), c.X(60), c.Y(170)],
      z: 2,
      draw: (gg, t) => {
        const cx = c.X(0)
        const cy = c.Y(214)
        gg.ctx.save()
        gg.ctx.globalCompositeOperation = 'lighter'
        for (let i = 0; i < 12; i++) {
          const a = -Math.PI / 2 + (i - 5.5) * 0.2 + Math.sin(t * 0.3) * 0.03
          gg.alpha(0.12 + 0.06 * Math.sin(t * 1.4 + i))
          gg.line(cx, cy, cx + Math.cos(a) * 70, cy + Math.sin(a) * 70, '#fff0b8')
        }
        gg.ctx.restore()
        gg.reset()
      },
    })
    c.light(0, 214, 50, '#ffe6a0', 0.6)
    c.addFx(birdsFx(c.Y(240), c.g.w, 29))
    c.addFx(cloudFx(0, c.Y(250), 30, 2, c.g.w, false))
    c.addFx(cloudFx(120, c.Y(160), 22, 3, c.g.w, false))
  },
}

export const SCENES: Record<JourneyChapterId, ScenePainter> = { birth, palace, renounce, ascetic, enlighten, sermon, teaching, nibbana }

// ---------------------------------------------------------------------------
// Caps and gates

export function paintBottomCap(g: Surface, L: JourneyLayout, fx: FxItem[]) {
  const top = L.bands[0].bottom
  paintGround(g, 0, top, L.w, L.h - top, false, 7)
  for (let i = 0; i < 26; i++) grassTuft(g, Math.round(hash01(i * 3) * L.w), top + 6 + Math.round(hash01(i * 5 + 1) * (L.h - top - 10)))
  flowerDots(g, 4, top + 8, L.w - 8, L.h - top - 12, 30, 9, [J.pinkL, '#fff4d8', J.goldL])
  void fx
}

export function paintTopCap(g: Surface, e: Surface, L: JourneyLayout, fx: FxItem[], lights: Light[]) {
  const bottom = L.bands[L.bands.length - 1].top
  g.gradientV(0, 0, L.w, bottom + 2, ['#fbeecb', '#f7e0b0'], 4)
  for (let i = 0; i < 5; i++) muralCloud(g, Math.round(10 + i * 44 + hash01(i) * 10), 16 + Math.round(hash01(i + 9) * 16), 22 + Math.round(hash01(i + 3) * 8))
  for (const [x, f] of [
    [L.cx - 60, false],
    [L.cx + 60, true],
  ] as [number, boolean][]) {
    drawSprite(g, devaSprite(), x, 30, f)
    drawSprite(e, devaSprite(), x, 30, f)
  }
  lights.push({ x: L.cx, y: 20, r: 40, color: '#ffe6a0', s: 0.3 })
  fx.push(petalsFx([0, 0, L.w, bottom + 30], 10, 3, [J.goldL, '#fff4d8', J.pinkL]))
}

/** Small temple gate (ซุ้มประตู) astride the road; base centre (x, y). */
export function templeGateArt(g: Surface, e: Surface, x: number, y: number, night: boolean) {
  const post = night ? '#8a8a9a' : J.wall
  const postD = night ? '#5a5a6a' : J.wallD
  for (const sx of [-13, 11]) {
    g.rect(x + sx - 1, y - 18, 5, 19, J.ink)
    g.rect(x + sx, y - 17, 3, 17, post)
    g.vline(x + sx + 2, y - 17, y - 1, postD)
    g.rect(x + sx - 2, y - 2, 7, 3, J.ink)
    g.rect(x + sx - 1, y - 1, 5, 1, postD)
  }
  g.rect(x - 14, y - 21, 29, 4, J.ink)
  g.rect(x - 13, y - 20, 27, 2, night ? '#8a3a2a' : J.red)
  thaiRoof(g, x, y - 31, 32, 10, 2, night ? '#7a2a2a' : J.roof, night ? '#4a1a1a' : J.roofD)
  e.rect(x - 1, y - 33, 2, 2, J.goldL)
}


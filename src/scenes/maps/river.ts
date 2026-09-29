// วัดริมน้ำ – an old riverside temple: boat alms, catfish and krathong.
// East of the hall a concrete catfish pond (บ่อปลาดุก) is crowded with
// whiskered ปลาดุก that swarm and gulp when fed; a big rain tree sheds leaves
// for volunteers to sweep.

import type { MapDef, PlacedProp } from '../world'
import * as T from '../../art/temple'
import * as F from '../../art/templeprops'
import * as G from '../../art/garden'
import { monkSprite } from '../../art/characters'
import { P } from '../../art/palette'
import type { Surface } from '../../engine/pixel'
import type { WorldScene } from '../world'
import type { Life } from '../life'
import type { Rect } from '../pathfind'
import { broomSprite, leafPile, rainTree, signPost, buildProp } from '../../art/places/south'
import { rand } from '../../engine/rng'
import { sfx } from '../../engine/audio'
import { Butterflies, CloudShadows, EaveBells, Flames, Glints, Lanterns, Smoke, SunRays, TapZones } from '../life'

const W = 288
const H = 520
const HALL = { x: 112, y: 392 }
const GATE = { x: 112, y: 516 }

// The catfish pond (inner water rect) and the rain tree beside it.
const POND: Rect = { x: 234, y: 262, w: 48, h: 48 }
const RAIN = { x: 258, y: 452 }

const TREES = [
  { id: 'r1', x: 172, y: 228, v: 1 },
  { id: 'r2', x: 52, y: 470, v: 2 },
]

// ---------------------------------------------------------------------------
// Catfish pond (บ่อปลาดุก).

/** Coin-op fish-pellet dispenser on a post. */
function pelletBox() {
  return buildProp('pelletbox', 12, 22, 6, 21, (g) => {
    g.rect(5, 10, 2, 12, '#6e4a35')
    g.rect(0, 0, 12, 11, '#3d63b5')
    g.rect(1, 1, 10, 3, '#9fd0ff')
    g.rect(2, 5, 8, 4, '#26306e')
    g.rect(3, 6, 6, 2, '#c9a04c')
    g.px(4, 6, '#9a6a45')
    g.px(7, 7, '#9a6a45')
    g.rect(9, 2, 1, 1, '#ffd23f')
    g.hline(0, 11, 10, '#26306e')
  })
}

/** Murky green pond with a concrete rim and a wooden feeding deck. */
function catfishPondBed(g: Surface) {
  const r = POND
  // Rim.
  g.rect(r.x - 4, r.y - 4, r.w + 8, r.h + 9, '#8c8187')
  g.rect(r.x - 4, r.y - 4, r.w + 8, r.h + 8, '#d8d0cb')
  g.hline(r.x - 4, r.x + r.w + 3, r.y - 4, '#f0ebe6')
  for (let x = r.x - 4; x < r.x + r.w + 4; x += 7) g.vline(x, r.y - 4, r.y - 1, '#bdb2ae')
  // Water (deep in the middle), inner shadow along the top edge.
  g.rect(r.x, r.y, r.w, r.h, '#9aae6a')
  g.dither(r.x + 3, r.y + 3, r.w - 6, r.h - 6, null, '#8a9e5c', 0.55)
  g.rect(r.x + 8, r.y + 8, r.w - 16, r.h - 16, '#8a9e5c')
  g.dither(r.x + 8, r.y + 8, r.w - 16, r.h - 16, null, '#7c9052', 0.45)
  g.hline(r.x, r.x + r.w - 1, r.y, '#5e7040')
  g.hline(r.x, r.x + r.w - 1, r.y + 1, '#72844a')
  // Duckweed and a few water hyacinths along the edges.
  for (let i = 0; i < 40; i++) {
    const h = ((i + 5) * 2654435761) >>> 0
    const edge = h % 4
    const t = (h >>> 8) % 100 / 100
    const x = edge < 2 ? r.x + 1 + t * (r.w - 2) : edge === 2 ? r.x + 1 + (h % 3) : r.x + r.w - 2 - (h % 3)
    const y = edge === 0 ? r.y + 2 + (h % 3) : edge === 1 ? r.y + r.h - 2 - (h % 3) : r.y + 2 + t * (r.h - 4)
    g.px(x, y, (h >>> 4) % 3 ? '#9ec05a' : '#b4d870')
  }
  for (const [x, y] of [[r.x + 4, r.y + r.h - 5], [r.x + r.w - 6, r.y + 4]]) {
    g.ellipse(x, y, 3, 2, '#43905a')
    g.px(x, y - 2, '#b8a6ff')
    g.px(x + 1, y - 2, '#d8c8ff')
  }
  // Feeding deck.
  g.rect(r.x - 18, r.y + 12, 18, 22, '#9a6a45')
  for (let y = r.y + 12; y < r.y + 34; y += 4) g.hline(r.x - 18, r.x - 1, y, '#7a5238')
  g.vline(r.x - 18, r.y + 12, r.y + 33, '#c28e5c')
  g.rect(r.x - 18, r.y + 34, 18, 1, '#6e4a35')
}

interface Catfish {
  x: number
  y: number
  a: number
  v: number
  ph: number
  len: number
  gulp: number
  tone: number
}

/** A crowd of whiskered catfish that swarm to pellets and gulp at the surface. */
class CatfishPond implements Life {
  private fish: Catfish[] = []
  private food: { x: number; y: number; t: number }[] = []
  private auto = 3
  constructor(
    private s: WorldScene,
    private r: Rect,
    n: number,
  ) {
    for (let i = 0; i < n; i++) {
      this.fish.push({ x: rand(r.x + 4, r.x + r.w - 4), y: rand(r.y + 4, r.y + r.h - 4), a: rand(0, Math.PI * 2), v: rand(3, 6), ph: rand(0, 6), len: 9 + (i % 3), gulp: 0, tone: i % 3 })
    }
  }
  private inside(x: number, y: number, pad = 3) {
    const r = this.r
    return x > r.x + pad && x < r.x + r.w - pad && y > r.y + pad && y < r.y + r.h - pad
  }
  toss(x: number, y: number, n = 6) {
    for (let i = 0; i < n; i++) {
      const fx = Math.min(this.r.x + this.r.w - 4, Math.max(this.r.x + 4, x + rand(-6, 6)))
      const fy = Math.min(this.r.y + this.r.h - 4, Math.max(this.r.y + 4, y + rand(-4, 4)))
      this.food.push({ x: fx, y: fy, t: rand(4, 7) })
    }
  }
  update(dt: number) {
    const p = this.s.player
    // Somebody standing on the deck keeps sprinkling a few pellets.
    this.auto -= dt
    if (this.auto <= 0) {
      this.auto = rand(5, 9)
      const onDeck = Math.hypot(p.x - (this.r.x - 10), p.y - (this.r.y + 24)) < 16
      if (onDeck || Math.random() < 0.4) this.toss(this.r.x + rand(6, 20), this.r.y + rand(10, this.r.h - 10), onDeck ? 8 : 3)
    }
    for (const f of this.food) f.t -= dt
    this.food = this.food.filter((f) => f.t > 0)
    for (const k of this.fish) {
      k.ph += dt
      k.gulp = Math.max(0, k.gulp - dt)
      if (k.gulp <= 0 && Math.random() < dt * 0.12) k.gulp = 0.6
      // Head for the nearest pellet, else wander.
      let best: { x: number; y: number; t: number } | null = null
      let bd = 40
      for (const f of this.food) {
        const d = Math.hypot(f.x - k.x, f.y - k.y)
        if (d < bd) {
          bd = d
          best = f
        }
      }
      if (best) {
        const want = Math.atan2(best.y - k.y, best.x - k.x)
        let d = want - k.a
        while (d > Math.PI) d -= Math.PI * 2
        while (d < -Math.PI) d += Math.PI * 2
        k.a += d * Math.min(1, dt * 6)
        if (bd < 2.5) {
          best.t = 0
          k.gulp = 0.5
          if (this.s.onScreen(k.x, k.y, 10)) {
            this.s.particles.add({ kind: 'ripple', x: k.x, y: k.y, max: 0.8, size: 6, color: '#d8ecc0' })
            for (let i = 0; i < 2; i++) this.s.particles.add({ kind: 'drop', x: k.x, y: k.y - 1, vx: rand(-10, 10), vy: rand(-22, -10), g: 90, max: 0.4, color: '#c8e0b0' })
            if (Math.random() < 0.3) sfx.gulp()
          }
        }
      } else {
        k.a += Math.sin(k.ph * 0.7 + k.len) * dt * 1.2
      }
      const sp = best ? 16 : k.v * (0.6 + 0.4 * Math.sin(k.ph))
      const nx = k.x + Math.cos(k.a) * sp * dt
      const ny = k.y + Math.sin(k.a) * sp * dt * 0.75
      if (this.inside(nx, ny)) {
        k.x = nx
        k.y = ny
      } else k.a += Math.PI * (0.6 + Math.random() * 0.4)
    }
  }
  ground(g: Surface, t: number) {
    if (!this.s.onScreen(this.r.x + this.r.w / 2, this.r.y + this.r.h / 2, 40)) return
    for (const f of this.food) {
      g.px(f.x, f.y, '#e0b060')
      g.px(f.x + 1, f.y, '#9a6a45')
    }
    const backs = ['#3e3a44', '#4a4050', '#352f3a']
    const halfW = [2, 2, 1.6, 1.3, 1.1, 1, 0.8, 0.6, 0.5, 0.4, 0.3, 0.3]
    for (const k of this.fish) {
      const dx = Math.cos(k.a)
      const dy = Math.sin(k.a) * 0.75
      const nx = -dy
      const ny = dx
      const wig = Math.sin(k.ph * 8) * 0.9
      const back = backs[k.tone]
      const stripe = '#6a6272'
      for (let i = 0; i < k.len; i++) {
        const side = i > 3 ? wig * ((i - 3) / k.len) * 2.2 : 0
        const cx = k.x - dx * i + nx * side
        const cy = k.y - dy * i + ny * side
        const hw = halfW[Math.min(halfW.length - 1, i)]
        for (let q = -hw; q <= hw + 0.01; q += 0.7) g.px(Math.round(cx + nx * q), Math.round(cy + ny * q), back)
        if (i > 0 && i < k.len - 2) g.px(Math.round(cx), Math.round(cy), i < 3 ? '#5e5668' : stripe)
      }
      // Tail fin.
      const tx = k.x - dx * k.len + nx * wig * 2
      const ty = k.y - dy * k.len + ny * wig * 2
      g.px(Math.round(tx + nx), Math.round(ty + ny), back)
      g.px(Math.round(tx - nx), Math.round(ty - ny), back)
      // Beady eyes on the flat head.
      g.px(Math.round(k.x - dx + nx * 1.6), Math.round(k.y - dy + ny * 1.6), '#e8e0c8')
      g.px(Math.round(k.x - dx - nx * 1.6), Math.round(k.y - dy - ny * 1.6), '#e8e0c8')
      // Whiskers (four barbels) swaying.
      const hx = k.x + dx
      const hy = k.y + dy
      const sw = Math.sin(t * 5 + k.ph) * 0.3
      for (const [ang, len] of [
        [0.5, 4],
        [-0.5, 4],
        [1.2, 2.6],
        [-1.2, 2.6],
      ]) {
        const a = k.a + ang + sw * Math.sign(ang)
        for (let d = 1; d <= len; d++) g.px(Math.round(hx + Math.cos(a) * d), Math.round(hy + Math.sin(a) * d * 0.75), d > len - 1.5 ? '#5a5060' : '#2a2430')
      }
      if (k.gulp > 0) {
        // Round open mouth gaping at the surface.
        const mx = Math.round(hx + dx)
        const my = Math.round(hy + dy)
        g.px(mx - 1, my, '#f0e4dc')
        g.px(mx + 1, my, '#f0e4dc')
        g.px(mx, my - 1, '#f0e4dc')
        g.px(mx, my + 1, '#f0e4dc')
        g.px(mx, my, '#7a3040')
      }
    }
  }
  tap(x: number, y: number): boolean {
    if (!this.inside(x, y, -2)) return false
    this.toss(x, y, 5)
    this.s.particles.add({ kind: 'ripple', x, y, max: 1, size: 9, color: '#e8f4d8' })
    sfx.plop()
    return true
  }
}

function boat(g: import('../../engine/pixel').Surface, x: number, y: number, monk: boolean, t: number) {
  const bob = Math.round(Math.sin(t * 2 + x * 0.1))
  if (monk) {
    const s = monkSprite('side', 'stand', { flip: true, skin: 2 })
    g.draw(s.canvas, Math.round(x - 4), y - 20 + bob)
  }
  g.poly(
    [
      [x - 16, y - 3 + bob],
      [x + 16, y - 3 + bob],
      [x + 11, y + 3 + bob],
      [x - 11, y + 3 + bob],
    ],
    '#8a5a32',
  )
  g.hline(x - 16, x + 16, y - 3 + bob, '#c28e5c')
  g.px(x - 17, y - 4 + bob, '#c28e5c')
  g.px(x + 17, y - 4 + bob, '#c28e5c')
  g.hline(x - 10, x + 10, y + 4 + bob, '#3a7fb0')
  // Paddle.
  g.line(x + 8, y - 10 + bob, x + 14, y + 4 + bob, '#6e4a35')
}

export function riverMap(): MapDef {
  const hall = T.hallSprite({ roof: T.ROOF.green, roof2: T.ROOF.green, field: '#3d63b5', fieldD: '#26306e', field2: '#c23a3f', field2D: '#7e2436' })
  const hallN = T.hallSprite({ roof: T.ROOF.green, roof2: T.ROOF.green, field: '#3d63b5', fieldD: '#26306e', field2: '#c23a3f', field2D: '#7e2436', night: true })
  const gate = T.gateSprite()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const lamps: [number, number][] = [
    [88, 206],
    [136, 206],
    [80, 430],
    [144, 430],
  ]
  const props: PlacedProp[] = [
    { sprite: hall, night: hallN, x: HALL.x, y: HALL.y },
    { sprite: F.urnSprite(), x: 112, y: 428, shadow: [10, 2] },
    { sprite: G.coconutPalm(0), x: 10, y: 236 },
    { sprite: G.coconutPalm(1), x: 214, y: 250 },
    { sprite: G.bananaPlant(), x: 204, y: 318 },
    { sprite: G.bananaPlant(), x: 16, y: 330 },
    { sprite: G.shrub(0), x: 60, y: 226 },
    { sprite: G.bougainvillea(0), x: 18, y: 432 },
    { sprite: F.stallSprite(), x: 180, y: 470 },
    { sprite: F.spiritHouseSprite(), x: 204, y: 214 },
    { sprite: F.lotusJarSprite('brown'), x: 40, y: 206 },
    { sprite: T.wallSprite(78), x: 0, y: 516 },
    { sprite: T.wallSprite(78), x: 146, y: 516 },
    { sprite: T.wallSprite(64), x: 224, y: 516 },
    { sprite: rainTree(1), x: RAIN.x, y: RAIN.y, id: 'rain' },
    { sprite: broomSprite(), x: 276, y: 470 },
    { sprite: pelletBox(), x: 224, y: 276 },
    { sprite: signPost('pladuk', '#fffaf0', '#3a70b0', 22), x: 268, y: 258 },
    { sprite: lamp, night: lampN, x: 284, y: 330 },
    { sprite: G.bananaPlant(), x: 280, y: 214 },
    { sprite: G.shrub(1), x: 244, y: 232 },
    { sprite: gate, x: GATE.x, y: GATE.y },
    ...TREES.map((t) => ({ sprite: G.frangipani(t.v), x: t.x, y: t.y, id: t.id })),
    ...lamps.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  return {
    id: 'river',
    w: W,
    h: H,
    skyH: 48,
    ground: '#86c95f',
    bake(g) {
      G.treeLine(g, 38, W, G.LEAVES.far, 6)
      // River.
      g.gradientV(0, 50, W, 132, ['#6fc0da', '#4a9ac4', '#3a82b4'], 6)
      for (let y = 54; y < 180; y += 5) for (let x = (y * 7) % 13; x < W; x += 17) g.rect(x, y, 6, 1, '#8fd4e8')
      for (let x = 0; x < W; x += 3) g.vline(x, 44, 50 + (x % 4), x % 2 ? G.LEAVES.deep.d : G.LEAVES.deep.b)
      // Stone embankment and steps (ท่าน้ำ).
      g.rect(0, 180, W, 8, P.stone)
      g.rect(0, 180, W, 2, P.stoneL)
      for (let i = 0; i < 4; i++) g.rect(20 + i * 2, 186 + i * 4, 56 - i * 4, 4, i % 2 ? P.stoneL : P.stone)
      // Wooden pier with a little roof post.
      g.rect(92, 148, 40, 42, '#9a6a45')
      for (let x = 92; x < 132; x += 5) g.vline(x, 148, 189, '#7a5238')
      g.rect(92, 148, 40, 2, '#c28e5c')
      for (const x of [92, 129]) g.rect(x, 186, 3, 6, '#6e4a35')
      G.lawn(g, 0, 188, W, H - 188, 21)
      G.paving(g, 8, 192, 24, 210, 8)
      G.paving(g, 192, 192, 24, 210, 8)
      G.paving(g, 8, 396, 208, 44, 8)
      G.paving(g, 100, 440, 24, 80, 8)
      G.paving(g, 32, 196, 60, 12, 6)
      G.paving(g, 132, 196, 60, 12, 6)
      G.mandala(g, 112, 434, 18)
      G.groundShadow(g, HALL.x, 378, 82, 8, 0.7)
      for (const t of TREES) G.groundShadow(g, t.x, t.y, 15, 4, 0.6)
      G.flowerBed(g, 140, 452, 30, 8, ['#f58f35', '#ffd23f'], 3)
      G.flowerBed(g, 40, 446, 50, 8, ['#ff9fc0', '#fffaf0'], 4)
      // East garden: path to the catfish pond and the rain tree.
      G.paving(g, 216, 280, 18, 24, 6)
      G.paving(g, 216, 396, 56, 20, 6, 'grey')
      catfishPondBed(g)
      G.groundShadow(g, RAIN.x, RAIN.y - 6, 40, 9, 0.7)
      leafPile(g, 244, 470, 11, 3)
      leafPile(g, 266, 478, 9, 8, ['#c9a04c', '#e0a060', '#9ed86a', '#b0803a'])
      leafPile(g, 230, 488, 6, 12)
    },
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 150 },
      { x: 0, y: 150, w: 92, h: 36 },
      { x: 132, y: 150, w: W - 132, h: 36 },
      { x: POND.x - 4, y: POND.y - 4, w: POND.w + 8, h: POND.h + 8 },
      { x: 219, y: 270, w: 10, h: 7 },
      { x: 266, y: 250, w: 6, h: 6 },
      { x: 281, y: 327, w: 6, h: 4 },
      { x: RAIN.x - 5, y: RAIN.y - 5, w: 10, h: 6 },
      { x: 276, y: 210, w: 8, h: 6 },
      { x: 238, y: 228, w: 12, h: 6 },
      { x: 224, y: 504, w: 64, h: 16 },
      { x: 34, y: 250, w: 156, h: 131 },
      { x: 84, y: 380, w: 11, h: 12 },
      { x: 129, y: 380, w: 11, h: 12 },
      { x: 102, y: 420, w: 20, h: 9 },
      { x: 156, y: 458, w: 48, h: 14 },
      { x: 140, y: 452, w: 30, h: 8 },
      { x: 40, y: 446, w: 50, h: 8 },
      { x: 198, y: 206, w: 12, h: 9 },
      { x: 34, y: 200, w: 12, h: 7 },
      { x: 6, y: 232, w: 8, h: 6 },
      { x: 210, y: 246, w: 8, h: 6 },
      { x: 0, y: 504, w: 104, h: 16 },
      { x: 120, y: 504, w: 104, h: 16 },
      ...TREES.map((t) => ({ x: t.x - 3, y: t.y - 3, w: 6, h: 4 })),
      ...lamps.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      { id: 'boat_alms', label: 'ท่าน้ำตักบาตร', hint: 'พระพายเรือมาบิณฑบาต', icon: 'bowl', rect: { x: 92, y: 148, w: 40, h: 42 }, at: { x: 112, y: 176 }, face: 'up', marker: { x: 112, y: 146 } },
      { id: 'river_fish', label: 'ให้อาหารปลาสวาย', hint: 'ปลาตัวโตรออยู่ริมน้ำ', icon: 'bread', rect: { x: 140, y: 150, w: 70, h: 40 }, at: { x: 168, y: 196 }, face: 'up', marker: { x: 176, y: 158 } },
      { id: 'krathong', label: 'ลอยกระทง', hint: 'ลอยความทุกข์ไปกับสายน้ำ', icon: 'krathong', rect: { x: 16, y: 170, w: 64, h: 40 }, at: { x: 48, y: 204 }, face: 'up', marker: { x: 48, y: 170 } },
      { id: 'hall', label: 'อุโบสถเก่าริมน้ำ', hint: 'กราบพระ สวดมนต์ ขอพร', icon: 'temple', rect: { x: 40, y: 240, w: 144, h: 150 }, at: { x: HALL.x, y: HALL.y + 5 }, face: 'up', marker: { x: HALL.x + 1, y: 226 }, beacon: true, near: 16 },
      { id: 'flower_stall', label: 'ร้านกระทงป้าบุญ', hint: 'กระทง ขนมปังให้ปลา', icon: 'krathong', rect: { x: 154, y: 428, w: 52, h: 44 }, at: { x: 180, y: 482 }, face: 'up', marker: { x: 180, y: 426 } },
      { id: 'job:feed_catfish', label: 'ให้อาหารปลาดุก', hint: 'อาสาโปรยอาหารให้ปลาดุกในบ่อ', icon: 'fishfood', rect: { x: POND.x - 4, y: POND.y - 6, w: POND.w + 8, h: POND.h + 10 }, at: { x: 222, y: 292 }, face: 'right', marker: { x: POND.x + POND.w / 2, y: POND.y - 8 } },
      { id: 'job:sweep_leaves', label: 'กวาดใบจามจุรี', hint: 'อาสากวาดใบไม้ใต้ต้นจามจุรี', icon: 'broom', rect: { x: 230, y: 458, w: 52, h: 26 }, at: { x: 244, y: 490 }, face: 'up', marker: { x: 256, y: 456 } },
      { id: 'gate', label: 'ประตูวัด', hint: 'กลับบ้าน', icon: 'map', rect: { x: 94, y: 460, w: 36, h: 56 }, at: { x: 112, y: 504 }, face: 'down', marker: { x: 112, y: 440 }, near: 12 },
    ],
    spawn: { x: 112, y: 460, face: 'up' },
    pickupSpots: [
      { x: 20, y: 280 },
      { x: 204, y: 290 },
      { x: 60, y: 214 },
      { x: 150, y: 214 },
      { x: 40, y: 480 },
      { x: 200, y: 400 },
      { x: 24, y: 420 },
      { x: 150, y: 490 },
      { x: 250, y: 350 },
      { x: 276, y: 420 },
    ],
    lights: [
      ...lamps.map(([x, y]) => ({ x, y: y - 29, r: 20 })),
      { x: HALL.x, y: 354, r: 34 },
      { x: 112, y: 414, r: 12, color: '#ff9a5a' },
      { x: 180, y: 452, r: 16, color: '#ffb3cf' },
      { x: 204, y: 196, r: 9 },
      { x: 284, y: 301, r: 20 },
    ],
    life(s) {
      const at = (h: { x: number; y: number }) => ({ x: HALL.x + h.x, y: HALL.y + h.y })
      return [
        new CatfishPond(s, POND, 24),
        new EaveBells(s, (hall.hooks.bells ?? []).map(at), HALL.y),
        new Glints(s, [...(hall.hooks.glints ?? []).map(at), ...(gate.hooks.glints ?? []).map((h) => ({ x: GATE.x + h.x, y: GATE.y + h.y }))], 1),
        ...(hall.hooks.candles ?? []).map((h) => new Flames(s, [at(h)], HALL.y)),
        new Smoke(s, [{ x: 112, y: 414 }], 6),
        new Lanterns(s, [{ x0: 92, y0: 150, x1: 132, y1: 150, n: 4, sag: 4 }]),
        new Butterflies(s, [
          { x: 30, y: 430, w: 70, h: 30 },
          { x: 130, y: 440, w: 50, h: 24 },
        ], 4),
        new CloudShadows(s, 2),
        new SunRays(s),
        new TapZones([
          {
            rect: { x: RAIN.x - 40, y: RAIN.y - 76, w: 80, h: 50 },
            fn: () => {
              s.shake('rain')
              s.drop(RAIN.x, RAIN.y - 50, 60, 8, '#9ed86a', '#ffb3cf', 'leaf')
              if (Math.random() < 0.7) s.burstBirds(RAIN.x, RAIN.y - 60, 2)
              sfx.whoosh()
            },
          },
          ...TREES.map((t) => ({
            rect: { x: t.x - 20, y: t.y - 48, w: 40, h: 36 },
            fn: () => {
              s.shake(t.id)
              s.drop(t.x, t.y - 26, 28, 6, t.v >= 2 ? '#ffc4d8' : '#fffaf0', '#ffe45e')
              if (Math.random() < 0.7) s.burstBirds(t.x, t.y - 32, 2)
              sfx.whoosh()
            },
          })),
          {
            rect: { x: 0, y: 50, w: W, h: 100 },
            fn: (x, y) => {
              s.particles.add({ kind: 'ripple', x, y, max: 1.3, size: 12, color: '#e8fbff' })
              for (let i = 0; i < 3; i++) s.particles.add({ kind: 'drop', x, y, vx: rand(-12, 12), vy: rand(-24, -12), g: 90, max: 0.45, color: '#c8f4fa' })
              sfx.plop()
            },
          },
        ]),
      ]
    },
    decor(g, t, s) {
      // Boats drifting (a monk paddles by in the morning), catfish near the steps.
      const bx = ((t * 6) % (W + 60)) - 30
      boat(g, bx, 98, s.phase === 'dawn' || s.phase === 'day', t)
      const bx2 = W + 30 - ((t * 4 + 120) % (W + 60))
      boat(g, bx2, 132, false, t + 2)
      for (let i = 0; i < 7; i++) {
        const a = t * 0.8 + i
        const x = 176 + Math.cos(a) * 18
        const y = 168 + Math.sin(a * 1.3) * 6
        g.rect(x, y, 4, 2, '#8f97a8')
        g.px(x + (Math.cos(a) > 0 ? 4 : -1), y, '#5e6577')
      }
      for (let i = 0; i < 6; i++) {
        const ph = Math.floor(t * 1.2 + i * 2)
        g.px(20 + ((ph * 41) % 180), 60 + ((ph * 29) % 110), '#e4fafe')
      }
    },
    overlay(g, t, s) {
      // Krathongs float downstream at night.
      if (!s.isNight()) return
      for (let i = 0; i < 3; i++) {
        const x = ((t * 5 + i * 80) % (W + 40)) - 20
        const y = 70 + i * 32 + Math.sin(t + i) * 2
        g.ellipse(x, y + 1, 5, 2, '#43905a')
        g.ellipse(x, y, 4, 1.6, '#ff9fc0')
        g.px(x, y - 2, '#fff4d6')
        g.px(x, y - 3, '#ffd23f')
      }
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.8) s.particles.add({ kind: 'ripple', x: rand(10, W - 10), y: rand(60, 170), max: 1.2, size: 8, color: '#c8f4fa' })
    },
    wander: [
      { x: 10, y: 200, w: 20, h: 190 },
      { x: 194, y: 200, w: 20, h: 190 },
      { x: 20, y: 400, w: 180, h: 30 },
      { x: 218, y: 320, w: 60, h: 70 },
    ],
    pois: [
      { x: 222, y: 296, face: 'right' },
      { x: 104, y: 180, face: 'up' },
      { x: 48, y: 206, face: 'up' },
      { x: HALL.x - 8, y: HALL.y + 6, face: 'up' },
      { x: 168, y: 198, face: 'up' },
    ],
    fireflies: [
      { x: 0, y: 190, w: W, h: 40 },
      { x: 0, y: 420, w: W, h: 60 },
    ],
    birds: { x: 40, y: 404, w: 60, h: 20 },
    cats: [{ x: 196, y: 420, pose: 'loaf', color: '#f5a55a' }],
    vendors: [{ x: 208, y: 474 }],
    dogs: ['dang'],
    visitors: 3,
  }
}

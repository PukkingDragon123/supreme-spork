// วัดริมน้ำ – an old riverside temple: boat alms, catfish and krathong.

import type { MapDef, PlacedProp } from '../world'
import * as T from '../../art/temple'
import * as F from '../../art/templeprops'
import * as G from '../../art/garden'
import { monkSprite } from '../../art/characters'
import { P } from '../../art/palette'
import { rand } from '../../engine/rng'
import { sfx } from '../../engine/audio'
import { Butterflies, CloudShadows, EaveBells, Flames, Glints, Lanterns, Smoke, SunRays, TapZones } from '../life'

const W = 224
const H = 520
const HALL = { x: 112, y: 392 }
const GATE = { x: 112, y: 516 }

const TREES = [
  { id: 'r1', x: 172, y: 228, v: 1 },
  { id: 'r2', x: 52, y: 470, v: 2 },
]

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
    },
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 150 },
      { x: 0, y: 150, w: 92, h: 36 },
      { x: 132, y: 150, w: 92, h: 36 },
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
    ],
    lights: [
      ...lamps.map(([x, y]) => ({ x, y: y - 29, r: 20 })),
      { x: HALL.x, y: 354, r: 34 },
      { x: 112, y: 414, r: 12, color: '#ff9a5a' },
      { x: 180, y: 452, r: 16, color: '#ffb3cf' },
      { x: 204, y: 196, r: 9 },
    ],
    life(s) {
      const at = (h: { x: number; y: number }) => ({ x: HALL.x + h.x, y: HALL.y + h.y })
      return [
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
    ],
    pois: [
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

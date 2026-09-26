// วัดบนดอย – a golden chedi above a sea of mist, reached by a long naga
// staircase from the mountain hall below.

import type { MapDef, PlacedProp } from '../world'
import type { Surface } from '../../engine/pixel'
import { drawShrine, ROOFS } from '../../art/buildings'
import { drawDeity } from '../../art/deities'
import * as T from '../../art/temple'
import * as F from '../../art/templeprops'
import * as G from '../../art/garden'
import { pineTree } from '../../art/props'
import { rand } from '../../engine/rng'
import { sfx } from '../../engine/audio'
import { Butterflies, CloudShadows, EaveBells, Flags, Flames, Glints, Lanterns, Smoke, SunRays, TapZones, TowerBell } from '../life'

const W = 256
const H = 800
const CX = 128
const CHEDI = { x: CX, y: 214 }
const TOWER = { x: 214, y: 356 }
const HALL = { x: CX, y: 660 }
const GATE = { x: CX, y: 796 }
const STAIR_TOP = 230
const STAIR_BOT = 452

function mountains(g: Surface, night: boolean) {
  const far = night ? '#5a6aa8' : '#9ab4e0'
  const mid = night ? '#46558c' : '#7a98d0'
  for (let x = -20; x < W + 40; x += 38) {
    g.poly(
      [
        [x - 34, 104],
        [x + 6, 52 + ((x * 7) % 16)],
        [x + 48, 104],
      ],
      far,
    )
  }
  for (let x = -10; x < W + 30; x += 30) {
    g.poly(
      [
        [x - 26, 112],
        [x + 4, 72 + ((x * 5) % 14)],
        [x + 34, 112],
      ],
      mid,
    )
  }
}

export function mountainMap(): MapDef {
  const chedi = T.chediSprite({ gold: true })
  const tower = T.bellTowerSprite(T.ROOF.red)
  const hall = T.hallSprite({ roof: T.ROOF.red, roof2: T.ROOF.red, field: '#b8343f', fieldD: '#6e2430', field2: '#2c6a45', field2D: '#1e4a3a' })
  const hallN = T.hallSprite({ roof: T.ROOF.red, roof2: T.ROOF.red, field: '#b8343f', fieldD: '#6e2430', field2: '#2c6a45', field2D: '#1e4a3a', night: true })
  const gate = T.gateSprite()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const lamps: [number, number][] = [
    [96, 460],
    [160, 460],
    [96, 706],
    [160, 706],
  ]
  const pines: [number, number][] = [
    [10, 150],
    [246, 190],
    [16, 260],
    [240, 280],
    [20, 420],
    [242, 450],
    [14, 560],
    [244, 600],
  ]
  const poles: [number, number][] = [
    [98, 300],
    [158, 300],
    [98, 390],
    [158, 390],
  ]
  const props: PlacedProp[] = [
    { sprite: chedi, x: CHEDI.x, y: CHEDI.y },
    { sprite: T.chediSprite({ small: true }), x: 52, y: 214 },
    { sprite: tower, x: TOWER.x, y: TOWER.y },
    { sprite: hall, night: hallN, x: HALL.x, y: HALL.y },
    { sprite: F.urnSprite(), x: CX, y: 704, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: CX, y: 244 },
    { sprite: F.benchSprite(), x: 212, y: 196 },
    { sprite: T.wallSprite(90), x: 0, y: 796 },
    { sprite: T.wallSprite(90), x: 166, y: 796 },
    { sprite: gate, x: GATE.x, y: GATE.y },
    { sprite: G.topiary(1), x: 70, y: 480 },
    { sprite: G.topiary(0), x: 186, y: 480 },
    ...pines.map(([x, y]) => ({ sprite: pineTree(), x, y })),
    ...lamps.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
    ...poles.map(([x, y]) => ({ sprite: F.flagPoleSprite(36), x, y })),
  ]
  return {
    id: 'mountain',
    w: W,
    h: H,
    skyH: 112,
    ground: '#6fa85a',
    camBias: 0.58,
    bake(g, night) {
      mountains(g, night)
      G.treeLine(g, 104, W, { L: '#6aa888', b: '#4f8a70', d: '#3d705c', D: '#2c5a4a' }, 3)
      G.lawn(g, 0, 124, W, H - 124, 33)
      // Upper terrace with the golden chedi and the lookout.
      G.paving(g, 20, 150, 216, 82, 8, 'grey')
      G.kerb(g, 20, 150, 216, 82)
      // Lookout railing along the terrace edge.
      g.rect(178, 150, 58, 3, '#9a6a45')
      for (let x = 180; x < 236; x += 7) g.rect(x, 144, 2, 9, '#9a6a45')
      g.hline(178, 235, 144, '#c28e5c')
      G.groundShadow(g, CHEDI.x, CHEDI.y - 2, 34, 6, 0.6)
      // Naga staircase down the mountainside.
      for (let y = STAIR_TOP; y < STAIR_BOT; y += 5) {
        g.rect(CX - 20, y, 40, 5, (y / 5) % 2 ? '#e4ddd6' : '#f3ede6')
        g.hline(CX - 20, CX + 19, y, '#ffffff')
        g.hline(CX - 20, CX + 19, y + 4, '#cfc6c0')
      }
      for (const s of [-1, 1]) T.nagaRail(g, CX + s * 23, STAIR_TOP, CX + s * 23, STAIR_BOT + 2, s, '#43a86a')
      // Lower terrace.
      G.paving(g, 30, 452, 196, 50, 8, 'grey')
      G.kerb(g, 30, 452, 196, 50)
      // Side paths around the hall and the front courtyard.
      G.paving(g, 22, 502, 26, 170, 8, 'grey')
      G.paving(g, 208, 502, 26, 170, 8, 'grey')
      G.paving(g, 22, 668, 212, 130, 8, 'grey')
      G.mandala(g, CX, 694, 20)
      G.groundShadow(g, HALL.x, 646, 82, 8, 0.7)
      G.flowerBed(g, 60, 510, 20, 10, ['#ff9fc0', '#fffaf0'], 1)
      G.flowerBed(g, 176, 510, 20, 10, ['#f58f35', '#ffd23f'], 2)
      // Ledges off the stairs to the naga shrine and the bell tower.
      G.paving(g, 20, 342, 84, 30, 6, 'grey')
      G.paving(g, 152, 344, 88, 34, 6, 'grey')
      // Naga shrine.
      drawShrine(g, 52, 340, { w: 44, h: 40, roof: ROOFS.gold, back: '#4a2a3a' })
      drawDeity(g, 'naga', 52, 332, 1, 0)
    },
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 150 },
      { x: 0, y: 150, w: 20, h: 90 },
      { x: 236, y: 150, w: 20, h: 90 },
      { x: 96, y: 186, w: 64, h: 30 },
      { x: 34, y: 196, w: 36, h: 20 },
      { x: 120, y: 238, w: 16, h: 7 },
      { x: 202, y: 190, w: 20, h: 6 },
      { x: 0, y: 232, w: 108, h: 110 },
      { x: 0, y: 372, w: 108, h: 80 },
      { x: 0, y: 342, w: 20, h: 30 },
      { x: 148, y: 232, w: 108, h: 112 },
      { x: 148, y: 378, w: 108, h: 74 },
      { x: 240, y: 344, w: 16, h: 34 },
      { x: 194, y: 344, w: 40, h: 13 },
      { x: 26, y: 280, w: 52, h: 62 },
      { x: 0, y: 452, w: 30, h: 220 },
      { x: 226, y: 452, w: 30, h: 220 },
      { x: 48, y: 502, w: 160, h: 12 },
      { x: 50, y: 530, w: 156, h: 121 },
      { x: 100, y: 650, w: 11, h: 12 },
      { x: 145, y: 650, w: 11, h: 12 },
      { x: 118, y: 696, w: 20, h: 9 },
      { x: 0, y: 782, w: 110, h: 18 },
      { x: 146, y: 782, w: 110, h: 18 },
      { x: 64, y: 476, w: 12, h: 5 },
      { x: 180, y: 476, w: 12, h: 5 },
      ...lamps.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      { id: 'chedi', label: 'พระธาตุทองคำ', hint: 'เวียนเทียน ๓ รอบ', icon: 'sparkle', rect: { x: 98, y: 96, w: 60, h: 120 }, at: { x: CX, y: 226 }, face: 'up', marker: { x: CX - 1, y: 92 }, beacon: true },
      { id: 'view', label: 'จุดชมทะเลหมอก', hint: 'นั่งสมาธิรับลมเย็น', icon: 'meditate', rect: { x: 176, y: 124, w: 60, h: 36 }, at: { x: 206, y: 166 }, face: 'up', marker: { x: 206, y: 132 } },
      { id: 'naga', label: 'ศาลพญานาค', hint: 'ผู้พิทักษ์สายน้ำ ให้โชคลาภ', icon: 'deity', rect: { x: 28, y: 280, w: 48, h: 62 }, at: { x: 52, y: 350 }, face: 'up', marker: { x: 52, y: 278 } },
      { id: 'big_bell', label: 'ระฆังใหญ่บนดอย', hint: 'เสียงก้องไปทั่วหุบเขา', icon: 'bell', rect: { x: 190, y: 270, w: 48, h: 88 }, at: { x: 214, y: 366 }, face: 'up', marker: { x: 214, y: 266 } },
      { id: 'hall_mountain', label: 'วิหารบนดอย', hint: 'กราบพระประธาน สวดมนต์', icon: 'temple', rect: { x: 56, y: 510, w: 144, h: 150 }, at: { x: HALL.x, y: HALL.y + 5 }, face: 'up', marker: { x: HALL.x + 1, y: 494 }, beacon: true, near: 16 },
      { id: 'gate', label: 'ประตูวัด', hint: 'กลับบ้าน', icon: 'map', rect: { x: 106, y: 740, w: 44, h: 56 }, at: { x: CX, y: 784 }, face: 'down', marker: { x: CX, y: 720 }, near: 12 },
    ],
    spawn: { x: CX, y: 690, face: 'up' },
    pickupSpots: [
      { x: 36, y: 170 },
      { x: 170, y: 222 },
      { x: 40, y: 480 },
      { x: 214, y: 486 },
      { x: 34, y: 600 },
      { x: 222, y: 620 },
      { x: 60, y: 700 },
      { x: 200, y: 740 },
      { x: 90, y: 360 },
      { x: 170, y: 368 },
    ],
    lights: [
      { x: CHEDI.x, y: 150, r: 36, color: '#ffe7a0' },
      ...lamps.map(([x, y]) => ({ x, y: y - 29, r: 20 })),
      { x: 52, y: 314, r: 16, color: '#b4e486' },
      { x: HALL.x, y: 622, r: 34 },
      { x: CX, y: 690, r: 12, color: '#ff9a5a' },
      { x: TOWER.x, y: 300, r: 14 },
    ],
    life(s) {
      const at = (o: { x: number; y: number }) => (h: { x: number; y: number }) => ({ x: o.x + h.x, y: o.y + h.y })
      const bell = at(TOWER)(tower.hooks.bell[0])
      return [
        new Glints(s, [...(chedi.hooks.glints ?? []).map(at(CHEDI)), ...(hall.hooks.glints ?? []).map(at(HALL)), ...(tower.hooks.glints ?? []).map(at(TOWER)), { x: CHEDI.x - 6, y: 150 }, { x: CHEDI.x + 5, y: 170 }], 1.4),
        new EaveBells(s, (hall.hooks.bells ?? []).map(at(HALL)), HALL.y),
        new EaveBells(s, (tower.hooks.bells ?? []).map(at(TOWER)), TOWER.y),
        new TowerBell(s, bell.x, bell.y, { x: TOWER.x - 20, y: TOWER.y - 88, w: 40, h: 88 }, TOWER.y),
        ...(hall.hooks.candles ?? []).map((h) => new Flames(s, [at(HALL)(h)], HALL.y)),
        Flames.candles(s, CX, 244),
        new Smoke(s, [{ x: CX, y: 690 }], 6),
        new Flags(s, poles.map(([x, y]) => ({ x, y: y - 39, kind: 'color' as const, sortY: y }))),
        new Lanterns(s, [
          { x0: 100, y0: 262, x1: 156, y1: 262, n: 5, sag: 5, colors: ['#e8514a', '#ffd23f', '#fffaf0'] },
          { x0: 100, y0: 352, x1: 156, y1: 352, n: 5, sag: 5, colors: ['#e8514a', '#ffd23f', '#fffaf0'] },
        ]),
        new Butterflies(s, [
          { x: 50, y: 470, w: 150, h: 40 },
          { x: 40, y: 160, w: 60, h: 40 },
        ], 4),
        new CloudShadows(s, 3),
        new SunRays(s),
        new TapZones(
          pines.map(([x, y]) => ({
            rect: { x: x - 12, y: y - 48, w: 24, h: 44 },
            fn: () => {
              s.drop(x, y - 30, 18, 4, '#43905a', '#86c95f', 'leaf')
              if (Math.random() < 0.6) s.burstBirds(x, y - 36, 2)
              sfx.whoosh()
            },
          })),
        ),
      ]
    },
    overlay(g, t) {
      // Sea of mist drifting through the mountainside.
      g.ctx.save()
      g.ctx.globalAlpha = 0.28
      for (let i = 0; i < 6; i++) {
        const y = 100 + i * 110 + Math.sin(t * 0.2 + i) * 6
        const x = ((t * (4 + i) + i * 60) % (W + 160)) - 80
        g.ellipse(x, y, 54, 6, '#f5f7ff')
        g.ellipse(x + 44, y + 4, 38, 5, '#f5f7ff')
      }
      g.ctx.restore()
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.6) s.particles.add({ kind: 'leaf', x: rand(0, W), y: rand(140, 300), vx: rand(-4, 4), vy: rand(6, 10), max: 3, color: '#43905a', color2: '#86c95f' })
      if (s.isNight() && Math.random() < dt * 1.2) s.particles.add({ kind: 'sparkle', x: CHEDI.x + rand(-20, 20), y: rand(110, 210), vy: rand(-6, -2), max: rand(1, 2), color: '#fff3a6', drag: 0.3 })
    },
    wander: [
      { x: 30, y: 196, w: 196, h: 26 },
      { x: 108, y: 240, w: 40, h: 206 },
      { x: 40, y: 460, w: 176, h: 36 },
      { x: 30, y: 672, w: 196, h: 100 },
    ],
    pois: [
      { x: 120, y: 228, face: 'up' },
      { x: 136, y: 228, face: 'up' },
      { x: 52, y: 352, face: 'up' },
      { x: 214, y: 368, face: 'up' },
      { x: HALL.x - 8, y: HALL.y + 8, face: 'up' },
      { x: 206, y: 168, face: 'up' },
    ],
    fireflies: [
      { x: 20, y: 240, w: 80, h: 200 },
      { x: 160, y: 240, w: 80, h: 200 },
      { x: 0, y: 500, w: W, h: 200 },
    ],
    birds: { x: 50, y: 466, w: 150, h: 24 },
    novice: { x: 40, y: 676, w: 60, h: 30 },
    novices: 1,
    cats: [{ x: 196, y: 214, pose: 'sleep', color: '#9a8a8a' }],
    dogs: ['cocoa'],
    visitors: 3,
  }
}


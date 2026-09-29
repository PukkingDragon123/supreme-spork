// อุโบสถวัดศรีบุญดี (inside) – the home temple's ordination hall you can walk
// into: a golden Buddha on a tiered red throne under a flame arch, the altar
// set, red lacquer pillars, mural walls, monks chanting on their dais, a shelf
// of small Buddha images, the gold-leaf table and a porch with the shoe rack.

import type { MapDef, PlacedProp } from '../../world'
import * as F from '../../../art/templeprops'
import { nagaHead } from '../../../art/temple'
import { sfx } from '../../../engine/audio'
import { rand } from '../../../engine/rng'
import { Flames, Glints, Smoke, TapZones } from '../../life'
import { Gags } from '../../gags'
import {
  altarSprite,
  bakeRoom,
  buddhaShelfSprite,
  floorCandleSprite,
  garlandSwag,
  goldLeafTableSprite,
  kneelMat,
  lotusVaseSprite,
  monkDaisSprite,
  mopBucketSprite,
  pillarSprite,
  principalBuddha,
  scatteredShoes,
  shoeRackSprite,
  siamsiSprite,
  type RoomSpec,
  type RoomStyle,
} from '../../../art/places/south_interior'
import { hooks, look, personGag, seatedMonkGag } from './south_common'
import { LightShafts, Motes } from './south_life'

const W = 224
const H = 452
const CX = 112
const BUDDHA = { x: CX, y: 168 }
const ALTAR = { x: CX, y: 194 }
const PILLAR_Y = [246, 308, 370]
const PILLAR_X = [56, 168]
const CANDLES: [number, number][] = [
  [82, 196],
  [142, 196],
]
const SHELF = { x: 194, y: 276 }
const GOLDLEAF = { x: 194, y: 332 }
const DAIS = { x: 31, y: 282 }
const RACK = { x: 50, y: 420 }
const BUCKET = { x: 90, y: 338 }

const SPEC: RoomSpec = {
  w: W,
  h: H,
  wallH: 88,
  side: 10,
  frontY: 388,
  frontH: 8,
  doorX: CX,
  doorW: 28,
  windows: [40, 184],
  sideWindows: [128, 206, 284],
  carpet: { x: 98, w: 28, y0: 190, y1: 388 },
  porch: true,
  seed: 4,
}

const STYLE: RoomStyle = { wall: '#9a2c34', mural: 'deva', floor: 'marble', floorTint: '#f3ede4', carpet: '#b8343f', cap: '#e8dccb', void: '#2a1a24', view: 'garden' }

export function watUbosotMap(): MapDef {
  const buddha = principalBuddha({ s: 0.64, style: 'sukhothai', throne: 'red', arch: true, parasols: true })
  const altar = altarSprite('red')
  const candle = floorCandleSprite()
  const pillar = pillarSprite(84, 'red')
  const shelf = buddhaShelfSprite(3)
  const goldleaf = goldLeafTableSprite()
  const porchCol = pillarSprite(40, 'white')
  const props: PlacedProp[] = [
    { sprite: buddha, x: BUDDHA.x, y: BUDDHA.y },
    { sprite: altar, x: ALTAR.x, y: ALTAR.y },
    ...CANDLES.map(([x, y]) => ({ sprite: candle, x, y })),
    { sprite: lotusVaseSprite(), x: 66, y: 172 },
    { sprite: lotusVaseSprite(), x: 158, y: 172 },
    ...PILLAR_X.flatMap((x) => PILLAR_Y.map((y) => ({ sprite: pillar, x, y }))),
    { sprite: monkDaisSprite(34), x: DAIS.x, y: DAIS.y },
    { sprite: shelf, x: SHELF.x, y: SHELF.y },
    { sprite: goldleaf, x: GOLDLEAF.x, y: GOLDLEAF.y },
    { sprite: siamsiSprite(), x: 198, y: 364 },
    { sprite: F.donationSprite(), x: 140, y: 226, shadow: [6, 2] },
    { sprite: mopBucketSprite(), x: BUCKET.x, y: BUCKET.y },
    { sprite: shoeRackSprite(), x: RACK.x, y: RACK.y },
    { sprite: porchCol, x: 24, y: 446 },
    { sprite: porchCol, x: 200, y: 446 },
    { sprite: F.lotusJarSprite('blue'), x: 170, y: 418 },
  ]
  return {
    id: 'wat:ubosot',
    area: 'wat',
    place: 'wat',
    indoor: true,
    indoorLight: 0.85,
    w: W,
    h: H,
    skyH: 0,
    ground: '#2a1a24',
    camBias: 0.58,
    entries: { wat: { x: CX, y: 410, face: 'up' } },
    bake(g, night) {
      bakeRoom(g, SPEC, STYLE, night)
      // Mats for bowing in front of the altar.
      kneelMat(g, 76, 206, 18, 8)
      kneelMat(g, 130, 206, 18, 8)
      kneelMat(g, 76, 226, 18, 8, '#e8b44a')
      kneelMat(g, 130, 226, 18, 8, '#e8b44a')
      // Wet, freshly mopped patch by the bucket.
      g.alpha(0.35)
      g.ellipse(106, 346, 14, 5, '#ffffff')
      g.alpha(1)
      g.hline(98, 110, 344, '#ffffff')
      // Garlands on the back wall above the throne.
      garlandSwag(g, 20, 74, 70, 6)
      garlandSwag(g, 150, 204, 70, 6)
      // Porch: shoes left by visitors and naga heads at the steps.
      scatteredShoes(g, 150, 414, 7, 2)
      scatteredShoes(g, 78, 426, 5, 5)
      nagaHead(g, 80, 430, '#5cbf73')
      nagaHead(g, 134, 430, '#5cbf73', true)
    },
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 94 },
      { x: 0, y: 0, w: 12, h: 396 },
      { x: 212, y: 0, w: 12, h: 396 },
      { x: 0, y: 386, w: 98, h: 10 },
      { x: 126, y: 386, w: 98, h: 10 },
      { x: 74, y: 94, w: 76, h: 78 },
      { x: 84, y: 176, w: 56, h: 18 },
      ...CANDLES.map(([x, y]) => ({ x: x - 3, y: y - 4, w: 7, h: 5 })),
      { x: 60, y: 166, w: 12, h: 7 },
      { x: 152, y: 166, w: 12, h: 7 },
      ...PILLAR_X.flatMap((x) => PILLAR_Y.map((y) => ({ x: x - 5, y: y - 4, w: 11, h: 5 }))),
      { x: 14, y: 264, w: 34, h: 20 },
      { x: 176, y: 262, w: 38, h: 15 },
      { x: 182, y: 320, w: 24, h: 13 },
      { x: 190, y: 356, w: 16, h: 9 },
      { x: 134, y: 220, w: 12, h: 7 },
      { x: 80, y: 332, w: 18, h: 7 },
      { x: 34, y: 404, w: 32, h: 17 },
      { x: 18, y: 440, w: 12, h: 12 },
      { x: 194, y: 440, w: 12, h: 12 },
      { x: 164, y: 412, w: 12, h: 7 },
      { x: 0, y: 396, w: 10, h: 56 },
      { x: 214, y: 396, w: 10, h: 56 },
    ],
    hotspots: [
      {
        id: 'pray',
        label: 'กราบพระประธาน',
        hint: 'สวดมนต์ ขอพร ต่อหน้าพระประธาน',
        icon: 'pray',
        rect: { x: 72, y: 60, w: 80, h: 110 },
        at: { x: CX, y: 212 },
        face: 'up',
        marker: hooks(buddha, BUDDHA, 'chest')[0],
        beacon: true,
        near: 14,
      },
      { id: 'hall', label: 'ปิดทองพระ · เซียมซี', hint: 'ปิดทององค์พระ เสี่ยงเซียมซี', icon: 'goldleaf', rect: { x: 182, y: 304, w: 26, h: 30 }, at: { x: 192, y: 342 }, face: 'up', marker: { x: 194, y: 302 } },
      { id: 'job:light_candles', label: 'จุดเทียนบูชา', hint: 'อาสาจุดเทียนหน้าพระประธาน', icon: 'incense', rect: { x: 134, y: 160, w: 16, h: 38 }, at: { x: 150, y: 206 }, face: 'up', marker: { x: 142, y: 158 } },
      { id: 'job:wipe_statues', label: 'เช็ดพระพุทธรูป', hint: 'อาสาเช็ดฝุ่นพระบนหิ้ง', icon: 'sparkle', rect: { x: 176, y: 246, w: 38, h: 30 }, at: { x: 192, y: 288 }, face: 'up', marker: { x: 194, y: 244 } },
      { id: 'job:mop_floor', label: 'ถูพื้นโบสถ์', hint: 'อาสาถูพื้นหินอ่อนให้เงาวับ', icon: 'broom', rect: { x: 78, y: 314, w: 24, h: 26 }, at: { x: 104, y: 348 }, face: 'left', marker: { x: 90, y: 312 } },
      { id: 'job:arrange_shoes', label: 'จัดชั้นรองเท้า', hint: 'อาสาเรียงรองเท้าหน้าโบสถ์', icon: 'sparkle', rect: { x: 34, y: 398, w: 32, h: 24 }, at: { x: 52, y: 430 }, face: 'up', marker: { x: 50, y: 396 } },
      { id: 'donation', label: 'ตู้ทำบุญ', hint: 'ทำบุญบำรุงโบสถ์', icon: 'coin', rect: { x: 132, y: 200, w: 16, h: 28 }, at: { x: 140, y: 234 }, face: 'up', marker: { x: 140, y: 198 } },
      { id: 'door:wat', label: 'ออกจากโบสถ์', hint: 'กลับลานวัด', icon: 'door', rect: { x: 90, y: 430, w: 44, h: 22 }, at: { x: CX, y: 446 }, face: 'down', marker: { x: CX, y: 428 }, near: 10 },
    ],
    spawn: { x: CX, y: 410, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: CX, y: 120, r: 54, color: '#ffcf7a' },
      ...CANDLES.map(([x, y]) => ({ x, y: y - 34, r: 14, color: '#ffb35a' })),
      ...hooks(altar, ALTAR, 'flames').map((p) => ({ x: p.x, y: p.y, r: 10, color: '#ffb35a' })),
      { x: 40, y: 40, r: 18, color: '#fff3c0' },
      { x: 184, y: 40, r: 18, color: '#fff3c0' },
      { x: CX, y: 392, r: 30, color: '#fff6d8' },
      { x: 194, y: 262, r: 16, color: '#ffcf7a' },
    ],
    life(s) {
      return [
        ...hooks(altar, ALTAR, 'flames').map((p) => new Flames(s, [p], ALTAR.y)),
        ...CANDLES.map(([x, y]) => new Flames(s, hooks(candle, { x, y }, 'flame'), y)),
        new Smoke(s, hooks(altar, ALTAR, 'smoke'), 4),
        new Glints(s, [...hooks(buddha, BUDDHA, 'glints'), ...hooks(buddha, BUDDHA, 'head'), ...hooks(shelf, SHELF, 'glints'), ...hooks(goldleaf, GOLDLEAF, 'glints')], 1.2),
        new LightShafts(s, [
          { x0: 12, y0: 134, x1: 52, y1: 176, w0: 8, w1: 22 },
          { x0: 12, y0: 212, x1: 52, y1: 254, w0: 8, w1: 22 },
          { x0: 12, y0: 290, x1: 52, y1: 332, w0: 8, w1: 22 },
          { x0: 212, y0: 134, x1: 172, y1: 176, w0: 8, w1: 22 },
          { x0: 212, y0: 212, x1: 172, y1: 254, w0: 8, w1: 22 },
          { x0: 212, y0: 290, x1: 172, y1: 332, w0: 8, w1: 22 },
          { x0: CX, y0: 394, x1: CX, y1: 330, w0: 28, w1: 44 },
        ]),
        new Motes(s, { x: 70, y: 60, w: 84, h: 110 }, 1.4),
        new Gags(s, [
          seatedMonkGag(22, 283, ['นะโม ตัสสะ ภะคะวะโต…', 'อิติปิ โส ภะคะวา…', 'เจริญพรโยม มาไหว้พระหรือ'], 0, true, 16),
          seatedMonkGag(40, 284, ['พุทธัง ธัมมัง สังฆัง…', 'ถอดรองเท้าไว้ที่ชั้นหน้าโบสถ์นะโยม', 'สาธุ~'], 2, false, 16),
          personGag(look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_white', bottom: 'bot_sarong' }), 150, 250, ['มาทุกวันพระเลยจ้ะ', 'ขอให้ลูกหลานสุขภาพแข็งแรง', 'สาธุ สาธุ'], { view: 'back' }),
        ]),
        new TapZones([
          {
            rect: { x: 72, y: 60, w: 80, h: 60 },
            fn: () => {
              s.particles.sparkles(CX, 100, 10, '#fff3a6', 12)
              sfx.chime()
            },
          },
          {
            rect: { x: 30, y: 404, w: 40, h: 18 },
            fn: (x, y) => {
              s.particles.add({ kind: 'text', x, y: y - 6, vy: -14, max: 1, color: '#fff2a0', color2: '#3a2838', text: 'ตึก!', drag: 1 })
              sfx.tap()
            },
          },
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.4) s.particles.add({ kind: 'petal', x: rand(60, 164), y: rand(60, 70), vx: rand(-2, 2), vy: rand(4, 8), max: 2.2, color: '#fffaf0', color2: '#ffd23f' })
    },
    wander: [
      { x: 20, y: 290, w: 30, h: 80 },
      { x: 72, y: 250, w: 80, h: 120 },
      { x: 30, y: 400, w: 160, h: 40 },
    ],
    pois: [
      { x: 100, y: 214, face: 'up' },
      { x: 124, y: 214, face: 'up' },
      { x: 88, y: 236, face: 'up' },
      { x: 192, y: 290, face: 'up' },
      { x: 192, y: 344, face: 'up' },
    ],
    cats: [{ x: 172, y: 438, pose: 'sleep', color: '#f5a55a' }],
    dogs: [],
    visitors: 2,
  }
}

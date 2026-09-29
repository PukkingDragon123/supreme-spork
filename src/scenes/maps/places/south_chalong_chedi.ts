// ภายในพระมหาธาตุเจดีย์วัดฉลอง: the ground floor is lined with glass cabinets
// of Buddha images, and the front of the upper floor is one great mural of
// the Buddha's life. A central staircase climbs to the top floor, where the
// relic of the Buddha rests in a crystal stupa under a glass dome.

import type { MapDef, PlacedProp } from '../../world'
import * as F from '../../../art/templeprops'
import { GOLD } from '../../../art/temple'
import { sfx } from '../../../engine/audio'
import { Flames, Glints, TapZones } from '../../life'
import { Gags } from '../../gags'
import { relicShrine } from '../../../art/places/south_phuket'
import {
  bakeRoom,
  devaRows,
  floorCandleSprite,
  glassCabinetSprite,
  jataka,
  kneelMat,
  lotusVaseSprite,
  mopBucketSprite,
  pillarSprite,
  scatteredShoes,
  zigzag,
  type RoomSpec,
  type RoomStyle,
} from '../../../art/places/south_interior'
import { hooks, look, personGag, seatedMonkGag } from './south_common'
import { LightShafts, Motes } from './south_life'

const W = 240
const H = 520
const CX = 120
const RELIC = { x: CX, y: 150 }
const MEZZ = { y0: 190, y1: 248 }
const STAIR = { x0: 104, x1: 136 }
const CANDLES: [number, number][] = [
  [92, 160],
  [148, 160],
]
const CAB_Y = [300, 360, 420]

const SPEC: RoomSpec = {
  w: W,
  h: H,
  wallH: 84,
  side: 10,
  frontY: 456,
  frontH: 8,
  doorX: CX,
  doorW: 30,
  windows: [36, 204],
  sideWindows: [110, 290, 370],
  carpet: { x: 106, w: 28, y0: 248, y1: 456 },
  porch: true,
  seed: 21,
}
const STYLE: RoomStyle = { wall: '#2c5a8a', mural: 'deva', floor: 'marble', floorTint: '#f4f0ec', carpet: '#b8343f', cap: '#f0e8dc', void: '#1a1a2a', view: 'sky' }

export function chalongChediMap(): MapDef {
  const relic = relicShrine()
  const candle = floorCandleSprite()
  const cab = glassCabinetSprite('buddha')
  const cabR = glassCabinetSprite('relic')
  const props: PlacedProp[] = [
    { sprite: relic, x: RELIC.x, y: RELIC.y },
    ...CANDLES.map(([x, y]) => ({ sprite: candle, x, y })),
    { sprite: lotusVaseSprite(), x: 72, y: 150 },
    { sprite: lotusVaseSprite(), x: 168, y: 150 },
    { sprite: cabR, x: 36, y: 140 },
    { sprite: cab, x: 204, y: 140 },
    ...CAB_Y.map((y) => ({ sprite: cab, x: 28, y })),
    ...CAB_Y.map((y) => ({ sprite: cab, x: 212, y })),
    { sprite: pillarSprite(58, 'white'), x: 72, y: 320 },
    { sprite: pillarSprite(58, 'white'), x: 168, y: 320 },
    { sprite: pillarSprite(58, 'white'), x: 72, y: 400 },
    { sprite: pillarSprite(58, 'white'), x: 168, y: 400 },
    { sprite: mopBucketSprite(), x: 90, y: 386 },
    { sprite: F.donationSprite(), x: 150, y: 290, shadow: [6, 2] },
    { sprite: pillarSprite(40, 'white'), x: 24, y: 514 },
    { sprite: pillarSprite(40, 'white'), x: 216, y: 514 },
  ]
  return {
    id: 'wat_chalong:chedi',
    place: 'wat_chalong',
    area: 'wat',
    indoor: true,
    indoorLight: 0.85,
    w: W,
    h: H,
    skyH: 0,
    ground: '#1a1a2a',
    camBias: 0.55,
    entries: { wat_chalong: { x: CX, y: 478, face: 'up' } },
    bake(g, night) {
      bakeRoom(g, SPEC, STYLE, night)
      // Front face of the upper floor: a great mural of the Buddha's life.
      const { y0, y1 } = MEZZ
      for (const [a, b] of [
        [10, STAIR.x0],
        [STAIR.x1, W - 10],
      ]) {
        g.rect(a, y0, b - a, y1 - y0, '#2c5a8a')
        devaRows(g, a, y0 + 6, b - a, 18, '#1e3e66', 5)
        zigzag(g, a, y0 + 24, b - a, '#2c5a8a', '#1e3e66')
        jataka(g, a, y0 + 29, b - a, y1 - y0 - 33, a + 3)
        g.hline(a, b - 1, y1 - 1, '#1a2a44')
        g.rect(a, y0, b - a, 3, GOLD.d)
      }
      // Balustrade along the top-floor edge.
      for (let x = 10; x < W - 10; x += 4) {
        if (x > STAIR.x0 - 2 && x < STAIR.x1) continue
        g.rect(x, y0 - 8, 2, 8, '#ffffff')
        g.px(x + 1, y0 - 6, '#d8d4e0')
      }
      g.rect(10, y0 - 9, STAIR.x0 - 10, 2, GOLD.b)
      g.rect(STAIR.x1, y0 - 9, W - 10 - STAIR.x1, 2, GOLD.b)
      // The central staircase.
      for (let y = y0 - 4; y < y1 + 2; y += 4) {
        g.rect(STAIR.x0, y, STAIR.x1 - STAIR.x0, 4, (y >> 2) % 2 ? '#f4f0ec' : '#ffffff')
        g.hline(STAIR.x0, STAIR.x1 - 1, y + 3, '#d8d4e0')
      }
      g.rect(STAIR.x0 - 3, y0 - 8, 3, y1 - y0 + 10, GOLD.d)
      g.rect(STAIR.x1, y0 - 8, 3, y1 - y0 + 10, GOLD.d)
      kneelMat(g, 98, 170, 18, 8)
      kneelMat(g, 124, 170, 18, 8)
      scatteredShoes(g, 150, 480, 8, 7)
      scatteredShoes(g, 86, 494, 6, 8)
      g.alpha(0.35)
      g.ellipse(106, 394, 13, 5, '#ffffff')
      g.alpha(1)
    },
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 92 },
      { x: 0, y: 0, w: 12, h: 464 },
      { x: 228, y: 0, w: 12, h: 464 },
      { x: 0, y: 454, w: 106, h: 10 },
      { x: 134, y: 454, w: 106, h: 10 },
      // The upper floor edge and the mural wall, open at the stairs.
      { x: 0, y: MEZZ.y0 - 6, w: STAIR.x0, h: MEZZ.y1 - MEZZ.y0 + 8 },
      { x: STAIR.x1, y: MEZZ.y0 - 6, w: W - STAIR.x1, h: MEZZ.y1 - MEZZ.y0 + 8 },
      { x: RELIC.x - 18, y: RELIC.y - 12, w: 36, h: 13 },
      ...CANDLES.map(([x, y]) => ({ x: x - 3, y: y - 4, w: 7, h: 5 })),
      { x: 66, y: 144, w: 12, h: 7 },
      { x: 162, y: 144, w: 12, h: 7 },
      { x: 22, y: 126, w: 28, h: 15 },
      { x: 190, y: 126, w: 28, h: 15 },
      ...CAB_Y.map((y) => ({ x: 14, y: y - 8, w: 28, h: 9 })),
      ...CAB_Y.map((y) => ({ x: 198, y: y - 8, w: 28, h: 9 })),
      ...[320, 400].flatMap((y) => [72, 168].map((x) => ({ x: x - 5, y: y - 4, w: 11, h: 5 }))),
      { x: 80, y: 380, w: 20, h: 7 },
      { x: 144, y: 284, w: 12, h: 7 },
      { x: 18, y: 506, w: 12, h: 14 },
      { x: 210, y: 506, w: 12, h: 14 },
      { x: 0, y: 464, w: 10, h: 56 },
      { x: 230, y: 464, w: 10, h: 56 },
    ],
    hotspots: [
      { id: 'pray', label: 'พระบรมสารีริกธาตุ', hint: 'กราบพระบรมสารีริกธาตุชั้นบนสุด', icon: 'pray', rect: { x: 100, y: 96, w: 40, h: 56 }, at: { x: CX, y: 176 }, face: 'up', marker: hooks(relic, RELIC, 'relic')[0], beacon: true, near: 14 },
      { id: 'job:light_candles', label: 'จุดเทียนบูชา', hint: 'อาสาจุดเทียนถวายพระธาตุ', icon: 'incense', rect: { x: 140, y: 124, w: 16, h: 38 }, at: { x: 156, y: 172 }, face: 'up', marker: { x: 148, y: 122 } },
      { id: 'job:wipe_statues', label: 'เช็ดตู้พระพุทธรูป', hint: 'อาสาเช็ดกระจกตู้พระให้ใส', icon: 'sparkle', rect: { x: 198, y: 322, w: 28, h: 40 }, at: { x: 190, y: 372 }, face: 'right', marker: { x: 212, y: 320 } },
      { id: 'job:mop_floor', label: 'ถูพื้นหินอ่อน', hint: 'อาสาถูพื้นในองค์พระธาตุ', icon: 'broom', rect: { x: 78, y: 362, w: 24, h: 26 }, at: { x: 104, y: 396 }, face: 'left', marker: { x: 90, y: 360 } },
      { id: 'donation', label: 'ตู้ทำบุญ', hint: 'ร่วมบุญบำรุงพระธาตุ', icon: 'coin', rect: { x: 142, y: 264, w: 16, h: 28 }, at: { x: 150, y: 300 }, face: 'up', marker: { x: 150, y: 262 } },
      { id: 'door:wat_chalong', label: 'ออกจากพระธาตุ', hint: 'กลับลานวัดฉลอง', icon: 'door', rect: { x: 98, y: 496, w: 44, h: 24 }, at: { x: CX, y: 514 }, face: 'down', marker: { x: CX, y: 494 }, near: 10 },
    ],
    spawn: { x: CX, y: 478, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: RELIC.x, y: 120, r: 46, color: '#fff3c0' },
      ...CANDLES.map(([x, y]) => ({ x, y: y - 34, r: 14, color: '#ffb35a' })),
      { x: 36, y: 40, r: 18, color: '#fff3c0' },
      { x: 204, y: 40, r: 18, color: '#fff3c0' },
      { x: CX, y: 460, r: 30, color: '#fff6d8' },
      ...CAB_Y.flatMap((y) => [
        { x: 28, y: y - 18, r: 10, color: '#ffe7a0' },
        { x: 212, y: y - 18, r: 10, color: '#ffe7a0' },
      ]),
    ],
    life(s) {
      const glints = [...hooks(relic, RELIC, 'glints'), ...hooks(cabR, { x: 36, y: 140 }, 'glints')]
      for (const y of CAB_Y) glints.push(...hooks(cab, { x: 28, y }, 'glints'), ...hooks(cab, { x: 212, y }, 'glints'))
      return [
        ...CANDLES.map(([x, y]) => new Flames(s, hooks(candle, { x, y }, 'flame'), y)),
        new Glints(s, glints, 1.4),
        new LightShafts(s, [
          { x0: 12, y0: 116, x1: 50, y1: 150, w0: 8, w1: 20 },
          { x0: 228, y0: 116, x1: 190, y1: 150, w0: 8, w1: 20 },
          ...[290, 370].map((y) => ({ x0: 12, y0: y + 6, x1: 56, y1: y + 44, w0: 8, w1: 22 })),
          ...[290, 370].map((y) => ({ x0: 228, y0: y + 6, x1: 184, y1: y + 44, w0: 8, w1: 22 })),
          { x0: CX, y0: 462, x1: CX, y1: 400, w0: 30, w1: 44 },
        ]),
        new Motes(s, { x: 96, y: 96, w: 48, h: 60 }, 1.8),
        new Gags(s, [
          seatedMonkGag(60, 176, ['อิติปิ โส ภะคะวา…', 'พระธาตุองค์นี้อัญเชิญมาจากศรีลังกา', 'ขึ้นบันไดช้า ๆ นะโยม'], 1, true),
          personGag(look({ gender: 'f', hair: 'hair_bun', hairColor: 0, top: 'top_lace', bottom: 'bot_batik' }), 150, 340, ['ภาพพุทธประวัติสวยมากเลยเจ้า', 'ขึ้นไปชั้นบนสุดได้นะ มีพระธาตุ', 'ดูภาพผจญมารตรงนั้นสิ'], { view: 'back' }),
        ]),
        new TapZones([
          {
            rect: { x: 100, y: 100, w: 40, h: 50 },
            fn: () => {
              s.particles.sparkles(RELIC.x, 120, 14, '#ffffff', 12)
              sfx.chime()
            },
          },
          {
            rect: { x: 10, y: MEZZ.y0, w: W - 20, h: MEZZ.y1 - MEZZ.y0 },
            fn: (x, y) => {
              s.say('ภาพพุทธประวัติ~', x, y - 4, 1.6)
              sfx.sparkle()
            },
          },
        ]),
      ]
    },
    wander: [
      { x: 80, y: 260, w: 80, h: 180 },
      { x: 60, y: 110, w: 120, h: 70 },
    ],
    pois: [
      { x: 108, y: 178, face: 'up' },
      { x: 132, y: 178, face: 'up' },
      { x: 40, y: 312, face: 'left' },
      { x: 200, y: 372, face: 'right' },
      { x: 120, y: 260, face: 'up' },
    ],
    cats: [{ x: 196, y: 500, pose: 'sleep', color: '#5a4a5e' }],
    dogs: [],
    visitors: 3,
  }
}

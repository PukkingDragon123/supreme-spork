// พระวิหารหลวง วัดพระมหาธาตุฯ (inside): red walls with gold stars, a gilded
// principal Buddha with two bronze attendants, rows of Buddha images along the
// side walls, the saffron Pha Phra Bot cloth, checkered terracotta floor and
// red lacquer pillars. A monk sprinkles holy water.

import type { MapDef, PlacedProp } from '../../world'
import * as F from '../../../art/templeprops'
import { nagaHead } from '../../../art/temple'
import { sfx } from '../../../engine/audio'
import { Flames, Glints, Smoke, TapZones } from '../../life'
import { Gags } from '../../gags'
import { SAFFRON } from '../../../art/places/south_nst'
import {
  altarSprite,
  bakeRoom,
  buddhaShelfSprite,
  floorCandleSprite,
  garlandSwag,
  kneelMat,
  lotusVaseSprite,
  mopBucketSprite,
  pillarSprite,
  principalBuddha,
  scatteredShoes,
  siamsiSprite,
  type RoomSpec,
  type RoomStyle,
} from '../../../art/places/south_interior'
import { blessingMonkGag, hooks, look, personGag } from './south_common'
import { LightShafts, Motes } from './south_life'

const VW = 240
const VH = 476
const VCX = 120

const V_SPEC: RoomSpec = {
  w: VW,
  h: VH,
  wallH: 94,
  side: 10,
  frontY: 408,
  frontH: 8,
  doorX: VCX,
  doorW: 30,
  windows: [30, 210],
  sideWindows: [134, 206, 278, 350],
  carpet: { x: 105, w: 30, y0: 212, y1: 408 },
  porch: true,
  seed: 9,
}
const V_STYLE: RoomStyle = { wall: '#8e2433', mural: 'stars', floor: 'checker', floorTint: '#f4e6cc', carpet: '#c0453f', cap: '#e8dccb', void: '#2a1420', view: 'garden' }
const V_BUDDHA = { x: VCX, y: 180 }
const V_ALTAR = { x: VCX, y: 208 }
const V_PILLAR_X = [72, 168]
const V_PILLAR_Y = [240, 304, 368]
const V_CANDLES: [number, number][] = [
  [88, 210],
  [152, 210],
]
const V_SHELF_Y = [168, 236, 304, 372]

export function nstViharnMap(): MapDef {
  const buddha = principalBuddha({ s: 0.72, style: 'sukhothai', throne: 'gold', arch: true, parasols: true })
  const attendant = principalBuddha({ s: 0.36, style: 'antique', throne: 'red' })
  const altar = altarSprite('red', 1.1)
  const candle = floorCandleSprite()
  const pillar = pillarSprite(92, 'red')
  const shelf = buddhaShelfSprite(2)
  const props: PlacedProp[] = [
    { sprite: buddha, x: V_BUDDHA.x, y: V_BUDDHA.y },
    { sprite: attendant, x: 58, y: 168 },
    { sprite: attendant, x: 182, y: 168 },
    { sprite: altar, x: V_ALTAR.x, y: V_ALTAR.y },
    ...V_CANDLES.map(([x, y]) => ({ sprite: candle, x, y })),
    ...V_PILLAR_X.flatMap((x) => V_PILLAR_Y.map((y) => ({ sprite: pillar, x, y }))),
    ...V_SHELF_Y.map((y) => ({ sprite: shelf, x: 26, y })),
    ...V_SHELF_Y.map((y) => ({ sprite: shelf, x: 214, y })),
    { sprite: lotusVaseSprite(), x: 38, y: 190 },
    { sprite: lotusVaseSprite(), x: 202, y: 190 },
    { sprite: siamsiSprite(), x: 52, y: 270 },
    { sprite: F.donationSprite(), x: 188, y: 262, shadow: [6, 2] },
    { sprite: mopBucketSprite(), x: 86, y: 358 },
    { sprite: pillarSprite(40, 'white'), x: 24, y: 470 },
    { sprite: pillarSprite(40, 'white'), x: 216, y: 470 },
    { sprite: F.lotusJarSprite('green'), x: 56, y: 440 },
    { sprite: F.lotusJarSprite('blue'), x: 184, y: 440 },
  ]
  return {
    id: 'nst_mahathat:viharn',
    place: 'nst_mahathat',
    area: 'wat',
    indoor: true,
    indoorLight: 0.85,
    w: VW,
    h: VH,
    skyH: 0,
    ground: '#2a1420',
    camBias: 0.58,
    entries: { nst_mahathat: { x: VCX, y: 430, face: 'up' } },
    bake(g, night) {
      bakeRoom(g, V_SPEC, V_STYLE, night)
      // The long saffron Pha Phra Bot cloth draped along the back wall.
      for (let x = 12; x < VW - 12; x++) {
        const y = 12 + Math.round(Math.abs(Math.sin((x / (VW - 24)) * Math.PI * 3)) * 6)
        g.rect(x, y, 1, 4, x % 7 === 0 ? SAFFRON.L : SAFFRON.b)
        g.px(x, y + 4, SAFFRON.D)
      }
      kneelMat(g, 82, 224, 20, 9)
      kneelMat(g, 138, 224, 20, 9)
      kneelMat(g, 82, 246, 20, 9, '#e8b44a')
      kneelMat(g, 138, 246, 20, 9, '#e8b44a')
      garlandSwag(g, 44, 96, 84, 5)
      garlandSwag(g, 144, 196, 84, 5)
      scatteredShoes(g, 150, 432, 8, 3)
      scatteredShoes(g, 86, 446, 6, 6)
      nagaHead(g, 88, 450, '#5cbf73')
      nagaHead(g, 142, 450, '#5cbf73', true)
      g.alpha(0.35)
      g.ellipse(104, 366, 14, 5, '#ffffff')
      g.alpha(1)
    },
    props,
    obstacles: [
      { x: 0, y: 0, w: VW, h: 100 },
      { x: 0, y: 0, w: 12, h: 416 },
      { x: 228, y: 0, w: 12, h: 416 },
      { x: 0, y: 406, w: 105, h: 10 },
      { x: 135, y: 406, w: 105, h: 10 },
      { x: 78, y: 100, w: 84, h: 82 },
      { x: 40, y: 150, w: 36, h: 20 },
      { x: 164, y: 150, w: 36, h: 20 },
      { x: 88, y: 190, w: 64, h: 20 },
      ...V_CANDLES.map(([x, y]) => ({ x: x - 3, y: y - 4, w: 7, h: 5 })),
      ...V_PILLAR_X.flatMap((x) => V_PILLAR_Y.map((y) => ({ x: x - 5, y: y - 4, w: 11, h: 5 }))),
      ...V_SHELF_Y.map((y) => ({ x: 12, y: y - 14, w: 30, h: 15 })),
      ...V_SHELF_Y.map((y) => ({ x: 198, y: y - 14, w: 30, h: 15 })),
      { x: 32, y: 184, w: 12, h: 7 },
      { x: 196, y: 184, w: 12, h: 7 },
      { x: 45, y: 262, w: 14, h: 9 },
      { x: 182, y: 256, w: 12, h: 7 },
      { x: 76, y: 352, w: 20, h: 7 },
      { x: 18, y: 462, w: 12, h: 14 },
      { x: 210, y: 462, w: 12, h: 14 },
      { x: 50, y: 434, w: 12, h: 7 },
      { x: 178, y: 434, w: 12, h: 7 },
      { x: 0, y: 416, w: 10, h: 60 },
      { x: 230, y: 416, w: 10, h: 60 },
    ],
    hotspots: [
      { id: 'pray', label: 'กราบพระประธาน', hint: 'สวดมนต์ ขอพร ในพระวิหารหลวง', icon: 'pray', rect: { x: 82, y: 56, w: 76, h: 124 }, at: { x: VCX, y: 232 }, face: 'up', marker: hooks(buddha, V_BUDDHA, 'chest')[0], beacon: true, near: 14 },
      { id: 'job:light_candles', label: 'จุดเทียนบูชา', hint: 'อาสาจุดเทียนหน้าพระประธาน', icon: 'incense', rect: { x: 144, y: 172, w: 16, h: 40 }, at: { x: 160, y: 222 }, face: 'up', marker: { x: 152, y: 170 } },
      { id: 'job:mop_floor', label: 'ถูพื้นวิหาร', hint: 'อาสาถูพื้นกระเบื้องดินเผา', icon: 'broom', rect: { x: 74, y: 334, w: 24, h: 26 }, at: { x: 98, y: 368 }, face: 'left', marker: { x: 86, y: 332 } },
      { id: 'hall', label: 'เซียมซี · ปิดทอง', hint: 'เสี่ยงเซียมซี ปิดทองพระ', icon: 'fortune', rect: { x: 44, y: 250, w: 16, h: 22 }, at: { x: 52, y: 282 }, face: 'up', marker: { x: 52, y: 248 } },
      { id: 'donation', label: 'ตู้ทำบุญ', hint: 'ร่วมบุญบูรณะพระวิหาร', icon: 'coin', rect: { x: 180, y: 236, w: 16, h: 28 }, at: { x: 188, y: 272 }, face: 'up', marker: { x: 188, y: 234 } },
      { id: 'door:nst_mahathat', label: 'ออกจากวิหาร', hint: 'กลับลานพระธาตุ', icon: 'door', rect: { x: 98, y: 452, w: 44, h: 24 }, at: { x: VCX, y: 470 }, face: 'down', marker: { x: VCX, y: 450 }, near: 10 },
    ],
    spawn: { x: VCX, y: 430, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: VCX, y: 120, r: 60, color: '#ffcf7a' },
      { x: 58, y: 146, r: 18, color: '#ffcf7a' },
      { x: 182, y: 146, r: 18, color: '#ffcf7a' },
      ...V_CANDLES.map(([x, y]) => ({ x, y: y - 34, r: 14, color: '#ffb35a' })),
      ...hooks(altar, V_ALTAR, 'flames').map((p) => ({ x: p.x, y: p.y, r: 10, color: '#ffb35a' })),
      { x: 30, y: 44, r: 18, color: '#fff3c0' },
      { x: 210, y: 44, r: 18, color: '#fff3c0' },
      { x: VCX, y: 412, r: 30, color: '#fff6d8' },
    ],
    life(s) {
      const glints = [...hooks(buddha, V_BUDDHA, 'glints'), ...hooks(buddha, V_BUDDHA, 'head')]
      for (const y of V_SHELF_Y) glints.push(...hooks(shelf, { x: 26, y }, 'glints'), ...hooks(shelf, { x: 214, y }, 'glints'))
      return [
        ...hooks(altar, V_ALTAR, 'flames').map((p) => new Flames(s, [p], V_ALTAR.y)),
        ...V_CANDLES.map(([x, y]) => new Flames(s, hooks(candle, { x, y }, 'flame'), y)),
        new Smoke(s, hooks(altar, V_ALTAR, 'smoke'), 4),
        new Glints(s, glints, 1.4),
        new LightShafts(s, [
          ...[134, 206, 278, 350].map((y) => ({ x0: 12, y0: y + 6, x1: 56, y1: y + 44, w0: 8, w1: 22 })),
          ...[134, 206, 278, 350].map((y) => ({ x0: 228, y0: y + 6, x1: 184, y1: y + 44, w0: 8, w1: 22 })),
          { x0: VCX, y0: 414, x1: VCX, y1: 350, w0: 30, w1: 46 },
        ]),
        new Motes(s, { x: 80, y: 56, w: 80, h: 124 }, 1.4),
        new Gags(s, [
          blessingMonkGag(150, 300, ['ขอให้เจริญพร อายุ วรรณะ สุขะ พละ', 'รับน้ำมนต์หน่อยนะโยม', 'พระธาตุเมืองนครศักดิ์สิทธิ์นัก'], 1),
          personGag(look({ gender: 'f', hair: 'hair_bun', hairColor: 0, top: 'top_white', bottom: 'bot_sarong' }), 94, 290, ['มาไหว้พระธาตุทุกปีเลยจ้า', 'ขอให้ลูกสอบติด สาธุ~', 'แหลงใต้ได้ม้าย? หรอยจังฮู้!'], { view: 'back' }),
        ]),
        new TapZones([
          {
            rect: { x: 82, y: 56, w: 76, h: 70 },
            fn: () => {
              s.particles.sparkles(VCX, 96, 12, '#fff3a6', 14)
              sfx.chime()
            },
          },
        ]),
      ]
    },
    wander: [
      { x: 80, y: 270, w: 80, h: 120 },
      { x: 30, y: 420, w: 180, h: 30 },
    ],
    pois: [
      { x: 108, y: 234, face: 'up' },
      { x: 132, y: 234, face: 'up' },
      { x: 92, y: 256, face: 'up' },
      { x: 150, y: 256, face: 'up' },
      { x: 52, y: 196, face: 'up' },
      { x: 188, y: 196, face: 'up' },
    ],
    cats: [{ x: 196, y: 454, pose: 'loaf', color: '#fbf3e4' }],
    dogs: [],
    visitors: 3,
  }
}

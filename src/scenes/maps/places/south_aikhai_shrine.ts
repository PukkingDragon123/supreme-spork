// ศาลาไอ้ไข่ (inside): Ai Khai in his gilded glass shrine, heaped with
// garlands, flanked by grandstands of rooster statues; red soda everywhere,
// soldier dolls and toy guns; the caretaker tells his story. Shoes off on the
// porch (job:arrange_shoes) and candles to light for your wish.

import type { MapDef, PlacedProp } from '../../world'
import * as F from '../../../art/templeprops'
import { sfx } from '../../../engine/audio'
import { pick } from '../../../engine/rng'
import { Flames, Glints, Smoke, TapZones } from '../../life'
import { Gags, drawPerson } from '../../gags'
import { aiKhaiShrine, dollsRow, drawRooster, roosterBank, roosterRow, sodaCrates, sodaTable } from '../../../art/places/south_aikhai'
import { altarSprite, bakeRoom, floorCandleSprite, garlandSwag, kneelMat, pillarSprite, scatteredShoes, shoeRackSprite, type RoomSpec, type RoomStyle } from '../../../art/places/south_interior'
import { hooks, look, personGag } from './south_common'
import { Firecrackers, LightShafts, Motes } from './south_life'

const W = 224
const H = 424
const CX = 112
const SHRINE = { x: CX, y: 170 }
const ALTAR = { x: CX, y: 200 }
const CANDLES: [number, number][] = [
  [80, 204],
  [144, 204],
]
const RACK = { x: 54, y: 392 }
const SHELVES = [206, 244, 282, 320]

const SPEC: RoomSpec = {
  w: W,
  h: H,
  wallH: 88,
  side: 10,
  frontY: 356,
  frontH: 8,
  doorX: CX,
  doorW: 30,
  windows: [],
  sideWindows: [150, 250],
  carpet: { x: 98, w: 28, y0: 214, y1: 356 },
  porch: true,
  seed: 13,
}
const STYLE: RoomStyle = { wall: '#d8a040', mural: 'tiles', floor: 'terrazzo', floorTint: '#f2ebe4', carpet: '#d8403a', cap: '#f0e4d0', void: '#2a1a20', view: 'garden' }

export function aiKhaiShrineMap(): MapDef {
  const shrine = aiKhaiShrine()
  const altar = altarSprite('red', 0.9)
  const candle = floorCandleSprite()
  const props: PlacedProp[] = [
    { sprite: shrine, x: SHRINE.x, y: SHRINE.y },
    { sprite: roosterBank(70, 6, 31), x: 45, y: 164 },
    { sprite: roosterBank(70, 6, 32), x: 179, y: 164 },
    { sprite: altar, x: ALTAR.x, y: ALTAR.y },
    ...CANDLES.map(([x, y]) => ({ sprite: candle, x, y })),
    { sprite: sodaTable(34), x: 58, y: 196 },
    { sprite: dollsRow(34), x: 166, y: 196 },
    ...SHELVES.map((y, i) => ({ sprite: roosterRow(30, 60 + i, 1), x: 27, y })),
    ...SHELVES.map((y, i) => ({ sprite: roosterRow(30, 70 + i, 1), x: 197, y })),
    { sprite: sodaCrates(), x: 26, y: 346 },
    { sprite: sodaCrates(), x: 198, y: 346 },
    { sprite: F.donationSprite(), x: 150, y: 250, shadow: [6, 2] },
    { sprite: pillarSprite(70, 'red'), x: 62, y: 280 },
    { sprite: pillarSprite(70, 'red'), x: 162, y: 280 },
    { sprite: shoeRackSprite(), x: RACK.x, y: RACK.y },
    { sprite: pillarSprite(40, 'white'), x: 22, y: 418 },
    { sprite: pillarSprite(40, 'white'), x: 202, y: 418 },
  ]
  return {
    id: 'ai_khai:shrine',
    place: 'ai_khai',
    area: 'wat',
    indoor: true,
    indoorLight: 0.85,
    w: W,
    h: H,
    skyH: 0,
    ground: '#2a1a20',
    camBias: 0.56,
    entries: { ai_khai: { x: CX, y: 380, face: 'up' } },
    bake(g, night) {
      bakeRoom(g, SPEC, STYLE, night)
      // Garland curtain and a banner of thanks on the back wall.
      for (let i = 0; i < 5; i++) garlandSwag(g, 14 + i * 40, 50 + i * 40, 16, 6)
      g.rect(60, 22, 104, 10, '#e8514a')
      g.frame(60, 22, 104, 10, '#ffd23f')
      for (let x = 66; x < 158; x += 6) g.px(x, 27, '#fff3a6')
      // Rooster statues lined along the wall foot.
      for (let x = 16; x < W - 12; x += 7) {
        if (x > 78 && x < 146) continue
        drawRooster(g, x, 96, 0, ['red', 'black', 'gold', 'white', 'yellow'][x % 5], x > CX)
      }
      kneelMat(g, 78, 216, 18, 8)
      kneelMat(g, 128, 216, 18, 8)
      kneelMat(g, 78, 234, 18, 8, '#ffd23f')
      kneelMat(g, 128, 234, 18, 8, '#ffd23f')
      scatteredShoes(g, 150, 380, 10, 4)
      scatteredShoes(g, 90, 396, 8, 9)
      scatteredShoes(g, 170, 404, 6, 11)
    },
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 96 },
      { x: 0, y: 0, w: 12, h: 364 },
      { x: 212, y: 0, w: 12, h: 364 },
      { x: 0, y: 354, w: 97, h: 10 },
      { x: 127, y: 354, w: 97, h: 10 },
      { x: 80, y: 96, w: 64, h: 76 },
      { x: 10, y: 96, w: 70, h: 70 },
      { x: 144, y: 96, w: 70, h: 70 },
      { x: 86, y: 184, w: 52, h: 18 },
      ...CANDLES.map(([x, y]) => ({ x: x - 3, y: y - 4, w: 7, h: 5 })),
      { x: 40, y: 184, w: 36, h: 13 },
      { x: 148, y: 184, w: 36, h: 13 },
      ...SHELVES.map((y) => ({ x: 12, y: y - 6, w: 30, h: 7 })),
      ...SHELVES.map((y) => ({ x: 182, y: y - 6, w: 30, h: 7 })),
      { x: 14, y: 338, w: 24, h: 9 },
      { x: 186, y: 338, w: 24, h: 9 },
      { x: 144, y: 244, w: 12, h: 7 },
      { x: 57, y: 276, w: 11, h: 5 },
      { x: 157, y: 276, w: 11, h: 5 },
      { x: 38, y: 376, w: 32, h: 17 },
      { x: 16, y: 410, w: 12, h: 14 },
      { x: 196, y: 410, w: 12, h: 14 },
    ],
    hotspots: [
      { id: 'pray', label: 'ไหว้ขอพรไอ้ไข่', hint: 'ขอแล้วได้ไว อย่าลืมแก้บนนะ', icon: 'pray', rect: { x: 84, y: 60, w: 56, h: 112 }, at: { x: CX, y: 226 }, face: 'up', marker: hooks(shrine, SHRINE, 'chest')[0], beacon: true, near: 14 },
      { id: 'job:light_candles', label: 'จุดเทียนขอพร', hint: 'อาสาจุดเทียนหน้าตู้ไอ้ไข่', icon: 'incense', rect: { x: 138, y: 166, w: 14, h: 40 }, at: { x: 152, y: 216 }, face: 'up', marker: { x: 144, y: 164 } },
      { id: 'job:arrange_shoes', label: 'จัดรองเท้าหน้าศาลา', hint: 'อาสาเก็บรองเท้าคนมาไหว้เป็นร้อยคู่', icon: 'sparkle', rect: { x: 38, y: 370, w: 32, h: 24 }, at: { x: 56, y: 400 }, face: 'up', marker: { x: RACK.x, y: 368 } },
      { id: 'donation', label: 'ตู้ทำบุญ', hint: 'ทำบุญบำรุงศาลา', icon: 'coin', rect: { x: 142, y: 224, w: 16, h: 28 }, at: { x: 150, y: 260 }, face: 'up', marker: { x: 150, y: 222 } },
      { id: 'door:ai_khai', label: 'ออกจากศาลา', hint: 'กลับลานไก่ชน', icon: 'door', rect: { x: 90, y: 400, w: 44, h: 24 }, at: { x: CX, y: 418 }, face: 'down', marker: { x: CX, y: 398 }, near: 10 },
    ],
    spawn: { x: CX, y: 380, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: CX, y: 110, r: 50, color: '#ffe7a0' },
      ...CANDLES.map(([x, y]) => ({ x, y: y - 34, r: 14, color: '#ffb35a' })),
      ...hooks(altar, ALTAR, 'flames').map((p) => ({ x: p.x, y: p.y, r: 10, color: '#ffb35a' })),
      { x: CX, y: 362, r: 30, color: '#fff6d8' },
      { x: 45, y: 120, r: 24, color: '#ffcf7a' },
      { x: 179, y: 120, r: 24, color: '#ffcf7a' },
    ],
    life(s) {
      // Firecrackers go off outside the door when a wish is granted.
      const fc = new Firecrackers(s, [{ x: 200, y: 414, every: [14, 26] }])
      return [
        fc,
        ...hooks(altar, ALTAR, 'flames').map((p) => new Flames(s, [p], ALTAR.y)),
        ...CANDLES.map(([x, y]) => new Flames(s, hooks(candle, { x, y }, 'flame'), y)),
        new Smoke(s, hooks(altar, ALTAR, 'smoke'), 5),
        new Glints(s, hooks(shrine, SHRINE, 'glints'), 1.2),
        new LightShafts(s, [
          { x0: 12, y0: 156, x1: 52, y1: 196, w0: 8, w1: 22 },
          { x0: 12, y0: 256, x1: 52, y1: 296, w0: 8, w1: 22 },
          { x0: 212, y0: 156, x1: 172, y1: 196, w0: 8, w1: 22 },
          { x0: 212, y0: 256, x1: 172, y1: 296, w0: 8, w1: 22 },
          { x0: CX, y0: 362, x1: CX, y1: 300, w0: 30, w1: 44 },
        ]),
        new Motes(s, { x: 84, y: 60, w: 56, h: 100 }, 1.2),
        new Gags(s, [
          personGag(look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_white', bottom: 'bot_sarong' }), 100, 280, ['ไอ้ไข่เป็นเด็กวัดเจดีย์แต่โบราณจ้า', 'ขอให้ได้ของหายคืน ให้ค้าขายดี ได้หมด', 'ได้แล้วอย่าลืมแก้บนนะลูก ไก่ชน ประทัด', 'ไอ้ไข่ชอบน้ำแดงกับของเล่น'], { view: 'front' }),
          {
            x: 130,
            y: 300,
            lines: ['ไอ้ไข่! ขอให้สอบได้ที่หนึ่ง!', 'ปิ้ว ๆ (ถวายปืนของเล่น)', 'บนไว้ไก่ 9 ตัว!'],
            draw: (g, p) => {
              drawPerson(g, look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_school_m', bottom: 'bot_school_navy' }), p, 'back', [], p.react > 0 ? 'wai' : undefined)
              if (p.react <= 0) {
                g.rect(p.x + 3, p.y - 13, 5, 2, '#f58f35')
                g.px(p.x + 4, p.y - 11, '#f58f35')
              }
            },
            react: (sc, x, y) => sc.particles.hearts(x, y - 26, 2),
          },
          {
            x: 88,
            y: 322,
            lines: ['แก้บนครับ ถูกรางวัลเลขท้าย!', 'ขอบคุณไอ้ไข่มาก ๆ ครับ'],
            draw: (g, p) => {
              drawPerson(g, look({ gender: 'm', hair: 'hair_buzz', hairColor: 0, top: 'top_polo', bottom: 'bot_khaki' }), p, 'back', [], 'offer')
              drawRooster(g, p.x, p.y - 24, 1, 'gold', false)
            },
            react: () => {
              fc.fire(200, 414, 14)
              sfx.coins(3)
            },
          },
        ]),
        new TapZones([
          {
            rect: { x: 88, y: 64, w: 48, h: 100 },
            fn: () => {
              s.say(pick(['ไอ้ไข่รับรู้แล้ว~', 'ขอแล้วได้ไว!', 'อย่าลืมน้ำแดงนะ!', 'ไอ้ไข่ช่วยได้!']), CX, 60, 2.2)
              s.particles.sparkles(CX, 100, 10, '#fff3a6', 12)
              sfx.chime()
            },
          },
          {
            rect: { x: 10, y: 96, w: 70, h: 70 },
            fn: (x, y) => {
              s.say(pick(['เอ้ก!', 'เอ้ก อี เอ้ก เอ้ก!', 'กุ๊ก ๆ']), x, y - 4, 1.4)
              sfx.tap()
            },
          },
          {
            rect: { x: 144, y: 96, w: 70, h: 70 },
            fn: (x, y) => {
              s.say(pick(['เอ้ก!', 'เอ้กกก~', 'กุ๊ก ๆ ๆ']), x, y - 4, 1.4)
              sfx.tap()
            },
          },
        ]),
      ]
    },
    wander: [
      { x: 70, y: 250, w: 84, h: 90 },
      { x: 30, y: 370, w: 160, h: 30 },
    ],
    pois: [
      { x: 102, y: 228, face: 'up' },
      { x: 122, y: 228, face: 'up' },
      { x: 90, y: 246, face: 'up' },
      { x: 134, y: 246, face: 'up' },
      { x: 58, y: 212, face: 'up' },
    ],
    cats: [{ x: 176, y: 396, pose: 'sleep', color: '#fbf3e4' }],
    dogs: [],
    visitors: 3,
  }
}

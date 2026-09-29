// อนุสาวรีย์ท้าวสุรนารี (ย่าโม), Nakhon Ratchasima.
//   ya_mo       – the old city moat and wall with the Chumphon Gate, the
//                 bronze heroine on her plinth heaped with marigolds, the
//                 Pleng Korat singers' stage, and the night market with
//                 pad mee Korat.
//   ya_mo:gate  – a small shrine room inside the Chumphon Gate.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as G from '../../../art/garden'
import * as F from '../../../art/templeprops'
import { road, sidewalk } from '../common'
import { drawPerson, FairLights, Gags, type Gag } from '../../gags'
import { Butterflies, CloudShadows, Flames, Glints, Smoke, SunRays, TapZones, Traffic } from '../../life'
import { altarSprite, bakeRoom, roomGeo, carpet, hooksAt, offeringTable, donationBox, marigoldPile, candleRack, water, bld, GOLD, type RoomOpts } from '../../../art/places/northisan'
import { yaMoStatueSprite, chumphonGateSprite, cityWallSprite, korarStageSprite, padMeeStallSprite, nightStallSprite, battleMural, BRONZE } from '../../../art/places/northisan-yamo'
import { drawCostumed, hs, look, Notes, tune } from './northisan-common'

const W = 300
const H = 900
const CX = 150
const GATE = { x: CX, y: 196 }
const MON = { x: CX, y: 392 }
const STAGE = { x: 58, y: 486 }
const ROAD_Y = 566
const MARKET = { y0: 604, y1: 812 }
const TREES: [number, number, number][] = [[24, 270, 0], [276, 262, 1], [22, 540, 1], [280, 540, 0]]

function bakeYM(g: Surface, night: boolean) {
  G.treeLine(g, 44, W, G.LEAVES.far, 17)
  G.lawn(g, 0, 60, W, 30, 3)
  water(g, 0, 84, W, 30, night, { seed: 5 })
  g.rect(0, 112, W, 4, '#8a7a50')
  // The great square.
  G.paving(g, 0, GATE.y, W, ROAD_Y - GATE.y, 10, 'grey')
  G.weather(g, 0, GATE.y, W, ROAD_Y - GATE.y, 5, 0.8)
  G.mandala(g, MON.x, MON.y + 28, 30)
  // Flower beds round the monument.
  for (const [x, y] of [[MON.x - 60, MON.y - 40], [MON.x + 36, MON.y - 40], [MON.x - 60, MON.y + 8], [MON.x + 36, MON.y + 8]] as const) G.flowerBed(g, x, y, 24, 24, ['#f58f35', '#ffd23f', '#e8514a'], x + y)
  for (const [x, y] of TREES) G.groundShadow(g, x, y - 2, 30, 8, 0.6)
  G.leafLitter(g, 4, 250, 50, 40, 40, 3)
  // Road and the night market.
  sidewalk(g, 0, ROAD_Y - 8, W, 8)
  road(g, 0, ROAD_Y, W, 30)
  for (let x = CX - 18; x < CX + 18; x += 5) g.rect(x, ROAD_Y + 2, 3, 26, '#f0ece6')
  sidewalk(g, 0, ROAD_Y + 30, W, 8)
  G.paving(g, 0, MARKET.y0, W, MARKET.y1 - MARKET.y0, 8, 'grey')
  G.weather(g, 0, MARKET.y0, W, MARKET.y1 - MARKET.y0, 8, 1.2)
  for (const [x, y] of [[60, 780], [220, 700], [140, 640]] as const) G.puddle(g, x, y, 4, 1.5)
  sidewalk(g, 0, MARKET.y1, W, 20)
  road(g, 0, MARKET.y1 + 20, W, H - MARKET.y1 - 20)
}

function ymGags(notes: Notes): Gag[] {
  const singerM = look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_raj', bottom: 'bot_jong' })
  const singerF = look({ gender: 'f', hair: 'hair_bun', hairColor: 0, top: 'top_sabai', bottom: 'bot_sin_mudmee', neck: 'neck_garland' })
  const dancer = look({ gender: 'f', hair: 'hair_bun', hairColor: 0, top: 'top_sabai', bottom: 'bot_jong', head: 'head_jasmine' })
  const soldier = look({ gender: 'm', hair: 'hair_buzz', hairColor: 0, top: 'top_scout', bottom: 'bot_khaki' })
  const auntie = look({ gender: 'f', hair: 'hair_short', hairColor: 6, top: 'top_floral', bottom: 'bot_sarong' })
  const vendor = look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_chef', bottom: 'bot_black' })
  const sing = (s: Parameters<NonNullable<Gag['react']>>[0], x: number, y: number) => {
    notes.emit(x, y - 30, 4)
    tune([4, 2, 0, 2, 4, 4, 5])
    void s
  }
  return [
    {
      x: STAGE.x - 12, y: STAGE.y - 8, lines: ['เอ่อ… ละเหนอ~ ย่าโมเอ๋ย', 'เพลงโคราชแก้บนถวายย่าจ้า', 'โคราชบ้านเอ๋ง ด้อ!', 'ไอ้หนูเอ๋ย มาฟังเพลงโคราชก่อน'],
      draw: (g, p) => drawPerson(g, singerM, p, 'front', [], p.react > 0 ? 'happy' : 'stand'),
      react: sing,
    },
    {
      x: STAGE.x + 12, y: STAGE.y - 8, lines: ['ละเหนอ~ ขอบคุณย่าที่ให้สมหวัง', 'ร้องแก้บนสามบทเลยเด้อ', 'ปรบมือหน่อยจ้า~'],
      draw: (g, p) => drawPerson(g, singerF, p, 'front', [], p.react > 0 ? 'happy' : 'stand'),
      react: sing,
    },
    {
      x: MON.x + 60, y: MON.y + 40, lines: ['รำถวายย่าโมจ้า', 'แก้บนด้วยการรำ สวยไหมคะ', 'จีบนิ้วแบบนี้นะ~'],
      draw: (g, p) => drawPerson(g, dancer, p, 'front', [], Math.floor(p.t * 2) % 2 ? 'offer' : 'wai'),
    },
    {
      x: MON.x - 60, y: MON.y + 44, lines: ['ย่าโมเป็นวีรสตรีของชาวโคราช', 'ท่านนำชาวบ้านสู้ศึกทุ่งสัมฤทธิ์', 'ขอความกล้าหาญจากย่าครับ'],
      draw: (g, p) => drawPerson(g, soldier, p, 'back', [], 'wai'),
    },
    {
      x: 240, y: 300, lines: ['พวงมาลัยถวายย่าจ้า', 'ไข่ต้มก็ถวายได้นะลูก', 'ดาวเรืองสด ๆ จ้า'],
      draw: (g, p) => drawPerson(g, auntie, p),
    },
    { x: 70, y: 700 - 7, z: -1, lines: ['ผัดหมี่โคราชจานละ 40', 'ใส่ส้มตำด้วยไหม? คู่กันอร่อย', 'หมี่โคราชเส้นเหนียวนุ่ม~'], draw: (g, p) => drawCostumed(g, vendor, p, 'chef') },
  ]
}

export function yaMoMap(): MapDef {
  const statue = yaMoStatueSprite()
  const gate = chumphonGateSprite()
  const gateN = chumphonGateSprite(true)
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const LAMPS: [number, number][] = [[90, 300], [210, 300], [90, 480], [210, 480], [30, ROAD_Y - 6], [270, ROAD_Y - 6]]
  const rack = candleRack('ym', 10)
  const STALLS: [number, number, number][] = [[150, 660, 0], [230, 660, 1], [70, 780, 2], [150, 780, 3], [230, 780, 0]]
  const rail = bld('ym:rail', 92, 12, 46, 11, (g) => {
    g.rect(0, 3, 92, 2, BRONZE.b)
    g.hline(0, 91, 3, BRONZE.L)
    g.rect(0, 9, 92, 2, BRONZE.d)
    for (let x = 0; x < 92; x += 6) g.rect(x, 3, 2, 8, BRONZE.b)
  })
  const props: PlacedProp[] = [
    { sprite: cityWallSprite(GATE.x - 52), x: 0, y: GATE.y - 2 },
    { sprite: cityWallSprite(W - GATE.x - 52), x: GATE.x + 52, y: GATE.y - 2 },
    { sprite: gate, night: gateN, x: GATE.x, y: GATE.y },
    { sprite: statue, x: MON.x, y: MON.y },
    { sprite: rail, x: MON.x, y: MON.y + 12 },
    { sprite: marigoldPile(30, 1), x: MON.x - 20, y: MON.y + 6 },
    { sprite: marigoldPile(30, 2), x: MON.x + 20, y: MON.y + 6 },
    { sprite: offeringTable('ym', 40, ['egg', 'garland', 'candle', 'garland', 'egg', 'water']), x: MON.x, y: MON.y + 24 },
    { sprite: F.urnSprite(), x: MON.x - 34, y: MON.y + 30, shadow: [10, 2] as [number, number] },
    { sprite: rack, x: MON.x + 36, y: MON.y + 30 },
    { sprite: korarStageSprite(), x: STAGE.x, y: STAGE.y },
    { sprite: F.stallSprite(), x: 240, y: 318 },
    { sprite: padMeeStallSprite(), x: 70, y: 700 },
    ...STALLS.map(([x, y, v]) => ({ sprite: nightStallSprite(v), x, y })),
    ...TREES.map(([x, y, v], i) => ({ sprite: G.frangipani(v + 1), x, y, id: 'ymt' + i })),
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
    { sprite: donationBox('ym'), x: MON.x + 58, y: MON.y + 20 },
  ]
  return {
    id: 'ya_mo',
    place: 'ya_mo',
    area: 'shrine',
    w: W,
    h: H,
    skyH: 60,
    ground: '#d8d0c8',
    camBias: 0.6,
    entries: { 'ya_mo:gate': { x: GATE.x, y: GATE.y + 12, face: 'down' } },
    bake: bakeYM,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: GATE.y + 2 },
      { x: MON.x - 30, y: MON.y - 14, w: 60, h: 28 },
      { x: MON.x - 64, y: MON.y - 42, w: 32, h: 28 },
      { x: MON.x + 32, y: MON.y - 42, w: 32, h: 28 },
      { x: MON.x - 64, y: MON.y + 6, w: 32, h: 28 },
      { x: MON.x + 32, y: MON.y + 6, w: 32, h: 28 },
      { x: MON.x - 20, y: MON.y + 18, w: 40, h: 8 },
      { x: STAGE.x - 34, y: STAGE.y - 12, w: 68, h: 13 },
      { x: 216, y: 304, w: 48, h: 15 },
      { x: 0, y: ROAD_Y, w: CX - 20, h: 30 },
      { x: CX + 20, y: ROAD_Y, w: W - CX - 20, h: 30 },
      { x: 44, y: 684, w: 52, h: 17 },
      ...STALLS.map(([x, y]) => ({ x: x - 22, y: y - 16, w: 44, h: 17 })),
      ...TREES.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
      { x: 0, y: MARKET.y1 + 20, w: W, h: H - MARKET.y1 - 20 },
      { x: MON.x + 52, y: MON.y + 14, w: 12, h: 7 },
    ],
    hotspots: [
      hs('pray', 'อนุสาวรีย์ท้าวสุรนารี', 'สักการะย่าโม ขอพรความกล้าหาญและความสำเร็จ', 'pray', { x: MON.x - 30, y: MON.y - 150, w: 60, h: 150 }, { x: MON.x, y: MON.y + 38 }, { marker: { x: MON.x, y: MON.y - 150 }, beacon: true }),
      hs('incense', 'กระถางธูปหน้าย่าโม', 'จุดธูปถวายย่าโม', 'incense', { x: MON.x - 46, y: MON.y + 6, w: 24, h: 26 }, { x: MON.x - 34, y: MON.y + 44 }),
      hs('door:ya_mo:gate', 'ประตูชุมพล', 'เข้าไปในห้องศาลเล็กในซุ้มประตู', 'door', { x: GATE.x - 14, y: GATE.y - 40, w: 28, h: 40 }, { x: GATE.x, y: GATE.y + 6 }, { marker: { x: GATE.x, y: GATE.y - 44 }, near: 8 }),
      hs('job:polish_brass', 'รั้วสำริดรอบอนุสาวรีย์', 'ขัดรั้วและป้ายสำริดให้เงางาม', 'broom', { x: MON.x - 46, y: MON.y - 4, w: 92, h: 18 }, { x: MON.x + 26, y: MON.y + 40 }, { marker: { x: MON.x + 40, y: MON.y - 6 } }),
      hs('job:water_plants', 'แปลงดอกดาวเรือง', 'รดน้ำดอกดาวเรืองรอบอนุสาวรีย์', 'broom', { x: MON.x - 64, y: MON.y - 42, w: 32, h: 28 }, { x: MON.x - 48, y: MON.y - 50 }, { marker: { x: MON.x - 48, y: MON.y - 46 } }),
      hs('job:sweep_leaves', 'ใต้ต้นลีลาวดี', 'กวาดดอกไม้ใบไม้ร่วงในลาน', 'broom', { x: 4, y: 230, w: 50, h: 50 }, { x: 40, y: 290 }),
      hs('flower_stall', 'ร้านพวงมาลัยดาวเรือง', 'พวงมาลัย ธูปเทียน ไข่ต้มถวายย่า', 'garland', { x: 216, y: 274, w: 48, h: 46 }, { x: 240, y: 330 }, { marker: { x: 240, y: 270 } }),
      hs('shop:ya_mo_padmee', 'ร้านผัดหมี่โคราชเจ๊หน่อย', 'ผัดหมี่โคราช ส้มตำ ของกินตลาดโต้รุ่ง', 'shop', { x: 44, y: 650, w: 52, h: 50 }, { x: 100, y: 710 }, { marker: { x: 70, y: 646 } }),
      hs('gate', 'ป้ายรถสองแถว', 'กลับบ้าน หรือไปที่อื่น', 'map', { x: CX - 30, y: MARKET.y1, w: 60, h: 20 }, { x: CX, y: MARKET.y1 + 10 }, { face: 'down', marker: { x: CX, y: MARKET.y1 - 4 }, near: 12 }),
    ],
    spawn: { x: CX, y: MARKET.y1 + 6, face: 'up' },
    pickupSpots: [
      { x: 60, y: 230 }, { x: 250, y: 236 }, { x: 110, y: 450 }, { x: 200, y: 520 }, { x: 120, y: 620 },
      { x: 270, y: 720 }, { x: 110, y: 730 }, { x: 190, y: 720 }, { x: 40, y: 400 }, { x: 260, y: 420 },
    ],
    lights: [
      { x: MON.x, y: MON.y - 90, r: 34, color: '#ffe7a0' },
      { x: GATE.x, y: GATE.y - 30, r: 30 },
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 18 })),
      { x: MON.x + 36, y: MON.y + 20, r: 14, color: '#ffb35a' },
      { x: STAGE.x, y: STAGE.y - 30, r: 24, color: '#ffcf7a' },
      ...STALLS.map(([x, y]) => ({ x, y: y - 30, r: 18, color: '#ffcf7a' })),
      { x: 70, y: 670, r: 18, color: '#ffcf7a' },
    ],
    life(s) {
      const notes = new Notes(s)
      return [
        new Glints(s, [...hooksAt(statue, 'glints', MON.x, MON.y), ...hooksAt(gate, 'glints', GATE.x, GATE.y)], 1.2),
        new Flames(s, hooksAt(rack, 'flames', MON.x + 36, MON.y + 30), MON.y + 30),
        new Flames(s, hooksAt(offeringTable('ym', 40, ['egg', 'garland', 'candle', 'garland', 'egg', 'water']), 'flames', MON.x, MON.y + 24), MON.y + 24),
        new Smoke(s, [{ x: MON.x - 34, y: MON.y + 18 }], 9),
        new Smoke(s, [{ x: 62, y: 676 }], 4),
        notes,
        new Gags(s, ymGags(notes)),
        new FairLights(s, [
          { x0: 0, y0: MARKET.y0 + 10, x1: W, y1: MARKET.y0 + 10, n: 20, sag: 10 },
          { x0: 0, y0: 730, x1: W, y1: 730, n: 20, sag: 10 },
          { x0: STAGE.x - 34, y0: STAGE.y - 36, x1: STAGE.x + 34, y1: STAGE.y - 36, n: 7, sag: 4 },
        ]),
        new Traffic(s, [
          { y: ROAD_Y + 12, dir: 1 },
          { y: ROAD_Y + 26, dir: -1 },
        ]),
        new Butterflies(s, [{ x: MON.x - 64, y: MON.y - 42, w: 128, h: 76 }], 5),
        new CloudShadows(s, 2),
        new SunRays(s),
        new TapZones([
          ...TREES.map(([x, y], i) => ({
            rect: { x: x - 20, y: y - 48, w: 40, h: 36 },
            fn: () => {
              s.shake('ymt' + i)
              s.drop(x, y - 26, 28, 6, '#ffc4d8', '#ffe45e')
              sfx.whoosh()
            },
          })),
          {
            rect: { x: MON.x - 14, y: MON.y - 124, w: 28, h: 60 },
            fn: () => {
              s.particles.sparkles(MON.x, MON.y - 100, 10, '#ffd28a', 10)
              s.say(['ย่าโมคุ้มครองลูกหลานชาวโคราช', 'ความกล้าหาญอยู่ในใจทุกคน', 'ท้าวสุรนารี วีรสตรีเมืองโคราช'][Math.floor(Math.random() * 3)], MON.x, MON.y - 128)
              sfx.chime()
            },
          },
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.5) {
        const [x, y] = TREES[Math.floor(Math.random() * TREES.length)]
        s.particles.add({ kind: 'petal', x: x + rand(-14, 14), y: y - 34, vx: rand(-3, 3), vy: rand(6, 10), max: 3, color: '#ffc4d8', color2: '#ffe45e' })
      }
    },
    wander: [
      { x: 20, y: 220, w: 260, h: 60 },
      { x: 20, y: 440, w: 260, h: 110 },
      { x: 10, y: MARKET.y0 + 20, w: 280, h: 30 },
      { x: 10, y: 720, w: 280, h: 30 },
    ],
    pois: [
      { x: MON.x - 10, y: MON.y + 40, face: 'up' },
      { x: MON.x + 10, y: MON.y + 40, face: 'up' },
      { x: MON.x - 34, y: MON.y + 44, face: 'up' },
      { x: STAGE.x, y: STAGE.y + 16, face: 'up' },
      { x: 240, y: 330, face: 'up' },
      { x: 100, y: 710, face: 'left' },
      { x: 150, y: 680, face: 'up' },
    ],
    birds: { x: 60, y: 460, w: 180, h: 40 },
    cats: [{ x: 280, y: 690, pose: 'loaf', color: '#f5a55a' }],
    dogs: ['somo'],
    visitors: 8,
  }
}

// ===========================================================================
// Inside the Chumphon Gate.

const IW = 200
const IH = 240
const ROOM: RoomOpts = {
  w: IW,
  h: IH,
  wallTop: 20,
  wallH: 66,
  side: 10,
  front: 14,
  door: { x: IW / 2, w: 28 },
  floor: 'stone',
  wall: { L: '#fff6ea', b: '#efe2cc', d: '#d8c6a8', D: '#b8a080' },
  dado: '#8a5a3a',
}

export function yaMoGateMap(): MapDef {
  const geo = roomGeo(ROOM)
  const mini = bld('ym:mini', 22, 40, 11, 39, (g) => {
    for (let y = 16; y < 36; y++) g.hline(11 - 4, 11 + 3, y, y % 3 ? BRONZE.b : BRONZE.d)
    g.circle(11, 12, 3, BRONZE.b)
    g.circle(11, 8, 2, BRONZE.d)
    g.vline(11, 20, 38, '#e4e0d8')
    g.rect(2, 36, 18, 4, BRONZE.D)
  })
  const altar = altarSprite('ym', mini, { arch: 'thai', w: 60, tiers: 3 })
  const ALT = { x: IW / 2, y: 118 }
  const weapons = bld('ym:weapons', 36, 34, 18, 33, (g) => {
    g.rect(1, 28, 34, 5, '#6e4430')
    g.rect(2, 2, 2, 26, '#6e4430')
    g.rect(32, 2, 2, 26, '#6e4430')
    g.hline(2, 33, 4, '#6e4430')
    for (let i = 0; i < 4; i++) {
      g.vline(8 + i * 7, 5, 26, '#c8c0b8')
      g.px(8 + i * 7, 4, '#ffffff')
      g.rect(7 + i * 7, 20, 3, 2, '#8a5a3a')
    }
  })
  const table = offeringTable('ymI', 34, ['garland', 'candle', 'egg', 'candle', 'garland'])
  const props: PlacedProp[] = [
    { sprite: altar, x: ALT.x, y: ALT.y },
    { sprite: table, x: ALT.x, y: 136 },
    { sprite: weapons, x: 34, y: 112 },
    { sprite: weapons, x: IW - 34, y: 112 },
    { sprite: marigoldPile(20, 9), x: ALT.x - 30, y: 140 },
    { sprite: marigoldPile(20, 8), x: ALT.x + 30, y: 140 },
    { sprite: donationBox('ymI'), x: 156, y: 208 },
  ]
  return {
    id: 'ya_mo:gate',
    place: 'ya_mo',
    area: 'shrine',
    indoor: true,
    indoorLight: 0.85,
    w: IW,
    h: IH,
    skyH: 0,
    ground: '#2b1d26',
    camBias: 0.55,
    entries: { ya_mo: { x: IW / 2, y: IH - 22, face: 'up' } },
    bake(g: Surface) {
      bakeRoom(g, ROOM, (gg, x, y, w, h) => battleMural(gg, x + 8, y + 4, w - 16, h - 8), 13)
      carpet(g, IW / 2 - 14, 150, 28, IH - 164, '#b8343f', GOLD.d)
    },
    props,
    obstacles: [
      ...geo.obstacles,
      { x: ALT.x - 30, y: 96, w: 60, h: 24 },
      { x: ALT.x - 17, y: 130, w: 34, h: 8 },
      { x: 16, y: 104, w: 36, h: 10 },
      { x: IW - 52, y: 104, w: 36, h: 10 },
      { x: ALT.x - 42, y: 134, w: 24, h: 8 },
      { x: ALT.x + 18, y: 134, w: 24, h: 8 },
      { x: 150, y: 202, w: 12, h: 7 },
    ],
    hotspots: [
      hs('pray_shrine', 'ศาลย่าโมในซุ้มประตู', 'สวดมนต์ บูชาย่าโม', 'pray', { x: ALT.x - 30, y: 30, w: 60, h: 90 }, { x: ALT.x, y: 152 }, { marker: { x: ALT.x, y: 30 }, beacon: true }),
      hs('job:polish_brass', 'ดาบและอาวุธโบราณ', 'เช็ดขัดอาวุธโบราณให้เงางาม', 'broom', { x: 16, y: 78, w: 36, h: 36 }, { x: 34, y: 126 }),
      hs('donation', 'ตู้ทำบุญ', 'ทำบุญบำรุงอนุสาวรีย์', 'coin', { x: 149, y: 188, w: 14, h: 22 }, { x: 156, y: 218 }),
      hs('door:ya_mo', 'ประตูออก', 'ออกไปลานย่าโม', 'door', { x: IW / 2 - 14, y: IH - 18, w: 28, h: 18 }, { x: IW / 2, y: IH - 10 }, { face: 'down', near: 10 }),
    ],
    spawn: { x: IW / 2, y: IH - 22, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: ALT.x, y: 70, r: 36, color: '#ffe7a0' },
      { x: ALT.x, y: 128, r: 14, color: '#ffb35a' },
      { x: IW / 2, y: IH - 8, r: 22, color: '#fff3d6' },
    ],
    life(s) {
      return [
        new Glints(s, hooksAt(altar, 'glints', ALT.x, ALT.y), 1.2),
        new Flames(s, hooksAt(altar, 'candles', ALT.x, ALT.y), ALT.y),
        new Flames(s, hooksAt(table, 'flames', ALT.x, 136), 136),
        new Smoke(s, [{ x: ALT.x, y: 126 }], 4),
        new TapZones([
          {
            rect: { x: 18, y: 22, w: IW - 36, h: 60 },
            fn: (x, y) => {
              s.say(['ศึกทุ่งสัมฤทธิ์ ปี ๒๓๖๙', 'ย่าโมนำชาวบ้านสู้จนชนะ!', 'ชาวโคราชใจสู้ไม่ถอย'][Math.floor(Math.random() * 3)], x, y)
              sfx.chime()
            },
          },
        ]),
      ]
    },
    wander: [{ x: 50, y: 160, w: 100, h: 50 }],
    pois: [
      { x: ALT.x - 10, y: 154, face: 'up' },
      { x: ALT.x + 10, y: 154, face: 'up' },
    ],
    dogs: [],
    visitors: 2,
  }
}

export const YM_MAPS: Record<string, () => MapDef> = {
  ya_mo: yaMoMap,
  'ya_mo:gate': yaMoGateMap,
}

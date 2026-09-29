// วัดจุฬามณี อัมพวา – from the orchard lane (coconut palms and pomelo trees on
// raised beds between little ditches) a wooden bridge crosses the canal,
// where vendors and monks paddle by, into the temple grounds: the teak
// sermon hall, the towering blue ท้าวเวสสุวรรณ and a rack of bells.
// Interior: `wat_chulamanee:hall` (หลวงพ่อปาน and the principal Buddha).

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as T from '../../../art/temple'
import { GOLD } from '../../../art/temple'
import * as F from '../../../art/templeprops'
import * as G from '../../../art/garden'
import { drawBuddhaHD } from '../../../art/hall'
import { Butterflies, CloudShadows, EaveBells, Flames, Glints, KoiPond, Lanterns, RackBells, Smoke, SunRays, TapZones } from '../../life'
import { Gags, type Gag } from '../../gags'
import * as A from '../../../art/places/central'
import * as C from '../../../art/places/central-chulamanee'
import { door, look, person, shakeTree, spot } from './central-kit'

const W = 300
const H = 940
const CX = 150
const HALL = { x: CX, y: 336 }
const GUARD = { x: 64, y: 480 }
const RACK = { x: 238, y: 470 }
const URN = { x: CX, y: 392 }
const CANAL = { y0: 572, y1: 626 }
const BRIDGE = { x0: 130, x1: 170 }
const GATE = { x: CX, y: 900 }
const WATER = { L: '#b8e0c8', b: '#6fb49a', d: '#4f967e', D: '#3a7866' }

const PALMS: [number, number, number][] = [
  [14, 120, 0],
  [44, 108, 1],
  [262, 112, 0],
  [290, 124, 1],
  [22, 700, 1],
  [110, 760, 0],
  [196, 700, 1],
  [284, 780, 0],
  [30, 850, 0],
]
const POMELO: [number, number, number][] = [
  [70, 690, 0],
  [80, 800, 1],
  [226, 740, 2],
  [250, 846, 1],
  [196, 820, 0],
]
const LAMPS: [number, number][] = [
  [112, 400],
  [188, 400],
  [112, 520],
  [188, 520],
]
/** Orchard ditches (ร่องสวน) between the raised beds. */
const DITCHES = [48, 98, 204, 254]

function bake(g: Surface, night: boolean) {
  G.treeLine(g, 60, W, G.LEAVES.far, 31)
  G.treeLine(g, 74, W, G.LEAVES.deep, 9)
  G.lawn(g, 0, 90, W, H - 90, 61)
  // Temple grounds: paved courtyard around the hall and guardian.
  G.paving(g, 30, 330, 240, 232, 8, 'grey')
  G.kerb(g, 30, 330, 240, 232)
  G.weather(g, 30, 330, 240, 232, 4, 0.9)
  G.mandala(g, URN.x, URN.y + 16, 18)
  G.paving(g, 120, 140, 60, 190, 8, 'grey')
  G.groundShadow(g, HALL.x, HALL.y - 10, 100, 16, 0.8)
  G.groundShadow(g, GUARD.x, GUARD.y - 2, 32, 7, 0.7)
  A.looseShoes(g, 118, 340, 22, 8, 7, 3)
  // Canal with muddy banks and water hyacinth.
  g.rect(0, CANAL.y0 - 6, W, 6, '#8a6a4a')
  g.hline(0, W - 1, CANAL.y0 - 6, '#a8845a')
  A.waterBand(g, 0, CANAL.y0, W, CANAL.y1 - CANAL.y0, WATER, 9)
  g.rect(0, CANAL.y1, W, 5, '#8a6a4a')
  g.hline(0, W - 1, CANAL.y1 + 4, '#6e5238')
  for (const [x, y] of [
    [20, 616],
    [60, 578],
    [236, 614],
    [284, 580],
    [96, 620],
  ]) {
    g.ellipse(x, y, 7, 2.6, '#4f8a4f')
    g.ellipse(x - 1, y - 0.5, 5, 1.6, '#6cb85c')
    g.px(x + 2, y - 1, '#c8a0ff')
    g.px(x - 3, y - 1, '#c8a0ff')
  }
  // Piers on the temple bank.
  for (const x0 of [16, 226]) {
    g.rect(x0, CANAL.y0 - 8, 44, 16, '#a06e46')
    for (let i = x0; i < x0 + 44; i += 4) g.vline(i, CANAL.y0 - 8, CANAL.y0 + 7, '#7a5238')
    g.hline(x0, x0 + 43, CANAL.y0 - 8, '#c8925e')
    for (const px of [x0 + 2, x0 + 40]) g.rect(px, CANAL.y0 + 8, 2, 5, '#5e3e28')
  }
  // Wooden bridge over the canal.
  g.rect(BRIDGE.x0, CANAL.y0 - 10, BRIDGE.x1 - BRIDGE.x0, CANAL.y1 - CANAL.y0 + 18, '#a06e46')
  for (let y = CANAL.y0 - 10; y < CANAL.y1 + 8; y += 3) g.hline(BRIDGE.x0, BRIDGE.x1 - 1, y, '#7a5238')
  g.vline(BRIDGE.x0, CANAL.y0 - 10, CANAL.y1 + 7, '#5e3e28')
  g.vline(BRIDGE.x1 - 1, CANAL.y0 - 10, CANAL.y1 + 7, '#5e3e28')
  g.rect(BRIDGE.x0 + 2, CANAL.y1 + 8, BRIDGE.x1 - BRIDGE.x0 - 4, 2, 'rgba(40,40,40,0.25)')
  // Orchard: raised beds between narrow ditches, and the lane.
  A.dirt(g, 128, 632, 44, 268, '#d8bf8e', 5)
  A.dirt(g, 0, 634, W, 20, '#d8bf8e', 6)
  for (const x of DITCHES) {
    g.rect(x - 4, 658, 9, 222, '#6e5238')
    A.waterBand(g, x - 3, 658, 7, 222, WATER, x)
    g.vline(x - 4, 658, 879, '#8a6a4a')
    g.vline(x + 4, 658, 879, '#8a6a4a')
  }
  // Seedling nursery bed (water the plants).
  G.flowerBed(g, 222, 672, 26, 14, ['#6cc36a', '#86c95f', '#b4e486'], 7)
  G.flowerBed(g, 12, 870, 30, 10, ['#ffd23f', '#f58f35'], 8)
  G.leafLitter(g, 128, 700, 44, 150, 70, 13)
  for (const [x, y] of POMELO) G.groundShadow(g, x, y - 2, 16, 4, 0.6)
  // Lane outside the gate.
  A.dirt(g, 0, 900, W, 40, '#cdb488', 6)
  g.hline(0, W - 1, 900, '#a8906a')
  if (night) for (let i = 0; i < 20; i++) g.px((i * 53) % W, 910 + ((i * 7) % 26), '#e8d8b0')
}

function gags(): Gag[] {
  const uncle = look({ gender: 'm', hair: 'hair_short', hairColor: 6, top: 'top_mohom', head: 'head_turban' })
  const sugar = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_floral', head: 'head_sunhat' })
  const girl = look({ gender: 'f', hair: 'hair_braid', top: 'top_tee_lotus' })
  const trader = look({ gender: 'm', hair: 'hair_short', top: 'top_hawaii', neck: 'neck_amulet_big' })
  const farmer = look({ gender: 'm', hair: 'hair_short', top: 'top_pakaoma', head: 'head_sunhat' })
  const photog = look({ gender: 'f', hair: 'hair_curly', top: 'top_denim' })
  return [
    person(98, 520, trader, ['ท้าวเวสสุวรรณ ขอให้ค้าขายร่ำรวย!', 'ถวายน้ำแดงไปสามขวดแล้ว', 'ขอยอดขายทะลุเป้าด้วยเถิด'], { view: 'back', pose: 'wai' }),
    person(64, 548, uncle, ['ท่านปัดเป่าสิ่งไม่ดีให้นะหลาน', 'ไหว้ท่านแล้วต้องทำความดีด้วย', 'ท่านยืนเฝ้าวัดมานานแล้ว'], { view: 'front' }),
    person(70, 870, sugar, ['น้ำตาลมะพร้าวแท้ ๆ เคี่ยวเองจ้า', 'ขนมกล้วย ขนมตาล หอม ๆ', 'หวานละมุน ไม่ใส่น้ำตาลทรายเลย'], { z: -1 }),
    person(166, 668, girl, ['ส้มโอลูกโตมากกก', 'หนูมาเที่ยวตลาดน้ำอัมพวา', 'ลมเย็นจัง'], { walk: { x0: 140, x1: 162, speed: 5 } }),
    person(236, 690, farmer, ['ร่องสวนนี้ปลูกมาสามรุ่นแล้ว', 'ช่วยรดน้ำกล้าหน่อยได้ไหมหลาน', 'มะพร้าวต้องขึ้นเก็บเองนะ'], { view: 'side' }),
    person(186, 552, photog, ['แสงเย็นส่องศาลาไม้สวยมาก', 'แชะ! ลายแกะสลักละเอียดจัง', 'ขอถ่ายเรืออีกรูปนะ'], {
      view: 'back',
      extras: ['selfie'],
      react: (s, x, y) => (s.particles.sparkles(x + 6, y - 28, 8, '#ffffff', 6), sfx.click()),
    }),
  ]
}

export function watChulamaneeMap(): MapDef {
  const hall = C.teakHallSprite()
  const hallN = C.teakHallSprite(true)
  const pav = C.guardianPavilionSprite()
  const rack = T.bellRackSprite(5)
  const gate = T.gateSprite()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const props: PlacedProp[] = [
    { sprite: hall, night: hallN, x: HALL.x, y: HALL.y, id: 'hall' },
    { sprite: C.vessavanaSprite(), x: GUARD.x, y: GUARD.y - 3 },
    { sprite: pav, x: GUARD.x, y: GUARD.y },
    { sprite: A.offeringTableProp(28, ['#e8514a', '#e8514a', '#ffd23f']), x: GUARD.x, y: GUARD.y + 12 },
    { sprite: F.urnSprite(), x: URN.x, y: URN.y, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: 128, y: 388 },
    { sprite: F.candleStandSprite(), x: 172, y: 388 },
    { sprite: rack, x: RACK.x, y: RACK.y },
    { sprite: F.donationSprite(), x: 196, y: 372, shadow: [6, 2] },
    { sprite: T.chediSprite({ small: true }), x: 44, y: 250 },
    { sprite: T.chediSprite({ small: true }), x: 256, y: 250 },
    { sprite: F.spiritHouseSprite(), x: 270, y: 350 },
    { sprite: A.fishFoodProp(), x: 64, y: 560 },
    { sprite: F.benchSprite(), x: 110, y: 556 },
    { sprite: F.benchSprite(), x: 206, y: 552 },
    { sprite: A.wateringProp(), x: 232, y: 696 },
    { sprite: G.frangipani(2), x: 30, y: 180, id: 'cf1' },
    { sprite: G.frangipani(0), x: 272, y: 186, id: 'cf2' },
    { sprite: G.bodhiTree2(), x: 62, y: 330, id: 'cb' },
    { sprite: G.shrub(0), x: 236, y: 320 },
    { sprite: A.broomProp(), x: 176, y: 790 },
    { sprite: A.leafPileProp(1), x: 162, y: 800 },
    ...PALMS.map(([x, y, v]) => ({ sprite: G.coconutPalm(v), x, y })),
    ...POMELO.map(([x, y, v], i) => ({ sprite: C.pomeloTreeSprite(v), x, y, id: 'pm' + i })),
    { sprite: G.bananaPlant(), x: 72, y: 860 },
    { sprite: G.bananaPlant(), x: 280, y: 690 },
    { sprite: C.sugarStallSprite(), x: 70, y: 874 },
    { sprite: T.wallSprite(114), x: 0, y: GATE.y },
    { sprite: T.wallSprite(114), x: 186, y: GATE.y },
    { sprite: gate, x: GATE.x, y: GATE.y },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  const at = (o: { x: number; y: number }, b: T.Building, k: string) => A.hooksAt(b, k, o)
  const ditchObs = DITCHES.map((x) => ({ x: x - 5, y: 656, w: 11, h: 228 }))
  return {
    id: 'wat_chulamanee',
    area: 'river',
    place: 'wat_chulamanee',
    w: W,
    h: H,
    skyH: 64,
    ground: '#86c95f',
    camBias: 0.62,
    bake,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 136 },
      { x: 60, y: 200, w: 180, h: 118 },
      { x: 62, y: 316, w: 72, h: 6 },
      { x: 166, y: 316, w: 72, h: 6 },
      { x: 30, y: 226, w: 28, h: 28 },
      { x: 26, y: 176, w: 8, h: 5 },
      { x: 268, y: 182, w: 8, h: 5 },
      { x: 36, y: 314, w: 52, h: 18 },
      { x: 230, y: 314, w: 12, h: 7 },
      { x: 242, y: 226, w: 28, h: 28 },
      { x: 30, y: 440, w: 68, h: 54 },
      { x: 150 - 10, y: 386, w: 20, h: 9 },
      { x: 120, y: 382, w: 16, h: 7 },
      { x: 164, y: 382, w: 16, h: 7 },
      { x: 208, y: 458, w: 60, h: 13 },
      { x: 190, y: 366, w: 12, h: 7 },
      { x: 264, y: 342, w: 12, h: 9 },
      { x: 56, y: 554, w: 14, h: 7 },
      { x: 100, y: 552, w: 20, h: 5 },
      { x: 196, y: 548, w: 20, h: 5 },
      // Canal (bridge and piers stay walkable).
      { x: 0, y: CANAL.y0 + 8, w: 16, h: CANAL.y1 - CANAL.y0 },
      { x: 60, y: CANAL.y0 + 8, w: BRIDGE.x0 - 60, h: CANAL.y1 - CANAL.y0 },
      { x: 16, y: CANAL.y0 + 10, w: 44, h: CANAL.y1 - CANAL.y0 },
      { x: BRIDGE.x1, y: CANAL.y0 + 8, w: 226 - BRIDGE.x1, h: CANAL.y1 - CANAL.y0 },
      { x: 226, y: CANAL.y0 + 10, w: 44, h: CANAL.y1 - CANAL.y0 },
      { x: 270, y: CANAL.y0 + 8, w: 30, h: CANAL.y1 - CANAL.y0 },
      { x: 0, y: CANAL.y0 - 2, w: 16, h: 10 },
      { x: 60, y: CANAL.y0 - 2, w: BRIDGE.x0 - 60, h: 10 },
      { x: BRIDGE.x1, y: CANAL.y0 - 2, w: 226 - BRIDGE.x1, h: 10 },
      { x: 270, y: CANAL.y0 - 2, w: 30, h: 10 },
      ...ditchObs,
      { x: 222, y: 672, w: 26, h: 14 },
      { x: 224, y: 690, w: 20, h: 7 },
      { x: 12, y: 870, w: 30, h: 10 },
      { x: 40, y: 856, w: 62, h: 17 },
      ...PALMS.filter(([, y]) => y > 200).map(([x, y]) => ({ x: x - 4, y: y - 4, w: 8, h: 6 })),
      ...POMELO.map(([x, y]) => ({ x: x - 4, y: y - 4, w: 8, h: 5 })),
      { x: 66, y: 854, w: 12, h: 7 },
      { x: 274, y: 684, w: 12, h: 7 },
      { x: 0, y: 884, w: 132, h: 16 },
      { x: 168, y: 884, w: 132, h: 16 },
      { x: 0, y: 910, w: W, h: 30 },
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      door('wat_chulamanee:hall', 'ศาลาการเปรียญไม้สัก', { x: 128, y: 250, w: 44, h: 86 }, { x: CX, y: 342 }, 'up', { x: CX, y: 244 }),
      spot('guardian', 'ท้าวเวสสุวรรณ', 'ขอโชคลาภ ปัดเป่าสิ่งไม่ดี', 'deity', { x: 36, y: 372, w: 56, h: 110 }, { x: GUARD.x + 20, y: 506 }, 'up', { marker: { x: GUARD.x, y: 366 }, beacon: true }),
      spot('incense', 'กระถางธูป', 'จุดธูปขอพร', 'incense', { x: 136, y: 364, w: 28, h: 28 }, { x: CX, y: 408 }, 'up', { marker: { x: CX, y: 362 } }),
      spot('bells', 'ระฆังเรียงราย', 'ตีระฆังรับบุญ', 'bell', { x: 208, y: 424, w: 60, h: 46 }, { x: RACK.x, y: 480 }, 'up', { marker: { x: RACK.x, y: 422 } }),
      spot('donation', 'ตู้ทำบุญ', 'ทำบุญบูรณะศาลา', 'coin', { x: 188, y: 346, w: 16, h: 26 }, { x: 196, y: 382 }, 'up', { marker: { x: 196, y: 344 } }),
      spot('job:feed_fish', 'ท่าน้ำให้อาหารปลา', 'โปรยอาหารให้ปลาในคลอง', 'fishfood', { x: 16, y: 556, w: 44, h: 26 }, { x: 40, y: 572 }, 'down', { marker: { x: 40, y: 554 } }),
      spot('boat_alms', 'ท่าเรือตักบาตร', 'พระพายเรือมาบิณฑบาตตอนเช้า', 'bowl', { x: 226, y: 556, w: 44, h: 26 }, { x: 248, y: 572 }, 'down', { marker: { x: 248, y: 554 } }),
      spot('job:water_plants', 'แปลงกล้าไม้', 'รดน้ำต้นกล้าในร่องสวน', 'broom', { x: 210, y: 664, w: 42, h: 36 }, { x: 218, y: 700 }, 'right', { marker: { x: 234, y: 662 } }),
      spot('job:sweep_leaves', 'ทางเดินในสวน', 'กวาดใบไม้ทางเดินในสวน', 'broom', { x: 130, y: 760, w: 44, h: 60 }, { x: CX, y: 810 }, 'right', { marker: { x: 168, y: 772 } }),
      spot('shop:wat_chulamanee_sugar', 'ร้านน้ำตาลมะพร้าว', 'น้ำตาลมะพร้าว ขนมไทยอัมพวา', 'shop', { x: 40, y: 834, w: 62, h: 42 }, { x: 106, y: 878 }, 'left', { marker: { x: 70, y: 832 } }),
      spot('gate', 'ประตูวัด', 'กลับบ้าน', 'map', { x: 128, y: 826, w: 44, h: 74 }, { x: CX, y: 888 }, 'down', { marker: { x: CX, y: 822 }, near: 12 }),
    ],
    entries: { 'wat_chulamanee:hall': { x: CX, y: 350, face: 'down' } },
    spawn: { x: CX, y: 872, face: 'up' },
    pickupSpots: [
      { x: 20, y: 300 },
      { x: 284, y: 300 },
      { x: 110, y: 440 },
      { x: 190, y: 440 },
      { x: 150, y: 540 },
      { x: 74, y: 660 },
      { x: 180, y: 720 },
      { x: 280, y: 820 },
      { x: 24, y: 780 },
      { x: 136, y: 860 },
    ],
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      { x: CX, y: 300, r: 30, color: '#ffcf7a' },
      { x: GUARD.x, y: 420, r: 26, color: '#9fb8ff' },
      { x: CX, y: 380, r: 10, color: '#ff9a5a' },
      { x: 70, y: 850, r: 16, color: '#ffcf7a' },
      { x: GATE.x, y: 856, r: 22 },
    ],
    life(s) {
      const fish = new KoiPond(s, [[80, CANAL.y0 + 26, 34, 12], [210, CANAL.y0 + 26, 34, 12]], { koi: 5, dragonflies: 2 })
      return [
        fish,
        new Glints(s, [...at(HALL, hall, 'glints'), ...at(GUARD, pav, 'glints'), ...at(GATE, gate, 'glints'), { x: GUARD.x, y: 380 }, { x: GUARD.x - 2, y: 400 }], 1.2),
        new EaveBells(s, at(HALL, hall, 'bells'), HALL.y),
        new EaveBells(s, at(GUARD, pav, 'bells'), GUARD.y),
        new EaveBells(s, at(GATE, gate, 'bells'), GATE.y),
        new RackBells(s, A.hooksAt(rack, 'bells', RACK), { x: RACK.x - 30, y: RACK.y - 44, w: 60, h: 44 }, RACK.y),
        Flames.candles(s, 128, 388),
        Flames.candles(s, 172, 388),
        new Smoke(s, [{ x: URN.x, y: URN.y - 14 }], 6),
        new Smoke(s, [{ x: GUARD.x, y: GUARD.y + 4 }], 3),
        new Lanterns(s, [
          { x0: 30, y0: 550, x1: 128, y1: 550, n: 6, sag: 5 },
          { x0: 172, y0: 550, x1: 270, y1: 550, n: 6, sag: 5 },
        ]),
        new Butterflies(s, [
          { x: 200, y: 640, w: 60, h: 40 },
          { x: 10, y: 690, w: 80, h: 120 },
        ], 6),
        new CloudShadows(s, 3),
        new SunRays(s),
        new Gags(s, gags()),
        new TapZones([
          ...POMELO.map(([x, y], i) => shakeTree(s, 'pm' + i, x, y + 4, 36, ['#8ed06a', '#4fa058'], 'leaf', 32)),
          {
            rect: { x: GUARD.x - 22, y: GUARD.y - 96, w: 44, h: 90 },
            fn: () => {
              s.say(['ฮึ่ม! (ท่านยืนเฝ้าอย่างขึงขัง)', 'ปัดเป่าสิ่งไม่ดีออกไป!', '(กระบองวาววับ)'][Math.floor(Math.random() * 3)], GUARD.x, GUARD.y - 100)
              s.particles.sparkles(GUARD.x, GUARD.y - 70, 10, '#9fb8ff', 10)
              sfx.bigBell()
            },
          },
        ]),
      ]
    },
    decor(g, t, s) {
      const y = CANAL.y0 + 30
      const x1 = ((t * 7) % (W + 80)) - 40
      C.drawCanalBoat(g, x1, y, t, 'vendor')
      if (s.phase === 'dawn' || (s.phase === 'day' && Math.floor(t / 60) % 2 === 0)) {
        const x2 = W + 40 - ((t * 5 + 100) % (W + 80))
        C.drawCanalBoat(g, x2, y + 10, t + 3, 'monk')
      }
    },
    overlay(g) {
      // Bridge railings stay above whoever crosses.
      for (const x of [BRIDGE.x0, BRIDGE.x1 - 2]) {
        g.rect(x, CANAL.y0 - 16, 2, CANAL.y1 - CANAL.y0 + 22, '#6e4a35')
        g.rect(x, CANAL.y0 - 16, 2, 1, '#c28e5c')
      }
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.7) s.particles.add({ kind: 'ripple', x: rand(10, W - 10), y: rand(CANAL.y0 + 6, CANAL.y1 - 6), max: 1.2, size: 7, color: '#d8f4e8' })
      if (Math.random() < dt * 0.3) s.particles.add({ kind: 'leaf', x: rand(0, W), y: rand(640, 700), vx: rand(-4, 4), vy: rand(6, 10), max: 3, color: '#6cb85c', color2: '#3f8a4f' })
    },
    wander: [
      { x: 40, y: 400, w: 220, h: 40 },
      { x: 120, y: 520, w: 60, h: 36 },
      { x: 134, y: 640, w: 32, h: 230 },
      { x: 110, y: 150, w: 80, h: 40 },
    ],
    pois: [
      { x: GUARD.x + 16, y: 506, face: 'up' },
      { x: GUARD.x - 6, y: 506, face: 'up' },
      { x: CX, y: 408, face: 'up' },
      { x: CX - 8, y: 344, face: 'up' },
      { x: RACK.x, y: 482, face: 'up' },
      { x: 40, y: 572, face: 'down' },
    ],
    fireflies: [
      { x: 0, y: 630, w: W, h: 250 },
      { x: 0, y: 560, w: W, h: 60 },
    ],
    monkPath: [
      [CX, 344],
      [CX, 560],
      [248, 566],
    ],
    birds: { x: 60, y: 410, w: 180, h: 30 },
    cats: [
      { x: 210, y: 330, pose: 'sleep', color: '#f5a55a' },
      { x: 120, y: 566, pose: 'loaf', color: '#fbf3e4' },
    ],
    novice: { x: 40, y: 340, w: 60, h: 40 },
    dogs: ['thuadam'],
    visitors: 4,
  }
}

// ---------------------------------------------------------------------------
// Interior: the teak hall – plank floor, carved panels, the principal Buddha
// and หลวงพ่อปาน in a glass case, brass lamps and hanging lanterns.

const IW = 240
const IH = 440
const ICX = 120
const FLOOR = 190
const I_PILLARS: [number, number][] = [
  [36, 260],
  [204, 260],
  [36, 340],
  [204, 340],
  [36, 420],
  [204, 420],
]

function bakeHall(g: Surface) {
  const TK = C.TK
  g.rect(0, 0, IW, 20, TK.D)
  for (let x = 0; x < IW; x += 10) g.rect(x, 4, 2, 16, TK.d)
  g.rect(0, 18, IW, 2, GOLD.d)
  // Back wall of teak boards with carved panels.
  g.rect(0, 20, IW, FLOOR - 20, TK.b)
  for (let x = 0; x < IW; x += 3) g.vline(x, 20, FLOOR - 1, x % 2 ? TK.d : TK.b)
  for (const [x, y] of [
    [14, 30],
    [48, 30],
    [168, 30],
    [202, 30],
    [14, 100],
    [48, 100],
    [168, 100],
    [202, 100],
  ])
    C.drawCarvedPanel(g, x, y, 26, 56, x + y)
  // Gilded altar steps (ฐานชุกชี) and the principal Buddha.
  g.rect(78, 110, 84, 80, '#6a2a1a')
  for (let i = 0; i < 4; i++) {
    const w = 84 - i * 14
    const y = 172 - i * 16
    g.rect(ICX - w / 2, y, w, 16, i % 2 ? '#b8742a' : '#d09a3a')
    g.hline(ICX - w / 2, ICX + w / 2 - 1, y, GOLD.l)
    for (let x = ICX - w / 2 + 3; x < ICX + w / 2 - 3; x += 5) g.px(x, y + 8, '#b8343f')
  }
  drawBuddhaHD(g, ICX, 124, 0.62, 'antique')
  // Floor: polished teak planks and a mat runner.
  A.woodFloor(g, 0, FLOOR, IW, IH - FLOOR - 10, { b: '#95562c', d: '#784222', l: '#b06c38', j: '#5a3018' }, 6, 3)
  A.sheen(g, ICX, FLOOR + 2, 44, 30, '#e0a860', 0.4)
  A.carpet(g, ICX - 13, 216, 26, IH - 226, '#c9a06a', '#9a6a45', '#e8514a')
  for (const x0 of [0, IW - 8]) {
    g.rect(x0, 20, 8, IH - 20, TK.D)
    for (const wy of [220, 300, 380]) {
      g.rect(x0 + 1, wy, 6, 34, '#c98748')
      g.rect(x0 + 2, wy + 1, 4, 32, '#fff0c8')
    }
  }
  g.rect(0, IH - 10, IW, 10, TK.D)
  g.rect(ICX - 16, IH - 10, 32, 10, '#fff6dc')
}

function hallGags(): Gag[] {
  const a = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_white', bottom: 'bot_sarong' })
  const b = look({ gender: 'm', hair: 'hair_short', top: 'top_white' })
  const kid = look({ gender: 'm', hair: 'hair_jook', top: 'top_tee_white' })
  return [
    person(98, 230, a, ['หลวงพ่อปานเมตตามากนะลูก', 'สาธุ ขอให้ครอบครัวสุขสบาย', 'กราบหลวงพ่อสามครั้ง'], { view: 'back', pose: 'kneel' }),
    person(142, 232, b, ['ศาลาไม้สักหลังนี้เย็นสบาย', 'ลายแกะสลักงามจริง ๆ', 'สาธุครับ'], { view: 'back', pose: 'wai' }),
    person(60, 300, kid, ['หลวงพ่อในตู้เหมือนจริงเลย!', 'หนูกราบแล้วนะครับ', 'พื้นไม้ลื่นดี วิ่งได้ไหม… ไม่ได้!'], { view: 'front' }),
  ]
}

export function chulamaneeHallMap(): MapDef {
  const props: PlacedProp[] = [
    ...I_PILLARS.map(([x, y]) => ({ sprite: A.pillarProp(y - 16, '#784222', '#c98748', 10), x, y, shadow: [9, 3] as [number, number] })),
    { sprite: A.offeringTableProp(40, ['#ffd23f', '#6cc36a', '#f58f35']), x: ICX, y: 206 },
    { sprite: F.candleStandSprite(), x: 96, y: 204 },
    { sprite: F.candleStandSprite(), x: 144, y: 204 },
    { sprite: A.brassCandleProp(), x: 70, y: 206 },
    { sprite: A.brassCandleProp(), x: 170, y: 206 },
    { sprite: A.polishKitProp(), x: 60, y: 214 },
    { sprite: A.mopBucketProp(), x: 176, y: 300 },
    { sprite: F.donationSprite(), x: 26, y: 214, shadow: [6, 2] },
  ]
  const lpp = C.luangPhoPan(0.62)
  return {
    id: 'wat_chulamanee:hall',
    area: 'river',
    place: 'wat_chulamanee',
    indoor: true,
    indoorLight: 0.8,
    w: IW,
    h: IH,
    skyH: 0,
    ground: '#3c1f10',
    camBias: 0.6,
    bake(g) {
      bakeHall(g)
      // หลวงพ่อปาน in his glass case to the right of the altar.
      g.rect(172, 150, 50, 40, '#6a3a1c')
      A.drawSculpt(g, lpp, 197, 184)
      C.drawGlassCase(g, 174, 142, 46, 44)
    },
    props,
    obstacles: [
      { x: 0, y: 0, w: IW, h: 206 },
      { x: 0, y: 0, w: 10, h: IH },
      { x: IW - 10, y: 0, w: 10, h: IH },
      { x: 0, y: IH - 10, w: ICX - 16, h: 10 },
      { x: ICX + 16, y: IH - 10, w: IW - ICX - 16, h: 10 },
      { x: 98, y: 198, w: 44, h: 10 },
      { x: 50, y: 206, w: 20, h: 10 },
      { x: 18, y: 206, w: 16, h: 10 },
      { x: 168, y: 294, w: 14, h: 7 },
      ...I_PILLARS.map(([x, y]) => ({ x: x - 7, y: y - 5, w: 14, h: 6 })),
    ],
    hotspots: [
      spot('pray', 'กราบพระประธาน', 'สวดมนต์ ขอพร', 'pray', { x: 84, y: 60, w: 72, h: 150 }, { x: ICX, y: 222 }, 'up', { marker: { x: ICX, y: 66 }, beacon: true, near: 16 }),
      spot('pray_luangpho', 'หลวงพ่อปาน', 'กราบขอพรหลวงพ่อปาน', 'pray', { x: 172, y: 140, w: 50, h: 60 }, { x: 198, y: 222 }, 'up', { marker: { x: 197, y: 136 } }),
      spot('job:polish_brass', 'เชิงเทียนทองเหลือง', 'ขัดเชิงเทียนและพานให้วาว', 'broom', { x: 50, y: 196, w: 22, h: 20 }, { x: 60, y: 226 }, 'up', { marker: { x: 60, y: 194 } }),
      spot('job:mop_floor', 'ถังน้ำและไม้ถู', 'ถูพื้นไม้สักให้เงาวับ', 'broom', { x: 166, y: 278, w: 22, h: 24 }, { x: 176, y: 312 }, 'up', { marker: { x: 176, y: 276 } }),
      spot('donation', 'ตู้ทำบุญ', 'ทำบุญบำรุงศาลา', 'coin', { x: 18, y: 188, w: 16, h: 26 }, { x: 30, y: 226 }, 'up', { marker: { x: 26, y: 186 } }),
      door('wat_chulamanee', 'ออกไปลานวัด', { x: ICX - 18, y: IH - 32, w: 36, h: 32 }, { x: ICX, y: IH - 14 }, 'down', { x: ICX, y: IH - 28 }),
    ],
    entries: { wat_chulamanee: { x: ICX, y: IH - 30, face: 'up' } },
    spawn: { x: ICX, y: IH - 30, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: ICX, y: 100, r: 30, color: '#ffc870' },
      { x: 197, y: 166, r: 20, color: '#fff0c8' },
      { x: 70, y: 180, r: 10, color: '#ffb35a' },
      { x: 170, y: 180, r: 10, color: '#ffb35a' },
      { x: 4, y: 236, r: 16, color: '#fff0c8' },
      { x: 4, y: 316, r: 16, color: '#fff0c8' },
      { x: IW - 4, y: 236, r: 16, color: '#fff0c8' },
      { x: IW - 4, y: 316, r: 16, color: '#fff0c8' },
      { x: ICX, y: IH - 4, r: 26, color: '#fff6dc' },
    ],
    life(s) {
      return [
        new Glints(s, [{ x: ICX - 4, y: 80 }, { x: ICX + 8, y: 100 }, { x: 186, y: 150 }], 1),
        Flames.candles(s, 96, 204),
        Flames.candles(s, 144, 204),
        new Flames(s, [{ x: 70, y: 179 }, { x: 170, y: 179 }], 206),
        new Smoke(s, [{ x: ICX, y: 194 }], 4),
        new Lanterns(s, [
          { x0: 10, y0: 214, x1: 230, y1: 214, n: 9, sag: 10, colors: ['#e8514a', '#ffd23f'] },
        ]),
        new Gags(s, hallGags()),
      ]
    },
    wander: [{ x: 16, y: 240, w: 208, h: 170 }],
    pois: [
      { x: 110, y: 222, face: 'up' },
      { x: 130, y: 222, face: 'up' },
      { x: 198, y: 222, face: 'up' },
    ],
    dogs: [],
    visitors: 2,
  }
}


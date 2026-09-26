// วัดศรีบุญดี – the neighbourhood temple where every player starts.
// The grand อุโบสถ crowns the top of the grounds; below it a paved courtyard
// with the incense urn, then gardens with the koi pond, the bell rack, holy
// water sala, sacred ตะเคียน tree and bodhi tree, and the gate onto the street.

import type { MapDef, PlacedProp } from '../world'
import type { AvatarLook } from '../../art/avatar'
import type { Surface } from '../../engine/pixel'
import { rand } from '../../engine/rng'
import { sfx } from '../../engine/audio'
import * as T from '../../art/temple'
import * as F from '../../art/templeprops'
import * as G from '../../art/garden'
import { mat, road } from './common'
import * as M from '../../art/modern'
import { tukTuk } from '../../art/props'
import { randomVisitorLook, type WorldScene } from '../world'
import { Banners, drawPerson, drawPhoneMonk, drawSpriteGag, FairLights, gagFx, Gags, type Gag } from '../gags'
import { CloudShadows, EaveBells, Flags, Flames, Glints, KoiPond, Lanterns, RackBells, Smoke, SunRays, TapZones, TowerBell, Traffic, Butterflies } from '../life'

const W = 256
const H = 820

const HALL = { x: 128, y: 250 }
const CHEDI = { x: 22, y: 214 }
const TOWER = { x: 234, y: 214 }
const RACK = { x: 196, y: 362 }
const HOLY = { x: 214, y: 442 }
const GATE = { x: 128, y: 642 }
const TAKHIAN = { x: 46, y: 500 }
const BODHI = { x: 226, y: 556 }
const GUARD = { x: 172, y: 502 }

const POND: [number, number, number, number][] = [
  [56, 382, 32, 17],
  [36, 400, 19, 11],
  [78, 398, 19, 11],
]

const FRANGI: { id: string; x: number; y: number; v: number }[] = [
  { id: 'f1', x: 94, y: 462, v: 0 },
  { id: 'f2', x: 162, y: 472, v: 3 },
  { id: 'f3', x: 92, y: 566, v: 1 },
  { id: 'f4', x: 166, y: 584, v: 2 },
  { id: 'f5', x: 16, y: 262, v: 3 },
  { id: 'f6', x: 242, y: 272, v: 0 },
]

const LAMPS: [number, number][] = [
  [52, 312],
  [204, 312],
  [106, 424],
  [150, 424],
  [106, 526],
  [150, 526],
]

const MARIGOLD = ['#f58f35', '#ffd23f', '#ffbb66']
const MIXED = ['#ff9fc0', '#fffaf0', '#e8514a', '#ffd23f']

function at(p: { x: number; y: number }, h: { x: number; y: number }) {
  return { x: p.x + h.x, y: p.y + h.y }
}

function bakeGround(g: Surface, night: boolean) {
  // Distant skyline: trees and a far chedi against the sky.
  const far = G.LEAVES.far
  g.poly(
    [
      [206, 100],
      [212, 76],
      [214, 64],
      [216, 76],
      [222, 100],
    ],
    night ? '#8a90b8' : '#b8c8d8',
  )
  G.treeLine(g, 94, W, far, 4)
  G.treeLine(g, 108, W, G.LEAVES.deep, 9)
  G.lawn(g, 0, 126, W, 516, 11)
  // Back lawn behind the hall is a little darker (shade of the trees).
  G.groundShadow(g, 128, 136, 140, 12, 0.5)
  // Hall shadow and courtyard.
  G.paving(g, 40, 236, 176, 86, 8)
  G.kerb(g, 40, 236, 176, 86)
  G.mandala(g, 128, 298, 24)
  G.weather(g, 40, 236, 176, 86, 1, 0.7)
  G.groundShadow(g, HALL.x, 236, 82, 8, 0.7)
  // Main path and side paths.
  G.paving(g, 112, 322, 32, 322, 8)
  G.weather(g, 112, 322, 32, 322, 2, 0.8)
  G.puddle(g, 126, 472, 5, 2)
  G.puddle(g, 204, 318, 4, 1.5)
  G.leafLitter(g, 0, 440, 100, 110, 70, 3)
  G.leafLitter(g, 160, 520, 96, 80, 50, 4)
  G.leafLitter(g, 150, 380, 100, 60, 30, 5)
  g.vline(111, 322, 641, '#c9b69a')
  g.vline(144, 322, 641, '#c9b69a')
  G.paving(g, 92, 382, 20, 12, 6)
  G.paving(g, 144, 372, 20, 10, 6)
  G.paving(g, 144, 450, 56, 10, 6)
  G.paving(g, 62, 506, 50, 10, 6)
  G.paving(g, 144, 508, 22, 10, 6)
  G.paving(g, 66, 604, 46, 10, 6)
  // Flower beds and hedges along the path.
  G.flowerBed(g, 98, 330, 10, 40, MARIGOLD, 1)
  G.flowerBed(g, 148, 330, 10, 26, MARIGOLD, 2)
  G.flowerBed(g, 98, 440, 10, 56, MIXED, 3)
  G.flowerBed(g, 148, 486, 10, 16, MIXED, 4)
  G.flowerBed(g, 98, 540, 10, 50, MARIGOLD, 5)
  G.flowerBed(g, 148, 530, 10, 44, MIXED, 6)
  G.hedge(g, 40, 326, 50, 5)
  G.hedge(g, 166, 326, 50, 5)
  // Koi pond.
  G.pondBed(g, POND)
  const pads: [number, number, number][] = [
    [34, 396, 3],
    [44, 372, 2.5],
    [70, 376, 3],
    [82, 402, 2.5],
    [26, 402, 2],
    [60, 392, 2],
    [50, 404, 3],
  ]
  pads.forEach(([x, y, r], i) => G.lilyPad(g, x, y, r, i))
  G.reeds(g, 22, 392, 5)
  G.reeds(g, 94, 404, 4)
  G.reeds(g, 60, 368, 3)
  // Tree shadows.
  for (const f of FRANGI) G.groundShadow(g, f.x, f.y, 15, 4, 0.6)
  G.groundShadow(g, TAKHIAN.x, TAKHIAN.y - 2, 36, 9, 0.7)
  G.groundShadow(g, BODHI.x, BODHI.y - 8, 36, 8, 0.5)
  // Alms mat beside the path.
  mat(g, 146, 584, 22, 10)
  g.ellipse(157, 589, 4, 1.6, '#c9a04c')
  g.ellipse(157, 588, 2.6, 1, '#fffaf0')
  bakeStreet(g)
}

/** The soi outside the gate: sidewalks, road with a zebra crossing. */
function bakeStreet(g: Surface) {
  G.paving(g, 0, 642, W, 58, 6, 'grey')
  G.weather(g, 0, 642, W, 58, 8, 1.2)
  g.rect(0, 700, W, 2, '#8c8187')
  for (let x = 0; x < W; x += 8) g.rect(x, 700, 4, 2, x % 16 ? '#fffaf0' : '#e8514a')
  road(g, 0, 702, W, 34)
  // Zebra crossing.
  for (let x = 112; x < 146; x += 5) g.rect(x, 704, 3, 30, '#f0ece6')
  g.rect(0, 736, W, 2, '#8c8187')
  for (let x = 0; x < W; x += 8) g.rect(x, 736, 4, 2, x % 16 ? '#fffaf0' : '#e8514a')
  G.paving(g, 0, 738, W, 58, 6, 'grey')
  G.weather(g, 0, 738, W, 58, 9, 1.2)
  G.puddle(g, 186, 690, 5, 1.8)
  G.puddle(g, 62, 722, 6, 2)
  G.puddle(g, 232, 790, 5, 2)
  // Manhole.
  g.ellipse(200, 718, 4, 2, '#5a5068')
  g.ellipse(200, 718, 3, 1.3, '#6d6478')
  // Lawn and hedge beyond the far sidewalk.
  G.lawn(g, 0, 796, W, 24, 12)
  G.hedge(g, 0, 796, W, 6)
}

/** Ferris wheel of the temple fair over the far trees. */
function fair(g: Surface, t: number, s: WorldScene) {
  M.drawFerrisWheel(g, 92, 64, 20, t, s.isNight(), 98)
}

/** Sagging power cables between the street poles. */
function cables(g: Surface, t: number) {
  const tops: [number, number][] = [
    [-20, 646],
    [100, 641],
    [156, 641],
    [250, 641],
    [280, 646],
  ]
  for (let i = 0; i + 1 < tops.length; i++) {
    const [ax, ay] = tops[i]
    const [bx, by] = tops[i + 1]
    for (let k = 0; k < 4; k++) {
      let px = ax
      let py = ay + k
      const sag = 5 + k * 2 + Math.sin(t * 0.8 + i + k) * 0.4
      for (let j = 1; j <= 12; j++) {
        const f = j / 12
        const x = ax + (bx - ax) * f
        const y = ay + k + (by - ay) * f + Math.sin(f * Math.PI) * sag
        g.line(px, py, x, y, k === 2 ? '#5a5068' : '#3a3040')
        px = x
        py = y
      }
    }
  }
  // A sparrow perched on a wire.
  g.rect(126, 648, 3, 2, '#9c7a5e')
  g.px(129, 648, '#f0a040')
  g.px(126, 647, '#9c7a5e')
}

function look(o: Partial<AvatarLook>): AvatarLook {
  return { ...randomVisitorLook(), ...o }
}

function watGags(s: WorldScene): Gag[] {
  const auntie = look({ gender: 'f', hair: 'hair_short', hairColor: 6, top: 'top_white' })
  const tourist = look({ gender: 'm', hair: 'hair_short', hairColor: 3 })
  const kid = look({ gender: 'm', hair: 'hair_short' })
  const win1 = look({ gender: 'm', hair: 'hair_short', hairColor: 0 })
  const win2 = look({ gender: 'm', hair: 'hair_short', hairColor: 1 })
  const vendors = [0, 1, 2, 3, 4].map(() => look({ gender: 'f' }))
  let belly = false
  const mart = M.martSprite()
  const martN = M.martSprite(true)
  return [
    // Inside the grounds.
    {
      x: 164, y: 310, lines: ['ยิ้ม~ แชะ!', 'Amazing Thailand!', 'ขอถ่ายรูปโบสถ์อีกรูปนะครับ'],
      draw: (g, p) => drawPerson(g, tourist, p, 'back', ['selfie']),
      react: (sc, x, y) => gagFx.flash(sc, x, y),
    },
    {
      x: 188, y: 480, lines: ['เจริญพร~ อาตมาไลฟ์ธรรมะอยู่', 'ขอให้เจริญในธรรมนะโยม', 'อย่าลืมกดติดตามช่องธรรมะนะ'],
      draw: (g, p) => drawPhoneMonk(g, p),
    },
    {
      x: 64, y: 298, w: 18, h: 10, lines: ['แฮ่ก ๆ~', 'โฮ่ง! (พลิกพุงให้เกา)', 'พื้นเย็นสบายจัง…'],
      draw: (g, p) => {
        const sp = M.sprawlDogSprite(belly)
        g.draw(sp.canvas, p.x - Math.round(sp.w / 2), p.y - sp.h + 1)
        if (!belly && Math.floor(p.t * 1.2) % 2 === 0) g.px(p.x + 8, p.y - 8, '#e2e8ff')
      },
      react: (sc, x, y) => {
        belly = !belly
        sc.particles.hearts(x, y - 8, 3)
        sfx.bark()
      },
    },
    {
      x: 222, y: 630, w: 16, h: 14, lines: ['เมี้ยว~', 'เมี้ยวว (กล่องนี้ของเรานะ)', 'แง้ว!'],
      draw: (g, p) => {
        const b = M.catBoxSprite(p.react > 0)
        g.draw(b.canvas, p.x - Math.round(b.w / 2), p.y - b.h + 1)
      },
      react: (sc, x, y) => sc.particles.hearts(x, y - 12, 2),
    },
    {
      x: 188, y: 280, w: 22, h: 30, lines: ['รหัสไวไฟ: sathu1234', 'Wi-Fi ฟรี แรงเหมือนแรงศรัทธา', 'ต่อเน็ตแล้วอย่าลืมไหว้พระนะ'],
      draw: (g, p) => drawSpriteGag(g, M.wifiSignSprite(), p),
    },
    // Street: north sidewalk.
    {
      x: 30, y: 698, w: 56, h: 50, lines: ['ติ๊งต่อง~ สวัสดีค่า ยินดีต้อนรับค่ะ', 'รับไส้กรอกเพิ่มไหมคะ?', 'สะสมแสตมป์ไหมคะ?', 'อุ่นให้ไหมคะ?'],
      draw: (g, p) => drawSpriteGag(g, s.isNight() ? martN : mart, p, false),
      react: () => gagFx.chime(),
    },
    {
      x: 70, y: 694, w: 14, h: 26, lines: ['ก๊อง! ได้น้ำแดงมาหนึ่งกระป๋อง', 'เครื่องกินเหรียญอีกแล้ว!', 'ก๊อง! ได้ชาเขียว'],
      draw: (g, p) => drawSpriteGag(g, M.vendingSprite(), p),
      react: (sc, x, y) => {
        sfx.click()
        sc.particles.add({ kind: 'drop', x: x - 1, y: y - 6, vy: 20, g: 60, max: 0.4, color: '#e8514a', size: 2, color2: '#ff8a7a' })
      },
    },
    { x: 86, y: 682, z: -1, lines: ['มาลัยมะลิหอม ๆ จ้า', 'ถวายพระเสริมสิริมงคลนะลูก'], draw: (g, p) => drawPerson(g, vendors[0], p) },
    { x: 188, y: 694, lines: ['เลขเด็ดงวดนี้ค่ะ!', 'ใบละ 80 ไม่บวกเพิ่มจ้า', 'เลขท้ายสวย ๆ ค่ะ'], draw: (g, p) => drawPerson(g, vendors[1], p) },
    { x: 218, y: 684, z: -1, lines: ['หมูปิ้งร้อน ๆ ไม้ละ 10 จ้า', 'เอาไข่ดาวไหมคะ?', 'ข้าวเหนียวด้วยไหมจ๊ะ'], draw: (g, p) => drawPerson(g, vendors[2], p) },
    {
      x: 244, y: 692, w: 22, h: 40, lines: ['ขอให้ค้าขายร่ำรวย~', 'สาธุ (น้ำแดงหวานชื่นใจ)'],
      draw: (g, p) => drawSpriteGag(g, M.streetSpiritSprite(), p, false),
      react: (sc, x, y) => sc.particles.sparkles(x, y - 24, 6, '#fff3a6', 6),
    },
    {
      x: 40, y: 699, walk: { x0: 16, x1: 240, speed: 8 }, h: 34, lines: ['ร้อนจังเลยจ้า', 'แดดเปรี้ยงเลยลูก ทาครีมยัง?', 'ไปทำบุญมาเหรอลูก ดีจัง'],
      draw: (g, p) => drawPerson(g, auntie, p, 'front', ['umbrella']),
    },
    // Street: far sidewalk.
    { x: 40, y: 766, z: -1, lines: ['ดวงดีมาก! ปีนี้รวย', 'เนื้อคู่อยู่ใกล้แค่นี้เอง~', 'ยื่นมือมาดูลายมือหน่อย'], draw: (g, p) => drawPerson(g, vendors[3], p) },
    { x: 152, y: 762, z: -1, lines: ['ชาเย็นหวานน้อยนะคะ?', 'ใส่ไข่มุกเพิ่มไหมจ๊ะ', 'ชาไทยสีส้ม ๆ ชื่นใจ'], draw: (g, p) => drawPerson(g, vendors[4], p) },
    { x: 124, y: 784, lines: ['ซู้ดดด~', 'น้ำแดงโซดาอร่อยที่สุด!', 'หนาวฟัน!'], draw: (g, p) => drawPerson(g, kid, p, 'front', ['drink']) },
    { x: 196, y: 786, lines: ['ไปไหนครับพี่? วินครับ', 'ส่งถึงหน้าบ้านเลยครับ'], draw: (g, p) => drawPerson(g, win1, p, 'front', ['vest', 'phone']) },
    { x: 228, y: 786, lines: ['ไปวัดก็เดินเอาครับ ใกล้นิดเดียว', 'หมวกกันน็อกด้วยนะครับ'], draw: (g, p) => drawPerson(g, win2, p, 'front', ['vest']) },
    {
      x: 88, y: 752, w: 34, h: 24, lines: ['ตุ๊ก ๆ ไหมครับ? เหมาทั้งวัน', 'ปรื๊นนน~'],
      draw: (g, p) => {
        const tt = tukTuk()
        g.draw(tt.canvas, p.x - tt.ax + (p.react > 0 ? Math.round(Math.sin(p.t * 40)) : 0), p.y - tt.ay)
      },
      react: (sc, x, y) => {
        sfx.tap()
        for (let i = 0; i < 4; i++) sc.particles.add({ kind: 'smoke', x: x + 18, y: y - 3, vx: rand(4, 10), vy: rand(-4, 0), max: 0.9, color: '#c9c0c8', size: 2 })
      },
    },
  ]
}

export function watMap(): MapDef {
  const hall = T.hallSprite()
  const hallNight = T.hallSprite({ night: true })
  const chedi = T.chediSprite()
  const tower = T.bellTowerSprite()
  const rack = T.bellRackSprite(9)
  const gate = T.gateSprite()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const pole = F.flagPoleSprite(44)

  const props: PlacedProp[] = [
    { sprite: hall, night: hallNight, x: HALL.x, y: HALL.y },
    { sprite: chedi, x: CHEDI.x, y: CHEDI.y },
    { sprite: T.chediSprite({ small: true }), x: 64, y: 118 },
    { sprite: T.chediSprite({ small: true }), x: 192, y: 118 },
    { sprite: tower, x: TOWER.x, y: TOWER.y },
    { sprite: F.kutiSprite(), x: 26, y: 132 },
    { sprite: G.coconutPalm(0), x: 236, y: 140 },
    { sprite: G.coconutPalm(1), x: 6, y: 330 },
    { sprite: T.semaSprite(), x: 48, y: 250 },
    { sprite: T.semaSprite(), x: 208, y: 250 },
    { sprite: F.urnSprite(), x: 128, y: 284, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: 104, y: 280 },
    { sprite: F.candleStandSprite(), x: 152, y: 280 },
    { sprite: F.donationSprite(), x: 172, y: 270, shadow: [6, 2] },
    { sprite: F.offeringSprite(), x: 84, y: 266 },
    { sprite: pole, x: 36, y: 300 },
    { sprite: pole, x: 220, y: 300 },
    { sprite: G.topiary(0), x: 58, y: 234 },
    { sprite: G.topiary(2), x: 198, y: 234 },
    { sprite: G.bougainvillea(0), x: 18, y: 312 },
    { sprite: G.bougainvillea(1), x: 240, y: 318 },
    { sprite: rack, x: RACK.x, y: RACK.y },
    { sprite: T.holyWaterSprite(), x: HOLY.x, y: HOLY.y },
    { sprite: F.lotusJarSprite('blue'), x: 180, y: 412 },
    { sprite: F.lotusJarSprite('green'), x: 244, y: 404 },
    { sprite: F.benchSprite(), x: 84, y: 430 },
    { sprite: F.benchSprite(), x: 212, y: 498 },
    { sprite: G.takhianTree(), x: TAKHIAN.x, y: TAKHIAN.y, id: 'takhian' },
    { sprite: F.dressRackSprite(), x: 82, y: 504 },
    { sprite: F.spiritHouseSprite(), x: 12, y: 522 },
    { sprite: F.yakshaSprite('indigo', { king: true }), x: GUARD.x, y: GUARD.y },
    { sprite: F.offeringSprite(), x: GUARD.x, y: GUARD.y + 6 },
    { sprite: G.bodhiTree2(), x: BODHI.x, y: BODHI.y, id: 'bodhi' },
    { sprite: F.buddhaStatueSprite(), x: BODHI.x, y: BODHI.y - 2, z: 1 },
    { sprite: F.stallSprite(), x: 50, y: 598 },
    { sprite: G.shrub(0), x: 238, y: 612 },
    { sprite: G.shrub(1), x: 196, y: 606 },
    { sprite: G.bananaPlant(), x: 14, y: 470 },
    { sprite: G.topiary(1), x: 244, y: 460 },
    { sprite: F.yakshaSprite('green'), x: 76, y: 614 },
    { sprite: F.yakshaSprite('red'), x: 180, y: 614 },
    { sprite: T.wallSprite(92), x: 0, y: 642 },
    { sprite: T.wallSprite(92), x: 164, y: 642 },
    { sprite: gate, x: GATE.x, y: GATE.y },
    ...FRANGI.map((f) => ({ sprite: G.frangipani(f.v), x: f.x, y: f.y, id: f.id })),
    { sprite: M.garlandStandSprite(), x: 86, y: 690 },
    { sprite: M.lotteryBoardSprite(), x: 172, y: 692 },
    { sprite: M.mooPingSprite(), x: 218, y: 694 },
    { sprite: M.fortuneBoothSprite(), x: 40, y: 776 },
    { sprite: M.chaYenSprite(), x: 152, y: 772 },
    { sprite: M.winStandSprite(), x: 212, y: 776 },
    { sprite: M.powerPoleSprite(), x: 100, y: 704 },
    { sprite: M.powerPoleSprite(), x: 156, y: 704 },
    { sprite: M.powerPoleSprite(), x: 250, y: 704 },
    { sprite: M.planterSprite(0), x: 96, y: 668 },
    { sprite: M.planterSprite(2), x: 160, y: 668 },
    { sprite: M.planterSprite(1), x: 84, y: 352 },
    { sprite: pole, x: 104, y: 614 },
    { sprite: pole, x: 152, y: 614 },
    { sprite: G.coconutPalm(0), x: 8, y: 816 },
    { sprite: G.coconutPalm(1), x: 250, y: 818 },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]

  return {
    id: 'wat',
    w: W,
    h: H,
    skyH: 112,
    ground: '#86c95f',
    camBias: 0.66,
    bake: bakeGround,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 118 },
      { x: 50, y: 110, w: 156, h: 131 },
      { x: 100, y: 238, w: 11, h: 12 },
      { x: 145, y: 238, w: 11, h: 12 },
      { x: 0, y: 118, w: 48, h: 98 },
      { x: 208, y: 118, w: 48, h: 98 },
      { x: 42, y: 244, w: 12, h: 7 },
      { x: 202, y: 244, w: 12, h: 7 },
      { x: 118, y: 276, w: 20, h: 9 },
      { x: 97, y: 274, w: 14, h: 7 },
      { x: 145, y: 274, w: 14, h: 7 },
      { x: 166, y: 264, w: 12, h: 7 },
      { x: 33, y: 296, w: 7, h: 5 },
      { x: 217, y: 296, w: 7, h: 5 },
      { x: 40, y: 324, w: 50, h: 8 },
      { x: 166, y: 324, w: 50, h: 8 },
      { x: 98, y: 330, w: 10, h: 40 },
      { x: 148, y: 330, w: 10, h: 26 },
      { x: 98, y: 440, w: 10, h: 56 },
      { x: 148, y: 486, w: 10, h: 16 },
      { x: 98, y: 540, w: 10, h: 50 },
      { x: 148, y: 530, w: 10, h: 44 },
      { x: 154, y: 350, w: 84, h: 13 },
      { x: 188, y: 430, w: 52, h: 13 },
      { x: 174, y: 406, w: 12, h: 7 },
      { x: 238, y: 398, w: 12, h: 7 },
      { x: 74, y: 426, w: 20, h: 5 },
      { x: 202, y: 494, w: 20, h: 5 },
      { x: 32, y: 486, w: 28, h: 15 },
      { x: 72, y: 498, w: 20, h: 7 },
      { x: 6, y: 514, w: 12, h: 9 },
      { x: 160, y: 494, w: 24, h: 9 },
      { x: 198, y: 538, w: 56, h: 19 },
      { x: 26, y: 584, w: 50, h: 15 },
      { x: 64, y: 606, w: 24, h: 9 },
      { x: 168, y: 606, w: 24, h: 9 },
      { x: 0, y: 628, w: 108, h: 16 },
      { x: 148, y: 628, w: 108, h: 16 },
      { x: 0, y: 684, w: 60, h: 15 },
      { x: 63, y: 688, w: 14, h: 7 },
      { x: 76, y: 684, w: 22, h: 7 },
      { x: 158, y: 686, w: 26, h: 7 },
      { x: 202, y: 688, w: 32, h: 7 },
      { x: 234, y: 686, w: 18, h: 7 },
      { x: 86, y: 662, w: 20, h: 7 },
      { x: 150, y: 662, w: 20, h: 7 },
      { x: 97, y: 700, w: 6, h: 4 },
      { x: 153, y: 700, w: 6, h: 4 },
      { x: 247, y: 700, w: 6, h: 4 },
      { x: 0, y: 702, w: 110, h: 34 },
      { x: 146, y: 702, w: 110, h: 34 },
      { x: 72, y: 744, w: 34, h: 10 },
      { x: 24, y: 770, w: 32, h: 7 },
      { x: 136, y: 766, w: 32, h: 7 },
      { x: 188, y: 764, w: 48, h: 13 },
      { x: 0, y: 796, w: W, h: 24 },
      { x: 74, y: 346, w: 20, h: 7 },
      { x: 101, y: 610, w: 7, h: 5 },
      { x: 149, y: 610, w: 7, h: 5 },
      { x: 58, y: 293, w: 14, h: 6 },
      { x: 214, y: 624, w: 16, h: 7 },
      { x: 185, y: 276, w: 6, h: 5 },
      { x: 2, y: 324, w: 8, h: 7 },
      { x: 232, y: 134, w: 8, h: 7 },
      ...FRANGI.map((f) => ({ x: f.x - 3, y: f.y - 3, w: 6, h: 4 })),
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    ellipses: POND.map(([x, y, rx, ry]) => [x, y, rx + 3, ry + 3] as [number, number, number, number]),
    hotspots: [
      {
        id: 'hall',
        label: 'อุโบสถ',
        hint: 'กราบพระ สวดมนต์ ขอพร ปิดทอง',
        icon: 'temple',
        rect: { x: 56, y: 100, w: 144, h: 150 },
        at: { x: HALL.x, y: HALL.y + 5 },
        face: 'up',
        marker: { x: HALL.x + 1, y: 84 },
        beacon: true,
        near: 16,
      },
      { id: 'incense', label: 'กระถางธูปหน้าโบสถ์', hint: 'จุดธูปขอพร', icon: 'incense', rect: { x: 114, y: 258, w: 28, h: 28 }, at: { x: 128, y: 296 }, face: 'up', marker: { x: 128, y: 256 } },
      { id: 'donation', label: 'ตู้ทำบุญ', hint: 'ทำบุญค่าน้ำค่าไฟวัด', icon: 'coin', rect: { x: 163, y: 244, w: 18, h: 28 }, at: { x: 172, y: 280 }, face: 'up', marker: { x: 172, y: 242 } },
      { id: 'pond', label: 'บ่อปลาคาร์ฟ', hint: 'ให้อาหารปลา', icon: 'koi', rect: { x: 16, y: 360, w: 84, h: 56 }, at: { x: 104, y: 390 }, face: 'left', marker: { x: 56, y: 360 } },
      { id: 'bells', label: 'ระฆังแห่งบุญ', hint: 'ตีระฆังให้ดังกังวาน', icon: 'bell', rect: { x: 154, y: 316, w: 84, h: 46 }, at: { x: 196, y: 372 }, face: 'up', marker: { x: 196, y: 314 } },
      { id: 'holy_water', label: 'โอ่งน้ำมนต์', hint: 'ตักน้ำมนต์เสริมสิริมงคล', icon: 'vessel', rect: { x: 188, y: 392, w: 52, h: 50 }, at: { x: 214, y: 454 }, face: 'up', marker: { x: 214, y: 390 } },
      { id: 'tree', label: 'ต้นตะเคียนทอง', hint: 'ขูดเลขมงคล', icon: 'powder', rect: { x: 8, y: 404, w: 76, h: 96 }, at: { x: 58, y: 512 }, face: 'up', marker: { x: 46, y: 404 } },
      { id: 'guardian', label: 'ท้าวเวสสุวรรณ', hint: 'ผู้พิทักษ์ขุมทรัพย์', icon: 'deity', rect: { x: 158, y: 448, w: 28, h: 56 }, at: { x: 172, y: 514 }, face: 'up', marker: { x: 172, y: 444 } },
      { id: 'alms', label: 'ลานตักบาตร', hint: 'ถวายภัตตาหารแด่พระสงฆ์', icon: 'bowl', rect: { x: 145, y: 578, w: 26, h: 18 }, at: { x: 150, y: 600 }, face: 'up', marker: { x: 157, y: 578 } },
      { id: 'flower_stall', label: 'ร้านยายศรี', hint: 'ดอกไม้ ธูปเทียน ของถวาย', icon: 'garland', rect: { x: 26, y: 554, w: 50, h: 46 }, at: { x: 52, y: 610 }, face: 'up', marker: { x: 50, y: 552 } },
      { id: 'gate', label: 'ประตูวัด', hint: 'กลับบ้าน', icon: 'map', rect: { x: 106, y: 568, w: 44, h: 74 }, at: { x: 128, y: 630 }, face: 'down', marker: { x: 128, y: 562 }, near: 12 },
    ],
    spawn: { x: 128, y: 304, face: 'up' },
    pickupSpots: [
      { x: 136, y: 676 },
      { x: 110, y: 766 },
      { x: 26, y: 280 },
      { x: 232, y: 290 },
      { x: 70, y: 346 },
      { x: 186, y: 340 },
      { x: 22, y: 432 },
      { x: 124, y: 408 },
      { x: 200, y: 420 },
      { x: 132, y: 488 },
      { x: 76, y: 470 },
      { x: 226, y: 486 },
      { x: 20, y: 548 },
      { x: 84, y: 540 },
      { x: 186, y: 548 },
      { x: 130, y: 560 },
      { x: 238, y: 590 },
      { x: 84, y: 590 },
    ],
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      { x: HALL.x, y: 212, r: 34 },
      { x: HALL.x - 57, y: 214, r: 10 },
      { x: HALL.x + 57, y: 214, r: 10 },
      { x: HALL.x - 25, y: 214, r: 12 },
      { x: HALL.x + 25, y: 214, r: 12 },
      { x: 128, y: 268, r: 8, color: '#ff9a5a' },
      { x: 50, y: 580, r: 18, color: '#ffb3cf' },
      { x: GATE.x, y: 604, r: 26 },
      { x: TOWER.x, y: 160, r: 14 },
      { x: 12, y: 505, r: 9, color: '#ffcf7a' },
    ],
    life(s) {
      const glints: { x: number; y: number }[] = [
        ...(hall.hooks.glints ?? []).map((h) => at(HALL, h)),
        ...(chedi.hooks.glints ?? []).map((h) => at(CHEDI, h)),
        ...(tower.hooks.glints ?? []).map((h) => at(TOWER, h)),
        ...(gate.hooks.glints ?? []).map((h) => at(GATE, h)),
      ]
      const pond = new KoiPond(s, POND, {
        koi: 7,
        dragonflies: 2,
        lotus: [
          [44, 370, true],
          [70, 374],
          [34, 394, true],
          [82, 400],
          [52, 402],
          [26, 400],
        ],
      })
      const shakeTree = (id: string, x: number, y: number, w: number, petal: [string, string], kind: 'petal' | 'leaf') => ({
        rect: { x: x - w / 2, y: y - 60, w, h: 44 },
        fn: () => {
          s.shake(id)
          s.drop(x, y - 34, w * 0.7, 6, petal[0], petal[1], kind)
          if (Math.random() < 0.7) s.burstBirds(x, y - 40, 1 + Math.floor(Math.random() * 3))
          sfx.whoosh()
        },
      })
      return [
        pond,
        new EaveBells(s, [...(hall.hooks.bells ?? []).map((h) => at(HALL, h))], HALL.y),
        new EaveBells(s, [...(tower.hooks.bells ?? []).map((h) => at(TOWER, h))], TOWER.y),
        new EaveBells(s, [...(gate.hooks.bells ?? []).map((h) => at(GATE, h))], GATE.y),
        new TowerBell(s, at(TOWER, tower.hooks.bell[0]).x, at(TOWER, tower.hooks.bell[0]).y, { x: TOWER.x - 20, y: TOWER.y - 88, w: 40, h: 88 }, TOWER.y),
        new RackBells(s, (rack.hooks.bells ?? []).map((h) => at(RACK, h)), { x: RACK.x - 42, y: RACK.y - 44, w: 84, h: 44 }, RACK.y),
        new Glints(s, glints, 1.1),
        ...(hall.hooks.candles ?? []).map((h) => new Flames(s, [at(HALL, h)], HALL.y)),
        Flames.candles(s, 104, 280),
        Flames.candles(s, 152, 280),
        new Smoke(s, [{ x: 128, y: 270 }], 7),
        new Flags(s, [
          { x: 36, y: 254, kind: 'dharma', sortY: 300 },
          { x: 220, y: 254, kind: 'thai', sortY: 300 },
        ]),
        new Lanterns(s, [
          { x0: 107, y0: 398, x1: 151, y1: 398, n: 5, sag: 5 },
          { x0: 107, y0: 500, x1: 151, y1: 500, n: 5, sag: 5 },
        ]),
        new Butterflies(s, [
          { x: 96, y: 330, w: 64, h: 40 },
          { x: 96, y: 440, w: 64, h: 60 },
          { x: 96, y: 530, w: 64, h: 50 },
        ], 6),
        new CloudShadows(s, 3),
        new SunRays(s),
        new Gags(s, watGags(s)),
        // Temple-fair ferris wheel lights stay bright at night.
        { glow: (g: Surface, t: number) => s.isNight() && M.drawFerrisWheel(g, 92, 64, 20, t, true, 98) },
        new Smoke(s, [{ x: 218, y: 684 }], 5),
        new Banners(s, [
          { x: 104, y: 571, color: '#e8514a', sortY: 614 },
          { x: 152, y: 571, color: '#5a8de0', sortY: 614 },
        ]),
        new FairLights(s, [
          { x0: 38, y0: 258, x1: 218, y1: 258, n: 16, sag: 20 },
          { x0: 105, y0: 572, x1: 153, y1: 572, n: 6, sag: 6 },
          { x0: 102, y0: 644, x1: 156, y1: 644, n: 6, sag: 8 },
        ]),
        new Traffic(s, [
          { y: 716, dir: 1 },
          { y: 731, dir: -1 },
        ]),
        new TapZones([
          ...FRANGI.map((f) => shakeTree(f.id, f.x, f.y + 8, 40, (f.v >= 2 ? ['#ffc4d8', '#ffe45e'] : ['#fffaf0', '#ffd23f']) as [string, string], 'petal')),
          shakeTree('takhian', TAKHIAN.x, TAKHIAN.y - 30, 80, ['#5eae55', '#3f8a4f'], 'leaf'),
          shakeTree('bodhi', BODHI.x, BODHI.y - 30, 80, ['#9ed86a', '#5eae55'], 'leaf'),
          {
            rect: { x: CHEDI.x - 24, y: CHEDI.y - 116, w: 48, h: 110 },
            fn: () => {
              s.particles.sparkles(CHEDI.x - 1, CHEDI.y - 112, 10, '#fff3a6', 10)
              sfx.chime()
            },
          },
          {
            rect: { x: 64, y: 562, w: 24, h: 50 },
            fn: () => {
              s.particles.hearts(76, 574, 2)
              sfx.hum(1)
            },
          },
          {
            rect: { x: 168, y: 562, w: 24, h: 50 },
            fn: () => {
              s.particles.hearts(180, 574, 2)
              sfx.hum(3)
            },
          },
        ]),
      ]
    },
    decor: fair,
    overlay: (g, t) => cables(g, t),
    ambient(s, dt) {
      // Frangipani blossoms drift down now and then.
      if (Math.random() < dt * 0.6) {
        const f = FRANGI[Math.floor(Math.random() * FRANGI.length)]
        if (s.onScreen(f.x, f.y, 30)) s.particles.add({ kind: 'petal', x: f.x + rand(-14, 14), y: f.y - 34 + rand(-6, 6), vx: rand(-3, 3), vy: rand(6, 10), max: rand(2.4, 3.4), color: f.v >= 2 ? '#ffc4d8' : '#fffaf0', color2: '#ffe45e' })
      }
      if (Math.random() < dt * 0.35) {
        const t = Math.random() < 0.5 ? TAKHIAN : BODHI
        s.particles.add({ kind: 'leaf', x: t.x + rand(-30, 30), y: t.y - 60 + rand(-10, 10), vx: rand(-4, 4), vy: rand(6, 11), max: rand(2.5, 3.5), color: '#6cb85c', color2: '#3f8a4f' })
      }
      // Golden motes around the hall at night.
      if (s.isNight() && Math.random() < dt * 1.2) {
        s.particles.add({ kind: 'sparkle', x: HALL.x + rand(-70, 70), y: rand(110, 230), vy: rand(-6, -2), max: rand(1, 2), color: '#fff3a6', drag: 0.3 })
      }
    },
    wander: [
      { x: 10, y: 650, w: 236, h: 44 },
      { x: 44, y: 250, w: 168, h: 66 },
      { x: 114, y: 330, w: 28, h: 290 },
      { x: 150, y: 372, w: 80, h: 10 },
      { x: 10, y: 430, w: 80, h: 40 },
      { x: 160, y: 510, w: 40, h: 20 },
    ],
    pois: [
      { x: 120, y: 296, face: 'up' },
      { x: 136, y: 296, face: 'up' },
      { x: 116, y: 256, face: 'up' },
      { x: 140, y: 256, face: 'up' },
      { x: 190, y: 372, face: 'up' },
      { x: 214, y: 454, face: 'up' },
      { x: 104, y: 398, face: 'left' },
      { x: 58, y: 514, face: 'up' },
      { x: 172, y: 516, face: 'up' },
      { x: 52, y: 612, face: 'up' },
    ],
    fireflies: [
      { x: 10, y: 350, w: 96, h: 70 },
      { x: 0, y: 440, w: 100, h: 80 },
      { x: 180, y: 500, w: 76, h: 60 },
      { x: 100, y: 330, w: 60, h: 250 },
    ],
    monkPath: [
      [128, 258],
      [128, 600],
      [128, 690],
      [-20, 690],
    ],
    birds: { x: 60, y: 300, w: 136, h: 18 },
    cats: [
      { x: 188, y: 300, pose: 'sleep', color: '#f5a55a' },
      { x: 28, y: 572, pose: 'loaf', color: '#fbf3e4' },
      { x: 232, y: 520, pose: 'sit', color: '#5a4a5e' },
    ],
    novice: { x: 118, y: 440, w: 20, h: 90 },
    novices: 1,
    vendors: [{ x: 16, y: 600 }],
    dogs: ['somo', 'thuadam', 'mali'],
    visitors: 3,
  }
}

/** Handy spots for the title-screen stroll. */
export const WAT_TOUR: [number, number][] = [
  [128, 304],
  [104, 392],
  [180, 300],
  [128, 262],
]

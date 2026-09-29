// วัดห้วยมงคล (Hua Hin) – the world's biggest Luang Pu Thuat sits on his
// hill above a plaza where two huge elephant statues stand across the path:
// walk under their bellies for luck (ลอดท้องช้าง). Rows of donated little
// elephants, a lotus pond with a feeding deck, the viharn with a golden
// Luang Pu Thuat, and a car park with tour coaches and a dried-squid cart.
//
// Maps: 'wat_huay_mongkol' and 'wat_huay_mongkol:hall'.

import type { MapDef, PlacedProp, WorldScene } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as T from '../../../art/temple'
import * as F from '../../../art/templeprops'
import * as G from '../../../art/garden'
import * as M from '../../../art/modern'
import { road } from '../common'
import { drawPerson, drawPhoneMonk, drawSpriteGag, Gags, gagFx, type Gag } from '../../gags'
import { monkSprite } from '../../../art/characters'
import { drawShadow } from '../../../art/props'
import { Butterflies, CloudShadows, EaveBells, Flags, Flames, Glints, KoiPond, Smoke, SunRays, TapZones, Traffic } from '../../life'
import * as HM from '../../../art/places/historic-huaymongkol'
import * as H from '../../../art/places/historic'
import * as I from '../../../art/places/historic-interior'
import { viharnSprite } from '../../../art/places/historic-halls'
import { DustMotes, foot, LightShafts, look, LuckZone, shakeTree } from './historic-common'

const ID = 'wat_huay_mongkol'
const HALL = 'wat_huay_mongkol:hall'

const W = 300
const HH = 1040
const MON = { x: 150, y: 306 }
const ELE1 = { x: 150, y: 512 }
const ELE2 = { x: 150, y: 604 }
const VIH = { x: 232, y: 792 }
const GATE = { x: 150, y: 884 }
const RAIN1 = { x: 24, y: 652 }
const RAIN2 = { x: 286, y: 470 }
const POND: [number, number, number, number][] = [
  [66, 752, 46, 22],
  [36, 782, 24, 14],
  [104, 780, 22, 12],
]
const MINI_ROWS = [468, 492, 516, 540, 564]
const MINI_L = [22, 40, 58, 76, 94]
const MINI_R = [208, 226, 244, 262, 280]
const LAMPS: [number, number][] = [
  [124, 450],
  [176, 450],
  [124, 690],
  [176, 690],
  [110, 862],
  [190, 862],
]

function bakeGrounds(g: Surface, night: boolean) {
  HM.huaHinHills(g, 132, W, night)
  G.treeLine(g, 126, W, G.LEAVES.far, 3)
  G.treeLine(g, 142, W, G.LEAVES.deep, 8)
  G.lawn(g, 0, 154, W, 730, 19)
  // The hill under the statue with its stone stair, and the terrace.
  HM.statueHill(g, 150, 236, 444, 112, 150, 13, 5)
  G.paving(g, 56, 300, 188, 44, 8)
  G.kerb(g, 56, 300, 188, 44)
  G.mandala(g, 150, 332, 16)
  // Plaza.
  G.paving(g, 14, 444, 272, 270, 10)
  G.weather(g, 14, 444, 272, 270, 4, 0.5)
  G.kerb(g, 14, 444, 272, 270)
  for (const e of [ELE1, ELE2]) {
    g.rect(e.x - 38, e.y - 10, 76, 12, '#d8d0cb')
    g.hline(e.x - 38, e.x + 37, e.y - 10, '#f0ebe6')
    g.hline(e.x - 38, e.x + 37, e.y + 1, '#9c9290')
    G.groundShadow(g, e.x, e.y - 3, 34, 5, 0.9)
  }
  for (const y of MINI_ROWS) {
    g.rect(12, y - 3, 96, 4, '#c9bfb8')
    g.rect(196, y - 3, 96, 4, '#c9bfb8')
  }
  // Paths to the pond and the viharn and on to the gate.
  G.paving(g, 136, 714, 28, 170, 8)
  G.paving(g, 100, 700, 100, 16, 8)
  G.paving(g, 196, 700, 40, 104, 8)
  G.paving(g, 60, 700, 44, 30, 8)
  G.groundShadow(g, RAIN1.x + 10, RAIN1.y - 8, 50, 12, 0.7)
  G.groundShadow(g, RAIN2.x - 10, RAIN2.y - 8, 44, 10, 0.7)
  G.leafLitter(g, 0, 620, 90, 70, 90, 3)
  G.leafLitter(g, 230, 440, 70, 50, 50, 4)
  G.pondBed(g, POND)
  const pads: [number, number, number][] = [
    [44, 746, 3],
    [80, 742, 2.5],
    [96, 760, 3],
    [30, 780, 2.5],
    [60, 766, 2],
    [110, 782, 2],
  ]
  pads.forEach(([x, y, r], i) => G.lilyPad(g, x, y, r, i))
  G.reeds(g, 14, 786, 5)
  G.reeds(g, 122, 784, 4)
  G.flowerBed(g, 196, 820, 76, 8, ['#f58f35', '#ffd23f'], 7)
  // Car park and road.
  G.paving(g, 0, 884, W, 12, 6, 'grey')
  road(g, 0, 896, W, 90)
  for (let x = 16; x < W; x += 40) g.rect(x, 900, 2, 22, '#f0ece6')
  g.rect(0, 986, W, 2, '#8c8187')
  G.paving(g, 0, 988, W, 52, 6, 'grey')
  G.weather(g, 0, 988, W, 52, 9, 1)
  G.puddle(g, 80, 950, 6, 2)
}

function hmGags(): Gag[] {
  const granny = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_white', bottom: 'bot_sarong' })
  const kid = look({ gender: 'm', hair: 'hair_short', top: 'top_tee_boon', bottom: 'bot_denim_shorts', head: 'head_cap' })
  const vendor = look({ gender: 'f', hair: 'hair_ponytail', top: 'top_vendor', bottom: 'bot_jeans', head: 'head_vendorband' })
  const squid = look({ gender: 'm', hair: 'hair_short', top: 'top_hawaii', bottom: 'bot_fisherman', head: 'head_sunhat' })
  const driver = look({ gender: 'm', hair: 'hair_short', top: 'top_polo', bottom: 'bot_slacks_grey' })
  const tourists = [look({ gender: 'f', head: 'head_sunhat' }), look({ gender: 'm', top: 'top_hawaii' })]
  return [
    {
      x: 150, y: 516, lines: ['ลอดท้องช้างแล้ว ปีนี้ต้องรวย!', 'ย่ามาลอดทุกปีเลยนะหลาน', 'ลอดสามรอบ เสริมดวงสามเท่า~'],
      draw: (g, p) => drawPerson(g, granny, p, 'front', [], 'kneel'),
      react: (sc, x, y) => sc.particles.sparkles(x, y - 20, 6, '#fff3a6', 8),
    },
    {
      x: 94, y: 588, lines: ['ขี่ช้างน้อย ปะ ปะ ปะ!', 'แม่ครับ ช้างตัวนี้ชื่อบุญมี', 'หนูอยากได้ช้างไปถวายด้วย'],
      draw: (g, p) => {
        const e = HM.miniElephantSprite(1)
        g.draw(e.canvas, Math.round(p.x - e.ax), Math.round(p.y - e.ay))
        drawPerson(g, kid, { ...p, y: p.y - 6 }, 'front', [], 'sit')
      },
      react: (sc, x, y) => sc.particles.hearts(x, y - 26, 2),
    },
    { x: 222, y: 618, lines: ['ตุ๊กตาช้างถวายหลวงปู่จ้า', 'ตัวละ 20 ตัวใหญ่ 99 จ้า', 'อ้อยสำหรับช้างด้วยไหมจ๊ะ?'], draw: (g, p) => drawPerson(g, vendor, p) },
    { x: 258, y: 902, lines: ['หมึกบดหัวหินจ้า! บดสด ๆ', 'ย่างหอม ๆ จิ้มน้ำจิ้มซีฟู้ด', 'หมึกแห้งแท้ ๆ จากปราณบุรี'], draw: (g, p) => drawPerson(g, squid, p) },
    {
      x: 206, y: 342, lines: ['ขอให้แคล้วคลาดปลอดภัยนะโยม', 'เหยียบน้ำทะเลจืด~', 'หลวงปู่คุ้มครองนะ'],
      draw: (g, p) => drawPhoneMonk(g, p),
      react: (sc, x, y) => {
        for (let i = 0; i < 6; i++) sc.particles.add({ kind: 'drop', x: x - 8, y: y - 20, vx: rand(-20, -6), vy: rand(-20, -4), g: 80, max: 0.6, color: '#c8f4fa' })
        sfx.splash()
      },
    },
    {
      x: 70, y: 916, w: 72, h: 32, lines: ['ทัวร์หัวหิน–ห้วยมงคล ออกบ่ายสองนะคร้าบ', 'ปี๊น ปี๊น!', 'แวะซื้อสับปะรดหัวหินก่อนกลับนะ'],
      draw: (g, p) => drawSpriteGag(g, HM.tourBusSprite('#e8514a'), p),
      react: (sc, x, y) => {
        sfx.tap()
        for (let i = 0; i < 4; i++) sc.particles.add({ kind: 'smoke', x: x - 36, y: y - 4, vx: rand(-10, -4), vy: rand(-4, 0), max: 0.9, color: '#c9c0c8', size: 2 })
      },
    },
    { x: 118, y: 924, lines: ['รถทัวร์พร้อมออกครับ~', 'นับหัวให้ครบนะครับ'], draw: (g, p) => drawPerson(g, driver, p) },
    {
      x: 40, y: 1012, walk: { x0: 30, x1: 260, speed: 9 }, lines: ['ร้อนจัง ไปทะเลต่อกันเถอะ', 'สับปะรดหัวหินหวานมาก!'],
      draw: (g, p) => drawPerson(g, tourists[0], p, 'front', ['umbrella']),
    },
    {
      x: 186, y: 700, lines: ['ถ่ายรูปกับหลวงปู่องค์ใหญ่!', 'Wow, so big!', 'ยิ้ม~ แชะ!'],
      draw: (g, p) => drawPerson(g, tourists[1], p, 'back', ['selfie']),
      react: (sc, x, y) => gagFx.flash(sc, x, y),
    },
  ]
}

export function huayMongkolMap(): MapDef {
  const mon = HM.thuatMonumentSprite()
  const e1 = HM.bigElephantStatue(0)
  const e2 = HM.bigElephantStatue(1)
  const vih = viharnSprite({
    key: 'hm',
    w: 104,
    tiers: 2,
    roof: T.ROOF.orange,
    roofBack: T.ROOF.green,
    gable: { field: '#c23a3f', fieldD: '#7e2436', sparkA: '#ff8a7a', sparkB: '#8fb6ff', motif: 'narai' },
    gableBack: { field: '#3d63b5', fieldD: '#26306e', sparkA: '#8fb6ff', sparkB: '#ffd6e0', motif: 'emblem' },
    windows: 2,
    cols: 4,
  })
  const vihN = viharnSprite({
    key: 'hm',
    w: 104,
    tiers: 2,
    roof: T.ROOF.orange,
    roofBack: T.ROOF.green,
    gable: { field: '#c23a3f', fieldD: '#7e2436', sparkA: '#ff8a7a', sparkB: '#8fb6ff', motif: 'narai' },
    gableBack: { field: '#3d63b5', fieldD: '#26306e', sparkA: '#8fb6ff', sparkB: '#ffd6e0', motif: 'emblem' },
    windows: 2,
    cols: 4,
    night: true,
  })
  const gate = T.gateSprite()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const pole = F.flagPoleSprite(40)

  const minis: PlacedProp[] = []
  MINI_ROWS.forEach((y, r) => {
    MINI_L.forEach((x, i) => minis.push({ sprite: HM.miniElephantSprite(r * 5 + i), x, y }))
    MINI_R.forEach((x, i) => minis.push({ sprite: HM.miniElephantSprite(r * 5 + i + 3), x, y }))
  })

  const props: PlacedProp[] = [
    { sprite: mon, x: MON.x, y: MON.y, id: 'mon' },
    { sprite: I.offeringTableSprite(40), x: 150, y: 320 },
    { sprite: F.urnSprite(), x: 112, y: 330, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: 190, y: 326 },
    { sprite: F.lotusJarSprite('green'), x: 70, y: 322 },
    { sprite: F.lotusJarSprite('blue'), x: 230, y: 322 },
    { sprite: pole, x: 62, y: 342 },
    { sprite: pole, x: 238, y: 342 },
    { sprite: e1, x: ELE1.x, y: ELE1.y, id: 'e1' },
    { sprite: e2, x: ELE2.x, y: ELE2.y, id: 'e2', flip: true },
    ...minis,
    { sprite: H.signSprite('lod', 26, 14, '#fff1d6', [T.GOLD.D, '#b8343f', '#5a3d4f']), x: 108, y: 470 },
    { sprite: HM.figurineStallSprite(), x: 252, y: 624 },
    { sprite: H.rainTree(7), x: RAIN1.x, y: RAIN1.y, id: 'rain1' },
    { sprite: H.rainTree(8, G.LEAVES.green), x: RAIN2.x, y: RAIN2.y, id: 'rain2' },
    { sprite: H.broomSprite(), x: 44, y: 650 },
    { sprite: HM.pondDeckSprite(), x: 110, y: 730 },
    { sprite: G.bananaPlant(), x: 132, y: 760 },
    { sprite: G.bougainvillea(0), x: 12, y: 720 },
    { sprite: vih, night: vihN, x: VIH.x, y: VIH.y },
    { sprite: H.shoeRackSprite(true), x: 198, y: 800 },
    { sprite: T.wallSprite(114), x: 0, y: GATE.y },
    { sprite: T.wallSprite(114), x: 186, y: GATE.y },
    { sprite: gate, x: GATE.x, y: GATE.y },
    { sprite: HM.squidCartSprite(), x: 232, y: 908 },
    { sprite: G.coconutPalm(0), x: 10, y: 1030 },
    { sprite: G.coconutPalm(1), x: 290, y: 1034 },
    { sprite: M.powerPoleSprite(), x: 150, y: 1000 },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]

  const legObs = (e: { x: number; y: number }, flip: boolean) =>
    flip
      ? [
          { x: e.x - 31, y: e.y - 9, w: 17, h: 10 },
          { x: e.x + 12, y: e.y - 9, w: 17, h: 10 },
          { x: e.x - 53, y: e.y - 14, w: 12, h: 10 },
        ]
      : [
          { x: e.x - 28, y: e.y - 9, w: 17, h: 10 },
          { x: e.x + 14, y: e.y - 9, w: 17, h: 10 },
          { x: e.x + 40, y: e.y - 14, w: 12, h: 10 },
        ]

  return {
    id: ID,
    place: ID,
    area: 'wat',
    w: W,
    h: HH,
    skyH: 114,
    ground: '#86c95f',
    camBias: 0.62,
    bake: bakeGrounds,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 306 },
      { x: 0, y: 306, w: 56, h: 40 },
      { x: 244, y: 306, w: 56, h: 40 },
      foot(150, 320, 40, 6),
      foot(112, 330, 22, 8),
      foot(190, 326, 16, 6),
      foot(70, 322, 12, 6),
      foot(230, 322, 12, 6),
      { x: 0, y: 344, w: 136, h: 100 },
      { x: 164, y: 344, w: 136, h: 100 },
      ...legObs(ELE1, false),
      ...legObs(ELE2, true),
      { x: 12, y: 454, w: 96, h: 114 },
      { x: 196, y: 454, w: 96, h: 114 },
      foot(108, 470, 12, 5),
      foot(252, 624, 52, 14),
      foot(RAIN1.x, RAIN1.y, 16, 10),
      foot(RAIN2.x, RAIN2.y, 16, 10),
      foot(132, 760, 8, 6),
      foot(12, 720, 16, 8),
      { x: 176, y: 730, w: 112, h: 58 },
      foot(198, 800, 24, 8),
      { x: 196, y: 820, w: 76, h: 9 },
      { x: 0, y: GATE.y - 14, w: 130, h: 14 },
      { x: 170, y: GATE.y - 14, w: 130, h: 14 },
      foot(232, 908, 50, 14),
      { x: 34, y: 900, w: 72, h: 18 },
      foot(10, 1030, 8, 6),
      foot(290, 1034, 8, 6),
      foot(150, 1000, 6, 4),
      ...LAMPS.map(([x, y]) => foot(x, y, 6, 4)),
    ],
    ellipses: POND.map(([x, y, rx, ry]) => [x, y, rx + 4, ry + 4] as [number, number, number, number]),
    hotspots: [
      {
        id: 'pray',
        label: 'หลวงปู่ทวดองค์ใหญ่',
        hint: 'กราบขอพรให้แคล้วคลาดปลอดภัย',
        icon: 'pray',
        rect: { x: 64, y: 94, w: 172, h: 214 },
        at: { x: 150, y: 338 },
        face: 'up',
        marker: { x: 150, y: 104 },
        beacon: true,
        near: 16,
      },
      { id: 'incense', label: 'กระถางธูปหน้าองค์หลวงปู่', hint: 'จุดธูปขอพร', icon: 'incense', rect: { x: 98, y: 306, w: 28, h: 26 }, at: { x: 112, y: 340 }, face: 'up', marker: { x: 112, y: 302 } },
      {
        id: 'elephant_luck',
        label: 'ลอดท้องช้าง',
        hint: 'เดินลอดใต้ท้องช้างเสริมสิริมงคล',
        icon: 'elephant',
        rect: { x: 110, y: 440, w: 80, h: 76 },
        at: { x: 150, y: 506 },
        face: 'up',
        marker: { x: 150, y: 436 },
        near: 10,
      },
      { id: `door:${HALL}`, label: 'วิหารหลวงปู่ทวด', hint: 'เข้าไปกราบหลวงปู่ทวดทองคำ', icon: 'temple', rect: { x: 204, y: 660, w: 56, h: 130 }, at: { x: VIH.x, y: 800 }, face: 'up', marker: { x: VIH.x, y: 656 }, near: 12 },
      { id: 'job:arrange_shoes', label: 'จัดรองเท้า', hint: 'รองเท้าหน้าวิหารกระจัดกระจาย ช่วยจัดหน่อย', icon: 'check', rect: { x: 184, y: 784, w: 28, h: 18 }, at: { x: 204, y: 808 }, face: 'left', marker: { x: 198, y: 782 } },
      { id: 'job:feed_fish', label: 'ให้อาหารปลาในสระบัว', hint: 'ปลาในสระหิวแล้ว ช่วยโปรยอาหารหน่อย', icon: 'koi', rect: { x: 26, y: 728, w: 100, h: 60 }, at: { x: 116, y: 718 }, face: 'down', marker: { x: 80, y: 726 } },
      { id: 'job:sweep_leaves', label: 'กวาดใบก้ามปู', hint: 'ใบไม้ร่วงเต็มลาน ช่วยกวาดหน่อย', icon: 'broom', rect: { x: 0, y: 630, w: 50, h: 30 }, at: { x: 50, y: 664 }, face: 'left', marker: { x: 30, y: 628 } },
      { id: `shop:${ID}_elephant`, label: 'ร้านตุ๊กตาช้าง', hint: 'ตุ๊กตาช้างถวาย พวงมาลัย อ้อย', icon: 'elephant', rect: { x: 228, y: 584, w: 50, h: 40 }, at: { x: 252, y: 634 }, face: 'up', marker: { x: 252, y: 580 } },
      { id: `shop:${ID}_squid`, label: 'หมึกบดหัวหิน', hint: 'ของฝากริมทะเลหัวหิน', icon: 'shop', rect: { x: 206, y: 868, w: 52, h: 40 }, at: { x: 232, y: 918 }, face: 'up', marker: { x: 232, y: 866 } },
      { id: 'gate', label: 'ประตูวัด', hint: 'กลับบ้าน หรือไปวัดอื่น', icon: 'map', rect: { x: 128, y: 800, w: 44, h: 84 }, at: { x: GATE.x, y: 874 }, face: 'down', marker: { x: GATE.x, y: 796 }, near: 12 },
    ],
    spawn: { x: GATE.x, y: 874, face: 'up' },
    entries: { [HALL]: { x: VIH.x, y: 810, face: 'down' } },
    pickupSpots: [
      { x: 84, y: 338 },
      { x: 216, y: 338 },
      { x: 30, y: 590 },
      { x: 270, y: 590 },
      { x: 150, y: 560 },
      { x: 120, y: 660 },
      { x: 180, y: 660 },
      { x: 20, y: 820 },
      { x: 150, y: 780 },
      { x: 280, y: 850 },
      { x: 200, y: 1010 },
      { x: 60, y: 1016 },
    ],
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 20 })),
      { x: 112, y: 320, r: 9, color: '#ff9a5a' },
      { x: MON.x, y: 190, r: 70, color: '#ffc888' },
      { x: VIH.x, y: 760, r: 30 },
      { x: 252, y: 600, r: 18, color: '#ffe0a0' },
      { x: 232, y: 886, r: 16, color: '#fff0c0' },
    ],
    life(s) {
      const at = H.hookAt
      return [
        new Glints(s, [...(mon.hooks.glints ?? []).map((h) => at(MON, h)), ...(vih.hooks.glints ?? []).map((h) => at(VIH, h)), ...(gate.hooks.glints ?? []).map((h) => at(GATE, h))], 1),
        new EaveBells(s, (vih.hooks.bells ?? []).map((h) => at(VIH, h)), VIH.y),
        new EaveBells(s, (gate.hooks.bells ?? []).map((h) => at(GATE, h)), GATE.y),
        ...(vih.hooks.candles ?? []).map((h) => new Flames(s, [at(VIH, h)], VIH.y)),
        Flames.candles(s, 190, 326),
        new Smoke(s, [{ x: 112, y: 312 }], 8),
        new Flags(s, [
          { x: 62, y: 302, kind: 'thai', sortY: 342 },
          { x: 238, y: 302, kind: 'dharma', sortY: 342 },
        ]),
        new KoiPond(s, POND, {
          koi: 9,
          dragonflies: 2,
          lotus: [
            [44, 744, true],
            [80, 740],
            [96, 758, true],
            [30, 778],
            [110, 780, true],
          ],
        }),
        new LuckZone(s, { x: ELE1.x - 11, y: ELE1.y - 12, w: 22, h: 16 }, ['ลอดท้องช้างแล้ว! โชคดีมีชัย~', 'เสริมสิริมงคล ปลอดภัยตลอดปี!', 'ช้างใหญ่คุ้มครองนะ~'], { x: ELE1.x, y: ELE1.y - 44 }),
        new LuckZone(s, { x: ELE2.x - 13, y: ELE2.y - 12, w: 22, h: 16 }, ['ลอดครบสองตัว ดวงดีเบิ้ล!', 'ค้าขายร่ำรวย~', 'ปู้นนน! (ช้างอวยพร)'], { x: ELE2.x, y: ELE2.y - 44 }),
        new Butterflies(s, [
          { x: 60, y: 350, w: 180, h: 40 },
          { x: 190, y: 800, w: 90, h: 30 },
          { x: 10, y: 700, w: 120, h: 40 },
        ], 6),
        new CloudShadows(s, 3),
        new SunRays(s),
        new Gags(s, hmGags()),
        new Traffic(s, [
          { y: 950, dir: 1 },
          { y: 972, dir: -1 },
        ]),
        new TapZones([
          shakeTree(s, 'rain1', RAIN1.x, RAIN1.y - 20, 110, 76, ['#ffb8d0', '#5eae55']),
          shakeTree(s, 'rain2', RAIN2.x, RAIN2.y - 20, 110, 76, ['#ffb8d0', '#5eae55']),
          {
            rect: { x: ELE1.x - 50, y: ELE1.y - 74, w: 100, h: 40 },
            fn: (x, y) => {
              s.shake('e1')
              s.say(['ปู้นนน~!', 'ลอดท้องช้างสิ ได้บุญนะ', 'ช้างศักดิ์สิทธิ์ คุ้มครองคนดี'][Math.floor(Math.random() * 3)], x, y - 6)
              sfx.hum(1)
            },
          },
          {
            rect: { x: ELE2.x - 50, y: ELE2.y - 74, w: 100, h: 40 },
            fn: (x, y) => {
              s.shake('e2')
              s.particles.hearts(x, y, 2)
              sfx.hum(3)
            },
          },
          {
            rect: { x: 10, y: 450, w: 100, h: 120 },
            fn: (x, y) => {
              s.particles.sparkles(x, y - 6, 5, '#fff3a6', 5)
              s.say(['ช้างน้อยเป็นร้อยตัว!', 'ถวายช้างขอพรให้การงานมั่นคง', 'ตัวนี้ใส่ผ้าแดงด้วย~'][Math.floor(Math.random() * 3)], x, y - 14)
              sfx.chime()
            },
          },
          {
            rect: { x: 190, y: 450, w: 100, h: 120 },
            fn: (x, y) => {
              s.particles.sparkles(x, y - 6, 5, '#fff3a6', 5)
              sfx.chime()
            },
          },
          {
            rect: { x: 80, y: 94, w: 140, h: 150 },
            fn: () => {
              s.particles.sparkles(MON.x, 160, 12, '#ffe0a0', 30)
              s.say(['หลวงปู่ทวดเหยียบน้ำทะเลจืด', 'ขอให้แคล้วคลาดปลอดภัย~', 'องค์ใหญ่ที่สุดในโลกเลย!'][Math.floor(Math.random() * 3)], MON.x, 120)
              sfx.chime()
            },
          },
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.35) {
        const t = Math.random() < 0.5 ? RAIN1 : RAIN2
        s.particles.add({ kind: 'leaf', x: t.x + rand(-40, 40), y: t.y - 70 + rand(-10, 10), vx: rand(-4, 4), vy: rand(6, 11), max: rand(2.5, 3.5), color: '#ffb8d0', color2: '#5eae55' })
      }
      if (s.isNight() && Math.random() < dt * 1) s.particles.add({ kind: 'sparkle', x: MON.x + rand(-60, 60), y: rand(110, 280), vy: rand(-6, -2), max: rand(1, 2), color: '#fff3a6', drag: 0.3 })
    },
    wander: [
      { x: 70, y: 330, w: 160, h: 10 },
      { x: 120, y: 450, w: 60, h: 250 },
      { x: 20, y: 580, w: 260, h: 110 },
      { x: 136, y: 710, w: 28, h: 150 },
      { x: 10, y: 1000, w: 280, h: 30 },
    ],
    pois: [
      { x: 140, y: 336, face: 'up' },
      { x: 160, y: 336, face: 'up' },
      { x: 112, y: 342, face: 'up' },
      { x: 150, y: 506, face: 'up' },
      { x: 150, y: 598, face: 'up' },
      { x: 110, y: 718, face: 'down' },
      { x: VIH.x, y: 800, face: 'up' },
      { x: 252, y: 634, face: 'up' },
    ],
    fireflies: [
      { x: 0, y: 620, w: 130, h: 180 },
      { x: 180, y: 400, w: 120, h: 180 },
    ],
    monkPath: [
      [VIH.x, 804],
      [150, 804],
      [150, 890],
      [-20, 890],
    ],
    birds: { x: 110, y: 640, w: 80, h: 40 },
    cats: [
      { x: 180, y: 336, pose: 'sleep', color: '#fbf3e4' },
      { x: 270, y: 818, pose: 'loaf', color: '#f5a55a' },
    ],
    novice: { x: 20, y: 590, w: 100, h: 90 },
    novices: 1,
    dogs: [],
    visitors: 6,
  }
}

// ---------------------------------------------------------------------------
// The hall: golden Luang Pu Thuat before the Buddha.

const IW = 240
const IH = 400
const THRONE = { x: 120, y: 160 }
const THUAT = { x: 120, y: 216 }

function bakeHall(g: Surface) {
  g.rect(0, 0, IW, IH, '#3a2230')
  // Back wall with deva murals and two windows.
  I.muralWall(g, 16, 8, 208, 112, I.MURAL_RED, 3)
  I.wallWindow(g, 34, 44, 16, 22)
  I.wallWindow(g, 190, 44, 16, 22)
  I.skirting(g, 16, 124, 208)
  // Side walls (seen from above: dark teak with window light).
  I.teak(g, 0, 0, 16, IH, true, 'red', 1)
  I.teak(g, 224, 0, 16, IH, true, 'red', 2)
  for (const y of [160, 250, 330]) {
    g.rect(4, y, 8, 22, '#fff0c0')
    g.rect(5, y + 1, 6, 20, '#bfe4f6')
    g.rect(228, y, 8, 22, '#fff0c0')
    g.rect(229, y + 1, 6, 20, '#bfe4f6')
  }
  // Floor.
  I.marbleFloor(g, 16, 124, 208, 256)
  I.carpet(g, 104, 230, 32, 150)
  I.mats(g, 34, 262, 4, 16)
  I.mats(g, 146, 262, 4, 16)
  I.mats(g, 34, 290, 4, 16)
  I.mats(g, 146, 290, 4, 16)
  // Front wall with the doorway.
  g.rect(0, 380, IW, 20, '#5a2a2a')
  I.teak(g, 16, 380, 84, 20, false, 'red', 3)
  I.teak(g, 140, 380, 84, 20, false, 'red', 4)
  g.rect(100, 380, 40, 20, '#fff0c0')
  g.rect(102, 382, 36, 18, '#cfe8a8')
  g.hline(100, 139, 380, T.GOLD.b)
}

export function huayMongkolHallMap(): MapDef {
  const throne = I.throneBuddha({ key: 'hm', s: 0.72, tiers: 5 })
  const thuat = HM.goldThuatSprite()
  const rackL = I.candleRackSprite(8)
  const rackR = I.candleRackSprite(8)
  const props: PlacedProp[] = [
    { sprite: throne, x: THRONE.x, y: THRONE.y },
    { sprite: thuat, x: THUAT.x, y: THUAT.y },
    { sprite: I.chatraSprite(56, 5), x: 60, y: 186 },
    { sprite: I.chatraSprite(56, 5), x: 180, y: 186 },
    { sprite: I.pillarSprite(120, 'lacquer'), x: 44, y: 250 },
    { sprite: I.pillarSprite(120, 'lacquer'), x: 196, y: 250 },
    { sprite: I.pillarSprite(120, 'lacquer'), x: 44, y: 350 },
    { sprite: I.pillarSprite(120, 'lacquer'), x: 196, y: 350 },
    { sprite: rackL, x: 76, y: 232 },
    { sprite: rackR, x: 164, y: 232 },
    { sprite: I.offeringTableSprite(34), x: 120, y: 236 },
    { sprite: I.lotusVaseSprite(), x: 92, y: 224 },
    { sprite: I.lotusVaseSprite(), x: 148, y: 224 },
    { sprite: I.gongSprite(), x: 206, y: 206 },
    { sprite: I.amuletCounterSprite(), x: 196, y: 318 },
    { sprite: I.moneyTreeSprite(), x: 26, y: 214 },
    { sprite: I.monkDaisSprite(60, 3), x: 22, y: 330 },
    { sprite: H.mopBucketSprite(), x: 80, y: 366 },
    { sprite: H.shoeRackSprite(false), x: 176, y: 380 },
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ sprite: HM.miniElephantSprite(i + 11), x: 30 + (i % 3) * 18, y: 180 + Math.floor(i / 3) * 16 })),
  ]
  return {
    id: HALL,
    place: ID,
    area: 'wat',
    indoor: true,
    indoorLight: 0.75,
    w: IW,
    h: IH,
    skyH: 0,
    ground: '#3a2230',
    camBias: 0.6,
    bake: bakeHall,
    props,
    obstacles: [
      { x: 0, y: 0, w: IW, h: 214 },
      { x: 0, y: 0, w: 16, h: IH },
      { x: 224, y: 0, w: 16, h: IH },
      { x: 0, y: 382, w: 100, h: 18 },
      { x: 140, y: 382, w: 100, h: 18 },
      foot(76, 232, 40, 8),
      foot(164, 232, 40, 8),
      foot(120, 236, 34, 6),
      foot(92, 224, 10, 5),
      foot(148, 224, 10, 5),
      foot(44, 250, 12, 6),
      foot(196, 250, 12, 6),
      foot(44, 350, 12, 6),
      foot(196, 350, 12, 6),
      foot(196, 318, 44, 10),
      { x: 22, y: 318, w: 60, h: 12 },
      foot(80, 366, 12, 5),
      foot(176, 380, 26, 6),
    ],
    hotspots: [
      {
        id: 'pray',
        label: 'หลวงปู่ทวดทองคำ',
        hint: 'กราบพระ สวดมนต์ ขอพรหลวงปู่',
        icon: 'pray',
        rect: { x: 70, y: 60, w: 100, h: 160 },
        at: { x: 120, y: 252 },
        face: 'up',
        marker: { x: 120, y: 80 },
        beacon: true,
        near: 16,
      },
      { id: 'job:light_candles', label: 'จุดเทียนบนราว', hint: 'ช่วยจุดเทียนบูชาให้สว่างทั่ววิหาร', icon: 'incense', rect: { x: 54, y: 212, w: 40, h: 20 }, at: { x: 76, y: 246 }, face: 'up', marker: { x: 76, y: 210 } },
      { id: 'job:polish_brass', label: 'ขัดฆ้องทองเหลือง', hint: 'ขัดฆ้องให้เงาวับ', icon: 'sparkle', rect: { x: 192, y: 174, w: 28, h: 32 }, at: { x: 206, y: 222 }, face: 'up', marker: { x: 206, y: 172 } },
      { id: 'job:mop_floor', label: 'ถูพื้นหินอ่อน', hint: 'พื้นวิหารเปื้อนรอยเท้า ช่วยถูหน่อย', icon: 'broom', rect: { x: 60, y: 340, w: 40, h: 30 }, at: { x: 96, y: 362 }, face: 'left', marker: { x: 80, y: 340 } },
      { id: `door:${ID}`, label: 'ออกจากวิหาร', hint: 'กลับไปลานช้าง', icon: 'map', rect: { x: 100, y: 374, w: 40, h: 26 }, at: { x: 120, y: 394 }, face: 'down', marker: { x: 120, y: 376 }, near: 12 },
    ],
    spawn: { x: 120, y: 368, face: 'up' },
    entries: { [ID]: { x: 120, y: 368, face: 'up' } },
    pickupSpots: [],
    lights: [
      { x: THRONE.x, y: 110, r: 40, color: '#ffd890' },
      { x: THUAT.x, y: 160, r: 28, color: '#ffe0a0' },
      { x: 76, y: 222, r: 14, color: '#ffb35a' },
      { x: 164, y: 222, r: 14, color: '#ffb35a' },
      { x: 42, y: 56, r: 16, color: '#fff6d8' },
      { x: 198, y: 56, r: 16, color: '#fff6d8' },
    ],
    life(s) {
      const at = H.hookAt
      return [
        new Flames(s, (rackL.hooks.flames ?? []).map((h) => at({ x: 76, y: 232 }, h)), 232),
        new Flames(s, (rackR.hooks.flames ?? []).map((h) => at({ x: 164, y: 232 }, h)), 232),
        ...(throne.hooks.candles ?? []).map((h) => new Flames(s, [at(THRONE, h)], THRONE.y)),
        ...(thuat.hooks.candles ?? []).map((h) => new Flames(s, [at(THUAT, h)], THUAT.y)),
        new Glints(s, [...(throne.hooks.glints ?? []).map((h) => at(THRONE, h)), ...(thuat.hooks.head ?? []).map((h) => at(THUAT, h))], 1.2),
        new Smoke(s, [{ x: 120, y: 226 }], 3),
        new LightShafts(s, [
          { x: 34, y: 66, w: 16, h: 150, dx: 30 },
          { x: 190, y: 66, w: 16, h: 150, dx: -30 },
          { x: 104, y: 380, w: 32, h: 20, dx: 0, a: 0.05 },
        ]),
        new DustMotes(s, [
          { x: 44, y: 80, w: 40, h: 130 },
          { x: 170, y: 80, w: 40, h: 130 },
        ]),
        new Gags(s, hallGags()),
        new TapZones([
          {
            rect: { x: 180, y: 180, w: 50, h: 50 },
            fn: () => {
              sfx.bigBell()
              s.particles.add({ kind: 'ripple', x: 206, y: 190, max: 1, size: 14, color: '#fff0c0' })
            },
          },
          {
            rect: { x: 20, y: 160, w: 60, h: 40 },
            fn: (x, y) => {
              s.particles.sparkles(x, y, 6, '#fff3a6', 6)
              s.say('ช้างน้อยที่ญาติโยมนำมาถวาย~', x, y - 10)
              sfx.chime()
            },
          },
        ]),
      ]
    },
    wander: [{ x: 30, y: 260, w: 180, h: 100 }],
    pois: [
      { x: 110, y: 250, face: 'up' },
      { x: 130, y: 250, face: 'up' },
      { x: 60, y: 270, face: 'up' },
      { x: 180, y: 270, face: 'up' },
      { x: 196, y: 334, face: 'up' },
    ],
    cats: [{ x: 210, y: 360, pose: 'sleep', color: '#5a4a5e' }],
    dogs: [],
    visitors: 3,
  }
}

function hallGags(): Gag[] {
  const kid = look({ gender: 'f', hair: 'hair_twin', top: 'top_school_f', bottom: 'bot_school_skirt' })
  const auntie = look({ gender: 'f', hair: 'hair_short', hairColor: 6, top: 'top_thaisilk', bottom: 'bot_sin_mudmee' })
  return [
    {
      x: 150, y: 278, lines: ['ขอให้สอบได้ที่หนึ่งนะคะหลวงปู่', 'สาธุ~', 'หนูจะตั้งใจเรียนค่ะ'],
      draw: (g, p) => drawPerson(g, kid, p, 'back', [], 'kneel'),
      react: (sc, x, y) => sc.particles.hearts(x, y - 20, 2),
    },
    {
      x: 88, y: 300, lines: ['เหยียบน้ำทะเลจืด หลวงปู่ทวดช่วยด้วย', 'ป้ามาแก้บนจ้ะ', 'ขอให้ลูกขับรถปลอดภัย'],
      draw: (g, p) => drawPerson(g, auntie, p, 'back', [], 'wai'),
    },
    {
      x: 204, y: 310, h: 30, lines: ['ขอให้แคล้วคลาดปลอดภัยนะโยม', 'รับน้ำมนต์หน่อยไหม', 'พระเครื่องหลวงปู่ทวด ให้บูชาได้'],
      draw: (g, p) => {
        const s = monkSprite('front', p.react > 0 ? 'bless' : 'stand', { skin: 2 })
        drawShadow(g, p.x, p.y, 6, 2)
        g.draw(s.canvas, Math.round(p.x - s.w / 2), Math.round(p.y - s.h + 1))
      },
      react: (sc, x, y) => {
        for (let i = 0; i < 7; i++) sc.particles.add({ kind: 'drop', x: x - 4, y: y - 22, vx: rand(-24, -4), vy: rand(-22, -6), g: 80, max: 0.6, color: '#c8f4fa' })
        sfx.splash()
      },
    },
  ]
}

export type { WorldScene }

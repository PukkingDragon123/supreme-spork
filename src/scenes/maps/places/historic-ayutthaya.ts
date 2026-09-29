// วัดมหาธาตุ อยุธยา – the World Heritage ruins. Red-brick prangs and chedis
// (one leaning) rise over the broken cloister wall, rows of headless Buddha
// images sit along the gallery, and the famous serene Buddha head peeks out
// of a bodhi tree's roots (visitors kneel lower than it). Outside the gate:
// frog-faced tuk-tuks, a roti sai mai cart, an elephant-pants stall and
// elephants strolling along Bueng Phra Ram.
//
// Maps: 'wat_mahathat_ayutthaya' (grounds + street) and
// 'wat_mahathat_ayutthaya:ruin' (the viharn ruin with a great Buddha under the sky).

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as F from '../../../art/templeprops'
import * as G from '../../../art/garden'
import * as M from '../../../art/modern'
import { road } from '../common'
import { drawPerson, drawPhoneMonk, drawSpriteGag, Gags, gagFx, type Gag } from '../../gags'
import { Butterflies, CloudShadows, Flames, Glints, KoiPond, Smoke, SunRays, TapZones, Traffic } from '../../life'
import * as A from '../../../art/places/historic-ayutthaya'
import * as H from '../../../art/places/historic'
import { Floodlights, foot, look, PerchedBirds, shakeTree, walkerGag } from './historic-common'

const ID = 'wat_mahathat_ayutthaya'
const RUIN = 'wat_mahathat_ayutthaya:ruin'
const P_RED = '#b8343f'

// ---------------------------------------------------------------------------
// Outdoor grounds

const W = 300
const HH = 980

const PRANG = { x: 150, y: 330 }
const PRANG_L = { x: 70, y: 322 }
const PRANG_R = { x: 232, y: 322 }
const LEAN = { x: 22, y: 304 }
const ARCH = { x: 150, y: 364 }
const HEAD = { x: 236, y: 566 }
const RAIN = { x: 40, y: 606 }
const URN = { x: 150, y: 418 }
const POND: [number, number, number, number][] = [
  [150, 918, 72, 24],
  [92, 930, 30, 15],
  [208, 930, 32, 15],
]
const STUMPS: [number, number, number][] = [
  [30, 428, 22],
  [56, 428, 30],
  [82, 428, 16],
  [108, 428, 26],
  [30, 466, 14],
  [56, 466, 24],
  [82, 466, 34],
  [108, 466, 18],
]
const LAMPS: [number, number][] = [
  [128, 452],
  [172, 452],
  [128, 580],
  [172, 580],
  [20, 712],
  [280, 712],
]

function bakeGrounds(g: Surface, night: boolean) {
  A.ayutthayaSkyline(g, 110, W, night)
  G.treeLine(g, 104, W, G.LEAVES.far, 4)
  G.treeLine(g, 120, W, G.LEAVES.deep, 9)
  G.lawn(g, 0, 132, W, 568, 17)
  G.groundShadow(g, 150, 140, 150, 14, 0.5)
  // Dry brick-dust ground inside the cloister and along the walls.
  H.brickPath(g, 0, 300, W, 70, 3)
  G.weather(g, 0, 300, W, 70, 5, 0.6)
  // Paths.
  H.brickPath(g, 138, 366, 24, 334, 7)
  H.brickPath(g, 20, 492, 118, 14, 8)
  H.brickPath(g, 162, 492, 60, 14, 9)
  H.brickPath(g, 112, 400, 76, 34, 10)
  G.weather(g, 138, 366, 24, 334, 3, 0.5)
  // Old viharn foundation with its column stumps.
  H.brickFootprint(g, 16, 406, 108, 74, 12)
  H.brickPath(g, 20, 410, 100, 66, 13)
  G.weather(g, 20, 410, 100, 66, 14, 1.2)
  // Ruin fragments in the grass.
  H.brickFootprint(g, 190, 404, 40, 26, 15)
  H.brickFootprint(g, 176, 620, 30, 18, 16)
  for (let i = 0; i < 26; i++) {
    const x = 6 + ((i * 97) % 288)
    const y = 520 + ((i * 53) % 150)
    if (x > 132 && x < 168) continue
    g.rect(x, y, 3, 2, i % 2 ? '#c96a48' : '#aa4f38')
    g.px(x, y, '#ec9c72')
  }
  // Tree shadows and leaf litter.
  G.groundShadow(g, HEAD.x, HEAD.y - 6, 50, 10, 0.7)
  G.groundShadow(g, RAIN.x + 8, RAIN.y - 8, 52, 12, 0.7)
  G.leafLitter(g, 0, 560, 110, 90, 110, 21)
  G.leafLitter(g, 176, 520, 124, 80, 60, 22)
  G.leafLitter(g, 20, 410, 100, 66, 30, 23)
  // Flower beds by the entrance.
  G.flowerBed(g, 178, 628, 58, 10, ['#f58f35', '#ffd23f', '#ffbb66'], 3)
  G.flowerBed(g, 20, 664, 50, 8, ['#ff9fc0', '#fffaf0', '#e8514a'], 4)
  G.puddle(g, 150, 540, 5, 2)
  // Street.
  G.paving(g, 0, 700, W, 36, 6, 'grey')
  G.weather(g, 0, 700, W, 36, 8, 1.2)
  g.rect(0, 736, W, 2, '#8c8187')
  for (let x = 0; x < W; x += 8) g.rect(x, 736, 4, 2, x % 16 ? '#fffaf0' : '#e8514a')
  road(g, 0, 738, W, 46)
  for (let x = 138; x < 164; x += 5) g.rect(x, 740, 3, 42, '#f0ece6')
  g.rect(0, 784, W, 2, '#8c8187')
  // Sandy elephant trail and Bueng Phra Ram park.
  H.sand(g, 0, 786, W, 44, 31)
  for (let x = 6; x < W; x += 23) {
    g.ellipse(x, 816, 3, 1.4, '#d9bf90')
    g.ellipse(x + 11, 824, 3, 1.4, '#d9bf90')
  }
  G.lawn(g, 0, 830, W, 150, 33)
  G.pondBed(g, POND)
  const pads: [number, number, number][] = [
    [110, 912, 3],
    [180, 906, 2.5],
    [200, 930, 3],
    [96, 932, 2.5],
    [140, 930, 2],
    [226, 926, 2],
  ]
  pads.forEach(([x, y, r], i) => G.lilyPad(g, x, y, r, i))
  G.reeds(g, 66, 930, 5)
  G.reeds(g, 238, 932, 4)
  G.puddle(g, 60, 724, 5, 1.8)
}

function ayutthayaGags(): Gag[] {
  const kneeler = look({ gender: 'f', hair: 'hair_long', hairColor: 0, top: 'top_hawaii_elephant', bottom: 'bot_elephant' })
  const staff = look({ gender: 'f', hair: 'hair_bun', top: 'top_polo', bottom: 'bot_black', head: 'head_sunhat' })
  const guide = look({ gender: 'm', hair: 'hair_short', top: 'top_polo', bottom: 'bot_khaki', head: 'head_cap' })
  const painter = look({ gender: 'm', hair: 'hair_curly', hairColor: 6, top: 'top_denim', bottom: 'bot_jeans', head: 'head_sunhat' })
  const roti = look({ gender: 'f', hair: 'hair_bun', top: 'top_vendor', bottom: 'bot_sarong', head: 'head_vendorband' })
  const pants = look({ gender: 'm', hair: 'hair_short', top: 'top_hawaii_elephant', bottom: 'bot_elephant_purple' })
  const tourist2 = look({ gender: 'm', hair: 'hair_short', hairColor: 3, top: 'top_tee_white', bottom: 'bot_elephant', head: 'head_sunglasses' })
  let lizT = 0
  let blink1 = 0
  let blink2 = 0
  return [
    {
      x: 256, y: 596, lines: ['ต้องนั่งให้ต่ำกว่าเศียรพระนะ… แชะ!', 'สวยมาก สงบมาก~', 'ขอถ่ายอีกรูปนะคะ'],
      draw: (g, p) => drawPerson(g, kneeler, p, 'back', [], 'kneel'),
      react: (sc, x, y) => gagFx.flash(sc, x - 6, y + 8),
    },
    {
      x: 190, y: 594, lines: ['นั่งหรือย่อตัวให้ต่ำกว่าเศียรพระนะคะ', 'ถ่ายรูปได้ค่ะ แต่อย่ายืนค้ำเศียรพระนะคะ', 'รากโพธิ์โอบเศียรพระไว้มาเป็นร้อยปีแล้วค่ะ'],
      draw: (g, p) => drawPerson(g, staff, p, 'front'),
      react: () => sfx.chime(),
    },
    {
      x: 86, y: 540, w: 30, h: 10, lines: ['ฟ่อ~ (อาบแดดอยู่)', '(แลบลิ้นแผล็บ ๆ)', 'ตัวเงินตัวทอง… นำโชคนะจ๊ะ'],
      draw: (g, p) => {
        const sp = A.lizardSprite(p.react > 0 && Math.floor(p.t * 6) % 2 === 0 ? 1 : 0)
        g.draw(sp.canvas, Math.round(p.x - sp.ax + (lizT > 0 ? Math.round(lizT * 6) : 0)), p.y - sp.ay)
      },
      react: () => {
        lizT = 0
      },
    },
    {
      x: 204, y: 440, w: 30, h: 30, lines: ['กำลังวาดพระปรางค์ยามเช้าอยู่~', 'แสงอยุธยาสวยที่สุดตอนเย็นนะ', 'อีกนิดเดียวเสร็จแล้ว!'],
      draw: (g, p) => {
        const e = A.easelSprite()
        g.draw(e.canvas, Math.round(p.x + 6 - e.ax), p.y - e.ay - 1)
        drawPerson(g, painter, { ...p, x: p.x - 6 }, 'back')
      },
      react: (sc, x, y) => sc.particles.sparkles(x + 6, y - 20, 5, '#ff9fc0', 5),
    },
    {
      x: 40, y: 499, walk: { x0: 30, x1: 128, speed: 7 }, lines: ['ทางนี้ครับ! กรุงศรีอยุธยาเป็นราชธานีถึง 417 ปี', 'วัดมหาธาตุเคยเป็นที่ประทับของพระสังฆราช', 'เดินตามธงเหลืองนะคร้าบ~'],
      draw: (g, p) => {
        drawPerson(g, guide, p, 'front')
        const fx = p.x + (p.flip ? -5 : 5)
        g.vline(fx, p.y - 34, p.y - 12, '#6e4a35')
        g.rect(fx + (p.flip ? -5 : 1), p.y - 34 + Math.round(Math.sin(p.t * 5)), 5, 4, '#ffd23f')
      },
    },
    {
      x: 64, y: 486, lines: ['เจริญพร~ อาตมามาศึกษาประวัติศาสตร์', 'พระพุทธรูปเหล่านี้ผ่านสงครามมาแล้ว', 'ขอให้ใจสงบเหมือนโบราณสถานนะโยม'],
      draw: (g, p) => drawPhoneMonk(g, p, true),
    },
    walkerGag({
      x0: 24, x1: 222, y: 820, speed: 6, fps: 3, w: 50, h: 46, shadow: [16, 3],
      frames: (f) => H.elephantSprite({ frame: f, howdah: true, mahout: true, riders: ['#ff9fc0', '#9fd0ff'], cloth: '#e8514a' }),
      lines: ['ขึ้นช้างชมกรุงเก่าไหมคะ?', 'ปู้นนน~!', 'พลายบุญมาใจดีมากจ้า'],
      react: (sc, x, y) => {
        sfx.hum(0)
        sc.particles.hearts(x + 20, y - 40, 2)
      },
    }),
    walkerGag({
      x0: 270, x1: 60, y: 826, speed: 4, fps: 2, w: 50, h: 40, shadow: [16, 3],
      frames: (f) => H.elephantSprite({ frame: f, mahout: true }),
      lines: ['ปู้น~ (ขอกล้วยหน่อย)', 'ช้างเดินเล่นตอนเย็น~', 'ตึ้บ ตึ้บ ตึ้บ'],
      react: (sc, x, y) => sc.particles.hearts(x + 20, y - 34, 3),
    }),
    {
      x: 42, y: 756, w: 40, h: 28, lines: ['ตุ๊กตุ๊กหัวกบครับ! มีที่อยุธยาที่เดียว', 'เหมารอบเกาะ ชั่วโมงละ 200 ครับ', 'อ๊บ ๆ! (แตรหัวกบ)'],
      draw: (g, p) => drawSpriteGag(g, A.frogTukTukSprite('#5ab87a', blink1 > 0), p),
      react: (sc, x, y) => {
        blink1 = 1
        setTimeout(() => (blink1 = 0), 260)
        sfx.tap()
        sc.particles.add({ kind: 'smoke', x: x - 20, y: y - 4, vx: -8, vy: -3, max: 0.9, color: '#c9c0c8', size: 2 })
      },
    },
    {
      x: 214, y: 756, w: 40, h: 28, lines: ['ไปวัดไชยวัฒนารามไหมครับ?', 'หัวกบสีส้ม วิ่งเร็วที่สุดในเกาะ!', 'อ๊บ! อ๊บ!'],
      draw: (g, p) => drawSpriteGag(g, A.frogTukTukSprite('#f58f35', blink2 > 0), p),
      react: () => {
        blink2 = 1
        setTimeout(() => (blink2 = 0), 260)
        sfx.tap()
      },
    },
    { x: 92, y: 724, lines: ['โรตีสายไหมอยุธยาแท้ ๆ จ้า', 'แป้งบางหอมใบเตย ม้วนกับสายไหม', 'ซื้อฝากคนที่บ้านไหมจ๊ะ?'], draw: (g, p) => drawPerson(g, roti, p) },
    { x: 208, y: 724, lines: ['กางเกงช้างตัวละ 150 จ้า', 'ใส่เข้าวัดได้ สุภาพเรียบร้อย', 'มีลายช้างครบทุกสีเลย!'], draw: (g, p) => drawPerson(g, pants, p) },
    {
      x: 120, y: 862, walk: { x0: 60, x1: 250, speed: 6 }, lines: ['ร้อนจัง แต่คุ้มมาก!', 'Ayutthaya is amazing!', 'เดี๋ยวไปกินก๋วยเตี๋ยวเรือกัน'],
      draw: (g, p) => drawPerson(g, tourist2, p, 'front', ['drink']),
    },
    {
      x: 272, y: 724, w: 18, h: 10, lines: ['แฮ่ก ๆ~', 'หลับอยู่หน้าวัดสบายที่สุด', 'โฮ่ง!'],
      draw: (g, p) => {
        const sp = M.sprawlDogSprite(p.react > 0)
        g.draw(sp.canvas, p.x - Math.round(sp.w / 2), p.y - sp.h + 1)
        if (p.react <= 0 && Math.floor(p.t * 1.2) % 2 === 0) g.px(p.x + 8, p.y - 8, '#e2e8ff')
      },
      react: (sc, x, y) => {
        sc.particles.hearts(x, y - 8, 3)
        sfx.bark()
      },
    },
  ]
}

export function ayutthayaMap(): MapDef {
  const prang = A.ruinPrang({ key: 'ay_c', w: 84, h: 200, seed: 11, broken: 0.28, stucco: 0.22 })
  const prangL = A.ruinPrang({ key: 'ay_l', w: 48, h: 124, seed: 23, broken: 0.12 })
  const prangR = A.ruinPrang({ key: 'ay_r', w: 48, h: 116, seed: 37, broken: 0.45 })
  const lean = A.ruinChedi({ key: 'ay_lean', w: 40, h: 108, seed: 5, lean: 9, broken: 0.08 })
  const arch = A.brickArchSprite()
  const tree = A.headTreeSprite()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)

  const props: PlacedProp[] = [
    { sprite: A.ruinChedi({ key: 'ay_far1', w: 26, h: 64, seed: 41, broken: 0.35 }), x: 110, y: 246 },
    { sprite: A.ruinChedi({ key: 'ay_far2', w: 28, h: 72, seed: 43, broken: 0.2 }), x: 194, y: 240 },
    { sprite: A.ruinChedi({ key: 'ay_far3', w: 30, h: 84, seed: 47, broken: 0.3 }), x: 282, y: 276 },
    { sprite: prang, x: PRANG.x, y: PRANG.y, id: 'prang' },
    { sprite: prangL, x: PRANG_L.x, y: PRANG_L.y },
    { sprite: prangR, x: PRANG_R.x, y: PRANG_R.y },
    { sprite: lean, x: LEAN.x, y: LEAN.y },
    { sprite: A.ruinWall(128, 22, 3), x: -4, y: 358 },
    { sprite: A.ruinWall(128, 22, 8), x: 176, y: 358 },
    { sprite: arch, x: ARCH.x, y: ARCH.y },
    { sprite: A.headlessRow(4, 7), x: -6, y: 390 },
    { sprite: A.headlessRow(4, 19), x: 180, y: 390 },
    { sprite: F.urnSprite(), x: URN.x, y: URN.y, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: 128, y: 414 },
    { sprite: F.candleStandSprite(), x: 172, y: 414 },
    { sprite: F.donationSprite(), x: 116, y: 402, shadow: [6, 2] },
    { sprite: tree, x: HEAD.x, y: HEAD.y, id: 'headtree' },
    { sprite: H.ropeFenceSprite(58), x: 206, y: 582, z: -2 },
    { sprite: A.kneelSignSprite(), x: 280, y: 600 },
    { sprite: H.rainTree(3), x: RAIN.x, y: RAIN.y, id: 'rain' },
    { sprite: H.broomSprite(), x: 58, y: 608 },
    { sprite: A.ruinChedi({ key: 'ay_mid', w: 30, h: 70, seed: 53, broken: 0.4 }), x: 110, y: 572 },
    ...STUMPS.map(([x, y, h], i) => ({ sprite: A.columnStump(h, i + 3), x, y })),
    { sprite: A.headlessRow(1, 29), x: 52, y: 416 },
    { sprite: H.oldTree(2), x: 276, y: 470, id: 'old1' },
    { sprite: G.bananaPlant(), x: 8, y: 700 },
    { sprite: A.ticketBoothSprite(), x: 100, y: 666 },
    { sprite: A.heritagePlaqueSprite(), x: 256, y: 664 },
    { sprite: H.wateringCanSprite(), x: 240, y: 640 },
    { sprite: A.ruinWall(128, 10, 71, false), x: -2, y: 690 },
    { sprite: A.ruinWall(126, 10, 73, false), x: 176, y: 690 },
    { sprite: A.gatePillarSprite(), x: 130, y: 692 },
    { sprite: A.gatePillarSprite(true), x: 170, y: 692 },
    { sprite: A.rotiSaiMaiSprite(), x: 60, y: 730 },
    { sprite: A.pantsStallSprite(), x: 240, y: 730 },
    { sprite: M.powerPoleSprite(), x: 110, y: 738 },
    { sprite: M.powerPoleSprite(), x: 190, y: 738 },
    { sprite: A.elephantDeckSprite(), x: 282, y: 810 },
    { sprite: H.signSprite('ele', 22, 12, '#fff1d6', ['#6e4a35', P_RED]), x: 12, y: 800 },
    { sprite: G.coconutPalm(0), x: 14, y: 900 },
    { sprite: G.coconutPalm(1), x: 288, y: 890 },
    { sprite: F.benchSprite(), x: 150, y: 868 },
    { sprite: H.oldTree(5, G.LEAVES.green), x: 40, y: 870, id: 'old2' },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]

  return {
    id: ID,
    place: ID,
    area: 'wat',
    w: W,
    h: HH,
    skyH: 106,
    ground: '#86c95f',
    camBias: 0.62,
    bake: bakeGrounds,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 368 },
      { x: 0, y: 368, w: 124, h: 24 },
      { x: 176, y: 368, w: 124, h: 24 },
      foot(URN.x, URN.y, 22, 8),
      foot(128, 414, 16, 6),
      foot(172, 414, 16, 6),
      foot(116, 402, 12, 6),
      { x: 198, y: 532, w: 76, h: 42 },
      { x: 206, y: 574, w: 58, h: 8 },
      foot(280, 600, 8, 5),
      foot(RAIN.x, RAIN.y, 16, 10),
      foot(110, 572, 30, 12),
      ...STUMPS.map(([x, y]) => foot(x, y, 10, 6)),
      foot(52 + 18, 416, 30, 10),
      foot(276, 470, 16, 8),
      foot(100, 666, 28, 10),
      foot(256, 664, 20, 6),
      { x: 178, y: 628, w: 58, h: 11 },
      { x: 20, y: 664, w: 50, h: 9 },
      { x: 0, y: 682, w: 124, h: 10 },
      { x: 176, y: 682, w: 124, h: 10 },
      foot(60, 730, 48, 14),
      foot(240, 730, 50, 14),
      foot(110, 738, 6, 4),
      foot(190, 738, 6, 4),
      { x: 0, y: 740, w: 136, h: 44 },
      { x: 166, y: 740, w: 134, h: 44 },
      foot(282, 810, 30, 22),
      foot(12, 800, 20, 5),
      foot(150, 868, 20, 5),
      foot(40, 870, 16, 8),
      foot(14, 900, 8, 6),
      foot(288, 890, 8, 6),
      ...LAMPS.map(([x, y]) => foot(x, y, 6, 4)),
    ],
    ellipses: POND.map(([x, y, rx, ry]) => [x, y, rx + 4, ry + 4] as [number, number, number, number]),
    hotspots: [
      {
        id: `door:${RUIN}`,
        label: 'ลานวิหารหลวง',
        hint: 'เดินลอดซุ้มประตูเข้าไปกราบพระประธานกลางแจ้ง',
        icon: 'temple',
        rect: { x: 128, y: 300, w: 44, h: 70 },
        at: { x: ARCH.x, y: 374 },
        face: 'up',
        marker: { x: ARCH.x, y: 290 },
        near: 14,
      },
      {
        id: 'pray_head',
        label: 'เศียรพระในรากโพธิ์',
        hint: 'นั่งให้ต่ำกว่าเศียรพระ แล้วสวดมนต์',
        icon: 'pray',
        rect: { x: 214, y: 520, w: 44, h: 50 },
        at: { x: 234, y: 590 },
        face: 'up',
        marker: { x: 234, y: 518 },
        beacon: true,
        near: 16,
      },
      { id: 'incense', label: 'กระถางธูปหน้าซุ้ม', hint: 'จุดธูปบูชาพระรัตนตรัย', icon: 'incense', rect: { x: 136, y: 396, w: 28, h: 24 }, at: { x: 150, y: 430 }, face: 'up', marker: { x: 150, y: 394 } },
      { id: 'donation', label: 'ตู้บำรุงโบราณสถาน', hint: 'ร่วมทำบุญดูแลโบราณสถาน', icon: 'coin', rect: { x: 108, y: 378, w: 16, h: 26 }, at: { x: 118, y: 412 }, face: 'up', marker: { x: 116, y: 376 } },
      { id: 'job:wipe_statues', label: 'เช็ดองค์พระ', hint: 'ช่วยปัดฝุ่นพระพุทธรูปแถวระเบียงคด', icon: 'sparkle', rect: { x: 186, y: 356, w: 100, h: 34 }, at: { x: 232, y: 398 }, face: 'up', marker: { x: 232, y: 352 } },
      { id: 'job:sweep_leaves', label: 'กวาดใบไม้', hint: 'ใบก้ามปูร่วงเต็มสนาม ช่วยกวาดหน่อย', icon: 'broom', rect: { x: 40, y: 600, w: 44, h: 26 }, at: { x: 72, y: 626 }, face: 'left', marker: { x: 64, y: 598 } },
      { id: 'job:water_plants', label: 'รดน้ำแปลงดอกไม้', hint: 'ดาวเรืองหน้าทางเข้ากำลังกระหายน้ำ', icon: 'water', rect: { x: 178, y: 616, w: 70, h: 26 }, at: { x: 206, y: 646 }, face: 'up', marker: { x: 206, y: 614 } },
      { id: `shop:${ID}_rotisaimai`, label: 'โรตีสายไหมป้าแดง', hint: 'ขนมขึ้นชื่อของอยุธยา', icon: 'shop', rect: { x: 36, y: 690, w: 50, h: 40 }, at: { x: 60, y: 736 }, face: 'up', marker: { x: 60, y: 686 } },
      { id: `shop:${ID}_souvenir`, label: 'ร้านกางเกงช้าง', hint: 'กางเกงช้าง พัด ของที่ระลึกกรุงเก่า', icon: 'shop', rect: { x: 214, y: 688, w: 52, h: 42 }, at: { x: 240, y: 736 }, face: 'up', marker: { x: 240, y: 686 } },
      { id: 'pond', label: 'บึงพระราม', hint: 'ให้อาหารปลาในบึง', icon: 'koi', rect: { x: 76, y: 894, w: 148, h: 50 }, at: { x: 150, y: 884 }, face: 'down', marker: { x: 150, y: 892 } },
      { id: 'gate', label: 'ทางออกโบราณสถาน', hint: 'กลับบ้าน หรือไปวัดอื่น', icon: 'map', rect: { x: 128, y: 648, w: 44, h: 44 }, at: { x: 150, y: 694 }, face: 'down', marker: { x: 150, y: 646 }, near: 12 },
    ],
    spawn: { x: 150, y: 694, face: 'up' },
    entries: { [RUIN]: { x: ARCH.x, y: 384, face: 'down' } },
    pickupSpots: [
      { x: 70, y: 400 },
      { x: 30, y: 448 },
      { x: 96, y: 448 },
      { x: 184, y: 460 },
      { x: 260, y: 510 },
      { x: 120, y: 520 },
      { x: 30, y: 540 },
      { x: 180, y: 600 },
      { x: 110, y: 640 },
      { x: 270, y: 640 },
      { x: 40, y: 846 },
      { x: 250, y: 852 },
      { x: 150, y: 802 },
      { x: 16, y: 720 },
    ],
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 20 })),
      { x: URN.x, y: URN.y - 10, r: 9, color: '#ff9a5a' },
      { x: ARCH.x, y: ARCH.y - 16, r: 16, color: '#ffd9a0' },
      { x: HEAD.x - 2, y: HEAD.y - 24, r: 14, color: '#ffe0b0' },
      { x: 60, y: 708, r: 18, color: '#ffb3cf' },
      { x: 240, y: 708, r: 16, color: '#9fd0ff' },
    ],
    life(s) {
      const at = H.hookAt
      return [
        new Floodlights(s, [
          { x: PRANG.x, y: PRANG.y - 70, r: 60, color: '#ff9a50' },
          { x: PRANG.x, y: PRANG.y - 150, r: 40, color: '#ffb070' },
          { x: PRANG_L.x, y: PRANG_L.y - 50, r: 40, color: '#ff9a50' },
          { x: PRANG_R.x, y: PRANG_R.y - 46, r: 40, color: '#ff9a50' },
          { x: LEAN.x + 4, y: LEAN.y - 50, r: 34, color: '#ffb070' },
        ]),
        new PerchedBirds(s, [at(PRANG, prang.hooks.top[0]), at(PRANG_L, prangL.hooks.top[0]), { x: at(PRANG_R, prangR.hooks.top[0]).x + 3, y: at(PRANG_R, prangR.hooks.top[0]).y }], { x: 40, y: 110, w: 230, h: 200 }),
        Flames.candles(s, 128, 414),
        Flames.candles(s, 172, 414),
        new Smoke(s, [{ x: URN.x, y: URN.y - 18 }], 6),
        new Glints(s, [{ x: HEAD.x - 4, y: HEAD.y - 34 }], 0.4),
        new Flames(s, (tree.hooks.flame ?? []).map((h) => at(HEAD, h)), HEAD.y),
        new KoiPond(s, POND, {
          koi: 8,
          dragonflies: 2,
          lotus: [
            [110, 910, true],
            [180, 904],
            [200, 928, true],
            [96, 930],
            [226, 924, true],
          ],
        }),
        new Butterflies(s, [
          { x: 176, y: 610, w: 70, h: 30 },
          { x: 20, y: 650, w: 60, h: 20 },
          { x: 60, y: 850, w: 180, h: 30 },
        ], 5),
        new CloudShadows(s, 3),
        new SunRays(s),
        new Gags(s, ayutthayaGags()),
        new Traffic(s, [
          { y: 754, dir: 1 },
          { y: 774, dir: -1 },
        ]),
        new TapZones([
          shakeTree(s, 'headtree', HEAD.x, HEAD.y - 70, 120, 70, ['#9ed86a', '#5eae55'], 'leaf'),
          shakeTree(s, 'rain', RAIN.x, RAIN.y - 30, 110, 70, ['#ffb8d0', '#5eae55'], 'leaf'),
          shakeTree(s, 'old1', 276, 470, 70, 76, ['#9ed86a', '#5eae55'], 'leaf'),
          shakeTree(s, 'old2', 40, 870, 70, 76, ['#9ed86a', '#5eae55'], 'leaf'),
          {
            rect: { x: 0, y: 356, w: 128, h: 32 },
            fn: (x, y) => {
              s.particles.sparkles(x, y - 6, 6, '#fff3a6', 6)
              s.say(['สาธุ~', 'พระพุทธรูปเก่าแก่หลายร้อยปี', 'แม้ไร้เศียรก็ยังงดงาม'][Math.floor(Math.random() * 3)], x, y - 16)
              sfx.chime()
            },
          },
          {
            rect: { x: 180, y: 356, w: 120, h: 32 },
            fn: (x, y) => {
              s.particles.sparkles(x, y - 6, 6, '#fff3a6', 6)
              sfx.chime()
            },
          },
          {
            rect: { x: 108, y: 110, w: 84, h: 200 },
            fn: () => {
              s.shake('prang')
              s.particles.sparkles(PRANG.x, PRANG.y - 160, 8, '#ffe0b0', 12)
              sfx.hum(2)
            },
          },
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.4) {
        const t = Math.random() < 0.5 ? HEAD : RAIN
        s.particles.add({ kind: 'leaf', x: t.x + rand(-40, 40), y: t.y - 90 + rand(-10, 10), vx: rand(-4, 4), vy: rand(6, 11), max: rand(2.5, 3.5), color: t === HEAD ? '#9ed86a' : '#e0a060', color2: '#5eae55' })
      }
      if (s.isNight() && Math.random() < dt * 0.8) s.particles.add({ kind: 'sparkle', x: HEAD.x + rand(-10, 10), y: HEAD.y - 26 + rand(-6, 6), vy: rand(-5, -2), max: rand(1, 2), color: '#fff3a6', drag: 0.3 })
    },
    wander: [
      { x: 20, y: 410, w: 100, h: 66 },
      { x: 130, y: 430, w: 40, h: 250 },
      { x: 20, y: 490, w: 250, h: 18 },
      { x: 170, y: 440, w: 100, h: 60 },
      { x: 10, y: 700, w: 280, h: 30 },
      { x: 20, y: 840, w: 260, h: 30 },
    ],
    pois: [
      { x: 142, y: 430, face: 'up' },
      { x: 158, y: 430, face: 'up' },
      { x: 226, y: 590, face: 'up' },
      { x: 60, y: 400, face: 'up' },
      { x: 212, y: 400, face: 'up' },
      { x: 56, y: 446, face: 'left' },
      { x: 100, y: 684, face: 'up' },
      { x: 150, y: 882, face: 'down' },
      { x: 60, y: 744, face: 'up' },
    ],
    fireflies: [
      { x: 0, y: 520, w: 110, h: 110 },
      { x: 170, y: 440, w: 130, h: 100 },
      { x: 40, y: 840, w: 220, h: 100 },
    ],
    monkPath: [
      [150, 378],
      [150, 718],
      [-20, 718],
    ],
    birds: { x: 108, y: 438, w: 84, h: 22 },
    cats: [
      { x: 92, y: 452, pose: 'loaf', color: '#8c8187' },
      { x: 20, y: 726, pose: 'sleep', color: '#f5a55a' },
    ],
    novice: { x: 140, y: 460, w: 20, h: 120 },
    novices: 1,
    dogs: [],
    visitors: 5,
  }
}


// ---------------------------------------------------------------------------
// The viharn ruin: a great Buddha under the open sky.

const RW = 256
const RH = 540
const BIG = { x: 128, y: 250 }
const COLS: [number, number, number][] = [
  [74, 296, 34],
  [74, 336, 20],
  [74, 376, 40],
  [74, 416, 26],
  [182, 296, 22],
  [182, 336, 38],
  [182, 376, 16],
  [182, 416, 30],
  [40, 450, 18],
  [216, 450, 26],
]

function bakeRuin(g: Surface, night: boolean) {
  A.ayutthayaSkyline(g, 100, RW, night)
  G.treeLine(g, 96, RW, G.LEAVES.far, 7)
  G.treeLine(g, 112, RW, G.LEAVES.deep, 11)
  G.lawn(g, 0, 124, RW, RH - 124, 41)
  H.brickPath(g, 0, 160, RW, 70, 42)
  // The viharn platform: old brick floor laid in courses.
  H.bricks(g, 22, 236, 212, 250, { seed: 43, light: 0.62, slope: 0, course: 4, len: 7, moss: 0.45 })
  // Central aisle of big laterite slabs.
  for (let y = 262; y < 486; y += 9) {
    for (let x = 100; x < 156; x += 14) {
      const o = ((y / 9) | 0) % 2 ? 7 : 0
      const xx = Math.min(155, x + o)
      const w = Math.min(13, 156 - xx)
      if (w < 3) continue
      g.rect(xx, y, w, 8, H.hsh(xx, y, 3) % 3 ? '#c9946c' : '#b98460')
      g.hline(xx, xx + w - 1, y, '#dcae84')
      for (let k = 0; k < 5; k++) g.px(xx + ((k * 5 + y) % w), y + 2 + (k % 5), '#a8704e')
    }
  }
  // Grass pushing through the joints and missing bricks.
  for (let i = 0; i < 70; i++) {
    const x = 26 + ((i * 53) % 204)
    const y = 240 + ((i * 97) % 240)
    g.px(x, y, '#7fa058')
    g.px(x + 1, y, '#8fc060')
    g.px(x, y - 1, '#a8d070')
    if (i % 5 === 0) {
      g.rect(x + 3, y + 2, 4, 3, '#6fa050')
      g.hline(x + 3, x + 6, y + 2, '#95c46a')
    }
  }
  // Side walls (top surfaces) and the front step.
  for (const x0 of [14, 234]) {
    for (let y = 226; y < 486; y++) {
      const top = (y * 7 + x0) % 23 < 3 ? -1 : 0
      for (let x = x0; x < x0 + 8; x++) g.px(x, y, H.brickColor(x, y, top ? 0.4 : x < x0 + 2 ? 0.85 : 0.62, { seed: 45 }))
    }
    g.vline(x0 + 8, 226, 486, 'rgba(58,40,56,0.25)')
  }
  H.bricks(g, 22, 486, 212, 6, { seed: 46, light: 0.5 })
  for (let y = 492; y < 512; y += 4) {
    g.rect(96, y, 64, 3, '#d9a07a')
    g.hline(96, 159, y, '#ecc09a')
    g.rect(96, y + 3, 64, 1, '#a8704e')
  }
  // Fallen leaves and flowers at the Buddha's feet.
  G.leafLitter(g, 150, 400, 80, 80, 50, 47)
  G.leafLitter(g, 26, 300, 60, 120, 30, 48)
  G.groundShadow(g, BIG.x, BIG.y + 2, 60, 8, 0.6)
  G.flowerBed(g, 30, 520, 60, 8, ['#f58f35', '#ffd23f'], 5)
  G.flowerBed(g, 166, 520, 60, 8, ['#ff9fc0', '#fffaf0'], 6)
}

export function ayutthayaRuinMap(): MapDef {
  const prang = A.ruinPrang({ key: 'ay_c', w: 84, h: 200, seed: 11, broken: 0.28, stucco: 0.22 })
  const big = A.bigRuinBuddha()
  const props: PlacedProp[] = [
    { sprite: A.ruinChedi({ key: 'ayr_1', w: 34, h: 90, seed: 61, broken: 0.15 }), x: 30, y: 196 },
    { sprite: A.ruinChedi({ key: 'ayr_2', w: 30, h: 80, seed: 67, broken: 0.35, lean: -5 }), x: 228, y: 190 },
    { sprite: prang, x: 128, y: 200 },
    { sprite: A.ruinWall(RW + 8, 24, 91), x: -4, y: 230 },
    { sprite: big, x: BIG.x, y: BIG.y },
    { sprite: A.headlessRow(1, 31), x: 30, y: 258 },
    { sprite: A.headlessRow(1, 37), x: 190, y: 258 },
    { sprite: F.urnSprite(), x: 152, y: 276, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: 100, y: 272 },
    { sprite: F.offeringSprite(), x: 126, y: 270 },
    { sprite: F.lotusJarSprite('brown'), x: 72, y: 268 },
    { sprite: F.lotusJarSprite('brown'), x: 184, y: 268 },
    ...COLS.map(([x, y, h], i) => ({ sprite: A.columnStump(h, i + 20), x, y })),
    { sprite: H.broomSprite(), x: 206, y: 432 },
    { sprite: H.oldTree(8, G.LEAVES.deep), x: 10, y: 520, id: 'rt1' },
    { sprite: H.oldTree(9), x: 250, y: 526, id: 'rt2' },
    { sprite: A.kneelSignSprite(), x: 222, y: 500 },
    { sprite: A.singhaSprite(), x: 88, y: 500 },
    { sprite: A.singhaSprite(true), x: 168, y: 500 },
    { sprite: A.headlessRow(1, 43), x: 26, y: 300 },
    { sprite: A.headlessRow(1, 47), x: 194, y: 300 },
  ]
  return {
    id: RUIN,
    place: ID,
    area: 'wat',
    w: RW,
    h: RH,
    skyH: 100,
    ground: '#86c95f',
    camBias: 0.58,
    bake: bakeRuin,
    props,
    obstacles: [
      { x: 0, y: 0, w: RW, h: 256 },
      { x: 0, y: 256, w: 22, h: 236 },
      { x: 234, y: 256, w: 22, h: 236 },
      { x: 22, y: 486, w: 74, h: 8 },
      { x: 160, y: 486, w: 74, h: 8 },
      foot(152, 276, 22, 8),
      foot(100, 272, 16, 6),
      foot(126, 270, 10, 4),
      foot(72, 268, 12, 6),
      foot(184, 268, 12, 6),
      { x: 26, y: 256, w: 36, h: 6 },
      { x: 194, y: 256, w: 36, h: 6 },
      ...COLS.map(([x, y]) => foot(x, y, 10, 6)),
      foot(10, 520, 16, 8),
      foot(250, 526, 16, 8),
      foot(222, 500, 8, 5),
      foot(88, 500, 16, 6),
      foot(168, 500, 16, 6),
      { x: 26, y: 294, w: 36, h: 6 },
      { x: 194, y: 294, w: 36, h: 6 },
    ],
    hotspots: [
      {
        id: 'pray',
        label: 'พระประธานกลางแจ้ง',
        hint: 'กราบพระ สวดมนต์ท่ามกลางซากวิหาร',
        icon: 'pray',
        rect: { x: 70, y: 110, w: 116, h: 146 },
        at: { x: 124, y: 290 },
        face: 'up',
        marker: { x: BIG.x, y: 150 },
        beacon: true,
        near: 16,
      },
      { id: 'incense', label: 'กระถางธูป', hint: 'จุดธูปบูชาพระ', icon: 'incense', rect: { x: 140, y: 258, w: 24, h: 20 }, at: { x: 154, y: 290 }, face: 'up', marker: { x: 152, y: 254 } },
      { id: 'job:light_candles', label: 'จุดเทียนบูชา', hint: 'ช่วยจุดเทียนหน้าองค์พระ', icon: 'incense', rect: { x: 90, y: 258, w: 20, h: 16 }, at: { x: 96, y: 288 }, face: 'up', marker: { x: 100, y: 256 } },
      { id: 'job:sweep_leaves', label: 'กวาดลานวิหาร', hint: 'ใบไม้ร่วงเต็มพื้นอิฐ ช่วยกวาดหน่อย', icon: 'broom', rect: { x: 150, y: 400, w: 70, h: 44 }, at: { x: 190, y: 446 }, face: 'up', marker: { x: 196, y: 404 } },
      {
        id: `door:${ID}`,
        label: 'ออกสู่ลานโบราณสถาน',
        hint: 'กลับไปที่เศียรพระในรากโพธิ์',
        icon: 'map',
        rect: { x: 96, y: 486, w: 64, h: 30 },
        at: { x: 128, y: 512 },
        face: 'down',
        marker: { x: 128, y: 490 },
        near: 12,
      },
    ],
    spawn: { x: 128, y: 480, face: 'up' },
    entries: { [ID]: { x: 128, y: 480, face: 'up' } },
    pickupSpots: [
      { x: 48, y: 320 },
      { x: 208, y: 330 },
      { x: 128, y: 360 },
      { x: 48, y: 420 },
      { x: 128, y: 450 },
      { x: 120, y: 528 },
    ],
    lights: [
      { x: 152, y: 262, r: 9, color: '#ff9a5a' },
      { x: BIG.x, y: 214, r: 44, color: '#ffc080' },
      { x: 72, y: 256, r: 10, color: '#ffe0b0' },
      { x: 184, y: 256, r: 10, color: '#ffe0b0' },
    ],
    life(s) {
      const at = H.hookAt
      return [
        new Floodlights(s, [
          { x: 128, y: 130, r: 60, color: '#ff9a50' },
          { x: 30, y: 150, r: 30, color: '#ffb070' },
          { x: 228, y: 146, r: 30, color: '#ffb070' },
        ]),
        Flames.candles(s, 100, 272),
        ...(big.hooks.candles ?? []).map((h) => new Flames(s, [at(BIG, h)], BIG.y)),
        new Smoke(s, [{ x: 152, y: 258 }], 6),
        new Glints(s, (big.hooks.glints ?? []).map((h) => at(BIG, h)), 0.6),
        new PerchedBirds(s, [at({ x: 128, y: 200 }, prang.hooks.top[0])], { x: 88, y: 0, w: 80, h: 90 }),
        new Butterflies(s, [
          { x: 30, y: 500, w: 200, h: 30 },
          { x: 40, y: 300, w: 170, h: 60 },
        ], 4),
        new CloudShadows(s, 2),
        new SunRays(s),
        new Gags(s, ruinGags()),
        new TapZones([
          shakeTree(s, 'rt1', 10, 520, 70, 76, ['#9ed86a', '#5eae55']),
          shakeTree(s, 'rt2', 250, 526, 70, 76, ['#9ed86a', '#5eae55']),
          ...COLS.map(([x, y]) => ({
            rect: { x: x - 6, y: y - 40, w: 12, h: 40 },
            fn: () => {
              s.particles.add({ kind: 'dot', x, y: y - 20, vx: rand(-8, 8), vy: rand(-6, 0), g: 40, max: 0.6, color: '#cf6a46' })
              sfx.tap()
            },
          })),
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.3) s.particles.add({ kind: 'leaf', x: rand(20, 236), y: rand(130, 200), vx: rand(-4, 4), vy: rand(6, 10), max: rand(3, 4), color: '#e0a060', color2: '#9ed86a' })
    },
    wander: [
      { x: 30, y: 300, w: 196, h: 180 },
      { x: 100, y: 490, w: 56, h: 30 },
    ],
    pois: [
      { x: 118, y: 292, face: 'up' },
      { x: 138, y: 292, face: 'up' },
      { x: 100, y: 290, face: 'up' },
      { x: 44, y: 276, face: 'up' },
      { x: 212, y: 276, face: 'up' },
    ],
    fireflies: [{ x: 20, y: 300, w: 216, h: 200 }],
    cats: [{ x: 210, y: 470, pose: 'sleep', color: '#fbf3e4' }],
    novice: { x: 40, y: 330, w: 170, h: 120 },
    dogs: [],
    visitors: 3,
  }
}

function ruinGags(): Gag[] {
  const granny = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_white', bottom: 'bot_sarong', hand: 'hand_lotus' })
  const photog = look({ gender: 'm', hair: 'hair_short', top: 'top_tee_black', bottom: 'bot_cargo', head: 'head_cap' })
  return [
    {
      x: 140, y: 302, lines: ['สาธุ… ขอให้ลูกหลานเจริญ ๆ', 'ยายมากราบพระทุกวันพระเลย', 'ดอกบัวนี้ถวายพระจ้ะ'],
      draw: (g, p) => drawPerson(g, granny, p, 'back', [], 'kneel'),
      react: (sc, x, y) => sc.particles.hearts(x, y - 20, 2),
    },
    {
      x: 206, y: 360, lines: ['ช่วงเย็นแสงส้มกระทบอิฐสวยที่สุด', 'ขอบคุณที่ไม่ยืนบังนะครับ~', 'แชะ! ได้ภาพปกแล้ว'],
      draw: (g, p) => {
        g.line(p.x - 8, p.y, p.x - 6, p.y - 14, '#3a3040')
        g.line(p.x - 4, p.y, p.x - 6, p.y - 14, '#3a3040')
        g.rect(p.x - 9, p.y - 18, 6, 4, '#3a3040')
        g.px(p.x - 5, p.y - 17, '#9fd0ff')
        drawPerson(g, photog, p, 'back')
      },
      react: (sc, x, y) => gagFx.flash(sc, x - 12, y + 6),
    },
  ]
}

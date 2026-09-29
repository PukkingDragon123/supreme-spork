// พระปฐมเจดีย์ นครปฐม – the tallest stupa in the world. From the street and
// the temple fair (ข้าวหลาม & ส้มโอ stalls, balloon darts, a ferris wheel) a
// garden path with a turtle pond leads up to the north viharn of พระร่วง-
// โรจนฤทธิ์; the circular cloister opens onto the terrace around the colossal
// orange-glazed bell. Interior: `pathom_chedi:viharn`.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as T from '../../../art/temple'
import { GOLD, WHITE } from '../../../art/temple'
import * as F from '../../../art/templeprops'
import * as G from '../../../art/garden'
import * as M from '../../../art/modern'
import { drawFerrisWheel } from '../../../art/modern'
import { road, sidewalk } from '../common'
import { CloudShadows, EaveBells, Flames, Glints, KoiPond, Lanterns, RackBells, Smoke, SunRays, TapZones, Traffic, Butterflies } from '../../life'
import { FairLights, Gags, drawPerson, type Gag } from '../../gags'
import * as A from '../../../art/places/central'
import * as PC from '../../../art/places/central-pathom'
import { bandObstacles, door, look, person, shakeTree, spot, Swimmers } from './central-kit'
import { monkSprite } from '../../../art/characters'

const W = 320
const H = 1000
const CX = 160

const CHEDI = { x: CX, y: 396 }
const RING: PC.Ring = { cx: CX, cy: 372, rx: 158, ry: 106, depth: 14 }
const VIHARN = { x: CX, y: 612 }
const GAPS: [number, number][] = [
  [66, 254],
]
const GATE = { x: CX, y: 948 }
const RAIN = { x: 254, y: 772 }
const BODHI = { x: 36, y: 700 }
const RACK = { x: 232, y: 424 }
const URN = { x: CX, y: 442 }

const POND: [number, number, number, number][] = [
  [78, 772, 40, 18],
  [52, 790, 20, 11],
  [106, 790, 20, 11],
]

const LAMPS: [number, number][] = [
  [128, 664],
  [192, 664],
  [128, 736],
  [192, 736],
  [128, 812],
  [192, 812],
]

const FRANGI = [
  { id: 'pf1', x: 26, y: 640, v: 1 },
  { id: 'pf2', x: 296, y: 646, v: 2 },
  { id: 'pf3', x: 206, y: 700, v: 0 },
]

function ringInner(x: number) {
  return PC.ringFront(RING, x, true)
}
function ringOuter(x: number) {
  return PC.ringFront(RING, x)
}

function bake(g: Surface, night: boolean) {
  // Skyline: far trees and the town beyond.
  G.treeLine(g, 146, W, G.LEAVES.far, 12)
  for (const [x, w, h] of [
    [18, 22, 18],
    [248, 26, 22],
    [284, 18, 14],
  ]) {
    g.rect(x, 150 - h, w, h + 6, night ? '#6a6a9a' : '#b8bcd0')
    for (let yy = 152 - h; yy < 152; yy += 4) for (let xx = x + 2; xx < x + w - 2; xx += 4) g.px(xx, yy, night ? '#ffe7a0' : '#9aa0c0')
  }
  G.treeLine(g, 160, W, G.LEAVES.deep, 4)
  G.lawn(g, 0, 172, W, H - 172, 41)
  // Shade trees behind the cloister.
  G.canopy(g, [[18, 214, 18], [44, 200, 14], [290, 206, 18], [304, 232, 14], [262, 196, 12]], G.LEAVES.deep, 5)
  // The cloister's back arcs behind the chedi.
  PC.bakeGalleryBack(g, RING, night)
  // Terrace inside the ring.
  A.paveEllipse(g, RING.cx, RING.cy + 4, RING.rx - 10, RING.ry - 8, A.PAVE.grey, 10)
  for (let a = 0; a < Math.PI * 2; a += 0.02) g.px(RING.cx + Math.cos(a) * (RING.rx - 10), RING.cy + 4 + Math.sin(a) * (RING.ry - 8), '#c9bfb8')
  G.weather(g, 20, 400, 280, 70, 3, 0.6)
  // Concentric circuit line for walking round the chedi (ทางประทักษิณ).
  for (let a = 0.1; a < Math.PI - 0.1; a += 0.012) g.px(CX + Math.cos(a) * 138, 376 + Math.sin(a) * 76, '#d6ccc4')
  G.groundShadow(g, CHEDI.x, CHEDI.y - 4, 130, 12, 0.8)
  // Lotus mandala in front of the urn.
  G.mandala(g, URN.x, URN.y + 16, 16)
  // Pigeon seed scatter.
  for (let i = 0; i < 40; i++) g.px(96 + ((i * 37) % 130), 404 + ((i * 17) % 22), i % 2 ? '#e0c79a' : '#c9a04c')
  // Front retaining wall of the raised terrace, and steps at the openings.
  for (let x = 86; x < 234; x++) {
    const y = Math.round(terraceFront(x))
    g.px(x, y, '#fbf6ec')
    for (let k = 1; k <= 6; k++) g.px(x, y + k, k === 1 ? WHITE.b : k < 4 ? (x % 6 === 0 ? '#c9b69a' : '#e6dccb') : k === 4 ? '#b8343f' : '#9a8a7a')
    if (x % 6 === 3) g.px(x, y + 3, GOLD.d)
  }
  for (const x0 of [64, 232]) for (let i = 0; i < 5; i++) {
    const y = 456 + i * 4
    g.rect(x0, y, 24, 4, i % 2 ? '#e4ddd6' : '#f2eee9')
    g.hline(x0, x0 + 23, y, '#ffffff')
    g.hline(x0, x0 + 23, y + 3, '#c9bfb8')
  }
  // Plaza before the north viharn and the long garden path.
  G.paving(g, 34, 612, 252, 84, 8)
  G.kerb(g, 34, 612, 252, 84)
  G.weather(g, 34, 612, 252, 84, 6, 0.8)
  G.paving(g, 144, 696, 32, 252, 8)
  g.vline(143, 696, 947, '#c9b69a')
  g.vline(176, 696, 947, '#c9b69a')
  G.weather(g, 144, 696, 32, 252, 7, 0.9)
  // Side paths down from the cloister openings.
  G.paving(g, 62, 476, 26, 138, 6)
  G.paving(g, 232, 476, 26, 138, 6)
  G.puddle(g, 150, 760, 5, 2)
  G.puddle(g, 72, 540, 4, 1.5)
  // Flower beds either side of the plaza (water them!).
  G.flowerBed(g, 40, 676, 44, 10, ['#f58f35', '#ffd23f', '#ffbb66'], 8)
  G.flowerBed(g, 236, 676, 44, 10, ['#ff9fc0', '#fffaf0', '#e8514a'], 9)
  G.flowerBed(g, 150, 696, 20, 6, ['#ffd23f', '#f58f35'], 10)
  G.hedge(g, 40, 700, 88, 5)
  G.hedge(g, 192, 700, 88, 5)
  // Turtle pond with lilies.
  G.pondBed(g, POND)
  ;[
    [58, 770, 3],
    [96, 766, 2.5],
    [86, 784, 3],
    [44, 792, 2],
    [112, 792, 2.5],
  ].forEach(([x, y, r], i) => G.lilyPad(g, x, y, r, i))
  G.reeds(g, 30, 796, 5)
  G.reeds(g, 126, 796, 4)
  // A basking rock.
  g.ellipse(70, 778, 5, 2.4, '#8c8187')
  g.ellipse(69, 777, 4, 1.6, '#bdb2ae')
  // Leaf litter under the big trees (sweep job) and a mat for the bodhi.
  G.groundShadow(g, RAIN.x, RAIN.y - 4, 44, 12, 0.7)
  G.leafLitter(g, 206, 750, 100, 60, 90, 11)
  G.groundShadow(g, BODHI.x, BODHI.y - 4, 34, 9, 0.6)
  G.leafLitter(g, 4, 690, 60, 40, 40, 12)
  for (const f of FRANGI) G.groundShadow(g, f.x, f.y, 14, 4, 0.6)
  // The fairground: trampled earth with coloured mats.
  A.dirt(g, 0, 850, W, 90, '#e6cfa2', 3)
  G.paving(g, 144, 850, 32, 98, 8)
  for (const [x, y, c] of [
    [20, 918, '#5a8de0'],
    [214, 922, '#e8514a'],
  ] as const) {
    g.rect(x, y, 30, 10, c)
    for (let i = x; i < x + 30; i += 3) g.px(i, y + 4, '#fffaf0')
  }
  // Street outside the gate.
  sidewalk(g, 0, 948, W, 12)
  road(g, 0, 960, W, 30)
  sidewalk(g, 0, 990, W, 10)
}

/** Front edge of the raised terrace paving. */
function terraceFront(x: number) {
  const u = (x - RING.cx) / (RING.rx - 10)
  return RING.cy + 4 + (RING.ry - 8) * Math.sqrt(Math.max(0, 1 - u * u))
}

function gags(): Gag[] {
  const selfie = look({ gender: 'f', hair: 'hair_long', hairColor: 3, top: 'top_hawaii' })
  const uncle = look({ gender: 'm', hair: 'hair_short', hairColor: 6, top: 'top_white', bottom: 'bot_black' })
  const student = look({ gender: 'f', hair: 'hair_schoolgirl', top: 'top_school_f', bottom: 'bot_school_skirt' })
  const auntie = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_vendor', head: 'head_sunhat' })
  const gamer = look({ gender: 'm', hair: 'hair_twoblock', top: 'top_stripe' })
  const kid = look({ gender: 'm', hair: 'hair_buzz', top: 'top_tee_lotus' })
  const grandpa = look({ gender: 'm', hair: 'hair_short', hairColor: 6, top: 'top_mohom' })
  const samlor = look({ gender: 'm', hair: 'hair_short', top: 'top_pakaoma', head: 'head_turban' })
  const lotus = look({ gender: 'f', hair: 'hair_bob', top: 'top_floral' })
  const balloon = look({ gender: 'm', hair: 'hair_short', top: 'top_polo' })
  return [
    person(112, 470, selfie, ['ถอยอีก… ถอยอีก… ยังไม่ติดยอดเลย!', 'องค์พระสูงจนกล้องเก็บไม่หมด', 'แชะ! สวยมากกก ส่งให้แม่ดู'], { view: 'back', extras: ['selfie'], react: (s, x, y) => (s.particles.sparkles(x + 6, y - 28, 8, '#ffffff', 6), sfx.click()) }),
    person(120, 418, uncle, ['รอบที่หนึ่ง… สาธุ', 'เวียนขวาสามรอบนะหลาน องค์พระอยู่ทางขวามือเรา', 'เดินรอบองค์พระทีเหนื่อยเลย แต่อิ่มบุญ'], { walk: { x0: 60, x1: 270, speed: 6 } }),
    person(206, 452, student, ['ขอให้สอบติดคณะที่หวังด้วยเถิด…', 'อ่านหนังสือแล้วจริง ๆ นะเจ้าคะ', 'สาธุ ขอเกรดสี่สักวิชาก็ยังดี'], { view: 'back', pose: 'wai' }),
    person(70, 893, auntie, ['ข้าวหลามนครปฐมแท้ ๆ จ้า', 'ส้มโอนครชัยศรี หวานฉ่ำ ชิมก่อนได้', 'เผาใหม่ ๆ ร้อน ระวังนิ้วนะลูก'], { z: -1 }),
    person(288, 904, gamer, ['ปาโดนสามลูก รับตุ๊กตาไปเลย!', 'ลูกโป่งไม่ได้ติดกาวนะ จริง ๆ!', 'เกือบแล้ว ๆ อีกนิดเดียว!'], { z: -1 }),
    person(112, 902, kid, ['ข้าวหลามหวานมันอร่อยมาก!', 'ติดฟันแล้ว… ช่วยด้วย', 'แม่ขา ซื้อส้มโอด้วยยย'], { extras: ['drink'] }),
    person(140, 800, grandpa, ['เต่าตัวนี้อายุมากกว่าตาอีกนะ', 'ช้า ๆ ได้พร้าเล่มงาม', 'ให้ผักบุ้งเต่าหน่อยไหมหลาน'], { view: 'side' }),
    person(34, 958, samlor, ['สามล้อไหมครับ ไปสถานีรถไฟ', 'นั่งสามล้อชมเมืองนครปฐมเย็นสบาย', 'ขาแข็งแรงเพราะปั่นทุกวันครับ'], { view: 'front' }),
    person(216, 633, lotus, ['ดอกบัวถวายพระร่วงจ้า', 'บัวสาย บัวหลวง สดทุกดอก', 'พับกลีบบัวสวย ๆ ให้ด้วยนะ'], { z: -1 }),
    {
      x: 200,
      y: 882,
      walk: { x0: 186, x1: 232, speed: 7 },
      h: 40,
      lines: ['ลูกโป่งจ้า ลูกโป่ง~', 'ลูกโป่งรูปเจดีย์ก็มีนะ', 'ระวังหลุดมือนะหนู!'],
      draw: (g, p) => {
        const cols = ['#ff6f91', '#ffd23f', '#6cf0c0', '#9fd0ff', '#c8a0ff']
        cols.forEach((c, i) => {
          const bx = p.x + 3 + (i - 2) * 3 + Math.round(Math.sin(p.t * 2 + i) * 1)
          const by = p.y - 36 - (i % 2) * 4
          g.line(p.x + 3, p.y - 14, bx, by + 3, '#fffaf0')
          g.circle(bx, by, 2.5, c)
          g.px(bx - 1, by - 1, '#ffffff')
        })
        drawPerson(g, balloon, p, 'front')
      },
    },
  ]
}

export function pathomChediMap(): MapDef {
  const chedi = PC.pathomChediSprite()
  const chediN = PC.pathomChediSprite(true)
  const vih = PC.pathomViharnSprite()
  const vihN = PC.pathomViharnSprite(true)
  const sideL = PC.sideViharnSprite(true)
  const sideR = PC.sideViharnSprite(false)
  const rack = T.bellRackSprite(5)
  const gate = T.gateSprite()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const strips = PC.galleryStrips(RING, GAPS, false)
  const stripsN = PC.galleryStrips(RING, GAPS, true)

  const props: PlacedProp[] = [
    { sprite: chedi, night: chediN, x: CHEDI.x, y: CHEDI.y, id: 'chedi' },
    ...strips.map((s, i) => ({ sprite: s.sprite, night: stripsN[i].sprite, x: s.x, y: s.y })),
    { sprite: sideL, x: 8, y: 372 },
    { sprite: sideR, x: W - 8, y: 372 },
    { sprite: vih, night: vihN, x: VIHARN.x, y: VIHARN.y },
    // Terrace.
    { sprite: F.urnSprite(), x: URN.x, y: URN.y, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: 136, y: 436 },
    { sprite: F.candleStandSprite(), x: 184, y: 436 },
    { sprite: rack, x: RACK.x, y: RACK.y },
    { sprite: PC.oldChediReplicaSprite(), x: 74, y: 430 },
    { sprite: F.donationSprite(), x: 202, y: 450, shadow: [6, 2] },
    { sprite: F.offeringSprite(), x: 118, y: 440 },
    { sprite: PC.stoneStatueSprite('lion'), x: 50, y: 402 },
    { sprite: PC.stoneStatueSprite('lion', true), x: 270, y: 402 },
    // North viharn forecourt.
    { sprite: PC.stoneStatueSprite('warrior'), x: 124, y: 624 },
    { sprite: PC.stoneStatueSprite('warrior', true), x: 196, y: 624 },
    { sprite: PC.stoneStatueSprite('sage'), x: 78, y: 646 },
    { sprite: PC.stoneStatueSprite('sage', true), x: 242, y: 646 },
    { sprite: A.shoeRackProp(), x: 104, y: 610 },
    { sprite: PC.lotusStandSprite(), x: 216, y: 636 },
    { sprite: A.wateringProp(), x: 94, y: 690 },
    { sprite: A.washKitProp(), x: 136, y: 636 },
    { sprite: PC.cloisterGateSprite(), x: 76, y: 478 },
    { sprite: PC.cloisterGateSprite(), x: 244, y: 478 },
    { sprite: F.flagPoleSprite(40), x: 44, y: 612 },
    { sprite: F.flagPoleSprite(40), x: 276, y: 612 },
    // Gardens.
    { sprite: A.rainTreeSprite(1), x: RAIN.x, y: RAIN.y, id: 'rain' },
    { sprite: G.bodhiTree2(), x: BODHI.x, y: BODHI.y, id: 'bodhi' },
    ...FRANGI.map((f) => ({ sprite: G.frangipani(f.v), x: f.x, y: f.y, id: f.id })),
    { sprite: A.broomProp(), x: 226, y: 796 },
    { sprite: A.leafPileProp(0), x: 240, y: 800 },
    { sprite: A.leafPileProp(1), x: 272, y: 794 },
    { sprite: F.benchSprite(), x: 206, y: 812 },
    { sprite: F.benchSprite(), x: 110, y: 824 },
    { sprite: G.bananaPlant(), x: 14, y: 820 },
    { sprite: G.shrub(0), x: 132, y: 760 },
    { sprite: G.coconutPalm(0), x: 10, y: 600 },
    { sprite: G.coconutPalm(1), x: 312, y: 596 },
    { sprite: F.spiritHouseSprite(), x: 302, y: 700 },
    // Fair.
    { sprite: PC.khaoLamStallSprite(), x: 70, y: 896 },
    { sprite: PC.fairGameStallSprite(), x: 250, y: 896 },
    { sprite: M.chaYenSprite(), x: 20, y: 904 },
    { sprite: M.planterSprite(1), x: 126, y: 940 },
    { sprite: M.planterSprite(2), x: 194, y: 940 },
    { sprite: T.wallSprite(124), x: 0, y: GATE.y },
    { sprite: T.wallSprite(124), x: 196, y: GATE.y },
    { sprite: gate, x: GATE.x, y: GATE.y },
    { sprite: PC.samlorSprite(), x: 64, y: 960 },
    { sprite: M.powerPoleSprite(), x: 100, y: 962 },
    { sprite: M.powerPoleSprite(), x: 240, y: 962 },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]

  const at = (o: { x: number; y: number }, b: T.Building, k: string) => A.hooksAt(b, k, o)

  return {
    id: 'pathom_chedi',
    area: 'wat',
    place: 'pathom_chedi',
    w: W,
    h: H,
    skyH: 150,
    ground: '#86c95f',
    camBias: 0.62,
    bake,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 336 },
      { x: 34, y: 336, w: 252, h: 24 },
      // Gallery ring (front arcs) and its far sides.
      ...bandObstacles(0, 66, (x) => (Number.isNaN(ringInner(x)) ? 300 : ringInner(x) - 4), ringOuter),
      ...bandObstacles(256, W, (x) => (Number.isNaN(ringInner(x)) ? 300 : ringInner(x) - 4), ringOuter),
      // Terrace retaining wall, the north viharn and its back.
      ...bandObstacles(88, 232, (x) => terraceFront(x) - 1, (x) => terraceFront(x) + 7),
      { x: 88, y: 474, w: 144, h: 124 },
      { x: 130, y: 596, w: 60, h: 14 },
      { x: 66, y: 472, w: 4, h: 7 },
      { x: 82, y: 472, w: 4, h: 7 },
      { x: 234, y: 472, w: 4, h: 7 },
      { x: 250, y: 472, w: 4, h: 7 },
      // Terrace furniture.
      { x: 150, y: 434, w: 20, h: 9 },
      { x: 128, y: 430, w: 16, h: 7 },
      { x: 176, y: 430, w: 16, h: 7 },
      { x: 204, y: 412, w: 56, h: 13 },
      { x: 62, y: 422, w: 24, h: 9 },
      { x: 196, y: 444, w: 12, h: 7 },
      { x: 42, y: 396, w: 16, h: 7 },
      { x: 262, y: 396, w: 16, h: 7 },
      { x: 110, y: 434, w: 16, h: 7 },
      // Forecourt.
      { x: 116, y: 618, w: 16, h: 7 },
      { x: 188, y: 618, w: 16, h: 7 },
      { x: 70, y: 640, w: 16, h: 7 },
      { x: 234, y: 640, w: 16, h: 7 },
      { x: 90, y: 602, w: 28, h: 9 },
      { x: 194, y: 624, w: 44, h: 13 },
      { x: 128, y: 630, w: 16, h: 7 },
      { x: 44, y: 950, w: 42, h: 11 },
      { x: 40, y: 676, w: 44, h: 10 },
      { x: 236, y: 676, w: 44, h: 10 },
      { x: 40, y: 700, w: 88, h: 6 },
      { x: 192, y: 700, w: 88, h: 6 },
      { x: 42, y: 606, w: 5, h: 5 },
      { x: 274, y: 606, w: 5, h: 5 },
      // Gardens.
      { x: RAIN.x - 6, y: RAIN.y - 5, w: 12, h: 6 },
      { x: BODHI.x - 26, y: BODHI.y - 16, w: 52, h: 18 },
      { x: 196, y: 808, w: 20, h: 5 },
      { x: 100, y: 820, w: 20, h: 5 },
      { x: 8, y: 814, w: 12, h: 7 },
      { x: 296, y: 692, w: 12, h: 9 },
      { x: 4, y: 594, w: 10, h: 7 },
      { x: 306, y: 590, w: 10, h: 7 },
      { x: 126, y: 754, w: 12, h: 7 },
      // Fair and gate.
      { x: 38, y: 882, w: 64, h: 15 },
      { x: 219, y: 882, w: 62, h: 15 },
      { x: 4, y: 890, w: 32, h: 15 },
      { x: 0, y: 932, w: 140, h: 16 },
      { x: 180, y: 932, w: 140, h: 16 },
      { x: 0, y: 948, w: W, h: 52 },
      ...FRANGI.map((f) => ({ x: f.x - 3, y: f.y - 3, w: 6, h: 4 })),
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    ellipses: [[CHEDI.x, 372, 128, 26], ...POND.map(([x, y, rx, ry]) => [x, y, rx + 3, ry + 3] as [number, number, number, number])],
    hotspots: [
      spot('chedi', 'องค์พระปฐมเจดีย์', 'เวียนประทักษิณ ๓ รอบ ขอพร', 'sparkle', { x: 44, y: 70, w: 232, h: 318 }, { x: CX, y: 410 }, 'up', { marker: { x: CX, y: 66 }, beacon: true, near: 16 }),
      spot('incense', 'กระถางธูปหน้าองค์พระ', 'จุดธูปขอพร', 'incense', { x: 146, y: 414, w: 28, h: 28 }, { x: CX, y: 456 }, 'up', { marker: { x: CX, y: 412 } }),
      spot('bells', 'ระฆังรอบองค์พระ', 'ตีระฆังให้ดังกังวาน', 'bell', { x: 204, y: 378, w: 56, h: 46 }, { x: RACK.x, y: 434 }, 'up', { marker: { x: RACK.x, y: 376 } }),
      spot('donation', 'ตู้ทำบุญบูรณะองค์พระ', 'ร่วมบูรณะพระปฐมเจดีย์', 'coin', { x: 194, y: 424, w: 16, h: 26 }, { x: 202, y: 458 }, 'up', { marker: { x: 202, y: 422 } }),
      door('pathom_chedi:viharn', 'วิหารพระร่วงโรจนฤทธิ์', { x: 136, y: 520, w: 48, h: 92 }, { x: CX, y: 618 }, 'up', { x: CX, y: 516 }),
      spot('job:arrange_shoes', 'ชั้นวางรองเท้าหน้าวิหาร', 'จัดรองเท้าให้เป็นระเบียบ', 'broom', { x: 90, y: 590, w: 28, h: 22 }, { x: 104, y: 618 }, 'up', { marker: { x: 104, y: 588 } }),
      spot('job:wipe_statues', 'ตุ๊กตาหินจีน', 'เช็ดตุ๊กตาหินให้สะอาด', 'broom', { x: 116, y: 592, w: 16, h: 32 }, { x: 132, y: 646 }, 'left', { marker: { x: 124, y: 590 } }),
      spot('job:water_plants', 'แปลงดอกไม้หน้าวิหาร', 'รดน้ำต้นไม้', 'broom', { x: 38, y: 664, w: 60, h: 26 }, { x: 94, y: 696 }, 'left', { marker: { x: 62, y: 664 } }),
      spot('flower_stall', 'แผงดอกบัวหน้าวิหาร', 'ดอกบัว มาลัย ธูปเทียน', 'garland', { x: 194, y: 600, w: 44, h: 38 }, { x: 216, y: 648 }, 'up', { marker: { x: 216, y: 598 } }),
      spot('pond', 'สระเต่าและปลา', 'ให้อาหารปลา ดูเต่าอาบแดด', 'koi', { x: 30, y: 752, w: 100, h: 50 }, { x: 138, y: 784 }, 'left', { marker: { x: 78, y: 750 } }),
      spot('job:sweep_leaves', 'ใต้ต้นจามจุรี', 'กวาดใบไม้ให้ลานสะอาด', 'broom', { x: 204, y: 716, w: 100, h: 90 }, { x: 234, y: 804 }, 'right', { marker: { x: 240, y: 784 } }),
      spot('shop:pathom_chedi_khaolam', 'ร้านข้าวหลาม-ส้มโอ', 'ข้าวหลามนครปฐม ส้มโอนครชัยศรี', 'shop', { x: 40, y: 856, w: 62, h: 42 }, { x: 70, y: 906 }, 'up', { marker: { x: 70, y: 854 } }),
      spot('shop:pathom_chedi_fairgame', 'ซุ้มปาลูกโป่ง', 'ปาโดนรับตุ๊กตางานวัด', 'shop', { x: 220, y: 856, w: 60, h: 42 }, { x: 250, y: 906 }, 'up', { marker: { x: 250, y: 854 } }),
      spot('gate', 'ประตูวัดด้านเหนือ', 'กลับบ้าน', 'map', { x: 138, y: 872, w: 44, h: 76 }, { x: CX, y: 936 }, 'down', { marker: { x: CX, y: 868 }, near: 12 }),
    ],
    entries: { 'pathom_chedi:viharn': { x: CX, y: 626, face: 'down' } },
    spawn: { x: CX, y: 920, face: 'up' },
    pickupSpots: [
      { x: 50, y: 416 },
      { x: 270, y: 416 },
      { x: 100, y: 462 },
      { x: 250, y: 456 },
      { x: 74, y: 520 },
      { x: 246, y: 560 },
      { x: 60, y: 650 },
      { x: 262, y: 656 },
      { x: 24, y: 740 },
      { x: 186, y: 760 },
      { x: 116, y: 850 },
      { x: 296, y: 780 },
      { x: 136, y: 920 },
      { x: 300, y: 920 },
    ],
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      { x: CHEDI.x, y: 250, r: 70, color: '#ffc870' },
      { x: CHEDI.x, y: 140, r: 30, color: '#ffe7a0' },
      { x: CX, y: 520, r: 26 },
      { x: CX, y: 424, r: 10, color: '#ff9a5a' },
      { x: 70, y: 872, r: 18, color: '#ffcf7a' },
      { x: 250, y: 872, r: 18, color: '#ffb3cf' },
      { x: GATE.x, y: 904, r: 24 },
      { x: 8, y: 342, r: 12 },
      { x: W - 8, y: 342, r: 12 },
    ],
    life(s) {
      const pond = new KoiPond(s, POND, { koi: 6, dragonflies: 2, lotus: [[60, 768, true], [98, 764], [44, 790, true], [110, 790]] })
      const turtles = new Swimmers(s, POND, 3, (g, x, y, t, flip) => PC.drawTurtle(g, x, y, t, flip), 3)
      const glints = [...at(CHEDI, chedi, 'glints'), ...at(VIHARN, vih, 'glints'), ...at({ x: 8, y: 372 }, sideL, 'glints'), ...at({ x: W - 8, y: 372 }, sideR, 'glints'), ...at(GATE, gate, 'glints')]
      // Little bells hung along the inner cloister eaves.
      const galBells: { x: number; y: number }[] = []
      for (const x of [24, 40, 56, 264, 280, 296]) galBells.push({ x, y: Math.round(ringOuter(x)) - 24 })
      return [
        pond,
        turtles,
        new Glints(s, glints, 1.6),
        new EaveBells(s, at(VIHARN, vih, 'bells'), VIHARN.y),
        new EaveBells(s, [...at({ x: 8, y: 372 }, sideL, 'bells'), ...at({ x: W - 8, y: 372 }, sideR, 'bells')], 372),
        new EaveBells(s, galBells, 480),
        new EaveBells(s, at(GATE, gate, 'bells'), GATE.y),
        new RackBells(s, at(RACK, rack, 'bells'), { x: RACK.x - 28, y: RACK.y - 44, w: 56, h: 44 }, RACK.y),
        ...at(VIHARN, vih, 'candles').map((p) => new Flames(s, [p], VIHARN.y)),
        Flames.candles(s, 136, 436),
        Flames.candles(s, 184, 436),
        new Smoke(s, [{ x: URN.x, y: URN.y - 14 }], 7),
        new Smoke(s, [{ x: 56, y: 884 }], 3),
        new Lanterns(s, [
          { x0: 40, y0: 852, x1: 140, y1: 852, n: 7, sag: 6 },
          { x0: 180, y0: 852, x1: 282, y1: 852, n: 7, sag: 6 },
        ]),
        new FairLights(s, [
          { x0: 44, y0: 612, x1: 276, y1: 612, n: 18, sag: 14 },
          { x0: 128, y0: 836, x1: 192, y1: 836, n: 6, sag: 6 },
        ]),
        new Butterflies(s, [
          { x: 40, y: 660, w: 60, h: 30 },
          { x: 230, y: 660, w: 60, h: 30 },
          { x: 30, y: 740, w: 100, h: 40 },
        ], 6),
        new CloudShadows(s, 3),
        new SunRays(s),
        new Traffic(s, [
          { y: 970, dir: 1 },
          { y: 984, dir: -1 },
        ]),
        { glow: (g: Surface, t: number) => s.isNight() && drawFerrisWheel(g, 288, 806, 26, t, true, 868) },
        new TapZones([
          shakeTree(s, 'rain', RAIN.x, RAIN.y - 10, 90, ['#6cb85c', '#3f8a4f'], 'leaf', 50),
          shakeTree(s, 'bodhi', BODHI.x, BODHI.y - 10, 70, ['#9ed86a', '#5eae55'], 'leaf', 50),
          ...FRANGI.map((f) => shakeTree(s, f.id, f.x, f.y + 6, 40, f.v >= 2 ? ['#ffc4d8', '#ffe45e'] : ['#fffaf0', '#ffd23f'], 'petal', 34)),
          {
            rect: { x: 60, y: 80, w: 200, h: 250 },
            fn: (x: number, y: number) => {
              s.shake('chedi', 0.2)
              s.particles.sparkles(x, y, 10, '#fff3a6', 10)
              sfx.chime()
            },
          },
        ]),
        new Gags(s, gags()),
      ]
    },
    decor(g, t, s) {
      if (!s.isNight()) drawFerrisWheel(g, 288, 806, 26, t, false, 868)
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.4) {
        const f = FRANGI[Math.floor(Math.random() * FRANGI.length)]
        if (s.onScreen(f.x, f.y, 30)) s.particles.add({ kind: 'petal', x: f.x + rand(-14, 14), y: f.y - 30, vx: rand(-3, 3), vy: rand(6, 10), max: rand(2.4, 3.4), color: f.v >= 2 ? '#ffc4d8' : '#fffaf0', color2: '#ffe45e' })
      }
      if (Math.random() < dt * 0.35) s.particles.add({ kind: 'leaf', x: RAIN.x + rand(-40, 40), y: RAIN.y - 60, vx: rand(-4, 4), vy: rand(6, 11), max: 3, color: '#6cb85c', color2: '#3f8a4f' })
      // Floodlit sparkle around the chedi at night.
      if (s.isNight() && Math.random() < dt * 2) s.particles.add({ kind: 'sparkle', x: CHEDI.x + rand(-90, 90), y: rand(90, 330), vy: rand(-6, -2), max: rand(1, 2), color: '#ffe7a0', drag: 0.3 })
    },
    wander: [
      { x: 50, y: 404, w: 220, h: 44 },
      { x: 40, y: 620, w: 240, h: 50 },
      { x: 146, y: 700, w: 28, h: 230 },
      { x: 196, y: 730, w: 100, h: 60 },
      { x: 30, y: 900, w: 260, h: 26 },
    ],
    pois: [
      { x: 146, y: 410, face: 'up' },
      { x: 174, y: 410, face: 'up' },
      { x: 160, y: 456, face: 'up' },
      { x: 232, y: 436, face: 'up' },
      { x: 152, y: 620, face: 'up' },
      { x: 168, y: 620, face: 'up' },
      { x: 138, y: 784, face: 'left' },
      { x: 70, y: 908, face: 'up' },
      { x: 250, y: 908, face: 'up' },
    ],
    fireflies: [
      { x: 0, y: 700, w: 140, h: 130 },
      { x: 196, y: 700, w: 124, h: 130 },
    ],
    monkPath: [
      [CX, 622],
      [CX, 930],
      [CX, 968],
      [-20, 968],
    ],
    birds: { x: 90, y: 400, w: 140, h: 26 },
    cats: [
      { x: 286, y: 440, pose: 'sleep', color: '#fbf3e4' },
      { x: 118, y: 690, pose: 'loaf', color: '#f5a55a' },
    ],
    novice: { x: 150, y: 700, w: 20, h: 120 },
    novices: 1,
    dogs: ['somo'],
    visitors: 5,
  }
}

// ---------------------------------------------------------------------------
// Interior: วิหารพระร่วงโรจนฤทธิ์ – the gilded standing Buddha in a tall red
// niche, murals of devas, red lacquer pillars and a long carpet to the door.

const IW = 240
const IH = 470
const ICX = 120
const FLOOR = 204
const BUDDHA_Y = 186
const I_PILLARS: [number, number][] = [
  [44, 270],
  [196, 270],
  [44, 340],
  [196, 340],
  [44, 410],
  [196, 410],
]

function bakeViharn(g: Surface) {
  // Coffered ceiling edge.
  g.rect(0, 0, IW, 22, '#5a1a22')
  for (let x = 4; x < IW; x += 12) {
    g.rect(x, 4, 8, 12, '#7e2436')
    g.px(x + 4, 10, GOLD.b)
    g.px(x + 3, 9, GOLD.d)
    g.px(x + 5, 11, GOLD.d)
  }
  g.rect(0, 20, IW, 2, GOLD.d)
  // Back wall with murals either side of the niche.
  g.rect(0, 22, IW, FLOOR - 22, '#e8d4a8')
  A.drawMural(g, 12, 26, 66, 146, 3)
  A.drawMural(g, 162, 26, 66, 146, 8)
  for (const x of [10, 78, 160, 228]) g.rect(x, 24, 2, 150, GOLD.d)
  // Dado.
  g.rect(0, 174, IW, FLOOR - 174, '#7e2436')
  g.hline(0, IW - 1, 174, GOLD.b)
  for (let x = 2; x < IW; x += 6) {
    g.px(x, 186, GOLD.d)
    g.px(x + 1, 185, GOLD.b)
    g.px(x + 2, 186, GOLD.d)
  }
  g.hline(0, IW - 1, FLOOR - 1, '#4a1a22')
  // The niche, pedestal and the image itself.
  PC.drawBuddhaNiche(g, ICX, BUDDHA_Y + 4, 70, 158)
  A.drawSculpt(g, PC.standingBuddha(1.12), ICX, BUDDHA_Y)
  PC.drawLotusPedestal(g, ICX, BUDDHA_Y - 1, 40, 11)
  // Floor: warm marble with a sheen of the golden image.
  A.marbleFloor(g, 0, FLOOR, IW, IH - FLOOR - 12, '#efe0cc', '#e2ccb2', 10, '#c8a888')
  A.sheen(g, ICX, FLOOR + 2, 50, 40, '#ffe7a0', 0.45)
  // Gold railing in front of the image.
  g.rect(78, 212, 84, 2, GOLD.b)
  g.hline(78, 161, 212, GOLD.L)
  for (let x = 79; x < 162; x += 6) {
    g.rect(x, 214, 2, 6, GOLD.d)
    g.px(x, 214, GOLD.l)
  }
  g.rect(78, 219, 84, 1, GOLD.D)
  // Carpet runner to the door.
  A.carpet(g, ICX - 14, 232, 28, IH - 244, '#b8343f', '#7e2436', GOLD.d)
  // Side walls.
  for (const [x0, dir] of [
    [0, 1],
    [IW - 10, -1],
  ] as const) {
    g.rect(x0, 22, 10, IH - 22, '#6e2a2a')
    g.rect(dir > 0 ? x0 + 9 : x0, 22, 1, IH - 22, '#4a1a22')
    for (const wy of [228, 300, 372]) {
      g.rect(x0 + 2, wy, 6, 40, GOLD.d)
      g.rect(x0 + 3, wy + 1, 4, 38, '#fff3d0')
      g.rect(x0 + 3, wy + 1, 1, 38, '#ffffff')
      g.hline(x0 + 3, x0 + 6, wy + 20, GOLD.d)
    }
  }
  // Front wall with the bright doorway.
  g.rect(0, IH - 12, IW, 12, '#6e2a2a')
  g.hline(0, IW - 1, IH - 12, GOLD.d)
  g.rect(ICX - 16, IH - 12, 32, 12, '#fff6dc')
  g.rect(ICX - 14, IH - 10, 28, 10, '#fffdf2')
  for (let i = 0; i < 16; i++) g.px(ICX - 16 + ((i * 7) % 32), IH - 14 - (i % 3), '#fff3c4')
  // Worshippers' mats.
  for (const [x, y] of [
    [94, 250],
    [146, 250],
    [94, 280],
    [146, 280],
  ]) {
    g.rect(x - 8, y - 3, 16, 7, '#c9a06a')
    g.frame(x - 8, y - 3, 16, 7, '#9a6a45')
  }
}

function viharnGags(): Gag[] {
  const w1 = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_white', bottom: 'bot_sarong' })
  const w2 = look({ gender: 'm', hair: 'hair_short', top: 'top_white' })
  const kid = look({ gender: 'f', hair: 'hair_twin', top: 'top_school_f', bottom: 'bot_school_skirt' })
  const guide = look({ gender: 'm', hair: 'hair_curtain', top: 'top_polo', hand: 'hand_phone' })
  return [
    person(92, 252, w1, ['สาธุ… ขอให้ลูกหลานปลอดภัย', 'พระร่วงศักดิ์สิทธิ์มากนะ', 'กราบสามครั้งนะหลาน'], { view: 'back', pose: 'kneel' }),
    person(148, 252, w2, ['ขอให้ค้าขายดี ๆ นะครับ', 'สาธุ…', 'องค์พระสูงเจ็ดเมตรกว่าเลยนะ'], { view: 'back', pose: 'wai' }),
    person(96, 282, kid, ['พระพุทธรูปยกมือทำไมคะ', 'ห้ามญาติทะเลาะกันไงลูก… แม่บอกนะ', 'หนูจะไม่แย่งขนมน้องแล้ว'], { view: 'back', pose: 'kneel' }),
    person(176, 300, guide, ['พระร่วงโรจนฤทธิ์ ปางห้ามญาติ ครับทุกท่าน', 'รัชกาลที่ ๖ ทรงโปรดให้อัญเชิญมาประดิษฐานที่นี่', 'ถ่ายรูปได้ แต่ห้ามเปิดแฟลชนะครับ'], { view: 'front' }),
    {
      x: 206,
      y: 246,
      w: 16,
      h: 24,
      lines: ['ขอให้เจริญพร~', 'รับน้ำมนต์หน่อยโยม', 'อายุ วรรณะ สุขะ พละ'],
      draw: (g, p) => {
        g.rect(p.x - 10, p.y - 3, 20, 5, '#c9a06a')
        g.frame(p.x - 10, p.y - 3, 20, 5, '#9a6a45')
        const sp = monkSprite('front', p.react > 0 ? 'bless' : 'stand', { skin: 2 })
        g.draw(sp.canvas, Math.round(p.x - sp.w / 2), Math.round(p.y - sp.h + 3))
        g.ellipse(p.x - 8, p.y - 2, 3, 1.4, GOLD.d)
        g.ellipse(p.x - 8, p.y - 2.5, 2, 0.8, '#9fd0ff')
      },
      react: (s, x, y) => {
        for (let i = 0; i < 8; i++) s.particles.add({ kind: 'drop', x: x - 4, y: y - 20, vx: rand(-30, 10), vy: rand(-30, -10), g: 90, max: 0.6, color: '#c8f4fa' })
        sfx.splash()
      },
    },
  ]
}

export function pathomViharnMap(): MapDef {
  const props: PlacedProp[] = [
    ...I_PILLARS.map(([x, y]) => ({ sprite: A.pillarProp(y - 16, '#b8343f', GOLD.d, 10), x, y, shadow: [9, 3] as [number, number] })),
    { sprite: A.offeringTableProp(46), x: ICX, y: 230 },
    { sprite: F.candleStandSprite(), x: 104, y: 226 },
    { sprite: F.candleStandSprite(), x: 136, y: 226 },
    { sprite: A.brassCandleProp(), x: 74, y: 226 },
    { sprite: A.brassCandleProp(), x: 166, y: 226 },
    { sprite: A.candleRackProp(), x: 186, y: 234 },
    { sprite: F.donationSprite(), x: 56, y: 240, shadow: [6, 2] },
    { sprite: A.mopBucketProp(), x: 70, y: 312 },
    { sprite: F.lotusJarSprite('blue'), x: 24, y: 226 },
    { sprite: F.lotusJarSprite('green'), x: 216, y: 226 },
  ]
  const glints = [
    { x: ICX - 2, y: 80 },
    { x: ICX + 16, y: 104 },
    { x: ICX - 8, y: 140 },
    { x: ICX, y: 70 },
    { x: ICX - 14, y: 120 },
    { x: ICX + 4, y: 178 },
  ]
  return {
    id: 'pathom_chedi:viharn',
    area: 'wat',
    place: 'pathom_chedi',
    indoor: true,
    indoorLight: 0.9,
    w: IW,
    h: IH,
    skyH: 0,
    ground: '#5a1a22',
    camBias: 0.6,
    bake: bakeViharn,
    props,
    obstacles: [
      { x: 0, y: 0, w: IW, h: 222 },
      { x: 0, y: 0, w: 12, h: IH },
      { x: IW - 12, y: 0, w: 12, h: IH },
      { x: 0, y: IH - 12, w: ICX - 16, h: 12 },
      { x: ICX + 16, y: IH - 12, w: IW - ICX - 16, h: 12 },
      { x: 96, y: 222, w: 48, h: 9 },
      { x: 172, y: 226, w: 28, h: 9 },
      { x: 48, y: 232, w: 16, h: 9 },
      { x: 62, y: 306, w: 14, h: 7 },
      { x: 16, y: 220, w: 16, h: 8 },
      { x: 208, y: 220, w: 16, h: 8 },
      { x: 194, y: 240, w: 24, h: 8 },
      ...I_PILLARS.map(([x, y]) => ({ x: x - 7, y: y - 5, w: 14, h: 6 })),
    ],
    hotspots: [
      spot('pray', 'กราบพระร่วงโรจนฤทธิ์', 'สวดมนต์ ขอพร', 'pray', { x: 80, y: 40, w: 80, h: 190 }, { x: ICX, y: 244 }, 'up', { marker: { x: ICX, y: 72 }, beacon: true, near: 16 }),
      spot('job:light_candles', 'แท่นจุดเทียน', 'จุดเทียนถวายพระให้สว่างไสว', 'broom', { x: 172, y: 216, w: 28, h: 20 }, { x: 186, y: 246 }, 'up', { marker: { x: 186, y: 214 } }),
      spot('job:mop_floor', 'ถังน้ำและไม้ถู', 'ถูพื้นวิหารให้เงาวับ', 'broom', { x: 60, y: 290, w: 22, h: 24 }, { x: 80, y: 322 }, 'left', { marker: { x: 70, y: 288 } }),
      spot('donation', 'ตู้ทำบุญ', 'ทำบุญค่าน้ำค่าไฟวิหาร', 'coin', { x: 48, y: 214, w: 16, h: 26 }, { x: 56, y: 250 }, 'up', { marker: { x: 56, y: 212 } }),
      spot('holy_water', 'พระประพรมน้ำมนต์', 'รับน้ำมนต์เสริมสิริมงคล', 'vessel', { x: 194, y: 222, w: 24, h: 26 }, { x: 206, y: 262 }, 'up', { marker: { x: 206, y: 220 } }),
      door('pathom_chedi', 'ออกไปลานองค์พระ', { x: ICX - 18, y: IH - 34, w: 36, h: 34 }, { x: ICX, y: IH - 16 }, 'down', { x: ICX, y: IH - 30 }),
    ],
    entries: { pathom_chedi: { x: ICX, y: IH - 34, face: 'up' } },
    spawn: { x: ICX, y: IH - 34, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: ICX, y: 82, r: 26, color: '#ffc870' },
      { x: 5, y: 248, r: 18, color: '#fff3d0' },
      { x: 5, y: 320, r: 18, color: '#fff3d0' },
      { x: 5, y: 392, r: 18, color: '#fff3d0' },
      { x: IW - 5, y: 248, r: 18, color: '#fff3d0' },
      { x: IW - 5, y: 320, r: 18, color: '#fff3d0' },
      { x: IW - 5, y: 392, r: 18, color: '#fff3d0' },
      { x: ICX, y: IH - 6, r: 30, color: '#fff6dc' },
      { x: 186, y: 222, r: 12, color: '#ffb35a' },
    ],
    life(s) {
      return [
        new Glints(s, glints, 1.4),
        Flames.candles(s, 104, 226),
        Flames.candles(s, 136, 226),
        new Flames(
          s,
          [
            { x: 74, y: 199 },
            { x: 166, y: 199 },
            { x: 177, y: 221 },
            { x: 186, y: 221 },
            { x: 195, y: 221 },
          ],
          240,
        ),
        new Smoke(s, [{ x: ICX, y: 216 }], 4),
        new Gags(s, viharnGags()),
        new TapZones([
          {
            rect: { x: 90, y: 60, w: 60, h: 130 },
            fn: (x: number, y: number) => {
              s.particles.sparkles(x, y, 10, '#fff3a6', 10)
              sfx.chime()
            },
          },
        ]),
      ]
    },
    overlay(g, t) {
      // Slanting light from the side windows.
      g.ctx.save()
      g.ctx.globalCompositeOperation = 'lighter'
      for (const wy of [228, 300, 372]) {
        for (const [x0, dir] of [
          [8, 1],
          [IW - 8, -1],
        ] as const) {
          const a = 0.05 + Math.sin(t * 0.5 + wy) * 0.015
          g.ctx.fillStyle = `rgba(255,236,190,${a.toFixed(3)})`
          g.ctx.beginPath()
          g.ctx.moveTo(x0 - g.ox, wy - g.oy)
          g.ctx.lineTo(x0 - g.ox, wy + 40 - g.oy)
          g.ctx.lineTo(x0 + dir * 70 - g.ox, wy + 78 - g.oy)
          g.ctx.lineTo(x0 + dir * 70 - g.ox, wy + 44 - g.oy)
          g.ctx.closePath()
          g.ctx.fill()
        }
      }
      g.ctx.restore()
      // Dust motes in the light.
      for (let i = 0; i < 10; i++) {
        const ph = (t * 0.07 + i * 0.1) % 1
        g.px(20 + ((i * 53) % 200), 240 + ((i * 97 + Math.floor(ph * 60)) % 180), '#fff6dc')
      }
    },
    wander: [{ x: 20, y: 250, w: 200, h: 180 }],
    pois: [
      { x: 110, y: 246, face: 'up' },
      { x: 130, y: 246, face: 'up' },
      { x: 180, y: 250, face: 'up' },
      { x: 60, y: 254, face: 'up' },
    ],
    dogs: [],
    visitors: 2,
  }
}

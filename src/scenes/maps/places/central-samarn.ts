// วัดสมานรัตนาราม ฉะเชิงเทรา – the giant pink reclining Ganesha (16 m long)
// on the bank of the Bang Pakong, with a row of weekday-coloured rat statues
// whose ears take your whispered wishes (they answer back!), a garden of
// colourful deities, a Hindu-Chinese shrine hall and fish-feeding piers.
// Interior: `wat_samarn:shrine`.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as T from '../../../art/temple'
import { GOLD } from '../../../art/temple'
import * as F from '../../../art/templeprops'
import * as G from '../../../art/garden'
import * as M from '../../../art/modern'
import { drawLantern } from '../../../art/templeprops'
import { deitySculpt } from '../../../art/hall'
import { road, sidewalk } from '../common'
import { Butterflies, CloudShadows, EaveBells, Flames, Glints, Lanterns, Smoke, SunRays, TapZones, Traffic } from '../../life'
import { Gags, type Gag } from '../../gags'
import * as A from '../../../art/places/central'
import * as SM from '../../../art/places/central-samarn'
import { door, look, person, shakeTree, spot, Swimmers } from './central-kit'

const W = 340
const H = 900
const CX = 170
const RIVER = { y0: 80, y1: 170 }
const PLAT = { x: CX, y: 380, w: 290 }
const GAN = { x: CX, y: 396 }
const GAN_S = 0.95
const RATS = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ d, x: 74 + d * 30, y: 426 }))
const TABLE = { x: 292, y: 410 }
const URN = { x: CX, y: 448 }
const SHRINE = { x: CX, y: 664 }
const GATE = { x: CX, y: 860 }
const DEITIES: { id: string; x: number; y: number }[] = [
  { id: 'brahma', x: 50, y: 548 },
  { id: 'lakshmi', x: 106, y: 528 },
  { id: 'guanyin', x: 234, y: 528 },
  { id: 'naga', x: 290, y: 548 },
  { id: 'vessavana', x: 28, y: 620 },
]
const TREES = [
  { id: 'mt1', x: 42, y: 792, kind: 'rain' as const },
  { id: 'mt2', x: 300, y: 796, kind: 'bodhi' as const },
]
const CATFISH: [number, number, number, number][] = [
  [48, 162, 26, 6],
  [290, 162, 28, 6],
]
const LAMPS: [number, number][] = [
  [120, 470],
  [220, 470],
  [120, 720],
  [220, 720],
]
const WATER = { L: '#c9d8b6', b: '#8fae94', d: '#6f9282', D: '#557a70' }

const RAT_LINES = [
  ['จี๊ด! รับเรื่องไว้แล้วจ้า', 'อย่าลืมปิดหูอีกข้างนะ พรจะได้ไม่หลุด!', 'วันอาทิตย์ขอเรื่องงาน… จดแล้วจี๊ด'],
  ['จี๊ด ๆ ขอเป็นเงินสดหรือโอนดีจ๊ะ', 'พรเข้าคิวแล้ว คิวที่ ๙๙๙', 'หนูจะรีบไปบอกท่านพิฆเนศเลย!'],
  ['ไม่ต้องตะโกน หนูได้ยินแล้วจี๊ด', 'ขอพรเรื่องความรักใช่ไหม~ หนูเขินแทน', 'ชมพูวันอังคาร พรแรงสุด ๆ'],
  ['จี๊ด! ขอให้สอบผ่าน… ส่งเรื่องแล้ว', 'เขียวแปลว่าสำเร็จนะ รู้ยัง', 'หูหนูใหญ่ รับพรได้เยอะ'],
  ['วันพฤหัสครูต้องมาขอเรื่องเรียนแน่ ๆ', 'ส้มสดใส พรสดใส จี๊ด!', 'เอ๊ะ ขอหวยเหรอ… หนูไม่รู้นะ'],
  ['กระซิบเบา ๆ ก็พอจี๊ด', 'ฟ้าวันศุกร์ ขอเรื่องรักกับเงิน ได้หมด', 'ขอพรเสร็จอย่าลืมยิ้มนะ'],
  ['ม่วงวันเสาร์ ขออะไรก็ได้ แต่ต้องขยัน', 'จี๊ด… หนูง่วงแต่ยังฟังอยู่', 'พรมาแล้ว รอรับได้เลย!'],
]

function bake(g: Surface, night: boolean) {
  G.treeLine(g, 54, W, G.LEAVES.far, 41)
  g.rect(0, 74, W, 6, G.LEAVES.deep.d)
  A.waterBand(g, 0, RIVER.y0, W, RIVER.y1 - RIVER.y0, WATER, 7)
  g.rect(0, RIVER.y1, W, 8, '#bdb2ae')
  g.hline(0, W - 1, RIVER.y1, '#e4ddd6')
  g.hline(0, W - 1, RIVER.y1 + 7, '#8c8187')
  // Pier (left) and floating feeding raft (right).
  g.rect(20, 132, 52, 40, '#a06e46')
  for (let x = 20; x < 72; x += 4) g.vline(x, 132, 171, '#7a5238')
  g.hline(20, 71, 132, '#c8925e')
  g.rect(262, 138, 58, 34, '#b8904a')
  for (let y = 138; y < 172; y += 4) g.hline(262, 319, y, '#8a6a3a')
  g.rect(262, 170, 58, 2, '#3f6a7a')
  for (const x of [262, 316]) g.rect(x, 132, 4, 6, '#e8514a')
  G.paving(g, 0, RIVER.y1 + 8, W, 58, 8, 'grey')
  G.lawn(g, 0, 236, W, H - 236, 71)
  // Paths down both sides and the grand forecourt.
  G.paving(g, 6, 236, 32, 200, 8)
  G.paving(g, 302, 236, 32, 200, 8)
  G.paving(g, 6, 404, W - 12, 90, 8)
  G.kerb(g, 6, 404, W - 12, 90)
  G.weather(g, 6, 404, W - 12, 90, 3, 0.8)
  G.mandala(g, URN.x, URN.y + 20, 20)
  // The platform under the Ganesha.
  G.groundShadow(g, GAN.x, PLAT.y + 2, 150, 14, 0.8)
  SM.drawGaneshaPlatform(g, PLAT.x, PLAT.y, PLAT.w)
  // Deity garden with colourful beds.
  G.paving(g, 150, 494, 40, 170, 8)
  G.flowerBed(g, 60, 590, 60, 10, ['#ff9fc0', '#f58f35', '#ffd23f'], 3)
  G.flowerBed(g, 220, 590, 60, 10, ['#e8514a', '#ffd23f', '#fffaf0'], 4)
  for (const d of DEITIES) G.groundShadow(g, d.x, d.y - 2, 18, 5, 0.6)
  // Shrine hall forecourt and the market row.
  G.paving(g, 6, 664, W - 12, 90, 8, 'grey')
  G.kerb(g, 6, 664, W - 12, 90)
  G.paving(g, 150, 754, 40, 106, 8)
  G.leafLitter(g, 0, 770, 100, 60, 60, 21)
  G.leafLitter(g, 240, 770, 100, 60, 60, 22)
  for (const t of TREES) G.groundShadow(g, t.x, t.y - 4, 36, 9, 0.6)
  // Marigold petals everywhere near the Ganesha.
  for (let i = 0; i < 80; i++) g.px(20 + ((i * 47) % 300), 406 + ((i * 31) % 80), i % 3 ? '#f58f35' : '#ffd23f')
  sidewalk(g, 0, 860, W, 10)
  road(g, 0, 870, W, 30)
  if (night) for (let i = 0; i < 14; i++) g.hline(20 + i * 22, 24 + i * 22, 150 + (i % 3) * 5, '#ffd6e0')
}

function ratGag(r: { d: number; x: number; y: number }): Gag {
  const sp = SM.ratStatueSprite(r.d)
  return {
    x: r.x,
    y: r.y,
    w: 18,
    h: 26,
    lines: RAT_LINES[r.d],
    draw: (g, p) => {
      const hop = p.react > 1.2 ? -1 : 0
      g.draw(sp.canvas, p.x - sp.ax, p.y - sp.ay + hop)
      // Wiggling ear while listening.
      if (p.react > 0 && Math.floor(p.t * 10) % 2) g.px(p.x - 4, p.y - 23 + hop, '#ffffff')
    },
    react: (s, x, y) => {
      // Pop a coin into the box and a little heart floats up.
      s.particles.add({ kind: 'dot', x: x + 4, y: y - 14, vy: 16, g: 40, max: 0.35, color: GOLD.b })
      s.particles.sparkles(x + 4, y - 6, 5, '#fff3a6', 5)
      s.particles.hearts(x, y - 28, 1)
      sfx.coin()
    },
  }
}

function gags(): Gag[] {
  const whisper = look({ gender: 'f', hair: 'hair_long', top: 'top_uni_f', bottom: 'bot_uni_skirt' })
  const auntie = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_thaisilk', bottom: 'bot_sin_mudmee' })
  const artist = look({ gender: 'm', hair: 'hair_curtain', top: 'top_hawaii', hand: 'hand_phone' })
  const ratlady = look({ gender: 'f', hair: 'hair_bob', top: 'top_vendor', head: 'head_vendorband' })
  const mari = look({ gender: 'f', hair: 'hair_ponytail', top: 'top_floral' })
  const kid = look({ gender: 'm', hair: 'hair_buzz', top: 'top_tee_boon' })
  const feeder = look({ gender: 'm', hair: 'hair_short', top: 'top_pakaoma' })
  return [
    ...RATS.map(ratGag),
    person(160, 452, whisper, ['(กระซิบ) …ขอให้สอบผ่านนะ', 'ต้องปิดหูหนูอีกข้างด้วยนะ', 'หนูสีประจำวันเกิดเราคือตัวไหนนะ?'], { view: 'back', pose: 'offer' }),
    person(274, 426, auntie, ['องค์ท่านใหญ่มาก นอนสบายเลยนะ', 'ถวายกล้วยกับอ้อยนะลูก ท่านชอบ', 'ขอให้ค้าขายรุ่งเรือง'], { view: 'back', pose: 'wai' }),
    person(208, 476, artist, ['ขอให้งานศิลปะขายดี!', 'ท่านเป็นเทพแห่งศิลปะนะรู้ยัง', 'สเก็ตช์องค์ท่านไว้เป็นแรงบันดาลใจ'], { view: 'front' }),
    person(70, 710, ratlady, ['เหรียญหยอดหูหนูจ้า', 'พวงกุญแจหนูเจ็ดสีครบเลย', 'หนูประจำวันเกิดพกติดตัวนะ'], { z: -1 }),
    person(270, 710, mari, ['ดาวเรืองสดจ้า ท่านโปรดสีส้ม', 'กล้วย อ้อย ขนมต้มแดง ครบชุด', 'มาลัยดาวเรืองพวงใหญ่ ๆ'], { z: -1 }),
    person(116, 612, kid, ['พระพิฆเนศตัวใหญ่กว่าบ้านหนูอีก!', 'งวงยาวมากกก', 'หนูอยากนอนแบบท่านบ้าง'], { extras: ['drink'] }),
    person(52, 198, feeder, ['ปลาสวายมารอเต็มเลย!', 'โยนขนมปังทีละนิดนะ', 'ปลาตัวนี้อ้วนเท่าหมูแล้ว'], { view: 'back' }),
  ]
}

export function watSamarnMap(): MapDef {
  const sc = SM.recliningGanesha(GAN_S)
  const ganesha = A.prop('samarn-ganesha-prop', sc.canvas.width, sc.canvas.height, sc.ox, sc.oy - 1, (g) => g.draw(sc.canvas, 0, 0), false)
  const shrine = SM.shrineHallSprite()
  const shrineN = SM.shrineHallSprite(true)
  const gate = T.gateSprite()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const props: PlacedProp[] = [
    { sprite: ganesha, x: GAN.x, y: GAN.y - 14, id: 'ganesha' },
    { sprite: A.offeringTableProp(34, ['#ffe45e', '#ffe45e', '#e8514a', '#f58f35']), x: TABLE.x, y: TABLE.y },
    { sprite: F.urnSprite(), x: URN.x, y: URN.y, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: 146, y: 444 },
    { sprite: F.candleStandSprite(), x: 194, y: 444 },
    { sprite: SM.ratStatueSprite(3, true), x: 26, y: 418 },
    { sprite: F.donationSprite(), x: 318, y: 436, shadow: [6, 2] },
    ...DEITIES.map((d) => ({ sprite: SM.deityStatueSprite(d.id), x: d.x, y: d.y })),
    { sprite: A.washKitProp(), x: 78, y: 560 },
    { sprite: shrine, night: shrineN, x: SHRINE.x, y: SHRINE.y },
    { sprite: SM.ratBoothSprite(), x: 70, y: 714 },
    { sprite: SM.marigoldStallSprite(), x: 270, y: 714 },
    { sprite: A.fishFoodProp(), x: 82, y: 196 },
    { sprite: F.benchSprite(), x: 150, y: 214 },
    { sprite: F.benchSprite(), x: 200, y: 214 },
    ...TREES.map((t) => ({ sprite: t.kind === 'rain' ? A.rainTreeSprite(1) : G.bodhiTree2(), x: t.x, y: t.y, id: t.id })),
    { sprite: A.broomProp(), x: 84, y: 806 },
    { sprite: A.leafPileProp(0), x: 96, y: 812 },
    { sprite: G.coconutPalm(0), x: 12, y: 244 },
    { sprite: G.coconutPalm(1), x: 328, y: 248 },
    { sprite: G.bougainvillea(0), x: 124, y: 812 },
    { sprite: G.bougainvillea(1), x: 216, y: 812 },
    { sprite: M.planterSprite(2), x: 314, y: 700 },
    { sprite: T.wallSprite(132), x: 0, y: GATE.y },
    { sprite: T.wallSprite(132), x: 208, y: GATE.y },
    { sprite: gate, x: GATE.x, y: GATE.y },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  return {
    id: 'wat_samarn',
    area: 'shrine',
    place: 'wat_samarn',
    w: W,
    h: H,
    skyH: 56,
    ground: '#86c95f',
    camBias: 0.62,
    bake,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: RIVER.y1 + 4 },
      { x: 20, y: 150, w: 52, h: 26 },
      { x: 262, y: 150, w: 58, h: 26 },
      { x: 38, y: 236, w: 264, h: 168 },
      { x: 26, y: 380, w: 14, h: 24 },
      { x: 300, y: 380, w: 14, h: 24 },
      ...RATS.map((r) => ({ x: r.x - 8, y: r.y - 6, w: 16, h: 6 })),
      { x: 16, y: 410, w: 20, h: 9 },
      { x: TABLE.x - 17, y: TABLE.y - 8, w: 34, h: 9 },
      { x: URN.x - 10, y: URN.y - 6, w: 20, h: 9 },
      { x: 138, y: 438, w: 16, h: 7 },
      { x: 186, y: 438, w: 16, h: 7 },
      { x: 312, y: 430, w: 12, h: 7 },
      ...DEITIES.map((d) => ({ x: d.x - 14, y: d.y - 12, w: 28, h: 12 })),
      { x: 70, y: 554, w: 14, h: 7 },
      { x: 60, y: 590, w: 60, h: 10 },
      { x: 220, y: 590, w: 60, h: 10 },
      { x: 110, y: 594, w: 120, h: 58 },
      { x: 136, y: 652, w: 68, h: 10 },
      { x: 38, y: 696, w: 64, h: 17 },
      { x: 240, y: 696, w: 62, h: 17 },
      { x: 76, y: 190, w: 12, h: 7 },
      { x: 140, y: 210, w: 20, h: 5 },
      { x: 190, y: 210, w: 20, h: 5 },
      ...TREES.map((t) => (t.kind === 'rain' ? { x: t.x - 6, y: t.y - 5, w: 12, h: 6 } : { x: t.x - 26, y: t.y - 16, w: 52, h: 18 })),
      { x: 116, y: 804, w: 20, h: 9 },
      { x: 206, y: 804, w: 20, h: 9 },
      { x: 304, y: 694, w: 20, h: 7 },
      { x: 6, y: 238, w: 10, h: 7 },
      { x: 322, y: 242, w: 10, h: 7 },
      { x: 0, y: 844, w: 152, h: 16 },
      { x: 188, y: 844, w: 152, h: 16 },
      { x: 0, y: 860, w: W, h: 40 },
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      spot('pray_ganesha', 'พระพิฆเนศปางนอนเอกเขนก', 'สวดมนต์ ขอพรความสำเร็จ', 'pray', { x: 60, y: 270, w: 220, h: 130 }, { x: CX, y: 468 }, 'up', { marker: { x: 240, y: 286 }, beacon: true, near: 16 }),
      spot('ganesha', 'โต๊ะถวายองค์พระพิฆเนศ', 'ถวายกล้วย อ้อย ดาวเรือง ขอพร', 'deity', { x: 274, y: 388, w: 36, h: 24 }, { x: TABLE.x, y: 424 }, 'up', { marker: { x: TABLE.x, y: 386 } }),
      spot('incense', 'กระถางธูปหน้าองค์ท่าน', 'จุดธูปขอพร', 'incense', { x: 156, y: 420, w: 28, h: 28 }, { x: CX, y: 480 }, 'up', { marker: { x: CX, y: 418 } }),
      spot('donation', 'ตู้ทำบุญ', 'ร่วมทำบุญบำรุงวัด', 'coin', { x: 310, y: 410, w: 16, h: 26 }, { x: 318, y: 446 }, 'up', { marker: { x: 318, y: 408 } }),
      spot('river_fish', 'ท่าน้ำให้อาหารปลา', 'ปลาสวายตัวโตแหวกว่ายรออยู่', 'bread', { x: 20, y: 130, w: 52, h: 46 }, { x: 46, y: 190 }, 'up', { marker: { x: 46, y: 128 } }),
      spot('job:feed_catfish', 'แพให้อาหารปลา', 'ช่วยโปรยอาหารให้ปลาดุก', 'fishfood', { x: 262, y: 136, w: 58, h: 40 }, { x: 290, y: 190 }, 'up', { marker: { x: 290, y: 134 } }),
      spot('job:wipe_statues', 'รูปเคารพเทพหลากสี', 'เช็ดทำความสะอาดรูปเคารพ', 'broom', { x: 36, y: 486, w: 86, h: 70 }, { x: 88, y: 572 }, 'up', { marker: { x: 78, y: 484 } }),
      door('wat_samarn:shrine', 'ศาลเทพฮินดู-จีน', { x: 150, y: 604, w: 40, h: 60 }, { x: CX, y: 676 }, 'up', { x: CX, y: 598 }),
      spot('shop:wat_samarn_ratwish', 'ซุ้มเหรียญกระซิบหูหนู', 'เหรียญหยอดหูหนู พวงกุญแจหนูเจ็ดสี', 'shop', { x: 40, y: 676, w: 62, h: 40 }, { x: 70, y: 724 }, 'up', { marker: { x: 70, y: 674 } }),
      spot('shop:wat_samarn_marigold', 'ร้านดาวเรือง', 'ดาวเรือง กล้วย อ้อย ของถวายพระพิฆเนศ', 'shop', { x: 240, y: 676, w: 60, h: 40 }, { x: 270, y: 724 }, 'up', { marker: { x: 270, y: 674 } }),
      spot('job:sweep_leaves', 'ลานใต้ต้นไม้', 'กวาดใบไม้ลานวัด', 'broom', { x: 4, y: 740, w: 110, h: 80 }, { x: 70, y: 818 }, 'up', { marker: { x: 84, y: 780 } }),
      spot('gate', 'ประตูวัด', 'กลับบ้าน', 'map', { x: 148, y: 776, w: 44, h: 84 }, { x: CX, y: 848 }, 'down', { marker: { x: CX, y: 772 }, near: 12 }),
    ],
    entries: { 'wat_samarn:shrine': { x: CX, y: 684, face: 'down' } },
    spawn: { x: CX, y: 830, face: 'up' },
    pickupSpots: [
      { x: 110, y: 200 },
      { x: 240, y: 200 },
      { x: 20, y: 320 },
      { x: 318, y: 340 },
      { x: 40, y: 470 },
      { x: 300, y: 480 },
      { x: 140, y: 530 },
      { x: 200, y: 560 },
      { x: 20, y: 700 },
      { x: 320, y: 740 },
      { x: 250, y: 830 },
    ],
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      { x: GAN.x, y: 320, r: 60, color: '#ffb3cf' },
      { x: 240, y: 290, r: 30, color: '#ffd6e0' },
      { x: URN.x, y: 440, r: 10, color: '#ff9a5a' },
      { x: SHRINE.x, y: 640, r: 26, color: '#ffcf7a' },
      { x: 70, y: 690, r: 16, color: '#ffb3cf' },
      { x: 270, y: 690, r: 16, color: '#ffcf7a' },
      { x: GATE.x, y: 816, r: 22 },
    ],
    life(s) {
      const fish = new Swimmers(
        s,
        CATFISH,
        14,
        (g, x, y, t, flip) => {
          const k = flip ? -1 : 1
          g.rect(x - 3, y, 7, 2, '#6a7482')
          g.px(x + k * 4, y, '#4e5664')
          if (Math.sin(t * 3) > 0.5) {
            g.px(x + k * 3, y - 1, '#e8fbff')
            g.ellipse(x + k * 4, y, 1.5, 1, '#3a4250')
          }
        },
        5,
      )
      const lanterns = A.hooksAt(shrine, 'lanterns', SHRINE)
      return [
        fish,
        new Glints(s, [...A.hooksAt(shrine, 'glints', SHRINE), ...A.hooksAt(gate, 'glints', GATE), { x: 240, y: 284 }, { x: 214, y: 300 }, { x: 150, y: 330 }, { x: 100, y: 350 }], 1.4),
        new EaveBells(s, A.hooksAt(gate, 'bells', GATE), GATE.y),
        Flames.candles(s, 146, 444),
        Flames.candles(s, 194, 444),
        new Smoke(s, [{ x: URN.x, y: URN.y - 14 }], 8),
        new Smoke(s, [{ x: TABLE.x, y: TABLE.y - 12 }], 3),
        {
          sorted: (add: (y: number, draw: () => void) => void) =>
            add(SHRINE.y + 0.5, () => {
              for (const p of lanterns) drawLantern(s.gfx, p.x, p.y, '#e8514a', s.isNight())
            }),
        },
        new Lanterns(s, [
          { x0: 6, y0: 404, x1: 334, y1: 404, n: 20, sag: 10, colors: ['#ff9fc0', '#f58f35', '#ffd23f', '#6cc36a', '#7fc4ff', '#a283e8', '#e8514a'] },
          { x0: 20, y0: 664, x1: 320, y1: 664, n: 14, sag: 8, colors: ['#e8514a', '#ffd23f'] },
        ]),
        new Butterflies(s, [
          { x: 60, y: 580, w: 220, h: 30 },
          { x: 20, y: 420, w: 300, h: 40 },
        ], 6),
        new CloudShadows(s, 3),
        new SunRays(s),
        new Traffic(s, [
          { y: 880, dir: 1 },
          { y: 892, dir: -1 },
        ]),
        new Gags(s, gags()),
        new TapZones([
          ...TREES.map((t) => shakeTree(s, t.id, t.x, t.y - 8, 80, ['#6cb85c', '#3f8a4f'], 'leaf', 50)),
          {
            // Tapping the Ganesha: a happy trunk toot and pink sparkles.
            rect: { x: 60, y: 270, w: 220, h: 116 },
            fn: (x: number, y: number) => {
              s.particles.sparkles(x, y, 12, '#ffd6e0', 10)
              s.particles.hearts(236, 300, 2)
              s.say(['ปู้ววว~ (งวงยกขึ้นนิดนึง)', 'ขอให้สำเร็จทุกประการ', 'อิ่มขนมโมทกะแล้ว นอนเล่นสักหน่อย'][Math.floor(Math.random() * 3)], 240, 270)
              sfx.chime()
            },
          },
          {
            rect: { x: 0, y: RIVER.y0, w: W, h: RIVER.y1 - RIVER.y0 - 30 },
            fn: (x: number, y: number) => {
              s.particles.add({ kind: 'ripple', x, y, max: 1.3, size: 12, color: '#e8fbff' })
              sfx.plop()
            },
          },
        ]),
      ]
    },
    decor(g, t) {
      const bx = ((t * 5) % (W + 100)) - 50
      g.poly(
        [
          [bx - 18, 112],
          [bx + 18, 112],
          [bx + 14, 118],
          [bx - 14, 118],
        ],
        '#5a3a2a',
      )
      g.rect(bx - 8, 106, 16, 6, '#c9a06a')
      g.rect(bx - 9, 105, 18, 2, '#7a5238')
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.8) s.particles.add({ kind: 'ripple', x: rand(10, W - 10), y: rand(RIVER.y0 + 6, RIVER.y1 - 8), max: 1.2, size: 8, color: '#d8f0e8' })
      if (Math.random() < dt * 0.5) s.particles.add({ kind: 'petal', x: rand(40, 300), y: rand(300, 360), vx: rand(-3, 3), vy: rand(6, 10), max: 3, color: '#f58f35', color2: '#ffd23f' })
    },
    wander: [
      { x: 10, y: 186, w: 320, h: 44 },
      { x: 10, y: 440, w: 320, h: 40 },
      { x: 150, y: 500, w: 40, h: 90 },
      { x: 10, y: 724, w: 320, h: 26 },
      { x: 8, y: 250, w: 26, h: 150 },
    ],
    pois: [
      { x: 150, y: 470, face: 'up' },
      { x: 190, y: 470, face: 'up' },
      { x: TABLE.x, y: 426, face: 'up' },
      { x: 74, y: 438, face: 'up' },
      { x: 164, y: 438, face: 'up' },
      { x: 254, y: 438, face: 'up' },
      { x: CX, y: 676, face: 'up' },
      { x: 46, y: 192, face: 'up' },
      { x: 290, y: 192, face: 'up' },
    ],
    fireflies: [{ x: 0, y: 740, w: W, h: 100 }],
    birds: { x: 40, y: 450, w: 260, h: 30 },
    cats: [
      { x: 236, y: 212, pose: 'sleep', color: '#5a4a5e' },
      { x: 310, y: 520, pose: 'loaf', color: '#f5a55a' },
    ],
    vendors: [],
    dogs: ['khanom'],
    visitors: 6,
  }
}

// ---------------------------------------------------------------------------
// Interior: a small Hindu-Chinese shrine hall – red columns, hanging lanterns,
// a golden Ganesha on the main altar with Lakshmi and Guanyin beside.

const IW = 224
const IH = 400
const ICX = 112
const FLOOR = 176

function bakeShrine(g: Surface) {
  g.rect(0, 0, IW, 18, '#5e1820')
  for (let x = 0; x < IW; x += 8) {
    g.rect(x + 1, 3, 6, 12, '#86222c')
    g.px(x + 4, 9, GOLD.b)
  }
  g.rect(0, 16, IW, 2, GOLD.b)
  // Red walls with gold cloud scrolls and round windows.
  g.rect(0, 18, IW, FLOOR - 18, '#a82e36')
  for (let y = 26; y < FLOOR - 20; y += 10)
    for (let x = 6; x < IW; x += 14) {
      const ox = ((y / 10) % 2) * 7
      g.px(x + ox, y, GOLD.d)
      g.px(x + ox + 1, y - 1, GOLD.d)
      g.px(x + ox + 2, y, GOLD.d)
    }
  for (const x of [30, IW - 30]) {
    g.circle(x, 70, 14, GOLD.d)
    g.circle(x, 70, 12, '#ffe0a0')
    for (let a = 0; a < 8; a++) g.line(x, 70, x + Math.cos(a * 0.785) * 12, 70 + Math.sin(a * 0.785) * 12, '#c8903a')
  }
  // Altar: tiered red-gold table with three images.
  g.rect(44, 118, 136, 58, '#5e1820')
  for (let i = 0; i < 3; i++) {
    const w = 136 - i * 30
    const y = 160 - i * 16
    g.rect(ICX - w / 2, y, w, 16, i % 2 ? '#c8403e' : '#86222c')
    g.hline(ICX - w / 2, ICX + w / 2 - 1, y, GOLD.l)
    for (let x = ICX - w / 2 + 4; x < ICX + w / 2 - 4; x += 6) g.px(x, y + 8, GOLD.b)
  }
  const gan = deitySculpt('ganesha', 0.9)
  g.draw(gan.canvas, ICX - gan.ox, 128 - gan.oy)
  const lak = deitySculpt('lakshmi', 0.6)
  g.draw(lak.canvas, ICX - 46 - lak.ox, 146 - lak.oy)
  const gy = deitySculpt('guanyin', 0.6)
  g.draw(gy.canvas, ICX + 46 - gy.ox, 146 - gy.oy)
  // Floor: red-brown tiles and a gold-trimmed mat.
  A.marbleFloor(g, 0, FLOOR, IW, IH - FLOOR - 10, '#c86a4a', '#b05a40', 10, '#8a4030')
  A.carpet(g, ICX - 14, 200, 28, IH - 210, '#e8514a', '#86222c', GOLD.b)
  for (const x0 of [0, IW - 8]) g.rect(x0, 18, 8, IH - 18, '#5e1820')
  g.rect(0, IH - 10, IW, 10, '#5e1820')
  g.rect(ICX - 16, IH - 10, 32, 10, '#fff6dc')
}

function shrineGags(): Gag[] {
  const a = look({ gender: 'f', hair: 'hair_long', top: 'top_cardigan' })
  const b = look({ gender: 'm', hair: 'hair_short', top: 'top_white' })
  return [
    person(96, 218, a, ['ขอให้งานออกแบบผ่านนะคะท่าน', 'ถวายขนมลาดูแล้ว', 'โอม ศรี คเณศายะ นะมะห์'], { view: 'back', pose: 'wai' }),
    person(134, 222, b, ['ขอให้ธุรกิจราบรื่นครับ', 'ท่านเป็นผู้ขจัดอุปสรรค', 'สาธุ'], { view: 'back', pose: 'kneel' }),
  ]
}

export function samarnShrineMap(): MapDef {
  const pillars: [number, number][] = [
    [28, 240],
    [196, 240],
    [28, 330],
    [196, 330],
  ]
  const props: PlacedProp[] = [
    ...pillars.map(([x, y]) => ({ sprite: A.pillarProp(y - 14, '#c8403e', GOLD.b, 10), x, y, shadow: [9, 3] as [number, number] })),
    { sprite: A.offeringTableProp(44, ['#ffe45e', '#f58f35', '#e8514a']), x: ICX, y: 192 },
    { sprite: F.urnSprite(), x: 60, y: 196, shadow: [10, 2] },
    { sprite: A.candleRackProp(), x: 168, y: 196 },
    { sprite: A.polishKitProp(), x: 196, y: 204 },
    { sprite: F.donationSprite(), x: 20, y: 206, shadow: [6, 2] },
  ]
  return {
    id: 'wat_samarn:shrine',
    area: 'shrine',
    place: 'wat_samarn',
    indoor: true,
    indoorLight: 0.85,
    w: IW,
    h: IH,
    skyH: 0,
    ground: '#5e1820',
    camBias: 0.6,
    bake: bakeShrine,
    props,
    obstacles: [
      { x: 0, y: 0, w: IW, h: 190 },
      { x: 0, y: 0, w: 10, h: IH },
      { x: IW - 10, y: 0, w: 10, h: IH },
      { x: 0, y: IH - 10, w: ICX - 16, h: 10 },
      { x: ICX + 16, y: IH - 10, w: IW - ICX - 16, h: 10 },
      { x: 88, y: 184, w: 48, h: 10 },
      { x: 48, y: 190, w: 24, h: 8 },
      { x: 154, y: 188, w: 28, h: 9 },
      { x: 186, y: 198, w: 20, h: 7 },
      { x: 12, y: 198, w: 16, h: 9 },
      ...pillars.map(([x, y]) => ({ x: x - 7, y: y - 5, w: 14, h: 6 })),
    ],
    hotspots: [
      spot('pray', 'องค์พระพิฆเนศทองคำ', 'สวดมนต์ ขอพรความสำเร็จ', 'pray', { x: 80, y: 60, w: 64, h: 130 }, { x: ICX, y: 208 }, 'up', { marker: { x: ICX, y: 70 }, beacon: true, near: 16 }),
      spot('incense', 'กระถางธูปในศาล', 'จุดธูปขอพร', 'incense', { x: 46, y: 170, w: 28, h: 28 }, { x: 62, y: 212 }, 'up', { marker: { x: 60, y: 168 } }),
      spot('job:light_candles', 'แท่นเทียน', 'จุดเทียนถวายเทพ', 'broom', { x: 154, y: 178, w: 28, h: 20 }, { x: 166, y: 210 }, 'up', { marker: { x: 168, y: 176 } }),
      spot('job:polish_brass', 'ตะเกียงทองเหลือง', 'ขัดตะเกียงและพานให้เงา', 'broom', { x: 186, y: 190, w: 20, h: 16 }, { x: 196, y: 216 }, 'up', { marker: { x: 196, y: 188 } }),
      spot('donation', 'ตู้ทำบุญ', 'ทำบุญบำรุงศาล', 'coin', { x: 12, y: 180, w: 16, h: 26 }, { x: 22, y: 216 }, 'up', { marker: { x: 20, y: 178 } }),
      door('wat_samarn', 'ออกไปลานพระพิฆเนศ', { x: ICX - 18, y: IH - 32, w: 36, h: 32 }, { x: ICX, y: IH - 14 }, 'down', { x: ICX, y: IH - 28 }),
    ],
    entries: { wat_samarn: { x: ICX, y: IH - 30, face: 'up' } },
    spawn: { x: ICX, y: IH - 30, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: ICX, y: 96, r: 30, color: '#ffcf7a' },
      { x: 30, y: 70, r: 16, color: '#ffe0a0' },
      { x: IW - 30, y: 70, r: 16, color: '#ffe0a0' },
      { x: 168, y: 186, r: 12, color: '#ffb35a' },
      { x: ICX, y: IH - 4, r: 26, color: '#fff6dc' },
    ],
    life(s) {
      return [
        new Glints(s, [{ x: ICX, y: 70 }, { x: ICX - 8, y: 90 }, { x: ICX + 40, y: 110 }], 1.2),
        new Flames(s, [{ x: 159, y: 183 }, { x: 168, y: 183 }, { x: 177, y: 183 }], 200),
        new Smoke(s, [{ x: 60, y: 182 }], 6),
        new Lanterns(s, [
          { x0: 10, y0: 186, x1: 214, y1: 186, n: 7, sag: 18, colors: ['#e8514a'] },
          { x0: 10, y0: 270, x1: 214, y1: 270, n: 6, sag: 14, colors: ['#e8514a', '#ffd23f'] },
        ]),
        new Gags(s, shrineGags()),
      ]
    },
    wander: [{ x: 16, y: 220, w: 192, h: 150 }],
    pois: [
      { x: 100, y: 208, face: 'up' },
      { x: 124, y: 208, face: 'up' },
      { x: 62, y: 214, face: 'up' },
    ],
    dogs: [],
    visitors: 2,
  }
}

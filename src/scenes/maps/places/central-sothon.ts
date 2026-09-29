// วัดโสธรวรารามวรวิหาร ฉะเชิงเทรา – the gleaming white ubosot with a golden
// spire above the Bang Pakong river. The courtyard bustles with vow
// fulfilment: trays of boiled eggs, a stage of Thai dancers and musicians,
// a replica of หลวงพ่อโสธร for outdoor prayers. Behind the ubosot, the
// riverside market and a pier where giant catfish crowd for food.
// Interior: `wat_sothon:ubosot`.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as T from '../../../art/temple'
import { GOLD } from '../../../art/temple'
import * as F from '../../../art/templeprops'
import * as G from '../../../art/garden'
import * as M from '../../../art/modern'
import { longtailSprite } from '../../../art/cinematic'
import { road, sidewalk } from '../common'
import { Butterflies, CloudShadows, EaveBells, Flames, Glints, Lanterns, Smoke, SunRays, TapZones, Traffic } from '../../life'
import { Gags, drawPerson, type Gag } from '../../gags'
import * as A from '../../../art/places/central'
import * as S from '../../../art/places/central-sothon'
import { door, look, person, shakeTree, spot, Swimmers } from './central-kit'

const W = 320
const H = 1000
const CX = 160

const RIVER = { y0: 96, y1: 206 }
const UBOSOT = { x: CX, y: 560 }
const URN = { x: CX, y: 656 }
const SALA = { x: 252, y: 732 }
const REPLICA = { x: 66, y: 772 }
const GATE = { x: CX, y: 950 }
const TREES = [
  { id: 'st3', x: 36, y: 900, kind: 'bodhi' as const },
  { id: 'st4', x: 286, y: 896, kind: 'rain' as const },
]
const FRANGI = [
  { id: 'sf1', x: 16, y: 300, v: 2 },
  { id: 'sf2', x: 304, y: 300, v: 0 },
  { id: 'sf3', x: 28, y: 470, v: 1 },
  { id: 'sf4', x: 292, y: 470, v: 3 },
]
const CATFISH: [number, number, number, number][] = [[160, 196, 24, 7]]
const LAMPS: [number, number][] = [
  [110, 690],
  [210, 690],
  [110, 820],
  [210, 820],
  [60, 262],
  [260, 262],
]
const WATER = { L: '#c9d8b6', b: '#8fae94', d: '#6f9282', D: '#557a70' }

function bake(g: Surface, night: boolean) {
  // Far bank: trees and stilt houses.
  G.treeLine(g, 66, W, G.LEAVES.far, 21)
  for (const [x, w] of [
    [24, 26],
    [150, 22],
    [244, 30],
  ]) {
    g.rect(x, 80, w, 10, night ? '#6a5a7a' : '#b89a7a')
    g.poly(
      [
        [x - 3, 80],
        [x + w / 2, 72],
        [x + w + 3, 80],
      ],
      night ? '#7a4a4a' : '#b8584a',
    )
    for (let i = x + 2; i < x + w; i += 6) g.vline(i, 90, 96, '#6e4a35')
    if (night) g.rect(x + 4, 83, 3, 3, '#ffe7a0')
  }
  g.rect(0, 92, W, 4, G.LEAVES.deep.d)
  // The Bang Pakong river.
  A.waterBand(g, 0, RIVER.y0, W, RIVER.y1 - RIVER.y0, WATER, 5)
  // Embankment with steps down to the water.
  g.rect(0, RIVER.y1, W, 8, '#bdb2ae')
  g.hline(0, W - 1, RIVER.y1, '#e4ddd6')
  g.hline(0, W - 1, RIVER.y1 + 7, '#8c8187')
  A.steps(g, 136, RIVER.y1 - 12, 48, 5, 4, { L: '#f2eee9', b: '#e4ddd6', d: '#c9bfb8', D: '#8c8187' })
  // Piers.
  S.drawPier(g, 20, 170, 46, 40)
  S.drawPier(g, 234, 176, 60, 34)
  // Riverside promenade.
  G.paving(g, 0, RIVER.y1 + 8, W, 76, 8, 'grey')
  G.weather(g, 0, RIVER.y1 + 8, W, 76, 3, 0.7)
  // Garden strip behind the ubosot.
  G.lawn(g, 0, 290, W, H - 290, 55)
  G.paving(g, 8, 290, 32, 270, 8)
  G.paving(g, 280, 290, 32, 270, 8)
  G.groundShadow(g, UBOSOT.x, UBOSOT.y - 60, 130, 30, 0.8)
  // Great courtyard before the ubosot.
  G.paving(g, 8, 550, W - 16, 262, 10)
  G.kerb(g, 8, 550, W - 16, 262)
  G.weather(g, 8, 550, W - 16, 262, 8, 0.5)
  G.mandala(g, URN.x, URN.y + 18, 22)
  A.looseShoes(g, 90, 566, 34, 10, 10, 2)
  A.looseShoes(g, 196, 566, 34, 10, 10, 5)
  // Spilled marigold petals and a few eggshells (the joys of vow day).
  for (let i = 0; i < 60; i++) {
    const x = 20 + ((i * 53) % 280)
    const y = 574 + ((i * 29) % 230)
    g.px(x, y, i % 3 ? '#f58f35' : '#ffd23f')
  }
  // Path to the gate and the lower garden.
  G.paving(g, 140, 812, 40, 138, 8)
  G.flowerBed(g, 100, 830, 30, 10, ['#f58f35', '#ffd23f'], 3)
  G.flowerBed(g, 190, 830, 30, 10, ['#ff9fc0', '#fffaf0'], 4)
  G.leafLitter(g, 4, 870, 80, 60, 60, 7)
  G.leafLitter(g, 240, 866, 76, 60, 60, 8)
  for (const t of TREES) G.groundShadow(g, t.x, t.y - 4, 34, 9, 0.6)
  G.puddle(g, 120, 900, 5, 1.6)
  // Street.
  sidewalk(g, 0, 950, W, 12)
  road(g, 0, 962, W, 28)
  sidewalk(g, 0, 990, W, 10)
}

function dancer(x: number, y: number, phase: number, lk: ReturnType<typeof look>): Gag {
  return {
    x,
    y,
    z: 10,
    lines: ['รำถวายหลวงพ่อโสธรเจ้าค่ะ~', 'แก้บนที่สอบติดค่ะ ขอบคุณหลวงพ่อ', 'ท่าจีบนี้ยากนะ ลองดูไหม?'],
    draw: (g, p) => {
      const speed = p.react > 0 ? 2.2 : 1
      const k = Math.floor(p.t * 1.4 * speed + phase) % 6
      const pose = (['offer', 'wai', 'happy', 'offer', 'stand', 'happy'] as const)[k]
      const flip = k >= 3
      drawPerson(g, lk, { ...p, flip, x: p.x + (k === 2 ? 1 : k === 5 ? -1 : 0) }, k === 4 ? 'side' : 'front', [], pose)
    },
    react: (s, gx, gy) => s.particles.hearts(gx, gy - 30, 2),
  }
}

function gags(): Gag[] {
  const d = (hairColor: number) => look({ gender: 'f', hair: 'hair_bun', hairColor, top: 'top_sabai', bottom: 'bot_jong', head: 'head_chada', neck: null, hand: null })
  const eggAuntie = look({ gender: 'f', hair: 'hair_short', hairColor: 6, top: 'top_floral', bottom: 'bot_sarong' })
  const eggMan = look({ gender: 'm', hair: 'hair_short', top: 'top_polo' })
  const kid = look({ gender: 'm', hair: 'hair_buzz', top: 'top_tee_boon' })
  const guard = look({ gender: 'm', hair: 'hair_short', top: 'top_scout', bottom: 'bot_black' })
  const fisher = look({ gender: 'm', hair: 'hair_short', top: 'top_pakaoma', head: 'head_sunhat' })
  const mango = look({ gender: 'f', hair: 'hair_ponytail', top: 'top_vendor', head: 'head_vendorband' })
  const eggs = look({ gender: 'f', hair: 'hair_bob', top: 'top_vendor' })
  const musician = look({ gender: 'm', hair: 'hair_short', top: 'top_raj', bottom: 'bot_jong' })
  const tray = (g: Surface, x: number, y: number) => S.drawEggTray(g, x, y, 3)
  return [
    dancer(234, 725, 0, d(0)),
    dancer(252, 727, 2, d(1)),
    dancer(270, 725, 4, d(0)),
    {
      x: 222,
      y: 744,
      w: 28,
      h: 20,
      lines: ['ติ๊ง ติ่ง ต่อง ต่อง~', 'เพลงสาธุการครับ', 'ระนาดเอกลูกคอเต็ม ๆ'],
      draw: (g, p) => {
        drawPerson(g, musician, p, 'back', [], 'sit')
        const r = S.ranatSprite()
        g.draw(r.canvas, p.x - r.w / 2 + 2, p.y - r.h + 2)
        if (Math.floor(p.t * (p.react > 0 ? 8 : 4)) % 2) g.px(p.x - 4 + (Math.floor(p.t * 6) % 9), p.y - 11, '#6e3a1e')
      },
      react: (s, x, y) => {
        sfx.hum(Math.floor(Math.random() * 6))
        s.particles.sparkles(x, y - 18, 4, '#fff3a6', 4)
      },
    },
    {
      x: 80,
      y: 700,
      lines: ['แก้บนไข่ต้ม ๙๙ ฟองจ้า', 'หลวงพ่อให้สมหวังจริง ๆ นะลูก', 'ไข่ต้มต้องเป็นเลขคี่นะจ๊ะ'],
      draw: (g, p) => {
        drawPerson(g, eggAuntie, p, 'back', [], 'offer')
        tray(g, p.x, p.y - 20)
      },
    },
    {
      x: 124,
      y: 760,
      walk: { x0: 100, x1: 200, speed: 7 },
      lines: ['ไข่ต้มร้อยฟอง… หนักแต่อิ่มบุญ', 'หลีกทางหน่อยครับ ไข่มาแล้ว!', 'บนไว้ว่าถ้าได้งานจะแก้ด้วยไข่ต้ม'],
      draw: (g, p) => {
        drawPerson(g, eggMan, p, 'front')
        tray(g, p.x, p.y - 26)
      },
    },
    person(98, 736, kid, ['แม่ ไข่ต้มกินได้ไหม?', 'หนูขอฟองนึงนะหลวงพ่อ…', 'แก้บนเสร็จแล้วค่อยกินนะลูก — แม่บอก'], { extras: ['drink'] }),
    person(208, 936, guard, ['ถอย ๆ ๆ ขวาสุด ๆ ปรี๊ดดด!', 'จอดตรงนี้ได้ครับ มีที่ว่าง', 'วันหยุดคนเยอะมากครับ'], {
      react: (s, x, y) => {
        sfx.click()
        s.particles.add({ kind: 'dot', x: x + 4, y: y - 16, vy: -10, max: 0.6, color: '#fffaf0' })
      },
    }),
    person(44, 222, fisher, ['ปลาสวายตัวเท่าแขนเลย!', 'บางปะกงน้ำกร่อย ปลาอร่อย', 'ปล่อยปลาได้บุญนะหนู'], { view: 'back' }),
    person(252, 269, mango, ['มะม่วงแปดริ้ว หวานฉ่ำจ้า', 'ขนมจากร้อน ๆ หอมกะทิ', 'ข้าวเหนียวมูนมันเยิ้มเลย'], { z: -1 }),
    person(62, 848, eggs, ['ไข่ต้มแก้บนจ้า ถาดละ ๙ ๑๙ ๙๙', 'มาลัย ธูปเทียนครบชุด', 'รับพวงมาลัยดาวเรืองด้วยไหมจ๊ะ'], { z: -1 }),
  ]
}

export function watSothonMap(): MapDef {
  const ubo = S.sothonUbosotSprite()
  const uboN = S.sothonUbosotSprite(true)
  const sala = S.danceSalaSprite()
  const rep = S.replicaSalaSprite()
  const repN = S.replicaSalaSprite(true)
  const gate = T.gateSprite()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const props: PlacedProp[] = [
    { sprite: ubo, night: uboN, x: UBOSOT.x, y: UBOSOT.y, id: 'ubosot' },
    { sprite: F.urnSprite(), x: URN.x, y: URN.y, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: 134, y: 650 },
    { sprite: F.candleStandSprite(), x: 186, y: 650 },
    { sprite: A.shoeRackProp(), x: 104, y: 580 },
    { sprite: A.shoeRackProp(false), x: 216, y: 580 },
    { sprite: S.eggTableSprite(60, 0), x: 70, y: 686 },
    { sprite: S.eggTableSprite(48, 1), x: 164, y: 704 },
    { sprite: F.donationSprite(), x: 196, y: 668, shadow: [6, 2] },
    { sprite: sala, x: SALA.x, y: SALA.y },
    { sprite: rep, night: repN, x: REPLICA.x, y: REPLICA.y },
    { sprite: S.eggTableSprite(36, 2), x: REPLICA.x, y: REPLICA.y + 14 },
    { sprite: F.flagPoleSprite(40), x: 20, y: 640 },
    { sprite: F.flagPoleSprite(40), x: 300, y: 640 },
    // Riverside.
    { sprite: S.riverSalaSprite(), x: 264, y: 206 },
    { sprite: S.mangoStallSprite(), x: 252, y: 272 },
    ...FRANGI.map((f) => ({ sprite: G.frangipani(f.v), x: f.x, y: f.y, id: f.id })),
    { sprite: T.semaSprite(), x: 46, y: 546 },
    { sprite: T.semaSprite(), x: 274, y: 546 },
    { sprite: G.topiary(0), x: 60, y: 330 },
    { sprite: G.topiary(2), x: 262, y: 330 },
    { sprite: M.planterSprite(0), x: 290, y: 800 },
    { sprite: M.planterSprite(1), x: 30, y: 806 },
    { sprite: A.fishFoodProp(), x: 186, y: 232 },
    { sprite: F.benchSprite(), x: 110, y: 270 },
    { sprite: F.spiritHouseSprite(), x: 300, y: 250 },
    // Gardens and gate.
    ...TREES.map((t) => ({ sprite: t.kind === 'rain' ? A.rainTreeSprite(t.id === 'st4' ? 1 : 0) : G.bodhiTree2(), x: t.x, y: t.y, id: t.id })),
    { sprite: S.eggStallSprite(), x: 62, y: 852 },
    { sprite: A.broomProp(), x: 262, y: 902 },
    { sprite: A.leafPileProp(2), x: 250, y: 910 },
    { sprite: G.coconutPalm(0), x: 14, y: 620 },
    { sprite: G.coconutPalm(1), x: 306, y: 616 },
    { sprite: G.shrub(1), x: 124, y: 870 },
    { sprite: G.bougainvillea(0), x: 196, y: 874 },
    { sprite: M.lotteryBoardSprite(), x: 240, y: 846 },
    { sprite: T.wallSprite(122), x: 0, y: GATE.y },
    { sprite: T.wallSprite(122), x: 198, y: GATE.y },
    { sprite: gate, x: GATE.x, y: GATE.y },
    { sprite: M.powerPoleSprite(), x: 96, y: 964 },
    { sprite: M.powerPoleSprite(), x: 232, y: 964 },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  const at = (o: { x: number; y: number }, b: T.Building, k: string) => A.hooksAt(b, k, o)
  return {
    id: 'wat_sothon',
    area: 'river',
    place: 'wat_sothon',
    w: W,
    h: H,
    skyH: 70,
    ground: '#86c95f',
    camBias: 0.62,
    bake,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: RIVER.y1 + 6 },
      // Ubosot (roof mass above, walls and platform below).
      { x: 40, y: 290, w: 240, h: 240 },
      { x: 118, y: 528, w: 84, h: 30 },
      // Riverside furniture.
      { x: 224, y: 256, w: 58, h: 17 },
      { x: 232, y: 196, w: 66, h: 12 },
      ...FRANGI.map((f) => ({ x: f.x - 3, y: f.y - 3, w: 6, h: 4 })),
      { x: 40, y: 540, w: 12, h: 7 },
      { x: 268, y: 540, w: 12, h: 7 },
      { x: 280, y: 794, w: 20, h: 7 },
      { x: 20, y: 800, w: 20, h: 7 },
      { x: 180, y: 226, w: 12, h: 7 },
      { x: 100, y: 266, w: 20, h: 5 },
      { x: 294, y: 242, w: 12, h: 9 },
      // Courtyard.
      { x: 150, y: 648, w: 20, h: 9 },
      { x: 126, y: 644, w: 16, h: 7 },
      { x: 178, y: 644, w: 16, h: 7 },
      { x: 90, y: 572, w: 28, h: 9 },
      { x: 202, y: 572, w: 28, h: 9 },
      { x: 38, y: 674, w: 64, h: 13 },
      { x: 138, y: 692, w: 52, h: 13 },
      { x: 190, y: 662, w: 12, h: 7 },
      { x: 208, y: 690, w: 88, h: 44 },
      { x: 34, y: 720, w: 64, h: 54 },
      { x: 44, y: 776, w: 44, h: 11 },
      { x: 16, y: 634, w: 7, h: 5 },
      { x: 296, y: 634, w: 7, h: 5 },
      { x: 8, y: 612, w: 12, h: 7 },
      { x: 300, y: 608, w: 12, h: 7 },
      // Lower garden.
      { x: 30, y: 836, w: 64, h: 17 },
      { x: 100, y: 830, w: 30, h: 10 },
      { x: 190, y: 830, w: 30, h: 10 },
      { x: 118, y: 864, w: 12, h: 7 },
      { x: 186, y: 866, w: 20, h: 9 },
      { x: 228, y: 838, w: 26, h: 9 },
      { x: 0, y: 934, w: 142, h: 16 },
      { x: 178, y: 934, w: 142, h: 16 },
      { x: 0, y: 950, w: W, h: 50 },
      ...TREES.map((t) => (t.kind === 'rain' ? { x: t.x - 6, y: t.y - 5, w: 12, h: 6 } : { x: t.x - 26, y: t.y - 16, w: 52, h: 18 })),
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      door('wat_sothon:ubosot', 'อุโบสถหลวงพ่อโสธร', { x: 138, y: 470, w: 44, h: 90 }, { x: CX, y: 566 }, 'up', { x: CX, y: 464 }),
      spot('incense', 'กระถางธูปหน้าโบสถ์', 'จุดธูปขอพรหลวงพ่อ', 'incense', { x: 146, y: 628, w: 28, h: 28 }, { x: CX, y: 670 }, 'up', { marker: { x: CX, y: 626 } }),
      spot('pray_sala', 'ศาลาหลวงพ่อโสธรจำลอง', 'สวดมนต์ ขอพรกลางแจ้ง', 'pray', { x: 36, y: 706, w: 60, h: 70 }, { x: REPLICA.x + 14, y: 796 }, 'up', { marker: { x: REPLICA.x, y: 700 }, beacon: true }),
      spot('donation', 'ตู้ทำบุญ', 'ทำบุญบำรุงวัด', 'coin', { x: 188, y: 642, w: 16, h: 26 }, { x: 196, y: 678 }, 'up', { marker: { x: 196, y: 640 } }),
      spot('job:arrange_shoes', 'รองเท้าหน้าโบสถ์', 'จัดรองเท้าที่กองระเกะระกะ', 'broom', { x: 88, y: 558, w: 32, h: 24 }, { x: 104, y: 590 }, 'up', { marker: { x: 104, y: 556 } }),
      spot('river_fish', 'ท่าน้ำให้อาหารปลา', 'ปลาสวายตัวโตรออยู่', 'bread', { x: 20, y: 160, w: 46, h: 50 }, { x: 44, y: 226 }, 'up', { marker: { x: 44, y: 158 } }),
      spot('job:feed_catfish', 'บันไดท่าน้ำ', 'ช่วยให้อาหารปลาดุกปลาสวาย', 'fishfood', { x: 136, y: 186, w: 48, h: 30 }, { x: CX, y: 228 }, 'up', { marker: { x: CX, y: 184 } }),
      spot('shop:wat_sothon_market', 'ร้านมะม่วงแปดริ้ว', 'มะม่วงน้ำดอกไม้ ขนมจาก', 'shop', { x: 224, y: 232, w: 58, h: 42 }, { x: 252, y: 282 }, 'up', { marker: { x: 252, y: 230 } }),
      spot('shop:wat_sothon_eggs', 'ร้านไข่ต้มแก้บน', 'ไข่ต้ม มาลัย ธูปเทียนแก้บน', 'shop', { x: 30, y: 812, w: 64, h: 42 }, { x: 62, y: 862 }, 'up', { marker: { x: 62, y: 810 } }),
      spot('job:sweep_leaves', 'ใต้ร่มไม้ใหญ่', 'กวาดใบไม้ลานจอดรถ', 'broom', { x: 236, y: 846, w: 80, h: 60 }, { x: 250, y: 922 }, 'up', { marker: { x: 262, y: 880 } }),
      spot('gate', 'ประตูวัด', 'กลับบ้าน', 'map', { x: 138, y: 874, w: 44, h: 76 }, { x: CX, y: 938 }, 'down', { marker: { x: CX, y: 870 }, near: 12 }),
    ],
    entries: { 'wat_sothon:ubosot': { x: CX, y: 574, face: 'down' } },
    spawn: { x: CX, y: 920, face: 'up' },
    pickupSpots: [
      { x: 20, y: 240 },
      { x: 120, y: 244 },
      { x: 300, y: 282 },
      { x: 24, y: 400 },
      { x: 296, y: 440 },
      { x: 60, y: 600 },
      { x: 264, y: 610 },
      { x: 130, y: 740 },
      { x: 200, y: 790 },
      { x: 110, y: 900 },
      { x: 212, y: 910 },
    ],
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      { x: CX, y: 490, r: 46, color: '#fff0c0' },
      { x: CX, y: 370, r: 30, color: '#ffe7a0' },
      { x: CX, y: 648, r: 10, color: '#ff9a5a' },
      { x: SALA.x, y: 700, r: 30, color: '#ffcf7a' },
      { x: REPLICA.x, y: 740, r: 20, color: '#ffcf7a' },
      { x: 252, y: 240, r: 16, color: '#ffcf7a' },
      { x: 62, y: 826, r: 16, color: '#ffb3cf' },
      { x: GATE.x, y: 906, r: 24 },
    ],
    life(s) {
      const catfish = new Swimmers(
        s,
        CATFISH,
        9,
        (g, x, y, t, flip) => {
          const k = flip ? -1 : 1
          g.rect(x - 3, y, 7, 2, '#6a7482')
          g.px(x + k * 4, y, '#4e5664')
          g.px(x - k * 4, y + 1, '#8a94a2')
          if (Math.sin(t * 3) > 0.6) {
            g.px(x + k * 5, y - 1, '#e8fbff')
            g.px(x + k * 5, y + 2, '#4e5664')
          }
        },
        4,
      )
      return [
        catfish,
        new Glints(s, [...at(UBOSOT, ubo, 'glints'), ...at(SALA, sala, 'glints'), ...at(REPLICA, rep, 'glints'), ...at(GATE, gate, 'glints')], 1.8),
        new EaveBells(s, at(UBOSOT, ubo, 'bells'), UBOSOT.y),
        new EaveBells(s, at(SALA, sala, 'bells'), SALA.y),
        new EaveBells(s, at(REPLICA, rep, 'bells'), REPLICA.y),
        new EaveBells(s, at(GATE, gate, 'bells'), GATE.y),
        ...at(UBOSOT, ubo, 'candles').map((p) => new Flames(s, [p], UBOSOT.y)),
        new Flames(s, at(REPLICA, rep, 'candles'), REPLICA.y),
        Flames.candles(s, 134, 650),
        Flames.candles(s, 186, 650),
        new Smoke(s, [{ x: URN.x, y: URN.y - 14 }], 9),
        new Smoke(s, [{ x: REPLICA.x, y: REPLICA.y - 12 }], 3),
        new Lanterns(s, [
          { x0: 8, y0: 240, x1: 150, y1: 240, n: 9, sag: 6 },
          { x0: 170, y0: 240, x1: 312, y1: 240, n: 9, sag: 6 },
          { x0: 104, y0: 812, x1: 216, y1: 812, n: 7, sag: 6, colors: ['#ffd23f', '#f58f35', '#fffaf0'] },
        ]),
        new Butterflies(s, [
          { x: 96, y: 820, w: 130, h: 30 },
          { x: 0, y: 300, w: 60, h: 60 },
        ], 5),
        new CloudShadows(s, 3),
        new SunRays(s),
        new Traffic(s, [
          { y: 972, dir: 1 },
          { y: 984, dir: -1 },
        ]),
        new Gags(s, gags()),
        new TapZones([
          ...TREES.map((t) => shakeTree(s, t.id, t.x, t.y - 8, t.kind === 'rain' ? 88 : 70, ['#6cb85c', '#3f8a4f'], 'leaf', 50)),
          ...FRANGI.map((f) => shakeTree(s, f.id, f.x, f.y + 6, 40, f.v >= 2 ? ['#ffc4d8', '#ffe45e'] : ['#fffaf0', '#ffd23f'], 'petal', 34)),
          {
            rect: { x: 0, y: RIVER.y0, w: W, h: RIVER.y1 - RIVER.y0 - 20 },
            fn: (x: number, y: number) => {
              s.particles.add({ kind: 'ripple', x, y, max: 1.3, size: 12, color: '#e8fbff' })
              for (let i = 0; i < 3; i++) s.particles.add({ kind: 'drop', x, y, vx: rand(-12, 12), vy: rand(-24, -12), g: 90, max: 0.45, color: '#d8f0e8' })
              sfx.plop()
            },
          },
          {
            rect: { x: 100, y: 300, w: 120, h: 120 },
            fn: (x: number, y: number) => {
              s.particles.sparkles(x, y, 10, '#fff3a6', 10)
              sfx.chime()
            },
          },
        ]),
      ]
    },
    decor(g, t, s) {
      // Boats on the Bang Pakong: a rice barge and a long-tail.
      const bx = ((t * 5) % (W + 100)) - 50
      S.drawBarge(g, bx, 126, t)
      const lt = longtailSprite()
      const lx = W + 40 - ((t * 11 + 160) % (W + 120))
      const bob = Math.round(Math.sin(t * 2.2))
      g.draw(lt.canvas, Math.round(lx - lt.w / 2), 166 - lt.h + bob, true)
      if (Math.random() < 0.3) s.particles.add({ kind: 'ripple', x: lx + lt.w / 2, y: 166, max: 0.8, size: 6, color: '#d8f0e8' })
      for (let i = 0; i < 6; i++) {
        const ph = Math.floor(t * 1.1 + i * 2)
        g.px(10 + ((ph * 41) % 300), RIVER.y0 + 6 + ((ph * 29) % 90), '#e4f2e8')
      }
    },
    overlay(g, t, s) {
      if (!s.isNight()) return
      // Reflections of the lit ubosot and lanterns on the river.
      for (let i = 0; i < 12; i++) {
        const x = 20 + i * 26 + Math.round(Math.sin(t * 1.3 + i) * 2)
        g.hline(x, x + 4, 186 + (i % 3) * 4, '#ffe7a0')
      }
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.8) s.particles.add({ kind: 'ripple', x: rand(10, W - 10), y: rand(RIVER.y0 + 6, RIVER.y1 - 8), max: 1.2, size: 8, color: '#d8f0e8' })
      if (s.isNight() && Math.random() < dt * 1.2) s.particles.add({ kind: 'sparkle', x: CX + rand(-90, 90), y: rand(300, 510), vy: rand(-6, -2), max: rand(1, 2), color: '#fff3a6', drag: 0.3 })
    },
    wander: [
      { x: 10, y: 222, w: 300, h: 60 },
      { x: 20, y: 640, w: 280, h: 40 },
      { x: 100, y: 730, w: 110, h: 70 },
      { x: 144, y: 820, w: 32, h: 110 },
      { x: 10, y: 300, w: 28, h: 240 },
      { x: 40, y: 590, w: 240, h: 40 },
    ],
    pois: [
      { x: 150, y: 670, face: 'up' },
      { x: 170, y: 670, face: 'up' },
      { x: CX, y: 568, face: 'up' },
      { x: REPLICA.x + 10, y: 796, face: 'up' },
      { x: 70, y: 700, face: 'up' },
      { x: 164, y: 716, face: 'up' },
      { x: 240, y: 756, face: 'up' },
      { x: 44, y: 226, face: 'up' },
      { x: 252, y: 284, face: 'up' },
    ],
    fireflies: [
      { x: 0, y: 290, w: 40, h: 260 },
      { x: 280, y: 290, w: 40, h: 260 },
      { x: 0, y: 840, w: W, h: 90 },
    ],
    monkPath: [
      [CX, 568],
      [CX, 940],
      [CX, 970],
      [W + 20, 970],
    ],
    birds: { x: 30, y: 740, w: 60, h: 30 },
    cats: [
      { x: 110, y: 276, pose: 'sleep', color: '#f5a55a' },
      { x: 300, y: 790, pose: 'loaf', color: '#5a4a5e' },
    ],
    novice: { x: 20, y: 320, w: 16, h: 200 },
    novices: 1,
    dogs: ['dang'],
    visitors: 7,
  }
}

// ---------------------------------------------------------------------------
// Interior: หลวงพ่อโสธร on a towering gilded throne, walls of white and gold,
// long tables of egg trays, candles everywhere.

const IW = 256
const IH = 470
const ICX = 128
const FLOOR = 214
const THRONE_TOP = 128
const I_PILLARS: [number, number][] = [
  [42, 280],
  [214, 280],
  [42, 360],
  [214, 360],
  [42, 440],
  [214, 440],
]

function bakeUbosot(g: Surface) {
  // Ceiling: white coffers with gold stars.
  g.rect(0, 0, IW, 20, '#e8dcd8')
  for (let x = 2; x < IW; x += 12) {
    g.rect(x, 3, 9, 12, '#c24a52')
    g.px(x + 4, 8, GOLD.l)
    g.px(x + 3, 8, GOLD.d)
    g.px(x + 5, 8, GOLD.d)
    g.px(x + 4, 7, GOLD.d)
    g.px(x + 4, 9, GOLD.d)
  }
  g.rect(0, 18, IW, 2, GOLD.b)
  // Back wall: white with a gold lattice and two mural panels.
  g.rect(0, 20, IW, FLOOR - 20, '#f8f2ea')
  for (let y = 24; y < FLOOR - 30; y += 8)
    for (let x = 16; x < IW - 16; x += 8) {
      g.px(x + ((y / 8) % 2) * 4, y, GOLD.d)
      g.px(x + 1 + ((y / 8) % 2) * 4, y + 1, '#f0d890')
    }
  A.drawMural(g, 14, 30, 60, 140, 12, { bg: '#f0e0bc' })
  A.drawMural(g, 182, 30, 60, 140, 17, { bg: '#f0e0bc' })
  for (const x of [12, 74, 180, 242]) g.rect(x, 28, 2, 144, GOLD.b)
  // Radiant gilded arch behind the image.
  for (let r = 70; r > 0; r -= 2) {
    const c = r % 4 === 0 ? '#ffe38a' : r > 50 ? '#f7c84c' : '#fff3c4'
    for (let a = Math.PI; a <= Math.PI * 2; a += 0.012) g.px(ICX + Math.cos(a) * r, 150 + Math.sin(a) * r * 1.15, c)
  }
  for (let i = 0; i < 28; i++) {
    const a = Math.PI + (i / 27) * Math.PI
    g.line(ICX + Math.cos(a) * 24, 150 + Math.sin(a) * 28, ICX + Math.cos(a) * 70, 150 + Math.sin(a) * 80, i % 2 ? '#ffd54f' : '#fff0b8')
  }
  // Dado.
  g.rect(0, FLOOR - 30, IW, 30, '#e8dcd0')
  g.hline(0, IW - 1, FLOOR - 30, GOLD.b)
  for (let x = 4; x < IW; x += 10) g.rect(x, FLOOR - 24, 6, 18, '#f4ece4')
  // Throne and หลวงพ่อโสธร.
  S.drawThrone(g, ICX, THRONE_TOP, 84, 70)
  A.drawSculpt(g, S.luangPhoSothon(0.66), ICX, THRONE_TOP)
  // Floor: white marble, gold carpet runner.
  A.marbleFloor(g, 0, FLOOR, IW, IH - FLOOR - 12, '#fbf8f4', '#ece6e2', 12, '#d8d0d8')
  A.sheen(g, ICX, FLOOR + 2, 64, 36, '#fff0b8', 0.5)
  A.carpet(g, ICX - 15, 250, 30, IH - 262, '#c24a52', '#8a2a36', GOLD.l)
  // Side walls with gold-framed windows.
  for (const x0 of [0, IW - 10]) {
    g.rect(x0, 20, 10, IH - 20, '#e8dcd0')
    g.vline(x0 === 0 ? 9 : IW - 10, 20, IH - 1, '#c9bfc4')
    for (const wy of [236, 316, 396]) {
      g.rect(x0 + 2, wy, 6, 40, GOLD.b)
      g.rect(x0 + 3, wy + 1, 4, 38, '#fff8e0')
      g.hline(x0 + 3, x0 + 6, wy + 20, GOLD.d)
    }
  }
  g.rect(0, IH - 12, IW, 12, '#e8dcd0')
  g.hline(0, IW - 1, IH - 12, GOLD.b)
  g.rect(ICX - 16, IH - 12, 32, 12, '#fff6dc')
  g.rect(ICX - 14, IH - 10, 28, 10, '#fffdf2')
}

function ubosotGags(): Gag[] {
  const a = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_white', bottom: 'bot_sarong' })
  const b = look({ gender: 'm', hair: 'hair_short', top: 'top_white' })
  const c = look({ gender: 'f', hair: 'hair_long', top: 'top_office_f', bottom: 'bot_pencil' })
  const d = look({ gender: 'm', hair: 'hair_twoblock', top: 'top_uni_m', bottom: 'bot_uni_slacks' })
  return [
    person(100, 268, a, ['หลวงพ่อโสธรเจ้าขา ลูกมาแก้บนแล้ว', 'สาธุ ๆ ๆ', 'ไข่ต้มเก้าสิบเก้าฟองนะเจ้าคะ'], { view: 'back', pose: 'kneel' }),
    person(156, 270, b, ['ขอให้ลูกสอบติดหมอด้วยเถิด', 'หลวงพ่อศักดิ์สิทธิ์มากครับ', 'บนไว้ครั้งหน้าจะมารำถวาย'], { view: 'back', pose: 'wai' }),
    person(90, 300, c, ['ขอให้ผ่านโปรฯ นะคะหลวงพ่อ', 'ปีนี้ขอเลื่อนตำแหน่งค่ะ', 'สาธุ'], { view: 'back', pose: 'kneel' }),
    person(170, 318, d, ['ขอให้รับปริญญาทันเพื่อนครับ', 'เดี๋ยวแก้บนด้วยไข่ต้มทั้งแผงเลย', 'สาธุครับ'], { view: 'back', pose: 'wai' }),
  ]
}

export function sothonUbosotMap(): MapDef {
  const props: PlacedProp[] = [
    ...I_PILLARS.map(([x, y]) => ({ sprite: A.pillarProp(y - 16, '#f4ece4', GOLD.d, 10), x, y, shadow: [9, 3] as [number, number] })),
    { sprite: S.eggTableSprite(72, 3), x: ICX, y: 236 },
    { sprite: S.eggTableSprite(40, 1), x: 66, y: 240 },
    { sprite: S.eggTableSprite(40, 2), x: 190, y: 240 },
    { sprite: A.brassCandleProp(), x: 84, y: 224 },
    { sprite: A.brassCandleProp(), x: 172, y: 224 },
    { sprite: A.candleRackProp(), x: 222, y: 262 },
    { sprite: A.polishKitProp(), x: 30, y: 262 },
    { sprite: A.mopBucketProp(), x: 196, y: 352 },
    { sprite: F.donationSprite(), x: 44, y: 250, shadow: [6, 2] },
    { sprite: F.lotusJarSprite('blue'), x: 22, y: 232 },
    { sprite: F.lotusJarSprite('green'), x: 234, y: 232 },
  ]
  return {
    id: 'wat_sothon:ubosot',
    area: 'river',
    place: 'wat_sothon',
    indoor: true,
    indoorLight: 0.85,
    w: IW,
    h: IH,
    skyH: 0,
    ground: '#e8dcd0',
    camBias: 0.6,
    bake: bakeUbosot,
    props,
    obstacles: [
      { x: 0, y: 0, w: IW, h: 230 },
      { x: 0, y: 0, w: 12, h: IH },
      { x: IW - 12, y: 0, w: 12, h: IH },
      { x: 0, y: IH - 12, w: ICX - 16, h: 12 },
      { x: ICX + 16, y: IH - 12, w: IW - ICX - 16, h: 12 },
      { x: 90, y: 226, w: 76, h: 12 },
      { x: 44, y: 230, w: 44, h: 12 },
      { x: 168, y: 230, w: 44, h: 12 },
      { x: 208, y: 254, w: 28, h: 9 },
      { x: 20, y: 256, w: 20, h: 7 },
      { x: 188, y: 346, w: 14, h: 7 },
      { x: 36, y: 244, w: 16, h: 8 },
      ...I_PILLARS.map(([x, y]) => ({ x: x - 7, y: y - 5, w: 14, h: 6 })),
    ],
    hotspots: [
      spot('pray', 'กราบหลวงพ่อพุทธโสธร', 'สวดมนต์ ขอพร แก้บน', 'pray', { x: 80, y: 60, w: 96, h: 180 }, { x: ICX, y: 254 }, 'up', { marker: { x: ICX, y: 70 }, beacon: true, near: 16 }),
      spot('job:light_candles', 'แท่นเทียนแก้บน', 'จุดเทียนให้ครบทุกเล่ม', 'broom', { x: 208, y: 244, w: 28, h: 20 }, { x: 230, y: 270 }, 'up', { marker: { x: 222, y: 242 } }),
      spot('job:polish_brass', 'เชิงเทียนทองเหลือง', 'ขัดเชิงเทียนให้เงาวับ', 'broom', { x: 20, y: 248, w: 22, h: 16 }, { x: 30, y: 274 }, 'up', { marker: { x: 30, y: 246 } }),
      spot('job:mop_floor', 'ถังน้ำและไม้ถู', 'ถูพื้นหินอ่อนให้เงา', 'broom', { x: 186, y: 330, w: 22, h: 24 }, { x: 196, y: 364 }, 'up', { marker: { x: 196, y: 328 } }),
      spot('donation', 'ตู้ทำบุญ', 'ทำบุญบำรุงพระอุโบสถ', 'coin', { x: 36, y: 224, w: 16, h: 26 }, { x: 52, y: 262 }, 'up', { marker: { x: 44, y: 222 } }),
      door('wat_sothon', 'ออกไปลานวัด', { x: ICX - 18, y: IH - 34, w: 36, h: 34 }, { x: ICX, y: IH - 16 }, 'down', { x: ICX, y: IH - 30 }),
    ],
    entries: { wat_sothon: { x: ICX, y: IH - 34, face: 'up' } },
    spawn: { x: ICX, y: IH - 34, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: ICX, y: 96, r: 30, color: '#ffe7a0' },
      { x: 84, y: 198, r: 10, color: '#ffb35a' },
      { x: 172, y: 198, r: 10, color: '#ffb35a' },
      { x: 222, y: 252, r: 12, color: '#ffb35a' },
      { x: 5, y: 256, r: 18, color: '#fff8e0' },
      { x: 5, y: 336, r: 18, color: '#fff8e0' },
      { x: 5, y: 416, r: 18, color: '#fff8e0' },
      { x: IW - 5, y: 256, r: 18, color: '#fff8e0' },
      { x: IW - 5, y: 336, r: 18, color: '#fff8e0' },
      { x: IW - 5, y: 416, r: 18, color: '#fff8e0' },
      { x: ICX, y: IH - 6, r: 30, color: '#fff6dc' },
    ],
    life(s) {
      return [
        new Glints(
          s,
          [
            { x: ICX - 6, y: 90 },
            { x: ICX + 8, y: 104 },
            { x: ICX, y: 70 },
            { x: ICX - 30, y: 150 },
            { x: ICX + 30, y: 160 },
            { x: ICX - 50, y: 120 },
            { x: ICX + 50, y: 110 },
          ],
          2,
        ),
        new Flames(
          s,
          [
            { x: 84, y: 197 },
            { x: 172, y: 197 },
            { x: 213, y: 249 },
            { x: 222, y: 249 },
            { x: 231, y: 249 },
          ],
          262,
        ),
        new Smoke(s, [{ x: ICX, y: 222 }], 4),
        new Gags(s, ubosotGags()),
        new TapZones([
          {
            rect: { x: 96, y: 60, w: 64, h: 140 },
            fn: (x: number, y: number) => {
              s.particles.sparkles(x, y, 12, '#fff3a6', 10)
              sfx.chime()
            },
          },
        ]),
      ]
    },
    wander: [{ x: 20, y: 280, w: 216, h: 150 }],
    pois: [
      { x: 110, y: 256, face: 'up' },
      { x: 146, y: 256, face: 'up' },
      { x: 66, y: 256, face: 'up' },
      { x: 190, y: 258, face: 'up' },
    ],
    dogs: [],
    visitors: 3,
  }
}

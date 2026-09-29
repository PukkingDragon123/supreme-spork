// วัดพระธาตุดอยสุเทพ, Chiang Mai.
//   doi_suthep          – the foot of the mountain (red songthaews, stalls,
//                         hill-tribe kids), the 306-step naga staircase with
//                         the cable car beside it, and the outer terrace with
//                         its rows of bells and the lookout over the city.
//   doi_suthep:terrace  – the cloister round the golden chedi and its four
//                         gold umbrellas; the Lanna viharn to the north.
//   doi_suthep:viharn   – red-and-gold Lanna interior with the principal Buddha.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as T from '../../../art/temple'
import * as F from '../../../art/templeprops'
import * as G from '../../../art/garden'
import { road, sidewalk } from '../common'
import { drawPerson, drawPhoneMonk, drawSpriteGag, gagFx, Gags, type Gag } from '../../gags'
import { Butterflies, CloudShadows, EaveBells, Flames, Glints, Lanterns, RackBells, Smoke, SunRays, TapZones, TowerBell, Traffic } from '../../life'
import { monkSprite } from '../../../art/characters'
import { drawShadow } from '../../../art/props'
import {
  bld,
  hooksAt,
  nagaHeadsSprite,
  NAGA_GREEN,
  serpent,
  shoeRack,
  lotusVase,
  candleRack,
  offeringTable,
  donationBox,
  altarSprite,
  buddhaProp,
  pillarSprite,
  bakeRoom,
  roomGeo,
  carpet,
  cushion,
  hsh,
  GOLD,
  LACQUER,
  mossGround,
  marigoldPile,
  type RoomOpts,
} from '../../../art/places/northisan'
import {
  lannaChediSprite,
  goldUmbrellaSprite,
  goldRailSprite,
  lannaViharnSprite,
  galleryOuterSprite,
  galleryInsideSprite,
  lannaGateSprite,
  whiteElephantSprite,
  binocularsSprite,
  restSalaSprite,
  cableStationSprite,
  drawCabin,
  songthaewRedSprite,
  khaoSoiStallSprite,
  hillTribeStallSprite,
  pineSprite,
  cityView,
  LANNA_ROOF,
} from '../../../art/places/northisan-doi'
import { Circlers, drawCostumed, drawMist, drawSquirrel, hs, look, Notes, Shuttle, tune, Tung, Twinkles } from './northisan-common'

// ===========================================================================
// Outdoor: the foot of the mountain, the naga staircase and outer terrace.

const W = 288
const H = 1140
const CX = 144
const GAL_Y = 232
const TER_B = 380 // bottom edge of the outer terrace
const ST_T = 380 // stairs top
const ST_B = 900 // stairs bottom
const LAND = { y0: 604, y1: 652 }
const BASE_Y = 900
const ROAD_Y = 1066

const PINES: [number, number, number][] = [
  // Left slope.
  [18, 430, 0], [48, 452, 1], [100, 470, 0], [26, 520, 1], [96, 548, 1], [40, 590, 0],
  [14, 668, 1], [44, 700, 0], [98, 726, 1], [22, 772, 0], [92, 800, 0], [40, 846, 1], [100, 880, 1], [14, 890, 0],
  // Right slope below the view.
  [196, 612, 1], [270, 604, 0], [250, 690, 1], [200, 716, 0], [276, 752, 0], [226, 786, 1], [190, 830, 1], [262, 842, 0], [214, 884, 0], [276, 900, 1],
  // Behind the gallery.
  [10, 212, 1], [276, 214, 0],
  // Far side of the road.
  [20, 1134, 1], [110, 1138, 0], [190, 1136, 1], [268, 1134, 0],
]

function mountainsFar(g: Surface, night: boolean) {
  const far = night ? '#4c5aa0' : '#a6bfe6'
  const mid = night ? '#3e4a88' : '#86a6d8'
  for (let x = -30; x < W + 40; x += 42) g.poly([[x - 40, 120], [x + 6, 60 + ((x * 7) % 18)], [x + 52, 120]], far)
  for (let x = -16; x < W + 30; x += 34) g.poly([[x - 30, 132], [x + 4, 88 + ((x * 5) % 14)], [x + 38, 132]], mid)
}

function bakeOutdoor(g: Surface, night: boolean) {
  mountainsFar(g, night)
  G.treeLine(g, 124, W, { L: '#6aa888', b: '#4f8a70', d: '#3d705c', D: '#2c5a4a' }, 3)
  G.treeLine(g, 150, W, G.LEAVES.deep, 7)
  g.rect(0, 170, W, 66, G.LEAVES.deep.d)
  // Slopes: mossy forest floor.
  mossGround(g, 0, 236, W, BASE_Y - 236 + 40, 4, '#4f8a52')
  // Outer terrace.
  G.paving(g, 20, 236, 248, TER_B - 236, 8, 'grey')
  G.weather(g, 20, 236, 248, TER_B - 236, 3, 0.8)
  G.kerb(g, 20, 236, 248, TER_B - 236)
  G.groundShadow(g, CX, 238, 110, 6, 0.6)
  // Balcony rail over the view.
  cityView(g, 174, TER_B + 4, W - 174, 214, night)
  g.rect(172, TER_B - 2, W - 172, 3, '#9a6a45')
  for (let x = 174; x < W; x += 6) g.rect(x, TER_B - 8, 2, 8, '#9a6a45')
  g.hline(172, W - 1, TER_B - 8, '#c28e5c')
  // Ferns and rocks at the view's lower edge.
  for (let x = 174; x < W; x += 5) {
    const h = 4 + (hsh(x, 1) % 6)
    g.poly([[x - 3, 600], [x + 1, 600 - h], [x + 5, 600]], '#3f8a66')
  }
  // Staircase: 306 steps between naga balustrades.
  const x0 = CX - 20
  for (let y = ST_T; y < ST_B; y += 3) {
    const k = (y - ST_T) / 3
    g.rect(x0, y, 40, 3, k % 2 ? '#e4ddd6' : '#f0ebe6')
    g.hline(x0, x0 + 39, y, '#ffffff')
    g.hline(x0, x0 + 39, y + 2, '#cfc6c0')
    if (hsh(k, 3) % 9 === 0) g.px(x0 + (hsh(k, 7) % 38) + 1, y + 1, '#8ab860')
  }
  // Landing half way up.
  G.paving(g, 100, LAND.y0, 88, LAND.y1 - LAND.y0, 6, 'grey')
  G.leafLitter(g, 100, LAND.y0, 40, LAND.y1 - LAND.y0, 26, 6)
  // Step counter marks every 50 steps.
  for (let i = 1; i <= 6; i++) {
    const y = ST_B - i * 50 * ((ST_B - ST_T) / 306)
    g.rect(CX - 2, Math.round(y), 4, 2, '#d8c8b0')
  }
  // Balustrade walls under the serpents.
  const railL: [number, number][] = [[120, ST_T + 8], [120, LAND.y0 - 4], [96, LAND.y0 + 6], [96, LAND.y1 - 6], [120, LAND.y1 + 4], [120, ST_B - 8], [110, ST_B + 12], [102, BASE_Y + 30]]
  const railR: [number, number][] = railL.map(([x, y]) => [2 * CX - x, y])
  for (const rail of [railL, railR]) {
    for (let i = 1; i < rail.length; i++) {
      const [ax, ay] = rail[i - 1]
      const [bx, by] = rail[i]
      const n = Math.ceil(Math.hypot(bx - ax, by - ay))
      for (let k = 0; k <= n; k++) {
        const x = ax + ((bx - ax) * k) / n
        const y = ay + ((by - ay) * k) / n
        g.rect(Math.round(x) - 5, Math.round(y), 10, 4, '#f4efe8')
        g.px(Math.round(x) - 5, Math.round(y), '#ffffff')
        g.px(Math.round(x) + 4, Math.round(y), '#c9bfb8')
        g.px(Math.round(x) + 4, Math.round(y) + 1, '#c9bfb8')
      }
    }
  }
  // The two great serpents, undulating down the rails.
  const wave = (rail: [number, number][], s: number): [number, number][] => {
    const out: [number, number][] = []
    for (let i = 1; i < rail.length; i++) {
      const [ax, ay] = rail[i - 1]
      const [bx, by] = rail[i]
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 3)
      for (let k = 0; k < n; k++) {
        const x = ax + ((bx - ax) * k) / n
        const y = ay + ((by - ay) * k) / n
        out.push([x + Math.sin(y * 0.07) * 1.6 * s, y - 3 - Math.abs(Math.sin(y * 0.05)) * 3])
      }
    }
    out.push(rail[rail.length - 1])
    return out
  }
  serpent(g, wave(railL, 1), 8, NAGA_GREEN, 1)
  serpent(g, wave(railR, -1), 8, NAGA_GREEN, 3)
  // Tails curling on the terrace edge.
  for (const s of [-1, 1]) {
    const tx = CX + s * 24
    g.circle(tx, ST_T + 4, 3, NAGA_GREEN.d)
    g.circle(tx - s, ST_T + 3, 2, NAGA_GREEN.b)
    g.px(tx + s * 3, ST_T + 1, GOLD.b)
  }
  // Cable car track.
  for (let y = TER_B + 6; y < BASE_Y + 20; y += 4) {
    g.rect(66, y, 14, 2, '#8a8480')
    g.hline(66, 79, y, '#a89e98')
  }
  g.vline(69, TER_B + 4, BASE_Y + 22, '#5a5068')
  g.vline(76, TER_B + 4, BASE_Y + 22, '#5a5068')
  for (let y = TER_B + 30; y < BASE_Y; y += 48) {
    g.rect(64, y, 3, 12, '#bdb2ae')
    g.rect(79, y, 3, 12, '#bdb2ae')
  }
  // Tung poles along the stairs.
  for (let y = ST_T + 40; y < ST_B - 20; y += 86) {
    if (y > LAND.y0 - 20 && y < LAND.y1 + 20) continue
    for (const x of [112, 176]) {
      g.rect(x, y - 30, 1, 32, '#8a5a3a')
      g.px(x, y - 31, GOLD.b)
      g.hline(x - 3, x + 3, y - 29, '#8a5a3a')
    }
  }
  // Base plaza.
  G.paving(g, 0, BASE_Y, W, ROAD_Y - BASE_Y - 10, 8, 'grey')
  G.weather(g, 0, BASE_Y, W, ROAD_Y - BASE_Y - 10, 9, 1.1)
  G.puddle(g, 206, 1044, 5, 1.8)
  G.puddle(g, 34, 960, 4, 1.5)
  // Stair foot widening.
  G.paving(g, 112, BASE_Y - 16, 64, 20, 6, 'grey')
  G.flowerBed(g, 4, 904, 30, 10, ['#ff9fc0', '#fffaf0', '#b394f0'], 2)
  G.flowerBed(g, 250, 904, 34, 10, ['#f58f35', '#ffd23f', '#fffaf0'], 3)
  // Road.
  sidewalk(g, 0, ROAD_Y - 10, W, 10)
  road(g, 0, ROAD_Y, W, 34)
  g.rect(0, ROAD_Y + 34, W, 2, '#8c8187')
  G.lawn(g, 0, ROAD_Y + 36, W, H - ROAD_Y - 36, 5)
  // Bus stop marking.
  g.rect(118, ROAD_Y + 2, 52, 2, '#ffd23f')
}

function doiGags(): Gag[] {
  const kid1 = look({ gender: 'f', hair: 'hair_long', hairColor: 0, top: 'top_white', bottom: 'bot_skirt' })
  const kid2 = look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_tee_black', bottom: 'bot_black' })
  const driver = look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_polo', bottom: 'bot_khaki' })
  const tired = look({ gender: 'm', hair: 'hair_short', hairColor: 3, top: 'top_hawaii', bottom: 'bot_cargo', head: 'head_sunhat' })
  const counter = look({ gender: 'f', hair: 'hair_twin', top: 'top_school_f', bottom: 'bot_school_skirt' })
  const salo = look({ gender: 'm', hair: 'hair_short', hairColor: 6, top: 'top_mohom', bottom: 'bot_fisherman' })
  const longan = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_floral', head: 'head_sunhat' })
  const selfie = look({ gender: 'f', hair: 'hair_long', hairColor: 2, top: 'top_tee_white', bottom: 'bot_denim_shorts' })
  const khom = look({ gender: 'f', hair: 'hair_bun', hairColor: 0, top: 'top_sabai', bottom: 'bot_sin_mudmee' })
  const khaosoi = look({ gender: 'f', hair: 'hair_bun', hairColor: 0, top: 'top_vendor', bottom: 'bot_sarong' })
  const crafts = look({ gender: 'f', hair: 'hair_long', hairColor: 0, top: 'top_tee_black', bottom: 'bot_black' })
  let squirrelHop = 0
  return [
    // Foot of the mountain.
    {
      x: 150, y: 992, lines: ['ถ่ายรูปกับหนูไหมคะ~ 20 บาท', 'สวัสดีค่า! หนูชื่อหมี่ค่ะ', 'ชุดนี้แม่ปักให้เองนะ', 'ยิ้ม~ แชะ!'],
      draw: (g, p) => drawCostumed(g, kid1, p, 'akha'),
      react: (s, x, y) => s.particles.hearts(x, y - 34, 2),
    },
    {
      x: 132, y: 1004, lines: ['ขนมหมดแล้ววว', 'ไปไหว้พระธาตุมาหรือยังครับ', 'ผมเป็นม้งครับ!'],
      draw: (g, p) => drawCostumed(g, kid2, p, 'hmong'),
    },
    {
      x: 96, y: 1062, lines: ['ขึ้นดอยไหมครับ! คนละ 60', 'รถแดงไปไหนก็ได้ครับ', 'ลงดอยไปนิมมานฯ ไหมครับ?', 'เต็มคันแล้วออกเลยครับ'],
      draw: (g, p) => drawPerson(g, driver, p, 'front', ['phone']),
    },
    {
      x: 158, y: 930, lines: ['นาค 1 หัว 2 หัว... 7 หัว!', 'พญานาคตัวยาวที่สุดในโลกเลย!', 'หางอยู่บนยอดดอยโน่น'],
      draw: (g, p) => drawPerson(g, counter, p, 'back'),
    },
    { x: 94, y: 1008, z: -1, lines: ['ลำไยหวาน ๆ จ้า กิโลละ 50', 'ชิมก่อนได้นะลูก', 'ลำไยเชียงใหม่ หวานที่สุด!'], draw: (g, p) => drawPerson(g, longan, p) },
    { x: 44, y: 1019, z: -1, lines: ['ข้าวซอยไก่ร้อน ๆ เจ้า', 'ไส้อั่วย่างใหม่ ๆ หอมบ่', 'กินข้าวซอยก่อนขึ้นดอยเน้อ'], draw: (g, p) => drawCostumed(g, khaosoi, p, 'apron') },
    { x: 244, y: 1019, z: -1, lines: ['ย่ามปักมือเจ้า ใบละ 150', 'กำไลเงินชาวเขาแท้ ๆ', 'หมวกไหมพรม อุ่นดีบนดอย'], draw: (g, p) => drawCostumed(g, crafts, p, 'hmong') },
    {
      x: 186, y: 974, lines: ['ยิ้ม~ กับพญานาค!', 'ขอรูปคู่กับนาคอีกรูปนะ', 'Doi Suthep สวยมาก!'],
      draw: (g, p) => drawPerson(g, selfie, p, 'back', ['selfie']),
      react: (s, x, y) => gagFx.flash(s, x, y),
    },
    // On the stairs.
    {
      x: 150, y: 760, lines: ['ขั้นที่... 199... แฮ่ก ๆ', 'ใครบอกว่ามีแค่ 306 ขั้น!', 'ขอนั่งพักแป๊บ… ขาสั่น', 'เห็นรถรางแล้วอิจฉา'],
      draw: (g, p) => drawPerson(g, tired, p, 'front', [], p.react > 0 ? 'happy' : 'sit'),
    },
    {
      x: 116, y: 638, w: 16, h: 30, lines: ['เสียงสะล้อซอซึง~', 'เพลงล่องแม่ปิงจ้า', 'ฟังเพลงเมืองเหนือเพราะ ๆ'],
      draw: (g, p) => {
        drawPerson(g, salo, p, 'front', [], 'sit')
        // Salo fiddle.
        g.vline(p.x + 4, p.y - 18, p.y - 6, '#6e4a35')
        g.ellipse(p.x + 4, p.y - 6, 2, 1.5, '#c28e5c')
        const bow = Math.round(Math.sin(p.t * 6) * 2)
        g.line(p.x - 2 + bow, p.y - 12, p.x + 7 + bow, p.y - 10, '#e0cfa8')
      },
    },
    {
      x: 34, y: 470, w: 20, h: 24, lines: ['จี๊ด ๆ!', 'จี๊ด! (ถือลูกสนไว้แน่น)', 'จี๊ด ๆ ๆ~'],
      draw: (g, p) => drawSquirrel(g, p.x, p.y - 14 - (p.react > 0 ? Math.abs(Math.round(Math.sin(p.t * 12) * 3)) : 0), p.t, p.react > 0, Math.floor(p.t / 4) % 2 === 0),
      react: () => {
        squirrelHop++
        sfx.tap()
      },
    },
    // Outer terrace.
    {
      x: 196, y: 330, lines: ['ผูกข้อมือเสริมมงคลนะโยม', 'ขอให้เจริญพร อายุ วรรณะ สุขะ พละ', 'ถอดรองเท้าก่อนเข้าลานพระธาตุนะ'],
      draw: (g, p) => {
        const s = monkSprite('front', p.react > 0 ? 'bless' : 'stand', { skin: 2 })
        drawShadow(g, p.x, p.y, 6, 2)
        g.draw(s.canvas, Math.round(p.x - s.w / 2), Math.round(p.y - s.h + 1))
        // Sai sin thread spool.
        g.px(p.x + 5, p.y - 11, '#ffffff')
        g.px(p.x + 6, p.y - 11, '#ffffff')
      },
      react: (s, x, y) => s.particles.sparkles(x, y - 20, 6, '#fffaf0', 6),
    },
    {
      x: 232, y: 348, lines: ['โคมล้านนาจ้า ลูกละ 40', 'แขวนหน้าบ้านสวยงามเน้อ', 'ยี่เป็งปีนี้มาลอยโคมกันเน้อ'],
      draw: (g, p) => {
        drawCostumed(g, khom, p, 'lanna')
        for (const [dx, c] of [[-8, '#e8514a'], [8, '#ffd23f']] as const) {
          g.vline(p.x + dx, p.y - 30, p.y - 26, '#6e4a35')
          g.rect(p.x + dx - 2, p.y - 26, 5, 5, c)
          g.px(p.x + dx, p.y - 21, '#fffaf0')
        }
      },
    },
    {
      x: 250, y: 372, w: 14, h: 24, lines: ['หยอดเหรียญ 10 บาท ดูเมืองเชียงใหม่!', 'เห็นคูเมืองเป็นสี่เหลี่ยมเลย!', 'เห็นสนามบินด้วย~ เครื่องบินลงพอดี!'],
      draw: (g, p) => drawSpriteGag(g, binocularsSprite(), p),
      react: () => sfx.coin(),
    },
    {
      x: 110, y: 364, lines: ['ช่วยจับรองเท้าให้เป็นคู่หน่อยจ้า', 'ใครใส่รองเท้าขึ้นลานโดนยักษ์ดุนะ~'],
      draw: (g, p) => drawPhoneMonk(g, p, true),
    },
  ]
}

export function doiSuthepMap(): MapDef {
  const chedi = lannaChediSprite()
  const gate = lannaGateSprite()
  const nagaL = nagaHeadsSprite(NAGA_GREEN, 7, true)
  const rack = T.bellRackSprite(9)
  const elephant = whiteElephantSprite()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const RACKS = [
    { x: 70, y: 300 },
    { x: 70, y: 348 },
  ]
  const NAGAS = [
    { x: 100, y: 944, flip: false },
    { x: 188, y: 944, flip: true },
  ]
  const ELE = { x: 222, y: 300 }
  const LAMPS: [number, number][] = [
    [128, 296],
    [160, 296],
    [116, 900],
    [172, 900],
    [30, 1040],
    [258, 1040],
    [106, 640],
    [182, 640],
  ]
  const STALLS = {
    khaosoi: { x: 44, y: 1026 },
    crafts: { x: 244, y: 1026 },
    flower: { x: 196, y: 1022 },
  }
  const props: PlacedProp[] = [
    { sprite: chedi, x: CX, y: 222 },
    { sprite: galleryOuterSprite(112), x: 0, y: GAL_Y },
    { sprite: galleryOuterSprite(112), x: 176, y: GAL_Y },
    { sprite: gate, x: CX, y: GAL_Y + 2 },
    { sprite: shoeRack('doiL', 28), x: 102, y: 252 },
    { sprite: shoeRack('doiR', 28, false), x: 186, y: 252 },
    ...RACKS.map((r) => ({ sprite: rack, x: r.x, y: r.y })),
    { sprite: elephant, x: ELE.x, y: ELE.y },
    { sprite: marigoldPile(16, 2), x: ELE.x - 8, y: ELE.y + 4 },
    { sprite: F.candleStandSprite(), x: ELE.x + 16, y: ELE.y + 2 },
    { sprite: donationBox('doi'), x: 196, y: 262 },
    { sprite: cableStationSprite(true), x: 73, y: 398 },
    { sprite: cableStationSprite(false), x: 58, y: 942 },
    { sprite: restSalaSprite(), x: 168, y: 626 },
    { sprite: G.bodhiTree2(), x: 90, y: 612, id: 'landtree' },
    ...NAGAS.map((n) => ({ sprite: nagaL, x: n.x, y: n.y, flip: n.flip })),
    ...PINES.map(([x, y, v], i) => ({ sprite: pineSprite(v), x, y, id: 'pine' + i })),
    { sprite: khaoSoiStallSprite(), x: STALLS.khaosoi.x, y: STALLS.khaosoi.y },
    { sprite: hillTribeStallSprite(), x: STALLS.crafts.x, y: STALLS.crafts.y },
    { sprite: F.stallSprite(), x: STALLS.flower.x, y: STALLS.flower.y },
    { sprite: bld('doi:longan', 22, 12, 11, 11, (g) => {
      g.rect(1, 5, 20, 6, '#c28e5c')
      g.hline(1, 20, 5, '#d9a57a')
      for (let i = 0; i < 14; i++) g.circle(3 + (i % 7) * 2.6, 3 + Math.floor(i / 7) * 2, 1.4, i % 3 ? '#c9a04c' : '#b08038')
    }), x: 94, y: 1014 },
    { sprite: songthaewRedSprite(), x: 44, y: ROAD_Y + 14 },
    { sprite: songthaewRedSprite(true), x: 234, y: ROAD_Y + 14 },
    { sprite: F.flagPoleSprite(40), x: 108, y: 1048 },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
    { sprite: lotusVase(true), x: 140, y: 248 },
    { sprite: lotusVase(true), x: 150, y: 248, flip: true },
  ]

  const obstacles = [
    { x: 0, y: 0, w: W, h: 238 },
    // Terrace furniture.
    { x: 88, y: 246, w: 28, h: 8 },
    { x: 172, y: 246, w: 28, h: 8 },
    ...RACKS.map((r) => ({ x: r.x - 43, y: r.y - 8, w: 86, h: 9 })),
    { x: ELE.x - 20, y: ELE.y - 10, w: 42, h: 12 },
    { x: 190, y: 256, w: 12, h: 7 },
    { x: 256, y: 366, w: 12, h: 7 },
    { x: 52, y: 372, w: 42, h: 30 },
    { x: 0, y: 236, w: 22, h: 150 },
    { x: 266, y: 236, w: 22, h: 150 },
    { x: 170, y: TER_B - 4, w: W - 170, h: 8 },
    // Slopes either side of the stairs (the landing opens out half way).
    { x: 0, y: TER_B, w: 124, h: LAND.y0 - TER_B },
    { x: 164, y: TER_B, w: W - 164, h: LAND.y0 - TER_B },
    { x: 0, y: LAND.y0, w: 100, h: LAND.y1 - LAND.y0 },
    { x: 188, y: LAND.y0, w: W - 188, h: LAND.y1 - LAND.y0 },
    { x: 0, y: LAND.y1, w: 124, h: BASE_Y - 16 - LAND.y1 },
    { x: 164, y: LAND.y1, w: W - 164, h: BASE_Y - 16 - LAND.y1 },
    { x: 0, y: BASE_Y - 16, w: 112, h: 16 },
    { x: 176, y: BASE_Y - 16, w: W - 176, h: 16 },
    { x: 150, y: 618, w: 38, h: 10 },
    { x: 84, y: 604, w: 20, h: 12 },
    // Base.
    ...NAGAS.map((n) => ({ x: n.x - 19, y: n.y - 14, w: 38, h: 15 })),
    { x: 36, y: 924, w: 44, h: 20 },
    { x: 0, y: 902, w: 36, h: 14 },
    { x: 250, y: 902, w: 38, h: 14 },
    { x: STALLS.khaosoi.x - 24, y: STALLS.khaosoi.y - 16, w: 48, h: 17 },
    { x: STALLS.crafts.x - 24, y: STALLS.crafts.y - 16, w: 48, h: 17 },
    { x: STALLS.flower.x - 24, y: STALLS.flower.y - 14, w: 48, h: 15 },
    { x: 84, y: 1006, w: 22, h: 9 },
    { x: 105, y: 1044, w: 7, h: 5 },
    { x: 0, y: ROAD_Y, w: W, h: H - ROAD_Y },
    ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
  ]

  return {
    id: 'doi_suthep',
    place: 'doi_suthep',
    area: 'mountain',
    w: W,
    h: H,
    skyH: 120,
    ground: '#4f8a52',
    camBias: 0.6,
    entries: {
      'doi_suthep:terrace': { x: CX, y: 252, face: 'down' },
    },
    bake: bakeOutdoor,
    props,
    obstacles,
    hotspots: [
      hs('door:doi_suthep:terrace', 'ลานพระธาตุ', 'ถอดรองเท้า แล้วเข้าไปไหว้พระธาตุทองคำ', 'door', { x: 124, y: 170, w: 40, h: 66 }, { x: CX, y: 244 }, { marker: { x: CX, y: 164 }, beacon: true, near: 10 }),
      hs('job:arrange_shoes', 'ชั้นวางรองเท้า', 'ช่วยจัดรองเท้าให้เป็นคู่ ๆ', 'broom', { x: 86, y: 232, w: 32, h: 22 }, { x: 102, y: 262 }),
      hs('bells', 'ระฆังรอบลานพระธาตุ', 'ตีระฆังให้ดังกังวานทั่วดอย', 'bell', { x: 26, y: 262, w: 88, h: 88 }, { x: 70, y: 360 }, { marker: { x: 70, y: 258 } }),
      hs('job:polish_brass', 'ขัดระฆังทองเหลือง', 'ขัดระฆังให้เงาวับ', 'broom', { x: 26, y: 310, w: 88, h: 40 }, { x: 104, y: 358 }, { marker: { x: 104, y: 318 } }),
      hs('view', 'จุดชมวิวเมืองเชียงใหม่', 'นั่งสมาธิ มองเมืองจากยอดดอย', 'meditate', { x: 200, y: 344, w: 50, h: 36 }, { x: 222, y: 368 }, { face: 'down', marker: { x: 222, y: 340 } }),
      hs('job:sweep_leaves', 'ลานพักกลางบันได', 'กวาดใบไม้ร่วงบนบันไดนาค', 'broom', { x: 100, y: LAND.y0, w: 44, h: LAND.y1 - LAND.y0 }, { x: 120, y: 640 }, { marker: { x: 120, y: 606 } }),
      hs('shop:doi_suthep_khaosoi', 'ร้านข้าวซอยป้าคำ', 'ข้าวซอย ไส้อั่ว แคบหมู', 'shop', { x: 20, y: 984, w: 48, h: 44 }, { x: 44, y: 1036 }, { marker: { x: 44, y: 980 } }),
      hs('shop:doi_suthep_hilltribe', 'ร้านผ้าปักชาวเขา', 'ย่าม ผ้าปัก เครื่องเงิน', 'shop', { x: 220, y: 984, w: 48, h: 44 }, { x: 244, y: 1036 }, { marker: { x: 244, y: 980 } }),
      hs('flower_stall', 'ร้านดอกไม้ธูปเทียน', 'ดอกบัว ธูปเทียน ขึ้นไปบูชาพระธาตุ', 'garland', { x: 174, y: 986, w: 44, h: 38 }, { x: 196, y: 1034 }, { marker: { x: 196, y: 984 } }),
      hs('gate', 'ป้ายรถแดง', 'ลงดอย กลับบ้าน หรือไปที่อื่น', 'map', { x: 112, y: 1040, w: 64, h: 24 }, { x: CX, y: 1054 }, { face: 'down', marker: { x: CX, y: 1036 }, near: 12 }),
    ],
    spawn: { x: CX, y: 1050, face: 'up' },
    pickupSpots: [
      { x: 132, y: 440 }, { x: 156, y: 520 }, { x: 110, y: 630 }, { x: 180, y: 644 }, { x: 138, y: 820 },
      { x: 40, y: 270 }, { x: 250, y: 262 }, { x: 150, y: 350 }, { x: 20, y: 1040 }, { x: 270, y: 1046 },
      { x: 130, y: 960 }, { x: 222, y: 952 },
    ],
    lights: [
      { x: CX, y: 150, r: 40, color: '#ffe7a0' },
      { x: CX, y: 210, r: 24 },
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 20 })),
      { x: STALLS.khaosoi.x, y: 1004, r: 18, color: '#ffcf7a' },
      { x: STALLS.crafts.x, y: 1004, r: 16, color: '#ffcf7a' },
      { x: STALLS.flower.x, y: 1004, r: 16, color: '#ffb3cf' },
      { x: ELE.x + 16, y: ELE.y - 8, r: 8, color: '#ff9a5a' },
      { x: 73, y: 382, r: 14 },
      { x: 58, y: 926, r: 14 },
    ],
    life(s) {
      const glints = [
        ...hooksAt(chedi, 'glints', CX, 222),
        ...hooksAt(gate, 'glints', CX, GAL_Y + 2),
        ...NAGAS.flatMap((n) => hooksAt(nagaL, 'glints', n.x, n.y)),
        ...hooksAt(elephant, 'glints', ELE.x, ELE.y),
      ]
      // City lights twinkling in the valley below.
      const city: { x: number; y: number; c?: string }[] = []
      for (let i = 0; i < 70; i++) {
        const v = hsh(i, 77)
        city.push({ x: 180 + (v % 104), y: 404 + ((v >> 3) % 180), c: v % 4 ? '#ffe07a' : '#ffb35a' })
      }
      const notes = new Notes(s)
      const gags = doiGags()
      gags.find((g) => g.lines[0].startsWith('เสียงสะล้อ'))!.react = (sc, x, y) => {
        notes.emit(x + 4, y - 26)
        tune([0, 2, 4, 2, 5, 4])
        void sc
      }
      return [
        new Glints(s, glints, 1.6),
        ...RACKS.map((r) => new RackBells(s, hooksAt(rack, 'bells', r.x, r.y), { x: r.x - 43, y: r.y - 44, w: 86, h: 44 }, r.y)),
        new Shuttle(s, [[73, TER_B + 14], [73, BASE_Y + 22]], 16, (g, x, y, t) => drawCabin(g, x, y, t), {
          pause: 4,
          lines: ['ติ๊งต่อง~ รถรางขึ้นดอยจ้า', 'ไม่อยากเดิน 306 ขั้น นั่งนี่เลย!', 'ขึ้นไวกว่าเดินเยอะ~'],
          hit: { w: 16, h: 16 },
          onArrive: () => sfx.chime(),
          sortOffset: 1,
        }),
        new Twinkles(s, city),
        notes,
        new Gags(s, gags),
        new Tung(s, [
          ...[ST_T + 40, ST_T + 126, 732, 818].flatMap((y) => [
            { x: 112, y: y - 29, len: 20, colors: ['#e8514a', '#ffd23f', '#fffaf0'] },
            { x: 176, y: y - 29, len: 20, colors: ['#5a8de0', '#fffaf0', '#ffd23f'] },
          ]),
        ]),
        new Lanterns(s, [
          { x0: 118, y0: ST_T + 6, x1: 170, y1: ST_T + 6, n: 6, sag: 5, colors: ['#e8514a', '#ffd23f', '#fffaf0'] },
          { x0: 104, y0: LAND.y0 - 4, x1: 184, y1: LAND.y0 - 4, n: 8, sag: 7, colors: ['#e8514a', '#ffd23f', '#fffaf0', '#ff9fc0'] },
          { x0: 118, y0: BASE_Y - 26, x1: 170, y1: BASE_Y - 26, n: 6, sag: 5, colors: ['#e8514a', '#ffd23f', '#fffaf0'] },
        ]),
        Flames.candles(s, ELE.x + 16, ELE.y + 2),
        new Smoke(s, [{ x: STALLS.khaosoi.x - 14, y: 1004 }], 3),
        new Butterflies(s, [
          { x: 4, y: 890, w: 40, h: 20 },
          { x: 240, y: 890, w: 44, h: 20 },
          { x: 100, y: 600, w: 88, h: 40 },
        ], 5),
        new CloudShadows(s, 3),
        new SunRays(s),
        new Traffic(s, [{ y: ROAD_Y + 28, dir: -1 }]),
        new TapZones([
          ...PINES.map(([x, y], i) => ({
            rect: { x: x - 12, y: y - 52, w: 24, h: 44 },
            fn: () => {
              s.shake('pine' + i)
              s.drop(x, y - 34, 18, 4, '#3f8a66', '#86c95f', 'leaf')
              if (Math.random() < 0.6) s.burstBirds(x, y - 40, 2)
              sfx.whoosh()
            },
          })),
          {
            rect: { x: ELE.x - 20, y: ELE.y - 40, w: 40, h: 40 },
            fn: () => {
              s.say(['ช้างเผือกอัญเชิญพระธาตุขึ้นดอยมา~', 'แปร๊นนน! (ช้างปูนปั้นก็ร้องได้)', 'ตำนานว่าช้างหยุดที่นี่ แล้วเกิดวัด'][Math.floor(Math.random() * 3)], ELE.x, ELE.y - 42)
              s.particles.sparkles(ELE.x + 3, ELE.y - 38, 8, '#fff3a6', 8)
              sfx.chime()
            },
          },
          ...NAGAS.map((n) => ({
            rect: { x: n.x - 26, y: n.y - 70, w: 52, h: 50 },
            fn: () => {
              s.say(['พญานาคเจ็ดเศียรเฝ้าบันได~', 'ฟ่อ~ (อย่าลืมไหว้ก่อนขึ้นนะ)', 'เกล็ดแก้วระยิบระยับ!'][Math.floor(Math.random() * 3)], n.x, n.y - 74)
              s.particles.sparkles(n.x, n.y - 58, 10, '#9fe8ff', 12)
              sfx.sparkle()
            },
          })),
          {
            rect: { x: 60, y: 560, w: 60, h: 52 },
            fn: () => {
              s.shake('landtree')
              s.drop(90, 580, 50, 6, '#9ed86a', '#5eae55', 'leaf')
              s.burstBirds(90, 570, 2)
              sfx.whoosh()
            },
          },
        ]),
      ]
    },
    overlay(g, t) {
      drawMist(g, t, 0, W, [420, 520, 690, 810, 880], 0.22)
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.8) {
        const [x, y] = PINES[Math.floor(Math.random() * PINES.length)]
        if (s.onScreen(x, y, 40)) s.particles.add({ kind: 'leaf', x: x + rand(-8, 8), y: y - 40, vx: rand(-4, 4), vy: rand(6, 10), max: 3, color: '#3f8a66', color2: '#86c95f' })
      }
      if (s.isNight() && Math.random() < dt * 1.4) s.particles.add({ kind: 'sparkle', x: CX + rand(-18, 18), y: rand(56, 150), vy: rand(-6, -2), max: rand(1, 2), color: '#fff3a6', drag: 0.3 })
    },
    wander: [
      { x: 24, y: 260, w: 240, h: 110 },
      { x: 128, y: 400, w: 32, h: 480 },
      { x: 104, y: LAND.y0 + 6, w: 80, h: 36 },
      { x: 10, y: 950, w: 268, h: 90 },
    ],
    pois: [
      { x: CX, y: 262, face: 'up' },
      { x: 70, y: 360, face: 'up' },
      { x: 222, y: 368, face: 'down' },
      { x: ELE.x, y: ELE.y + 12, face: 'up' },
      { x: 150, y: 560, face: 'up' },
      { x: 120, y: 640, face: 'left' },
      { x: 140, y: 930, face: 'up' },
      { x: 196, y: 1034, face: 'up' },
      { x: 44, y: 1036, face: 'up' },
    ],
    fireflies: [
      { x: 0, y: 420, w: 110, h: 440 },
      { x: 180, y: 620, w: 108, h: 260 },
    ],
    monkPath: [
      [CX, 246],
      [CX, 1000],
      [60, 1044],
      [-20, 1044],
    ],
    birds: { x: 20, y: 950, w: 250, h: 40 },
    cats: [{ x: 250, y: 256, pose: 'sleep', color: '#9a8a8a' }],
    vendors: [{ x: 174, y: 1030 }],
    dogs: ['cocoa', 'dang'],
    visitors: 6,
  }
}

// ===========================================================================
// Inside the cloister: the golden chedi on its terrace.

const TW = 288
const TH = 620
const TCX = 144
const CH = { x: TCX, y: 404 }
const VIH = { x: TCX, y: 196 }

function bakeTerrace(g: Surface, night: boolean) {
  // Sky over the north gallery.
  mountainsFar(g, night)
  G.treeLine(g, 110, TW, { L: '#6aa888', b: '#4f8a70', d: '#3d705c', D: '#2c5a4a' }, 5)
  // Marble courtyard.
  g.rect(0, 150, TW, TH - 150, '#e4ddd6')
  for (let j = 150; j < TH; j += 12)
    for (let i = 0; i < TW; i += 12) {
      const c = ((i + j) / 12) % 2 ? '#f4f0ec' : '#e8e2dc'
      g.rect(i, j, 12, 12, c)
      g.px(i + 1, j + 1, '#ffffff')
      if (hsh(i, j, 2) < 150) g.line(i + 3, j + 2, i + 7, j + 8, '#dcd4ce')
    }
  // Red carpet around the chedi (the circumambulation path).
  g.ctx.save()
  g.ctx.fillStyle = '#b8343f'
  for (let a = 0; a < Math.PI * 2; a += 0.005) {
    for (let r = 0; r < 8; r++) {
      const x = CH.x + Math.cos(a) * (76 + r)
      const y = CH.y - 40 + Math.sin(a) * (62 + r * 0.8)
      g.ctx.fillRect(Math.round(x) - g.ox, Math.round(y) - g.oy, 1, 1)
    }
  }
  g.ctx.restore()
  // Chedi platform.
  g.rect(CH.x - 50, CH.y - 82, 100, 96, '#d8d0c8')
  g.rect(CH.x - 48, CH.y - 80, 96, 92, '#f4f1ee')
  for (let j = CH.y - 80; j < CH.y + 12; j += 8) g.hline(CH.x - 48, CH.x + 47, j, '#e4ddd6')
  G.groundShadow(g, CH.x, CH.y - 2, 50, 8, 0.6)
  // Side galleries (roof strips with pillars).
  for (const s of [0, 1]) {
    const x = s ? TW - 26 : 0
    g.rect(x, 150, 26, TH - 190, LANNA_ROOF.field)
    for (let y = 152; y < TH - 40; y += 3) g.hline(x, x + 25, y, y % 6 ? LANNA_ROOF.field : LANNA_ROOF.fieldD)
    g.vline(s ? x : x + 25, 150, TH - 40, GOLD.d)
    g.vline(s ? x + 1 : x + 24, 150, TH - 40, GOLD.b)
    // Lacquered pillars along the arcade.
    for (let y = 214; y < TH - 50; y += 36) {
      const px = s ? x - 2 : x + 24
      g.rect(px, y - 26, 4, 28, LACQUER.b)
      g.vline(px, y - 26, y + 1, LACQUER.L)
      g.rect(px - 1, y - 27, 6, 2, GOLD.b)
      g.rect(px - 1, y, 6, 2, GOLD.d)
    }
  }
  // South gallery roof in the foreground.
  g.rect(0, TH - 40, TW, 40, LANNA_ROOF.field)
  for (let y = TH - 38; y < TH; y += 3) g.hline(0, TW - 1, y, LANNA_ROOF.fieldD)
  g.hline(0, TW - 1, TH - 40, GOLD.b)
  g.hline(0, TW - 1, TH - 39, GOLD.d)
  // Gateway gap in the south gallery.
  g.rect(TCX - 18, TH - 40, 36, 40, '#fff3d6')
  g.rect(TCX - 16, TH - 40, 32, 40, '#fffbe8')
  g.vline(TCX - 18, TH - 40, TH - 1, GOLD.d)
  g.vline(TCX + 17, TH - 40, TH - 1, GOLD.d)
  // Lotus offering troughs and kneeling mats before the chedi.
  carpet(g, TCX - 30, CH.y + 44, 60, 12, '#b8343f')
}

export function doiTerraceMap(): MapDef {
  const chedi = lannaChediSprite()
  const umb = goldUmbrellaSprite()
  const vih = lannaViharnSprite()
  const vihN = lannaViharnSprite(true)
  const galN = galleryInsideSprite(72, 'n')
  const rack = candleRack('doiT', 10)
  const UMB = [
    { x: CH.x - 44, y: CH.y - 76 },
    { x: CH.x + 44, y: CH.y - 76 },
    { x: CH.x - 44, y: CH.y + 10 },
    { x: CH.x + 44, y: CH.y + 10 },
  ]
  const tower = T.bellTowerSprite(T.ROOF.red)
  const TOWER = { x: 62, y: 560 }
  const RACKS = [
    { x: 58, y: 470 },
    { x: 230, y: 470 },
  ]
  const props: PlacedProp[] = [
    { sprite: galN, x: 0, y: 200 },
    { sprite: galN, x: TW - 72, y: 200 },
    { sprite: vih, night: vihN, x: VIH.x, y: VIH.y },
    { sprite: chedi, x: CH.x, y: CH.y },
    ...UMB.map((u) => ({ sprite: umb, x: u.x, y: u.y })),
    { sprite: goldRailSprite(88), x: CH.x - 44, y: CH.y + 16 },
    { sprite: tower, x: TOWER.x, y: TOWER.y },
    { sprite: F.buddhaStatueSprite(), x: 226, y: 548 },
    { sprite: offeringTable('doiT3', 24, ['lotus', 'candle', 'lotus']), x: 226, y: 560 },
    { sprite: F.urnSprite(), x: TCX, y: CH.y + 40, shadow: [10, 2] as [number, number] },
    ...RACKS.map((r) => ({ sprite: rack, x: r.x, y: r.y })),
    { sprite: offeringTable('doiT1', 30, ['lotus', 'candle', 'fruit', 'candle', 'lotus']), x: TCX - 40, y: CH.y + 38 },
    { sprite: offeringTable('doiT2', 30, ['garland', 'lotus', 'candle', 'lotus', 'garland']), x: TCX + 40, y: CH.y + 38 },
    { sprite: donationBox('doiT'), x: 196, y: 238 },
    { sprite: lotusVase(true), x: 60, y: 232 },
    { sprite: lotusVase(true), x: 228, y: 232 },
    // Small seated Buddhas along the side galleries.
    ...[250, 300, 350, 400, 450, 500].flatMap((y) => [
      { sprite: buddhaProp('lanna', 0.18), x: 18, y },
      { sprite: buddhaProp('lanna', 0.18), x: TW - 18, y },
    ]),
  ]
  return {
    id: 'doi_suthep:terrace',
    place: 'doi_suthep',
    area: 'mountain',
    w: TW,
    h: TH,
    skyH: 120,
    ground: '#e4ddd6',
    camBias: 0.58,
    entries: {
      doi_suthep: { x: TCX, y: TH - 50, face: 'up' },
      'doi_suthep:viharn': { x: VIH.x, y: VIH.y + 14, face: 'down' },
    },
    bake: bakeTerrace,
    props,
    obstacles: [
      { x: 0, y: 0, w: TW, h: 204 },
      { x: 0, y: 150, w: 28, h: TH },
      { x: TW - 28, y: 150, w: 28, h: TH },
      { x: 0, y: TH - 40, w: TCX - 16, h: 40 },
      { x: TCX + 16, y: TH - 40, w: TW - TCX - 16, h: 40 },
      // Chedi platform and umbrellas.
      { x: CH.x - 50, y: CH.y - 84, w: 100, h: 102 },
      { x: TOWER.x - 22, y: TOWER.y - 10, w: 44, h: 11 },
      { x: 212, y: 540, w: 28, h: 22 },
      { x: TCX - 12, y: CH.y + 34, w: 24, h: 9 },
      { x: TCX - 56, y: CH.y + 32, w: 32, h: 8 },
      { x: TCX + 24, y: CH.y + 32, w: 32, h: 8 },
      ...RACKS.map((r) => ({ x: r.x - 18, y: r.y - 6, w: 36, h: 7 })),
      { x: 190, y: 232, w: 12, h: 7 },
    ],
    hotspots: [
      hs('chedi', 'พระบรมธาตุดอยสุเทพ', 'เวียนเทียนรอบพระธาตุทองคำ ๓ รอบ', 'sparkle', { x: CH.x - 48, y: CH.y - 170, w: 96, h: 170 }, { x: TCX, y: CH.y + 58 }, { marker: { x: CH.x, y: CH.y - 174 }, beacon: true }),
      hs('incense', 'กระถางธูปหน้าพระธาตุ', 'จุดธูปอธิษฐาน', 'incense', { x: TCX - 12, y: CH.y + 20, w: 24, h: 22 }, { x: TCX, y: CH.y + 52 }, { marker: { x: TCX, y: CH.y + 18 } }),
      hs('job:light_candles', 'ราวเทียน', 'จุดเทียนบูชาให้สว่างไสว', 'broom', { x: 38, y: 452, w: 40, h: 22 }, { x: 58, y: 482 }),
      hs('job:polish_brass', 'ฉัตรทองสี่มุม', 'เช็ดฉัตรทองและรั้วทองให้เงาวับ', 'broom', { x: CH.x + 40, y: CH.y - 48, w: 26, h: 62 }, { x: CH.x + 66, y: CH.y + 24 }, { marker: { x: CH.x + 52, y: CH.y - 52 } }),
      hs('big_bell', 'หอระฆังล้านนา', 'ตีระฆังใหญ่ ก้องทั่วยอดดอย', 'bell', { x: TOWER.x - 20, y: TOWER.y - 90, w: 40, h: 90 }, { x: TOWER.x, y: TOWER.y + 10 }, { marker: { x: TOWER.x, y: TOWER.y - 94 } }),
      hs('donation', 'ตู้ทำบุญบูรณะพระธาตุ', 'ร่วมทำบุญปิดทององค์พระธาตุ', 'coin', { x: 188, y: 218, w: 16, h: 22 }, { x: 196, y: 246 }),
      hs('door:doi_suthep:viharn', 'วิหารพระเจ้าทันใจ', 'เข้าไปกราบพระประธานล้านนา', 'door', { x: VIH.x - 14, y: VIH.y - 48, w: 28, h: 48 }, { x: VIH.x, y: VIH.y + 6 }, { marker: { x: VIH.x, y: VIH.y - 52 }, near: 10 }),
      hs('door:doi_suthep', 'ประตูโขง', 'ออกไปลานระฆังและบันไดนาค', 'door', { x: TCX - 16, y: TH - 44, w: 32, h: 44 }, { x: TCX, y: TH - 30 }, { face: 'down', marker: { x: TCX, y: TH - 48 }, near: 10 }),
    ],
    spawn: { x: TCX, y: TH - 50, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: CH.x, y: CH.y - 90, r: 60, color: '#ffe7a0' },
      ...UMB.map((u) => ({ x: u.x, y: u.y - 30, r: 12, color: '#ffe7a0' })),
      ...RACKS.map((r) => ({ x: r.x, y: r.y - 10, r: 16, color: '#ffb35a' })),
      { x: VIH.x, y: VIH.y - 30, r: 30 },
      { x: TCX, y: CH.y + 26, r: 10, color: '#ff9a5a' },
    ],
    life(s) {
      const glints = [
        ...hooksAt(chedi, 'glints', CH.x, CH.y),
        ...UMB.flatMap((u) => hooksAt(umb, 'glints', u.x, u.y)),
        ...hooksAt(vih, 'glints', VIH.x, VIH.y),
        ...hooksAt(galN, 'glints', 0, 200),
        ...hooksAt(galN, 'glints', TW - 72, 200),
      ]
      return [
        new Glints(s, glints, 2.4),
        new EaveBells(s, hooksAt(vih, 'bells', VIH.x, VIH.y), VIH.y),
        new TowerBell(s, hooksAt(tower, 'bell', TOWER.x, TOWER.y)[0].x, hooksAt(tower, 'bell', TOWER.x, TOWER.y)[0].y, { x: TOWER.x - 20, y: TOWER.y - 88, w: 40, h: 88 }, TOWER.y),
        new EaveBells(s, hooksAt(tower, 'bells', TOWER.x, TOWER.y), TOWER.y),
        new Circlers(s, CH.x, CH.y - 38, 80, 66, 7, [{ gender: 'f' }, { gender: 'm' }, { gender: 'f', top: 'top_sabai' }]),
        ...RACKS.map((r) => new Flames(s, hooksAt(rack, 'flames', r.x, r.y), r.y)),
        new Flames(s, [...hooksAt(offeringTable('doiT1', 30, ['lotus', 'candle', 'fruit', 'candle', 'lotus']), 'flames', TCX - 40, CH.y + 38)], CH.y + 38),
        new Flames(s, [...hooksAt(offeringTable('doiT2', 30, ['garland', 'lotus', 'candle', 'lotus', 'garland']), 'flames', TCX + 40, CH.y + 38)], CH.y + 38),
        new Smoke(s, [{ x: TCX, y: CH.y + 26 }], 7),
        new Lanterns(s, [
          { x0: 30, y0: 222, x1: TW - 30, y1: 222, n: 14, sag: 10, colors: ['#e8514a', '#ffd23f', '#fffaf0'] },
          { x0: 30, y0: TH - 70, x1: TW - 30, y1: TH - 70, n: 14, sag: 10, colors: ['#ffd23f', '#e8514a', '#fffaf0'] },
        ]),
        new Tung(s, [
          { x: 40, y: 150, len: 26, colors: ['#e8514a', '#ffd23f', '#fffaf0'] },
          { x: TW - 40, y: 150, len: 26, colors: ['#5a8de0', '#ffd23f', '#fffaf0'] },
        ]),
        new TapZones([
          {
            rect: { x: CH.x - 40, y: CH.y - 170, w: 80, h: 120 },
            fn: () => {
              s.particles.sparkles(CH.x, CH.y - 150, 14, '#fff3a6', 16)
              s.say(['พระบรมสารีริกธาตุ ประดิษฐานอยู่ที่นี่', 'ทองคำอร่ามทั้งองค์!', 'พระธาตุประจำปีมะแม'][Math.floor(Math.random() * 3)], CH.x, CH.y - 174)
              sfx.chime()
            },
          },
          ...UMB.map((u) => ({
            rect: { x: u.x - 9, y: u.y - 58, w: 18, h: 50 },
            fn: () => {
              s.particles.sparkles(u.x, u.y - 40, 6, '#fff3a6', 6)
              sfx.bell(3)
            },
          })),
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.8) s.particles.add({ kind: 'sparkle', x: CH.x + rand(-30, 30), y: CH.y - rand(20, 160), vy: rand(-6, -2), max: rand(0.8, 1.6), color: '#fff3a6', drag: 0.3 })
    },
    wander: [
      { x: 34, y: 210, w: 220, h: 90 },
      { x: 34, y: CH.y + 30, w: 220, h: 120 },
    ],
    pois: [
      { x: TCX - 10, y: CH.y + 58, face: 'up' },
      { x: TCX + 10, y: CH.y + 58, face: 'up' },
      { x: 58, y: 484, face: 'up' },
      { x: 230, y: 484, face: 'up' },
      { x: VIH.x - 20, y: VIH.y + 14, face: 'up' },
      { x: 42, y: 330, face: 'left' },
      { x: 246, y: 330, face: 'right' },
    ],
    cats: [{ x: 250, y: 560, pose: 'loaf', color: '#fbf3e4' }],
    dogs: [],
    visitors: 5,
    novices: 1,
  }
}

// ===========================================================================
// The Lanna viharn interior.

const VW = 216
const VH = 300
const ROOM: RoomOpts = {
  w: VW,
  h: VH,
  wallTop: 22,
  wallH: 70,
  side: 10,
  front: 14,
  door: { x: VW / 2, w: 30 },
  floor: 'teak',
  wall: { L: '#c8503a', b: '#9a2a2e', d: '#7a2028', D: '#5a1820' },
  dado: '#5a1820',
}

function lannaWall(g: Surface, x: number, y: number, w: number, h: number) {
  // Gold stencil (ลายคำ) on red: repeating flower and bodhi-leaf pattern.
  for (let j = y + 4; j < y + h - 2; j += 8)
    for (let i = x + 4; i < x + w - 4; i += 8) {
      const o = ((j - y) / 8) % 2 ? 4 : 0
      const cx = i + o
      if (cx > x + w - 4) continue
      g.px(cx, j, GOLD.b)
      g.px(cx - 1, j + 1, GOLD.d)
      g.px(cx + 1, j + 1, GOLD.d)
      g.px(cx, j + 2, GOLD.l)
      g.px(cx, j - 1, GOLD.D)
    }
  // Painted frieze of the relic legend along the top.
  g.rect(x, y, w, 8, '#e8d8b0')
  for (let i = x + 2; i < x + w - 2; i += 10) {
    const v = hsh(i, 9)
    g.rect(i, y + 2, 6, 4, v % 2 ? '#6cc36a' : '#86b0d8')
    g.px(i + 2, y + 3, '#fffaf0')
    if (v % 3 === 0) g.rect(i + 1, y + 4, 2, 2, '#f4efe8')
  }
  g.hline(x, x + w - 1, y + 8, GOLD.d)
  // Windows with lattice.
  for (const wx of [x + 16, x + w - 30]) {
    g.rect(wx - 1, y + 20, 16, 26, GOLD.d)
    g.rect(wx, y + 21, 14, 24, '#ffe7a8')
    for (let k = 0; k < 14; k += 3) g.vline(wx + k, y + 21, y + 44, '#8a2335')
    g.px(wx + 7, y + 18, GOLD.l)
  }
}

export function doiViharnMap(): MapDef {
  const geo = roomGeo(ROOM)
  const altar = altarSprite('doiV', buddhaProp('lanna', 0.7), { arch: 'lanna', w: 96, tiers: 3 })
  const ALT = { x: VW / 2, y: 128 }
  const pillar = pillarSprite('lanna', 70)
  const PIL: [number, number][] = [
    [44, 150],
    [VW - 44, 150],
    [44, 226],
    [VW - 44, 226],
  ]
  const shelf = bld('doiV:shelf', 30, 30, 15, 29, (g) => {
    g.rect(1, 18, 28, 11, '#6e4430')
    g.hline(1, 28, 18, '#8a5a3a')
    g.rect(1, 6, 28, 2, '#6e4430')
    for (let i = 0; i < 4; i++) {
      const x = 4 + i * 7
      g.rect(x - 2, 14, 5, 4, GOLD.d)
      g.rect(x - 1, 10, 3, 4, GOLD.b)
      g.circle(x, 9, 1.5, GOLD.b)
      g.px(x, 7, GOLD.l)
      g.px(x - 1, 11, GOLD.L)
    }
  })
  const table = offeringTable('doiV', 40, ['candle', 'lotus', 'baisri', 'fruit', 'lotus', 'candle'])
  const racks = [
    { x: 64, y: 140 },
    { x: VW - 64, y: 140 },
  ]
  const rackS = candleRack('doiV', 7)
  const props: PlacedProp[] = [
    { sprite: altar, x: ALT.x, y: ALT.y },
    { sprite: table, x: ALT.x, y: 146 },
    ...racks.map((r) => ({ sprite: rackS, x: r.x, y: r.y })),
    ...PIL.map(([x, y]) => ({ sprite: pillar, x, y })),
    { sprite: shelf, x: 26, y: 118 },
    { sprite: shelf, x: VW - 26, y: 118, flip: true },
    { sprite: donationBox('doiV'), x: 150, y: 262 },
    { sprite: lotusVase(true), x: ALT.x - 50, y: 124 },
    { sprite: lotusVase(true), x: ALT.x + 50, y: 124 },
    { sprite: F.lotusJarSprite('brown'), x: 22, y: 270 },
  ]
  return {
    id: 'doi_suthep:viharn',
    place: 'doi_suthep',
    area: 'mountain',
    indoor: true,
    indoorLight: 0.85,
    w: VW,
    h: VH,
    skyH: 0,
    ground: '#2b1d26',
    camBias: 0.55,
    entries: { 'doi_suthep:terrace': { x: VW / 2, y: VH - 22, face: 'up' } },
    bake(g) {
      bakeRoom(g, ROOM, lannaWall, 3)
      // Red carpet runner from the door to the altar, and cushions.
      carpet(g, VW / 2 - 14, 150, 28, VH - 164, '#b8343f')
      for (let y = 176; y < 250; y += 18) {
        cushion(g, 64, y, '#e8a53a')
        cushion(g, VW - 72, y, '#e8a53a')
      }
      // Mats where the monks sit.
      carpet(g, 16, 170, 20, 60, '#e8a53a', '#b8742a')
    },
    props,
    obstacles: [
      ...geo.obstacles,
      { x: ALT.x - 48, y: 104, w: 96, h: 26 },
      { x: ALT.x - 20, y: 140, w: 40, h: 8 },
      ...racks.map((r) => ({ x: r.x - 13, y: r.y - 6, w: 26, h: 7 })),
      ...PIL.map(([x, y]) => ({ x: x - 5, y: y - 4, w: 10, h: 5 })),
      { x: 11, y: 100, w: 30, h: 20 },
      { x: VW - 41, y: 100, w: 30, h: 20 },
      { x: 144, y: 256, w: 12, h: 7 },
      { x: 16, y: 262, w: 12, h: 9 },
    ],
    hotspots: [
      hs('pray', 'พระเจ้าทันใจ', 'กราบพระประธาน สวดมนต์ ขอพร', 'pray', { x: ALT.x - 40, y: 20, w: 80, h: 110 }, { x: ALT.x, y: 162 }, { marker: { x: ALT.x, y: 18 }, beacon: true }),
      hs('job:wipe_statues', 'หิ้งพระพุทธรูปองค์เล็ก', 'เช็ดฝุ่นพระพุทธรูปให้สะอาด', 'broom', { x: 11, y: 88, w: 30, h: 32 }, { x: 28, y: 132 }),
      hs('job:mop_floor', 'พื้นไม้สักในวิหาร', 'ถูพื้นไม้ให้เงาวับ', 'broom', { x: 150, y: 170, w: 50, h: 70 }, { x: 176, y: 196 }, { marker: { x: 176, y: 180 } }),
      hs('job:light_candles', 'ราวเทียนหน้าพระ', 'จุดเทียนถวายแสงสว่าง', 'broom', { x: VW - 80, y: 126, w: 32, h: 18 }, { x: VW - 64, y: 152 }),
      hs('donation', 'ตู้ทำบุญ', 'ร่วมทำบุญค่าน้ำค่าไฟวิหาร', 'coin', { x: 143, y: 244, w: 14, h: 20 }, { x: 150, y: 272 }),
      hs('door:doi_suthep:terrace', 'ประตูวิหาร', 'ออกไปลานพระธาตุ', 'door', { x: VW / 2 - 15, y: VH - 18, w: 30, h: 18 }, { x: VW / 2, y: VH - 10 }, { face: 'down', near: 10 }),
    ],
    spawn: { x: VW / 2, y: VH - 22, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: ALT.x, y: 60, r: 44, color: '#ffe7a0' },
      ...racks.map((r) => ({ x: r.x, y: r.y - 8, r: 16, color: '#ffb35a' })),
      { x: ALT.x, y: 136, r: 14, color: '#ffb35a' },
      { x: 32, y: 56, r: 16, color: '#fff3d6' },
      { x: VW - 32, y: 56, r: 16, color: '#fff3d6' },
      { x: VW / 2, y: VH - 8, r: 22, color: '#fff3d6' },
    ],
    life(s) {
      const monk = (x: number, y: number): Gag => ({
        x, y, lines: ['เจริญพร โยม', 'ขอให้มีความสุขความเจริญ', 'นั่งสมาธิสักครู่ไหมโยม'],
        draw: (g, p) => {
          const sp = monkSprite('front', p.react > 0 ? 'bless' : 'stand', { skin: 2 })
          drawShadow(g, p.x, p.y, 6, 2)
          g.draw(sp.canvas, Math.round(p.x - sp.w / 2), Math.round(p.y - sp.h + 1))
        },
        react: (sc, xx, yy) => sc.particles.sparkles(xx, yy - 22, 6, '#fffaf0', 6),
      })
      return [
        new Glints(s, [...hooksAt(altar, 'glints', ALT.x, ALT.y)], 1.6),
        new Flames(s, hooksAt(altar, 'candles', ALT.x, ALT.y), ALT.y),
        new Flames(s, hooksAt(table, 'flames', ALT.x, 146), 146),
        ...racks.map((r) => new Flames(s, hooksAt(rackS, 'flames', r.x, r.y), r.y)),
        new Smoke(s, [{ x: ALT.x, y: 136 }], 3),
        new Tung(s, [
          { x: 30, y: 26, len: 44, colors: ['#ffd23f', '#e8514a', '#fffaf0', '#6cc36a'] },
          { x: 54, y: 26, len: 38, colors: ['#fffaf0', '#ffd23f', '#e8514a'] },
          { x: VW - 54, y: 26, len: 38, colors: ['#fffaf0', '#ffd23f', '#e8514a'] },
          { x: VW - 30, y: 26, len: 44, colors: ['#ffd23f', '#e8514a', '#fffaf0', '#6cc36a'] },
        ]),
        new Gags(s, [monk(26, 196), monk(26, 222)]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.6) s.particles.add({ kind: 'sparkle', x: ALT.x + rand(-20, 20), y: rand(40, 110), vy: rand(-5, -2), max: rand(0.8, 1.4), color: '#fff3a6', drag: 0.3 })
      // Dust motes in the door light.
      if (Math.random() < dt * 1.2) s.particles.add({ kind: 'dot', x: VW / 2 + rand(-14, 14), y: rand(VH - 60, VH - 16), vx: rand(-2, 2), vy: rand(-4, -1), max: 2, color: '#fff3d6' })
    },
    wander: [{ x: 60, y: 170, w: 96, h: 90 }],
    pois: [
      { x: ALT.x - 12, y: 166, face: 'up' },
      { x: ALT.x + 12, y: 166, face: 'up' },
      { x: 80, y: 196, face: 'up' },
      { x: VW - 80, y: 196, face: 'up' },
    ],
    dogs: [],
    visitors: 3,
  }
}

export const DOI_MAPS: Record<string, () => MapDef> = {
  doi_suthep: doiSuthepMap,
  'doi_suthep:terrace': doiTerraceMap,
  'doi_suthep:viharn': doiViharnMap,
}

void LACQUER

// วัดห้วยปลากั้ง, Chiang Rai.
//   wat_huay_pla_kang        – the giant white seated Guanyin on her lotus
//                              pedestal, the dragon staircase, the nine-tiered
//                              pagoda, a Chinese courtyard with the bronze
//                              cauldron, a koi pond and the tea pavilion.
//   wat_huay_pla_kang:tower  – inside the statue: lobby with a Guanyin altar
//                              and the lift, the long switchback stairs and the
//                              crown chamber looking out through her eyes.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as G from '../../../art/garden'
import * as F from '../../../art/templeprops'
import { road } from '../common'
import { drawPerson, gagFx, Gags, drawSpriteGag, type Gag } from '../../gags'
import { Butterflies, CloudShadows, Flames, Glints, KoiPond, Lanterns, Smoke, SunRays, TapZones } from '../../life'
import { altarSprite, guanyinProp, bakeRoom, roomGeo, carpet, hooksAt, offeringTable, donationBox, lotusVase, hsh, serpent, bld, GOLD, type RoomOpts } from '../../../art/places/northisan'
import {
  CHINA_RED,
  DRAGON,
  giantGuanyinProp,
  guanyinPedestalSprite,
  ninePagodaSprite,
  miniChediSprite,
  dragonHeadSprite,
  stoneLionSprite,
  cauldronSprite,
  redCandleRack,
  paifangSprite,
  teaStallSprite,
  bonsaiSprite,
  bambooSprite,
  guanyinMurals,
  liftSprite,
} from '../../../art/places/northisan-huaypla'
import { drawCostumed, hs, look, Notes, tune } from './northisan-common'

const W = 300
const H = 1000
const GY = { x: 132, y: 382 } // statue seat (sunk into the lotus throne)
const PED = { x: 132, y: 418 }
const LANDING = { y0: 418, y1: 440 }
const ST = { x0: 116, x1: 148, top: LANDING.y1, bot: 604 }
const PAG = { x: 250, y: 560 }
const PLAZA = { y0: 604, y1: 770 }
const CAUL = { x: 132, y: 668 }
const TREE = { x: 40, y: 664 }
const POND: [number, number, number, number][] = [
  [66, 826, 44, 22],
  [100, 842, 14, 10],
  [34, 842, 20, 12],
]
const TEA = { x: 244, y: 744 }
const GATE_Y = 952

function bakeHPK(g: Surface, night: boolean) {
  const far = night ? '#4c5aa0' : '#aac4e6'
  const mid = night ? '#3e4a88' : '#8aaed8'
  for (let x = -30; x < W + 40; x += 44) g.poly([[x - 44, 150], [x + 8, 96 + ((x * 7) % 20)], [x + 56, 150]], far)
  for (let x = -16; x < W + 30; x += 36) g.poly([[x - 30, 160], [x + 4, 120 + ((x * 5) % 14)], [x + 40, 160]], mid)
  G.treeLine(g, 156, W, G.LEAVES.far, 6)
  G.treeLine(g, 178, W, G.LEAVES.deep, 2)
  G.lawn(g, 0, 196, W, H - 196, 31)
  // Hill under the statue.
  g.ellipse(GY.x, 420, 120, 34, '#6fb455')
  G.groundShadow(g, GY.x, 418, 96, 8, 0.7)
  // Landing at the top of the dragon stairs.
  G.paving(g, 64, LANDING.y0, 136, LANDING.y1 - LANDING.y0, 6, 'grey')
  G.kerb(g, 64, LANDING.y0, 136, LANDING.y1 - LANDING.y0)
  // Dragon staircase.
  for (let y = ST.top; y < ST.bot; y += 3) {
    const k = (y - ST.top) / 3
    g.rect(ST.x0, y, ST.x1 - ST.x0, 3, k % 2 ? '#e8e0d8' : '#f4efe8')
    g.hline(ST.x0, ST.x1 - 1, y, '#ffffff')
    g.hline(ST.x0, ST.x1 - 1, y + 2, '#d2c9c3')
  }
  for (const [x, s] of [[ST.x0 - 5, 1], [ST.x1 + 5, -1]] as const) {
    g.rect(x - 4, ST.top, 8, ST.bot - ST.top, '#f4efe8')
    g.vline(x - 4, ST.top, ST.bot, '#ffffff')
    const pts: [number, number][] = []
    for (let y = ST.top + 4; y < ST.bot - 4; y += 3) pts.push([x + Math.sin(y * 0.08) * 1.8 * s, y - 2 - Math.abs(Math.sin(y * 0.06)) * 3])
    serpent(g, pts, 8, DRAGON, s > 0 ? 2 : 4)
  }
  // Pagoda terrace with its own little stairs.
  G.paving(g, 198, 470, 102, 100, 7, 'grey')
  G.kerb(g, 198, 470, 102, 100)
  for (let y = 570; y < PLAZA.y0; y += 3) g.rect(PAG.x - 10, y, 20, 3, (y / 3) % 2 ? '#e8e0d8' : '#f4efe8')
  // Courtyard.
  g.rect(16, PLAZA.y0, W - 32, PLAZA.y1 - PLAZA.y0, '#d8c8b8')
  for (let j = PLAZA.y0; j < PLAZA.y1; j += 10)
    for (let i = 16; i < W - 16; i += 10) {
      g.rect(i, j, 10, 10, ((i + j) / 10) % 2 ? '#e8dccc' : '#dccfbe')
      g.px(i + 1, j + 1, '#f4ece0')
    }
  G.kerb(g, 16, PLAZA.y0, W - 32, PLAZA.y1 - PLAZA.y0)
  // Red circle medallion under the cauldron.
  g.ellipse(CAUL.x, CAUL.y + 2, 30, 12, CHINA_RED.d)
  g.ellipse(CAUL.x, CAUL.y + 2, 27, 10, CHINA_RED.b)
  for (let a = 0; a < 16; a++) g.px(Math.round(CAUL.x + Math.cos(a / 16 * Math.PI * 2) * 24), Math.round(CAUL.y + 2 + Math.sin(a / 16 * Math.PI * 2) * 8), GOLD.b)
  G.groundShadow(g, TREE.x, TREE.y - 2, 36, 9, 0.6)
  G.leafLitter(g, TREE.x - 30, TREE.y - 16, 70, 30, 60, 8)
  // Garden path down to the gate, lotus pond and bamboo.
  G.paving(g, 118, PLAZA.y1, 30, GATE_Y - PLAZA.y1 + 8, 8)
  G.pondBed(g, POND)
  const pads: [number, number, number][] = [[50, 820, 3], [80, 832, 2.5], [96, 842, 2], [66, 818, 3], [34, 846, 2], [60, 838, 3]]
  pads.forEach(([x, y, r], i) => G.lilyPad(g, x, y, r, i))
  G.reeds(g, 38, 834, 5)
  G.reeds(g, 108, 832, 4)
  G.paving(g, 196, 780, 90, 40, 6)
  road(g, 0, GATE_Y + 10, W, H - GATE_Y - 10)
}

/** Round red lanterns strung across the courtyard. */
function redLanterns(): { x0: number; y0: number; x1: number; y1: number; n: number; sag: number; colors: string[] }[] {
  return [
    { x0: 18, y0: 616, x1: W - 18, y1: 616, n: 14, sag: 10, colors: ['#e8514a', '#d8403a', '#ffd23f'] },
    { x0: 18, y0: 752, x1: W - 18, y1: 752, n: 14, sag: 10, colors: ['#d8403a', '#e8514a', '#ffd23f'] },
    { x0: 70, y0: 424, x1: 194, y1: 424, n: 8, sag: 6, colors: ['#e8514a', '#ffd23f'] },
  ]
}

function hpkGags(notes: Notes): Gag[] {
  const grandma = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_white', bottom: 'bot_black' })
  const vendor = look({ gender: 'f', hair: 'hair_bob', hairColor: 0, top: 'top_vendor', bottom: 'bot_black' })
  const photo = look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_tee_black', bottom: 'bot_jeans', head: 'head_cap' })
  const kid = look({ gender: 'm', hair: 'hair_buzz', top: 'top_tee_boon', bottom: 'bot_denim_shorts' })
  const fortune = look({ gender: 'f', hair: 'hair_long', hairColor: 1, top: 'top_floral', bottom: 'bot_jeans' })
  return [
    {
      x: 104, y: 690, lines: ['เจ้าแม่กวนอิมเมตตา~', 'ขอให้ลูกหลานสุขภาพแข็งแรง', 'กินเจมาสามวันแล้วนะ!'],
      draw: (g, p) => drawPerson(g, grandma, p, 'back', [], p.react > 0 ? 'wai' : 'stand'),
    },
    { x: TEA.x, y: TEA.y - 7, z: -1, lines: ['ชาอู่หลงร้อน ๆ ค่ะ', 'ซาลาเปาเจ ไส้เผือกหอม ๆ', 'ขนมจีบเจ ลูกละ 10 บาท'], draw: (g, p) => drawCostumed(g, vendor, p, 'apron') },
    {
      x: 158, y: 560, lines: ['มังกรยาวสุดบันไดเลย!', 'ถ่ายเจ้าแม่ให้ติดทั้งองค์ยากมาก~', 'ถอยไปอีกนิด… อีกนิด…'],
      draw: (g, p) => drawPerson(g, photo, p, 'back', ['selfie']),
      react: (s, x, y) => gagFx.flash(s, x, y),
    },
    {
      x: 186, y: 712, w: 20, h: 30, lines: ['หนูเชิดสิงโต! ตุ้งแช่ ๆ', 'แฮ่! (สิงโตยิ้ม)', 'ขอแต๊ะเอียด้วย~'],
      draw: (g, p) => {
        drawPerson(g, kid, p, 'front')
        // Little lion-dance head on top.
        const bob = p.react > 0 ? Math.round(Math.sin(p.t * 16) * 2) : 0
        g.rect(p.x - 7, p.y - 34 + bob, 14, 10, '#e8514a')
        g.rect(p.x - 6, p.y - 33 + bob, 12, 3, '#ffd23f')
        g.px(p.x - 3, p.y - 29 + bob, '#ffffff')
        g.px(p.x + 2, p.y - 29 + bob, '#ffffff')
        g.px(p.x - 3, p.y - 28 + bob, '#241a2b')
        g.px(p.x + 2, p.y - 28 + bob, '#241a2b')
        g.hline(p.x - 4, p.x + 3, p.y - 25 + bob, '#fffaf0')
        g.rect(p.x - 8, p.y - 24, 16, 6, '#ffd23f')
      },
      react: (sc, x, y) => {
        notes.emit(x, y - 36)
        tune([4, 4, 2, 4, 5])
        sc.particles.confetti(x, y - 30, 10)
      },
    },
    {
      x: 170, y: 434, lines: ['เขย่า… เขย่า… ได้ใบที่ 9!', 'เซียมซีบอกว่าจะมีโชค!', 'ขออีกใบได้ไหมคะ'],
      draw: (g, p) => {
        drawPerson(g, fortune, p, 'back', [], 'kneel')
        const sh = p.react > 0 ? Math.round(Math.sin(p.t * 30)) : 0
        g.rect(p.x - 2 + sh, p.y - 18, 4, 6, CHINA_RED.b)
        g.px(p.x - 1 + sh, p.y - 20, '#e8d8b0')
        g.px(p.x + 1 + sh, p.y - 21, '#e8d8b0')
      },
      react: () => sfx.rattle(),
    },
  ]
}

export function huayPlaKangMap(): MapDef {
  const statue = giantGuanyinProp(3.4)
  const ped = guanyinPedestalSprite()
  const pag = ninePagodaSprite()
  const mini = miniChediSprite()
  const dragon = dragonHeadSprite()
  const lion = stoneLionSprite()
  const caul = cauldronSprite()
  const rack = redCandleRack()
  const gate = paifangSprite()
  const RACKS = [
    { x: 76, y: 700 },
    { x: 188, y: 684 },
  ]
  const DRAGONS = [
    { x: ST.x0 - 8, y: ST.bot + 14, flip: false },
    { x: ST.x1 + 8, y: ST.bot + 14, flip: true },
  ]
  const MINIS: [number, number][] = [[208, 486], [292, 486], [208, 530], [292, 530], [214, 566], [286, 566]]
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const LAMPS: [number, number][] = [[104, 776], [162, 776], [104, 940], [162, 940]]
  const BAMBOO: [number, number][] = [[14, 790], [22, 900], [286, 880], [270, 920], [196, 900], [12, 250], [34, 300], [284, 262], [262, 310], [16, 470], [40, 530]]
  const TREES: [number, number, number][] = [[20, 360, 1], [280, 380, 3], [60, 560, 0], [30, 600, 2], [230, 440, 2]]
  const altar = offeringTable('hpkOut', 34, ['candle', 'fruit', 'lotus', 'fruit', 'candle'])
  const props: PlacedProp[] = [
    { sprite: statue, x: GY.x, y: GY.y },
    { sprite: ped, x: PED.x, y: PED.y },
    { sprite: altar, x: 96, y: 434 },
    { sprite: lion, x: 76, y: 438 },
    { sprite: lion, x: 188, y: 438, flip: true },
    { sprite: pag, x: PAG.x, y: PAG.y },
    ...MINIS.map(([x, y]) => ({ sprite: mini, x, y })),
    ...DRAGONS.map((d) => ({ sprite: dragon, x: d.x, y: d.y, flip: d.flip })),
    { sprite: caul, x: CAUL.x, y: CAUL.y, shadow: [14, 3] as [number, number] },
    ...RACKS.map((r) => ({ sprite: rack, x: r.x, y: r.y })),
    { sprite: lion, x: 110, y: 780 },
    { sprite: lion, x: 156, y: 780, flip: true },
    { sprite: G.bodhiTree2(), x: TREE.x, y: TREE.y, id: 'hpktree' },
    { sprite: teaStallSprite(), x: TEA.x, y: TEA.y },
    { sprite: bonsaiSprite(0), x: 210, y: 806 },
    { sprite: bonsaiSprite(1), x: 232, y: 810 },
    { sprite: bonsaiSprite(0), x: 256, y: 806 },
    { sprite: bonsaiSprite(1), x: 276, y: 812 },
    { sprite: gate, x: 133, y: GATE_Y },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
    ...BAMBOO.map(([x, y], i) => ({ sprite: bambooSprite(i), x, y, id: 'bam' + i })),
    ...TREES.map(([x, y, v], i) => ({ sprite: v === 2 ? G.coconutPalm(i) : G.frangipani(v), x, y, id: 'tr' + i })),
    { sprite: mini, x: 26, y: 402 },
    { sprite: mini, x: 238, y: 402 },
    { sprite: donationBox('hpk', CHINA_RED.b), x: 206, y: 640 },
    { sprite: lotusVase(true), x: 116, y: 432 },
    { sprite: lotusVase(true), x: 150, y: 432, flip: true },
  ]
  return {
    id: 'wat_huay_pla_kang',
    place: 'wat_huay_pla_kang',
    area: 'shrine',
    w: W,
    h: H,
    skyH: 160,
    ground: '#86c95f',
    camBias: 0.62,
    entries: { 'wat_huay_pla_kang:tower': { x: PED.x, y: LANDING.y0 + 12, face: 'down' } },
    bake: bakeHPK,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: LANDING.y0 + 4 },
      { x: 0, y: LANDING.y0, w: 64, h: ST.bot - LANDING.y0 },
      { x: 200, y: LANDING.y0, w: W - 200, h: 50 },
      { x: 64, y: LANDING.y1, w: ST.x0 - 64, h: ST.bot - LANDING.y1 },
      { x: ST.x1, y: LANDING.y1, w: 198 - ST.x1, h: ST.bot - LANDING.y1 },
      { x: 64, y: 428, w: 22, h: 12 },
      { x: 178, y: 428, w: 22, h: 12 },
      { x: 80, y: 428, w: 34, h: 8 },
      // Pagoda terrace (walk round the front) and its stairs.
      { x: PAG.x - 46, y: 470, w: 92, h: 92 },
      { x: 198, y: 570, w: PAG.x - 10 - 198, h: PLAZA.y0 - 570 },
      { x: PAG.x + 10, y: 570, w: W - PAG.x - 10, h: PLAZA.y0 - 570 },
      ...DRAGONS.map((d) => ({ x: d.x - 14, y: d.y - 8, w: 28, h: 9 })),
      { x: CAUL.x - 16, y: CAUL.y - 8, w: 32, h: 10 },
      ...RACKS.map((r) => ({ x: r.x - 17, y: r.y - 6, w: 34, h: 7 })),
      { x: TREE.x - 28, y: TREE.y - 18, w: 56, h: 20 },
      { x: TEA.x - 26, y: TEA.y - 16, w: 52, h: 17 },
      { x: 200, y: 640 - 6, w: 12, h: 7 },
      // Garden.
      { x: 0, y: PLAZA.y1, w: 118, h: GATE_Y - PLAZA.y1 - 8 },
      { x: 148, y: PLAZA.y1, w: 48, h: GATE_Y - PLAZA.y1 - 8 },
      { x: 196, y: 820, w: W - 196, h: GATE_Y - 820 - 8 },
      { x: 286, y: PLAZA.y1, w: 14, h: 60 },
      { x: 200, y: 800, w: 84, h: 12 },
      { x: 100, y: 772, w: 20, h: 10 },
      { x: 146, y: 772, w: 20, h: 10 },
      { x: 0, y: GATE_Y - 8, w: 118, h: 20 },
      { x: 148, y: GATE_Y - 8, w: W - 148, h: 20 },
      { x: 0, y: GATE_Y + 10, w: W, h: H - GATE_Y - 10 },
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    ellipses: POND.map(([x, y, rx, ry]) => [x, y, rx + 3, ry + 3] as [number, number, number, number]),
    hotspots: [
      hs('guanyin', 'บูชาเจ้าแม่กวนอิมองค์ใหญ่', 'จุดธูป ถวายผลไม้ ขอพรเมตตามหานิยม', 'deity', { x: GY.x - 84, y: 172, w: 168, h: 200 }, { x: 96, y: 446 }, { marker: { x: GY.x, y: 166 }, beacon: true }),
      hs('door:wat_huay_pla_kang:tower', 'ทางเข้าภายในองค์เจ้าแม่', 'ขึ้นไปชมวิวถึงชั้นบนสุด', 'door', { x: PED.x - 10, y: PED.y - 36, w: 20, h: 36 }, { x: PED.x, y: LANDING.y0 + 6 }, { marker: { x: PED.x, y: PED.y - 40 }, near: 8 }),
      hs('chedi', 'เจดีย์ ๙ ชั้น', 'เวียนเทียนรอบเจดีย์ศิลปะล้านนาผสมจีน', 'sparkle', { x: PAG.x - 30, y: 360, w: 60, h: 200 }, { x: PAG.x, y: 596 }, { marker: { x: PAG.x, y: 344 } }),
      hs('incense', 'กระถางธูปมังกร', 'จุดธูปขอพร', 'incense', { x: CAUL.x - 16, y: CAUL.y - 28, w: 32, h: 30 }, { x: CAUL.x, y: CAUL.y + 14 }, { marker: { x: CAUL.x, y: CAUL.y - 32 } }),
      hs('job:light_candles', 'ราวเทียนแดง', 'จุดเทียนแดงถวายเจ้าแม่', 'broom', { x: 58, y: 678, w: 36, h: 24 }, { x: 76, y: 712 }),
      hs('job:sweep_leaves', 'ใต้ต้นโพธิ์', 'กวาดใบโพธิ์ร่วงในลาน', 'broom', { x: TREE.x - 30, y: TREE.y - 70, w: 60, h: 72 }, { x: TREE.x + 30, y: TREE.y + 8 }, { marker: { x: TREE.x, y: TREE.y - 74 } }),
      hs('job:water_plants', 'กระถางบอนไซ', 'รดน้ำต้นไม้จีนดัดให้สดชื่น', 'broom', { x: 198, y: 784, w: 88, h: 28 }, { x: 240, y: 824 }, { marker: { x: 242, y: 782 } }),
      hs('pond', 'สระบัวปลาคาร์ฟ', 'ให้อาหารปลาคาร์ฟ ขอให้อายุยืน', 'koi', { x: 20, y: 800, w: 100, h: 56 }, { x: 124, y: 826 }, { face: 'left', marker: { x: 66, y: 798 } }),
      hs('shop:wat_huay_pla_kang_teahouse', 'ร้านน้ำชาเจ้าแม่', 'ชาจีน ซาลาเปา ขนมจีบเจ', 'shop', { x: TEA.x - 26, y: TEA.y - 50, w: 52, h: 50 }, { x: TEA.x - 28, y: TEA.y + 10 }, { marker: { x: TEA.x, y: TEA.y - 54 } }),
      hs('gate', 'ซุ้มประตูจีน', 'กลับบ้าน หรือไปวัดอื่น', 'map', { x: 118, y: GATE_Y - 50, w: 30, h: 58 }, { x: 133, y: GATE_Y + 2 }, { face: 'down', marker: { x: 133, y: GATE_Y - 76 }, near: 12 }),
    ],
    spawn: { x: 133, y: GATE_Y - 4, face: 'up' },
    pickupSpots: [
      { x: 30, y: 630 }, { x: 270, y: 640 }, { x: 150, y: 740 }, { x: 60, y: 750 }, { x: 132, y: 880 },
      { x: 180, y: 430 }, { x: 132, y: 520 }, { x: 232, y: 600 }, { x: 250, y: 690 }, { x: 132, y: 920 },
    ],
    lights: [
      { x: GY.x, y: 220, r: 70, color: '#f0f4ff' },
      { x: PAG.x, y: 440, r: 40, color: '#ffe7a0' },
      ...RACKS.map((r) => ({ x: r.x, y: r.y - 12, r: 18, color: '#ff8a5a' })),
      { x: CAUL.x, y: CAUL.y - 16, r: 14, color: '#ff9a5a' },
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 18 })),
      { x: TEA.x, y: TEA.y - 30, r: 18, color: '#ffcf7a' },
      { x: 133, y: GATE_Y - 40, r: 22, color: '#ff8a6a' },
      { x: PED.x, y: PED.y - 24, r: 14, color: '#ffcf7a' },
    ],
    life(s) {
      const notes = new Notes(s)
      return [
        new Glints(s, [
          ...hooksAt(pag, 'glints', PAG.x, PAG.y),
          ...hooksAt(ped, 'glints', PED.x, PED.y),
          ...DRAGONS.flatMap((d) => hooksAt(dragon, 'glints', d.x, d.y)),
          ...hooksAt(gate, 'glints', 133, GATE_Y),
          { x: GY.x - 20, y: 170 },
          { x: GY.x + 26, y: 230 },
          { x: GY.x - 40, y: 290 },
        ], 1.6),
        new KoiPond(s, POND, { koi: 8, dragonflies: 2, lotus: [[56, 816, true], [84, 830], [100, 842, true], [36, 846], [76, 820]] }),
        ...RACKS.map((r) => new Flames(s, hooksAt(rack, 'flames', r.x, r.y), r.y)),
        new Flames(s, hooksAt(altar, 'flames', 96, 434), 434),
        new Smoke(s, [{ x: CAUL.x, y: CAUL.y - 22 }], 9),
        new Lanterns(s, redLanterns()),
        notes,
        new Gags(s, hpkGags(notes)),
        new Butterflies(s, [
          { x: 20, y: 780, w: 100, h: 60 },
          { x: 200, y: 770, w: 90, h: 40 },
        ], 6),
        new CloudShadows(s, 3),
        new SunRays(s),
        new TapZones([
          ...DRAGONS.map((d) => ({
            rect: { x: d.x - 16, y: d.y - 44, w: 32, h: 40 },
            fn: () => {
              s.say(['มังกรพ่นไฟ… เป็นดอกไม้!', 'โฮก! (มังกรใจดี)', 'มังกรเฝ้าบันไดเจ้าแม่'][Math.floor(Math.random() * 3)], d.x, d.y - 48)
              const m = hooksAt(dragon, 'mouth', d.x, d.y)[0]
              for (let i = 0; i < 8; i++) s.particles.add({ kind: 'petal', x: m.x, y: m.y, vx: rand(-20, 20), vy: rand(-26, -8), g: 30, max: 1.4, color: '#ff9fc0', color2: '#ffd23f' })
              sfx.whoosh()
            },
          })),
          {
            rect: { x: GY.x - 60, y: 150, w: 120, h: 180 },
            fn: () => {
              s.particles.sparkles(GY.x, 200, 16, '#ffffff', 30)
              s.say(['องค์ใหญ่เท่าตึก 25 ชั้น!', 'เจ้าแม่ยิ้มอย่างเมตตา', 'ขึ้นไปข้างในได้ด้วยนะ'][Math.floor(Math.random() * 3)], GY.x, 140)
              sfx.chime()
            },
          },
          {
            rect: { x: TREE.x - 30, y: TREE.y - 80, w: 60, h: 60 },
            fn: () => {
              s.shake('hpktree')
              s.drop(TREE.x, TREE.y - 50, 50, 6, '#9ed86a', '#5eae55', 'leaf')
              s.burstBirds(TREE.x, TREE.y - 60, 2)
              sfx.whoosh()
            },
          },
          {
            rect: { x: 118, y: GATE_Y - 70, w: 30, h: 22 },
            fn: () => {
              s.say('ประตูจีน… ข้ามแล้วโชคดี!', 133, GATE_Y - 74)
              sfx.chime()
            },
          },
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.4) s.particles.add({ kind: 'leaf', x: TREE.x + rand(-30, 30), y: TREE.y - 60, vx: rand(-4, 4), vy: rand(6, 10), max: 3, color: '#9ed86a', color2: '#5eae55' })
      if (s.isNight() && Math.random() < dt * 1.2) s.particles.add({ kind: 'sparkle', x: GY.x + rand(-70, 70), y: rand(150, 330), vy: rand(-5, -2), max: rand(1, 2), color: '#ffffff', drag: 0.3 })
    },
    wander: [
      { x: 24, y: PLAZA.y0 + 10, w: W - 48, h: 150 },
      { x: 120, y: 450, w: 26, h: 150 },
      { x: 70, y: LANDING.y0 + 8, w: 120, h: 10 },
      { x: 120, y: 780, w: 26, h: 160 },
    ],
    pois: [
      { x: 96, y: 446, face: 'up' },
      { x: CAUL.x - 8, y: CAUL.y + 14, face: 'up' },
      { x: 76, y: 712, face: 'up' },
      { x: 188, y: 696, face: 'up' },
      { x: PAG.x, y: 596, face: 'up' },
      { x: 124, y: 826, face: 'left' },
      { x: TEA.x - 28, y: TEA.y + 10, face: 'up' },
    ],
    birds: { x: 30, y: PLAZA.y0 + 60, w: 240, h: 30 },
    cats: [{ x: 270, y: 640, pose: 'sleep', color: '#f5a55a' }],
    dogs: ['khanom'],
    visitors: 7,
  }
}

// ===========================================================================
// Inside the statue.

const IW = 224
const IH = 480
const LOBBY = { y0: 340 }
const CROWN = { y0: 92, y1: 150 }
const F1 = { x0: 30, x1: 58, top: 262, bot: LOBBY.y0 + 8 } // lower flight
const MID = { y0: 240, y1: 262 }
const F2 = { x0: 166, x1: 194, top: CROWN.y1, bot: MID.y0 }

function bakeTower(g: Surface) {
  g.rect(0, 0, IW, IH, '#20182a')
  // The hollow inside the statue: soft white plaster curving up to the head.
  for (let y = 20; y < LOBBY.y0; y++) {
    const t = (y - 20) / (LOBBY.y0 - 20)
    const half = Math.min(IW / 2 - 6, 50 + t * 120)
    g.hline(Math.round(IW / 2 - half), Math.round(IW / 2 + half), y, y % 4 ? '#e8e4ee' : '#dcd6e4')
  }
  // Curved ribs of the statue's shell.
  for (let y = 60; y < LOBBY.y0 - 20; y += 34) {
    const t = (y - 20) / (LOBBY.y0 - 20)
    const half = Math.min(IW / 2 - 6, 50 + t * 120)
    for (let x = -half; x <= half; x++) {
      const yy = Math.round(y + (x / half) * (x / half) * -6)
      g.px(Math.round(IW / 2 + x), yy, '#cfc8dc')
      g.px(Math.round(IW / 2 + x), yy + 1, '#f4f2f8')
    }
  }
  // Light shaft down the middle.
  g.ctx.save()
  g.ctx.globalAlpha = 0.25
  g.rect(IW / 2 - 16, 20, 32, LOBBY.y0 - 20, '#ffffff')
  g.ctx.restore()
  // Crown chamber: the back wall with the two eye windows.
  g.rect(40, 30, IW - 80, CROWN.y0 - 30, '#f4f0f8')
  g.hline(40, IW - 41, 30, '#ffffff')
  for (const ex of [IW / 2 - 30, IW / 2 + 30]) {
    g.ellipse(ex, 60, 22, 12, '#c8c0d4')
    g.ellipse(ex, 60, 20, 10.5, '#9fd0ff')
    // Sky, clouds and rice fields of Chiang Rai.
    g.ctx.save()
    g.ellipse(ex, 62, 20, 8, '#bfe6ff')
    g.ellipse(ex, 66, 19, 5, '#8fd06c')
    g.ellipse(ex, 68, 17, 3, '#6fb455')
    g.ctx.restore()
    g.ellipse(ex - 8, 55, 5, 2, '#ffffff')
    g.ellipse(ex + 6, 53, 4, 1.6, '#ffffff')
    g.hline(ex - 14, ex + 14, 66, '#a8dc72')
    g.px(ex + 10, 64, '#e8514a')
  }
  // Crown chamber floor.
  G.paving(g, 40, CROWN.y0, IW - 80, CROWN.y1 - CROWN.y0, 8)
  // Upper flight (right), mid landing and lower flight (left).
  const stair = (x0: number, x1: number, top: number, bot: number) => {
    for (let y = top; y < bot; y += 3) {
      g.rect(x0, y, x1 - x0, 3, ((y - top) / 3) % 2 ? '#c9956a' : '#d9a57a')
      g.hline(x0, x1 - 1, y, '#e8c090')
    }
    g.vline(x0 - 1, top, bot, CHINA_RED.b)
    g.vline(x1, top, bot, CHINA_RED.b)
    g.vline(x0 - 2, top, bot, CHINA_RED.D)
    g.vline(x1 + 1, top, bot, CHINA_RED.D)
  }
  stair(F2.x0, F2.x1, F2.top, F2.bot)
  G.paving(g, F1.x0, MID.y0, F2.x1 - F1.x0, MID.y1 - MID.y0, 6)
  g.hline(F1.x0, F2.x1, MID.y1, CHINA_RED.b)
  g.hline(F1.x0, F2.x1, MID.y1 + 1, CHINA_RED.D)
  stair(F1.x0, F1.x1, F1.top, F1.bot)
  // Floor numbers painted on the landings.
  for (const [x, y, n] of [[F1.x1 + 6, MID.y0 + 6, 12], [F2.x0 - 12, CROWN.y1 - 12, 25]] as const) {
    g.rect(x, y, 9, 6, CHINA_RED.b)
    g.px(x + 2, y + 2, '#ffffff')
    g.px(x + 3 + (n % 2), y + 3, '#ffffff')
    g.px(x + 6, y + 2, '#ffffff')
  }
}

export function hpkTowerMap(): MapDef {
  const ROOM: RoomOpts = {
    w: IW,
    h: IH - LOBBY.y0 + 40,
    wallTop: 0,
    wallH: 40,
    side: 10,
    front: 14,
    door: { x: IW / 2, w: 28 },
    floor: 'redtile',
    wall: { L: '#ffffff', b: '#f4efe8', d: '#e0d4c8', D: '#b8a898' },
    dado: CHINA_RED.d,
  }
  const OY = LOBBY.y0 - 40 // lobby room offset
  const geo = roomGeo(ROOM)
  const altar = altarSprite('hpk', guanyinProp(0.95), { arch: 'halo', w: 76, tiers: 3, body: { L: '#ff7a6a', b: '#d8403a', d: '#a82e30', D: '#7a2028' } })
  const ALT = { x: 134, y: LOBBY.y0 + 30 }
  const shelf = bld('hpk:shelf', 60, 24, 30, 23, (gg) => {
    gg.rect(1, 14, 58, 9, '#8a5a3a')
    gg.hline(1, 58, 14, '#b08060')
    gg.rect(1, 3, 58, 2, '#8a5a3a')
    for (let i = 0; i < 7; i++) {
      const x = 5 + i * 8
      gg.ellipse(x, 13, 3, 1.4, '#ffffff')
      gg.rect(x - 1, 8, 3, 5, '#ffffff')
      gg.circle(x, 7, 1.5, '#ffe7d3')
      gg.circle(x, 6, 2.5, i % 2 ? '#fff3a6' : '#ffe0ea')
      gg.circle(x, 7, 1.5, '#ffe7d3')
    }
  })
  const lift = liftSprite()
  const table = offeringTable('hpkIn', 34, ['candle', 'fruit', 'lotus', 'fruit', 'candle'])
  const props: PlacedProp[] = [
    { sprite: altar, x: ALT.x, y: ALT.y },
    { sprite: table, x: ALT.x, y: ALT.y + 16 },
    { sprite: shelf, x: 110, y: MID.y0 + 4 },
    { sprite: lotusVase(true), x: ALT.x - 42, y: ALT.y - 2 },
    { sprite: lotusVase(true), x: ALT.x + 42, y: ALT.y - 2 },
    { sprite: donationBox('hpkIn', CHINA_RED.b), x: 60, y: IH - 40 },
    { sprite: F.lotusJarSprite('blue'), x: 188, y: IH - 34 },
  ]
  return {
    id: 'wat_huay_pla_kang:tower',
    place: 'wat_huay_pla_kang',
    area: 'shrine',
    indoor: true,
    indoorLight: 0.8,
    w: IW,
    h: IH,
    skyH: 0,
    ground: '#20182a',
    camBias: 0.55,
    entries: { wat_huay_pla_kang: { x: IW / 2, y: IH - 22, face: 'up' } },
    bake(g) {
      bakeTower(g)
      g.ctx.save()
      g.ctx.translate(0, OY)
      bakeRoom(g, { ...ROOM, void: 'rgba(0,0,0,0)' }, (gg, x, y, w, h) => guanyinMurals(gg, x + 56, y + 2, w - 56, h - 2), 5)
      g.ctx.restore()
      // Re-open the lower flight through the lobby's back wall.
      for (let y = LOBBY.y0 - 40; y < LOBBY.y0 + 8; y += 3) {
        g.rect(F1.x0, y, F1.x1 - F1.x0, 3, ((y) / 3) % 2 ? '#c9956a' : '#d9a57a')
        g.hline(F1.x0, F1.x1 - 1, y, '#e8c090')
      }
      g.vline(F1.x0 - 1, LOBBY.y0 - 40, LOBBY.y0 + 8, CHINA_RED.b)
      g.vline(F1.x1, LOBBY.y0 - 40, LOBBY.y0 + 8, CHINA_RED.b)
      carpet(g, ALT.x - 14, ALT.y + 20, 28, IH - ALT.y - 34, CHINA_RED.b, GOLD.d)
    },
    props,
    obstacles: [
      // Everything except the walkable floors; openings are carved below.
      { x: 0, y: 0, w: IW, h: CROWN.y0 + 4 },
      { x: 0, y: CROWN.y0, w: 40, h: CROWN.y1 - CROWN.y0 },
      { x: IW - 40, y: CROWN.y0, w: 40, h: CROWN.y1 - CROWN.y0 },
      { x: 0, y: CROWN.y1, w: F2.x0, h: MID.y0 - CROWN.y1 },
      { x: F2.x1, y: CROWN.y1, w: IW - F2.x1, h: MID.y0 - CROWN.y1 },
      { x: 0, y: MID.y0, w: F1.x0, h: MID.y1 - MID.y0 },
      { x: F2.x1, y: MID.y0, w: IW - F2.x1, h: MID.y1 - MID.y0 },
      { x: 0, y: MID.y1, w: F1.x0, h: LOBBY.y0 + 6 - MID.y1 },
      { x: F1.x1, y: MID.y1, w: IW - F1.x1, h: LOBBY.y0 + 6 - MID.y1 },
      ...geo.obstacles.filter((r) => r.y > 10).map((r) => ({ ...r, y: r.y + OY })),
      { x: 0, y: LOBBY.y0, w: 10, h: IH - LOBBY.y0 },
      { x: IW - 10, y: LOBBY.y0, w: 10, h: IH - LOBBY.y0 },
      { x: ALT.x - 38, y: ALT.y - 22, w: 76, h: 24 },
      { x: ALT.x - 17, y: ALT.y + 10, w: 34, h: 8 },
      { x: 54, y: IH - 46, w: 12, h: 7 },
      { x: 182, y: IH - 42, w: 12, h: 9 },
      { x: 84, y: MID.y0, w: 56, h: 6 },
    ],
    hotspots: [
      hs('pray', 'เจ้าแม่กวนอิมในองค์', 'กราบไหว้ สวดมนต์ ขอพรเมตตา', 'pray', { x: ALT.x - 34, y: LOBBY.y0 - 50, w: 68, h: 80 }, { x: ALT.x, y: ALT.y + 30 }, { marker: { x: ALT.x, y: LOBBY.y0 - 54 }, beacon: true }),
      hs('view', 'ช่องมองจากดวงตาเจ้าแม่', 'นั่งสมาธิ มองทุ่งนาเชียงรายจากที่สูง', 'meditate', { x: 60, y: 40, w: IW - 120, h: 50 }, { x: IW / 2, y: CROWN.y0 + 20 }, { marker: { x: IW / 2, y: 36 } }),
      hs('job:wipe_statues', 'หิ้งเจ้าแม่องค์เล็ก', 'เช็ดองค์เจ้าแม่กวนอิมขนาดเล็กให้ขาวสะอาด', 'broom', { x: 80, y: MID.y0 - 20, w: 60, h: 26 }, { x: 110, y: MID.y0 + 12 }),
      hs('job:mop_floor', 'พื้นกระเบื้องล็อบบี้', 'ถูพื้นให้สะอาด ก่อนผู้คนขึ้นไปไหว้', 'broom', { x: 150, y: IH - 90, w: 50, h: 50 }, { x: 176, y: IH - 62 }, { marker: { x: 176, y: IH - 92 } }),
      hs('donation', 'ตู้ทำบุญ', 'ร่วมทำบุญบำรุงองค์เจ้าแม่', 'coin', { x: 53, y: IH - 58, w: 14, h: 20 }, { x: 60, y: IH - 30 }),
      hs('door:wat_huay_pla_kang', 'ประตูออก', 'ออกไปลานด้านนอก', 'door', { x: IW / 2 - 14, y: IH - 18, w: 28, h: 18 }, { x: IW / 2, y: IH - 10 }, { face: 'down', near: 10 }),
    ],
    spawn: { x: IW / 2, y: IH - 22, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: ALT.x, y: LOBBY.y0 - 10, r: 40, color: '#fff3d6' },
      { x: ALT.x, y: ALT.y + 8, r: 12, color: '#ffb35a' },
      { x: IW / 2 - 30, y: 60, r: 26, color: '#e8f4ff' },
      { x: IW / 2 + 30, y: 60, r: 26, color: '#e8f4ff' },
      { x: IW / 2, y: 200, r: 30, color: '#ffffff' },
      { x: IW / 2, y: IH - 8, r: 20, color: '#fff3d6' },
    ],
    life(s) {
      const liftX = 196
      const liftY = LOBBY.y0 + 6
      const tired = look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_tee_grey', bottom: 'bot_cargo' })
      const op = look({ gender: 'f', hair: 'hair_bun', hairColor: 0, top: 'top_office_f', bottom: 'bot_pencil' })
      let open = 0
      const gags: Gag[] = [
        {
          x: liftX, y: liftY, w: 26, h: 40, lines: ['ติ๊ง! ลิฟต์ขึ้นชั้น 25 ค่ะ… อ้าว เต็มแล้ว!', 'ลิฟต์กำลังซ่อม เดินบันไดได้บุญกว่านะคะ', 'ติ๊งต่อง~ ประตูกำลังปิด', 'ค่าลิฟต์ 20 บาทค่ะ'],
          draw: (g, p) => {
            drawSpriteGag(g, lift, p, false)
            if (open > 0) {
              const k = Math.min(1, open) * 4
              g.rect(p.x - 10, p.y - 30, 20, 30, '#fff3d6')
              g.rect(p.x - 10, p.y - 30, 9 - k, 30, '#c9cfd8')
              g.rect(p.x + 1 + k, p.y - 30, 9 - k, 30, '#c9cfd8')
            }
          },
          react: () => {
            open = 2
            sfx.chime()
          },
        },
        { x: liftX - 26, y: liftY + 14, lines: ['เชิญขึ้นลิฟต์ค่ะ ทีละห้าคนนะคะ', 'ข้างบนวิวสวยมากค่ะ', 'จะเดินบันไดก็ได้ค่ะ ได้ออกกำลังกาย'], draw: (g, p) => drawPerson(g, op, p) },
        {
          x: 44, y: MID.y1 - 2, lines: ['ชั้นที่ 12… ยังไม่ถึงอีกเหรอ', 'รู้งี้ขึ้นลิฟต์ก็ดี!', 'แฮ่ก ๆ แต่ได้บุญนะ'],
          draw: (g, p) => drawPerson(g, tired, p, 'front', [], p.react > 0 ? 'happy' : 'sit'),
        },
      ]
      return [
        new Glints(s, [...hooksAt(altar, 'glints', ALT.x, ALT.y), { x: IW / 2 - 40, y: 56 }, { x: IW / 2 + 20, y: 56 }], 1.2),
        new Flames(s, hooksAt(altar, 'candles', ALT.x, ALT.y), ALT.y),
        new Flames(s, hooksAt(table, 'flames', ALT.x, ALT.y + 16), ALT.y + 16),
        new Smoke(s, [{ x: ALT.x, y: ALT.y + 6 }], 3),
        new Lanterns(s, [
          { x0: 20, y0: LOBBY.y0 + 2, x1: IW - 20, y1: LOBBY.y0 + 2, n: 10, sag: 6, colors: ['#e8514a', '#d8403a', '#ffd23f'] },
          { x0: 44, y0: CROWN.y0 + 2, x1: IW - 44, y1: CROWN.y0 + 2, n: 7, sag: 5, colors: ['#e8514a', '#ffd23f'] },
        ]),
        { update: (dt: number) => (open = Math.max(0, open - dt)) },
        new Gags(s, gags),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 1.5) s.particles.add({ kind: 'dot', x: IW / 2 + rand(-14, 14), y: rand(40, 320), vx: rand(-1, 1), vy: rand(2, 5), max: 3, color: '#ffffff' })
    },
    wander: [
      { x: 20, y: LOBBY.y0 + 40, w: 180, h: 70 },
      { x: 44, y: CROWN.y0 + 10, w: IW - 88, h: 40 },
    ],
    pois: [
      { x: ALT.x - 10, y: ALT.y + 32, face: 'up' },
      { x: ALT.x + 10, y: ALT.y + 32, face: 'up' },
      { x: IW / 2 - 30, y: CROWN.y0 + 16, face: 'up' },
      { x: IW / 2 + 30, y: CROWN.y0 + 16, face: 'up' },
      { x: 110, y: MID.y0 + 12, face: 'up' },
    ],
    dogs: [],
    visitors: 4,
  }
}

export const HPK_MAPS: Record<string, () => MapDef> = {
  wat_huay_pla_kang: huayPlaKangMap,
  'wat_huay_pla_kang:tower': hpkTowerMap,
}

void bonsaiSprite

void hsh

// วัดพระธาตุลำปางหลวง – a Lanna temple-fortress on its mound: the long naga
// stair climbs to the stucco arch gate (ซุ้มประตูโขง) in the brick wall;
// inside, a swept sand courtyard, the open-sided Viharn Luang, the gilded
// chedi behind its bronze railing, the sacred bodhi on its crutches and the
// Ho Phra Phutthabat where the chedi appears upside down through a pinhole.
// Below the mound: horse carriages, rooster bowls and khao taen.
//
// Maps: 'lampang_luang' and 'lampang_luang:viharn'.

import type { MapDef, PlacedProp, WorldScene } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as F from '../../../art/templeprops'
import * as G from '../../../art/garden'
import { road } from '../common'
import { nagaHead, GOLD } from '../../../art/temple'
import { drawPerson, Gags, type Gag } from '../../gags'
import { Butterflies, CloudShadows, EaveBells, Flames, Glints, Smoke, SunRays, TapZones, Traffic, type Life } from '../../life'
import * as L from '../../../art/places/historic-lanna'
import * as H from '../../../art/places/historic'
import * as I from '../../../art/places/historic-interior'
import { drawBuddhaHD } from '../../../art/hall'
import { DustMotes, foot, LightShafts, look, shakeTree, walkerGag } from './historic-common'

const ID = 'lampang_luang'
const VIHARN = 'lampang_luang:viharn'

const W = 320
const HH = 956
const CHEDI = { x: 160, y: 302 }
const VIH = { x: 160, y: 480 }
const BODHI = { x: 52, y: 318 }
const HO = { x: 272, y: 336 }
const GATE = { x: 160, y: 590 }
const STAIR_BOT = 750
const LAMPS: [number, number][] = [
  [124, 540],
  [196, 540],
  [110, 790],
  [210, 790],
]

function bakeGrounds(g: Surface) {
  G.treeLine(g, 98, W, G.LEAVES.far, 8)
  G.treeLine(g, 114, W, G.LEAVES.deep, 14)
  G.lawn(g, 0, 126, W, 934, 29)
  // Inside the walls: swept sand.
  H.sand(g, 12, 140, W - 24, 440, 7)
  G.groundShadow(g, BODHI.x, BODHI.y - 4, 44, 9, 0.8)
  G.leafLitter(g, 14, 300, 90, 50, 70, 5)
  H.shoesOnGround(g, 128, 490, 6, 5)
  H.shoesOnGround(g, 194, 490, 5, 6)
  // Side walls seen from above.
  for (const x0 of [0, W - 12]) {
    H.bricks(g, x0, 130, 12, 460, { seed: x0 + 3, light: 0.62, slope: 0, moss: 0.3 })
    g.vline(x0 + (x0 ? 0 : 11), 130, 590, H.BR.DD)
  }
  // The mound and the naga stair down to the plain.
  for (let y = 590; y < STAIR_BOT; y++) {
    const k = (y - 590) / (STAIR_BOT - 590)
    const hw = 110 + k * 50
    for (let x = Math.round(160 - hw); x < 160 + hw; x++) {
      const u = (x - 160) / hw
      g.px(x, y, u < -0.4 ? '#6fb455' : u > 0.5 ? '#4f9a58' : '#5ea653')
    }
  }
  for (let y = 590; y < STAIR_BOT; y++) {
    const step = (STAIR_BOT - y) % 4
    g.hline(146, 173, y, step === 0 ? '#c9bfb8' : step === 1 ? '#f2eee9' : '#e4ddd6')
  }
  for (const s of [-1, 1]) {
    for (let y = 594; y < STAIR_BOT - 4; y++) {
      const x = 160 + s * 17
      g.rect(x - 1, y, 3, 1, '#3f9a5a')
      if (y % 3 === 0) g.px(x, y, GOLD.b)
      if (y % 3 === 1) g.px(x + s, y, '#2c6e44')
    }
  }
  nagaHead(g, 138, STAIR_BOT - 18, '#3f9a5a', false)
  nagaHead(g, 172, STAIR_BOT - 18, '#3f9a5a', true)
  // The plain below: road and open ground.
  H.sand(g, 0, STAIR_BOT, W, 150, 9, 'pale')
  road(g, 0, 900, W, 44)
  G.puddle(g, 250, 870, 6, 2)
}

/** Ho Phra Phutthabat's camera obscura: tap it to see the chedi upside down. */
class CameraObscura implements Life {
  private t = 0
  constructor(private s: WorldScene) {}
  update(dt: number) {
    this.t = Math.max(0, this.t - dt)
  }
  tap(x: number, y: number) {
    if (Math.abs(x - HO.x) < 22 && y > HO.y - 56 && y < HO.y + 4) {
      this.t = 5
      this.s.say(['ว้าว! เงาพระธาตุกลับหัว!', 'แสงลอดรูเล็ก ๆ บนผนัง~', 'ตามคติล้านนา สุภาพสตรีชมจากด้านนอกนะ'][Math.floor(Math.random() * 3)], HO.x, HO.y - 60)
      sfx.sparkle()
      return true
    }
    return false
  }
  over(g: Surface, t: number) {
    if (this.t <= 0) return
    const a = Math.min(1, this.t, (5 - this.t) * 3)
    g.alpha(a)
    const bx = HO.x - 58
    const by = HO.y - 118
    g.rect(bx, by, 52, 44, '#3a2838')
    g.rect(bx + 2, by + 2, 48, 40, '#140a10')
    // A white cloth with the upside-down golden chedi projected on it.
    g.rect(bx + 10, by + 6, 32, 32, '#2a2020')
    for (let i = 0; i < 26; i++) {
      const hw = i < 6 ? 11 - i * 0.6 : i < 14 ? 7 - (i - 6) * 0.3 : Math.max(0.5, 4.6 - (i - 14) * 0.35)
      const c = (i + Math.floor(t * 3)) % 7 === 0 ? '#fff3a6' : i < 6 ? '#b8742a' : '#e9a53a'
      g.hline(Math.round(bx + 26 - hw), Math.round(bx + 26 + hw), by + 8 + i, c)
    }
    // The pinhole beam.
    g.alpha(a * 0.5)
    g.line(bx + 50, by + 20, bx + 42, by + 20, '#fff3a6')
    g.alpha(1)
    g.rect(bx + 50, by + 40, 3, 3, '#3a2838')
    g.line(bx + 52, by + 42, HO.x - 4, HO.y - 30, '#3a2838')
  }
}

function lpGags(): Gag[] {
  const vendor = look({ gender: 'f', hair: 'hair_bun', top: 'top_mohom', bottom: 'bot_sin_mudmee' })
  const cracker = look({ gender: 'f', hair: 'hair_short', hairColor: 6, top: 'top_floral', bottom: 'bot_sarong', head: 'head_ngob' })
  const caretaker = look({ gender: 'm', hair: 'hair_buzz', hairColor: 6, top: 'top_mohom', bottom: 'bot_fisherman' })
  const kid = look({ gender: 'm', hair: 'hair_short', top: 'top_school_m', bottom: 'bot_school_navy' })
  return [
    walkerGag({
      x0: 30, x1: 270, y: 830, speed: 11, fps: 5, w: 56, h: 36,
      frames: (f) => L.horseCarriageSprite(f),
      lines: ['นั่งรถม้าชมเมืองลำปางไหมเจ้า?', 'กุบกับ กุบกับ~', 'ฮี้~! (ม้ายิ้ม)'],
      react: (sc, x, y) => {
        sfx.tap()
        sc.particles.hearts(x + 20, y - 30, 2)
      },
    }),
    walkerGag({
      x0: 290, x1: 40, y: 866, speed: 8, fps: 4, w: 56, h: 36,
      frames: (f) => L.horseCarriageSprite(f + 2),
      lines: ['รถม้าลำปาง มีเมืองเดียวในไทยเจ้า', 'ไปวัดพระธาตุ ไปกาดกองต้าก็ได้'],
    }),
    { x: 94, y: 800, lines: ['ชามตราไก่ของแท้จากลำปางเจ้า', 'ไก่ขันเช้า ชามนี้กินข้าวอร่อย', 'ใบนี้เขียนมือทุกใบเลยนะ'], draw: (g, p) => drawPerson(g, vendor, p) },
    { x: 226, y: 800, lines: ['ข้าวแต๋นน้ำแตงโม กรอบ ๆ เจ้า', 'ราดน้ำอ้อยหวานหอม', 'ของฝากลำปางต้องข้าวแต๋น!'], draw: (g, p) => drawPerson(g, cracker, p) },
    {
      x: 244, y: 352, lines: ['เงาพระธาตุกลับหัวในหอนี้ เก่าแก่นัก', 'ลองแตะหอพระพุทธบาทดูสิหลาน', 'ตามคติล้านนา สุภาพสตรีไม่เข้าหอนี้ มีภาพให้ชมด้านนอกเจ้า'],
      draw: (g, p) => drawPerson(g, caretaker, p, 'front'),
    },
    {
      x: 80, y: 360, lines: ['ไม้ค้ำศรี ค้ำโพธิ์ ค้ำชีวิตให้มั่นคง', 'ค้ำไว้ให้ครอบครัวอยู่เย็นเป็นสุข', 'ปีนี้ต้องเอาไม้มาค้ำด้วย!'],
      draw: (g, p) => drawPerson(g, kid, p, 'back', [], 'wai'),
    },
  ]
}

export function lampangMap(): MapDef {
  const chedi = L.goldenChediSprite()
  const vih = L.lannaHallSprite({ key: 'luang', w: 170, tiers: 3, steps: 3, open: true })
  const vihN = L.lannaHallSprite({ key: 'luang', w: 170, tiers: 3, steps: 3, open: true, night: true })
  const small = L.lannaHallSprite({ key: 'namtaem', w: 70, tiers: 1, steps: 2 })
  const small2 = L.lannaHallSprite({ key: 'phraphut', w: 64, tiers: 1, steps: 1 })
  const ho = L.hoPhutthabatSprite()
  const gate = L.khongGateSprite()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const props: PlacedProp[] = [
    { sprite: chedi, x: CHEDI.x, y: CHEDI.y, id: 'chedi' },
    { sprite: L.proppedBodhiSprite(), x: BODHI.x, y: BODHI.y, id: 'bodhi' },
    { sprite: ho, x: HO.x, y: HO.y, id: 'ho' },
    { sprite: small, x: 56, y: 440 },
    { sprite: small2, x: 268, y: 450 },
    { sprite: vih, night: vihN, x: VIH.x, y: VIH.y },
    { sprite: H.shoeRackSprite(true), x: 124, y: 496 },
    { sprite: F.urnSprite(), x: 160, y: 530, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: 132, y: 526 },
    { sprite: F.candleStandSprite(), x: 188, y: 526 },
    { sprite: H.broomSprite(), x: 90, y: 326 },
    { sprite: L.fortWallSprite(124, 1), x: 0, y: 590 },
    { sprite: L.fortWallSprite(124, 2), x: 196, y: 590 },
    { sprite: gate, x: GATE.x, y: GATE.y + 2 },
    { sprite: H.rainTree(21), x: 40, y: 690, id: 'r1' },
    { sprite: H.rainTree(22, G.LEAVES.green), x: 282, y: 700, id: 'r2' },
    { sprite: L.chickenBowlStallSprite(), x: 70, y: 808 },
    { sprite: L.khaoTaenStallSprite(), x: 250, y: 808 },
    { sprite: H.signSprite('lam', 26, 12, '#fff1d6', ['#6e4a35', '#b8343f']), x: 196, y: 762 },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  return {
    id: ID,
    place: ID,
    area: 'wat',
    w: W,
    h: HH,
    skyH: 104,
    ground: '#86c95f',
    camBias: 0.6,
    bake: bakeGrounds,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 300 },
      { x: 0, y: 0, w: 12, h: 600 },
      { x: W - 12, y: 0, w: 12, h: 600 },
      { x: 110, y: 296, w: 100, h: 10 },
      foot(BODHI.x, BODHI.y, 60, 12),
      foot(HO.x, HO.y, 40, 12),
      { x: 20, y: 400, w: 72, h: 44 },
      { x: 236, y: 408, w: 64, h: 46 },
      { x: 62, y: 420, w: 196, h: 56 },
      { x: 62, y: 476, w: 80, h: 6 },
      { x: 178, y: 476, w: 80, h: 6 },
      foot(124, 496, 26, 8),
      foot(160, 530, 22, 8),
      foot(132, 526, 16, 6),
      foot(188, 526, 16, 6),
      { x: 0, y: 566, w: 146, h: 26 },
      { x: 174, y: 566, w: 146, h: 26 },
      { x: 0, y: 592, w: 144, h: STAIR_BOT - 596 },
      { x: 176, y: 592, w: 144, h: STAIR_BOT - 596 },
      foot(70, 808, 52, 14),
      foot(250, 808, 48, 14),
      foot(196, 762, 24, 5),
      { x: 0, y: 900, w: W, h: 44 },
      ...LAMPS.map(([x, y]) => foot(x, y, 6, 4)),
    ],
    hotspots: [
      { id: `door:${VIHARN}`, label: 'วิหารหลวง', hint: 'วิหารไม้เปิดโล่ง ประดิษฐานพระเจ้าล้านทอง', icon: 'temple', rect: { x: 130, y: 350, w: 60, h: 124 }, at: { x: VIH.x, y: 496 }, face: 'up', marker: { x: VIH.x, y: 340 }, beacon: true, near: 12 },
      { id: 'chedi', label: 'พระธาตุลำปางหลวง', hint: 'เวียนเทียนรอบพระธาตุทองคำ', icon: 'sparkle', rect: { x: 110, y: 110, w: 100, h: 190 }, at: { x: 104, y: 318 }, face: 'up', marker: { x: CHEDI.x, y: 112 } },
      { id: 'incense', label: 'กระถางธูปหน้าวิหาร', hint: 'จุดธูปขอพร', icon: 'incense', rect: { x: 146, y: 508, w: 28, h: 24 }, at: { x: 160, y: 542 }, face: 'up', marker: { x: 160, y: 504 } },
      { id: 'tree', label: 'ต้นศรีมหาโพธิ์', hint: 'ถวายไม้ค้ำศรี ขอให้ชีวิตมั่นคง', icon: 'tree', rect: { x: 10, y: 220, w: 84, h: 98 }, at: { x: 58, y: 332 }, face: 'up', marker: { x: 52, y: 218 } },
      { id: 'job:polish_brass', label: 'ขัดรั้วทองเหลือง', hint: 'รั้วรอบพระธาตุหมอง ช่วยขัดให้เงา', icon: 'sparkle', rect: { x: 180, y: 280, w: 40, h: 24 }, at: { x: 214, y: 318 }, face: 'up', marker: { x: 200, y: 278 } },
      { id: 'job:sweep_leaves', label: 'กวาดลานทราย', hint: 'ใบโพธิ์ร่วงบนลานทราย ช่วยกวาดหน่อย', icon: 'broom', rect: { x: 70, y: 320, w: 36, h: 20 }, at: { x: 96, y: 344 }, face: 'left', marker: { x: 90, y: 318 } },
      { id: 'job:arrange_shoes', label: 'จัดรองเท้าหน้าวิหาร', hint: 'จัดรองเท้าให้เป็นระเบียบ', icon: 'check', rect: { x: 110, y: 480, w: 28, h: 18 }, at: { x: 128, y: 506 }, face: 'left', marker: { x: 124, y: 478 } },
      { id: `shop:${ID}_chickenbowl`, label: 'ร้านชามตราไก่', hint: 'ชามไก่ของแท้เมืองลำปาง', icon: 'bowl', rect: { x: 44, y: 768, w: 52, h: 40 }, at: { x: 70, y: 818 }, face: 'up', marker: { x: 70, y: 764 } },
      { id: `shop:${ID}_khaotaen`, label: 'ข้าวแต๋นแม่ปุก', hint: 'ข้าวแต๋นน้ำแตงโม ของฝากลำปาง', icon: 'shop', rect: { x: 226, y: 766, w: 48, h: 42 }, at: { x: 250, y: 818 }, face: 'up', marker: { x: 250, y: 762 } },
      { id: 'gate', label: 'บันไดนาคหน้าวัด', hint: 'กลับบ้าน หรือไปวัดอื่น', icon: 'map', rect: { x: 140, y: 720, w: 40, h: 40 }, at: { x: 160, y: 762 }, face: 'down', marker: { x: 160, y: 716 }, near: 12 },
    ],
    spawn: { x: 160, y: 764, face: 'up' },
    entries: { [VIHARN]: { x: VIH.x, y: 506, face: 'down' } },
    pickupSpots: [
      { x: 30, y: 360 },
      { x: 110, y: 380 },
      { x: 220, y: 360 },
      { x: 290, y: 380 },
      { x: 40, y: 540 },
      { x: 280, y: 540 },
      { x: 160, y: 620 },
      { x: 40, y: 860 },
      { x: 280, y: 860 },
      { x: 160, y: 880 },
    ],
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 20 })),
      { x: CHEDI.x, y: 200, r: 60, color: '#ffd890' },
      { x: VIH.x, y: 440, r: 30, color: '#ffc070' },
      { x: 160, y: 520, r: 9, color: '#ff9a5a' },
      { x: GATE.x, y: 560, r: 20 },
    ],
    life(s) {
      const at = H.hookAt
      return [
        new Glints(s, [...(chedi.hooks.glints ?? []).map((h) => at(CHEDI, h)), ...(vih.hooks.glints ?? []).map((h) => at(VIH, h)), ...(gate.hooks.glints ?? []).map((h) => at(GATE, h))], 1.3),
        new EaveBells(s, (vih.hooks.bells ?? []).map((h) => at(VIH, h)), VIH.y),
        ...(vih.hooks.candles ?? []).map((h) => new Flames(s, [at(VIH, h)], VIH.y)),
        Flames.candles(s, 132, 526),
        Flames.candles(s, 188, 526),
        new Smoke(s, [{ x: 160, y: 512 }], 7),
        new CameraObscura(s),
        {
          sorted(add: (y: number, draw: () => void) => void, t: number) {
            const cols = ['#e8514a', '#ffd23f', '#6cc36a', '#5a8de0', '#ff9fc0']
            ;[30, 100, 220, 290].forEach((x, i) => add(560, () => L.drawTung(s.gfx, x, 560, t + s.wind(), cols[i % cols.length], i)))
          },
        },
        new Butterflies(s, [
          { x: 20, y: 330, w: 280, h: 60 },
          { x: 20, y: 770, w: 280, h: 30 },
        ], 5),
        new CloudShadows(s, 3),
        new SunRays(s),
        new Gags(s, lpGags()),
        new Traffic(s, [
          { y: 916, dir: 1 },
          { y: 934, dir: -1 },
        ]),
        new TapZones([
          shakeTree(s, 'bodhi', BODHI.x, BODHI.y - 20, 100, 76, ['#b4e486', '#76c05e']),
          shakeTree(s, 'r1', 40, 690, 110, 76, ['#ffb8d0', '#5eae55']),
          shakeTree(s, 'r2', 282, 700, 110, 76, ['#ffb8d0', '#5eae55']),
          {
            rect: { x: 120, y: 100, w: 80, h: 140 },
            fn: () => {
              s.shake('chedi')
              s.particles.sparkles(CHEDI.x, 120, 12, '#fff3a6', 20)
              s.say(['พระธาตุบรรจุพระเกศาธาตุ', 'ทองจังโกเหลืองอร่าม~'][Math.floor(Math.random() * 2)], CHEDI.x, 110)
              sfx.chime()
            },
          },
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.4) s.particles.add({ kind: 'leaf', x: BODHI.x + rand(-40, 40), y: BODHI.y - 80, vx: rand(-4, 4), vy: rand(6, 11), max: rand(2.5, 3.5), color: '#b4e486', color2: '#76c05e' })
    },
    wander: [
      { x: 20, y: 340, w: 80, h: 50 },
      { x: 220, y: 350, w: 80, h: 50 },
      { x: 30, y: 500, w: 260, h: 60 },
      { x: 20, y: 770, w: 280, h: 120 },
    ],
    pois: [
      { x: 150, y: 542, face: 'up' },
      { x: 170, y: 542, face: 'up' },
      { x: 104, y: 318, face: 'up' },
      { x: 58, y: 334, face: 'up' },
      { x: VIH.x, y: 498, face: 'up' },
      { x: 70, y: 818, face: 'up' },
    ],
    fireflies: [{ x: 20, y: 320, w: 280, h: 240 }],
    monkPath: [
      [VIH.x, 500],
      [160, 770],
      [-20, 770],
    ],
    birds: { x: 30, y: 510, w: 100, h: 30 },
    cats: [{ x: 290, y: 520, pose: 'sleep', color: '#8c8187' }],
    novice: { x: 30, y: 500, w: 260, h: 50 },
    dogs: [],
    visitors: 5,
  }
}

// ---------------------------------------------------------------------------
// Viharn Luang: open-sided teak hall with the gilded ku.

const IW = 280
const IH = 400
const KU = { x: 140, y: 196 }

function bakeViharn(g: Surface, night: boolean) {
  // Outside, seen through the open sides.
  H.sand(g, 0, 0, IW, IH, 11)
  G.lawn(g, 0, 0, 30, IH, 4)
  G.lawn(g, IW - 30, 0, 30, IH, 5)
  // Upper panels with Lanna paintings under the roof (back wall).
  g.rect(30, 0, IW - 60, 120, '#5a3424')
  I.muralWall(g, 40, 8, IW - 80, 70, I.MURAL_CREAM, 5)
  I.teak(g, 30, 80, IW - 60, 40, true, 'red', 6)
  // Teak floor on a raised platform with low walls at the open sides.
  I.teak(g, 34, 120, IW - 68, 262, false, 'honey', 7)
  I.carpet(g, 124, 230, 32, 152, '#8a2432')
  I.mats(g, 50, 270, 4, 14)
  I.mats(g, 174, 270, 4, 14)
  for (const x0 of [26, IW - 34]) {
    g.rect(x0, 110, 8, 272, '#f2eee9')
    g.vline(x0 + (x0 < 100 ? 7 : 0), 110, 382, '#c9bfb8')
    for (let y = 120; y < 380; y += 12) g.px(x0 + 3, y, GOLD.d)
  }
  g.rect(26, 382, IW - 52, 18, '#f2eee9')
  g.hline(26, IW - 27, 382, '#ffffff')
  g.rect(122, 382, 36, 18, '#ecd6ac')
  if (night) g.rect(0, 0, IW, IH, 'rgba(20,20,60,0.0)')
}

/** Gilded ku (กู่พระเจ้าล้านทอง): a tiered golden shrine with the image in its niche. */
function kuSprite() {
  return H.build('ku', 100, 170, 50, 169, (g, hooks) => {
    const cx = 50
    const gy = 169
    const gold = [GOLD.L, GOLD.l, GOLD.b, GOLD.d, GOLD.D]
    let y = gy
    for (let i = 0; i < 4; i++) {
      const hw = 46 - i * 5
      y -= 8
      g.rect(cx - hw, y, hw * 2, 8, gold[2])
      g.hline(cx - hw, cx + hw - 1, y, gold[0])
      g.rect(cx + hw - Math.round(hw * 0.25), y + 1, Math.round(hw * 0.25), 7, gold[3])
      for (let x = cx - hw + 3; x < cx + hw - 3; x += 4) g.px(x, y + 4, '#b8343f')
    }
    // Niche body.
    g.rect(cx - 30, y - 56, 60, 56, gold[2])
    g.rect(cx - 30, y - 56, 8, 56, gold[1])
    g.rect(cx + 22, y - 56, 8, 56, gold[3])
    g.rect(cx - 20, y - 50, 40, 50, '#3a1a14')
    for (let k = 0; k < 8; k++) g.hline(cx - 20 + k, cx + 19 - k, y - 50 - k, gold[k % 2 ? 1 : 3])
    drawBuddhaHD(g, cx, y - 1, 0.44, 'lanna')
    // Tiered spire.
    let ty = y - 58
    for (let i = 0; i < 7; i++) {
      const hw = 30 - i * 4
      g.rect(cx - hw, ty - 6, hw * 2, 6, gold[i % 2 ? 1 : 2])
      g.hline(cx - hw, cx + hw - 1, ty - 6, gold[0])
      g.px(cx - hw - 1, ty - 6, gold[0])
      g.px(cx + hw, ty - 6, gold[0])
      ty -= 6
    }
    g.vline(cx, ty - 10, ty, gold[1])
    g.px(cx, ty - 11, gold[0])
    hooks.glints = [
      { x: cx, y: ty - 11 },
      { x: cx - 26, y: y - 60 },
      { x: cx + 20, y: y - 90 },
    ]
  })
}

export function lampangViharnMap(): MapDef {
  const ku = kuSprite()
  const rackL = I.candleRackSprite(10)
  const rackR = I.candleRackSprite(10)
  const pillars: [number, number][] = [
    [64, 230],
    [216, 230],
    [64, 300],
    [216, 300],
    [64, 370],
    [216, 370],
    [104, 330],
    [176, 330],
  ]
  const props: PlacedProp[] = [
    { sprite: ku, x: KU.x, y: KU.y },
    { sprite: I.chatraSprite(60, 5, '#fff1c4'), x: 76, y: 196 },
    { sprite: I.chatraSprite(60, 5, '#fff1c4'), x: 204, y: 196 },
    ...pillars.map(([x, y]) => ({ sprite: I.pillarSprite(140, 'lacquer', 8), x, y })),
    { sprite: rackL, x: 100, y: 236 },
    { sprite: rackR, x: 180, y: 236 },
    { sprite: I.offeringTableSprite(34), x: 140, y: 238 },
    { sprite: I.gongSprite(), x: 240, y: 200 },
    { sprite: I.monkDaisSprite(56, 3), x: 38, y: 200 },
    { sprite: H.mopBucketSprite(), x: 226, y: 350 },
    { sprite: G.frangipani(1), x: 14, y: 150 },
    { sprite: G.frangipani(3), x: 266, y: 170 },
  ]
  return {
    id: VIHARN,
    place: ID,
    area: 'wat',
    indoor: true,
    indoorLight: 0.7,
    w: IW,
    h: IH,
    skyH: 0,
    ground: '#ecd6ac',
    camBias: 0.58,
    bake: bakeViharn,
    props,
    obstacles: [
      { x: 0, y: 0, w: IW, h: 206 },
      { x: 0, y: 0, w: 34, h: IH },
      { x: IW - 34, y: 0, w: 34, h: IH },
      { x: 0, y: 384, w: 122, h: 16 },
      { x: 158, y: 384, w: 122, h: 16 },
      foot(100, 236, 48, 8),
      foot(180, 236, 48, 8),
      foot(140, 238, 34, 6),
      ...pillars.map(([x, y]) => foot(x, y, 12, 6)),
      foot(226, 350, 12, 5),
    ],
    hotspots: [
      { id: 'pray', label: 'พระเจ้าล้านทอง', hint: 'กราบพระในกู่ทองคำ สวดมนต์ขอพร', icon: 'pray', rect: { x: 90, y: 30, w: 100, h: 170 }, at: { x: 140, y: 256 }, face: 'up', marker: { x: KU.x, y: 44 }, beacon: true, near: 16 },
      { id: 'job:light_candles', label: 'จุดผางประทีป', hint: 'จุดเทียนบูชาแบบล้านนา', icon: 'incense', rect: { x: 76, y: 216, w: 48, h: 20 }, at: { x: 100, y: 252 }, face: 'up', marker: { x: 100, y: 214 } },
      { id: 'job:mop_floor', label: 'เช็ดพื้นไม้สัก', hint: 'พื้นไม้สักต้องเงาวับเสมอ', icon: 'broom', rect: { x: 200, y: 330, w: 40, h: 26 }, at: { x: 214, y: 352 }, face: 'right', marker: { x: 226, y: 328 } },
      { id: 'job:polish_brass', label: 'ขัดฆ้องโบราณ', hint: 'ขัดฆ้องทองเหลืองให้ดังกังวาน', icon: 'sparkle', rect: { x: 226, y: 168, w: 28, h: 32 }, at: { x: 228, y: 214 }, face: 'up', marker: { x: 240, y: 166 } },
      { id: `door:${ID}`, label: 'ลงจากวิหาร', hint: 'กลับสู่ลานทรายหน้าพระธาตุ', icon: 'map', rect: { x: 122, y: 376, w: 36, h: 24 }, at: { x: 140, y: 394 }, face: 'down', marker: { x: 140, y: 378 }, near: 12 },
    ],
    spawn: { x: 140, y: 370, face: 'up' },
    entries: { [ID]: { x: 140, y: 370, face: 'up' } },
    pickupSpots: [],
    lights: [
      { x: KU.x, y: 110, r: 50, color: '#ffd890' },
      { x: 100, y: 226, r: 14, color: '#ffb35a' },
      { x: 180, y: 226, r: 14, color: '#ffb35a' },
    ],
    life(s) {
      const at = H.hookAt
      return [
        new Flames(s, (rackL.hooks.flames ?? []).map((h) => at({ x: 100, y: 236 }, h)), 236),
        new Flames(s, (rackR.hooks.flames ?? []).map((h) => at({ x: 180, y: 236 }, h)), 236),
        new Glints(s, (ku.hooks.glints ?? []).map((h) => at(KU, h)), 1.2),
        new Smoke(s, [{ x: 140, y: 228 }], 3),
        new LightShafts(s, [
          { x: 0, y: 140, w: 30, h: 240, dx: 40, a: 0.06 },
          { x: IW - 30, y: 140, w: 30, h: 240, dx: -40, a: 0.06 },
        ]),
        new DustMotes(s, [{ x: 40, y: 150, w: 200, h: 200 }], 16),
        new Gags(s, [
          {
            x: 160, y: 290, lines: ['วิหารไม้เก่าแก่กว่า 500 ปีเจ้า', 'ลมพัดเย็นสบาย วิหารเปิดโล่ง', 'สาธุ~'],
            draw: (g, p) => drawPerson(g, look({ gender: 'f', hair: 'hair_bun', top: 'top_mohom', bottom: 'bot_sin_mudmee' }), p, 'back', [], 'kneel'),
          },
        ]),
        new TapZones([
          {
            rect: { x: 226, y: 170, w: 30, h: 34 },
            fn: () => sfx.bigBell(),
          },
          {
            rect: { x: 40, y: 8, w: IW - 80, h: 70 },
            fn: (x, y) => {
              s.say(['จิตรกรรมบนแผงคอสอง ฝีมือช่างล้านนา', 'ภาพพุทธประวัติเก่าแก่'][Math.floor(Math.random() * 2)], x, y + 10)
              sfx.chime()
            },
          },
        ]),
      ]
    },
    wander: [{ x: 50, y: 260, w: 180, h: 100 }],
    pois: [
      { x: 130, y: 258, face: 'up' },
      { x: 150, y: 258, face: 'up' },
      { x: 80, y: 280, face: 'up' },
    ],
    cats: [{ x: 70, y: 340, pose: 'loaf', color: '#f5a55a' }],
    dogs: [],
    visitors: 3,
  }
}

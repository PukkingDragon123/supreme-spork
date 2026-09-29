// วัดพระพุทธบาท สระบุรี – a hilltop mondop of seven green-and-gold roofs
// over the Buddha's Footprint. From the souvenir street and a courtyard full
// of mischievous macaques, the naga staircase climbs past the big bell to
// the terrace, where corridors of bells ring for luck.
// Interior: `wat_phutthabat:mondop` (the gilded Footprint under coins).

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as T from '../../../art/temple'
import { GOLD } from '../../../art/temple'
import * as F from '../../../art/templeprops'
import * as G from '../../../art/garden'
import * as M from '../../../art/modern'
import { road, sidewalk } from '../common'
import { Butterflies, CloudShadows, EaveBells, Flames, Glints, RackBells, Smoke, SunRays, TapZones, TowerBell, Traffic, Lanterns } from '../../life'
import { Gags, drawPerson, type Gag } from '../../gags'
import * as A from '../../../art/places/central'
import * as PB from '../../../art/places/central-phutthabat'
import { door, look, person, shakeTree, spot } from './central-kit'

const W = 300
const H = 980
const CX = 150
const MONDOP = { x: CX, y: 330 }
const BELL_L = { x: 44, y: 300 }
const BELL_R = { x: 256, y: 300 }
const STAIR = { top: 372, bot: 600, x0: 112, x1: 188 }
const TOWER = { x: 252, y: 664 }
const URN = { x: CX, y: 730 }
const GATE = { x: CX, y: 920 }
const RAIN = { x: 250, y: 820 }
const LAMPS: [number, number][] = [
  [100, 640],
  [200, 640],
  [100, 780],
  [200, 780],
]
const ROCKS: [number, number, number][] = [
  [40, 420, 14],
  [70, 500, 18],
  [30, 560, 12],
  [250, 430, 16],
  [230, 520, 14],
  [276, 570, 12],
]

function bake(g: Surface, night: boolean) {
  // Saraburi's limestone hills.
  const far = night ? '#5a6aa8' : '#a8b8d8'
  const mid = night ? '#46558c' : '#8aa0c8'
  for (let x = -20; x < W + 40; x += 44) g.poly([[x - 30, 128], [x + 4, 70 + ((x * 7) % 20)], [x + 12, 66 + ((x * 3) % 16)], [x + 46, 128]], far)
  for (let x = -10; x < W + 30; x += 34) g.poly([[x - 24, 136], [x + 6, 92 + ((x * 5) % 18)], [x + 36, 136]], mid)
  G.treeLine(g, 130, W, G.LEAVES.deep, 17)
  G.lawn(g, 0, 146, W, H - 146, 81)
  // Hilltop terrace.
  G.paving(g, 6, 150, W - 12, 222, 8, 'grey')
  G.kerb(g, 6, 150, W - 12, 222)
  G.weather(g, 6, 150, W - 12, 222, 5, 0.8)
  G.groundShadow(g, MONDOP.x, MONDOP.y - 10, 90, 12, 0.8)
  // Hillside: grass, scrub and limestone boulders either side of the stairs.
  for (let y = 372; y < 600; y++) {
    for (const [a, b] of [
      [0, STAIR.x0 - 8],
      [STAIR.x1 + 8, W],
    ])
      for (let x = a; x < b; x++) if (A.hash(x, y, 9) < 0.06) g.px(x, y, '#5ea653')
  }
  for (const [x, y, r] of ROCKS) {
    g.ellipse(x, y + 2, r, r * 0.6, '#8c8187')
    g.ellipse(x - 1, y, r - 1, r * 0.55, '#d8d0cb')
    g.ellipse(x - r * 0.3, y - r * 0.2, r * 0.5, r * 0.25, '#f0ebe6')
    for (let i = 0; i < r; i++) g.px(x - r / 2 + ((i * 7) % r), y + ((i * 3) % 4), '#a8a0a0')
  }
  // The naga staircase.
  for (let y = STAIR.top; y < STAIR.bot; y += 4) {
    g.rect(STAIR.x0, y, STAIR.x1 - STAIR.x0, 4, (y / 4) % 2 ? '#e4ddd6' : '#f3ede6')
    g.hline(STAIR.x0, STAIR.x1 - 1, y, '#ffffff')
    g.hline(STAIR.x0, STAIR.x1 - 1, y + 3, '#cfc6c0')
  }
  for (const s of [-1, 1]) T.nagaRail(g, CX + s * 42, STAIR.top, CX + s * 42, STAIR.bot + 2, s, '#3fae6e')
  // Mid landing and lower courtyard.
  G.paving(g, 6, 600, W - 12, 90, 8, 'grey')
  G.kerb(g, 6, 600, W - 12, 90)
  G.paving(g, 6, 690, W - 12, 150, 8)
  G.kerb(g, 6, 690, W - 12, 150)
  G.weather(g, 6, 690, W - 12, 150, 6, 0.8)
  G.mandala(g, URN.x, URN.y + 18, 18)
  G.paving(g, 130, 840, 40, 80, 8)
  G.leafLitter(g, 190, 780, 110, 70, 90, 3)
  G.groundShadow(g, RAIN.x, RAIN.y - 4, 44, 12, 0.6)
  // Monkey mischief: banana peels and a dropped snack bag.
  for (const [x, y] of [
    [60, 760],
    [220, 716],
    [120, 810],
  ]) {
    g.rect(x, y, 3, 1, '#ffe45e')
    g.px(x + 3, y + 1, '#c9a04c')
  }
  g.rect(176, 760, 4, 3, '#e8514a')
  sidewalk(g, 0, 920, W, 10)
  road(g, 0, 930, W, 34)
  sidewalk(g, 0, 964, W, 16)
}

function monkeyGag(x: number, y: number, lines: string[], o: { walk?: Gag['walk']; loot?: string; flip?: boolean; eat?: boolean } = {}): Gag {
  return {
    x,
    y,
    w: 14,
    h: 16,
    walk: o.walk,
    lines,
    draw: (g, p) => PB.drawMonkey(g, p.x, p.y, p.t, { flip: o.walk ? p.flip : o.flip, loot: o.loot, eat: o.eat || p.react > 0, run: p.moving }),
    react: (s, gx, gy) => {
      s.particles.add({ kind: 'dot', x: gx, y: gy - 16, vy: -12, max: 0.5, color: '#ffe45e' })
      sfx.scratch()
    },
  }
}

function gags(): Gag[] {
  const victim = look({ gender: 'm', hair: 'hair_short', top: 'top_hawaii', head: 'head_heartshades' })
  const seller = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_pakaoma', head: 'head_sunhat' })
  const hiker = look({ gender: 'f', hair: 'hair_ponytail', top: 'top_pe', bottom: 'bot_track' })
  const grandma = look({ gender: 'f', hair: 'hair_short', hairColor: 6, top: 'top_white', bottom: 'bot_sarong' })
  const ringer = look({ gender: 'm', hair: 'hair_buzz', top: 'top_scout' })
  return [
    monkeyGag(58, 470, ['เจี๊ยก ๆ!', '(จ้องถุงขนมคุณอยู่นะ)', 'เจี๊ยก! (ขอกล้วยหน่อยสิ)']),
    monkeyGag(244, 506, ['(เกาหัวแกรก ๆ)', 'เจี๊ยกกก~', '(ทำหน้าไร้เดียงสา)'], { flip: true, eat: true }),
    monkeyGag(120, 760, ['เจี๊ยก! (วิ่งหนีพร้อมถุงขนม)', '(แทะขนมอย่างมีความสุข)', 'ของหนูแล้ว!'], { walk: { x0: 30, x1: 270, speed: 18 }, loot: '#e8514a' }),
    monkeyGag(16, 916, ['(นั่งห้อยขาบนกำแพง)', 'เจี๊ยก… (มองรถผ่านไปมา)', '(หาวหวอด)'], { flip: false }),
    monkeyGag(208, 352, ['(ลิงน้อยตีระฆังเล่น) เก๊ง!', 'เจี๊ยก ๆ', '(ห้อยหางกับราวระฆัง)'], { flip: true }),
    person(160, 772, victim, ['เฮ้ย! เจ้าลิง คืนขนมมานะ!', 'แว่นหัวใจเกือบโดนไปแล้ว…', 'ลิงที่นี่ไวกว่าผมอีก!']),
    person(70, 812, seller, ['ผ้าทอไทยวนเสาไห้จ้า ลายสวย', 'ระฆังจิ๋วไปแขวนบ้านนะ', 'ไม้เท้าเถาวัลย์ เดินขึ้นบันไดสบาย'], { z: -1 }),
    person(160, 520, hiker, ['ขั้นที่… นับไม่ถูกแล้ว!', 'เหนื่อยแต่อิ่มบุญ', 'ขึ้นบันไดนาคไปกราบรอยพระบาทกัน'], { walk: { x0: 124, x1: 176, speed: 4 } }),
    person(128, 354, grandma, ['ตีระฆังให้ครบทุกใบนะหลาน', 'ยายมาทุกเทศกาลเดือนสาม', 'สาธุ'], { view: 'back', pose: 'wai' }),
    person(88, 318, ringer, ['เก๊ง! เก๊ง! เก๊ง!', 'ตีครบร้อยใบแล้ว!', 'เสียงระฆังเพราะมาก'], {
      view: 'back',
      react: () => sfx.bell(Math.floor(Math.random() * 9)),
    }),
  ]
}

export function watPhutthabatMap(): MapDef {
  const mondop = PB.mondopSprite()
  const mondopN = PB.mondopSprite(true)
  const corrL = PB.bellCorridorSprite(7)
  const corrR = PB.bellCorridorSprite(7)
  const tower = T.bellTowerSprite(T.ROOF.green)
  const gate = T.gateSprite()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const props: PlacedProp[] = [
    { sprite: mondop, night: mondopN, x: MONDOP.x, y: MONDOP.y, id: 'mondop' },
    { sprite: corrL, x: BELL_L.x, y: BELL_L.y },
    { sprite: corrR, x: BELL_R.x, y: BELL_R.y },
    { sprite: A.polishKitProp(), x: 266, y: 312 },
    { sprite: PB.nagaHeadsSprite(), x: CX - 46, y: 612 },
    { sprite: PB.nagaHeadsSprite(true), x: CX + 46, y: 612 },
    { sprite: A.washKitProp(), x: 82, y: 628 },
    { sprite: F.candleStandSprite(), x: 118, y: 346 },
    { sprite: F.candleStandSprite(), x: 182, y: 346 },
    { sprite: tower, x: TOWER.x, y: TOWER.y },
    { sprite: F.benchSprite(), x: 40, y: 652 },
    { sprite: F.urnSprite(), x: URN.x, y: URN.y, shadow: [10, 2] },
    { sprite: F.donationSprite(), x: 186, y: 726, shadow: [6, 2] },
    { sprite: PB.souvenirStallSprite(), x: 70, y: 816 },
    { sprite: A.rainTreeSprite(0), x: RAIN.x, y: RAIN.y, id: 'rain' },
    { sprite: A.broomProp(), x: 222, y: 842 },
    { sprite: A.leafPileProp(2), x: 236, y: 846 },
    { sprite: G.frangipani(1), x: 24, y: 730, id: 'bf1' },
    { sprite: G.frangipani(2), x: 280, y: 720, id: 'bf2' },
    { sprite: G.shrub(0), x: 104, y: 380 },
    { sprite: G.shrub(1), x: 200, y: 390 },
    { sprite: G.shrub(1), x: 16, y: 470 },
    { sprite: G.bananaPlant(), x: 280, y: 470 },
    { sprite: M.planterSprite(1), x: 120, y: 900 },
    { sprite: M.planterSprite(0), x: 180, y: 900 },
    { sprite: T.wallSprite(112), x: 0, y: GATE.y },
    { sprite: T.wallSprite(112), x: 188, y: GATE.y },
    { sprite: gate, x: GATE.x, y: GATE.y },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  const at = (o: { x: number; y: number }, b: T.Building, k: string) => A.hooksAt(b, k, o)
  const bell = at(TOWER, tower, 'bell')[0]
  return {
    id: 'wat_phutthabat',
    area: 'mountain',
    place: 'wat_phutthabat',
    w: W,
    h: H,
    skyH: 120,
    ground: '#6fa85a',
    camBias: 0.6,
    bake,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 150 },
      { x: 76, y: 150, w: 148, h: 156 },
      { x: 130, y: 306, w: 40, h: 24 },
      { x: 4, y: 286, w: 82, h: 16 },
      { x: 214, y: 286, w: 82, h: 16 },
      { x: 110, y: 340, w: 16, h: 7 },
      { x: 174, y: 340, w: 16, h: 7 },
      { x: 258, y: 306, w: 16, h: 7 },
      // Hillside either side of the stairs.
      { x: 0, y: 372, w: STAIR.x0 - 4, h: 228 },
      { x: STAIR.x1 + 4, y: 372, w: W - STAIR.x1 - 4, h: 228 },
      { x: CX - 58, y: 600, w: 24, h: 14 },
      { x: CX + 34, y: 600, w: 24, h: 14 },
      { x: 74, y: 622, w: 16, h: 7 },
      { x: TOWER.x - 22, y: TOWER.y - 18, w: 44, h: 18 },
      { x: 30, y: 648, w: 20, h: 5 },
      { x: URN.x - 10, y: URN.y - 6, w: 20, h: 9 },
      { x: 178, y: 720, w: 12, h: 7 },
      { x: 38, y: 798, w: 64, h: 18 },
      { x: RAIN.x - 6, y: RAIN.y - 5, w: 12, h: 6 },
      { x: 20, y: 726, w: 8, h: 5 },
      { x: 276, y: 716, w: 8, h: 5 },
      { x: 110, y: 894, w: 20, h: 7 },
      { x: 170, y: 894, w: 20, h: 7 },
      { x: 0, y: 904, w: 132, h: 16 },
      { x: 168, y: 904, w: 132, h: 16 },
      { x: 0, y: 920, w: W, h: 60 },
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      door('wat_phutthabat:mondop', 'มณฑปพระพุทธบาท', { x: 130, y: 250, w: 40, h: 80 }, { x: CX, y: 338 }, 'up', { x: CX, y: 244 }),
      spot('bells', 'ระเบียงระฆัง', 'ตีระฆังให้ครบทุกใบ รับบุญ', 'bell', { x: 4, y: 250, w: 82, h: 50 }, { x: 46, y: 312 }, 'up', { marker: { x: 44, y: 248 } }),
      spot('job:polish_brass', 'ระฆังทองเหลือง', 'ขัดระฆังให้เงาวับ', 'broom', { x: 214, y: 250, w: 82, h: 50 }, { x: 254, y: 316 }, 'up', { marker: { x: 256, y: 248 } }),
      spot('job:wipe_statues', 'พญานาคห้าเศียร', 'เช็ดพญานาคสำริดให้สะอาด', 'broom', { x: CX - 62, y: 574, w: 30, h: 40 }, { x: 94, y: 634 }, 'up', { marker: { x: CX - 46, y: 572 } }),
      spot('big_bell', 'หอระฆังใหญ่', 'ตีระฆังใหญ่ก้องหุบเขา', 'bell', { x: TOWER.x - 22, y: TOWER.y - 90, w: 44, h: 90 }, { x: TOWER.x, y: TOWER.y + 10 }, 'up', { marker: { x: TOWER.x, y: TOWER.y - 94 } }),
      spot('view', 'จุดชมวิวเขาสระบุรี', 'นั่งสมาธิรับลมเย็น', 'meditate', { x: 10, y: 604, w: 50, h: 40 }, { x: 40, y: 664 }, 'up', { marker: { x: 36, y: 602 } }),
      spot('incense', 'กระถางธูปลานล่าง', 'จุดธูปบูชารอยพระพุทธบาท', 'incense', { x: 136, y: 704, w: 28, h: 28 }, { x: CX, y: 746 }, 'up', { marker: { x: CX, y: 702 } }),
      spot('donation', 'ตู้ทำบุญ', 'ทำบุญบำรุงวัด', 'coin', { x: 178, y: 700, w: 16, h: 26 }, { x: 186, y: 736 }, 'up', { marker: { x: 186, y: 698 } }),
      spot('shop:wat_phutthabat_souvenir', 'ร้านของฝากสระบุรี', 'ผ้าทอไทยวน ระฆังจิ๋ว ไม้เท้า กะละแม', 'shop', { x: 38, y: 776, w: 64, h: 42 }, { x: 70, y: 826 }, 'up', { marker: { x: 70, y: 774 } }),
      spot('job:sweep_leaves', 'ลานใต้ต้นจามจุรี', 'กวาดใบไม้ (ระวังลิงแย่งไม้กวาด!)', 'broom', { x: 196, y: 770, w: 100, h: 80 }, { x: 226, y: 856 }, 'up', { marker: { x: 236, y: 804 } }),
      spot('gate', 'ประตูวัด', 'กลับบ้าน', 'map', { x: 128, y: 836, w: 44, h: 84 }, { x: CX, y: 908 }, 'down', { marker: { x: CX, y: 832 }, near: 12 }),
    ],
    entries: { 'wat_phutthabat:mondop': { x: CX, y: 346, face: 'down' } },
    spawn: { x: CX, y: 890, face: 'up' },
    pickupSpots: [
      { x: 20, y: 340 },
      { x: 280, y: 340 },
      { x: 150, y: 470 },
      { x: 130, y: 580 },
      { x: 60, y: 610 },
      { x: 200, y: 680 },
      { x: 40, y: 700 },
      { x: 270, y: 760 },
      { x: 130, y: 830 },
    ],
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      { x: CX, y: 200, r: 50, color: '#ffe7a0' },
      { x: CX, y: 300, r: 22, color: '#ffcf7a' },
      { x: 118, y: 336, r: 8, color: '#ff9a5a' },
      { x: 182, y: 336, r: 8, color: '#ff9a5a' },
      { x: URN.x, y: 722, r: 10, color: '#ff9a5a' },
      { x: TOWER.x, y: TOWER.y - 60, r: 14 },
      { x: 70, y: 792, r: 16, color: '#ffcf7a' },
      { x: GATE.x, y: 876, r: 22 },
    ],
    life(s) {
      return [
        new Glints(s, [...at(MONDOP, mondop, 'glints'), ...at(TOWER, tower, 'glints'), ...at(GATE, gate, 'glints')], 1.6),
        new EaveBells(s, at(MONDOP, mondop, 'bells'), MONDOP.y),
        new EaveBells(s, at(TOWER, tower, 'bells'), TOWER.y),
        new RackBells(s, at(BELL_L, corrL, 'bells'), { x: BELL_L.x - 40, y: BELL_L.y - 50, w: 80, h: 50 }, BELL_L.y),
        new RackBells(s, at(BELL_R, corrR, 'bells'), { x: BELL_R.x - 40, y: BELL_R.y - 50, w: 80, h: 50 }, BELL_R.y),
        new TowerBell(s, bell.x, bell.y, { x: TOWER.x - 20, y: TOWER.y - 88, w: 40, h: 88 }, TOWER.y),
        Flames.candles(s, 118, 346),
        Flames.candles(s, 182, 346),
        new Smoke(s, [{ x: URN.x, y: URN.y - 14 }], 7),
        new Lanterns(s, [
          { x0: 6, y0: 690, x1: 294, y1: 690, n: 14, sag: 10, colors: ['#3fae6e', '#ffd23f', '#e8514a'] },
        ]),
        new Butterflies(s, [
          { x: 10, y: 380, w: 90, h: 200 },
          { x: 200, y: 380, w: 90, h: 200 },
        ], 5),
        new CloudShadows(s, 3),
        new SunRays(s),
        new Traffic(s, [
          { y: 944, dir: 1 },
          { y: 958, dir: -1 },
        ]),
        new Gags(s, gags()),
        new TapZones([
          shakeTree(s, 'rain', RAIN.x, RAIN.y - 10, 90, ['#6cb85c', '#3f8a4f'], 'leaf', 50),
          shakeTree(s, 'bf1', 24, 736, 40, ['#fffaf0', '#ffd23f'], 'petal', 34),
          shakeTree(s, 'bf2', 280, 726, 40, ['#ffc4d8', '#ffe45e'], 'petal', 34),
          {
            rect: { x: 90, y: 100, w: 120, h: 150 },
            fn: (x: number, y: number) => {
              s.particles.sparkles(x, y, 10, '#fff3a6', 10)
              sfx.chime()
            },
          },
        ]),
      ]
    },
    overlay(g, t) {
      // Mist drifting over the hills.
      g.ctx.save()
      g.ctx.globalAlpha = 0.22
      for (let i = 0; i < 4; i++) {
        const y = 120 + i * 130 + Math.sin(t * 0.2 + i) * 5
        const x = ((t * (3 + i) + i * 70) % (W + 160)) - 80
        g.ellipse(x, y, 50, 5, '#f5f7ff')
        g.ellipse(x + 40, y + 4, 34, 4, '#f5f7ff')
      }
      g.ctx.restore()
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.4) s.particles.add({ kind: 'leaf', x: RAIN.x + rand(-40, 40), y: RAIN.y - 60, vx: rand(-4, 4), vy: rand(6, 11), max: 3, color: '#6cb85c', color2: '#3f8a4f' })
      if (s.isNight() && Math.random() < dt * 1.2) s.particles.add({ kind: 'sparkle', x: CX + rand(-50, 50), y: rand(100, 300), vy: rand(-6, -2), max: rand(1, 2), color: '#fff3a6', drag: 0.3 })
    },
    wander: [
      { x: 20, y: 330, w: 260, h: 30 },
      { x: 120, y: 380, w: 60, h: 210 },
      { x: 20, y: 700, w: 260, h: 80 },
    ],
    pois: [
      { x: CX - 10, y: 340, face: 'up' },
      { x: CX + 10, y: 340, face: 'up' },
      { x: 46, y: 314, face: 'up' },
      { x: 254, y: 316, face: 'up' },
      { x: CX, y: 746, face: 'up' },
      { x: TOWER.x, y: TOWER.y + 10, face: 'up' },
      { x: 70, y: 828, face: 'up' },
    ],
    fireflies: [
      { x: 0, y: 380, w: 100, h: 210 },
      { x: 200, y: 380, w: 100, h: 210 },
    ],
    monkPath: [
      [CX, 340],
      [CX, 900],
      [CX, 948],
      [-20, 948],
    ],
    birds: { x: 40, y: 700, w: 220, h: 30 },
    cats: [{ x: 200, y: 640, pose: 'sleep', color: '#9a8a8a' }],
    novice: { x: 30, y: 620, w: 60, h: 40 },
    dogs: ['cocoa'],
    visitors: 4,
  }
}

// ---------------------------------------------------------------------------
// Interior: the mondop – walls of black lacquer inlaid with mother-of-pearl,
// silver mats on the floor, and in the middle the gilded Footprint.

const IW = 220
const IH = 380
const ICX = 110
const FOOT = { x: ICX, y: 214, len: 96 }

function bakeMondop(g: Surface) {
  g.rect(0, 0, IW, 18, '#1e1a2a')
  for (let x = 0; x < IW; x += 10) g.px(x + 5, 9, GOLD.b)
  g.rect(0, 16, IW, 2, GOLD.b)
  // Mother-of-pearl walls.
  g.rect(0, 18, IW, 132, '#1e1a2a')
  for (let i = 0; i < 900; i++) {
    const x = Math.floor(A.hash(i, 1, 9) * IW)
    const y = 20 + Math.floor(A.hash(i, 2, 9) * 128)
    g.px(x, y, ['#e8f4ff', '#c8e0ff', '#ffe0f0', '#d8fff0', '#8a86a0'][i % 5])
  }
  for (let x = 12; x < IW; x += 40) {
    g.circle(x + 8, 70, 12, '#2a2440')
    for (let a = 0; a < 16; a++) g.px(x + 8 + Math.cos(a * 0.39) * 10, 70 + Math.sin(a * 0.39) * 10, a % 2 ? '#e8f4ff' : '#ffe0f0')
    g.circle(x + 8, 70, 3, GOLD.b)
  }
  for (const x of [0, 50, 170, IW - 6]) g.rect(x, 18, 6, 132, GOLD.d)
  g.rect(0, 146, IW, 4, GOLD.b)
  // Floor of woven silver mats.
  PB.silverMatFloor(g, 0, 150, IW, IH - 160)
  // Low gold railing around the sunken Footprint.
  const rx0 = FOOT.x - 40
  const rx1 = FOOT.x + 40
  const ry0 = FOOT.y - FOOT.len / 2 - 14
  const ry1 = FOOT.y + FOOT.len / 2 + 12
  g.rect(rx0 - 2, ry0 - 2, rx1 - rx0 + 4, ry1 - ry0 + 4, '#8a6a2a')
  PB.drawFootprint(g, FOOT.x, FOOT.y, FOOT.len)
  for (let x = rx0; x <= rx1; x += 6) {
    g.rect(x, ry1 - 4, 2, 6, GOLD.b)
    g.px(x, ry1 - 5, GOLD.L)
  }
  g.rect(rx0, ry1 - 4, rx1 - rx0 + 2, 1, GOLD.l)
  for (let y = ry0; y < ry1; y += 6) {
    g.rect(rx0 - 2, y, 2, 4, GOLD.d)
    g.rect(rx1 + 1, y, 2, 4, GOLD.D)
  }
  for (const x0 of [0, IW - 8]) g.rect(x0, 18, 8, IH - 18, '#2a2440')
  g.rect(0, IH - 10, IW, 10, '#2a2440')
  g.rect(ICX - 16, IH - 10, 32, 10, '#fff6dc')
}

function mondopGags(): Gag[] {
  const a = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_white', bottom: 'bot_sarong' })
  const b = look({ gender: 'm', hair: 'hair_short', top: 'top_white' })
  const c = look({ gender: 'f', hair: 'hair_bob', top: 'top_floral' })
  return [
    person(76, 290, a, ['รอยพระพุทธบาทใหญ่กว่าที่คิดอีก', 'ปิดทองรอยพระบาทแล้วเป็นสิริมงคล', 'สาธุ ๆ'], { view: 'back', pose: 'kneel' }),
    person(144, 292, b, ['โยนเหรียญลงไปแล้ว ขอให้ครอบครัวสุขสบาย', 'เงียบ ๆ นะ ที่นี่ศักดิ์สิทธิ์', 'สาธุครับ'], { view: 'back', pose: 'wai' }),
    {
      x: 176,
      y: 322,
      lines: ['เสื่อเงินนุ่มเท้าจัง', 'ผนังมุกวาววับเหมือนดาว', 'ถ่ายรูปในมณฑปไม่ได้นะ จำไว้ในใจแทน'],
      draw: (g, p) => drawPerson(g, c, p, 'front'),
    },
  ]
}

export function phutthabatMondopMap(): MapDef {
  const props: PlacedProp[] = [
    { sprite: A.pillarProp(150, '#c9a04c', '#fff3a6', 10), x: 24, y: 200 },
    { sprite: A.pillarProp(150, '#c9a04c', '#fff3a6', 10), x: IW - 24, y: 200 },
    { sprite: A.pillarProp(220, '#c9a04c', '#fff3a6', 10), x: 24, y: 330 },
    { sprite: A.pillarProp(220, '#c9a04c', '#fff3a6', 10), x: IW - 24, y: 330 },
    { sprite: A.candleRackProp(), x: 50, y: 262 },
    { sprite: F.candleStandSprite(), x: 170, y: 264 },
    { sprite: A.mopBucketProp(), x: 186, y: 300 },
    { sprite: F.donationSprite(), x: 40, y: 172, shadow: [6, 2] },
    { sprite: F.lotusJarSprite('green'), x: 180, y: 172 },
  ]
  return {
    id: 'wat_phutthabat:mondop',
    area: 'mountain',
    place: 'wat_phutthabat',
    indoor: true,
    indoorLight: 0.85,
    w: IW,
    h: IH,
    skyH: 0,
    ground: '#1e1a2a',
    camBias: 0.6,
    bake: bakeMondop,
    props,
    obstacles: [
      { x: 0, y: 0, w: IW, h: 160 },
      { x: 0, y: 0, w: 10, h: IH },
      { x: IW - 10, y: 0, w: 10, h: IH },
      { x: 0, y: IH - 10, w: ICX - 16, h: 10 },
      { x: ICX + 16, y: IH - 10, w: IW - ICX - 16, h: 10 },
      { x: FOOT.x - 44, y: FOOT.y - FOOT.len / 2 - 16, w: 88, h: FOOT.len + 30 },
      { x: 36, y: 254, w: 28, h: 9 },
      { x: 162, y: 258, w: 16, h: 7 },
      { x: 178, y: 294, w: 14, h: 7 },
      { x: 17, y: 195, w: 14, h: 6 },
      { x: IW - 31, y: 195, w: 14, h: 6 },
      { x: 17, y: 325, w: 14, h: 6 },
      { x: IW - 31, y: 325, w: 14, h: 6 },
    ],
    hotspots: [
      spot('pray', 'รอยพระพุทธบาท', 'กราบ ปิดทอง สวดมนต์ขอพร', 'pray', { x: FOOT.x - 30, y: FOOT.y - 50, w: 60, h: 100 }, { x: FOOT.x, y: FOOT.y + FOOT.len / 2 + 26 }, 'up', { marker: { x: FOOT.x, y: FOOT.y - 10 }, beacon: true, near: 16 }),
      spot('job:light_candles', 'แท่นเทียน', 'จุดเทียนบูชารอยพระบาท', 'broom', { x: 36, y: 240, w: 28, h: 20 }, { x: 50, y: 274 }, 'up', { marker: { x: 50, y: 238 } }),
      spot('job:mop_floor', 'ถังน้ำ', 'เช็ดเสื่อเงินและพื้นให้สะอาด', 'broom', { x: 176, y: 278, w: 22, h: 24 }, { x: 186, y: 312 }, 'up', { marker: { x: 186, y: 276 } }),
      spot('donation', 'ตู้ทำบุญ', 'ทำบุญบำรุงมณฑป', 'coin', { x: 32, y: 146, w: 16, h: 26 }, { x: 48, y: 180 }, 'up', { marker: { x: 40, y: 144 } }),
      door('wat_phutthabat', 'ออกไปลานมณฑป', { x: ICX - 18, y: IH - 32, w: 36, h: 32 }, { x: ICX, y: IH - 14 }, 'down', { x: ICX, y: IH - 28 }),
    ],
    entries: { wat_phutthabat: { x: ICX, y: IH - 30, face: 'up' } },
    spawn: { x: ICX, y: IH - 30, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: FOOT.x, y: FOOT.y, r: 46, color: '#ffd88a' },
      { x: 50, y: 250, r: 12, color: '#ffb35a' },
      { x: 170, y: 252, r: 10, color: '#ffb35a' },
      { x: 58, y: 70, r: 14, color: '#c8e0ff' },
      { x: 138, y: 70, r: 14, color: '#c8e0ff' },
      { x: ICX, y: IH - 4, r: 26, color: '#fff6dc' },
    ],
    life(s) {
      const gl: { x: number; y: number }[] = []
      for (let i = 0; i < 14; i++) gl.push({ x: FOOT.x - 14 + ((i * 7) % 28), y: FOOT.y - 40 + ((i * 13) % 80) })
      for (let i = 0; i < 8; i++) gl.push({ x: 10 + ((i * 37) % 200), y: 30 + ((i * 29) % 110) })
      return [
        new Glints(s, gl, 2.2),
        new Flames(s, [{ x: 41, y: 245 }, { x: 50, y: 245 }, { x: 59, y: 245 }], 262),
        Flames.candles(s, 170, 264),
        new Gags(s, mondopGags()),
        new TapZones([
          {
            rect: { x: FOOT.x - 26, y: FOOT.y - 50, w: 52, h: 100 },
            fn: (x: number, y: number) => {
              // A coin tossed onto the Footprint.
              s.particles.add({ kind: 'dot', x, y: y - 20, vy: 30, g: 60, max: 0.5, color: GOLD.b })
              s.particles.sparkles(x, y, 8, '#fff3a6', 8)
              s.say(['ติ๊ง! เหรียญตกลงรอยพระบาท', 'สาธุ~', 'เป็นสิริมงคล'][Math.floor(Math.random() * 3)], x, y - 20)
              sfx.coin()
            },
          },
        ]),
      ]
    },
    wander: [{ x: 16, y: 280, w: 188, h: 70 }],
    pois: [
      { x: 96, y: 288, face: 'up' },
      { x: 124, y: 288, face: 'up' },
      { x: 50, y: 276, face: 'up' },
    ],
    dogs: [],
    visitors: 2,
  }
}

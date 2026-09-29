// วัดภูมินทร์ น่าน – the cruciform ubosot carried on the backs of two great
// nagas stands in a sand courtyard with tung banners, a Nan drum tower and a
// huge rain tree. Inside: four Buddhas seated back to back and the Tai Lue
// murals with the whispering couple (ปู่ม่านย่าม่าน). Outside the wall, the
// old-town walking street with hand-woven cloth and golden oranges.
//
// Maps: 'wat_phumin' and 'wat_phumin:ubosot'.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as T from '../../../art/temple'
import * as F from '../../../art/templeprops'
import * as G from '../../../art/garden'
import { road } from '../common'
import { drawPerson, Gags, gagFx, type Gag } from '../../gags'
import { Butterflies, CloudShadows, EaveBells, Flames, Glints, Smoke, SunRays, TapZones, Traffic } from '../../life'
import * as L from '../../../art/places/historic-lanna'
import * as H from '../../../art/places/historic'
import * as I from '../../../art/places/historic-interior'
import { DustMotes, foot, LightShafts, look, shakeTree } from './historic-common'

const ID = 'wat_phumin'
const UBO = 'wat_phumin:ubosot'

const W = 300
const HH = 900
const U = { x: 150, y: 430 }
const RAIN = { x: 262, y: 320 }
const GATE = { x: 150, y: 606 }
const LAMPS: [number, number][] = [
  [110, 520],
  [190, 520],
  [40, 660],
  [260, 660],
]

function nanMountains(g: Surface, night: boolean) {
  const far = night ? '#56608e' : '#9ab0d0'
  const mid = night ? '#46507e' : '#7c98c0'
  for (let x = -40; x < W + 60; x += 70) g.poly([[x - 60, 124], [x + 10, 72 + ((x * 7) % 18)], [x + 80, 124]], far)
  for (let x = -20; x < W + 40; x += 48) g.poly([[x - 40, 124], [x + 12, 92 + ((x * 5) % 12)], [x + 60, 124]], mid)
}

function bakeGrounds(g: Surface, night: boolean) {
  nanMountains(g, night)
  G.treeLine(g, 118, W, G.LEAVES.far, 5)
  G.treeLine(g, 132, W, G.LEAVES.deep, 10)
  G.lawn(g, 0, 144, W, 460, 31)
  H.sand(g, 10, 200, W - 20, 400, 13)
  G.groundShadow(g, RAIN.x - 10, RAIN.y - 8, 50, 10, 0.8)
  G.leafLitter(g, 190, 300, 110, 70, 100, 7)
  H.shoesOnGround(g, 186, 440, 6, 8)
  G.flowerBed(g, 20, 560, 70, 8, ['#f58f35', '#ffd23f', '#ff9fc0'], 3)
  G.flowerBed(g, 210, 560, 70, 8, ['#fffaf0', '#ff9fc0', '#e8514a'], 4)
  // Walking street and road.
  G.paving(g, 0, 606, W, 110, 6, 'grey')
  G.weather(g, 0, 606, W, 110, 8, 1)
  road(g, 0, 716, W, 44)
  G.paving(g, 0, 760, W, 30, 6, 'grey')
  G.lawn(g, 0, 790, W, 150, 32)
}

function phGags(): Gag[] {
  const weaver = look({ gender: 'f', hair: 'hair_bun', top: 'top_mohom', bottom: 'bot_sin_mudmee' })
  const orange = look({ gender: 'm', hair: 'hair_short', top: 'top_mohom', bottom: 'bot_fisherman', head: 'head_ngob' })
  const couple = [look({ gender: 'm', hair: 'hair_short', top: 'top_tee_white' }), look({ gender: 'f', hair: 'hair_long', top: 'top_floral', head: 'head_frangipani' })]
  const cyclist = look({ gender: 'f', hair: 'hair_ponytail', top: 'top_stripe', bottom: 'bot_denim_shorts', head: 'head_helmet_cute' })
  return [
    { x: 92, y: 674, lines: ['ผ้าทอลายน้ำไหล ทอมือทุกผืนเจ้า', 'ลายนี้ของไทลื้อเมืองน่านแท้ ๆ', 'ใส่ผ้าซิ่นเข้าวัดสวยเลยนะ'], draw: (g, p) => drawPerson(g, weaver, p) },
    { x: 216, y: 674, lines: ['ส้มสีทองน่าน หวานฉ่ำ!', 'ปลูกบนดอย เปลือกสีทองอร่าม', 'ชิมกลีบนึงไหมครับ'], draw: (g, p) => drawPerson(g, orange, p) },
    {
      x: 70, y: 540, w: 26, h: 34, lines: ['ถ่ายรูปคู่ปู่ม่านย่าม่าน~', 'กระซิบรักบันลือโลก!', 'ยื่นหน้าเข้าช่องแล้วยิ้ม~'],
      draw: (g, p) => {
        g.rect(p.x - 12, p.y - 32, 24, 30, '#e8d8b4')
        g.frame(p.x - 12, p.y - 32, 24, 30, '#9a3a2c')
        g.circle(p.x - 5, p.y - 24, 3, '#3a2838')
        g.circle(p.x + 5, p.y - 24, 3, '#3a2838')
        g.rect(p.x - 9, p.y - 20, 7, 12, '#3a2a5a')
        g.rect(p.x + 2, p.y - 20, 7, 12, '#6a2a5a')
        g.px(p.x, p.y - 28, '#e8709e')
        g.rect(p.x - 8, p.y - 2, 2, 3, '#6e4a35')
        g.rect(p.x + 6, p.y - 2, 2, 3, '#6e4a35')
      },
      react: (sc, x, y) => {
        gagFx.flash(sc, x, y)
        sc.particles.hearts(x, y - 30, 3)
      },
    },
    {
      x: 230, y: 520, lines: ['มาขอพรเรื่องความรักค่ะ', 'เขาว่ามาวัดภูมินทร์แล้วจะสมหวัง', 'กระซิบกันเบา ๆ นะ'],
      draw: (g, p) => {
        drawPerson(g, couple[0], { ...p, x: p.x - 6 }, 'back')
        drawPerson(g, couple[1], { ...p, x: p.x + 6 }, 'back')
      },
      react: (sc, x, y) => sc.particles.hearts(x, y - 30, 3),
    },
    {
      x: 30, y: 700, walk: { x0: 20, x1: 280, speed: 18 }, h: 30, lines: ['ปั่นจักรยานชมเมืองเก่าน่าน~', 'กริ๊ง กริ๊ง!', 'ลมหนาวเย็นสบาย'],
      draw: (g, p) => {
        const x = p.x
        const y = p.y
        g.circle(x - 6, y - 3, 3, '#3a3040')
        g.circle(x + 6, y - 3, 3, '#3a3040')
        g.circle(x - 6, y - 3, 1.6, '#bdb2ae')
        g.circle(x + 6, y - 3, 1.6, '#bdb2ae')
        g.line(x - 6, y - 3, x, y - 9, '#e8514a')
        g.line(x + 6, y - 3, x, y - 9, '#e8514a')
        g.line(x + 6, y - 3, x + 5, y - 11, '#e8514a')
        g.rect(x + (p.flip ? -5 : 3), y - 11, 3, 3, '#c9a04c')
        drawPerson(g, cyclist, { ...p, y: y - 8, moving: false }, 'side', [], 'sit')
      },
      react: () => sfx.chime(),
    },
  ]
}

export function phuminMap(): MapDef {
  const ubo = L.phuminUbosotSprite()
  const uboN = L.phuminUbosotSprite(true)
  const gate = L.khongGateSprite()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const props: PlacedProp[] = [
    { sprite: T.chediSprite({ small: true, gold: true }), x: 40, y: 236 },
    { sprite: L.drumTowerSprite(), x: 44, y: 330 },
    { sprite: H.rainTree(31, G.LEAVES.deep), x: RAIN.x, y: RAIN.y, id: 'rain' },
    { sprite: H.broomSprite(), x: 236, y: 326 },
    { sprite: ubo, night: uboN, x: U.x, y: U.y },
    { sprite: H.shoeRackSprite(true), x: 196, y: 448 },
    { sprite: F.urnSprite(), x: 110, y: 474, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: 190, y: 474 },
    { sprite: F.donationSprite(), x: 70, y: 470, shadow: [6, 2] },
    { sprite: F.lotusJarSprite('brown'), x: 250, y: 470 },
    { sprite: L.fortWallSprite(118, 3), x: 0, y: GATE.y },
    { sprite: L.fortWallSprite(118, 4), x: 182, y: GATE.y },
    { sprite: gate, x: GATE.x, y: GATE.y + 2 },
    { sprite: L.clothStallSprite(), x: 64, y: 684 },
    { sprite: L.orangeStallSprite(), x: 244, y: 684 },
    { sprite: H.oldTree(41), x: 40, y: 860, id: 'o1' },
    { sprite: H.oldTree(42, G.LEAVES.deep), x: 150, y: 890, id: 'o2' },
    { sprite: H.oldTree(43), x: 262, y: 866, id: 'o3' },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
  ]
  return {
    id: ID,
    place: ID,
    area: 'wat',
    w: W,
    h: HH,
    skyH: 120,
    ground: '#86c95f',
    camBias: 0.6,
    bake: bakeGrounds,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 250 },
      foot(44, 330, 30, 8),
      foot(RAIN.x, RAIN.y, 16, 10),
      { x: 10, y: 380, w: 280, h: 30 },
      { x: 40, y: 410, w: 100, h: 24 },
      { x: 160, y: 410, w: 110, h: 24 },
      foot(196, 448, 26, 8),
      foot(110, 474, 22, 8),
      foot(190, 474, 16, 6),
      foot(70, 470, 12, 6),
      foot(250, 470, 12, 6),
      { x: 20, y: 560, w: 70, h: 9 },
      { x: 210, y: 560, w: 70, h: 9 },
      { x: 0, y: GATE.y - 26, w: 136, h: 28 },
      { x: 164, y: GATE.y - 26, w: 136, h: 28 },
      foot(64, 684, 54, 14),
      foot(244, 684, 46, 14),
      { x: 0, y: 718, w: W, h: 40 },
      { x: 0, y: 790, w: W, h: 150 },
      ...LAMPS.map(([x, y]) => foot(x, y, 6, 4)),
    ],
    hotspots: [
      { id: `door:${UBO}`, label: 'อุโบสถจัตุรมุข', hint: 'เข้าไปกราบพระสี่ทิศ ชมภาพกระซิบรัก', icon: 'temple', rect: { x: 120, y: 290, w: 60, h: 140 }, at: { x: U.x, y: 440 }, face: 'up', marker: { x: U.x, y: 280 }, beacon: true, near: 12 },
      { id: 'naga', label: 'พญานาคแบกโบสถ์', hint: 'ไหว้พญานาคผู้พิทักษ์', icon: 'deity', rect: { x: 150, y: 396, w: 34, h: 34 }, at: { x: 178, y: 440 }, face: 'up', marker: { x: 170, y: 392 } },
      { id: 'incense', label: 'กระถางธูป', hint: 'จุดธูปขอพรเรื่องหัวใจ', icon: 'incense', rect: { x: 96, y: 450, w: 28, h: 26 }, at: { x: 110, y: 486 }, face: 'up', marker: { x: 110, y: 446 } },
      { id: 'donation', label: 'ตู้ทำบุญ', hint: 'ร่วมบูรณะจิตรกรรม', icon: 'coin', rect: { x: 62, y: 444, w: 16, h: 26 }, at: { x: 70, y: 480 }, face: 'up', marker: { x: 70, y: 442 } },
      { id: 'job:sweep_leaves', label: 'กวาดใบจามจุรี', hint: 'ใบไม้ร่วงเต็มลานทราย', icon: 'broom', rect: { x: 214, y: 300, w: 40, h: 34 }, at: { x: 230, y: 344 }, face: 'right', marker: { x: 236, y: 298 } },
      { id: 'job:arrange_shoes', label: 'จัดรองเท้า', hint: 'หน้าบันไดนาครองเท้าเต็มเลย', icon: 'check', rect: { x: 182, y: 432, w: 28, h: 18 }, at: { x: 206, y: 458 }, face: 'left', marker: { x: 196, y: 430 } },
      { id: 'job:water_plants', label: 'รดน้ำดอกไม้', hint: 'แปลงดอกไม้หน้ากำแพงเหี่ยวแล้ว', icon: 'water', rect: { x: 20, y: 546, w: 70, h: 20 }, at: { x: 54, y: 576 }, face: 'up', marker: { x: 54, y: 544 } },
      { id: `shop:${ID}_cloth`, label: 'ผ้าทอเมืองน่าน', hint: 'ผ้าซิ่นลายน้ำไหล ผ้าทอไทลื้อ', icon: 'shirt', rect: { x: 38, y: 644, w: 54, h: 40 }, at: { x: 64, y: 694 }, face: 'up', marker: { x: 64, y: 640 } },
      { id: `shop:${ID}_orange`, label: 'ส้มสีทองน่าน', hint: 'ผลไม้ขึ้นชื่อเมืองน่าน', icon: 'fruit', rect: { x: 222, y: 642, w: 44, h: 42 }, at: { x: 244, y: 694 }, face: 'up', marker: { x: 244, y: 638 } },
      { id: 'gate', label: 'ประตูวัดภูมินทร์', hint: 'กลับบ้าน หรือไปวัดอื่น', icon: 'map', rect: { x: 134, y: 540, w: 32, h: 66 }, at: { x: GATE.x, y: 616 }, face: 'down', marker: { x: GATE.x, y: 536 }, near: 12 },
    ],
    spawn: { x: GATE.x, y: 618, face: 'up' },
    entries: { [UBO]: { x: U.x, y: 452, face: 'down' } },
    pickupSpots: [
      { x: 90, y: 270 },
      { x: 210, y: 270 },
      { x: 30, y: 440 },
      { x: 130, y: 520 },
      { x: 270, y: 530 },
      { x: 150, y: 650 },
      { x: 20, y: 770 },
      { x: 280, y: 775 },
    ],
    lights: [
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 20 })),
      { x: U.x, y: 400, r: 30, color: '#ffc070' },
      { x: 110, y: 462, r: 9, color: '#ff9a5a' },
      { x: 64, y: 650, r: 18, color: '#ffe0a0' },
      { x: 244, y: 650, r: 16, color: '#ffe0a0' },
    ],
    life(s) {
      const at = H.hookAt
      return [
        new Glints(s, [...(ubo.hooks.glints ?? []).map((h) => at(U, h)), ...(gate.hooks.glints ?? []).map((h) => at(GATE, h))], 1.2),
        new EaveBells(s, (ubo.hooks.bells ?? []).map((h) => at(U, h)), U.y),
        ...(ubo.hooks.candles ?? []).map((h) => new Flames(s, [at(U, h)], U.y)),
        Flames.candles(s, 190, 474),
        new Smoke(s, [{ x: 110, y: 456 }], 7),
        {
          sorted(add: (y: number, draw: () => void) => void, t: number) {
            const cols = ['#e8514a', '#ffd23f', '#6cc36a', '#5a8de0', '#ff9fc0', '#9270dc']
            ;[26, 84, 216, 274].forEach((x, i) => add(534, () => L.drawTung(s.gfx, x, 534, t + s.wind(), cols[i], i)))
            ;[100, 200].forEach((x, i) => add(266, () => L.drawTung(s.gfx, x, 266, t + s.wind(), cols[i + 4], i + 5)))
          },
        },
        new Butterflies(s, [
          { x: 20, y: 500, w: 260, h: 50 },
          { x: 20, y: 800, w: 260, h: 40 },
        ], 6),
        new CloudShadows(s, 3),
        new SunRays(s),
        new Gags(s, phGags()),
        new Traffic(s, [
          { y: 730, dir: 1 },
          { y: 750, dir: -1 },
        ]),
        new TapZones([
          shakeTree(s, 'rain', RAIN.x, RAIN.y - 20, 110, 76, ['#ffb8d0', '#5eae55']),
          {
            rect: { x: 24, y: 262, w: 40, h: 60 },
            fn: () => {
              sfx.bigBell()
              s.say('ตึ้ง… ตึ้ง… (กลองบูชา)', 44, 262)
            },
          },
          {
            rect: { x: 20, y: 398, w: 260, h: 30 },
            fn: (x, y) => {
              s.particles.sparkles(x, y, 6, '#b8f0c0', 8)
              s.say(['พญานาคสองตัวแบกโบสถ์ไว้บนหลัง', 'หัวนาคอยู่ทิศเหนือใต้ หางอยู่อีกฝั่ง'][Math.floor(Math.random() * 2)], x, y - 12)
              sfx.chime()
            },
          },
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.4) s.particles.add({ kind: 'leaf', x: RAIN.x + rand(-40, 30), y: RAIN.y - 70, vx: rand(-4, 4), vy: rand(6, 11), max: rand(2.5, 3.5), color: '#ffb8d0', color2: '#5eae55' })
    },
    wander: [
      { x: 70, y: 260, w: 160, h: 110 },
      { x: 20, y: 490, w: 260, h: 60 },
      { x: 10, y: 620, w: 280, h: 20 },
    ],
    pois: [
      { x: 110, y: 486, face: 'up' },
      { x: U.x, y: 444, face: 'up' },
      { x: 178, y: 444, face: 'up' },
      { x: 64, y: 694, face: 'up' },
      { x: 244, y: 694, face: 'up' },
    ],
    fireflies: [{ x: 10, y: 250, w: 280, h: 300 }],
    monkPath: [
      [U.x, 446],
      [150, 624],
      [-20, 624],
    ],
    birds: { x: 110, y: 500, w: 80, h: 30 },
    cats: [
      { x: 222, y: 480, pose: 'loaf', color: '#fbf3e4' },
      { x: 20, y: 628, pose: 'sleep', color: '#f5a55a' },
    ],
    novice: { x: 70, y: 270, w: 160, h: 90 },
    dogs: [],
    visitors: 5,
  }
}

// ---------------------------------------------------------------------------
// Interior: the cruciform hall with the four Buddhas and the murals.

const IW = 300
const IH = 380
const FOUR = { x: 150, y: 250 }

function bakeUbosot(g: Surface) {
  g.rect(0, 0, IW, IH, '#2a1c1c')
  // North arm end wall (top) and the west/east arms' walls, all painted.
  I.muralWall(g, 104, 10, 92, 90, I.MURAL_CREAM, 9)
  L.drawWhisperMural(g, 6, 110, 98, 58)
  I.muralWall(g, 196, 110, 98, 58, I.MURAL_CREAM, 11)
  I.skirting(g, 104, 104, 92, '#6a2420')
  I.skirting(g, 6, 172, 98, '#6a2420')
  I.skirting(g, 196, 172, 98, '#6a2420')
  // Cross-shaped floor of old terracotta.
  I.terracottaFloor(g, 104, 104, 92, 276, 3)
  I.terracottaFloor(g, 6, 172, 288, 96, 4)
  I.carpet(g, 136, 290, 28, 90, '#8a2432')
  I.mats(g, 20, 230, 5, 16)
  I.mats(g, 200, 230, 5, 16)
  // Doors at the west and east ends (light through them).
  g.rect(0, 196, 6, 48, '#fff0c0')
  g.rect(294, 196, 6, 48, '#fff0c0')
  // Front (south) door.
  g.rect(104, 368, 92, 12, '#3a1c1c')
  g.rect(134, 368, 32, 12, '#fff0c0')
  g.rect(136, 370, 28, 10, '#ecd6ac')
}

export function phuminUbosotMap(): MapDef {
  const four = L.fourBuddhasSprite()
  const rackL = I.candleRackSprite(7)
  const rackR = I.candleRackSprite(7)
  const pillars: [number, number][] = [
    [112, 180],
    [188, 180],
    [112, 280],
    [188, 280],
    [112, 350],
    [188, 350],
  ]
  const props: PlacedProp[] = [
    { sprite: four, x: FOUR.x, y: FOUR.y },
    ...pillars.map(([x, y]) => ({ sprite: I.pillarSprite(120, 'lacquer', 7), x, y })),
    { sprite: rackL, x: 126, y: 268 },
    { sprite: rackR, x: 174, y: 268 },
    { sprite: I.offeringTableSprite(30), x: 150, y: 272 },
    { sprite: I.lotusVaseSprite(), x: 84, y: 258 },
    { sprite: I.lotusVaseSprite(), x: 216, y: 258 },
    { sprite: H.mopBucketSprite(), x: 270, y: 256 },
  ]
  return {
    id: UBO,
    place: ID,
    area: 'wat',
    indoor: true,
    indoorLight: 0.75,
    w: IW,
    h: IH,
    skyH: 0,
    ground: '#2a1c1c',
    camBias: 0.55,
    bake: bakeUbosot,
    props,
    obstacles: [
      { x: 0, y: 0, w: IW, h: 180 },
      { x: 0, y: 268, w: 104, h: IH - 268 },
      { x: 196, y: 268, w: 104, h: IH - 268 },
      { x: 0, y: 180, w: 6, h: 88 },
      { x: 294, y: 180, w: 6, h: 88 },
      { x: 84, y: 180, w: 132, h: 76 },
      { x: 104, y: 370, w: 30, h: 10 },
      { x: 166, y: 370, w: 30, h: 10 },
      foot(126, 268, 32, 8),
      foot(174, 268, 32, 8),
      foot(150, 272, 30, 6),
      foot(84, 258, 10, 5),
      foot(216, 258, 10, 5),
      ...pillars.map(([x, y]) => foot(x, y, 11, 6)),
      foot(270, 256, 12, 5),
    ],
    hotspots: [
      { id: 'pray', label: 'พระพุทธรูปสี่ทิศ', hint: 'กราบพระประธานจตุรพักตร์ สวดมนต์ขอพร', icon: 'pray', rect: { x: 90, y: 110, w: 120, h: 140 }, at: { x: 150, y: 288 }, face: 'up', marker: { x: FOUR.x, y: 130 }, beacon: true, near: 16 },
      { id: 'job:light_candles', label: 'จุดเทียนบูชาพระ', hint: 'ช่วยจุดเทียนหน้าองค์พระ', icon: 'incense', rect: { x: 108, y: 250, w: 36, h: 20 }, at: { x: 124, y: 284 }, face: 'up', marker: { x: 126, y: 248 } },
      { id: 'job:wipe_statues', label: 'ปัดฝุ่นองค์พระ', hint: 'เช็ดฐานพระสี่ทิศอย่างเบามือ', icon: 'sparkle', rect: { x: 196, y: 190, w: 30, h: 60 }, at: { x: 230, y: 250 }, face: 'left', marker: { x: 212, y: 188 } },
      { id: 'job:mop_floor', label: 'เช็ดพื้นอิฐโบราณ', hint: 'ถูพื้นแขนตะวันออกให้สะอาด', icon: 'broom', rect: { x: 250, y: 236, w: 36, h: 24 }, at: { x: 260, y: 262 }, face: 'right', marker: { x: 270, y: 234 } },
      { id: `door:${ID}`, label: 'ออกจากโบสถ์', hint: 'ลงบันไดนาคกลับสู่ลานทราย', icon: 'map', rect: { x: 134, y: 362, w: 32, h: 18 }, at: { x: 150, y: 374 }, face: 'down', marker: { x: 150, y: 364 }, near: 12 },
    ],
    spawn: { x: 150, y: 352, face: 'up' },
    entries: { [ID]: { x: 150, y: 352, face: 'up' } },
    pickupSpots: [],
    lights: [
      { x: FOUR.x, y: 170, r: 44, color: '#ffd890' },
      { x: 126, y: 258, r: 12, color: '#ffb35a' },
      { x: 174, y: 258, r: 12, color: '#ffb35a' },
      { x: 6, y: 220, r: 26, color: '#fff6d8' },
      { x: 294, y: 220, r: 26, color: '#fff6d8' },
    ],
    life(s) {
      const at = H.hookAt
      let whisper = 0
      return [
        new Flames(s, (rackL.hooks.flames ?? []).map((h) => at({ x: 126, y: 268 }, h)), 268),
        new Flames(s, (rackR.hooks.flames ?? []).map((h) => at({ x: 174, y: 268 }, h)), 268),
        ...(four.hooks.candles ?? []).map((h) => new Flames(s, [at(FOUR, h)], FOUR.y)),
        new Glints(s, (four.hooks.glints ?? []).map((h) => at(FOUR, h)), 1.2),
        new LightShafts(s, [
          { x: 0, y: 196, w: 6, h: 48, dx: 60, a: 0.06 },
          { x: 294, y: 196, w: 6, h: 48, dx: -60, a: 0.06 },
          { x: 134, y: 320, w: 32, h: 60, dx: 0, a: 0.05 },
        ]),
        new DustMotes(s, [{ x: 20, y: 190, w: 260, h: 60 }], 16),
        new Gags(s, [
          {
            x: 176, y: 320, lines: ['ภาพนี้วาดโดยหนานบัวผัน ช่างไทลื้อ', 'ปู่ม่านย่าม่าน คือคู่รักชาวไทลื้อ', 'ลองแตะภาพกระซิบบนผนังด้านตะวันตกดูสิ'],
            draw: (g, p) => drawPerson(g, look({ gender: 'm', hair: 'hair_short', top: 'top_mohom', bottom: 'bot_khaki' }), p, 'front'),
          },
        ]),
        new TapZones([
          {
            rect: { x: 40, y: 110, w: 64, h: 58 },
            fn: () => {
              const lines = ['ปู่ม่านกระซิบว่า… "ตัวเองน่ารักที่สุดในเมืองน่านเลย"', 'ย่าม่านเขินจนแก้มแดง~', '"คำว่ารัก พูดเบา ๆ ก็ได้ยินถึงหัวใจ"', 'กระซิบรักบันลือโลก~ ขอให้สมหวังในความรักนะ']
              s.say(lines[whisper++ % lines.length], 70, 104)
              s.particles.hearts(70, 130, 5)
              sfx.sparkle()
            },
          },
          {
            rect: { x: 196, y: 110, w: 98, h: 58 },
            fn: (x, y) => {
              s.say(['ชาวไทลื้อทอผ้า ทำนา เลี้ยงควาย', 'เรือแข่งเมืองน่าน!'][Math.floor(Math.random() * 2)], x, y - 6)
              sfx.chime()
            },
          },
        ]),
      ]
    },
    wander: [
      { x: 20, y: 200, w: 60, h: 60 },
      { x: 220, y: 200, w: 60, h: 40 },
      { x: 124, y: 300, w: 52, h: 50 },
    ],
    pois: [
      { x: 140, y: 290, face: 'up' },
      { x: 160, y: 290, face: 'up' },
      { x: 60, y: 210, face: 'up' },
      { x: 240, y: 210, face: 'up' },
    ],
    cats: [],
    dogs: [],
    visitors: 3,
  }
}

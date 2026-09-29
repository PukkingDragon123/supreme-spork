// พระพุทธมิ่งมงคลเอกนาคคีรี (พระใหญ่ภูเก็ต) – the 45 m white marble Buddha on
// top of Nakkerd hill. A marble terrace with rails of bells and walls of signed
// wishing tiles looks out over Chalong bay and its islands; monkeys hop along
// the railings and the sun sets into the Andaman. A small shrine room sits
// inside the pedestal.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand, pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as T from '../../../art/temple'
import * as F from '../../../art/templeprops'
import * as G from '../../../art/garden'
import { CloudShadows, Flames, Flags, Glints, RackBells, Smoke, SunRays, TapZones } from '../../life'
import { Gags, drawPerson, gagFx, type Gag } from '../../gags'
import { leafPile, marbleFloor, rainTree, broomSprite, potPlant, arecaPalm } from '../../../art/places/south'
import { bellRail, bigBuddha, goldenBuddha, jungleTops, scaffold, seaView, tileBooth, wishTiles } from '../../../art/places/south_phuket'
import {
  altarSprite,
  bakeRoom,
  floorCandleSprite,
  kneelMat,
  lotusVaseSprite,
  mopBucketSprite,
  principalBuddha,
  scatteredShoes,
  type RoomSpec,
  type RoomStyle,
} from '../../../art/places/south_interior'
import { blessingMonkGag, hooks, look, personGag, shakeTree } from './south_common'
import { LightShafts, Monkeys, Motes } from './south_life'

const W = 320
const H = 780
const CX = 160
const BUDDHA = { x: CX, y: 344 }
const GOLDEN = { x: 40, y: 380 }
const BOOTH = { x: 276, y: 470 }
const RAILS = [84, 160, 236]
const RAIL_Y = 566
const TREE = { x: 22, y: 640 }
const GATE = { x: 40, y: 772 }

function bake(g: Surface, night: boolean) {
  // Far Andaman hills on the horizon.
  g.poly(
    [
      [0, 128],
      [50, 110],
      [110, 122],
      [170, 104],
      [240, 118],
      [320, 108],
      [320, 136],
      [0, 136],
    ],
    night ? '#3a4a7a' : '#9ab8d8',
  )
  G.treeLine(g, 130, W, G.LEAVES.far, 41)
  // Hilltop and the marble terrace.
  G.lawn(g, 0, 146, W, 440, 43)
  marbleFloor(g, 6, 300, 308, 262, 12, 5, '#f4f2f4')
  g.hline(6, 313, 300, '#ffffff')
  G.groundShadow(g, BUDDHA.x, 336, 120, 12, 0.6)
  // View down the hill: jungle tops then the sea with islands.
  seaView(g, 80, 600, W - 80, H - 600, night)
  jungleTops(g, 80, 572, W - 80, 36, 7)
  // Stair road down the hillside to the car park.
  g.rect(12, 562, 60, H - 562, '#d8d0cb')
  for (let y = 566; y < H; y += 6) {
    g.hline(12, 71, y, '#ece6e2')
    g.hline(12, 71, y + 5, '#bdb2ae')
  }
  jungleTops(g, 72, 612, 14, H - 612, 9)
  leafPile(g, 40, 650, 16, 4)
  leafPile(g, 56, 664, 8, 7)
  // Kneeling mats before the giant.
  for (const x of [120, 146, 172]) {
    g.rect(x, 360, 20, 8, '#e8b44a')
    g.frame(x, 360, 20, 8, '#b8742a')
  }
}

function gags(): Gag[] {
  const yogi = look({ gender: 'f', hair: 'hair_bun', hairColor: 3, top: 'top_tank', bottom: 'bot_sarong' })
  const tourist = look({ gender: 'm', hair: 'hair_short', hairColor: 3, top: 'top_hawaii', bottom: 'bot_cargo', head: 'head_sunglasses' })
  const guard = look({ gender: 'f', hair: 'hair_bob', hairColor: 0, top: 'top_polo', bottom: 'bot_black' })
  let glasses = true
  return [
    personGag(yogi, 214, 520, ['วิวสวยมาก ทำสมาธิดีกว่า', 'Namaste~ สาธุ', 'พระอาทิตย์ตกทะเลตรงนั้นเลย'], { view: 'back' }),
    {
      x: 120,
      y: 520,
      lines: ['เฮ้ย! ลิงขโมยแว่นกันแดดผม!', 'My sunglasses! กลับมานะ~', 'ถ่ายรูปพระใหญ่ก่อนดีกว่า'],
      draw: (g, p) => {
        drawPerson(g, glasses ? tourist : { ...tourist, head: null }, p, 'front', glasses ? [] : ['phone'])
      },
      react: (s, x, y) => {
        glasses = !glasses
        s.particles.popText(x, y - 30, glasses ? 'ได้คืนแล้ว!' : 'เจี๊ยก!', '#fff2a0', '#3a2838')
        sfx.tap()
      },
    },
    personGag(guard, 88, 330, ['กรุณาแต่งกายสุภาพนะคะ', 'ยืมผ้าถุงคลุมได้ที่นี่ค่ะ', 'ระวังลิงแย่งของด้วยนะคะ'], { extras: ['vest'] }),
    personGag(look({ gender: 'm', hair: 'hair_ponytail', hairColor: 1, top: 'top_tee_black' }), 250, 380, ['Wow, so big!', 'ใหญ่ที่สุดในภูเก็ต!', 'แชะ!'], { view: 'back', extras: ['selfie'], react: (s, x, y) => gagFx.flash(s, x, y) }),
  ]
}

export function bigBuddhaMap(): MapDef {
  const buddha = bigBuddha()
  const golden = goldenBuddha()
  const rail = bellRail(76)
  const props: PlacedProp[] = [
    { sprite: buddha, x: BUDDHA.x, y: BUDDHA.y, z: -12 },
    { sprite: golden, x: GOLDEN.x, y: GOLDEN.y },
    { sprite: scaffold(86), x: 280, y: 320 },
    { sprite: F.urnSprite(), x: CX, y: 392, shadow: [10, 2] },
    { sprite: F.candleStandSprite(), x: 132, y: 390 },
    { sprite: F.candleStandSprite(), x: 188, y: 390 },
    { sprite: F.donationSprite(), x: 212, y: 380, shadow: [6, 2] },
    { sprite: wishTiles(40), x: 30, y: 452 },
    { sprite: wishTiles(40), x: 30, y: 510 },
    { sprite: wishTiles(34), x: 290, y: 420 },
    { sprite: tileBooth(), x: BOOTH.x, y: BOOTH.y },
    ...RAILS.map((x) => ({ sprite: rail, x, y: RAIL_Y })),
    { sprite: rainTree(0), x: TREE.x, y: TREE.y, id: 'tree' },
    { sprite: broomSprite(), x: 70, y: 652 },
    { sprite: arecaPalm(0), x: 10, y: 300 },
    { sprite: arecaPalm(1), x: 312, y: 250 },
    { sprite: potPlant(2), x: 100, y: 540 },
    { sprite: potPlant(3), x: 300, y: 540 },
    { sprite: T.gateSprite(), x: GATE.x, y: GATE.y },
  ]
  const bellPts = RAILS.flatMap((x) => (rail.hooks.bells ?? []).map((h) => ({ x: x + h.x, y: RAIL_Y + h.y })))
  return {
    id: 'phuket_big_buddha',
    place: 'phuket_big_buddha',
    area: 'mountain',
    w: W,
    h: H,
    skyH: 140,
    ground: '#86c95f',
    camBias: 0.6,
    bake,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 150 },
      // The Big Buddha and pedestal, stairs open to the shrine door.
      { x: 48, y: 200, w: 224, h: 130 },
      { x: 48, y: 330, w: 96, h: 14 },
      { x: 176, y: 330, w: 96, h: 14 },
      { x: 6, y: 340, w: 70, h: 42 },
      { x: 264, y: 300, w: 34, h: 22 },
      { x: CX - 10, y: 384, w: 20, h: 9 },
      { x: 125, y: 384, w: 14, h: 7 },
      { x: 181, y: 384, w: 14, h: 7 },
      { x: 206, y: 374, w: 12, h: 7 },
      { x: 10, y: 440, w: 40, h: 13 },
      { x: 10, y: 498, w: 40, h: 13 },
      { x: 273, y: 408, w: 34, h: 13 },
      { x: BOOTH.x - 25, y: BOOTH.y - 14, w: 50, h: 15 },
      { x: 84, y: RAIL_Y - 12, w: W - 84, h: 14 },
      { x: 76, y: RAIL_Y, w: W - 76, h: H - RAIL_Y },
      { x: 0, y: RAIL_Y, w: 12, h: H - RAIL_Y },
      { x: TREE.x - 5, y: TREE.y - 6, w: 10, h: 7 },
      { x: 94, y: 534, w: 12, h: 7 },
      { x: 294, y: 534, w: 12, h: 7 },
      { x: 7, y: 296, w: 6, h: 5 },
      { x: 309, y: 246, w: 6, h: 5 },
      { x: 0, y: 150, w: 44, h: 150 },
      { x: 276, y: 150, w: 44, h: 150 },
    ],
    hotspots: [
      { id: 'pray', label: 'กราบพระใหญ่', hint: 'สวดมนต์ต่อหน้าพระพุทธมิ่งมงคล', icon: 'pray', rect: { x: 80, y: 150, w: 160, h: 170 }, at: { x: 150, y: 372 }, face: 'up', marker: hooks(buddha, BUDDHA, 'chest')[0], beacon: true, near: 12 },
      { id: 'door:phuket_big_buddha:hall', label: 'ห้องพระใต้ฐาน', hint: 'เข้าไปไหว้พระในห้องพระใต้องค์พระใหญ่', icon: 'door', rect: { x: 146, y: 310, w: 28, h: 30 }, at: { x: CX, y: 340 }, face: 'up', marker: { x: CX, y: 306 }, near: 8 },
      { id: 'incense', label: 'กระถางธูป', hint: 'จุดธูปขอพร', icon: 'incense', rect: { x: 146, y: 366, w: 28, h: 28 }, at: { x: 170, y: 406 }, face: 'up', marker: { x: CX, y: 364 } },
      { id: 'donation', label: 'ตู้ร่วมสร้างพระใหญ่', hint: 'ร่วมบุญสร้างฐานองค์พระ', icon: 'coin', rect: { x: 204, y: 354, w: 16, h: 28 }, at: { x: 212, y: 392 }, face: 'up', marker: { x: 212, y: 352 } },
      { id: 'bells', label: 'ระฆังรอบลาน', hint: 'ตีระฆังอธิษฐาน', icon: 'bell', rect: { x: 84, y: 534, w: 76, h: 32 }, at: { x: 122, y: 548 }, face: 'down', marker: { x: 122, y: 532 } },
      { id: 'view', label: 'จุดชมวิวอ่าวฉลอง', hint: 'นั่งสมาธิชมทะเลอันดามัน', icon: 'meditate', rect: { x: 160, y: 534, w: 76, h: 32 }, at: { x: 198, y: 548 }, face: 'down', marker: { x: 198, y: 532 } },
      { id: 'job:polish_brass', label: 'ขัดระฆังทองเหลือง', hint: 'อาสาขัดระฆังให้เงาวับ', icon: 'bell', rect: { x: 236, y: 534, w: 76, h: 32 }, at: { x: 274, y: 548 }, face: 'down', marker: { x: 274, y: 532 } },
      { id: 'shop:phuket_big_buddha_tile', label: 'ซุ้มเขียนแผ่นหินอ่อน', hint: 'ร่วมบุญแผ่นหินอ่อน เขียนคำอธิษฐาน', icon: 'edit', rect: { x: 250, y: 430, w: 52, h: 42 }, at: { x: 262, y: 484 }, face: 'up', marker: { x: BOOTH.x, y: 428 } },
      { id: 'job:sweep_leaves', label: 'กวาดใบไม้ทางขึ้น', hint: 'อาสากวาดใบไม้บนบันไดขึ้นเขา', icon: 'broom', rect: { x: 18, y: 640, w: 52, h: 30 }, at: { x: 44, y: 676 }, face: 'up', marker: { x: 44, y: 638 } },
      { id: 'gate', label: 'ลานจอดรถ · ลงเขา', hint: 'กลับบ้าน หรือไปที่อื่น', icon: 'map', rect: { x: 18, y: 720, w: 44, h: 52 }, at: { x: 40, y: 760 }, face: 'down', marker: { x: 40, y: 716 }, near: 12 },
    ],
    spawn: { x: 40, y: 740, face: 'up' },
    entries: { 'phuket_big_buddha:hall': { x: CX, y: 352, face: 'down' } },
    pickupSpots: [
      { x: 70, y: 420 },
      { x: 240, y: 420 },
      { x: 110, y: 470 },
      { x: 200, y: 480 },
      { x: 40, y: 600 },
      { x: 56, y: 700 },
      { x: 300, y: 380 },
    ],
    lights: [
      { x: CX, y: 260, r: 70, color: '#fff3d8' },
      { x: CX, y: 320, r: 20, color: '#ffe7a8' },
      { x: GOLDEN.x, y: 330, r: 26, color: '#ffcf7a' },
      { x: CX, y: 378, r: 10, color: '#ff9a5a' },
      { x: BOOTH.x, y: 450, r: 16, color: '#ffe7a8' },
      ...RAILS.map((x) => ({ x: x + 38, y: 548, r: 18 })),
      { x: GATE.x, y: 736, r: 22 },
    ],
    life(s) {
      return [
        new RackBells(s, bellPts, { x: 84, y: 534, w: W - 84, h: 32 }, RAIL_Y),
        new Monkeys(s, [
          { x: 110, y: 552, range: 30 },
          { x: 200, y: 554, range: 24 },
          { x: 208, y: 556, baby: true, range: 16 },
          { x: 290, y: 550, range: 18 },
          { x: 60, y: 610, range: 12 },
        ]),
        new Glints(s, [...hooks(buddha, BUDDHA, 'glints'), ...hooks(golden, GOLDEN, 'head')], 1),
        Flames.candles(s, 132, 390),
        Flames.candles(s, 188, 390),
        new Smoke(s, [{ x: CX, y: 378 }], 6),
        new Flags(s, [
          { x: 96, y: 300, kind: 'thai', sortY: 330 },
          { x: 224, y: 300, kind: 'dharma', sortY: 330 },
        ]),
        new Gags(s, gags()),
        new Motes(s, { x: 90, y: 160, w: 140, h: 140 }, 0.8),
        new CloudShadows(s, 2),
        new SunRays(s),
        new TapZones([
          shakeTree(s, 'tree', TREE.x, TREE.y - 10, 84, ['#9ed86a', '#ffb3cf']),
          {
            rect: { x: 110, y: 160, w: 100, h: 60 },
            fn: () => {
              s.particles.sparkles(CX, 200, 14, '#ffffff', 16)
              s.say(pick(['สาธุ~', 'พระใหญ่มองเห็นทั้งเกาะ', 'หินอ่อนพม่าขาวทั้งองค์']), CX, 150, 2.2)
              sfx.chime()
            },
          },
          {
            rect: { x: 80, y: 600, w: W - 80, h: H - 600 },
            fn: (x, y) => {
              s.particles.add({ kind: 'ripple', x, y, max: 1.2, size: 10, color: '#e8fbff' })
              sfx.plop()
            },
          },
        ]),
      ]
    },
    ambient(s, dt) {
      // Sea breeze carries a few blossoms and the gulls wheel.
      if (Math.random() < dt * 0.4) s.particles.add({ kind: 'petal', x: rand(0, W), y: rand(300, 360), vx: rand(4, 10), vy: rand(2, 6), max: 3, color: '#fffaf0', color2: '#ffc4d8' })
      if (Math.random() < dt * 0.25) s.burstBirds(rand(120, 300), rand(620, 700), 1)
    },
    wander: [
      { x: 70, y: 400, w: 180, h: 120 },
      { x: 20, y: 580, w: 44, h: 140 },
    ],
    pois: [
      { x: 130, y: 372, face: 'up' },
      { x: 156, y: 372, face: 'up' },
      { x: 180, y: 372, face: 'up' },
      { x: 198, y: 548, face: 'down' },
      { x: 122, y: 548, face: 'down' },
      { x: 60, y: 460, face: 'left' },
      { x: 262, y: 486, face: 'up' },
    ],
    fireflies: [{ x: 20, y: 580, w: 50, h: 160 }],
    birds: { x: 90, y: 420, w: 140, h: 40 },
    cats: [],
    vendors: [{ x: 290, y: 452 }],
    dogs: [],
    visitors: 6,
  }
}

// ---------------------------------------------------------------------------
// ห้องพระใต้ฐานพระใหญ่ (inside the pedestal): white marble, a golden Buddha,
// sea-view windows, walls of wishing tiles, a monk tying blessing threads.

const RW = 208
const RH = 404
const RCX = 104
const R_BUDDHA = { x: RCX, y: 160 }
const R_ALTAR = { x: RCX, y: 186 }
const R_CANDLES: [number, number][] = [
  [72, 190],
  [136, 190],
]
const R_SPEC: RoomSpec = {
  w: RW,
  h: RH,
  wallH: 84,
  side: 10,
  frontY: 344,
  frontH: 8,
  doorX: RCX,
  doorW: 28,
  windows: [30, 178],
  sideWindows: [140, 240],
  carpet: { x: 92, w: 24, y0: 200, y1: 344 },
  porch: true,
  seed: 31,
}
const R_STYLE: RoomStyle = { wall: '#ecebf0', mural: 'marble', floor: 'marble', floorTint: '#f6f5f8', carpet: '#e9a53a', cap: '#f6f5f8', void: '#22203a', view: 'sea' }

export function bigBuddhaHallMap(): MapDef {
  const buddha = principalBuddha({ s: 0.56, style: 'sukhothai', throne: 'marble', arch: true, parasols: true })
  const altar = altarSprite('teak')
  const candle = floorCandleSprite()
  const props: PlacedProp[] = [
    { sprite: buddha, x: R_BUDDHA.x, y: R_BUDDHA.y },
    { sprite: altar, x: R_ALTAR.x, y: R_ALTAR.y },
    ...R_CANDLES.map(([x, y]) => ({ sprite: candle, x, y })),
    { sprite: lotusVaseSprite(), x: 44, y: 170 },
    { sprite: lotusVaseSprite(), x: 164, y: 170 },
    { sprite: wishTiles(34), x: 30, y: 250 },
    { sprite: wishTiles(34), x: 30, y: 310 },
    { sprite: wishTiles(34), x: 178, y: 250 },
    { sprite: F.donationSprite(), x: 180, y: 300, shadow: [6, 2] },
    { sprite: mopBucketSprite(), x: 70, y: 300 },
  ]
  return {
    id: 'phuket_big_buddha:hall',
    place: 'phuket_big_buddha',
    area: 'mountain',
    indoor: true,
    indoorLight: 0.8,
    w: RW,
    h: RH,
    skyH: 0,
    ground: '#22203a',
    camBias: 0.56,
    entries: { phuket_big_buddha: { x: RCX, y: 366, face: 'up' } },
    bake(g, night) {
      bakeRoom(g, R_SPEC, R_STYLE, night)
      kneelMat(g, 70, 206, 18, 8, '#e9a53a')
      kneelMat(g, 120, 206, 18, 8, '#e9a53a')
      scatteredShoes(g, 140, 370, 7, 5)
      scatteredShoes(g, 70, 382, 5, 2)
      g.alpha(0.35)
      g.ellipse(84, 310, 13, 5, '#ffffff')
      g.alpha(1)
    },
    props,
    obstacles: [
      { x: 0, y: 0, w: RW, h: 92 },
      { x: 0, y: 0, w: 12, h: 352 },
      { x: 196, y: 0, w: 12, h: 352 },
      { x: 0, y: 342, w: 92, h: 10 },
      { x: 116, y: 342, w: 92, h: 10 },
      { x: 70, y: 92, w: 68, h: 70 },
      { x: 76, y: 170, w: 56, h: 18 },
      ...R_CANDLES.map(([x, y]) => ({ x: x - 3, y: y - 4, w: 7, h: 5 })),
      { x: 38, y: 164, w: 12, h: 7 },
      { x: 158, y: 164, w: 12, h: 7 },
      { x: 12, y: 242, w: 36, h: 9 },
      { x: 12, y: 302, w: 36, h: 9 },
      { x: 160, y: 242, w: 36, h: 9 },
      { x: 174, y: 294, w: 12, h: 7 },
      { x: 60, y: 294, w: 20, h: 7 },
      { x: 0, y: 352, w: 10, h: 52 },
      { x: 198, y: 352, w: 10, h: 52 },
    ],
    hotspots: [
      { id: 'pray', label: 'กราบพระประธาน', hint: 'สวดมนต์ในห้องพระใต้พระใหญ่', icon: 'pray', rect: { x: 72, y: 60, w: 64, h: 100 }, at: { x: RCX, y: 214 }, face: 'up', marker: hooks(buddha, R_BUDDHA, 'chest')[0], beacon: true, near: 14 },
      { id: 'job:light_candles', label: 'จุดเทียนบูชา', hint: 'อาสาจุดเทียนหน้าพระ', icon: 'incense', rect: { x: 128, y: 152, w: 16, h: 40 }, at: { x: 144, y: 202 }, face: 'up', marker: { x: 136, y: 150 } },
      { id: 'job:mop_floor', label: 'ถูพื้นหินอ่อน', hint: 'อาสาถูพื้นหินอ่อนขาว', icon: 'broom', rect: { x: 58, y: 276, w: 24, h: 26 }, at: { x: 90, y: 310 }, face: 'left', marker: { x: 70, y: 274 } },
      { id: 'donation', label: 'ตู้ทำบุญ', hint: 'ร่วมบุญสร้างพระใหญ่', icon: 'coin', rect: { x: 172, y: 274, w: 16, h: 28 }, at: { x: 180, y: 310 }, face: 'up', marker: { x: 180, y: 272 } },
      { id: 'door:phuket_big_buddha', label: 'ออกสู่ลานพระใหญ่', hint: 'กลับลานหินอ่อน', icon: 'door', rect: { x: 84, y: 382, w: 40, h: 22 }, at: { x: RCX, y: 398 }, face: 'down', marker: { x: RCX, y: 380 }, near: 10 },
    ],
    spawn: { x: RCX, y: 366, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: RCX, y: 110, r: 46, color: '#ffe7a0' },
      ...R_CANDLES.map(([x, y]) => ({ x, y: y - 34, r: 14, color: '#ffb35a' })),
      ...hooks(altar, R_ALTAR, 'flames').map((p) => ({ x: p.x, y: p.y, r: 10, color: '#ffb35a' })),
      { x: 30, y: 40, r: 18, color: '#e8f8ff' },
      { x: 178, y: 40, r: 18, color: '#e8f8ff' },
      { x: RCX, y: 350, r: 28, color: '#fff6d8' },
    ],
    life(s) {
      return [
        ...hooks(altar, R_ALTAR, 'flames').map((p) => new Flames(s, [p], R_ALTAR.y)),
        ...R_CANDLES.map(([x, y]) => new Flames(s, hooks(candle, { x, y }, 'flame'), y)),
        new Smoke(s, hooks(altar, R_ALTAR, 'smoke'), 4),
        new Glints(s, [...hooks(buddha, R_BUDDHA, 'glints'), ...hooks(buddha, R_BUDDHA, 'head')], 1.2),
        new LightShafts(s, [
          { x0: 12, y0: 146, x1: 50, y1: 184, w0: 8, w1: 20 },
          { x0: 12, y0: 246, x1: 50, y1: 284, w0: 8, w1: 20 },
          { x0: 196, y0: 146, x1: 158, y1: 184, w0: 8, w1: 20 },
          { x0: 196, y0: 246, x1: 158, y1: 284, w0: 8, w1: 20 },
          { x0: RCX, y0: 350, x1: RCX, y1: 290, w0: 28, w1: 42 },
        ]),
        new Motes(s, { x: 72, y: 60, w: 64, h: 100 }, 1.2),
        new Gags(s, [
          blessingMonkGag(150, 250, ['ผูกสายสิญจน์ให้นะโยม', 'ขอให้เดินทางปลอดภัย', 'เจริญพร อายุ วรรณะ สุขะ พละ'], 2),
          personGag(look({ gender: 'm', hair: 'hair_short', hairColor: 3, top: 'top_tee_white', bottom: 'bot_sarong' }), 126, 280, ['ได้สายสิญจน์มาแล้ว!', 'Thank you, Luang Pi!', 'เขียนแผ่นหินอ่อนแล้วด้วย'], { view: 'back' }),
        ]),
        new TapZones([
          {
            rect: { x: 76, y: 64, w: 56, h: 60 },
            fn: () => {
              s.particles.sparkles(RCX, 100, 12, '#fff3a6', 12)
              sfx.chime()
            },
          },
        ]),
      ]
    },
    wander: [
      { x: 60, y: 230, w: 90, h: 100 },
      { x: 30, y: 360, w: 150, h: 30 },
    ],
    pois: [
      { x: 94, y: 216, face: 'up' },
      { x: 114, y: 216, face: 'up' },
      { x: 60, y: 262, face: 'left' },
      { x: 170, y: 262, face: 'right' },
    ],
    cats: [],
    dogs: [],
    visitors: 2,
  }
}

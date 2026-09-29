// ร้าน 7-บุญ — the convenience store across from the temple gate. Walk in
// ("ติ๊งต่อง~"), browse the glowing drink fridges and snack aisles, peek at
// the steamed buns, then buy cooking ingredients and ready-made alms food at
// the counter (hotspot `shop:mart`). `door:wat` leads back to the street.

import type { MapDef, PlacedProp } from '../world'
import type { AvatarLook } from '../../art/avatar'
import type { Surface } from '../../engine/pixel'
import { rand } from '../../engine/rng'
import { sfx } from '../../engine/audio'
import * as K from '../../art/mart'
import { randomVisitorLook, type WorldScene } from '../world'
import { drawPerson, Gags, type Gag, type GagPose } from '../gags'
import type { Life } from '../life'

const W = 208
const H = 276
const WALL_H = 50
const FRONT_Y = 262
const DOOR = { x: 88, w: 32 }
const DOOR_X = DOOR.x + DOOR.w / 2

const COUNTER = { x: 124, y: 164 }
const CLERK = { x: 159, y: 141 }
const G1 = { x: 16, y: 108 }
const G2 = { x: 16, y: 156 }
const FREEZER = { x: 170, y: 222 }

const LIGHTS: [number, number][] = [
  [44, 84],
  [104, 84],
  [164, 84],
  [44, 170],
  [104, 176],
  [164, 200],
]

function look(o: Partial<AvatarLook>): AvatarLook {
  return { ...randomVisitorLook(), head: null, neck: null, hand: null, ...o }
}

/** The clerk wears the striped 7-บุญ shirt and a little cap. */
function drawClerk(g: Surface, lk: AvatarLook, p: GagPose) {
  drawPerson(g, lk, p, 'front')
  const x = p.x
  const y = p.y
  g.rect(x - 4, y - 14, 9, 6, '#fffaf0')
  g.rect(x - 4, y - 12, 9, 1, '#f58f35')
  g.rect(x - 4, y - 11, 9, 1, '#3fa06e')
  g.rect(x - 4, y - 10, 9, 1, '#e8514a')
  g.px(x + 2, y - 13, '#3fa06e')
  // Cap.
  g.rect(x - 4, y - 27, 9, 3, '#3fa06e')
  g.rect(x - 1, y - 25, 7, 1, '#2f7a52')
  g.px(x, y - 27, '#fff3a6')
}

function mist(s: WorldScene, x: number, y: number, n = 6) {
  for (let i = 0; i < n; i++) s.particles.add({ kind: 'smoke', x: x + rand(-10, 10), y: y + rand(-4, 4), vx: rand(-6, 6), vy: rand(-8, 2), max: rand(0.6, 1.1), color: '#e8f8ff', size: 2, drag: 1.2 })
}

function steamPuff(s: WorldScene, x: number, y: number, n = 5) {
  for (let i = 0; i < n; i++) s.particles.add({ kind: 'smoke', x: x + rand(-5, 5), y, vx: rand(-3, 3), vy: rand(-18, -10), max: rand(0.8, 1.3), color: '#ffffff', size: 2, drag: 0.5 })
}

function martGags(): Gag[] {
  const clerk = look({ gender: 'f', hair: 'hair_short', hairColor: 0, top: 'top_white' })
  const shopperA = look({ gender: 'm' })
  const shopperB = look({ gender: 'f' })
  const kid = look({ gender: 'm', hair: 'hair_short' })
  const none = () => undefined
  return [
    {
      x: CLERK.x,
      y: CLERK.y,
      w: 18,
      h: 30,
      lines: [
        'ติ๊งต่อง~ สวัสดีค่า ยินดีต้อนรับค่ะ',
        'วัตถุดิบทำอาหารมาใหม่ทุกเช้าเลยค่ะ',
        'รับซาลาเปาเพิ่มไหมคะ?',
        'สะสมแสตมป์บุญไหมคะ?',
        'โตสต์แฮมชีส อุ่นให้ไหมคะ?',
        'ชุดตักบาตรพร้อมถวายอยู่ชั้นหลังนะคะ',
      ],
      draw: (g, p) => drawClerk(g, clerk, p),
      react: () => sfx.chime(),
    },
    {
      x: 30,
      y: 124,
      walk: { x0: 24, x1: 100, speed: 9 },
      h: 30,
      lines: ['ขนมถุงนี้อร่อยมาก!', 'มาม่าหมดอีกแล้ว…', 'ซื้อน้ำไปถวายพระดีกว่า', 'โปรหนึ่งแถมหนึ่ง!'],
      draw: (g, p) => drawPerson(g, shopperA, p, 'front'),
    },
    {
      x: 58,
      y: 72,
      h: 30,
      lines: ['เย็นชื่นใจ~', 'ชาเขียวหรือน้ำแดงดีนะ…', 'ขวดสุดท้ายแล้ว!'],
      draw: (g, p) => drawPerson(g, shopperB, p, 'back'),
      react: (sc, x, y) => mist(sc, x, y - 26),
    },
    {
      x: 40,
      y: 216,
      walk: { x0: 20, x1: 116, speed: 12 },
      h: 26,
      lines: ['แม่ครับ ขอไอติมหน่อย!', 'หนูจะเอาขนมถุงนี้~', 'ซาลาเปาครีม!'],
      draw: (g, p) => drawPerson(g, kid, p, 'front', ['drink']),
    },
    // Scenery that talks back when tapped.
    { x: 66, y: 58, w: 118, h: 44, lines: ['เย็นเจี๊ยบ!', 'ฟู่ว… ไอเย็นออกมาเลย', 'เครื่องดื่มเย็น ๆ เต็มตู้'], draw: none, react: (sc, x, y) => (mist(sc, x, y - 16, 10), sfx.whoosh()) },
    { x: 146, y: 58, w: 32, h: 42, lines: ['กาแฟเย็นหวานน้อยค่ะ', 'หอมกาแฟคั่วใหม่~', 'บุญ café เปิดแล้ว!'], draw: none, react: (sc, x, y) => (steamPuff(sc, x - 5, y - 26), sfx.pour(0.4)) },
    { x: 182, y: 58, w: 20, h: 38, lines: ['ติ๊ด ๆ ถอนเงินไปทำบุญ', 'ยอดคงเหลือ: บุญเต็มกระเป๋า', 'กรุณารับบัตรคืนค่ะ'], draw: none, react: (sc, x, y) => (sc.particles.sparkles(x, y - 26, 6, '#9fd0ff', 6), sfx.click()) },
    { x: 137, y: 140, w: 26, h: 24, lines: ['ซาลาเปาหมูสับร้อน ๆ', 'ซาลาเปาครีม หอมนุ่ม~', 'ไส้หมูแดง อร่อยนะคะ'], draw: none, react: (sc, x, y) => (steamPuff(sc, x, y - 24, 8), sfx.plop()) },
    { x: FREEZER.x, y: FREEZER.y, w: 38, h: 26, lines: ['ไอติมกะทิสด! หนาวฟัน~', 'รสชาไทยหมดแล้วเหรอ…', 'แท่งละ 10 บาทเอง'], draw: none, react: (sc, x, y) => (mist(sc, x, y - 16, 8), sfx.whoosh()) },
    { x: 32, y: 256, w: 40, h: 26, lines: ['ดวงประจำสัปดาห์: ทำบุญแล้วรวย!', 'ปกนี้ดาราคนโปรดเลย!', 'การ์ตูนเล่มใหม่ออกแล้ว'], draw: none, react: () => sfx.tap() },
    { x: 132, y: 204, w: 12, h: 16, lines: ['ระวังพื้นลื่นนะ!', 'เพิ่งถูพื้นเสร็จจ้า'], draw: none, react: () => sfx.tap() },
    { x: 56, y: 200, w: 34, h: 30, lines: ['โปร 1 แถม 1 วันนี้เท่านั้น!', 'ขนมรสใหม่: ต้มยำกุ้ง!', 'ซื้อครบ 50 รับแสตมป์บุญ'], draw: none, react: () => sfx.coin() },
  ]
}

/** ติ๊งต่อง~ chime and a greeting when you walk in. */
class Greeter implements Life {
  private t = 0
  private done = false
  constructor(private s: WorldScene) {}
  update(dt: number) {
    if (this.done) return
    this.t += dt
    if (this.t > 0.35) {
      this.done = true
      sfx.chime()
      setTimeout(() => sfx.chime(), 260)
      this.s.say('ติ๊งต่อง~ สวัสดีค่า!', CLERK.x, CLERK.y - 32, 3)
    }
  }
}

function bakeGround(g: Surface) {
  K.bakeMart(g, { w: W, h: H, wallH: WALL_H, frontY: FRONT_Y, door: DOOR })
  // Queue footprints in front of the till and a yellow line.
  K.footprints(g, CLERK.x, 184)
  K.footprints(g, CLERK.x, 196)
  g.hline(128, 198, 170, '#ffd23f')
}

export function martMap(): MapDef {
  const props: PlacedProp[] = [
    { sprite: K.fridgeWallSprite(), x: 6, y: 58 },
    { sprite: K.coffeeBarSprite(), x: 146, y: 58 },
    { sprite: K.atmSprite(), x: 182, y: 58 },
    { sprite: K.gondolaSprite(1), x: G1.x, y: G1.y },
    { sprite: K.gondolaSprite(2), x: G2.x, y: G2.y },
    { sprite: K.almsShelfSprite(), x: COUNTER.x, y: 124 },
    { sprite: K.counterSprite(), x: COUNTER.x, y: COUNTER.y },
    { sprite: K.iceFreezerSprite(), x: FREEZER.x, y: FREEZER.y, shadow: [18, 2] },
    { sprite: K.magazineRackSprite(), x: 12, y: 256 },
    { sprite: K.wetSignSprite(), x: 132, y: 204, shadow: [5, 1.5] },
    { sprite: K.plantSprite(), x: 80, y: 258 },
    { sprite: K.binSprite(), x: 128, y: 258 },
    { sprite: K.basketsSprite(), x: 144, y: 258 },
    { sprite: K.promoIslandSprite(), x: 56, y: 200, shadow: [16, 2] },
  ]
  return {
    id: 'mart',
    area: 'wat',
    indoor: true,
    indoorLight: 0.35,
    w: W,
    h: H,
    skyH: 0,
    ground: '#2b2340',
    camBias: 0.55,
    bake: (g) => bakeGround(g),
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 60 },
      { x: 0, y: 0, w: 6, h: H },
      { x: W - 6, y: 0, w: 6, h: H },
      { x: 16, y: 96, w: 88, h: 13 },
      { x: 16, y: 144, w: 88, h: 13 },
      { x: 122, y: 92, w: 86, h: 73 },
      { x: 151, y: 212, w: 38, h: 11 },
      { x: 10, y: 246, w: 42, h: 11 },
      { x: 128, y: 201, w: 8, h: 4 },
      { x: 75, y: 254, w: 10, h: 5 },
      { x: 124, y: 254, w: 9, h: 5 },
      { x: 137, y: 253, w: 14, h: 5 },
      { x: 40, y: 192, w: 34, h: 9 },
      { x: 0, y: FRONT_Y, w: W, h: H - FRONT_Y },
    ],
    hotspots: [
      {
        id: 'shop:mart',
        label: 'เคาน์เตอร์ 7-บุญ',
        hint: 'ซื้อวัตถุดิบทำอาหารและของใส่บาตร',
        icon: 'shop',
        rect: { x: 124, y: 100, w: 78, h: 66 },
        at: { x: CLERK.x, y: 178 },
        face: 'up',
        marker: { x: CLERK.x, y: 114 },
      },
      {
        id: 'door:wat',
        label: 'ประตูร้าน',
        hint: 'กลับไปหน้าวัด',
        icon: 'door',
        rect: { x: DOOR.x, y: 244, w: DOOR.w, h: 32 },
        at: { x: DOOR_X, y: 257 },
        face: 'down',
        marker: { x: DOOR_X, y: 240 },
        near: 10,
      },
    ],
    entries: { wat: { x: DOOR_X, y: 246, face: 'up' } },
    spawn: { x: DOOR_X, y: 246, face: 'up' },
    lights: [
      ...LIGHTS.map(([x, y]) => ({ x, y, r: 28, color: '#f4fbff' })),
      ...[20, 49, 78, 107].map((x) => ({ x, y: 36, r: 16, color: '#bfe8ff' })),
      { x: 137, y: 128, r: 12, color: '#ffcf7a' },
      { x: FREEZER.x, y: 204, r: 12, color: '#bfe8ff' },
      { x: 182, y: 34, r: 8, color: '#9fd0ff' },
    ],
    pickupSpots: [],
    life(s) {
      return [new Gags(s, martGags()), new Greeter(s)]
    },
    overlay(g, t) {
      // Steam curling from the bun steamer and the coffee cups.
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.7 + i / 3) % 1
        g.alpha(0.7 * (1 - ph))
        g.px(Math.round(131 + i * 6 + Math.sin(ph * 8 + i) * 1.5), Math.round(117 - ph * 12), '#ffffff')
        g.alpha(1)
      }
      const ph = (t * 0.5) % 1
      g.alpha(0.6 * (1 - ph))
      g.px(Math.round(141 + Math.sin(ph * 9) * 1.2), Math.round(34 - ph * 8), '#ffffff')
      g.alpha(1)
      // Blinking LEDs: coffee machine and till.
      if (Math.floor(t * 2) % 2) g.px(140, 24, '#6fcf8f')
    },
    wander: [
      { x: 12, y: 64, w: 104, h: 26 },
      { x: 12, y: 112, w: 96, h: 26 },
      { x: 12, y: 162, w: 104, h: 40 },
    ],
    // Off-map: no fireflies indoors at night.
    fireflies: [{ x: 0, y: -60, w: 1, h: 1 }],
    pois: [
      { x: 40, y: 70, face: 'up' },
      { x: 90, y: 70, face: 'up' },
      { x: 60, y: 118, face: 'up' },
      { x: 60, y: 166, face: 'up' },
    ],
    cats: [{ x: 66, y: 240, pose: 'sleep', color: '#f5a55a' }],
    dogs: [],
    visitors: 0,
    novices: 0,
  }
}

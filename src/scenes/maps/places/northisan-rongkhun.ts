// วัดร่องขุ่น (the White Temple), Chiang Rai.
//   wat_rong_khun         – entrance, art gallery and shop, the tree of hanging
//                           heads, wishing plates, the golden building, the pit
//                           of reaching hands, the bridge of rebirth, the Gate
//                           of Heaven and the dazzling white ubosot on its moat.
//   wat_rong_khun:ubosot  – white interior with the (cute) surreal mural.

import type { MapDef, PlacedProp } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as G from '../../../art/garden'
import * as F from '../../../art/templeprops'
import { road } from '../common'
import { drawPerson, drawSpriteGag, gagFx, Gags, type Gag } from '../../gags'
import { Butterflies, CloudShadows, Glints, KoiPond, SunRays, TapZones, Flames, Smoke, type Life } from '../../life'
import { monkSprite } from '../../../art/characters'
import { drawShadow } from '../../../art/props'
import type { WorldScene } from '../../world'
import { altarSprite, buddhaProp, pillarSprite, bakeRoom, roomGeo, carpet, hooksAt, offeringTable, donationBox, lotusVase, hsh, bld, type RoomOpts } from '../../../art/places/northisan'
import {
  WHT,
  whiteUbosotSprite,
  heavenGateSprite,
  guardianSprite,
  handsPit,
  drawHand,
  headsTreeSprite,
  drawHead,
  wishPlatesSprite,
  goldenBuildingSprite,
  wishingWellSprite,
  pinnacleSprite,
  artGallerySprite,
  artShopSprite,
  waxMonkSprite,
  surrealMural,
} from '../../../art/places/northisan-rongkhun'
import { drawCostumed, hs, look } from './northisan-common'

const W = 320
const H = 1000
const CX = 160
const UB = { x: CX, y: 336 }
const ISLAND = { y0: 296, y1: 348 }
const MOAT = { y0: 348, y1: 436 }
const PIT = { cx: CX, cy: 482, rx: 104, ry: 38 }
const BR = { x0: 150, x1: 170, top: ISLAND.y1, bot: 528 }
const PLAZA = { y0: 528, y1: 610 }
const GATEH = { x: CX, y: 444 }
const TREE = { x: 70, y: 716 }
const WELL = { x: 44, y: 800 }
const GOLDB = { x: 262, y: 812 }
const PLATES = [
  { x: 256, y: 664 },
  { x: 256, y: 716 },
]
const GALLERY = { x: 70, y: 902 }
const SHOP = { x: 252, y: 900 }
const ENTRY_Y = 950
const MOAT_BLOBS: [number, number, number, number][] = [
  [86, 392, 58, 38],
  [234, 392, 58, 38],
]

function bakeRK(g: Surface, night: boolean) {
  // Sky backdrop: distant hills and trees.
  const far = night ? '#4c5aa0' : '#b4cce8'
  for (let x = -20; x < W + 40; x += 46) g.poly([[x - 40, 132], [x + 8, 86 + ((x * 3) % 16)], [x + 56, 132]], far)
  G.treeLine(g, 126, W, G.LEAVES.far, 4)
  G.treeLine(g, 146, W, G.LEAVES.deep, 8)
  G.lawn(g, 0, 160, W, H - 160, 21)
  // Moat round the island (behind and in front).
  g.rect(24, 220, W - 48, MOAT.y1 - 220, '#9fc8f0')
  g.rect(26, 222, W - 52, MOAT.y1 - 224, night ? '#2e4a86' : '#6aa8e0')
  for (let y = 224; y < MOAT.y1 - 2; y++) for (let x = 28; x < W - 28; x++) {
    const v = hsh(x, y, 4)
    if (v < 12) g.px(x, y, night ? '#5a78c0' : '#b8dcff')
    else if (v > 990) g.px(x, y, '#ffffff')
  }
  // Reflection of the white temple in the moat.
  g.ctx.save()
  g.ctx.globalAlpha = 0.35
  for (let y = MOAT.y0 + 2; y < MOAT.y1 - 4; y += 2) {
    const k = (y - MOAT.y0) / (MOAT.y1 - MOAT.y0)
    const half = 96 * (1 - k * 0.7)
    g.hline(Math.round(CX - half + Math.sin(y) * 2), Math.round(CX + half), y, '#ffffff')
  }
  g.ctx.restore()
  // White island platform with mirror mosaic.
  g.rect(24, ISLAND.y0, W - 48, ISLAND.y1 - ISLAND.y0, WHT.b)
  g.hline(24, W - 25, ISLAND.y1 - 1, WHT.D)
  g.hline(24, W - 25, ISLAND.y1, WHT.DD)
  for (let x = 26; x < W - 26; x += 3) g.px(x, ISLAND.y1 - 3, (x % 9) ? WHT.M2 : WHT.M)
  // Side paths (the way out after the ubosot).
  for (const x of [4, W - 24]) {
    g.rect(x, ISLAND.y0, 20, PLAZA.y1 - ISLAND.y0, '#f4f8ff')
    for (let y = ISLAND.y0; y < PLAZA.y1; y += 8) g.hline(x, x + 19, y, '#dfe8f8')
    g.vline(x, ISLAND.y0, PLAZA.y1, WHT.D)
    g.vline(x + 19, ISLAND.y0, PLAZA.y1, WHT.D)
  }
  // Pit of reaching hands below the moat.
  handsPit(g, PIT.cx, PIT.cy, PIT.rx, PIT.ry, 16, 3)
  // White wall between the moat and the pit.
  g.rect(24, MOAT.y1, W - 48, 6, WHT.b)
  g.hline(24, W - 25, MOAT.y1, WHT.L)
  g.hline(24, W - 25, MOAT.y1 + 5, WHT.D)
  // Bridge of rebirth.
  g.rect(BR.x0 - 4, BR.top, BR.x1 - BR.x0 + 8, BR.bot - BR.top, WHT.D)
  g.rect(BR.x0 - 2, BR.top, BR.x1 - BR.x0 + 4, BR.bot - BR.top, WHT.b)
  for (let y = BR.top; y < BR.bot; y += 6) g.hline(BR.x0 - 2, BR.x1 + 1, y, WHT.d)
  for (const x of [BR.x0 - 4, BR.x1 + 2]) {
    g.rect(x, BR.top, 2, BR.bot - BR.top, WHT.L)
    for (let y = BR.top + 2; y < BR.bot; y += 5) g.px(x, y, WHT.M)
  }
  // Plaza before the bridge.
  g.rect(24, PLAZA.y0, W - 48, PLAZA.y1 - PLAZA.y0, '#f4f8ff')
  for (let j = PLAZA.y0; j < PLAZA.y1; j += 8) for (let i = 24; i < W - 24; i += 8) g.frame(i, j, 8, 8, '#e4ecf8')
  g.hline(24, W - 25, PLAZA.y0, WHT.D)
  // Main path from the entrance.
  for (let y = PLAZA.y1; y < ENTRY_Y + 10; y += 8) {
    g.rect(CX - 16, y, 32, 8, '#f4f8ff')
    g.hline(CX - 16, CX + 15, y, '#e0e8f4')
    g.vline(CX, y, y + 7, '#e0e8f4')
  }
  g.vline(CX - 17, PLAZA.y1, ENTRY_Y + 10, WHT.D)
  g.vline(CX + 16, PLAZA.y1, ENTRY_Y + 10, WHT.D)
  // Side paths to the attractions.
  G.paving(g, 24, 740, CX - 40, 14, 7)
  G.paving(g, CX + 16, 740, W - CX - 40, 14, 7)
  G.paving(g, 24, 860, CX - 40, 14, 7)
  G.paving(g, CX + 16, 860, W - CX - 40, 14, 7)
  G.groundShadow(g, TREE.x, TREE.y - 2, 40, 9, 0.6)
  G.leafLitter(g, TREE.x - 40, TREE.y - 20, 80, 30, 60, 5)
  G.flowerBed(g, CX - 44, 630, 24, 60, ['#fffaf0', '#ffffff', '#b8dcff'], 1)
  G.flowerBed(g, CX + 20, 630, 24, 60, ['#fffaf0', '#ffffff', '#b8dcff'], 2)
  G.flowerBed(g, CX - 44, 780, 24, 60, ['#fffaf0', '#ff9fc0', '#ffffff'], 3)
  G.flowerBed(g, CX + 20, 780, 24, 60, ['#fffaf0', '#ff9fc0', '#ffffff'], 4)
  // Entrance road and parking.
  road(g, 0, ENTRY_Y + 12, W, H - ENTRY_Y - 12)
}

/** Hands in the pit that wave when tapped. */
class WavingHands implements Life {
  private hands: { x: number; y: number; i: number; ph: number }[] = []
  private wave = 0
  constructor(private s: WorldScene) {
    for (let i = 0; i < 22; i++) {
      const a = rand(0, Math.PI * 2)
      const d = Math.sqrt(rand(0.15, 0.95))
      const x = PIT.cx + Math.cos(a) * PIT.rx * d * 0.9
      if (Math.abs(x - PIT.cx) < 20) continue
      this.hands.push({ x: Math.round(x), y: Math.round(PIT.cy + Math.sin(a) * PIT.ry * d * 0.8), i: i * 7 + 3, ph: rand(0, 6) })
    }
    this.hands.sort((a, b) => a.y - b.y)
  }
  update(dt: number) {
    this.wave = Math.max(0, this.wave - dt)
  }
  ground(g: Surface, t: number) {
    if (!this.s.onScreen(PIT.cx, PIT.cy, PIT.rx + 20)) return
    for (const h of this.hands) {
      const w = this.wave > 0 ? Math.round(Math.sin(t * 14 + h.ph) * 2) : Math.round(Math.sin(t * 1.5 + h.ph) * 0.7)
      drawHand(g, h.x, h.y, h.i, w)
    }
  }
  tap(x: number, y: number): boolean {
    const dx = (x - PIT.cx) / PIT.rx
    const dy = (y - PIT.cy) / PIT.ry
    if (dx * dx + dy * dy > 1 || Math.abs(x - PIT.cx) < 14) return false
    this.wave = 2
    this.s.say(['มือแห่งกิเลส… แต่ก็โบกมือทักทายนะ!', 'สวัสดีค่า~ (โบก ๆ)', 'ข้ามสะพานไป อย่าหันกลับมานะ', 'อยากได้ อยากมี… ปล่อยวางบ้างนะ'][Math.floor(Math.random() * 4)], x, y - 16)
    sfx.whoosh()
    return true
  }
}

/** The pop-culture heads swinging on ropes under the tree. */
class SwingingHeads implements Life {
  private heads: { x: number; y: number; len: number; a: number; v: number; kind: number }[] = []
  private line = 0
  constructor(private s: WorldScene, ropes: { x: number; y: number }[]) {
    ropes.forEach((r, i) => this.heads.push({ x: r.x, y: r.y, len: 10 + (i % 3) * 5, a: rand(-0.2, 0.2), v: 0, kind: i }))
  }
  update(dt: number, t: number) {
    for (const h of this.heads) {
      h.v += (-h.a * 9 - h.v * 0.8 + Math.sin(t * 0.9 + h.x) * 0.3 * (0.5 + Math.abs(this.s.wind()))) * dt
      h.a += h.v * dt
    }
  }
  sorted(add: (y: number, draw: () => void) => void) {
    add(TREE.y + 0.5, () => {
      const g = this.s.gfx
      for (const h of this.heads) {
        const ex = h.x + Math.sin(h.a) * h.len
        const ey = h.y + Math.cos(h.a) * h.len
        g.line(h.x, h.y, ex, ey, '#c8b89a')
        drawHead(g, h.kind, ex, ey + 5)
      }
    })
  }
  tap(x: number, y: number): boolean {
    for (const h of this.heads) {
      const ex = h.x + Math.sin(h.a) * h.len
      const ey = h.y + Math.cos(h.a) * h.len + 5
      if (Math.abs(x - ex) < 7 && Math.abs(y - ey) < 8) {
        h.v += (x < ex ? 1 : -1) * 3
        const lines = [
          ['เอเลี่ยนก็มาทำบุญ~', 'บี๊บ บู๊บ สาธุ!'],
          ['ฮีโร่ก็ต้องทำบุญนะ', 'พลังแห่งความดี!'],
          ['หุ่นยนต์โหมดสงบ… ติ๊ด', 'กำลังชาร์จบุญ 99%'],
          ['นักล่าอวกาศ… ขอพักร้อน', 'แกร่ก ๆ (หัวเราะเขิน)'],
          ['แพนด้าห้อยหัวเล่น~', 'ง่วงจัง'],
          ['ยักษ์ใจดีนะ ไม่ดุหรอก', 'ฮ่า ๆ ๆ'],
        ][h.kind % 6]
        this.s.say(lines[this.line++ % lines.length], ex, ey - 10)
        sfx.tap()
        return true
      }
    }
    return false
  }
}

function rkGags(): Gag[] {
  const guide = look({ gender: 'f', hair: 'hair_ponytail', hairColor: 0, top: 'top_polo', bottom: 'bot_khaki', head: 'head_cap' })
  const selfie = look({ gender: 'm', hair: 'hair_short', hairColor: 3, top: 'top_tee_white', bottom: 'bot_denim_shorts' })
  const artist = look({ gender: 'm', hair: 'hair_curly', hairColor: 1, top: 'top_denim', bottom: 'bot_jeans', head: 'head_glasses' })
  const kid = look({ gender: 'm', hair: 'hair_buzz', top: 'top_tee_lotus', bottom: 'bot_denim_shorts' })
  const cleaner = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_vendor', bottom: 'bot_sarong' })
  const seller = look({ gender: 'f', hair: 'hair_bob', hairColor: 0, top: 'top_tee_white', bottom: 'bot_black' })
  return [
    {
      x: CX + 26, y: 566, lines: ['วัดนี้อาจารย์เฉลิมชัยออกแบบเองทั้งหมดเลยค่ะ', 'สีขาวคือความบริสุทธิ์ของพระพุทธคุณ', 'กระจกคือปัญญาที่ส่องสว่างไปทั่ว', 'ข้ามสะพานแล้วห้ามเดินย้อนกลับนะคะ!'],
      draw: (g, p) => {
        drawPerson(g, guide, p, 'front')
        g.vline(p.x + 6, p.y - 34, p.y - 14, '#8a8480')
        g.rect(p.x + 7, p.y - 34, 6, 4, '#e8514a')
      },
    },
    {
      x: CX - 30, y: 580, lines: ['ยิ้ม~ ถ่ายกับวัดขาว!', 'ขาวจนแสบตาเลย!', 'แสงเช้าสะท้อนกระจกสวยมาก'],
      draw: (g, p) => drawPerson(g, selfie, p, 'back', ['selfie']),
      react: (s, x, y) => gagFx.flash(s, x, y),
    },
    {
      x: 120, y: 650, lines: ['วาดวัดขาว… สีขาวหมดเลยนะ', 'ใช้สีขาวไปสามหลอดแล้ว', 'ขอแรงบันดาลใจหน่อย~'],
      draw: (g, p) => {
        drawPerson(g, artist, p, 'front', [], 'sit')
        g.rect(p.x + 5, p.y - 16, 8, 10, '#fffaf0')
        g.frame(p.x + 5, p.y - 16, 8, 10, '#8a6040')
        g.px(p.x + 8, p.y - 12, '#9fd0ff')
      },
    },
    {
      x: 104, y: 742, lines: ['แม่! หัวเอเลี่ยนห้อยอยู่บนต้นไม้!', 'อันนั้นหุ่นยนต์ใช่ไหม?', 'ผมชอบหัวแพนด้า!'],
      draw: (g, p) => drawPerson(g, kid, p, 'back'),
    },
    {
      x: GOLDB.x - 30, y: GOLDB.y + 8, lines: ['ห้องน้ำทองคำ เชิญค่ะ~', 'สะอาดจนส่องหน้าได้เลยค่ะ', 'ทองแปลว่าจิตใจที่ยึดติดกับเงินทองนะคะ'],
      draw: (g, p) => {
        drawCostumed(g, cleaner, p, 'apron')
        g.vline(p.x + 6, p.y - 16, p.y, '#9a6a45')
        g.rect(p.x + 4, p.y - 2, 5, 2, '#9fd0ff')
      },
    },
    { x: SHOP.x, y: SHOP.y - 7, z: -1, lines: ['โปสการ์ดวัดขาว ใบละ 20 ค่ะ', 'เสื้อยืดลายวัดขาวค่ะ', 'ภาพพิมพ์ผลงานอาจารย์ค่ะ'], draw: (g, p) => drawPerson(g, seller, p) },
    {
      x: 14, y: 520, lines: ['ทางนี้ทางออกนะโยม', 'เดินไปข้างหน้า อย่าย้อนกลับ', 'เจริญพร'],
      draw: (g, p) => {
        const sp = monkSprite('front', p.react > 0 ? 'bless' : 'stand', { skin: 1 })
        drawShadow(g, p.x, p.y, 6, 2)
        g.draw(sp.canvas, Math.round(p.x - sp.w / 2), Math.round(p.y - sp.h + 1))
      },
    },
    {
      x: CX + 36, y: 548, w: 22, h: 24, lines: ['⚠ ห้ามเดินย้อนกลับ', 'เส้นทางวัฏสงสาร เดินหน้าอย่างเดียว!', 'One way to heaven →'],
      draw: (g, p) => drawSpriteGag(g, bld('rk:sign', 20, 22, 10, 21, (gg) => {
        gg.rect(9, 8, 2, 14, '#8a8480')
        gg.rect(1, 1, 18, 9, '#fffaf0')
        gg.frame(1, 1, 18, 9, '#e8514a')
        gg.hline(4, 15, 4, '#e8514a')
        gg.hline(4, 12, 6, '#3a3040')
      }), p),
    },
  ]
}

export function rongKhunMap(): MapDef {
  const ub = whiteUbosotSprite()
  const ubN = whiteUbosotSprite(true)
  const gh = heavenGateSprite()
  const tree = headsTreeSprite()
  const plates = wishPlatesSprite(80)
  const gold = goldenBuildingSprite()
  const well = wishingWellSprite()
  const pin = pinnacleSprite()
  const lamp = F.thaiLampSprite()
  const lampN = F.thaiLampSprite(true)
  const pins: [number, number][] = [
    [BR.x0 - 7, BR.bot], [BR.x1 + 7, BR.bot], [BR.x0 - 7, 480], [BR.x1 + 7, 480],
    [30, ISLAND.y1], [W - 30, ISLAND.y1], [72, ISLAND.y1], [W - 72, ISLAND.y1],
    [CX - 22, 640], [CX + 22, 640], [CX - 22, 720], [CX + 22, 720], [CX - 22, 800], [CX + 22, 800], [CX - 22, 880], [CX + 22, 880],
    [28, PLAZA.y1], [W - 28, PLAZA.y1],
  ]
  const LAMPS: [number, number][] = [
    [CX - 30, 606],
    [CX + 30, 606],
    [CX - 30, 940],
    [CX + 30, 940],
  ]
  const TREES: [number, number, number][] = [
    [20, 650, 0], [300, 640, 1], [20, 860, 1], [300, 950, 0], [18, 950, 1],
  ]
  const props: PlacedProp[] = [
    { sprite: ub, night: ubN, x: UB.x, y: UB.y },
    { sprite: gh, x: GATEH.x, y: GATEH.y },
    { sprite: guardianSprite(0), x: BR.x0 - 22, y: BR.bot + 12 },
    { sprite: guardianSprite(1), x: BR.x1 + 22, y: BR.bot + 12, flip: true },
    { sprite: tree, x: TREE.x, y: TREE.y, id: 'htree' },
    ...PLATES.map((p) => ({ sprite: plates, x: p.x, y: p.y })),
    { sprite: gold, x: GOLDB.x, y: GOLDB.y, id: 'gold' },
    { sprite: well, x: WELL.x, y: WELL.y },
    { sprite: artGallerySprite(), x: GALLERY.x, y: GALLERY.y },
    { sprite: artShopSprite(), x: SHOP.x, y: SHOP.y },
    ...pins.map(([x, y]) => ({ sprite: pin, x, y })),
    ...TREES.map(([x, y, v]) => ({ sprite: G.frangipani(v), x, y })),
    { sprite: heavenGateSprite(), x: CX, y: ENTRY_Y },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, night: lampN, x, y })),
    { sprite: donationBox('rk', '#6a8ad0'), x: 228, y: 736 },
  ]
  return {
    id: 'wat_rong_khun',
    place: 'wat_rong_khun',
    area: 'wat',
    w: W,
    h: H,
    skyH: 130,
    ground: '#86c95f',
    camBias: 0.6,
    entries: { 'wat_rong_khun:ubosot': { x: 60, y: 340, face: 'down' } },
    bake: bakeRK,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: ISLAND.y0 + 36 },
      { x: 0, y: 0, w: 4, h: H },
      { x: W - 4, y: 0, w: 4, h: H },
      // Moat and pit either side of the bridge.
      { x: 24, y: ISLAND.y1, w: BR.x0 - 24, h: PLAZA.y0 - ISLAND.y1 },
      { x: BR.x1, y: ISLAND.y1, w: W - 24 - BR.x1, h: PLAZA.y0 - ISLAND.y1 },
      { x: BR.x0 - 20, y: GATEH.y - 8, w: 18, h: 9 },
      { x: BR.x1 + 2, y: GATEH.y - 8, w: 18, h: 9 },
      { x: BR.x0 - 38, y: BR.bot + 4, w: 32, h: 9 },
      { x: BR.x1 + 6, y: BR.bot + 4, w: 32, h: 9 },
      // Garden.
      { x: 24, y: PLAZA.y1, w: CX - 40, h: 740 - PLAZA.y1 - 2 },
      { x: CX + 16, y: PLAZA.y1, w: W - CX - 40, h: 740 - PLAZA.y1 - 2 },
      { x: 24, y: 756, w: CX - 40, h: 860 - 756 },
      { x: CX + 16, y: 756, w: W - CX - 40, h: 860 - 756 },
      { x: 24, y: 876, w: CX - 40, h: ENTRY_Y - 876 },
      { x: CX + 16, y: 876, w: W - CX - 40, h: ENTRY_Y - 876 },
      { x: 0, y: ENTRY_Y + 12, w: W, h: H - ENTRY_Y - 12 },
      { x: CX - 32, y: ENTRY_Y - 8, w: 16, h: 9 },
      { x: CX + 16, y: ENTRY_Y - 8, w: 16, h: 9 },
      ...pins.map(([x, y]) => ({ x: x - 4, y: y - 4, w: 8, h: 5 })),
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      hs('door:wat_rong_khun:ubosot', 'อุโบสถวัดร่องขุ่น', 'เข้าไปกราบพระ ชมจิตรกรรมภายใน', 'door', { x: CX - 14, y: 250, w: 28, h: 86 }, { x: CX, y: 340 }, { marker: { x: CX, y: 244 }, beacon: true, near: 8 }),
      hs('job:feed_fish', 'สระน้ำรอบอุโบสถ', 'ให้อาหารปลาในสระสะท้อนเงาวัดขาว', 'broom', { x: 30, y: ISLAND.y1, w: 60, h: 30 }, { x: 62, y: 342 }, { face: 'down', marker: { x: 62, y: ISLAND.y1 + 6 } }),
      hs('job:wipe_statues', 'รูปปั้นผู้พิทักษ์', 'เช็ดรูปปั้นสีขาวให้สะอาดวิ้ง', 'broom', { x: BR.x0 - 40, y: BR.bot - 44, w: 36, h: 56 }, { x: BR.x0 - 22, y: BR.bot + 20 }, { marker: { x: BR.x0 - 22, y: BR.bot - 46 } }),
      hs('job:sweep_leaves', 'ต้นไม้แขวนหัว', 'กวาดใบไม้ใต้ต้นไม้สุดแปลก', 'broom', { x: TREE.x - 40, y: TREE.y - 20, w: 80, h: 26 }, { x: TREE.x + 30, y: 748 }, { marker: { x: TREE.x + 20, y: TREE.y - 24 } }),
      hs('donation', 'แผ่นอธิษฐานเงินวาววับ', 'เขียนคำอธิษฐานแล้วแขวนไว้', 'coin', { x: 216, y: 620, w: 80, h: 100 }, { x: 226, y: 748 }, { marker: { x: 256, y: 618 } }),
      hs('shop:wat_rong_khun_artshop', 'ร้านของที่ระลึกวัดขาว', 'ภาพพิมพ์ โปสการ์ด เสื้อยืดวัดขาว', 'shop', { x: SHOP.x - 26, y: SHOP.y - 50, w: 52, h: 50 }, { x: SHOP.x - 30, y: 868 }, { marker: { x: SHOP.x, y: SHOP.y - 54 } }),
      hs('gate', 'ทางออกวัด', 'กลับบ้าน หรือไปวัดอื่น', 'map', { x: CX - 16, y: ENTRY_Y - 40, w: 32, h: 50 }, { x: CX, y: ENTRY_Y + 4 }, { face: 'down', marker: { x: CX, y: ENTRY_Y - 60 }, near: 12 }),
    ],
    spawn: { x: CX, y: ENTRY_Y - 6, face: 'up' },
    pickupSpots: [
      { x: 14, y: 400 }, { x: W - 14, y: 460 }, { x: 60, y: 580 }, { x: 260, y: 590 }, { x: CX, y: 690 },
      { x: 40, y: 746 }, { x: 290, y: 746 }, { x: 60, y: 866 }, { x: 280, y: 868 }, { x: CX + 6, y: 820 },
    ],
    lights: [
      { x: UB.x, y: 280, r: 50, color: '#e8f0ff' },
      { x: UB.x, y: 190, r: 40, color: '#e8f0ff' },
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 20 })),
      { x: GOLDB.x, y: GOLDB.y - 30, r: 34, color: '#ffe07a' },
      { x: GATEH.x, y: GATEH.y - 30, r: 22, color: '#e8f0ff' },
      { x: SHOP.x, y: SHOP.y - 30, r: 18, color: '#ffcf7a' },
      ...pins.map(([x, y]) => ({ x, y: y - 30, r: 6, color: '#e8f0ff' })),
    ],
    life(s) {
      const glints = [
        ...hooksAt(ub, 'glints', UB.x, UB.y),
        ...hooksAt(gh, 'glints', GATEH.x, GATEH.y),
        ...hooksAt(gold, 'glints', GOLDB.x, GOLDB.y),
        ...PLATES.flatMap((p) => hooksAt(plates, 'glints', p.x, p.y)),
        ...hooksAt(well, 'glints', WELL.x, WELL.y),
        ...pins.map(([x, y]) => ({ x, y: y - 34 })),
      ]
      // Mirror sparkle all over the ubosot.
      for (let i = 0; i < 60; i++) {
        const v = hsh(i, 44)
        glints.push({ x: UB.x - 90 + (v % 180), y: 150 + ((v >> 3) % 180) })
      }
      return [
        new KoiPond(s, MOAT_BLOBS, { koi: 9, dragonflies: 2, lotus: [[50, 380, true], [110, 404], [214, 380, true], [270, 406]], lotusColor: '#fffaf0' }),
        new WavingHands(s),
        new SwingingHeads(s, hooksAt(tree, 'ropes', TREE.x, TREE.y)),
        new Glints(s, glints, 4),
        new Gags(s, rkGags()),
        new Butterflies(s, [
          { x: CX - 44, y: 620, w: 88, h: 80 },
          { x: CX - 44, y: 770, w: 88, h: 80 },
        ], 6),
        new CloudShadows(s, 3),
        new SunRays(s),
        new TapZones([
          {
            rect: { x: GOLDB.x - 36, y: GOLDB.y - 74, w: 72, h: 70 },
            fn: () => {
              s.shake('gold')
              s.say(['ห้องน้ำหรือพระราชวังเนี่ย?!', 'ชักโครก… ทองคำ?! ฟู่ววว~', 'สวยที่สุดในสามโลก!'][Math.floor(Math.random() * 3)], GOLDB.x, GOLDB.y - 78)
              s.particles.sparkles(GOLDB.x, GOLDB.y - 50, 14, '#fff3a6', 20)
              sfx.splash()
            },
          },
          {
            rect: { x: WELL.x - 16, y: WELL.y - 30, w: 32, h: 32 },
            fn: () => {
              s.say(['จ๋อม! ขอให้สมหวัง', 'โยนเหรียญลงบ่อ อธิษฐานในใจ', 'ลงกลางบ่อพอดี!'][Math.floor(Math.random() * 3)], WELL.x, WELL.y - 34)
              s.particles.add({ kind: 'coin', x: WELL.x - 6, y: WELL.y - 26, vx: 20, vy: -30, g: 120, max: 0.6, color: '#ffd23f' })
              setTimeout(() => {
                for (let i = 0; i < 6; i++) s.particles.add({ kind: 'drop', x: WELL.x, y: WELL.y - 9, vx: rand(-12, 12), vy: rand(-30, -14), g: 90, max: 0.6, color: '#9fd0ff', size: 1 })
                sfx.plop()
              }, 500)
              sfx.coin()
            },
          },
          {
            rect: { x: UB.x - 90, y: 130, w: 180, h: 160 },
            fn: () => {
              s.particles.sparkles(UB.x + rand(-60, 60), rand(150, 260), 12, '#e8f4ff', 20)
              s.say(['กระจกระยิบระยับ!', 'ขาวบริสุทธิ์ดั่งใจที่ทำบุญ', 'ศิลปะสุดอลังการ'][Math.floor(Math.random() * 3)], UB.x, 128)
              sfx.chime()
            },
          },
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 0.4) s.particles.add({ kind: 'petal', x: rand(0, W), y: rand(600, 900), vx: rand(-3, 3), vy: rand(5, 9), max: 3, color: '#fffaf0', color2: '#ffe45e' })
      if (s.isNight() && Math.random() < dt * 1.5) s.particles.add({ kind: 'sparkle', x: UB.x + rand(-90, 90), y: rand(130, 320), vy: rand(-5, -2), max: rand(0.8, 1.6), color: '#e8f4ff', drag: 0.3 })
    },
    wander: [
      { x: 30, y: PLAZA.y0 + 6, w: W - 60, h: 60 },
      { x: CX - 12, y: PLAZA.y1, w: 24, h: 330 },
      { x: 30, y: 742, w: W - 60, h: 10 },
      { x: 30, y: 862, w: W - 60, h: 10 },
      { x: 30, y: ISLAND.y0 + 38, w: W - 60, h: 8 },
    ],
    pois: [
      { x: CX, y: 345, face: 'up' },
      { x: CX, y: 500, face: 'up' },
      { x: CX - 10, y: 560, face: 'up' },
      { x: 90, y: 745, face: 'up' },
      { x: 240, y: 748, face: 'up' },
      { x: 240, y: 818, face: 'right' },
      { x: 60, y: 810, face: 'left' },
      { x: 90, y: 866, face: 'up' },
    ],
    birds: { x: 40, y: PLAZA.y0 + 10, w: 240, h: 40 },
    cats: [{ x: 290, y: 866, pose: 'sleep', color: '#fbf3e4' }],
    dogs: ['mali'],
    visitors: 7,
  }
}

// ===========================================================================
// Inside the White Temple's ubosot.

const IW = 224
const IH = 288
const ROOM: RoomOpts = {
  w: IW,
  h: IH,
  wallTop: 20,
  wallH: 78,
  side: 10,
  front: 14,
  door: { x: IW / 2, w: 30 },
  floor: 'white',
  wall: { L: '#ffffff', b: '#f4f8ff', d: '#dfe8f8', D: '#b8c8e8' },
  dado: '#c8d4ec',
}

export function rongKhunUbosotMap(): MapDef {
  const geo = roomGeo(ROOM)
  const altar = altarSprite('rk', buddhaProp('sukhothai', 0.62), { arch: 'halo', w: 92, tiers: 3, body: { L: '#ffffff', b: '#eef2fa', d: '#c8d4ec', D: '#9fb0d0' } })
  const ALT = { x: IW / 2, y: 136 }
  const pil = pillarSprite('white', 72)
  const PIL: [number, number][] = [
    [40, 160],
    [IW - 40, 160],
    [40, 238],
    [IW - 40, 238],
  ]
  const table = offeringTable('rk', 40, ['lotus', 'candle', 'fruit', 'candle', 'lotus'])
  const props: PlacedProp[] = [
    { sprite: altar, x: ALT.x, y: ALT.y },
    { sprite: table, x: ALT.x, y: 156 },
    { sprite: waxMonkSprite(), x: 56, y: 140 },
    ...PIL.map(([x, y]) => ({ sprite: pil, x, y })),
    { sprite: lotusVase(true), x: ALT.x - 48, y: 130 },
    { sprite: lotusVase(true), x: ALT.x + 48, y: 130 },
    { sprite: donationBox('rkI', '#6a8ad0'), x: 170, y: 258 },
  ]
  return {
    id: 'wat_rong_khun:ubosot',
    place: 'wat_rong_khun',
    area: 'wat',
    indoor: true,
    indoorLight: 0.75,
    w: IW,
    h: IH,
    skyH: 0,
    ground: '#1e2438',
    camBias: 0.55,
    entries: { wat_rong_khun: { x: IW / 2, y: IH - 22, face: 'up' } },
    bake(g) {
      bakeRoom(g, { ...ROOM, void: '#1e2438' }, (gg, x, y, w, h) => {
        // White-gold side panels and the big surreal mural in the middle.
        surrealMural(gg, x + 30, y + 2, w - 60, h - 4)
        gg.frame(x + 29, y + 1, w - 58, h - 2, '#c8a040')
        for (const px of [x + 4, x + w - 26]) {
          gg.rect(px, y + 6, 22, h - 12, '#eef2fa')
          for (let j = y + 10; j < y + h - 8; j += 6) for (let i = px + 3; i < px + 20; i += 5) gg.px(i + ((j / 6) % 2 ? 2 : 0), j, WHT.M)
          gg.rect(px + 6, y + 14, 10, 20, '#9fd0ff')
          gg.rect(px + 7, y + 15, 3, 18, '#d4ecff')
        }
      }, 7)
      carpet(g, IW / 2 - 16, 160, 32, IH - 174, '#3a5fb0', '#c8d4ec')
      carpet(g, 60, 190, 34, 50, '#dfe8f8', '#b8c8e8')
      carpet(g, IW - 94, 190, 34, 50, '#dfe8f8', '#b8c8e8')
    },
    props,
    obstacles: [
      ...geo.obstacles,
      { x: ALT.x - 46, y: 110, w: 92, h: 28 },
      { x: ALT.x - 20, y: 150, w: 40, h: 8 },
      { x: 42, y: 128, w: 28, h: 14 },
      ...PIL.map(([x, y]) => ({ x: x - 5, y: y - 4, w: 10, h: 5 })),
      { x: 164, y: 252, w: 12, h: 7 },
    ],
    hotspots: [
      hs('pray', 'พระประธานในอุโบสถ', 'กราบพระ สวดมนต์ ขอพรให้จิตใจผ่องใส', 'pray', { x: ALT.x - 40, y: 20, w: 80, h: 118 }, { x: ALT.x, y: 172 }, { marker: { x: ALT.x, y: 22 }, beacon: true }),
      hs('job:mop_floor', 'พื้นหินอ่อนสีขาว', 'ถูพื้นให้ขาววิ้งเหมือนกระจก', 'broom', { x: 140, y: 190, w: 56, h: 60 }, { x: 170, y: 220 }, { marker: { x: 170, y: 196 } }),
      hs('donation', 'ตู้ทำบุญ', 'ร่วมทำบุญสร้างงานศิลป์เพื่อพุทธศาสนา', 'coin', { x: 163, y: 238, w: 14, h: 22 }, { x: 170, y: 268 }),
      hs('door:wat_rong_khun', 'ประตูอุโบสถ', 'ออกทางด้านข้าง (ห้ามย้อนกลับทางสะพาน!)', 'door', { x: IW / 2 - 15, y: IH - 18, w: 30, h: 18 }, { x: IW / 2, y: IH - 10 }, { face: 'down', near: 10 }),
    ],
    spawn: { x: IW / 2, y: IH - 22, face: 'up' },
    pickupSpots: [],
    lights: [
      { x: ALT.x, y: 70, r: 48, color: '#fff3d6' },
      { x: ALT.x, y: 146, r: 14, color: '#ffb35a' },
      { x: IW / 2, y: 60, r: 70, color: '#ffc890' },
      { x: IW / 2, y: IH - 8, r: 22, color: '#f4f8ff' },
    ],
    life(s) {
      return [
        new Glints(s, [...hooksAt(altar, 'glints', ALT.x, ALT.y), ...Array.from({ length: 20 }, (_, i) => ({ x: 14 + (hsh(i, 3) % (IW - 28)), y: 30 + (hsh(i, 8) % 60) }))], 2),
        new Flames(s, hooksAt(altar, 'candles', ALT.x, ALT.y), ALT.y),
        new Flames(s, hooksAt(table, 'flames', ALT.x, 156), 156),
        new Smoke(s, [{ x: ALT.x, y: 146 }], 2),
        new TapZones([
          {
            rect: { x: 40, y: 22, w: IW - 80, h: 76 },
            fn: (x, y) => {
              s.say(['จิตรกรรมโลกปัจจุบัน… มีจรวดด้วย!', 'หุ่นยนต์แมวสีฟ้าอยู่ตรงนั้น!', 'ฮีโร่บินอยู่ในเปลวไฟกิเลส', 'ข้างบนคือสวรรค์ ข้างล่างคือกิเลส'][Math.floor(Math.random() * 4)], x, y)
              sfx.chime()
            },
          },
          {
            rect: { x: 42, y: 110, w: 28, h: 32 },
            fn: () => {
              s.say(['หุ่นขี้ผึ้งเหมือนจริงมาก!', 'นึกว่าท่านนั่งอยู่จริง ๆ'][Math.floor(Math.random() * 2)], 56, 106)
              sfx.sparkle()
            },
          },
        ]),
      ]
    },
    wander: [{ x: 60, y: 176, w: 104, h: 84 }],
    pois: [
      { x: ALT.x - 12, y: 176, face: 'up' },
      { x: ALT.x + 12, y: 176, face: 'up' },
      { x: 76, y: 210, face: 'up' },
      { x: IW - 76, y: 210, face: 'up' },
    ],
    dogs: [],
    visitors: 3,
  }
}

export const RK_MAPS: Record<string, () => MapDef> = {
  wat_rong_khun: rongKhunMap,
  'wat_rong_khun:ubosot': rongKhunUbosotMap,
}

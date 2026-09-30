// งานวัดศรีบุญดี (the temple fair) – always at night. From the gate up:
// the food court (ten carts: ข้าวโพดคั่ว ไข่นกกระทา หมึกย่าง ลูกชิ้นทอด
// ขนมโตเกียว สายไหม น้ำแดงถุง ไอติมหลอด ปลาหมึกบด ทาโกะยากิ), the haunted house
// (enter it: fair_temple:ghost), the มวยตู้ ring and the สาวน้อยตกน้ำ dunk
// tank, the claw machines and the prize booth, the game booths (ปาเป้า,
// โยนห่วง, ยิงปืนจุก, ตักปลา), the likay stage and the ธิดาลูกชิ้น contest,
// the bumper cars and the ramwong floor, the ferris wheel and the carousel,
// and the lit ubosot with its ขอพร corner. Fireworks every three minutes.
//
// Hotspots `fair:*` open src/activities/fair (see fair/hotspots.ts); moving
// and tappable things live in fair-temple-life.ts.

import type { MapDef, PlacedProp, WorldScene } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand, pick } from '../../../engine/rng'
import * as T from '../../../art/temple'
import * as G from '../../../art/garden'
import * as F from '../../../art/templeprops'
import { avatarSprite, type AvatarLook, type Pose } from '../../../art/avatar'
import { drawShadow } from '../../../art/props'
import { CloudShadows, Flames, Smoke, Traffic, type Life } from '../../life'
import { FairLights, Gags, type Gag } from '../../gags'
import { concrete, noticeBoard, hooksAt, INK, eatTable, stool, tiles, type Pt } from '../../../art/places/hub-kit'
import {
  balloonStand,
  boxingRingBack,
  boxingRingFront,
  clawMachine,
  contestStage,
  drawSeated,
  dunkTank,
  fairCart,
  fairGate,
  gameBooth,
  hauntedHouse,
  judgesTable,
  lanternPole,
  likayStage,
  mat,
  ramwongFloor,
  ramwongTable,
  speakerStack,
  wishAltar,
  wishTree,
  type CartKind,
  type LitProp,
} from '../../../art/places/fair'
import { bumperFloor, bumperRail } from '../../../art/places/fair-rides'
import { fairSfx } from '../../../activities/fair/sound'
import { road } from '../common'
import { HubArrival, OrangeCats, giverGag, hs, hubChat, look, personGag, tradePairGag } from './hub-common'
import { Balloons, Boxing, Bumpers, CartVendors, ClawRow, Contest, FairLive, FireworkShow, Lanterns, Neon, Rides, type CartSpot, type NeonItem } from './fair-temple-life'
import { sfx } from '../../../engine/audio'
import '../../../art/poses/fair'
import '../../../art/places/fair-motifs'

export const FAIR_MAP_ID = 'fair_temple'
const ID = FAIR_MAP_ID
const W = 400
const H = 1560
const CX = 200
const HALL = { x: CX, y: 250 }
const WISH = { x: 54, y: 262 }
const ALTAR = { x: 104, y: 290 }
const WHEEL = { x: 86, y: 372, r: 56 }
const CAROUSEL = { x: 314, y: 462 }
const BUMPER = { x: 14, y: 516, w: 144, h: 92 }
const RAMWONG = { x: 312, y: 568, rx: 58, ry: 28 }
const STAGE = { x: 88, y: 716 }
const CONTEST = { x: 314, y: 712 }
const BOOTH_Y = 872
const BOOTHS = [
  { id: 'darts', x: 46, w: 68 },
  { id: 'rings', x: 126, w: 68 },
  { id: 'cork', x: 274, w: 68 },
  { id: 'scoop', x: 354, w: 68 },
] as const
const CLAW_Y = 972
const CLAWS = [26, 52, 78, 104]
const PRIZES = { x: 314, y: 972 }
const MC = { x: 150, y: 950 }
const DUNK = { x: 50, y: 1112 }
const RING = { x: 124, y: 1118 }
const GHOST = { x: 316, y: 1124 }
const CARTS: { kind: CartKind; x: number; y: number }[] = [
  { kind: 'popcorn', x: 30, y: 1236 },
  { kind: 'quail', x: 86, y: 1236 },
  { kind: 'lookchin', x: 142, y: 1236 },
  { kind: 'squid', x: 258, y: 1236 },
  { kind: 'tokyo', x: 314, y: 1236 },
  { kind: 'takoyaki', x: 370, y: 1236 },
  { kind: 'saimai', x: 30, y: 1340 },
  { kind: 'icepop', x: 86, y: 1340 },
  { kind: 'redsoda', x: 314, y: 1340 },
  { kind: 'pressed', x: 370, y: 1340 },
]
const GATE = { x: CX, y: 1474 }
const ROAD_Y = 1482
const SELLER = { x: 104, y: 1426 }
const BOARD = { x: 316, y: 1428 }

/** Place shop behind each cart (hubShops.ts) and what the vendor shouts. */
const CART_INFO: Record<CartKind, { shop: string; name: string; hint: string; icon: string; lines: string[] }> = {
  popcorn: { shop: 'fair_temple_popcorn', name: 'ข้าวโพดคั่วเฮียป๊อก', hint: 'ข้าวโพดคั่วคาราเมลร้อน ๆ', icon: 'dessert', lines: ['ข้าวโพดคั่วร้อน ๆ', 'ป๊อก ๆ ๆ!', 'คาราเมลหรือเนยจ๊ะ'] },
  quail: { shop: 'fair_temple_quail', name: 'ไข่นกกระทาป้าไข่', hint: 'ไข่นกกระทากระทะหลุม ห้าลูกสิบบาท', icon: 'boiledegg', lines: ['ไข่นกกระทาจ้า ห้าลูกสิบ!', 'กรอบนอกนุ่มในจ้า', 'จิ้มซอสพริกด้วยนะ'] },
  lookchin: { shop: 'fair_temple_lookchin', name: 'ลูกชิ้นทอดพี่หนุ่ม', hint: 'ลูกชิ้นทอดไม้ใหญ่ น้ำจิ้มเด็ด', icon: 'curry', lines: ['ลูกชิ้นทอดจ้า!', 'น้ำจิ้มเผ็ดน้อยเผ็ดมาก', 'ไม้ละสิบ!'] },
  squid: { shop: 'fair_temple_squid', name: 'หมึกย่างลุงหนวด', hint: 'หมึกย่างเตาถ่าน น้ำจิ้มซีฟู้ด', icon: 'curry', lines: ['หมึกย่างตัวโต ๆ!', 'หอมควันไหมล่ะ~', 'ย่างใหม่ทุกไม้!'] },
  tokyo: { shop: 'fair_temple_tokyo', name: 'ขนมโตเกียวน้องแพร', hint: 'ขนมโตเกียวไส้ครีม ไส้กรอก', icon: 'dessert', lines: ['ขนมโตเกียวค่า~', 'ไส้ครีมใบเตยหอม ๆ', 'สองไส้ก็ได้นะคะ'] },
  takoyaki: { shop: 'fair_temple_takoyaki', name: 'ทาโกะยากิพี่โอ๊ต', hint: 'ทาโกะยากิลูกโต ปลาโอเต้นระบำ', icon: 'curry', lines: ['ทาโกะยากิร้อน ๆ!', 'ปลาโอแห้งเต้นได้นะ', 'เป่าก่อนกินนะ!'] },
  saimai: { shop: 'fair_temple_saimai', name: 'สายไหมป้าจุก', hint: 'สายไหมฟูเท่าหัว', icon: 'dessert', lines: ['สายไหมจ้า สายไหม!', 'ฟูเท่าหัวเลย', 'ชมพูหรือฟ้าจ๊ะ'] },
  icepop: { shop: 'fair_temple_icepop', name: 'ไอติมหลอดลุงชื่น', hint: 'ไอติมหลอดสีสด หลอดละสิบ', icon: 'dessert', lines: ['ไอติมหลอดจ้า หลอดละสิบ!', 'เย็น ๆ ชื่นใจ~', 'ดูดจนลิ้นเปลี่ยนสี!'] },
  redsoda: { shop: 'fair_temple_redsoda', name: 'น้ำแดงถุงเจ๊นิด', hint: 'น้ำแดงมะลิถุงใส่น้ำแข็ง', icon: 'redsoda', lines: ['น้ำแดงถุงจ้า!', 'เย็นเจี๊ยบ!', 'ดูดให้หลอดสั่นเลย'] },
  pressed: { shop: 'fair_temple_pressed', name: 'ปลาหมึกบดลุงเครื่อง', hint: 'ปลาหมึกบดสองรอบ เคี้ยวเพลิน', icon: 'curry', lines: ['หมุน ๆ ๆ บดสองรอบ!', 'แบนแต๊ดแต๋!', 'เคี้ยวเพลินทั้งคืน'] },
}

const POLES: [number, number][] = [
  [6, 300],
  [394, 300],
  [6, 486],
  [394, 486],
  [6, 784],
  [394, 784],
  [6, 1150],
  [394, 1150],
]

function bake(g: Surface, night: boolean) {
  G.treeLine(g, 64, W, G.LEAVES.far, 81)
  G.treeLine(g, 78, W, G.LEAVES.deep, 83)
  // Temple grounds: packed earth, grass round the ubosot, a paved path.
  concrete(g, 0, 92, W, ROAD_Y - 92, 23, night ? '#8a7a68' : '#c8b490', 0)
  G.lawn(g, 0, 96, 110, 190, 3)
  G.lawn(g, 290, 96, 110, 190, 5)
  tiles(g, 174, 272, 52, ROAD_Y - 272, 8, night ? '#a09080' : '#d8c8a8', night ? '#968678' : '#cdbd9d', 4)
  // Cross aisles (worn paths).
  for (const [y, h] of [
    [470, 24],
    [776, 20],
    [890, 20],
    [1000, 22],
    [1152, 30],
    [1252, 26],
    [1360, 30],
  ])
    tiles(g, 8, y, W - 16, h, 8, night ? '#97877a' : '#d0c0a0', night ? '#8d7d70' : '#c8b898', y)
  // Mats: likay audience, the contest crowd, the picnic corner of the food court.
  for (let i = 0; i < 3; i++) mat(g, 28, 724 + i * 12, 120, 10, i % 2 ? '#3d63b5' : '#e8514a', i % 2 ? '#5a8de0' : '#ff8a70')
  mat(g, 238, 1286, 150, 20, '#43905a', '#6cc36a')
  mat(g, 10, 1386, 70, 14, '#e8514a', '#ff8a70')
  ramwongFloor(g, RAMWONG.x, RAMWONG.y, RAMWONG.rx, RAMWONG.ry)
  bumperFloor(g, BUMPER.x, BUMPER.y, BUMPER.w, BUMPER.h)
  // Side rails of the bumper arena (the top and bottom ones are props).
  for (const x of [BUMPER.x, BUMPER.x + BUMPER.w - 2]) {
    g.rect(x, BUMPER.y, 2, BUMPER.h, '#e8514a')
    for (let y = BUMPER.y; y < BUMPER.y + BUMPER.h; y += 16) g.rect(x - 1, y, 4, 3, '#8a8480')
  }
  // Wheel and carousel bases.
  g.ellipse(WHEEL.x, WHEEL.y + WHEEL.r + 19, 40, 7, '#6a6374')
  g.ellipse(CAROUSEL.x, CAROUSEL.y, 48, 12, '#6a6374')
  // Dunk-tank splash puddle, boxing crowd scuffs.
  g.ellipse(DUNK.x - 6, DUNK.y + 4, 22, 4, night ? '#6a8a9a' : '#9fc8d8')
  // Bulb poles along the midway (the wires are drawn by FairLights).
  for (const [x, y] of POLES) {
    g.rect(x - 1, y, 2, 40, '#5a4a4e')
    g.px(x - 1, y, '#8a7a7e')
  }
  g.rect(0, ROAD_Y - 3, W, 3, '#bdb2ae')
  road(g, 0, ROAD_Y, W, H - ROAD_Y)
}

// ---------------------------------------------------------------------------
// Crowds that aren't gags: the likay audience, the ramwong circle and the
// contest crowd (all cheer when tapped).

class Crowd implements Life {
  private fans: { lk: AvatarLook; x: number; y: number }[]
  private dancers: { lk: AvatarLook; a: number }[]
  private watchers: { lk: AvatarLook; x: number; y: number }[]
  private hype = 0
  private hypeC = 0
  constructor(private s: WorldScene) {
    const F = (o: Partial<AvatarLook>) => look(o)
    this.fans = [
      { lk: F({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_floral', neck: 'neck_money_garland', hand: 'hand_fan' }), x: 42, y: 732 },
      { lk: F({ gender: 'f', hair: 'hair_bob', hairColor: 6, top: 'top_lace', hand: 'hand_fan' }), x: 64, y: 734 },
      { lk: F({ gender: 'm', hair: 'hair_buzz', hairColor: 6, top: 'top_mohom' }), x: 88, y: 732 },
      { lk: F({ gender: 'f', hair: 'hair_long', top: 'top_tee_white' }), x: 112, y: 734 },
      { lk: F({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_thaisilk', neck: 'neck_money_garland' }), x: 52, y: 746 },
      { lk: F({ gender: 'm', hair: 'hair_short', top: 'top_tee_boon' }), x: 100, y: 746 },
      { lk: F({ gender: 'f', hair: 'hair_twin', top: 'top_pe' }), x: 124, y: 748 },
      { lk: F({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_floral' }), x: 76, y: 758 },
      { lk: F({ gender: 'm', hair: 'hair_short', hairColor: 6, top: 'top_raj' }), x: 136, y: 758 },
    ]
    this.dancers = Array.from({ length: 10 }, (_, i) => ({
      lk: look(i % 2 ? { gender: 'f', top: pick(['top_sabai', 'top_thaisilk', 'top_lace']), bottom: 'bot_sin_mudmee' } : { gender: 'm', top: pick(['top_raj', 'top_mohom', 'top_phraratchathan']), bottom: 'bot_khaki' }),
      a: (i / 10) * Math.PI * 2,
    }))
    this.watchers = [
      { lk: F({}), x: 280, y: 758 },
      { lk: F({ head: 'head_catears' }), x: 298, y: 762 },
      { lk: F({ hand: 'hand_phone' }), x: 332, y: 760 },
      { lk: F({}), x: 350, y: 764 },
    ]
  }
  update(dt: number) {
    this.hype = Math.max(0, this.hype - dt)
    this.hypeC = Math.max(0, this.hypeC - dt)
    for (const d of this.dancers) d.a += dt * (this.hype > 0 ? 0.5 : 0.22)
    if (Math.random() < dt * 0.8 && this.s.onScreen(RAMWONG.x, RAMWONG.y, 20)) {
      this.s.particles.add({ kind: 'sparkle', x: RAMWONG.x + rand(-44, 44), y: RAMWONG.y - 30 + rand(-6, 6), vy: rand(-10, -5), max: 1.2, color: pick(['#fff3a6', '#ff9fc0', '#9fd0ff']) })
    }
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    const g = () => this.s.gfx
    if (this.s.onScreen(STAGE.x, 740, 40)) for (const f of this.fans) add(f.y, () => drawSeated(g(), f.lk, f.x, f.y, t + f.x, this.hype > 0 || Math.floor(t * 0.4 + f.x) % 5 === 0))
    if (this.s.onScreen(CONTEST.x, 760, 40))
      for (const w of this.watchers)
        add(w.y, () => {
          const cheer = this.hypeC > 0 || Math.floor(t * 0.5 + w.x) % 6 === 0
          const sp = avatarSprite(w.lk, 'back', cheer && Math.floor(t * 4) % 2 ? 'happy' : 'stand')
          drawShadow(g(), w.x, w.y, 6, 2)
          g().draw(sp.canvas, Math.round(w.x - sp.w / 2), Math.round(w.y - sp.h + 1))
        })
    if (!this.s.onScreen(RAMWONG.x, RAMWONG.y, 70)) return
    for (const d of this.dancers) {
      const x = RAMWONG.x + Math.cos(d.a) * 42
      const y = RAMWONG.y + Math.sin(d.a) * 19
      add(y, () => {
        const dx = -Math.sin(d.a)
        const pose: Pose = Math.floor(t * 2 + d.a * 3) % 2 ? 'offer' : 'happy'
        const sp = avatarSprite(d.lk, 'side', pose, { flip: dx < 0 })
        drawShadow(g(), x, y, 6, 2)
        g().draw(sp.canvas, Math.round(x - sp.w / 2), Math.round(y - sp.h + 1 - (Math.floor(t * 4 + d.a) % 2)))
      })
    }
  }
  tap(x: number, y: number): boolean {
    if (Math.hypot((x - RAMWONG.x) / RAMWONG.rx, (y - RAMWONG.y + 10) / (RAMWONG.ry + 14)) < 1) {
      this.hype = 5
      this.s.say(pick(['รำวงมาแล้วจ้า~', 'เร็วขึ้นอีก! ตึ่ง ตึ่ง!', 'ใครจะมารำด้วยกัน!', 'รำวงวันลอยกระทง~']), RAMWONG.x, RAMWONG.y - 44, 2.2)
      fairSfx.drum(true)
      setTimeout(() => fairSfx.ching(), 250)
      return true
    }
    if (x > 24 && x < 152 && y > 718 && y < 764) {
      this.hype = 3
      this.s.say(pick(['กรี๊ดดด พระเอก!', 'แม่ยกมาแล้วจ้า!', 'คล้องมาลัยให้พระเอกหน่อย', 'เสียงดีมากกก']), x, y - 30, 2)
      sfx.sparkle()
      return true
    }
    if (x > 266 && x < 362 && y > 740 && y < 768) {
      this.hypeC = 3
      this.s.say(pick(['เชียร์ลุงเป็ด!', 'ยายศรีสู้ ๆ!', 'แมวส้มต้องชนะ!!']), x, y - 30, 1.8)
      sfx.sparkle()
      return true
    }
    return false
  }
}

// ---------------------------------------------------------------------------
// The dunk tank: hit the target and the mascot uncle ("สาวน้อย") drops in.

class DunkTank implements Life {
  private fall = 0
  private ball: { t: number; x0: number; y0: number } | null = null
  private next = rand(8, 14)
  private uncle = look({ gender: 'm', suit: 'suit_chicken' })
  constructor(
    private s: WorldScene,
    private seat: Pt,
    private target: Pt,
  ) {}
  private throwBall(from?: Pt) {
    const f = from ?? { x: this.target.x + 30, y: this.target.y + 36 }
    this.ball = { t: 0, x0: f.x, y0: f.y }
    sfx.whoosh()
  }
  update(dt: number) {
    if (this.fall > 0) {
      this.fall -= dt
      if (this.fall <= 0 && this.s.onScreen(this.seat.x, this.seat.y, 0)) this.s.say(pick(['ลุงกลับมาแล้ว! ปาอีกได้!', 'เปียกหมดเลย 555', 'ไม่หนาวหรอก (สั่น)', 'สาวน้อยพร้อมแล้วค่ะ~']), this.seat.x, this.seat.y - 36, 2)
    }
    if (this.ball) {
      this.ball.t += dt * 1.6
      if (this.ball.t >= 1) {
        this.ball = null
        this.fall = 3
        for (let i = 0; i < 16; i++) this.s.particles.add({ kind: 'drop', x: this.seat.x + rand(-10, 10), y: this.seat.y + 6, vx: rand(-30, 30), vy: rand(-55, -20), g: 90, max: 0.9, color: '#c8ecf8' })
        if (this.s.onScreen(this.seat.x, this.seat.y, 0)) this.s.say(pick(['สาวน้อยตกน้ำแล้ววว!', 'จ๋อมมม!', 'ลุงไม่ได้เป็นเป็ดนะ เป็นไก่!', 'ว้ายยย เครื่องสำอางหลุด!']), this.seat.x, this.seat.y - 30, 2.2)
        fairSfx.dunk()
        sfx.splash()
      }
    }
    this.next -= dt
    if (this.next <= 0) {
      this.next = rand(12, 20)
      if (!this.ball && this.fall <= 0 && this.s.onScreen(this.seat.x, this.seat.y, 20)) this.throwBall()
    }
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    if (!this.s.onScreen(this.seat.x, this.seat.y, 40)) return
    add(DUNK.y + 1, () => {
      const g = this.s.gfx
      const falling = this.fall > 0
      const sp = avatarSprite(this.uncle, 'front', falling ? 'happy' : Math.floor(t * 1.5) % 4 === 0 ? 'offer' : 'sit')
      const y = falling ? this.seat.y + 16 : this.seat.y + 2
      g.draw(sp.canvas, Math.round(this.seat.x - sp.w / 2), Math.round(y - sp.h + 1))
      // A big pink bow: today the uncle is the "สาวน้อย".
      const by = y - sp.h + 3
      g.rect(this.seat.x - 4, by, 3, 3, '#ff6f91')
      g.rect(this.seat.x + 2, by, 3, 3, '#ff6f91')
      g.px(this.seat.x + 1, by + 1, '#e8514a')
      if (falling) {
        g.alpha(0.75)
        g.rect(this.seat.x - 13, this.seat.y + 4, 30, 24, '#9fd8f0')
        g.alpha(1)
        if (Math.floor(t * 6) % 2) g.px(this.seat.x + 4, this.seat.y - 2, '#ffffff')
      }
      if (this.ball) {
        const k = this.ball.t
        const bx = this.ball.x0 + (this.target.x - this.ball.x0) * k
        const by2 = this.ball.y0 + (this.target.y - this.ball.y0) * k - Math.sin(k * Math.PI) * 26
        g.circle(Math.round(bx), Math.round(by2), 2, '#ffd23f')
        g.px(Math.round(bx) - 1, Math.round(by2) - 1, '#ffffff')
      }
      void INK
    })
  }
  tap(x: number, y: number): boolean {
    if (Math.abs(x - DUNK.x) > 30 || y < DUNK.y - 64 || y > DUNK.y + 2) return false
    if (!this.ball && this.fall <= 0) {
      // The player throws if standing close by.
      const p = this.s.player
      const near = Math.hypot(p.x - DUNK.x, p.y - DUNK.y) < 70
      this.throwBall(near ? { x: p.x, y: p.y - 16 } : undefined)
      this.s.say(near ? pick(['ปาเลย! ให้สาวน้อยตกน้ำ!', 'เล็งเป้าแดงนะ!']) : pick(['ลุงไม่กลัวหรอก~', 'มาปาใกล้ ๆ สิ!']), DUNK.x, DUNK.y - 70, 1.8)
    }
    return true
  }
}

/** The haunted house door: now and then a (very polite) ghost pops out. */
class Haunted implements Life {
  private pop = 0
  private next = rand(6, 12)
  constructor(
    private s: WorldScene,
    private door: Pt,
  ) {}
  update(dt: number) {
    this.pop = Math.max(0, this.pop - dt)
    this.next -= dt
    if (this.next <= 0) {
      this.next = rand(14, 24)
      this.boo(false)
    }
  }
  private boo(tapped: boolean) {
    this.pop = 2.4
    if (!this.s.onScreen(this.door.x, this.door.y, 20)) return
    this.s.say(pick(['แฮ่!!!', 'บู้ววว~', 'ขอโทษที่ทำให้ตกใจนะ (ผีสุภาพ)', 'เข้ามาเล่นกันสิ~']), this.door.x, this.door.y - 40, 1.8)
    setTimeout(() => this.s.say(pick(['กรี๊ดดดด!!', 'แม่จ๋าาา!', 'ไม่เข้าแล้วววว!']), this.door.x - 30, this.door.y - 20, 1.8), 500)
    fairSfx.spooky()
    if (tapped) this.s.particles.sparkles(this.door.x, this.door.y - 20, 8, '#c8ff8a', 10)
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    if (this.pop <= 0 || !this.s.onScreen(this.door.x, this.door.y, 30)) return
    add(this.door.y + 12, () => {
      const g = this.s.gfx
      const k = Math.min(1, (2.4 - this.pop) * 4)
      const x = Math.round(this.door.x + Math.sin(t * 6) * 2)
      const y = Math.round(this.door.y - 4 - k * 18)
      g.alpha(0.92)
      g.circle(x, y - 6, 6, '#fffaf0')
      g.rect(x - 6, y - 6, 13, 10, '#fffaf0')
      for (let i = 0; i < 4; i++) g.circle(x - 4 + i * 3, y + 4 + ((i + Math.floor(t * 8)) % 2), 1.6, '#fffaf0')
      g.alpha(1)
      g.px(x - 2, y - 7, INK)
      g.px(x + 2, y - 7, INK)
      g.rect(x - 1, y - 4, 3, 2, INK)
      g.px(x - 4, y - 5, '#ff9fc0')
      g.px(x + 4, y - 5, '#ff9fc0')
    })
  }
  tap(x: number, y: number): boolean {
    if (Math.abs(x - GHOST.x) > 46 || y < GHOST.y - 80 || y > GHOST.y - 36) return false
    this.boo(true)
    return true
  }
}

function gags(): Gag[] {
  const mc = look({ gender: 'm', hair: 'hair_twoblock', hairColor: 0, top: 'top_raj', bottom: 'bot_slacks_grey', head: 'head_heartshades' })
  const hero = look({ gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_likay', bottom: 'bot_likay', head: 'head_likay' })
  const heroine = look({ gender: 'f', hair: 'hair_bun', hairColor: 0, top: 'top_sabai', bottom: 'bot_sin_mudmee', head: 'head_flowercrown' })
  const villain = look({ gender: 'm', hair: 'hair_buzz', hairColor: 0, top: 'top_khon', bottom: 'bot_khon', head: 'head_yakhat' })
  const barker = look({ gender: 'm', hair: 'hair_curly', hairColor: 0, top: 'top_tee_black', bottom: 'bot_jeans_black', head: 'head_catears' })
  const teddyGuy = look({ gender: 'm', hair: 'hair_twoblock', top: 'top_hoodie_over', bottom: 'bot_jeans' })
  const granny = look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_floral', bottom: 'bot_sarong', hand: 'hand_lookchin' })
  const selfie = look({ gender: 'f', hair: 'hair_long', top: 'top_retro_floral', bottom: 'bot_jeans', hand: 'hand_selfie' })
  const band = look({ gender: 'm', hair: 'hair_buzz', hairColor: 6, top: 'top_mohom', bottom: 'bot_fisherman' })
  const sequins = (g: Surface, p: { x: number; y: number; t: number }) => {
    for (let i = 0; i < 3; i++) {
      if ((Math.floor(p.t * 6) + i) % 3) continue
      g.px(p.x - 4 + i * 4, p.y - 14 - (i % 2) * 4, '#fff3a6')
    }
  }
  return [
    giverGag(mc, MC.x, MC.y, ['เทสต์ ๆ หนึ่งสองสาม!', 'ยินดีต้อนรับสู่งานวัดศรีบุญดีครับ!', 'ซุ้มเกมเปิดแล้ว ไปเล่นกันเลย!', 'พลุขึ้นทุกสามนาทีนะครับ!'], {
      over: (g, p) => {
        g.rect(p.x + 4, p.y - 18, 2, 4, '#3a3040')
        g.px(p.x + 4, p.y - 19, '#8c8187')
      },
    }),
    giverGag(hero, 164, 692, ['โอ้ละหนอ~ แม่ยกคนงาม', 'พระเอกลิเกคณะดาวเลื่อมครับ', 'ช่วยเป็นกำลังใจให้พี่หน่อย'], { over: sequins }),
    personGag(heroine, STAGE.x - 26, STAGE.y - 8, ['โอ้ละหนอ พี่จ๋า~', 'น้องรอพี่มาทั้งคืน', 'ร้องเพลงลิเกให้ฟัง~'], { z: 12, over: sequins, walk: { x0: STAGE.x - 40, x1: STAGE.x - 10, speed: 5 } }),
    personGag(villain, STAGE.x + 28, STAGE.y - 8, ['ฮ่า ฮ่า ฮ่า! ข้าคือยักษ์!', 'ยอมแพ้ซะดี ๆ', '(ยักษ์ใจดีนะจริง ๆ)'], { z: 12, view: 'front', walk: { x0: STAGE.x + 10, x1: STAGE.x + 44, speed: 6 } }),
    personGag(barker, 262, 1138, ['กล้าเข้าไหม~ บ้านผีสิงสุดสยอง!', 'คนละยี่สิบ ถ้ากรี๊ดไม่คืนเงิน!', 'ผีในบ้านใจดีนะ (มั้ง)', 'เดินครบทุกห้องได้ใบประกาศ!'], { view: 'front' }),
    personGag(teddyGuy, 200, 1010, ['ได้หมีตัวใหญ่มาแล้ว!', 'หนักกว่าที่คิดอีก 555', 'ใครจะช่วยถือบ้าง'], {
      walk: { x0: 180, x1: 230, speed: 10 },
      over: (g, p) => {
        const x = p.x + (p.flip ? -6 : 6)
        g.circle(x, p.y - 12, 5, '#ff9fc0')
        g.circle(x, p.y - 19, 4, '#ff9fc0')
        g.circle(x - 3, p.y - 23, 1.5, '#ff9fc0')
        g.circle(x + 3, p.y - 23, 1.5, '#ff9fc0')
        g.px(x - 1, p.y - 20, INK)
        g.px(x + 1, p.y - 20, INK)
      },
    }),
    personGag(granny, 214, 1300, ['ลูกชิ้นไม้ที่สามแล้วจ้า', 'สมัยยายสาว ๆ งานวัดสนุกกว่านี้อีก', 'หลานไปรำวงกับยายไหม'], { view: 'front' }),
    personGag(selfie, 232, 440, ['ถ่ายกับชิงช้าสวรรค์หน่อย!', 'ไฟสวยมาก ลงไอจีเลย', 'ยิ้ม~ แชะ!'], {
      walk: { x0: 190, x1: 240, speed: 8 },
      react: (s, x, y) => {
        s.particles.sparkles(x + 6, y - 28, 8, '#ffffff', 6)
        sfx.click()
      },
    }),
    personGag(band, RAMWONG.x, RAMWONG.y - 34, ['ตึ่ง ตึ่ง ตึ่ง!', 'เพลงต่อไป รำวงวันลอยกระทง', 'ขอเสียงหน่อยยย'], {
      view: 'front',
      z: -2,
      over: (g, p) => {
        g.ellipse(p.x + 5, p.y - 9, 3, 1.5, '#e0c8a0')
        g.rect(p.x + 2, p.y - 9, 6, 5, '#8a2335')
      },
    }),
    ...[0, 1, 2].map((i) =>
      personGag(look(i === 1 ? { gender: 'f', hair: 'hair_twin', hand: 'hand_bubbletea' } : i === 2 ? { head: 'head_catears' } : {}), WHEEL.x + 26 + i * 11, WHEEL.y + WHEEL.r + 26, [['ต่อคิวชิงช้าสวรรค์จ้า', 'อีกสองรอบถึงเรา!'], ['กลัวความสูงนิดนึง…', 'ขอนั่งกระเช้าสีชมพูนะ'], ['ถ่ายรูปบนยอดต้องสวยแน่', 'พลุขึ้นตอนเราอยู่บนยอดทีเถอะ']][i], { view: 'back' }),
    ),
    tradePairGag(236, 1026, { hair: 'hair_bob', top: 'top_tee_black' }, { hair: 'hair_ponytail', top: 'top_hoodie_over' }, ['แลกปลาทองกับพวงกุญแจผีไหม', 'ได้ตั๋วตั้งแปดใบ! 🎟️', 'ดีลลล 🤝']),
  ]
}

export function fairMap(): MapDef {
  const hall = T.hallSprite({ roof: T.ROOF.orange, roof2: T.ROOF.red })
  const hallN = T.hallSprite({ roof: T.ROOF.orange, roof2: T.ROOF.red, night: true })
  const stage = likayStage()
  const contest = contestStage()
  const dunk = dunkTank()
  const ghost = hauntedHouse()
  const gate = fairGate()
  const tree = wishTree()
  const altar = wishAltar()
  const ringBack = boxingRingBack()
  const lantern = lanternPole()
  const board = noticeBoard('fair', '#c8343f')
  const booths = BOOTHS.map((b) => ({ ...b, sprite: gameBooth(b.id) }))
  const prizes = gameBooth('prizes')
  const claws = CLAWS.map((x, i) => ({ x, sprite: clawMachine(i) }))
  const carts = CARTS.map((c) => ({ ...c, sprite: fairCart(c.kind) }))
  const lamp = F.thaiLampSprite(true)
  const LAMPS: [number, number][] = [
    [140, 296],
    [260, 296],
    [158, 1440],
    [242, 1440],
  ]
  const LANTERN_POLES: [number, number][] = [
    [168, 640],
    [232, 640],
    [168, 1060],
    [232, 1060],
  ]
  const seat = hooksAt(dunk.base, 'seat', DUNK.x, DUNK.y)[0]
  const target = hooksAt(dunk.base, 'target', DUNK.x, DUNK.y)[0]
  const lit = (p: LitProp, x: number, y: number, a?: number): NeonItem => ({ sprite: p.lit, x, y, a })
  const props: PlacedProp[] = [
    { sprite: hall, night: hallN, x: HALL.x, y: HALL.y, z: -28 },
    { sprite: F.urnSprite(), x: 166, y: 282, shadow: [10, 2] },
    { sprite: F.donationSprite(), x: 246, y: 278, shadow: [6, 2] },
    { sprite: F.candleStandSprite(), x: 150, y: 278 },
    { sprite: tree.base, x: WISH.x, y: WISH.y },
    { sprite: altar.base, x: ALTAR.x, y: ALTAR.y },
    { sprite: G.frangipani(1), x: 338, y: 250 },
    { sprite: G.frangipani(0), x: 378, y: 276 },
    { sprite: stage.base, x: STAGE.x, y: STAGE.y },
    { sprite: contest.base, x: CONTEST.x, y: CONTEST.y },
    { sprite: judgesTable(), x: CONTEST.x - 4, y: CONTEST.y + 22 },
    { sprite: ramwongTable(), x: RAMWONG.x, y: RAMWONG.y + 4 },
    { sprite: speakerStack(), x: RAMWONG.x - 52, y: RAMWONG.y - 20 },
    { sprite: speakerStack(), x: RAMWONG.x + 52, y: RAMWONG.y - 20 },
    { sprite: bumperRail(BUMPER.w, false), x: BUMPER.x + BUMPER.w / 2, y: BUMPER.y + 4 },
    { sprite: bumperRail(BUMPER.w, true), x: BUMPER.x + BUMPER.w / 2, y: BUMPER.y + BUMPER.h + 4 },
    ...booths.map((b) => ({ sprite: b.sprite.base, x: b.x, y: BOOTH_Y })),
    { sprite: prizes.base, x: PRIZES.x, y: PRIZES.y },
    ...claws.map((c) => ({ sprite: c.sprite.base, x: c.x, y: CLAW_Y, shadow: [10, 2] as [number, number] })),
    { sprite: dunk.base, x: DUNK.x, y: DUNK.y },
    { sprite: ringBack.base, x: RING.x, y: RING.y, z: -30 },
    { sprite: boxingRingFront(), x: RING.x, y: RING.y },
    { sprite: ghost.base, x: GHOST.x, y: GHOST.y },
    ...carts.map((c) => ({ sprite: c.sprite.base, x: c.x, y: c.y })),
    { sprite: eatTable('#fffaf0', '#e8514a'), x: 150, y: 1310 },
    { sprite: eatTable('#fffaf0', '#5a8de0'), x: 150, y: 1344 },
    { sprite: eatTable('#ffe27a', '#6cc36a'), x: 258, y: 1344 },
    { sprite: stool('#e8514a'), x: 30, y: 1300 },
    { sprite: stool('#5a8de0'), x: 50, y: 1302 },
    { sprite: balloonStand(), x: SELLER.x, y: SELLER.y },
    { sprite: board, x: BOARD.x, y: BOARD.y, shadow: [12, 3] },
    { sprite: gate.base, x: GATE.x, y: GATE.y },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, x, y })),
    ...LANTERN_POLES.map(([x, y]) => ({ sprite: lantern.base, x, y })),
  ]
  const bulbs = [
    ...hooksAt(gate.base, 'bulbs', GATE.x, GATE.y),
    ...booths.flatMap((b) => hooksAt(b.sprite.base, 'bulbs', b.x, BOOTH_Y)),
    ...hooksAt(prizes.base, 'bulbs', PRIZES.x, PRIZES.y),
    ...hooksAt(stage.base, 'bulbs', STAGE.x, STAGE.y),
    ...hooksAt(contest.base, 'bulbs', CONTEST.x, CONTEST.y),
  ]
  const neon: NeonItem[] = [
    lit(stage, STAGE.x, STAGE.y, 0.55),
    lit(contest, CONTEST.x, CONTEST.y, 0.4),
    ...booths.map((b) => lit(b.sprite, b.x, BOOTH_Y, 0.7)),
    lit(prizes, PRIZES.x, PRIZES.y, 0.7),
    ...claws.map((c) => lit(c.sprite, c.x, CLAW_Y, 0.85)),
    lit(dunk, DUNK.x, DUNK.y, 0.6),
    { ...lit(ghost, GHOST.x, GHOST.y, 0.9), flicker: 0.6 },
    lit(ringBack, RING.x, RING.y, 0.8),
    ...carts.map((c) => lit(c.sprite, c.x, c.y, 0.7)),
    lit(gate, GATE.x, GATE.y, 0.9),
    lit(tree, WISH.x, WISH.y, 0.8),
    lit(altar, ALTAR.x, ALTAR.y, 0.9),
    ...LANTERN_POLES.map(([x, y]) => lit(lantern, x, y, 0.9)),
  ]
  const cartSpots: CartSpot[] = carts.map((c, i) => ({
    x: c.x,
    y: c.y,
    lines: CART_INFO[c.kind].lines,
    lk: look(i % 3 === 0 ? { head: 'head_vendorband', top: 'top_mohom' } : i % 3 === 1 ? { head: 'head_chefhat', gender: 'm' } : { top: 'top_floral', gender: 'f', hair: 'hair_bun' }),
  }))
  const glass = claws.flatMap((c) => hooksAt(c.sprite.base, 'glass', c.x, CLAW_Y))
  const spots = hooksAt(contest.base, 'spots', CONTEST.x, CONTEST.y)
  const throne = hooksAt(contest.base, 'throne', CONTEST.x, CONTEST.y)[0]
  const door = hooksAt(ghost.base, 'door', GHOST.x, GHOST.y)[0]
  const bothAt = (b: { x: number }, y: number) => ({ x: b.x, y })
  return {
    id: ID,
    place: ID,
    area: 'wat',
    w: W,
    h: H,
    skyH: 72,
    ground: '#8a7a68',
    camBias: 0.6,
    forcePhase: 'night',
    bake,
    props,
    obstacles: [
      { x: 0, y: 0, w: W, h: 96 },
      // The ubosot, stairs left open up to the door.
      { x: 122, y: 110, w: 156, h: 114 },
      { x: 122, y: 224, w: 66, h: 17 },
      { x: 212, y: 224, w: 66, h: 17 },
      { x: 172, y: 238, w: 11, h: 12 },
      { x: 217, y: 238, w: 11, h: 12 },
      { x: 156, y: 274, w: 20, h: 9 },
      { x: 239, y: 270, w: 14, h: 9 },
      { x: 144, y: 272, w: 12, h: 7 },
      // The ขอพร corner.
      { x: WISH.x - 14, y: WISH.y - 12, w: 28, h: 13 },
      { x: ALTAR.x - 20, y: ALTAR.y - 16, w: 40, h: 17 },
      { x: 335, y: 246, w: 6, h: 5 },
      { x: 375, y: 272, w: 6, h: 5 },
      // Rides.
      { x: WHEEL.x - 44, y: WHEEL.y + WHEEL.r + 4, w: 88, h: 18 },
      { x: CAROUSEL.x - 46, y: CAROUSEL.y - 16, w: 92, h: 20 },
      { x: BUMPER.x - 2, y: BUMPER.y - 8, w: BUMPER.w + 4, h: BUMPER.h + 14 },
      { x: RAMWONG.x - 12, y: RAMWONG.y - 4, w: 24, h: 9 },
      { x: RAMWONG.x - 60, y: RAMWONG.y - 26, w: 16, h: 8 },
      { x: RAMWONG.x + 44, y: RAMWONG.y - 26, w: 16, h: 8 },
      // Stages.
      { x: STAGE.x - 62, y: STAGE.y - 60, w: 124, h: 61 },
      { x: CONTEST.x - 52, y: CONTEST.y - 50, w: 104, h: 51 },
      { x: CONTEST.x - 24, y: CONTEST.y + 12, w: 40, h: 11 },
      // Booths, claws, prizes.
      ...BOOTHS.map((b) => ({ x: b.x - b.w / 2, y: BOOTH_Y - 44, w: b.w, h: 45 })),
      { x: PRIZES.x - 40, y: PRIZES.y - 44, w: 80, h: 45 },
      { x: CLAWS[0] - 12, y: CLAW_Y - 26, w: CLAWS[3] - CLAWS[0] + 24, h: 27 },
      // Attractions.
      { x: DUNK.x - 28, y: DUNK.y - 36, w: 60, h: 37 },
      { x: RING.x - 42, y: RING.y - 40, w: 84, h: 41 },
      { x: GHOST.x - 48, y: GHOST.y - 56, w: 96, h: 57 },
      // Food court.
      ...CARTS.map((c) => ({ x: c.x - 19, y: c.y - 26, w: 38, h: 27 })),
      { x: 136, y: 1300, w: 28, h: 10 },
      { x: 136, y: 1334, w: 28, h: 10 },
      { x: 244, y: 1334, w: 28, h: 10 },
      { x: SELLER.x - 7, y: SELLER.y - 7, w: 14, h: 8 },
      { x: BOARD.x - 14, y: BOARD.y - 11, w: 28, h: 11 },
      // Gate, walls and the road.
      { x: GATE.x - 58, y: GATE.y - 6, w: 12, h: 7 },
      { x: GATE.x + 46, y: GATE.y - 6, w: 12, h: 7 },
      { x: 0, y: GATE.y - 6, w: GATE.x - 58, h: H - GATE.y + 6 },
      { x: GATE.x + 58, y: GATE.y - 6, w: W - GATE.x - 58, h: H - GATE.y + 6 },
      { x: 0, y: ROAD_Y, w: W, h: H - ROAD_Y },
      ...POLES.map(([x, y]) => ({ x: x - 2, y: y + 36, w: 4, h: 4 })),
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
      ...LANTERN_POLES.map(([x, y]) => ({ x: x - 2, y: y - 3, w: 4, h: 4 })),
    ],
    hotspots: [
      { id: 'hall', label: 'อุโบสถวัดศรีบุญดี', hint: 'กราบพระก่อนเที่ยวงาน สวดมนต์ ปิดทอง', icon: 'temple', rect: { x: 128, y: 100, w: 144, h: 150 }, at: { x: HALL.x, y: HALL.y + 6 }, face: 'up', marker: { x: HALL.x + 1, y: 84 }, beacon: true, near: 16 },
      hs('incense', 'มุมขอพรต้นไม้ศักดิ์สิทธิ์', 'จุดธูปขอพร ผูกผ้าแพร เขียนคำอธิษฐาน', 'incense', { x: 20, y: 184, w: 106, h: 108 }, { x: ALTAR.x, y: ALTAR.y + 12 }, { marker: { x: WISH.x, y: WISH.y - 88 } }),
      hs('donation', 'ตู้ทำบุญงานวัด', 'ร่วมทำบุญบำรุงวัด', 'coin', { x: 238, y: 252, w: 16, h: 28 }, { x: 246, y: 292 }, { marker: { x: 246, y: 250 } }),
      hs('fair:wheel', 'ชิงช้าสวรรค์', 'ขึ้นไปดูวิวงานวัดและพลุจากยอดชิงช้า', 'sparkle', { x: 30, y: 312, w: 112, h: 136 }, { x: WHEEL.x, y: 458 }, { marker: { x: WHEEL.x, y: 306 } }),
      hs('fair:carousel', 'ม้าหมุน', 'ขี่ม้าหมุน คว้าห่วงทอง', 'star', { x: 270, y: 394, w: 88, h: 72 }, { x: CAROUSEL.x, y: CAROUSEL.y + 16 }, { marker: { x: CAROUSEL.x, y: 386 } }),
      hs('fair:bumper', 'รถบั๊มพ์ซิ่งสายฟ้า', 'ขับรถบั๊มพ์ชนให้มันส์ รับตั๋วแลกรางวัล', 'bolt', { x: BUMPER.x, y: BUMPER.y - 20, w: BUMPER.w, h: BUMPER.h + 22 }, { x: BUMPER.x + BUMPER.w / 2, y: BUMPER.y + BUMPER.h + 16 }, { marker: { x: BUMPER.x + BUMPER.w / 2, y: BUMPER.y - 24 } }),
      hs('fair:ramwong', 'ลานรำวง', 'รำวงตามจังหวะกับชาวบ้าน (และผู้เล่นจริง)', 'music', { x: RAMWONG.x - 58, y: RAMWONG.y - 40, w: 116, h: 70 }, { x: RAMWONG.x, y: RAMWONG.y + 40 }, { marker: { x: RAMWONG.x, y: RAMWONG.y - 48 } }),
      hs('fair:likay', 'เวทีลิเกคณะดาวเลื่อม', 'นั่งดูลิเก เชียร์พระเอกตอนเก๊กท่า', 'mic', { x: STAGE.x - 62, y: STAGE.y - 86, w: 124, h: 88 }, { x: STAGE.x, y: 770 }, { marker: { x: STAGE.x, y: STAGE.y - 92 } }),
      ...BOOTHS.map((b) =>
        hs(
          `fair:${b.id}`,
          { darts: 'ซุ้มปาเป้าลูกโป่ง', rings: 'ซุ้มโยนห่วง', cork: 'ซุ้มยิงปืนจุก', scoop: 'ซุ้มตักปลาทอง' }[b.id],
          { darts: 'ปาลูกดอกให้โดนลูกโป่ง รับตั๋วแลกของรางวัล', rings: 'โยนห่วงให้คล้องคอขวด รับตั๋วแลกของรางวัล', cork: 'ยิงจุกให้ของตกจากชั้น รับตั๋วแลกของรางวัล', scoop: 'ตักปลาทองด้วยโปยกระดาษ เอากลับบ้านได้หนึ่งตัว' }[b.id],
          { darts: 'sparkle', rings: 'gift', cork: 'star', scoop: 'koi' }[b.id],
          { x: b.x - 32, y: BOOTH_Y - 60, w: 64, h: 60 },
          bothAt(b, BOOTH_Y + 10),
          { marker: { x: b.x, y: BOOTH_Y - 66 } },
        ),
      ),
      hs('fair:claw', 'ตู้คีบตุ๊กตา', 'หยอดเหรียญคีบตุ๊กตา มีตัวลับสีทอง!', 'gift', { x: CLAWS[0] - 12, y: CLAW_Y - 48, w: CLAWS[3] - CLAWS[0] + 24, h: 50 }, { x: (CLAWS[0] + CLAWS[3]) / 2, y: CLAW_Y + 12 }, { marker: { x: (CLAWS[0] + CLAWS[3]) / 2, y: CLAW_Y - 54 } }),
      hs('fair:prizes', 'ซุ้มแลกของรางวัล', 'เอาตั๋วมาแลกตุ๊กตา ปลาทอง ของสะสมงานวัด', 'gift', { x: PRIZES.x - 36, y: PRIZES.y - 60, w: 72, h: 60 }, { x: PRIZES.x, y: PRIZES.y + 12 }, { marker: { x: PRIZES.x, y: PRIZES.y - 66 } }),
      hs('door:fair_temple:ghost', 'บ้านผีสิง', 'เดินให้ครบทุกห้อง (ผีน่ารัก ไม่น่ากลัว… มั้ง)', 'moon', { x: GHOST.x - 22, y: GHOST.y - 34, w: 44, h: 34 }, { x: GHOST.x, y: GHOST.y + 12 }, { marker: { x: GHOST.x, y: GHOST.y - 86 } }),
      ...CARTS.map((c) => {
        const info = CART_INFO[c.kind]
        return hs(`fair:eat:${info.shop}`, info.name, info.hint, info.icon, { x: c.x - 18, y: c.y - 46, w: 36, h: 46 }, { x: c.x, y: c.y + 10 }, { marker: { x: c.x, y: c.y - 50 } })
      }),
      hs('npc:fair_mc', 'พี่โบ๊ท', 'พิธีกรงานวัด · สายเกม', 'friends', { x: MC.x - 8, y: MC.y - 30, w: 16, h: 32 }, { x: MC.x, y: MC.y + 14 }, { marker: { x: MC.x, y: MC.y - 42 }, near: 14 }),
      hs('npc:fair_likay', 'พระเอกเพชร', 'พระเอกลิเกคณะดาวเลื่อม', 'friends', { x: 156, y: 662, w: 16, h: 32 }, { x: 164, y: 706 }, { marker: { x: 164, y: 650 }, near: 14 }),
      hs(`board:${ID}`, 'บอร์ดงานวัด', 'ตารางการแสดง · พลุรอบหน้า · คะแนนสด · ตั๋วของฉัน', 'scroll', { x: BOARD.x - 16, y: BOARD.y - 34, w: 32, h: 34 }, { x: BOARD.x, y: BOARD.y + 12 }, { marker: { x: BOARD.x, y: BOARD.y - 36 } }),
      hs('gate', 'ซุ้มทางออกงานวัด', 'กลับบ้าน หรือไปที่อื่น', 'map', { x: GATE.x - 30, y: GATE.y - 66, w: 60, h: 68 }, { x: GATE.x, y: GATE.y - 8 }, { face: 'down', marker: { x: GATE.x, y: GATE.y - 72 }, near: 12 }),
    ],
    spawn: { x: GATE.x, y: GATE.y - 20, face: 'up' },
    entries: { 'fair_temple:ghost': { x: GHOST.x, y: GHOST.y + 16, face: 'down' } },
    pickupSpots: [
      { x: 30, y: 300 },
      { x: 300, y: 300 },
      { x: 200, y: 470 },
      { x: 30, y: 640 },
      { x: 250, y: 640 },
      { x: 200, y: 900 },
      { x: 150, y: 1010 },
      { x: 60, y: 1160 },
      { x: 360, y: 1160 },
      { x: 200, y: 1380 },
    ],
    lights: [
      { x: HALL.x, y: 212, r: 40, color: '#ffcf7a' },
      { x: HALL.x - 57, y: 214, r: 12 },
      { x: HALL.x + 57, y: 214, r: 12 },
      { x: ALTAR.x, y: ALTAR.y - 14, r: 22, color: '#ffcf7a' },
      { x: WISH.x, y: WISH.y - 50, r: 30, color: '#ff9a7a' },
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      { x: STAGE.x, y: STAGE.y - 40, r: 50, color: '#ff9fc0' },
      { x: STAGE.x, y: STAGE.y - 10, r: 34, color: '#fff3a6' },
      { x: CONTEST.x, y: CONTEST.y - 36, r: 44, color: '#ffb0d8' },
      { x: RAMWONG.x, y: RAMWONG.y - 10, r: 50, color: '#ffcf7a' },
      ...BOOTHS.map((b) => ({ x: b.x, y: BOOTH_Y - 30, r: 32, color: '#fff3a6' })),
      { x: PRIZES.x, y: PRIZES.y - 30, r: 34, color: '#e0c8ff' },
      { x: 65, y: CLAW_Y - 20, r: 36, color: '#ffb0e0' },
      { x: GHOST.x, y: GHOST.y - 40, r: 30, color: '#c8ff8a' },
      { x: DUNK.x, y: DUNK.y - 20, r: 26, color: '#9fd8f0' },
      { x: RING.x, y: RING.y - 30, r: 34, color: '#fff3a6' },
      ...CARTS.map((c) => ({ x: c.x, y: c.y - 24, r: 20, color: '#ffe7a8' })),
      { x: GATE.x, y: GATE.y - 50, r: 44, color: '#fff3a6' },
      ...LANTERN_POLES.map(([x, y]) => ({ x, y: y - 30, r: 14, color: '#ff8a6a' })),
    ],
    remoteChat: hubChat(ID),
    life(s) {
      return [
        new HubArrival(s),
        new Rides(s, WHEEL, CAROUSEL),
        new Bumpers(s, BUMPER),
        new Crowd(s),
        new Contest(s, spots, throne, CONTEST.x),
        new Boxing(s, RING.x, RING.y),
        new DunkTank(s, seat, target),
        new Haunted(s, door),
        new CartVendors(s, cartSpots),
        new ClawRow(s, glass),
        new Balloons(s, SELLER, [
          { x0: 176, x1: 224, y: 1200 },
          { x0: 60, x1: 150, y: 1168 },
          { x0: 250, x1: 340, y: 1378 },
          { x0: 186, x1: 216, y: 620 },
        ]),
        new FairLights(s, [
          { x0: 6, y0: 302, x1: 394, y1: 302, n: 38, sag: 14 },
          { x0: 6, y0: 488, x1: 394, y1: 488, n: 38, sag: 16 },
          { x0: 6, y0: 786, x1: 394, y1: 786, n: 38, sag: 14 },
          { x0: 6, y0: 1152, x1: 394, y1: 1152, n: 38, sag: 12 },
          { x0: 6, y0: 302, x1: 6, y1: 488, n: 12, sag: 0 },
          { x0: 394, y0: 302, x1: 394, y1: 488, n: 12, sag: 0 },
          { x0: 6, y0: 786, x1: 6, y1: 1152, n: 20, sag: 0 },
          { x0: 394, y0: 786, x1: 394, y1: 1152, n: 20, sag: 0 },
        ]),
        new Lanterns(s, [
          { x0: 168, x1: 232, y: 612, n: 7, sag: 8 },
          { x0: 168, x1: 232, y: 1032, n: 7, sag: 8 },
          { x0: 8, x1: 160, y: 1180, n: 11, sag: 10, color: '#fffaf0' },
          { x0: 240, x1: 392, y: 1180, n: 11, sag: 10 },
          { x0: 176, x1: 224, y: 1398, n: 5, sag: 6, color: '#ffd23f' },
          { x0: 150, x1: 250, y: 360, n: 9, sag: 12 },
          { x0: 150, x1: 250, y: 850, n: 9, sag: 10, color: '#fffaf0' },
        ]),
        new Neon(s, neon, bulbs),
        new Gags(s, gags()),
        new OrangeCats(s, [
          { x: 380, y: 1400, pose: 'sleep' },
          { x: 176, y: 300, pose: 'loaf' },
          { x: 64, y: 1372, pose: 'sit' },
        ]),
        new Smoke(s, [{ x: 166, y: 268 }, { x: ALTAR.x - 13, y: ALTAR.y - 32 }], 6),
        Flames.candles(s, 150, 278),
        new FireworkShow(s, MC, 90),
        new FairLive(s, {
          darts: bothAt(BOOTHS[0], BOOTH_Y),
          rings: bothAt(BOOTHS[1], BOOTH_Y),
          cork: bothAt(BOOTHS[2], BOOTH_Y),
          scoop: bothAt(BOOTHS[3], BOOTH_Y),
          bumper: { x: BUMPER.x + BUMPER.w / 2, y: BUMPER.y + 40 },
          ramwong: { x: RAMWONG.x, y: RAMWONG.y + 20 },
        }),
        new CloudShadows(s, 1),
        new Traffic(s, [
          { y: ROAD_Y + 30, dir: 1 },
          { y: ROAD_Y + 56, dir: -1 },
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 4) {
        const c = pick(CARTS)
        if (c.kind === 'lookchin' || c.kind === 'popcorn' || c.kind === 'squid' || c.kind === 'takoyaki' || c.kind === 'quail')
          if (s.onScreen(c.x, c.y, 10)) s.particles.add({ kind: 'smoke', x: c.x + rand(-6, 6), y: c.y - 28, vx: rand(-3, 3), vy: rand(-12, -6), max: 1.2, color: '#f6ecd8', size: 2 })
      }
      if (Math.random() < dt * 4 && s.onScreen(STAGE.x, STAGE.y, 20)) s.particles.add({ kind: 'sparkle', x: STAGE.x + rand(-44, 44), y: STAGE.y - rand(20, 64), vy: rand(-8, -2), max: rand(0.6, 1.2), color: pick(['#fff3a6', '#ff9fc0', '#9fd0ff']) })
      if (Math.random() < dt * 2 && s.onScreen(CONTEST.x, CONTEST.y, 20)) s.particles.add({ kind: 'sparkle', x: CONTEST.x + rand(-44, 44), y: CONTEST.y - rand(20, 60), vy: rand(-8, -2), max: 1, color: pick(['#ffffff', '#ffc0e0']) })
      // Wish tags flutter.
      if (Math.random() < dt * 1.2 && s.onScreen(WISH.x, WISH.y - 40, 20)) s.particles.add({ kind: 'petal', x: WISH.x + rand(-26, 26), y: WISH.y - rand(40, 64), vx: rand(-4, 4), vy: rand(4, 10), max: 2, color: pick(['#e8514a', '#ffd23f']), color2: '#fffaf0' })
    },
    wander: [
      { x: 178, y: 300, w: 44, h: 1150 },
      { x: 20, y: 472, w: 360, h: 20 },
      { x: 20, y: 778, w: 360, h: 16 },
      { x: 20, y: 892, w: 360, h: 16 },
      { x: 20, y: 1002, w: 360, h: 18 },
      { x: 20, y: 1154, w: 360, h: 26 },
      { x: 20, y: 1254, w: 360, h: 22 },
      { x: 20, y: 1362, w: 360, h: 26 },
    ],
    pois: [
      ...BOOTHS.map((b) => ({ x: b.x, y: BOOTH_Y + 10, face: 'up' as const })),
      ...CARTS.map((c) => ({ x: c.x, y: c.y + 10, face: 'up' as const })),
      { x: HALL.x - 10, y: 294, face: 'up' },
      { x: HALL.x + 10, y: 294, face: 'up' },
      { x: ALTAR.x + 10, y: ALTAR.y + 12, face: 'up' },
      { x: WHEEL.x + 24, y: 462, face: 'up' },
      { x: CAROUSEL.x - 30, y: 482, face: 'up' },
      { x: BUMPER.x + 40, y: BUMPER.y + BUMPER.h + 16, face: 'up' },
      { x: RAMWONG.x - 20, y: RAMWONG.y + 40, face: 'up' },
      { x: 60, y: 774, face: 'up' },
      { x: 300, y: 776, face: 'up' },
      { x: 65, y: CLAW_Y + 12, face: 'up' },
      { x: PRIZES.x, y: PRIZES.y + 12, face: 'up' },
      { x: DUNK.x + 30, y: DUNK.y + 12, face: 'up' },
      { x: RING.x, y: RING.y + 12, face: 'up' },
      { x: GHOST.x - 30, y: GHOST.y + 14, face: 'up' },
    ],
    cats: [],
    vendors: [
      { x: 30, y: BOOTH_Y - 12 },
      { x: 112, y: BOOTH_Y - 12 },
      { x: 288, y: BOOTH_Y - 12 },
      { x: 340, y: BOOTH_Y - 12 },
      { x: PRIZES.x + 14, y: PRIZES.y - 12 },
    ],
    dogs: ['mali'],
    visitors: 22,
  }
}

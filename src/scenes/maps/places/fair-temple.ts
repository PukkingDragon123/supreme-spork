// งานวัดศรีบุญดี (the temple fair) – always at night. The lit ubosot at the
// top (make merit first!), the ferris wheel and the carousel, the likay stage
// with sequinned performers and fans with money garlands, the ramwong circle,
// the game booths (fair:darts, fair:rings, fair:cork → src/activities/fair)
// and the prize booth (fair:prizes), the dunk tank with the mascot uncle, the
// haunted house, food carts, fireworks and strings of bulbs everywhere.

import type { MapDef, PlacedProp, WorldScene } from '../../world'
import type { Surface } from '../../../engine/pixel'
import { rand, pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import * as T from '../../../art/temple'
import * as G from '../../../art/garden'
import * as F from '../../../art/templeprops'
import { avatarSprite, type AvatarLook, type Pose } from '../../../art/avatar'
import { drawShadow } from '../../../art/props'
import { CloudShadows, Flames, Smoke, TapZones, Traffic, type Life } from '../../life'
import { FairLights, Gags, type Gag } from '../../gags'
import { drawGlow } from '../../sky'
import { concrete, noticeBoard, hooksAt, INK } from '../../../art/places/hub-kit'
import { dunkTank, drawBigWheel, drawCarousel, drawSeated, fairCart, fairGate, gameBooth, hauntedHouse, likayStage, ramwongFloor, ramwongTable } from '../../../art/places/fair'
import { fairSfx } from '../../../activities/fair/sound'
import { road } from '../common'
import { HippoBalloons, HubArrival, Hawkers, OrangeCats, giverGag, hs, hubChat, look, personGag, tradePairGag } from './hub-common'

const ID = 'fair_temple'
const W = 320
const H = 1120
const CX = 160
const HALL = { x: CX, y: 250 }
const WHEEL = { x: 66, y: 346, r: 44 }
const CAROUSEL = { x: 252, y: 420 }
const STAGE = { x: 70, y: 560 }
const RAMWONG = { x: 250, y: 568, rx: 50, ry: 26 }
const BOOTH_Y = 704
const BOOTHS = [
  { id: 'darts', x: 44, w: 68 },
  { id: 'rings', x: 118, w: 68 },
  { id: 'cork', x: 194, w: 68 },
  { id: 'prizes', x: 276, w: 80 },
] as const
const DUNK = { x: 60, y: 828 }
const GHOST = { x: 252, y: 846 }
const CART_Y = 930
const CARTS = [
  { kind: 'icepop', x: 40 },
  { kind: 'saimai', x: 104 },
  { kind: 'lookchin', x: 216 },
  { kind: 'popcorn', x: 280 },
] as const
const GATE = { x: CX, y: 1046 }

function bake(g: Surface, night: boolean) {
  G.treeLine(g, 64, W, G.LEAVES.far, 81)
  G.treeLine(g, 78, W, G.LEAVES.deep, 83)
  // Temple grounds: packed earth with grass edges, a paved path down the middle.
  concrete(g, 0, 92, W, 956, 23, night ? '#8a7a68' : '#c8b490', 0)
  G.lawn(g, 0, 96, 70, 180, 3)
  G.lawn(g, 250, 96, 70, 180, 5)
  for (let y = 270; y < 1040; y += 8) {
    g.rect(128, y, 64, 7, night ? '#9a8a78' : '#d8c8a8')
    g.hline(128, 191, y + 7, night ? '#7a6a5a' : '#b8a888')
  }
  // Mats for the likay audience and the eating area.
  for (let i = 0; i < 3; i++) {
    const y = 578 + i * 12
    g.rect(14, y, 112, 10, i % 2 ? '#3d63b5' : '#e8514a')
    for (let x = 14; x < 126; x += 6) g.vline(x, y, y + 9, i % 2 ? '#5a8de0' : '#ff8a70')
  }
  g.rect(40, 956, 80, 22, '#43905a')
  for (let x = 40; x < 120; x += 5) g.vline(x, 956, 977, '#6cc36a')
  g.rect(200, 956, 80, 22, '#e8514a')
  for (let x = 200; x < 280; x += 5) g.vline(x, 956, 977, '#ff8a70')
  ramwongFloor(g, RAMWONG.x, RAMWONG.y, RAMWONG.rx, RAMWONG.ry)
  // Wheel and carousel bases.
  g.ellipse(WHEEL.x, WHEEL.y + WHEEL.r + 17, 34, 7, '#6a6374')
  g.ellipse(CAROUSEL.x, CAROUSEL.y, 46, 11, '#6a6374')
  // Bulb poles along the midway (the wires are drawn by FairLights).
  for (const [x, y] of POLES) {
    g.rect(x - 1, y, 2, 40, '#5a4a4e')
    g.px(x - 1, y, '#8a7a7e')
  }
  g.rect(0, 1044, W, 3, '#bdb2ae')
  road(g, 0, 1047, W, H - 1047)
}

const POLES: [number, number][] = [
  [8, 262],
  [312, 262],
  [8, 472],
  [312, 472],
  [8, 752],
  [312, 752],
  [8, 880],
  [312, 880],
]

// ---------------------------------------------------------------------------
// Rides.

class Rides implements Life {
  private boost = 0
  private wheelT = 0
  private carT = 0
  private riders: AvatarLook[]
  constructor(private s: WorldScene) {
    this.riders = [look({}), look({ head: 'head_catears' }), look({}), look({ hand: 'hand_lookchin' })]
  }
  update(dt: number) {
    this.boost = Math.max(0, this.boost - dt)
    this.wheelT += dt * (this.boost > 0 ? 2.2 : 1)
    this.carT += dt * (this.boost > 0 ? 2 : 1)
  }
  sorted(add: (y: number, draw: () => void) => void) {
    const g = () => this.s.gfx
    if (this.s.onScreen(WHEEL.x, WHEEL.y, 70)) add(WHEEL.y + WHEEL.r + 16, () => drawBigWheel(g(), WHEEL.x, WHEEL.y, WHEEL.r, this.wheelT, this.riders))
    if (this.s.onScreen(CAROUSEL.x, CAROUSEL.y - 30, 60)) add(CAROUSEL.y, () => drawCarousel(g(), CAROUSEL.x, CAROUSEL.y, this.carT, this.riders))
  }
  glow(g: Surface, t: number, light: number) {
    if (light < 0.3) return
    if (this.s.onScreen(WHEEL.x, WHEEL.y, 60)) drawGlow(g, WHEEL.x, WHEEL.y, WHEEL.r + 10, light * 0.35, '#c8a0ff')
    if (this.s.onScreen(CAROUSEL.x, CAROUSEL.y, 60)) drawGlow(g, CAROUSEL.x, CAROUSEL.y - 40, 40, light * 0.4, '#ffcf7a')
    void t
  }
  tap(x: number, y: number): boolean {
    if (Math.hypot(x - WHEEL.x, y - WHEEL.y) < WHEEL.r + 6) {
      this.boost = 3
      this.s.say(pick(['ชิงช้าสวรรค์หมุนเร็วขึ้น!', 'ว้าย วิวสวยมาก!', 'มองเห็นหลังคาโบสถ์เลย', 'กลัวความสูงงง']), WHEEL.x, WHEEL.y - WHEEL.r - 12, 2.2)
      sfx.whoosh()
      return true
    }
    if (Math.abs(x - CAROUSEL.x) < 44 && y > CAROUSEL.y - 66 && y < CAROUSEL.y + 4) {
      this.boost = 3
      this.s.say(pick(['ม้าหมุนจ้า~ รอบละสิบบาท', 'ย้าาา สนุก!', 'แม่ขาถ่ายรูปหนูด้วย!']), CAROUSEL.x, CAROUSEL.y - 70, 2.2)
      for (let i = 0; i < 4; i++) this.s.particles.add({ kind: 'sparkle', x: CAROUSEL.x + rand(-30, 30), y: CAROUSEL.y - 40, vy: rand(-14, -6), max: 1.2, color: pick(['#ff6f91', '#ffd23f', '#6cf0c0']) })
      sfx.chime()
      return true
    }
    return false
  }
}

/** The likay audience on mats and the ramwong dancers circling the flower table. */
class Crowd implements Life {
  private fans: { lk: AvatarLook; x: number; y: number }[]
  private dancers: { lk: AvatarLook; a: number }[]
  private hype = 0
  constructor(private s: WorldScene) {
    this.fans = [
      { lk: look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_floral', neck: 'neck_money_garland', hand: 'hand_fan' }), x: 30, y: 586 },
      { lk: look({ gender: 'f', hair: 'hair_bob', hairColor: 6, top: 'top_lace', hand: 'hand_fan' }), x: 52, y: 588 },
      { lk: look({ gender: 'm', hair: 'hair_buzz', hairColor: 6, top: 'top_mohom' }), x: 76, y: 586 },
      { lk: look({ gender: 'f', hair: 'hair_long', top: 'top_tee_white' }), x: 100, y: 588 },
      { lk: look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_thaisilk', neck: 'neck_money_garland' }), x: 40, y: 600 },
      { lk: look({ gender: 'm', hair: 'hair_short', top: 'top_tee_boon' }), x: 88, y: 600 },
      { lk: look({ gender: 'f', hair: 'hair_twin', top: 'top_pe' }), x: 112, y: 602 },
    ]
    this.dancers = Array.from({ length: 8 }, (_, i) => ({
      lk: look(i % 2 ? { gender: 'f', top: pick(['top_sabai', 'top_thaisilk', 'top_lace']), bottom: 'bot_sin_mudmee' } : { gender: 'm', top: pick(['top_raj', 'top_mohom', 'top_phraratchathan']), bottom: 'bot_khaki' }),
      a: (i / 8) * Math.PI * 2,
    }))
  }
  update(dt: number) {
    this.hype = Math.max(0, this.hype - dt)
    for (const d of this.dancers) d.a += dt * (this.hype > 0 ? 0.5 : 0.22)
    if (Math.random() < dt * 0.8 && this.s.onScreen(RAMWONG.x, RAMWONG.y, 20)) {
      this.s.particles.add({ kind: 'sparkle', x: RAMWONG.x + rand(-40, 40), y: RAMWONG.y - 30 + rand(-6, 6), vy: rand(-10, -5), max: 1.2, color: pick(['#fff3a6', '#ff9fc0', '#9fd0ff']) })
    }
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    const g = () => this.s.gfx
    if (this.s.onScreen(STAGE.x, 590, 40)) for (const f of this.fans) add(f.y, () => drawSeated(g(), f.lk, f.x, f.y, t + f.x, this.hype > 0 || Math.floor(t * 0.4 + f.x) % 5 === 0))
    if (!this.s.onScreen(RAMWONG.x, RAMWONG.y, 60)) return
    for (const d of this.dancers) {
      const x = RAMWONG.x + Math.cos(d.a) * 36
      const y = RAMWONG.y + Math.sin(d.a) * 16
      add(y, () => {
        // Circling counter-clockwise; hands flick between the two ramwong gestures.
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
      this.s.say(pick(['รำวงมาแล้วจ้า~', 'เร็วขึ้นอีก! ตึ่ง ตึ่ง!', 'ใครจะมารำด้วยกัน!', 'รำวงวันลอยกระทง~']), RAMWONG.x, RAMWONG.y - 40, 2.2)
      sfx.bell(3)
      return true
    }
    if (x > 10 && x < 130 && y > 574 && y < 606) {
      this.hype = 3
      this.s.say(pick(['กรี๊ดดด พระเอก!', 'แม่ยกมาแล้วจ้า!', 'คล้องมาลัยให้พระเอกหน่อย', 'เสียงดีมากกก']), x, y - 30, 2)
      sfx.sparkle()
      return true
    }
    return false
  }
}

/** Fireworks over the temple now and then. */
class Fireworks implements Life {
  private next = rand(4, 8)
  constructor(private s: WorldScene) {}
  update(dt: number) {
    this.next -= dt
    if (this.next > 0) return
    this.next = rand(10, 22)
    if (this.s.camY > 260) return
    const x = rand(30, W - 30)
    const y = rand(20, 70)
    const c = pick(['#ff6f91', '#ffd23f', '#6cf0c0', '#9fd0ff', '#c8a0ff'])
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2
      const v = rand(26, 38)
      this.s.particles.add({ kind: 'sparkle', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 18, max: rand(1, 1.6), color: i % 3 ? c : '#fff3a6', drag: 1.4 })
    }
    sfx.sparkle()
  }
}

/** The dunk tank: hit the target and the mascot uncle drops into the water. */
class DunkTank implements Life {
  private fall = 0
  private ball: { t: number } | null = null
  private next = rand(8, 14)
  private uncle = look({ gender: 'm', suit: 'suit_chicken' })
  constructor(
    private s: WorldScene,
    private seat: { x: number; y: number },
    private target: { x: number; y: number },
  ) {}
  private throwBall() {
    this.ball = { t: 0 }
    sfx.whoosh()
  }
  update(dt: number) {
    if (this.fall > 0) {
      this.fall -= dt
      if (this.fall <= 0 && this.s.onScreen(this.seat.x, this.seat.y, 0)) this.s.say(pick(['ลุงกลับมาแล้ว! ปาอีกได้!', 'เปียกหมดเลย 555', 'ไม่หนาวหรอก (สั่น)']), this.seat.x, this.seat.y - 36, 2)
    }
    if (this.ball) {
      this.ball.t += dt * 1.6
      if (this.ball.t >= 1) {
        this.ball = null
        this.fall = 3
        for (let i = 0; i < 14; i++) this.s.particles.add({ kind: 'drop', x: this.seat.x + rand(-10, 10), y: this.seat.y + 6, vx: rand(-30, 30), vy: rand(-50, -20), g: 90, max: 0.9, color: '#c8ecf8' })
        if (this.s.onScreen(this.seat.x, this.seat.y, 0)) this.s.say(pick(['ลุงเป็ดตกน้ำอีกแล้ววว!', 'จ๋อมมม!', 'ลุงไม่ได้เป็นเป็ดนะ เป็นไก่!']), this.seat.x, this.seat.y - 30, 2.2)
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
      if (falling) {
        // Water up to his chest, bubbles.
        g.alpha(0.75)
        g.rect(this.seat.x - 13, this.seat.y + 4, 30, 24, '#9fd8f0')
        g.alpha(1)
        if (Math.floor(t * 6) % 2) g.px(this.seat.x + 4, this.seat.y - 2, '#ffffff')
      }
      if (this.ball) {
        const k = this.ball.t
        const bx = this.target.x + 30 - k * 30
        const by = this.target.y + 36 - Math.sin(k * Math.PI) * 26 - k * 36
        g.circle(Math.round(bx), Math.round(by), 2, '#ffd23f')
        g.px(Math.round(bx) - 1, Math.round(by) - 1, '#ffffff')
      }
      void INK
    })
  }
  tap(x: number, y: number): boolean {
    if (Math.abs(x - DUNK.x) > 30 || y < DUNK.y - 56 || y > DUNK.y + 2) return false
    if (!this.ball && this.fall <= 0) {
      this.throwBall()
      this.s.say(pick(['ปาเลย! ให้ลุงตกน้ำ!', 'เล็งเป้าแดงนะ!', 'ลุงไม่กลัวหรอก~']), DUNK.x, DUNK.y - 60, 1.8)
    }
    return true
  }
}

/** The haunted house: now and then a (very polite) ghost pops out and a visitor bolts. */
class Haunted implements Life {
  private pop = 0
  private next = rand(6, 12)
  constructor(
    private s: WorldScene,
    private door: { x: number; y: number },
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
    this.s.say(pick(['แฮ่!!!', 'บู้ววว~', 'ขอโทษที่ทำให้ตกใจนะ (ผีสุภาพ)']), this.door.x, this.door.y - 40, 1.8)
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
      // A sheet ghost with a wobbly hem.
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
    if (Math.abs(x - GHOST.x) > 46 || y < GHOST.y - 80 || y > GHOST.y + 2) return false
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
  const kid1 = look({ gender: 'f', hair: 'hair_twin', top: 'top_tee_boon', bottom: 'bot_pinkskirt' })
  const kid2 = look({ gender: 'm', hair: 'hair_short', top: 'top_tee_hiw', bottom: 'bot_denim_shorts' })
  const balloonMan = look({ gender: 'm', hair: 'hair_buzz', hairColor: 6, top: 'top_mohom', bottom: 'bot_fisherman' })
  const sequins = (g: Surface, p: { x: number; y: number; t: number }) => {
    for (let i = 0; i < 3; i++) {
      if ((Math.floor(p.t * 6) + i) % 3) continue
      g.px(p.x - 4 + i * 4, p.y - 14 - (i % 2) * 4, '#fff3a6')
    }
  }
  return [
    giverGag(mc, 156, 750, ['เทสต์ ๆ หนึ่งสองสาม!', 'ยินดีต้อนรับสู่งานวัดศรีบุญดีครับ!', 'ซุ้มเกมเปิดแล้ว ไปเล่นกันเลย!'], {
      over: (g, p) => {
        g.rect(p.x + 4, p.y - 18, 2, 4, '#3a3040')
        g.px(p.x + 4, p.y - 19, '#8c8187')
      },
    }),
    giverGag(hero, 148, 606, ['โอ้ละหนอ~ แม่ยกคนงาม', 'พระเอกลิเกคณะดาวเลื่อมครับ', 'ช่วยเป็นกำลังใจให้พี่หน่อย'], { over: sequins }),
    personGag(heroine, STAGE.x - 26, STAGE.y - 8, ['โอ้ละหนอ พี่จ๋า~', 'น้องรอพี่มาทั้งคืน', 'ร้องเพลงลิเกให้ฟัง~'], { z: 12, over: sequins, walk: { x0: STAGE.x - 40, x1: STAGE.x - 10, speed: 5 } }),
    personGag(villain, STAGE.x + 28, STAGE.y - 8, ['ฮ่า ฮ่า ฮ่า! ข้าคือยักษ์!', 'ยอมแพ้ซะดี ๆ', '(ยักษ์ใจดีนะจริง ๆ)'], { z: 12, view: 'front', walk: { x0: STAGE.x + 10, x1: STAGE.x + 44, speed: 6 } }),
    personGag(barker, 212, 858, ['กล้าเข้าไหม~ ผีบ้านสุดสยอง!', 'คนละยี่สิบ ถ้ากรี๊ดไม่คืนเงิน!', 'ผีในบ้านใจดีนะ (มั้ง)'], { view: 'front' }),
    personGag(kid1, 150, 880, ['สายไหมติดผมอีกแล้ว!', 'แม่ขา ซื้อไอติมหลอด!', 'ตั๋วหนูได้ห้าใบแล้ว!'], {
      walk: { x0: 136, x1: 186, speed: 18 },
      over: (g, p) => {
        g.vline(p.x + 5, p.y - 22, p.y - 12, '#e0c080')
        g.circle(p.x + 5, p.y - 24, 4, '#ff9fc0')
      },
    }),
    personGag(kid2, 184, 488, ['ขึ้นชิงช้าสวรรค์ต่อ!', 'ม้าหมุนอีกรอบนะแม่', 'ปาลูกโป่งโดนสามลูก!'], { walk: { x0: 132, x1: 196, speed: 14 } }),
    personGag(balloonMan, 58, 1000, ['ลูกโป่งหมูดึ๋งจ้า!', 'ลูกโป่งฮิปโปลอยได้!', 'ผูกข้อมือไว้นะหนู'], { view: 'front' }),
    tradePairGag(236, 626, { hair: 'hair_bob', top: 'top_tee_black' }, { hair: 'hair_ponytail', top: 'top_hoodie_over' }, ['แลกปลาทองกับพวงกุญแจผีไหม', 'ได้ตั๋วตั้งแปดใบ! 🎟️', 'ดีลลล 🤝']),
  ]
}

export function fairMap(): MapDef {
  const hall = T.hallSprite({ roof: T.ROOF.orange, roof2: T.ROOF.red })
  const hallN = T.hallSprite({ roof: T.ROOF.orange, roof2: T.ROOF.red, night: true })
  const stage = likayStage()
  const dunk = dunkTank()
  const ghost = hauntedHouse()
  const gate = fairGate()
  const board = noticeBoard('fair', '#c8343f')
  const booths = BOOTHS.map((b) => ({ ...b, sprite: gameBooth(b.id) }))
  const lamp = F.thaiLampSprite(true)
  const LAMPS: [number, number][] = [
    [120, 272],
    [200, 272],
    [120, 1010],
    [200, 1010],
  ]
  const seat = hooksAt(dunk, 'seat', DUNK.x, DUNK.y)[0]
  const target = hooksAt(dunk, 'target', DUNK.x, DUNK.y)[0]
  const props: PlacedProp[] = [
    { sprite: hall, night: hallN, x: HALL.x, y: HALL.y, z: -28 },
    { sprite: F.urnSprite(), x: 126, y: 280, shadow: [10, 2] },
    { sprite: F.donationSprite(), x: 206, y: 276, shadow: [6, 2] },
    { sprite: F.candleStandSprite(), x: 110, y: 276 },
    { sprite: G.frangipani(0), x: 30, y: 250 },
    { sprite: G.frangipani(1), x: 294, y: 246 },
    { sprite: stage, x: STAGE.x, y: STAGE.y },
    { sprite: ramwongTable(), x: RAMWONG.x, y: RAMWONG.y + 4 },
    ...booths.map((b) => ({ sprite: b.sprite, x: b.x, y: BOOTH_Y })),
    { sprite: dunk, x: DUNK.x, y: DUNK.y },
    { sprite: ghost, x: GHOST.x, y: GHOST.y },
    ...CARTS.map((c) => ({ sprite: fairCart(c.kind), x: c.x, y: CART_Y })),
    { sprite: board, x: 262, y: 1010, shadow: [12, 3] },
    { sprite: gate, x: GATE.x, y: GATE.y },
    ...LAMPS.map(([x, y]) => ({ sprite: lamp, x, y })),
  ]
  const bulbs = [
    ...hooksAt(gate, 'bulbs', GATE.x, GATE.y),
    ...booths.flatMap((b) => hooksAt(b.sprite, 'bulbs', b.x, BOOTH_Y)),
    ...hooksAt(stage, 'bulbs', STAGE.x, STAGE.y),
  ]
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
      { x: 82, y: 110, w: 156, h: 114 },
      { x: 82, y: 224, w: 66, h: 17 },
      { x: 172, y: 224, w: 66, h: 17 },
      { x: 132, y: 238, w: 11, h: 12 },
      { x: 177, y: 238, w: 11, h: 12 },
      { x: 116, y: 272, w: 20, h: 9 },
      { x: 199, y: 268, w: 14, h: 9 },
      { x: 104, y: 270, w: 12, h: 7 },
      { x: 27, y: 246, w: 6, h: 5 },
      { x: 291, y: 242, w: 6, h: 5 },
      // Rides.
      { x: WHEEL.x - 32, y: WHEEL.y + WHEEL.r + 4, w: 64, h: 16 },
      { x: CAROUSEL.x - 44, y: CAROUSEL.y - 14, w: 88, h: 18 },
      // Stage, ramwong table.
      { x: 8, y: STAGE.y - 60, w: 124, h: 61 },
      { x: RAMWONG.x - 12, y: RAMWONG.y - 4, w: 24, h: 9 },
      // Booths.
      ...BOOTHS.map((b) => ({ x: b.x - b.w / 2, y: BOOTH_Y - 44, w: b.w, h: 45 })),
      { x: DUNK.x - 28, y: DUNK.y - 36, w: 60, h: 37 },
      { x: GHOST.x - 48, y: GHOST.y - 56, w: 96, h: 57 },
      ...CARTS.map((c) => ({ x: c.x - 18, y: CART_Y - 14, w: 36, h: 15 })),
      { x: 248, y: 1000, w: 28, h: 11 },
      { x: GATE.x - 58, y: GATE.y - 6, w: 12, h: 7 },
      { x: GATE.x + 46, y: GATE.y - 6, w: 12, h: 7 },
      { x: 0, y: 1040, w: GATE.x - 58, h: 80 },
      { x: GATE.x + 58, y: 1040, w: W - GATE.x - 58, h: 80 },
      { x: 0, y: 1047, w: W, h: H - 1047 },
      ...POLES.map(([x, y]) => ({ x: x - 2, y: y + 36, w: 4, h: 4 })),
      ...LAMPS.map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 4 })),
    ],
    hotspots: [
      { id: 'hall', label: 'อุโบสถวัดศรีบุญดี', hint: 'กราบพระก่อนเที่ยวงาน สวดมนต์ ปิดทอง', icon: 'temple', rect: { x: 88, y: 100, w: 144, h: 150 }, at: { x: HALL.x, y: HALL.y + 6 }, face: 'up', marker: { x: HALL.x + 1, y: 84 }, beacon: true, near: 16 },
      hs('donation', 'ตู้ทำบุญงานวัด', 'ร่วมทำบุญบำรุงวัด', 'coin', { x: 198, y: 250, w: 16, h: 28 }, { x: 206, y: 290 }, { marker: { x: 206, y: 248 } }),
      hs('fair:darts', 'ซุ้มปาลูกโป่ง', 'ปาลูกดอกให้โดนลูกโป่ง รับตั๋วแลกของรางวัล', 'sparkle', { x: 12, y: BOOTH_Y - 60, w: 64, h: 60 }, { x: 44, y: BOOTH_Y + 10 }, { marker: { x: 44, y: BOOTH_Y - 64 } }),
      hs('fair:rings', 'ซุ้มโยนห่วง', 'โยนห่วงให้คล้องคอขวด รับตั๋วแลกของรางวัล', 'gift', { x: 86, y: BOOTH_Y - 60, w: 64, h: 60 }, { x: 118, y: BOOTH_Y + 10 }, { marker: { x: 118, y: BOOTH_Y - 64 } }),
      hs('fair:cork', 'ซุ้มยิงปืนจุก', 'ยิงจุกให้ของตกจากชั้น รับตั๋วแลกของรางวัล', 'star', { x: 162, y: BOOTH_Y - 60, w: 64, h: 60 }, { x: 194, y: BOOTH_Y + 10 }, { marker: { x: 194, y: BOOTH_Y - 64 } }),
      hs('fair:prizes', 'ซุ้มแลกของรางวัล', 'เอาตั๋วมาแลกตุ๊กตา ปลาทอง ของสะสมงานวัด', 'gift', { x: 238, y: BOOTH_Y - 60, w: 76, h: 60 }, { x: 276, y: BOOTH_Y + 10 }, { marker: { x: 276, y: BOOTH_Y - 64 } }),
      ...CARTS.map((c) =>
        hs(
          `shop:fair_temple_${c.kind}`,
          { icepop: 'ไอติมหลอดลุงชื่น', saimai: 'สายไหมป้าจุก', lookchin: 'ลูกชิ้นทอดพี่หนุ่ม', popcorn: 'ข้าวโพดคั่วเฮียป๊อก' }[c.kind],
          { icepop: 'ไอติมหลอดสีสด หลอดละสิบ', saimai: 'สายไหมฟูเท่าหัว', lookchin: 'ลูกชิ้นทอดไม้ใหญ่ น้ำจิ้มเด็ด', popcorn: 'ข้าวโพดคั่วคาราเมล' }[c.kind],
          c.kind === 'lookchin' ? 'curry' : 'dessert',
          { x: c.x - 18, y: CART_Y - 44, w: 36, h: 44 },
          { x: c.x, y: CART_Y + 10 },
          { marker: { x: c.x, y: CART_Y - 46 } },
        ),
      ),
      hs('npc:fair_mc', 'พี่โบ๊ท', 'พิธีกรงานวัด · สายเกม', 'friends', { x: 148, y: 720, w: 16, h: 32 }, { x: 156, y: 764 }, { marker: { x: 156, y: 708 }, near: 14 }),
      hs('npc:fair_likay', 'พระเอกเพชร', 'พระเอกลิเกคณะดาวเลื่อม', 'friends', { x: 140, y: 576, w: 16, h: 32 }, { x: 148, y: 620 }, { marker: { x: 148, y: 564 }, near: 14 }),
      hs(`board:${ID}`, 'บอร์ดงานวัด', 'ตารางการแสดงคืนนี้ · ตั๋วของฉัน · ใครตามหาอะไร', 'scroll', { x: 246, y: 976, w: 32, h: 34 }, { x: 262, y: 1022 }, { marker: { x: 262, y: 974 } }),
      hs('gate', 'ซุ้มทางออกงานวัด', 'กลับบ้าน หรือไปที่อื่น', 'map', { x: GATE.x - 30, y: GATE.y - 66, w: 60, h: 68 }, { x: GATE.x, y: GATE.y - 8 }, { face: 'down', marker: { x: GATE.x, y: GATE.y - 72 }, near: 12 }),
    ],
    spawn: { x: GATE.x, y: 1020, face: 'up' },
    entries: {},
    pickupSpots: [
      { x: 40, y: 290 },
      { x: 280, y: 300 },
      { x: 170, y: 420 },
      { x: 30, y: 640 },
      { x: 180, y: 640 },
      { x: 150, y: 800 },
      { x: 120, y: 860 },
      { x: 170, y: 990 },
    ],
    lights: [
      { x: HALL.x, y: 212, r: 40, color: '#ffcf7a' },
      { x: HALL.x - 57, y: 214, r: 12 },
      { x: HALL.x + 57, y: 214, r: 12 },
      ...LAMPS.map(([x, y]) => ({ x, y: y - 29, r: 22 })),
      { x: STAGE.x, y: STAGE.y - 40, r: 50, color: '#ff9fc0' },
      { x: STAGE.x, y: STAGE.y - 10, r: 34, color: '#fff3a6' },
      { x: RAMWONG.x, y: RAMWONG.y - 10, r: 46, color: '#ffcf7a' },
      ...BOOTHS.map((b) => ({ x: b.x, y: BOOTH_Y - 30, r: 30, color: '#fff3a6' })),
      { x: GHOST.x, y: GHOST.y - 40, r: 30, color: '#c8ff8a' },
      { x: DUNK.x, y: DUNK.y - 20, r: 24, color: '#9fd8f0' },
      ...CARTS.map((c) => ({ x: c.x, y: CART_Y - 22, r: 18, color: '#ffe7a8' })),
      { x: GATE.x, y: GATE.y - 50, r: 44, color: '#fff3a6' },
      ...bulbs.filter((_, i) => i % 4 === 0).map((p) => ({ x: p.x, y: p.y, r: 6, color: '#ffd6a0' })),
    ],
    remoteChat: hubChat(ID),
    life(s) {
      return [
        new HubArrival(s),
        new Rides(s),
        new Crowd(s),
        new Fireworks(s),
        new DunkTank(s, seat, target),
        new Haunted(s, hooksAt(ghost, 'door', GHOST.x, GHOST.y)[0]),
        new FairLights(s, [
          { x0: 8, y0: 264, x1: 312, y1: 264, n: 30, sag: 14 },
          { x0: 8, y0: 474, x1: 312, y1: 474, n: 30, sag: 16 },
          { x0: 200, y0: 520, x1: 300, y1: 522, n: 12, sag: 6 },
          { x0: 8, y0: 754, x1: 312, y1: 754, n: 30, sag: 14 },
          { x0: 8, y0: 882, x1: 312, y1: 882, n: 30, sag: 12 },
          { x0: 8, y0: 264, x1: 8, y1: 474, n: 12, sag: 0 },
          { x0: 312, y0: 264, x1: 312, y1: 474, n: 12, sag: 0 },
        ]),
        new Gags(s, gags()),
        new HippoBalloons(s, [
          { x: 66, y: 1004 },
          { x: 70, y: 1006, color: '#ff9fc0' },
          { x: 74, y: 1004, color: '#9fd0ff' },
          { x: 62, y: 1006, color: '#ffe27a' },
        ]),
        new OrangeCats(s, [
          { x: 290, y: 956, pose: 'sleep' },
          { x: 134, y: 300, pose: 'loaf' },
        ]),
        new Hawkers(s, [
          { x: 40, y: CART_Y - 30, lines: ['ไอติมหลอดจ้า หลอดละสิบ!', 'เย็น ๆ ชื่นใจ~'] },
          { x: 104, y: CART_Y - 30, lines: ['สายไหมจ้า สายไหม!', 'ฟูเท่าหัวเลย'] },
          { x: 216, y: CART_Y - 30, lines: ['ลูกชิ้นทอดจ้า!', 'น้ำจิ้มเผ็ดน้อยเผ็ดมาก'] },
          { x: 280, y: CART_Y - 30, lines: ['ข้าวโพดคั่วร้อน ๆ', 'ป๊อก ๆ ๆ!'] },
          ...BOOTHS.map((b) => ({ x: b.x, y: BOOTH_Y - 50, lines: b.id === 'prizes' ? ['ตั๋วครบแลกได้เลย!', 'หมีตัวยักษ์เหลือตัวสุดท้าย!'] : ['มาเล่นจ้า รอบแรกฟรี!', 'โดนสามลูกได้ตั๋วเพียบ!', 'ลองมือหน่อยไหม~'] })),
          { x: STAGE.x, y: STAGE.y - 60, lines: ['โอ้ละหนอ~', 'ตอนต่อไป เจ้าชายนกยูงทอง!', 'ปรบมือหน่อยค้าบบ'] },
        ]),
        new Smoke(s, [{ x: 126, y: 266 }], 6),
        Flames.candles(s, 110, 276),
        new CloudShadows(s, 1),
        new Traffic(s, [
          { y: 1076, dir: 1 },
          { y: 1102, dir: -1 },
        ]),
        new TapZones([
          {
            rect: { x: 0, y: 0, w: W, h: 70 },
            fn: (x, y) => {
              const c = pick(['#ff6f91', '#ffd23f', '#6cf0c0', '#9fd0ff'])
              for (let i = 0; i < 18; i++) {
                const a = (i / 18) * Math.PI * 2
                s.particles.add({ kind: 'sparkle', x, y, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, g: 18, max: 1.2, color: c, drag: 1.4 })
              }
              sfx.sparkle()
            },
          },
        ]),
      ]
    },
    ambient(s, dt) {
      if (Math.random() < dt * 3) {
        const c = pick(CARTS)
        if (c.kind === 'lookchin' || c.kind === 'popcorn') s.particles.add({ kind: 'smoke', x: c.x + rand(-6, 6), y: CART_Y - 26, vx: rand(-3, 3), vy: rand(-12, -6), max: 1.2, color: '#f6ecd8', size: 2 })
      }
      // Stage glitter.
      if (Math.random() < dt * 4 && s.onScreen(STAGE.x, STAGE.y, 20)) s.particles.add({ kind: 'sparkle', x: STAGE.x + rand(-40, 40), y: STAGE.y - rand(20, 60), vy: rand(-8, -2), max: rand(0.6, 1.2), color: pick(['#fff3a6', '#ff9fc0', '#9fd0ff']) })
    },
    wander: [
      { x: 130, y: 290, w: 60, h: 720 },
      { x: 30, y: 620, w: 280, h: 40 },
      { x: 20, y: 440, w: 100, h: 20 },
      { x: 180, y: 450, w: 120, h: 20 },
      { x: 20, y: 770, w: 280, h: 30 },
      { x: 20, y: 960, w: 280, h: 30 },
    ],
    pois: [
      ...BOOTHS.map((b) => ({ x: b.x, y: BOOTH_Y + 10, face: 'up' as const })),
      ...CARTS.map((c) => ({ x: c.x, y: CART_Y + 10, face: 'up' as const })),
      { x: HALL.x - 10, y: 290, face: 'up' },
      { x: HALL.x + 10, y: 290, face: 'up' },
      { x: 60, y: 618, face: 'up' },
      { x: 100, y: 620, face: 'up' },
      { x: RAMWONG.x - 10, y: 604, face: 'up' },
      { x: WHEEL.x + 20, y: 440, face: 'up' },
      { x: CAROUSEL.x - 30, y: 440, face: 'up' },
      { x: DUNK.x + 30, y: DUNK.y + 10, face: 'up' },
      { x: GHOST.x - 30, y: GHOST.y + 12, face: 'up' },
    ],
    cats: [],
    vendors: [
      { x: 30, y: BOOTH_Y - 12 },
      { x: 104, y: BOOTH_Y - 12 },
      { x: 208, y: BOOTH_Y - 12 },
      { x: 290, y: BOOTH_Y - 12 },
    ],
    dogs: ['mali'],
    visitors: 12,
  }
}

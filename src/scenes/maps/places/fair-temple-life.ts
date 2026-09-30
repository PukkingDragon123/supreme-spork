// Moving, tappable things of the temple fair map (fair-temple.ts): the rides,
// the bumper cars, the boxing booth, the funny beauty contest, the food-cart
// vendors, balloons that pop, swaying lanterns, the glowing (lit) layers,
// the scheduled fireworks and the live hooks for other real players.

import type { Color, Surface } from '../../../engine/pixel'
import { rand, pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import { avatarSprite, type AvatarLook, type Pose } from '../../../art/avatar'
import { catPoseSprite } from '../../../art/characters'
import { drawShadow } from '../../../art/props'
import type { Life } from '../../life'
import type { WorldScene } from '../../world'
import { drawGlow } from '../../sky'
import { INK, mix, type HubProp, type Pt } from '../../../art/places/hub-kit'
import { BULBS } from '../../../art/places/fair'
import { BUMPER_COLS, drawBumperCar, drawCarouselBody, drawCarouselLights, drawPoleSpark, drawWheelBody, drawWheelLights } from '../../../art/places/fair-rides'
import { FireworkSky } from '../../../art/places/fair-fireworks'
import { fairSfx } from '../../../activities/fair/sound'
import { fireworksAt, showPlan, type Burst } from '../../../activities/fair/schedule'
import { ensureFairNet, onFairScore, type LiveScore } from '../../../activities/fair/live'
import { FAIR_GAMES } from '../../../game/hubs'
import { grantCollectible, ownedCount } from '../../../game/collectibles'
import { mapId, mode } from '../../../ui/store'
import { drawHippoBalloon, look } from './hub-common'

const live = (s: WorldScene) => mode.value === 'world' && mapId.value === s.map.id

// ---------------------------------------------------------------------------
// Ferris wheel and carousel.

export class Rides implements Life {
  private boost = 0
  private bob = 1
  private wheelA = 0
  private carA = 0
  private mode = 0
  private modeT = 0
  private riders: AvatarLook[]
  constructor(
    private s: WorldScene,
    private wheel: { x: number; y: number; r: number },
    private car: { x: number; y: number },
  ) {
    this.riders = [look({}), look({ head: 'head_catears' }), look({}), look({ hand: 'hand_lookchin' })]
  }
  update(dt: number) {
    this.boost = Math.max(0, this.boost - dt)
    this.bob += (1 - this.bob) * Math.min(1, dt * 0.8)
    this.wheelA += dt * 0.16 * (this.boost > 0 ? 2.4 : 1)
    this.carA += dt * 0.55 * (this.boost > 0 ? 1.8 : 1)
    this.modeT += dt
    if (this.modeT > 7) {
      this.modeT = 0
      this.mode++
    }
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    const { x, y, r } = this.wheel
    if (this.s.onScreen(x, y, r + 30)) add(y + r + 18, () => drawWheelBody(this.s.gfx, x, y, r, this.wheelA, t, { riders: this.riders }))
    if (this.s.onScreen(this.car.x, this.car.y - 34, 64)) add(this.car.y, () => drawCarouselBody(this.s.gfx, this.car.x, this.car.y, this.carA, t, { riders: this.riders, bob: this.bob }))
  }
  glow(g: Surface, t: number, light: number) {
    if (light < 0.3) return
    const { x, y, r } = this.wheel
    if (this.s.onScreen(x, y, r + 30)) {
      drawGlow(g, x, y, r + 16, light * 0.3, ['#c8a0ff', '#ff9fc0', '#9fd0ff', '#ffe27a'][this.mode % 4])
      drawWheelLights(g, x, y, r, this.wheelA, t, this.mode)
    }
    if (this.s.onScreen(this.car.x, this.car.y - 34, 64)) {
      drawGlow(g, this.car.x, this.car.y - 40, 44, light * 0.4, '#ffcf7a')
      drawCarouselLights(g, this.car.x, this.car.y, t)
    }
  }
  tap(px: number, py: number): boolean {
    const { x, y, r } = this.wheel
    if (Math.hypot(px - x, py - y) < r + 8) {
      this.boost = 3
      this.mode++
      this.s.say(pick(['ชิงช้าสวรรค์หมุนเร็วขึ้น!', 'ว้าย วิวสวยมาก!', 'มองเห็นหลังคาโบสถ์เลย', 'กลัวความสูงงง', 'ไฟเปลี่ยนสีด้วย!']), x, y - r - 10, 2.2)
      sfx.whoosh()
      return true
    }
    if (Math.abs(px - this.car.x) < 46 && py > this.car.y - 70 && py < this.car.y + 4) {
      this.boost = 3
      this.bob = 2.8
      this.s.say(pick(['ม้าหมุนเด้งดึ๋ง!', 'ย้าาา สนุก!', 'แม่ขาถ่ายรูปหนูด้วย!', 'ม้าขาวตัวนั้นของหนู!']), this.car.x, this.car.y - 74, 2.2)
      for (let i = 0; i < 6; i++) this.s.particles.add({ kind: 'sparkle', x: this.car.x + rand(-34, 34), y: this.car.y - 40, vy: rand(-16, -6), max: 1.2, color: pick(['#ff6f91', '#ffd23f', '#6cf0c0']) })
      sfx.chime()
      return true
    }
    return false
  }
}

// ---------------------------------------------------------------------------
// Bumper cars bonking about in their arena.

interface Car {
  x: number
  y: number
  vx: number
  vy: number
  ang: number
  tx: number
  ty: number
  color: Color
  driver: AvatarLook
  golden: boolean
}

export class Bumpers implements Life {
  private cars: Car[]
  private say = 0
  constructor(
    private s: WorldScene,
    private box: { x: number; y: number; w: number; h: number },
  ) {
    this.cars = Array.from({ length: 6 }, (_, i) => {
      const x = box.x + 16 + ((i * 37) % (box.w - 32))
      const y = box.y + 20 + ((i * 23) % (box.h - 30))
      return { x, y, vx: rand(-20, 20), vy: rand(-12, 12), ang: rand(0, 6), tx: x, ty: y, color: BUMPER_COLS[i % BUMPER_COLS.length], driver: look(i === 2 ? { head: 'head_helmet_cute' } : i === 4 ? { head: 'head_catears' } : {}), golden: i === 5 }
    })
  }
  update(dt: number) {
    const b = this.box
    this.say = Math.max(0, this.say - dt)
    const vis = this.s.onScreen(b.x + b.w / 2, b.y + b.h / 2, 60)
    for (const c of this.cars) {
      if (Math.hypot(c.tx - c.x, c.ty - c.y) < 8 || Math.random() < dt * 0.3) {
        c.tx = rand(b.x + 12, b.x + b.w - 12)
        c.ty = rand(b.y + 16, b.y + b.h - 6)
      }
      const dx = c.tx - c.x
      const dy = c.ty - c.y
      const d = Math.hypot(dx, dy) || 1
      c.vx += (dx / d) * 40 * dt
      c.vy += (dy / d) * 26 * dt
      const sp = Math.hypot(c.vx, c.vy)
      const max = c.golden ? 34 : 28
      if (sp > max) {
        c.vx *= max / sp
        c.vy *= max / sp
      }
      c.x += c.vx * dt
      c.y += c.vy * dt
      if (sp > 3) c.ang = Math.atan2(c.vy, c.vx)
      if (c.x < b.x + 11 || c.x > b.x + b.w - 11) {
        c.vx = -c.vx * 0.8
        c.x = Math.max(b.x + 11, Math.min(b.x + b.w - 11, c.x))
      }
      if (c.y < b.y + 14 || c.y > b.y + b.h - 4) {
        c.vy = -c.vy * 0.8
        c.y = Math.max(b.y + 14, Math.min(b.y + b.h - 4, c.y))
      }
    }
    for (let i = 0; i < this.cars.length; i++)
      for (let j = i + 1; j < this.cars.length; j++) {
        const a = this.cars[i]
        const c = this.cars[j]
        const dx = c.x - a.x
        const dy = (c.y - a.y) * 1.6
        const d = Math.hypot(dx, dy)
        if (d >= 17 || d === 0) continue
        const nx = dx / d
        const ny = dy / d
        const rel = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny
        const push = (17 - d) / 2
        a.x -= nx * push
        a.y -= (ny * push) / 1.6
        c.x += nx * push
        c.y += (ny * push) / 1.6
        if (rel > 0) {
          a.vx -= rel * nx * 1.1
          a.vy -= rel * ny * 1.1
          c.vx += rel * nx * 1.1
          c.vy += rel * ny * 1.1
          if (vis && rel > 14) {
            const mx = (a.x + c.x) / 2
            const my = (a.y + c.y) / 2 - 6
            this.s.particles.sparkles(mx, my, 5, '#fff3a6', 6)
            fairSfx.bump()
            if (this.say <= 0 && Math.random() < 0.35) {
              this.say = 2.5
              this.s.say(pick(['ปึ้ก!', 'โอ๊ย ชนท้าย!', 'ชนแล้วหนีเลย!', 'ขอโทษค้าบ 555', 'ตั้งใจชนนะเนี่ย!']), mx, my - 14, 1.6)
            }
          }
        }
      }
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    const b = this.box
    if (!this.s.onScreen(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + 20)) return
    for (const c of this.cars) add(c.y, () => drawBumperCar(this.s.gfx, c.x, c.y, c.ang, c.color, c.driver, t, c.golden))
  }
  over(g: Surface) {
    const b = this.box
    if (!this.s.onScreen(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + 20)) return
    // The ceiling net the poles run along.
    g.alpha(0.22)
    for (let x = b.x + 4; x < b.x + b.w; x += 12) g.vline(x, b.y - 18, b.y + b.h - 22, '#c8c0d8')
    for (let y = b.y - 18; y < b.y + b.h - 20; y += 12) g.hline(b.x, b.x + b.w, y, '#c8c0d8')
    g.alpha(1)
  }
  glow(g: Surface, t: number, light: number) {
    const b = this.box
    if (!this.s.onScreen(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + 20)) return
    this.cars.forEach((c, i) => drawPoleSpark(g, c.x, c.y, t, i))
    if (light > 0.3) {
      drawGlow(g, b.x + b.w / 2, b.y + b.h / 2, 60, light * 0.25, '#9fd0ff')
      // Sign over the entrance: bulbs chasing round a lightning bolt.
      const sx = b.x + b.w / 2
      const sy = b.y - 14
      g.rect(sx - 22, sy - 5, 44, 9, '#1e2a4a')
      for (let i = 0; i < 22; i++) {
        const on = (Math.floor(t * 8) + i) % 4 !== 0
        const x = sx - 22 + i * 2
        g.px(x, sy - 5, on ? BULBS[i % 6] : '#3a3048')
        g.px(x + 1, sy + 3, on ? BULBS[(i + 3) % 6] : '#3a3048')
      }
      g.poly([[sx - 2, sy - 3], [sx + 3, sy - 3], [sx, sy], [sx + 3, sy], [sx - 3, sy + 3], [sx - 1, sy]], '#ffd23f')
      for (let i = 0; i < 6; i++) g.rect(sx - 18 + i * 2 + (i > 2 ? 22 : 0), sy - 1, 1, 2, '#9fd0ff')
    }
  }
  tap(px: number, py: number): boolean {
    const b = this.box
    if (px < b.x || px > b.x + b.w || py < b.y - 20 || py > b.y + b.h) return false
    for (const c of this.cars) {
      const a = rand(0, Math.PI * 2)
      c.vx += Math.cos(a) * 30
      c.vy += Math.sin(a) * 20
    }
    this.s.say(pick(['ชนกันให้ยับ!', 'ซิ่งงงง!', 'ปี๊น ปี๊น!', 'รถสีทองชนได้สามแต้มนะ!']), px, b.y - 22, 1.8)
    fairSfx.zap()
    return true
  }
}

// ---------------------------------------------------------------------------
// มวยตู้: two boxers spar; tap the ring for a new round (and a comic KO).

export class Boxing implements Life {
  private red = look({ gender: 'm', hair: 'hair_buzz', top: 'top_muay', bottom: 'bot_muay', head: 'head_mongkol' })
  private blue = look({ gender: 'm', hair: 'hair_short', top: 'top_muay', bottom: 'bot_muay_blue', head: 'head_mongkol' })
  private ref = look({ gender: 'm', hair: 'hair_buzz', hairColor: 6, top: 'top_tee_white', bottom: 'bot_slacks_grey' })
  private round = 0
  private fight = 0
  private jab = 0
  private who = 0
  private ko = 0
  private next = rand(10, 16)
  constructor(
    private s: WorldScene,
    private x: number,
    private y: number,
  ) {}
  private bell() {
    this.round = (this.round % 5) + 1
    this.fight = 5
    this.ko = 0
    fairSfx.ring()
    if (this.s.onScreen(this.x, this.y, 20)) this.s.say(`ยกที่ ${this.round}! ชก!`, this.x, this.y - 58, 1.8)
  }
  update(dt: number) {
    this.jab = Math.max(0, this.jab - dt)
    this.next -= dt
    if (this.next <= 0) {
      this.next = rand(14, 22)
      if (this.fight <= 0 && this.ko <= 0) this.bell()
    }
    if (this.fight > 0) {
      this.fight -= dt
      if (this.jab <= 0 && Math.random() < dt * 2.4) {
        this.jab = 0.25
        this.who = Math.random() < 0.5 ? 0 : 1
        if (this.s.onScreen(this.x, this.y, 10)) {
          fairSfx.thunk()
          if (Math.random() < 0.3) this.s.particles.sparkles(this.x + (this.who ? -6 : 6), this.y - 30, 3, '#ffffff', 4)
        }
      }
      if (this.fight <= 0) {
        this.ko = 3
        if (this.s.onScreen(this.x, this.y, 10)) {
          this.s.say(pick(['น็อก! (ล้มเองนะ)', 'หนึ่ง... สอง... ลุกแล้ว!', 'ชนะคะแนน!', 'เสมอกันจ้า~']), this.x, this.y - 58, 2)
          setTimeout(() => this.s.say(pick(['เฮ้!!!', 'สู้ ๆ!', 'เอาอีก!']), this.x + 30, this.y - 30, 1.4), 600)
          fairSfx.cheer()
        }
      }
    }
    this.ko = Math.max(0, this.ko - dt)
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    if (!this.s.onScreen(this.x, this.y - 20, 50)) return
    const by = this.y - 16
    const fighting = this.fight > 0
    const hop = (i: number) => (fighting ? Math.round(Math.abs(Math.sin(t * 8 + i))) : 0)
    const draw = (lk: AvatarLook, x: number, flip: boolean, i: number, glove: Color) => {
      const g = this.s.gfx
      const down = this.ko > 0 && i === 1 && this.round % 2 === 1
      const sp = avatarSprite(lk, down ? 'front' : 'side', down ? 'sit' : fighting ? 'offer' : 'stand', { flip })
      drawShadow(g, x, by, 6, 2)
      g.draw(sp.canvas, Math.round(x - sp.w / 2), Math.round(by - sp.h + 1 - hop(i)))
      if (!down) {
        const reach = this.jab > 0 && this.who === i ? 5 : 1
        const gx = x + (flip ? -reach - 3 : reach + 3)
        g.circle(gx, by - 15 - hop(i), 2, glove)
        g.px(gx - 1, by - 16 - hop(i), '#ffffff')
      } else if (Math.floor(t * 3) % 2) {
        g.px(x - 2, by - 30, '#ffe27a')
        g.px(x + 3, by - 31, '#ffe27a')
      }
    }
    add(by, () => draw(this.red, this.x - 11 + (this.jab > 0 && this.who === 0 ? 2 : 0), false, 0, '#e8514a'))
    add(by + 0.1, () => draw(this.blue, this.x + 11 - (this.jab > 0 && this.who === 1 ? 2 : 0), true, 1, '#3d63b5'))
    add(by - 6, () => {
      const sp = avatarSprite(this.ref, 'front', this.ko > 0 ? 'happy' : 'stand')
      this.s.gfx.draw(sp.canvas, Math.round(this.x + 22 - sp.w / 2), Math.round(by - 6 - sp.h + 1))
    })
  }
  tap(px: number, py: number): boolean {
    if (Math.abs(px - this.x) > 42 || py < this.y - 70 || py > this.y + 2) return false
    if (this.fight <= 0) this.bell()
    else {
      this.s.say(pick(['เชียร์มุมแดง!', 'มุมน้ำเงินสู้ ๆ!', 'ตั้งการ์ดดี ๆ!']), px, this.y - 50, 1.4)
      this.fight += 1.5
    }
    return true
  }
}

// ---------------------------------------------------------------------------
// ประกวดธิดาลูกชิ้น: contestants parade, one is crowned now and then.

interface Contestant {
  lk: AvatarLook | null
  name: string
  lines: string[]
  sash: Color
}

export class Contest implements Life {
  private list: Contestant[] = [
    { lk: look({ gender: 'm', hair: 'hair_long', hairColor: 0, top: 'top_sabai', bottom: 'bot_sin_mudmee', head: 'head_flowercrown' }), name: 'ลุงเป็ด', lines: ['หนูชื่อน้องเป็ดค่ะ อายุสิบแปด (บวกสี่สิบ)', 'ขอให้โลกสงบสุขค่ะ!', 'ส่ายสะโพกนิดนึง~'], sash: '#ff6f91' },
    { lk: look({ gender: 'f', hair: 'hair_bun', hairColor: 6, top: 'top_thaisilk', bottom: 'bot_sin_mudmee', hand: 'hand_fan' }), name: 'ยายศรี', lines: ['ยายประกวดมาห้าสิบปีแล้วจ้า', 'ความงามไม่มีวันหมดอายุ!', 'หลานมาเชียร์ยายหน่อย'], sash: '#ffd23f' },
    { lk: null, name: 'น้องส้ม', lines: ['เมี้ยว (สายสะพายหลุด)', 'เมี้ยวววว~ (โพสท่า)', '...เมี้ยว? (งง)'], sash: '#9fd0ff' },
  ]
  private phase = 0
  private crown = -1
  private crownT = 0
  private next = rand(16, 24)
  private cheer = 0
  constructor(
    private s: WorldScene,
    private spots: Pt[],
    private throne: Pt,
    private stageX: number,
  ) {}
  update(dt: number) {
    this.phase += dt
    this.cheer = Math.max(0, this.cheer - dt)
    this.crownT = Math.max(0, this.crownT - dt)
    if (this.crownT <= 0) this.crown = -1
    this.next -= dt
    if (this.next <= 0) {
      this.next = rand(22, 32)
      this.crown = Math.floor(Math.random() * this.list.length)
      this.crownT = 6
      if (this.s.onScreen(this.stageX, this.throne.y, 30)) {
        const c = this.list[this.crown]
        this.s.say(`ธิดาลูกชิ้นปีนี้ได้แก่... ${c.name}!`, this.stageX, this.throne.y - 50, 2.6)
        this.s.particles.confetti(this.throne.x, this.throne.y - 30, 30)
        fairSfx.tada()
        fairSfx.cheer()
      }
    }
  }
  private pos(i: number): Pt {
    if (i === this.crown) return { x: this.throne.x, y: this.throne.y }
    // Catwalk: glide between the stage spots in turn.
    const n = this.spots.length
    const k = (this.phase * 0.12 + i / this.list.length) % 1
    const f = k * (n - 1) * 2
    const seg = Math.floor(f)
    const back = seg >= n - 1
    const a = back ? n - 1 - (seg - (n - 1)) : seg
    const b = back ? Math.max(0, a - 1) : Math.min(n - 1, a + 1)
    const u = f - seg
    return { x: this.spots[a].x + (this.spots[b].x - this.spots[a].x) * u, y: this.spots[a].y + (this.spots[b].y - this.spots[a].y) * u }
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    if (!this.s.onScreen(this.stageX, this.throne.y - 20, 70)) return
    this.list.forEach((c, i) => {
      const p = this.pos(i)
      add(p.y, () => {
        const g = this.s.gfx
        const x = Math.round(p.x)
        const y = Math.round(p.y)
        const posing = i === this.crown || this.cheer > 0 || Math.floor(t * 0.7 + i) % 4 === 0
        if (c.lk) {
          const sp = avatarSprite(c.lk, 'front', posing ? 'happy' : Math.floor(t * 4 + i) % 2 ? 'walk1' : 'walk2')
          drawShadow(g, x, y, 6, 2)
          g.draw(sp.canvas, x - Math.round(sp.w / 2), y - sp.h + 1)
          // Sash across the chest.
          g.line(x - 4, y - 17, x + 3, y - 10, c.sash)
          g.line(x - 3, y - 17, x + 4, y - 10, mix(c.sash, '#ffffff', 0.4))
        } else {
          const sp = catPoseSprite(posing ? 'sit' : Math.floor(t * 5) % 2 ? 'walk1' : 'walk2', '#f58f35', false)
          g.draw(sp.canvas, x - Math.round(sp.w / 2), y - sp.h + 1)
          g.line(x - 3, y - 8, x + 2, y - 4, c.sash)
        }
        if (i === this.crown) {
          const cy = y - (c.lk ? 30 : 13)
          g.poly([[x - 3, cy + 2], [x - 3, cy - 1], [x - 1, cy + 1], [x, cy - 2], [x + 1, cy + 1], [x + 3, cy - 1], [x + 3, cy + 2]], '#ffd54f')
          if (Math.floor(t * 6) % 2) g.px(x, cy - 3, '#ffffff')
        }
      })
    })
  }
  glow(g: Surface, t: number, light: number) {
    if (light < 0.3 || !this.s.onScreen(this.stageX, this.throne.y - 20, 70)) return
    // Two sweeping spotlights.
    for (let k = 0; k < 2; k++) {
      const sx = this.stageX - 40 + Math.sin(t * 0.8 + k * 2.4) * 34 + k * 80
      drawGlow(g, sx, this.throne.y - 14, 16, light * 0.55, k ? '#fff3a6' : '#ffc0e0')
    }
  }
  tap(px: number, py: number): boolean {
    if (Math.abs(px - this.stageX) > 52 || py < this.throne.y - 70 || py > this.throne.y + 8) return false
    let best = 0
    let bd = Infinity
    this.list.forEach((_, i) => {
      const p = this.pos(i)
      const d = Math.hypot(p.x - px, p.y - 12 - py)
      if (d < bd) {
        bd = d
        best = i
      }
    })
    const c = this.list[best]
    const p = this.pos(best)
    this.cheer = 1.4
    this.s.say(pick(c.lines), p.x, p.y - 32, 2.2)
    this.s.particles.hearts(p.x, p.y - 24, 3)
    sfx.sparkle()
    return true
  }
}

// ---------------------------------------------------------------------------
// Food-cart vendors: they call out now and then and shout when tapped.

export interface CartSpot {
  x: number
  y: number
  lines: string[]
  lk: AvatarLook
}

export class CartVendors implements Life {
  private hop: number[]
  private next = rand(2, 4)
  constructor(
    private s: WorldScene,
    private carts: CartSpot[],
  ) {
    this.hop = carts.map(() => 0)
  }
  update(dt: number) {
    this.hop = this.hop.map((h) => Math.max(0, h - dt))
    this.next -= dt
    if (this.next > 0) return
    this.next = rand(3, 6)
    const vis = this.carts.map((c, i) => [c, i] as const).filter(([c]) => this.s.onScreen(c.x, c.y - 30, -10))
    if (!vis.length) return
    const [c, i] = pick(vis)
    this.hop[i] = 0.5
    this.s.say(pick(c.lines), c.x, c.y - 46, 2)
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    this.carts.forEach((c, i) => {
      if (!this.s.onScreen(c.x, c.y - 20, 30)) return
      const vy = c.y - 14
      add(vy, () => {
        const up = this.hop[i] > 0 ? Math.round(Math.abs(Math.sin(this.hop[i] * 14)) * 2) : 0
        const pose: Pose = this.hop[i] > 0 || Math.floor(t * 0.8 + i) % 5 === 0 ? 'happy' : 'stand'
        const sp = avatarSprite(c.lk, 'front', pose)
        this.s.gfx.draw(sp.canvas, Math.round(c.x - 3 - sp.w / 2), Math.round(vy - sp.h + 1 - up))
      })
    })
  }
  tap(px: number, py: number): boolean {
    for (let i = 0; i < this.carts.length; i++) {
      const c = this.carts[i]
      if (Math.abs(px - c.x) < 20 && py > c.y - 48 && py < c.y - 18) {
        this.hop[i] = 0.7
        this.s.say(pick(c.lines), c.x, c.y - 46, 2)
        this.s.particles.add({ kind: 'smoke', x: c.x + rand(-4, 4), y: c.y - 30, vy: -10, max: 1, color: '#f6ecd8', size: 2 })
        sfx.tap()
        return true
      }
    }
    return false
  }
}

// ---------------------------------------------------------------------------
// Balloons: the seller's bunch and kids carrying one. Tap a balloon: POP!

interface Bal {
  ax: number
  ay: number
  len: number
  color: Color
  shape: 'round' | 'heart' | 'hippo' | 'star'
  ph: number
  popped: number
}

interface Kid {
  lk: AvatarLook
  x0: number
  x1: number
  y: number
  x: number
  speed: number
  bal: Bal
  cry: number
  flip: boolean
}

function drawBal(g: Surface, b: Bal, x: number, y: number, t: number) {
  if (b.shape === 'hippo') return drawHippoBalloon(g, x, y, b.color, t)
  const D = mix(b.color, INK, 0.3)
  const L = mix(b.color, '#ffffff', 0.5)
  if (b.shape === 'heart') {
    g.circle(x - 2, y - 1, 3, D)
    g.circle(x + 2, y - 1, 3, D)
    g.poly([[x - 5, y], [x + 5, y], [x, y + 5]], D)
    g.circle(x - 2, y - 1.4, 2.4, b.color)
    g.circle(x + 2, y - 1.4, 2.4, b.color)
    g.poly([[x - 4, y - 1], [x + 4, y - 1], [x, y + 4]], b.color)
    g.px(x - 3, y - 2, L)
  } else if (b.shape === 'star') {
    const pts: [number, number][] = []
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2
      const r = i % 2 ? 2.4 : 5.5
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r])
    }
    g.poly(pts, b.color)
    g.px(x - 1, y - 2, L)
  } else {
    g.ellipse(x, y, 4, 5, D)
    g.ellipse(x - 0.3, y - 0.4, 3.4, 4.4, b.color)
    g.px(x - 2, y - 2, L)
    g.px(x - 1, y - 3, L)
    g.px(x, y + 5, D)
  }
}

export class Balloons implements Life {
  private bunch: Bal[]
  private kids: Kid[]
  constructor(
    private s: WorldScene,
    private seller: Pt,
    kidPaths: { x0: number; x1: number; y: number }[],
  ) {
    const shapes: Bal['shape'][] = ['round', 'heart', 'hippo', 'round', 'star', 'round', 'hippo', 'heart', 'round']
    const cols = ['#ff6f91', '#ffd23f', '#b4a8c8', '#6cc36a', '#ffd54f', '#9fd0ff', '#ff9fc0', '#e8514a', '#c8a0ff']
    this.bunch = shapes.map((shape, i) => ({ ax: seller.x + 2, ay: seller.y - 20, len: 12 + (i % 3) * 5, color: cols[i], shape, ph: i * 0.9, popped: 0 }))
    this.kids = kidPaths.map((p, i) => ({
      lk: look(i % 2 ? { gender: 'm', hair: 'hair_short', top: 'top_tee_hiw', bottom: 'bot_denim_shorts' } : { gender: 'f', hair: 'hair_twin', top: 'top_tee_boon', bottom: 'bot_pinkskirt' }),
      x0: p.x0,
      x1: p.x1,
      y: p.y,
      x: rand(p.x0, p.x1),
      speed: rand(10, 16),
      bal: { ax: 0, ay: 0, len: 12, color: pick(cols), shape: pick(shapes), ph: i, popped: 0 },
      cry: 0,
      flip: false,
    }))
  }
  private bpos(b: Bal, i: number, t: number): Pt {
    const spread = (i - 4) * 2.6
    return { x: b.ax + spread + Math.sin(t * 1.3 + b.ph) * 1.5 + this.s.wind() * 2, y: b.ay - b.len + Math.sin(t * 2 + b.ph) }
  }
  update(dt: number, t: number) {
    for (const b of this.bunch) if (b.popped > 0) b.popped = Math.max(0, b.popped - dt)
    for (const k of this.kids) {
      k.cry = Math.max(0, k.cry - dt)
      if (k.bal.popped > 0) {
        k.bal.popped -= dt
        if (k.bal.popped <= 0 && this.s.onScreen(k.x, k.y, 0)) this.s.say(pick(['เย้! ได้ลูกใหม่แล้ว', 'ขอบคุณค่ะคุณลุง!', 'ลูกนี้สีสวยกว่าอีก!']), k.x, k.y - 36, 1.8)
        continue
      }
      if (k.cry > 0) continue
      const prev = k.x
      const len = Math.abs(k.x1 - k.x0) || 1
      const ph = ((t * k.speed) / len + k.bal.ph) % 2
      k.x = k.x0 + (k.x1 - k.x0) * (ph < 1 ? ph : 2 - ph)
      k.flip = k.x < prev
    }
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    const g = () => this.s.gfx
    if (this.s.onScreen(this.seller.x, this.seller.y - 30, 30))
      this.bunch.forEach((b, i) => {
        if (b.popped > 0) return
        add(this.seller.y + 1, () => {
          const p = this.bpos(b, i, t)
          g().line(b.ax, b.ay, p.x, p.y + 4, '#fffaf0')
          drawBal(g(), b, p.x, p.y, t)
        })
      })
    for (const k of this.kids) {
      if (!this.s.onScreen(k.x, k.y - 20, 30)) continue
      add(k.y, () => {
        const gg = g()
        const moving = k.cry <= 0 && k.bal.popped <= 0
        const pose: Pose = k.cry > 0 ? 'bow' : moving ? (Math.floor(t * 8) % 2 ? 'walk1' : 'walk2') : 'stand'
        const sp = avatarSprite(k.lk, k.cry > 0 ? 'front' : 'side', pose === 'bow' ? 'stand' : pose, { flip: k.flip })
        drawShadow(gg, k.x, k.y, 5, 2)
        gg.draw(sp.canvas, Math.round(k.x - sp.w / 2), Math.round(k.y - sp.h + 1))
        if (k.bal.popped <= 0) {
          const hx = k.x + (k.flip ? -4 : 4)
          const bx = hx + Math.sin(t * 1.5 + k.bal.ph) * 1.5
          const by = k.y - 30 + Math.sin(t * 2.2 + k.bal.ph)
          gg.line(hx, k.y - 12, bx, by + 4, '#fffaf0')
          drawBal(gg, k.bal, bx, by, t)
        }
        if (k.cry > 0 && Math.floor(t * 6) % 2) {
          gg.px(k.x - 3, k.y - 17, '#9fd0ff')
          gg.px(k.x + 3, k.y - 17, '#9fd0ff')
        }
      })
    }
  }
  private pop(x: number, y: number, color: Color) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      this.s.particles.add({ kind: 'dot', x, y, vx: Math.cos(a) * rand(20, 40), vy: Math.sin(a) * rand(20, 40), g: 60, max: 0.5, color: i % 2 ? color : '#fffaf0' })
    }
    fairSfx.pop()
  }
  tap(px: number, py: number): boolean {
    const t = this.s.time
    for (let i = 0; i < this.bunch.length; i++) {
      const b = this.bunch[i]
      if (b.popped > 0) continue
      const p = this.bpos(b, i, t)
      if (Math.hypot(px - p.x, py - p.y) < 6) {
        b.popped = 6
        this.pop(p.x, p.y, b.color)
        this.s.say(pick(['ปั้ง!!', 'อ้าว! ลูกละยี่สิบนะ 555', 'ตกใจหมดเลย!', 'ลูกโป่งแตกนำโชค!']), this.seller.x, this.seller.y - 44, 1.8)
        return true
      }
    }
    for (const k of this.kids) {
      if (k.bal.popped > 0) continue
      const bx = k.x + (k.flip ? -4 : 4)
      const by = k.y - 30
      if (Math.hypot(px - bx, py - by) < 7) {
        k.bal.popped = 3.5
        k.cry = 3.2
        this.pop(bx, by, k.bal.color)
        this.s.say(pick(['แงงง ลูกโป่งหนู!', 'ฮือออ แตกแล้ว!', 'ใครทำอะ!']), k.x, k.y - 32, 2)
        setTimeout(() => this.s.say(pick(['เดี๋ยวลุงให้ลูกใหม่นะหนู', 'ไม่ร้องนะ เอาลูกนี้ไป~']), this.seller.x, this.seller.y - 44, 2), 900)
        return true
      }
    }
    return false
  }
}

// ---------------------------------------------------------------------------
// Strings of paper lanterns (they sway; tap and they swing).

export class Lanterns implements Life {
  private kick: number[]
  constructor(
    private s: WorldScene,
    private strings: { x0: number; x1: number; y: number; n: number; sag: number; color?: Color }[],
  ) {
    this.kick = strings.map(() => 0)
  }
  private each(fn: (x: number, y: number, c: Color, i: number, k: number) => void, t: number) {
    this.strings.forEach((st, k) => {
      if (!this.s.onScreen((st.x0 + st.x1) / 2, st.y, (st.x1 - st.x0) / 2 + 10)) return
      for (let i = 0; i < st.n; i++) {
        const f = (i + 0.5) / st.n
        const sw = Math.sin(t * 1.4 + i * 0.7) * (0.6 + this.kick[k] * 2.5) + this.s.wind()
        const x = st.x0 + (st.x1 - st.x0) * f + sw
        const y = st.y + Math.sin(f * Math.PI) * st.sag
        fn(x, y, st.color ?? (i % 3 === 2 ? '#fffaf0' : '#e8514a'), i, k)
      }
    })
  }
  update(dt: number) {
    this.kick = this.kick.map((v) => Math.max(0, v - dt * 0.8))
  }
  over(g: Surface, t: number) {
    this.strings.forEach((st) => {
      if (!this.s.onScreen((st.x0 + st.x1) / 2, st.y, (st.x1 - st.x0) / 2 + 10)) return
      let px = st.x0
      let py = st.y
      for (let i = 1; i <= 16; i++) {
        const f = i / 16
        const x = st.x0 + (st.x1 - st.x0) * f
        const y = st.y + Math.sin(f * Math.PI) * st.sag
        g.line(px, py, x, y, '#4a3848')
        px = x
        py = y
      }
    })
    this.each((x, y, c) => {
      const X = Math.round(x)
      const Y = Math.round(y)
      g.vline(X, Y, Y + 1, '#4a3848')
      g.ellipse(X, Y + 5, 3, 3.6, mix(c, INK, 0.35))
      g.hline(X - 2, X + 2, Y + 2, '#b8742a')
      g.hline(X - 2, X + 2, Y + 8, '#b8742a')
      g.px(X, Y + 9, '#ffd23f')
    }, t)
  }
  glow(g: Surface, t: number, light: number) {
    if (light < 0.3) return
    this.each((x, y, c) => {
      const X = Math.round(x)
      const Y = Math.round(y)
      drawGlow(g, X, Y + 5, 5, light * 0.8, c === '#fffaf0' ? '#fff3c0' : '#ff8a6a')
      g.ellipse(X, Y + 5, 2.5, 3, c)
      g.px(X - 1, Y + 4, mix(c, '#ffffff', 0.5))
    }, t)
  }
  tap(px: number, py: number): boolean {
    for (let k = 0; k < this.strings.length; k++) {
      const st = this.strings[k]
      if (px < st.x0 || px > st.x1 || Math.abs(py - (st.y + st.sag * 0.6 + 5)) > st.sag * 0.6 + 7) continue
      this.kick[k] = 1
      sfx.chime()
      return true
    }
    return false
  }
}

// ---------------------------------------------------------------------------
// Glowing layers and bulbs (drawn after the night tint, additively).

export interface NeonItem {
  sprite: HubProp
  x: number
  y: number
  /** Brightness 0..1 (default 0.8). */
  a?: number
  /** Flicker like a failing tube (0 = steady). */
  flicker?: number
}

export class Neon implements Life {
  constructor(
    private s: WorldScene,
    private items: NeonItem[],
    private bulbs: Pt[],
  ) {}
  glow(g: Surface, t: number, light: number) {
    if (light < 0.3) return
    const ctx = g.ctx
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const it of this.items) {
      const sp = it.sprite
      const x = it.x - sp.ax
      const y = it.y - sp.ay
      if (!this.s.onScreen(x + sp.w / 2, y + sp.h / 2, Math.max(sp.w, sp.h) / 2 + 8)) continue
      let a = (it.a ?? 0.8) * light
      if (it.flicker && Math.sin(t * 23 + it.x) > 1 - it.flicker * 0.3) a *= 0.35
      ctx.globalAlpha = a
      ctx.drawImage(sp.canvas, Math.round(x - g.ox), Math.round(y - g.oy))
    }
    ctx.restore()
    this.bulbs.forEach((b, i) => {
      if (!this.s.onScreen(b.x, b.y, 6)) return
      const on = (Math.floor(t * 4) + i) % 4 !== 0
      if (!on) return
      const c = BULBS[i % BULBS.length]
      drawGlow(g, b.x, b.y, 3, light * 0.9, c)
      g.px(b.x, b.y, mix(c, '#ffffff', 0.35))
    })
  }
}

// ---------------------------------------------------------------------------
// Claw machines: the claws twitch inside the glass; tap for a flashy attract mode.

export class ClawRow implements Life {
  private flash = 0
  constructor(
    private s: WorldScene,
    private glass: Pt[],
  ) {}
  update(dt: number) {
    this.flash = Math.max(0, this.flash - dt)
  }
  glow(g: Surface, t: number, light: number) {
    if (light < 0.3) return
    this.glass.forEach((p, i) => {
      if (!this.s.onScreen(p.x, p.y, 24)) return
      const x = Math.round(p.x + Math.sin(t * 0.9 + i * 1.7) * 6)
      const drop = this.flash > 0 ? Math.round(Math.abs(Math.sin(this.flash * 3)) * 6) : 0
      g.vline(x, p.y - 10, p.y - 7 + drop, '#e8e8f0')
      g.hline(x - 2, x + 2, p.y - 6 + drop, '#e8e8f0')
      g.px(x - 2, p.y - 5 + drop, '#e8e8f0')
      g.px(x + 2, p.y - 5 + drop, '#e8e8f0')
      drawGlow(g, p.x, p.y, 12, light * (this.flash > 0 ? 0.9 : 0.45), ['#ff9fd0', '#9fd0ff', '#ffe27a', '#9fe8b0'][i % 4])
      if (this.flash > 0 && Math.floor(t * 10 + i) % 2) g.rect(Math.round(p.x) - 9, p.y - 18, 18, 2, '#ffffff')
    })
  }
  tap(px: number, py: number): boolean {
    for (const p of this.glass) {
      if (Math.abs(px - p.x) < 11 && py > p.y - 20 && py < p.y + 28) {
        this.flash = 1.6
        this.s.say(pick(['หยอดเหรียญเลย! ตัวทองอยู่ก้นตู้!', 'คีบได้ร้อยทั้งร้อย (มั้ง)', 'ตู้นี้ใจดี ลองดูสิ!']), p.x, p.y - 26, 1.8)
        fairSfx.whirr(0.5)
        return true
      }
    }
    return false
  }
}

// ---------------------------------------------------------------------------
// Fireworks: a show every three minutes on the wall clock (the same moment on
// every device), plus a burst wherever you tap the night sky.

export class FireworkShow implements Life {
  private sky = new FireworkSky(1.7, true)
  private twins: { at: number; b: Burst }[] = []
  private show = -1
  private plan: Burst[] = []
  private idx = 0
  private called = -1
  private watched = 0
  private watchedShow = -1
  constructor(
    private s: WorldScene,
    private mc: Pt,
    private skyTop: number,
  ) {
    this.sky.onBurst = (x, y, kind) => {
      if (!this.s.onScreen(x, y, 40)) return
      fairSfx.boom(kind === 'heart' ? 1.3 : 1)
      if (kind === 'crackle') fairSfx.crackle()
      // A drift of smoke where the shell burst.
      for (let i = 0; i < 4; i++) this.s.particles.add({ kind: 'smoke', x: x + rand(-8, 8), y: y + rand(-6, 6), vx: rand(-3, 3), vy: rand(-4, 2), max: rand(2, 3.2), color: '#8a86a8', size: 2 })
    }
  }
  /** Launch one shell over the current view. */
  fire(b: { x: number; y: number; kind: Burst['kind']; color: string; size: number }) {
    const s = this.s
    const x = s.camX + b.x * s.vw
    const y = s.camY + s.vh * 0.14 + b.y * s.vh * 0.3
    this.sky.launch(x + rand(-6, 6), s.camY + s.vh * 0.6, x, y, b.kind, b.color, b.size)
  }
  update(dt: number) {
    const st = fireworksAt(Date.now())
    if (st.live) {
      if (this.show !== st.show) {
        this.show = st.show
        this.plan = showPlan(st.show)
        this.twins = []
        this.idx = this.plan.findIndex((b) => b.t >= st.t - 0.2)
        if (this.idx < 0) this.idx = this.plan.length
      }
      while (this.idx < this.plan.length && this.plan[this.idx].t <= st.t) {
        const b = this.plan[this.idx++]
        this.fire(b)
        // Past the opening, shells go up in pairs (mirrored across the sky).
        if (b.t > 4) this.twins.push({ at: st.t + 0.35, b: { ...b, x: 1 - b.x, y: Math.min(0.9, b.y + 0.08), color: b.color } })
      }
      while (this.twins.length && this.twins[0].at <= st.t) this.fire(this.twins.shift()!.b)
      if (live(this.s)) {
        if (this.watchedShow !== st.show) {
          this.watchedShow = st.show
          this.watched = 0
        }
        this.watched += dt
      }
    } else {
      if (this.watchedShow === st.show - 1 && this.watched >= 15 && live(this.s)) {
        this.watched = 0
        if (ownedCount('fair_firework_pin') === 0) grantCollectible('fair_firework_pin')
        this.s.say('ขอบคุณที่มาชมพลุครับ! รอบหน้าอีกสามนาที', this.s.camX + this.s.vw / 2, this.s.camY + this.s.vh * 0.3, 2.4)
      }
      if (st.next <= 10 && this.called !== st.show) {
        this.called = st.show
        if (this.s.onScreen(this.mc.x, this.mc.y, 0)) this.s.say('อีกสิบวินาที พลุจะขึ้นแล้วคร้าบบ!', this.mc.x, this.mc.y - 34, 2.6)
        else this.s.say('📢 อีกสิบวินาทีพลุขึ้น! มองฟ้าเลย~', this.s.camX + this.s.vw / 2, this.s.camY + this.s.vh * 0.3, 2.6)
      }
    }
    this.sky.update(dt)
  }
  glow(g: Surface, t: number) {
    this.sky.draw(g, t)
  }
  tap(px: number, py: number): boolean {
    if (py > this.skyTop) return false
    this.sky.burst(px, py, pick(['peony', 'ring', 'heart', 'willow', 'crackle'] as const), pick(BULBS), 1)
    return true
  }
  get busy() {
    return this.sky.busy
  }
}

// ---------------------------------------------------------------------------
// Live hooks: when another real player finishes a booth round, the booth's
// barker shouts it out.

/** One subscription for the whole session; it feeds whichever fair scene is current. */
let liveScene: FairLive | null = null
let liveWired = false

export class FairLive implements Life {
  queue: LiveScore[] = []
  constructor(
    private s: WorldScene,
    private booths: Record<string, Pt>,
  ) {
    liveScene = this
  }
  /** Seconds until the next shout (one at a time so bubbles don't pile up). */
  wait = 0
  update(dt: number) {
    ensureFairNet()
    if (!liveWired) {
      liveWired = true
      onFairScore((sc) => {
        if (liveScene && liveScene.queue.length < 8) liveScene.queue.push(sc)
      })
    }
    this.wait -= dt
    if (this.wait > 0) return
    const sc = this.queue.shift()
    if (!sc) return
    const at = this.booths[sc.game]
    const name = FAIR_GAMES[sc.game]?.name ?? 'ซุ้มเกม'
    if (at && this.s.onScreen(at.x, at.y, 20)) {
      // Keep the bubble inside the view (the dart booth hugs the map edge).
      const half = Math.min(70, this.s.vw / 2 - 4)
      const x = Math.max(this.s.camX + half, Math.min(this.s.camX + this.s.vw - half, at.x))
      this.s.say(`${sc.name} ${'★'.repeat(sc.stars) || '☆'} ${sc.score} แต้ม ${name}!`, x, at.y - 60, 2.6)
      this.s.particles.sparkles(at.x, at.y - 50, 8, '#ffe27a', 10)
      this.wait = 2.4
    }
  }
}

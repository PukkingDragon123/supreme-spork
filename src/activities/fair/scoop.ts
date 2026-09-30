// ตักปลาทอง – goldfish scooping. Press to dip the paper scoop (โปย) into the
// tub, slide it under a fish, let go to lift. The paper soaks through while
// it's in the water (faster if you swish it about) and tears – you have
// three. Rarer fish score more; you take the best one home (a pet if the
// game has a goldfish pet, else a collectible).

import type { PointerInfo } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { haptic, sfx } from '../../engine/audio'
import { game } from '../../game/state'
import { grantPet } from '../../game/actions'
import { grantCollectible } from '../../game/collectibles'
import { toast } from '../../game/events'
import { PET_BY_ID } from '../../game/data/pets'
import { dollSprite, type DollPose } from '../../art/doll'
import { INK, mix } from '../../art/places/hub-kit'
import { fairHand } from '../../art/poses/fair'
import { JobScene, Drag, type JobSummary } from '../jobs/base'
import { boothBackdrop, drawBulbs } from './art'
import { fairSfx } from './sound'
import { bestFish, catchWear, FISH, fishFor, paperWear, SCOOP_PAPERS, SCOOP_R, SCOOP_TARGET, scoopCatches, type FishKind } from './rules'

interface Fish {
  kind: FishKind
  x: number
  y: number
  a: number
  v: number
  turn: number
  wig: number
  caught: boolean
  fly: number
  fx: number
  fy: number
}

/** Take the best fish home: a goldfish pet if one exists, otherwise its collectible. */
export function takeHomeFish(kind: FishKind): string {
  if (PET_BY_ID.goldfish && !game.value.pets.includes('goldfish')) {
    grantPet('goldfish')
    toast('ได้ปลาทองเป็นสัตว์เลี้ยงตัวใหม่!', 'koi')
    return 'pet:goldfish'
  }
  grantCollectible(FISH[kind].collectible)
  return FISH[kind].collectible
}

export class ScoopScene extends JobScene {
  duration = 40
  thresholds: [number, number, number] = [4 / SCOOP_TARGET, 8 / SCOOP_TARGET, 1]
  score = 0
  papers = SCOOP_PAPERS
  paper = 1
  caught: FishKind[] = []
  fish: Fish[] = []
  private tub = { cx: 95, cy: 200, rx: 80, ry: 60 }
  private drag = new Drag()
  private dipped = false
  private tearT = 0
  private liftT = 0
  private bg: HTMLCanvasElement | null = null
  private bowl = { x: 160, y: 300 }
  private home: string | null = null
  private me = game.value.player.look

  progress() {
    return Math.min(1, this.score / SCOOP_TARGET)
  }
  goalText() {
    return `แต้ม ${this.score} · โปย ${this.papers}`
  }
  complete() {
    return this.papers <= 0 && this.tearT <= 0
  }
  summary(): JobSummary {
    const best = bestFish(this.caught)
    const n = (k: FishKind) => this.caught.filter((c) => c === k).length
    const lines = [`ตักได้ ${this.caught.length} ตัว (ส้ม ${n('orange')} · ดำ ${n('black')} · สามสี ${n('calico')} · หัวสิงห์ ${n('lion')})`]
    if (best) lines.push(this.home === 'pet:goldfish' ? 'ได้ปลาทองกลับบ้านเป็นสัตว์เลี้ยง!' : `เอา${FISH[best].name}กลับบ้าน (เข้าสมุดของสะสม)`)
    return { title: best === 'lion' ? 'ตักได้ปลาทองหัวสิงห์!!' : this.score >= SCOOP_TARGET ? 'เซียนตักปลาประจำงานวัด!' : undefined, lines }
  }

  protected anchor() {
    const H = this.bottom - this.top
    this.tub = { cx: this.cx, cy: Math.round(this.top + H * 0.46), rx: Math.round(this.w / 2 - 12), ry: Math.round(H * 0.3) }
    this.bowl = { x: this.w - 30, y: this.bottom - 22 }
    this.bg = boothBackdrop(this.w, this.h, this.top + 18, '#2a9ac8', '#1e5a8a')
  }

  protected populate() {
    this.fish = Array.from({ length: 14 }, () => this.newFish())
    this.caught = []
    this.score = 0
    this.papers = SCOOP_PAPERS
    this.paper = 1
  }

  private newFish(): Fish {
    const kind = fishFor(Math.random())
    const a = rand(0, Math.PI * 2)
    const r = Math.sqrt(Math.random()) * 0.8
    return { kind, x: this.tub.cx + Math.cos(a) * this.tub.rx * r, y: this.tub.cy + Math.sin(a) * this.tub.ry * r, a: rand(0, Math.PI * 2), v: FISH[kind].speed, turn: rand(-1, 1), wig: rand(0, 6), caught: false, fly: 0, fx: 0, fy: 0 }
  }

  private inTub(x: number, y: number, pad = 0) {
    const dx = (x - this.tub.cx) / (this.tub.rx - pad)
    const dy = (y - this.tub.cy) / (this.tub.ry - pad)
    return dx * dx + dy * dy < 1
  }

  protected input(e: PointerInfo) {
    if (this.papers <= 0 || this.tearT > 0) return
    if (e.type === 'down') {
      if (!this.inTub(e.x, e.y)) return
      this.drag.begin(e)
      this.dipped = true
      sfx.plop()
      return
    }
    if (e.type === 'move') {
      this.drag.move(e)
      return
    }
    if ((e.type === 'up' || e.type === 'cancel') && this.dipped) {
      this.drag.move(e)
      this.lift(this.drag.speed)
      this.drag.end(e)
      this.dipped = false
    }
  }

  private lift(speed: number) {
    const x = this.drag.x
    const y = this.drag.y
    this.liftT = 0.3
    const got: Fish[] = []
    for (const f of this.fish) {
      if (f.caught) continue
      if (scoopCatches(Math.hypot(f.x - x, f.y - y), speed)) got.push(f)
      if (got.length >= 2) break
    }
    if (!got.length) {
      const close = this.fish.some((f) => !f.caught && Math.hypot(f.x - x, f.y - y) < SCOOP_R + 4)
      this.say(x, y - 14, close && speed > 110 ? 'ยกเร็วไป ปลาหลุด!' : pick(['ว่างเปล่า~', 'ปลาหนีไปแล้ว!', 'ใจเย็น ๆ']), 'info', 0.9)
      sfx.splash()
      return
    }
    for (const f of got) {
      f.caught = true
      f.fly = 0
      f.fx = f.x
      f.fy = f.y
      this.caught.push(f.kind)
      this.score += FISH[f.kind].pts
      this.paper -= catchWear(f.kind)
      this.say(f.x, f.y - 14, f.kind === 'lion' ? `หัวสิงห์!! +${FISH[f.kind].pts}` : f.kind === 'calico' ? `สามสี! +3` : f.kind === 'black' ? 'ปลาดำ! +2' : pick(['ได้แล้ว! +1', 'ตัวส้ม +1', 'ปลาทอง! +1']), 'good', 1)
      this.particles.add({ kind: 'drop', x: f.x, y: f.y, vy: -30, g: 80, max: 0.6, color: '#9fd8f0' })
    }
    if (got.some((f) => f.kind === 'lion')) this.flash(0.2)
    this.particles.sparkles(x, y, 8, '#e8f8ff', 8)
    fairSfx.clink()
    haptic(14)
    if (this.paper <= 0) this.tear(x, y)
  }

  private tear(x: number, y: number) {
    this.papers--
    this.paper = 0
    this.tearT = 0.7
    this.dipped = false
    this.drag.end()
    for (let i = 0; i < 10; i++) this.particles.add({ kind: 'dot', x: x + rand(-6, 6), y: y + rand(-6, 6), vx: rand(-20, 20), vy: rand(-30, 0), g: 60, max: 0.8, color: '#f6f2ea' })
    this.say(x, y - 16, this.papers > 0 ? pick(['โปยขาด!', 'แฉะไปแล้ว!', 'ขาดดด!']) : 'โปยหมดแล้ว!', 'warn', 1)
    fairSfx.miss()
    this.shake(0.12, 1)
  }

  protected tick(dt: number) {
    if (this.tearT > 0) {
      this.tearT -= dt
      if (this.tearT <= 0 && this.papers > 0) this.paper = 1
    }
    this.liftT = Math.max(0, this.liftT - dt)
    this.drag.settle(dt)
    if (this.dipped && this.playing) {
      this.paper -= paperWear(dt, this.drag.speed)
      if (this.paper <= 0) this.tear(this.drag.x, this.drag.y)
      if (Math.random() < dt * (2 + this.drag.speed / 30)) this.particles.add({ kind: 'ripple', x: this.drag.x, y: this.drag.y, max: 0.8, color: '#c8ecf8', size: 4 })
    }
    for (const f of this.fish) {
      if (f.caught) {
        f.fly += dt * 2.2
        continue
      }
      f.wig += dt * (4 + f.v / 8)
      // Wander; dart away from the scoop when it's in the water nearby.
      f.turn += rand(-2, 2) * dt
      f.turn = Math.max(-1.4, Math.min(1.4, f.turn))
      f.a += f.turn * dt
      let v = f.v
      if (this.dipped) {
        const d = Math.hypot(f.x - this.drag.x, f.y - this.drag.y)
        if (d < 26 && this.drag.speed > 40) {
          const away = Math.atan2(f.y - this.drag.y, f.x - this.drag.x)
          f.a += Math.sin(away - f.a) * dt * 6
          v *= 2.2
        }
      }
      f.x += Math.cos(f.a) * v * dt
      f.y += Math.sin(f.a) * v * dt * 0.8
      if (!this.inTub(f.x, f.y, 8)) {
        f.a = Math.atan2(this.tub.cy - f.y, this.tub.cx - f.x) + rand(-0.5, 0.5)
        f.x += Math.cos(f.a) * 2
        f.y += Math.sin(f.a) * 2
      }
    }
    // Caught fish land in the bowl; a new fish is released into the tub.
    const landed = this.fish.filter((f) => f.caught && f.fly >= 1)
    if (landed.length) {
      this.fish = this.fish.filter((f) => !(f.caught && f.fly >= 1))
      for (let i = 0; i < landed.length; i++) this.fish.push(this.newFish())
      sfx.plop()
    }
  }

  protected ended() {
    const best = bestFish(this.caught)
    if (best) this.home = takeHomeFish(best)
  }

  protected draw(g: Surface) {
    if (this.bg) g.draw(this.bg, 0, 0)
    drawBulbs(g, this.w, this.top + 4, this.t)
    const T = this.tub
    // The tub: blue plastic rim, water with light ripples.
    g.ellipse(T.cx, T.cy + 4, T.rx + 6, T.ry + 6, '#1e3a6a')
    g.ellipse(T.cx, T.cy, T.rx + 5, T.ry + 5, '#3d63b5')
    g.ellipse(T.cx, T.cy - 1, T.rx + 3, T.ry + 3, '#6a8ee0')
    g.ellipse(T.cx, T.cy, T.rx, T.ry, '#2a8ac8')
    g.ellipse(T.cx, T.cy + 2, T.rx - 4, T.ry - 4, '#2e9ad8')
    for (let i = 0; i < 14; i++) {
      const a = i * 1.7 + this.t * 0.3
      const r = ((i * 37) % 70) / 100
      const x = T.cx + Math.cos(a) * T.rx * r
      const y = T.cy + Math.sin(a * 1.3) * T.ry * r
      g.hline(Math.round(x - 3), Math.round(x + 3), Math.round(y), '#5ab8e8')
    }
    // Fish (the ones in the water).
    for (const f of this.fish) if (!f.caught) this.drawFish(g, f.x, f.y, f.a, f.kind, f.wig, 1.35)
    // The scoop.
    if (this.dipped || this.liftT > 0 || this.tearT > 0) {
      const x = Math.round(this.drag.x)
      const y = Math.round(this.drag.y - (this.liftT > 0 ? 6 : 0))
      const wet = 1 - Math.max(0, this.paper)
      g.alpha(this.dipped ? 0.7 : 0.9)
      if (this.tearT <= 0) g.circle(x, y, SCOOP_R - 1, mix('#fffaf0', '#9fd0e8', wet * 0.8))
      g.alpha(1)
      if (this.tearT <= 0 && wet > 0.5) for (let i = 0; i < Math.round(wet * 8); i++) g.px(x + Math.round(Math.cos(i * 2.3) * (4 + (i % 3) * 2)), y + Math.round(Math.sin(i * 2.3) * (4 + (i % 3) * 2)), '#2a8ac8')
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2
        g.px(Math.round(x + Math.cos(a) * SCOOP_R), Math.round(y + Math.sin(a) * SCOOP_R), i % 8 ? '#ff6f91' : '#ffb0c8')
      }
      g.thickLine(x + SCOOP_R - 2, y + 6, x + SCOOP_R + 16, y + 22, 3, '#ff6f91')
      // Paper strength ring.
      if (this.dipped && this.paper > 0) {
        const n = Math.round(this.paper * 24)
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (i / 24) * Math.PI * 2
          g.px(Math.round(x + Math.cos(a) * (SCOOP_R + 3)), Math.round(y + Math.sin(a) * (SCOOP_R + 3)), this.paper < 0.3 ? '#ff6f91' : '#fff3a6')
        }
      }
    }
    // Flying catches arcing into the bowl.
    for (const f of this.fish) {
      if (!f.caught) continue
      const k = Math.min(1, f.fly)
      const x = f.fx + (this.bowl.x - f.fx) * k
      const y = f.fy + (this.bowl.y - 8 - f.fy) * k - Math.sin(k * Math.PI) * 30
      this.drawFish(g, x, y, k * 8, f.kind, f.wig + k * 10, 1)
    }
    // The bowl with what you caught.
    const B = this.bowl
    g.ellipse(B.x, B.y, 18, 12, '#d4f1ff')
    g.ellipse(B.x, B.y - 2, 16, 9, '#a8dcf8')
    g.ellipse(B.x, B.y - 8, 16, 3, '#e8f8ff')
    this.caught.slice(-6).forEach((k, i) => this.drawFish(g, B.x - 9 + (i % 3) * 9, B.y - 3 + Math.floor(i / 3) * 4, this.t * (1 + i * 0.2), k, this.t * 4 + i, 0.7))
    // Papers left.
    for (let i = 0; i < this.papers; i++) {
      const x = this.w - 84 + i * 13
      const y = this.bottom - 10
      g.circle(x, y, 5, '#fffaf0')
      for (let j = 0; j < 16; j++) g.px(Math.round(x + Math.cos(j * 0.4) * 5), Math.round(y + Math.sin(j * 0.4) * 5), '#ff6f91')
    }
    // You, leaning over the tub (from behind, on the left).
    const pose: DollPose = this.caught.length && this.liftT > 0 ? 'act_f_cheer' : this.tearT > 0 ? 'act_f_oops' : 'act_f_scoop'
    const sp = dollSprite(this.me, pose, { view: 'back' })
    const dx = 8
    const dy = Math.round(this.bottom + 10 - sp.h)
    g.draw(sp.canvas, dx, dy)
    // The scoop in your hand while it's out of the water.
    if (!this.dipped && this.liftT <= 0 && this.tearT <= 0 && this.papers > 0) {
      const fh = fairHand(pose, 'back', this.me)
      const x = dx + fh.x + 6
      const y = dy + fh.y - 6
      g.circle(x, y, SCOOP_R - 3, '#fffaf0')
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2
        g.px(Math.round(x + Math.cos(a) * (SCOOP_R - 2)), Math.round(y + Math.sin(a) * (SCOOP_R - 2)), '#ff6f91')
      }
      g.thickLine(x - 4, y + 7, x - 8, y + 14, 3, '#ff6f91')
    }
  }

  private drawFish(g: Surface, x: number, y: number, a: number, kind: FishKind, wig: number, s: number) {
    const body = kind === 'orange' ? '#f58f35' : kind === 'black' ? '#3a3048' : kind === 'calico' ? '#fffaf0' : '#ffb33a'
    const D = mix(body, INK, 0.3)
    const dx = Math.cos(a)
    const dy = Math.sin(a) * 0.8
    const len = (kind === 'lion' ? 6 : 5) * s
    const X = x
    const Y = y
    // Body as a few discs along the heading; the tail wiggles.
    g.circle(X + dx * len * 0.4, Y + dy * len * 0.4, 2.6 * s, body)
    g.circle(X - dx * len * 0.2, Y - dy * len * 0.2, 2.2 * s, body)
    const tw = Math.sin(wig) * 0.6
    const tx = X - dx * len * 0.9
    const ty = Y - dy * len * 0.9
    g.line(tx, ty, tx - Math.cos(a + tw + 0.5) * 3 * s, ty - Math.sin(a + tw + 0.5) * 3 * s, kind === 'black' ? '#5a5068' : '#ff9a5a')
    g.line(tx, ty, tx - Math.cos(a + tw - 0.5) * 3 * s, ty - Math.sin(a + tw - 0.5) * 3 * s, kind === 'black' ? '#5a5068' : '#ffb07a')
    if (kind === 'calico') {
      g.px(Math.round(X), Math.round(Y), '#f58f35')
      g.px(Math.round(X - dx * 2), Math.round(Y - dy * 2), '#3a3048')
    }
    if (kind === 'lion') {
      g.circle(X + dx * len * 0.7, Y + dy * len * 0.7, 1.6 * s, '#ff6f91')
      if (Math.floor(this.t * 6 + x) % 3 === 0) g.px(Math.round(X), Math.round(Y - 2), '#ffffff')
    }
    g.px(Math.round(X + dx * len * 0.6 - dy), Math.round(Y + dy * len * 0.6 + dx * 0.8), kind === 'black' ? '#fffaf0' : INK)
    g.px(Math.round(X - dx), Math.round(Y - dy - 1), D)
  }
}

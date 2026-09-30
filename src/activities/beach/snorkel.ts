// ดำน้ำดูปะการัง: snorkel over the reef (needs the scuba suit or the
// flippers). Drag to swim; hover near a fish to log it in the fish book
// (rare ones are shy and need a longer look). Brain coral, staghorn, sea
// fans and anemones with clownfish; a moray peeks from its hole; a hawksbill
// turtle glides past. Grab drifting plastic bags (turtles think they're
// jellyfish), steer clear of sea urchins, and peek into the giant clam for
// a chance at a pearl.

import type { PointerInfo } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { bake } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { sfx, haptic } from '../../engine/audio'
import { game } from '../../game/state'
import { dollSprite } from '../../art/doll'
import { BP } from '../../art/poses/beach'
import { BeachScene, twinkle, INK } from './base'
import { rollShell, type BeachRoundStats } from '../../game/beach'
import { COLLECTIBLE_BY_ID } from '../../game/data/collectibles'
import { FISH_GOAL, REEF_FISH, spotTime, type FishDef } from './rules'
import { mix } from '../../art/places/beach-kit'

interface Fish {
  def: FishDef
  x: number
  y: number
  vx: number
  ph: number
  look: number
  n: number
}

interface Bag {
  x: number
  y: number
  ph: number
  taken: boolean
}

const reefCache = new Map<string, HTMLCanvasElement>()

export class SnorkelScene extends BeachScene {
  duration = 50
  thresholds: [number, number, number] = [2 / FISH_GOAL, 4 / FISH_GOAL, 1]
  private fish: Fish[] = []
  private bags: Bag[] = []
  private urchins: { x: number; y: number }[] = []
  private clam = { x: 150, y: 300, open: 0, used: false }
  private me = { x: 95, y: 150, tx: 95, ty: 150, dir: 1, stun: 0 }
  private drag = false
  private spotted: string[] = []
  private trash = 0
  private pearl: string | null = null
  private surfaceY = 40
  private floorY = 330

  goalText() {
    return `สมุดปลา ${this.spotted.length}/${FISH_GOAL} ชนิด`
  }
  progress() {
    return Math.min(1, this.spotted.length / FISH_GOAL)
  }
  cheerText() {
    return 'สมุดปลาครบแล้ว!'
  }
  stats(): BeachRoundStats {
    return { score: this.spotted.length * 10 + this.trash, fish: this.spotted, trash: this.trash, finds: this.pearl ? [this.pearl] : [] }
  }
  summary() {
    return {
      title: this.spotted.length >= FISH_GOAL ? 'นักดำน้ำสายอนุรักษ์!' : 'ใต้ทะเลสวยมากใช่ไหม',
      lines: [`เจอปลา ${this.spotted.length} ชนิด: ${this.spotted.map((f) => REEF_FISH.find((x) => x.id === f)?.name ?? f).join(', ') || '-'}`, this.trash ? `เก็บถุงพลาสติกใต้น้ำ ${this.trash} ใบ ช่วยเต่าได้เยอะเลย` : 'ถุงพลาสติกยังลอยอยู่ รอบหน้าเก็บด้วยนะ', 'ดูได้ ไม่จับ ไม่เหยียบปะการัง'],
    }
  }

  protected anchor() {
    this.surfaceY = this.top + 14
    this.floorY = this.bottom - 40
  }
  protected populate() {
    this.spotted = []
    this.trash = 0
    this.pearl = null
    this.me = { x: this.cx, y: this.surfaceY + 50, tx: this.cx, ty: this.surfaceY + 50, dir: 1, stun: 0 }
    const band = (d: number) => this.surfaceY + 20 + d * (this.floorY - this.surfaceY - 40)
    this.fish = REEF_FISH.filter((f) => !f.rare || Math.random() < 0.8).map((def) => ({ def, x: rand(10, this.w - 10), y: band(def.depth), vx: pick([-1, 1]) * rand(8, 16) * (def.id === 'turtle' ? 0.6 : 1), ph: rand(0, 6), look: 0, n: def.id === 'sergeant' || def.id === 'tang' ? 4 : def.id === 'clown' ? 2 : 1 }))
    this.bags = [0, 1, 2].map((i) => ({ x: rand(20, this.w - 20), y: this.surfaceY + 30 + i * 60, ph: rand(0, 6), taken: false }))
    this.urchins = [0, 1, 2, 3].map((i) => ({ x: 20 + i * 48 + rand(-6, 6), y: this.floorY - rand(2, 8) }))
    this.clam = { x: this.w - 40, y: this.floorY - 4, open: 0, used: false }
  }

  protected tick(dt: number) {
    const m = this.me
    m.stun = Math.max(0, m.stun - dt)
    if (m.stun <= 0) {
      const dx = m.tx - m.x
      const dy = m.ty - m.y
      const d = Math.hypot(dx, dy)
      if (d > 1) {
        const sp = Math.min(d, 60 * dt)
        m.x += (dx / d) * sp
        m.y += (dy / d) * sp
        if (Math.abs(dx) > 2) m.dir = dx > 0 ? 1 : -1
        if (Math.random() < dt * 6) this.particles.add({ kind: 'dot', x: m.x - m.dir * 14, y: m.y, vx: -m.dir * 6, vy: rand(-14, -6), max: 0.9, color: '#e8fbff' })
      }
    }
    m.x = Math.max(12, Math.min(this.w - 12, m.x))
    m.y = Math.max(this.surfaceY + 8, Math.min(this.floorY - 14, m.y))
    if (Math.random() < dt * 1.5) this.particles.add({ kind: 'dot', x: m.x + m.dir * 10, y: m.y - 4, vy: -16, max: 1.4, color: '#ffffff' })
    // Fish swim, logs build up while you hover close.
    for (const f of this.fish) {
      f.ph += dt
      f.x += f.vx * dt
      if (f.x < -20) f.vx = Math.abs(f.vx)
      if (f.x > this.w + 20) f.vx = -Math.abs(f.vx)
      const base = this.surfaceY + 20 + f.def.depth * (this.floorY - this.surfaceY - 40)
      f.y = base + Math.sin(f.ph * 0.9) * 6
      if (f.def.id === 'moray') {
        f.x = 26
        f.vx = 0
        f.y = this.floorY - 16
      }
      if (f.def.id === 'clown') {
        f.x = this.w / 2 + 14 + Math.sin(f.ph * 1.3) * 6
        f.vx = Math.cos(f.ph * 1.3)
        f.y = this.floorY - 18 + Math.sin(f.ph * 2) * 2
      }
      const near = Math.hypot(f.x - m.x, f.y - m.y) < 30
      if (this.spotted.includes(f.def.id)) continue
      if (near && this.phase === 'play') {
        f.look += dt
        if (f.look >= spotTime(f.def)) {
          this.spotted.push(f.def.id)
          this.flash(0.25)
          sfx.click()
          setTimeout(() => sfx.sparkle(), 120)
          this.praise(f.def.rare ? `หายาก! ${f.def.name}` : `${f.def.name}!`, f.def.rare ? 'pink' : 'blue', 1.3)
          this.streak(f.x, f.y - 10, 6)
          haptic(12)
        }
      } else f.look = Math.max(0, f.look - dt * 0.5)
    }
    for (const b of this.bags) {
      if (b.taken) continue
      b.ph += dt
      b.x += Math.sin(b.ph * 0.7) * 8 * dt
      b.y += Math.sin(b.ph * 1.1) * 4 * dt
      if (Math.hypot(b.x - m.x, b.y - m.y) < 14) {
        b.taken = true
        this.trash++
        this.say(b.x, b.y - 10, 'เก็บถุงพลาสติกแล้ว! เต่าปลอดภัย', 'good', 1.4)
        this.particles.sparkles(b.x, b.y, 6, '#ffffff', 8)
        sfx.chime()
      }
    }
    for (const u of this.urchins) {
      if (m.stun <= 0 && Math.hypot(u.x - m.x, u.y - m.y) < 12) {
        m.stun = 1.2
        m.ty = m.y - 30
        m.tx = m.x
        this.say(m.x, m.y - 16, pick(['โอ๊ย! เม่นทะเล!', 'หนามตำ ระวังหน่อย!', 'อย่าเหยียบปะการังนะ']), 'warn', 1.3)
        this.shake(0.2, 2)
        sfx.error()
        this.breakStreak()
      }
    }
    // The giant clam opens and closes; peek in while it's open.
    this.clam.open = (Math.sin(this.t * 0.8) + 1) / 2
    if (!this.clam.used && this.clam.open > 0.6 && Math.hypot(this.clam.x - m.x, this.clam.y - 8 - m.y) < 16) {
      this.clam.used = true
      const id = rollShell(Math.random, { reef: true, luck: 0.6 })
      this.pearl = id
      const c = COLLECTIBLE_BY_ID[id]
      this.praise(`เจอ${c?.name ?? 'ของสวย'}ในหอยมือเสือ!`, 'gold', 1.6)
      this.particles.sparkles(this.clam.x, this.clam.y - 8, 12, '#fff3a6', 10)
      sfx.levelUp()
    }
  }

  protected input(e: PointerInfo) {
    if (e.type === 'down') this.drag = true
    if (e.type === 'up' || e.type === 'cancel') this.drag = false
    if (this.drag || e.type === 'down') {
      this.me.tx = e.x
      this.me.ty = e.y
    }
  }

  private reef(): HTMLCanvasElement {
    const key = `${this.w}:${this.h}:${this.surfaceY}:${this.floorY}:${this.sea.deep}`
    let c = reefCache.get(key)
    if (c) return c
    const W = this.w
    const H = this.h
    const sy = this.surfaceY
    const fy = this.floorY
    c = bake(W, H, (g) => {
      g.gradientV(0, 0, W, sy, ['#9fe0ff', '#c8f0ff'], 3)
      g.gradientV(0, sy, W, H - sy, [this.sea.shallow, this.sea.mid, this.sea.deep, mix(this.sea.deep, INK, 0.3)], 6)
      // Sand floor with ripples.
      g.poly([[0, fy - 6], [W * 0.3, fy - 2], [W * 0.6, fy - 8], [W, fy - 3], [W, H], [0, H]], '#d8c898')
      for (let x = 0; x < W; x += 5) g.px(x, fy + ((x * 7) % 9), '#c4b484')
      // Corals: brain coral domes, staghorn, sea fans, table coral.
      const brain = (x: number, y: number, r: number, col: string) => {
        g.ellipse(x, y, r, r * 0.7, mix(col, INK, 0.3))
        g.ellipse(x - 1, y - 1, r - 1, r * 0.7 - 1, col)
        for (let i = -r + 2; i < r - 2; i += 3) g.line(x + i, y - 2, x + i + 2, y + 1, mix(col, INK, 0.2))
      }
      const stag = (x: number, y: number, col: string) => {
        for (const [dx, h] of [[-6, 14], [-2, 18], [3, 16], [7, 12]] as [number, number][]) {
          g.thickLine(x, y, x + dx, y - h, 2, col)
          g.px(x + dx, y - h - 1, mix(col, '#ffffff', 0.4))
          g.line(x + dx * 0.6, y - h * 0.6, x + dx * 0.6 + (dx > 0 ? 3 : -3), y - h * 0.6 - 4, col)
        }
      }
      const fan = (x: number, y: number, col: string) => {
        for (let i = -6; i <= 6; i++) g.line(x, y, x + i * 2, y - 18 + Math.abs(i), col)
        g.alpha(0.6)
        g.ellipse(x, y - 10, 12, 8, col)
        g.alpha(1)
      }
      const anemone = (x: number, y: number) => {
        g.ellipse(x, y, 10, 4, '#b86a9a')
        for (let i = -9; i <= 9; i += 2) g.line(x + i, y, x + i + Math.round(Math.sin(i) * 2), y - 8 - (i % 3), '#e8a0d0')
      }
      fan(24, fy - 8, '#b37cf0')
      brain(56, fy - 6, 10, '#e8a060')
      stag(86, fy - 4, '#ff7a8a')
      anemone(W / 2 + 14, fy - 10)
      brain(W / 2 + 44, fy - 5, 8, '#9ad06a')
      fan(W - 20, fy - 8, '#ff6f91')
      stag(W - 64, fy - 4, '#ffd23f')
      // Table coral ledge.
      g.ellipse(W / 2 - 30, fy - 24, 18, 4, '#7ac0a8')
      g.thickLine(W / 2 - 30, fy - 24, W / 2 - 30, fy - 6, 3, '#5a9a88')
      // Seaweed clumps.
      for (const x of [10, 70, 130, W - 10]) for (let k = 0; k < 3; k++) g.line(x + k * 2, fy, x + k * 2 + (k - 1) * 3, fy - 16 - k * 4, '#43905a')
      // Moray's rock with a hole.
      g.ellipse(22, fy - 12, 14, 10, '#6e6a78')
      g.ellipse(20, fy - 14, 11, 7, '#8a8494')
      g.ellipse(26, fy - 14, 4, 3, '#2a2030')
    })
    reefCache.set(key, c)
    return c
  }

  protected draw(g: Surface) {
    g.draw(this.reef(), 0, 0)
    // Light rays from the surface.
    g.ctx.save()
    g.ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 5; i++) {
      const x = ((i * 47 + this.t * 6) % (this.w + 40)) - 20
      g.ctx.fillStyle = `rgba(200,240,255,${(0.05 + Math.sin(this.t + i) * 0.02).toFixed(3)})`
      g.ctx.beginPath()
      g.ctx.moveTo(x, this.surfaceY)
      g.ctx.lineTo(x + 10, this.surfaceY)
      g.ctx.lineTo(x - 20, this.floorY)
      g.ctx.lineTo(x - 36, this.floorY)
      g.ctx.fill()
    }
    g.ctx.restore()
    // Surface ripples.
    for (let x = 0; x < this.w; x++) g.px(x, this.surfaceY + Math.round(Math.sin(x * 0.2 + this.t * 3) * 1.2), '#e8fbff')
    // Anemone tentacles sway (over the baked one).
    for (let i = -9; i <= 9; i += 3) g.line(this.w / 2 + 14 + i, this.floorY - 10, this.w / 2 + 14 + i + Math.round(Math.sin(this.t * 2 + i) * 2), this.floorY - 18, '#f4b8e0')
    this.drawClam(g)
    for (const u of this.urchins) this.drawUrchin(g, u.x, u.y)
    for (const b of this.bags) if (!b.taken) this.drawBag(g, b)
    for (const f of this.fish) this.drawFish(g, f)
    this.drawMe(g)
  }

  private drawMe(g: Surface) {
    const m = this.me
    const pose = Math.floor(this.t * 3) % 2 ? BP.swim0 : BP.swim1
    const sp = dollSprite(game.value.player.look, pose, { view: 'front' })
    const c = g.ctx
    c.save()
    c.translate(Math.round(m.x - g.ox), Math.round(m.y - g.oy + Math.sin(this.t * 2) * 1.5))
    c.rotate(m.dir > 0 ? Math.PI / 2 : -Math.PI / 2)
    if (m.stun > 0) c.rotate(Math.sin(this.t * 30) * 0.1)
    c.drawImage(sp.canvas, -Math.round(sp.w / 2), -Math.round(sp.h / 2))
    c.restore()
    // Snorkel tube poking up.
    g.vline(Math.round(m.x + m.dir * 16), Math.round(m.y - 14), Math.round(m.y - 6), '#ffd23f')
    g.px(Math.round(m.x + m.dir * 16), Math.round(m.y - 15), '#e8514a')
  }

  private drawFish(g: Surface, f: Fish) {
    const d = f.def
    for (let k = 0; k < f.n; k++) {
      const x = Math.round(f.x + (k % 2 ? 8 : -6) * (k > 0 ? 1 : 0) + k * 5 * Math.sign(-f.vx || 1))
      const y = Math.round(f.y + (k % 2 ? 5 : -3) * (k > 0 ? 1 : 0))
      const flip = f.vx < 0
      const s = flip ? -1 : 1
      const tail = Math.floor(f.ph * 8 + k) % 2
      switch (d.id) {
        case 'clown':
          g.ellipse(x, y, 4, 2.4, '#ff7a1a')
          g.vline(x - s, y - 2, y + 2, '#fffaf0')
          g.vline(x + s * 2, y - 2, y + 2, '#fffaf0')
          g.px(x + s * 3, y - 1, INK)
          g.px(x - s * 5, y - 1 + tail, '#ff7a1a')
          break
        case 'sergeant':
          g.ellipse(x, y, 4, 2.6, '#f0e060')
          for (const dx of [-2, 0, 2]) g.vline(x + dx, y - 2, y + 1, '#3a3a4a')
          g.px(x + s * 3, y - 1, INK)
          g.px(x - s * 5, y + tail - 1, '#e0d050')
          break
        case 'parrot':
          g.ellipse(x, y, 7, 3.6, '#3ac0a8')
          g.ellipse(x - s * 2, y - 1, 3, 1.5, '#ff9fc0')
          g.px(x + s * 6, y, '#fffaf0')
          g.px(x + s * 4, y - 2, INK)
          g.poly([[x - s * 7, y], [x - s * 10, y - 3 + tail], [x - s * 10, y + 3 - tail]], '#2a9a88')
          break
        case 'butterfly':
          g.ellipse(x, y, 4, 4, '#ffd23f')
          g.vline(x + s * 2, y - 3, y + 3, '#3a3a4a')
          g.px(x - s * 2, y + 1, '#3a3a4a')
          g.px(x + s * 4, y, INK)
          break
        case 'idol':
          g.ellipse(x, y, 4, 4, '#fffaf0')
          g.vline(x, y - 3, y + 3, '#3a3a4a')
          g.line(x, y - 4, x - s * 6, y - 10, '#fffaf0')
          g.px(x + s * 3, y - 1, INK)
          g.px(x - s * 4, y + 1, '#ffd23f')
          break
        case 'tang':
          g.ellipse(x, y, 5, 3, '#3d63d5')
          g.line(x - s * 3, y - 1, x + s * 2, y - 1, '#1a2a7a')
          g.px(x - s * 5, y + tail, '#ffd23f')
          g.px(x + s * 4, y - 1, INK)
          break
        case 'turtle':
          g.ellipse(x, y, 9, 5, '#6a5a3a')
          for (const [dx, dy] of [[-3, -1], [2, -2], [0, 2], [4, 1]] as [number, number][]) g.rect(x + dx, y + dy, 2, 2, '#a88a4a')
          g.ellipse(x + s * 11, y, 3, 2, '#8a8a5a')
          g.px(x + s * 12, y - 1, INK)
          g.line(x + s * 4, y + 3, x + s * 10, y + 7 + tail, '#8a8a5a')
          g.line(x - s * 4, y + 3, x - s * 8, y + 6 - tail, '#8a8a5a')
          break
        case 'moray': {
          const out = Math.round((Math.sin(f.ph * 0.8) + 1) * 4)
          g.thickLine(x + 4, y + 2, x + 4 + out, y - 2, 3, '#7a9a3a')
          g.px(x + 5 + out, y - 3, INK)
          if (out > 5 && Math.floor(f.ph * 4) % 2) g.px(x + 7 + out, y - 1, '#ffffff')
          break
        }
        case 'shark':
          g.ellipse(x, y, 10, 3, '#8a94a8')
          g.ellipse(x, y + 1, 8, 1.5, '#e0e4ec')
          g.poly([[x, y - 2], [x - s * 2, y - 7], [x + s * 3, y - 2]], '#6a7488')
          g.px(x - s * 2, y - 7, INK)
          g.px(x + s * 7, y - 1, INK)
          g.poly([[x - s * 10, y], [x - s * 14, y - 4 + tail], [x - s * 13, y + 3]], '#6a7488')
          break
      }
      if (k === 0 && f.look > 0 && !this.spotted.includes(d.id)) {
        const p = Math.min(1, f.look / spotTime(d))
        g.rect(x - 6, y - 10, 12, 2, INK)
        g.rect(x - 6, y - 10, Math.round(12 * p), 2, '#ffe27a')
      }
      if (k === 0 && this.spotted.includes(d.id) && Math.floor(this.t * 2 + x) % 5 === 0) twinkle(g, x, y - 8, 0.5)
    }
  }

  private drawBag(g: Surface, b: Bag) {
    const x = Math.round(b.x)
    const y = Math.round(b.y)
    g.alpha(0.8)
    g.poly([[x - 5, y + 4], [x - 4, y - 4], [x + 4, y - 5], [x + 5, y + 3]], '#f4f8ff')
    g.alpha(1)
    g.line(x - 4, y + 4, x - 6, y + 9 + Math.round(Math.sin(b.ph * 3)), '#f4f8ff')
    g.line(x + 4, y + 3, x + 6, y + 8 - Math.round(Math.sin(b.ph * 3)), '#f4f8ff')
    if (Math.floor(this.t * 3) % 2) g.px(x, y - 8, '#ff6a4a')
  }

  private drawUrchin(g: Surface, x: number, y: number) {
    for (let i = 0; i < 10; i++) {
      const a = Math.PI + (i / 9) * Math.PI
      g.line(x, y, x + Math.cos(a) * 6, y + Math.sin(a) * 6, '#2a2038')
    }
    g.circle(x, y, 2.5, '#3a2a48')
    g.px(x - 1, y - 1, '#6a5a88')
  }

  private drawClam(g: Surface) {
    const { x, y, open, used } = this.clam
    const gap = Math.round(open * 5)
    g.ellipse(x, y, 12, 4, '#4a7a9a')
    g.ellipse(x, y - 1, 11, 3, '#3ab0c8')
    if (gap > 0) {
      g.ellipse(x, y - 3, 9, gap / 2 + 0.5, '#2a5a7a')
      if (!used && open > 0.5) {
        g.circle(x, y - 3, 2, '#fff0f4')
        twinkle(g, x + 2, y - 5, open)
      }
    }
    g.poly([[x - 12, y - 1 - gap], [x - 6, y - 7 - gap], [x, y - 4 - gap], [x + 6, y - 7 - gap], [x + 12, y - 1 - gap], [x, y - 2 - gap]], '#5a8aaa')
    g.line(x - 10, y - 2 - gap, x + 10, y - 2 - gap, '#8ac0d8')
  }
}

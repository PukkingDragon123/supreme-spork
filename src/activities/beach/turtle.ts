// ปล่อยเต่าทะเล: a moonlit release with the turtle-centre vet. Hatchlings
// scramble out of the nest and crawl for the moonlight on the waves. Tap a
// hatchling to nudge it straight to the sea; tap ghost crabs away before
// they flip one over (tap a flipped one to set it right); a seagull's
// shadow circles before it swoops, tap the gull to shoo it. The player
// stands behind the nest with a red torch (red light doesn't confuse
// turtles) and waves their arms when shooing.

import type { PointerInfo } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { sfx, haptic } from '../../engine/audio'
import { Worker } from '../jobs/worker'
import { BP } from '../../art/poses/beach'
import { drawFist } from '../../art/workActor'
import { BeachScene, backdrop, drawSurf, shadow, twinkle, bwrist, INK } from './base'
import { steerTurtle, TURTLE_THRESHOLDS, TURTLES } from './rules'
import type { BeachRoundStats } from '../../game/beach'
import { SEA, mix } from '../../art/places/beach-kit'
import { drawGlow } from '../../scenes/sky'

interface Hatchling {
  x: number
  y: number
  a: number
  out: number
  state: 'nest' | 'crawl' | 'flip' | 'safe' | 'gone'
  t: number
  boost: number
  shell: string
}

interface Crab {
  x: number
  y: number
  dir: number
  t: number
  scared: number
  active: boolean
}

interface Gull {
  x: number
  y: number
  target: number
  circle: number
  swoop: number
  state: 'circle' | 'swoop' | 'leave'
}

export class TurtleScene extends BeachScene {
  duration = 45
  thresholds = TURTLE_THRESHOLDS
  night = true
  private turtles: Hatchling[] = []
  private crabs: Crab[] = []
  private gulls: Gull[] = []
  private horizon = 50
  private shore = 120
  private nest = { x: 95, y: 320 }
  private saved = 0
  private lost = 0
  private nextGull = 6
  private shoo = 0

  goalText() {
    return `ลูกเต่าถึงทะเล ${this.saved}/${TURTLES} ตัว`
  }
  progress() {
    return this.saved / TURTLES
  }
  complete() {
    return this.saved + this.lost >= TURTLES && this.turtles.every((t) => t.state === 'safe' || t.state === 'gone')
  }
  cheerText() {
    return 'ลูกเต่าลงทะเลครบ!'
  }
  stats(): BeachRoundStats {
    return { score: this.saved, turtles: this.saved }
  }
  summary() {
    return {
      title: this.saved >= 11 ? 'บ๊ายบายลูกเต่า แข็งแรงนะ!' : 'ช่วยลูกเต่าลงทะเลแล้ว',
      lines: [`ลูกเต่าถึงทะเล ${this.saved} จาก ${TURTLES} ตัว`, 'ในธรรมชาติ พันตัวรอดเป็นเต่าโตได้แค่ตัวเดียว', 'โตขึ้นลูกเต่าตัวเมียจะกลับมาวางไข่ที่หาดเดิม'],
    }
  }

  protected anchor() {
    this.horizon = this.top + 22
    this.shore = this.top + 82
    this.nest = { x: this.cx, y: this.bottom - 58 }
  }
  protected populate() {
    this.saved = 0
    this.lost = 0
    this.turtles = Array.from({ length: TURTLES }, (_, i) => ({ x: this.nest.x + rand(-8, 8), y: this.nest.y + rand(-3, 3), a: -Math.PI / 2 + rand(-0.9, 0.9), out: 0.6 + i * 1.3 + rand(0, 0.8), state: 'nest', t: 0, boost: 0, shell: pick(['#4a7a4a', '#5a7a44', '#3e6a52']) }))
    this.crabs = [0, 1, 2].map((i) => ({ x: i % 2 ? this.w + 10 : -10, y: this.shore + 40 + i * 50, dir: i % 2 ? -1 : 1, t: rand(0, 4), scared: 0, active: false }))
    this.gulls = []
    this.worker = this.worker ?? new Worker(this.nest.x, this.bottom - 6)
    this.worker.place(this.nest.x + 30, this.bottom - 6)
    this.worker.view = 'back'
    this.worker.pose = BP.torch
  }

  protected tick(dt: number) {
    const w = this.worker!
    this.shoo = Math.max(0, this.shoo - dt)
    w.view = 'back'
    w.pose = this.shoo > 0 ? (Math.floor(this.t * 10) % 2 ? BP.shoo0 : BP.shoo1) : BP.torch
    if (this.phase !== 'play') return
    for (const h of this.turtles) {
      h.t += dt
      if (h.state === 'nest') {
        if (this.elapsed >= h.out) {
          h.state = 'crawl'
          this.particles.add({ kind: 'dot', x: h.x, y: h.y, vx: rand(-10, 10), vy: -12, g: 60, max: 0.4, color: '#e0c89a' })
          if (Math.random() < 0.3) this.say(h.x, h.y - 10, pick(['ฟักแล้ว!', 'ตัวเล็กนิดเดียว!', 'ไปเลยลูก!']), 'good', 1)
        }
        continue
      }
      if (h.state !== 'crawl') continue
      // Wander toward the moonlit water, a boost steers straight up.
      h.boost = Math.max(0, h.boost - dt)
      h.a += Math.sin(h.t * 2.1 + h.out) * dt * 0.9
      if (h.boost > 0) h.a = steerTurtle(h.a, dt * 6)
      h.a = Math.max(-Math.PI + 0.2, Math.min(-0.2, h.a))
      const sp = h.boost > 0 ? 34 : 13
      h.x += Math.cos(h.a) * sp * dt
      h.y += Math.sin(h.a) * sp * dt
      if (h.x < 6 || h.x > this.w - 6) h.a = -Math.PI - h.a
      h.x = Math.max(4, Math.min(this.w - 4, h.x))
      if (h.y <= this.shore + 2) {
        h.state = 'safe'
        this.saved++
        for (let i = 0; i < 8; i++) this.particles.add({ kind: 'drop', x: h.x, y: h.y, vx: rand(-20, 20), vy: rand(-30, -10), g: 90, max: 0.6, color: '#bfe8ff' })
        this.particles.add({ kind: 'ripple', x: h.x, y: h.y - 2, max: 1, color: '#e8fbff', size: 6 })
        this.say(h.x, h.y - 6, pick(['บ๊ายบาย!', 'ว่ายเก่ง ๆ นะ', 'แล้วเจอกันใหม่!', 'สู้ ๆ ลูกเต่า!']), 'good', 1.2)
        sfx.splash()
        this.streak(h.x, h.y - 10, 3)
      }
    }
    // Crabs come out and go for the nearest hatchling.
    for (const c of this.crabs) {
      c.t += dt
      c.scared = Math.max(0, c.scared - dt)
      if (!c.active) {
        if (c.t > 4 + this.crabs.indexOf(c) * 5) c.active = true
        continue
      }
      if (c.scared > 0) {
        c.x += c.dir * 90 * dt
        if (c.x < -20 || c.x > this.w + 20) {
          c.scared = 0
          c.active = false
          c.t = 0
          c.dir *= -1
        }
        continue
      }
      const prey = this.turtles.filter((h) => h.state === 'crawl').sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0]
      if (prey) {
        const dx = prey.x - c.x
        const dy = prey.y - c.y
        const d = Math.hypot(dx, dy)
        c.dir = dx < 0 ? -1 : 1
        c.x += (dx / d) * 20 * dt
        c.y += (dy / d) * 12 * dt
        if (d < 5) {
          prey.state = 'flip'
          prey.t = 0
          c.scared = 1.5
          c.dir = c.x < this.w / 2 ? -1 : 1
          this.say(prey.x, prey.y - 8, 'หงายท้องแล้ว! แตะช่วยพลิก', 'warn', 1.4)
          sfx.scratch()
          this.breakStreak()
        }
      }
    }
    // Flipped hatchlings give up after a while (the centre staff carry them down).
    for (const h of this.turtles) {
      if (h.state === 'flip' && h.t > 7) {
        h.state = 'gone'
        this.lost++
      }
    }
    // Seagulls.
    this.nextGull -= dt
    if (this.nextGull <= 0) {
      this.nextGull = rand(6, 9)
      const alive = this.turtles.filter((h) => h.state === 'crawl')
      if (alive.length) {
        const tgt = this.turtles.indexOf(pick(alive))
        this.gulls.push({ x: -10, y: this.top + 20, target: tgt, circle: 2.2, swoop: 0, state: 'circle' })
        sfx.whoosh()
      }
    }
    for (const gl of this.gulls) {
      const h = this.turtles[gl.target]
      if (gl.state === 'circle') {
        gl.circle -= dt
        const tx = h.x + Math.cos(this.t * 3) * 18
        const ty = h.y - 50 + Math.sin(this.t * 3) * 6
        gl.x += (tx - gl.x) * Math.min(1, dt * 3)
        gl.y += (ty - gl.y) * Math.min(1, dt * 3)
        if (gl.circle <= 0 || h.state !== 'crawl') gl.state = h.state === 'crawl' ? 'swoop' : 'leave'
      } else if (gl.state === 'swoop') {
        gl.swoop += dt
        gl.x += (h.x - gl.x) * Math.min(1, dt * 6)
        gl.y += (h.y - 6 - gl.y) * Math.min(1, dt * 6)
        if (Math.hypot(gl.x - h.x, gl.y - h.y) < 8 && h.state === 'crawl') {
          h.state = 'gone'
          this.lost++
          gl.state = 'leave'
          this.say(h.x, h.y - 10, 'นกคาบไปแล้ว!', 'warn', 1.4)
          this.worker?.reactWith('oops', 1)
          this.breakStreak()
        }
        if (h.state !== 'crawl') gl.state = 'leave'
      } else {
        gl.y -= 60 * dt
        gl.x += 30 * dt
      }
    }
    this.gulls = this.gulls.filter((g) => g.y > this.top - 30)
  }

  protected input(e: PointerInfo) {
    if (e.type !== 'down') return
    for (const gl of this.gulls) {
      if (gl.state !== 'leave' && Math.hypot(e.x - gl.x, e.y - gl.y) < 16) {
        gl.state = 'leave'
        this.shoo = 0.8
        this.say(gl.x, gl.y - 6, pick(['ชู่ว ๆ ไปไกล ๆ!', 'แกว๊ก! (บินหนี)', 'อย่ามานะ!']), 'good', 1)
        sfx.tap()
        haptic(10)
        return
      }
    }
    for (const c of this.crabs) {
      if (c.active && c.scared <= 0 && Math.hypot(e.x - c.x, e.y - c.y) < 12) {
        c.scared = 2
        c.dir = e.x < this.w / 2 ? -1 : 1
        this.shoo = 0.6
        this.say(c.x, c.y - 8, pick(['ไปเลยปูลม!', 'อย่ามาแกล้งลูกเต่า!']), 'good', 1)
        sfx.scratch()
        return
      }
    }
    let best: Hatchling | null = null
    let bd = 14
    for (const h of this.turtles) {
      if (h.state !== 'crawl' && h.state !== 'flip') continue
      const d = Math.hypot(e.x - h.x, e.y - h.y)
      if (d < bd) {
        bd = d
        best = h
      }
    }
    if (!best) return
    if (best.state === 'flip') {
      best.state = 'crawl'
      best.boost = 1
      best.a = -Math.PI / 2
      this.particles.hearts(best.x, best.y - 6, 2)
      sfx.sparkle()
      return
    }
    best.boost = 1.2
    this.particles.add({ kind: 'dot', x: best.x, y: best.y + 2, vx: 0, vy: 10, max: 0.3, color: '#e0c89a' })
    sfx.tap()
  }

  protected draw(g: Surface) {
    g.draw(backdrop(this.w, this.h, { horizon: this.horizon, shore: this.shore, night: true, sea: this.sea }), 0, 0)
    // Moon and its path on the sea (the light the hatchlings follow).
    const mx = this.cx + 30
    g.circle(mx, this.horizon - 12, 7, '#fff6c8')
    g.circle(mx - 2, this.horizon - 13, 2, '#f0e6b0')
    for (let y = this.horizon + 2; y < this.shore - 4; y += 2) {
      const spread = 3 + (y - this.horizon) * 0.35
      for (let x = Math.round(mx - spread); x <= mx + spread; x += 2) if (Math.sin(y * 0.8 + x + this.t * 3) > 0.3) g.px(x, y, '#e8f0ff')
    }
    drawSurf(g, this.w, this.shore, this.t, SEA.night, 6)
    // Hatchery fence and sign behind the nest.
    const n = this.nest
    for (let x = n.x - 30; x <= n.x + 30; x += 6) g.vline(x, n.y - 2, n.y + 10, '#8a6a52')
    g.hline(n.x - 30, n.x + 30, n.y + 2, '#a88a6a')
    g.ellipse(n.x, n.y + 2, 14, 5, '#9a8a6a')
    g.ellipse(n.x, n.y + 1, 12, 4, '#b8a47e')
    // Egg shells in the nest.
    for (let i = 0; i < 7; i++) g.px(n.x - 8 + i * 3, n.y + (i % 2), '#e8e0d4')
    const draws: { y: number; f: () => void }[] = []
    for (const h of this.turtles) if (h.state === 'crawl' || h.state === 'flip' || (h.state === 'nest' && this.elapsed > h.out - 0.8)) draws.push({ y: h.y, f: () => this.drawTurtle(g, h) })
    for (const c of this.crabs) if (c.active) draws.push({ y: c.y, f: () => this.drawCrab(g, c) })
    draws.push({ y: this.worker!.y, f: () => this.drawWorker(g) })
    draws.sort((a, b) => a.y - b.y).forEach((d) => d.f())
    // Gull shadows (warning) and the gulls.
    for (const gl of this.gulls) {
      const h = this.turtles[gl.target]
      if (gl.state === 'circle') {
        g.alpha(0.25 + Math.sin(this.t * 8) * 0.1)
        g.ellipse(h.x, h.y + 2, 9, 3, INK)
        g.alpha(1)
        if (Math.floor(this.t * 4) % 2) g.px(h.x, h.y - 10, '#ff6a4a')
      }
      this.drawGull(g, gl)
    }
  }

  glowPass(g: Surface) {
    void g
  }

  private drawWorker(g: Surface) {
    const w = this.worker!
    shadow(g, w.x, w.y + 1, 9, 2.4)
    w.draw(g)
    const [rx, ry] = bwrist(w.shownPose, 'R', w.x, w.feetY)
    // Red torch and its soft red beam on the sand.
    g.rect(rx - 1, ry - 5, 3, 6, '#3a3040')
    g.rect(rx - 1, ry - 6, 3, 1, '#ff4a4a')
    drawFist(g, w.look, rx, ry)
    drawGlow(g, rx, ry - 30, 24, 0.5, '#ff5a4a')
  }

  private drawTurtle(g: Surface, h: Hatchling) {
    const x = Math.round(h.x)
    const y = Math.round(h.y)
    shadow(g, x, y + 1, 4, 1.2, 0.3)
    if (h.state === 'flip') {
      g.ellipse(x, y - 1, 3, 2, '#e8d8b0')
      const k = Math.floor(h.t * 8) % 2
      g.px(x - 3, y - 3 + k, '#3a5a3a')
      g.px(x + 3, y - 3 + (1 - k), '#3a5a3a')
      g.px(x - 2, y - 4 + (1 - k), '#3a5a3a')
      g.px(x + 2, y - 4 + k, '#3a5a3a')
      if (Math.floor(this.t * 3) % 2) g.px(x, y - 7, '#ffd23f')
      return
    }
    const f = Math.floor(h.t * (h.boost > 0 ? 14 : 7)) % 2
    // Facing: draw a little turtle rotated by heading (4 directions + diagonals via offsets).
    const dx = Math.cos(h.a)
    const dy = Math.sin(h.a)
    // Flippers paddling (perpendicular to the heading), a round shell, a head with eyes.
    const px = -dy
    const py = dx
    const fl = '#2e4a32'
    for (const side of [-1, 1]) {
      const sw = side * (f ? 1 : -1)
      g.line(x + px * side * 3 + dx * 1.5, y + py * side * 3 + dy * 1.5, x + px * side * 5 + dx * (2.5 + sw), y + py * side * 5 + dy * (2.5 + sw), fl)
      g.px(Math.round(x + px * side * 3 - dx * 2), Math.round(y + py * side * 3 - dy * 2), fl)
    }
    g.ellipse(x, y, 3.4, 3, mix(h.shell, INK, 0.3))
    g.ellipse(x - 0.3, y - 0.3, 2.9, 2.5, h.shell)
    g.px(x, y, mix(h.shell, '#ffffff', 0.2))
    g.px(x - 1, y - 1, mix(h.shell, '#ffffff', 0.45))
    g.px(x + 1, y + 1, mix(h.shell, INK, 0.15))
    const hx = Math.round(x + dx * 4.5)
    const hy = Math.round(y + dy * 4.5)
    g.circle(hx, hy, 1.6, '#6a8a6a')
    g.px(Math.round(hx + px), Math.round(hy + py), INK)
    g.px(Math.round(hx - px), Math.round(hy - py), INK)
    if (h.boost > 0) twinkle(g, x, y - 5, 0.3)
  }

  private drawCrab(g: Surface, c: Crab) {
    const x = Math.round(c.x)
    const y = Math.round(c.y)
    shadow(g, x, y + 1, 4, 1.2, 0.3)
    const leg = Math.floor(c.t * 18) % 2
    g.ellipse(x, y - 1, 3, 2, '#b8a88a')
    g.ellipse(x, y - 1.5, 2.4, 1.4, '#d8c8a8')
    for (const s of [-1, 1]) {
      g.px(x + s * 4, y - leg, '#a8987a')
      g.px(x + s * 4, y + leg - 1, '#a8987a')
      g.px(x + s * 3, y - 3 - (c.scared > 0 ? 2 : 0), '#e8d8b8')
    }
    g.px(x - 1, y - 4, '#ffffff')
    g.px(x + 1, y - 4, '#ffffff')
  }

  private drawGull(g: Surface, gl: Gull) {
    const x = Math.round(gl.x)
    const y = Math.round(gl.y)
    const flap = Math.floor(this.t * (gl.state === 'swoop' ? 14 : 7)) % 2
    g.rect(x - 2, y - 1, 5, 3, '#f4f4fa')
    g.px(x + 3, y, '#ffb020')
    g.px(x + 2, y - 1, INK)
    const c = '#e0e0ec'
    if (flap) {
      g.line(x - 8, y - 4, x - 1, y, c)
      g.line(x + 9, y - 4, x + 2, y, c)
    } else {
      g.line(x - 8, y + 2, x - 1, y, c)
      g.line(x + 9, y + 2, x + 2, y, c)
    }
    g.px(x - 8, y + (flap ? -4 : 2), '#5a6070')
    g.px(x + 9, y + (flap ? -4 : 2), '#5a6070')
  }
}

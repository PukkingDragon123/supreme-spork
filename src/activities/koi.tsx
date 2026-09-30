// ให้อาหารปลา – you stand on the wooden deck at the pond's edge with a bag
// of food; tap the water and you toss a pellet there in an arc. Koi (or the
// riverside catfish) race over and gulp it up. Fish bodies are procedural so
// they bend as they swim.

import { useEffect, useRef, useState } from 'preact/hooks'
import type { PointerInfo, Scene } from '../engine/stage'
import { bake, ditherOn, type Surface } from '../engine/pixel'
import { Particles, drawRing } from '../engine/particles'
import { rand } from '../engine/rng'
import { P } from '../art/palette'
import { lotusFlower } from '../art/props'
import type { AvatarLook } from '../art/avatar'
import { drawFoodBag, drawPlayer, handAt, Juice, motes, vignette, type Placed } from '../art/minigames/temple'
import { Critters, Crowd, drawStall } from '../art/minigames/scenery'
import { TEMPLE_KID, UNCLE_KOI } from '../art/minigames/hosts'
import { comboPraise, starsFrom } from '../art/minigames/rules'
import { tsfx } from '../art/minigames/sfx'
import { game, mutate } from '../game/state'
import { addMerit, count, track, useItem } from '../game/actions'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, useStage } from './kit'
import { QuickBuy } from './quickbuy'
import { Btn, Icon } from '../ui/components/common'
import { toast } from '../game/events'
import { sfx, haptic } from '../engine/audio'
import { ComboBadge, PraiseLayer, TempleResult, praise, type TempleResultData } from './temple-ui'

type Variety = { base: string; patch: string; patch2?: string; name: string }

const KOI: Variety[] = [
  { name: 'kohaku', base: '#fffaf0', patch: '#f0592b' },
  { name: 'sanke', base: '#fffaf0', patch: '#e8452f', patch2: '#2f2838' },
  { name: 'showa', base: '#2f2838', patch: '#e8452f', patch2: '#fffaf0' },
  { name: 'kigoi', base: '#ffd23f', patch: '#ffe98a' },
  { name: 'chagoi', base: '#b8844a', patch: '#9a6a3a' },
  { name: 'orange', base: '#ff8a3d', patch: '#ffb36a' },
  { name: 'asagi', base: '#8fb6d8', patch: '#e8452f' },
]
const GOLDEN: Variety = { name: 'ogon', base: '#ffd54f', patch: '#fff3a6' }
const CATFISH: Variety = { name: 'catfish', base: '#8f97a8', patch: '#b8bfcc', patch2: '#5e6577' }

/** Consecutive feeds within this many seconds keep the combo going. */
const COMBO_WINDOW = 1.6

interface Fish {
  x: number
  y: number
  a: number
  speed: number
  len: number
  v: Variety
  seed: number
  target: Pellet | null
  wiggle: number
  golden: boolean
  full: number
  gulp: number
}

interface Pellet {
  x: number
  y: number
  life: number
  taken: boolean
}

interface Toss {
  x0: number
  y0: number
  x1: number
  y1: number
  t: number
}

class PondScene implements Scene {
  w = 160
  h = 320
  t = 0
  fish: Fish[] = []
  pellets: Pellet[] = []
  tosses: Toss[] = []
  particles = new Particles()
  juice = new Juice()
  pads: { x: number; y: number; r: number; flower: boolean; ph: number }[] = []
  turtle: { x: number; y: number; t: number } | null = null
  /** Seconds left of the throwing pose, and which way the player faces. */
  throwT = 0
  flip = false
  onThrow?: () => boolean
  onEat?: (f: Fish) => void
  private bg: HTMLCanvasElement | null = null
  critters = new Critters()
  crowd = new Crowd()
  private lifeInit = false
  private placed: Placed | null = null
  constructor(
    public river: boolean,
    public look: AvatarLook,
  ) {}

  /** Top of the wooden deck the player stands on (the pond is above it). */
  get deckY() {
    return Math.round(this.h * 0.68)
  }
  get playerX() {
    return Math.round(this.w / 2)
  }
  get footY() {
    return this.deckY + 23
  }

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
    if (!this.fish.length) this.spawn()
    if (!this.lifeInit) {
      this.lifeInit = true
      const dy = this.deckY
      this.critters.bird(5, dy - 16).bird(w - 5, dy - 16).bird(Math.round(w * 0.42), dy - 6).cat(Math.round(w * 0.7), dy + 26, '#9a8a80', 'sleep').butterfly(Math.round(w * 0.3), Math.round(h * 0.2), '#ff9fc0')
      this.crowd.add({ look: TEMPLE_KID, x: Math.round(w * 0.86), y: dy + 18, view: 'back', idle: 'stand', reactPose: 'cheer' })
    }
  }

  private spawn() {
    const n = this.river ? 8 : 7
    const golden = !this.river && Math.random() < 0.35
    for (let i = 0; i < n; i++) {
      const isGold = golden && i === 0
      this.fish.push({
        x: rand(20, this.w - 20),
        y: rand(30, this.deckY - 24),
        a: rand(0, Math.PI * 2),
        speed: rand(10, 16),
        len: this.river ? rand(20, 26) : rand(12, 17),
        v: this.river ? CATFISH : isGold ? GOLDEN : KOI[i % KOI.length],
        seed: rand(0, 10),
        target: null,
        wiggle: rand(0, 6),
        golden: isGold,
        full: 0,
        gulp: 0,
      })
    }
    for (let i = 0; i < 7; i++)
      this.pads.push({ x: rand(10, this.w - 10), y: rand(24, this.deckY - 16), r: rand(5, 9), flower: !this.river && i % 3 === 0, ph: rand(0, 6) })
  }

  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    const ph = this.deckY + 4
    this.bg = bake(w, h, (g) => {
      const deep = this.river ? '#5f7f5a' : P.waterDD
      const mid = this.river ? '#7a9a62' : P.waterD
      const shallow = this.river ? '#9ab87a' : P.water
      g.rect(0, 0, w, ph, mid)
      for (let y = 0; y < ph; y++)
        for (let x = 0; x < w; x++) {
          const dx = (x - w / 2) / (w / 2)
          const dy = (y - ph / 2) / (ph / 2)
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 0.7 && ditherOn(x, y, (0.7 - d) * 1.6)) g.px(x, y, deep)
          if (d > 0.85 && ditherOn(x, y, (d - 0.85) * 3)) g.px(x, y, shallow)
        }
      // Pebbles and weeds on the bottom.
      for (let i = 0; i < 70; i++) g.px((i * 97) % w, (i * 61) % ph, this.river ? '#6a8a52' : '#3a6f98')
      for (let i = 0; i < 8; i++) {
        const x = 8 + ((i * 41) % (w - 16))
        const y = 20 + ((i * 67) % (ph - 40))
        for (let k = 0; k < 5; k++) g.px(x + Math.round(Math.sin(k) * 1.5), y - k, this.river ? '#5a7a4a' : '#2f7a78')
      }
      // Stone rim along the top.
      for (let x = -4; x < w + 4; x += 9) {
        g.ellipse(x, 4, 7, 6, P.stoneD)
        g.ellipse(x, 3, 6, 5, P.stone)
        g.px(x - 2, 1, P.stoneL)
      }
      if (this.river) {
        g.rect(0, 0, w, 10, '#9a6a45')
        for (let x = 0; x < w; x += 8) g.vline(x, 0, 9, '#7a5238')
      }
      // Wooden deck the player stands on, with its shadow on the water.
      const dy = this.deckY
      g.alpha(0.35)
      g.rect(0, dy - 3, w, 4, '#0a1e32')
      g.alpha(1)
      for (let x = 10; x < w; x += 32) {
        g.rect(x, dy - 6, 4, 8, '#5a3a26')
        g.rect(x, dy - 6, 4, 1, '#8a5a32')
      }
      g.rect(0, dy, w, h - dy, '#b8844a')
      for (let y = dy + 3; y < h; y += 6) {
        g.hline(0, w - 1, y, '#8a5a32')
        g.hline(0, w - 1, y + 1, '#d9a468')
        for (let x = (Math.floor(y / 6) * 23) % 37; x < w; x += 37) g.vline(x, y + 1, y + 5, '#8a5a32')
      }
      g.rect(0, dy, w, 2, '#6e4a35')
      g.hline(0, w - 1, dy + 2, '#e3b27a')
      // Railing posts at both ends.
      for (const x of [3, w - 7]) {
        g.rect(x, dy - 16, 4, 20, '#6e4a35')
        g.rect(x, dy - 16, 4, 2, '#b8844a')
      }
      // A little honesty box of fish food and a lantern post on the deck.
      const bx = -100
      g.ellipse(bx, dy + 20, 10, 2.5, 'rgba(40,20,10,0.3)')
      g.rect(bx - 8, dy + 6, 16, 14, '#8e2a3c')
      g.rect(bx - 8, dy + 6, 16, 2, P.gold)
      g.rect(bx - 6, dy + 10, 12, 7, '#fff1d6')
      for (let i = 0; i < 3; i++) g.rect(bx - 5 + i * 4, dy + 12, 3, 4, i === 1 ? '#c28e5c' : '#e8c07a')
      const lx = Math.round(w * 0.86)
      g.ellipse(lx, dy + 22, 5, 1.5, 'rgba(40,20,10,0.3)')
      g.rect(lx - 1, dy - 4, 3, 26, '#6e4a35')
      g.rect(lx - 4, dy - 12, 9, 9, '#c0392b')
      g.rect(lx - 3, dy - 11, 7, 7, '#ffcf7a')
      g.rect(lx - 5, dy - 13, 11, 2, '#7e2436')
    })
    return this.bg
  }

  pointer(e: PointerInfo) {
    if (e.type !== 'down') return
    if (e.y < 12 || e.y > this.deckY - 4) return
    if (!this.onThrow?.()) return
    this.flip = e.x < this.playerX - 6
    this.throwT = 0.32
    const [hx, hy] = this.throwHand()
    this.tosses.push({ x0: hx, y0: hy, x1: e.x, y1: e.y, t: 0 })
    tsfx.swish(1.2)
    haptic(6)
    this.critters.startle(this.playerX, this.deckY, 60)
  }

  /** Where the throwing hand is (for the start of the arc). */
  private throwHand(): [number, number] {
    const p = this.placed
    if (!p) return [this.playerX, this.footY - 40]
    const [x, y] = handAt({ ...p, pose: 'toss_throw', flip: this.flip }, -1)
    return [x, y - 3]
  }

  private land(x: number, y: number) {
    const pel: Pellet = { x, y, life: 7, taken: false }
    this.pellets.push(pel)
    this.particles.add({ kind: 'ripple', x, y, max: 0.9, size: 9, color: '#d4f5fa' })
    for (let i = 0; i < 3; i++) this.particles.add({ kind: 'drop', x, y, vx: rand(-14, 14), vy: rand(-26, -12), g: 120, max: 0.4, color: '#e6fbff' })
    sfx.plop()
    // Nearby fish notice the food.
    for (const f of this.fish) if (!f.target && Math.hypot(f.x - x, f.y - y) < 90 && f.full < 1) f.target = pel
  }

  update(rawDt: number) {
    const dt = this.juice.step(rawDt)
    this.t += dt
    const w = this.w
    const h = this.deckY + 4
    this.throwT = Math.max(0, this.throwT - dt)
    for (let i = this.tosses.length - 1; i >= 0; i--) {
      const q = this.tosses[i]
      q.t += dt / 0.38
      if (q.t >= 1) {
        this.tosses.splice(i, 1)
        this.land(q.x1, q.y1)
      }
    }
    for (const p of this.pellets) p.life -= dt
    this.pellets = this.pellets.filter((p) => p.life > 0 && !p.taken)
    for (const f of this.fish) {
      f.wiggle += dt * (f.target ? 12 : 7)
      f.full = Math.max(0, f.full - dt * 0.05)
      f.gulp = Math.max(0, f.gulp - dt)
      if (f.target && (f.target.taken || f.target.life <= 0)) f.target = null
      if (!f.target && f.full < 1) {
        let best: Pellet | null = null
        let bd = 70
        for (const p of this.pellets) {
          const d = Math.hypot(p.x - f.x, p.y - f.y)
          if (d < bd) {
            bd = d
            best = p
          }
        }
        f.target = best
      }
      let desired = f.a
      if (f.target) desired = Math.atan2(f.target.y - f.y, f.target.x - f.x)
      else desired = f.a + Math.sin(this.t * 0.7 + f.seed) * 0.8
      // Stay inside the pond.
      const m = 22
      if (f.x < m) desired = 0
      else if (f.x > w - m) desired = Math.PI
      if (f.y < m + 6) desired = Math.PI / 2
      else if (f.y > h - m) desired = -Math.PI / 2
      let da = desired - f.a
      while (da > Math.PI) da -= Math.PI * 2
      while (da < -Math.PI) da += Math.PI * 2
      f.a += Math.max(-2.6 * dt, Math.min(2.6 * dt, da))
      const sp = f.target ? f.speed * 2.2 : f.speed
      f.x += Math.cos(f.a) * sp * dt
      f.y += Math.sin(f.a) * sp * dt
      if (f.target && Math.hypot(f.target.x - f.x, f.target.y - f.y) < 4) {
        f.target.taken = true
        f.target = null
        f.full += this.river ? 0.25 : 0.34
        f.gulp = 0.3
        sfx.gulp()
        this.particles.add({ kind: 'ripple', x: f.x, y: f.y, max: 0.6, size: 6, color: '#ffffff' })
        for (let i = 0; i < 3; i++) this.particles.add({ kind: 'dot', x: f.x + rand(-2, 2), y: f.y, vy: rand(-12, -6), max: 0.6, color: '#e6fbff' })
        this.particles.hearts(f.x, f.y - 6, f.golden ? 3 : 1, f.golden ? '#ffd54f' : '#ff6f91')
        if (f.golden) {
          this.juice.shake(0.25)
          this.juice.flash('#fff3a6', 0.18)
          this.particles.confetti(f.x, f.y, 24, ['#ffd54f', '#fff3a6', '#ffffff'])
          this.crowd.cheer('cheer', 1.6)
        }
        this.onEat?.(f)
      }
    }
    // Lotus pads drift slowly.
    for (const p of this.pads) p.x += Math.sin(this.t * 0.2 + p.ph) * 0.03
    // A turtle occasionally paddles across.
    if (!this.river) {
      if (!this.turtle && Math.random() < dt * 0.03) this.turtle = { x: -12, y: rand(40, h - 40), t: 0 }
      if (this.turtle) {
        this.turtle.t += dt
        this.turtle.x += 7 * dt
        if (this.turtle.x > w + 14) this.turtle = null
      }
    }
    if (Math.random() < dt * 2) this.particles.add({ kind: 'sparkle', x: rand(0, w), y: rand(12, h - 12), max: 0.4, color: '#e6fbff' })
    motes(this.particles, dt, w, h, 0.6, '#e6fbff')
    this.critters.update(dt, this.w)
    this.crowd.update(dt)
    this.particles.update(dt)
  }

  private drawFish(g: Surface, f: Fish) {
    const cos = Math.cos(f.a)
    const sin = Math.sin(f.a)
    const L = f.len
    const pts: [number, number, number][] = []
    for (let d = 0; d <= L; d += 1) {
      const t = d / L
      const lat = Math.sin(f.wiggle - d * 0.35) * (t * t) * (this.river ? 3 : 2.4)
      const x = f.x - cos * d - sin * lat
      const y = f.y - sin * d + cos * lat
      const r = t < 0.2 ? 1.6 + t * 6 : t < 0.55 ? 2.8 : Math.max(0.6, 2.8 - (t - 0.55) * 5.5)
      pts.push([x, y, (this.river ? 1.25 : 1) * r])
    }
    // Shadow on the pond floor.
    for (const [x, y, r] of pts) g.ellipse(x + 3, y + 4, r, r * 0.8, 'rgba(20,40,70,0.25)')
    // Fins near the head.
    const fx = f.x - cos * L * 0.25
    const fy = f.y - sin * L * 0.25
    const flap = Math.sin(f.wiggle * 1.5) * 1.2
    for (const side of [-1, 1]) {
      g.px(fx - sin * side * (4 + flap), fy + cos * side * (4 + flap), f.v.patch)
      g.px(fx - sin * side * 3, fy + cos * side * 3, f.v.base)
    }
    // Body.
    pts.forEach(([x, y, r], i) => {
      const t = i / L
      let c = f.v.base
      const n = Math.sin(i * 0.9 + f.seed * 3)
      if (n > 0.35) c = f.v.patch
      else if (f.v.patch2 && n < -0.6) c = f.v.patch2
      g.circle(x, y, r, c)
      if (t > 0.9) g.circle(x, y, r + 0.6, f.v.patch)
    })
    // Tail fin.
    const [tx, ty] = pts[pts.length - 1]
    const tw = Math.sin(f.wiggle) * 2
    g.line(tx, ty, tx - cos * 4 - sin * (3 + tw), ty - sin * 4 + cos * (3 + tw), f.v.patch)
    g.line(tx, ty, tx - cos * 4 + sin * (3 - tw), ty - sin * 4 - cos * (3 - tw), f.v.patch)
    // Eyes and mouth.
    g.px(f.x - cos * 1 - sin * 1.5, f.y - sin * 1 + cos * 1.5, P.ink)
    g.px(f.x - cos * 1 + sin * 1.5, f.y - sin * 1 - cos * 1.5, P.ink)
    if (f.gulp > 0) g.px(f.x + cos, f.y + sin, '#ff9aa6')
    if (this.river) {
      // Whiskers.
      g.line(f.x, f.y, f.x + cos * 3 - sin * 3, f.y + sin * 3 + cos * 3, '#5e6577')
      g.line(f.x, f.y, f.x + cos * 3 + sin * 3, f.y + sin * 3 - cos * 3, '#5e6577')
    }
    if (f.golden && Math.sin(this.t * 5 + f.seed) > 0.7) this.particles.sparkles(f.x, f.y, 1, '#fff3a6')
    // A fish that has eaten its fill shows a little heart.
    if (f.full >= 1 && Math.sin(this.t * 3 + f.seed) > 0) {
      g.px(f.x - 1, f.y - 6, '#ff6f91')
      g.px(f.x + 1, f.y - 6, '#ff6f91')
      g.rect(f.x - 1, f.y - 5, 3, 1, '#ff6f91')
      g.px(f.x, f.y - 4, '#ff6f91')
    }
  }

  render(g: Surface) {
    this.juice.begin(g)
    g.draw(this.background(), 0, 0)
    // Sun caustics drifting over the pond floor.
    g.alpha(0.16)
    for (let i = 0; i < 9; i++) {
      const cx = ((i * 53 + this.t * (4 + (i % 3))) % (this.w + 40)) - 20
      const cy = 14 + ((i * 37) % Math.max(1, this.deckY - 30))
      const wob = Math.sin(this.t + i) * 2
      g.line(cx, cy, cx + 9, cy + 3 + wob, '#e6fbff')
      g.line(cx + 9, cy + 3 + wob, cx + 14, cy - 1, '#e6fbff')
    }
    g.alpha(1)
    for (const p of this.pellets) {
      const sink = Math.min(1, (7 - p.life) / 7)
      g.px(p.x, p.y, this.river ? '#e8c07a' : '#9a6a45')
      g.px(p.x + 1, p.y, this.river ? '#f0d49a' : '#c28e5c')
      if (this.river) g.px(p.x, p.y + 1, '#e8c07a')
      if (sink < 0.3) drawRing(g, p.x, p.y, 2 + sink * 6, 1 + sink * 3, '#d4f5fa')
    }
    for (const f of this.fish) this.drawFish(g, f)
    if (this.turtle) {
      const { x, y, t } = this.turtle
      const leg = Math.sin(t * 6) > 0 ? 1 : 0
      g.ellipse(x, y, 6, 5, '#5e8a4a')
      g.ellipse(x, y, 4.5, 3.5, '#7aa85a')
      g.px(x - 1, y - 1, '#9ac87a')
      g.circle(x + 7, y, 2, '#7aa85a')
      g.px(x + 8, y - 1, P.ink)
      g.px(x - 4 - leg, y - 5, '#6a9a52')
      g.px(x + 3 + leg, y - 5, '#6a9a52')
      g.px(x - 4 + leg, y + 5, '#6a9a52')
      g.px(x + 3 - leg, y + 5, '#6a9a52')
    }
    const fl = lotusFlower()
    for (const p of this.pads) {
      g.circle(p.x + 1, p.y + 2, p.r, 'rgba(20,50,40,0.3)')
      g.circle(p.x, p.y, p.r, P.leaf)
      g.circle(p.x - 0.5, p.y - 0.5, p.r - 1, P.grassD)
      g.line(p.x, p.y, p.x + p.r, p.y - 1, P.leafD)
      if (p.flower) g.draw(fl.canvas, p.x - 2, p.y - 3)
    }
    // Food in flight, with its shadow on the water.
    for (const q of this.tosses) {
      const gx = q.x0 + (q.x1 - q.x0) * q.t
      const gy = q.y0 + (q.y1 - q.y0) * q.t
      const y = gy - Math.sin(q.t * Math.PI) * 18
      g.px(gx, gy + 2, 'rgba(10,30,50,0.35)')
      for (let k = 0; k < 3; k++) {
        const ox = (k - 1) * (1 + q.t * 3)
        const oy = k === 1 ? 0 : 1 + q.t
        g.rect(gx - 1 + ox, y - 1 + oy, 2, 2, this.river ? '#e8c07a' : '#9a6a45')
        g.px(gx - 1 + ox, y - 1 + oy, this.river ? '#f7e0b0' : '#d9a468')
      }
    }
    // The player on the deck, the bag of food in one hand.
    const pose = this.throwT > 0 ? 'toss_throw' : 'toss_ready'
    drawStall(g, Math.round(this.w * 0.15), this.deckY + 24, 'koi', UNCLE_KOI, this.t, true)
    this.critters.render(g)
    this.crowd.render(g)
    const pl = drawPlayer(g, this.look, pose, 'back', this.playerX, this.footY, { flip: this.flip, bob: this.throwT > 0.2 ? -1 : 0 })
    this.placed = pl
    const [bx, by] = handAt(pl, 1)
    drawFoodBag(g, bx, by + 1, this.river ? '#e8c07a' : '#c28e5c')
    if (this.throwT > 0.14) {
      // swoosh line behind the throwing hand
      const [hx, hy] = handAt(pl, -1)
      const d = this.flip ? -1 : 1
      g.alpha(0.55)
      g.line(hx + 3 * d, hy + 6, hx + d, hy - 3, '#ffffff')
      g.alpha(1)
    }
    this.particles.render(g)
    vignette(g, this.river ? '#1a2a1a' : '#0e2440', 0.4)
    this.juice.end(g)
  }
}

export function KoiActivity({ req }: { req: ActivityRequest }) {
  const river = !!req.params?.river
  const foodId = river ? 'catfish_food' : 'fish_food'
  const look = game.value.player.look
  const { host, scene, stage } = useStage(() => new PondScene(river, look), { targetWidth: 150 })
  const [fed, setFed] = useState(0)
  const [merit, setMerit] = useState(0)
  const [golden, setGolden] = useState(false)
  const [buy, setBuy] = useState(false)
  const [combo, setCombo] = useState(0)
  const [result, setResult] = useState<TempleResultData | null>(null)
  const lastEat = useRef(0)
  const best = useRef(0)
  const left = count(foodId)
  const freeAvailable = !game.value.daily.freeFishFood && !river

  useEffect(() => {
    const sc = scene.current
    if (!sc) return
    sc.onThrow = () => {
      if (!useItem(foodId)) {
        setBuy(true)
        return false
      }
      return true
    }
    sc.onEat = (f) => {
      const base = f.golden ? 5 : 1
      const m = addMerit(base, { key: river ? 'catfish' : 'koi', free: 40, animal: true, area: river ? 'river' : 'wat' })
      track(river ? 'catfish_fed' : 'koi_fed')
      const now = performance.now() / 1000
      setCombo((c) => {
        const n = now - lastEat.current < COMBO_WINDOW ? c + 1 : 1
        best.current = Math.max(best.current, n)
        const word = comboPraise(n)
        if (word) {
          praise(stage.current, f.x, f.y - 16, word, 'gold')
          tsfx.praise()
        } else if (n >= 2) tsfx.combo(n)
        return n
      })
      lastEat.current = now
      if (f.golden) {
        setGolden(true)
        sfx.sparkle()
        praise(stage.current, f.x, f.y - 22, 'ปลาคาร์ฟทองงับแล้ว!', 'gold', true)
      }
      setFed((n) => n + 1)
      setMerit((n) => n + m)
      sc.particles.popText(f.x, f.y - 12, `+${m}`)
    }
    setGolden(sc.fish.some((f) => f.golden))
  }, [scene.current])

  // The combo fades after a pause.
  useEffect(() => {
    if (combo < 1) return
    const id = setTimeout(() => setCombo(0), COMBO_WINDOW * 1000 + 200)
    return () => clearTimeout(id)
  }, [combo])

  const claimFree = () => {
    mutate((d) => {
      d.daily.freeFishFood = true
      d.inventory.fish_food = (d.inventory.fish_food ?? 0) + 12
    })
    sfx.coin()
    toast('รับอาหารปลาฟรี 1 ถุง (12 เม็ด)', 'fishfood')
  }

  const full = scene.current?.fish.filter((f) => f.full >= 1).length ?? 0
  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame
        title={river ? 'ให้อาหารปลาสวายริมน้ำ' : 'ให้อาหารปลาคาร์ฟ'}
        onClose={() => {
          if (fed > 0 && !result)
            setResult({
              title: `ปลาอิ่มท้องแล้ว ${fed} คำ`,
              merit,
              icon: river ? 'bread' : 'koi',
              stars: starsFrom(fed + (best.current >= 5 ? 2 : 0), [3, 8, 14]),
              lines: [`คอมโบสูงสุด x${best.current}`, 'ให้ทานแก่สัตว์ เป็นบุญที่ทำได้ทุกวัน'],
            })
          else closeActivity()
        }}
      />
      <PraiseLayer />
      {!result && <ComboBadge n={combo} />}
      {!result && (
        <div class="act-bottom">
          <div class="panel act-tip">
            <div class="row" style={{ justifyContent: 'center' }}>
              <Icon name={river ? 'bread' : 'fishfood'} size={24} />
              <span class="subtitle">
                {river ? 'ขนมปัง' : 'อาหารปลา'} เหลือ <span class="num">{left}</span> ชิ้น
              </span>
            </div>
            <div class="small muted">
              แตะที่ผิวน้ำเพื่อโยนอาหาร · ให้ไปแล้ว {fed} คำ +{merit} บุญ{full ? ` · อิ่มแล้ว ${full} ตัว` : ''}
              {golden && !river ? ' · มีปลาคาร์ฟทองในบ่อ!' : ''}
            </div>
            <div class="row">
              {freeAvailable && (
                <Btn tone="green" class="grow" onClick={claimFree}>
                  รับอาหารปลาฟรีวันนี้
                </Btn>
              )}
              {left <= 12 && (
                <Btn tone={freeAvailable ? 'paper' : 'green'} class="grow" onClick={() => setBuy(true)}>
                  ซื้อ{river ? 'ขนมปัง' : 'อาหารปลา'}
                </Btn>
              )}
            </div>
          </div>
        </div>
      )}
      {buy && <QuickBuy ids={[foodId]} title={river ? 'ขนมปังให้ปลา' : 'อาหารปลา'} onClose={() => setBuy(false)} />}
      {result && <TempleResult r={result} onDone={closeActivity} />}
    </div>
  )
}

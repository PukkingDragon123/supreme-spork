// Ambient life and detailed scenery for the temple mini-games: cats that
// nap and groom, birds that hop and scatter when something loud happens,
// butterflies, onlookers who cheer or wai when you do well, vendor stalls with
// the host auntie behind them, and richly shaded trees, lanterns and pots.

import type { Surface } from '../../engine/pixel'
import { mix } from '../../engine/pixel'
import { rand } from '../../engine/rng'
import type { AvatarLook } from '../avatar'
import type { BaseDollPose, DollView } from '../doll'
import { butterflySprite, catPoseSprite, pigeonSprite, sparrowSprite, type CatPose } from '../characters'
import { P } from '../palette'
import { hdMonkSprite, type HdMonkFrame } from './monk'
import { drawPlayer, softGlow, type TPose } from './temple'

// ---------------------------------------------------------------------------
// Critters

interface Cat {
  x: number
  y: number
  color: string
  pose: CatPose
  t: number
  flip: boolean
  vx: number
}
interface Bird {
  x: number
  y: number
  kind: 'sparrow' | 'pigeon'
  t: number
  flip: boolean
  fly: boolean
  vx: number
  vy: number
  tone: number
  homeY: number
}
interface Fly {
  x: number
  y: number
  ph: number
  color: string
}

export class Critters {
  cats: Cat[] = []
  birds: Bird[] = []
  flies: Fly[] = []
  private w = 160

  cat(x: number, y: number, color = '#f5a55a', pose: CatPose = 'loaf', flip = false) {
    this.cats.push({ x, y, color, pose, t: rand(0, 5), flip, vx: 0 })
    return this
  }
  bird(x: number, y: number, kind: 'sparrow' | 'pigeon' = 'sparrow') {
    this.birds.push({ x, y, kind, t: rand(0, 3), flip: Math.random() < 0.5, fly: false, vx: 0, vy: 0, tone: Math.floor(rand(0, 3)), homeY: y })
    return this
  }
  butterfly(x: number, y: number, color = '#ffd54f') {
    this.flies.push({ x, y, ph: rand(0, 6), color })
    return this
  }
  /** Something loud happened near (x, y): nearby birds take off, cats look up. */
  startle(x: number, y: number, r = 70) {
    for (const b of this.birds)
      if (!b.fly && Math.hypot(b.x - x, b.y - y) < r) {
        b.fly = true
        b.flip = b.x < x
        b.vx = (b.x < x ? -1 : 1) * rand(30, 50)
        b.vy = rand(-50, -30)
      }
    for (const c of this.cats) if (Math.hypot(c.x - x, c.y - y) < r && c.pose !== 'walk1') c.pose = 'sit'
  }
  update(dt: number, w: number) {
    this.w = w
    for (const c of this.cats) {
      c.t += dt
      // cats drift between napping, sitting and grooming
      if (c.t > 6) {
        c.t = 0
        const r = Math.random()
        c.pose = r < 0.35 ? 'loaf' : r < 0.55 ? 'sleep' : r < 0.8 ? 'groom' : 'sit'
      }
    }
    for (const b of this.birds) {
      b.t += dt
      if (b.fly) {
        b.x += b.vx * dt
        b.y += b.vy * dt
        b.vy += 10 * dt
        // come back to land later from the other side
        if (b.y < -20 || b.x < -30 || b.x > this.w + 30) {
          b.fly = false
          b.x = b.vx < 0 ? this.w + 10 : -10
          b.y = b.homeY
          b.vx = b.vx < 0 ? -12 : 12
        }
      } else if (b.vx !== 0) {
        // walking in after landing
        b.x += b.vx * dt
        b.flip = b.vx < 0
        if ((b.vx < 0 && b.x < this.w * 0.75) || (b.vx > 0 && b.x > this.w * 0.25)) b.vx = 0
      } else if (Math.random() < dt * 0.6) b.flip = !b.flip
    }
    for (const f of this.flies) {
      f.ph += dt
      f.x += Math.sin(f.ph * 0.7) * 10 * dt
      f.y += Math.cos(f.ph * 1.3) * 6 * dt
    }
  }
  render(g: Surface) {
    for (const c of this.cats) {
      const pose: CatPose = c.pose === 'groom' && Math.floor(c.t * 3) % 2 ? 'sit' : c.pose
      const s = catPoseSprite(pose, c.color, c.flip)
      g.ellipse(c.x, c.y, 6, 1.5, 'rgba(30,14,30,0.22)')
      g.draw(s.canvas, Math.round(c.x - s.w / 2), Math.round(c.y - s.h + 1))
      if (c.pose === 'sleep' && Math.floor(c.t * 1.5) % 3 === 0) {
        g.px(c.x + 4, c.y - s.h - 1, '#fffaf0')
        g.px(c.x + 6, c.y - s.h - 3, '#fffaf0')
      }
    }
    for (const b of this.birds) {
      if (b.kind === 'pigeon') {
        const fr = b.fly ? (Math.floor(b.t * 10) % 2 ? 'fly1' : 'fly2') : Math.floor(b.t * 2) % 3 === 0 ? 'peck' : 'stand'
        const s = pigeonSprite(fr, b.flip, b.tone)
        g.draw(s.canvas, Math.round(b.x - s.w / 2), Math.round(b.y - s.h))
      } else {
        const s = sparrowSprite(b.fly ? (Math.floor(b.t * 12) % 2 as 0 | 1) : Math.floor(b.t * 3) % 4 === 0 ? 1 : 0, b.flip)
        g.draw(s.canvas, Math.round(b.x - s.w / 2), Math.round(b.y - s.h - (b.fly ? 0 : Math.abs(Math.sin(b.t * 5)) > 0.95 ? 1 : 0)))
      }
    }
    for (const f of this.flies) {
      const s = butterflySprite(Math.floor(f.ph * 8) % 2 as 0 | 1, f.color)
      g.draw(s.canvas, Math.round(f.x), Math.round(f.y))
    }
  }
}

// ---------------------------------------------------------------------------
// Onlookers: people in the background who react

export interface Onlooker {
  look?: AvatarLook
  monk?: 'monk' | 'novice'
  x: number
  y: number
  view: DollView
  idle: TPose | BaseDollPose
  flip?: boolean
  react: number
  reactPose: TPose | BaseDollPose
  ph: number
}

export class Crowd {
  people: Onlooker[] = []
  t = 0
  add(o: Partial<Onlooker> & Pick<Onlooker, 'x' | 'y'>) {
    this.people.push({ view: 'front', idle: 'stand', react: 0, reactPose: 'happy', ph: rand(0, 6), ...o })
    return this
  }
  /** Everyone reacts for a moment (cheer, wai...). */
  cheer(pose?: TPose | BaseDollPose, sec = 1.4) {
    for (const p of this.people) {
      p.react = sec + rand(0, 0.3)
      if (pose) p.reactPose = pose
    }
  }
  update(dt: number) {
    this.t += dt
    for (const p of this.people) p.react = Math.max(0, p.react - dt)
  }
  render(g: Surface) {
    const sorted = [...this.people].sort((a, b) => a.y - b.y)
    for (const p of sorted) {
      if (p.monk) {
        const fr: HdMonkFrame = p.react > 0 ? 'chant' : Math.floor(this.t * 0.8 + p.ph) % 5 === 0 ? 'chant' : 'bless'
        const s = hdMonkSprite('front', fr, { novice: p.monk === 'novice', skin: 1 })
        g.ellipse(p.x, p.y - 1, 9, 2, 'rgba(30,14,30,0.25)')
        g.draw(s.canvas, Math.round(p.x - s.w / 2), Math.round(p.y - s.h + 1))
        continue
      }
      if (!p.look) continue
      const pose = p.react > 0 ? p.reactPose : p.idle
      const hop = p.react > 0 && p.reactPose === 'happy' ? -Math.round(Math.abs(Math.sin(this.t * 10 + p.ph)) * 2) : 0
      drawPlayer(g, p.look, pose, p.view, p.x, p.y, { t: this.t + p.ph, flip: p.flip, bob: hop, barefoot: true })
    }
  }
}

// ---------------------------------------------------------------------------
// Detailed props

/** A leafy tree with layered, lit canopy clusters. */
export function drawTree(g: Surface, x: number, baseY: number, s = 1, leaf: string = P.leaf, seed = 1) {
  const dark = mix(leaf, '#1b2a20', 0.35)
  const light = mix(leaf, '#e8ffb0', 0.3)
  g.ellipse(x, baseY, 12 * s, 3 * s, 'rgba(30,20,20,0.25)')
  g.rect(x - 2 * s, baseY - 22 * s, 4 * s, 22 * s, '#6e4a35')
  g.rect(x - 2 * s, baseY - 22 * s, s, 22 * s, '#9a6a45')
  g.line(x, baseY - 16 * s, x + 7 * s, baseY - 24 * s, '#6e4a35')
  const blobs: [number, number, number][] = [
    [0, -34, 13],
    [-10, -28, 10],
    [10, -27, 10],
    [-5, -42, 9],
    [7, -40, 9],
  ]
  for (const [bx, by, r] of blobs) g.circle(x + bx * s, baseY + (by + 1) * s, r * s, dark)
  for (const [bx, by, r] of blobs) g.circle(x + bx * s, baseY + by * s, (r - 1) * s, leaf)
  for (const [bx, by, r] of blobs) g.circle(x + (bx - r * 0.3) * s, baseY + (by - r * 0.3) * s, r * 0.45 * s, light)
  for (let i = 0; i < 10; i++) {
    const a = seed * 7 + i * 2.1
    g.px(x + Math.round(Math.cos(a) * 11 * s), baseY - 34 * s + Math.round(Math.sin(a) * 9 * s), i % 2 ? light : dark)
  }
}

/** A hanging red paper lantern that sways. */
export function drawLantern(g: Surface, x: number, y: number, t: number, color = '#c0392b') {
  const sw = Math.round(Math.sin(t * 1.5 + x) * 1)
  g.vline(x, y - 6, y - 3, '#3a2838')
  g.rect(x - 3 + sw, y - 3, 7, 1, P.gold)
  g.ellipse(x + sw + 0.5, y + 2, 4, 4.5, color)
  g.ellipse(x + sw - 0.5, y + 1, 1.5, 3, mix(color, '#ffffff', 0.35))
  g.rect(x - 3 + sw, y + 6, 7, 1, P.gold)
  g.vline(x + sw, y + 7, y + 9, P.gold)
  softGlow(g, x + sw, y + 2, 9, 0.5, '#ffb36a')
}

/** A glazed pot of flowers. */
export function drawFlowerPot(g: Surface, x: number, y: number, flower: string = P.pink) {
  g.ellipse(x, y, 6, 1.5, 'rgba(30,14,30,0.25)')
  g.poly([[x - 5, y - 7], [x + 5, y - 7], [x + 4, y], [x - 4, y]], '#3f6f98')
  g.rect(x - 5, y - 8, 10, 2, '#5a8dc0')
  g.px(x - 3, y - 5, '#8fb6d8')
  g.px(x + 2, y - 3, '#e6f6ff')
  for (let i = -2; i <= 2; i++) g.vline(x + i * 1.5, y - 12 + Math.abs(i), y - 8, P.leaf)
  for (const [dx, dy] of [
    [-3, -12],
    [0, -14],
    [3, -12],
    [-1, -11],
  ])
    g.circle(x + dx, y + dy, 1.5, flower)
  g.px(x, y - 14, '#fffaf0')
}

export type StallKind = 'rice' | 'koi' | 'flowers' | 'powder' | 'gold' | 'krathong' | 'dogfood'

/** A little vendor stall with an awning, goods and a price sign; the vendor stands behind it. */
export function drawStall(g: Surface, x: number, footY: number, kind: StallKind, vendor: AvatarLook | null, t: number, wave = false) {
  // vendor behind the table
  if (vendor) drawPlayer(g, vendor, wave && Math.floor(t * 2) % 4 === 0 ? 'wave' : 'stand', 'front', x, footY - 2, { t, shadow: false })
  const top = footY - 22
  // table
  g.ellipse(x, footY, 20, 3, 'rgba(30,14,30,0.25)')
  g.rect(x - 18, top, 36, 4, '#c28e5c')
  g.rect(x - 18, top, 36, 1, '#e0bb8a')
  g.rect(x - 17, top + 4, 34, 18, '#9a6a45')
  for (let i = 0; i < 4; i++) g.rect(x - 17 + i * 9, top + 4, 1, 18, '#7a5238')
  g.rect(x - 17, top + 4, 34, 2, '#b8343f')
  for (let i = 0; i < 8; i++) g.px(x - 15 + i * 4, top + 5, P.gold)
  // goods on the table
  const goods = (fn: (i: number, gx: number) => void) => {
    for (let i = 0; i < 4; i++) fn(i, x - 13 + i * 8)
  }
  switch (kind) {
    case 'rice':
      goods((i, gx) => {
        g.ellipse(gx, top - 1, 3.5, 1.5, i % 2 ? '#fffaf0' : '#6cc36a')
        g.rect(gx - 3, top - 1, 6, 1, i % 2 ? '#e3d8c6' : '#43905a')
      })
      g.rect(x + 8, top - 7, 8, 6, P.stone)
      g.ellipse(x + 12, top - 7, 4, 1.4, '#fffaf0')
      break
    case 'koi':
      goods((i, gx) => {
        g.rect(gx - 2, top - 6, 5, 6, '#fffaf0')
        g.rect(gx - 1, top - 4, 3, 2, i % 2 ? '#c28e5c' : '#e8c07a')
        g.px(gx, top - 7, '#e3d8c6')
      })
      break
    case 'flowers':
      goods((i, gx) => {
        const c = [P.pink, P.orange, '#fffaf0', P.yellow][i]
        g.vline(gx, top - 6, top - 1, P.leaf)
        g.circle(gx, top - 7, 2, c)
        g.px(gx, top - 8, '#ffffff')
      })
      for (let i = 0; i < 5; i++) g.vline(x + 12 + i, top - 10, top - 1, i % 2 ? '#c0392b' : '#a8313f')
      break
    case 'powder':
      goods((i, gx) => {
        g.rect(gx - 2, top - 7, 4, 7, '#fff3f8')
        g.rect(gx - 2, top - 7, 4, 2, i % 2 ? '#ff9fc0' : '#9fd0ff')
        g.rect(gx - 1, top - 9, 2, 2, '#e8709e')
      })
      break
    case 'gold':
      goods((i, gx) => {
        g.rect(gx - 3, top - 4, 6, 4, '#fff1d6')
        g.rect(gx - 2, top - 3, 4, 3, P.gold)
        if (i % 2) g.px(gx, top - 3, P.goldL)
      })
      break
    case 'krathong':
      goods((i, gx) => {
        g.ellipse(gx, top - 1, 3.5, 1.5, P.leafD)
        g.circle(gx, top - 3, 1.5, [P.pink, P.yellow, '#fffaf0', P.pink][i])
        g.vline(gx, top - 7, top - 4, '#fff1d6')
      })
      break
    case 'dogfood':
      goods((i, gx) => {
        g.rect(gx - 2, top - 6, 5, 6, i % 2 ? '#e8514a' : '#ffd54f')
        g.px(gx, top - 4, '#fffaf0')
      })
      break
  }
  // striped awning on two poles
  const aw = top - 30
  g.rect(x - 19, aw, 1, 30, '#6e4a35')
  g.rect(x + 18, aw, 1, 30, '#6e4a35')
  for (let i = 0; i < 8; i++) g.rect(x - 20 + i * 5, aw - 4, 5, 5, i % 2 ? '#fffaf0' : '#e8514a')
  for (let i = 0; i < 8; i++) g.ellipse(x - 17.5 + i * 5, aw + 1, 2.5, 1.5, i % 2 ? '#fffaf0' : '#e8514a')
  // price sign
  g.rect(x - 24, top - 12, 10, 8, '#fffaf0')
  g.frame(x - 24, top - 12, 10, 8, '#3a2838')
  g.rect(x - 22, top - 10, 6, 1, '#e8514a')
  g.rect(x - 22, top - 8, 4, 1, '#3a2838')
  g.vline(x - 19, top - 4, top, '#6e4a35')
}

/** A sparkly "!" speech mark over a host to show they have something to say. */
export function drawTalkMark(g: Surface, x: number, y: number, t: number) {
  const b = Math.round(Math.sin(t * 4) * 1.5)
  g.rect(x - 3, y - 9 + b, 7, 8, '#fffaf0')
  g.frame(x - 3, y - 9 + b, 7, 8, '#3a2838')
  g.px(x + 1, y - 1 + b, '#3a2838')
  g.vline(x, y - 7 + b, y - 5 + b, '#e8514a')
  g.px(x, y - 3 + b, '#e8514a')
}

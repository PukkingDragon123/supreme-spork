// Dressing shared by the fair's booth games (darts, rings, cork, scoop): a
// garland of plushies under the valance, a hand-painted sign, striped posts
// with chasing bulbs, the booth's vendor standing at the side (waves, cheers
// your hits, winces at misses, shouts a line now and then), a couple of
// onlookers who jump when you score big, and confetti each time you earn a
// star. Static parts are baked once per size.

import type { Color, Surface } from '../../engine/pixel'
import { bake } from '../../engine/pixel'
import { pick } from '../../engine/rng'
import { dollSprite, type DollPose } from '../../art/doll'
import { avatarSprite, type AvatarLook } from '../../art/avatar'
import { drawShadow } from '../../art/props'
import { randomVisitorLook } from '../../scenes/world'
import { mixHex } from '../../art/characters'
import { nameTag } from '../../art/places/fair'
import '../../art/poses/fair'
import type { JobScene } from '../jobs/base'
import type { Vendor } from './vendors'
import { INK } from './art'

const mix = mixHex

export type PlushKind = 'bear' | 'hippo' | 'bunny' | 'duck' | 'cat' | 'fish' | 'star' | 'frog'

const PLUSH_ORDER: PlushKind[] = ['bear', 'hippo', 'duck', 'bunny', 'cat', 'star', 'frog', 'fish']
const PLUSH_COLS: Record<PlushKind, Color[]> = {
  bear: ['#ff9fc0', '#9fd0ff', '#c8905a', '#fff1d6'],
  hippo: ['#8a8098', '#b4a8c8'],
  bunny: ['#fffaf0', '#ffe1ea'],
  duck: ['#ffd23f'],
  cat: ['#f58f35', '#fffaf0'],
  fish: ['#f58f35', '#ff6f91'],
  star: ['#ffd54f', '#6cf0c0'],
  frog: ['#6cc36a'],
}

/** A tiny outlined plush toy (about 11×11) centred on x, top at y. */
export function drawMiniPlush(g: Surface, x: number, y: number, kind: PlushKind, color: Color) {
  const d = mix(color, INK, 0.3)
  const l = mix(color, '#ffffff', 0.45)
  const eye = (ex: number, ey: number) => g.px(ex, ey, INK)
  switch (kind) {
    case 'bear':
    case 'bunny': {
      const ears = kind === 'bunny'
      if (ears) {
        g.rect(x - 3, y - 4, 2, 6, d)
        g.rect(x + 2, y - 4, 2, 6, d)
        g.px(x - 2, y - 3, '#ff9fc0')
        g.px(x + 3, y - 3, '#ff9fc0')
      } else {
        g.circle(x - 3, y + 1, 1.8, d)
        g.circle(x + 3, y + 1, 1.8, d)
      }
      g.circle(x, y + 4, 3.6, d)
      g.circle(x, y + 3.7, 3.1, color)
      g.circle(x, y + 9, 3.4, d)
      g.circle(x, y + 8.8, 2.9, color)
      g.px(x - 1, y + 2, l)
      eye(x - 1, y + 4)
      eye(x + 1, y + 4)
      g.px(x, y + 5, '#e8514a')
      g.px(x - 2, y + 5, '#ff9fc0')
      g.px(x + 2, y + 5, '#ff9fc0')
      g.circle(x, y + 9, 1.3, l)
      break
    }
    case 'hippo':
      g.ellipse(x, y + 6, 5.2, 4.2, d)
      g.ellipse(x, y + 5.8, 4.6, 3.6, color)
      g.ellipse(x + 2, y + 7, 2.6, 1.8, l)
      g.px(x - 3, y + 2, d)
      g.px(x + 3, y + 2, d)
      eye(x - 1, y + 4)
      eye(x + 3, y + 4)
      g.px(x - 3, y + 7, '#ff9fc0')
      break
    case 'duck':
      g.circle(x, y + 7, 4, d)
      g.circle(x, y + 6.8, 3.5, color)
      g.circle(x - 1, y + 3, 2.8, d)
      g.circle(x - 1, y + 2.9, 2.3, color)
      g.rect(x + 1, y + 3, 3, 1, '#f58f35')
      eye(x - 1, y + 2)
      g.px(x - 2, y + 6, l)
      break
    case 'cat':
      g.poly([[x - 4, y + 1], [x - 2, y + 3], [x - 4, y + 4]], d)
      g.poly([[x + 4, y + 1], [x + 2, y + 3], [x + 4, y + 4]], d)
      g.circle(x, y + 5, 3.8, d)
      g.circle(x, y + 4.8, 3.3, color)
      g.rect(x - 1, y + 2, 2, 1, mix(color, INK, 0.2))
      eye(x - 1, y + 5)
      eye(x + 2, y + 5)
      g.px(x, y + 6, '#ff9fc0')
      g.circle(x, y + 9.5, 2.6, d)
      g.circle(x, y + 9.3, 2.1, '#fffaf0')
      break
    case 'fish':
      g.ellipse(x, y + 5, 4.4, 3, d)
      g.ellipse(x, y + 4.8, 3.8, 2.4, color)
      g.poly([[x + 3, y + 5], [x + 6, y + 2], [x + 6, y + 8]], d)
      g.px(x - 2, y + 4, INK)
      g.px(x - 1, y + 3, l)
      break
    case 'star': {
      const pts: [number, number][] = []
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const r = i % 2 ? 2.2 : 5
        pts.push([x + Math.cos(a) * r, y + 5 + Math.sin(a) * r])
      }
      g.poly(pts, d)
      g.poly(pts.map(([px, py]) => [x + (px - x) * 0.8, y + 5 + (py - y - 5) * 0.8] as [number, number]), color)
      eye(x - 1, y + 5)
      eye(x + 1, y + 5)
      g.px(x - 2, y + 3, l)
      break
    }
    case 'frog':
      g.ellipse(x, y + 6, 4.6, 3.8, d)
      g.ellipse(x, y + 5.8, 4, 3.2, color)
      g.circle(x - 2, y + 2.5, 1.6, d)
      g.circle(x + 2, y + 2.5, 1.6, d)
      g.px(x - 2, y + 2, '#fffaf0')
      g.px(x + 2, y + 2, '#fffaf0')
      g.hline(x - 1, x + 1, y + 7, INK)
      g.px(x - 3, y + 6, '#ff9fc0')
      break
  }
}

interface Onlooker {
  look: AvatarLook
  x: number
  jump: number
  balloon: Color | null
}

export interface DressOptions {
  vendor: Vendor
  /** Booth colour (awning stripes, posts). */
  color: Color
  /** Text on the hand-painted sign. */
  sign: string
  /** Which side the vendor stands on. */
  side?: 'L' | 'R'
  /** Draw the plush garland and sign (off for booths whose board goes right to the top). */
  garland?: boolean
  /** Onlookers on the other side (0–2). */
  crowd?: number
}

export class BoothDress {
  private deco: HTMLCanvasElement | null = null
  private pose: DollPose = 'wave'
  private poseT = 1.2
  private idle = 3
  private chatter = 4
  private lastStars = 0
  private crowd: Onlooker[]
  private readonly side: 'L' | 'R'

  constructor(
    private sc: JobScene,
    private o: DressOptions,
  ) {
    this.side = o.side ?? 'R'
    const cols: Color[] = ['#ff6f91', '#9fd0ff', '#ffd23f']
    this.crowd = Array.from({ length: Math.max(0, Math.min(2, o.crowd ?? 2)) }, (_, i) => ({ look: randomVisitorLook(), x: 0, jump: 0, balloon: i === 0 ? pick(cols) : null }))
  }

  private top = 0

  /** Bake the static dressing for the scene's current size; `top` = the backdrop's board top. */
  anchor(top: number) {
    const { w } = this.sc
    this.top = top
    const o = this.o
    this.deco = bake(w, top + 44, (g) => {
      // Striped side posts.
      for (const x0 of [0, w - 5]) {
        g.rect(x0, top - 20, 5, 60, mix(o.color, INK, 0.25))
        for (let y = top - 20; y < top + 40; y += 6) g.rect(x0 + 1, y, 3, 3, '#fffaf0')
        g.vline(x0 + 1, top - 20, top + 40, mix(o.color, '#ffffff', 0.35))
      }
      if (o.garland === false) return
      // Garland of plush prizes hanging under the valance.
      g.line(6, top - 2, w - 6, top - 2, mix('#fffaf0', INK, 0.2))
      let k = 0
      for (let x = 16; x < w - 12; x += 17, k++) {
        if (Math.abs(x - w / 2) < 36) continue
        const kind = PLUSH_ORDER[k % PLUSH_ORDER.length]
        const cols = PLUSH_COLS[kind]
        const drop = 2 + ((k * 5) % 7)
        g.vline(x, top - 2, top - 2 + drop, '#fffaf0')
        drawMiniPlush(g, x, top - 1 + drop, kind, cols[k % cols.length])
      }
      // The hand-painted sign on its two strings.
      const tag = nameTag(o.sign, Math.max(40, w - 90), '#fff3a6', '#5a2a18')
      const sw = tag.w + 12
      const sx = Math.round(w / 2 - sw / 2)
      const sy = top + 3
      g.line(sx + 4, top - 2, sx + 4, sy, '#fffaf0')
      g.line(sx + sw - 5, top - 2, sx + sw - 5, sy, '#fffaf0')
      g.rect(sx, sy, sw, tag.h + 6, '#5a2a18')
      g.rect(sx + 1, sy + 1, sw - 2, tag.h + 4, mix(o.color, INK, 0.15))
      g.hline(sx + 1, sx + sw - 2, sy + 1, mix(o.color, '#ffffff', 0.35))
      for (let i = 0; i < 3; i++) g.px(sx + 3 + i * ((sw - 6) / 2), sy + tag.h + 4, '#ffd23f')
      g.draw(tag.canvas, sx + 6, sy + 3)
    })
  }

  /** Call from the scene's tick. */
  update(dt: number) {
    this.poseT -= dt
    if (this.poseT <= 0) this.pose = 'stand'
    this.idle -= dt
    if (this.idle <= 0) {
      this.idle = 4 + Math.random() * 4
      this.setPose(Math.random() < 0.6 ? 'wave' : 'happy', 0.9)
    }
    if (this.sc.playing) {
      this.chatter -= dt
      if (this.chatter <= 0) {
        this.chatter = 9 + Math.random() * 6
        const v = this.vendorAt()
        this.sc.say(v.x, v.y - 8, pick(this.o.vendor.lines), 'info', 2)
      }
    }
    for (const c of this.crowd) c.jump = Math.max(0, c.jump - dt)
    // Confetti for each star earned.
    const st = this.sc.stars()
    if (st > this.lastStars && this.sc.phase !== 'ready') {
      this.sc.particles.confetti(this.sc.cx, this.sc.top + 30, 26 + st * 8)
      const v = this.vendorAt()
      this.sc.say(v.x, v.y - 8, st >= 3 ? 'สามดาว! เก่งที่สุดในงาน!' : st === 2 ? 'สองดาวแล้ว สุดยอด!' : 'ได้ดาวแรกแล้ว!', 'good', 1.6)
      this.cheer(true)
    }
    this.lastStars = st
  }

  private setPose(p: DollPose, t: number) {
    this.pose = p
    this.poseT = t
  }

  /** The vendor and crowd react to a hit (`big` for jackpots). */
  cheer(big = false) {
    this.setPose(big ? 'act_f_cheer' : 'happy', big ? 0.9 : 0.5)
    if (big) for (const c of this.crowd) c.jump = 0.5 + Math.random() * 0.2
  }

  oops() {
    this.setPose('act_f_oops', 0.6)
  }

  private vendorAt() {
    const x = this.side === 'R' ? this.sc.w - 18 : 18
    return { x, y: this.sc.bottom + 12 - 52 }
  }

  /** Behind the game objects (posts, garland, sign, chasing post bulbs). */
  drawBack(g: Surface, t: number) {
    if (this.deco) g.draw(this.deco, 0, 0)
    const { w } = this.sc
    const top = this.top
    const cols = ['#ff6f91', '#ffd23f', '#6cf0c0', '#9fd0ff']
    let i = 0
    for (let y = top - 18; y < top + 38; y += 6, i++) {
      const on = (Math.floor(t * 6) + i) % 4
      for (const x of [2, w - 3]) {
        const c = cols[(i + (x > 5 ? 2 : 0)) % cols.length]
        g.px(x, y + 1, on === 0 ? '#ffffff' : on === 1 ? c : mix(c, '#2b2340', 0.55))
      }
    }
  }

  /** The vendor (and onlookers on the other side), feet on the scene's bottom row. */
  drawPeople(g: Surface, t: number) {
    const v = this.vendorAt()
    const sp = dollSprite(this.o.vendor.look, this.pose, { view: 'front' })
    const bob = this.pose === 'act_f_cheer' ? -Math.round(Math.abs(Math.sin(t * 14)) * 2) : 0
    drawShadow(g, v.x, this.sc.bottom + 11, 11, 3)
    g.draw(sp.canvas, Math.round(v.x - sp.w / 2), this.sc.bottom + 12 - sp.h + bob)
    // Onlookers (small, cheering on big hits).
    this.crowd.forEach((c, k) => {
      const x = this.side === 'R' ? 8 + k * 11 : this.sc.w - 8 - k * 11
      const jy = c.jump > 0 ? -Math.round(Math.sin((c.jump / 0.6) * Math.PI) * 4) : Math.round(Math.sin(t * 2 + k) * 0.6)
      const s = avatarSprite(c.look, 'front', c.jump > 0 ? 'happy' : 'stand')
      const y = this.sc.bottom + 12 - s.h + jy
      if (c.balloon) {
        const bx = x + 6
        const by = y - 12 + Math.round(Math.sin(t * 1.6) * 1)
        g.line(x + 4, y + 14, bx, by + 5, '#fffaf0')
        g.ellipse(bx, by, 4, 5, mix(c.balloon, INK, 0.25))
        g.ellipse(bx, by - 0.3, 3.4, 4.3, c.balloon)
        g.px(bx - 1, by - 2, '#ffffff')
      }
      drawShadow(g, x, this.sc.bottom + 11, 6, 2)
      g.draw(s.canvas, Math.round(x - s.w / 2), y)
    })
  }
}

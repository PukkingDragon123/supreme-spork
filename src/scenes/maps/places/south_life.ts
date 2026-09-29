// Ambient systems for the southern place maps: window light shafts with dust
// motes, firecracker bursts (Ai Khai, Wat Chalong), free-range temple chickens,
// hill monkeys (Big Buddha), nang talung shadow puppets and seated chanting monks.

import type { Color, Surface } from '../../../engine/pixel'
import { rand, pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import type { Life } from '../../life'
import type { WorldScene } from '../../world'
import type { Rect } from '../../pathfind'
import { drawGlow } from '../../sky'
import { drawShadow } from '../../../art/props'
import { drawShaft } from '../../../art/places/south_interior'
import { mixHex } from '../../../art/characters'

const inRect = (r: Rect, x: number, y: number, pad = 0) => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad

// ---------------------------------------------------------------------------
// Light shafts from windows with drifting dust motes (daytime).

export interface Shaft {
  x0: number
  y0: number
  x1: number
  y1: number
  w0: number
  w1: number
}

export class LightShafts implements Life {
  constructor(
    private s: WorldScene,
    private shafts: Shaft[],
    private strength = 0.07,
  ) {}
  private day() {
    const p = this.s.phase
    return p === 'day' || p === 'golden' || p === 'dawn'
  }
  update(dt: number) {
    if (!this.day()) return
    for (const sh of this.shafts) {
      if (!this.s.onScreen((sh.x0 + sh.x1) / 2, (sh.y0 + sh.y1) / 2, 60)) continue
      if (Math.random() < dt * 1.2) {
        const t = Math.random()
        const x = sh.x0 + (sh.x1 - sh.x0) * t + rand(-0.5, 0.5) * (sh.w0 + (sh.w1 - sh.w0) * t)
        const y = sh.y0 + (sh.y1 - sh.y0) * t
        this.s.particles.add({ kind: 'dot', x, y, vx: rand(-2, 2), vy: rand(-1.5, 1.5), max: rand(2.5, 4.5), color: '#fff8e0' })
      }
    }
  }
  glow(g: Surface, t: number) {
    if (!this.day()) return
    const k = this.s.phase === 'day' ? 1 : 0.7
    this.shafts.forEach((sh, i) => {
      const a = this.strength * k * (0.85 + Math.sin(t * 0.6 + i) * 0.15)
      drawShaft(g, sh.x0, sh.y0, sh.x1, sh.y1, sh.w0, sh.w1, a)
    })
  }
}

// ---------------------------------------------------------------------------
// Firecrackers (ประทัด): strings that crackle with flashes, smoke puffs,
// red paper confetti and a "ปัง!" – set off periodically at a spot and on tap.

interface Burst {
  x: number
  y: number
  left: number
  next: number
}

export class Firecrackers implements Life {
  private bursts: Burst[] = []
  private timers: number[]
  private flashes: { x: number; y: number; t: number }[] = []
  constructor(
    private s: WorldScene,
    private spots: { x: number; y: number; every?: [number, number] }[],
    private hit?: Rect,
  ) {
    this.timers = spots.map(() => rand(2, 6))
  }
  fire(x: number, y: number, n = 10) {
    this.bursts.push({ x, y, left: n, next: 0 })
    if (this.s.onScreen(x, y, 40)) this.s.particles.popText(x, y - 18, pick(['ปัง!', 'ปัง ๆ!', 'เปรี้ยง!', 'ปะปะปะ!']), '#ffe27a', '#b8343f')
  }
  update(dt: number) {
    this.spots.forEach((sp, i) => {
      this.timers[i] -= dt
      if (this.timers[i] <= 0) {
        const [a, b] = sp.every ?? [6, 14]
        this.timers[i] = rand(a, b)
        this.fire(sp.x, sp.y, Math.floor(rand(8, 16)))
      }
    })
    for (const b of this.bursts) {
      b.next -= dt
      if (b.next > 0 || b.left <= 0) continue
      b.next = rand(0.05, 0.16)
      b.left--
      const x = b.x + rand(-5, 5)
      const y = b.y + rand(-4, 2)
      this.flashes.push({ x, y, t: 0.12 })
      const on = this.s.onScreen(x, y, 30)
      if (on && Math.random() < 0.6) sfx.click()
      for (let k = 0; k < 2; k++) this.s.particles.add({ kind: 'smoke', x, y: y - 2, vx: rand(-8, 8) + this.s.wind() * 4, vy: rand(-18, -8), max: rand(1.4, 2.6), color: pick(['#efeaf4', '#d8d0dc', '#fffaf0']), size: 2, drag: 1.2 })
      for (let k = 0; k < 3; k++) this.s.particles.add({ kind: 'confetti', x, y, vx: rand(-30, 30), vy: rand(-40, -14), g: 70, max: rand(0.8, 1.6), color: pick(['#e8514a', '#b8343f', '#ff8a7a', '#ffd23f']), drag: 1.5 })
      if (Math.random() < 0.3) this.s.particles.add({ kind: 'sparkle', x, y: y - 2, vx: rand(-20, 20), vy: rand(-26, -6), max: 0.4, color: '#fff3a6', drag: 2 })
    }
    this.bursts = this.bursts.filter((b) => b.left > 0)
    for (const f of this.flashes) f.t -= dt
    this.flashes = this.flashes.filter((f) => f.t > 0)
  }
  over(g: Surface) {
    for (const f of this.flashes) {
      g.px(f.x, f.y, '#ffffff')
      g.px(f.x - 1, f.y, '#fff3a6')
      g.px(f.x + 1, f.y, '#fff3a6')
      g.px(f.x, f.y - 1, '#fff3a6')
      g.px(f.x, f.y + 1, '#ffb35a')
    }
  }
  glow(g: Surface) {
    for (const f of this.flashes) drawGlow(g, f.x, f.y, 9, 0.9, '#ffcf7a')
  }
  tap(x: number, y: number): boolean {
    if (!this.hit || !inRect(this.hit, x, y)) return false
    this.fire(x, Math.min(y + 4, this.hit.y + this.hit.h), 12)
    sfx.whoosh()
    return true
  }
}

// ---------------------------------------------------------------------------
// Free-range temple chickens: hens with chicks and a crowing rooster.

interface Chick {
  x: number
  y: number
  tx: number
  ty: number
  t: number
  peck: number
  flip: boolean
  kind: 'hen' | 'chick' | 'rooster'
  flee: number
  crow: number
  body: Color
}

export class Chickens implements Life {
  private birds: Chick[] = []
  constructor(
    private s: WorldScene,
    private area: Rect,
    n = 4,
    chicks = 5,
  ) {
    const bodies = ['#c8703c', '#fffaf0', '#8a4a2a', '#3a2838']
    for (let i = 0; i < n; i++) {
      const [x, y] = this.spot()
      this.birds.push({ x, y, tx: x, ty: y, t: rand(0, 5), peck: 0, flip: Math.random() < 0.5, kind: i === 0 ? 'rooster' : 'hen', flee: 0, crow: rand(4, 12), body: bodies[i % bodies.length] })
    }
    for (let i = 0; i < chicks; i++) {
      const mom = this.birds[1 + (i % Math.max(1, n - 1))] ?? this.birds[0]
      this.birds.push({ x: mom.x + rand(-6, 6), y: mom.y + rand(-3, 3), tx: mom.x, ty: mom.y, t: rand(0, 5), peck: 0, flip: false, kind: 'chick', flee: 0, crow: 99, body: '#ffe45e' })
    }
  }
  private spot(): [number, number] {
    const r = this.area
    for (let i = 0; i < 20; i++) {
      const x = rand(r.x, r.x + r.w)
      const y = rand(r.y, r.y + r.h)
      if (this.s.grid.freeAt(x, y)) return [x, y]
    }
    return [r.x + r.w / 2, r.y + r.h / 2]
  }
  update(dt: number) {
    const p = this.s.player
    const moms = this.birds.filter((b) => b.kind === 'hen')
    for (const b of this.birds) {
      b.t += dt
      b.flee -= dt
      b.crow -= dt
      if (b.kind === 'rooster' && b.crow <= 0) {
        b.crow = rand(14, 30)
        if (this.s.onScreen(b.x, b.y, 10)) this.s.say(pick(['เอ้ก อี เอ้ก เอ้ก!', 'กุ๊ก ๆ ๆ', 'เอ้กกก~']), b.x, b.y - 16, 2)
      }
      const near = Math.hypot(p.x - b.x, p.y - b.y) < (p.moving ? 20 : 10)
      if (near && b.flee <= 0) {
        b.flee = 1
        const a = Math.atan2(b.y - p.y, b.x - p.x)
        b.tx = b.x + Math.cos(a) * 26
        b.ty = b.y + Math.sin(a) * 14
        if (!this.s.grid.freeAt(b.tx, b.ty) || !inRect(this.area, b.tx, b.ty, 10)) [b.tx, b.ty] = this.spot()
      } else if (b.kind === 'chick' && moms.length && Math.random() < dt * 0.8) {
        const m = moms[Math.floor(b.t * 1000) % moms.length]
        b.tx = m.x + rand(-8, 8)
        b.ty = m.y + rand(-3, 4)
      } else if (Math.random() < dt * 0.25) {
        const nx = b.x + rand(-18, 18)
        const ny = b.y + rand(-8, 8)
        if (this.s.grid.freeAt(nx, ny) && inRect(this.area, nx, ny)) {
          b.tx = nx
          b.ty = ny
        }
      }
      const dx = b.tx - b.x
      const dy = b.ty - b.y
      const d = Math.hypot(dx, dy)
      const sp = b.flee > 0 ? 34 : b.kind === 'chick' ? 12 : 8
      if (d > 0.8) {
        b.x += (dx / d) * Math.min(d, sp * dt)
        b.y += (dy / d) * Math.min(d, sp * dt)
        b.flip = dx < 0
        b.peck = 0
      } else if (b.peck <= 0 && Math.random() < dt * 0.9) b.peck = rand(0.4, 1)
      else b.peck -= dt
    }
  }
  sorted(add: (y: number, draw: () => void) => void) {
    for (const b of this.birds) {
      if (!this.s.onScreen(b.x, b.y, 12)) continue
      add(b.y, () => drawChicken(this.s.gfx, b))
    }
  }
  tap(x: number, y: number): boolean {
    for (const b of this.birds) {
      if (Math.abs(b.x - x) < 7 && y > b.y - 12 && y < b.y + 3) {
        b.flee = 1.2
        b.tx = b.x + rand(-26, 26)
        b.ty = b.y + rand(-10, 10)
        if (!this.s.grid.freeAt(b.tx, b.ty)) [b.tx, b.ty] = this.spot()
        this.s.say(b.kind === 'rooster' ? 'เอ้ก อี เอ้ก เอ้ก!' : b.kind === 'chick' ? 'จิ๊บ ๆ!' : 'กุ๊ก ๆ กะต๊าก!', b.x, b.y - 14, 1.8)
        this.s.particles.add({ kind: 'petal', x: b.x, y: b.y - 6, vx: rand(-8, 8), vy: rand(-14, -6), max: 1.4, color: b.body, color2: mixHex(b.body, '#ffffff', 0.4) })
        sfx.plop()
        return true
      }
    }
    return false
  }
}

function drawChicken(g: Surface, b: Chick) {
  const x = Math.round(b.x)
  const y = Math.round(b.y)
  const f = b.flip ? -1 : 1
  const peck = b.peck > 0 && Math.sin(b.t * 16) > 0
  const step = Math.floor(b.t * 8) % 2
  if (b.kind === 'chick') {
    drawShadow(g, x, y, 2.5, 1)
    g.rect(x - 2, y - 4, 4, 3, '#ffe45e')
    g.px(x - 2, y - 4, '#fff3a6')
    const hx = x + f * (peck ? 2 : 1)
    const hy = y - (peck ? 3 : 5)
    g.rect(hx - 1, hy - 1, 2, 2, '#ffe45e')
    g.px(hx + f, hy, '#f58f35')
    g.px(hx, hy - 1, '#3a2838')
    g.px(x - 1 + step, y - 1, '#f58f35')
    return
  }
  const body = b.body
  const bodyD = mixHex(body, '#3a2838', 0.3)
  drawShadow(g, x, y, 4, 1.4)
  // Legs.
  g.px(x - 1, y - 1 - step, '#e9a53a')
  g.px(x + 1, y - 1 - (1 - step), '#e9a53a')
  g.px(x - 1, y, '#e9a53a')
  g.px(x + 1, y, '#e9a53a')
  // Body.
  g.ellipse(x, y - 4, 4, 2.6, body)
  g.hline(x - 3, x + 2, y - 2, bodyD)
  // Tail.
  if (b.kind === 'rooster') {
    g.px(x - f * 4, y - 6, '#2f6f4b')
    g.px(x - f * 5, y - 7, '#224f3e')
    g.px(x - f * 5, y - 8, '#3f8a4f')
    g.px(x - f * 4, y - 9, '#2f6f4b')
    g.px(x - f * 6, y - 6, '#224f3e')
  } else {
    g.px(x - f * 4, y - 6, bodyD)
    g.px(x - f * 5, y - 7, body)
  }
  // Head.
  const hx = x + f * (peck ? 4 : 3)
  const hy = y - (peck ? 3 : 8)
  g.rect(hx - 1, hy - 1, 3, 3, b.kind === 'rooster' ? '#e9a53a' : body)
  g.px(hx + f * 2, hy, '#ffd23f')
  g.px(hx + (f > 0 ? 1 : -1), hy - 1, '#3a2838')
  g.px(hx, hy - 2, '#e8514a')
  if (b.kind === 'rooster') {
    g.px(hx - 1, hy - 2, '#e8514a')
    g.px(hx + 1, hy - 3, '#e8514a')
    g.px(hx + f, hy + 2, '#e8514a')
  }
}

// ---------------------------------------------------------------------------
// Hill monkeys (ลิงแสม) that hop along railings and snatch snacks.

interface Monkey {
  x: number
  y: number
  hx: number
  hy: number
  tx: number
  ty: number
  t: number
  hop: number
  state: 'sit' | 'walk' | 'groom' | 'scratch' | 'flee'
  timer: number
  flip: boolean
  baby: boolean
}

export class Monkeys implements Life {
  private m: Monkey[] = []
  constructor(
    private s: WorldScene,
    homes: { x: number; y: number; baby?: boolean; range?: number }[],
    private ranges = new Map<Monkey, number>(),
  ) {
    for (const h of homes) {
      const mk: Monkey = { x: h.x, y: h.y, hx: h.x, hy: h.y, tx: h.x, ty: h.y, t: rand(0, 5), hop: 0, state: 'sit', timer: rand(2, 6), flip: Math.random() < 0.5, baby: !!h.baby }
      this.m.push(mk)
      this.ranges.set(mk, h.range ?? 20)
    }
  }
  update(dt: number) {
    const p = this.s.player
    for (const k of this.m) {
      k.t += dt
      k.timer -= dt
      if (k.state === 'walk' || k.state === 'flee') {
        const dx = k.tx - k.x
        const dy = k.ty - k.y
        const d = Math.hypot(dx, dy)
        const sp = k.state === 'flee' ? 42 : 16
        if (d < 1) {
          k.state = Math.random() < 0.5 ? 'sit' : 'groom'
          k.timer = rand(2, 7)
        } else {
          k.x += (dx / d) * Math.min(d, sp * dt)
          k.y += (dy / d) * Math.min(d, sp * dt)
          k.flip = dx < 0
          k.hop += dt * 10
        }
        continue
      }
      if (Math.hypot(p.x - k.x, p.y - k.y) < 14 && p.moving) {
        k.state = 'flee'
        const r = this.ranges.get(k) ?? 20
        k.tx = k.hx + (k.x < p.x ? -r : r)
        k.ty = k.hy + rand(-2, 2)
        continue
      }
      if (k.timer <= 0) {
        const r = this.ranges.get(k) ?? 20
        const roll = Math.random()
        if (roll < 0.45) {
          k.state = 'walk'
          k.tx = k.hx + rand(-r, r)
          k.ty = k.hy + rand(-2, 2)
        } else {
          k.state = roll < 0.7 ? 'scratch' : roll < 0.85 ? 'groom' : 'sit'
          k.timer = rand(2, 6)
        }
      }
    }
  }
  sorted(add: (y: number, draw: () => void) => void) {
    for (const k of this.m) {
      if (!this.s.onScreen(k.x, k.y, 14)) continue
      add(k.y, () => drawMonkey(this.s.gfx, k))
    }
  }
  tap(x: number, y: number): boolean {
    for (const k of this.m) {
      if (Math.abs(k.x - x) < 7 && y > k.y - 12 && y < k.y + 3) {
        k.state = 'flee'
        const r = this.ranges.get(k) ?? 20
        k.tx = k.hx + (Math.random() < 0.5 ? -r : r)
        k.ty = k.hy
        this.s.say(pick(['เจี๊ยก ๆ!', 'อุ๊ก ๆ อั๊ก ๆ', 'ขอกล้วยหน่อย~', 'เจี๊ยก! (แย่งแว่นกันแดด)']), k.x, k.y - 14, 2)
        sfx.tap()
        return true
      }
    }
    return false
  }
}

function drawMonkey(g: Surface, k: Monkey) {
  const x = Math.round(k.x)
  const bob = k.state === 'walk' || k.state === 'flee' ? Math.round(Math.abs(Math.sin(k.hop)) * -2) : 0
  const y = Math.round(k.y) + bob
  const f = k.flip ? -1 : 1
  const fur = '#a8876a'
  const furD = '#7e6450'
  const face = '#e8b8a0'
  const s = k.baby ? 0.7 : 1
  drawShadow(g, x, Math.round(k.y), 4 * s, 1.3)
  if (k.baby) {
    g.rect(x - 2, y - 4, 4, 3, fur)
    g.rect(x - 2, y - 7, 4, 3, fur)
    g.px(x - 1 + (f > 0 ? 1 : 0), y - 6, face)
    g.px(x + (f > 0 ? 1 : 0), y - 6, '#3a2838')
    g.px(x - f * 3, y - 2, furD)
    return
  }
  // Tail curling up.
  g.px(x - f * 4, y - 3, furD)
  g.px(x - f * 5, y - 4, furD)
  g.px(x - f * 5, y - 5, furD)
  g.px(x - f * 4, y - 6, furD)
  // Body (sitting hunched or walking).
  if (k.state === 'walk' || k.state === 'flee') {
    g.rect(x - 3, y - 5, 7, 3, fur)
    g.px(x - 3, y - 2, furD)
    g.px(x + 3, y - 2, furD)
    g.px(x - 2 + (Math.floor(k.hop) % 2), y - 1, furD)
    g.px(x + 2 - (Math.floor(k.hop) % 2), y - 1, furD)
  } else {
    g.rect(x - 3, y - 6, 6, 5, fur)
    g.hline(x - 3, x + 2, y - 1, furD)
    g.px(x - 2, y - 2, face)
    g.px(x + 1, y - 2, face)
  }
  // Head.
  const hx = x + f * 2
  const hy = k.state === 'walk' || k.state === 'flee' ? y - 7 : y - 9
  g.rect(hx - 2, hy - 1, 5, 4, fur)
  g.rect(hx - 1 + (f > 0 ? 1 : 0), hy, 3, 3, face)
  g.px(hx + (f > 0 ? 1 : 0), hy + 1, '#3a2838')
  g.px(hx + (f > 0 ? 2 : -1), hy + 1, '#3a2838')
  g.px(hx - 2 * f, hy, face)
  // Scratch / groom arm.
  if (k.state === 'scratch' && Math.floor(k.t * 6) % 2) g.px(hx - f * 2, hy - 2, furD)
  if (k.state === 'groom') g.px(x + f, y - 4 - (Math.floor(k.t * 3) % 2), face)
}

// ---------------------------------------------------------------------------
// Nang talung (หนังตะลุง): shadow puppets dancing on a back-lit screen.

export class ShadowPuppets implements Life {
  private react = 0
  private who = 0
  constructor(
    private s: WorldScene,
    /** Screen rectangle in world space. */
    private screen: Rect,
    private sortY: number,
    private lines: string[][],
  ) {}
  update(dt: number) {
    this.react = Math.max(0, this.react - dt)
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    const r = this.screen
    if (!this.s.onScreen(r.x + r.w / 2, r.y + r.h / 2, 40)) return
    add(this.sortY + 0.3, () => {
      const g = this.s.gfx
      const night = this.s.isNight()
      // Screen glow.
      g.rect(r.x, r.y, r.w, r.h, night ? '#fff1c0' : '#fff8e8')
      if (night) {
        g.alpha(0.35)
        g.ellipse(r.x + r.w / 2, r.y + r.h - 2, r.w * 0.45, 5, '#ffcf7a')
        g.alpha(1)
      }
      const ink = night ? '#2a1a1a' : '#6a5a5a'
      const jig = this.react > 0 ? 3 : 1
      // Hero (รูปพระ) with a tall crown, left side.
      const hx = r.x + 8 + Math.round(Math.sin(t * 1.6) * 2 * jig)
      const hy = r.y + r.h - 3
      g.rect(hx - 1, hy - 12, 3, 8, ink)
      g.px(hx, hy - 15, ink)
      g.px(hx, hy - 14, ink)
      g.rect(hx - 1, hy - 13, 3, 1, ink)
      g.line(hx + 1, hy - 10, hx + 5, hy - 12 + Math.round(Math.sin(t * 3) * 2 * jig), ink)
      g.line(hx - 1, hy - 4, hx - 3, hy, ink)
      g.line(hx + 1, hy - 4, hx + 3, hy, ink)
      g.px(hx + 5, hy - 13 + Math.round(Math.sin(t * 3) * 2 * jig), ink)
      // Ai Theng (ไอ้เท่ง) the clown: pot belly, pointy finger, right side.
      const cx = r.x + r.w - 9 + Math.round(Math.sin(t * 2.3 + 1) * 1.5 * jig)
      const cy = r.y + r.h - 3
      g.ellipse(cx, cy - 6, 3, 3.5, ink)
      g.rect(cx - 1, cy - 12, 3, 3, ink)
      g.px(cx - 2, cy - 11, ink)
      g.line(cx - 2, cy - 7, cx - 6, cy - 9 - Math.round(Math.abs(Math.sin(t * 4)) * 2 * jig), ink)
      g.px(cx - 1, cy - 2, ink)
      g.px(cx + 1, cy - 2, ink)
      g.px(cx - 1, cy - 1, ink)
      g.px(cx + 1, cy - 1, ink)
      // Rod handles poking below the screen.
      g.vline(hx, hy, hy + 3, '#6e4a35')
      g.vline(cx, cy, cy + 3, '#6e4a35')
      // Tree of life (รูปฤาษี / ต้นไม้) in the middle when idle.
      if (this.react <= 0) {
        const mx = r.x + r.w / 2
        g.vline(mx, r.y + 4, r.y + r.h - 2, ink)
        g.px(mx - 1, r.y + 6, ink)
        g.px(mx + 1, r.y + 6, ink)
        g.px(mx - 2, r.y + 8, ink)
        g.px(mx + 2, r.y + 8, ink)
      }
    })
  }
  glow(g: Surface, _t: number, light: number) {
    if (light < 0.3) return
    const r = this.screen
    drawGlow(g, r.x + r.w / 2, r.y + r.h / 2, r.w * 0.8, light * 0.7, '#ffcf7a')
  }
  tap(x: number, y: number): boolean {
    const r = this.screen
    if (!inRect(r, x, y, 4)) return false
    this.react = 2.4
    const ls = this.lines[this.who % this.lines.length]
    this.who++
    this.s.say(pick(ls), r.x + r.w / 2, r.y - 4, 2.8)
    sfx.hum(Math.floor(Math.random() * 5))
    return true
  }
}

// ---------------------------------------------------------------------------
// Gentle ambient helpers.

/** Occasional rising sparkle motes in an area (holy places at night). */
export class Motes implements Life {
  constructor(
    private s: WorldScene,
    private area: Rect,
    private rate = 1,
    private color: Color = '#fff3a6',
  ) {}
  update(dt: number) {
    if (Math.random() < dt * this.rate) {
      const r = this.area
      const x = rand(r.x, r.x + r.w)
      const y = rand(r.y, r.y + r.h)
      if (this.s.onScreen(x, y, 10)) this.s.particles.add({ kind: 'sparkle', x, y, vy: rand(-6, -2), max: rand(1, 2), color: this.color, drag: 0.3 })
    }
  }
}

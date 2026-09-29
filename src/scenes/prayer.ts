// PrayerHallScene: the heart of the game. The player kneels (seen from
// behind) before the principal Buddha image while chanting; the room
// answers their voice with flaring candles, thickening incense smoke,
// a pulsing aura and a brightening halo.

import type { Surface } from '../engine/pixel'
import type { Scene } from '../engine/stage'
import type { Sprite } from '../engine/sprite'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import { avatarSprite, type AvatarLook } from '../art/avatar'
import { bakeHall, inPoly, softGlow, type HallLayers, type HallTemple, type SafeArea, type ShrineDeity } from '../art/hall'

export type { HallTemple, ShrineDeity } from '../art/hall'
export type KneelPose = 'kneel' | 'wai' | 'bow' | 'sit'
export type PrayerPhase = 'enter' | 'ready' | 'chant' | 'bow' | 'finale'
export type HitQuality = 'perfect' | 'good' | 'ok' | 'miss'

export interface PrayerHallOptions {
  temple: HallTemple
  look: AvatarLook
  /** Custom player sprite (e.g. the 34×50 HD doll); drawn by its bottom-centre. */
  playerSprite?: (pose: KneelPose, blink: boolean) => Sprite
  /** Deity for temple 'shrine' (default 'ganesha'). */
  deity?: ShrineDeity
  /** Calm areas kept for the DOM UI (fractions of the height). */
  safe?: SafeArea
  /** Worshippers' looks (defaults provided). */
  npcs?: AvatarLook[]
}

type FxKind = 'orb' | 'petal' | 'puff' | 'smoke' | 'mote' | 'rain' | 'ring'

interface Fx {
  k: FxKind
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  c: string
  c2?: string
  /** Orbs: start point, control point and target. */
  sx?: number
  sy?: number
  qx?: number
  qy?: number
  tx?: number
  ty?: number
  ph: number
}

const ENTER_TIME = 2.2
const BOW_TIME = 1.3

const DEFAULT_NPCS: AvatarLook[] = [
  { gender: 'f', face: 1, skin: 2, hairColor: 0, hair: 'hair_long', top: 'top_white', bottom: 'bot_sarong' },
  { gender: 'm', face: 0, skin: 0, hairColor: 1, hair: 'hair_short', top: 'top_white', bottom: 'bot_black' },
]

const PETALS: [string, string][] = [
  ['#ffd0e0', '#f7a2c0'],
  ['#fffaf0', '#e8e0c8'],
  ['#ffd35a', '#f59a2a'],
  ['#ff9fc0', '#e8709e'],
]

export class PrayerHallScene implements Scene {
  w = 200
  h = 430
  t = 0
  onReady?: () => void

  private layers: HallLayers | null = null
  private phase: PrayerPhase = 'enter'
  private enterT = 0
  private readyFired = false
  private voice = 0
  private voiceTarget = 0
  private focus = 0
  private focusTarget = 0
  private idlePose: KneelPose = 'kneel'
  private bowT = -1
  private bowQueue: ((() => void) | undefined)[] = []
  private fx: Fx[] = []
  private sparks = new Particles()
  private haloKick = 0
  private finaleT = -1
  private blinkT = 2
  private npcBow = [-1, -1]
  private motes: { x: number; y: number; vx: number; vy: number; ph: number; shaft: number }[] = []

  constructor(private opts: PrayerHallOptions) {}

  // --- public API ----------------------------------------------------------

  setPhase(p: PrayerPhase) {
    if (p === 'enter') {
      this.enterT = 0
      this.readyFired = false
      this.finaleT = -1
    }
    if (p === 'finale' && this.phase !== 'finale') this.finale()
    if (p === 'chant' && this.idlePose === 'kneel') this.idlePose = 'wai'
    if (p !== 'enter' && this.phase === 'enter') this.skipEnter()
    this.phase = p
  }

  setVoice(level: number) {
    this.voiceTarget = Math.max(0, Math.min(1, level || 0))
  }

  setFocus(v: number) {
    this.focusTarget = Math.max(0, Math.min(1, v || 0))
  }

  setPose(p: KneelPose) {
    this.idlePose = p
  }

  /** Per-word feedback: light rises from the player toward the image. */
  hit(q: HitQuality) {
    const L = this.layers?.L
    if (!L) return
    const [hx, hy] = this.handsPos()
    if (q === 'miss') {
      for (let i = 0; i < 7; i++)
        this.add({ k: 'puff', x: hx + rand(-4, 4), y: hy + rand(-3, 2), vx: rand(-8, 8), vy: rand(-10, -3), max: rand(0.6, 1), size: rand(1, 2.2), c: '#9a8f9c' })
      return
    }
    const n = q === 'perfect' ? 3 : q === 'good' ? 2 : 1
    for (let i = 0; i < n; i++) {
      const tx = L.headX + rand(-8, 8) * L.s
      const ty = L.heartY + rand(-10, 6) * L.s
      const side = (i % 2 ? 1 : -1) * rand(20, 40) * L.s
      this.add({
        k: 'orb',
        x: hx,
        y: hy,
        vx: 0,
        vy: 0,
        max: rand(0.95, 1.25) + i * 0.08,
        size: q === 'perfect' ? 2 : q === 'good' ? 1.5 : 1,
        c: q === 'perfect' ? '#fff3b0' : '#ffe08a',
        sx: hx,
        sy: hy,
        qx: (hx + tx) / 2 + side,
        qy: Math.min(hy, ty) - 20 * L.s,
        tx,
        ty,
      })
    }
    if (q === 'perfect') {
      this.add({ k: 'ring', x: hx, y: hy, vx: 0, vy: 0, max: 0.6, size: 14, c: '#fff0b8' })
      for (let i = 0; i < 5; i++) {
        const [c, c2] = PETALS[i % 2 ? 0 : 3]
        this.add({ k: 'petal', x: hx + rand(-6, 6), y: hy, vx: rand(-14, 14), vy: rand(-34, -20), max: rand(1.4, 2), size: 1, c, c2 })
      }
      this.sparks.sparkles(hx, hy - 4, 5, '#fff6a8', 8)
    }
  }

  /** Combo milestone: a lotus ring blooms around the player and light rises to the halo. */
  milestone(level = 1) {
    const L = this.layers?.L
    if (!L) return
    const [hx, hy] = this.handsPos()
    this.add({ k: 'ring', x: hx, y: hy, vx: 0, vy: 0, max: 0.9, size: 26 + level * 8, c: '#ffe7a0' })
    this.add({ k: 'ring', x: L.headX, y: L.headY, vx: 0, vy: 0, max: 1.1, size: 40 * L.s + level * 10, c: '#fff3c0' })
    const n = 10 + level * 4
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const [c, c2] = PETALS[i % PETALS.length]
      this.add({ k: 'petal', x: hx + Math.cos(a) * 6, y: hy + Math.sin(a) * 3, vx: Math.cos(a) * rand(18, 30), vy: Math.sin(a) * rand(10, 18) - 26, max: rand(1.3, 1.9), size: 1, c, c2 })
    }
    this.haloKick = 1
    this.sparks.sparkles(L.headX, L.headY, 10, '#fff6a8', 18)
  }

  /** A gentle, encouraging glow when a stage was not passed yet. */
  soften() {
    const L = this.layers?.L
    if (!L) return
    for (let i = 0; i < 14; i++) this.add({ k: 'mote', x: L.playerX + rand(-20, 20), y: L.playerY - rand(10, 50), vx: rand(-4, 4), vy: rand(-14, -6), max: rand(1.6, 2.6), size: 1, c: '#ffe7b0' })
  }

  /** One full กราบ (~1.3 s). Calls chain; each `done` fires as its bow ends. */
  bow(done?: () => void) {
    this.bowQueue.push(done)
    if (this.bowT < 0) this.bowT = 0
    // Fellow worshippers follow a moment later.
    this.npcBow = this.npcBow.map((v, i) => (v < 0 ? -0.25 - i * 0.15 : v))
  }

  /** The results moment: a warm burst of light and a rain of flowers. */
  finale() {
    const L = this.layers?.L
    this.finaleT = 0
    this.phase = 'finale'
    if (!L) return
    this.add({ k: 'ring', x: L.headX, y: L.headY, vx: 0, vy: 0, max: 1.2, size: 90 * L.s, c: '#fff3c0' })
    this.add({ k: 'ring', x: L.headX, y: L.headY, vx: 0, vy: 0, max: 1.6, size: 140 * L.s, c: '#ffd98a' })
    for (let i = 0; i < 30; i++) {
      const a = rand(0, Math.PI * 2)
      const sp = rand(20, 70)
      this.add({ k: 'mote', x: L.headX, y: L.heartY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 10, max: rand(1, 2), size: 1, c: '#fff3a6' })
    }
    this.sparks.sparkles(L.headX, L.headY, 16, '#fff6a8', 30)
  }

  get layout() {
    return this.layers?.L ?? null
  }

  /** Player sprite scale for the given sprite height (integer ≥ 1). */
  playerScale(spriteH: number) {
    return Math.max(1, Math.round(Math.min(90, this.h * 0.14) / spriteH))
  }

  // --- Scene ---------------------------------------------------------------

  resize(w: number, h: number) {
    if (w === this.w && h === this.h && this.layers) return
    this.w = w
    this.h = h
    this.layers = bakeHall(this.opts.temple, w, h, { safe: this.opts.safe, deity: this.opts.deity })
    this.seedMotes()
  }

  private seedMotes() {
    const L = this.layers!.L
    this.motes = []
    L.shafts.forEach((poly, si) => {
      const n = Math.round(10 * L.s)
      for (let i = 0; i < n; i++) {
        const p = this.pointIn(poly)
        if (p) this.motes.push({ x: p[0], y: p[1], vx: rand(-1.5, 1.5), vy: rand(-2, 1), ph: rand(0, 6), shaft: si })
      }
    })
  }

  private pointIn(poly: [number, number][]): [number, number] | null {
    let x0 = Infinity
    let x1 = -Infinity
    let y0 = Infinity
    let y1 = -Infinity
    for (const [x, y] of poly) {
      x0 = Math.min(x0, x)
      x1 = Math.max(x1, x)
      y0 = Math.min(y0, y)
      y1 = Math.max(y1, y)
    }
    for (let i = 0; i < 30; i++) {
      const x = rand(Math.max(0, x0), Math.min(this.w, x1))
      const y = rand(Math.max(0, y0), Math.min(this.h, y1))
      if (inPoly(poly, x, y)) return [x, y]
    }
    return null
  }

  private skipEnter() {
    this.enterT = ENTER_TIME
    if (!this.readyFired) {
      this.readyFired = true
      this.onReady?.()
    }
  }

  private add(p: Omit<Fx, 'life' | 'ph'> & { ph?: number }) {
    this.fx.push({ ph: rand(0, 6), ...p, life: p.max })
    if (this.fx.length > 500) this.fx.splice(0, this.fx.length - 500)
  }

  update(dt: number, _time = 0) {
    this.t += dt
    const L = this.layers?.L
    if (!L) return
    const s = L.s
    if (this.enterT < ENTER_TIME) {
      this.enterT += dt
      if (this.enterT >= ENTER_TIME && !this.readyFired) {
        this.readyFired = true
        if (this.phase === 'enter') this.phase = 'ready'
        this.onReady?.()
      }
    }
    // Voice: fast attack, gentle release. Focus: slow and steady.
    const vk = this.voiceTarget > this.voice ? 18 : 4
    this.voice += (this.voiceTarget - this.voice) * Math.min(1, dt * vk)
    this.focus += (this.focusTarget - this.focus) * Math.min(1, dt * 1.6)
    this.haloKick = Math.max(0, this.haloKick - dt * 1.5)
    this.blinkT -= dt
    if (this.blinkT < -0.14) this.blinkT = rand(2.5, 5)
    // Bows.
    if (this.bowT >= 0) {
      this.bowT += dt
      if (this.bowT >= BOW_TIME) {
        const done = this.bowQueue.shift()
        this.bowT = this.bowQueue.length ? 0 : -1
        done?.()
      }
    }
    this.npcBow = this.npcBow.map((v) => {
      if (v === -1) return -1
      const n = v + dt
      return n >= BOW_TIME ? (this.bowT >= 0 ? 0 : -1) : n
    })
    if (this.finaleT >= 0) this.finaleT += dt
    // Incense smoke thickens with the voice.
    const lit = this.enterT >= ENTER_TIME * 0.2
    if (lit)
      for (const p of L.incense) {
        const rate = (3 + this.voice * 16) / Math.max(1, L.incense.length / 2)
        if (Math.random() < dt * rate)
          this.add({ k: 'smoke', x: p.x + rand(-0.5, 0.5), y: p.y, vx: rand(-1, 1), vy: rand(-9, -6) * s, max: rand(2.2, 3.4), size: 1 + (Math.random() < this.voice ? 1 : 0), c: '#efe6f2' })
      }
    // Golden motes rising around the image and petals drifting down with focus.
    const mRate = this.focus * 14 + (this.phase === 'chant' ? 1 : 0.4)
    if (Math.random() < dt * mRate)
      this.add({ k: 'mote', x: L.headX + rand(-60, 60) * s, y: L.seatY + rand(-10, 30) * s, vx: rand(-2, 2), vy: rand(-12, -5), max: rand(2, 3.5), size: 1, c: Math.random() < 0.5 ? '#fff3a6' : '#ffd98a' })
    const pRate = this.focus * this.focus * 4 + (this.finaleT >= 0 && this.finaleT < 5 ? 26 : 0)
    if (Math.random() < dt * pRate) {
      const [c, c2] = PETALS[Math.floor(Math.random() * PETALS.length)]
      this.add({ k: 'rain', x: rand(0, this.w), y: -3, vx: rand(-4, 4), vy: rand(14, 24), max: 30, size: 1, c, c2 })
    }
    // Dust motes wander inside the light shafts.
    for (const m of this.motes) {
      m.ph += dt
      m.x += (m.vx + Math.sin(m.ph * 0.7) * 1.2) * dt
      m.y += (m.vy + Math.cos(m.ph * 0.5) * 0.8) * dt
      const poly = L.shafts[m.shaft]
      if (poly && !inPoly(poly, m.x, m.y)) {
        const p = this.pointIn(poly)
        if (p) [m.x, m.y] = p
      }
    }
    // Effects.
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const p = this.fx[i]
      p.life -= dt
      p.ph += dt
      if (p.life <= 0 || p.y > this.h + 6) {
        if (p.k === 'orb') {
          this.haloKick = Math.min(1, this.haloKick + 0.35 * p.size)
          this.sparks.sparkles(p.x, p.y, Math.round(2 + p.size * 2), '#fff6a8', 6)
        }
        this.fx.splice(i, 1)
        continue
      }
      if (p.k === 'orb') {
        const t = 1 - p.life / p.max
        const e = t * t * (3 - 2 * t)
        const u = 1 - e
        p.x = u * u * p.sx! + 2 * u * e * p.qx! + e * e * p.tx!
        p.y = u * u * p.sy! + 2 * u * e * p.qy! + e * e * p.ty!
        continue
      }
      if (p.k === 'petal') p.vy += 26 * dt
      if (p.k === 'smoke') p.x += Math.sin(p.ph * 1.8 + p.y * 0.05) * 5 * dt
      if (p.k === 'rain' || p.k === 'petal') p.x += Math.sin(p.ph * 2.1) * 9 * dt
      if (p.k === 'mote' || p.k === 'puff') {
        p.vx *= 1 - dt * 1.5
        p.vy *= 1 - dt * (p.k === 'mote' ? 0.4 : 2)
      }
      p.x += p.vx * dt
      p.y += p.vy * dt
    }
    this.sparks.update(dt)
  }

  private enterEase() {
    const t = Math.min(1, this.enterT / ENTER_TIME)
    return t * t * (3 - 2 * t)
  }

  private currentPose(): KneelPose {
    if (this.bowT >= 0) return bowPose(this.bowT, this.idlePose)
    return this.idlePose
  }

  private sprite(pose: KneelPose): { spr: Sprite; scale: number } {
    const blink = this.blinkT < 0
    const spr = this.opts.playerSprite ? this.opts.playerSprite(pose, blink) : avatarSprite(this.opts.look, 'back', pose, { barefoot: true })
    return { spr, scale: this.playerScale(this.opts.playerSprite ? spr.h : 29) }
  }

  /** Where the joined hands are (orbs start here). */
  private handsPos(): [number, number] {
    const L = this.layers!.L
    const { spr, scale } = this.sprite('wai')
    return [L.playerX, L.playerY - spr.h * scale * 0.62]
  }

  render(g: Surface) {
    const Ls = this.layers
    if (!Ls) return
    const L = Ls.L
    const { w, h } = this
    const s = L.s
    const e = this.enterEase()
    const push = 1 - e
    const dyFar = Math.round(push * 10 * s)
    const breathe = 0.5 + 0.5 * Math.sin(this.t * 1.3)
    const v = this.voice
    const f = this.focus
    const fin = this.finaleT >= 0 ? Math.max(0, 1 - this.finaleT / 3.5) : 0

    g.draw(Ls.far, 0, dyFar)
    // Halo behind the image.
    const hy = L.headY + dyFar
    const haloPow = 0.45 + 0.1 * breathe + f * 0.9 + this.haloKick * 0.6 + fin * 1.5
    softGlow(g, L.headX, hy + 14 * s, L.haloR * (2.4 + f * 0.8 + fin), (0.32 + f * 0.3 + fin * 0.4) * e, Ls.halo)
    softGlow(g, L.headX, hy, L.haloR * (1.05 + f * 0.25 + this.haloKick * 0.2), Math.min(1, haloPow * 0.6) * e, '#fff3c4')
    if (f > 0.35 || fin > 0) this.drawRays(g, L.headX, hy, L.haloR * (2.4 + f), (f - 0.35) * 0.5 + fin * 0.6)
    g.draw(Ls.mid, 0, dyFar)
    // River light dancing on the rafters and walls.
    if (L.ripples.length) {
      const ctx = g.ctx
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = '#7fd8e4'
      for (const r of L.ripples) {
        const a = 0.16 + 0.14 * Math.sin(this.t * 1.7 + r.x * 0.7)
        if (a <= 0.03) continue
        ctx.globalAlpha = a
        const off = Math.round(Math.sin(this.t * 0.9 + r.y * 0.3) * 2.5)
        const ww = Math.max(1, Math.round(r.w * (0.7 + 0.3 * Math.sin(this.t * 2.3 + r.x))))
        ctx.fillRect(Math.round(r.x + off - ww / 2), r.y + dyFar, ww, 1)
        ctx.fillRect(Math.round(r.x - off - ww / 3), r.y + dyFar + 2, Math.max(1, Math.round(ww * 0.6)), 1)
      }
      ctx.restore()
    }
    // Twinkling string lights.
    for (let i = 0; i < L.bulbs.length; i++) {
      const b = L.bulbs[i]
      const tw = 0.55 + 0.45 * Math.sin(this.t * 2.2 + i * 1.3)
      softGlow(g, b.x, b.y + dyFar, 4, 0.35 * tw * e, b.c)
      g.px(b.x, b.y + dyFar, tw > 0.4 ? '#fffbe0' : b.c)
    }
    // Candle flames and their glows (lit one by one during the entrance).
    const prog = this.enterT / (ENTER_TIME * 0.92)
    for (const fl of L.flames) {
      if (prog < fl.order) continue
      const age = (prog - fl.order) * ENTER_TIME
      this.drawFlame(g, fl.x, fl.y + dyFar, fl.size, age, fl.x * 0.37)
    }
    // Incense tips glow.
    for (const p of L.incense) {
      const on = prog > 0.2
      if (!on) continue
      g.px(p.x, p.y + dyFar, Math.sin(this.t * 3 + p.x) > -0.3 ? '#ff7040' : '#ffb060')
      softGlow(g, p.x, p.y + dyFar, 4, 0.35 + v * 0.4, '#ff9040')
    }
    this.drawFx(g, 'smoke', dyFar)
    // Nearest pillars slide in from outside as the camera pushes forward.
    const dx = Math.round(push * 22 * s)
    if (dx === 0) g.draw(Ls.fg, 0, 0)
    else {
      const half = L.cx
      g.drawPart(Ls.fg, 0, 0, half, h, -dx, Math.round(dyFar * 1.6))
      g.drawPart(Ls.fg, half, 0, w - half, h, half + dx, Math.round(dyFar * 1.6))
    }
    // Fellow worshippers.
    const npcs = this.opts.npcs ?? DEFAULT_NPCS
    L.worshippers.forEach((p, i) => {
      const look = npcs[i % npcs.length]
      if (!look) return
      const nb = this.npcBow[i] ?? -1
      const pose: KneelPose = nb >= 0 ? bowPose(nb, 'wai') : this.phase === 'chant' || Math.sin(this.t * 0.35 + i * 2.1) > 0.4 ? 'wai' : 'kneel'
      const spr = avatarSprite(look, 'back', pose, { barefoot: true })
      const y = p.y + Math.round(dyFar * 1.4)
      g.ctx.save()
      g.ctx.globalAlpha = 0.3
      g.ellipse(p.x, y - 1, spr.w * 0.45, 1.5, '#1a0b13')
      g.ctx.restore()
      g.draw(spr.canvas, Math.round(p.x - spr.w / 2), y - spr.h)
    })
    // The player, with a soft aura that pulses with the voice.
    const pose = this.currentPose()
    const { spr, scale } = this.sprite(pose)
    const py = L.playerY + Math.round(push * 16 * s)
    const auraR = Math.round(spr.h * scale * (0.55 + v * 0.35))
    const auraK = (0.18 + v * 0.85 + (this.phase === 'chant' ? 0.1 : 0)) * e
    softGlow(g, L.playerX, py - spr.h * scale * 0.5, auraR, auraK * 0.4, '#ffe6a0')
    g.ctx.save()
    g.ctx.globalAlpha = 0.35
    g.ellipse(L.playerX, py - 1, spr.w * scale * 0.5, 2 * scale, '#1a0b13')
    g.ctx.restore()
    g.drawScaled(spr.canvas, Math.round(L.playerX - (spr.w * scale) / 2), py - spr.h * scale, scale)
    // Sun shafts breathing slowly, with dust motes inside.
    g.ctx.save()
    g.ctx.globalCompositeOperation = 'lighter'
    g.ctx.globalAlpha = (0.2 + 0.06 * Math.sin(this.t * 0.4)) * (0.4 + 0.6 * e)
    g.ctx.drawImage(Ls.light, 0, dyFar)
    g.ctx.restore()
    for (const m of this.motes) {
      const tw = Math.sin(m.ph * 2 + m.x) > -0.2
      if (tw) g.px(m.x, m.y + dyFar, (m.ph * 10) % 3 < 1 ? '#fffbe0' : '#ffe9b0')
    }
    this.drawFx(g, 'mote', 0)
    this.drawFx(g, 'orb', 0)
    this.drawFx(g, 'petal', 0)
    this.drawFx(g, 'puff', 0)
    this.drawFx(g, 'ring', 0)
    this.drawFx(g, 'rain', 0)
    this.sparks.render(g)
    // Finale wash of warm light.
    if (fin > 0) {
      g.ctx.save()
      g.ctx.globalCompositeOperation = 'lighter'
      g.ctx.globalAlpha = Math.pow(fin, 2) * 0.35
      g.ctx.fillStyle = '#ffcf7a'
      g.ctx.fillRect(0, 0, w, h)
      g.ctx.restore()
    }
    // Entrance: the room starts dim and warms up.
    if (push > 0.001) {
      g.ctx.save()
      g.ctx.globalAlpha = push * 0.72
      g.ctx.fillStyle = '#12070d'
      g.ctx.fillRect(0, 0, w, h)
      g.ctx.restore()
    }
  }

  private drawRays(g: Surface, x: number, y: number, r: number, k: number) {
    if (k <= 0) return
    const ctx = g.ctx
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = Math.min(0.5, k)
    ctx.fillStyle = '#ffe7a0'
    const n = 12
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.t * 0.08
      const a2 = a + 0.07
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
      ctx.lineTo(x + Math.cos(a2) * r, y + Math.sin(a2) * r)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }

  private drawFlame(g: Surface, x: number, y: number, size: number, age: number, seed: number) {
    const v = this.voice
    const flick = Math.sin(this.t * 11 + seed) * 0.5 + Math.sin(this.t * 17.3 + seed * 2) * 0.5
    const pop = age < 0.25 ? 1 + (0.25 - age) * 6 : 1
    const s = this.layers!.L.s
    const base = (size === 0 ? 2.5 : size === 1 ? 5 : size === 2 ? 7 : 5) * Math.max(0.7, s)
    const hgt = Math.max(2, Math.round((base + v * (size === 0 ? 1.5 : 3.5) + flick * 0.8) * pop))
    const maxHalf = size === 0 ? 0.6 : size === 1 ? 1.2 : 1.7
    const sway = flick * 0.7 + v * Math.sin(this.t * 23 + seed) * 0.6
    const on = Math.min(1, age * 3)
    // Warm glow first (additive), bigger and brighter with the voice.
    const gr = (size === 0 ? 7 : size === 1 ? 13 : size === 2 ? 20 : 16) * Math.max(0.7, s)
    softGlow(g, x, y - hgt * 0.45, gr * (1 + v * 0.5), (0.5 + v * 0.45 + flick * 0.05) * on, '#ffb050')
    softGlow(g, x, y - hgt * 0.5, gr * 0.35, (0.8 + v * 0.3) * on, '#fff0c0')
    // Teardrop flame: dark-orange rim, gold body, white-hot core.
    for (let j = 0; j < hgt; j++) {
      const t = j / (hgt - 1) // 0 base → 1 tip
      const half = maxHalf * Math.sin(Math.PI * Math.pow(1 - t, 0.7)) * (t < 0.2 ? 0.75 : 1)
      const xx = x + sway * t * t
      const hw = Math.round(half)
      const yy = y - j
      g.rect(Math.round(xx) - hw - 1, yy, hw * 2 + 3, 1, t > 0.85 ? '#e0641e' : '#c8501a')
      g.rect(Math.round(xx) - hw, yy, hw * 2 + 1, 1, t > 0.7 ? '#ffb040' : '#ffd24a')
      if (t > 0.15 && t < 0.6) g.rect(Math.round(xx) - Math.max(0, hw - 1), yy, Math.max(1, hw * 2 - 1), 1, '#fffbe0')
    }
    if (size >= 1) g.px(x, y, '#6a8cff')
  }

  private drawFx(g: Surface, kind: FxKind, dy: number) {
    for (const p of this.fx) {
      if (p.k !== kind) continue
      const t = p.life / p.max
      const x = Math.round(p.x)
      const y = Math.round(p.y + dy)
      switch (kind) {
        case 'smoke': {
          g.alpha(Math.min(1, t * 1.6) * 0.5 * (1 - Math.max(0, t - 0.9) * 8))
          g.px(x, y, p.c)
          if (p.size > 1 || t < 0.6) g.px(x + 1, y, p.c)
          if (t < 0.4) g.px(x, y - 1, p.c)
          g.alpha(1)
          break
        }
        case 'mote': {
          const on = Math.sin(p.ph * 4) > -0.3
          if (!on) break
          g.alpha(Math.min(1, t * 2))
          g.px(x, y, p.c)
          g.alpha(Math.min(1, t * 2) * 0.35)
          g.px(x - 1, y, p.c)
          g.px(x + 1, y, p.c)
          g.px(x, y - 1, p.c)
          g.px(x, y + 1, p.c)
          g.alpha(1)
          break
        }
        case 'orb': {
          // Comet trail along the flight path.
          const tt = 1 - p.life / p.max
          for (let q = 1; q <= 6; q++) {
            const t2 = Math.max(0, tt - q * 0.035)
            const e2 = t2 * t2 * (3 - 2 * t2)
            const u2 = 1 - e2
            const qx = u2 * u2 * p.sx! + 2 * u2 * e2 * p.qx! + e2 * e2 * p.tx!
            const qy = u2 * u2 * p.sy! + 2 * u2 * e2 * p.qy! + e2 * e2 * p.ty!
            g.alpha(0.9 - q * 0.13)
            g.px(qx, qy, q < 3 ? '#fffbe8' : '#ffd070')
            if (p.size > 1.5 && q < 4) g.px(qx + 1, qy, '#ffe9a0')
          }
          g.alpha(1)
          softGlow(g, p.x, p.y, 7 + p.size * 4, 0.9, '#ffd98a')
          softGlow(g, p.x, p.y, 3 + p.size * 2, 0.9, '#ffffff')
          const r = p.size
          g.circle(p.x, p.y, r + 0.6, '#ffc850')
          g.circle(p.x, p.y, Math.max(0.6, r - 0.2), p.c)
          g.px(x, y, '#ffffff')
          // Little trail.
          if (Math.sin(p.ph * 30) > 0) g.px(x - Math.round(Math.sign(p.tx! - p.sx!)), y + 2, '#ffe9a0')
          break
        }
        case 'petal':
        case 'rain': {
          const flip = Math.sin(p.ph * 5) > 0
          g.px(x, y, p.c)
          g.px(x + (flip ? 1 : 0), y + (flip ? 0 : 1), p.c2 ?? p.c)
          break
        }
        case 'puff': {
          g.alpha(Math.min(1, t * 1.5) * 0.7)
          g.circle(p.x, p.y, p.size * (1.4 - t * 0.4), p.c)
          g.alpha(1)
          break
        }
        case 'ring': {
          const r = (1 - t) * p.size
          g.ctx.save()
          g.ctx.globalCompositeOperation = 'lighter'
          g.ctx.globalAlpha = t * 0.7
          g.ctx.strokeStyle = p.c
          g.ctx.lineWidth = 2
          g.ctx.beginPath()
          g.ctx.ellipse(p.x, p.y, Math.max(0.5, r), Math.max(0.5, r * 0.8), 0, 0, Math.PI * 2)
          g.ctx.stroke()
          g.ctx.restore()
          break
        }
      }
    }
  }
}

/** Pose during a bow: kneel → wai → forehead down → wai → idle. */
function bowPose(t: number, idle: KneelPose): KneelPose {
  if (t < 0.15) return idle === 'sit' ? 'kneel' : idle
  if (t < 0.42) return 'wai'
  if (t < 0.95) return 'bow'
  if (t < 1.15) return 'wai'
  return idle
}

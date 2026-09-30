// Cooking-Mama-style step mini-games. Each game owns one station of the
// close-up kitchen (board, wok, pot…), reads touch input in virtual pixels,
// and ends with a score 0..1. The KitchenScene (scene.ts) sequences them.

import type { Surface } from '../../engine/pixel'
import type { PointerInfo } from '../../engine/stage'
import type { Particles } from '../../engine/particles'
import { rand } from '../../engine/rng'
import { sfx, haptic } from '../../engine/audio'
import type { Bit, Condiment, CookStep, Vessel } from '../../game/data/recipes'
import {
  bitColors,
  bottleSprite,
  CONDIMENT_COLORS,
  dishSprite,
  DOUGH,
  DOUGH_D,
  drawBall,
  drawBananaLeaf,
  drawBits,
  drawBoard,
  drawChopItem,
  drawFlames,
  drawPourer,
  drawKrokPan,
  drawMixBowl,
  drawPan,
  drawPlate,
  drawPot,
  drawServeBowl,
  drawStove,
  drawTray,
  drawWok,
  drawWokFire,
  eggSprite,
  chopWidth,
  FOOD,
  LIQUID_COLORS,
  toolSprite,
  type Tool,
} from '../../art/cooking'
import type { Worker } from '../jobs/worker'
import { reachPose, rollPose, WP, type ArmSpec } from '../../art/poses/work'
import type { Expr } from '../../art/doll'
import { drawFist } from '../../art/workActor'
import { drawCookTool } from '../../art/workTools'
import { wsfx } from '../jobs/workSfx'

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const TAU = Math.PI * 2

/** Full marks up to `par` seconds, easing down to 55% at the time limit. */
export function timeFactor(t: number, par: number, limit: number) {
  if (t <= par) return 1
  return 1 - 0.45 * clamp01((t - par) / Math.max(1, limit - par))
}

/** What a game needs from the kitchen around it. */
export interface Kitchen {
  readonly w: number
  readonly h: number
  /** Station centre (virtual px). */
  readonly cx: number
  readonly cy: number
  readonly t: number
  readonly particles: Particles
  /** Final dish item id (for the plating reveal). */
  readonly dishId: string
  /** Main cooking vessel of the recipe and what is in it (for plating). */
  readonly cookVessel: Vessel
  readonly carry: Bit[]
  /** Back edge of the counter: the player stands behind it (waist here). */
  readonly backY: number
  /** Something burnt this recipe (for the chef's sooty face). */
  burnt: boolean
  shake(px?: number): void
  sizzle(): void
}

export interface Chip {
  key: string
  label: string
  img?: string
  state: 'done' | 'now' | 'todo' | 'miss'
}

export abstract class StepGame {
  progress = 0
  done = false
  score = 0
  time = 0
  limit = 16
  hint = ''
  down = false
  px = -99
  py = -99
  idle = 0
  tool: Tool = 'finger'
  /** Draw the tool under a pressed finger (off when the step has its own prop, e.g. the jug). */
  showCursor = true
  /** Step chips for the DOM (season order); empty for most games. */
  chips: Chip[] = []

  constructor(
    readonly step: CookStep,
    readonly k: Kitchen,
  ) {}

  update(dt: number) {
    if (this.done) {
      this.after(dt)
      return
    }
    this.time += dt
    this.idle += dt
    this.tick(dt)
    if (!this.done && this.time >= this.limit) this.finish(this.partial())
  }

  protected abstract tick(dt: number): void
  /** Keeps animating after the step is graded (e.g. landing flips). */
  protected after(_dt: number) {}
  protected partial() {
    return this.progress * 0.6
  }
  abstract draw(g: Surface): void

  pointer(e: PointerInfo) {
    if (this.done) return
    this.px = e.x
    this.py = e.y
    if (e.type === 'down') {
      this.down = true
      this.idle = 0
      this.onDown(e.x, e.y)
    } else if (e.type === 'move') {
      if (this.down) {
        this.idle = 0
        this.onDrag(e.x, e.y, e.dx, e.dy)
      }
    } else if (this.down) {
      this.down = false
      this.onUp(e.x, e.y)
    }
  }

  protected onDown(_x: number, _y: number) {}
  protected onDrag(_x: number, _y: number, _dx: number, _dy: number) {}
  protected onUp(_x: number, _y: number) {}

  protected finish(score: number) {
    if (this.done) return
    this.score = clamp01(score)
    this.done = true
    this.progress = 1
    this.down = false
  }

  /** Tutorial hand while the player hesitates (null = none). */
  ghost(_t: number): { x: number; y: number; down: boolean } | null {
    return null
  }

  /** Pose the chef for this step (called every frame while it plays). */
  chefPose(c: Worker) {
    c.pose = WP.ready
    if (this.down) chefTo(c, this.k, this.px + 10)
  }

  /** Draw whatever the chef holds, over the station. */
  drawHeld(_g: Surface, _c: Worker) {}

  /** Tool under the finger (or the ghost hand). */
  drawCursor(g: Surface, t: number) {
    if (this.done) return
    if (this.down) {
      if (!this.showCursor) return
      const s = toolSprite(this.tool)
      g.draw(s.canvas, Math.round(this.px - s.ax), Math.round(this.py - s.ay))
      return
    }
    if (this.idle < 1.4) return
    const gh = this.ghost(t)
    if (!gh) return
    const s = toolSprite(this.tool === 'finger' ? 'finger' : this.tool)
    const fade = Math.min(1, (this.idle - 1.4) * 2)
    g.alpha(0.55 * fade)
    g.draw(s.canvas, Math.round(gh.x - s.ax), Math.round(gh.y - s.ay + (gh.down ? 1 : -2)))
    g.alpha(1)
    if (gh.down) {
      g.alpha(0.5 * fade)
      const r = 3 + ((t * 3) % 1) * 5
      for (let a = 0; a < 10; a++) g.px(gh.x + Math.cos((a / 10) * TAU) * r, gh.y + Math.sin((a / 10) * TAU) * r * 0.6, '#ffffff')
      g.alpha(1)
    }
  }
}

// ---------------------------------------------------------------------------
// The chef (the player behind the counter)

/** Feet of the chef standing behind the counter. */
export function chefFeet(k: Kitchen) {
  return k.backY + 17
}

/** Walk the chef along the counter toward x. */
function chefTo(c: Worker, k: Kitchen, x: number, follow = 8) {
  c.follow = follow
  c.goTo(Math.max(k.cx - 28, Math.min(k.cx + 28, x)), chefFeet(k))
}

/** Point the chef's right hand at (tx, ty). */
function reachTo(c: Worker, tx: number, ty: number, expr: Expr = 'open', other: ArmSpec | 'rest' | null = { w: [11, 35] }) {
  const sx = c.x + 7.5
  const sy = c.feetY - 26
  const d = Math.max(6, Math.min(10, Math.hypot(tx - sx, ty - sy)))
  c.pose = reachPose('front', 'R', Math.atan2(ty - sy, tx - sx), d, expr, other)
}

/** A long-handled tool from the chef's right hand to (tx, ty). */
function heldTool(g: Surface, c: Worker, kind: 'turner' | 'ladle' | 'whisk' | 'spoon' | 'knife', tx: number, ty: number) {
  const [hx, hy] = c.wrist('R')
  drawCookTool(g, kind, hx, hy, tx, ty)
  drawFist(g, c.look, hx, hy)
}

// ---------------------------------------------------------------------------
// Shared station drawing

function onStove(v: Vessel | undefined) {
  return v === 'wok' || v === 'pan' || v === 'pot' || v === 'krok'
}

/** Draw a vessel (and the stove under it when it cooks) and return its food ellipse. */
function drawVessel(g: Surface, v: Vessel, cx: number, cy: number, t: number, flame = 1, small = false) {
  if (onStove(v)) {
    drawStove(g, cx, cy + (v === 'pot' ? 12 : 6))
    if (flame > 0) drawFlames(g, cx, cy + (v === 'pot' ? 12 : 6), t, flame)
  } else {
    // A folded cloth under bowls on the counter.
    g.ellipse(cx + 2, cy + 14, 44, 10, 'rgba(58,40,56,0.18)')
  }
  switch (v) {
    case 'wok':
      return drawWok(g, cx, cy, small ? 38 : 46, small ? 20 : 24)
    case 'pan':
      return drawPan(g, cx - 12, cy, small ? 32 : 38, small ? 17 : 20)
    case 'pot':
      return drawPot(g, cx, cy, small ? 32 : 38, small ? 12 : 14, small ? 24 : 30)
    case 'krok': {
      const holes = drawKrokPan(g, cx, cy)
      return { cx, cy, rx: 40, ry: 20, holes }
    }
    default:
      return drawMixBowl(g, cx, cy, small ? 32 : 38, small ? 13 : 15, small ? 22 : 26)
  }
}

function steam(p: Particles, x: number, y: number, spread = 16) {
  p.add({ kind: 'smoke', x: x + rand(-spread, spread), y: y + rand(-3, 3), vx: rand(-3, 3), vy: rand(-18, -10), max: rand(0.8, 1.4), color: '#ffffff', size: 2, drag: 0.6 })
}

function oilPop(p: Particles, x: number, y: number, rx: number, ry: number) {
  const a = rand(0, TAU)
  p.add({ kind: 'dot', x: x + Math.cos(a) * rx * 0.8, y: y + Math.sin(a) * ry * 0.8, vx: rand(-20, 20), vy: rand(-40, -20), g: 140, max: 0.45, color: '#fff3a6' })
}

function burst(p: Particles, x: number, y: number, colors: string[], n = 5) {
  for (let i = 0; i < n; i++) {
    p.add({ kind: 'dot', x, y, vx: rand(-40, 40), vy: rand(-50, -15), g: 160, max: rand(0.35, 0.6), color: colors[i % colors.length], size: 1 })
  }
}

// ---------------------------------------------------------------------------
// หั่น — swipe down across the ingredients

interface ChopItem {
  bit: Bit
  x: number
  y: number
  w: number
  cuts: number[]
  guides: number[]
  need: number
}

export class ChopGame extends StepGame {
  items: ChopItem[] = []
  total = 0
  made = 0
  hits = 0
  private lx = 0
  private ly = 0
  private knifeT = 0
  /** Perfect cuts in a row. */
  private run = 0
  tool: Tool = 'knife'
  limit = 16

  constructor(step: CookStep, k: Kitchen) {
    super(step, k)
    const bits = step.items?.length ? step.items : (['garlic'] as Bit[])
    const need = step.n ?? 3
    const gap = 12
    const widths = bits.map((b) => chopWidth(b))
    const total = widths.reduce((a, b) => a + b, 0) + gap * (bits.length - 1)
    let x = k.cx - total / 2
    bits.forEach((b, i) => {
      const w = widths[i]
      const guides = Array.from({ length: need }, (_, j) => Math.round(((j + 1) / (need + 1)) * w))
      this.items.push({ bit: b, x: Math.round(x), y: Math.round(k.cy - 2 + (i % 2 ? 5 : -3)), w, cuts: [], guides, need })
      x += w + gap
    })
    this.total = need * bits.length
    this.limit = 6 + this.total * 1.2
    this.hint = `อีก ${this.total} ครั้ง`
  }

  protected tick(dt: number) {
    this.knifeT = Math.max(0, this.knifeT - dt)
  }

  protected partial() {
    return (this.made / this.total) * 0.7
  }

  protected onDown(x: number, y: number) {
    this.lx = x
    this.ly = y
  }

  protected onDrag(x: number, y: number) {
    for (const it of this.items) {
      if (it.cuts.length >= it.need) continue
      const a = this.ly - it.y
      const b = y - it.y
      if (a === 0 || Math.sign(a) === Math.sign(b)) continue
      const f = a / (a - b)
      const cx = this.lx + (x - this.lx) * f - it.x
      if (cx < 3 || cx > it.w - 3) continue
      if (it.cuts.some((c) => Math.abs(c - cx) < 4)) continue
      // Nearest guide line: close cuts are "perfect".
      let gi = 0
      for (let i = 1; i < it.guides.length; i++) if (Math.abs(it.guides[i] - cx) < Math.abs(it.guides[gi] - cx)) gi = i
      const good = it.guides.length && Math.abs(it.guides[gi] - cx) <= 4
      if (good) {
        this.hits++
        this.run++
        if (this.run >= 2) {
          this.k.particles.popText(it.x + cx, it.y - 16, `x${this.run}`, this.run >= 4 ? '#ff9fc0' : '#ffd54f')
          wsfx.combo(this.run)
        }
      } else this.run = 0
      const at = good ? it.guides[gi] : Math.round(cx)
      it.guides.splice(gi, 1)
      it.cuts.push(at)
      this.made++
      this.knifeT = 0.14
      const [c, l] = bitColors(it.bit)
      burst(this.k.particles, it.x + at, it.y - 2, [c, l, c], 6)
      this.k.shake(1)
      wsfx.chop()
      haptic(6)
      if (it.cuts.length >= it.need) this.k.particles.sparkles(it.x + it.w / 2, it.y - 10, 5, '#fff3a6', 6)
    }
    this.lx = x
    this.ly = y
    this.progress = this.made / this.total
    const left = this.total - this.made
    this.hint = left > 0 ? `อีก ${left} ครั้ง` : ''
    if (this.made >= this.total) {
      const acc = this.hits / this.total
      this.finish(timeFactor(this.time, this.total * 0.5 + 1.5, this.limit) * (0.72 + 0.28 * acc))
      sfx.sparkle()
    }
  }

  draw(g: Surface) {
    const { cx, cy } = this.k
    drawBoard(g, cx, cy + 4)
    for (const it of this.items) {
      drawChopItem(g, it.bit, it.x, it.y, it.cuts)
      // Dotted guide lines where to cut next.
      if (!this.done)
        for (const gx of it.guides) for (let y = it.y - 12; y <= it.y + 12; y += 3) g.px(it.x + gx, y, (Math.floor(this.k.t * 4) + y) % 2 ? '#ffffff' : '#fff3a6')
    }
  }

  chefPose(c: Worker) {
    c.pose = this.knifeT > 0 ? WP.chopDown : WP.chopUp
    if (this.down) chefTo(c, this.k, this.px + 12, 10)
  }

  drawHeld(g: Surface, c: Worker) {
    const [hx, hy] = c.wrist('R')
    const down = this.knifeT > 0
    drawCookTool(g, 'knife', hx, hy, hx + (down ? 1 : 4), hy + 10)
    drawFist(g, c.look, hx, hy)
  }

  ghost(t: number) {
    const it = this.items.find((i) => i.cuts.length < i.need)
    if (!it) return null
    const gx = it.guides[0] ?? it.w / 2
    const ph = (t * 1.3) % 1
    return { x: it.x + gx, y: it.y - 18 + ph * 34, down: true }
  }
}

// ---------------------------------------------------------------------------
// ตอกไข่ — tap when the swinging egg is over the glowing rim

export class CrackGame extends StepGame {
  eggs: number
  cracked = 0
  scores: number[] = []
  private swing = 0
  private anim: { t: number; x: number; score: number } | null = null
  yolks: { x: number; y: number; shell: boolean }[] = []
  limit = 14

  constructor(step: CookStep, k: Kitchen) {
    super(step, k)
    this.eggs = step.n ?? 1
    this.limit = 5 + this.eggs * 5
    this.hint = this.eggs > 1 ? `ฟองที่ 1/${this.eggs}` : ''
  }

  private get vy() {
    return this.k.cy + 18
  }
  private get rimY() {
    const v = this.step.vessel ?? 'bowl'
    return v === 'bowl' ? this.vy - 13 - 13 : this.vy - 24
  }
  private eggX() {
    const spd = 1.7 + this.cracked * 0.5
    return this.k.cx + Math.sin(this.swing * spd) * 44
  }

  protected tick(dt: number) {
    if (!this.anim) this.swing += dt
    else {
      this.anim.t += dt
      if (this.anim.t >= 0.12 && this.anim.t - dt < 0.12) {
        sfx.plop()
        haptic(10)
        this.k.shake(1)
      }
      if (this.anim.t >= 0.5) {
        const a = this.anim
        this.anim = null
        const shell = a.score < 0.5
        this.yolks.push({ x: this.k.cx + rand(-10, 10), y: this.vy - 8 + rand(-3, 3), shell })
        if (a.score >= 0.95) this.k.particles.sparkles(this.k.cx, this.rimY - 4, 10, '#fff3a6', 8)
        if (shell) burst(this.k.particles, this.k.cx, this.rimY, ['#fff3e0', '#f7e3c4'], 6)
        this.scores.push(a.score)
        this.cracked++
        this.progress = this.cracked / this.eggs
        this.hint = this.cracked < this.eggs ? `ฟองที่ ${this.cracked + 1}/${this.eggs}` : ''
        if (this.cracked >= this.eggs) this.finish(this.scores.reduce((x, y) => x + y, 0) / this.eggs)
      }
    }
  }

  protected partial() {
    const left = this.eggs - this.scores.length
    return (this.scores.reduce((a, b) => a + b, 0) + left * 0.3) / this.eggs
  }

  protected onDown() {
    if (this.anim || this.cracked >= this.eggs) return
    const x = this.eggX()
    const d = Math.abs(x - this.k.cx)
    const score = d <= 7 ? 1 : d <= 14 ? 0.78 : d <= 24 ? 0.52 : 0.3
    this.anim = { t: 0, x, score }
    sfx.whoosh()
  }

  draw(g: Surface) {
    const { cx, t } = this.k
    const v = this.step.vessel ?? 'bowl'
    const f = drawVessel(g, v, cx, this.vy, t, 0.6)
    // Cracked eggs inside.
    for (const y of this.yolks) {
      g.ellipse(y.x, y.y, 10, 5, FOOD.white)
      g.ellipse(y.x - 1, y.y - 1, 4, 3, FOOD.egg)
      g.px(Math.round(y.x - 2), Math.round(y.y - 2), FOOD.eggL)
      if (y.shell) {
        g.px(Math.round(y.x + 5), Math.round(y.y), '#e6d6c4')
        g.px(Math.round(y.x - 6), Math.round(y.y + 1), '#e6d6c4')
      }
    }
    void f
    // Glowing sweet spot on the rim.
    const pulse = 0.5 + Math.sin(t * 6) * 0.5
    g.ellipse(cx, this.rimY, 7 + pulse, 2.5, '#ffe27a')
    g.ellipse(cx, this.rimY, 4, 1.4, '#fffaf0')
    for (let y = this.rimY - 30; y < this.rimY - 4; y += 3) g.px(cx, y, '#fff3a6')
    if (this.cracked >= this.eggs && !this.anim) return
    // The swinging egg (or the crack animation).
    let x = this.anim ? this.anim.x : this.eggX()
    let y = this.rimY - 26 + Math.sin(this.swing * 7) * 1
    let stage: 0 | 1 | 2 = 0
    if (this.anim) {
      const a = this.anim.t
      x = this.anim.x + (cx - this.anim.x) * Math.min(1, a / 0.12)
      y = this.rimY - 26 + Math.min(1, a / 0.12) * 16
      stage = a < 0.12 ? 0 : a < 0.26 ? 1 : 2
      if (stage === 2) {
        const drop = (a - 0.26) / 0.24
        g.ellipse(cx, this.rimY + drop * 10, 3 - drop, 3 + drop * 2, FOOD.egg)
      }
    }
    // Shadow on the rim helps timing.
    g.alpha(0.3)
    g.ellipse(x, this.rimY + 1, 5, 1.5, '#3a2838')
    g.alpha(1)
    const s = eggSprite(stage)
    g.draw(s.canvas, Math.round(x - s.w / 2), Math.round(y - s.h / 2))
  }

  /** Where the egg is drawn right now (null once it is cracked in). */
  private eggPos(): [number, number] | null {
    if (this.cracked >= this.eggs && !this.anim) return null
    if (this.anim) {
      if (this.anim.t >= 0.26) return null
      const a = this.anim.t
      return [this.anim.x + (this.k.cx - this.anim.x) * Math.min(1, a / 0.12), this.rimY - 26 + Math.min(1, a / 0.12) * 16]
    }
    return [this.eggX(), this.rimY - 26 + Math.sin(this.swing * 7)]
  }

  chefPose(c: Worker) {
    const e = this.eggPos()
    if (!e) {
      c.pose = WP.ready
      return
    }
    chefTo(c, this.k, e[0] - 9, 14)
    reachTo(c, e[0], e[1] - 5, this.anim ? 'open' : 'think')
  }

  drawHeld(g: Surface, c: Worker) {
    const e = this.eggPos()
    if (!e) return
    const [hx, hy] = c.wrist('R')
    // Fingers pinching the top of the egg.
    if (Math.hypot(hx - e[0], hy - (e[1] - 5)) < 9) drawFist(g, c.look, e[0], e[1] - 5)
  }

  ghost() {
    const x = this.eggX()
    return Math.abs(x - this.k.cx) < 10 ? { x: this.k.cx + 8, y: this.rimY - 20, down: true } : { x: this.k.cx + 8, y: this.rimY - 14, down: false }
  }
}

// ---------------------------------------------------------------------------
// ผัด/คน — draw circles in the wok, pot or bowl

export class StirGame extends StepGame {
  need: number
  acc = 0
  spin = 0
  burn = 0
  private lastA: number | null = null
  private sz = 0
  private f = { cx: 0, cy: 0, rx: 30, ry: 16 }
  private hot: boolean
  /** Wok-hei: rises with vigorous stirring, drives the flare. */
  heat = 0
  private flareT = 0
  limit = 16

  constructor(step: CookStep, k: Kitchen) {
    super(step, k)
    const turns = step.n ?? 3
    this.need = turns * TAU
    this.limit = turns * 2.2 + 6
    this.hot = onStove(step.vessel)
    const v = step.vessel ?? 'wok'
    this.tool = v === 'pot' ? 'ladle' : v === 'bowl' ? 'whisk' : 'turner'
    this.showCursor = false
    this.hint = `รอบที่ 1/${turns}`
  }

  private tipPos(): [number, number] {
    if (this.down) return [this.px, this.py]
    const a = this.spin
    return [this.f.cx + Math.cos(a) * this.f.rx * 0.35, this.f.cy + Math.sin(a) * this.f.ry * 0.3]
  }

  chefPose(c: Worker) {
    const [tx, ty] = this.tipPos()
    chefTo(c, this.k, tx + 12, 7)
    reachTo(c, tx, ty, this.burn > 0.4 ? 'think' : this.heat > 0.5 ? 'happy' : 'open', { w: [10.5, 34.5] })
    c.face = this.burn > 0.5 ? 'sweat' : 'none'
  }

  drawHeld(g: Surface, c: Worker) {
    const [tx, ty] = this.tipPos()
    heldTool(g, c, this.tool as 'turner' | 'ladle' | 'whisk', tx, ty)
  }

  protected tick(dt: number) {
    const k = this.k
    this.heat = Math.max(0, this.heat - dt * 0.7)
    this.flareT -= dt
    if (this.hot && this.heat > 0.75 && this.flareT <= 0) {
      this.flareT = 1.4
      wsfx.flare()
      k.shake(1)
      for (let i = 0; i < 10; i++) k.particles.add({ kind: 'dot', x: this.f.cx + rand(-this.f.rx, this.f.rx) * 0.8, y: this.f.cy - 4, vx: rand(-30, 30), vy: rand(-80, -40), g: 90, max: rand(0.4, 0.8), color: i % 3 ? '#ffb347' : '#fff3a6' })
    }
    if (this.hot && this.heat > 0.3 && Math.random() < dt * 14 * this.heat)
      k.particles.add({ kind: 'dot', x: this.f.cx + rand(-this.f.rx, this.f.rx) * 0.9, y: this.f.cy + rand(-4, 4), vx: rand(-15, 15), vy: rand(-60, -30), g: 60, max: rand(0.25, 0.5), color: Math.random() < 0.5 ? '#ffd54f' : '#ff9a3a' })
    if (this.hot) {
      if (Math.random() < dt * 5) steam(k.particles, this.f.cx, this.f.cy - 6, this.f.rx * 0.6)
      if (this.idle > 1.8) {
        this.burn = Math.min(1, this.burn + dt * 0.18)
        if (Math.random() < dt * 8) k.particles.add({ kind: 'smoke', x: this.f.cx + rand(-12, 12), y: this.f.cy - 4, vx: rand(-4, 4), vy: rand(-22, -12), max: 1.1, color: '#8c8187', size: 2 })
      }
    }
    this.sz -= dt
  }

  protected partial() {
    return (this.acc / this.need) * 0.65 * (1 - this.burn * 0.4)
  }

  private angle(x: number, y: number) {
    return Math.atan2((y - this.f.cy) * (this.f.rx / this.f.ry), x - this.f.cx)
  }

  protected onDown(x: number, y: number) {
    this.lastA = this.angle(x, y)
  }

  protected onDrag(x: number, y: number) {
    const nx = (x - this.f.cx) / (this.f.rx * 1.6)
    const ny = (y - this.f.cy) / (this.f.ry * 1.9)
    const d = Math.hypot(nx, ny)
    const a = this.angle(x, y)
    if (this.lastA != null && d > 0.08 && d < 1.3) {
      let da = a - this.lastA
      if (da > Math.PI) da -= TAU
      if (da < -Math.PI) da += TAU
      if (Math.abs(da) < 1.2) {
        this.acc += Math.abs(da)
        this.spin += da
        if (this.hot) this.heat = Math.min(1.2, this.heat + Math.abs(da) * 0.14)
        if (this.hot && this.sz <= 0) {
          this.k.sizzle()
          this.sz = 0.12
          oilPop(this.k.particles, this.f.cx, this.f.cy, this.f.rx, this.f.ry)
          if (this.heat > 0.6) oilPop(this.k.particles, this.f.cx, this.f.cy, this.f.rx, this.f.ry)
        } else if (!this.hot && this.sz <= 0) {
          sfx.scratch()
          this.sz = 0.2
        }
      }
    }
    this.lastA = a
    this.progress = clamp01(this.acc / this.need)
    const turns = Math.round(this.need / TAU)
    this.hint = `รอบที่ ${Math.min(turns, Math.floor(this.acc / TAU) + 1)}/${turns}`
    if (this.acc >= this.need) {
      if (this.burn > 0.45) this.k.burnt = true
      this.finish(timeFactor(this.time, turns * 1.3 + 1.5, this.limit) * (1 - this.burn * 0.5))
      this.k.particles.sparkles(this.f.cx, this.f.cy - 8, 10, '#fff3a6', 16)
      sfx.sparkle()
    }
  }

  protected onUp() {
    this.lastA = null
  }

  draw(g: Surface) {
    const { cx, cy, t } = this.k
    const v = this.step.vessel ?? 'wok'
    const f = drawVessel(g, v, cx, cy, t, 1 + Math.min(0.6, this.heat * 0.5))
    this.f = { cx: f.cx, cy: f.cy, rx: f.rx, ry: f.ry }
    if (this.hot) drawWokFire(g, f.cx, f.cy + f.ry * 0.2, f.rx, f.ry, t, Math.min(1, this.heat))
    const bits = this.step.items?.length ? this.step.items : (['rice'] as Bit[])
    drawBits(g, bits, f.cx, f.cy, f.rx, f.ry, this.spin, 3, this.progress * 0.8)
    if (this.burn > 0.2) {
      g.alpha(this.burn * 0.5)
      g.ellipse(f.cx, f.cy, f.rx * 0.6, f.ry * 0.5, '#3a2838')
      g.alpha(1)
    }
    // A faint circular guide.
    if (!this.done && this.idle > 0.8) {
      g.alpha(0.4)
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU + t * 2
        if (i % 2) g.px(f.cx + Math.cos(a) * f.rx * 0.75, f.cy + Math.sin(a) * f.ry * 0.75, '#fffaf0')
      }
      g.alpha(1)
    }
  }

  ghost(t: number) {
    const a = t * 3.2
    return { x: this.f.cx + Math.cos(a) * this.f.rx * 0.7, y: this.f.cy + Math.sin(a) * this.f.ry * 0.7 + 8, down: true }
  }
}

// ---------------------------------------------------------------------------
// เท — hold to pour, release at the golden line

export class PourGame extends StepGame {
  cups: number
  cup = 0
  level = 0
  scores: number[] = []
  levels: number[] = []
  readonly target = 0.85
  private rate: number
  private pourSfx = 0
  private spilled = 0
  private tilt = 0
  private holes: { x: number; y: number }[] = []
  limit = 14

  constructor(step: CookStep, k: Kitchen) {
    super(step, k)
    this.cups = step.vessel === 'krok' ? step.n ?? 3 : 1
    this.rate = this.cups > 1 ? 0.62 : 0.4
    this.showCursor = false
    this.limit = 6 + this.cups * 5
    this.hint = this.cups > 1 ? `หลุมที่ 1/${this.cups}` : ''
  }

  protected tick(dt: number) {
    this.tilt += ((this.down ? 1 : 0) - this.tilt) * Math.min(1, dt * 12)
    if (this.down && this.tilt > 0.6) {
      this.level += this.rate * dt
      this.pourSfx -= dt
      if (this.pourSfx <= 0) {
        sfx.pour(0.22)
        this.pourSfx = 0.2
      }
      const [c] = LIQUID_COLORS[this.step.liquid ?? 'water']
      const [sx, sy] = this.spout()
      const [tx, ty] = this.aim()
      if (Math.random() < 0.9) this.k.particles.add({ kind: 'drop', x: sx + rand(-1, 1), y: sy, vx: (tx - sx) * 1.6, vy: 30, g: 260, max: 0.28, color: c, size: 2, color2: c })
      if (this.level > 1.02) {
        this.spilled += dt
        if (Math.random() < 0.6) burst(this.k.particles, tx, ty, [c], 2)
        if (this.level > 1.12) this.release()
      }
    }
    this.progress = clamp01((this.cup + Math.min(1, this.level / this.target)) / this.cups)
    if (this.cups === 1) this.hint = this.level > 0.93 ? 'ล้นแล้ว!' : ''
  }

  protected partial() {
    const left = this.cups - this.scores.length
    return (this.scores.reduce((a, b) => a + b, 0) + left * 0.3) / this.cups
  }

  protected onUp() {
    if (this.level > 0.04) this.release()
  }

  private release() {
    this.down = false
    const l = this.level
    const d = Math.abs(l - this.target)
    let s: number
    if (d <= 0.035) s = 1
    else if (d <= 0.075) s = 0.8
    else if (l < this.target) s = 0.3 + 0.45 * (l / this.target)
    else s = Math.max(0.3, 0.7 - (l - 0.92) * 3)
    this.scores.push(s)
    this.levels.push(Math.min(1.1, l))
    const [tx, ty] = this.aim()
    if (s >= 0.95) {
      this.k.particles.sparkles(tx, ty - 6, 8, '#fff3a6', 10)
      sfx.sparkle()
    } else sfx.plop()
    this.level = 0
    this.cup++
    this.hint = this.cup < this.cups ? `หลุมที่ ${this.cup + 1}/${this.cups}` : ''
    if (this.cup >= this.cups) this.finish(this.scores.reduce((a, b) => a + b, 0) / this.cups)
  }

  private vesselY() {
    return this.k.cy + 8
  }

  /** Where the stream lands. */
  private aim(): [number, number] {
    const v = this.step.vessel ?? 'pot'
    if (v === 'krok' && this.holes.length) {
      const h = this.holes[Math.min(this.cup, this.holes.length - 1)]
      return [h.x, h.y]
    }
    return [this.k.cx - (v === 'pan' ? 12 : 0), this.vesselY() - (v === 'pot' ? 14 : 0)]
  }

  /** Base of the pourer: placed so that, fully tilted, its spout hangs just above the target. */
  private pivot(): [number, number] {
    const [tx, ty] = this.aim()
    const liquid = this.step.liquid ?? 'water'
    const a = -(liquid === 'water' || liquid === 'broth' ? 1.3 : 1.9)
    const lx = -9 + 2
    const ly = -28 + 3
    const sx = lx * Math.cos(a) - ly * Math.sin(a)
    const sy = lx * Math.sin(a) + ly * Math.cos(a)
    return [tx - sx, ty - 20 - sy]
  }

  private spout(): [number, number] {
    const [px, py] = this.pivot()
    const liquid = this.step.liquid ?? 'water'
    const a = -this.tilt * (liquid === 'water' || liquid === 'broth' ? 1.3 : 1.9)
    const lx = -9 + 2
    const ly = -28 + 3
    return [px + lx * Math.cos(a) - ly * Math.sin(a), py + lx * Math.sin(a) + ly * Math.cos(a)]
  }

  draw(g: Surface) {
    const { cx, t } = this.k
    const v = this.step.vessel ?? 'pot'
    const liquid = this.step.liquid ?? 'water'
    const [c, l] = LIQUID_COLORS[liquid]
    const f = drawVessel(g, v, cx, this.vesselY(), t, v === 'bowl' ? 0 : 0.7)
    if ('holes' in f && f.holes) this.holes = f.holes
    if (v === 'krok') {
      this.holes.forEach((h, i) => {
        const lv = i < this.cup ? this.levels[i] : i === this.cup ? this.level : 0
        if (lv > 0.02) {
          const k2 = Math.min(1.1, lv)
          g.ellipse(h.x, h.y + 1, 9 * Math.min(1, k2 + 0.1), 4.6 * Math.min(1, k2 + 0.1), FOOD.batterD)
          g.ellipse(h.x, h.y + 0.5, 8 * Math.min(1, k2), 3.8 * Math.min(1, k2), c)
          if (lv > 1) g.ellipse(h.x + 6, h.y + 5, 3, 1.5, c)
        }
        if (i === this.cup && !this.done) {
          const p = 0.5 + Math.sin(t * 6) * 0.5
          g.alpha(0.5 + p * 0.4)
          for (let a = 0; a < 16; a++) g.px(h.x + Math.cos((a / 16) * TAU) * 12, h.y + Math.sin((a / 16) * TAU) * 7, '#ffe27a')
          g.alpha(1)
        }
      })
    } else {
      const lv = Math.min(1.1, this.done ? this.levels[0] ?? 0 : this.level)
      if (lv > 0.01) {
        const k2 = Math.min(1, 0.35 + lv * 0.65)
        g.ctx.save()
        g.ctx.beginPath()
        g.ctx.ellipse(f.cx - g.ox, f.cy - g.oy, f.rx + 1, f.ry + 1, 0, 0, TAU)
        g.ctx.clip()
        const yOff = (1 - Math.min(1, lv)) * (v === 'pot' ? 7 : 3)
        g.ellipse(f.cx, f.cy + yOff, (f.rx + 1) * k2, (f.ry + 1) * k2, c)
        g.ellipse(f.cx - f.rx * 0.3, f.cy + yOff - f.ry * 0.3, f.rx * 0.3 * k2, f.ry * 0.2 * k2, l)
        g.ctx.restore()
        if (liquid === 'oil') for (let i = 0; i < 3; i++) g.px(f.cx + Math.cos(t * 2 + i * 2) * f.rx * 0.5 * k2, f.cy + Math.sin(t * 2 + i * 2) * f.ry * 0.4 * k2, '#ffffff')
      }
      if (this.level > 1.02) g.ellipse(f.cx + f.rx * 0.8, f.cy + f.ry + 4, 6, 2, c)
    }
    // Side gauge with the golden line.
    const gx = Math.round(cx - 60)
    const gy = Math.round(this.vesselY() - 40)
    const gh = 56
    g.rect(gx - 1, gy - 1, 9, gh + 2, '#3a2838')
    g.rect(gx, gy, 7, gh, '#fffaf0')
    const lv = Math.min(1.1, this.done ? this.levels[this.levels.length - 1] ?? 0 : this.level)
    const fillH = Math.round((lv / 1.1) * gh)
    g.rect(gx, gy + gh - fillH, 7, fillH, c === '#fffbf2' || c === '#fff1d6' ? '#f2dcae' : c)
    const tyl = gy + gh - Math.round((this.target / 1.1) * gh)
    const band = Math.round((0.075 / 1.1) * gh)
    g.alpha(0.55)
    g.rect(gx, tyl - band, 7, band * 2 + 1, '#ffe27a')
    g.alpha(1)
    g.hline(gx - 3, gx + 9, tyl, '#e9a53a')
    g.px(gx - 4, tyl, '#e9a53a')
    g.px(gx + 10, tyl, '#e9a53a')
    g.hline(gx, gx + 6, gy + gh - fillH, '#3a2838')
    // The bottle / pitcher / carton.
    if (!this.done) {
      const [px, py] = this.pivot()
      const [sx, sy] = drawPourer(g, px, py, liquid, this.tilt)
      if (this.down && this.tilt > 0.6) {
        const [tx, ty] = this.aim()
        g.thickLine(sx, sy + 1, tx, ty - 1, 2, c)
        g.px(Math.round(tx), Math.round(ty - 1), l)
      }
    }
  }

  /** Grip point on the pourer's body. */
  private grip(): [number, number] {
    const [px, py] = this.pivot()
    const liquid = this.step.liquid ?? 'water'
    const a = -this.tilt * (liquid === 'water' || liquid === 'broth' ? 1.3 : 1.9)
    const lx = 6
    const ly = -12
    return [px + lx * Math.cos(a) - ly * Math.sin(a), py + lx * Math.sin(a) + ly * Math.cos(a)]
  }

  chefPose(c: Worker) {
    // The chef mimes the pour (arm out, careful face) and sweats near the line.
    if (this.done || !this.down) {
      c.pose = WP.ready
      c.face = 'none'
      return
    }
    const [gx] = this.grip()
    chefTo(c, this.k, gx + 14, 6)
    c.pose = this.level > 0.7 ? WP.shake1 : WP.shake0
    c.face = this.level > 0.9 ? 'sweat' : 'none'
  }

  ghost() {
    const [px, py] = this.pivot()
    return { x: px + 2, y: py - 8, down: true }
  }
}

// ---------------------------------------------------------------------------
// ทอด — tap to flip (or lift out) when golden

interface Piece {
  x: number
  y: number
  c: number
  side: number
  flipT: number
  taps: number
  need: number
  done: boolean
  burnt: boolean
}

export class FryGame extends StepGame {
  pieces: Piece[] = []
  scores: number[] = []
  totalTaps: number
  private rate = 0.34
  private sz = 0
  private krok: boolean
  limit = 20

  constructor(step: CookStep, k: Kitchen) {
    super(step, k)
    this.krok = step.vessel === 'krok'
    const n = step.n ?? 2
    if (this.krok) {
      for (let i = 0; i < n; i++) this.pieces.push({ x: 0, y: 0, c: -i * 0.38, side: 0, flipT: 0, taps: 0, need: 1, done: false, burnt: false })
      this.totalTaps = n
    } else {
      this.pieces.push({ x: 0, y: 0, c: 0, side: 0, flipT: 0, taps: 0, need: n, done: false, burnt: false })
      this.totalTaps = n
    }
    this.limit = 6 + this.totalTaps * 5
    this.hint = this.krok ? `แคะ 0/${n}` : 'รอให้เหลืองทอง…'
  }

  protected tick(dt: number) {
    for (const p of this.pieces) {
      if (p.done) continue
      if (p.flipT > 0) {
        p.flipT = Math.max(0, p.flipT - dt)
        if (p.flipT === 0) {
          sfx.plop()
          this.k.shake(1)
        }
        continue
      }
      p.c += this.rate * dt
      if (p.c > 1.36) this.tap(p, true)
    }
    this.sz -= dt
    if (this.sz <= 0 && this.pieces.some((p) => !p.done && p.c > 0.1)) {
      this.k.sizzle()
      this.sz = rand(0.1, 0.25)
      const p = this.pieces.find((q) => !q.done) ?? this.pieces[0]
      oilPop(this.k.particles, p.x, p.y, 14, 7)
    }
    if (Math.random() < dt * 3) {
      const p = this.pieces[Math.floor(Math.random() * this.pieces.length)]
      if (!p.done) steam(this.k.particles, p.x, p.y - 4, 6)
    }
    if (!this.krok) {
      const p = this.pieces[0]
      this.hint = p.c < 0.62 ? 'รอให้เหลืองทอง…' : p.c < 1.1 ? 'ตอนนี้เลย! แตะ!' : 'ไหม้แล้ว รีบแตะ!'
    }
  }

  protected partial() {
    const left = this.totalTaps - this.scores.length
    return (this.scores.reduce((a, b) => a + b, 0) + left * 0.3) / this.totalTaps
  }

  private tap(p: Piece, auto = false) {
    const c = p.c
    let s: number
    if (auto) s = 0.2
    else if (c >= 0.78 && c <= 0.98) s = 1
    else if (c >= 0.62 && c <= 1.1) s = 0.72
    else if (c < 0.62) s = 0.25 + Math.max(0, c) * 0.4
    else s = 0.35
    if (auto) {
      p.burnt = true
      this.k.burnt = true
      for (let i = 0; i < 6; i++) this.k.particles.add({ kind: 'smoke', x: p.x + rand(-6, 6), y: p.y - 4, vx: rand(-5, 5), vy: rand(-26, -14), max: 1.2, color: '#6d6478', size: 2 })
    }
    this.scores.push(s)
    p.taps++
    if (s >= 0.95) {
      this.k.particles.sparkles(p.x, p.y - 8, 10, '#fff3a6', 10)
      sfx.sparkle()
    }
    if (p.taps >= p.need) {
      p.done = true
      p.flipT = 0.45
      sfx.whoosh()
    } else {
      p.side++
      p.c = 0
      p.flipT = 0.5
      sfx.whoosh()
    }
    haptic(10)
    this.progress = this.scores.length / this.totalTaps
    if (this.krok) this.hint = `แคะ ${this.pieces.filter((q) => q.done).length}/${this.pieces.length}`
    if (this.scores.length >= this.totalTaps) this.finish(this.scores.reduce((a, b) => a + b, 0) / this.totalTaps)
  }

  protected after(dt: number) {
    for (const p of this.pieces) p.flipT = Math.max(0, p.flipT - dt)
  }

  protected onDown(x: number, y: number) {
    let best: Piece | null = null
    let bd = Infinity
    for (const p of this.pieces) {
      if (p.done || p.flipT > 0) continue
      const d = Math.hypot(x - p.x, (y - p.y) * 1.6)
      if (d < bd) {
        bd = d
        best = p
      }
    }
    if (best && (bd < 30 || this.pieces.length === 1)) this.tap(best)
  }

  draw(g: Surface) {
    const { cx, cy, t } = this.k
    const v = this.step.vessel ?? 'pan'
    const f = drawVessel(g, v, cx, cy + 6, t, 1)
    if ('holes' in f && f.holes) f.holes.forEach((h, i) => this.pieces[i] && ((this.pieces[i].x = h.x), (this.pieces[i].y = h.y)))
    else {
      this.pieces[0].x = f.cx
      this.pieces[0].y = f.cy
    }
    for (const p of this.pieces) {
      const brown = (c: number) => (c < 0.5 ? '#fff0b0' : c < 0.78 ? '#ffd35a' : c < 1 ? '#f0a830' : c < 1.15 ? '#c9782a' : '#6e4a35')
      const lift = p.flipT > 0 ? Math.sin((p.flipT / 0.5) * Math.PI) * 16 : 0
      const squash = p.flipT > 0 ? Math.abs(Math.cos((p.flipT / 0.5) * Math.PI)) : 1
      if (this.krok) {
        if (p.done) {
          // Lifted-out ขนมครก sitting golden side up.
          g.ellipse(p.x, p.y - lift + 1, 8, 4.5 * squash, '#c9782a')
          g.ellipse(p.x, p.y - lift, 7, 3.8 * squash, p.burnt ? '#6e4a35' : '#e8a23a')
          g.ellipse(p.x - 1, p.y - lift - 1, 3, 1.4 * squash, '#ffd35a')
        } else if (p.c > -0.05) {
          const c = Math.max(0, p.c)
          g.ellipse(p.x, p.y + 0.5, 8.5, 4.4, brown(c))
          g.ellipse(p.x, p.y, 7 - Math.min(2, c * 2), 3.4 - Math.min(1, c), FOOD.batter)
          if (c > 0.3 && Math.floor(t * 5 + p.x) % 3 === 0) g.px(p.x + 2, p.y - 1, '#ffffff')
        }
      } else {
        const r = 19
        const ry = r * 0.55 * squash
        const y0 = p.y - lift
        // Lacy crisp edge that browns as it cooks.
        const edge = brown(p.c)
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * TAU
          const wob = 1 + ((i * 7) % 3) * 0.08
          g.circle(p.x + Math.cos(a) * r * wob, y0 + Math.sin(a) * ry * wob, 2.4, edge)
        }
        g.ellipse(p.x, y0 + 1, r + 1, ry + 1, edge)
        const top = p.side === 0 ? (p.c > 0.5 ? '#ffe680' : '#fff0b0') : brown(Math.max(0.8, p.c * 0.5 + 0.6))
        g.ellipse(p.x - 1, y0, r - 2, ry - 1.5, top)
        g.ellipse(p.x - 5, y0 - 3 * squash, r * 0.42, r * 0.18 * squash, p.side === 0 ? FOOD.eggL : '#ffd35a')
        if (p.side === 0 && squash > 0.8) {
          // Bubbles puff up and pop while the underside fries.
          for (let i = 0; i < 6; i++) {
            const ph = (t * 1.3 + i * 0.37) % 1
            if (ph > Math.min(0.9, p.c)) continue
            const bx = p.x - 10 + ((i * 13) % 21)
            const by = y0 - 3 + ((i * 5) % 7)
            g.px(bx, by, '#fffaf0')
            if (ph < 0.4) g.px(bx + 1, by, '#fff6c8')
          }
        } else if (p.side > 0) for (const [dx, dy] of [[-8, 2], [6, -3], [10, 3], [-3, -4], [2, 4]]) g.px(p.x + dx, y0 + dy * squash, '#c9782a')
        // Spring onion flecks.
        for (const [dx, dy] of [[-4, 1], [7, 0], [1, -3]]) g.px(p.x + dx, y0 + dy * squash, FOOD.onion)
      }
      // Doneness meter.
      if (!p.done && p.flipT <= 0) {
        const bw = this.krok ? 20 : 44
        const bx = Math.round(p.x - bw / 2)
        const by = Math.round(p.y - (this.krok ? 12 : 22))
        g.rect(bx - 1, by - 1, bw + 2, 5, '#3a2838')
        g.rect(bx, by, bw, 3, '#fff0b0')
        const zx = (v2: number) => bx + Math.round((v2 / 1.36) * bw)
        g.rect(zx(0.62), by, zx(1.1) - zx(0.62), 3, '#ffd35a')
        g.rect(zx(0.78), by, zx(0.98) - zx(0.78), 3, '#6cc36a')
        g.rect(zx(1.1), by, bx + bw - zx(1.1), 3, '#c9782a')
        const mx = zx(Math.max(0, Math.min(1.36, p.c)))
        g.vline(mx, by - 2, by + 4, '#3a2838')
        g.px(mx, by - 3, '#fffaf0')
      }
    }
  }

  private turnerTip(): [number, number] {
    const flipping = this.pieces.find((q) => q.flipT > 0)
    if (flipping) {
      const lift = Math.sin((flipping.flipT / 0.5) * Math.PI) * 14
      return [flipping.x + 6, flipping.y - lift]
    }
    const p = this.pieces.find((q) => !q.done) ?? this.pieces[0]
    return [p.x + (this.krok ? 8 : 20), p.y + 2]
  }

  chefPose(c: Worker) {
    const [tx, ty] = this.turnerTip()
    chefTo(c, this.k, tx + 10, 9)
    const hot = this.pieces.some((q) => !q.done && q.c > 1.1)
    reachTo(c, tx, ty, hot ? 'think' : this.pieces.some((q) => q.flipT > 0) ? 'happy' : 'open')
    c.face = hot ? 'sweat' : 'none'
  }

  drawHeld(g: Surface, c: Worker) {
    const [tx, ty] = this.turnerTip()
    heldTool(g, c, 'turner', tx, ty)
  }

  ghost() {
    const p = this.pieces.find((q) => !q.done && q.c >= 0.78 && q.c <= 1)
    if (!p) return null
    return { x: p.x + 4, y: p.y + 2, down: true }
  }
}

// ---------------------------------------------------------------------------
// ปรุงรส — tap the right bottles in order

export class SeasonGame extends StepGame {
  order: Condiment[]
  shelf: Condiment[]
  idx = 0
  mistakes = 0
  private anim: { i: number; t: number; ok: boolean } | null = null
  private wrongFlash = -1
  private helpT = 0
  limit = 18

  constructor(step: CookStep, k: Kitchen) {
    super(step, k)
    this.order = step.order?.length ? step.order : ['fishsauce']
    const uniq = [...new Set(this.order)]
    const extra: Condiment[] = (['fishsauce', 'soy', 'sugar', 'chili', 'pepper', 'lime', 'tamarind'] as Condiment[]).filter((c) => !uniq.includes(c))
    const shelf = [...uniq, ...extra.slice(0, Math.max(0, 5 - uniq.length))]
    // Deterministic shuffle per recipe step.
    let seed = this.order.join('').length * 31 + uniq.length * 7
    for (let i = shelf.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      const j = seed % (i + 1)
      ;[shelf[i], shelf[j]] = [shelf[j], shelf[i]]
    }
    this.shelf = shelf
    this.limit = 6 + this.order.length * 3.5
    this.updateChips()
  }

  private updateChips() {
    this.chips = this.order.map((c, i) => ({ key: `${c}:${i}`, label: c, state: i < this.idx ? 'done' : i === this.idx ? (this.wrongFlash >= 0 ? 'miss' : 'now') : 'todo' }))
    this.hint = `${this.idx}/${this.order.length}`
    this.progress = this.idx / this.order.length
  }

  private bottlePos(i: number): [number, number] {
    const n = this.shelf.length
    const span = Math.min(this.k.w - 24, n * 30)
    return [Math.round(this.k.cx - span / 2 + (i + 0.5) * (span / n)), Math.round(this.k.cy + 62)]
  }

  private vesselY() {
    return this.k.cy - 8
  }

  protected tick(dt: number) {
    if (this.wrongFlash >= 0) {
      this.wrongFlash -= dt
      if (this.wrongFlash < 0) this.updateChips()
    }
    this.helpT = Math.max(0, this.helpT - dt)
    const a = this.anim
    if (!a) return
    a.t += dt
    if (a.ok && a.t > 0.25 && a.t < 0.5 && Math.random() < 0.8) {
      const c = CONDIMENT_COLORS[this.shelf[a.i]]
      this.k.particles.add({ kind: 'drop', x: this.k.cx + rand(-3, 3), y: this.vesselY() - 30, vy: 40, g: 200, max: 0.25, color: c.liquid, size: 2, color2: c.drop })
    }
    if (a.t >= 0.62) {
      this.anim = null
      if (a.ok) {
        this.idx++
        this.k.particles.sparkles(this.k.cx, this.vesselY() - 6, 6, '#fff3a6', 10)
        this.updateChips()
        if (this.idx >= this.order.length) {
          sfx.sparkle()
          this.finish(Math.max(0.25, 1 - this.mistakes * 0.3) * timeFactor(this.time, this.order.length * 1.6 + 2, this.limit))
        }
      }
    }
  }

  protected partial() {
    return (this.idx / this.order.length) * 0.6
  }

  protected onDown(x: number, y: number) {
    if (this.anim) return
    for (let i = 0; i < this.shelf.length; i++) {
      const [bx, by] = this.bottlePos(i)
      if (Math.abs(x - bx) <= 13 && y >= by - 32 && y <= by + 4) {
        const ok = this.shelf[i] === this.order[this.idx]
        this.anim = { i, t: 0, ok }
        if (ok) {
          sfx.tap()
          setTimeout(() => sfx.pour(0.25), 200)
        } else {
          this.mistakes++
          this.wrongFlash = 0.6
          this.helpT = 2.5
          sfx.error()
          haptic(20)
          this.k.shake(2)
          this.updateChips()
        }
        return
      }
    }
  }

  draw(g: Surface) {
    const { cx, t } = this.k
    const v = this.step.vessel ?? 'wok'
    const f = drawVessel(g, v, cx, this.vesselY(), t, 0.8, true)
    drawBits(g, this.k.carry.length ? this.k.carry : ['rice'], f.cx, f.cy, f.rx, f.ry, t * 0.3, 5, 0.6)
    // Little wooden spice shelf.
    const [x0, by] = this.bottlePos(0)
    const [x1] = this.bottlePos(this.shelf.length - 1)
    g.rect(x0 - 16, by, x1 - x0 + 32, 5, '#3a2838')
    g.rect(x0 - 15, by, x1 - x0 + 30, 3, '#c28e5c')
    g.hline(x0 - 15, x1 + 14, by, '#e0bb8a')
    this.shelf.forEach((c, i) => {
      const s = bottleSprite(c)
      let [bx, byy] = this.bottlePos(i)
      let flip = false
      const a = this.anim
      if (a && a.i === i) {
        if (a.ok) {
          const k2 = a.t < 0.2 ? a.t / 0.2 : a.t > 0.45 ? 1 - (a.t - 0.45) / 0.17 : 1
          bx = bx + (cx - bx) * k2
          byy = byy + (this.vesselY() - 18 - byy) * k2
          flip = a.t > 0.2 && a.t < 0.45
        } else {
          bx += Math.round(Math.sin(a.t * 60) * 2)
        }
      }
      const help = this.helpT > 0 || this.idle > 3.5
      if (help && c === this.order[this.idx] && !a) {
        const p = 0.5 + Math.sin(t * 8) * 0.5
        g.alpha(0.4 + p * 0.4)
        g.ellipse(bx, byy - 12, 11, 16, '#fff3a6')
        g.alpha(1)
      }
      if (flip) {
        g.ctx.save()
        g.ctx.translate(Math.round(bx - g.ox), Math.round(byy - g.oy))
        g.ctx.scale(1, -1)
        g.ctx.drawImage(s.canvas, -Math.round(s.w / 2), -s.h + 4)
        g.ctx.restore()
      } else g.draw(s.canvas, Math.round(bx - s.w / 2), Math.round(byy - s.h + 1))
    })
  }

  /** Where the flying bottle is (top of it), or null. */
  private bottleAt(): [number, number, number] | null {
    const a = this.anim
    if (!a || !a.ok) return null
    let [bx, byy] = this.bottlePos(a.i)
    const k2 = a.t < 0.2 ? a.t / 0.2 : a.t > 0.45 ? 1 - (a.t - 0.45) / 0.17 : 1
    bx = bx + (this.k.cx - bx) * k2
    byy = byy + (this.vesselY() - 18 - byy) * k2
    return [bx, byy, k2]
  }

  chefPose(c: Worker) {
    const b = this.bottleAt()
    if (b && b[2] > 0.55) {
      chefTo(c, this.k, b[0] + 10, 14)
      reachTo(c, b[0], b[1] + 2, 'open')
      return
    }
    c.pose = this.anim && !this.anim.ok ? WP.oops : WP.ready
    c.face = this.anim && !this.anim.ok ? 'sweat' : 'none'
  }

  drawHeld(g: Surface, c: Worker) {
    const b = this.bottleAt()
    if (!b || b[2] <= 0.55) return
    const [hx, hy] = c.wrist('R')
    // Upside down while pouring: hold it by the base (now on top).
    if (Math.hypot(hx - b[0], hy - (b[1] + 2)) < 12) drawFist(g, c.look, b[0], b[1] + 2 + Math.sin(this.k.t * 40) * 1)
  }

  ghost() {
    const i = this.shelf.indexOf(this.order[this.idx])
    if (i < 0 || this.idle < 3.5) return null
    const [bx, by] = this.bottlePos(i)
    return { x: bx + 2, y: by - 12, down: true }
  }
}

// ---------------------------------------------------------------------------
// ปั้น — drag dough from the bowl, roll it, drop it into the tray

interface Ball {
  x: number
  y: number
  score: number
  c: string
  d: string
  t: number
}

export class ShapeGame extends StepGame {
  slots: { x: number; y: number }[] = []
  balls: (Ball | null)[] = []
  holding: { x: number; y: number; path: number; i: number } | null = null
  back: { x: number; y: number; t: number; i: number } | null = null
  scores: number[] = []
  made = 0
  private kind: Bit
  limit = 20

  constructor(step: CookStep, k: Kitchen) {
    super(step, k)
    const n = step.n ?? 4
    this.kind = step.items?.[0] ?? 'dough'
    const cols = n > 4 ? 3 : 2
    const rows = Math.ceil(n / cols)
    const tx = k.cx + 28
    for (let i = 0; i < n; i++) {
      const c = i % cols
      const r = Math.floor(i / cols)
      this.slots.push({ x: Math.round(tx + (c - (cols - 1) / 2) * 20), y: Math.round(k.cy + 4 + (r - (rows - 1) / 2) * 20) })
    }
    this.balls = this.slots.map(() => null)
    this.limit = n * 3 + 7
    this.hint = `0/${n}`
  }

  private colors(i: number): [string, string] {
    if (this.kind === 'dough') return [DOUGH[i % 4], DOUGH_D[i % 4]]
    if (this.kind === 'pork') return [FOOD.porkRaw, FOOD.porkRawD]
    const [c, , d] = bitColors(this.kind)
    return [c, d]
  }

  private get pile(): [number, number] {
    return [this.k.cx - 42, this.k.cy + 6]
  }

  protected tick(dt: number) {
    for (const b of this.balls) if (b) b.t += dt
    if (this.back) {
      this.back.t += dt
      if (this.back.t >= 0.25) this.back = null
    }
  }

  protected partial() {
    const left = this.slots.length - this.scores.length
    return (this.scores.reduce((a, b) => a + b, 0) + left * 0.25) / this.slots.length
  }

  protected onDown(x: number, y: number) {
    const [px, py] = this.pile
    if (Math.hypot(x - px, (y - py) * 1.3) < 26 && this.made < this.slots.length) {
      this.holding = { x, y, path: 0, i: this.made }
      sfx.tap()
    }
  }

  protected onDrag(x: number, y: number, dx: number, dy: number) {
    const h = this.holding
    if (!h) return
    h.x = x
    h.y = y
    h.path += Math.hypot(dx, dy)
  }

  protected onUp(x: number, y: number) {
    const h = this.holding
    if (!h) return
    this.holding = null
    let bi = -1
    let bd = Infinity
    this.slots.forEach((s, i) => {
      if (this.balls[i]) return
      const d = Math.hypot(x - s.x, y - s.y)
      if (d < bd) {
        bd = d
        bi = i
      }
    })
    if (bi < 0 || bd > 15) {
      this.back = { x, y, t: 0, i: h.i }
      sfx.close()
      return
    }
    const acc = 1 - clamp01(bd / 15) * 0.6
    const round = clamp01(h.path / 90)
    const score = clamp01(0.45 * acc + 0.55 * round + 0.08)
    const [c, d] = this.colors(h.i)
    this.balls[bi] = { x: this.slots[bi].x, y: this.slots[bi].y, score, c, d, t: 0 }
    this.scores.push(score)
    this.made++
    sfx.plop()
    haptic(8)
    if (score >= 0.9) this.k.particles.sparkles(this.slots[bi].x, this.slots[bi].y - 6, 6, '#fff3a6', 6)
    this.progress = this.made / this.slots.length
    this.hint = `${this.made}/${this.slots.length}`
    if (this.made >= this.slots.length) {
      const avg = this.scores.reduce((a, b) => a + b, 0) / this.scores.length
      this.finish(avg * timeFactor(this.time, this.slots.length * 1.8 + 1.5, this.limit))
    }
  }

  draw(g: Surface) {
    const { cx, cy, t } = this.k
    const [px, py] = this.pile
    // Bowl with the dough / mince.
    const f = drawMixBowl(g, px, py, 22, 10, 16)
    if (this.kind === 'dough') for (let i = 0; i < 4; i++) drawBall(g, f.cx - 8 + i * 5.5, f.cy + (i % 2 ? 1 : -1), 3.6, DOUGH[i], DOUGH_D[i])
    else {
      const [c, d] = this.colors(0)
      g.ellipse(f.cx, f.cy, f.rx, f.ry, d)
      g.ellipse(f.cx - 1, f.cy - 0.5, f.rx - 2, f.ry - 1.5, c)
      for (let i = 0; i < 8; i++) g.px(f.cx - 10 + i * 3, f.cy + ((i * 5) % 3) - 1, d)
    }
    // Tray with moulds.
    const xs = this.slots.map((s) => s.x)
    const ys = this.slots.map((s) => s.y)
    const tw = Math.max(...xs) - Math.min(...xs) + 28
    const th = Math.max(...ys) - Math.min(...ys) + 26
    drawTray(g, (Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2, tw, th)
    this.slots.forEach((s, i) => {
      g.ellipse(s.x, s.y + 1, 8, 5, '#c9a06a')
      g.ellipse(s.x, s.y + 1.5, 6.5, 3.8, '#b98846')
      const b = this.balls[i]
      if (b) {
        const pop = b.t < 0.2 ? Math.sin((b.t / 0.2) * Math.PI) * 0.4 : 0
        drawBall(g, b.x, b.y - 2, 5.5 + pop * 2, b.c, b.d, b.score < 0.6 ? 0.25 : 0)
      } else if (this.holding || this.idle > 1) {
        const p = Math.floor(t * 4) % 2
        for (let a = 0; a < 12; a++) if ((a + p) % 2) g.px(s.x + Math.cos((a / 12) * TAU) * 7, s.y + 1 + Math.sin((a / 12) * TAU) * 4.5, '#fffaf0')
      }
    })
    const h = this.holding
    if (h) {
      const [c, d] = this.colors(h.i)
      const round = clamp01(h.path / 90)
      const wob = (1 - round) * 2.5
      drawBall(g, h.x + Math.sin(t * 20) * wob * 0.5, h.y - 10, 5.5 + wob * 0.4, c, d, (1 - round) * 0.5)
      if (round < 1) {
        g.ellipse(h.x - 3 - wob, h.y - 11 + wob, 2.5, 2, c)
        g.ellipse(h.x + 3 + wob, h.y - 8, 2, 1.8, d)
      } else if (Math.floor(t * 8) % 2) g.px(h.x + 5, h.y - 16, '#ffffff')
    }
    if (this.back) {
      const k2 = this.back.t / 0.25
      const [c, d] = this.colors(this.back.i)
      drawBall(g, this.back.x + (px - this.back.x) * k2, this.back.y - 10 + (py - this.back.y) * k2, 5 * (1 - k2 * 0.5), c, d)
    }
    void cx
    void cy
  }

  chefPose(c: Worker) {
    if (this.holding) {
      c.pose = rollPose(this.holding.path * 0.25)
      chefTo(c, this.k, this.holding.x + 2, 8)
    } else c.pose = WP.ready
  }

  ghost(t: number) {
    const i = this.balls.findIndex((b) => !b)
    if (i < 0) return null
    const [px, py] = this.pile
    const s = this.slots[i]
    const ph = (t * 0.7) % 1
    const k2 = Math.min(1, ph * 1.3)
    return { x: px + (s.x - px) * k2 + Math.sin(ph * 30) * 3, y: py + (s.y - py) * k2 + 8, down: ph < 0.8 }
  }
}

// ---------------------------------------------------------------------------
// ห่อ — drag the four sides of the egg net over the noodles

interface Flap {
  dx: number
  dy: number
  fold: number
  done: boolean
}

export class WrapGame extends StepGame {
  flaps: Flap[]
  active: number | null = null
  private sx = 0
  private sy = 0
  readonly S = 30
  limit = 18

  constructor(step: CookStep, k: Kitchen) {
    super(step, k)
    const all: Flap[] = [
      { dx: 0, dy: -1, fold: 0, done: false },
      { dx: 1, dy: 0, fold: 0, done: false },
      { dx: 0, dy: 1, fold: 0, done: false },
      { dx: -1, dy: 0, fold: 0, done: false },
    ]
    this.flaps = all.slice(0, Math.max(2, Math.min(4, step.n ?? 4)))
    this.hint = `0/${this.flaps.length}`
  }

  private get c(): [number, number] {
    return [this.k.cx - 12, this.k.cy + 4]
  }

  protected tick(dt: number) {
    for (const [i, f] of this.flaps.entries()) {
      if (f.done) f.fold = Math.min(1, f.fold + dt * 6)
      else if (this.active !== i) f.fold = Math.max(0, f.fold - dt * 5)
    }
  }

  protected partial() {
    return (this.flaps.filter((f) => f.done).length / this.flaps.length) * 0.6
  }

  protected onDown(x: number, y: number) {
    const [cx, cy] = this.c
    const rx = x - cx
    const ry = (y - cy) * 1.6
    let best = -1
    let bv = 0.3
    this.flaps.forEach((f, i) => {
      if (f.done) return
      const v = (rx * f.dx + ry * f.dy) / this.S
      if (v > bv) {
        bv = v
        best = i
      }
    })
    this.active = best >= 0 ? best : null
    this.sx = x
    this.sy = y
  }

  protected onDrag(x: number, y: number) {
    if (this.active == null) return
    const f = this.flaps[this.active]
    const inward = -((x - this.sx) * f.dx + (y - this.sy) * 1.6 * f.dy)
    f.fold = clamp01(inward / (this.S * 1.1))
  }

  protected onUp() {
    if (this.active == null) return
    const f = this.flaps[this.active]
    this.active = null
    if (f.fold >= 0.5) {
      f.done = true
      sfx.whoosh()
      haptic(8)
      const [cx, cy] = this.c
      this.k.particles.sparkles(cx, cy - 4, 5, '#fff3a6', 10)
      const n = this.flaps.filter((q) => q.done).length
      this.progress = n / this.flaps.length
      this.hint = `${n}/${this.flaps.length}`
      if (n >= this.flaps.length) {
        sfx.sparkle()
        this.finish(timeFactor(this.time, 6 + this.flaps.length * 0.5, this.limit))
      }
    }
  }

  draw(g: Surface) {
    const { cx, cy, t } = this.k
    drawVessel(g, 'pan', cx, cy + 4, t, 0.4)
    const [ox, oy] = this.c
    const S = this.S
    const ry = 0.62
    // Egg net sheet (square) with a lattice.
    const hs = S * 0.5
    const unfoldedPoly = (f: Flap): [number, number][] => {
      // Triangle hinged on an edge of the centre square; folding flips its tip across.
      const px = -f.dy
      const py = f.dx
      const tip = hs + S * 0.7 * (1 - 2 * f.fold)
      return [
        [ox + f.dx * hs + px * hs, oy + (f.dy * hs + py * hs) * ry],
        [ox + f.dx * hs - px * hs, oy + (f.dy * hs - py * hs) * ry],
        [ox + f.dx * tip, oy + f.dy * tip * ry],
      ]
    }
    // Centre square of noodles.
    g.rect(ox - hs - 1, oy - hs * ry - 1, hs * 2 + 2, hs * 2 * ry + 2, '#3a2838')
    g.rect(ox - hs, oy - hs * ry, hs * 2, hs * 2 * ry, FOOD.eggD)
    drawBits(g, ['noodle', 'tofu', 'onion'], ox, oy, hs - 2, hs * ry - 1, 0.5, 9, 0.8)
    // Unfolded flaps below, folded ones on top.
    const order = [...this.flaps.entries()].sort((a, b) => a[1].fold - b[1].fold)
    for (const [, f] of order) {
      const pts = unfoldedPoly(f)
      const under = f.fold > 0.5
      g.poly(pts.map(([x, y]) => [x + (x < ox ? -1 : x > ox ? 1 : 0), y + (y < oy ? -1 : y > oy ? 1 : 0)] as [number, number]), '#3a2838')
      g.poly(pts, under ? FOOD.eggD : FOOD.egg)
      // Lattice dots.
      const [a, b, c] = pts
      for (let k2 = 0.2; k2 < 1; k2 += 0.25)
        for (let j = 0.2; j < 1 - k2; j += 0.25) {
          const x = a[0] + (b[0] - a[0]) * j + (c[0] - a[0]) * k2
          const y = a[1] + (b[1] - a[1]) * j + (c[1] - a[1]) * k2
          g.px(Math.round(x), Math.round(y), under ? '#c9782a' : FOOD.eggD)
        }
      if (!f.done && !this.done && this.idle > 1) {
        const p = 0.5 + Math.sin(t * 6) * 0.5
        g.alpha(0.5 + 0.4 * p)
        g.px(Math.round(c[0]), Math.round(c[1]), '#ffffff')
        g.px(Math.round(c[0] - f.dx * 3), Math.round(c[1] - f.dy * 3 * ry), '#fff3a6')
        g.alpha(1)
      }
    }
  }

  ghost(t: number) {
    const f = this.flaps.find((q) => !q.done)
    if (!f) return null
    const [ox, oy] = this.c
    const ph = (t * 0.9) % 1
    const d = this.S * (1 - ph * 1.1)
    return { x: ox + f.dx * d, y: oy + f.dy * d * 0.62 + 6, down: ph < 0.85 }
  }
}

// ---------------------------------------------------------------------------
// จัดจาน — drag scoops from the pan onto the plate

export class PlateGame extends StepGame {
  n: number
  placed: { x: number; y: number }[] = []
  scores: number[] = []
  holding: { x: number; y: number } | null = null
  reveal = -1
  limit = 16

  constructor(step: CookStep, k: Kitchen) {
    super(step, k)
    this.n = step.n ?? 3
    this.tool = step.serve === 'bowl' ? 'ladle' : 'spoon'
    this.showCursor = false
    this.limit = 6 + this.n * 3
    this.hint = `0/${this.n}`
  }

  private get src(): [number, number] {
    return [this.k.cx - 36, this.k.cy - 4]
  }
  private get dst(): [number, number] {
    return [this.k.cx + 38, this.k.cy + 16]
  }

  protected tick(dt: number) {
    if (this.reveal >= 0) {
      this.reveal += dt
      if (this.reveal >= 0.8) this.finish(this.scores.reduce((a, b) => a + b, 0) / this.n)
    }
  }

  protected after(dt: number) {
    if (this.reveal >= 0) this.reveal += dt
  }

  protected partial() {
    const left = this.n - this.scores.length
    return (this.scores.reduce((a, b) => a + b, 0) + left * 0.3) / this.n
  }

  protected onDown(x: number, y: number) {
    if (this.reveal >= 0) return
    const [sx, sy] = this.src
    if (Math.hypot(x - sx, (y - sy) * 1.5) < 40) {
      this.holding = { x, y }
      sfx.scratch()
    }
  }

  protected onDrag(x: number, y: number) {
    if (this.holding) {
      this.holding.x = x
      this.holding.y = y
    }
  }

  protected onUp(x: number, y: number) {
    if (!this.holding) return
    this.holding = null
    const [dx, dy] = this.dst
    const nx = (x - dx) / 30
    const ny = (y - 6 - dy) / 16
    const d = Math.hypot(nx, ny)
    if (d > 1.25) {
      sfx.close()
      return
    }
    const s = clamp01(1 - Math.max(0, d - 0.25) * 0.7)
    this.scores.push(s)
    this.placed.push({ x: dx + nx * 12, y: dy + ny * 5 })
    sfx.plop()
    haptic(8)
    this.progress = this.placed.length / this.n
    this.hint = `${this.placed.length}/${this.n}`
    if (s >= 0.9) this.k.particles.sparkles(x, y - 8, 5, '#fff3a6', 6)
    if (this.placed.length >= this.n) {
      this.reveal = 0
      this.k.particles.sparkles(dx, dy - 6, 18, '#fff3a6', 22)
      this.k.particles.confetti(dx, dy - 10, 24)
      sfx.chime()
    }
  }

  draw(g: Surface) {
    const { t } = this.k
    const [sx, sy] = this.src
    const [dx, dy] = this.dst
    // Source vessel with what was cooked (shrinks as it is served).
    const v = this.k.cookVessel
    const f =
      v === 'pot' ? drawPot(g, sx, sy, 28, 10, 22) : v === 'krok' || v === 'pan' ? drawPan(g, sx - 8, sy, 26, 14) : v === 'bowl' ? drawMixBowl(g, sx, sy, 28, 11, 20) : drawWok(g, sx, sy, 30, 16)
    const left = 1 - this.placed.length / this.n
    if (left > 0) drawBits(g, this.k.carry.length ? this.k.carry : ['rice'], f.cx, f.cy, f.rx * (0.5 + 0.5 * left), f.ry * (0.5 + 0.5 * left), t * 0.2, 4, 0.7)
    if (left > 0 && Math.random() < 0.08) steam(this.k.particles, f.cx, f.cy - 4, 8)
    // Serving plate / bowl / banana leaf.
    const serve = this.step.serve ?? 'plate'
    if (this.reveal >= 0) {
      const s = dishSprite(this.k.dishId)
      const k2 = Math.min(1, this.reveal / 0.25)
      const bob = Math.round(Math.sin(Math.min(1, this.reveal / 0.35) * Math.PI) * -4)
      if (serve === 'leaf') drawBananaLeaf(g, dx, dy + 4)
      g.alpha(k2)
      g.draw(s.canvas, Math.round(dx - s.w / 2), Math.round(dy - s.h / 2 + bob))
      g.alpha(1)
      const r = 16 + this.reveal * 30
      g.alpha(Math.max(0, 1 - this.reveal))
      for (let a = 0; a < 16; a++) g.px(dx + Math.cos((a / 16) * TAU + t) * r, dy + Math.sin((a / 16) * TAU + t) * r * 0.6, '#fff3a6')
      g.alpha(1)
    } else {
      if (serve === 'bowl') drawServeBowl(g, dx, dy + 2)
      else if (serve === 'leaf') drawBananaLeaf(g, dx, dy + 4)
      else drawPlate(g, dx, dy + 4, 28, 14)
      const bits = this.k.carry.length ? this.k.carry : (['rice'] as Bit[])
      for (const [i, p] of this.placed.entries()) drawBits(g, bits, p.x, p.y + (serve === 'bowl' ? -2 : 2), 9, 5, i, 20 + i, 0.7)
      if (!this.done && (this.holding || this.idle > 1)) {
        const p = 0.5 + Math.sin(t * 6) * 0.5
        g.alpha(0.35 + p * 0.3)
        for (let a = 0; a < 20; a++) if (a % 2) g.px(dx + Math.cos((a / 20) * TAU) * 22, dy + 4 + Math.sin((a / 20) * TAU) * 11, '#ffffff')
        g.alpha(1)
      }
    }
    const h = this.holding
    if (h) drawBits(g, this.k.carry.length ? this.k.carry : ['rice'], h.x, h.y - 10, 7, 4, 0, 30, 0.7)
  }

  private scoopTip(): [number, number] {
    if (this.holding) return [this.holding.x, this.holding.y - 8]
    const [sx, sy] = this.src
    return [sx + 6, sy - 2]
  }

  chefPose(c: Worker) {
    if (this.reveal >= 0) {
      c.pose = WP.cheer
      return
    }
    const [tx, ty] = this.scoopTip()
    chefTo(c, this.k, tx + 12, 9)
    reachTo(c, tx, ty, this.holding ? 'open' : 'smile')
  }

  drawHeld(g: Surface, c: Worker) {
    if (this.reveal >= 0) return
    const [tx, ty] = this.scoopTip()
    heldTool(g, c, this.tool === 'ladle' ? 'ladle' : 'spoon', tx, ty)
  }

  ghost(t: number) {
    if (this.reveal >= 0) return null
    const [sx, sy] = this.src
    const [dx, dy] = this.dst
    const ph = (t * 0.8) % 1
    const k2 = Math.min(1, ph * 1.3)
    return { x: sx + (dx - sx) * k2, y: sy + (dy - sy) * k2 + 4 - Math.sin(k2 * Math.PI) * 14, down: ph < 0.8 }
  }
}

export function makeGame(step: CookStep, k: Kitchen): StepGame {
  switch (step.kind) {
    case 'chop':
      return new ChopGame(step, k)
    case 'crack':
      return new CrackGame(step, k)
    case 'stir':
      return new StirGame(step, k)
    case 'pour':
      return new PourGame(step, k)
    case 'fry':
      return new FryGame(step, k)
    case 'season':
      return new SeasonGame(step, k)
    case 'shape':
      return new ShapeGame(step, k)
    case 'wrap':
      return new WrapGame(step, k)
    case 'plate':
      return new PlateGame(step, k)
  }
}

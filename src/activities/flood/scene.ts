// Renders the flood rescue: camera following the boat up and down the
// flooded village, y-sorted houses/floaties/survivors, rain and lightning, a
// floating drag joystick and edge arrows to anyone calling for help.

import type { PointerInfo, Scene } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { Particles } from '../../engine/particles'
import { rand, pick } from '../../engine/rng'
import { drawText, textWidth } from '../../engine/font'
import { haptic, sfx } from '../../engine/audio'
import * as ART from '../../art/flood'
import { FloodSim, KINDS, type SimEvent, type Steer, type Survivor, type SurvivorKind } from './sim'
import { floodSfx } from './sfx'

export interface Bubble {
  id: number
  x: number
  y: number
  text: string
  t: number
  tone: 'info' | 'good' | 'warn'
}

interface Drop {
  x: number
  y: number
  v: number
  l: number
}

const JOY_R = 20
const SAVED_LINES = ['รอดแล้ว!', 'ขอบคุณนะลูก', 'สาธุ ๆ', 'ถึงวัดแล้ว!', 'ขอบใจหน่วยกู้ภัย!']

export class FloodScene implements Scene {
  w = 195
  h = 420
  t = 0
  sim: FloodSim | null = null
  particles = new Particles()
  bubbles: Bubble[] = []
  camY = 0
  paused = false
  /** Top of the free play area (below the DOM HUD), screen px. */
  top = 60
  bottom = 420
  joy: { id: number; ox: number; oy: number; x: number; y: number } | null = null
  moved = false
  onEvent?: (e: SimEvent) => void
  private seq = 0
  private hill: HTMLCanvasElement | null = null
  private rain: Drop[] = []
  private shakeT = 0
  private shakeMag = 1
  private flashT = 0
  private boltX = 0
  private rainT = 0
  private thunderT = -1
  private sign: HTMLImageElement | null = null
  private monkWave = 0
  private notes: { x: number; y: number; t: number; c: string }[] = []

  constructor(private seed: string | number = Date.now()) {}

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bottom = h
    if (!this.sim) {
      this.sim = new FloodSim({ w, seed: this.seed })
      this.camY = this.sim.shoreY - 30
    }
    this.hill = ART.bakeHill(this.sim.w, this.sim.shoreY)
    this.rain = []
    for (let i = 0; i < Math.round((w * h) / 900); i++) this.rain.push({ x: rand(0, w), y: rand(0, h), v: rand(150, 230), l: rand(3, 6) })
  }

  /** Set the sign text image (drawn by the DOM pixel-text renderer). */
  setSign(img: HTMLImageElement) {
    this.sign = img
  }

  setSafe(top: number) {
    this.top = Math.max(0, Math.round(top))
  }

  start() {
    if (this.sim) this.sim.started = true
  }

  steer(): Steer | null {
    if (!this.joy) return null
    const dx = this.joy.x - this.joy.ox
    const dy = this.joy.y - this.joy.oy
    const d = Math.hypot(dx, dy)
    if (d < 2) return null
    const m = Math.min(1, d / JOY_R)
    return { x: (dx / d) * m, y: (dy / d) * m }
  }

  pointer(e: PointerInfo) {
    if (this.paused || !this.sim || this.sim.done) {
      this.joy = null
      return
    }
    if (e.type === 'down' && !this.joy) this.joy = { id: e.id, ox: e.x, oy: e.y, x: e.x, y: e.y }
    else if (e.type === 'move' && this.joy && e.id === this.joy.id) {
      this.joy.x = e.x
      this.joy.y = e.y
      // Drag the ring along if the finger goes past it (feels like a real stick).
      const dx = e.x - this.joy.ox
      const dy = e.y - this.joy.oy
      const d = Math.hypot(dx, dy)
      if (d > JOY_R * 1.6) {
        this.joy.ox = e.x - (dx / d) * JOY_R * 1.6
        this.joy.oy = e.y - (dy / d) * JOY_R * 1.6
      }
      if (d > 4) this.moved = true
    } else if ((e.type === 'up' || e.type === 'cancel') && this.joy && e.id === this.joy.id) this.joy = null
  }

  say(x: number, y: number, text: string, tone: Bubble['tone'] = 'info', life = 1.6) {
    this.bubbles = this.bubbles.filter((b) => b.text !== text)
    // Stack instead of overlapping another bubble nearby.
    for (let k = 0; k < 4; k++) {
      const hit = this.bubbles.find((b) => Math.abs(b.x - x) < 50 && Math.abs(b.y - y) < 11)
      if (!hit) break
      y = hit.y - 12
    }
    this.bubbles.push({ id: ++this.seq, x, y, text, t: life, tone })
    if (this.bubbles.length > 4) this.bubbles.shift()
  }

  shake(t = 0.25, mag = 2) {
    this.shakeT = Math.max(this.shakeT, t)
    this.shakeMag = mag
  }

  splash(x: number, y: number, k = 1) {
    this.particles.add({ kind: 'ripple', x, y, max: 0.9, size: 10 * k + 6, color: ART.FW.foam })
    for (let i = 0; i < Math.round(10 * k); i++)
      this.particles.add({ kind: 'drop', x: x + rand(-4, 4), y, vx: rand(-40, 40) * k, vy: rand(-80, -30) * k, g: 240, max: rand(0.4, 0.7), color: i % 2 ? '#ffffff' : ART.FW.waterHi, size: 2, color2: ART.FW.foam })
  }

  update(dt: number) {
    if (this.paused || !this.sim) return
    this.t += dt
    const sim = this.sim
    sim.update(dt, this.steer())
    for (const e of sim.takeEvents()) this.handle(e)
    // Camera: keep the boat in the middle of the free area.
    const viewH = this.bottom - this.top
    const want = sim.boat.y - this.top - viewH * 0.5
    const maxY = Math.max(0, sim.h - this.h + 10)
    const target = Math.max(-this.top, Math.min(maxY, want))
    this.camY += (target - this.camY) * Math.min(1, dt * 4)
    // Wake behind the moving boat.
    const b = sim.boat
    const sp = Math.hypot(b.vx, b.vy)
    if (sp > 12 && Math.random() < dt * (b.boost > 0 ? 40 : 18)) {
      const bx = b.x - Math.cos(b.angle) * 14
      const by = b.y - Math.sin(b.angle) * 10
      this.particles.add({ kind: 'drop', x: bx + rand(-2, 2), y: by + rand(-1, 1), vx: -b.vx * 0.2 + rand(-8, 8), vy: -b.vy * 0.2 + rand(-8, 4), g: 0, max: rand(0.3, 0.6), color: ART.FW.foam, size: 1, drag: 3 })
    }
    if (b.boost > 0 && Math.random() < dt * 14) this.particles.sparkles(b.x + rand(-8, 8), b.y + rand(-6, 6), 1, '#fff3a6', 4)
    // Radio notes from granny.
    for (const s of sim.survivors) {
      if (s.kind === 'granny' && (s.state === 'wait' || s.state === 'saved') && Math.random() < dt * 0.8) {
        const [x, y] = s.state === 'saved' ? [s.hx, s.hy - 12] : [s.x - 4, this.roofY(s) - 12]
        this.notes.push({ x, y, t: 0, c: pick(['#fff3a6', '#ff9fc0', '#9fd0ff']) })
      }
    }
    for (const n of this.notes) (n.t += dt), (n.y -= 10 * dt), (n.x += Math.sin(n.t * 4) * 6 * dt)
    this.notes = this.notes.filter((n) => n.t < 1.6)
    // Rain.
    for (const d of this.rain) {
      d.y += d.v * dt
      d.x -= d.v * 0.25 * dt
      if (d.y > this.h) (d.y = rand(-10, 0)), (d.x = rand(0, this.w + 40))
    }
    this.rainT -= dt
    if (this.rainT <= 0) {
      this.rainT = 1.2
      floodSfx.rain()
    }
    if (this.thunderT > 0) {
      this.thunderT -= dt
      if (this.thunderT <= 0) floodSfx.thunder()
    }
    this.shakeT = Math.max(0, this.shakeT - dt)
    this.flashT = Math.max(0, this.flashT - dt)
    this.monkWave = Math.max(0, this.monkWave - dt)
    for (const bb of this.bubbles) bb.t -= dt
    this.bubbles = this.bubbles.filter((bb) => bb.t > 0)
    this.particles.update(dt)
  }

  private roofY(s: Survivor): number {
    const h = this.sim!.houses[s.house ?? 0]
    return h.y - ART.houseGeom(h.style).top
  }

  private handle(e: SimEvent) {
    const sim = this.sim!
    switch (e.type) {
      case 'call':
        this.say(e.x, e.y, e.line, 'info', 1.6)
        floodSfx.voice(e.kind)
        break
      case 'pickup': {
        const n = sim.boat.aboard.length
        floodSfx.hop(n)
        haptic(18)
        this.splash(e.x, sim.boat.y, 0.7)
        this.particles.hearts(e.x, e.y - 10, 2)
        this.say(sim.boat.x, sim.boat.y - 20, e.line, e.kind === 'vipcat' ? 'good' : 'info', 1.6)
        if (e.kind === 'vipcat') this.particles.sparkles(sim.boat.x, sim.boat.y - 8, 12, '#fff3a6', 12)
        if (sim.seatsUsed() >= sim.boat.seats) this.say(sim.boat.x, sim.boat.y - 30, 'เต็มลำแล้ว! ไปส่งที่วัดเลย ⬆', 'warn', 2)
        break
      }
      case 'saved': {
        floodSfx.saved(e.trip || 1)
        haptic(10)
        this.particles.popText(e.x, e.y - 4, `+${e.points}`, e.trip > 2 ? '#ffd54f' : '#fff2a0')
        this.particles.sparkles(e.x, e.y, 5, '#fff3a6', 8)
        this.monkWave = 1.5
        if (Math.random() < 0.5) this.say(e.x + rand(-20, 20), sim.shoreY - 30, pick(SAVED_LINES), 'good', 1.2)
        if (e.kind === 'vipcat') this.say(e.x, sim.shoreY - 40, 'แมวท้องปลอดภัย! VIP +40', 'good', 2)
        break
      }
      case 'family':
        floodSfx.family()
        haptic(30)
        this.particles.confetti(e.x, e.y, 36)
        this.say(e.x, e.y - 10, `${e.name} พร้อมหน้า! +${e.bonus}`, 'good', 2.4)
        break
      case 'trip':
        floodSfx.trip()
        this.particles.popText(e.x, e.y - 8, `เต็มลำ +${e.bonus}`, '#ffd54f')
        break
      case 'danger': {
        floodSfx.danger()
        this.say(e.x, e.y - 6, 'น้ำใกล้ถึงหลังคาแล้ว!', 'warn', 2)
        break
      }
      case 'flood':
        floodSfx.flood()
        this.splash(e.x, e.y, 1.4)
        this.say(e.x, e.y - 20, 'หลังคาจมแล้ว! รีบตามไปช่วย', 'warn', 2)
        break
      case 'heli':
        floodSfx.heli()
        this.say(e.x, e.y - 10, e.swam ? 'ว่ายเข้าฝั่งเองได้ เก่งมาก!' : 'ทีมเฮลิคอปเตอร์รับไปแล้ว', 'info', 1.8)
        break
      case 'crash':
        floodSfx.crash()
        haptic(40)
        this.shake(0.3, 2)
        this.splash(e.x, e.y, 1.2)
        this.say(e.x, e.y - 18, pick(['โอ๊ย! ชนขยะ', 'ระวังขยะลอยน้ำ!', 'เรือเสียหลัก!']), 'warn', 1.2)
        break
      case 'bump':
        floodSfx.bump()
        this.shake(0.1, 1)
        break
      case 'squeak':
        floodSfx.squeak()
        this.say(e.x, e.y - 8, 'ปี๊ด!', 'info', 0.7)
        break
      case 'power': {
        const txt = e.kind === 'rice' ? 'ข้าวกล่อง! +6 วินาที' : e.kind === 'dog' ? 'ตูบกู้ภัยมาช่วยลาก! เร็วขึ้น' : 'ห่วงยางเสริม +1 ที่นั่ง'
        if (e.kind === 'dog') floodSfx.boost()
        else floodSfx.power()
        haptic(20)
        this.particles.sparkles(e.x, e.y, 14, '#fff3a6', 12)
        this.say(e.x, e.y - 12, txt, 'good', 1.8)
        break
      }
      case 'lightning':
        this.flashT = 0.35
        this.boltX = rand(20, this.w - 20)
        this.thunderT = rand(0.25, 0.6)
        this.shake(0.2, 1)
        break
      case 'lizard':
        floodSfx.lizard()
        this.splash(e.x, e.y, 0.8)
        this.say(e.x, e.y - 10, 'ตัวเงินตัวทองแซงไป! เฮง ๆ รวย ๆ +5', 'good', 1.8)
        break
      case 'spawn':
        if (e.kind === 'lizard') this.say(e.x, e.y - 10, 'อะไรว่ายมาน่ะ!?', 'info', 1.4)
        else if (e.kind === 'dog') this.say(e.x, e.y - 10, 'น้องหมาว่ายน้ำหนีมา!', 'warn', 1.6)
        else if (e.kind === 'chicken') this.say(e.x, e.y - 10, 'ไก่ลอยมากับตะกร้า!', 'info', 1.6)
        break
      case 'full':
        floodSfx.full()
        this.say(e.x, e.y - 8, 'ที่นั่งไม่พอ! ไปส่งที่วัดก่อน', 'warn', 1.6)
        break
      case 'allsaved':
        sfx.levelUp()
        this.particles.confetti(sim.boat.x, sim.boat.y - 10, 60)
        break
      case 'hurry':
        this.say(sim.boat.x, sim.boat.y - 24, 'เหลือ 15 วินาที! รีบหน่อย', 'warn', 1.8)
        floodSfx.tick()
        break
    }
    this.onEvent?.(e)
  }

  // -------------------------------------------------------------------------

  /** Screen position of a world point (for DOM bubbles). */
  toScreen(x: number, y: number): [number, number] {
    return [x, y - this.camY]
  }

  render(g: Surface) {
    const sim = this.sim
    if (!sim) return
    const sx = this.shakeT > 0 ? Math.round(rand(-1, 1) * this.shakeMag) : 0
    const sy = this.shakeT > 0 ? Math.round(rand(-1, 1) * this.shakeMag) : 0
    const cam = Math.round(this.camY)
    const t = this.t
    // Screen-space backdrop for any sky above the world.
    g.setCamera(0, 0)
    g.clear(ART.FW.sky0)
    g.setCamera(sx, cam + sy)
    const vy0 = cam
    const vy1 = cam + this.h
    const waterTop = Math.max(vy0, sim.shoreY - 12)
    ART.drawWater(g, 0, waterTop, sim.w, vy1 - waterTop + 4, t, sim.lanes, sim.level)
    if (this.hill && vy0 < sim.shoreY + 8) {
      g.draw(this.hill, 0, 0)
      this.drawHillLife(g)
    }
    if (this.flashT > 0.2 && vy0 < 40) this.drawBolt(g)
    // Y-sorted world.
    type D = { y: number; f: () => void }
    const list: D[] = []
    const vis = (y: number, pad = 40) => y > vy0 - pad && y < vy1 + pad
    for (const h of sim.houses) if (vis(h.y)) list.push({ y: h.y, f: () => this.drawHouse(g, h.id) })
    for (const o of sim.obstacles) if (vis(o.y)) list.push({ y: o.y, f: () => ART.drawObstacle(g, o, t) })
    for (const d of sim.debris) if (vis(d.y)) list.push({ y: d.y, f: () => ART.drawDebris(g, d, t) })
    for (const f of sim.floaties) if (vis(f.y)) list.push({ y: f.y, f: () => ART.drawFloaty(g, f, t) })
    for (const p of sim.powers) if (vis(p.y)) list.push({ y: p.y, f: () => ART.drawPower(g, p, t) })
    for (const lz of sim.lizards) if (vis(lz.y)) list.push({ y: lz.y, f: () => ART.drawLizard(g, lz, t) })
    for (const s of sim.survivors) if (s.state === 'adrift' && vis(s.y)) list.push({ y: s.y, f: () => this.drawAdrift(g, s) })
    list.push({ y: sim.boat.y, f: () => this.drawBoat(g) })
    list.sort((a, b) => a.y - b.y)
    for (const d of list) d.f()
    this.drawPickRing(g)
    this.drawDropZone(g)
    for (const n of this.notes) {
      if (n.t > 1.2 && Math.floor(n.t * 10) % 2) continue
      const x = Math.round(n.x)
      const y = Math.round(n.y)
      g.rect(x, y + 2, 2, 2, n.c)
      g.vline(x + 1, y - 1, y + 2, n.c)
      g.px(x + 2, y - 1, n.c)
    }
    this.particles.render(g)
    // Screen space overlays.
    g.setCamera(0, 0)
    this.drawRain(g)
    this.drawArrows(g)
    this.drawJoystick(g)
    if (this.flashT > 0) {
      g.alpha(Math.min(0.55, this.flashT * 1.6))
      g.rect(0, 0, this.w, this.h, '#f4f6ff')
      g.alpha(1)
    }
    // Storm vignette (darker as the water rises).
    g.alpha(0.08 + sim.level * 0.1)
    g.rect(0, 0, this.w, this.h, '#1b2440')
    g.alpha(1)
  }

  private drawHillLife(g: Surface) {
    const sim = this.sim!
    const t = this.t
    const cx = Math.round(sim.w / 2)
    const monk = ART.monkSprite(this.monkWave > 0 ? Math.floor(t * 6) : 0)
    g.draw(monk.canvas, cx + 10, sim.shoreY - monk.h - 2)
    const saved = sim.survivors.filter((s) => s.state === 'saved').sort((a, b) => a.hy - b.hy)
    for (const s of saved) {
      const sp = ART.survivorSprite(s.kind, Math.floor(t * 2 + s.id), true)
      const hop = Math.floor(t * 4 + s.id) % 6 === 0 ? 1 : 0
      g.draw(sp.canvas, Math.round(s.hx - sp.w / 2), Math.round(s.hy - sp.h - hop))
    }
  }

  private drawBolt(g: Surface) {
    let x = this.boltX
    let y = 0
    while (y < 36) {
      const nx = x + rand(-5, 5)
      const ny = y + rand(4, 8)
      g.thickLine(x, y, nx, ny, 2, '#fff8d0')
      x = nx
      y = ny
    }
  }

  private drawHouse(g: Surface, id: number) {
    const sim = this.sim!
    const h = sim.houses[id]
    const t = this.t
    const sign = h.style === 'shop' && this.sign?.complete && this.sign.naturalWidth ? this.sign : undefined
    ART.drawHouse(g, h, sim.cover(h), t, sim.level, sign)
    const geo = ART.houseGeom(h.style)
    const top = h.y - geo.top
    const who = sim.survivors.filter((s) => s.house === id && s.state === 'wait')
    for (const s of who) {
      const danger = h.danger && !h.flooded
      const sp = ART.survivorSprite(s.kind, Math.floor(t * (danger ? 7 : 3) + s.id))
      const near = s.called ? (Math.floor(t * 5 + s.id) % 2) : 0
      g.draw(sp.canvas, Math.round(s.x - sp.w / 2), Math.round(top - sp.h + 2 - near))
      if (s.kind === 'vipcat') this.drawVip(g, s.x, top - sp.h - 4)
    }
    if (who.length && h.danger && Math.floor(t * 4) % 2 === 0) {
      const y = top - 26
      g.rect(h.x - 3, y - 1, 7, 9, '#e8514a')
      g.frame(h.x - 3, y - 1, 7, 9, '#7e2436')
      drawText(g, '!', h.x - 1, y + 1, '#ffffff')
    }
  }

  private drawVip(g: Surface, x: number, y: number) {
    const b = Math.round(Math.sin(this.t * 4) * 1)
    const w = textWidth('VIP')
    g.rect(x - w / 2 - 2, y - 3 + b, w + 4, 8, '#ffd54f')
    g.frame(x - w / 2 - 2, y - 3 + b, w + 4, 8, '#b8742a')
    drawText(g, 'VIP', x - w / 2, y - 1 + b, '#7e2436')
  }

  private drawAdrift(g: Surface, s: Survivor) {
    const t = this.t
    const bob = Math.round(Math.sin(t * 3 + s.id) * 1)
    const x = Math.round(s.x)
    const y = Math.round(s.y) + bob
    const sp = ART.survivorSprite(s.kind, Math.floor(t * 5 + s.id))
    g.ditherCircle(x, y + 2, 9, ART.FW.waterDD, 0.5, 0.4)
    if (s.swim) {
      // Paddling: head above water with little ripples.
      const cut = Math.max(4, sp.h - 6)
      g.drawPart(sp.canvas, 0, 0, sp.w, cut, x - Math.floor(sp.w / 2), y - cut + 1)
      const k = Math.floor(t * 6) % 3
      g.hline(x - 6 - k, x + 6 + k, y + 2, ART.FW.foam)
    } else {
      ART.drawRaft(g, x, y + 1, s.floaty)
      const cut = sp.h - 3
      g.drawPart(sp.canvas, 0, 0, sp.w, cut, x - Math.floor(sp.w / 2), y - cut + 2)
    }
    if (s.kind === 'vipcat') this.drawVip(g, x, y - sp.h - 4)
    // Time left before they drift out of reach.
    const left = Math.max(0, 1 - s.t / s.life)
    const bw = 12
    g.rect(x - bw / 2, y + 6, bw, 2, '#3a2838')
    g.rect(x - bw / 2, y + 6, Math.round(bw * left), 2, left < 0.3 && Math.floor(t * 6) % 2 ? '#ffffff' : left < 0.3 ? '#e8514a' : '#ffd54f')
  }

  private drawBoat(g: Surface) {
    const sim = this.sim!
    const b = sim.boat
    const t = this.t
    const sp = Math.hypot(b.vx, b.vy)
    const bob = Math.sin(t * 4) * 0.6
    const x = b.x
    const y = b.y + bob
    // The rescue dog swims ahead and tows while boosted.
    if (b.boost > 0) {
      const [bx, by] = ART.bowOf(x, y, b.angle)
      const dx = bx + Math.cos(b.angle) * 10
      const dy = by + Math.sin(b.angle) * 8
      g.line(bx, by, dx, dy, '#e9d9a8')
      const dog = ART.rescueDogSprite(Math.floor(t * 8))
      const cut = dog.h - 3
      g.drawPart(dog.canvas, 0, 0, dog.w, cut, Math.round(dx - dog.w / 2), Math.round(dy - cut + 2))
      if (Math.random() < 0.5) this.particles.add({ kind: 'drop', x: dx + rand(-3, 3), y: dy + 2, vx: rand(-10, 10), vy: rand(-30, -10), g: 200, max: 0.4, color: '#ffffff' })
    }
    ART.drawHull(g, x, y, b.angle, t, sp)
    // Crew at the stern, passengers on the seats; y-sorted so they overlap nicely.
    type P = [number, number, () => void]
    const people: P[] = []
    const [cx, cy] = ART.seatPos(x, y, b.angle, 3)
    const crew = ART.rescuerSprite(sp > 8 ? Math.floor(t * 6) : 0)
    people.push([cx, cy, () => g.drawPart(crew.canvas, 0, 0, crew.w, crew.h - 3, Math.round(cx - crew.w / 2), Math.round(cy - crew.h + 6))])
    const seatOrder = [0, 1, 2, 4, 5]
    let seat = 0
    for (const id of b.aboard) {
      const s = sim.byId(id)
      if (!s) continue
      const k = seatOrder[Math.min(seatOrder.length - 1, seat)]
      seat += KINDS[s.kind].seats
      const [px, py] = ART.seatPos(x, y, b.angle, k)
      const spr = ART.survivorSprite(s.kind, Math.floor(t * 2 + s.id), true)
      people.push([px, py, () => g.drawPart(spr.canvas, 0, 0, spr.w, spr.h - 4, Math.round(px - spr.w / 2), Math.round(py - spr.h + 7))])
    }
    people.sort((a, c) => a[1] - c[1])
    for (const p of people) p[2]()
    if (b.stun > 0 && Math.floor(t * 10) % 2 === 0) {
      for (let i = 0; i < 3; i++) {
        const a = t * 6 + (i * Math.PI * 2) / 3
        g.px(x + Math.cos(a) * 8, y - 16 + Math.sin(a) * 2, '#ffd54f')
      }
    }
  }

  private drawPickRing(g: Surface) {
    const sim = this.sim!
    if (!sim.pick) return
    const s = sim.byId(sim.pick.id)
    if (!s) return
    const [x, y] = sim.dockOf(s)
    const r = 12
    const n = 20
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2
      const on = i / n < sim.pick.p
      const px = x + Math.cos(a) * r
      const py = y + Math.sin(a) * r * 0.6
      g.rect(Math.round(px), Math.round(py), 2, 2, on ? '#ffd54f' : 'rgba(255,255,255,0.35)')
    }
  }

  /** Pulsing drop-off line along the temple bank while carrying people. */
  private drawDropZone(g: Surface) {
    const sim = this.sim!
    if (!sim.boat.aboard.length) return
    const y = sim.shoreY + 16
    const on = Math.floor(this.t * 3) % 2
    for (let x = 4 + (on ? 3 : 0); x < sim.w - 4; x += 6) g.rect(x, y, 3, 1, '#b4e486')
    const cx = Math.round(sim.w / 2)
    const bob = Math.round(Math.sin(this.t * 5) * 1.5)
    for (let i = 0; i < 4; i++) g.hline(cx - i, cx + i, y - 10 + i + bob, '#b4e486')
  }

  private drawRain(g: Surface) {
    g.alpha(0.55)
    for (const d of this.rain) g.line(d.x, d.y, d.x - d.l * 0.3, d.y + d.l, '#d2dcf0')
    g.alpha(1)
  }

  /** Arrows at the screen edge pointing to anyone out of view who needs help, and to the temple. */
  private drawArrows(g: Surface) {
    const sim = this.sim!
    const cam = this.camY
    const top = this.top + 4
    const bot = this.h - 8
    const t = this.t
    const need = sim.survivors
      .filter((s) => s.state === 'adrift' || (s.state === 'wait' && sim.houses[s.house ?? 0]?.danger))
      .sort((a, b) => (a.state === 'adrift' ? a.life - a.t : 99) - (b.state === 'adrift' ? b.life - b.t : 99))
    const seen = new Set<number>()
    for (const s of need) {
      if (seen.size >= 4) break
      const [, wy] = sim.dockOf(s)
      const y = wy - cam
      if (y > top - 6 && y < this.h + 8) continue
      const up = y <= top
      const bx = Math.round(Math.max(12, Math.min(this.w - 12, s.x)))
      const key = Math.round(bx / 22) * 2 + (up ? 1 : 0)
      if (seen.has(key)) continue
      seen.add(key)
      const ay = up ? top + 2 : bot - 2
      const pulse = Math.floor(t * 4) % 2
      const c = s.state === 'adrift' ? '#ffd54f' : '#e8514a'
      const iy = up ? ay + 11 : ay - 11
      g.alpha(0.75)
      g.circle(bx, iy, 8, '#1b2440')
      g.alpha(1)
      for (let i = 0; i < 4; i++) g.hline(bx - i, bx + i, up ? ay + i - pulse : ay - i + pulse, c)
      const sp = ART.survivorSprite(s.kind, 0)
      const hh = Math.min(sp.h, 10)
      g.drawPart(sp.canvas, 0, 0, sp.w, hh, bx - Math.floor(sp.w / 2), iy - Math.floor(hh / 2))
    }
    // Full boat: point at the temple.
    if (sim.boat.aboard.length && sim.shoreY - cam < top) {
      const bx = Math.round(sim.w / 2)
      const ay = top + 2 + (Math.floor(t * 3) % 2)
      for (let i = 0; i < 5; i++) g.hline(bx - i, bx + i, ay + i, '#86c95f')
      g.rect(bx - 2, ay + 5, 5, 3, '#86c95f')
    }
  }

  private drawJoystick(g: Surface) {
    const j = this.joy
    if (!j) return
    g.alpha(0.35)
    g.ellipse(j.ox, j.oy, JOY_R, JOY_R, '#1b2440')
    g.alpha(0.8)
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2
      g.px(j.ox + Math.cos(a) * JOY_R, j.oy + Math.sin(a) * JOY_R, '#fffaf0')
    }
    const dx = j.x - j.ox
    const dy = j.y - j.oy
    const d = Math.hypot(dx, dy)
    const m = Math.min(JOY_R, d)
    const kx = d > 0 ? j.ox + (dx / d) * m : j.ox
    const ky = d > 0 ? j.oy + (dy / d) * m : j.oy
    g.alpha(0.9)
    g.circle(kx, ky, 7, '#f58f35')
    g.circle(kx - 1, ky - 1, 5, '#ffbb66')
    g.alpha(1)
  }
}

export function kindName(k: SurvivorKind): string {
  return KINDS[k].name
}

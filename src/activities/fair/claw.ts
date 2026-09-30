// ตู้คีบตุ๊กตา – one coin, one grab. Hold ◀ ▶ (or drag inside the glass) to
// move the claw over a plush, press คีบ! and pray. The claw drops, closes,
// lifts… and carries the prize to the chute – or lets it slip (it's a fair
// claw machine, after all). After a few misses in a row the machine takes
// pity. Whatever you win goes into your collection.

import type { PointerInfo } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { haptic } from '../../engine/audio'
import { game } from '../../game/state'
import { dollSprite, type DollPose } from '../../art/doll'
import { collectibleSprite } from '../../art/collectibles'
import { COLLECTIBLE_BY_ID, RARITY_INFO } from '../../game/data/collectibles'
import { BULBS } from '../../art/places/fair'
import { INK, mix } from '../../art/places/hub-kit'
import '../../art/poses/fair'
import type { JobSummary } from '../jobs/base'
import { FairShow } from './show'
import { fairSfx } from './sound'
import { CLAW_PITY, CLAW_PRIZES, clawOutcome, clawPrizeFor, type ClawResult } from './rules'

/** Misses in a row this session (the pity counter). */
let fails = 0

type Stage = 'aim' | 'drop' | 'grab' | 'lift' | 'carry' | 'release' | 'over'

interface Plush {
  id: string
  x: number
  y: number
  weight: number
  gone: boolean
}

export class ClawMachine extends FairShow {
  duration = 60
  private stage: Stage = 'aim'
  private aimT = 15
  private clawX = 0
  private clawY = 0
  private open = 1
  private dir = 0
  private pile: Plush[] = []
  private held: Plush | null = null
  private outcome: ClawResult | null = null
  private fallP: { p: Plush; vy: number } | null = null
  private won: string | null = null
  private wonP: Plush | null = null
  private box = { x0: 14, x1: 176, top: 60, floor: 220, chute: 30 }
  private panelY = 250
  private btn = { l: { x: 0, y: 0, r: 13 }, r: { x: 0, y: 0, r: 13 }, go: { x: 0, y: 0, r: 16 } }
  private me = game.value.player.look
  private dragging = false
  private stageT = 0
  private jiggle = 0

  tip() {
    switch (this.stage) {
      case 'aim':
        return `เลื่อนก้ามแล้วกด คีบ! · เหลือ ${Math.ceil(this.aimT)} วิ`
      case 'drop':
      case 'grab':
        return 'ลุ้น… ลุ้น…'
      case 'lift':
      case 'carry':
        return this.held ? 'ติดแล้ว! อย่าหลุดนะ…' : 'ว่างเปล่า…'
      default:
        return this.won ? 'ได้ตุ๊กตาแล้ว!' : 'พลาดไปนิดเดียว!'
    }
  }

  complete() {
    return this.stage === 'over' && this.stageT > 1.1
  }

  progress() {
    const k: Record<Stage, number> = { aim: 0.05 + (1 - this.aimT / 15) * 0.35, drop: 0.45, grab: 0.55, lift: 0.65, carry: 0.8, release: 0.92, over: 1 }
    return k[this.stage]
  }

  summary(): JobSummary {
    const c = this.won ? COLLECTIBLE_BY_ID[this.won] : null
    const lines = c
      ? [`${c.name} (${RARITY_INFO[c.rarity].name}) เข้าสมุดของสะสมแล้ว`]
      : [this.outcome === 'miss' ? 'ก้ามคีบไม่โดนตุ๊กตาเลย เล็งให้ตรงกลางนะ' : this.outcome === 'slip' ? 'หลุดกลางทาง! ตู้นี้ใจร้ายจริง ๆ' : 'คีบติดแต่ยกไม่ขึ้น เกือบแล้ว!']
    if (!c && fails >= CLAW_PITY) lines.push('ตู้เริ่มใจอ่อนแล้ว รอบหน้าติดแน่!')
    return { title: c ? 'คีบได้แล้ว!!' : 'เกือบได้แล้ว!', lines }
  }

  protected anchor() {
    const H = this.bottom - this.top
    this.box.top = this.top + 26
    this.box.floor = this.top + Math.round(H * 0.62)
    this.box.x0 = 14
    this.box.x1 = this.w - 14
    this.box.chute = this.box.x0 + 18
    this.panelY = this.box.floor + 22
    const by = this.panelY + Math.round((this.bottom - this.panelY) * 0.5)
    this.btn.l = { x: this.w - 110, y: by, r: 13 }
    this.btn.r = { x: this.w - 80, y: by, r: 13 }
    this.btn.go = { x: this.w - 38, y: by, r: 17 }
    if (this.phase === 'ready' || this.stage === 'aim') this.clawY = this.box.top + 6
  }

  protected populate() {
    this.stage = 'aim'
    this.aimT = 15
    this.clawX = (this.box.x0 + this.box.x1) / 2
    this.clawY = this.box.top + 6
    this.open = 1
    this.held = null
    this.won = null
    this.wonP = null
    this.outcome = null
    // A pile of plush, two layers deep (golden one hidden at the back).
    this.pile = []
    const n = 13
    for (let i = 0; i < n; i++) {
      const id = clawPrizeFor(Math.random())
      const row = i < 5 ? 0 : i < 9 ? 1 : 2
      const k = row === 0 ? i : row === 1 ? i - 5 + 0.5 : i - 9 + 0.5
      const x = this.box.chute + 30 + k * ((this.box.x1 - this.box.chute - 44) / 4) + rand(-3, 3)
      const y = this.box.floor - 10 - row * 13 + rand(-2, 2)
      this.pile.push({ id, x, y, weight: CLAW_PRIZES.find((p) => p.id === id)?.weight ?? 1, gone: false })
    }
    this.pile.sort((a, b) => a.y - b.y)
  }

  private moveBy(dx: number) {
    this.clawX = Math.max(this.box.chute + 20, Math.min(this.box.x1 - 10, this.clawX + dx))
  }

  private hit(b: { x: number; y: number; r: number }, e: PointerInfo) {
    return Math.hypot(e.x - b.x, e.y - b.y) < b.r + 4
  }

  private drop() {
    if (this.stage !== 'aim' || !this.playing) return
    this.stage = 'drop'
    this.stageT = 0
    this.dir = 0
    fairSfx.whirr(0.8)
    haptic(12)
  }

  protected input(e: PointerInfo) {
    if (this.stage !== 'aim') return
    if (e.type === 'down') {
      if (this.hit(this.btn.go, e)) return this.drop()
      if (this.hit(this.btn.l, e)) return void (this.dir = -1)
      if (this.hit(this.btn.r, e)) return void (this.dir = 1)
      if (e.y > this.box.top && e.y < this.box.floor) {
        this.dragging = true
        this.clawX = Math.max(this.box.chute + 20, Math.min(this.box.x1 - 10, e.x))
      }
    } else if (e.type === 'move' && this.dragging) {
      this.clawX = Math.max(this.box.chute + 20, Math.min(this.box.x1 - 10, e.x))
    } else if (e.type === 'up' || e.type === 'cancel') {
      this.dir = 0
      this.dragging = false
    }
  }

  /** The plush right under the claw (front-most first). */
  private under(): Plush | null {
    let best: Plush | null = null
    let bd = Infinity
    for (const p of this.pile) {
      if (p.gone) continue
      const d = Math.abs(p.x - this.clawX) + (this.box.floor - p.y) * 0.1
      if (d < bd) {
        bd = d
        best = p
      }
    }
    return best
  }

  protected tick(dt: number) {
    this.stageT += dt
    this.jiggle = Math.max(0, this.jiggle - dt)
    if (!this.playing) return
    const bottomY = () => (this.under()?.y ?? this.box.floor) - 12
    switch (this.stage) {
      case 'aim':
        this.aimT -= dt
        if (this.dir) {
          this.moveBy(this.dir * 48 * dt)
          if (Math.random() < dt * 6) fairSfx.tick()
        }
        if (this.aimT <= 0) {
          this.say(this.cx, this.top + 16, 'หมดเวลา! คีบเลย!', 'warn', 1)
          this.drop()
        }
        break
      case 'drop':
        this.clawY += dt * 60
        if (this.clawY >= bottomY()) {
          this.clawY = bottomY()
          this.stage = 'grab'
          this.stageT = 0
        }
        break
      case 'grab': {
        this.open = Math.max(0, 1 - this.stageT * 2.5)
        if (this.stageT > 0.5) {
          const p = this.under()
          const offset = p ? Math.abs(p.x - this.clawX) : 999
          this.outcome = clawOutcome({ offset, width: 9, weight: p?.weight ?? 1, fails, gripRoll: Math.random(), slipRoll: Math.random() })
          this.held = this.outcome === 'miss' ? null : p
          this.stage = 'lift'
          this.stageT = 0
          fairSfx.whirr(0.9)
        }
        break
      }
      case 'lift':
        this.clawY -= dt * 44
        if (this.held && this.outcome === 'drop' && this.stageT > 0.35) {
          this.fallP = { p: this.held, vy: 0 }
          this.held = null
          this.open = 0.6
          this.say(this.clawX, this.clawY - 10, pick(['หลุด!!', 'ไม่นะ!', 'ก้ามอ่อนแรง!']), 'warn', 1)
          fairSfx.miss()
          this.jiggle = 0.4
        }
        if (this.clawY <= this.box.top + 6) {
          this.clawY = this.box.top + 6
          this.stage = 'carry'
          this.stageT = 0
        }
        break
      case 'carry':
        this.clawX -= dt * 50
        if (this.held && this.outcome === 'slip' && this.clawX < (this.box.chute + this.box.x1) / 2 - 20 + (this.held.x % 7)) {
          this.fallP = { p: this.held, vy: 0 }
          this.held = null
          this.open = 0.6
          this.say(this.clawX, this.clawY + 10, pick(['หลุดกลางทาง!!', 'อ๊ากกก!', 'เกือบแล้วววว']), 'warn', 1.2)
          fairSfx.miss()
          this.shake(0.15, 1)
        }
        if (this.clawX <= this.box.chute) {
          this.clawX = this.box.chute
          this.stage = 'release'
          this.stageT = 0
        }
        break
      case 'release':
        this.open = Math.min(1, this.stageT * 3)
        if (this.held && this.stageT > 0.25) {
          if (this.outcome === 'win') this.wonP = this.held
          this.fallP = { p: this.held, vy: 0 }
          this.held = null
        }
        if (this.stageT > 0.9) this.finishTry()
        break
      case 'over':
        break
    }
    // A dropped plush falls back onto the pile (or down the chute).
    if (this.fallP) {
      const f = this.fallP
      f.vy += 260 * dt
      const target = Math.abs(f.p.x - this.box.chute) < 14 ? this.box.floor + 40 : this.box.floor - 10
      f.p.y = Math.min(target, f.p.y + f.vy * dt)
      if (f.p.y >= target) {
        if (target > this.box.floor) f.p.gone = true
        else fairSfx.thunk()
        this.fallP = null
      }
    }
  }

  private finishTry() {
    if (this.stage === 'over') return
    this.stage = 'over'
    this.stageT = 0
    const won = this.outcome === 'win' ? this.wonP : null
    if (won) {
      fails = 0
      this.won = won.id
      this.prize = { id: won.id }
      const c = COLLECTIBLE_BY_ID[won.id]
      this.say(this.cx, this.top + 20, c ? `ได้${c.name}!` : 'ได้แล้ว!', 'good', 1.6)
      this.particles.confetti(this.box.chute, this.box.floor + 20, 36)
      fairSfx.tada()
      haptic(40)
    } else {
      fails++
      this.say(this.cx, this.top + 20, fails >= CLAW_PITY ? 'ตู้เริ่มสงสารแล้ว…' : pick(['เกือบแล้ววว', 'ตู้ใจร้าย!', 'อีกนิดเดียว!']), 'warn', 1.4)
    }
  }

  protected ended() {}

  protected draw(g: Surface) {
    const { w, h, t } = this
    const b = this.box
    const cab = '#ff6fa8'
    const cabD = mix(cab, INK, 0.35)
    const cabL = mix(cab, '#ffffff', 0.35)
    g.rect(0, 0, w, h, '#1a1428')
    // Cabinet body.
    g.rect(4, this.top, w - 8, h - this.top, cab)
    g.rect(4, this.top, 3, h - this.top, cabL)
    g.rect(w - 7, this.top, 3, h - this.top, cabD)
    // Marquee with chasing bulbs.
    g.rect(8, this.top + 2, w - 16, 20, '#ffe27a')
    g.rect(10, this.top + 4, w - 20, 16, '#ff9fd0')
    for (let i = 0; i < 6; i++) {
      const x = 22 + i * ((w - 44) / 5)
      g.circle(x, this.top + 12, 4, ['#e8514a', '#ffd23f', '#6cc36a', '#5a8de0', '#c8a0ff', '#ff6f91'][i])
      g.px(x - 1, this.top + 10, '#ffffff')
    }
    for (let x = 10, i = 0; x < w - 10; x += 5, i++) {
      const on = (Math.floor(t * 8) + i) % 3 !== 0
      g.px(x, this.top + 3, on ? BULBS[i % 6] : '#8a6a7a')
      g.px(x, this.top + 20, on ? BULBS[(i + 3) % 6] : '#8a6a7a')
    }
    // Glass box interior.
    g.rect(b.x0, b.top, b.x1 - b.x0, b.floor - b.top + 6, '#2e2650')
    for (let i = 0; i < 30; i++) g.px(b.x0 + 3 + ((i * 37) % (b.x1 - b.x0 - 6)), b.top + 4 + ((i * 53) % (b.floor - b.top - 8)), '#3a3264')
    // Chute (a hole with a lip) at the left.
    g.rect(b.x0, b.floor - 20, 30, 26, '#15101f')
    g.rect(b.x0, b.floor - 22, 32, 3, '#c8c8d0')
    g.rect(b.x0 + 29, b.floor - 22, 3, 28, '#c8c8d0')
    // Gantry rail.
    g.rect(b.x0, b.top + 2, b.x1 - b.x0, 3, '#9a9aa8')
    g.hline(b.x0, b.x1 - 1, b.top + 2, '#e8e8f0')
    // The pile.
    for (const p of this.pile) {
      if (p.gone || p === this.held || this.fallP?.p === p) continue
      this.drawPlush(g, p, 0)
    }
    if (this.fallP) this.drawPlush(g, this.fallP.p, 0)
    // The claw and its cable.
    const cx = Math.round(this.clawX)
    const cy = Math.round(this.clawY)
    const carriage = b.top + 2
    g.rect(cx - 6, carriage - 1, 12, 6, '#5a5a64')
    g.vline(cx, carriage + 5, cy - 6, '#c8c8d0')
    if (this.held) this.drawPlush(g, { ...this.held, x: cx, y: cy + 16 }, Math.sin(t * 9) * (this.stage === 'carry' ? 1.5 : 0.5))
    g.rect(cx - 4, cy - 6, 8, 6, '#9a9aa8')
    g.rect(cx - 4, cy - 6, 8, 1, '#e8e8f0')
    const spread = 3 + this.open * 5
    for (const s of [-1, 1] as const) {
      g.line(cx + s * 2, cy, cx + s * spread, cy + 6, '#c8c8d0')
      g.line(cx + s * spread, cy + 6, cx + s * (spread - 3), cy + 11, '#e8e8f0')
    }
    g.line(cx, cy, cx, cy + 8, '#c8c8d0')
    // Aim guide.
    if (this.stage === 'aim' && Math.floor(t * 4) % 2) {
      for (let y = cy + 12; y < b.floor - 4; y += 4) g.px(cx, y, '#fff3a6')
    }
    // Glass shine.
    g.alpha(0.18)
    g.line(b.x0 + 6, b.floor - 30, b.x0 + 60, b.top + 8, '#ffffff')
    g.line(b.x0 + 16, b.floor - 20, b.x0 + 80, b.top + 14, '#ffffff')
    g.alpha(1)
    // Prize door under the chute.
    const doorY = b.floor + 8
    g.rect(b.x0 + 2, doorY, 28, 12, '#15101f')
    g.rect(b.x0 + 2, doorY, 28, 2, '#5a5a64')
    if (this.won && this.stage === 'over') {
      const bob = Math.round(Math.sin(t * 6) * 1)
      const sp = collectibleSprite(this.won)
      g.draw(sp.canvas, b.x0 + 16 - Math.round(sp.w / 2), doorY - 12 + bob)
    }
    // Control panel.
    const py = this.panelY
    g.rect(8, py - 8, w - 16, this.bottom - py + 16, mix(cab, '#ffffff', 0.15))
    g.rect(8, py - 8, w - 16, 3, '#fff0f6')
    g.rect(8, this.bottom + 6, w - 16, 3, cabD)
    const btn = (bb: { x: number; y: number; r: number }, col: string, down: boolean, glyph: (x: number, y: number) => void) => {
      g.circle(bb.x, bb.y + 2, bb.r, mix(col, INK, 0.45))
      g.circle(bb.x, bb.y + (down ? 2 : 0), bb.r, col)
      g.circle(bb.x - 2, bb.y - 3 + (down ? 2 : 0), bb.r * 0.4, mix(col, '#ffffff', 0.5))
      glyph(bb.x, bb.y + (down ? 2 : 0))
    }
    const aim = this.stage === 'aim'
    btn(this.btn.l, aim ? '#5a8de0' : '#8a8a98', this.dir < 0, (x, y) => g.poly([[x + 4, y - 5], [x + 4, y + 5], [x - 4, y]], '#fffaf0'))
    btn(this.btn.r, aim ? '#5a8de0' : '#8a8a98', this.dir > 0, (x, y) => g.poly([[x - 4, y - 5], [x - 4, y + 5], [x + 4, y]], '#fffaf0'))
    btn(this.btn.go, aim ? '#e8514a' : '#8a8a98', !aim, (x, y) => {
      g.rect(x - 6, y - 2, 12, 4, '#fffaf0')
      g.rect(x - 2, y - 6, 4, 12, '#fffaf0')
    })
    if (aim && Math.floor(t * 3) % 2) {
      g.alpha(0.5)
      g.circle(this.btn.go.x, this.btn.go.y, this.btn.go.r + 3, '#fff3a6')
      g.alpha(1)
      btn(this.btn.go, '#e8514a', false, (x, y) => {
        g.rect(x - 6, y - 2, 12, 4, '#fffaf0')
        g.rect(x - 2, y - 6, 4, 12, '#fffaf0')
      })
    }
    // Coin slot.
    g.rect(24, py + 4, 16, 10, '#3a3040')
    g.rect(31, py + 6, 2, 6, '#ffd23f')
    // You at the controls (from behind, lower left).
    const pose: DollPose = this.stage === 'over' ? (this.won ? 'act_f_cheer' : 'act_f_oops') : 'act_f_claw'
    const sp = dollSprite(this.me, pose, { view: 'back' })
    const dy = this.stage === 'over' && this.won ? -Math.round(Math.abs(Math.sin(t * 8)) * 3) : 0
    g.draw(sp.canvas, 36, Math.round(this.bottom + 20 - sp.h + dy))
  }

  private drawPlush(g: Surface, p: Plush, rot: number) {
    const sp = collectibleSprite(p.id)
    const x = Math.round(p.x + rot)
    const y = Math.round(p.y)
    g.draw(sp.canvas, x - Math.round(sp.w / 2), y - Math.round(sp.h / 2))
  }
}

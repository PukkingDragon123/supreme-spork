// จัดรองเท้า – visitors left their shoes in a jumble at the hall door. Drag a
// shoe onto its mate to make a pair, then drag the pair onto the rack.
// Tourists strolling past sometimes kick the shoes about.

import type { PointerInfo } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { haptic, sfx } from '../../engine/audio'
import { avatarSprite } from '../../art/avatar'
import { bakeEntrance, drawAt, drawShoePair, drawShoeRack, shadow, shoeSize, shoeSprite, SHOE_STYLES, TOURIST_LOOKS, type ShoeStyle } from '../../art/jobs'
import { Drag, JobScene, type JobSummary } from './base'

const PAIRS = 8
const COLS = 4

interface Item {
  id: number
  style: ShoeStyle
  pair: boolean
  x: number
  y: number
  flip: boolean
  tipped: boolean
  vx: number
  vy: number
  z: number
  vz: number
  slot: number
  /** Wobble after a wrong match. */
  wob: number
  /** Snap animation 0..1 when placed on the rack. */
  snap: number
  fx: number
  fy: number
}

interface Tourist {
  x: number
  y: number
  dir: number
  look: number
  t: number
  kicked: boolean
}

export class ShoeScene extends JobScene {
  duration = 45
  thresholds: [number, number, number] = [3 / PAIRS, 6 / PAIRS, 1]
  items: Item[] = []
  racked = 0
  kicks = 0
  wrong = 0
  private bg: HTMLCanvasElement | null = null
  private seq = 0
  private drag = new Drag()
  private held: Item | null = null
  private offX = 0
  private offY = 0
  private rackX = 40
  private rackY = 50
  private slotW = 26
  private shelfH = 17
  private floorY = 120
  private tourists: Tourist[] = []
  private nextTourist = 7
  private hinted = false

  progress() {
    return Math.min(1, this.racked / PAIRS)
  }
  goalText() {
    return `เก็บขึ้นชั้น ${this.racked}/${PAIRS} คู่`
  }
  summary(): JobSummary {
    return {
      title: this.racked >= PAIRS ? 'รองเท้าเรียงเป็นระเบียบ!' : undefined,
      lines: [`วางขึ้นชั้น ${this.racked}/${PAIRS} คู่`, `นักท่องเที่ยวเตะกระจาย ${this.kicks} ครั้ง`],
    }
  }

  protected anchor() {
    const { w, top } = this
    this.slotW = Math.min(30, Math.floor((w - 40) / COLS))
    this.shelfH = 17
    const rackW = COLS * this.slotW + 6
    this.rackX = Math.round(w / 2 - rackW / 2)
    this.rackY = top + 8
    this.floorY = this.rackY + this.shelfH * 2 + 16
    this.bg = bakeEntrance(w, this.h, this.floorY)
    for (const it of this.items) if (it.slot < 0) this.clamp(it)
  }

  protected populate() {
    this.items = []
    this.racked = 0
    const styles = SHOE_STYLES.slice(0, PAIRS)
    for (const st of styles)
      for (let k = 0; k < 2; k++) {
        const [x, y] = this.freeSpot()
        this.items.push(this.newItem(st, false, x, y))
      }
  }

  private newItem(style: ShoeStyle, pair: boolean, x: number, y: number): Item {
    return { id: ++this.seq, style, pair, x, y, flip: Math.random() < 0.5, tipped: !pair && Math.random() < 0.3, vx: 0, vy: 0, z: 0, vz: 0, slot: -1, wob: 0, snap: 0, fx: x, fy: y }
  }

  private freeSpot(): [number, number] {
    let best: [number, number] = [this.cx, this.bottom - 20]
    let bestD = -1
    for (let k = 0; k < 24; k++) {
      const x = rand(18, this.w - 18)
      const y = rand(this.floorY + 20, this.bottom - 6)
      let d = 1e9
      for (const it of this.items) if (it.slot < 0) d = Math.min(d, Math.hypot(it.x - x, (it.y - y) * 1.4))
      if (d > bestD) (bestD = d), (best = [x, y])
    }
    return best
  }

  private clamp(it: Item) {
    it.x = Math.max(12, Math.min(this.w - 12, it.x))
    it.y = Math.max(this.floorY + 12, Math.min(this.bottom - 3, it.y))
  }

  private slotPos(i: number): [number, number] {
    const c = i % COLS
    const r = Math.floor(i / COLS)
    return [this.rackX + 3 + c * this.slotW + this.slotW / 2, this.rackY + (r + 1) * (this.shelfH + 3) - 1]
  }

  private overRack(x: number, y: number) {
    const W = COLS * this.slotW + 6
    return x > this.rackX - 10 && x < this.rackX + W + 10 && y < this.floorY + 4
  }

  private hit(x: number, y: number): Item | null {
    let best: Item | null = null
    let bd = 1e9
    for (const it of this.items) {
      if (it.slot >= 0 || it.z > 4) continue
      const [sw, sh] = shoeSize(it.style)
      const cy = it.y - sh / 2
      const dx = Math.abs(x - it.x) - sw / 2 - 4
      const dy = Math.abs(y - cy) - sh / 2 - 5
      if (dx > 0 || dy > 0) continue
      const d = Math.hypot(x - it.x, y - cy) - it.y * 0.01
      if (d < bd) (bd = d), (best = it)
    }
    return best
  }

  protected input(e: PointerInfo) {
    const d = this.drag
    if (e.type === 'down') {
      if (d.down) return
      const it = this.hit(e.x, e.y)
      if (!it) return
      d.begin(e)
      this.held = it
      this.offX = it.x - e.x
      this.offY = it.y - e.y
      it.tipped = false
      sfx.tap()
      haptic(6)
      return
    }
    if (e.type === 'move') {
      if (!d.move(e) || !this.held) return
      const it = this.held
      it.x = e.x + this.offX
      it.y = e.y + this.offY - 5
      return
    }
    if (!d.end(e)) return
    const it = this.held
    this.held = null
    if (it) this.release(it)
  }

  private release(it: Item) {
    if (!it.pair) {
      // Find a mate nearby.
      let mate: Item | null = null
      let other: Item | null = null
      for (const o of this.items) {
        if (o === it || o.slot >= 0 || o.pair) continue
        const dd = Math.hypot(o.x - it.x, (o.y - it.y) * 1.3)
        if (dd > 15) continue
        if (o.style === it.style) mate = o
        else other = o
      }
      if (mate) {
        this.items = this.items.filter((o) => o !== it && o !== mate)
        const p = this.newItem(it.style, true, (mate.x + it.x) / 2, Math.max(mate.y, it.y))
        p.flip = mate.flip
        p.snap = 1
        this.clamp(p)
        this.items.push(p)
        this.particles.sparkles(p.x, p.y - 6, 7, '#fff3a6')
        sfx.click()
        sfx.sparkle()
        haptic(12)
        if (!this.hinted) {
          this.hinted = true
          this.say(p.x, p.y - 16, 'ได้คู่แล้ว! ลากขึ้นชั้นเลย', 'good', 1.8)
        }
        return
      }
      if (this.overRack(it.x, it.y)) {
        it.y = this.floorY + 16
        it.vy = 30
        this.say(it.x, this.floorY + 2, 'จับคู่ให้ครบก่อนนะ', 'info', 1.3)
        sfx.error()
      } else if (other) {
        it.wob = 0.4
        other.wob = 0.4
        this.wrong++
        this.say(it.x, it.y - 16, 'ไม่ใช่คู่กันนะ', 'warn', 1)
        sfx.error()
      }
      this.clamp(it)
      return
    }
    if (this.overRack(it.x, it.y)) {
      const taken = new Set(this.items.filter((o) => o.slot >= 0).map((o) => o.slot))
      let best = -1
      let bd = 1e9
      for (let i = 0; i < COLS * 2; i++) {
        if (taken.has(i)) continue
        const [sx, sy] = this.slotPos(i)
        const dd = Math.hypot(sx - it.x, sy - it.y)
        if (dd < bd) (bd = dd), (best = i)
      }
      if (best >= 0) {
        it.slot = best
        it.fx = it.x
        it.fy = it.y
        it.snap = 0
        this.racked++
        const [sx, sy] = this.slotPos(best)
        this.particles.sparkles(sx, sy - 8, 8, '#fff3a6')
        this.particles.popText(sx, sy - 16, '+1')
        sfx.coin()
        haptic(16)
        if (this.racked >= PAIRS) {
          this.flash()
          this.particles.confetti(this.cx, this.rackY + 20, 40)
          sfx.chime()
        }
        return
      }
    }
    this.clamp(it)
  }

  protected tick(dt: number) {
    for (const it of this.items) {
      it.wob = Math.max(0, it.wob - dt)
      if (it.slot >= 0) {
        it.snap = Math.min(1, it.snap + dt * 6)
        continue
      }
      if (it === this.held) continue
      if (it.z > 0 || it.vz !== 0 || Math.abs(it.vx) > 1) {
        it.x += it.vx * dt
        it.y += it.vy * dt
        it.z += it.vz * dt
        it.vz -= 260 * dt
        if (it.z <= 0) {
          it.z = 0
          if (Math.abs(it.vz) > 40) {
            it.vz = -it.vz * 0.35
            sfx.click()
          } else it.vz = 0
          it.vx *= 0.6
          it.vy *= 0.6
        }
        if (it.z > 0 && Math.random() < dt * 10) it.tipped = !it.tipped
        if (it.x < 12 || it.x > this.w - 12) it.vx = -it.vx
        this.clamp(it)
      }
    }
    // Tourists.
    if (this.playing) {
      this.nextTourist -= dt
      if (this.nextTourist <= 0) {
        this.nextTourist = rand(9, 12)
        const dir = Math.random() < 0.5 ? 1 : -1
        const y = rand(this.floorY + 30, this.bottom - 8)
        this.tourists.push({ x: dir > 0 ? -10 : this.w + 10, y, dir, look: Math.floor(rand(0, TOURIST_LOOKS.length)), t: 0, kicked: false })
        this.say(dir > 0 ? 30 : this.w - 30, y - 34, pick(['สวัสดีค่า~', 'Hello!', 'ขอเดินผ่านนะ']), 'info', 1.4)
      }
    }
    for (const tr of this.tourists) {
      tr.t += dt
      tr.x += tr.dir * 30 * dt
      for (const it of [...this.items]) {
        if (it.slot >= 0 || it === this.held || it.z > 2) continue
        if (Math.abs(it.x - (tr.x + tr.dir * 4)) < 7 && Math.abs(it.y - tr.y) < 7) this.kick(it, tr)
      }
    }
    this.tourists = this.tourists.filter((tr) => tr.x > -20 && tr.x < this.w + 20)
  }

  private kick(it: Item, tr: Tourist) {
    this.kicks++
    sfx.whoosh()
    haptic(10)
    const launch = (o: Item, spread: number) => {
      o.vx = tr.dir * rand(50, 90)
      o.vy = rand(-40, 40) + spread
      o.vz = rand(60, 90)
      o.z = 1
    }
    if (it.pair) {
      this.items = this.items.filter((o) => o !== it)
      const a = this.newItem(it.style, false, it.x - 3, it.y)
      const b = this.newItem(it.style, false, it.x + 3, it.y)
      launch(a, -30)
      launch(b, 30)
      this.items.push(a, b)
    } else launch(it, 0)
    if (!tr.kicked) {
      tr.kicked = true
      this.say(tr.x, tr.y - 34, pick(['อุ๊ย! ขอโทษค่ะ', 'Oops! Sorry!', 'ขอโทษครับ!']), 'warn', 1.3)
    }
  }

  protected draw(g: Surface) {
    if (this.bg) g.draw(this.bg, 0, 0)
    drawShoeRack(g, this.rackX, this.rackY, COLS, this.slotW, this.shelfH)
    // Empty slot hints.
    const taken = new Set(this.items.filter((o) => o.slot >= 0).map((o) => o.slot))
    for (let i = 0; i < COLS * 2; i++) {
      if (taken.has(i)) continue
      const [sx, sy] = this.slotPos(i)
      if (this.held?.pair && Math.sin(this.t * 8) > 0) g.rect(sx - 8, sy - 1, 16, 1, '#fff3a6')
      else g.rect(sx - 6, sy - 1, 12, 1, 'rgba(255,241,214,0.35)')
    }
    for (const it of this.items.filter((o) => o.slot >= 0)) {
      const [sx, sy] = this.slotPos(it.slot)
      const k = it.snap
      const x = it.fx + (sx - it.fx) * k
      const y = it.fy + (sy - it.fy) * k - Math.sin(k * Math.PI) * 8
      drawShoePair(g, it.style, x, y, false)
    }
    // Floor items and tourists, y-sorted.
    const floor = this.items.filter((o) => o.slot < 0 && o !== this.held)
    const drawables: { y: number; fn: () => void }[] = []
    for (const it of floor)
      drawables.push({
        y: it.y,
        fn: () => {
          shadow(g, it.x, it.y, it.pair ? 10 : 8, 2, 0.4)
          const wx = it.wob > 0 ? Math.round(Math.sin(it.wob * 40) * 1.5) : 0
          const bounce = it.pair && it.snap > 0 ? 0 : 0
          if (it.pair) drawShoePair(g, it.style, it.x + wx, it.y - it.z - bounce, it.flip)
          else drawAt(g, shoeSprite(it.style, it.flip, it.tipped), it.x + wx, it.y - it.z + 1)
        },
      })
    for (const tr of this.tourists)
      drawables.push({
        y: tr.y,
        fn: () => {
          const pose = Math.floor(tr.t * 6) % 2 ? 'walk1' : 'walk2'
          const s = avatarSprite(TOURIST_LOOKS[tr.look], 'side', pose, { flip: tr.dir < 0 })
          shadow(g, tr.x, tr.y, 8, 2.5)
          drawAt(g, s, tr.x, tr.y + 1)
        },
      })
    drawables.sort((a, b) => a.y - b.y)
    for (const d of drawables) d.fn()
    // The held item, lifted with a shadow.
    const it = this.held
    if (it) {
      shadow(g, it.x, it.y + 6, 9, 2.5, 0.5)
      if (it.pair) drawShoePair(g, it.style, it.x, it.y, it.flip)
      else drawAt(g, shoeSprite(it.style, it.flip, false), it.x, it.y + 1)
      // Glow the mate while holding a single shoe.
      if (!it.pair && this.drag.down) {
        const mate = this.items.find((o) => o !== it && !o.pair && o.slot < 0 && o.style === it.style)
        if (mate && Math.hypot(mate.x - it.x, mate.y - it.y) < 26 && Math.sin(this.t * 10) > 0) this.particles.sparkles(mate.x, mate.y - 6, 1, '#ffffff', 4)
      }
    }
  }
}

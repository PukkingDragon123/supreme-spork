// เก็บขยะชายหาด: volunteer beach cleanup. Tap rubbish and the player walks
// over with a grabber and pops it into the bag (tap ahead to queue a
// route). Waves wash new rubbish in, and pull back whatever lies at the
// water's edge for too long. Pretty shells turn up now and then (kept as
// collectibles); ghost crabs pinch if you try to grab them.

import type { PointerInfo } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { sfx, haptic } from '../../engine/audio'
import { Worker } from '../jobs/worker'
import { BP } from '../../art/poses/beach'
import { drawFist } from '../../art/workActor'
import { BeachScene, backdrop, drawSurf, shadow, twinkle, bwrist, INK } from './base'
import { rollShell, type BeachRoundStats } from '../../game/beach'
import { COLLECTIBLE_BY_ID } from '../../game/data/collectibles'
import { motifSprite } from '../../art/collectibles'
import { mix } from '../../art/places/beach-kit'

type Kind = 'bottle' | 'can' | 'bag' | 'straw' | 'flipflop' | 'cup' | 'net' | 'cap' | 'shell'
const TRASH: Kind[] = ['bottle', 'can', 'bag', 'straw', 'flipflop', 'cup', 'net', 'cap']
const NAME: Record<Kind, string> = { bottle: 'ขวดพลาสติก', can: 'กระป๋อง', bag: 'ถุงพลาสติก', straw: 'หลอด', flipflop: 'รองเท้าแตะข้างเดียว', cup: 'แก้วพลาสติก', net: 'เศษอวน', cap: 'ฝาขวด', shell: 'เปลือกหอย' }
export const TRASH_GOAL = 18

interface Item {
  id: number
  kind: Kind
  x: number
  y: number
  /** Drifting in on the water (lands at ty). */
  ty: number
  floating: boolean
  age: number
  rot: number
  shell?: string
  picked: number
  fly?: { x: number; y: number; t: number }
}

interface Crab {
  x: number
  y: number
  dir: number
  t: number
  pinch: number
}

export class CleanupScene extends BeachScene {
  duration = 45
  thresholds: [number, number, number] = [6 / TRASH_GOAL, 12 / TRASH_GOAL, 1]
  private items: Item[] = []
  private crabs: Crab[] = []
  private seq = 0
  private horizon = 50
  private shore = 120
  private queue: number[] = []
  private pos = { x: 95, y: 300 }
  private grabT = 0
  private trash = 0
  private finds: string[] = []
  private lost = 0
  private nextWave = 1.5
  private pinched = 0

  goalText() {
    return `เก็บขยะ ${this.trash}/${TRASH_GOAL} ชิ้น`
  }
  progress() {
    return Math.min(1, this.trash / TRASH_GOAL)
  }
  cheerText() {
    return 'หาดสะอาดเอี่ยม!'
  }
  stats(): BeachRoundStats {
    return { score: this.trash, trash: this.trash, finds: this.finds.slice(0, 2) }
  }
  summary() {
    return {
      title: this.trash >= TRASH_GOAL ? 'หาดสะอาดเอี่ยม ทะเลยิ้มแล้ว!' : 'ขอบคุณจิตอาสารักษ์หาด',
      lines: [`เก็บขยะได้ ${this.trash} ชิ้น (${Math.round(this.trash * 0.05 * 10) / 10} กิโลกรัม)`, this.lost ? `คลื่นพาลงทะเลไป ${this.lost} ชิ้น` : 'ไม่มีขยะลงทะเลเลยสักชิ้น เก่งมาก!', this.pinched ? `โดนปูหนีบ ${this.pinched} ครั้ง 555` : 'ไม่โดนปูหนีบเลย'],
      events: {},
    }
  }

  protected anchor() {
    this.horizon = this.top + 22
    this.shore = this.top + 96
  }
  protected populate() {
    this.items = []
    this.queue = []
    this.trash = 0
    this.finds = []
    this.pos = { x: this.cx, y: this.bottom - 30 }
    this.worker = this.worker ?? new Worker(this.pos.x, this.pos.y)
    this.worker.place(this.pos.x, this.pos.y)
    this.worker.pose = BP.carry
    for (let i = 0; i < 9; i++) this.spawn(false)
    this.crabs = [0, 1].map((i) => ({ x: rand(20, this.w - 20), y: this.shore + 30 + i * 70, dir: i ? 1 : -1, t: 0, pinch: 0 }))
  }

  private spawn(fromSea: boolean) {
    const shell = Math.random() < 0.12
    const kind: Kind = shell ? 'shell' : pick(TRASH)
    const ty = fromSea ? this.shore + rand(6, 30) : rand(this.shore + 18, this.bottom - 60)
    this.items.push({ id: ++this.seq, kind, x: rand(14, this.w - 14), y: fromSea ? this.shore - rand(16, 30) : ty, ty, floating: fromSea, age: 0, rot: rand(0, 6), shell: shell ? rollShell(Math.random) : undefined, picked: 0 })
  }

  protected tick(dt: number) {
    const w = this.worker!
    // Waves bring rubbish in.
    this.nextWave -= dt
    if (this.nextWave <= 0 && this.phase === 'play') {
      this.nextWave = rand(1.8, 2.8)
      const n = this.items.filter((i) => !i.picked).length < 6 ? 2 : 1
      for (let k = 0; k < n; k++) this.spawn(true)
      sfx.whoosh()
    }
    for (const it of this.items) {
      it.age += dt
      if (it.floating) {
        it.y += 14 * dt
        it.x += Math.sin(this.t * 2 + it.id) * 6 * dt
        if (it.y >= it.ty) it.floating = false
      } else if (!it.picked && it.y < this.shore + 16 && it.age > 9 && this.phase === 'play') {
        // Pulled back out to sea.
        it.floating = true
        it.ty = -99
        it.y -= 1
      }
      if (it.floating && it.ty === -99) {
        it.y -= 18 * dt
        if (it.y < this.shore - 26) {
          it.picked = -1
          this.lost++
          this.say(it.x, this.shore, `${NAME[it.kind]}ลงทะเลไปแล้ว!`, 'warn', 1.4)
          this.breakStreak()
        }
      }
      if (it.fly) {
        it.fly.t += dt * 3
        if (it.fly.t >= 1) it.fly = undefined
      }
    }
    this.items = this.items.filter((i) => i.picked === 0 || i.fly)
    // Crabs scuttle sideways, bounce off the edges.
    for (const c of this.crabs) {
      c.t += dt
      c.pinch = Math.max(0, c.pinch - dt)
      c.x += c.dir * 26 * dt * (Math.sin(c.t * 1.3) > -0.3 ? 1 : 0)
      if (c.x < 10 || c.x > this.w - 10) c.dir *= -1
    }
    // Walk the queued route.
    this.grabT = Math.max(0, this.grabT - dt)
    const target = this.items.find((i) => i.id === this.queue[0])
    if (!target && this.queue.length) this.queue.shift()
    if (target && this.grabT <= 0) {
      const gx = target.x + 9
      const gy = target.y + 3
      const dx = gx - this.pos.x
      const dy = gy - this.pos.y
      const d = Math.hypot(dx, dy)
      if (d < 2) {
        this.pick(target)
        this.queue.shift()
      } else {
        const sp = 80 * dt
        this.pos.x += (dx / d) * Math.min(d, sp)
        this.pos.y += (dy / d) * Math.min(d, sp)
        w.view = dy < -Math.abs(dx) * 0.6 ? 'back' : 'front'
        w.pose = w.view === 'back' ? BP.carryBack : BP.carry
      }
    } else if (this.grabT <= 0) {
      w.view = 'front'
      w.pose = BP.carry
    }
    this.pos.y = Math.max(this.shore + 14, Math.min(this.bottom - 6, this.pos.y))
    w.goTo(this.pos.x, this.pos.y)
  }

  private pick(it: Item) {
    const w = this.worker!
    w.view = 'front'
    w.pose = BP.grab
    this.grabT = 0.28
    if (it.floating && it.ty !== -99) {
      it.floating = false
    }
    it.picked = 1
    it.fly = { x: it.x, y: it.y, t: 0 }
    haptic(8)
    if (it.kind === 'shell' && it.shell) {
      this.finds.push(it.shell)
      const c = COLLECTIBLE_BY_ID[it.shell]
      this.praise(`เจอ${c?.name ?? 'เปลือกหอย'}!`, 'pink', 1.2)
      sfx.sparkle()
      setTimeout(() => (this.worker!.pose = BP.grabUp), 120)
      return
    }
    this.trash++
    sfx.plop()
    this.particles.sparkles(it.x, it.y - 4, 4, '#fffaf0', 5)
    const n = this.streak(it.x, it.y - 10)
    if (n < 2 && Math.random() < 0.3) this.say(it.x, it.y - 12, pick(['เก็บแล้ว!', 'ลงถุงเลย', 'เต่าปลอดภัยขึ้นอีกตัว']), 'good', 1)
  }

  protected input(e: PointerInfo) {
    if (e.type !== 'down') return
    for (const c of this.crabs) {
      if (Math.hypot(e.x - c.x, e.y - c.y) < 9) {
        c.pinch = 1
        this.pinched++
        this.worker!.reactWith('oops', 0.9)
        this.say(c.x, c.y - 10, pick(['โอ๊ย! ปูหนีบ!', 'ปูไม่ใช่ขยะนะ!', 'ปล่อยปูไป~']), 'warn', 1.3)
        sfx.scratch()
        this.breakStreak()
        this.shake(0.15, 1)
        return
      }
    }
    let best: Item | null = null
    let bd = 14
    for (const it of this.items) {
      if (it.picked) continue
      const d = Math.hypot(e.x - it.x, e.y - it.y)
      if (d < bd) {
        bd = d
        best = it
      }
    }
    if (best && !this.queue.includes(best.id)) {
      this.queue.push(best.id)
      sfx.tap()
    } else if (!best) {
      this.pos = { x: this.pos.x, y: this.pos.y }
    }
  }

  protected draw(g: Surface) {
    g.draw(backdrop(this.w, this.h, { horizon: this.horizon, shore: this.shore, night: this.night, sea: this.sea }), 0, 0)
    drawSurf(g, this.w, this.shore, this.t, this.sea, 8)
    // Tide line of seaweed.
    for (let x = 0; x < this.w; x += 3) if ((x * 7) % 5 < 2) g.px(x, this.shore + 18 + ((x * 13) % 3), '#6e7a4a')
    // Volunteers' bins and a banner at the top of the sand.
    this.bins(g, this.w - 22, this.bottom - 20)
    // Queue markers.
    for (const id of this.queue) {
      const it = this.items.find((i) => i.id === id)
      if (it) {
        g.alpha(0.6 + Math.sin(this.t * 8) * 0.3)
        g.ellipse(it.x, it.y + 1, 7, 2.5, '#ffe27a')
        g.alpha(1)
      }
    }
    const all: { y: number; f: () => void }[] = []
    for (const it of this.items) if (!it.fly) all.push({ y: it.y, f: () => this.drawItem(g, it) })
    for (const c of this.crabs) all.push({ y: c.y, f: () => this.drawCrab(g, c) })
    all.push({ y: this.pos.y, f: () => this.drawWorker(g) })
    all.sort((a, b) => a.y - b.y).forEach((d) => d.f())
    // Items flying into the bag.
    const [bx, by] = this.bagAt()
    for (const it of this.items) {
      if (!it.fly) continue
      const k = it.fly.t
      const x = it.fly.x + (bx - it.fly.x) * k
      const y = it.fly.y + (by - it.fly.y) * k - Math.sin(k * Math.PI) * 18
      this.drawItem(g, { ...it, x, y })
    }
    void INK
  }

  private bagAt(): [number, number] {
    const w = this.worker!
    return bwrist(w.shownPose, 'L', w.x, w.feetY)
  }

  private drawWorker(g: Surface) {
    const w = this.worker!
    shadow(g, w.x, w.y + 1, 9, 2.4)
    // Bag behind the left hand, fuller as the round goes on.
    const [bx, by] = this.bagAt()
    const full = Math.min(1, this.trash / TRASH_GOAL)
    const bw = 7 + Math.round(full * 5)
    const bh = 8 + Math.round(full * 6)
    g.rect(bx - bw / 2, by, bw, bh, '#3a8a4a')
    g.rect(bx - bw / 2 + 1, by + 1, 2, bh - 2, '#5aaa6a')
    g.hline(Math.round(bx - bw / 2), Math.round(bx + bw / 2) - 1, by + bh - 1, '#2a6a3a')
    w.draw(g)
    drawFist(g, w.look, bx, by)
    // Grabber in the right hand.
    const [rx, ry] = bwrist(w.shownPose, 'R', w.x, w.feetY)
    const tipX = rx + 4
    const tipY = w.shownPose === BP.grab ? w.y + 1 : ry + 14
    g.line(rx, ry, tipX, tipY, '#8a8490')
    g.line(rx + 1, ry, tipX + 1, tipY, '#c8c4cc')
    const open = w.shownPose === BP.grab ? 0 : 1
    g.px(tipX - 1 - open, tipY + 1, '#e8514a')
    g.px(tipX + 2 + open, tipY + 1, '#e8514a')
    g.rect(rx - 1, ry - 1, 3, 3, '#ffd23f')
    drawFist(g, w.look, rx, ry)
  }

  private drawItem(g: Surface, it: Item) {
    const x = Math.round(it.x)
    const y = Math.round(it.y)
    if (it.floating) {
      g.alpha(0.5)
      g.ellipse(x, y + 1, 7, 2, '#e8fbff')
      g.alpha(1)
    } else shadow(g, x, y + 1, 5, 1.5, 0.22)
    const bob = it.floating ? Math.round(Math.sin(this.t * 3 + it.id)) : 0
    const Y = y + bob
    switch (it.kind) {
      case 'bottle':
        g.rect(x - 5, Y - 3, 9, 4, '#9fe0c8')
        g.rect(x - 4, Y - 3, 7, 1, '#e8fff8')
        g.rect(x + 4, Y - 2, 2, 2, '#3d7ac8')
        g.hline(x - 5, x + 3, Y + 1, '#5aa088')
        break
      case 'can':
        g.rect(x - 3, Y - 3, 6, 4, '#e8514a')
        g.hline(x - 3, x + 2, Y - 2, '#fffaf0')
        g.px(x - 3, Y - 3, '#d8d8e0')
        g.px(x + 2, Y + 1, '#8a2a2a')
        break
      case 'bag':
        g.alpha(0.85)
        g.poly([[x - 5, Y + 1], [x - 3, Y - 5], [x + 4, Y - 4], [x + 5, Y + 1]], '#f4f8ff')
        g.alpha(1)
        g.px(x - 3, Y - 6, '#f4f8ff')
        g.px(x + 3, Y - 5, '#f4f8ff')
        g.line(x - 2, Y - 3, x + 2, Y - 1, '#c8d4e8')
        break
      case 'straw':
        g.line(x - 5, Y, x + 4, Y - 3, '#ff6f91')
        g.line(x + 4, Y - 3, x + 5, Y - 5, '#ff6f91')
        break
      case 'flipflop':
        g.ellipse(x, Y - 1, 5, 2.4, '#5aa9e8')
        g.line(x - 1, Y - 2, x + 2, Y - 1, '#ffd23f')
        g.line(x - 1, Y - 2, x + 1, Y - 3, '#ffd23f')
        break
      case 'cup':
        g.poly([[x - 3, Y - 5], [x + 3, Y - 5], [x + 2, Y + 1], [x - 2, Y + 1]], '#fffaf0')
        g.hline(x - 3, x + 3, Y - 5, '#e8e0d4')
        g.vline(x + 1, Y - 8, Y - 5, '#ff9fc0')
        break
      case 'net':
        for (let i = -5; i <= 5; i += 2) g.line(x + i, Y - 3, x + i + 2, Y + 1, '#43b8a8')
        g.line(x - 5, Y - 1, x + 5, Y - 2, '#2a8a7a')
        break
      case 'cap':
        g.circle(x, Y - 1, 2, '#3d63b5')
        g.px(x - 1, Y - 2, '#8ab0f0')
        break
      case 'shell': {
        const c = it.shell ? COLLECTIBLE_BY_ID[it.shell] : null
        if (c) {
          const sp = motifSprite(c.art.motif, c.art.palette)
          g.draw(sp.canvas, Math.round(x - sp.w / 2), Math.round(Y - sp.h + 3))
        } else g.circle(x, Y - 2, 3, '#ffd6e0')
        twinkle(g, x + 4, Y - 8, (Math.sin(this.t * 5 + it.id) + 1) / 2)
        break
      }
    }
  }

  private drawCrab(g: Surface, c: Crab) {
    const x = Math.round(c.x)
    const y = Math.round(c.y)
    shadow(g, x, y + 1, 5, 1.5, 0.22)
    const leg = Math.floor(c.t * 16) % 2
    const body = '#f0dcc0'
    const dark = '#c4a480'
    g.ellipse(x, y - 2, 4, 2.4, dark)
    g.ellipse(x, y - 2.5, 3.4, 1.8, body)
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) g.px(x + s * (4 + k % 2), y - 1 + k - (leg + k) % 2, dark)
      const up = c.pinch > 0 ? 3 : 1
      g.rect(x + s * 5 - (s < 0 ? 1 : 0), y - 4 - up, 2, 2, mix(body, '#ff9f7a', 0.4))
    }
    g.px(x - 1, y - 5, INK)
    g.px(x + 1, y - 5, INK)
  }

  private bins(g: Surface, x: number, y: number) {
    for (const [dx, c] of [[-7, '#3d7ac8'], [5, '#3a9a4a']] as [number, string][]) {
      shadow(g, x + dx, y + 1, 6, 1.5)
      g.rect(x + dx - 5, y - 12, 10, 12, c)
      g.rect(x + dx - 6, y - 14, 12, 3, mix(c, '#ffffff', 0.25))
      g.px(x + dx, y - 7, '#fffaf0')
      g.px(x + dx - 1, y - 6, '#fffaf0')
      g.px(x + dx + 1, y - 6, '#fffaf0')
    }
  }
}

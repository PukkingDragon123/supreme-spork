// เก็บเปลือกหอย: shelling at the water's edge. Each wave rushes up the wet
// sand and slides back, leaving shells (and bubbling holes) behind; tap
// them before the next wave covers them. Sparkly ones are rare. Shells
// with a hermit crab peeking out are someone's home: leave them! The best
// three finds go home in the bucket, the rest are put back.

import type { PointerInfo } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { sfx, haptic } from '../../engine/audio'
import { Worker } from '../jobs/worker'
import { BP } from '../../art/poses/beach'
import { drawFist } from '../../art/workActor'
import { BeachScene, backdrop, shadow, twinkle, bwrist, INK } from './base'
import { rollShell, shellLuck, type BeachRoundStats } from '../../game/beach'
import { COLLECTIBLE_BY_ID, RARITY_INFO } from '../../game/data/collectibles'
import { motifSprite } from '../../art/collectibles'
import { keepBest, SHELL_POINTS, SHELL_TARGET, SHELLS_KEPT } from './rules'
import { mix } from '../../art/places/beach-kit'

interface Shell {
  id: string | null
  x: number
  y: number
  t: number
  hermit: boolean
  gone: boolean
  fly: number
  walk: number
}

export class ShellsScene extends BeachScene {
  duration = 40
  thresholds: [number, number, number] = [5 / SHELL_TARGET, 10 / SHELL_TARGET, 1]
  private shells: Shell[] = []
  private found: string[] = []
  private hermitsLeft = 0
  private waveT = 0
  private wetTop = 100
  private wetBottom = 300
  private luck = shellLuck(new Date().getHours())

  goalText() {
    return `หอย ${this.score}/${SHELL_TARGET} แต้ม`
  }
  progress() {
    return Math.min(1, this.score / SHELL_TARGET)
  }
  cheerText() {
    return 'ถังเต็มแล้ว!'
  }
  private kept() {
    return keepBest(
      this.found.map((id) => ({ id, rarity: COLLECTIBLE_BY_ID[id]?.rarity ?? 'common' })),
      SHELLS_KEPT,
    ).map((f) => f.id)
  }
  stats(): BeachRoundStats {
    return { score: this.score, finds: this.kept() }
  }
  summary() {
    const k = this.kept()
    return {
      title: this.score >= SHELL_TARGET ? 'นักล่าเปลือกหอยตัวจริง!' : 'เก็บเปลือกหอยสนุกไหม',
      lines: [`เก็บได้ ${this.found.length} ชิ้น เอากลับบ้าน ${k.length} ชิ้นที่สวยที่สุด ที่เหลือคืนทะเล`, this.hermitsLeft ? `ปล่อยปูเสฉวนกลับบ้าน ${this.hermitsLeft} ตัว ใจดีมาก` : 'ปูเสฉวนทุกตัวยังมีบ้านอยู่', this.luck > 0 ? 'น้ำลงตอนเช้า หอยหายากโผล่เยอะ!' : 'มาตอนเช้าตรู่ น้ำลง จะเจอหอยหายากบ่อยขึ้น'],
    }
  }

  protected anchor() {
    this.wetTop = this.top + 36
    this.wetBottom = this.bottom - 70
  }
  protected populate() {
    this.shells = []
    this.found = []
    this.score = 0
    this.waveT = 0
    this.worker = this.worker ?? new Worker(this.cx, this.bottom - 8)
    this.worker.place(this.cx, this.bottom - 8)
    this.worker.pose = BP.bucket
  }

  /** 0 = water fully up the beach … 1 = fully back out. */
  private ebb() {
    const p = (this.waveT % 4.2) / 4.2
    return p < 0.25 ? 1 - p / 0.25 : Math.min(1, (p - 0.25) / 0.3)
  }
  private waterEdge() {
    return this.wetTop + (1 - this.ebb()) * (this.wetBottom - this.wetTop - 30)
  }

  protected tick(dt: number) {
    const w = this.worker!
    const before = this.ebb()
    this.waveT += dt
    const e = this.ebb()
    // Wave coming in covers what's left; going out reveals new shells.
    if (before >= 0.98 && e < 0.98) sfx.whoosh()
    for (const s of this.shells) {
      s.t += dt
      if (s.fly > 0) s.fly -= dt * 2.4
      if (s.hermit && !s.gone) s.walk += dt
      if (!s.gone && s.fly <= 0 && s.y < this.waterEdge() - 2 && e < 0.9) s.gone = true
    }
    if (before < 0.95 && e >= 0.95 && this.phase === 'play') this.reveal()
    this.shells = this.shells.filter((s) => !s.gone || s.fly > 0)
    w.pose = w.reacting ? w.pose : BP.bucket
  }

  private reveal() {
    const n = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < n; i++) {
      const hermit = Math.random() < 0.18
      this.shells.push({
        id: hermit ? null : rollShell(Math.random, { luck: this.luck }),
        x: rand(16, this.w - 16),
        y: rand(this.wetTop + 20, this.wetBottom - 26),
        t: 0,
        hermit,
        gone: false,
        fly: 0,
        walk: 0,
      })
    }
    // Bubbles from buried clams.
    for (let i = 0; i < 6; i++) this.particles.add({ kind: 'dot', x: rand(10, this.w - 10), y: rand(this.wetTop + 30, this.wetBottom - 20), vy: -6, max: 0.8, color: '#fffaf0' })
  }

  protected input(e: PointerInfo) {
    if (e.type !== 'down') return
    let best: Shell | null = null
    let bd = 13
    for (const s of this.shells) {
      if (s.gone || s.fly > 0) continue
      const d = Math.hypot(e.x - s.x, e.y - (s.y - 3))
      if (d < bd) {
        bd = d
        best = s
      }
    }
    const w = this.worker!
    if (!best) return
    if (best.hermit) {
      best.gone = true
      best.fly = 0
      this.hermitsLeft++
      this.say(best.x, best.y - 10, pick(['มีเจ้าของแล้ว! ขอโทษน้า', 'ปูเสฉวนเขาเช่าบ้านอยู่!', 'วางคืนเบา ๆ']), 'warn', 1.3)
      w.reactWith('oops', 0.8)
      this.breakStreak()
      sfx.scratch()
      this.particles.add({ kind: 'text', x: best.x, y: best.y - 12, text: '!', vy: -10, max: 0.7, color: '#ff9f7a' })
      return
    }
    const c = best.id ? COLLECTIBLE_BY_ID[best.id] : null
    if (!c) return
    best.gone = true
    best.fly = 1
    this.found.push(c.id)
    const pts = SHELL_POINTS[c.rarity]
    this.score += pts
    w.pose = BP.reach
    w.reactWith(pts >= 3 ? 'cheer' : 'thumbs', 0.5)
    haptic(10)
    this.particles.popText(best.x, best.y - 10, `+${pts}`, RARITY_INFO[c.rarity].color)
    if (pts >= 3) {
      this.praise(`${c.name}! (${RARITY_INFO[c.rarity].name})`, pts >= 5 ? 'pink' : 'blue', 1.4)
      this.flash(0.2)
      sfx.levelUp()
    } else sfx.sparkle()
    this.streak(best.x, best.y - 14, 2.5)
  }

  protected draw(g: Surface) {
    const horizon = this.top + 10
    g.draw(backdrop(this.w, this.h, { horizon, shore: this.wetTop, night: this.night, sea: this.sea }), 0, 0)
    // Wet sand shine band and the wave sheet running up and back.
    const edge = this.waterEdge()
    g.alpha(0.2)
    g.rect(0, this.wetTop, this.w, this.wetBottom - this.wetTop, '#8a7456')
    g.alpha(1)
    for (let x = 0; x < this.w; x++) {
      const wob = Math.round(Math.sin(x * 0.08 + this.waveT * 2) * 3 + Math.sin(x * 0.21) * 2)
      const y = Math.round(edge + wob)
      g.alpha(0.78)
      g.vline(x, this.wetTop - 2, y, this.sea.surf)
      g.alpha(1)
      g.px(x, y, this.sea.foam)
      if ((x + Math.floor(this.t * 5)) % 3) g.px(x, y - 1, this.sea.foam)
      if (Math.sin(x * 0.5 + this.t * 4) > 0.8) g.px(x, y - 4, '#ffffff')
    }
    // Wet shine left by the retreating water.
    if (this.ebb() > 0.3) for (let x = 3; x < this.w; x += 7) g.px(x, Math.round(edge + 6 + (x % 5)), '#f4ecd8')
    // Shells.
    for (const s of this.shells) {
      if (s.gone && s.fly <= 0) continue
      if (s.fly > 0) {
        const [bx, by] = this.bucketAt()
        const k = 1 - s.fly
        this.drawShell(g, s, s.x + (bx - s.x) * k, s.y + (by - s.y) * k - Math.sin(k * Math.PI) * 24)
      } else this.drawShell(g, s, s.x, s.y)
    }
    this.drawWorker(g)
    // Bucket of finds in the corner.
    void INK
  }

  private bucketAt(): [number, number] {
    const w = this.worker!
    const [lx, ly] = bwrist(w.shownPose, 'L', w.x, w.feetY)
    return [lx, ly + 4]
  }

  private drawWorker(g: Surface) {
    const w = this.worker!
    shadow(g, w.x, w.y + 1, 9, 2.4)
    w.draw(g)
    const [bx, by] = this.bucketAt()
    g.rect(bx - 6, by - 2, 12, 9, '#5aa9e8')
    g.rect(bx - 7, by - 3, 14, 2, '#8ad0ff')
    g.hline(bx - 6, bx + 5, by + 6, '#3d7ac8')
    // Finds poking out of the bucket.
    this.found.slice(-4).forEach((id, i) => {
      const c = COLLECTIBLE_BY_ID[id]
      g.circle(bx - 4 + i * 3, by - 3, 1.6, c?.art.palette[0] ?? '#fffaf0')
    })
    drawFist(g, w.look, bx, by - 3)
  }

  private drawShell(g: Surface, s: Shell, x: number, y: number) {
    const X = Math.round(x)
    const Y = Math.round(y)
    if (s.fly <= 0) shadow(g, X, Y + 1, 5, 1.4, 0.22)
    if (s.hermit) {
      // A snail-shell home with a hermit crab peeking out (walks a little).
      const wx = X + Math.round(Math.sin(s.walk * 1.5) * 3)
      g.circle(wx, Y - 3, 3.2, '#c8906a')
      g.circle(wx - 1, Y - 4, 1.6, '#e8b890')
      g.px(wx + 1, Y - 2, '#8a5a3a')
      g.px(wx + 3, Y - 1, '#ff7a5a')
      g.px(wx + 4, Y - 2, '#ff7a5a')
      g.px(wx + 4, Y - 4, INK)
      g.px(wx + 3, Y, '#ff7a5a')
      return
    }
    const c = s.id ? COLLECTIBLE_BY_ID[s.id] : null
    if (!c) return
    const sp = motifSprite(c.art.motif, c.art.palette)
    g.draw(sp.canvas, Math.round(X - sp.w / 2), Math.round(Y - sp.h + 3))
    const r = RARITY_INFO[c.rarity].stars
    if (r >= 2 && s.fly <= 0) {
      const k = (Math.sin(this.t * 4 + s.x) + 1) / 2
      twinkle(g, X + 5, Y - 9, k, r >= 4 ? '#fff3a6' : '#ffffff')
      if (r >= 3) twinkle(g, X - 6, Y - 4, 1 - k)
    }
    if (r >= 4 && s.fly <= 0) {
      g.alpha(0.18 + Math.sin(this.t * 6) * 0.08)
      g.circle(X, Y - 4, 9, mix(RARITY_INFO[c.rarity].color, '#ffffff', 0.4))
      g.alpha(1)
    }
  }
}

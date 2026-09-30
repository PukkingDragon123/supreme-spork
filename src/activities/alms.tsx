// ตักบาตร – monks walk by on their alms round (or paddle up by boat at the
// riverside temple). You stand barefoot on the mat, lift each offering from
// your chest and place it in the monk's bowl, then kneel and pour water
// (กรวดน้ำ) while the monks chant the blessing.

import { useEffect, useRef, useState } from 'preact/hooks'
import type { Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import type { AvatarLook } from '../art/avatar'
import { hdMonkSprite, hdMonkBowl } from '../art/minigames/monk'
import { drawPlayer, godRays, handAt, impactBurst, Juice, lightPool, motes, softGlow, vignette, type Placed } from '../art/minigames/temple'
import { starsFrom } from '../art/minigames/rules'
import { tsfx } from '../art/minigames/sfx'
import { iconSprite } from '../art/icons'
import { P } from '../art/palette'
import { treeLine } from '../scenes/maps/common'
import { game } from '../game/state'
import { addMerit, count, track, useItem } from '../game/actions'
import { ITEMS, ITEM_BY_ID } from '../game/data/items'
import { ALMS_BLESSING } from '../game/data/chants'
import { hourOf, isAlmsMorning } from '../game/time'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, useStage } from './kit'
import { QuickBuy } from './quickbuy'
import { Btn, Icon } from '../ui/components/common'
import { sfx, haptic } from '../engine/audio'
import { drawSky } from '../scenes/sky'
import { Meter, PraiseLayer, StatusPill, TempleResult, praise, type TempleResultData } from './temple-ui'

const BOUGHT_ALMS = ITEMS.filter((i) => i.category === 'alms').map((i) => i.id)
const DISH_ALMS = ITEMS.filter((i) => (i.category as string) === 'dish').map((i) => i.id)
const PER_MONK = 3
const MONKS = 4
/** Rice scoop meter: 0..SCOOP_MAX, the gold zone is SCOOP_LO..SCOOP_HI. */
const SCOOP_MAX = 1.2
const SCOOP_LO = 0.75
const SCOOP_HI = 1

interface Monk {
  x: number
  target: number
  skin: number
  novice: boolean
  state: 'walk' | 'wait' | 'receive' | 'leave' | 'bless' | 'gone'
  filled: number
  anim: number
  /** Little bob when food lands in the bowl. */
  bump: number
}

interface Giving {
  icon: string
  t: number
  landed: boolean
  onLand: () => void
}

const S = 1 // character scale

class AlmsScene implements Scene {
  w = 170
  h = 320
  t = 0
  monks: Monk[] = []
  particles = new Particles()
  juice = new Juice()
  giving: Giving | null = null
  scoop: number | null = null
  blessing = false
  blessT = 0
  private bg: HTMLCanvasElement | null = null
  onReady?: (i: number) => void
  onAllServed?: () => void

  constructor(
    public look: AvatarLook,
    public boat: boolean,
    public morning: boolean,
  ) {}

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
    if (!this.monks.length) this.spawn()
    else this.monks.filter((m) => m.state === 'walk' || m.state === 'wait').forEach((m, i) => (m.target = this.standX + i * 22))
  }

  get groundY() {
    return Math.round(this.h * 0.64)
  }
  get playerX() {
    return Math.round(this.w * 0.3)
  }
  /** Where the receiving monk stands (sprite centre). */
  get standX() {
    return this.playerX + 26
  }
  get monkY() {
    return this.boat ? this.groundY + 6 : this.groundY
  }

  private spawn() {
    const skins = [2, 1, 3, 1]
    this.monks = skins.slice(0, MONKS).map((skin, i) => ({
      x: this.w + 24 + i * 24,
      target: this.standX + i * 22,
      skin,
      novice: i === 3,
      state: 'walk',
      filled: 0,
      anim: Math.random(),
      bump: 0,
    }))
  }

  current(): Monk | null {
    return this.monks.find((m) => m.state === 'receive') ?? null
  }

  private bowlOf(m: Monk): [number, number] {
    const [bx, by] = hdMonkBowl(m.novice)
    const bob = this.boat ? Math.round(Math.sin(this.t * 2 + m.x * 0.1)) : 0
    return [m.x - 16 * S + (bx + 1) * S, this.monkY + bob - 54 * S + 1 + (by + 0.5) * S]
  }

  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    const gy = this.groundY
    this.bg = bake(w, h, (g) => {
      if (this.boat) {
        treeLine(g, Math.round(h * 0.4), w, P.leafD, P.leaf)
        // far bank houses on stilts
        for (let x = 4; x < w; x += 40) {
          g.rect(x, Math.round(h * 0.38), 22, 12, '#b8844a')
          g.poly([[x - 3, Math.round(h * 0.38)], [x + 11, Math.round(h * 0.33)], [x + 25, Math.round(h * 0.38)]], '#8e2a3c')
          g.rect(x + 8, Math.round(h * 0.41), 5, 7, '#6e4a35')
        }
        g.gradientV(0, Math.round(h * 0.44), w, h - Math.round(h * 0.44), ['#5fa9c8', '#3f86ad', '#2f6f98'], 6)
        for (let y = Math.round(h * 0.46); y < h; y += 5) for (let x = (y * 7) % 11; x < w; x += 13) g.rect(x, y, 5, 1, '#8fd0e6')
        // pier
        const px = this.playerX + 30
        g.rect(0, gy - 2, px, 12, '#9a6a45')
        for (let x = 0; x < px; x += 7) g.vline(x, gy - 2, gy + 9, '#7a5238')
        g.rect(0, gy - 2, px, 2, '#c28e5c')
        for (const x of [6, px - 8]) g.rect(x, gy + 8, 3, h - gy, '#6e4a35')
      } else {
        treeLine(g, Math.round(h * 0.3), w, P.leafD, P.leaf)
        // gate roof peeking over the wall
        const gx = Math.round(w * 0.7)
        const wy = Math.round(h * 0.4)
        g.poly([[gx - 30, wy - 8], [gx, wy - 30], [gx + 30, wy - 8]], '#c0392b')
        g.poly([[gx - 22, wy - 14], [gx, wy - 30], [gx + 22, wy - 14]], P.orange)
        g.line(gx - 30, wy - 8, gx, wy - 30, P.gold)
        g.line(gx, wy - 30, gx + 30, wy - 8, P.gold)
        g.rect(gx - 1, wy - 36, 2, 7, P.gold)
        g.poly([[gx - 44, wy - 2], [gx - 30, wy - 12], [gx + 30, wy - 12], [gx + 44, wy - 2]], '#8e2a3c')
        // white temple wall
        g.rect(0, wy, w, gy - wy - 10, '#fffaf0')
        g.rect(0, wy, w, 4, P.redD)
        g.hline(0, w - 1, wy + 4, P.gold)
        for (let x = 6; x < w; x += 14) {
          g.rect(x, wy + 10, 6, 8, '#eadfcb')
          g.px(x + 2, wy + 13, P.goldD)
          g.px(x + 3, wy + 13, P.goldD)
        }
        // gate opening
        g.rect(gx - 14, wy + 2, 28, gy - wy - 12, '#6e4a35')
        g.rect(gx - 12, wy + 4, 24, gy - wy - 14, '#3a2838')
        g.rect(gx - 12, gy - 20, 24, 10, '#5a4a4a')
        g.rect(gx - 16, wy, 3, gy - wy - 10, P.gold)
        g.rect(gx + 13, wy, 3, gy - wy - 10, P.gold)
        // sidewalk tiles and the street
        g.rect(0, gy - 10, w, 12, '#e3d8c6')
        for (let x = 0; x < w; x += 9) g.vline(x, gy - 10, gy + 1, '#d2c6b2')
        g.hline(0, w - 1, gy - 10, '#f3ead9')
        g.rect(0, gy + 2, w, 3, P.stoneD)
        g.rect(0, gy + 5, w, h - gy - 5, '#6d6478')
        for (let x = 4; x < w; x += 22) g.rect(x, gy + 26, 10, 2, '#e4ddd6')
        for (let i = 0; i < 60; i++) g.px((i * 53) % w, gy + 6 + ((i * 29) % (h - gy - 6)), '#7d7488')
        // woven mat under the player and a little table with the rice pot
        const px = this.playerX
        g.rect(px - 26, gy - 4, 46, 6, '#e0bb8a')
        for (let x = px - 25; x < px + 20; x += 3) g.vline(x, gy - 3, gy + 1, '#c9a06a')
        g.hline(px - 25, px + 19, gy - 4, P.red)
        const tx = Math.max(12, px - 36)
        g.rect(tx - 8, gy - 16, 18, 3, '#9a6a45')
        g.rect(tx - 7, gy - 13, 2, 11, '#6e4a35')
        g.rect(tx + 7, gy - 13, 2, 11, '#6e4a35')
        g.rect(tx - 5, gy - 25, 12, 9, P.stone)
        g.rect(tx - 5, gy - 25, 12, 2, P.stoneL)
        g.ellipse(tx + 1, gy - 26, 5, 1.6, '#fffaf0')
      }
    })
    return this.bg
  }

  give(icon: string, onLand: () => void) {
    if (!this.current() || this.giving) return false
    this.giving = { icon, t: 0, landed: false, onLand }
    tsfx.swish(0.8)
    return true
  }

  next() {
    const m = this.current()
    if (!m) return
    m.state = 'leave'
    const waiting = this.monks.filter((x) => x.state === 'wait' || x.state === 'walk')
    waiting.forEach((x, i) => (x.target = this.standX + i * 22))
  }

  startBlessing() {
    this.blessing = true
    this.blessT = 0
    const n = this.monks.length
    this.monks.forEach((m, i) => {
      m.state = 'bless'
      m.x = this.w * 0.44 + (i * (this.w * 0.52)) / Math.max(1, n - 1)
    })
  }

  update(rawDt: number) {
    const dt = this.juice.step(rawDt)
    this.t += dt
    if (this.blessing) this.blessT += dt
    for (const m of this.monks) {
      m.anim += dt
      m.bump = Math.max(0, m.bump - dt * 6)
      if (m.state === 'walk' || m.state === 'wait') {
        if (m.x > m.target + 0.5) {
          const was = Math.floor(m.anim * 5)
          m.state = 'walk'
          m.x = Math.max(m.target, m.x - 26 * dt)
          if (Math.floor((m.anim + dt) * 5) !== was && m.x < this.w + 10) tsfx.step(was)
        } else {
          const first = this.monks.find((x) => x.state === 'walk' || x.state === 'wait')
          if (first === m && !this.current() && !this.blessing) {
            m.state = 'receive'
            sfx.click()
            this.onReady?.(this.monks.indexOf(m))
          } else m.state = 'wait'
        }
      } else if (m.state === 'leave') {
        m.x -= 30 * dt
        if (m.x < -40) m.state = 'gone'
      }
    }
    if (!this.blessing && this.monks.every((m) => m.state === 'gone')) {
      this.onAllServed?.()
      this.onAllServed = undefined
    }
    const gv = this.giving
    if (gv) {
      gv.t += dt
      if (!gv.landed && gv.t >= 0.62) {
        gv.landed = true
        const m = this.current()
        if (m) {
          m.filled++
          m.bump = 1
          const [bx, by] = this.bowlOf(m)
          impactBurst(this.particles, bx, by - 2, '#fff3a6', 12)
          for (let i = 0; i < 5; i++) this.particles.add({ kind: 'dot', x: bx + rand(-4, 4), y: by - 2, vx: rand(-20, 20), vy: rand(-40, -15), g: 140, max: 0.5, color: '#fffaf0' })
        }
        this.juice.shake(0.18)
        this.juice.hitstop(0.05)
        sfx.plop()
        gv.onLand()
      }
      if (gv.t > 0.95) this.giving = null
    }
    if (this.blessing) {
      motes(this.particles, dt, this.w, this.groundY - 30, 8, '#fff3a6')
      if (Math.random() < dt * 3) this.particles.sparkles(rand(this.w * 0.35, this.w), rand(this.h * 0.3, this.groundY - 40), 1, '#fff3a6')
    } else motes(this.particles, dt, this.w, this.groundY, 1.5, '#fff8d8')
    this.particles.update(dt)
  }

  private playerPose(): { pose: Parameters<typeof drawPlayer>[2]; hold: 'chest' | 'reach' | 'scoop' | null } {
    if (this.blessing) return { pose: this.blessT < 3.4 ? 'kruat' : 'kneelWai', hold: null }
    if (this.giving) return this.giving.t < 0.3 ? { pose: 'alms_hold', hold: 'chest' } : { pose: 'alms_give', hold: this.giving.landed ? null : 'reach' }
    if (this.scoop !== null) return { pose: 'alms_scoop', hold: 'scoop' }
    if (this.current()) return { pose: 'alms_hold', hold: null }
    return { pose: 'stand', hold: null }
  }

  render(g: Surface) {
    const { w, h } = this
    const gy = this.groundY
    this.juice.begin(g)
    drawSky(g, 0, 0, w, Math.round(h * 0.45), this.morning ? 'dawn' : 'day', this.t)
    g.draw(this.background(), 0, 0)
    if (this.morning) godRays(g, 26, Math.round(h * 0.45) - 10, h * 0.7, this.t, '#ffe7b0', 0.07, 8)
    lightPool(g, this.playerX + 20, gy, 60, '#ffe7a0', this.morning ? 0.9 : 0.5)
    // monks (behind the player)
    if (this.blessing && this.boat) this.drawBoat(g, w * 0.44 + 6, this.monkY + Math.round(Math.sin(this.t * 2)), w + 6)
    for (const m of this.monks) {
      if (m.state === 'gone') continue
      if (m.state === 'bless') {
        const chant = Math.floor(this.blessT * 2.4 + m.x) % 2 === 0
        const s = hdMonkSprite('front', chant ? 'chant' : 'bless', { novice: m.novice, skin: m.skin })
        const by = this.boat ? this.monkY - 2 + Math.round(Math.sin(this.t * 2)) : gy - 9
        g.ellipse(m.x, by - 1, 9, 2, 'rgba(30,14,30,0.25)')
        g.draw(s.canvas, Math.round(m.x - s.w / 2), Math.round(by - s.h + 1))
        continue
      }
      const frame = m.state === 'receive' ? 'receive' : m.state === 'walk' || m.state === 'leave' ? (Math.floor(m.anim * 5) % 2 ? 'walk1' : 'walk2') : 'stand'
      const s = hdMonkSprite('side', frame, { novice: m.novice, skin: m.skin, fill: m.filled })
      const bob = this.boat ? Math.round(Math.sin(this.t * 2 + m.x * 0.1)) : 0
      const by = this.monkY + bob - Math.round(m.bump * 2)
      if (this.boat) this.drawBoat(g, m.x, this.monkY + bob)
      else g.ellipse(m.x, by - 1, 10, 2, 'rgba(30,14,30,0.22)')
      g.drawScaled(s.canvas, Math.round(m.x - (s.w * S) / 2), Math.round(by - s.h * S + 1), S)
      if (m.state === 'receive' && !this.giving) {
        const [bx, bby] = this.bowlOf(m)
        softGlow(g, bx, bby, 6, 0.5 + Math.sin(this.t * 5) * 0.3, '#fff3a6')
      }
    }
    // the player
    const { pose, hold } = this.playerPose()
    const bob = pose === 'stand' ? 0 : pose === 'alms_hold' && !this.giving ? Math.round(Math.sin(this.t * 3) * 0.6) : 0
    const pl = drawPlayer(g, this.look, pose, 'front', this.playerX, gy, { scale: S, t: this.t, barefoot: true, bob })
    this.drawHeld(g, pl, hold)
    if (this.blessing && pose === 'kruat') this.drawKruat(g, pl)
    this.particles.render(g)
    if (this.blessing) godRays(g, w * 0.7, gy - 60, h * 0.6, this.t, '#fff3c4', 0.06 * Math.min(1, this.blessT), 10)
    vignette(g, '#1b1026', 0.45)
    this.juice.end(g)
  }

  private drawHeld(g: Surface, pl: Placed, hold: 'chest' | 'reach' | 'scoop' | null) {
    const gv = this.giving
    if (hold === 'chest' && gv) {
      const [lx, ly] = handAt(pl, 1)
      const [rx, ry] = handAt(pl, -1)
      const ic = iconSprite(gv.icon)
      const lift = Math.min(1, gv.t / 0.3) * 3
      g.draw(ic.canvas, Math.round((lx + rx) / 2 - 8), Math.round((ly + ry) / 2 - 13 - lift))
    } else if (hold === 'reach' && gv) {
      const m = this.current()
      const [hx, hy] = handAt(pl, -1)
      const [bx, by] = m ? this.bowlOf(m) : [hx + 10, hy]
      const u = Math.min(1, Math.max(0, (gv.t - 0.3) / 0.32))
      const e = u * u * (3 - 2 * u)
      const x = hx + (bx - hx) * e
      const y = hy - 10 + (by - 6 - (hy - 10)) * e - Math.sin(e * Math.PI) * 10
      const ic = iconSprite(gv.icon)
      g.draw(ic.canvas, Math.round(x - 8), Math.round(y - 8))
      if (u > 0.2) this.particles.add({ kind: 'sparkle', x: x + rand(-3, 3), y: y + rand(-3, 3), max: 0.3, color: '#fff3a6' })
    } else if (hold === 'scoop' && this.scoop !== null) {
      // brass ladle (ทัพพี) with rice heaped by the scoop amount
      const [hx, hy] = handAt(pl, -1)
      const tx = hx + 7
      const ty = hy - 10
      g.thickLine(hx, hy, tx, ty, 2, '#b8742a')
      g.line(hx, hy - 1, tx, ty - 1, P.gold)
      g.ellipse(tx + 2, ty - 1, 5, 3, P.goldD)
      const f = Math.min(1.2, this.scoop)
      if (f > 0.05) g.ellipse(tx + 2, ty - 2 - f * 2, 4 * Math.min(1, f + 0.3), 1.5 + f * 2.4, '#fffaf0')
      if (f > SCOOP_HI) for (let i = 0; i < 2; i++) this.particles.add({ kind: 'dot', x: tx + rand(-3, 6), y: ty - 3, vy: rand(10, 30), g: 120, max: 0.6, color: '#fffaf0' })
      if (f >= SCOOP_LO && f <= SCOOP_HI) softGlow(g, tx + 2, ty - 3, 8, 0.8, '#fff3a6')
    }
  }

  /** กรวดน้ำ: a little silver vessel pouring a thin stream into a cup. */
  private drawKruat(g: Surface, pl: Placed) {
    const [lx, ly] = handAt(pl, 1)
    const [rx, ry] = handAt(pl, -1)
    const x = Math.round((lx + rx) / 2)
    const y = Math.round((ly + ry) / 2)
    g.ellipse(x + 1, y - 2, 4, 3.5, '#c8ccd8')
    g.ellipse(x, y - 3, 2.5, 1.5, '#eef0f6')
    g.rect(x - 1, y - 7, 3, 2, '#aeb3c2')
    g.line(x + 4, y - 3, x + 8, y - 5, '#aeb3c2')
    const cupY = this.groundY - 4
    const pouring = this.blessT > 0.6
    if (pouring) {
      for (let yy = y - 5; yy < cupY - 2; yy++) g.px(x + 8 + Math.round(Math.sin(yy * 0.7 + this.t * 20) * 0.4), yy, yy % 3 ? '#9fe3f2' : '#e6fbff')
      if (Math.random() < 0.3) this.particles.add({ kind: 'drop', x: x + 8, y: cupY - 3, vx: rand(-12, 12), vy: rand(-20, -8), g: 120, max: 0.4, color: '#bfefff' })
    }
    g.ellipse(x + 8, cupY, 5, 2, '#aeb3c2')
    g.rect(x + 4, cupY - 3, 9, 3, '#c8ccd8')
    g.ellipse(x + 8, cupY - 3, 4.5, 1.2, pouring ? '#78d2e2' : '#8a8f9e')
  }

  private drawBoat(g: Surface, x: number, y: number, x1 = x + 16) {
    const x0 = x - 18
    g.poly(
      [
        [x0 - 4, y - 5],
        [x1 + 4, y - 5],
        [x1, y + 2],
        [x0, y + 2],
      ],
      '#8a5a32',
    )
    g.hline(x0 - 4, x1 + 4, y - 5, '#c28e5c')
    g.hline(x0 - 2, x1 + 2, y - 3, '#6e4a35')
    g.line(x1 - 2, y - 26, x1 + 8, y + 3, '#6e4a35')
    for (let i = 0; i < 3; i++) g.rect(x0 + i * ((x1 - x0) / 2) + ((this.t * 8) % 6), y + 3, 5, 1, '#bfe6f2')
  }
}

export function AlmsActivity({ req }: { req: ActivityRequest }) {
  const boat = !!req.params?.boat
  const morning = isAlmsMorning(hourOf())
  const look = game.value.player.look
  const { host, scene, stage } = useStage(() => new AlmsScene(look, boat, morning), { targetWidth: 130 })
  const [ready, setReady] = useState(false)
  const [monkIdx, setMonkIdx] = useState(0)
  const [given, setGiven] = useState(0)
  const [total, setTotal] = useState(0)
  const [phase, setPhase] = useState<'serve' | 'bless' | 'done'>('serve')
  const [result, setResult] = useState<TempleResultData | null>(null)
  const [buy, setBuy] = useState(false)
  const [scoop, setScoop] = useState<null | { fill: number; holding: boolean }>(null)
  const scoopTimer = useRef<number | null>(null)
  const meritRef = useRef(0)
  const itemsRef = useRef(0)
  const perfectRef = useRef(0)
  // Home-cooked dishes you own come first: they are worth far more merit.
  const ALMS_ITEMS = [...DISH_ALMS.filter((id) => count(id) > 0), ...BOUGHT_ALMS]
  const noItems = ALMS_ITEMS.every((id) => count(id) <= 0)

  useEffect(() => {
    const sc = scene.current
    if (!sc) return
    sc.onReady = (i) => {
      setReady(true)
      setMonkIdx(i)
      setGiven(0)
    }
    sc.onAllServed = () => blessing()
  }, [scene.current])

  const blessing = () => {
    const sc = scene.current
    if (!sc) return
    setPhase('bless')
    sc.startBlessing()
    sfx.hum(0)
    ;[1, 2, 3, 4].forEach((i) => setTimeout(() => sfx.hum(i), i * 900))
    setTimeout(() => sfx.bell(1), 800)
    setTimeout(() => praise(stage.current, sc.w * 0.7, sc.groundY - 60, 'ยถา วาริวหา...', 'gold'), 600)
    setTimeout(() => {
      const bonus = itemsRef.current > 0 ? addMerit(10, { key: 'alms', free: 2, morning: true, area: boat ? 'river' : 'wat' }) : 0
      if (itemsRef.current > 0) {
        track('alms')
        track('alms_item', itemsRef.current)
      }
      meritRef.current += bonus
      setPhase('done')
      setResult({
        title: itemsRef.current > 0 ? 'ตักบาตรเสร็จแล้ว' : 'พระให้พรแล้ว',
        merit: meritRef.current,
        icon: 'bowl',
        stars: itemsRef.current > 0 ? starsFrom(itemsRef.current + perfectRef.current, [1, 5, 10]) : 0,
        pose: 'kneelWai',
        lines: [
          `ถวายภัตตาหาร ${itemsRef.current} อย่าง${perfectRef.current ? ` · ตักข้าวพอดี ${perfectRef.current} ครั้ง` : ''}`,
          morning ? 'ตักบาตรยามเช้า ได้บุญ x2' : 'ตักบาตรช่วง 05:00-09:00 ได้บุญ x2',
          'พระสงฆ์อนุโมทนา: ' + ALMS_BLESSING.split(' ').slice(0, 4).join(' ') + '...',
        ],
      })
    }, 5600)
  }

  const giveItem = (id: string, bonus = 0) => {
    const sc = scene.current
    const it = ITEM_BY_ID[id]
    if (!sc || !it || !ready || sc.giving) return
    if (!useItem(id)) {
      setBuy(true)
      return
    }
    const n = given + 1
    const ok = sc.give(it.icon, () => {
      const m = addMerit(it.merit + bonus, { key: 'alms_item', free: 12, morning: true, area: boat ? 'river' : 'wat' })
      meritRef.current += m
      itemsRef.current += 1
      if (it.category === 'dish') track('dish_alms')
      setTotal(meritRef.current)
      sc.particles.popText(sc.standX - 8, sc.groundY - 50, `+${m}`)
      sfx.merit()
      haptic(12)
      if (n >= PER_MONK) {
        praise(stage.current, sc.standX - 10, sc.groundY - 66, 'ครบ ๓ อย่าง สาธุ!', 'gold')
        tsfx.praise()
      } else if (it.category === 'dish') praise(stage.current, sc.standX - 10, sc.groundY - 66, 'ฝีมือทำเอง!', 'pink')
    })
    if (!ok) return
    setGiven(n)
    if (n >= PER_MONK) {
      setReady(false)
      setTimeout(() => sc.next(), 1100)
    }
  }

  const pick = (id: string) => {
    if (id === 'rice') {
      setScoop({ fill: 0, holding: false })
      if (scene.current) scene.current.scoop = 0
      return
    }
    giveItem(id)
  }

  const scoopStart = () => {
    if (scoopTimer.current) return
    setScoop((s) => (s ? { ...s, holding: true } : s))
    scoopTimer.current = window.setInterval(() => {
      setScoop((s) => {
        if (!s) return s
        const fill = Math.min(SCOOP_MAX, s.fill + 0.03)
        if (scene.current) scene.current.scoop = fill
        return { ...s, fill }
      })
    }, 40)
  }
  const scoopEnd = () => {
    if (scoopTimer.current) clearInterval(scoopTimer.current)
    scoopTimer.current = null
    setScoop((s) => {
      if (!s || !s.holding) return s
      const perfect = s.fill >= SCOOP_LO && s.fill <= SCOOP_HI
      if (scene.current) scene.current.scoop = null
      if (s.fill > 0.15) {
        giveItem('rice', perfect ? 2 : 0)
        const sc = scene.current
        if (perfect && sc) {
          perfectRef.current++
          praise(stage.current, sc.playerX + 20, sc.groundY - 66, 'ตักพอดีเป๊ะ!', 'gold')
          tsfx.praise()
        } else if (s.fill > SCOOP_HI && sc) praise(stage.current, sc.playerX + 20, sc.groundY - 66, 'ล้นทัพพี!', 'pink')
      }
      return null
    })
  }
  const cancelScoop = () => {
    if (scoopTimer.current) clearInterval(scoopTimer.current)
    scoopTimer.current = null
    if (scene.current) scene.current.scoop = null
    setScoop(null)
  }

  const who = monkIdx === 3 ? 'สามเณร' : `พระรูปที่ ${monkIdx + 1}`
  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title={boat ? 'ตักบาตรทางเรือ' : 'ตักบาตรหน้าวัด'} onClose={closeActivity} />
      <PraiseLayer />
      {phase === 'serve' && <StatusPill text={ready ? `${who} · ${given}/${PER_MONK}` : 'รอพระบิณฑบาต'} dots={MONKS} on={monkIdx + (ready ? 0 : 0)} />}
      {phase === 'serve' && (
        <div class="act-bottom">
          <div class="panel act-tip">
            {scoop ? (
              <>
                <div class="subtitle">ตักข้าวสวยใส่ทัพพี</div>
                <div class="small muted">กดค้างเพื่อตัก ปล่อยเมื่อข้าวอยู่ในช่องสีทอง</div>
                <Meter fill={scoop.fill} max={SCOOP_MAX} lo={SCOOP_LO} hi={SCOOP_HI} tone="rice" />
                <div class="row">
                  <Btn tone="paper" onClick={cancelScoop}>
                    ยกเลิก
                  </Btn>
                  <button class="btn big green grow" onPointerDown={scoopStart} onPointerUp={scoopEnd} onPointerLeave={scoopEnd} onPointerCancel={scoopEnd} style={{ touchAction: 'none' }}>
                    {scoop.fill > SCOOP_HI ? 'ล้นแล้ว!' : 'กดค้าง ตักข้าว'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {noItems ? (
                  <>
                    <div class="subtitle">ยังไม่มีของใส่บาตร</div>
                    <Btn tone="green" block onClick={() => setBuy(true)}>
                      <Icon name="shop" size={18} /> ซื้อของใส่บาตร
                    </Btn>
                  </>
                ) : ready ? (
                  <>
                    <div class="subtitle">แตะของเพื่อยกใส่บาตร{who}</div>
                    <div class="small muted">{morning ? 'ตักบาตรยามเช้า บุญ x2' : 'ช่วง 5–9 โมงเช้าได้บุญ x2'} · ได้บุญแล้ว {total}</div>
                  </>
                ) : (
                  <div class="subtitle">พระสงฆ์กำลังเดินบิณฑบาตมา...</div>
                )}
                <div class="tray">
                  {ALMS_ITEMS.map((id) => {
                    const it = ITEM_BY_ID[id]
                    const n = count(id)
                    return (
                      <button key={id} class="panel tray-item" disabled={n <= 0 || !ready} onClick={() => (sfx.tap(), pick(id))}>
                        <Icon name={it.icon} size={30} />
                        <span>{it.name}</span>
                        <span class="qty num">x{n}</span>
                      </button>
                    )
                  })}
                </div>
                <div class="row">
                  <Btn tone="paper" class="grow" onClick={() => setBuy(true)}>
                    ซื้อเพิ่ม
                  </Btn>
                  <Btn
                    tone="green"
                    class="grow"
                    disabled={!ready || given === 0}
                    onClick={() => {
                      setReady(false)
                      scene.current?.next()
                    }}
                  >
                    นิมนต์รูปถัดไป
                  </Btn>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {phase === 'bless' && (
        <div class="act-bottom">
          <div class="panel act-tip blessing">
            <div class="small muted">พระสงฆ์ให้พร · คุกเข่ากรวดน้ำ แล้วพนมมือรับพร</div>
            <div class="bless-text">{ALMS_BLESSING}</div>
          </div>
        </div>
      )}
      {buy && <QuickBuy ids={BOUGHT_ALMS} title="ร้านของใส่บาตร" onClose={() => setBuy(false)} />}
      {result && <TempleResult r={result} onDone={closeActivity} />}
    </div>
  )
}

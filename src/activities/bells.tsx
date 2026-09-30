// ตีระฆัง – nine bells hang along the bell gallery. Tap one and you dash
// under it and swing your long striker; the bell with the shrinking ring of
// light is the next in the row, and striking it on the beat builds a combo.
// On the mountain you haul back the hanging log and let it boom into the
// great bell.

import { useEffect, useRef, useState } from 'preact/hooks'
import type { PointerInfo, Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles, drawRing } from '../engine/particles'
import { rand } from '../engine/rng'
import { P } from '../art/palette'
import type { AvatarLook } from '../art/avatar'
import { drawBeatCue, drawTempleBell } from '../art/minigames/bells'
import { drawPlayer, drawStriker, handAt, impactBurst, Juice, motes, softGlow, vignette } from '../art/minigames/temple'
import { Critters, Crowd } from '../art/minigames/scenery'
import { WORSHIPPERS } from '../art/minigames/hosts'
import { beatTiming, comboPraise, type Stars, type Timing } from '../art/minigames/rules'
import { tsfx } from '../art/minigames/sfx'
import { treeLine } from '../scenes/maps/common'
import { game } from '../game/state'
import { addMerit, track } from '../game/actions'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, useStage } from './kit'
import { Btn } from '../ui/components/common'
import { sfx, haptic } from '../engine/audio'
import { drawSky, currentPhase } from '../scenes/sky'
import { ChargeFill, ComboBadge, PraiseLayer, StatusPill, TempleResult, banner, praise, type TempleResultData } from './temple-ui'

const BEAT = 0.62
const SMALL_H = 18
const BIG_H = 70

interface Bell {
  x: number
  y: number
  swing: number
  vel: number
  rung: boolean
  idx: number
  flash: number
}

export type RingGrade = Timing | 'wrong'

class BellScene implements Scene {
  w = 160
  h = 320
  t = 0
  bells: Bell[] = []
  particles = new Particles()
  juice = new Juice()
  rings: { x: number; y: number; t: number }[] = []
  onRing?: (b: Bell, grade: RingGrade, power: number) => void
  // player
  px = 0
  targetX = 0
  flip = false
  hitT = 0
  hitBell: Bell | null = null
  // big bell log
  charge = 0
  logOff = 0
  logVel = 0
  swinging = false
  swingPower = 0
  pushT = 0
  private bg: HTMLCanvasElement | null = null
  critters = new Critters()
  crowd = new Crowd()
  private lifeInit = false
  constructor(
    public big: boolean,
    public look: AvatarLook,
  ) {}
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
    this.layout()
    if (!this.px) this.px = this.targetX = this.big ? Math.round(w * 0.8) : Math.round(w / 2)
    if (this.big) this.px = this.targetX = Math.round(w * 0.8)
    if (!this.lifeInit) {
      this.lifeInit = true
      if (this.big) {
        this.critters.bird(Math.round(w * 0.2), this.bells[0].y - 18).bird(Math.round(w * 0.62), this.bells[0].y - 18).cat(Math.round(w * 0.1), this.footY + 6, '#4a3f55', 'sit')
        this.crowd.add({ look: WORSHIPPERS[4], x: Math.round(w * 0.08), y: this.footY - 2, idle: 'stand', reactPose: 'cheer' })
      } else {
        for (let r = 0; r < 2; r++) this.critters.bird(Math.round(w * (0.2 + r * 0.45)), this.rowY(r) - 7).bird(Math.round(w * (0.6 - r * 0.3)), this.rowY(r) - 7)
        this.critters.cat(Math.round(w * 0.14), this.footY + 8, '#f5a55a', 'loaf')
        this.crowd.add({ monk: 'novice', x: Math.round(w * 0.88), y: this.footY - 4 }).add({ look: WORSHIPPERS[0], x: Math.round(w * 0.12), y: this.footY - 6, idle: 'wai', reactPose: 'happy' })
      }
    }
  }
  get footY() {
    return Math.round(this.h * (this.big ? 0.68 : 0.75))
  }
  private layout() {
    const { w } = this
    if (this.big) {
      const prev = this.bells[0]
      this.bells = [{ x: Math.round(w * 0.32), y: this.footY - 8 - BIG_H, swing: 0, vel: 0, rung: prev?.rung ?? false, idx: 0, flash: 0 }]
      return
    }
    const rows = [5, 4]
    const out: Bell[] = []
    let idx = 0
    rows.forEach((n, r) => {
      const y = this.rowY(r)
      const gap = (w - 24) / 5
      for (let i = 0; i < n; i++) {
        const prev = this.bells[idx]
        out.push({ x: Math.round(12 + gap * (i + 0.5) + (r ? gap / 2 : 0)), y, swing: 0, vel: 0, rung: prev?.rung ?? false, idx, flash: 0 })
        idx++
      }
    })
    this.bells = out
  }
  private rowY(r: number) {
    return Math.round(this.h * (0.24 + r * 0.17))
  }
  /** The next bell in the row (the one with the ring of light). */
  get target(): Bell | null {
    return this.bells.find((b) => !b.rung) ?? null
  }
  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    const fy = this.footY
    this.bg = bake(w, h, (g) => {
      if (this.big) {
        // misty mountain ridges
        const ridge = (y0: number, amp: number, c: string, seed: number) => {
          for (let x = 0; x < w; x++) {
            const y = y0 - Math.round(Math.sin(x * 0.045 + seed) * amp + Math.sin(x * 0.11 + seed * 2) * amp * 0.4)
            g.vline(x, y, fy, c)
          }
        }
        ridge(Math.round(h * 0.34), 10, '#8fa6c8', 1)
        ridge(Math.round(h * 0.42), 8, '#6f8ab0', 3)
        treeLine(g, Math.round(h * 0.5), w, '#3f6f5a' as never, '#5a8f6a' as never)
        // pavilion floor
        g.rect(0, fy - 4, w, h - fy + 4, '#bdb2ae')
        g.rect(0, fy - 4, w, 2, P.stoneL)
        for (let y = fy + 4; y < h; y += 7) g.hline(0, w - 1, y, '#a89c9a')
        for (let y = fy - 2; y < h; y += 7) for (let x = (y * 3) % 17; x < w; x += 17) g.vline(x, y, y + 6, '#a89c9a')
        // pavilion posts and beam
        const beamY = this.bells[0].y - 14
        g.rect(4, beamY, 7, fy - beamY, '#7e2436')
        g.rect(w - 11, beamY, 7, fy - beamY, '#7e2436')
        g.rect(4, beamY, 2, fy - beamY, '#b8343f')
        g.rect(w - 11, beamY, 2, fy - beamY, '#b8343f')
        g.rect(0, beamY - 4, w, 7, '#7e2436')
        g.rect(0, beamY - 4, w, 2, '#b8343f')
        for (let x = 6; x < w; x += 10) g.px(x, beamY - 1, P.gold)
        // roof
        g.poly([[-10, beamY - 4], [w / 2, beamY - 40], [w + 10, beamY - 4]], '#c0392b')
        g.poly([[4, beamY - 10], [w / 2, beamY - 36], [w - 4, beamY - 10]], P.orange)
        g.line(-10, beamY - 4, w / 2, beamY - 40, P.gold)
        g.line(w / 2, beamY - 40, w + 10, beamY - 4, P.gold)
        g.rect(w / 2 - 1, beamY - 48, 2, 9, P.gold)
      } else {
        treeLine(g, Math.round(h * 0.6), w, P.leafD, P.leaf)
        g.rect(0, Math.round(h * 0.64), w, fy - Math.round(h * 0.64), '#fffaf0')
        g.rect(0, Math.round(h * 0.64), w, 3, P.redD)
        // stone floor in perspective
        g.rect(0, fy - 8, w, h - fy + 8, '#e4ddd6')
        for (let y = fy - 4, k = 0; y < h; y += 5 + k, k++) g.hline(0, w - 1, y, '#d2c9c3')
        for (let i = -6; i <= 6; i++) g.line(w / 2 + i * 8, fy - 8, w / 2 + i * 26, h, '#d2c9c3')
        // roof eave at the top
        g.rect(0, 0, w, 14, P.orange)
        for (let y = 2; y < 14; y += 3) g.hline(0, w - 1, y, P.orangeD)
        g.rect(0, 14, w, 3, P.leaf)
        for (let x = 4; x < w; x += 10) {
          g.px(x, 17, P.gold)
          g.px(x, 18, P.gold)
          g.rect(x - 1, 19, 3, 2, P.goldD)
        }
        // beams the bells hang from, and the red posts
        for (let r = 0; r < 2; r++) {
          const by = this.rowY(r) - 7
          g.rect(0, by, w, 5, '#b8343f')
          g.rect(0, by, w, 1, P.redL)
          g.rect(0, by + 4, w, 1, '#7e2436')
          for (let x = 8; x < w; x += 16) g.px(x, by + 2, P.gold)
        }
        g.rect(2, 17, 5, fy - 17, '#b8343f')
        g.rect(w - 7, 17, 5, fy - 17, '#b8343f')
        g.rect(2, 17, 1, fy - 17, P.redL)
        g.rect(w - 7, 17, 1, fy - 17, P.redL)
      }
    })
    return this.bg
  }
  pointer(e: PointerInfo) {
    if (this.big || e.type !== 'down') return
    let best: Bell | null = null
    let bd = 20
    for (const b of this.bells) {
      const d = Math.hypot(e.x - b.x, e.y - (b.y + SMALL_H / 2))
      if (d < bd) {
        bd = d
        best = b
      }
    }
    if (best) this.strikeSmall(best)
  }
  private strikeSmall(b: Bell) {
    const target = this.target
    let grade: RingGrade = 'wrong'
    if (b === target) grade = beatTiming(this.t, BEAT)
    this.flip = b.x < this.px - 3
    this.targetX = Math.max(18, Math.min(this.w - 18, b.x + (this.flip ? 12 : -12)))
    this.hitT = 0.24
    this.hitBell = b
    const away = b.x < this.px ? -1 : 1
    b.vel += away * 26
    b.rung = true
    b.flash = 1
    const lip: [number, number] = [b.x, b.y + SMALL_H - 2]
    this.rings.push({ x: b.x, y: b.y + SMALL_H / 2, t: 0 })
    impactBurst(this.particles, lip[0], lip[1], grade === 'perfect' ? '#fff3a6' : '#ffe0a0', grade === 'perfect' ? 12 : 7)
    this.juice.shake(grade === 'perfect' ? 0.2 : 0.12)
    this.juice.hitstop(0.035)
    sfx.bell(b.idx)
    tsfx.thwack()
    this.critters.startle(b.x, b.y, 50)
    haptic(12)
    this.onRing?.(b, grade, 1)
  }
  /** Big bell: release the charged log. */
  releaseLog() {
    const power = this.charge
    this.charge = 0
    if (power < 0.2) return
    this.swinging = true
    this.swingPower = power
    this.logVel = -140 - power * 160
    this.pushT = 0.45
    tsfx.swish(0.6)
  }
  private strikeBig() {
    const b = this.bells[0]
    const p = this.swingPower
    b.vel -= 10 + p * 16
    b.rung = true
    b.flash = 1
    this.rings.push({ x: b.x, y: b.y + BIG_H * 0.55, t: 0 })
    impactBurst(this.particles, b.x + BIG_H * 0.42, this.logY, '#fff3a6', 16)
    this.particles.confetti(b.x, b.y + BIG_H * 0.4, Math.round(10 + p * 20), ['#fff3a6', '#ffd54f', '#ffffff'])
    this.juice.shake(0.35 + p * 0.45)
    this.juice.hitstop(0.07 + p * 0.05)
    this.juice.flash('#fff3c4', 0.12 + p * 0.12)
    sfx.bigBell()
    tsfx.thwack()
    this.critters.startle(b.x, b.y, 400)
    this.crowd.cheer('cheer', 1.6)
    haptic(Math.round(30 + p * 40))
    this.onRing?.(b, p > 0.85 ? 'perfect' : p > 0.5 ? 'good' : 'miss', p)
  }
  get logY() {
    return this.footY - 24
  }
  /** Resting gap between the log head and the bell. */
  private get logRest() {
    return 8
  }
  update(rawDt: number) {
    const dt = this.juice.step(rawDt)
    this.t += dt
    for (const b of this.bells) {
      // Damped spring.
      b.vel += -b.swing * 60 * dt
      b.vel *= Math.pow(0.12, dt)
      b.swing += b.vel * dt
      b.flash = Math.max(0, b.flash - dt * 3)
    }
    this.hitT = Math.max(0, this.hitT - dt)
    this.pushT = Math.max(0, this.pushT - dt)
    this.px += (this.targetX - this.px) * Math.min(1, dt * 18)
    if (Math.abs(this.targetX - this.px) > 3 && Math.random() < 0.5) this.particles.add({ kind: 'dot', x: this.px + rand(-5, 5), y: this.footY - 1, vx: rand(-8, 8), vy: rand(-10, -4), max: 0.35, color: '#fffaf0' })
    if (this.big) {
      if (this.swinging) {
        this.logOff += this.logVel * dt
        if (this.logOff <= -this.logRest) {
          this.logOff = -this.logRest
          this.logVel = 60 + this.swingPower * 40
          this.swinging = false
          this.strikeBig()
        }
      } else {
        // Pulled back while charging, then settles.
        const want = this.charge * 16
        this.logVel += (want - this.logOff) * 60 * dt
        this.logVel *= Math.pow(0.02, dt)
        this.logOff += this.logVel * dt
      }
    }
    for (const r of this.rings) r.t += dt
    this.rings = this.rings.filter((r) => r.t < (this.big ? 2.4 : 1))
    motes(this.particles, dt, this.w, this.h * 0.6, this.big ? 2 : 1, '#fff3a6')
    this.critters.update(dt, this.w)
    this.crowd.update(dt)
    this.particles.update(dt)
  }
  render(g: Surface) {
    const { w, h } = this
    this.juice.begin(g)
    drawSky(g, 0, 0, w, Math.round(h * (this.big ? 0.6 : 0.66)), currentPhase(), this.t)
    g.draw(this.background(), 0, 0)
    if (this.big) this.renderBig(g)
    else this.renderSmall(g)
    for (const r of this.rings) {
      const life = this.big ? 2.4 : 1
      const rr = r.t * (this.big ? 70 : 36)
      g.alpha(Math.max(0, 1 - r.t / life))
      drawRing(g, r.x, r.y, rr, rr * 0.6, '#fff3a6')
      if (this.big) drawRing(g, r.x, r.y, rr * 0.7, rr * 0.42, '#ffe0a0')
      g.alpha(1)
    }
    this.particles.render(g)
    vignette(g, '#1b1026', 0.4)
    this.juice.end(g)
  }
  private renderSmall(g: Surface) {
    const target = this.target
    const phase = (this.t % BEAT) / BEAT
    for (const b of this.bells) {
      // Rope.
      g.vline(b.x, b.y - 3, b.y, '#6e4a35')
      if (b === target) softGlow(g, b.x, b.y + SMALL_H / 2, 14, 0.5 + phase * 0.5, '#fff3a6')
      drawTempleBell(g, b.x, b.y, SMALL_H, Math.round(b.swing), b.flash)
      if (b.rung) {
        // little red ribbon tied on the rung bells
        g.px(b.x - 1, b.y - 2, '#ff6f91')
        g.px(b.x + 1, b.y - 2, '#ff6f91')
        g.px(b.x, b.y - 1, '#e8514a')
      }
      if (b === target) drawBeatCue(g, b.x, b.y + SMALL_H / 2 + 1, phase, 8)
    }
    // the player with the long striker
    const pose = this.hitT > 0.12 ? 'bell_hit' : this.hitT > 0 ? 'bell_up' : 'bell_ready'
    const moving = Math.abs(this.targetX - this.px) > 2
    this.critters.render(g)
    this.crowd.render(g)
    const pl = drawPlayer(g, this.look, pose, 'back', Math.round(this.px), this.footY, { flip: this.flip, bob: moving ? -1 : 0 })

    const [hx, hy] = handAt(pl, -1)
    const b = this.hitBell
    if (this.hitT > 0 && b) {
      const tx = b.x + Math.round(b.swing) + (this.flip ? 3 : -3)
      const ty = b.y + SMALL_H - 3
      drawStriker(g, hx, hy, tx, ty, 1)
      if (this.hitT > 0.16) {
        g.alpha(0.6)
        g.line(tx - (this.flip ? -6 : 6), ty + 6, tx, ty, '#ffffff')
        g.alpha(1)
      }
    } else {
      const d = this.flip ? -1 : 1
      drawStriker(g, hx, hy, hx + 7 * d, hy - 30, 1)
    }
  }
  private renderBig(g: Surface) {
    const b = this.bells[0]
    const beamY = b.y - 14
    // rope from the beam to the crown
    g.vline(b.x, beamY, b.y, '#6e4a35')
    softGlow(g, b.x, b.y + BIG_H / 2, 40, 0.3 + b.flash * 0.8, '#ffe7a0')
    drawTempleBell(g, b.x, b.y, BIG_H, Math.round(b.swing), b.flash, true)
    // the hanging log striker
    const x0 = b.x + Math.round(BIG_H * 0.45) + this.logRest + Math.round(this.logOff)
    const len = 26
    const ly = this.logY
    const ropeX = [x0 + 6, x0 + len - 6]
    for (const rx of ropeX) g.line(rx - Math.round(this.logOff * 0.3), beamY, rx, ly - 3, '#6e4a35')
    g.rect(x0, ly - 3, len, 7, '#8a5a32')
    g.rect(x0, ly - 3, len, 2, '#b8844a')
    g.rect(x0, ly + 3, len, 1, '#5a3a26')
    g.ellipse(x0, ly, 2.5, 3.5, '#6e4a35')
    g.ellipse(x0, ly, 1.5, 2.2, '#c28e5c')
    // the player gripping the tail rope
    const pose = this.pushT > 0 ? 'log_push' : this.charge > 0 ? 'log_pull' : 'log_hold'
    const pxX = Math.round(Math.min(this.w - 18, x0 + len + 13))
    this.critters.render(g)
    this.crowd.render(g)
    const pl = drawPlayer(g, this.look, pose, 'front', pxX, this.footY, { t: this.t })

    const [hx, hy] = handAt(pl, 1)
    g.line(x0 + len, ly, hx, hy, '#c28e5c')
    g.line(x0 + len, ly + 1, hx, hy + 1, '#8a5a32')
    if (this.charge > 0) {
      // power arc over the player
      const n = Math.round(this.charge * 10)
      for (let i = 0; i < 10; i++) g.rect(pxX - 15 + i * 3, this.footY - 60, 2, 3, i < n ? (this.charge > 0.85 ? '#ff6f91' : '#ffd54f') : 'rgba(0,0,0,0.25)')
    }
  }
}

export function BellsActivity({ req }: { req: ActivityRequest }) {
  const big = !!req.params?.big
  const look = game.value.player.look
  const { host, scene, stage } = useStage(() => new BellScene(big, look), { targetWidth: 160 })
  const [rung, setRung] = useState(0)
  const [rounds, setRounds] = useState(0)
  const [merit, setMerit] = useState(0)
  const [combo, setCombo] = useState(0)
  const [result, setResult] = useState<TempleResultData | null>(null)
  const hold = useRef<number | null>(null)
  const [charge, setCharge] = useState(0)
  const best = useRef(0)
  const hits = useRef(0)
  const strongest = useRef(0)

  useEffect(() => {
    const sc = scene.current
    if (!sc) return
    sc.onRing = (b, grade, power) => {
      const m = addMerit(big ? 3 : 1, { key: big ? 'bigbell' : 'bell', free: big ? 9 : 27, area: big ? 'mountain' : 'wat' })
      track('bell')
      setMerit((x) => x + m)
      sc.particles.popText(b.x, b.y - 6, `+${m}`)
      hits.current++
      if (big) {
        strongest.current = Math.max(strongest.current, power)
        const word = power > 0.85 ? 'ก้องทั้งดอย!' : power > 0.5 ? 'ดังกังวาน!' : 'เบาไปนิด'
        praise(stage.current, sc.w * 0.4, sc.h * 0.2, word, power > 0.5 ? 'gold' : 'white', power > 0.85)
        return
      }
      // combo: striking the lit bell in order, on the beat
      setCombo((c) => {
        const n = grade === 'perfect' || grade === 'good' ? c + 1 : 0
        best.current = Math.max(best.current, n)
        const word = comboPraise(n)
        if (word) {
          praise(stage.current, b.x, b.y - 10, word, 'gold')
          tsfx.praise()
        } else if (grade === 'perfect') {
          praise(stage.current, b.x, b.y - 10, 'ตรงจังหวะ!', 'gold')
          if (n >= 2) tsfx.combo(n)
        }
        return n
      })
      const n = sc.bells.filter((x) => x.rung).length
      setRung(n)
      if (n === sc.bells.length) {
        const bonus = addMerit(5, { key: 'bell_round', free: 3 })
        track('bell_round')
        setMerit((x) => x + bonus)
        setRounds((r) => r + 1)
        sfx.chime()
        sc.particles.confetti(sc.w / 2, sc.h * 0.5, 40)
        banner(stage.current, 'ครบ ๙ ใบ!', 'gold')
        sc.crowd.cheer('happy', 1.6)
        setTimeout(() => {
          for (const x of sc.bells) x.rung = false
          setRung(0)
        }, 900)
      }
    }
  }, [scene.current])

  const startCharge = () => {
    if (hold.current) return
    hold.current = window.setInterval(() => {
      const sc = scene.current
      if (!sc || sc.swinging) return
      sc.charge = Math.min(1, sc.charge + 0.035)
      setCharge(sc.charge)
      if (Math.random() < 0.3) tsfx.step(1)
    }, 40)
  }
  const release = () => {
    if (hold.current) clearInterval(hold.current)
    hold.current = null
    scene.current?.releaseLog()
    setCharge(0)
  }

  const close = () => {
    if (merit > 0) {
      const stars: Stars = big
        ? (((hits.current >= 1 ? 1 : 0) + (strongest.current > 0.85 ? 1 : 0) + (hits.current >= 3 ? 1 : 0)) as Stars)
        : (((rounds >= 1 ? 1 : 0) + (best.current >= 5 ? 1 : 0) + (best.current >= 9 || rounds >= 3 ? 1 : 0)) as Stars)
      setResult({
        title: big ? 'เสียงระฆังใหญ่ก้องทั่วดอย' : 'เสียงระฆังดังกังวาน',
        merit,
        icon: 'bell',
        stars,
        lines: [big ? `ตีระฆัง ${hits.current} ครั้ง` : `ครบแถว ${rounds} รอบ · คอมโบสูงสุด x${best.current}`, 'ขอให้ชื่อเสียงดีงามดังไกลเหมือนเสียงระฆัง'],
      })
    } else closeActivity()
  }

  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title={big ? 'ตีระฆังใหญ่บนดอย' : 'ตีระฆัง ๙ ใบ'} onClose={close} />
      <PraiseLayer />
      {!result && !big && <StatusPill text={`ระฆัง ${rung}/9`} dots={9} on={rung} />}
      {!result && !big && <ComboBadge n={combo} />}
      {!result && (
        <div class="act-bottom">
          <div class="panel act-tip">
            {big ? (
              <>
                <div class="subtitle">ดึงซุงตีระฆังไปด้านหลัง แล้วปล่อย</div>
                <div class="small muted">กดค้างเพื่อดึง ยิ่งดึงสุด เสียงยิ่งดัง · +{merit} บุญ</div>
                <button
                  class="btn big green block hold-btn tg-hold"
                  style={{ ['--charge' as string]: `${charge * 100}%` }}
                  onPointerDown={startCharge}
                  onPointerUp={release}
                  onPointerLeave={release}
                  onPointerCancel={release}
                >
                  <ChargeFill p={charge} />
                  <span>{charge > 0.85 ? 'สุดแรง! ปล่อยเลย' : 'กดค้าง แล้วปล่อย'}</span>
                </button>
              </>
            ) : (
              <>
                <div class="subtitle">ตีระฆังที่มีวงแสง ให้ตรงจังหวะ</div>
                <div class="small muted">
                  ครบแถว {rounds} รอบ · +{merit} บุญ
                </div>
              </>
            )}
            <Btn tone="paper" block onClick={close}>
              เสร็จแล้ว
            </Btn>
          </div>
        </div>
      )}
      {result && <TempleResult r={result} onDone={closeActivity} />}
    </div>
  )
}

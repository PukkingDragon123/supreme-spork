// ตักน้ำมนต์ – dip the coconut ladle into the dragon jar and lift it out
// just full, then pour the holy water over your head for a blessing
// (สิริมงคล) that boosts merit for a while.

import { useRef, useState } from 'preact/hooks'
import type { Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles, drawRing } from '../engine/particles'
import { rand } from '../engine/rng'
import type { AvatarLook } from '../art/avatar'
import { P } from '../art/palette'
import { drawLadle, drawPlayer, godRays, handAt, Juice, lightPool, motes, softGlow, vignette } from '../art/minigames/temple'
import { Critters, Crowd } from '../art/minigames/scenery'
import { fillStars } from '../art/minigames/rules'
import { tsfx } from '../art/minigames/sfx'
import { game } from '../game/state'
import { addBuff, addMerit, track } from '../game/actions'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, useStage } from './kit'
import { sfx, haptic } from '../engine/audio'
import { drawCandle } from '../art/interior'
import { Meter, PraiseLayer, TempleResult, banner, praise, type TempleResultData } from './temple-ui'

const MAX = 1.2
const LO = 0.8
const HI = 1.05

class HolyScene implements Scene {
  w = 160
  h = 320
  t = 0
  mode: 'scoop' | 'bless' = 'scoop'
  dip = 0
  fill = 0
  holding = false
  blessT = 0
  particles = new Particles()
  juice = new Juice()
  private bg: HTMLCanvasElement | null = null
  critters = new Critters()
  crowd = new Crowd()
  private lifeInit = false
  private blessBg: HTMLCanvasElement | null = null
  constructor(public look: AvatarLook) {}
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
    this.blessBg = null
    if (!this.lifeInit) {
      this.lifeInit = true
      this.crowd.add({ monk: 'monk', x: 22, y: this.footY - 14 })
      this.critters.cat(w - 18, this.footY + 8, '#f5a55a', 'sleep').bird(Math.round(w * 0.5), 20, 'sparrow')
    }
  }
  get footY() {
    return Math.round(this.h * 0.77)
  }
  get playerX() {
    return Math.round(this.w * 0.3)
  }
  get jarX() {
    return Math.round(this.w * 0.64)
  }
  get jarY() {
    return this.footY - 66
  }
  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    const cx = this.jarX
    const jy = this.jarY
    this.bg = bake(w, h, (g) => {
      g.gradientV(0, 0, w, h, ['#fff1d6', '#f3dcb2', '#e0bb8a'])
      // Pavilion roof and posts.
      g.rect(0, 0, w, 16, '#c0392b')
      for (let y = 2; y < 16; y += 3) g.hline(0, w - 1, y, '#a8313f')
      g.rect(0, 16, w, 3, P.gold)
      for (let x = 4; x < w; x += 9) g.rect(x, 19, 3, 4, P.goldD)
      g.rect(4, 19, 8, this.footY - 19, '#fffaf0')
      g.rect(w - 12, 19, 8, this.footY - 19, '#fffaf0')
      g.rect(10, 19, 2, this.footY - 19, '#e3d8c6')
      // Floor tiles.
      g.rect(0, this.footY - 10, w, h, '#e4ddd6')
      for (let y = this.footY - 6, k = 0; y < h; y += 5 + k, k++) g.hline(0, w - 1, y, '#d2c9c3')
      for (let i = -6; i <= 6; i++) g.line(w / 2 + i * 12, this.footY - 10, w / 2 + i * 30, h, '#d8cfc9')
      // Dragon jar body.
      g.ellipse(cx, jy + 38, 40, 46, '#6e3f27')
      g.ellipse(cx - 3, jy + 36, 37, 43, '#8a5230')
      g.ellipse(cx - 16, jy + 22, 8, 16, '#a8683f')
      g.ellipse(cx, this.footY - 10, 30, 4, 'rgba(60,30,20,0.3)')
      // Dragon motif.
      for (let i = 0; i <= 36; i++) {
        const x = cx - 30 + i * 1.7
        const y = jy + 36 + Math.sin(i * 0.45) * 5
        g.rect(x, y, 2, 2, P.gold)
        if (i % 6 === 0) g.px(x, y - 2, P.goldL)
      }
      g.circle(cx + 30, jy + 32, 3, P.gold)
      g.px(cx + 31, jy + 31, P.redD)
      // Rim and water surface.
      g.ellipse(cx, jy, 32, 8, '#5a3322')
      g.ellipse(cx, jy, 29, 6, P.waterD)
      g.ellipse(cx - 3, jy - 1, 21, 4, P.water)
      // A white sai sin thread tied around the rim (it's been blessed).
      g.hline(cx - 30, cx + 30, jy + 5, '#fffaf0')
    })
    return this.bg
  }
  private blessBackground() {
    if (this.blessBg) return this.blessBg
    const { w, h } = this
    this.blessBg = bake(w, h, (g) => {
      g.gradientV(0, 0, w, h, ['#fff7e0', '#ffe3b0', '#ffd09a'])
      g.rect(0, this.footY - 10, w, h, '#f0d2a8')
      for (let y = this.footY - 6, k = 0; y < h; y += 5 + k, k++) g.hline(0, w - 1, y, '#e3c092')
    })
    return this.blessBg
  }
  update(rawDt: number) {
    const dt = this.juice.step(rawDt)
    this.t += dt
    const target = this.holding ? 1 : 0
    this.dip += (target - this.dip) * Math.min(1, dt * 8)
    if (this.holding && this.dip > 0.6) {
      this.fill = Math.min(1.25, this.fill + dt * 0.55)
      if (Math.random() < dt * 8) this.particles.add({ kind: 'ripple', x: this.jarX - 6 + rand(-4, 4), y: this.jarY, max: 0.5, size: 5, color: '#d4f5fa' })
    }
    if (this.mode === 'bless') {
      this.blessT += dt
      const [lx, ly] = this.ladleTip()
      if (this.blessT > 0.5 && this.blessT < 2.6)
        for (let i = 0; i < 3; i++)
          this.particles.add({ kind: 'drop', x: lx + rand(-5, 5), y: ly + 3, vx: rand(-10, 10), vy: rand(30, 60), g: 160, max: 0.5, color: '#9fe3f2', color2: '#e6fbff', size: 2 })
      if (this.blessT > 0.5 && Math.random() < dt * 8) tsfx.drip(Math.floor(this.t * 10))
      if (Math.random() < dt * 14) this.particles.sparkles(this.w / 2 + rand(-24, 24), this.footY - 50 + rand(-40, 30), 1, '#fff3a6')
    } else if (Math.random() < dt * 2) {
      this.particles.add({ kind: 'ripple', x: this.jarX + rand(-16, 16), y: this.jarY + rand(-2, 2), max: 1, size: 5, color: '#d4f5fa' })
    }
    motes(this.particles, dt, this.w, this.footY, 2, '#fff3a6')
    this.critters.update(dt, this.w)
    this.crowd.update(dt)
    this.particles.update(dt)
  }
  spill() {
    for (let i = 0; i < 18; i++)
      this.particles.add({ kind: 'drop', x: this.ladleBowl()[0] + rand(-4, 4), y: this.ladleBowl()[1] - 2, vx: rand(-24, 24), vy: rand(-40, 0), g: 160, max: 0.8, color: '#9fe3f2', size: 1 })
    tsfx.splash()
    this.juice.shake(0.2)
  }
  private tip: [number, number] = [0, 0]
  /** Bowl of the ladle while scooping. */
  private ladleBowl(): [number, number] {
    const bx = this.jarX - 8
    const by = Math.round(this.jarY - 22 + this.dip * 24)
    return [bx, by]
  }
  private ladleTip(): [number, number] {
    return this.tip
  }
  render(g: Surface) {
    const { w, h } = this
    this.juice.begin(g)
    if (this.mode === 'bless') {
      g.draw(this.blessBackground(), 0, 0)
      godRays(g, w / 2, this.footY - 110, h * 0.7, this.t, '#fffbe8', 0.12, 10)
      softGlow(g, w / 2, this.footY - 50, 60, 0.9, '#fff3c4')
      const pose = this.blessT > 2.8 ? 'wai' : 'pour_head'
      const pl = drawPlayer(g, this.look, pose, 'front', Math.round(w / 2), this.footY, { scale: 2, t: this.t, barefoot: true })
      if (pose === 'pour_head') {
        const [hx, hy] = handAt(pl, -1)
        // ladle tipped over the head
        const tilt = Math.min(1, this.blessT / 0.5)
        const bx = Math.round(hx - 8 - tilt * 4)
        const by = Math.round(pl.y + 6 - tilt * 2)
        drawLadle(g, hx, hy, bx, by, Math.max(0, this.fill * (1 - (this.blessT - 0.5) / 2)), this.t, 1.6)
        this.tip = [bx - 6, by + 2]
        if (this.blessT > 0.5 && this.blessT < 2.6) for (let y = by + 3; y < pl.y + 30; y += 2) g.px(bx - 6 + Math.round(Math.sin(y + this.t * 30)), y, y % 2 ? '#9fe3f2' : '#e6fbff')
      }
      this.particles.render(g)
      this.juice.end(g)
      return
    }
    g.draw(this.background(), 0, 0)
    lightPool(g, this.jarX - 20, this.footY, 60, '#ffe7a0', 0.7)
    // Floating petals.
    for (let i = 0; i < 5; i++) {
      const px = this.jarX - 18 + i * 9 + Math.sin(this.t + i) * 2
      const py = this.jarY - 1 + Math.cos(this.t * 0.8 + i) * 1.5
      g.px(px, py, i % 2 ? '#ff9fc0' : '#fffaf0')
      g.px(px + 1, py, i % 2 ? '#ffc4d8' : '#fff1d6')
    }
    // A candle on the rim for making holy water.
    drawCandle(g, this.jarX + 24, this.jarY - 4, 12, this.t)
    softGlow(g, this.jarX + 24, this.jarY - 18, 10, 0.8)
    if (this.dip > 0.5) drawRing(g, this.jarX - 8, this.jarY, 10 + Math.sin(this.t * 6) * 2, 3, '#d4f5fa')
    // The player reaching into the jar with the ladle.
    const pose = this.dip > 0.45 ? 'ladle_dip' : 'ladle_up'
    this.critters.render(g)
    this.crowd.render(g)
    const pl = drawPlayer(g, this.look, pose, 'back', this.playerX, this.footY, { scale: 2, bob: this.dip > 0.45 ? 1 : 0 })
    const [hx, hy] = handAt(pl, -1)
    const [bx, by] = this.ladleBowl()
    drawLadle(g, hx, hy, bx, by, this.fill, this.t, 1.4)
    if (this.fill >= LO && this.fill <= HI) softGlow(g, bx, by - 2, 10, 0.8, '#fff3a6')
    this.particles.render(g)
    vignette(g, '#3a2418', 0.35)
    this.juice.end(g)
  }
}

export function HolyWaterActivity({ req }: { req: ActivityRequest }) {
  const look = game.value.player.look
  const { host, scene, stage } = useStage(() => new HolyScene(look), { targetWidth: 160 })
  const [fill, setFill] = useState(0)
  const [step, setStep] = useState<'scoop' | 'ready' | 'bless'>('scoop')
  const [perfect, setPerfect] = useState(false)
  const [result, setResult] = useState<TempleResultData | null>(null)
  const timer = useRef<number | null>(null)
  void req

  const start = () => {
    const sc = scene.current
    if (!sc || step !== 'scoop') return
    sc.holding = true
    tsfx.splash()
    if (timer.current) return
    timer.current = window.setInterval(() => {
      setFill(sc.fill)
      if (sc.fill > 1.18) {
        sc.spill()
        praise(stage.current, sc.jarX - 8, sc.jarY - 40, 'ล้นแล้ว!', 'pink')
        sc.fill = 0.7
        sc.holding = false
        stopTimer()
        setFill(0.7)
      }
    }, 50)
  }
  const stopTimer = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
  }
  const end = () => {
    const sc = scene.current
    if (!sc || !sc.holding) return
    sc.holding = false
    stopTimer()
    setFill(sc.fill)
    if (sc.fill >= 0.4) {
      const p = sc.fill >= LO && sc.fill <= HI
      setPerfect(p)
      setStep('ready')
      sfx.splash()
      if (p) {
        sfx.sparkle()
        praise(stage.current, sc.jarX - 8, sc.jarY - 40, 'เต็มพอดี!', 'gold')
        sc.particles.sparkles(sc.jarX - 8, sc.jarY - 24, 12)
      }
    }
  }
  const bless = () => {
    const sc = scene.current
    if (!sc) return
    sc.mode = 'bless'
    setStep('bless')
    sfx.pour(1.4)
    haptic(30)
    setTimeout(() => sfx.chime(), 900)
    setTimeout(() => banner(stage.current, 'ร่มเย็นเป็นสุข', 'gold'), 1200)
    setTimeout(() => {
      const m = addMerit(8 + (perfect ? 2 : 0), { key: 'holy_water', free: 3 })
      track('holy_water')
      addBuff('merit', 1.1, 30, 'holy_water')
      setResult({
        title: 'รับน้ำมนต์เสริมสิริมงคล',
        merit: m,
        icon: 'vessel',
        stars: fillStars(sc.fill, LO, HI),
        pose: 'wai',
        lines: ['ได้รับพร “สิริมงคล” บุญ +10% นาน 30 นาที', perfect ? 'ตักน้ำมนต์เต็มกระบวยพอดี!' : 'ขอให้ร่มเย็นเป็นสุข'],
      })
    }, 3400)
  }

  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title="ตักน้ำมนต์" onClose={closeActivity} />
      <PraiseLayer />
      {!result && (
        <div class="act-bottom">
          <div class="panel act-tip">
            {step === 'scoop' && (
              <>
                <div class="subtitle">จุ่มกระบวยลงในโอ่งน้ำมนต์</div>
                <div class="small muted">กดค้างเพื่อตัก ปล่อยเมื่อน้ำอยู่ในช่องสีทอง ระวังล้น!</div>
                <Meter fill={fill} max={MAX} lo={LO} hi={HI} tone="water" />
                <button class="btn big green block" style={{ touchAction: 'none' }} onPointerDown={start} onPointerUp={end} onPointerLeave={end} onPointerCancel={end}>
                  กดค้าง ตักน้ำมนต์
                </button>
              </>
            )}
            {step === 'ready' && (
              <>
                <div class="subtitle">{perfect ? 'เต็มกระบวยพอดี!' : 'ได้น้ำมนต์แล้ว'}</div>
                <div class="small muted">ตั้งจิตให้สงบ แล้วรดน้ำมนต์เพื่อความเป็นสิริมงคล</div>
                <button class="btn big green block" onClick={bless}>
                  รดน้ำมนต์
                </button>
              </>
            )}
            {step === 'bless' && <div class="subtitle">ขอให้แคล้วคลาดปลอดภัย ร่มเย็นเป็นสุข...</div>}
          </div>
        </div>
      )}
      {result && <TempleResult r={result} onDone={closeActivity} />}
    </div>
  )
}

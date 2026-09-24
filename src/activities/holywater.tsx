// ตักน้ำมนต์ – scoop holy water from the dragon jar, then sprinkle yourself
// for a blessing (สิริมงคล) that boosts merit for a while.

import { useRef, useState } from 'preact/hooks'
import type { Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles, drawRing } from '../engine/particles'
import { rand } from '../engine/rng'
import { avatarSprite, type AvatarLook } from '../art/avatar'
import { P } from '../art/palette'
import { game } from '../game/state'
import { addBuff, addMerit, track } from '../game/actions'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, ResultCard, useStage, type ResultData } from './kit'
import { sfx, haptic } from '../engine/audio'
import { drawGlow } from '../scenes/sky'
import { drawCandle } from '../art/interior'

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
  private bg: HTMLCanvasElement | null = null
  constructor(public look: AvatarLook) {}
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
  }
  get jarY() {
    return Math.round(this.h * 0.56)
  }
  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    const cx = Math.round(w / 2)
    const jy = this.jarY
    this.bg = bake(w, h, (g) => {
      g.gradientV(0, 0, w, h, ['#fff1d6', '#f3dcb2', '#e0bb8a'])
      // Pavilion posts.
      g.rect(4, 0, 8, h * 0.8, '#fffaf0')
      g.rect(w - 12, 0, 8, h * 0.8, '#fffaf0')
      g.rect(0, h * 0.8, w, h * 0.2, '#e4ddd6')
      for (let x = 0; x < w; x += 10) g.vline(x, h * 0.8, h - 1, '#d2c9c3')
      // Dragon jar body.
      g.ellipse(cx, jy + 50, 48, 56, '#6e3f27')
      g.ellipse(cx - 3, jy + 48, 44, 52, '#8a5230')
      g.ellipse(cx - 18, jy + 30, 10, 18, '#a8683f')
      g.rect(cx - 54, h * 0.8, 108, h, '#e4ddd6')
      // Dragon motif.
      for (let i = 0; i <= 40; i++) {
        const x = cx - 36 + i * 1.8
        const y = jy + 44 + Math.sin(i * 0.45) * 6
        g.rect(x, y, 2, 2, P.gold)
        if (i % 6 === 0) g.px(x, y - 2, P.goldL)
      }
      g.circle(cx + 36, jy + 40, 3, P.gold)
      g.px(cx + 37, jy + 39, P.redD)
      // Rim and water surface.
      g.ellipse(cx, jy, 40, 10, '#5a3322')
      g.ellipse(cx, jy, 36, 8, P.waterD)
      g.ellipse(cx - 4, jy - 1, 26, 5, P.water)
    })
    return this.bg
  }
  update(dt: number) {
    this.t += dt
    const target = this.holding ? 1 : 0
    this.dip += (target - this.dip) * Math.min(1, dt * 8)
    if (this.holding && this.dip > 0.6) this.fill = Math.min(1.25, this.fill + dt * 0.55)
    if (this.mode === 'bless') {
      this.blessT += dt
      if (this.blessT < 2.5)
        for (let i = 0; i < 3; i++)
          this.particles.add({ kind: 'drop', x: this.w / 2 + rand(-22, 22), y: this.h * 0.2 + rand(-10, 10), vy: rand(50, 90), g: 80, max: 0.9, color: '#9fe3f2', color2: '#e6fbff', size: 2 })
      if (Math.random() < dt * 12) this.particles.sparkles(this.w / 2 + rand(-24, 24), this.h * 0.45 + rand(-30, 30), 1, '#fff3a6')
    } else if (Math.random() < dt * 2) {
      this.particles.add({ kind: 'ripple', x: this.w / 2 + rand(-20, 20), y: this.jarY + rand(-2, 2), max: 1, size: 5, color: '#d4f5fa' })
    }
    this.particles.update(dt)
  }
  spill() {
    for (let i = 0; i < 16; i++)
      this.particles.add({ kind: 'drop', x: this.w / 2 + 18 + rand(-4, 4), y: this.jarY - 30, vx: rand(-20, 20), vy: rand(-30, 10), g: 160, max: 0.8, color: '#9fe3f2', size: 1 })
    sfx.splash()
  }
  render(g: Surface) {
    const { w, h } = this
    const cx = Math.round(w / 2)
    if (this.mode === 'bless') {
      g.gradientV(0, 0, w, h, ['#fff7e0', '#ffe3b0', '#ffd09a'])
      drawGlow(g, cx, h * 0.5, 60, 0.9, '#fff3c4')
      const s = avatarSprite(this.look, 'front', this.blessT > 0.4 ? 'wai' : 'stand')
      g.drawScaled(s.canvas, Math.round(cx - s.w * 1.5), Math.round(h * 0.78 - s.h * 3), 3)
      // Holy-water whisk above.
      g.rect(cx - 2, h * 0.08, 4, 18, '#c9a04c')
      for (let i = -3; i <= 3; i++) g.line(cx, h * 0.08 + 18, cx + i * 3, h * 0.08 + 30, '#e8d9a8')
      this.particles.render(g)
      return
    }
    g.draw(this.background(), 0, 0)
    // Floating petals.
    for (let i = 0; i < 5; i++) {
      const px = cx - 22 + i * 11 + Math.sin(this.t + i) * 2
      const py = this.jarY - 2 + Math.cos(this.t * 0.8 + i) * 1.5
      g.px(px, py, i % 2 ? '#ff9fc0' : '#fffaf0')
      g.px(px + 1, py, i % 2 ? '#ffc4d8' : '#fff1d6')
    }
    // A candle on the rim for making holy water.
    drawCandle(g, cx - 30, this.jarY - 6, 14, this.t)
    drawGlow(g, cx - 30, this.jarY - 22, 10, 0.8)
    // Coconut ladle (กระบวย).
    const lx = cx + 14
    const ly = Math.round(this.jarY - 40 + this.dip * 36)
    g.line(lx + 10, ly - 30, lx + 2, ly, '#8a5a32')
    g.line(lx + 11, ly - 30, lx + 3, ly, '#b8844a')
    g.ellipse(lx, ly + 4, 9, 6, '#6e4a35')
    g.ellipse(lx, ly + 2, 8, 4, '#8a5a32')
    const f = Math.min(1, this.fill)
    if (f > 0) g.ellipse(lx, ly + 2, 7 * f, 3 * f, P.water)
    if (this.dip > 0.5) drawRing(g, lx, this.jarY, 10 + Math.sin(this.t * 6) * 2, 3, '#d4f5fa')
    this.particles.render(g)
  }
}

export function HolyWaterActivity({ req }: { req: ActivityRequest }) {
  const look = game.value.player.look
  const { host, scene } = useStage(() => new HolyScene(look), { targetWidth: 160 })
  const [fill, setFill] = useState(0)
  const [step, setStep] = useState<'scoop' | 'ready' | 'bless'>('scoop')
  const [perfect, setPerfect] = useState(false)
  const [result, setResult] = useState<ResultData | null>(null)
  const timer = useRef<number | null>(null)
  void req

  const start = () => {
    const sc = scene.current
    if (!sc || step !== 'scoop') return
    sc.holding = true
    if (timer.current) return
    timer.current = window.setInterval(() => {
      setFill(sc.fill)
      if (sc.fill > 1.18) {
        sc.spill()
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
      const p = sc.fill >= 0.8 && sc.fill <= 1.05
      setPerfect(p)
      setStep('ready')
      sfx.splash()
      if (p) sfx.sparkle()
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
    setTimeout(() => {
      const m = addMerit(8 + (perfect ? 2 : 0), { key: 'holy_water', free: 3 })
      track('holy_water')
      addBuff('merit', 1.1, 30, 'holy_water')
      setResult({ title: 'รับน้ำมนต์เสริมสิริมงคล', merit: m, icon: 'vessel', lines: ['ได้รับพร “สิริมงคล” บุญ +10% นาน 30 นาที', perfect ? 'ตักน้ำมนต์เต็มกระบวยพอดี!' : 'ขอให้ร่มเย็นเป็นสุข'] })
    }, 2600)
  }

  const pct = Math.min(100, (fill / 1.2) * 100)
  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title="ตักน้ำมนต์" onClose={closeActivity} />
      {!result && (
        <div class="act-bottom">
          <div class="panel act-tip">
            {step === 'scoop' && (
              <>
                <div class="subtitle">จุ่มกระบวยลงในโอ่งน้ำมนต์</div>
                <div class="small muted">กดค้างเพื่อตัก ปล่อยเมื่อน้ำอยู่ในช่องสีทอง ระวังล้น!</div>
                <div class="h-meter">
                  <span class="h-zone" />
                  <span class="h-fill" style={{ width: `${pct}%` }} />
                </div>
                <button class="btn big green block" style={{ touchAction: 'none' }} onPointerDown={start} onPointerUp={end} onPointerLeave={end} onPointerCancel={end}>
                  กดค้าง ตักน้ำมนต์
                </button>
              </>
            )}
            {step === 'ready' && (
              <>
                <div class="subtitle">{perfect ? 'เต็มกระบวยพอดี!' : 'ได้น้ำมนต์แล้ว'}</div>
                <div class="small muted">ตั้งจิตให้สงบ แล้วประพรมน้ำมนต์เพื่อความเป็นสิริมงคล</div>
                <button class="btn big green block" onClick={bless}>
                  ประพรมน้ำมนต์
                </button>
              </>
            )}
            {step === 'bless' && <div class="subtitle">ขอให้แคล้วคลาดปลอดภัย ร่มเย็นเป็นสุข...</div>}
          </div>
        </div>
      )}
      {result && <ResultCard r={result} onDone={closeActivity} />}
    </div>
  )
}

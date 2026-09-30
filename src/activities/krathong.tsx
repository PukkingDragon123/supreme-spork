// ลอยกระทง – decorate a banana-leaf krathong, light it, kneel at the river
// steps and raise it for your wish, then set it on the water and push it off
// to float away under the fireworks.

import { useState } from 'preact/hooks'
import type { Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import { P } from '../art/palette'
import type { AvatarLook } from '../art/avatar'
import { drawKrathong, drawPlayer, handAt, Juice, softGlow, vignette, type TPose } from '../art/minigames/temple'
import { tsfx } from '../art/minigames/sfx'
import { game } from '../game/state'
import { addMerit, count, recordWish, track, useItem } from '../game/actions'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, useStage } from './kit'
import { QuickBuy } from './quickbuy'
import { Btn, Icon } from '../ui/components/common'
import { sfx, haptic, synth } from '../engine/audio'
import { drawSky } from '../scenes/sky'
import { PraiseLayer, StatusPill, TempleResult, banner, type TempleResultData } from './temple-ui'

const FLOWERS = [
  { id: 'pink', name: 'ดอกบัวชมพู', c: '#ff9fc0', d: '#e8709e' },
  { id: 'gold', name: 'ดาวเรืองทอง', c: '#ffd23f', d: '#f58f35' },
  { id: 'white', name: 'มะลิขาว', c: '#fffaf0', d: '#e6dccb' },
]

interface Floater {
  x: number
  y: number
  s: number
  c: string
  ph: number
}

type Stage = 'make' | 'light' | 'wish' | 'float'

class RiverScene implements Scene {
  w = 160
  h = 320
  t = 0
  flower = FLOWERS[0]
  lit = false
  step: Stage = 'make'
  launched = -1
  particles = new Particles()
  juice = new Juice()
  others: Floater[] = []
  lanterns: { x: number; y: number; ph: number }[] = []
  private bg: HTMLCanvasElement | null = null
  constructor(public look: AvatarLook) {}
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
    if (!this.others.length)
      for (let i = 0; i < 9; i++) this.others.push({ x: rand(10, w - 10), y: rand(h * 0.32, h * 0.6), s: rand(0.4, 1), c: FLOWERS[i % 3].c, ph: rand(0, 6) })
  }
  get waterY() {
    return Math.round(this.h * 0.28)
  }
  get bankY() {
    return Math.round(this.h * 0.7)
  }
  get footY() {
    return this.bankY + 12
  }
  get playerX() {
    return Math.round(this.w * 0.36)
  }
  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    const wy = this.waterY
    const by = this.bankY
    this.bg = bake(w, h, (g) => {
      // Far bank with a temple silhouette and lantern lights.
      g.rect(0, wy - 16, w, 16, '#1d2048')
      g.poly([[w * 0.55, wy - 16], [w * 0.68, wy - 34], [w * 0.81, wy - 16]], '#262a5c')
      g.rect(w * 0.62, wy - 22, w * 0.12, 6, '#262a5c')
      g.rect(w * 0.675, wy - 44, 2, 12, '#262a5c')
      g.poly([[w * 0.08, wy - 16], [w * 0.16, wy - 28], [w * 0.24, wy - 16]], '#232757')
      for (let x = 6; x < w; x += 12) g.px(x, wy - 8, '#ffcf7a')
      // Water.
      g.gradientV(0, wy, w, by - wy + 8, ['#1f2a5e', '#243a78', '#2f4f8f'], 8)
      for (let y = wy + 4; y < by; y += 4) for (let x = (y * 5) % 13; x < w; x += 17) g.rect(x, y, 5, 1, '#3a5a9a')
      // Near bank: stone steps down to the water.
      g.rect(0, by, w, h - by, '#8c8187')
      g.rect(0, by, w, 2, '#bdb2ae')
      g.rect(0, by + 2, w, 1, '#6d6478')
      for (let y = by + 8; y < h; y += 7) {
        g.hline(0, w - 1, y, '#6d6478')
        g.hline(0, w - 1, y + 1, '#a89c9a')
      }
      // Bank posts with little lamps.
      for (const x of [6, w - 8]) {
        g.rect(x, by - 18, 3, 20, '#5a4a5a')
        g.rect(x - 2, by - 22, 7, 5, '#ffcf7a')
        g.rect(x - 2, by - 23, 7, 1, '#3a2838')
      }
    })
    return this.bg
  }
  launch() {
    this.launched = 0
    this.step = 'float'
  }
  update(rawDt: number) {
    const dt = this.juice.step(rawDt)
    this.t += dt
    for (const o of this.others) {
      o.x += Math.sin(this.t * 0.3 + o.ph) * 0.04
      o.y -= dt * 0.8
      if (o.y < this.waterY + 6) o.y = this.h * 0.62
    }
    // Sky lanterns (โคมลอย) drifting up now and then.
    if (Math.random() < dt * 0.35) this.lanterns.push({ x: rand(10, this.w - 10), y: this.waterY - 10, ph: rand(0, 6) })
    for (const l of this.lanterns) l.y -= dt * 8
    this.lanterns = this.lanterns.filter((l) => l.y > -10)
    if (this.launched >= 0) {
      const before = this.launched
      this.launched += dt
      if (before < 0.55 && this.launched >= 0.55) {
        const [x, y] = this.pos()
        this.particles.add({ kind: 'ripple', x, y, max: 1.2, size: 16, color: '#9fd0ff' })
        for (let i = 0; i < 6; i++) this.particles.add({ kind: 'drop', x, y, vx: rand(-20, 20), vy: rand(-30, -10), g: 120, max: 0.5, color: '#bfe6f2' })
        tsfx.splash()
        this.juice.shake(0.12)
      }
      // Fireworks over the far bank once it's on its way.
      if (this.launched > 1.4 && this.launched < 5 && Math.random() < dt * 1.3) this.firework()
    }
    if (this.lit && Math.random() < dt * 5) {
      const [x, y] = this.pos()
      this.particles.add({ kind: 'smoke', x: x + rand(-2, 2), y: y - 16, vx: rand(-1, 1), vy: rand(-8, -4), max: 2, color: '#c9cff0' })
    }
    this.particles.update(dt)
  }
  private firework() {
    const x = rand(this.w * 0.15, this.w * 0.85)
    const y = rand(this.h * 0.06, this.waterY - 24)
    const colors = [['#ffd54f', '#fff3a6'], ['#ff9fc0', '#ffffff'], ['#9fd0ff', '#ffffff'], ['#b4e486', '#ffffff']][Math.floor(rand(0, 4))]
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2
      const sp = rand(24, 36)
      this.particles.add({ kind: 'sparkle', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 12, drag: 1.4, max: rand(0.8, 1.3), color: colors[i % 2] })
    }
    synth.noise(0.3, 0.12, 'lowpass', 300, 0.7)
    synth.noise(0.5, 0.04, 'highpass', 4000, 0.6, 0.12)
  }
  /** Where the player's krathong is now. */
  pos(): [number, number] {
    const hx = this.playerX + 34
    const hy = this.bankY + 2
    if (this.launched < 0) return [hx, this.step === 'wish' ? hy - 70 : hy - 2]
    const t = Math.max(0, this.launched - 0.55)
    const start = hy + 2
    const y = start - Math.min(1, t / 9) * (start - this.waterY - 20)
    return [hx + Math.sin(t * 0.8) * 10 - Math.min(1, t / 9) * 10, y]
  }
  render(g: Surface) {
    const { w } = this
    this.juice.begin(g)
    drawSky(g, 0, 0, w, this.waterY - 12, 'night', this.t)
    // full moon
    g.circle(w - 30, 18, 8, '#fff6c8')
    softGlow(g, w - 30, 18, 22, 0.6, '#fff6c8')
    for (const l of this.lanterns) {
      const x = l.x + Math.sin(this.t + l.ph) * 3
      g.rect(x - 2, l.y - 3, 4, 5, '#ffb347')
      g.rect(x - 1, l.y - 2, 2, 3, '#fff3a6')
      softGlow(g, x, l.y, 8, 0.7, '#ffb347')
    }
    g.draw(this.background(), 0, 0)
    // Moon reflection.
    for (let i = 0; i < 6; i++) g.rect(w - 34 + Math.sin(this.t * 2 + i) * 2, this.waterY + 8 + i * 5, 8 - i, 1, '#fff6c8')
    for (const o of this.others) drawKrathong(g, o.x, o.y, o.s, { c: o.c }, true, this.t)
    const [x, y] = this.pos()
    const floating = this.launched >= 0.55
    const dist = floating ? Math.max(0.35, 1 - (this.launched - 0.55) / 12) : 1
    const s = !floating ? 1.6 : dist > 0.8 ? 1.6 : dist > 0.55 ? 1 : 0.6
    // The player kneeling at the steps.
    let pose: TPose | 'kneelWai' | 'kneel' = 'kneel'
    if (this.step === 'wish') pose = 'kt_raise'
    else if (this.launched >= 0 && this.launched < 0.55) pose = 'kt_lower'
    else if (this.launched >= 0.55 && this.launched < 1.3) pose = 'kt_push'
    else if (this.launched >= 1.3) pose = 'kneelWai'
    const inHands = this.step === 'wish'
    if (!inHands && !floating) drawKrathong(g, x, y, s, this.flower, this.lit, this.t)
    if (floating) drawKrathong(g, x, y, s, this.flower, this.lit, this.t)
    const pl = drawPlayer(g, this.look, pose, 'back', this.playerX, this.footY, { scale: 2 })
    if (inHands) {
      const [lx, ly] = handAt(pl, 1)
      const [rx] = handAt(pl, -1)
      drawKrathong(g, (lx + rx) / 2, Math.min(ly, pl.y + 20) - 2 + Math.round(Math.sin(this.t * 2)), 1.4, this.flower, this.lit, this.t)
      if (this.lit) softGlow(g, (lx + rx) / 2, pl.y + 4, 20, 0.7, '#ffcf7a')
    }
    this.particles.render(g)
    vignette(g, '#0a0c24', 0.45)
    this.juice.end(g)
    void P
  }
}

export function KrathongActivity({ req }: { req: ActivityRequest }) {
  const look = game.value.player.look
  const { host, scene, stage } = useStage(() => new RiverScene(look), { targetWidth: 160 })
  const [step, setStep] = useState<Stage>('make')
  const [flower, setFlower] = useState(FLOWERS[0].id)
  const [text, setText] = useState('')
  const [buy, setBuy] = useState(false)
  const [result, setResult] = useState<TempleResultData | null>(null)
  void req

  const go = (s: Stage) => {
    setStep(s)
    if (scene.current) scene.current.step = s
  }
  const pickFlower = (id: string) => {
    setFlower(id)
    const sc = scene.current
    if (sc) {
      sc.flower = FLOWERS.find((f) => f.id === id) ?? FLOWERS[0]
      const [x, y] = sc.pos()
      sc.particles.sparkles(x, y - 4, 6, sc.flower.c)
    }
    sfx.tap()
  }
  const float = () => {
    if (!useItem('krathong')) {
      setBuy(true)
      return
    }
    go('float')
    scene.current?.launch()
    tsfx.swish(0.7)
    haptic(20)
    setTimeout(() => sfx.chime(), 1500)
    setTimeout(() => banner(stage.current, 'ลอยไปแล้ว~', 'gold'), 1600)
    setTimeout(() => {
      const m = addMerit(15, { key: 'krathong', free: 2, area: 'river' })
      track('krathong')
      recordWish(text, 'ลอยกระทง', 'river')
      setResult({ title: 'ลอยกระทงแล้ว', merit: m, icon: 'krathong', pose: 'wai', lines: ['ขอขมาพระแม่คงคา และลอยความทุกข์ไปกับสายน้ำ', text ? `คำอธิษฐาน: "${text}"` : 'ขอให้สิ่งดี ๆ ไหลมาเทมา'] })
    }, 5600)
  }

  const stepNo = step === 'make' ? 1 : step === 'light' ? 2 : step === 'wish' ? 3 : 4
  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title="ลอยกระทงริมน้ำ" onClose={closeActivity} />
      <PraiseLayer />
      {!result && <StatusPill text={['ประดับกระทง', 'จุดเทียน', 'อธิษฐาน', 'ลอยกระทง'][stepNo - 1]} dots={4} on={stepNo} />}
      {!result && step !== 'float' && (
        <div class="act-bottom">
          <div class="panel act-tip">
            {step === 'make' && (
              <>
                <div class="subtitle">ประดับกระทงใบตอง</div>
                <div class="row wrap" style={{ justifyContent: 'center' }}>
                  {FLOWERS.map((f) => (
                    <button key={f.id} class={`tab ${flower === f.id ? 'active' : ''}`} onClick={() => pickFlower(f.id)}>
                      <span class="swatch" style={{ background: f.c, marginRight: '4px' }} />
                      {f.name}
                    </button>
                  ))}
                </div>
                <div class="small muted">มีกระทง {count('krathong')} ใบ</div>
                <div class="row">
                  {count('krathong') <= 0 && (
                    <Btn tone="paper" class="grow" onClick={() => setBuy(true)}>
                      ซื้อกระทง
                    </Btn>
                  )}
                  <Btn tone="green" class="grow" onClick={() => go('light')}>
                    ต่อไป
                  </Btn>
                </div>
              </>
            )}
            {step === 'light' && (
              <>
                <div class="subtitle">จุดเทียนและธูปบนกระทง</div>
                <Btn
                  tone="green"
                  block
                  silent
                  onClick={() => {
                    const sc = scene.current
                    if (sc) {
                      sc.lit = true
                      const [x, y] = sc.pos()
                      sc.particles.sparkles(x, y - 20, 10, '#ffb347')
                    }
                    tsfx.ignite()
                    go('wish')
                  }}
                >
                  <Icon name="incense" size={18} /> จุดเทียน
                </Btn>
              </>
            )}
            {step === 'wish' && (
              <>
                <div class="subtitle">ยกกระทงขึ้นอธิษฐาน</div>
                <input
                  id="krathong-wish"
                  class="text-input"
                  maxLength={80}
                  placeholder="ขอให้... (ไม่บังคับ)"
                  value={text}
                  onInput={(e) => setText((e.target as HTMLInputElement).value)}
                />
                <Btn tone="green" block onClick={float}>
                  <Icon name="krathong" size={18} /> ลอยกระทง
                </Btn>
              </>
            )}
          </div>
        </div>
      )}
      {step === 'float' && !result && (
        <div class="act-bottom">
          <div class="panel act-tip">กระทงของคุณค่อย ๆ ลอยไปกับสายน้ำ...</div>
        </div>
      )}
      {buy && <QuickBuy ids={['krathong']} title="กระทงใบตอง" onClose={() => setBuy(false)} />}
      {result && <TempleResult r={result} onDone={closeActivity} />}
    </div>
  )
}

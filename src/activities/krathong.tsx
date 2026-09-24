// ลอยกระทง – decorate a banana-leaf krathong, light it and let it float away
// on the river with your wish.

import { useState } from 'preact/hooks'
import type { Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import { P } from '../art/palette'
import { addMerit, count, recordWish, track, useItem } from '../game/actions'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, ResultCard, useStage, type ResultData } from './kit'
import { QuickBuy } from './quickbuy'
import { Btn, Icon } from '../ui/components/common'
import { sfx, haptic } from '../engine/audio'
import { drawGlow, drawSky } from '../scenes/sky'

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

class RiverScene implements Scene {
  w = 160
  h = 320
  t = 0
  flower = FLOWERS[0]
  lit = false
  launched = -1
  particles = new Particles()
  others: Floater[] = []
  private bg: HTMLCanvasElement | null = null
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
    if (!this.others.length)
      for (let i = 0; i < 9; i++) this.others.push({ x: rand(10, w - 10), y: rand(h * 0.3, h * 0.62), s: rand(0.4, 1), c: FLOWERS[i % 3].c, ph: rand(0, 6) })
  }
  get waterY() {
    return Math.round(this.h * 0.28)
  }
  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    const wy = this.waterY
    this.bg = bake(w, h, (g) => {
      // Far bank with a temple silhouette and lanterns.
      g.rect(0, wy - 16, w, 16, '#1d2048')
      g.poly(
        [
          [w * 0.55, wy - 16],
          [w * 0.68, wy - 34],
          [w * 0.81, wy - 16],
        ],
        '#262a5c',
      )
      g.rect(w * 0.62, wy - 22, w * 0.12, 6, '#262a5c')
      g.rect(w * 0.675, wy - 44, 2, 12, '#262a5c')
      for (let x = 6; x < w; x += 12) g.px(x, wy - 8, '#ffcf7a')
      // Water.
      g.gradientV(0, wy, w, h - wy, ['#1f2a5e', '#243a78', '#2f4f8f'], 8)
      for (let y = wy + 4; y < h; y += 4) for (let x = (y * 5) % 13; x < w; x += 17) g.rect(x, y, 5, 1, '#3a5a9a')
      // Near bank (steps).
      g.rect(0, h - 26, w, 26, '#8c8187')
      g.rect(0, h - 26, w, 2, '#bdb2ae')
      for (let y = h - 20; y < h; y += 6) g.hline(0, w - 1, y, '#6d6478')
    })
    return this.bg
  }
  launch() {
    this.launched = 0
    this.particles.add({ kind: 'ripple', x: this.w / 2, y: this.h - 40, max: 1.2, size: 16, color: '#9fd0ff' })
  }
  update(dt: number) {
    this.t += dt
    for (const o of this.others) {
      o.x += Math.sin(this.t * 0.3 + o.ph) * 0.04
      o.y -= dt * 0.8
      if (o.y < this.waterY + 6) o.y = this.h * 0.62
    }
    if (this.launched >= 0) this.launched += dt
    if (this.lit && Math.random() < dt * 5) {
      const [x, y] = this.pos()
      this.particles.add({ kind: 'smoke', x: x + rand(-2, 2), y: y - 12, vx: rand(-1, 1), vy: rand(-8, -4), max: 2, color: '#c9cff0' })
    }
    this.particles.update(dt)
  }
  pos(): [number, number] {
    const start = this.h - 40
    const t = Math.max(0, this.launched)
    const y = start - Math.min(1, t / 9) * (start - this.waterY - 20)
    return [this.w / 2 + Math.sin(t * 0.8) * 10, y]
  }
  private drawKrathong(g: Surface, x: number, y: number, s: number, flower: { c: string; d?: string }, lit: boolean) {
    const r = 10 * s
    g.ellipse(x, y + 2 * s, r + 2, 3 * s, 'rgba(10,20,50,0.4)')
    g.ellipse(x, y, r, 3.4 * s, P.leafD)
    g.ellipse(x, y - 1, r - 1, 2.6 * s, P.leaf)
    for (let i = -2; i <= 2; i++) g.circle(x + i * r * 0.4, y - 3 * s, Math.max(1, 2 * s), i % 2 ? flower.c : (flower.d ?? flower.c))
    if (s > 0.6) {
      g.vline(x, y - 12 * s, y - 4 * s, '#fff1d6')
      g.vline(x - 3, y - 10 * s, y - 4 * s, '#c0392b')
      g.vline(x + 3, y - 10 * s, y - 4 * s, '#c0392b')
    }
    if (lit) {
      g.px(x, y - 12 * s - 1, Math.sin(this.t * 10) > 0 ? '#ffd54f' : '#fff3a6')
      drawGlow(g, x, y - 12 * s, Math.max(4, 12 * s), 0.9)
    }
  }
  render(g: Surface) {
    const { w } = this
    drawSky(g, 0, 0, w, this.waterY - 12, 'night', this.t)
    g.draw(this.background(), 0, 0)
    // Moon reflection.
    for (let i = 0; i < 6; i++) g.rect(w - 36 + Math.sin(this.t * 2 + i) * 2, this.waterY + 8 + i * 5, 8 - i, 1, '#fff6c8')
    for (const o of this.others) this.drawKrathong(g, o.x, o.y, o.s, { c: o.c }, true)
    const [x, y] = this.pos()
    const dist = this.launched < 0 ? 1 : Math.max(0.35, 1 - this.launched / 12)
    const s = dist > 0.8 ? 1.6 : dist > 0.55 ? 1 : 0.6
    this.drawKrathong(g, x, y, s, this.flower, this.lit)
    this.particles.render(g)
  }
}

export function KrathongActivity({ req }: { req: ActivityRequest }) {
  const { host, scene } = useStage(() => new RiverScene(), { targetWidth: 160 })
  const [step, setStep] = useState<'make' | 'light' | 'wish' | 'float'>('make')
  const [flower, setFlower] = useState(FLOWERS[0].id)
  const [text, setText] = useState('')
  const [buy, setBuy] = useState(false)
  const [result, setResult] = useState<ResultData | null>(null)
  void req

  const pickFlower = (id: string) => {
    setFlower(id)
    if (scene.current) scene.current.flower = FLOWERS.find((f) => f.id === id) ?? FLOWERS[0]
    sfx.tap()
  }
  const float = () => {
    if (!useItem('krathong')) {
      setBuy(true)
      return
    }
    setStep('float')
    scene.current?.launch()
    sfx.splash()
    haptic(20)
    setTimeout(() => sfx.chime(), 1500)
    setTimeout(() => {
      const m = addMerit(15, { key: 'krathong', free: 2, area: 'river' })
      track('krathong')
      recordWish(text, 'ลอยกระทง', 'river')
      setResult({ title: 'ลอยกระทงแล้ว', merit: m, icon: 'krathong', lines: ['ขอขมาพระแม่คงคา และลอยความทุกข์ไปกับสายน้ำ', text ? `คำอธิษฐาน: "${text}"` : 'ขอให้สิ่งดี ๆ ไหลมาเทมา'] })
    }, 5200)
  }

  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title="ลอยกระทงริมน้ำ" onClose={closeActivity} />
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
                  <Btn tone="green" class="grow" onClick={() => setStep('light')}>
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
                  onClick={() => {
                    if (scene.current) scene.current.lit = true
                    sfx.candle()
                    setStep('wish')
                  }}
                >
                  <Icon name="incense" size={18} /> จุดเทียน
                </Btn>
              </>
            )}
            {step === 'wish' && (
              <>
                <div class="subtitle">อธิษฐานก่อนลอยกระทง</div>
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
      {result && <ResultCard r={result} onDone={closeActivity} />}
    </div>
  )
}

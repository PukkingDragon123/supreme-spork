// ขอพร – light incense, make an offering and send a wish.

import { useEffect, useRef, useState } from 'preact/hooks'
import type { Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import { avatarSprite, type AvatarLook } from '../art/avatar'
import { drawAltar, drawArch, drawBuddha, drawHallInterior, drawCandle } from '../art/interior'
import { drawUbosot } from '../art/buildings'
import { P } from '../art/palette'
import { game } from '../game/state'
import { addMerit, count, recordWish, track, useItem } from '../game/actions'
import { ITEM_BY_ID } from '../game/data/items'
import { closeActivity, type ActivityRequest } from '../ui/store'
import { ActivityFrame, ResultCard, useStage, type ResultData } from './kit'
import { Btn, Icon } from '../ui/components/common'
import { sfx, haptic } from '../engine/audio'
import { drawGlow, SKY } from '../scenes/sky'

const CATS = ['การงาน', 'การเงิน', 'ความรัก', 'สุขภาพ', 'การเรียน', 'ครอบครัว', 'โชคลาภ']
const OFFERINGS = ['lotus', 'garland', 'rose', 'incense', 'fruit']

class WishScene implements Scene {
  w = 160
  h = 320
  t = 0
  lit = 0
  candles = false
  charge = 0
  orb: { x: number; y: number; t: number } | null = null
  particles = new Particles()
  private bg: HTMLCanvasElement | null = null
  constructor(
    public place: 'hall' | 'incense',
    public look: AvatarLook,
  ) {}
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
  }
  get bowlY() {
    return Math.round(this.h * 0.7)
  }
  private background() {
    if (this.bg) return this.bg
    const { w, h } = this
    this.bg = bake(w, h, (g) => {
      if (this.place === 'hall') {
        const { floorY } = drawHallInterior(g, w, h, 0)
        const cx = Math.round(w / 2)
        const baseY = floorY - 70
        drawArch(g, cx, baseY + 10, 44, 92)
        drawBuddha(g, cx, baseY, 1)
        drawAltar(g, cx, baseY, 110)
      } else {
        g.gradientV(0, 0, w, h * 0.5, SKY.day.stops)
        const cx = Math.round(w / 2)
        drawUbosot(g, cx, Math.round(h * 0.5), {})
        g.rect(0, Math.round(h * 0.5), w, h, '#e4ddd6')
        for (let y = Math.round(h * 0.5); y < h; y += 8) g.hline(0, w - 1, y, '#d2c9c3')
      }
    })
    return this.bg
  }
  lightNext() {
    if (this.lit >= 3) return
    this.lit++
    const x = this.stickX(this.lit - 1)
    this.particles.sparkles(x, this.bowlY - 40, 6, '#ffb347')
  }
  stickX(i: number) {
    return Math.round(this.w / 2 - 6 + i * 6)
  }
  release() {
    this.orb = { x: this.w / 2, y: this.bowlY - 44, t: 0 }
  }
  update(dt: number) {
    this.t += dt
    for (let i = 0; i < this.lit; i++)
      if (Math.random() < dt * 5)
        this.particles.add({ kind: 'smoke', x: this.stickX(i), y: this.bowlY - 43, vx: rand(-1, 1), vy: rand(-10, -6), max: rand(1.8, 2.8), color: '#f3eefa', size: 1 })
    if (this.charge > 0 && Math.random() < dt * 20 * this.charge)
      this.particles.sparkles(this.w / 2 + rand(-20, 20), this.bowlY - 30 + rand(-20, 10), 1, '#fff3a6')
    if (this.orb) {
      this.orb.t += dt
      this.orb.y -= dt * 60
      this.orb.x = this.w / 2 + Math.sin(this.orb.t * 3) * 6
      if (Math.random() < dt * 30) this.particles.sparkles(this.orb.x, this.orb.y + 4, 1, '#fff3a6')
      if (this.orb.y < -20) this.orb = null
    }
    this.particles.update(dt)
  }
  render(g: Surface) {
    const { w, h } = this
    g.draw(this.background(), 0, 0)
    const cx = Math.round(w / 2)
    const by = this.bowlY
    // Candles either side.
    drawCandle(g, cx - 24, by - 6, 14, this.t, this.candles)
    drawCandle(g, cx + 24, by - 6, 14, this.t, this.candles)
    if (this.candles) {
      drawGlow(g, cx - 24, by - 24, 10, 0.8)
      drawGlow(g, cx + 24, by - 24, 10, 0.8)
    }
    // Incense bowl with sand.
    g.ellipse(cx, by + 2, 18, 6, '#8a6a2e')
    g.rect(cx - 16, by - 8, 32, 10, '#c9a04c')
    g.rect(cx - 16, by - 8, 32, 2, '#e3bf62')
    g.ellipse(cx, by - 8, 16, 3, '#e8d9b8')
    g.hline(cx - 14, cx + 14, by - 3, '#9c7a3c')
    for (let i = 0; i < 3; i++) {
      const x = this.stickX(i)
      g.vline(x, by - 42, by - 9, '#c0392b')
      g.vline(x, by - 16, by - 9, '#e0bb8a')
      if (i < this.lit) {
        g.px(x, by - 43, '#ff8a3d')
        g.px(x, by - 44, Math.sin(this.t * 10 + i) > 0 ? '#ffd54f' : '#ff8a3d')
        drawGlow(g, x, by - 43, 4, 0.7, '#ff9a5a')
      }
    }
    // The player praying.
    const s = avatarSprite(this.look, 'back', this.charge > 0 ? 'wai' : 'stand')
    g.drawScaled(s.canvas, Math.round(cx - 58), Math.round(h - 10 - s.h * 2), 2)
    if (this.charge > 0) drawGlow(g, cx, by - 30, 18 + this.charge * 20, this.charge)
    if (this.orb) {
      drawGlow(g, this.orb.x, this.orb.y, 10, 1, '#fff3a6')
      g.circle(this.orb.x, this.orb.y, 3, '#fffaf0')
      g.px(this.orb.x - 1, this.orb.y - 1, P.goldL)
    }
    this.particles.render(g)
  }
}

export function WishActivity({ req }: { req: ActivityRequest }) {
  const place = (req.params?.place as string) === 'hall' ? 'hall' : 'incense'
  const look = game.value.player.look
  const { host, scene } = useStage(() => new WishScene(place, look), { targetWidth: 160 })
  const [step, setStep] = useState<'light' | 'offer' | 'wish' | 'pray'>('light')
  const [offer, setOffer] = useState<string | null>(null)
  const [cat, setCat] = useState(CATS[0])
  const [text, setText] = useState('')
  const [charge, setCharge] = useState(0)
  const [result, setResult] = useState<ResultData | null>(null)
  const holding = useRef<number | null>(null)
  const [lit, setLit] = useState(0)

  const light = () => {
    if (!scene.current) return
    scene.current.candles = true
    scene.current.lightNext()
    sfx.candle()
    haptic(8)
    const n = scene.current.lit
    setLit(n)
    if (n >= 3) setTimeout(() => setStep('offer'), 500)
  }

  const startHold = () => {
    if (holding.current) return
    const t0 = performance.now()
    holding.current = window.setInterval(() => {
      const c = Math.min(1, (performance.now() - t0) / 2200)
      setCharge(c)
      if (scene.current) scene.current.charge = c
      if (c >= 1) finish()
    }, 50)
  }
  const endHold = () => {
    if (holding.current) clearInterval(holding.current)
    holding.current = null
    if (charge < 1) {
      setCharge(0)
      if (scene.current) scene.current.charge = 0
    }
  }
  const finish = () => {
    if (holding.current) clearInterval(holding.current)
    holding.current = null
    const sc = scene.current
    if (sc) {
      sc.charge = 0
      sc.release()
    }
    sfx.whoosh()
    setTimeout(() => sfx.chime(), 400)
    let bonus = 0
    if (offer && useItem(offer)) bonus = ITEM_BY_ID[offer]?.merit ?? 0
    const m = addMerit(8 + bonus, { key: 'wish', free: 3 })
    track('wish')
    recordWish(text, cat, place)
    setTimeout(
      () =>
        setResult({
          title: 'ส่งคำอธิษฐานแล้ว',
          merit: m,
          icon: 'incense',
          lines: [`ขอพรเรื่อง${cat}${text ? ` · "${text}"` : ''}`, 'ขอให้สมปรารถนาทุกประการ สาธุ'],
        }),
      1500,
    )
  }
  useEffect(() => () => endHold(), [])

  return (
    <div class="activity">
      <div class="stage-host" ref={host} />
      <ActivityFrame title={place === 'hall' ? 'ขอพรพระประธาน' : 'จุดธูปขอพรหน้าโบสถ์'} onClose={closeActivity} />
      {!result && (
        <div class="act-bottom">
          {step === 'light' && (
            <div class="panel act-tip">
              <div class="subtitle">จุดธูป ๓ ดอก บูชาพระรัตนตรัย</div>
              <div class="small muted">จุดแล้ว {lit}/3 ดอก</div>
              <Btn tone="green" block onClick={light}>
                <Icon name="incense" size={18} /> จุดธูป
              </Btn>
            </div>
          )}
          {step === 'offer' && (
            <div class="panel act-tip">
              <div class="subtitle">ถวายดอกไม้ (ไม่บังคับ)</div>
              <div class="tray">
                {OFFERINGS.map((id) => {
                  const it = ITEM_BY_ID[id]
                  const n = count(id)
                  return (
                    <button key={id} class={`panel tray-item ${offer === id ? 'selected' : ''}`} disabled={n <= 0} onClick={() => (sfx.tap(), setOffer(offer === id ? null : id))}>
                      <Icon name={it.icon} size={28} />
                      <span>{it.name}</span>
                      <span class="qty num">x{n}</span>
                    </button>
                  )
                })}
              </div>
              <Btn tone="green" block onClick={() => setStep('wish')}>
                {offer ? `ถวาย${ITEM_BY_ID[offer].name}` : 'ข้ามไปก่อน'}
              </Btn>
            </div>
          )}
          {step === 'wish' && (
            <div class="panel act-tip">
              <div class="subtitle">อยากขอพรเรื่องอะไร</div>
              <div class="row wrap" style={{ justifyContent: 'center' }}>
                {CATS.map((c) => (
                  <button key={c} class={`tab ${cat === c ? 'active' : ''}`} onClick={() => (sfx.tap(), setCat(c))}>
                    {c}
                  </button>
                ))}
              </div>
              <input
                id="wish-text"
                class="text-input"
                maxLength={80}
                placeholder="พิมพ์คำอธิษฐาน (เก็บไว้ในเครื่องคุณเท่านั้น)"
                value={text}
                onInput={(e) => setText((e.target as HTMLInputElement).value)}
              />
              <Btn tone="green" block onClick={() => setStep('pray')}>
                ตั้งจิตอธิษฐาน
              </Btn>
            </div>
          )}
          {step === 'pray' && (
            <div class="panel act-tip">
              <div class="subtitle">พนมมือ ตั้งจิตให้มั่น</div>
              <div class="small muted">กดค้างไว้จนแสงเต็ม</div>
              <button
                class="btn big green block hold-btn"
                style={{ ['--charge' as string]: `${charge * 100}%` }}
                onPointerDown={startHold}
                onPointerUp={endHold}
                onPointerLeave={endHold}
                onPointerCancel={endHold}
              >
                <Icon name="wai" size={22} />
                <span>อธิษฐาน</span>
              </button>
            </div>
          )}
        </div>
      )}
      {result && <ResultCard r={result} onDone={closeActivity} />}
    </div>
  )
}
